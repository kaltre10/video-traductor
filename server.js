require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const utils = require('./utils');
const LongVideoProcessor = require('./long-video-processor');
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

// Helper functions for time estimation
function calculateTimeEstimates(processId, currentStep, progress) {
    const process = activeProcesses.get(processId);
    if (!process) return null;

    const now = Date.now();
    const elapsedMs = now - process.startTime;
    const elapsedMinutes = elapsedMs / (1000 * 60);

    // Tiempo estimado por paso (en minutos)
    const stepTimeEstimates = {
        1: 0.5,  // Video → Audio
        2: 2.0,  // Audio → Texto (Whisper es el más lento)
        3: 1.0,  // Texto → Traducción
        4: 1.5,  // Texto → TTS
        5: 1.0   // Sincronización
    };

    // Para videos largos, ajustar estimaciones
    if (process.isLongVideo && process.totalChunks > 1) {
        const chunkProgress = process.currentChunk / process.totalChunks;
        const totalEstimatedMinutes = process.totalChunks * 6; // ~6 minutos por chunk
        const remainingMinutes = totalEstimatedMinutes * (1 - chunkProgress);

        return {
            elapsed: formatTime(elapsedMs),
            estimated: formatTime(remainingMinutes * 60 * 1000),
            remaining: formatTime(remainingMinutes * 60 * 1000),
            totalEstimated: formatTime(totalEstimatedMinutes * 60 * 1000),
            completionTime: new Date(now + (remainingMinutes * 60 * 1000)).toLocaleTimeString()
        };
    }

    // Para videos normales
    const totalSteps = 5;
    const completedSteps = currentStep - 1;
    const remainingSteps = totalSteps - completedSteps;

    // Calcular tiempo promedio por paso basado en el tiempo transcurrido
    const avgTimePerStep = elapsedMinutes / Math.max(completedSteps, 1);
    const remainingMinutes = remainingSteps * avgTimePerStep;

    // Si es el primer paso, usar estimaciones predefinidas
    if (completedSteps === 0) {
        const totalEstimatedMinutes = Object.values(stepTimeEstimates).reduce((a, b) => a + b, 0);
        const remainingMinutes = totalEstimatedMinutes;

        return {
            elapsed: formatTime(elapsedMs),
            estimated: formatTime(remainingMinutes * 60 * 1000),
            remaining: formatTime(remainingMinutes * 60 * 1000),
            totalEstimated: formatTime(totalEstimatedMinutes * 60 * 1000),
            completionTime: new Date(now + (remainingMinutes * 60 * 1000)).toLocaleTimeString()
        };
    }

    return {
        elapsed: formatTime(elapsedMs),
        estimated: formatTime(remainingMinutes * 60 * 1000),
        remaining: formatTime(remainingMinutes * 60 * 1000),
        totalEstimated: formatTime((elapsedMinutes + remainingMinutes) * 60 * 1000),
        completionTime: new Date(now + (remainingMinutes * 60 * 1000)).toLocaleTimeString()
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

function getProgressMessage(processId, currentStep, progress) {
    const process = activeProcesses.get(processId);
    if (!process) return 'Procesando...';

    const stepMessages = {
        1: 'Convirtiendo video a audio...',
        2: 'Transcribiendo audio a texto...',
        3: 'Traduciendo texto...',
        4: 'Generando audio TTS...',
        5: 'Sincronizando audio con video...'
    };

    let message = stepMessages[currentStep] || 'Procesando...';

    // Para videos largos, agregar información de chunks
    if (process.isLongVideo && process.totalChunks > 1) {
        message = `Chunk ${process.currentChunk}/${process.totalChunks}: ${message}`;
    }

    return message;
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(config.PUBLIC_DIR, 'index.html'));
});

