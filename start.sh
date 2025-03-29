#!/bin/bash

# Colores para la salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Iniciando servicios de WhatsApp Bot...${NC}"

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker no está instalado. Por favor, instala Docker y Docker Compose antes de continuar.${NC}"
    exit 1
fi

# Verificar si Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Docker Compose no está instalado. Por favor, instala Docker Compose antes de continuar.${NC}"
    exit 1
fi

# Iniciar los servicios
echo -e "${GREEN}Iniciando MongoDB y WhatsApp Bot...${NC}"
docker-compose up -d

# Esperar a que los servicios estén listos
echo -e "${GREEN}Esperando a que los servicios estén listos...${NC}"
sleep 5

# Mostrar los logs del servicio WhatsApp Bot
echo -e "${GREEN}Mostrando logs del WhatsApp Bot. Escanea el código QR cuando aparezca.${NC}"
echo -e "${YELLOW}Presiona Ctrl+C para salir de los logs (los servicios seguirán ejecutándose).${NC}"
docker-compose logs -f whatsapp-bot 