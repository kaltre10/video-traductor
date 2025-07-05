# Video to Audio Converter - Docker Edition

Esta es la versión Docker del convertidor de video a audio con soporte para gTTS y ElevenLabs.

## 🐳 Características

- ✅ **Docker completo**: Incluye Node.js y Python en una sola imagen
- ✅ **gTTS**: Text-to-Speech de Google (gratuito)
- ✅ **ElevenLabs**: Text-to-Speech de alta calidad (requiere API key)
- ✅ **Whisper**: Transcripción de audio a texto
- ✅ **Traducción**: LibreTranslate y Lingva
- ✅ **FFmpeg**: Conversión de video a audio
- ✅ **Listo para la nube**: Fácil despliegue en servicios gratuitos

## 🚀 Despliegue Rápido

### Opción 1: Railway (Recomendado)

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login y desplegar
railway login
railway init
railway up
```

### Opción 2: Render

1. Ve a [render.com](https://render.com)
2. Conecta tu repositorio de GitHub
3. Crea un "Web Service"
4. Configura las variables de entorno
5. ¡Listo!

### Opción 3: Local con Docker

```bash
# Construir imagen
docker build -t video-converter .

# Ejecutar
docker run -p 3000:3000 -e ELEVENLABS_API_KEY=tu_key video-converter
```

## 📋 Variables de Entorno

Crea un archivo `.env`:

```env
# ElevenLabs (opcional)
ELEVENLABS_API_KEY=tu_api_key_aqui

# Puerto (opcional)
PORT=3000

# Traducción
LIBRETRANSLATE_URL=https://libretranslate.com
LINGVA_URL=https://lingva.ml
```

## 🛠️ Desarrollo Local

### Con Docker Compose:

```bash
# Instalar dependencias y ejecutar
docker-compose up --build

# Ejecutar en background
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

### Sin Docker (desarrollo):

```bash
# Instalar Node.js y Python
npm install
pip install -r requirements.txt

# Ejecutar
npm start
```

## 📁 Estructura del Proyecto

```
├── Dockerfile              # Configuración de Docker
├── docker-compose.yml      # Orquestación de contenedores
├── requirements.txt        # Dependencias de Python
├── package.json           # Dependencias de Node.js
├── server.js              # Servidor principal
├── utils.js               # Utilidades (TTS, traducción)
├── config.js              # Configuración
├── public/                # Frontend
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── uploads/               # Videos subidos
└── outputs/               # Videos procesados
```

## 🔧 Configuración

### TTS Providers

1. **gTTS** (Gratuito):
   - No requiere configuración
   - Calidad estándar
   - Soporte para múltiples idiomas

2. **ElevenLabs** (Premium):
   - Requiere API key
   - Calidad superior
   - Voces más naturales
   - Configurar `ELEVENLABS_API_KEY` en variables de entorno

### Traducción

- **LibreTranslate**: Servicio gratuito y open source
- **Lingva**: Servicio alternativo gratuito
- Fallback automático entre servicios

## 🌐 Servicios de Despliegue Gratuito

| Servicio | Horas Gratis | Ventajas |
|----------|-------------|----------|
| **Railway** | 500/mes | Más fácil, detección automática de Docker |
| **Render** | 750/mes | SSL automático, muy confiable |
| **Fly.io** | 3 VMs siempre | Muy rápido, distribución global |
| **Google Cloud Run** | 2M requests/mes | Escalado automático, muy confiable |

## 📊 Límites de Servicios Gratuitos

- **Tamaño de archivo**: 100MB - 1GB
- **Tiempo de procesamiento**: 10-30 minutos
- **Almacenamiento**: Temporal (se pierde al reiniciar)
- **Rate limiting**: Variable según el servicio

## 🐛 Solución de Problemas

### Error: "No se pudo generar audio TTS"
- Verifica que las dependencias de Python estén instaladas
- Revisa los logs del contenedor: `docker logs <container_id>`

### Error: "ElevenLabs API key no válida"
- Verifica que `ELEVENLABS_API_KEY` esté configurada correctamente
- Asegúrate de que la API key tenga créditos disponibles

### Error: "FFmpeg no encontrado"
- FFmpeg está incluido en la imagen Docker
- Si ejecutas localmente, instala FFmpeg: `apt-get install ffmpeg`

### Error: "Puerto ya en uso"
- Cambia el puerto en `docker-compose.yml` o variables de entorno
- Verifica que no haya otro servicio usando el puerto 3000

## 🔄 Actualizaciones

Para actualizar la aplicación:

```bash
# Con Docker Compose
docker-compose down
docker-compose up --build

# Con Railway
git push origin main  # Railway se actualiza automáticamente

# Con Render
git push origin main  # Render se actualiza automáticamente
```

## 📝 Licencia

MIT License - Libre para uso personal y comercial.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

**¡Disfruta convirtiendo tus videos! 🎬➡️🎵** 