# Guía Rápida de Referencia - Bot de WhatsApp

## Instalación

```bash
git clone https://github.com/tuusuario/whatsapp_nodejs.git
cd whatsapp_nodejs
npm install
# Crear archivo .env con las configuraciones
npm run dev
```

## Comandos de WhatsApp

| Comando | Descripción |
|---------|-------------|
| `!ping` | Prueba de conexión |
| `!ayuda` o `!help` | Lista de comandos disponibles |
| `!sticker` | Convierte imagen adjunta en sticker |
| `!imagen <url>` | Envía imagen desde URL |
| `!documento <url> [nombre]` | Envía documento desde URL |
| `!audio` | Reenvía audio (responder a mensaje de audio) |
| `!info` | Información del mensaje |
| `!reenviar <id>` | Reenvía un archivo multimedia guardado |
| `!archivos` | Lista los últimos 5 archivos multimedia enviados |

## Recepción de archivos

- Envía una imagen, documento, audio o video directamente a WhatsApp
- El bot guardará el archivo y te dará un ID de referencia
- Usa `!reenviar <id>` para volver a recibir el archivo
- Usa `!archivos` para listar tus archivos recientes

## API REST

### Mensaje de texto
```
POST /api/send
{
  "phone": "5491122334455",
  "message": "Hola"
}
```

### Mensaje con imagen
```
POST /api/send/image
Form-Data:
- phone: 5491122334455
- caption: Descripción (opcional)
- image: [archivo]
```

### Mensaje con documento
```
POST /api/send/document
Form-Data:
- phone: 5491122334455
- filename: nombre.pdf (opcional)
- document: [archivo]
```

### Mensaje con audio
```
POST /api/send/audio
Form-Data:
- phone: 5491122334455
- audio: [archivo]
```

### Subir cualquier archivo
```
POST /api/upload
Form-Data:
- phone: 5491122334455
- caption: Descripción (opcional)
- file: [archivo]
```

### Listar multimedia
```
GET /api/media?type=image&page=1&limit=20
```

### Información de un archivo
```
GET /api/media/:id
```

### Descargar un archivo
```
GET /api/media/download/:id
```

### Archivos de un mensaje
```
GET /api/message/:id/media
```

### Eliminar un archivo
```
DELETE /api/media/:id
```

### Programar mensaje
```
POST /api/schedule
{
  "to": "5491122334455",
  "body": "Mensaje programado",
  "scheduledTime": "2023-12-31T12:00:00",
  "repeat": false
}
```

### Programar mensaje recurrente
```
POST /api/schedule
{
  "to": "5491122334455",
  "body": "Mensaje diario",
  "scheduledTime": "2023-12-31T09:00:00",
  "repeat": true,
  "cronExpression": "0 9 * * *"
}
```

## Expresiones cron comunes

| Expresión | Descripción |
|-----------|-------------|
| `0 9 * * *` | Todos los días a las 9:00 AM |
| `0 */2 * * *` | Cada 2 horas |
| `0 9 * * 1-5` | Lunes a viernes a las 9:00 AM |
| `0 9,15 * * *` | Todos los días a las 9:00 AM y 3:00 PM |

## Tipos de archivos soportados

| Tipo | Formatos |
|------|----------|
| Imagen | jpg, png, gif, webp |
| Audio | mp3, ogg, m4a |
| Video | mp4, 3gp |
| Documento | pdf, doc, docx, xls, xlsx, ppt, pptx, txt |

## Solución de problemas comunes

- **No aparece código QR**: Elimina carpeta `session` y reinicia
- **Error multer**: Ejecuta `npm install multer --save`
- **MongoDB no conecta**: Verifica URL en `.env` y que MongoDB esté en ejecución
- **Bot no responde**: Verifica estado "connected" y formato de comandos
- **Error multimedia**: Verifica permisos de carpeta `media` y formato compatible
- **Archivos no se guardan**: Verifica permisos de escritura en directorio `media` 