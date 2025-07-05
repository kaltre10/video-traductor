# Despliegue en la Nube Gratuita

Este proyecto puede ser desplegado en varios servicios gratuitos de la nube. Aquí tienes las opciones más populares:

## 1. Railway (Recomendado - Más Fácil)

Railway ofrece un tier gratuito generoso y es muy fácil de usar:

### Pasos:
1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Railway detectará automáticamente el `Dockerfile` y lo usará
4. Configura las variables de entorno en Railway:
   - `ELEVENLABS_API_KEY` (si usas ElevenLabs)
   - `PORT=3000`
5. ¡Listo! Tu app estará disponible en una URL como `https://tu-app.railway.app`

### Ventajas:
- ✅ Detección automática de Docker
- ✅ SSL automático
- ✅ Despliegue automático desde GitHub
- ✅ 500 horas gratis por mes
- ✅ Muy fácil de configurar

## 2. Render

Render también tiene un tier gratuito:

### Pasos:
1. Ve a [render.com](https://render.com) y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Crea un nuevo "Web Service"
4. Selecciona tu repositorio
5. Configura:
   - **Build Command**: `docker build -t video-converter .`
   - **Start Command**: `docker run -p 3000:3000 video-converter`
6. Configura las variables de entorno
7. ¡Listo!

### Ventajas:
- ✅ SSL automático
- ✅ Despliegue automático
- ✅ 750 horas gratis por mes

## 3. Fly.io

Fly.io tiene un tier gratuito muy generoso:

### Pasos:
1. Instala Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Ejecuta `fly auth signup`
3. En tu proyecto, ejecuta `fly launch`
4. Fly detectará el Dockerfile automáticamente
5. Configura las variables de entorno con `fly secrets set`
6. ¡Listo!

### Ventajas:
- ✅ 3 VMs pequeñas gratis por siempre
- ✅ Muy rápido
- ✅ Distribución global

## 4. Google Cloud Run

Google Cloud Run tiene un tier gratuito:

### Pasos:
1. Instala Google Cloud CLI
2. Ejecuta `gcloud auth login`
3. Ejecuta `gcloud run deploy --source .`
4. Configura las variables de entorno
5. ¡Listo!

### Ventajas:
- ✅ 2 millones de requests gratis por mes
- ✅ Escalado automático a cero
- ✅ Muy confiable

## Variables de Entorno Necesarias

Crea un archivo `.env` o configura estas variables en tu plataforma:

```env
# ElevenLabs (opcional - solo si usas ElevenLabs)
ELEVENLABS_API_KEY=tu_api_key_aqui

# Puerto (opcional - por defecto 3000)
PORT=3000

# Configuración de traducción
LIBRETRANSLATE_URL=https://libretranslate.com
LINGVA_URL=https://lingva.ml
```

## Comandos Útiles

### Construir y ejecutar localmente:
```bash
# Construir imagen
docker build -t video-converter .

# Ejecutar localmente
docker run -p 3000:3000 -e ELEVENLABS_API_KEY=tu_key video-converter
```

### Con Docker Compose:
```bash
# Construir y ejecutar
docker-compose up --build

# Ejecutar en background
docker-compose up -d --build
```

## Notas Importantes

1. **Límites de archivos**: Los servicios gratuitos suelen tener límites de tamaño de archivo (generalmente 100MB-1GB)
2. **Tiempo de procesamiento**: Los servicios gratuitos pueden tener timeouts (generalmente 10-30 minutos)
3. **Almacenamiento**: Los archivos se perderán al reiniciar el contenedor, considera usar almacenamiento persistente
4. **Rate limiting**: Algunos servicios pueden limitar las requests por minuto

## Recomendación

Para empezar, **Railway** es la opción más fácil y confiable. Ofrece:
- Detección automática de Docker
- Configuración mínima
- SSL automático
- Despliegue automático desde GitHub
- 500 horas gratis por mes (suficiente para desarrollo y uso personal) 