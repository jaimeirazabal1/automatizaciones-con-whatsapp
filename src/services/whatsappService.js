const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");
const MediaHandler = require("../utils/mediaHandler");
const Message = require("../models/message");

/**
 * Servicio para manejar operaciones de WhatsApp
 */
class WhatsAppService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Envía un mensaje de texto
   * @param {string} to - Número de teléfono o ID del chat
   * @param {string} message - Mensaje a enviar
   * @returns {Promise} - Promesa con el resultado
   */
  async sendTextMessage(to, message) {
    try {
      const chat = await this.client.getChatById(to);
      return await chat.sendMessage(message);
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      throw error;
    }
  }

  /**
   * Envía un mensaje con archivos adjuntos
   * @param {string} to - Número de teléfono o ID del chat
   * @param {string} message - Mensaje a enviar
   * @param {string} mediaPath - Ruta al archivo multimedia
   * @returns {Promise} - Promesa con el resultado
   */
  async sendMediaMessage(to, message, mediaPath) {
    try {
      const chat = await this.client.getChatById(to);
      const media = MediaHandler.fromFilePath(mediaPath);
      return await chat.sendMessage(media, { caption: message });
    } catch (error) {
      console.error("Error al enviar mensaje multimedia:", error);
      throw error;
    }
  }

  /**
   * Envía una imagen
   * @param {string} to - Número de teléfono o ID del chat
   * @param {string} imagePath - Ruta a la imagen
   * @param {string} caption - Texto de la imagen (opcional)
   * @returns {Promise} - Promesa con el resultado
   */
  async sendImage(to, imagePath, caption = "") {
    return this.sendMediaMessage(to, caption, imagePath);
  }

  /**
   * Envía un documento
   * @param {string} to - Número de teléfono o ID del chat
   * @param {string} documentPath - Ruta al documento
   * @param {string} filename - Nombre del archivo a mostrar
   * @param {string} caption - Texto del documento (opcional)
   * @returns {Promise} - Promesa con el resultado
   */
  async sendDocument(to, documentPath, filename = null, caption = "") {
    try {
      const chat = await this.client.getChatById(to);
      const media = MediaHandler.fromFilePath(documentPath);

      if (filename) {
        media.filename = filename;
      }

      return await chat.sendMessage(media, {
        caption,
        sendMediaAsDocument: true,
      });
    } catch (error) {
      console.error("Error al enviar documento:", error);
      throw error;
    }
  }

  /**
   * Envía un archivo de audio
   * @param {string} to - Número de teléfono o ID del chat
   * @param {string} audioPath - Ruta al archivo de audio
   * @param {boolean} asVoiceNote - Enviar como nota de voz (true) o como archivo (false)
   * @returns {Promise} - Promesa con el resultado
   */
  async sendAudio(to, audioPath, asVoiceNote = false) {
    try {
      const chat = await this.client.getChatById(to);
      const media = MediaHandler.fromFilePath(audioPath);

      return await chat.sendMessage(media, {
        sendAudioAsVoice: asVoiceNote,
      });
    } catch (error) {
      console.error("Error al enviar audio:", error);
      throw error;
    }
  }

  /**
   * Envía un video
   * @param {string} to - Número de teléfono o ID del chat
   * @param {string} videoPath - Ruta al archivo de video
   * @param {string} caption - Texto del video (opcional)
   * @returns {Promise} - Promesa con el resultado
   */
  async sendVideo(to, videoPath, caption = "") {
    return this.sendMediaMessage(to, caption, videoPath);
  }

  /**
   * Envía un archivo multimedia desde una URL
   * @param {string} to - Número de teléfono o ID del chat
   * @param {string} url - URL del archivo multimedia
   * @param {string} caption - Texto del mensaje (opcional)
   * @param {Object} options - Opciones adicionales para el envío
   * @returns {Promise} - Promesa con el resultado
   */
  async sendMediaFromUrl(to, url, caption = "", options = {}) {
    try {
      const chat = await this.client.getChatById(to);
      const media = await MediaHandler.fromUrl(url);

      return await chat.sendMessage(media, {
        caption,
        ...options,
      });
    } catch (error) {
      console.error("Error al enviar multimedia desde URL:", error);
      throw error;
    }
  }

  /**
   * Guarda un archivo multimedia de un mensaje
   * @param {Message} message - Mensaje de WhatsApp que contiene multimedia
   * @returns {Promise<string>} - Ruta al archivo guardado
   */
  async saveMedia(message) {
    try {
      if (!message.hasMedia) {
        throw new Error("El mensaje no contiene multimedia");
      }

      // Descargar multimedia
      const media = await message.downloadMedia();

      // Determinar extensión basada en el mimetype
      const ext = this.getExtensionFromMimetype(media.mimetype);

      // Generar nombre de archivo único
      const filename = media.filename || `${Date.now()}.${ext}`;

      // Guardar el archivo y registrar en la base de datos
      const filePath = await MediaHandler.saveMedia(
        media.data,
        filename,
        media.mimetype,
        message.id.id
      );

      console.log(`Archivo multimedia guardado: ${filePath}`);

      return filePath;
    } catch (error) {
      console.error("Error al guardar multimedia:", error);
      throw error;
    }
  }

  /**
   * Recupera un archivo multimedia por ID de mensaje
   * @param {string} messageId - ID del mensaje
   * @returns {Promise<Array>} - Array de archivos multimedia
   */
  async getMediaByMessageId(messageId) {
    try {
      return await MediaHandler.findByMessageId(messageId);
    } catch (error) {
      console.error("Error al recuperar multimedia por messageId:", error);
      throw error;
    }
  }

  /**
   * Recupera un archivo multimedia por ID de referencia (ID de MongoDB)
   * @param {string} referenceId - ID de referencia (MongoDB)
   * @returns {Promise<Array>} - Array de archivos multimedia
   */
  async getMediaByReferenceId(referenceId) {
    try {
      // Buscar el mensaje por ID de referencia
      const message = await Message.findById(referenceId);
      if (!message) {
        throw new Error("Mensaje no encontrado");
      }

      // Obtener los archivos multimedia asociados al mensaje
      return await this.getMediaByMessageId(message.messageId);
    } catch (error) {
      console.error("Error al recuperar multimedia por referenceId:", error);
      throw error;
    }
  }

  /**
   * Obtiene la extensión de archivo basada en el tipo MIME
   * @param {string} mimetype - Tipo MIME
   * @returns {string} - Extensión de archivo
   */
  getExtensionFromMimetype(mimetype) {
    return MediaHandler.getExtensionFromMimetype(mimetype);
  }

  /**
   * Responde a un mensaje con multimedia
   * @param {Message} message - Mensaje al que responder
   * @param {string} mediaPath - Ruta al archivo multimedia
   * @param {string} caption - Texto del mensaje (opcional)
   * @param {Object} options - Opciones adicionales para el envío
   * @returns {Promise} - Promesa con el resultado
   */
  async replyWithMedia(message, mediaPath, caption = "", options = {}) {
    try {
      const media = MediaHandler.fromFilePath(mediaPath);

      return await message.reply(media, null, {
        caption,
        ...options,
      });
    } catch (error) {
      console.error("Error al responder con multimedia:", error);
      throw error;
    }
  }

  /**
   * Obtiene información de un chat
   * @param {string} chatId - ID del chat
   * @returns {Promise} - Promesa con la información del chat
   */
  async getChatInfo(chatId) {
    try {
      return await this.client.getChatById(chatId);
    } catch (error) {
      console.error("Error al obtener información del chat:", error);
      throw error;
    }
  }

  /**
   * Obtiene todos los chats
   * @returns {Promise} - Promesa con la lista de chats
   */
  async getAllChats() {
    try {
      return await this.client.getChats();
    } catch (error) {
      console.error("Error al obtener todos los chats:", error);
      throw error;
    }
  }
}

module.exports = WhatsAppService;
