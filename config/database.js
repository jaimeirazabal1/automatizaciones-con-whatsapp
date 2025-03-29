const mongoose = require("mongoose");

/**
 * Establece la conexión con la base de datos MongoDB
 */
const connectDB = async () => {
  try {
    const uri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/whatsapp_bot";

    await mongoose.connect(uri);

    console.log("MongoDB conectado correctamente");
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