// Endpoint para obtener voces de ElevenLabs
app.get('/api/elevenlabs-voices', async (req, res) => {
    try {
        const voices = await utils.getElevenLabsVoices();
        res.json({ voices });
    } catch (error) {
        console.error('Error obteniendo voces de ElevenLabs:', error);
        res.status(500).json({
            error: error.message || 'Error obteniendo voces de ElevenLabs',
            fallbackVoices: [
                // Voces en Inglés
                { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade', labels: { language: 'en' } },
                { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', category: 'premade', labels: { language: 'en' } },
                { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade', labels: { language: 'en' } },
                { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'en' } },
                { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Josh', category: 'premade', labels: { language: 'en' } },
                { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade', labels: { language: 'en' } },
                { voice_id: 'ThT5KcBeYPX3keUQqHPh', name: 'Antoni', category: 'premade', labels: { language: 'en' } },
                { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'en' } },

                // Voces en Español
                { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade', labels: { language: 'es' } },
                { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'es' } },

                // Voces en Francés
                { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Josh', category: 'premade', labels: { language: 'fr' } },
                { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'fr' } },

                // Voces en Alemán
                { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', category: 'premade', labels: { language: 'de' } },
                { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'de' } },

                // Voces en Italiano
                { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade', labels: { language: 'it' } },
                { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'it' } },

                // Voces en Portugués
                { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'pt' } },

                // Voces en Japonés
                { voice_id: 'ThT5KcBeYPX3keUQqHPh', name: 'Antoni', category: 'premade', labels: { language: 'ja' } },
                { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'ja' } }
            ]
        });
    }
});


// Process video endpoint
app.post('/api/process-video', upload.single('video'), async (req, res) => {
    try {
        utils.validateVideoFile(req.file);

        const processId = uuidv4();
        const videoPath = req.file.path;
        const targetLanguage = req.body.targetLanguage || 'en';
        const ttsProvider = req.body.ttsProvider || 'gtts';
        const voiceId = req.body.voiceId || null;
        const elevenLabsApiKey = req.body.elevenLabsApiKey || null;

        // Verificar si es un video largo
        const isLongVideo = await checkIfLongVideo(videoPath);

        // Initialize process
        activeProcesses.set(processId, {
            status: 'processing',
            progress: 0,
            currentStep: 1,
            videoPath: videoPath,
            targetLanguage: targetLanguage,
            ttsProvider: ttsProvider,
            voiceId: voiceId,
            error: null,
            startTime: Date.now(),
            isLongVideo: isLongVideo,
            totalChunks: isLongVideo ? await getEstimatedChunks(videoPath) : 1
        });

        // Start processing in background
        if (isLongVideo) {
            processLongVideoAsync(processId, videoPath, targetLanguage, ttsProvider, voiceId, elevenLabsApiKey);
        } else {
            processVideoAsync(processId, videoPath, targetLanguage, ttsProvider, voiceId, elevenLabsApiKey);
        }

        res.json({
            processId: processId,
            isLongVideo: isLongVideo,
            estimatedChunks: isLongVideo ? await getEstimatedChunks(videoPath) : 1
        });

    } catch (error) {
        console.error('Error in process-video:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
});

// Progress endpoint
app.get('/api/progress/:processId', (req, res) => {
    try {
        const processId = req.params.processId;
        const process = activeProcesses.get(processId);

        if (!process) {
            return res.status(404).json({
                status: 'error',
                error: 'Proceso no encontrado',
                progress: 0,
                currentStep: 0
            });
        }

        // Calcular estimaciones de tiempo
        const timeEstimates = calculateTimeEstimates(processId, process.currentStep, process.progress);
        const progressMessage = getProgressMessage(processId, process.currentStep, process.progress);

        const response = {
            status: process.status,
            progress: process.progress || 0,
            currentStep: process.currentStep || 0,
            error: process.error,
            resultUrl: process.resultUrl,
            translatedText: process.translatedText,
            originalText: process.originalText,
            durationMs: process.durationMs,
            isLongVideo: process.isLongVideo,
            totalChunks: process.totalChunks,
            currentChunk: process.currentChunk,
            // Información de tiempo
            timeEstimates: timeEstimates,
            progressMessage: progressMessage,
            startTime: process.startTime,
            estimatedCompletionTime: timeEstimates?.completionTime
        };

        // Asegurar que siempre devolvemos un JSON válido
        res.setHeader('Content-Type', 'application/json');
        res.json(response);

    } catch (error) {
        console.error('Error en endpoint progress:', error);
        res.status(500).json({
            status: 'error',
            error: 'Error interno del servidor',
            progress: 0,
            currentStep: 0
        });
    }
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
async function processVideoAsync(processId, videoPath, targetLanguage, ttsProvider, voiceId, elevenLabsApiKey) {
    try {
        // Agregar timeout de 10 minutos para el procesamiento completo
        const timeout = setTimeout(() => {
            console.error(`Timeout en procesamiento ${processId}`);
            failProcess(processId, 'Timeout: El procesamiento tardó demasiado tiempo. Intenta con un video más corto.');
        }, 10 * 60 * 1000); // 10 minutos

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
        const process = activeProcesses.get(processId);
        const ttsProviderName = ttsProvider === 'elevenlabs' ? 'ElevenLabs' : 'gTTS';

        updateProcess(processId, 4, 80, `Generando audio con ${ttsProviderName} en ${targetLanguage}...`);
        console.log('=== GENERACIÓN DE AUDIO TTS ===');
        console.log(`Proveedor TTS: ${ttsProviderName}`);

        let ttsAudioPath;
        if (ttsProvider === 'elevenlabs') {
            ttsAudioPath = await utils.generateElevenLabsTTS(translatedText, targetLanguage, config.OUTPUT_DIR, voiceId, elevenLabsApiKey);
        } else {
            ttsAudioPath = await utils.generateTTSAudio(translatedText, targetLanguage, config.OUTPUT_DIR, ttsProvider);
        }
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

        // Limpiar timeout
        clearTimeout(timeout);

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

        // Calcular tiempo estimado restante
        const timeEstimates = calculateTimeEstimates(processId, step, progress);
        const progressMessage = getProgressMessage(processId, step, progress);

        console.log(`Step ${step}: ${message}`);
        if (timeEstimates) {
            console.log(`⏱️  Tiempo transcurrido: ${timeEstimates.elapsed}`);
            console.log(`⏳ Tiempo restante estimado: ${timeEstimates.remaining}`);
            console.log(`🕐 Completado estimado: ${timeEstimates.completionTime}`);
        }
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

// Helper functions for long videos
async function checkIfLongVideo(videoPath) {
    return new Promise((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) return reject(err);

            const duration = metadata.format.duration; // en segundos
            const isLong = duration > config.LONG_VIDEO_CONFIG.CHUNK_DURATION;

            console.log(`Video duration: ${duration}s (${Math.round(duration / 60)} minutes)`);
            console.log(`Is long video: ${isLong}`);

            resolve(isLong);
        });
    });
}

async function getEstimatedChunks(videoPath) {
    return new Promise((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) return reject(err);

            const duration = metadata.format.duration;
            const chunks = Math.ceil(duration / config.LONG_VIDEO_CONFIG.CHUNK_DURATION);

            resolve(chunks);
        });
    });
}

// Long video processing function
async function processLongVideoAsync(processId, videoPath, targetLanguage, ttsProvider, voiceId, elevenLabsApiKey) {
    try {
        const processor = new LongVideoProcessor();

        // Progress callback
        const progressCallback = (progressData) => {
            const process = activeProcesses.get(processId);
            if (process) {
                process.progress = progressData.progress;
                process.currentStep = progressData.step;
                process.currentChunk = progressData.currentChunk;
                process.totalChunks = progressData.totalChunks;

                // Calcular y mostrar estimaciones de tiempo
                const timeEstimates = calculateTimeEstimates(processId, progressData.step, progressData.progress);
                const progressMessage = getProgressMessage(processId, progressData.step, progressData.progress);

                console.log(`📊 Progreso: ${progressData.progress.toFixed(1)}%`);
                console.log(`🔄 ${progressMessage}`);
                if (timeEstimates) {
                    console.log(`⏱️  Tiempo transcurrido: ${timeEstimates.elapsed}`);
                    console.log(`⏳ Tiempo restante: ${timeEstimates.remaining}`);
                    console.log(`🕐 Completado estimado: ${timeEstimates.completionTime}`);
                }
            }
        };

        // Process the long video
        const result = await processor.processLongVideo(videoPath, targetLanguage, progressCallback);

        // Complete process
        const resultUrl = `/api/download/${path.basename(result.finalVideoPath)}`;
        completeProcess(processId, resultUrl, result.chunks[0]?.translatedText, result.chunks[0]?.originalText);

        // Cleanup original video
        await utils.cleanupTempFiles(videoPath);

    } catch (error) {
        console.error('Error processing long video:', error);
        failProcess(processId, error.message);
    }
}

app.listen(config.PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${config.PORT}`);
});