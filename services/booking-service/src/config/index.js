require("dotenv").config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3002,
    nodeEnv: process.env.NODE_ENV || "development",
    corsOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
  },

  // Database configuration
  database: {
    mongoUri:
      process.env.MONGODB_URI || "mongodb://localhost:27017/kainella_bookings",
    mongoOptions: {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
      serverSelectionTimeoutMS:
        parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 5000,
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
    },
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    options: {
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
      lazyConnect: process.env.REDIS_LAZY_CONNECT === "true",
    },
  },

  // RabbitMQ configuration
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost:5672",
    heartbeat: parseInt(process.env.RABBITMQ_HEARTBEAT) || 60,
    prefetch: parseInt(process.env.RABBITMQ_PREFETCH) || 1,
  },

  // JWT configuration
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
    bookingCreationLimit: parseInt(process.env.BOOKING_CREATION_LIMIT) || 5, // 5 bookings per hour
    paymentLimit: parseInt(process.env.PAYMENT_LIMIT) || 10, // 10 payment attempts per hour
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    maxFiles: process.env.LOG_MAX_FILES || "14d",
    maxSize: process.env.LOG_MAX_SIZE || "20m",
  },

  // Cache configuration
  cache: {
    ttl: {
      bookingDetails: parseInt(process.env.CACHE_BOOKING_DETAILS_TTL) || 300, // 5 minutes
      userBookings: parseInt(process.env.CACHE_USER_BOOKINGS_TTL) || 600, // 10 minutes
      availability: parseInt(process.env.CACHE_AVAILABILITY_TTL) || 60, // 1 minute
      statistics: parseInt(process.env.CACHE_STATISTICS_TTL) || 3600, // 1 hour
    },
  },

  // Business logic configuration
  business: {
    defaultCurrency: process.env.DEFAULT_CURRENCY || "KES",
    supportedCurrencies: process.env.SUPPORTED_CURRENCIES?.split(",") || [
      "KES",
      "USD",
      "EUR",
      "GBP",
    ],
    cancellationPolicies: {
      flexible: {
        refundPercentage:
          parseFloat(process.env.FLEXIBLE_REFUND_PERCENTAGE) || 0.9,
        deadlineHours: parseInt(process.env.FLEXIBLE_DEADLINE_HOURS) || 24,
      },
      moderate: {
        refundPercentage:
          parseFloat(process.env.MODERATE_REFUND_PERCENTAGE) || 0.5,
        deadlineHours: parseInt(process.env.MODERATE_DEADLINE_HOURS) || 72,
      },
      strict: {
        refundPercentage:
          parseFloat(process.env.STRICT_REFUND_PERCENTAGE) || 0.25,
        deadlineHours: parseInt(process.env.STRICT_DEADLINE_HOURS) || 168, // 7 days
      },
    },
  },

  // External services configuration
  external: {
    paymentService: {
      url: process.env.PAYMENT_SERVICE_URL || "http://payment-service:3003",
      timeout: parseInt(process.env.PAYMENT_SERVICE_TIMEOUT) || 10000,
    },
    loyaltyService: {
      url: process.env.LOYALTY_SERVICE_URL || "http://loyalty-service:3004",
      timeout: parseInt(process.env.LOYALTY_SERVICE_TIMEOUT) || 10000,
    },
    notificationService: {
      url:
        process.env.NOTIFICATION_SERVICE_URL ||
        "http://notification-service:3005",
      timeout: parseInt(process.env.NOTIFICATION_SERVICE_TIMEOUT) || 10000,
    },
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionTimeout:
      parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
  },
};
