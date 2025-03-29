// Importar dependencias
require("dotenv").config();
const express = require("express");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");
const connectDB = require("../config/database");
const whatsappService = require("./services/whatsappService");
const SchedulerService = require("./services/schedulerService");
const Message = require("./models/message");
const MediaHandler = require("./utils/mediaHandler");
const apiRoutes = require("./routes/api");
const adminRoutes = require("./routes/admin");
const cookieParser = require("cookie-parser");

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Verificar que los directorios para archivos multimedia estén creados
// (La lógica de creación ahora está en MediaHandler)

// Conectar a MongoDB
connectDB();

// Inicializar el cliente de WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "whatsapp_bot" }),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// Inicializar servicios
whatsappService.init(client);
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

// Evento de mensajes
client.on("message", async (msg) => {
  console.log("Mensaje recibido:", msg.from);

  // Evitar procesar mensajes del propio bot o antiguos
  if (msg.fromMe || (msg._data && msg._data.isEphemeral)) {
    return;
  }

  // Asegurar que msg.body nunca sea undefined o null
  const messageBody = msg.body || "";

  // Para comandos, el cuerpo debe empezar con !
  const isCommand = messageBody.startsWith("!");

  try {
    // Guardar mensaje en la base de datos
    const message = new Message({
      messageId: msg.id.id,
      from: msg.from,
      fromName: msg._data.notifyName,
      to: msg.to,
      body: messageBody,
      hasMedia: msg.hasMedia,
      timestamp: msg.timestamp * 1000, // Convertir a milisegundos
    });

    const savedMessage = await message.save();
    console.log("Mensaje guardado en la base de datos.");

    // Emitir evento para actualización en tiempo real para todos los admins suscritos
    if (io) {
      // Determinar si el mensaje es entrante o saliente
      const direction = msg.fromMe ? "outgoing" : "incoming";

      // Buscar administradores suscritos a esta conversación
      const subscribedAdmins = Object.entries(adminConnections)
        .filter(([_, adminData]) =>
          adminData.subscribedChats.includes(msg.from)
        )
        .map(([socketId, _]) => socketId);

      console.log("subscribedAdmins", subscribedAdmins);
      // Si hay administradores suscritos, enviar el mensaje en tiempo real
      if (subscribedAdmins.length > 0) {
        const messageData = {
          ...savedMessage.toObject(),
          direction,
        };
        console.log("messageData", messageData);
        subscribedAdmins.forEach((socketId) => {
          io.to(socketId).emit("new_message", messageData);
        });

        console.log(
          `Mensaje emitido en tiempo real a ${subscribedAdmins.length} administradores`
        );
      }
    }

    // Procesar archivos multimedia si los hay
    if (msg.hasMedia) {
      await processMessageMedia(msg, savedMessage);
    }

    // Procesar comandos
    if (isCommand) {
      await handleCommand(msg, messageBody);
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
app.use("/admin", adminRoutes);

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
        // Guardar en archivo permanente (isTemp = false)
        const audioPath = await MediaHandler.saveMedia(
          audioMedia.data,
          sendOptions.filename || `audio_${Date.now()}.mp3`,
          audioMedia.mimetype,
          null,
          false // Este archivo no es temporal
        );
        result = await whatsappService.sendAudio(
          to,
          audioPath,
          sendOptions.asVoiceNote || false
        );
        // No eliminamos el archivo porque ya no es temporal
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
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Configuración de Socket.IO para mensajes en tiempo real
const io = require("socket.io")(server);

// Guardar conexiones activas de administradores
const adminConnections = {};

// Evento cuando un cliente se conecta
io.on("connection", (socket) => {
  console.log("Cliente conectado a Socket.IO:", socket.id);

  // Autenticar al administrador
  socket.on("admin_auth", (token) => {
    // Verificar el token de administrador (mismo método usado en checkAuth)
    if (token && token.length > 32) {
      console.log("Administrador autenticado:", socket.id);
      adminConnections[socket.id] = {
        authenticated: true,
        subscribedChats: [], // Inicializar el array de chats suscritos
      };
      socket.emit("auth_success");
    } else {
      socket.emit("auth_error", { message: "Autenticación fallida" });
    }
  });

  // Suscribirse a mensajes de un contacto específico
  socket.on("subscribe_chat", (contactId) => {
    if (adminConnections[socket.id]?.authenticated) {
      console.log(
        `Admin ${socket.id} suscrito a conversación con: ${contactId}`
      );

      // Añadir este chat a la lista de suscripciones del administrador
      if (!adminConnections[socket.id].subscribedChats) {
        adminConnections[socket.id].subscribedChats = [];
      }

      // Verificar si ya está suscrito para evitar duplicados
      if (!adminConnections[socket.id].subscribedChats.includes(contactId)) {
        adminConnections[socket.id].subscribedChats.push(contactId);
      }

      socket.join(`chat:${contactId}`);

      console.log(
        "Suscripciones actuales:",
        adminConnections[socket.id].subscribedChats
      );
    }
  });

  // Dejar de seguir un chat
  socket.on("unsubscribe_chat", (contactId) => {
    if (
      adminConnections[socket.id] &&
      adminConnections[socket.id].subscribedChats
    ) {
      // Eliminar este chat de las suscripciones
      adminConnections[socket.id].subscribedChats = adminConnections[
        socket.id
      ].subscribedChats.filter((chat) => chat !== contactId);

      console.log(`Admin ${socket.id} canceló suscripción a: ${contactId}`);
    }
    socket.leave(`chat:${contactId}`);
  });

  // Enviar mensaje desde el panel de administración
  socket.on("send_message", async (data) => {
    if (!adminConnections[socket.id]?.authenticated) {
      return socket.emit("error", { message: "No autenticado" });
    }

    try {
      const { contactId, message } = data;
      const result = await whatsappService.sendTextMessage(contactId, message);

      // Crear registro en la base de datos
      const messageRecord = new Message({
        messageId: result.id.id,
        body: message,
        from: client.info.wid._serialized,
        to: contactId,
        hasMedia: false,
        isCommand: false,
        direction: "outgoing",
      });

      await messageRecord.save();

      // Notificar al admin que el mensaje se envió correctamente
      socket.emit("message_sent", {
        success: true,
        messageId: result.id.id,
        timestamp: Date.now(),
      });

      // Notificar a todos los admins que están viendo esta conversación
      io.to(`chat:${contactId}`).emit("new_message", {
        id: messageRecord._id,
        messageId: result.id.id,
        body: message,
        from: client.info.wid._serialized,
        to: contactId,
        timestamp: Date.now(),
        direction: "outgoing",
      });
    } catch (error) {
      console.error("Error al enviar mensaje desde el panel:", error);
      socket.emit("error", { message: "Error al enviar mensaje" });
    }
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
    delete adminConnections[socket.id];
  });
});

// Añadir ruta estática para acceder a los archivos multimedia (protegida por el middleware de autenticación)
const mediaAuthMiddleware = (req, res, next) => {
  const token = req.cookies["admin_token"] || req.query.token;
  if (!token || token.length < 32) {
    return res.status(401).send("No autorizado");
  }
  next();
};

// Ruta estática para acceder a los archivos multimedia
app.use(
  "/media",
  mediaAuthMiddleware,
  express.static(path.resolve(process.cwd(), "media_files"))
);

// Función para procesar archivos multimedia de los mensajes
async function processMessageMedia(msg, savedMessage) {
  try {
    // Guardar archivos permanentemente (false indica que no es temporal)
    const mediaPath = await whatsappService.saveMedia(msg, false);
    console.log(`Archivo multimedia guardado en: ${mediaPath}`);

    // Obtener información del archivo multimedia
    const media = await msg.downloadMedia();

    if (!media) {
      console.error("Error: media es undefined después de downloadMedia()");
      return;
    }

    // Verificar si el mensaje no es un comando para procesar el archivo automáticamente
    if (!savedMessage.body.startsWith("!")) {
      // Responder con confirmación según el tipo de archivo
      let responseMessage = "✅ Archivo recibido y guardado correctamente.";

      if (media.mimetype.startsWith("image/")) {
        responseMessage = "✅ Imagen recibida y guardada correctamente.";
      } else if (
        media.mimetype.startsWith("application/") ||
        media.mimetype === "text/plain"
      ) {
        responseMessage = "✅ Documento recibido y guardado correctamente.";
      } else if (media.mimetype.startsWith("audio/")) {
        responseMessage = "✅ Audio recibido y guardado correctamente.";
      } else if (media.mimetype.startsWith("video/")) {
        responseMessage = "✅ Video recibido y guardado correctamente.";
      }

      responseMessage += `\nPuedes acceder a él usando la referencia: ${savedMessage._id}`;
      await msg.reply(responseMessage);
    }
  } catch (error) {
    console.error("Error al procesar archivo multimedia:", error);
  }
}

// Función para procesar comandos
async function handleCommand(msg, messageBody) {
  try {
    // Respuesta a comando !ping
    if (messageBody === "!ping") {
      await msg.reply("pong");
    }
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
!info - Muestra información del mensaje (útil para multimedia)
!archivos - Lista los últimos 5 archivos que enviaste
!reenviar <id> - Reenvía un archivo usando su ID de referencia`;

      await msg.reply(helpMessage);
    }
    // Comando para convertir imagen a sticker
    else if (messageBody === "!sticker" && msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        await msg.reply(media, null, { sendMediaAsSticker: true });
      } catch (stickerError) {
        console.error("Error al crear sticker:", stickerError);
        await msg.reply(
          "No se pudo crear el sticker. Asegúrate que sea una imagen válida."
        );
      }
    }
    // Comando para enviar imagen desde URL
    else if (messageBody.startsWith("!imagen ")) {
      const url = messageBody.slice(8).trim();
      if (!url) {
        await msg.reply(
          "Por favor proporciona una URL válida. Uso: !imagen <url>"
        );
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
        await msg.reply(
          "No se pudo enviar la imagen. Verifica que la URL sea válida."
        );
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
        const extension = MediaHandler.getExtensionFromMimetype(media.mimetype);
        info += `Extensión detectada: ${extension}\n`;
        if (media.filename) {
          info += `Nombre archivo: ${media.filename}\n`;
        }
      }

      await msg.reply(info);
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
          await msg.reply("No has enviado archivos multimedia recientemente.");
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

        await msg.reply(response);
      } catch (error) {
        console.error("Error al listar archivos multimedia:", error);
        await msg.reply("No se pudieron recuperar los archivos multimedia.");
      }
    }
    // Comando para reenviar un archivo multimedia usando una referencia
    else if (messageBody.startsWith("!reenviar ")) {
      const referenceId = messageBody.slice(10).trim();

      if (!referenceId) {
        await msg.reply(
          "Por favor proporciona el ID de referencia del mensaje. Uso: !reenviar <id>"
        );
        return;
      }

      try {
        // Buscar el mensaje por ID
        const savedMessage = await Message.findById(referenceId);

        if (!savedMessage || !savedMessage.hasMedia) {
          await msg.reply(
            "No se encontró ningún archivo multimedia con esa referencia."
          );
          return;
        }

        // Buscar los archivos multimedia asociados
        const mediaFiles = await MediaHandler.findByMessageId(
          savedMessage.messageId
        );

        if (!mediaFiles || mediaFiles.length === 0) {
          await msg.reply(
            "El archivo multimedia no está disponible o ha sido eliminado."
          );
          return;
        }

        // Enviar cada archivo encontrado
        for (const file of mediaFiles) {
          const media = MediaHandler.fromFilePath(file.filePath);

          // Enviar según el tipo de archivo
          if (file.fileType === "image") {
            await msg.reply(media, null, { caption: "Imagen reenviada" });
          } else if (file.fileType === "document") {
            await msg.reply(media, null, { sendMediaAsDocument: true });
          } else if (file.fileType === "audio") {
            await msg.reply(media, null, {
              sendAudioAsVoice: file.mimetype.includes("ogg"),
            });
          } else if (file.fileType === "video") {
            await msg.reply(media);
          } else {
            await msg.reply(media);
          }
        }
      } catch (error) {
        console.error("Error al reenviar archivo multimedia:", error);
        await msg.reply("No se pudo reenviar el archivo multimedia.");
      }
    }
  } catch (error) {
    console.error("Error al procesar comando:", error);
  }
}
