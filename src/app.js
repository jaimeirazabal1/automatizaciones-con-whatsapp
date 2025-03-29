// Importar dependencias
require("dotenv").config();
const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const connectDB = require("../config/database");
const WhatsAppService = require("./services/whatsappService");
const SchedulerService = require("./services/schedulerService");
const Message = require("./models/Message");

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  console.log("Mensaje recibido:", msg.body);

  try {
    // Guardar mensaje en la base de datos
    const message = new Message({
      messageId: msg.id.id,
      body: msg.body,
      from: msg.from,
      to: msg.to,
      hasMedia: msg.hasMedia,
      isCommand: msg.body.startsWith("!"),
      command: msg.body.startsWith("!") ? msg.body.split(" ")[0] : null,
    });

    await message.save();

    // Respuesta a comando !ping
    if (msg.body === "!ping") {
      msg.reply("pong");
    }

    // Comando de ayuda
    if (msg.body === "!ayuda") {
      const helpMessage = `*Comandos disponibles:*
!ping - Prueba de conexión
!ayuda - Muestra este mensaje`;

      msg.reply(helpMessage);
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

// Rutas básicas de la API
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

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
