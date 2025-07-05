const path = require('path');

module.exports = {
    // Configuración del servidor
    PORT: process.env.PORT || 3000,

    // Configuración de archivos
    MAX_FILE_SIZE: 5 * 1024 * 1024 * 1024, // 5GB (para videos de 2-3 horas)
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'],

    // Directorios
    UPLOAD_DIR: path.join(__dirname, 'uploads'),
    OUTPUT_DIR: path.join(__dirname, 'outputs'),
    PUBLIC_DIR: path.join(__dirname, 'public'),

    // Configuración de FFmpeg
    FFMPEG_CONFIG: {
        audioCodec: 'libmp3lame',
        audioBitrate: 128,
        format: 'mp3'
    },

    // Configuración de traducción
    TRANSLATION_CONFIG: {
        // true = usar Lingva, false = usar LibreTranslate
        USE_LINGVA: process.env.USE_LINGVA === 'true' || false,
        // URLs de los servicios
        LIBRETRANSLATE_URL: 'http://localhost:5000',
        LINGVA_URL: 'https://lingva.ml/api/v1'
    },

    // Configuración para videos largos
    LONG_VIDEO_CONFIG: {
        ENABLE_CHUNKING: true, // Procesar en chunks
        CHUNK_DURATION: 10 * 60, // 10 minutos por chunk
        MAX_VIDEO_DURATION: 4 * 60 * 60, // 4 horas máximo
        ENABLE_PROGRESS_SAVE: true, // Guardar progreso
        CLEANUP_CHUNKS: true // Limpiar chunks temporales
    },

    // Configuración de ElevenLabs TTS
    ELEVENLABS_CONFIG: {
        API_KEY: process.env.ELEVENLABS_API_KEY,
        API_BASE_URL: 'https://api.elevenlabs.io/v1',
        TTS_ENDPOINT: '/text-to-speech',
        VOICES_ENDPOINT: '/voices',
        POLLING_INTERVAL: 1000, // 1 segundo
        MAX_RETRIES: 5,
        TIMEOUT: 30000 // 30 segundos
    }
}; 