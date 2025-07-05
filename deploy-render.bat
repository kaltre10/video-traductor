@echo off
echo 🚀 Desplegando en Render...

REM Verificar si tienes un repositorio Git
if not exist .git (
    echo ❌ No se encontró repositorio Git.
    echo 📁 Inicializando repositorio Git...
    git init
    git add .
    git commit -m "Initial commit"
)

REM Verificar si tienes un repositorio remoto
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo ⚠️ No se encontró repositorio remoto.
    echo 💡 Crea un repositorio en GitHub y ejecuta:
    echo    git remote add origin https://github.com/tu-usuario/tu-repo.git
    echo    git push -u origin main
    pause
    exit /b 1
)

echo ✅ Repositorio Git configurado correctamente.
echo.
echo 📋 Pasos para desplegar en Render:
echo 1. Ve a https://render.com y crea una cuenta
echo 2. Conecta tu repositorio de GitHub
echo 3. Crea un nuevo 'Web Service'
echo 4. Selecciona tu repositorio
echo 5. Configura:
echo    - Build Command: docker build -t video-converter .
echo    - Start Command: docker run -p 3000:3000 video-converter
echo 6. Configura las variables de entorno:
echo    - ELEVENLABS_API_KEY (si usas ElevenLabs)
echo    - PORT=3000
echo 7. ¡Listo! Tu app estará en: https://tu-app.onrender.com
echo.
echo 💡 Para hacer push de cambios:
echo    git add .
echo    git commit -m "Update"
echo    git push
pause 