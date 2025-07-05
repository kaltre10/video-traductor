require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const ElevenLabsService = require('./elevenlabs-service');

const app = express();

// Configurar middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(config.PUBLIC_DIR));

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.ensureDirSync(config.UPLOAD_DIR);
        cb(null, config.UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: config.MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de video'), false);
        }
    }
});

// Store active processes
const activeProcesses = new Map();
const PROCESS_TTL = 30 * 60 * 1000; // 30 minutos

// Limpiar procesos expirados cada 5 minutos
setInterval(() => {
    const now = Date.now();
    for (const [processId, process] of activeProcesses.entries()) {
        if (now - process.startTime > PROCESS_TTL) {
            activeProcesses.delete(processId);
            console.log(`Proceso ${processId} expirado y eliminado`);
        }
    }
}, 5 * 60 * 1000);

// Helper functions for time estimation
function calculateTimeEstimates(processId, progress) {
    const process = activeProcesses.get(processId);
    if (!process) return null;

    const now = Date.now();
    const elapsedMs = now - process.startTime;
    const elapsedMinutes = elapsedMs / (1000 * 60);

    // Estimaciones basadas en el progreso actual
    if (progress > 0) {
        const estimatedTotalMinutes = elapsedMinutes / (progress / 100);
        const remainingMinutes = estimatedTotalMinutes - elapsedMinutes;

        return {
            elapsed: formatTime(elapsedMs),
            estimated: formatTime(remainingMinutes * 60 * 1000),
            remaining: formatTime(remainingMinutes * 60 * 1000),
            totalEstimated: formatTime(estimatedTotalMinutes * 60 * 1000),
            completionTime: new Date(now + (remainingMinutes * 60 * 1000)).toLocaleTimeString()
        };
    }

    // Estimación inicial (5-10 minutos típico para ElevenLabs)
    const estimatedMinutes = 7;
    return {
        elapsed: formatTime(elapsedMs),
        estimated: formatTime(estimatedMinutes * 60 * 1000),
        remaining: formatTime(estimatedMinutes * 60 * 1000),
        totalEstimated: formatTime(estimatedMinutes * 60 * 1000),
        completionTime: new Date(now + (estimatedMinutes * 60 * 1000)).toLocaleTimeString()
    };
}

function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(config.PUBLIC_DIR, 'index.html'));
});

// Process video endpoint
app.post('/api/process-video', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No se subió ningún archivo');
        }

        const processId = uuidv4();
        const videoPath = req.file.path;
        const targetLanguage = req.body.targetLanguage || 'en';

        // Verificar que el idioma sea soportado
        if (!config.SUPPORTED_LANGUAGES[targetLanguage]) {
            throw new Error(`Idioma no soportado: ${targetLanguage}`);
        }

        // Initialize process
        activeProcesses.set(processId, {
            status: 'processing',
            progress: 0,
            currentStep: 1,
            videoPath: videoPath,
            targetLanguage: targetLanguage,
            error: null,
            startTime: Date.now(),
            dubbingId: null,
            message: 'Iniciando doblaje...'
        });

        // Start processing in background
        processVideoAsync(processId, videoPath, targetLanguage);

        res.json({
            processId: processId,
            message: 'Doblaje iniciado exitosamente'
        });

    } catch (error) {
        console.error('Error in process-video:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
});

// Progress endpoint
app.get('/api/progress/:processId', (req, res) => {
    const processId = req.params.processId;
    const process = activeProcesses.get(processId);

    if (!process) {
        return res.status(404).json({ error: 'Proceso no encontrado' });
    }

    // Calcular estimaciones de tiempo
    const timeEstimates = calculateTimeEstimates(processId, process.progress);

    res.json({
        status: process.status,
        progress: process.progress,
        currentStep: process.currentStep,
        error: process.error,
        resultUrl: process.resultUrl,
        durationMs: process.durationMs,
        message: process.message,
        // Información de tiempo
        timeEstimates: timeEstimates,
        progressMessage: process.message,
        startTime: process.startTime,
        estimatedCompletionTime: timeEstimates?.completionTime
    });
});

