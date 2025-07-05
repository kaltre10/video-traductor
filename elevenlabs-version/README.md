# 🎬 Doblaje de Video con ElevenLabs

Un servidor Node.js que utiliza la API de ElevenLabs para doblar videos a diferentes idiomas de forma profesional.

## ✨ Características

- **Doblaje profesional**: Utiliza la API de ElevenLabs para doblaje de alta calidad
- **Múltiples idiomas**: Soporte para 12 idiomas diferentes
- **Interfaz moderna**: UI intuitiva y responsive
- **Progreso en tiempo real**: Seguimiento del progreso del doblaje
- **Estimaciones de tiempo**: Muestra tiempo transcurrido, restante y completado
- **Videos largos**: Soporte para videos de hasta 5GB
- **Gestión de créditos**: Verificación de créditos disponibles de ElevenLabs

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd elevenlabs-version
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env
   ```
   
   Edita el archivo `.env` y agrega tu API key de ElevenLabs:
   ```
   ELEVENLABS_API_KEY=tu_api_key_aqui
   ```

4. **Obtener API Key de ElevenLabs**
   - Ve a [ElevenLabs](https://elevenlabs.io/)
   - Crea una cuenta o inicia sesión
   - Ve a tu perfil y copia tu API key
   - Pégala en el archivo `.env`

## 🎯 Uso

1. **Iniciar el servidor**
   ```bash
   npm start
   ```

2. **Abrir en el navegador**
   ```
   http://localhost:3001
   ```

3. **Subir un video**
   - Arrastra un archivo de video o haz clic para seleccionar
   - Elige el idioma de destino
   - Haz clic en "Iniciar Doblaje"

4. **Seguir el progreso**
   - El sistema mostrará el progreso en tiempo real
   - Puedes ver estimaciones de tiempo en el modal
   - El video doblado se descargará automáticamente

## 🌍 Idiomas Soportados

- 🇺🇸 Inglés (en)
- 🇪🇸 Español (es)
- 🇫🇷 Francés (fr)
- 🇩🇪 Alemán (de)
- 🇮🇹 Italiano (it)
- 🇵🇹 Portugués (pt)
- 🇯🇵 Japonés (ja)
- 🇰🇷 Coreano (ko)
- 🇨🇳 Chino (zh)
- 🇷🇺 Ruso (ru)
- 🇸🇦 Árabe (ar)
- 🇮🇳 Hindi (hi)

## 📁 Estructura del Proyecto

```
elevenlabs-version/
├── config.js              # Configuración del servidor
├── server.js              # Servidor principal
├── elevenlabs-service.js  # Servicio de ElevenLabs
├── package.json           # Dependencias
├── env.example           # Variables de entorno de ejemplo
├── public/               # Frontend
│   ├── index.html        # Página principal
│   ├── styles.css        # Estilos
│   └── script.js         # JavaScript del frontend
├── uploads/              # Videos subidos (se crea automáticamente)
└── outputs/              # Videos doblados (se crea automáticamente)
```

## ⚙️ Configuración

### Variables de Entorno

- `ELEVENLABS_API_KEY`: Tu API key de ElevenLabs (requerido)
- `PORT`: Puerto del servidor (por defecto: 3001)

### Límites de Archivo

- **Tamaño máximo**: 5GB
- **Formatos soportados**: MP4, AVI, MOV, WMV, FLV, WebM
- **Duración máxima**: 4 horas

## 🔧 API Endpoints

### POST `/api/process-video`
Inicia el proceso de doblaje de un video.

**Parámetros:**
- `video`: Archivo de video (multipart/form-data)
- `targetLanguage`: Código del idioma de destino

**Respuesta:**
```json
{
  "processId": "uuid",
  "message": "Doblaje iniciado exitosamente"
}
```

### GET `/api/progress/:processId`
Obtiene el progreso del doblaje.

**Respuesta:**
```json
{
  "status": "processing|completed|error",
  "progress": 75,
  "message": "Doblando...",
  "timeEstimates": {
    "elapsed": "2m 30s",
    "remaining": "1m 15s",
    "completionTime": "14:30:25"
  }
}
```

### GET `/api/download/:filename`
Descarga el video doblado.

### GET `/api/credits`
Obtiene información de créditos de ElevenLabs.

## 💰 Créditos de ElevenLabs

El sistema verifica automáticamente tus créditos disponibles. Los créditos se consumen según:

- **Duración del video**: Más tiempo = más créditos
- **Idioma de destino**: Algunos idiomas pueden costar más
- **Calidad del doblaje**: ElevenLabs ofrece diferentes niveles de calidad

## 🐛 Solución de Problemas

### Error: "ELEVENLABS_API_KEY no está configurada"
- Verifica que el archivo `.env` existe
- Asegúrate de que la API key esté correctamente configurada
- Reinicia el servidor después de cambiar la configuración

### Error: "Error en ElevenLabs API"
- Verifica que tu API key sea válida
- Revisa tu saldo de créditos en ElevenLabs
- Asegúrate de que el video no exceda los límites

### El progreso no se actualiza
- Verifica la conexión a internet
- Revisa la consola del navegador para errores
- Intenta recargar la página

## 📝 Notas Importantes

- **Conexión a internet**: Requerida para comunicarse con ElevenLabs
- **Tiempo de procesamiento**: Varía según la duración del video (típicamente 5-10 minutos)
- **Almacenamiento**: Los videos se almacenan temporalmente y se limpian automáticamente
- **Créditos**: Monitorea tu uso de créditos en ElevenLabs

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- [ElevenLabs](https://elevenlabs.io/) por proporcionar la API de doblaje
- La comunidad de desarrolladores por las librerías utilizadas 