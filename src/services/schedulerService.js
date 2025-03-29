const cron = require("node-cron");
const ScheduledMessage = require("../models/ScheduledMessage");

/**
 * Servicio para programar envío de mensajes
 */
class SchedulerService {
  constructor(whatsappService) {
    this.whatsappService = whatsappService;
    this.jobs = new Map();
  }

  /**
   * Inicia el programador de mensajes
   */
  async init() {
    // Carga todos los mensajes programados de la base de datos
    try {
      const pendingMessages = await ScheduledMessage.find({
        sent: false,
        status: "pending",
      });

      console.log(`Cargando ${pendingMessages.length} mensajes programados`);

      // Programa cada mensaje pendiente
      pendingMessages.forEach((message) => {
        if (message.cronExpression && message.repeat) {
          this.scheduleRecurringMessage(message);
        } else {
          this.scheduleOneTimeMessage(message);
        }
      });
    } catch (error) {
      console.error("Error al iniciar el programador de mensajes:", error);
    }
  }

  /**
   * Programa un mensaje para envío único
   * @param {Object} message - Objeto con datos del mensaje a programar
   */
  scheduleOneTimeMessage(message) {
    const now = new Date();
    const scheduledTime = new Date(message.scheduledTime);

    // Si la fecha ya pasó, actualizamos el estado
    if (scheduledTime < now) {
      this.updateMessageStatus(
        message._id,
        "failed",
        "La fecha programada ya pasó"
      );
      return;
    }

    // Calculamos el delay en milisegundos
    const delay = scheduledTime.getTime() - now.getTime();

    // Programamos el timeout
    const timeout = setTimeout(async () => {
      await this.sendScheduledMessage(message);
    }, delay);

    // Guardamos la referencia al timeout
    this.jobs.set(message._id.toString(), {
      type: "timeout",
      job: timeout,
    });

    console.log(
      `Mensaje programado para ${scheduledTime} (en ${Math.round(
        delay / 1000 / 60
      )} minutos)`
    );
  }

  /**
   * Programa un mensaje recurrente con cron
   * @param {Object} message - Objeto con datos del mensaje a programar
   */
  scheduleRecurringMessage(message) {
    if (!message.cronExpression) {
      console.error("Expresión cron no proporcionada para mensaje recurrente");
      return;
    }

    try {
      // Validamos la expresión cron
      if (!cron.validate(message.cronExpression)) {
        this.updateMessageStatus(
          message._id,
          "failed",
          "Expresión cron inválida"
        );
        return;
      }

      // Programamos la tarea cron
      const job = cron.schedule(message.cronExpression, async () => {
        await this.sendScheduledMessage(message);
      });

      // Guardamos la referencia al job
      this.jobs.set(message._id.toString(), {
        type: "cron",
        job: job,
      });

      console.log(
        `Mensaje recurrente programado con expresión: ${message.cronExpression}`
      );
    } catch (error) {
      console.error("Error al programar mensaje recurrente:", error);
      this.updateMessageStatus(message._id, "failed", error.message);
    }
  }

  /**
   * Envía un mensaje programado
   * @param {Object} message - Mensaje a enviar
   */
  async sendScheduledMessage(message) {
    try {
      if (message.mediaPath) {
        await this.whatsappService.sendMediaMessage(
          message.to,
          message.body,
          message.mediaPath
        );
      } else {
        await this.whatsappService.sendTextMessage(message.to, message.body);
      }

      // Actualizamos el estado del mensaje
      if (!message.repeat) {
        await this.updateMessageStatus(message._id, "sent");
      } else {
        // Para mensajes recurrentes solo actualizamos la última fecha de envío
        await ScheduledMessage.findByIdAndUpdate(message._id, {
          lastSentAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Error al enviar mensaje programado:", error);
      await this.updateMessageStatus(message._id, "failed", error.message);
    }
  }

  /**
   * Actualiza el estado de un mensaje programado
   * @param {string} messageId - ID del mensaje
   * @param {string} status - Nuevo estado
   * @param {string} errorMessage - Mensaje de error (opcional)
   */
  async updateMessageStatus(messageId, status, errorMessage = null) {
    try {
      const update = {
        status,
        sent: status === "sent",
        lastSentAt: status === "sent" ? new Date() : undefined,
      };

      if (errorMessage) {
        update.errorMessage = errorMessage;
      }

      await ScheduledMessage.findByIdAndUpdate(messageId, update);

      // Si el mensaje ya se envió o falló, eliminamos el job
      if (status !== "pending") {
        this.cancelScheduledMessage(messageId.toString());
      }
    } catch (error) {
      console.error("Error al actualizar estado de mensaje:", error);
    }
  }

  /**
   * Programa un nuevo mensaje
   * @param {Object} messageData - Datos del mensaje a programar
   * @returns {Promise} - Promesa con el mensaje creado
   */
  async scheduleNewMessage(messageData) {
    try {
      const newMessage = new ScheduledMessage(messageData);
      await newMessage.save();

      if (newMessage.cronExpression && newMessage.repeat) {
        this.scheduleRecurringMessage(newMessage);
      } else {
        this.scheduleOneTimeMessage(newMessage);
      }

      return newMessage;
    } catch (error) {
      console.error("Error al programar nuevo mensaje:", error);
      throw error;
    }
  }

  /**
   * Cancela un mensaje programado
   * @param {string} messageId - ID del mensaje
   */
  cancelScheduledMessage(messageId) {
    const job = this.jobs.get(messageId);

    if (job) {
      if (job.type === "timeout") {
        clearTimeout(job.job);
      } else if (job.type === "cron") {
        job.job.stop();
      }

      this.jobs.delete(messageId);
      console.log(`Mensaje programado ${messageId} cancelado`);
    }
  }
}

module.exports = SchedulerService;
