const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { spawn } = require('child_process');
const config = require('./config');
const whisper = require('openai-whisper');

// Genera un nombre de archivo único
function generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    return `${base}_${Date.now()}${ext}`;
}

// Valida que el archivo sea de video
function validateVideoFile(file) {
    if (!file) throw new Error('No se subió ningún archivo');
    if (!file.mimetype.startsWith('video/')) throw new Error('El archivo no es un video');
}

// Convierte video a audio
async function convertVideoToAudio(videoPath, outputDir) {
    return new Promise((resolve, reject) => {
        const audioPath = path.join(outputDir, `audio_${Date.now()}.mp3`);
        ffmpeg(videoPath)
            .output(audioPath)
            .on('end', () => resolve(audioPath))
            .on('error', reject)
            .run();
    });
}

// Transcribe audio usando Whisper local
async function transcribeAudio(audioPath) {
    return new Promise((resolve, reject) => {
        const txtPath = path.join(path.dirname(audioPath), path.basename(audioPath).replace(/\.[^/.]+$/, ".txt"));
        console.log('Buscando transcripción en:', txtPath);
        if (fs.existsSync(txtPath)) {
            const transcript = fs.readFileSync(txtPath, 'utf8');
            resolve(transcript);
        } else {
            reject(new Error('No se encontró el archivo de transcripción generado por Whisper.'));
        }
    });
}

