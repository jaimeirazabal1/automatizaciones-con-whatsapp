// Importar dependencias
require("dotenv").config();
const express = require("express");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");
const connectDB = require("../config/database");
const WhatsAppService = require("./services/whatsappService");
const SchedulerService = require("./services/schedulerService");
const Message = require("./models/message");
const MediaHandler = require("./utils/mediaHandler");
const apiRoutes = require("./routes/api");

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Crear directorio para archivos multimedia si no existe
const mediaDir = path.join(__dirname, "utils", "media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Conectar a MongoDB
connectDB();

// Inicializar el cliente de WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: process.env.SESSION_DATA_PATH || "./session",
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// Inicializar servicios
const whatsappService = new WhatsAppService(client);
const schedulerService = new SchedulerService(whatsappService);

// Evento cuando se recibe el código QR
client.on("qr", (qr) => {
  console.log("Código QR recibido, escanea con WhatsApp:");
  qrcode.generate(qr, { small: true });
});

// Evento cuando el cliente está listo
client.on("ready", async () => {
  console.log("Cliente de WhatsApp listo y conectado!");

  // Iniciar el programador de mensajes
  await schedulerService.init();
});

// Evento cuando se recibe un mensaje
client.on("message", async (msg) => {
  console.log("Mensaje recibido:", msg);

  try {
    // Asegurarse de que body nunca sea undefined
    const messageBody = msg.body || "";
    const isCommand = messageBody.startsWith("!");

    // Guardar mensaje en la base de datos
    const message = new Message({
      messageId: msg.id.id,
      body: messageBody,
      from: msg.from,
      to: msg.to,
      hasMedia: msg.hasMedia,
      isCommand: isCommand,
      command: isCommand ? messageBody.split(" ")[0] : null,
    });

    await message.save();

    // Procesar archivo multimedia si existe
    let mediaPath = null;
    let mediaFile = null;
    if (msg.hasMedia) {
      try {
        mediaPath = await whatsappService.saveMedia(msg);
        console.log(`Archivo multimedia guardado en: ${mediaPath}`);

        // Obtener información del archivo multimedia
        const media = await msg.downloadMedia();
        const fileType = MediaHandler.getExtensionFromMimetype(media.mimetype);

        // Verificar si el mensaje no es un comando para procesar el archivo automáticamente
        if (!isCommand) {
          // Responder con confirmación según el tipo de archivo
          if (media.mimetype.startsWith("image/")) {
            await msg.reply(
              `✅ Imagen recibida y guardada correctamente.\nPuedes acceder a ella usando la referencia: ${message._id}`
            );
          } else if (
            media.mimetype.startsWith("application/") ||
            media.mimetype === "text/plain"
          ) {
            await msg.reply(
              `✅ Documento recibido y guardado correctamente.\nPuedes acceder a él usando la referencia: ${message._id}`
            );
          } else if (media.mimetype.startsWith("audio/")) {
            await msg.reply(
              `✅ Audio recibido y guardado correctamente.\nPuedes acceder a él usando la referencia: ${message._id}`
            );
          } else if (media.mimetype.startsWith("video/")) {
            await msg.reply(
              `✅ Video recibido y guardado correctamente.\nPuedes acceder a él usando la referencia: ${message._id}`
            );
          } else {
            await msg.reply(
              `✅ Archivo recibido y guardado correctamente.\nPuedes acceder a él usando la referencia: ${message._id}`
            );
          }
        }
      } catch (mediaError) {
        console.error("Error al guardar archivo multimedia:", mediaError);
      }
    }

    // ----- COMANDOS BÁSICOS -----

    // Respuesta a comando !ping
    if (messageBody === "!ping") {
      msg.reply("pong");
    }

    // ----- COMANDOS DE AYUDA -----

    // Comando de ayuda
    else if (messageBody === "!ayuda" || messageBody === "!help") {
      const helpMessage = `*Comandos disponibles:*

*Comandos Básicos:*
!ping - Prueba de conexión
!ayuda - Muestra este mensaje

*Comandos Multimedia:*
!sticker - Convierte una imagen en sticker (adjunta imagen)
!imagen <url> - Envía una imagen desde una URL
!documento <url> - Envía un documento desde una URL
!audio <url> - Envía un audio (adjunta al mensaje)
!info - Muestra información del mensaje (útil para multimedia)`;

      msg.reply(helpMessage);
    }

    // ----- COMANDOS MULTIMEDIA -----

    // Comando para convertir imagen a sticker
    else if (messageBody === "!sticker" && msg.hasMedia) {
      if (!mediaPath) {
        msg.reply("Error al procesar la imagen para sticker");
        return;
      }

      try {
        const media = MessageMedia.fromFilePath(mediaPath);
        await msg.reply(media, null, { sendMediaAsSticker: true });
      } catch (stickerError) {
        console.error("Error al crear sticker:", stickerError);
        msg.reply(
          "No se pudo crear el sticker. Asegúrate que sea una imagen válida."
        );
      }
    }

    // Comando para enviar imagen desde URL
    else if (messageBody.startsWith("!imagen ")) {
      const url = messageBody.slice(8).trim();
      if (!url) {
        msg.reply("Por favor proporciona una URL válida. Uso: !imagen <url>");
        return;
      }

      try {
        await whatsappService.sendMediaFromUrl(
          msg.from,
          url,
          "Imagen solicitada"
        );
      } catch (error) {
        console.error("Error al enviar imagen desde URL:", error);
        msg.reply(
          "No se pudo enviar la imagen. Verifica que la URL sea válida."
        );
      }
    }

    // Comando para enviar documento desde URL
    else if (messageBody.startsWith("!documento ")) {
      const parts = messageBody.slice(11).trim().split(" ");
      let url, filename;

      if (parts.length >= 2) {
        url = parts[0];
        filename = parts.slice(1).join(" ");
      } else {
        url = parts[0];
        // Extraer nombre de archivo de la URL
        filename = url.split("/").pop();
      }

      if (!url) {
        msg.reply(
          "Por favor proporciona una URL válida. Uso: !documento <url> [nombre_archivo]"
        );
        return;
      }

      try {
        const media = await MediaHandler.fromUrl(url);
        if (filename) {
          media.filename = filename;
        }

        await msg.reply(media, null, { sendMediaAsDocument: true });
      } catch (error) {
        console.error("Error al enviar documento desde URL:", error);
        msg.reply(
          "No se pudo enviar el documento. Verifica que la URL sea válida."
        );
      }
    }

    // Comando para enviar audio (responder a un mensaje de audio)
    else if (messageBody === "!audio" && msg.hasQuotedMsg) {
      const quotedMsg = await msg.getQuotedMessage();

      if (!quotedMsg.hasMedia) {
        msg.reply("El mensaje citado no contiene un archivo de audio.");
        return;
      }

      try {
        const audioPath = await whatsappService.saveMedia(quotedMsg);
        await whatsappService.sendAudio(msg.from, audioPath, true);

        // Limpiar archivo temporal
        setTimeout(() => {
          MediaHandler.deleteMedia(audioPath);
        }, 30000);
      } catch (error) {
        console.error("Error al procesar audio:", error);
        msg.reply("No se pudo procesar el audio.");
      }
    }

    // Comando para mostrar información del mensaje
    else if (messageBody === "!info") {
      let info = `*Información del mensaje:*\n`;
      info += `ID: ${msg.id.id}\n`;
      info += `De: ${msg.from}\n`;
      info += `Tipo: ${msg.type}\n`;
      info += `Hora: ${msg.timestamp}\n`;
      info += `Tiene multimedia: ${msg.hasMedia ? "Sí" : "No"}\n`;

      if (msg.hasMedia) {
        const media = await msg.downloadMedia();
        info += `Tipo multimedia: ${media.mimetype}\n`;
        if (media.filename) {
          info += `Nombre archivo: ${media.filename}\n`;
        }
      }

      msg.reply(info);
    }

    // Comando para reenviar un archivo multimedia usando una referencia
    else if (messageBody.startsWith("!reenviar ")) {
      const referenceId = messageBody.slice(10).trim();

      if (!referenceId) {
        msg.reply(
          "Por favor proporciona el ID de referencia del mensaje. Uso: !reenviar <id>"
        );
        return;
      }

      try {
        // Buscar el mensaje por ID
        const savedMessage = await Message.findById(referenceId);

        if (!savedMessage || !savedMessage.hasMedia) {
          msg.reply(
            "No se encontró ningún archivo multimedia con esa referencia."
          );
          return;
        }

        // Buscar los archivos multimedia asociados
        const mediaFiles = await MediaHandler.findByMessageId(
          savedMessage.messageId
        );

        if (!mediaFiles || mediaFiles.length === 0) {
          msg.reply(
            "El archivo multimedia no está disponible o ha sido eliminado."
          );
          return;
        }

        // Enviar cada archivo encontrado
        for (const file of mediaFiles) {
          const media = MediaHandler.fromFilePath(file.filePath);

          // Enviar según el tipo de archivo
          if (file.fileType === "image") {
            await msg.reply(media, msg.from, { caption: "Imagen reenviada" });
          } else if (file.fileType === "document") {
            await msg.reply(media, msg.from, { sendMediaAsDocument: true });
          } else if (file.fileType === "audio") {
            await msg.reply(media, msg.from, {
              sendAudioAsVoice: file.mimetype.includes("ogg"),
            });
          } else if (file.fileType === "video") {
            await msg.reply(media, msg.from);
          } else {
            await msg.reply(media, msg.from);
          }
        }
      } catch (error) {
        console.error("Error al reenviar archivo multimedia:", error);
        msg.reply("No se pudo reenviar el archivo multimedia.");
      }
    }

    // Comando para listar archivos multimedia recibidos
    else if (messageBody === "!archivos") {
      try {
        // Obtener últimos 5 mensajes con multimedia del remitente
        const messages = await Message.find({
          from: msg.from,
          hasMedia: true,
        })
          .sort({ createdAt: -1 })
          .limit(5);

        if (!messages || messages.length === 0) {
          msg.reply("No has enviado archivos multimedia recientemente.");
          return;
        }

        let response = "*Tus archivos multimedia recientes:*\n\n";

        for (const message of messages) {
          const mediaFiles = await MediaHandler.findByMessageId(
            message.messageId
          );
          const fileType =
            mediaFiles.length > 0 ? mediaFiles[0].fileType : "desconocido";

          response += `ID: ${message._id}\n`;
          response += `Tipo: ${fileType}\n`;
          response += `Fecha: ${message.createdAt.toLocaleString()}\n`;
          response += `Para reenviar: !reenviar ${message._id}\n`;
          response += "\n";
        }

        msg.reply(response);
      } catch (error) {
        console.error("Error al listar archivos multimedia:", error);
        msg.reply("No se pudieron recuperar los archivos multimedia.");
      }
    }

    // Limpiar archivos temporales
    if (mediaPath) {
      // Eliminar archivos temporales después de 30 segundos
      setTimeout(() => {
        try {
          MediaHandler.deleteMedia(mediaPath);
        } catch (error) {
          console.error("Error al eliminar archivo temporal:", error);
        }
      }, 30000);
    }
  } catch (error) {
    console.error("Error al procesar mensaje:", error);
  }
});

// Evento cuando hay un error de autenticación
client.on("auth_failure", (error) => {
  console.error("Error de autenticación:", error);
});

// Evento cuando hay un error de conexión
client.on("disconnected", (reason) => {
  console.log("Cliente desconectado:", reason);
  // Intentar reconectar
  client.initialize();
});

// Inicializar el cliente de WhatsApp
client.initialize();

// Rutas de la API
app.use("/api", apiRoutes);

// Rutas básicas
app.get("/", (req, res) => {
  res.json({ status: "WhatsApp Bot corriendo" });
});

// Ruta para enviar mensajes programados
app.post("/api/schedule", async (req, res) => {
  try {
    const { to, body, mediaPath, scheduledTime, repeat, cronExpression } =
      req.body;

    if (!to || !body || !scheduledTime) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const messageData = {
      to,
      body,
      mediaPath,
      scheduledTime: new Date(scheduledTime),
      repeat: !!repeat,
      cronExpression,
    };

    const scheduledMessage = await schedulerService.scheduleNewMessage(
      messageData
    );

    res.status(201).json({
      success: true,
      message: "Mensaje programado correctamente",
      data: scheduledMessage,
    });
  } catch (error) {
    console.error("Error al programar mensaje:", error);
    res.status(500).json({ error: "Error al programar mensaje" });
  }
});

// Ruta para enviar mensaje multimedia
app.post("/api/sendMedia", async (req, res) => {
  try {
    const { to, caption, mediaType, mediaUrl, options } = req.body;

    if (!to || !mediaUrl) {
      return res
        .status(400)
        .json({ error: "Faltan datos requeridos (to, mediaUrl)" });
    }

    let result;

    // Opciones para el envío
    const sendOptions = options || {};

    switch (mediaType) {
      case "image":
        result = await whatsappService.sendMediaFromUrl(
          to,
          mediaUrl,
          caption || "",
          sendOptions
        );
        break;
      case "document":
        const media = await MediaHandler.fromUrl(mediaUrl);
        if (sendOptions.filename) {
          media.filename = sendOptions.filename;
        }
        const chat = await client.getChatById(to);
        result = await chat.sendMessage(media, {
          caption: caption || "",
          sendMediaAsDocument: true,
          ...sendOptions,
        });
        break;
      case "audio":
        // Descargar el audio primero
        const audioMedia = await MediaHandler.fromUrl(mediaUrl);
        const tempPath = MediaHandler.saveMedia(
          audioMedia.data,
          sendOptions.filename || `audio_${Date.now()}.mp3`,
          audioMedia.mimetype
        );
        result = await whatsappService.sendAudio(
          to,
          tempPath,
          sendOptions.asVoiceNote || false
        );
        // Eliminar archivo temporal después
        setTimeout(() => MediaHandler.deleteMedia(tempPath), 30000);
        break;
      default:
        result = await whatsappService.sendMediaFromUrl(
          to,
          mediaUrl,
          caption || "",
          sendOptions
        );
    }

    res.status(200).json({
      success: true,
      message: "Multimedia enviado correctamente",
      data: { messageId: result.id._serialized },
    });
  } catch (error) {
    console.error("Error al enviar multimedia:", error);
    res
      .status(500)
      .json({ error: `Error al enviar multimedia: ${error.message}` });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
