const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const utils = require('./utils');
const { spawn } = require('child_process');

const app = express();

app.use(express.static(config.PUBLIC_DIR));

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.ensureDirSync(config.UPLOAD_DIR);
        cb(null, config.UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueName = utils.generateUniqueFilename(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: config.MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) cb(null, true);
        else cb(new Error('Solo se permiten archivos de video'), false);
    }
});

// Store active processes
const activeProcesses = new Map();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(config.PUBLIC_DIR, 'index.html'));
});

// Process video endpoint
app.post('/api/process-video', upload.single('video'), async (req, res) => {
    try {
        utils.validateVideoFile(req.file);

        const processId = uuidv4();

        // Initialize process
        activeProcesses.set(processId, {
            status: 'processing',
            progress: 0,
            currentStep: 1,
            videoPath: req.file.path,
            targetLanguage: req.body.targetLanguage || 'en',
            error: null,
            startTime: Date.now()
        });

        // Start processing in background
        processVideoAsync(processId, req.file.path, req.body.targetLanguage || 'en');

        res.json({ processId: processId });

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

    res.json({
        status: process.status,
        progress: process.progress,
        currentStep: process.currentStep,
        error: process.error,
        resultUrl: process.resultUrl,
        translatedText: process.translatedText,
        originalText: process.originalText,
        durationMs: process.durationMs
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

// Video processing function
async function processVideoAsync(processId, videoPath, targetLanguage) {
    try {
        // Step 1: Convert video to audio (20%)
        updateProcess(processId, 1, 20, 'Convirtiendo video a audio...');
        console.log('=== CONVERSIÓN VIDEO A AUDIO ===');
        console.log('Video original:', videoPath);

        const audioPath = await utils.convertVideoToAudio(videoPath, config.OUTPUT_DIR);
        console.log('Audio extraído:', audioPath);
        console.log('=====================================');

        // Step 2: Convert audio to text (40%)
        updateProcess(processId, 2, 40, 'Transcribiendo audio a texto...');
        const transcribedText = await transcribeAudio(audioPath);

        // Limpiar la transcripción
        const cleanText = utils.cleanTranscription(transcribedText);

        // Step 3: Translate text (60%)
        updateProcess(processId, 3, 60, `Traduciendo texto a ${targetLanguage}...`);
        const translatedText = await utils.translateText(cleanText, targetLanguage, config.TRANSLATION_CONFIG.USE_LINGVA);
        console.log('Texto traducido:', translatedText);

        // Step 4: Generate TTS audio (80%)
        updateProcess(processId, 4, 80, `Generando audio en ${targetLanguage}...`);
        console.log('=== GENERACIÓN DE AUDIO TTS ===');
        const ttsAudioPath = await utils.generateTTSAudio(translatedText, targetLanguage, config.OUTPUT_DIR);
        console.log('Audio TTS generado:', ttsAudioPath);
        console.log('=====================================');

        // Step 5: Synchronize audio with video (90%)
        updateProcess(processId, 5, 90, 'Sincronizando audio con video...');
        console.log('=== SINCRONIZACIÓN VIDEO-AUDIO ===');
        const finalVideoPath = await utils.synchronizeAudioWithVideo(videoPath, ttsAudioPath, config.OUTPUT_DIR);
        console.log('Video final generado:', finalVideoPath);
        console.log('=====================================');

        if (!fs.existsSync(finalVideoPath)) {
            throw new Error('Video final no se generó correctamente');
        }

        // Complete process - return final video
        const resultUrl = `/api/download/${path.basename(finalVideoPath)}`;
        completeProcess(processId, resultUrl, translatedText, transcribedText);

        // Limpiar archivos temporales (pero NO el video final)
        await utils.cleanupTempFiles(videoPath);
        await utils.cleanupTempFiles(audioPath);
        await utils.cleanupTempFiles(ttsAudioPath);

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
        console.log(`Step ${step}: ${message}`);
    }
}

function completeProcess(processId, resultUrl, translatedText, originalText) {
    const process = activeProcesses.get(processId);
    if (process) {
        process.status = 'completed';
        process.progress = 100;
        process.resultUrl = resultUrl;
        process.translatedText = translatedText;
        process.originalText = originalText;
        process.endTime = Date.now();
        process.durationMs = process.endTime - process.startTime;
    }
}

function failProcess(processId, error) {
    const process = activeProcesses.get(processId);
    if (process) {
        process.status = 'error';
        process.error = error;
    }
}

// Transcribe audio using Whisper local via Python
async function transcribeAudio(audioPath) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            '-m', 'whisper', audioPath, '--model', 'base', '--output_format', 'txt', '--output_dir', path.dirname(audioPath)
        ]);
        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                // Whisper generates a .txt file with the transcription
                const txtPath = audioPath.replace(/\.[^/.]+$/, ".txt");
                if (fs.existsSync(txtPath)) {
                    const transcript = fs.readFileSync(txtPath, 'utf8');
                    resolve(transcript);
                } else {
                    reject(new Error('No se encontró el archivo de transcripción generado por Whisper.'));
                }
            } else {
                reject(new Error('Error en Whisper: ' + errorOutput));
            }
        });
    });
}

app.listen(config.PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${config.PORT}`);
});