const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const whatsappService = require("../services/whatsappService");
const Message = require("../models/message");
const MediaFile = require("../models/MediaFile");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const MediaHandler = require("../utils/mediaHandler");

// Usar cookie-parser en el router
router.use(cookieParser());

// Middleware para verificar autenticación administrativa
const checkAuth = (req, res, next) => {
  // Verificar token en cookies, query o header
  const token =
    req.cookies.admin_token || req.query.token || req.headers["x-admin-token"];

  if (!token) {
    return res.redirect("/admin/login");
  }

  // Verificar token en la sesión
  // En una implementación real, verificaríamos contra una base de datos
  try {
    // Simple verificación, en producción usar JWT o similar
    if (token && token.length > 32) {
      return next();
    }
    res.redirect("/admin/login");
  } catch (error) {
    console.error("Error de autenticación:", error);
    res.redirect("/admin/login");
  }
};

// Ruta de inicio de sesión
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/admin/login.html"));
});

// Configuración
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const TOKEN_SECRET = process.env.TOKEN_SECRET || "secret_token_key";
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

// Generar token de autenticación
const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Autenticación
router.post("/api/login", (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    const token = generateToken();

    // En producción, almacenar en base de datos con expiración

    // Establecer cookie
    res.cookie("admin_token", token, {
      maxAge: TOKEN_EXPIRY,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.json({
      success: true,
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Contraseña incorrecta",
    });
  }
});

// Ruta de cierre de sesión
router.get("/logout", (req, res) => {
  res.clearCookie("admin_token");
  res.redirect("/admin/login");
});

// Rutas protegidas del panel de administración
router.get("/", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/admin/dashboard.html"));
});

router.get("/messages", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/admin/messages.html"));
});

router.get("/media", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/admin/media.html"));
});

router.get("/settings", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/admin/settings.html"));
});

// API para estadísticas
router.get("/api/stats", checkAuth, async (req, res) => {
  try {
    // Contar mensajes totales
    const totalMessages = await Message.countDocuments();

    // Contar mensajes recibidos y enviados
    const incomingMessages = await Message.countDocuments({
      direction: "incoming",
    });
    const outgoingMessages = await Message.countDocuments({
      direction: "outgoing",
    });

    // Contar archivos multimedia
    const totalMedia = await MediaFile.countDocuments();

    // Contar archivos por tipo
    const imageFiles = await MediaFile.countDocuments({ fileType: "image" });
    const audioFiles = await MediaFile.countDocuments({ fileType: "audio" });
    const videoFiles = await MediaFile.countDocuments({ fileType: "video" });
    const documentFiles = await MediaFile.countDocuments({
      fileType: "document",
    });

    // Obtener mensajes recientes
    const recentMessages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        messages: {
          total: totalMessages,
          incoming: incomingMessages,
          outgoing: outgoingMessages,
        },
        media: {
          total: totalMedia,
          image: imageFiles,
          audio: audioFiles,
          video: videoFiles,
          document: documentFiles,
        },
        recentMessages,
      },
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener estadísticas",
    });
  }
});

// API para mensajes recientes
router.get("/api/messages", checkAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Obtener mensajes
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    // Contar total de mensajes
    const total = await Message.countDocuments();

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener mensajes",
    });
  }
});

// API para enviar mensaje desde el panel
router.post("/api/send", checkAuth, async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: "El número de teléfono y el mensaje son requeridos",
      });
    }

    // Normalizar número de teléfono
    const normalizedPhone = phone.includes("@c.us") ? phone : `${phone}@c.us`;

    // Enviar mensaje
    const result = await whatsappService.sendTextMessage(
      normalizedPhone,
      message
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al enviar mensaje",
    });
  }
});

// API para reiniciar el cliente de WhatsApp
router.post("/api/restart", checkAuth, async (req, res) => {
  try {
    // Reiniciar cliente
    await whatsappService.restart();

    res.json({
      success: true,
      message: "Cliente reiniciado correctamente",
    });
  } catch (error) {
    console.error("Error al reiniciar cliente:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al reiniciar cliente",
    });
  }
});

// API para obtener contactos de WhatsApp
router.get("/api/contacts", checkAuth, async (req, res) => {
  try {
    // Obtener contactos desde el servicio de WhatsApp
    const contacts = await whatsappService.getContacts();

    // Filtrar y mapear solo los datos relevantes
    const formattedContacts = contacts
      .filter((contact) => contact.isMyContact || contact.isWAContact)
      .map((contact) => ({
        id: contact.id._serialized,
        name: contact.name || contact.pushname || "Sin nombre",
        number: contact.number,
        profilePicUrl: contact.profilePicUrl,
        isGroup: contact.isGroup,
        lastSeen: contact.lastSeen || null,
      }));

    res.json({
      success: true,
      data: formattedContacts,
    });
  } catch (error) {
    console.error("Error al obtener contactos:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener contactos",
    });
  }
});

// API para obtener archivos multimedia con filtros
router.get("/api/media", checkAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const period = req.query.period;
    const search = req.query.search;

    let query = {};

    // Aplicar filtro por tipo
    if (type) {
      query.fileType = type;
    }

    // Aplicar filtro por período
    if (period) {
      const now = new Date();
      let startDate;

      switch (period) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          const day = now.getDay();
          startDate = new Date(now);
          startDate.setDate(now.getDate() - day);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Aplicar búsqueda por nombre
    if (search) {
      query.filename = { $regex: search, $options: "i" };
    }

    // Contar total de archivos
    const totalFiles = await MediaFile.countDocuments(query);

    // Obtener archivos
    const files = await MediaFile.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalFiles / limit);

    res.json({
      success: true,
      data: {
        files,
        currentPage: page,
        totalPages: totalPages,
        totalFiles,
      },
    });
  } catch (error) {
    console.error("Error al obtener archivos multimedia:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener archivos multimedia",
      error: error.message,
    });
  }
});

// API para obtener mensajes de una conversación
router.get("/api/messages/:contactId", checkAuth, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { limit = 50, before = null } = req.query;

    // Obtener mensajes desde la base de datos
    let query = {
      $or: [{ from: contactId }, { to: contactId }],
    };

    // Si se proporciona un ID de mensaje anterior, filtrar por fecha
    if (before) {
      const beforeMessage = await Message.findById(before);
      if (beforeMessage) {
        query.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    // Obtener mensajes ordenados por fecha (más recientes primero)
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Obtener información multimedia para cada mensaje
    const messagesWithMedia = await Promise.all(
      messages.map(async (message) => {
        if (message.hasMedia) {
          const mediaFiles = await MediaHandler.findByMessageId(
            message.messageId
          );
          message.media = mediaFiles.map((file) => ({
            id: file._id,
            filename: file.filename,
            fileType: file.fileType,
            mimetype: file.mimetype,
            fileSize: file.fileSize,
          }));
        }
        return message;
      })
    );

    // Ordenar de más antiguos a más recientes para mostrarlos correctamente
    const sortedMessages = messagesWithMedia.reverse();

    res.json({
      success: true,
      data: sortedMessages,
      pagination: {
        hasMore: messages.length === parseInt(limit),
        nextBefore:
          messages.length > 0 ? messages[messages.length - 1]._id : null,
      },
    });
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener mensajes",
    });
  }
});

module.exports = router;
