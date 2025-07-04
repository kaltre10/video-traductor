# 🔄 Flujo Técnico y Requerimientos

## 📊 Flujo Detallado del Sistema

### 1. **Recepción del Video**
```
Cliente → Servidor (POST /api/process-video)
├── Validación de archivo (tipo, tamaño)
├── Generación de ID único (UUID)
├── Almacenamiento temporal en /uploads
└── Respuesta con processId
```

### 2. **Procesamiento Asíncrono**
```
Proceso en Background:
├── Step 1: Video → Audio (20% progreso)
│   ├── FFmpeg convierte video a MP3
│   ├── Audio guardado en /outputs
│   └── Actualización de progreso
│
├── Step 2: Audio → Texto (40% progreso)
│   ├── Whisper transcribe audio
│   ├── Texto extraído y procesado
│   └── Actualización de progreso
│
├── Step 3: Texto → Traducción (60% progreso)
│   ├── LibreTranslate/Lingva traduce texto
│   ├── Texto traducido al idioma seleccionado
│   └── Actualización de progreso
│
├── Step 4: Traducción → Audio TTS (80% progreso)
│   ├── gTTS genera audio en idioma destino
│   ├── Audio TTS guardado en /outputs
│   └── Actualización de progreso
│
└── Step 5: Sincronización → Video Final (100% progreso)
    ├── FFmpeg combina video original con audio TTS
    ├── Video traducido generado
    └── Limpieza de archivos temporales
```

### 3. **Seguimiento de Progreso**
```
Cliente ← Servidor (GET /api/progress/:processId)
├── Estado actual del proceso
├── Porcentaje de progreso
├── Texto transcrito (cuando complete)
└── Manejo de errores
```

## 🛠️ Requerimientos Técnicos

### **Sistema Operativo**
- Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- Arquitectura: x64 (recomendado)

### **Software Base**
```
Node.js >= 14.0.0
├── npm >= 6.0.0
└── Capacidad de ejecutar procesos child

Python >= 3.7
├── pip >= 20.0.0
└── Acceso a internet (primera ejecución)

FFmpeg >= 4.0
├── Codecs: libmp3lame, aac
└── Formatos: mp4, avi, mov, wmv, flv, webm
```

### **Dependencias Node.js**
```json
{
  "express": "^4.18.2",        // Servidor web
  "multer": "^1.4.5-lts.1",    // Manejo de archivos
  "fs-extra": "^11.1.1",       // Operaciones de archivos
  "fluent-ffmpeg": "^2.1.2",   // Interfaz FFmpeg
  "uuid": "^9.0.0"             // IDs únicos
}
```

### **Dependencias Python**
```bash
openai-whisper >= 20231117
├── torch >= 1.9.0
├── numpy >= 1.21.0
└── Modelo base (~400MB descarga automática)

libretranslate >= 1.1.0
├── flask >= 2.0.0
├── transformers >= 4.0.0
└── Modelos de idiomas (~2GB descarga automática)
```

### **Servicios de Traducción (Alternativas)**
```bash
# Opción 1: LibreTranslate (local, sin límites)
libretranslate --host 0.0.0.0 --port 5000

# Opción 2: Lingva API (online, sin límites, sin API key)
# No requiere instalación - servicio web gratuito
```

## 💾 Requerimientos de Almacenamiento

### **Espacio en Disco**
```
Mínimo: 4GB
├── Node.js: ~200MB
├── Python + Whisper: ~1GB
├── LibreTranslate + modelos: ~2GB
├── FFmpeg: ~50MB
├── Archivos temporales: ~500MB
└── Buffer para procesamiento: ~250MB
```

### **Memoria RAM**
```
Mínimo: 4GB
├── Node.js: ~100MB
├── Whisper (modelo base): ~1GB
├── FFmpeg: ~50MB
└── Sistema operativo: ~2GB
```

## 🌐 Requerimientos de Red

### **Primera Instalación**
```
Descargas necesarias:
├── Modelo Whisper base: ~400MB
├── Dependencias Python: ~500MB
└── Dependencias Node.js: ~50MB
```

### **Uso Normal**
```
Sin conexión requerida
├── Procesamiento 100% local
├── No requiere API keys
└── No límites de uso
```

## ⚡ Requerimientos de Rendimiento

### **CPU**
```
Mínimo: 2 cores
Recomendado: 4+ cores
├── FFmpeg: 1-2 cores
├── Whisper: 2+ cores
└── Sistema: 1 core
```

### **Velocidad de Procesamiento**
```
Estimaciones por minuto de video:
├── Video → Audio: ~30 segundos
├── Audio → Texto: ~60-120 segundos
├── Texto → Traducción: ~30-60 segundos
├── Traducción → Audio TTS: ~30-90 segundos
├── Sincronización → Video Final: ~30-60 segundos
└── Total: ~3-6 minutos
```

## 🔧 Configuración del Sistema

### **Variables de Entorno**
```bash
# Opcional - Puerto del servidor
PORT=3000

# Opcional - Directorio de trabajo
NODE_ENV=production
```

### **Permisos de Archivos**
```
Directorios necesarios:
├── /uploads (rwx)
├── /outputs (rwx)
└── /public (r-x)
```

## 🚨 Límites y Restricciones

### **Archivos de Entrada**
```
Formatos soportados:
├── Video: mp4, avi, mov, wmv, flv, webm
├── Tamaño máximo: 100MB
├── Duración: Sin límite
└── Resolución: Sin límite
```

### **Procesamiento Concurrente**
```
Límites del sistema:
├── Archivos simultáneos: 5 (configurable)
├── Tiempo máximo por archivo: 30 minutos
└── Memoria por proceso: 2GB
```

## 🔍 Monitoreo y Logs

### **Logs del Sistema**
```
Niveles de logging:
├── INFO: Progreso normal
├── WARN: Advertencias
├── ERROR: Errores críticos
└── DEBUG: Información detallada
```

### **Métricas de Rendimiento**
```
Datos recolectados:
├── Tiempo de procesamiento
├── Tamaño de archivos
├── Uso de memoria
└── Errores y excepciones
```

## 🛡️ Seguridad

### **Validaciones**
```
Seguridad implementada:
├── Validación de tipos de archivo
├── Límites de tamaño
├── Sanitización de nombres
└── Limpieza automática de temporales
```

### **Acceso**
```
Control de acceso:
├── Sin autenticación (público)
├── Sin límites de IP
└── Sin rate limiting
```

## 📈 Escalabilidad

### **Optimizaciones Posibles**
```
Mejoras futuras:
├── Procesamiento en cola (Redis)
├── Balanceo de carga
├── Almacenamiento en la nube
└── Cache de modelos Whisper
```

---

**Documentación técnica para desarrolladores y administradores de sistemas** 