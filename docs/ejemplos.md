# Ejemplos prácticos - Bot de WhatsApp

Este documento contiene ejemplos prácticos para ayudarte a comprender cómo utilizar el bot de WhatsApp en situaciones reales.

## Ejemplos de uso con WhatsApp

### 1. Convertir una imagen en sticker

1. Abre WhatsApp y busca el chat con el bot
2. Adjunta una imagen (foto de galería, foto nueva, etc.)
3. Escribe `!sticker` en el mensaje
4. Envía el mensaje
5. El bot responderá con la imagen convertida en sticker

### 2. Enviar un documento desde una URL

1. Busca la URL de un documento (por ejemplo, un PDF)
2. Envía el siguiente mensaje al bot:
   ```
   !documento https://ejemplo.com/archivo.pdf Manual de usuario
   ```
3. El bot descargará el documento y lo enviará con el nombre "Manual de usuario.pdf"

### 3. Compartir una imagen desde una URL

1. Encuentra la URL de una imagen en Internet
2. Envía el siguiente mensaje al bot:
   ```
   !imagen https://ejemplo.com/foto.jpg
   ```
3. El bot responderá enviando la imagen

### 4. Enviar y guardar archivos multimedia directamente

1. Simplemente envía una imagen, documento, audio o video al bot sin ningún comando
2. El bot guardará el archivo y responderá con un mensaje de confirmación que incluye un ID único
3. Guarda ese ID para futuras referencias

### 5. Recuperar archivos guardados anteriormente

1. Para ver tus archivos multimedia recientes, envía el comando:
   ```
   !archivos
   ```
2. El bot responderá con una lista de tus últimos 5 archivos enviados, incluyendo su ID y tipo
3. Para recuperar un archivo específico, envía el comando `!reenviar` seguido del ID:
   ```
   !reenviar 60f8a4d5c7e2a3001234abcd
   ```
4. El bot te volverá a enviar el archivo solicitado

## Ejemplos de uso con la API REST

### 1. Enviar un mensaje de texto con cURL

```bash
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"5491122334455","message":"Hola desde la API de ejemplo"}'
```

### 2. Enviar una imagen con cURL

```bash
curl -X POST http://localhost:3000/api/send/image \
  -H "Content-Type: multipart/form-data" \
  -F "phone=5491122334455" \
  -F "caption=Imagen de prueba" \
  -F "image=@/ruta/a/tu/imagen.jpg"
```

### 3. Enviar un documento con cURL

```bash
curl -X POST http://localhost:3000/api/send/document \
  -H "Content-Type: multipart/form-data" \
  -F "phone=5491122334455" \
  -F "filename=Documento de prueba.pdf" \
  -F "document=@/ruta/a/tu/archivo.pdf"
```

### 4. Programar un mensaje recurrente con cURL

```bash
curl -X POST http://localhost:3000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5491122334455",
    "body": "Recordatorio diario",
    "scheduledTime": "2023-12-31T09:00:00",
    "repeat": true,
    "cronExpression": "0 9 * * *"
  }'
```

### 5. Descargar un archivo multimedia previamente guardado

```bash
# Primero obtenemos el ID del archivo
curl -X GET http://localhost:3000/api/media?type=image&limit=1

# Con el ID obtenido, descargamos el archivo
curl -X GET http://localhost:3000/api/media/download/60f8a4d5c7e2a3001234abcd -o archivo_descargado.jpg
```

### 6. Subir un archivo cualquiera a través de la API

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: multipart/form-data" \
  -F "phone=5491122334455" \
  -F "caption=Archivo subido desde API" \
  -F "file=@/ruta/a/tu/archivo.pdf"
```

### 7. Obtener archivos multimedia asociados a un mensaje

```bash
curl -X GET http://localhost:3000/api/message/60f8a4d5c7e2a3001234abcd/media
```

## Ejemplos de uso desde código JavaScript

### 1. Enviar un mensaje de texto

```javascript
const axios = require('axios');

async function enviarMensaje() {
  try {
    const respuesta = await axios.post('http://localhost:3000/api/send', {
      phone: '5491122334455',
      message: 'Mensaje enviado desde Node.js'
    });
    
    console.log('Mensaje enviado:', respuesta.data);
  } catch (error) {
    console.error('Error al enviar mensaje:', error.response?.data || error.message);
  }
}

enviarMensaje();
```

### 2. Enviar una imagen

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function enviarImagen() {
  try {
    const formData = new FormData();
    formData.append('phone', '5491122334455');
    formData.append('caption', 'Imagen desde Node.js');
    formData.append('image', fs.createReadStream('/ruta/a/tu/imagen.jpg'));
    
    const respuesta = await axios.post('http://localhost:3000/api/send/image', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('Imagen enviada:', respuesta.data);
  } catch (error) {
    console.error('Error al enviar imagen:', error.response?.data || error.message);
  }
}

enviarImagen();
```

### 3. Obtener lista de archivos multimedia

```javascript
const axios = require('axios');

async function obtenerMultimedia() {
  try {
    // Obtener imágenes, paginadas, 10 por página
    const respuesta = await axios.get('http://localhost:3000/api/media', {
      params: {
        type: 'image',
        page: 1,
        limit: 10
      }
    });
    
    console.log('Archivos multimedia:', respuesta.data.data.files);
    console.log('Información de paginación:', respuesta.data.data.pagination);
  } catch (error) {
    console.error('Error al obtener multimedia:', error.response?.data || error.message);
  }
}

obtenerMultimedia();
```

