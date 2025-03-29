# Manual de Usuario - Bot de WhatsApp

Este manual contiene instrucciones detalladas sobre cómo utilizar todas las funcionalidades del bot de WhatsApp.

## Índice
1. [Instalación y configuración](#instalación-y-configuración)
2. [Comandos de WhatsApp](#comandos-de-whatsapp)
3. [API REST](#api-rest)
4. [Gestión multimedia](#gestión-multimedia)
5. [Mensajes programados](#mensajes-programados)
6. [Solución de problemas comunes](#solución-de-problemas-comunes)

## Instalación y configuración

### Requisitos previos
- Node.js (v14+)
- MongoDB
- npm o yarn

### Pasos de instalación

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

4. Inicia MongoDB (si no está iniciado):
```bash
mongod --dbpath /ruta/a/data
```

5. Inicia la aplicación:
```bash
npm run dev
```

6. Escanea el código QR que aparece en la consola con tu teléfono:
   - Abre WhatsApp en tu teléfono
   - Ve a Ajustes > WhatsApp Web/Desktop
   - Escanea el código QR mostrado en la consola

## Comandos de WhatsApp

El bot responde a los siguientes comandos cuando se envían a través de WhatsApp:

### Comandos básicos

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `!ping` | Prueba de conexión | `!ping` |
| `!ayuda` o `!help` | Muestra la lista de comandos disponibles | `!ayuda` |
| `!info` | Muestra información del mensaje actual | `!info` |

### Comandos multimedia

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `!sticker` | Convierte una imagen adjunta en sticker | Envía una imagen con el texto `!sticker` |
| `!imagen <url>` | Envía una imagen desde una URL | `!imagen https://ejemplo.com/imagen.jpg` |
| `!documento <url> [nombre]` | Envía un documento desde una URL | `!documento https://ejemplo.com/archivo.pdf Informe` |
| `!audio` | Reenvía un audio (responder a un mensaje de audio) | Responde a un audio con `!audio` |
| `!reenviar <id>` | Reenvía un archivo multimedia guardado | `!reenviar 60f8a4d5c7e2a3001234abcd` |
| `!archivos` | Muestra lista de los últimos 5 archivos multimedia enviados | `!archivos` |

### Recepción de archivos multimedia

El bot puede recibir archivos multimedia directamente, sin necesidad de comandos. Simplemente envía:

1. **Imágenes**: Cuando envías una imagen, el bot la guarda automáticamente y te devuelve una referencia para acceder a ella después.
2. **Documentos**: Envía cualquier tipo de archivo como documento y el bot lo almacenará.
3. **Audios**: Envía notas de voz o archivos de audio y el bot los procesará.
4. **Videos**: El bot también puede recibir y almacenar videos.

Para cada archivo recibido, el bot responderá con un mensaje de confirmación que incluye un ID de referencia para recuperar el archivo posteriormente usando el comando `!reenviar`.

## API REST

El bot proporciona una API REST para integrarse con otros sistemas.

### Autenticación

Actualmente la API no requiere autenticación, pero se recomienda implementar un sistema de autenticación en producción.

### Endpoints disponibles

#### Estado del bot
```
GET /api/status
```
Respuesta:
```json
{
  "success": true,
  "status": "connected"
}
```

### Envío de mensajes

#### Mensaje de texto
```
POST /api/send
Content-Type: application/json

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

Parámetros opcionales:
- `type`: Filtrar por tipo de archivo (image, audio, video, document)
- `page`: Número de página (default: 1)
- `limit`: Límite de elementos por página (default: 20)

#### Obtener información de un archivo
```
GET /api/media/:id
```

#### Descargar un archivo multimedia
```
GET /api/media/download/:id
```

#### Obtener archivos multimedia de un mensaje
```
GET /api/message/:id/media
```

#### Subir un archivo multimedia
```
POST /api/upload
Content-Type: multipart/form-data

{
  "phone": "5491122334455",
  "caption": "Descripción opcional",
  "file": [archivo]
}
```

#### Eliminar un archivo multimedia
```
DELETE /api/media/:id
```

## Gestión multimedia

El sistema permite gestionar archivos multimedia de diversas formas:

### Almacenamiento de archivos

Los archivos multimedia se almacenan temporalmente en la carpeta `src/utils/media` y se registran en la base de datos MongoDB a través del modelo `MediaFile`.

### Recepción de archivos directa

Puedes enviar archivos multimedia directamente al bot desde WhatsApp sin necesidad de ningún comando especial. El bot responderá con un mensaje de confirmación y un ID de referencia que puedes usar más tarde para acceder al archivo.

### Acceso a archivos guardados

Para acceder a tus archivos multimedia guardados:

1. Usa el comando `!archivos` para ver los últimos 5 archivos que has enviado
2. Usa el comando `!reenviar <id>` con el ID de referencia para que el bot te envíe de nuevo el archivo

### Limpieza automática

El sistema tiene un mecanismo de limpieza automática que elimina los archivos temporales después de 24 horas para evitar que ocupen demasiado espacio en el servidor.

## Mensajes programados

El sistema permite programar mensajes para ser enviados en una fecha futura o de forma recurrente.

### Programar un mensaje

```
POST /api/schedule
Content-Type: application/json

{
  "to": "5491122334455",
  "body": "Mensaje programado",
  "scheduledTime": "2023-12-31T12:00:00",
  "repeat": false
}
```

### Programar un mensaje recurrente

```
POST /api/schedule
Content-Type: application/json

{
  "to": "5491122334455",
  "body": "Mensaje diario a las 9 AM",
  "scheduledTime": "2023-12-31T09:00:00",
  "repeat": true,
  "cronExpression": "0 9 * * *"
}
```

#### Expresiones cron comunes:

- `0 9 * * *` - Todos los días a las 9:00 AM
- `0 */2 * * *` - Cada 2 horas
- `0 9 * * 1-5` - Lunes a viernes a las 9:00 AM
- `0 9,15 * * *` - Todos los días a las 9:00 AM y 3:00 PM

### Programar un mensaje multimedia

```
POST /api/schedule
Content-Type: application/json

{
  "to": "5491122334455",
  "body": "Mensaje con adjunto",
  "mediaPath": "/ruta/absoluta/al/archivo.jpg",
  "scheduledTime": "2023-12-31T12:00:00",
  "repeat": false
}
```

## Solución de problemas comunes

### El código QR no aparece

1. Asegúrate de que no hay otra sesión abierta con la misma cuenta
2. Verifica que la carpeta `session` existe y tiene permisos de escritura
3. Elimina la carpeta `session` y reinicia la aplicación para obtener un nuevo código QR

### Error: Cannot find module 'multer'

Este error ocurre cuando la dependencia multer no está instalada correctamente.

Solución:
```bash
npm install multer --save
```

### Problemas de conexión a MongoDB

1. Verifica que MongoDB está en ejecución
2. Comprueba la URL de conexión en tu archivo `.env`
3. Asegúrate de que MongoDB acepta conexiones del host donde se ejecuta el bot

### El bot no responde a los comandos

1. Verifica que el bot está conectado (estado: "connected")
2. Asegúrate de que estás enviando los comandos en el formato correcto (empezando con !)
3. Revisa los logs de la aplicación para ver si hay errores

### Error al enviar multimedia

1. Asegúrate de que la URL del archivo es accesible
2. Verifica que el formato del archivo es compatible
3. Comprueba los permisos de la carpeta de media

### Los mensajes programados no se envían

1. Verifica que el programador está iniciado correctamente
2. Comprueba el formato de la fecha programada
3. Asegúrate de que la expresión cron es válida (si usas mensajes recurrentes) 