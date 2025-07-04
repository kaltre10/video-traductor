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

// Traduce texto usando LibreTranslate o Lingva con fallback automático
async function translateText(text, targetLanguage, useLingva = false) {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    try {
        // LibreTranslate API
        const url = 'https://libretranslate.de/translate';
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
            const url = `https://lingva.ml/api/v1/en/${targetLanguage}/${encodeURIComponent(text)}`;
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
async function generateTTSAudio(text, targetLanguage, outputDir) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`Generando audio TTS en idioma: ${targetLanguage}`);
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
                    console.log('Audio TTS generado:', successPath);
                    resolve(successPath);
                } else {
                    console.error('Error generando TTS:', errorOutput, output);
                    reject(new Error('Error generando TTS: ' + errorOutput + output));
                }
            });
        } catch (error) {
            console.error('Error en generateTTSAudio:', error);
            reject(error);
        }
    });
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
    synchronizeAudioWithVideo,
    cleanupTempFiles,
    cleanTranscription
};