### 4. Descargar un archivo multimedia

```javascript
const axios = require('axios');
const fs = require('fs');

async function descargarArchivo(id, rutaDestino) {
  try {
    // Configurar la respuesta como stream
    const response = await axios({
      method: 'GET',
      url: `http://localhost:3000/api/media/download/${id}`,
      responseType: 'stream'
    });
    
    // Crear un stream de escritura
    const writer = fs.createWriteStream(rutaDestino);
    
    // Pipe el stream de respuesta al archivo
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error al descargar archivo:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  try {
    // Descargar un archivo sabiendo su ID
    await descargarArchivo('60f8a4d5c7e2a3001234abcd', './archivo_descargado.jpg');
    console.log('Archivo descargado correctamente');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

## Ejemplos de integración con otras plataformas

### 1. Integración con un sitio web (JavaScript frontend)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Formulario de contacto WhatsApp</title>
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body>
  <h1>Formulario de contacto</h1>
  
  <form id="contactForm">
    <div>
      <label for="phone">Teléfono:</label>
      <input type="text" id="phone" required>
    </div>
    <div>
      <label for="message">Mensaje:</label>
      <textarea id="message" required></textarea>
    </div>
    <div>
      <label for="attachment">Adjunto (opcional):</label>
      <input type="file" id="attachment">
    </div>
    <button type="submit">Enviar</button>
  </form>
  
  <div id="result"></div>
  
  <script>
    document.getElementById('contactForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const phone = document.getElementById('phone').value;
      const message = document.getElementById('message').value;
      const attachment = document.getElementById('attachment').files[0];
      const resultDiv = document.getElementById('result');
      
      try {
        let response;
        
        if (attachment) {
          const formData = new FormData();
          formData.append('phone', phone);
          
          if (attachment.type.startsWith('image/')) {
            formData.append('caption', message);
            formData.append('image', attachment);
            response = await axios.post('http://localhost:3000/api/send/image', formData);
          } else {
            formData.append('filename', attachment.name);
            formData.append('document', attachment);
            response = await axios.post('http://localhost:3000/api/send/document', formData);
            
            // Enviar también el mensaje de texto
            await axios.post('http://localhost:3000/api/send', {
              phone,
              message
            });
          }
        } else {
          response = await axios.post('http://localhost:3000/api/send', {
            phone,
            message
          });
        }
        
        resultDiv.innerHTML = '<p style="color: green;">Mensaje enviado correctamente</p>';
      } catch (error) {
        resultDiv.innerHTML = `<p style="color: red;">Error: ${error.response?.data?.message || error.message}</p>`;
      }
    });
  </script>
</body>
</html>
```

### 2. Integración con Node-RED

```json
[
  {
    "id": "whatsapp-flow",
    "type": "tab",
    "label": "WhatsApp Bot"
  },
  {
    "id": "whatsapp-inject",
    "type": "inject",
    "z": "whatsapp-flow",
    "name": "Enviar mensaje",
    "props": [
      {
        "p": "payload"
      }
    ],
    "repeat": "",
    "crontab": "",
    "once": false,
    "onceDelay": 0.1,
    "topic": "",
    "payload": "{\"phone\":\"5491122334455\",\"message\":\"Mensaje desde Node-RED\"}",
    "payloadType": "json",
    "x": 170,
    "y": 120,
    "wires": [
      [
        "whatsapp-request"
      ]
    ]
  },
  {
    "id": "whatsapp-request",
    "type": "http request",
    "z": "whatsapp-flow",
    "name": "API WhatsApp",
    "method": "POST",
    "ret": "obj",
    "paytoqs": "ignore",
    "url": "http://localhost:3000/api/send",
    "tls": "",
    "persist": false,
    "proxy": "",
    "authType": "",
    "x": 360,
    "y": 120,
    "wires": [
      [
        "whatsapp-response"
      ]
    ]
  },
  {
    "id": "whatsapp-response",
    "type": "debug",
    "z": "whatsapp-flow",
    "name": "Respuesta",
    "active": true,
    "tosidebar": true,
    "console": false,
    "tostatus": false,
    "complete": "payload",
    "targetType": "msg",
    "statusVal": "",
    "statusType": "auto",
    "x": 550,
    "y": 120,
    "wires": []
  }
]
```

### 3. Integración con Python

```python
import requests
import json

def enviar_mensaje(telefono, mensaje):
    url = "http://localhost:3000/api/send"
    payload = {
        "phone": telefono,
        "message": mensaje
    }
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, data=json.dumps(payload), headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error al enviar mensaje: {e}")
        return None

def enviar_imagen(telefono, ruta_imagen, descripcion=""):
    url = "http://localhost:3000/api/send/image"
    
    try:
        files = {
            "image": open(ruta_imagen, "rb")
        }
        data = {
            "phone": telefono,
            "caption": descripcion
        }
        
        response = requests.post(url, files=files, data=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error al enviar imagen: {e}")
        return None

# Ejemplos de uso
resultado = enviar_mensaje("5491122334455", "Mensaje desde Python")
print(resultado)

resultado_imagen = enviar_imagen("5491122334455", "/ruta/a/tu/imagen.jpg", "Imagen desde Python")
print(resultado_imagen)