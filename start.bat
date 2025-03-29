@echo off
echo Iniciando servicios de WhatsApp Bot...

REM Verificar si Docker está instalado
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker no está instalado. Por favor, instala Docker y Docker Compose antes de continuar.
    exit /b 1
)

REM Verificar si Docker Compose está instalado
where docker-compose >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Docker Compose no está instalado. Por favor, instala Docker Compose antes de continuar.
    exit /b 1
)

REM Iniciar los servicios
echo Iniciando MongoDB y WhatsApp Bot...
docker-compose up -d

REM Esperar a que los servicios estén listos
echo Esperando a que los servicios estén listos...
timeout /t 5 /nobreak >nul

REM Mostrar los logs del servicio WhatsApp Bot
echo Mostrando logs del WhatsApp Bot. Escanea el código QR cuando aparezca.
echo Presiona Ctrl+C para salir de los logs (los servicios seguirán ejecutándose).
docker-compose logs -f whatsapp-bot 