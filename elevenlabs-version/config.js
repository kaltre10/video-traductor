const path = require('path');

module.exports = {
    // Configuración del servidor
    PORT: process.env.PORT || 3001, // Puerto diferente al proyecto original

    // Configuración de archivos
    MAX_FILE_SIZE: 5 * 1024 * 1024 * 1024, // 5GB para videos largos
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'],

    // Directorios
    UPLOAD_DIR: path.join(__dirname, 'uploads'),
    OUTPUT_DIR: path.join(__dirname, 'outputs'),
    PUBLIC_DIR: path.join(__dirname, 'public'),

    // Configuración de ElevenLabs
    ELEVENLABS_CONFIG: {
        API_KEY: process.env.ELEVENLABS_API_KEY,
        API_BASE_URL: 'https://api.elevenlabs.io/v1',
        DUBBING_ENDPOINT: '/dubbing',
        POLLING_INTERVAL: 5000, // 5 segundos
        MAX_RETRIES: 10,
        TIMEOUT: 300000 // 5 minutos
    },

    // Configuración de idiomas soportados
    SUPPORTED_LANGUAGES: {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'ru': 'Russian',
        'ar': 'Arabic',
        'hi': 'Hindi'
    },

    // Configuración de procesamiento
    PROCESSING_CONFIG: {
        ENABLE_CHUNKING: true,
        CHUNK_DURATION: 10 * 60, // 10 minutos por chunk
        MAX_VIDEO_DURATION: 4 * 60 * 60, // 4 horas máximo
        ENABLE_PROGRESS_SAVE: true,
        CLEANUP_CHUNKS: true
    }
}; 