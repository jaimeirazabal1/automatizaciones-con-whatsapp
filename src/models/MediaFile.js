const mongoose = require("mongoose");

/**
 * Esquema para guardar información de archivos multimedia
 */
const MediaFileSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    ref: "Message",
  },
  filename: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
  },
  fileType: {
    type: String,
    enum: ["image", "audio", "video", "document", "sticker", "other"],
    default: "other",
  },
  tempFile: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "24h", // Se eliminará automáticamente después de 24 horas si tempFile es true
  },
});

/**
 * Middleware pre-save para determinar el tipo de archivo basado en el mimetype
 */
MediaFileSchema.pre("save", function (next) {
  if (this.mimetype) {
    if (this.mimetype.startsWith("image/")) {
      this.fileType = "image";
    } else if (this.mimetype.startsWith("audio/")) {
      this.fileType = "audio";
    } else if (this.mimetype.startsWith("video/")) {
      this.fileType = "video";
    } else if (
      this.mimetype === "application/pdf" ||
      this.mimetype.includes("word") ||
      this.mimetype.includes("excel") ||
      this.mimetype.includes("powerpoint") ||
      this.mimetype === "text/plain"
    ) {
      this.fileType = "document";
    } else if (this.mimetype === "image/webp") {
      this.fileType = "sticker";
    }
  }
  next();
});

const MediaFile = mongoose.model("MediaFile", MediaFileSchema);

module.exports = MediaFile;
