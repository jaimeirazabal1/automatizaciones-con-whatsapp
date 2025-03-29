# Bot de WhatsApp con Node.js

Bot automatizado para WhatsApp que permite enviar y recibir mensajes de texto y multimedia utilizando la librería whatsapp-web.js.

## Características principales

- Envío y recepción de mensajes de texto
- Gestión de mensajes multimedia (imágenes, documentos, audio, stickers)
- Programación de mensajes (uno a uno y recurrentes)
- API REST para integración con otros sistemas
- Almacenamiento de mensajes y multimedia en MongoDB

## Requisitos previos

- Node.js (v14+)
- MongoDB
- npm o yarn

## Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tuusuario/whatsapp_nodejs.git
cd whatsapp_nodejs
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` con la siguiente configuración:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/whatsapp_bot
SESSION_DATA_PATH=./session
```

4. Inicia la aplicación:
```bash
npm run dev
```

5. Escanea el código QR que aparece en la consola con tu teléfono para iniciar sesión en WhatsApp.

## Comandos disponibles

La aplicación responde a los siguientes comandos de WhatsApp:

- `!ping` - Prueba de conexión
- `!ayuda` o `!help` - Muestra la lista de comandos disponibles
- `!sticker` - Convierte una imagen adjunta en sticker
- `!imagen <url>` - Envía una imagen desde una URL
- `!documento <url> [nombre]` - Envía un documento desde una URL
- `!audio` - Reenvía un audio (responder a un mensaje de audio)
- `!info` - Muestra información del mensaje actual

## API REST

### Envío de mensajes

#### Mensaje de texto
```
POST /api/send
{
  "phone": "5491122334455",
  "message": "Hola desde la API"
}
```

#### Envío de imagen
```
POST /api/send/image
Content-Type: multipart/form-data
{
  "phone": "5491122334455",
  "caption": "Descripción opcional",
  "image": [archivo]
}
```

#### Envío de documento
```
POST /api/send/document
Content-Type: multipart/form-data
{
  "phone": "5491122334455",
  "filename": "Nombre personalizado.pdf",
  "document": [archivo]
}
```

#### Envío de audio
```
POST /api/send/audio
Content-Type: multipart/form-data
{
  "phone": "5491122334455",
  "audio": [archivo]
}
```

### Gestión de multimedia

#### Listar archivos multimedia
```
GET /api/media?type=image&page=1&limit=20
```

#### Obtener información de un archivo
```
GET /api/media/:id
```

#### Eliminar un archivo multimedia
```
DELETE /api/media/:id
```

## Programación de mensajes

```
POST /api/schedule
{
  "to": "5491122334455",
  "body": "Mensaje programado",
  "mediaPath": "ruta/opcional/archivo.jpg",
  "scheduledTime": "2023-12-31T12:00:00",
  "repeat": false,
  "cronExpression": "0 9 * * *"
}
```

## Estructura del proyecto

```
whatsapp_nodejs/
├── config/
│   └── database.js
├── session/
├── src/
│   ├── models/
│   │   ├── MediaFile.js
│   │   ├── Message.js
│   │   └── ScheduledMessage.js
│   ├── routes/
│   │   └── api.js
│   ├── services/
│   │   ├── schedulerService.js
│   │   └── whatsappService.js
│   ├── utils/
│   │   ├── media/
│   │   └── mediaHandler.js
│   └── app.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Licencia

ISC