// Traduce texto usando LibreTranslate o Lingva con fallback automático y URLs desde config
async function translateText(text, targetLanguage, useLingva = false) {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    const libreUrl = config.TRANSLATION_CONFIG.LIBRETRANSLATE_URL;
    const lingvaUrl = config.TRANSLATION_CONFIG.LINGVA_URL;
    try {
        // LibreTranslate API
        const url = `${libreUrl.replace(/\/$/, '')}/translate`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                source: 'auto',
                target: targetLanguage,
                format: 'text'
            })
        });
        if (!res.ok) throw new Error('LibreTranslate no disponible');
        const data = await res.json();
        if (!data.translatedText) throw new Error('Respuesta inesperada de LibreTranslate');
        return data.translatedText;
    } catch (err) {
        // Fallback a Lingva si LibreTranslate falla
        console.error('Error en traducción LibreTranslate, probando Lingva:', err.message);
        try {
            const url = `${lingvaUrl.replace(/\/$/, '')}/en/${targetLanguage}/${encodeURIComponent(text)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (!data.translation) throw new Error('Respuesta inesperada de Lingva');
            return data.translation;
        } catch (err2) {
            throw new Error('Error en traducción: ' + err2.message);
        }
    }
}

// Limpia la transcripción de marcas de tiempo y mensajes extra
function cleanTranscription(rawText) {
    let lines = rawText.split('\n').filter(line =>
        !line.trim().startsWith('[') &&
        !line.trim().toLowerCase().startsWith('detected language') &&
        !line.trim().toLowerCase().startsWith('detecting language') &&
        line.trim() !== ''
    );
    return lines.join(' ');
}

// Genera audio TTS usando Python gTTS
async function generateTTSAudio(text, targetLanguage, outputDir, ttsProvider = 'gtts') {
    if (ttsProvider === 'elevenlabs') {
        return generateElevenLabsTTS(text, targetLanguage, outputDir);
    } else {
        return generateGTTSAudio(text, targetLanguage, outputDir);
    }
}

// Genera audio TTS usando Python gTTS (método original)
async function generateGTTSAudio(text, targetLanguage, outputDir) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`Generando audio TTS con gTTS en idioma: ${targetLanguage}`);
            const audioPath = path.join(outputDir, `tts_audio_${Date.now()}.mp3`);
            const pythonScript = `
import gtts
import sys
text = """${text.replace(/"/g, '\\"')}"""
lang = "${targetLanguage}"
output_path = "${audioPath.replace(/\\/g, '/')}"
try:
    tts = gtts.gTTS(text=text, lang=lang)
    tts.save(output_path)
    print(f"SUCCESS:{output_path}")
except Exception as e:
    print(f"ERROR:{str(e)}")
    sys.exit(1)
`;
            const pythonProcess = spawn('python', ['-c', pythonScript]);
            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0 && output.includes('SUCCESS:')) {
                    const successPath = output.split('SUCCESS:')[1].trim();
                    console.log('Audio TTS generado con gTTS:', successPath);
                    resolve(successPath);
                } else {
                    console.error('Error generando TTS con gTTS:', errorOutput, output);
                    reject(new Error('Error generando TTS con gTTS: ' + errorOutput + output));
                }
            });
        } catch (error) {
            console.error('Error en generateGTTSAudio:', error);
            reject(error);
        }
    });
}

// Obtiene las voces disponibles de ElevenLabs
async function getElevenLabsVoices() {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

    try {
        // Validar API key
        if (!config.ELEVENLABS_CONFIG.API_KEY) {
            throw new Error('ELEVENLABS_API_KEY no está configurada. Por favor, configura tu API key en el archivo .env');
        }

        const response = await fetch(`${config.ELEVENLABS_CONFIG.API_BASE_URL}/voices`, {
            method: 'GET',
            headers: {
                'xi-api-key': config.ELEVENLABS_CONFIG.API_KEY
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error obteniendo voces de ElevenLabs: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const voices = data.voices || [];

        // Agregar información adicional a cada voz
        const enhancedVoices = voices.map(voice => ({
            ...voice,
            displayName: `${voice.name}${voice.labels?.accent ? ` (${voice.labels.accent})` : ''}`,
            category: voice.category || 'premade',
            language: voice.labels?.language || 'en',
            accent: voice.labels?.accent || null,
            gender: voice.labels?.gender || null,
            age: voice.labels?.age || null,
            // Agregar información adicional para mostrar
            description: `${voice.name} - ${voice.category}${voice.labels?.accent ? ` - ${voice.labels.accent}` : ''}`
        }));

        return enhancedVoices;

    } catch (error) {
        console.error('Error obteniendo voces de ElevenLabs:', error);
        throw error;
    }
}

// Genera audio TTS usando ElevenLabs API
async function generateElevenLabsTTS(text, targetLanguage, outputDir, voiceId = null, customApiKey = null) {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

    try {
        console.log(`Generando audio TTS con ElevenLabs en idioma: ${targetLanguage}`);

        // Usar la API key personalizada si se proporciona
        const apiKey = customApiKey || config.ELEVENLABS_CONFIG.API_KEY;
        if (!apiKey) {
            throw new Error('ELEVENLABS_API_KEY no está configurada. Por favor, configura tu API key en el archivo .env o ingrésala en la interfaz.');
        }

        // Si no se proporciona voiceId, usar el mapeo por idioma
        let selectedVoiceId = voiceId;
        if (!selectedVoiceId) {
            const voiceMapping = {
                'en': '21m00Tcm4TlvDq8ikWAM', // Rachel - English
                'es': 'EXAVITQu4vr4xnSDxMaL', // Bella - Spanish
                'fr': 'yoZ06aMxZJJ28mfd3POQ', // Josh - French
                'de': 'AZnzlk1XvdvUeBnXmlld', // Domi - German
                'it': 'pNInz6obpgDQGcFmaJgB', // Adam - Italian
                'pt': 'VR6AewLTigWG4xSOukaG', // Sam - Portuguese
                'ja': 'ThT5KcBeYPX3keUQqHPh', // Antoni - Japanese
                'ko': 'VR6AewLTigWG4xSOukaG', // Sam - Korean (fallback)
                'zh': 'VR6AewLTigWG4xSOukaG', // Sam - Chinese (fallback)
                'ru': 'VR6AewLTigWG4xSOukaG', // Sam - Russian (fallback)
                'ar': 'VR6AewLTigWG4xSOukaG', // Sam - Arabic (fallback)
                'hi': 'VR6AewLTigWG4xSOukaG'  // Sam - Hindi (fallback)
            };
            selectedVoiceId = voiceMapping[targetLanguage] || voiceMapping['en'];
        }

        const audioPath = path.join(outputDir, `elevenlabs_tts_${Date.now()}.mp3`);

        // Realizar petición a ElevenLabs
        const response = await fetch(`${config.ELEVENLABS_CONFIG.API_BASE_URL}${config.ELEVENLABS_CONFIG.TTS_ENDPOINT}/${selectedVoiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response ElevenLabs:', errorText);
            throw new Error(`Error en ElevenLabs API: ${response.status} - ${errorText}`);
        }

        // Guardar el audio
        const audioBuffer = await response.arrayBuffer();
        await fs.writeFile(audioPath, Buffer.from(audioBuffer));

        console.log('Audio TTS generado con ElevenLabs:', audioPath);
        return audioPath;

    } catch (error) {
        console.error('Error en generateElevenLabsTTS:', error);
        throw error;
    }
}

// Sincroniza audio TTS con video
async function synchronizeAudioWithVideo(videoPath, audioPath, outputDir) {
    return new Promise((resolve, reject) => {
        const finalVideoPath = path.join(outputDir, `translated_video_${Date.now()}.mp4`);
        ffmpeg(videoPath)
            .input(audioPath)
            .outputOptions([
                '-c:v copy',
                '-c:a aac',
                '-map 0:v:0',
                '-map 1:a:0',
                '-shortest'
            ])
            .on('end', () => resolve(finalVideoPath))
            .on('error', reject)
            .save(finalVideoPath);
    });
}

// Limpia archivos temporales
async function cleanupTempFiles(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            await fs.remove(filePath);
        }
    } catch (err) {
        console.error('Error limpiando archivo temporal:', err);
    }
}

module.exports = {
    generateUniqueFilename,
    validateVideoFile,
    convertVideoToAudio,
    transcribeAudio,
    translateText,
    generateTTSAudio,
    generateGTTSAudio,
    generateElevenLabsTTS,
    synchronizeAudioWithVideo,
    cleanupTempFiles,
    cleanTranscription,
    getElevenLabsVoices
};