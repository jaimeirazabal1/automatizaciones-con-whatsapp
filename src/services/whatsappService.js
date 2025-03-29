const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");
const MediaHandler = require("../utils/mediaHandler");
const Message = require("../models/message");

/**
 * Servicio para manejar operaciones de WhatsApp
 */
class WhatsAppService {
  constructor() {
    this.client = null;
    this._ready = false;
    this._state = "DISCONNECTED";
  }

  init(client) {
    this.client = client;

    // Eventos de estado del cliente
    this.client.on("ready", () => {
      console.log("Cliente de WhatsApp listo");
      this._ready = true;
      this._state = "CONNECTED";
    });

    this.client.on("authenticated", () => {
      console.log("Cliente de WhatsApp autenticado");
      this._state = "AUTHENTICATED";
    });

    this.client.on("auth_failure", () => {
      console.error("Error de autenticación en WhatsApp");
      this._ready = false;
      this._state = "AUTH_FAILURE";
    });

    this.client.on("disconnected", () => {
      console.log("Cliente de WhatsApp desconectado");
      this._ready = false;
      this._state = "DISCONNECTED";
    });

    return this.client;
  }

  isReady() {
    return this._ready;
  }

  getState() {
    return this._state;
  }

  async restart() {
    console.log("Reiniciando cliente de WhatsApp...");
    this._ready = false;

    try {
      // Cerrar la sesión actual si existe
      if (this.client) {
        await this.client.destroy();
      }

      // Reiniciar el cliente
      await this.client.initialize();

      return true;
    } catch (error) {
      console.error("Error al reiniciar cliente:", error);
      throw error;
    }
  }

  async logout() {
    console.log("Cerrando sesión de WhatsApp...");
    this._ready = false;

    try {
      // Cerrar la sesión actual
      await this.client.logout();

      // Reiniciar el cliente para volver a solicitar el QR
      await this.client.initialize();

      return true;
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  }

  /**
   * Envía un mensaje de texto
   * @param {string} to - Número de teléfono o ID del chat
   * @param {string} message - Mensaje a enviar
   * @returns {Promise} - Promesa con el resultado
   */
  async sendTextMessage(to, message) {
    this.checkClient();

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
    this.checkClient();

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
    this.checkClient();

    try {
      let media;

      // Verificar si la ruta es una URL
      if (imagePath.startsWith("http")) {
        media = await MessageMedia.fromUrl(imagePath);
      } else {
        // Verificar si el archivo existe
        if (!fs.existsSync(imagePath)) {
          throw new Error(`No se encontró la imagen en la ruta ${imagePath}`);
        }

        media = MessageMedia.fromFilePath(imagePath);
      }

      const result = await this.client.sendMessage(to, media, { caption });
      return result;
    } catch (error) {
      console.error("Error al enviar imagen:", error);
      throw error;
    }
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
    this.checkClient();

    try {
      let media;

      // Verificar si la ruta es una URL
      if (documentPath.startsWith("http")) {
        media = await MessageMedia.fromUrl(documentPath);

        // Si no se especificó un nombre de archivo, usar el de la URL
        if (!filename) {
          filename = documentPath.split("/").pop();
        }
      } else {
        // Verificar si el archivo existe
        if (!fs.existsSync(documentPath)) {
          throw new Error(
            `No se encontró el documento en la ruta ${documentPath}`
          );
        }

        media = MessageMedia.fromFilePath(documentPath);

        // Si no se especificó un nombre de archivo, usar el de la ruta
        if (!filename) {
          filename = documentPath.split("/").pop();
        }
      }

      const result = await this.client.sendMessage(to, media, {
        caption,
        sendMediaAsDocument: true,
        filename,
      });
      return result;
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
    this.checkClient();

    try {
      let media;

      // Verificar si la ruta es una URL
      if (audioPath.startsWith("http")) {
        media = await MessageMedia.fromUrl(audioPath);
      } else {
        // Verificar si el archivo existe
        if (!fs.existsSync(audioPath)) {
          throw new Error(`No se encontró el audio en la ruta ${audioPath}`);
        }

        media = MessageMedia.fromFilePath(audioPath);
      }

      const result = await this.client.sendMessage(to, media, {
        sendAudioAsVoice: asVoiceNote,
      });
      return result;
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
    this.checkClient();

    try {
      let media;

      // Verificar si la ruta es una URL
      if (videoPath.startsWith("http")) {
        media = await MessageMedia.fromUrl(videoPath);
      } else {
        // Verificar si el archivo existe
        if (!fs.existsSync(videoPath)) {
          throw new Error(`No se encontró el video en la ruta ${videoPath}`);
        }

        media = MessageMedia.fromFilePath(videoPath);
      }

      const result = await this.client.sendMessage(to, media, { caption });
      return result;
    } catch (error) {
      console.error("Error al enviar video:", error);
      throw error;
    }
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
    this.checkClient();

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
   * @param {boolean} isTemp - Indica si el archivo es temporal (defecto: false)
   * @returns {Promise<string>} - Ruta al archivo guardado
   */
  async saveMedia(message, isTemp = false) {
    this.checkClient();

    try {
      if (!message.hasMedia) {
        throw new Error("El mensaje no contiene multimedia");
      }

      // Descargar multimedia
      const media = await message.downloadMedia();

      // Registrar información del tipo MIME para depuración
      console.log(
        `Media recibido - Tipo MIME: ${media.mimetype}, Filename: ${
          media.filename || "Sin nombre"
        }`
      );

      // Determinar extensión basada en el mimetype
      const ext = this.getExtensionFromMimetype(media.mimetype);
      console.log(`Extensión asignada: ${ext} para MIME: ${media.mimetype}`);

      // Generar nombre de archivo único
      const filename = media.filename || `${Date.now()}.${ext}`;

      // Guardar el archivo y registrar en la base de datos
      const filePath = await MediaHandler.saveMedia(
        media.data,
        filename,
        media.mimetype,
        message.id.id,
        isTemp
      );

      console.log(`Archivo multimedia guardado en: ${filePath}`);

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
    this.checkClient();

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
    this.checkClient();

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
    this.checkClient();

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
    this.checkClient();

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
    this.checkClient();

    try {
      return await this.client.getChats();
    } catch (error) {
      console.error("Error al obtener chats:", error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de contactos de WhatsApp
   * @returns {Promise<Array>} - Promesa con la lista de contactos
   */
  async getContacts() {
    this.checkClient();

    try {
      return await this.client.getContacts();
    } catch (error) {
      console.error("Error al obtener contactos:", error);
      throw error;
    }
  }

  checkClient() {
    if (!this.client) {
      throw new Error("Cliente de WhatsApp no inicializado");
    }

    if (!this._ready) {
      throw new Error(
        "Cliente de WhatsApp no está listo. Espere a que se complete la inicialización."
      );
    }
  }
}

module.exports = new WhatsAppService();
