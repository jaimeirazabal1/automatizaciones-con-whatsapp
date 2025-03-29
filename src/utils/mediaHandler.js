const fs = require("fs");
const path = require("path");
const { MessageMedia } = require("whatsapp-web.js");
const { v4: uuidv4 } = require("uuid");
const MediaFile = require("../models/MediaFile");

// Directorio para almacenar archivos multimedia temporales
const TEMP_DIR = path.join(__dirname, "media", "temp");

// Crear directorio si no existe
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Maneja archivos multimedia para enviar y recibir
 */
class MediaHandler {
  /**
   * Guarda un archivo multimedia desde un buffer o base64
   * @param {Buffer|string} mediaData - Buffer o string base64 del archivo
   * @param {string} filename - Nombre del archivo (opcional)
   * @param {string} mimetype - Tipo MIME del archivo
   * @param {string} messageId - ID del mensaje asociado (opcional)
   * @returns {string} - Ruta al archivo guardado
   */
  static async saveMedia(
    mediaData,
    filename = null,
    mimetype = null,
    messageId = null
  ) {
    try {
      // Generar nombre de archivo único si no se proporciona
      if (!filename) {
        const ext = this.getExtensionFromMimetype(mimetype);
        filename = `${uuidv4()}.${ext}`;
      }

      const filePath = path.join(TEMP_DIR, filename);

      // Si mediaData es un string base64, convertir a Buffer
      const buffer = Buffer.isBuffer(mediaData)
        ? mediaData
        : Buffer.from(mediaData, "base64");

      // Guardar archivo
      fs.writeFileSync(filePath, buffer);

      // Guardar en la base de datos si se proporciona messageId
      if (messageId) {
        const fileSize = buffer.length;

        const mediaFile = new MediaFile({
          messageId,
          filename,
          filePath,
          mimetype,
          fileSize,
          tempFile: true,
        });

        await mediaFile.save();
      }

      return filePath;
    } catch (error) {
      console.error("Error al guardar archivo multimedia:", error);
      throw error;
    }
  }

  /**
   * Guarda un archivo multimedia desde un mensaje de WhatsApp
   * @param {Message} message - Mensaje de WhatsApp con multimedia
   * @returns {Promise<string>} - Ruta al archivo guardado
   */
  static async saveMediaFromMessage(message) {
    try {
      if (!message.hasMedia) {
        throw new Error("El mensaje no contiene multimedia");
      }

      // Descargar multimedia
      const media = await message.downloadMedia();

      // Determinar extensión basada en el mimetype
      const ext = this.getExtensionFromMimetype(media.mimetype);
      const filename = `${uuidv4()}.${ext}`;

      return await this.saveMedia(
        media.data,
        filename,
        media.mimetype,
        message.id.id
      );
    } catch (error) {
      console.error("Error al guardar multimedia del mensaje:", error);
      throw error;
    }
  }

  /**
   * Crea un objeto MessageMedia a partir de una URL
   * @param {string} url - URL del archivo multimedia
   * @returns {Promise<MessageMedia>} - Objeto MessageMedia
   */
  static async fromUrl(url) {
    try {
      return await MessageMedia.fromUrl(url);
    } catch (error) {
      console.error("Error al obtener multimedia desde URL:", error);
      throw error;
    }
  }

  /**
   * Crea un objeto MessageMedia a partir de un archivo local
   * @param {string} filePath - Ruta al archivo
   * @returns {MessageMedia} - Objeto MessageMedia
   */
  static fromFilePath(filePath) {
    try {
      return MessageMedia.fromFilePath(filePath);
    } catch (error) {
      console.error("Error al obtener multimedia desde archivo:", error);
      throw error;
    }
  }

  /**
   * Elimina un archivo multimedia temporal
   * @param {string} filePath - Ruta al archivo a eliminar
   * @returns {Promise<boolean>} - true si se eliminó correctamente
   */
  static async deleteMedia(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);

        // Actualizar en la base de datos
        await MediaFile.updateMany({ filePath }, { $set: { tempFile: false } });

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al eliminar archivo multimedia:", error);
      return false;
    }
  }

  /**
   * Limpia archivos temporales más antiguos que cierta edad
   * @param {number} maxAgeMs - Edad máxima en milisegundos (por defecto 24h)
   */
  static async cleanupTempFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const now = Date.now();
      const files = fs.readdirSync(TEMP_DIR);

      // Eliminar archivos más antiguos que maxAgeMs
      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > maxAgeMs) {
          await this.deleteMedia(filePath);
        }
      }

      // También limpiar registros en la base de datos que ya no tienen archivos
      const allMediaFiles = await MediaFile.find({ tempFile: true });
      for (const mediaFile of allMediaFiles) {
        if (!fs.existsSync(mediaFile.filePath)) {
          mediaFile.tempFile = false;
          await mediaFile.save();
        }
      }
    } catch (error) {
      console.error("Error al limpiar archivos temporales:", error);
    }
  }

  /**
   * Obtiene la extensión de archivo basada en el tipo MIME
   * @param {string} mimetype - Tipo MIME
   * @returns {string} - Extensión de archivo
   */
  static getExtensionFromMimetype(mimetype) {
    if (!mimetype) return "bin";

    const mimetypeMap = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "video/mp4": "mp4",
      "video/3gpp": "3gp",
      "audio/ogg": "ogg",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "application/pdf": "pdf",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "xlsx",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "pptx",
      "text/plain": "txt",
    };

    return mimetypeMap[mimetype] || "bin";
  }

  /**
   * Busca archivos multimedia por messageId
   * @param {string} messageId - ID del mensaje
   * @returns {Promise<Array>} - Array de archivos multimedia
   */
  static async findByMessageId(messageId) {
    return await MediaFile.find({ messageId });
  }

  /**
   * Busca archivos multimedia por tipo
   * @param {string} fileType - Tipo de archivo
   * @returns {Promise<Array>} - Array de archivos multimedia
   */
  static async findByType(fileType) {
    return await MediaFile.find({ fileType });
  }
}

// Ejecutar limpieza de archivos temporales cada 6 horas
setInterval(() => {
  MediaHandler.cleanupTempFiles();
}, 6 * 60 * 60 * 1000);

module.exports = MediaHandler;
