const mongoose = require("mongoose");

const ScheduledMessageSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  mediaPath: {
    type: String,
  },
  mediaType: {
    type: String,
    enum: ["image", "document", "audio", "video", null],
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  cronExpression: {
    type: String,
  },
  repeat: {
    type: Boolean,
    default: false,
  },
  sent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastSentAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending",
  },
});

module.exports = mongoose.model("ScheduledMessage", ScheduledMessageSchema);
