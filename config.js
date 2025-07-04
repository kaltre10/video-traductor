const path = require('path');

module.exports = {
    // Configuración del servidor
    PORT: process.env.PORT || 3000,

    // Configuración de archivos
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
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
    }
}; 