const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { promisify } = require("util");

// Import middleware
const requestIdMiddleware = require("./middlewares/requestId");
const rateLimiterMiddleware = require("./middlewares/rateLimiter");
const { errorHandler, notFoundHandler } = require("./utils/errors");

// Import routes
const routes = require("./routes");

// Import services
const connectWithRetry = require("./db");
const { client: redisClient } = require("./config/redis");
const { connectRabbitMQ, setupEventConsumers } = require("./services/rabbitmq");

// Import logger
const logger = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 3005;

// 1. Security middleware
app.use(helmet());

// 2. CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:3004",
      "http://localhost:3006",
      "http://localhost:3007",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Request-ID",
      "X-Ticket-Format",
    ],
  })
);

// 3. Request parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Request ID middleware
app.use(requestIdMiddleware);

// 5. Rate limiting - will be applied after Redis connection
// app.use(apiLimiter); // Moved to after Redis connection

// 6. Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Kaynela Farms Ticketing Service is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    requestId: req.requestId,
  });
});

// 7. API routes
app.use("/api", routes);

// 8. Error handling middleware (last)
app.use(notFoundHandler);
app.use(errorHandler(logger));

let isServiceReady = false;
let server = null;

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new requests
  isServiceReady = false;

  // Close server
  if (server) {
    server.close((err) => {
      if (err) {
        logger.error("Error during server close:", err);
        process.exit(1);
      }
      logger.info("✅ HTTP server closed");
    });
  }

  // Close database connections
  try {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
    logger.info("✅ MongoDB connection closed");
  } catch (err) {
    logger.error("❌ Error closing MongoDB connection:", err);
  }

  // Close Redis connection
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info("✅ Redis connection closed");
    }
  } catch (err) {
    logger.error("❌ Error closing Redis connection:", err);
  }

  // Close RabbitMQ connection
  try {
    const { closeConnections } = require("./services/rabbitmq");
    await closeConnections();
    logger.info("✅ RabbitMQ connections closed");
  } catch (err) {
    logger.error("❌ Error closing RabbitMQ connections:", err);
  }

  logger.info("✅ Graceful shutdown completed");
  process.exit(0);
};

// Main startup function
async function startServer() {
  try {
    logger.info("🚀 Starting Kaynela Farms Ticketing Service...");

    // 1. Connect to MongoDB
    try {
      logger.info("📦 Attempting MongoDB connection...");
      await connectWithRetry();
      logger.info("✅ MongoDB connected successfully");
    } catch (error) {
      logger.error("❌ MongoDB connection failed:", error);
      throw error; // Re-throw to stop startup
    }

    // 2. Connect to Redis
    try {
      logger.info("🔴 Attempting Redis connection...");
      await redisClient.connect();
      logger.info("✅ Redis connected successfully");
    } catch (error) {
      logger.warn(
        "⚠️ Redis connection failed, continuing with in-memory rate limiting:",
        error.message
      );
    }

    // 3. Apply rate limiting middleware after Redis connection attempt
    try {
      logger.info("🛡️ Applying rate limiting middleware...");
      app.use(rateLimiterMiddleware.apiLimiter);
      logger.info("✅ Rate limiting middleware applied");
    } catch (error) {
      logger.warn("⚠️ Rate limiting middleware failed:", error.message);
    }

    // 4. Connect to RabbitMQ and setup exchanges
    try {
      logger.info("🐰 Attempting RabbitMQ connection...");
      await connectRabbitMQ();
      logger.info("✅ RabbitMQ connected and exchanges configured");
    } catch (error) {
      logger.warn(
        "⚠️ RabbitMQ connection failed, continuing without message queue:",
        error.message
      );
    }

    // 5. Setup event consumers
    try {
      logger.info("🔄 Setting up event consumers...");
      await setupEventConsumers();
      logger.info("✅ Event consumers configured");
    } catch (error) {
      logger.warn("⚠️ Event consumers setup failed:", error.message);
    }

    // 6. Start the server
    logger.info("🌐 Starting HTTP server...");
    server = app.listen(PORT, () => {
      isServiceReady = true;
      logger.info(
        `✅ Kaynela Farms Ticketing Service fully operational on port ${PORT}`
      );
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔌 API endpoints: http://localhost:${PORT}/api`);
      logger.info(`🐰 RabbitMQ exchanges configured for loose coupling`);
    });

    // 7. Graceful shutdown handlers
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // 8. Unhandled error handlers
    process.on("uncaughtException", (err) => {
      logger.error("❌ Uncaught Exception:", err);
      gracefulShutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("unhandledRejection");
    });

    logger.info("🎉 Service startup completed successfully!");
    return server;
  } catch (error) {
    logger.error("❌ Failed to start service:", error);
    logger.error("❌ Service startup failed, exiting...");
    process.exit(1);
  }
}

// Start the server
startServer();
