const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const logger = require("../utils/logger");

// Safely import Redis client - it might not be available when this module loads
let redisClient = null;
try {
  const redisModule = require("../config/redis");
  redisClient = redisModule.client;
} catch (error) {
  logger.warn("Redis module not available during import:", error.message);
}

// Factory function to create rate limiters with Redis store
function createRateLimiter(options) {
  try {
    // Safety check: ensure Redis is connected
    if (!redisClient || !redisClient.isOpen) {
      // Fallback to in-memory rate limiting if Redis is not available
      logger.warn(
        "Redis not connected, falling back to in-memory rate limiting"
      );
      return rateLimit({
        ...options,
        // No store specified = in-memory
      });
    }

    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
      }),
      ...options,
    });
  } catch (error) {
    // If anything goes wrong, fall back to in-memory rate limiting
    logger.warn(
      "Error creating Redis rate limiter, falling back to in-memory:",
      error.message
    );
    return rateLimit({
      ...options,
      // No store specified = in-memory
    });
  }
}

// Lazy-loaded rate limiters - only created when accessed
let _apiLimiter = null;
let _strictLimiter = null;
let _ticketGenerationLimiter = null;
let _qrCodeGenerationLimiter = null;
let _eventCreationLimiter = null;
let _ticketValidationLimiter = null;
let _adminLimiter = null;

// Getter functions that create rate limiters on demand
function getApiLimiter() {
  if (!_apiLimiter) {
    _apiLimiter = createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        error: "Too many requests from this IP, please try again later.",
        retryAfter: "15 minutes",
      },
      standardHeaders: true,
      legacyHeaders: false,
      requestId: (req) => req.requestId,
    });
  }
  return _apiLimiter;
}

function getStrictLimiter() {
  if (!_strictLimiter) {
    _strictLimiter = createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.STRICT_RATE_LIMIT_MAX) || 10, // limit each IP to 10 requests per windowMs
      message: {
        success: false,
        error:
          "Too many sensitive operations from this IP, please try again later.",
        retryAfter: "15 minutes",
      },
      standardHeaders: true,
      legacyHeaders: false,
      requestId: (req) => req.requestId,
    });
  }
  return _strictLimiter;
}

function getTicketGenerationLimiter() {
  if (!_ticketGenerationLimiter) {
    _ticketGenerationLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: parseInt(process.env.TICKET_GENERATION_LIMIT) || 50, // limit each user to 50 ticket generations per hour
      message: {
        success: false,
        error: "Too many ticket generations, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip, // Use user ID if authenticated, otherwise IP
      requestId: (req) => req.requestId,
    });
  }
  return _ticketGenerationLimiter;
}

function getQrCodeGenerationLimiter() {
  if (!_qrCodeGenerationLimiter) {
    _qrCodeGenerationLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: parseInt(process.env.QRCODE_GENERATION_LIMIT) || 100, // limit each user to 100 QR code generations per hour
      message: {
        success: false,
        error: "Too many QR code generations, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _qrCodeGenerationLimiter;
}

function getEventCreationLimiter() {
  if (!_eventCreationLimiter) {
    _eventCreationLimiter = createRateLimiter({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: parseInt(process.env.EVENT_CREATION_LIMIT) || 10, // limit each user to 10 event creations per day
      message: {
        success: false,
        error: "Too many event creations, please try again tomorrow.",
        retryAfter: "24 hours",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _eventCreationLimiter;
}

function getTicketValidationLimiter() {
  if (!_ticketValidationLimiter) {
    _ticketValidationLimiter = createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: parseInt(process.env.TICKET_VALIDATION_LIMIT) || 200, // limit each user to 200 ticket validations per minute
      message: {
        success: false,
        error: "Too many ticket validations, please try again later.",
        retryAfter: "1 minute",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _ticketValidationLimiter;
}

function getAdminLimiter() {
  if (!_adminLimiter) {
    _adminLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: parseInt(process.env.ADMIN_OPERATIONS_LIMIT) || 50, // limit each admin to 50 operations per hour
      message: {
        success: false,
        error: "Too many admin operations, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _adminLimiter;
}

module.exports = {
  get apiLimiter() {
    return getApiLimiter();
  },
  get strictLimiter() {
    return getStrictLimiter();
  },
  get ticketGenerationLimiter() {
    return getTicketGenerationLimiter();
  },
  get qrCodeGenerationLimiter() {
    return getQrCodeGenerationLimiter();
  },
  get eventCreationLimiter() {
    return getEventCreationLimiter();
  },
  get ticketValidationLimiter() {
    return getTicketValidationLimiter();
  },
  get adminLimiter() {
    return getAdminLimiter();
  },
};
