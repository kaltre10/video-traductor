# Usar una imagen base con Node.js y Python
FROM node:18-bullseye

# Instalar Python y dependencias del sistema
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Crear enlace simbólico para python -> python3
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY requirements.txt ./

# Instalar dependencias de Node.js
RUN npm ci --only=production

# Instalar dependencias de Python
RUN pip3 install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY . .

# Crear directorios necesarios
RUN mkdir -p uploads outputs

# Verificar que Python está instalado correctamente
RUN python3 --version && python --version

# Exponer puerto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["npm", "start"] 