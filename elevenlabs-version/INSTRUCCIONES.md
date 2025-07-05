# 🚀 Instrucciones Rápidas - ElevenLabs Version

## Configuración Inicial

1. **Obtener API Key de ElevenLabs**
   - Ve a [ElevenLabs](https://elevenlabs.io/)
   - Crea cuenta o inicia sesión
   - Ve a tu perfil → API Key
   - Copia tu API key

2. **Configurar el proyecto**
   ```bash
   # Crear archivo .env
   cp env.example .env
   
   # Editar .env y agregar tu API key
   ELEVENLABS_API_KEY=tu_api_key_aqui
   ```

3. **Verificar configuración**
   ```bash
   node test-server.js
   ```

## Uso

1. **Iniciar servidor**
   ```bash
   npm start
   ```

2. **Abrir navegador**
   ```
   http://localhost:3001
   ```

3. **Subir video y doblar**
   - Arrastra video o selecciona archivo
   - Elige idioma destino
   - Haz clic en "Iniciar Doblaje"
   - Espera el procesamiento
   - Descarga el resultado

## Características

✅ **Doblaje profesional** con ElevenLabs  
✅ **12 idiomas** soportados  
✅ **Videos hasta 5GB**  
✅ **Progreso en tiempo real**  
✅ **Estimaciones de tiempo**  
✅ **Interfaz moderna**  

## Diferencias con el proyecto original

| Característica | Proyecto Original | ElevenLabs Version |
|----------------|-------------------|-------------------|
| **Transcripción** | Whisper (Python) | ElevenLabs API |
| **Traducción** | LibreTranslate | ElevenLabs API |
| **TTS** | gTTS (Python) | ElevenLabs API |
| **Sincronización** | FFmpeg | ElevenLabs API |
| **Complejidad** | Alta (múltiples servicios) | Baja (un solo servicio) |
| **Velocidad** | Media (procesamiento local) | Alta (servicio en la nube) |
| **Calidad** | Variable | Profesional |
| **Costo** | Gratis | Créditos ElevenLabs |

## Ventajas de ElevenLabs

🎯 **Más simple**: Un solo servicio para todo el proceso  
⚡ **Más rápido**: Procesamiento en la nube  
🎨 **Mejor calidad**: Doblaje profesional  
🔧 **Menos mantenimiento**: No requiere Python/FFmpeg  
📱 **Más confiable**: Servicio estable y probado  

## Notas importantes

- **Conexión a internet** requerida
- **Créditos ElevenLabs** necesarios
- **Tiempo de procesamiento**: 5-10 minutos típico
- **Puerto**: 3001 (diferente al proyecto original)

## Solución de problemas

**Error de API Key**: Verifica que `.env` tenga `ELEVENLABS_API_KEY=tu_key`  
**Error de créditos**: Revisa tu saldo en ElevenLabs  
**Video no se procesa**: Verifica formato y tamaño (máx 5GB)  
**Progreso no actualiza**: Recarga la página o verifica conexión 