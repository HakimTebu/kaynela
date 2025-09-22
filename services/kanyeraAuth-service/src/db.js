// // services/auth-service/src/db.js
// const mongoose = require("mongoose");

// const connectWithRetry = () => {
//   console.log("Attempting MongoDB connection...");
//   return mongoose
//     .connect(process.env.MONGODB_URI, {
//       serverSelectionTimeoutMS: 30000,
//     })
//     .catch((err) => {
//       console.error("MongoDB connection failed, retrying in 5 seconds...", err);
//       setTimeout(connectWithRetry, 30000);
//     });
// };

// module.exports = connectWithRetry;


// db.js (shared between services)
const mongoose = require('mongoose');
const logger = require('./utils/logger'); // Import logger in auth-service too

async function connectWithRetry() {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(`MongoDB connection attempt ${attempt}/${MAX_RETRIES}`);
      
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000
      });

      mongoose.connection.on('error', err => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      logger.info('MongoDB connection established');
      return;
    } catch (err) {
      logger.error(`Connection attempt ${attempt} failed: ${err.message}`);
      
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed after ${MAX_RETRIES} attempts`);
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

module.exports = connectWithRetry;