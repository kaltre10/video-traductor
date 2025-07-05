# 🎥 Video to Text Converter

Sistema modular para convertir videos a texto usando transcripción de audio con Whisper.

## 📋 Descripción

Este proyecto permite subir un archivo de video, extraer el audio y transcribirlo a texto usando la tecnología Whisper de OpenAI de forma local y gratuita.

## 🔄 Flujo del Sistema

```
Video → Audio → Texto → Traducción → Audio TTS → Video Final
  ↓       ↓         ↓         ↓           ↓          ↓
FFmpeg  Whisper  LibreTranslate  gTTS/ElevenLabs  FFmpeg  Resultado
```

### Pasos detallados:

1. **Subida de Video** - Interfaz web con drag & drop
2. **Conversión Video → Audio** - FFmpeg extrae audio MP3
3. **Transcripción Audio → Texto** - Whisper transcribe el audio
4. **Traducción Texto** - LibreTranslate/Lingva traduce al idioma seleccionado
5. **Generación Audio TTS** - gTTS (gratuito) o ElevenLabs (premium) crea audio en el idioma destino
6. **Sincronización** - FFmpeg combina video original con audio traducido
7. **Resultado** - Video traducido disponible para descarga

## 🛠️ Requerimientos

### Software necesario:
- **Node.js** (v14 o superior)
- **Python** (v3.7 o superior)
- **FFmpeg** (instalado en el sistema)

### Dependencias de Node.js:
- `express` - Servidor web
- `multer` - Manejo de archivos
- `fs-extra` - Operaciones de archivos
- `fluent-ffmpeg` - Interfaz con FFmpeg
- `uuid` - Generación de IDs únicos

### Dependencias de Python:
- `openai-whisper` - Transcripción de audio
- `libretranslate` - Traducción local (opcional)

## 📦 Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd proto
```

### 2. Instalar dependencias de Node.js
```bash
npm install
```

### 3. Instalar Whisper y LibreTranslate
```bash
pip install openai-whisper
pip install libretranslate
```

### 4. Instalar FFmpeg

#### Windows:
```bash
# Usando Chocolatey
choco install ffmpeg

# O descargar desde: https://ffmpeg.org/download.html
```

#### macOS:
```bash
# Usando Homebrew
brew install ffmpeg
```

#### Linux:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg
```

## 🚀 Uso

### 1. Iniciar el servidor
```bash
npm start
```

### 2. Abrir en el navegador
```
http://localhost:3000
```

### 3. Configurar servicio de traducción

#### Opción A: LibreTranslate (local, sin límites)
```bash
# Instalar LibreTranslate
pip install libretranslate

# Iniciar en otra terminal
libretranslate --host 0.0.0.0 --port 5000
```

#### Opción B: Lingva API (online, sin límites, sin instalación)
```bash
# No requiere instalación - usar directamente
# Configurar variable de entorno para usar Lingva
export USE_LINGVA=true
```

### 4. Configurar ElevenLabs (opcional - para TTS premium)
```bash
# Crear archivo .env
cp env.example .env

# Editar .env y agregar tu API key de ElevenLabs
ELEVENLABS_API_KEY=tu_api_key_aqui
```

### 5. Subir video
- Arrastra un archivo de video o haz clic para seleccionar
- Selecciona el idioma de destino
- **Elige el proveedor de TTS**: gTTS (gratuito) o ElevenLabs (premium)
- El sistema procesará automáticamente
- El video traducido aparecerá al finalizar

## 📁 Estructura del Proyecto

```
proto/
├── server.js          # Servidor principal
├── config.js          # Configuraciones
├── utils.js           # Funciones utilitarias
├── package.json       # Dependencias Node.js
├── public/            # Interfaz web
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── uploads/           # Archivos temporales
└── outputs/           # Archivos procesados
```

## ⚙️ Configuración

### Archivo `config.js`:
```javascript
module.exports = {
    PORT: 3000,                    // Puerto del servidor
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB límite
    UPLOAD_DIR: './uploads',       // Directorio de subidas
    OUTPUT_DIR: './outputs',       // Directorio de salida
    FFMPEG_CONFIG: {               // Configuración FFmpeg
        audioCodec: 'libmp3lame',
        audioBitrate: 128,
        format: 'mp3'
    }
};
```

## 🔧 API Endpoints

### POST `/api/process-video`
Sube y procesa un video
- **Body**: `FormData` con campo `video`
- **Response**: `{ processId: "uuid" }`

### GET `/api/progress/:processId`
Obtiene el progreso del procesamiento
- **Response**: `{ status, progress, transcribedText }`

### GET `/api/download/:filename`
Descarga archivos procesados

## 🎯 Características

### ✅ Ventajas:
- **Gratuito** - Sin costos ni límites (con gTTS)
- **Local** - Funciona offline
- **Alta calidad** - Usa Whisper de OpenAI
- **Múltiples idiomas** - Detección automática
- **Interfaz moderna** - Drag & drop
- **Progreso en tiempo real** - Barra de progreso
- **Arquitectura modular** - Fácil mantenimiento
- **TTS Premium** - Opción ElevenLabs para mejor calidad de voz

### 🎤 Proveedores de TTS:

#### gTTS (Google Text-to-Speech) - **Gratuito**
- ✅ Sin costos
- ✅ Múltiples idiomas
- ✅ Fácil de usar
- ❌ Calidad de voz básica
- ❌ Requiere conexión a internet

#### ElevenLabs - **Premium**
- ✅ Calidad de voz profesional
- ✅ Voces naturales y expresivas
- ✅ Múltiples voces por idioma
- ❌ Requiere API key
- ❌ Consume créditos
- ❌ Requiere conexión a internet

### 📊 Formatos soportados:
- **Video**: MP4, AVI, MOV, WMV, FLV, WebM
- **Audio**: MP3 (generado automáticamente)
- **Tamaño**: Hasta 100MB

## 🐛 Solución de Problemas

### Error: "FFmpeg not found"
```bash
# Verificar instalación
ffmpeg -version

# Si no está instalado, seguir pasos de instalación arriba
```

### Error: "Whisper not found"
```bash
# Reinstalar Whisper
pip uninstall openai-whisper
pip install openai-whisper
```

### Error: "Port already in use"
```bash
# Cambiar puerto en config.js
PORT: 3001
```

## 📝 Licencia

MIT License - Libre para uso comercial y personal.

## 🤝 Contribuciones

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

**Desarrollado con ❤️ usando Node.js, FFmpeg y Whisper** 