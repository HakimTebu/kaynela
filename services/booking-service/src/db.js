const mongoose = require("mongoose");
const logger = require("./utils/logger");

const connectWithRetry = async () => {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(
        `📦 Attempting to connect to MongoDB... (attempt ${attempt}/${maxRetries})`
      );

      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error("MONGODB_URI environment variable is not set");
      }

      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // Removed deprecated options: bufferMaxEntries, bufferCommands
      });

      logger.info("✅ MongoDB connection established successfully");
      return;
    } catch (err) {
      logger.error(
        `❌ MongoDB connection attempt ${attempt} failed:`,
        err.message
      );

      if (attempt === maxRetries) {
        logger.error("❌ All MongoDB connection attempts failed");
        throw err;
      }

      logger.info(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};

module.exports = connectWithRetry;
