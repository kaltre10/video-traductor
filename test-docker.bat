@echo off
echo 🐳 Probando Docker localmente...

REM Verificar si Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker no está instalado o no está ejecutándose.
    echo 💡 Instala Docker Desktop desde https://docker.com
    pause
    exit /b 1
)

echo ✅ Docker está instalado.

REM Construir imagen
echo 🔨 Construyendo imagen Docker...
docker build -t video-converter .

if errorlevel 1 (
    echo ❌ Error construyendo la imagen Docker.
    pause
    exit /b 1
)

echo ✅ Imagen construida correctamente.

REM Ejecutar contenedor
echo 🚀 Ejecutando contenedor...
echo 🌐 La aplicación estará disponible en: http://localhost:3000
echo.
echo 💡 Para detener el contenedor, presiona Ctrl+C
echo.

docker run -p 3000:3000 video-converter

pause 