const express = require("express");
const router = express.Router();
const WhatsAppService = require("../services/whatsappService");
const MediaHandler = require("../utils/mediaHandler");
const MediaFile = require("../models/MediaFile");
const Message = require("../models/message");
const path = require("path");
const fs = require("fs");
// Comentado temporalmente hasta que multer esté disponible en el contenedor
// const multer = require("multer");

// Configuración de multer para carga de archivos (comentado temporalmente)
/*
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mediaDir = path.join(__dirname, "../utils/media");
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    cb(null, mediaDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage: storage });
*/

// Función temporal para manejar rutas que requieren multer
const tempMiddleware = (req, res, next) => {
  return res.status(503).json({
    success: false,
    message:
      "Subida de archivos temporalmente deshabilitada. El módulo multer no está instalado en el contenedor.",
  });
};

/**
 * @route GET /api/status
 * @desc Obtener estado del servicio de WhatsApp
 */
router.get("/status", (req, res) => {
  const status = WhatsAppService.getStatus();
  res.json({ success: true, status });
});

/**
 * @route POST /api/send
 * @desc Enviar mensaje de texto
 * @body {phone, message}
 */
router.post("/send", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: "Se requiere número de teléfono y mensaje",
      });
    }

    const result = await WhatsAppService.sendTextMessage(phone, message);
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    res.status(500).json({
      success: false,
      message: "Error al enviar mensaje",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/send/image
 * @desc Enviar imagen
 * @body {phone, caption}
 * @file image
 */
router.post("/send/image", tempMiddleware);
// Versión original comentada
/*
router.post("/send/image", upload.single("image"), async (req, res) => {
  try {
    const { phone, caption } = req.body;

    if (!phone || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Se requiere número de teléfono e imagen",
      });
    }

    const result = await WhatsAppService.sendImage(
      phone,
      req.file.path,
      caption || ""
    );

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error al enviar imagen:", error);
    res.status(500).json({
      success: false,
      message: "Error al enviar imagen",
      error: error.message,
    });
  }
});
*/

/**
 * @route POST /api/send/document
 * @desc Enviar documento
 * @body {phone, filename}
 * @file document
 */
router.post("/send/document", tempMiddleware);

/**
 * @route POST /api/send/audio
 * @desc Enviar audio
 * @body {phone}
 * @file audio
 */
router.post("/send/audio", tempMiddleware);

/**
 * @route GET /api/media
 * @desc Obtener lista de archivos multimedia
 */
router.get("/media", async (req, res) => {
  try {
    const { type, limit = 20, page = 1 } = req.query;

    let query = {};
    if (type) {
      query.fileType = type;
    }

    const skip = (page - 1) * limit;

    const files = await MediaFile.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MediaFile.countDocuments(query);

    res.json({
      success: true,
      data: {
        files,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error al obtener archivos multimedia:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener archivos multimedia",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/media/:id
 * @desc Obtener información de un archivo multimedia
 */
router.get("/media/:id", async (req, res) => {
  try {
    const file = await MediaFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Archivo no encontrado",
      });
    }

    res.json({ success: true, data: file });
  } catch (error) {
    console.error("Error al obtener archivo multimedia:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener archivo multimedia",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/media/download/:id
 * @desc Descargar un archivo multimedia por su ID
 */
router.get("/media/download/:id", async (req, res) => {
  try {
    const file = await MediaFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Archivo no encontrado",
      });
    }

    // Verificar si el archivo existe físicamente
    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({
        success: false,
        message: "El archivo físico no existe o ha sido eliminado",
      });
    }

    // Configurar cabeceras para la descarga
    res.setHeader("Content-Type", file.mimetype);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`
    );

    // Enviar el archivo
    const filestream = fs.createReadStream(file.filePath);
    filestream.pipe(res);
  } catch (error) {
    console.error("Error al descargar archivo multimedia:", error);
    res.status(500).json({
      success: false,
      message: "Error al descargar archivo multimedia",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/message/:id/media
 * @desc Obtener todos los archivos multimedia de un mensaje
 */
router.get("/message/:id/media", async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Mensaje no encontrado",
      });
    }

    if (!message.hasMedia) {
      return res.status(404).json({
        success: false,
        message: "El mensaje no tiene archivos multimedia",
      });
    }

    // Buscar archivos multimedia asociados al mensaje
    const mediaFiles = await MediaFile.find({ messageId: message.messageId });

    res.json({
      success: true,
      data: {
        message,
        mediaFiles,
      },
    });
  } catch (error) {
    console.error("Error al obtener archivos multimedia del mensaje:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener archivos multimedia",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/upload
 * @desc Subir un archivo multimedia a través de la API
 */
router.post("/upload", tempMiddleware);

/**
 * @route DELETE /api/media/:id
 * @desc Eliminar un archivo multimedia
 */
router.delete("/media/:id", async (req, res) => {
  try {
    const file = await MediaFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Archivo no encontrado",
      });
    }

    // Eliminar el archivo físico
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    // Eliminar registro de la base de datos
    await file.remove();

    res.json({
      success: true,
      message: "Archivo eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar archivo multimedia:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar archivo multimedia",
      error: error.message,
    });
  }
});

module.exports = router;
