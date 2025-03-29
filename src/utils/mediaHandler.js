const fs = require("fs");
const path = require("path");
const { MessageMedia } = require("whatsapp-web.js");
const { v4: uuidv4 } = require("uuid");
const MediaFile = require("../models/MediaFile");

// Directorio base para almacenar archivos multimedia (fuera del contenedor)
const BASE_MEDIA_DIR =
  process.env.MEDIA_DIR || path.resolve(process.cwd(), "media_files"); // Usar path.resolve para asegurar ruta absoluta

console.log(`Directorio base para archivos multimedia: ${BASE_MEDIA_DIR}`);

// Estructura de directorios para los diferentes tipos de archivos
const MEDIA_DIRS = {
  IMAGES: path.join(BASE_MEDIA_DIR, "images"),
  AUDIO: path.join(BASE_MEDIA_DIR, "audio"),
  VIDEO: path.join(BASE_MEDIA_DIR, "video"),
  DOCUMENTS: path.join(BASE_MEDIA_DIR, "documents"),
  STICKERS: path.join(BASE_MEDIA_DIR, "stickers"),
  OTHER: path.join(BASE_MEDIA_DIR, "others"),
  TEMP: path.join(BASE_MEDIA_DIR, "temp"),
};

// Crear directorios si no existen
Object.values(MEDIA_DIRS).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Directorio creado: ${dir}`);
  }
});

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
   * @param {boolean} isTemp - Indica si el archivo es temporal (defecto: false)
   * @returns {string} - Ruta al archivo guardado
   */
  static async saveMedia(
    mediaData,
    filename = null,
    mimetype = null,
    messageId = null,
    isTemp = false
  ) {
    try {
      // Generar nombre de archivo único si no se proporciona
      if (!filename) {
        const ext = this.getExtensionFromMimetype(mimetype);
        filename = `${uuidv4()}.${ext}`;
      }

      // Determinar la carpeta adecuada según el tipo de archivo
      let saveDir = MEDIA_DIRS.OTHER;

      if (isTemp) {
        saveDir = MEDIA_DIRS.TEMP;
      } else if (mimetype) {
        if (mimetype.startsWith("image/")) {
          saveDir = MEDIA_DIRS.IMAGES;
        } else if (mimetype.startsWith("audio/")) {
          saveDir = MEDIA_DIRS.AUDIO;
        } else if (mimetype.startsWith("video/")) {
          saveDir = MEDIA_DIRS.VIDEO;
        } else if (
          mimetype === "application/pdf" ||
          mimetype.includes("word") ||
          mimetype.includes("excel") ||
          mimetype.includes("powerpoint") ||
          mimetype === "text/plain"
        ) {
          saveDir = MEDIA_DIRS.DOCUMENTS;
        } else if (mimetype === "image/webp") {
          saveDir = MEDIA_DIRS.STICKERS;
        }
      }

      const filePath = path.join(saveDir, filename);

      // Si mediaData es un string base64, convertir a Buffer
      const buffer = Buffer.isBuffer(mediaData)
        ? mediaData
        : Buffer.from(mediaData, "base64");

      // Guardar archivo
      fs.writeFileSync(filePath, buffer);
      console.log(`Archivo guardado en: ${filePath}`);

      // Guardar en la base de datos si se proporciona messageId
      if (messageId) {
        const fileSize = buffer.length;

        const mediaFile = new MediaFile({
          messageId,
          filename,
          filePath,
          mimetype,
          fileSize,
          tempFile: isTemp,
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
   * @param {boolean} isTemp - Indica si el archivo es temporal (defecto: false)
   * @returns {Promise<string>} - Ruta al archivo guardado
   */
  static async saveMediaFromMessage(message, isTemp = false) {
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
        message.id.id,
        isTemp
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
      console.log("Iniciando limpieza de archivos temporales...");

      // Solo limpiar archivos marcados como temporales en la base de datos
      const tempMediaFiles = await MediaFile.find({ tempFile: true });
      console.log(
        `Encontrados ${tempMediaFiles.length} archivos temporales en la base de datos`
      );

      const now = Date.now();
      let deletedCount = 0;

      for (const mediaFile of tempMediaFiles) {
        // Verificar si el archivo existe
        if (fs.existsSync(mediaFile.filePath)) {
          const stats = fs.statSync(mediaFile.filePath);

          // Solo eliminar si es más antiguo que maxAgeMs
          if (now - stats.mtimeMs > maxAgeMs) {
            await this.deleteMedia(mediaFile.filePath);
            deletedCount++;
            console.log(`Archivo temporal eliminado: ${mediaFile.filePath}`);
          }
        } else {
          // Si el archivo ya no existe, actualizar la base de datos
          mediaFile.tempFile = false;
          await mediaFile.save();
          console.log(
            `Archivo no encontrado, marcado como no temporal: ${mediaFile.filePath}`
          );
        }
      }

      console.log(
        `Limpieza completada. Se eliminaron ${deletedCount} archivos temporales.`
      );
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
    if (!mimetype) {
      console.log("ADVERTENCIA: mimetype es undefined o null");
      return "bin";
    }

    console.log(`Determinando extensión para MIME: ${mimetype}`);

    // Mapa completo de tipos MIME a extensiones
    const mimetypeMap = {
      // Imágenes
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "image/bmp": "bmp",
      "image/tiff": "tiff",
      "image/x-icon": "ico",

      // Videos
      "video/mp4": "mp4",
      "video/3gpp": "3gp",
      "video/quicktime": "mov",
      "video/x-msvideo": "avi",
      "video/x-ms-wmv": "wmv",
      "video/webm": "webm",
      "video/x-matroska": "mkv",
      "video/mpeg": "mpg",

      // Audio
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "audio/ogg": "ogg",
      "audio/opus": "opus",
      "audio/webm": "weba",
      "audio/wav": "wav",
      "audio/wave": "wav",
      "audio/x-wav": "wav",
      "audio/x-pn-wav": "wav",
      "audio/vnd.wave": "wav",
      "audio/aac": "aac",
      "audio/mp3": "mp3",
      "audio/x-m4a": "m4a",
      "audio/x-ms-wma": "wma",
      "audio/vorbis": "ogg",
      "audio/webm;codecs=opus": "opus",
      "audio/amr": "amr",
      "audio/aac": "aac",
      "audio/x-aac": "aac",

      // Tipos específicos de WhatsApp
      "audio/ogg; codecs=opus": "ogg", // Formato típico de notas de voz de WhatsApp
      ptt: "ogg", // Otro formato para notas de voz
      "audio/ptt": "ogg",
      "application/octet-stream": "mp3", // A veces WhatsApp envía audios así

      // Documentos
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
      "application/rtf": "rtf",
      "application/zip": "zip",
      "application/x-rar-compressed": "rar",
      "application/x-tar": "tar",
      "application/gzip": "gz",
      "application/x-7z-compressed": "7z",
      "application/json": "json",
      "application/xml": "xml",
      "application/javascript": "js",
      "text/css": "css",
      "text/html": "html",
      "text/csv": "csv",
    };

    // Comprobar si el tipo MIME está directamente en el mapa
    if (mimetypeMap[mimetype]) {
      console.log(`Extensión encontrada en el mapa: ${mimetypeMap[mimetype]}`);
      return mimetypeMap[mimetype];
    }

    // Detección basada en prefijos de tipos MIME
    if (mimetype.startsWith("audio/")) {
      console.log(
        `Tipo MIME de audio no mapeado: ${mimetype}, asignando mp3 por defecto`
      );
      return "mp3"; // Por defecto para audio
    } else if (mimetype.startsWith("image/")) {
      return "jpg"; // Por defecto para imágenes
    } else if (mimetype.startsWith("video/")) {
      return "mp4"; // Por defecto para videos
    } else if (mimetype.startsWith("text/")) {
      return "txt"; // Por defecto para texto
    } else if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) {
      return "xlsx"; // Para hojas de cálculo
    } else if (mimetype.includes("document") || mimetype.includes("word")) {
      return "docx"; // Para documentos
    } else if (
      mimetype.includes("presentation") ||
      mimetype.includes("powerpoint")
    ) {
      return "pptx"; // Para presentaciones
    } else if (
      mimetype.includes("audio") ||
      mimetype.includes("opus") ||
      mimetype.includes("ogg")
    ) {
      return "mp3"; // Atrapar cualquier tipo de audio no detectado
    }

    // Si no se puede determinar, usar extensión binaria
    console.log(
      `Tipo MIME no reconocido: ${mimetype}, asignando extensión .bin`
    );
    return "bin";
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

// Ejecutar limpieza de archivos temporales cada 24 horas (antes cada 6 horas)
setInterval(() => {
  console.log("Ejecutando limpieza programada de archivos temporales...");
  MediaHandler.cleanupTempFiles();
}, 24 * 60 * 60 * 1000); // 24 horas

module.exports = MediaHandler;
