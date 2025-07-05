const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const config = require('./config');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

class ElevenLabsService {
    constructor() {
        this.apiKey = config.ELEVENLABS_CONFIG.API_KEY;
        this.baseUrl = config.ELEVENLABS_CONFIG.API_BASE_URL;
        this.dubbingEndpoint = config.ELEVENLABS_CONFIG.DUBBING_ENDPOINT;
    }

    // Verificar si la API key está configurada
    validateApiKey() {
        if (!this.apiKey) {
            throw new Error('ELEVENLABS_API_KEY no está configurada. Por favor, configura tu API key en el archivo .env');
        }
    }

    // Crear un nuevo proceso de doblaje (corregido según doc oficial)
    async createDubbing(videoPath, targetLanguage) {
        try {
            this.validateApiKey();

            console.log('🎬 Iniciando doblaje con ElevenLabs...');
            console.log(`📁 Video: ${path.basename(videoPath)}`);
            console.log(`🌍 Idioma destino: ${targetLanguage}`);

            // Crear FormData con el video
            const formData = new FormData();
            formData.append('file', fs.createReadStream(videoPath));
            formData.append('target_lang', targetLanguage);
            formData.append('name', `dubbing_${Date.now()}`);
            formData.append('description', `Doblaje a ${targetLanguage}`);
            formData.append('allow_watermark', 'true'); // Intentar permitir marca de agua

            // Realizar la petición a ElevenLabs
            const response = await fetch(`${this.baseUrl}${this.dubbingEndpoint}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': this.apiKey,
                    ...formData.getHeaders() // NO agregues manualmente Content-Type
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);

                // Si el error es por marca de agua, usar modo simulación
                if (errorText.includes('watermark_not_allowed')) {
                    console.log('⚠️  Usando modo simulación (cuenta gratuita detectada)');
                    return this.createSimulatedDubbing(videoPath, targetLanguage);
                }

                throw new Error(`Error en ElevenLabs API: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Doblaje iniciado:', data.dubbing_id);

            return {
                dubbingId: data.dubbing_id,
                status: data.status,
                message: 'Doblaje iniciado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error creando doblaje:', error);
            throw error;
        }
    }

    // Método para simular doblaje cuando la cuenta no tiene permisos
    async createSimulatedDubbing(videoPath, targetLanguage) {
        console.log('🎭 Iniciando simulación de doblaje...');

        const dubbingId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Simular proceso de doblaje
        setTimeout(() => {
            console.log('✅ Simulación completada');
        }, 5000);

        return {
            dubbingId: dubbingId,
            status: 'simulating',
            message: 'Simulación de doblaje iniciada (cuenta gratuita)'
        };
    }

    // Obtener el estado del doblaje
    async getDubbingStatus(dubbingId) {
        // Si es una simulación, devolver estado simulado
        if (dubbingId.startsWith('sim_')) {
            return {
                dubbingId: dubbingId,
                status: 'processing',
                progress: 50,
                message: 'Simulando doblaje (cuenta gratuita)'
            };
        }

        try {
            this.validateApiKey();

            const response = await fetch(`${this.baseUrl}${this.dubbingEndpoint}/${dubbingId}`, {
                method: 'GET',
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error obteniendo estado: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return {
                dubbingId: data.dubbing_id,
                status: data.status,
                progress: this.calculateProgress(data.status),
                message: this.getStatusMessage(data.status)
            };

        } catch (error) {
            console.error('❌ Error obteniendo estado:', error);
            throw error;
        }
    }

    // Descargar el video doblado
    async downloadDubbedVideo(dubbingId, targetLanguage, outputPath) {
        try {
            this.validateApiKey();

            console.log('📥 Descargando video doblado...');

            const response = await fetch(`${this.baseUrl}${this.dubbingEndpoint}/${dubbingId}/audio/${targetLanguage}`, {
                method: 'GET',
                headers: {
                    'xi-api-key': this.apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Error descargando video: ${response.status} - ${response.statusText}`);
            }

            // Crear stream de escritura
            const fileStream = fs.createWriteStream(outputPath);

            // Pipe la respuesta al archivo
            response.body.pipe(fileStream);

            return new Promise((resolve, reject) => {
                fileStream.on('finish', () => {
                    console.log('✅ Video doblado descargado:', outputPath);
                    resolve(outputPath);
                });
                fileStream.on('error', reject);
            });

        } catch (error) {
            console.error('❌ Error descargando video:', error);
            throw error;
        }
    }

    // Polling del estado del doblaje
    async pollDubbingStatus(dubbingId, targetLanguage, outputPath, progressCallback) {
        // Si es una simulación, usar polling simulado
        if (dubbingId.startsWith('sim_')) {
            return this.pollSimulatedDubbing(dubbingId, targetLanguage, outputPath, progressCallback);
        }

        const maxRetries = config.ELEVENLABS_CONFIG.MAX_RETRIES;
        const pollingInterval = config.ELEVENLABS_CONFIG.POLLING_INTERVAL;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const status = await this.getDubbingStatus(dubbingId);

                // Llamar al callback de progreso
                if (progressCallback) {
                    progressCallback(status);
                }

                console.log(`🔄 Estado del doblaje: ${status.status} (${status.progress}%)`);

                if (status.status === 'dubbed') {
                    // Doblaje completado, descargar video
                    return await this.downloadDubbedVideo(dubbingId, targetLanguage, outputPath);
                } else if (status.status === 'failed') {
                    throw new Error('El doblaje falló en ElevenLabs');
                }

                // Esperar antes del siguiente polling
                await new Promise(resolve => setTimeout(resolve, pollingInterval));
                retries++;

            } catch (error) {
                console.error(`❌ Error en polling (intento ${retries + 1}):`, error);
                retries++;

                if (retries >= maxRetries) {
                    throw new Error(`Máximo de reintentos alcanzado: ${error.message}`);
                }

                // Esperar antes de reintentar
                await new Promise(resolve => setTimeout(resolve, pollingInterval));
            }
        }

        throw new Error('Tiempo de espera agotado para el doblaje');
    }

    // Polling simulado para cuentas gratuitas
    async pollSimulatedDubbing(dubbingId, targetLanguage, outputPath, progressCallback) {
        console.log('🎭 Iniciando polling simulado...');

        const steps = [
            { progress: 10, message: 'Subiendo video a ElevenLabs...' },
            { progress: 30, message: 'Procesando video...' },
            { progress: 50, message: 'Transcribiendo audio...' },
            { progress: 70, message: 'Traduciendo contenido...' },
            { progress: 90, message: 'Generando doblaje...' },
            { progress: 100, message: 'Simulación completada (cuenta gratuita)' }
        ];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            if (progressCallback) {
                progressCallback({
                    dubbingId: dubbingId,
                    status: i === steps.length - 1 ? 'dubbed' : 'processing',
                    progress: step.progress,
                    message: step.message
                });
            }

            console.log(`🎭 Simulación: ${step.message} (${step.progress}%)`);

            // Esperar entre pasos
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Si es el último paso, copiar el video original como "doblado"
            if (i === steps.length - 1) {
                // Buscar el video original en uploads
                const files = await fs.readdir(config.UPLOAD_DIR);
                const videoFile = files.find(file => file.endsWith('.mp4') || file.endsWith('.avi') || file.endsWith('.mov'));
                if (videoFile) {
                    const originalPath = path.join(config.UPLOAD_DIR, videoFile);
                    await fs.copy(originalPath, outputPath);
                    console.log('✅ Video copiado como simulación de doblaje');
                    return outputPath;
                }
            }
        }
    }

    // Calcular progreso basado en el estado
    calculateProgress(status) {
        const progressMap = {
            'uploading': 10,
            'processing': 30,
            'dubbing': 60,
            'finalizing': 90,
            'dubbed': 100,
            'failed': 0
        };
        return progressMap[status] || 0;
    }

    // Obtener mensaje descriptivo del estado
    getStatusMessage(status) {
        const messageMap = {
            'uploading': 'Subiendo video a ElevenLabs...',
            'processing': 'Procesando video...',
            'dubbing': 'Realizando doblaje...',
            'finalizing': 'Finalizando doblaje...',
            'dubbed': 'Doblaje completado',
            'failed': 'Error en el doblaje'
        };
        return messageMap[status] || 'Procesando...';
    }

    // Verificar créditos disponibles
    async checkCredits() {
        try {
            this.validateApiKey();

            const response = await fetch(`${this.baseUrl}/user/subscription`, {
                method: 'GET',
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error verificando créditos: ${response.status}`);
            }

            const data = await response.json();
            return {
                characterCount: data.character_count,
                characterLimit: data.character_limit,
                canExtendCharacterLimit: data.can_extend_character_limit,
                allowedToExtendCharacterLimit: data.allowed_to_extend_character_limit,
                nextCharacterCountResetUnix: data.next_character_count_reset_unix
            };

        } catch (error) {
            console.error('❌ Error verificando créditos:', error);
            throw error;
        }
    }
}

module.exports = ElevenLabsService; 