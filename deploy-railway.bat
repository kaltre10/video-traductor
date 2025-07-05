@echo off
echo 🚀 Desplegando en Railway...

REM Verificar si Railway CLI está instalado
railway --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Railway CLI no está instalado.
    echo 📥 Instalando Railway CLI...
    npm install -g @railway/cli
)

REM Login en Railway
echo 🔐 Iniciando sesión en Railway...
railway login

REM Inicializar proyecto Railway
echo 📁 Inicializando proyecto Railway...
railway init

REM Configurar variables de entorno
echo ⚙️ Configurando variables de entorno...
if exist .env (
    echo 📋 Variables de entorno encontradas en .env
    for /f "tokens=*" %%a in (.env) do (
        railway variables set %%a
    )
) else (
    echo ⚠️ No se encontró archivo .env
    echo 💡 Crea un archivo .env con tus variables de entorno
)

REM Desplegar
echo 🚀 Desplegando aplicación...
railway up

echo ✅ ¡Despliegue completado!
echo 🌐 Tu aplicación estará disponible en: https://tu-app.railway.app
echo 📊 Para ver logs: railway logs
echo 🛑 Para detener: railway down
pause 