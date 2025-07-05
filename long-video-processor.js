const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const config = require('./config');
const utils = require('./utils');

class LongVideoProcessor {
    constructor() {
        this.chunks = [];
        this.currentChunk = 0;
        this.totalChunks = 0;
        this.progress = 0;
    }

    // Dividir video en chunks
    async splitVideoIntoChunks(videoPath, chunkDuration = 600) { // 10 minutos por defecto
        return new Promise((resolve, reject) => {
            const outputDir = path.join(config.OUTPUT_DIR, 'chunks');
            fs.ensureDirSync(outputDir);

            // Obtener duración del video
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) return reject(err);

                const totalDuration = metadata.format.duration;
                this.totalChunks = Math.ceil(totalDuration / chunkDuration);
                const chunks = [];

                console.log(`Dividiendo video de ${totalDuration}s en ${this.totalChunks} chunks`);

                for (let i = 0; i < this.totalChunks; i++) {
                    const startTime = i * chunkDuration;
                    const endTime = Math.min((i + 1) * chunkDuration, totalDuration);
                    const chunkPath = path.join(outputDir, `chunk_${i}.mp4`);

                    chunks.push({
                        index: i,
                        path: chunkPath,
                        startTime,
                        endTime,
                        duration: endTime - startTime
                    });
                }

                // Crear chunks usando FFmpeg
                this.createChunks(videoPath, chunks, resolve, reject);
            });
        });
    }

    // Crear chunks individuales
    createChunks(videoPath, chunks, resolve, reject) {
        let completedChunks = 0;

        chunks.forEach(chunk => {
            ffmpeg(videoPath)
                .setStartTime(chunk.startTime)
                .setDuration(chunk.duration)
                .output(chunk.path)
                .on('end', () => {
                    completedChunks++;
                    console.log(`Chunk ${chunk.index + 1}/${chunks.length} creado`);

                    if (completedChunks === chunks.length) {
                        this.chunks = chunks;
                        resolve(chunks);
                    }
                })
                .on('error', reject)
                .run();
        });
    }

    // Procesar un chunk individual
    async processChunk(chunk, targetLanguage) {
        console.log(`Procesando chunk ${chunk.index + 1}/${this.totalChunks}`);

        try {
            // Step 1: Convertir chunk a audio
            const audioPath = await utils.convertVideoToAudio(chunk.path, config.OUTPUT_DIR);

            // Step 2: Transcribir audio
            const transcribedText = await utils.transcribeAudio(audioPath);
            const cleanText = utils.cleanTranscription(transcribedText);

            // Step 3: Traducir texto
            const translatedText = await utils.translateText(cleanText, targetLanguage, config.TRANSLATION_CONFIG.USE_LINGVA);

            // Step 4: Generar TTS
            const ttsAudioPath = await utils.generateTTSAudio(translatedText, targetLanguage, config.OUTPUT_DIR);

            // Step 5: Sincronizar con chunk original
            const finalChunkPath = await utils.synchronizeAudioWithVideo(chunk.path, ttsAudioPath, config.OUTPUT_DIR);

            // Limpiar archivos temporales del chunk
            await utils.cleanupTempFiles(audioPath);
            await utils.cleanupTempFiles(ttsAudioPath);

            return {
                index: chunk.index,
                originalPath: chunk.path,
                finalPath: finalChunkPath,
                originalText: cleanText,
                translatedText: translatedText,
                startTime: chunk.startTime,
                endTime: chunk.endTime
            };

        } catch (error) {
            console.error(`Error procesando chunk ${chunk.index}:`, error);
            throw error;
        }
    }

    // Procesar video completo en chunks
    async processLongVideo(videoPath, targetLanguage, progressCallback) {
        try {
            console.log('🚀 Iniciando procesamiento de video largo...');

            // Step 1: Dividir video en chunks
            await this.splitVideoIntoChunks(videoPath, config.LONG_VIDEO_CONFIG.CHUNK_DURATION);

            const processedChunks = [];
            const totalChunks = this.chunks.length;

            // Step 2: Procesar cada chunk
            for (let i = 0; i < this.chunks.length; i++) {
                const chunk = this.chunks[i];

                // Actualizar progreso
                this.progress = (i / totalChunks) * 100;
                if (progressCallback) {
                    progressCallback({
                        step: 'processing_chunk',
                        currentChunk: i + 1,
                        totalChunks: totalChunks,
                        progress: this.progress,
                        message: `Procesando chunk ${i + 1}/${totalChunks}`
                    });
                }

                const processedChunk = await this.processChunk(chunk, targetLanguage);
                processedChunks.push(processedChunk);
            }

            // Step 3: Combinar chunks procesados
            console.log('🔗 Combinando chunks procesados...');
            const finalVideoPath = await this.combineChunks(processedChunks, videoPath);

            // Step 4: Limpiar chunks temporales
            if (config.LONG_VIDEO_CONFIG.CLEANUP_CHUNKS) {
                await this.cleanupChunks();
            }

            console.log('✅ Video largo procesado exitosamente');
            return {
                finalVideoPath,
                chunks: processedChunks,
                totalDuration: processedChunks.reduce((sum, chunk) => sum + chunk.duration, 0)
            };

        } catch (error) {
            console.error('❌ Error procesando video largo:', error);
            throw error;
        }
    }

    // Combinar chunks procesados
    async combineChunks(processedChunks, originalVideoPath) {
        return new Promise((resolve, reject) => {
            const finalVideoPath = path.join(config.OUTPUT_DIR, `final_long_video_${Date.now()}.mp4`);
            const chunkListPath = path.join(config.OUTPUT_DIR, 'chunk_list.txt');

            // Crear lista de archivos para FFmpeg
            const chunkList = processedChunks
                .sort((a, b) => a.index - b.index)
                .map(chunk => `file '${chunk.finalPath}'`)
                .join('\n');

            fs.writeFileSync(chunkListPath, chunkList);

            ffmpeg()
                .input(chunkListPath)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .outputOptions(['-c', 'copy'])
                .output(finalVideoPath)
                .on('end', () => {
                    // Limpiar archivo de lista
                    fs.removeSync(chunkListPath);
                    resolve(finalVideoPath);
                })
                .on('error', reject)
                .run();
        });
    }

    // Limpiar chunks temporales
    async cleanupChunks() {
        try {
            const chunksDir = path.join(config.OUTPUT_DIR, 'chunks');
            if (fs.existsSync(chunksDir)) {
                await fs.remove(chunksDir);
                console.log('🧹 Chunks temporales limpiados');
            }
        } catch (error) {
            console.error('Error limpiando chunks:', error);
        }
    }

    // Obtener información del video
    async getVideoInfo(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) return reject(err);

                const duration = metadata.format.duration;
                const size = metadata.format.size;
                const bitrate = metadata.format.bit_rate;

                resolve({
                    duration,
                    size,
                    bitrate,
                    format: metadata.format.format_name,
                    estimatedChunks: Math.ceil(duration / config.LONG_VIDEO_CONFIG.CHUNK_DURATION),
                    estimatedProcessingTime: Math.ceil(duration / 60) * 5 // ~5 minutos por minuto de video
                });
            });
        });
    }
}

module.exports = LongVideoProcessor; 