const mongoose = require("mongoose");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const { client: redisClient } = require("./config/redis");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const connectWithRetry = require("./db");
require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const accountRecoveryRoutes = require("./routes/accountRecoveryRoutes");
const {
  connectRabbitMQ,
  closeConnections,
  publishUserRegisteredEvent,
  publishProfileUpdatedEvent,
  publishLoyaltyTierChangedEvent,
  publishUserAnalyticsUpdatedEvent,
  publishFarmVisitRatedEvent,
  publishFarmActivityAnalyticsEvent,
  setupEventConsumers,
} = require("./services/rabbitmq");
const PointsEventConsumer = require("./services/pointsEventConsumer");
const logger = require("./utils/logger");
const { errorHandler } = require("./utils/errors");
const requestIdMiddleware = require("./middlewares/requestId");
const { apiLimiter } = require("./middlewares/rateLimiter");
const { logAction } = require("./middlewares/audit");

const app = express();

// Trust proxy for X-Forwarded-For headers - trust only Docker network
app.set("trust proxy", "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1");

// 1. Request ID middleware (for tracing)
app.use(requestIdMiddleware);

// 2. Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  })
);

// 3. Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// 4. Session
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 86400000,
    },
  })
);

// 5. Passport
app.use(passport.initialize());
app.use(passport.session());

// 6. Rate limiting
app.use(apiLimiter);

// 7. Audit logging - removed global usage, will be used on specific routes

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "kainella-auth-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.requestId,
  });
});

// Create a router for profile-related endpoints
const profileRouter = express.Router();

// Profile update endpoint
profileRouter.post("/update-profile", async (req, res) => {
  try {
    const user = req.user;
    const updatedUser = await mongoose
      .model("User")
      .findByIdAndUpdate(user._id, req.body, { new: true });

    // Publish profile update event using new exchange-based function
    await publishProfileUpdatedEvent(user, req.body);

    // Publish loyalty tier update if tier changed
    if (req.body.loyaltyTier && req.body.loyaltyTier !== user.loyaltyTier) {
      await publishLoyaltyTierChangedEvent(
        user,
        user.loyaltyTier,
        req.body.loyaltyTier
      );
    }

    // Publish agritourism preferences update if changed
    if (req.body.agritourismPreferences) {
      await publishUserAnalyticsUpdatedEvent(
        user,
        req.body.agritourismPreferences
      );
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    logger.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
    });
  }
});

// Farm visit rating endpoint
profileRouter.post("/rate-farm-visit", async (req, res) => {
  try {
    const user = req.user;
    const { visitDate, activityType, rating, feedback, photos } = req.body;

    const updatedUser = await mongoose.model("User").findByIdAndUpdate(
      user._id,
      {
        $push: {
          farmVisits: {
            visitDate,
            activityType,
            rating,
            feedback,
            photos: photos || [],
          },
        },
      },
      { new: true }
    );

    // Publish farm visit rating event using new exchange-based function
    await publishFarmVisitRatedEvent(user, {
      visitDate,
      activityType,
      rating,
      feedback,
      photos,
    });

    // Publish analytics event using new exchange-based function
    await publishFarmActivityAnalyticsEvent(user, activityType, rating);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    logger.error("Farm visit rating error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to rate farm visit",
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", accountRecoveryRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/profile", profileRouter);

// 8. Error handling middleware (last)
app.use(errorHandler(logger));

let isServiceReady = false;

// setupEventConsumers function is imported from rabbitmq service

async function startServer() {
  try {
    logger.info("🚀 Initializing Kaynela Farms Auth Service...");

    // 1. Connect to MongoDB
    logger.info("📦 Connecting to MongoDB...");
    await connectWithRetry();

    mongoose.connection.on("disconnected", () => {
      isServiceReady = false;
      logger.warn("❌ MongoDB disconnected - retrying in 5s");
      setTimeout(() => connectWithRetry(), 5000);
    });

    // 2. Connect to Redis
    logger.info("⚡ Connecting to Redis...");

    // Only connect if not already connected
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    redisClient.on("error", (err) => {
      isServiceReady = false;
      logger.error("❌ Redis connection error:", err);
    });

    redisClient.on("close", () => {
      isServiceReady = false;
      logger.warn("❌ Redis connection closed.");
    });

    redisClient.on("ready", () => {
      logger.info("✅ Redis client ready.");
    });

    // 3. Connect to RabbitMQ
    logger.info("🐰 Connecting to RabbitMQ...");
    await connectRabbitMQ();

    // 4. Setup RabbitMQ event consumers
    logger.info("📡 Setting up RabbitMQ event consumers...");
    await setupEventConsumers();

    // 5. Legacy points event consumers removed - using new exchange-based system

    // 4. Start server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      isServiceReady = true;
      logger.info(
        `✅ Kaynela Farms Auth Service fully operational on port ${PORT}`
      );
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error("❌ Startup failed:", error);
    setTimeout(() => startServer(), 5000);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("🛑 SIGTERM received, shutting down gracefully");
  try {
    await closeConnections();
    await mongoose.connection.close();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    logger.info("✅ Graceful shutdown complete");
  } catch (error) {
    logger.error("❌ Error during graceful shutdown:", error);
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("🛑 SIGINT received, shutting down gracefully");
  try {
    await closeConnections();
    await mongoose.connection.close();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    logger.info("✅ Graceful shutdown complete");
  } catch (error) {
    logger.error("❌ Error during graceful shutdown:", error);
  }
  process.exit(0);
});

// ✅ Start the server
startServer();
