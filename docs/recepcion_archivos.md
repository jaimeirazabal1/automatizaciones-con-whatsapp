# Guía para Recepción de Archivos Multimedia

Este documento explica en detalle cómo utilizar las funcionalidades de recepción y gestión de archivos multimedia en el bot de WhatsApp.

## Recepción directa desde WhatsApp

El bot ahora puede recibir cualquier tipo de archivo multimedia directamente, sin necesidad de usar comandos específicos. Esto permite una interacción más natural y sencilla.

### Cómo enviar archivos al bot

1. **Enviar imágenes**:
   - Toma una foto o selecciona una de tu galería
   - Envíala al chat del bot
   - El bot responderá: `✅ Imagen recibida y guardada correctamente. Puedes acceder a ella usando la referencia: <ID>`

2. **Enviar documentos**:
   - Selecciona un archivo (PDF, Word, Excel, etc.)
   - Envíalo al chat del bot como documento
   - El bot responderá: `✅ Documento recibido y guardado correctamente. Puedes acceder a él usando la referencia: <ID>`

3. **Enviar audio**:
   - Graba un mensaje de voz o selecciona un archivo de audio
   - Envíalo al chat del bot
   - El bot responderá: `✅ Audio recibido y guardado correctamente. Puedes acceder a él usando la referencia: <ID>`

4. **Enviar video**:
   - Graba un video o selecciona uno de tu galería
   - Envíalo al chat del bot
   - El bot responderá: `✅ Video recibido y guardado correctamente. Puedes acceder a él usando la referencia: <ID>`

### Acceder a los archivos guardados

#### Ver tus archivos recientes

Para ver una lista de los últimos 5 archivos multimedia que has enviado, usa el comando:

```
!archivos
```

El bot responderá con una lista similar a esta:

```
*Tus archivos multimedia recientes:*

ID: 60f8a4d5c7e2a3001234abcd
Tipo: image
Fecha: 10/7/2023, 15:30:45
Para reenviar: !reenviar 60f8a4d5c7e2a3001234abcd

ID: 60f8a4d5c7e2a3001234abce
Tipo: document
Fecha: 10/7/2023, 14:22:10
Para reenviar: !reenviar 60f8a4d5c7e2a3001234abce

...
```

#### Recuperar un archivo específico

Para que el bot te reenvíe un archivo que ya habías enviado antes, usa el comando `!reenviar` seguido del ID de referencia:

```
!reenviar 60f8a4d5c7e2a3001234abcd
```

El bot buscará el archivo y te lo enviará nuevamente.

## Uso de la API para gestionar archivos

### Listar archivos disponibles

Para obtener un listado de los archivos multimedia disponibles:

```bash
curl -X GET http://localhost:3000/api/media
```

Puedes filtrar por tipo:

```bash
curl -X GET http://localhost:3000/api/media?type=image
```

### Descargar un archivo específico

Una vez que tengas el ID del archivo, puedes descargarlo:

```bash
curl -X GET http://localhost:3000/api/media/download/60f8a4d5c7e2a3001234abcd -o archivo_descargado.jpg
```

### Obtener archivos asociados a un mensaje

Si tienes el ID de un mensaje, puedes obtener todos los archivos multimedia asociados:

```bash
curl -X GET http://localhost:3000/api/message/60f8a4d5c7e2a3001234abcd/media
```

### Subir un archivo a través de la API

Puedes subir cualquier tipo de archivo y enviarlo a través de WhatsApp usando un solo endpoint:

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: multipart/form-data" \
  -F "phone=5491122334455" \
  -F "caption=Descripción opcional" \
  -F "file=@/ruta/a/tu/archivo.pdf"
```

El sistema detectará automáticamente el tipo de archivo y lo enviará de manera adecuada.

## Consideraciones importantes

1. **Almacenamiento temporal**: Por defecto, los archivos se almacenan durante 24 horas, después de lo cual son eliminados automáticamente para liberar espacio.

2. **Tamaño máximo**: WhatsApp tiene límites de tamaño para distintos tipos de archivos:
   - Imágenes: hasta 16MB
   - Videos: hasta 16MB
   - Documentos: hasta 100MB
   - Audio: hasta 16MB

3. **Formatos compatibles**: El bot soporta todos los formatos estándar de imagen, audio, video y documentos. Revisa la sección "Tipos de archivos soportados" en la guía rápida.

4. **Almacenamiento persistente**: Si necesitas guardar los archivos por más tiempo, puedes configurar el parámetro `tempFile: false` en el modelo MediaFile.

## Casos de uso prácticos

### Caso 1: Compartir documentos importantes

1. El usuario envía un documento importante al bot
2. El bot guarda el documento y responde con un ID de referencia
3. El usuario puede compartir ese ID con otros usuarios
4. Otros usuarios pueden solicitar el documento con el comando `!reenviar <ID>`

### Caso 2: Crear una biblioteca de imágenes

1. El usuario envía varias imágenes al bot
2. El bot guarda cada imagen y proporciona IDs de referencia
3. El usuario solicita `!archivos` para ver todas las imágenes recientes
4. El usuario puede recuperar cualquier imagen específica usando `!reenviar <ID>`

### Caso 3: Compartir notas de voz para un equipo

1. El usuario graba notas de voz con instrucciones importantes
2. Envía estas notas de voz al bot
3. Comparte los IDs de referencia con su equipo
4. El equipo puede acceder a estas notas de voz cuando sea necesario 