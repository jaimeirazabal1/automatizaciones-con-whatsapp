const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
  },
  body: {
    type: String,
    default: "",
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
  },
  hasMedia: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isCommand: {
    type: Boolean,
    default: false,
  },
  command: {
    type: String,
  },
});

module.exports = mongoose.model("Message", MessageSchema);