// Download endpoint
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(config.OUTPUT_DIR, filename);

    console.log('Solicitud de descarga:', filename);
    console.log('Ruta del archivo:', filePath);

    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log('Archivo encontrado, tamaño:', stats.size, 'bytes');

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', stats.size);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (err) => {
            console.error('Error enviando archivo:', err);
            res.status(500).json({ error: 'Error enviando archivo' });
        });
    } else {
        console.error('Archivo no encontrado:', filePath);
        res.status(404).json({ error: 'Archivo no encontrado' });
    }
});

// Credits endpoint
app.get('/api/credits', async (req, res) => {
    try {
        const elevenLabsService = new ElevenLabsService();
        const credits = await elevenLabsService.checkCredits();
        res.json(credits);
    } catch (error) {
        console.error('Error checking credits:', error);
        res.status(500).json({ error: error.message });
    }
});

// Video processing function
async function processVideoAsync(processId, videoPath, targetLanguage) {
    const elevenLabsService = new ElevenLabsService();

    try {
        // Step 1: Crear doblaje en ElevenLabs
        updateProcess(processId, 1, 10, 'Subiendo video a ElevenLabs...');

        const dubbingResult = await elevenLabsService.createDubbing(videoPath, targetLanguage);

        // Actualizar el proceso con el ID del doblaje
        const process = activeProcesses.get(processId);
        if (process) {
            process.dubbingId = dubbingResult.dubbingId;
        }

        // Step 2: Polling del estado del doblaje
        updateProcess(processId, 2, 20, 'Procesando video en ElevenLabs...');

        const outputPath = path.join(config.OUTPUT_DIR, `dubbed_${Date.now()}.mp4`);

        // Progress callback para actualizar el estado
        const progressCallback = (status) => {
            updateProcess(processId, 2, status.progress, status.message);
        };

        // Polling del estado hasta completar
        await elevenLabsService.pollDubbingStatus(
            dubbingResult.dubbingId,
            targetLanguage,
            outputPath,
            progressCallback
        );

        // Step 3: Completar proceso
        const resultUrl = `/api/download/${path.basename(outputPath)}`;
        completeProcess(processId, resultUrl);

        // Limpiar archivo original
        await fs.remove(videoPath);

    } catch (error) {
        console.error('Error processing video:', error);
        failProcess(processId, error.message);
    }
}

// Helper functions
function updateProcess(processId, step, progress, message) {
    const process = activeProcesses.get(processId);
    if (process) {
        process.currentStep = step;
        process.progress = progress;
        process.message = message;

        // Calcular tiempo estimado restante
        const timeEstimates = calculateTimeEstimates(processId, progress);

        console.log(`Step ${step}: ${message}`);
        if (timeEstimates) {
            console.log(`⏱️  Tiempo transcurrido: ${timeEstimates.elapsed}`);
            console.log(`⏳ Tiempo restante estimado: ${timeEstimates.remaining}`);
            console.log(`🕐 Completado estimado: ${timeEstimates.completionTime}`);
        }
    }
}

function completeProcess(processId, resultUrl) {
    const process = activeProcesses.get(processId);
    if (process) {
        process.status = 'completed';
        process.progress = 100;
        process.resultUrl = resultUrl;
        process.endTime = Date.now();
        process.durationMs = process.endTime - process.startTime;
        process.message = 'Doblaje completado exitosamente';
    }
}

function failProcess(processId, error) {
    const process = activeProcesses.get(processId);
    if (process) {
        process.status = 'error';
        process.error = error;
        process.message = `Error: ${error}`;
    }
}

// Start server
app.listen(config.PORT, () => {
    console.log(`🚀 Servidor ElevenLabs iniciado en puerto ${config.PORT}`);
    console.log(`📁 Directorios configurados:`);
    console.log(`   - Uploads: ${config.UPLOAD_DIR}`);
    console.log(`   - Outputs: ${config.OUTPUT_DIR}`);
    console.log(`   - Public: ${config.PUBLIC_DIR}`);
    console.log(`🔑 API Key configurada: ${config.ELEVENLABS_CONFIG.API_KEY ? 'Sí' : 'No'}`);

    if (!config.ELEVENLABS_CONFIG.API_KEY) {
        console.log(`⚠️  IMPORTANTE: Configura ELEVENLABS_API_KEY en el archivo .env`);
    }
}); 