const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");

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
      const media = MessageMedia.fromFilePath(mediaPath);
      return await chat.sendMessage(media, { caption: message });
    } catch (error) {
      console.error("Error al enviar mensaje multimedia:", error);
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
