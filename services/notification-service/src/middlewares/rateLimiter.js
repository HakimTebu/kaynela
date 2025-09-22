const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const { client: redisClient } = require("../config/redis");
const logger = require("../utils/logger"); // Added missing import for logger

// Factory function to create rate limiters with Redis store
function createRateLimiter(options) {
  // Safety check: ensure Redis is connected
  if (!redisClient.isOpen) {
    // Fallback to in-memory rate limiting if Redis is not available
    logger.warn("Redis not connected, falling back to in-memory rate limiting");
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
}

// Lazy-loaded rate limiters - only created when accessed
let _apiLimiter = null;
let _strictLimiter = null;
let _emailLimiter = null;
let _smsLimiter = null;
let _pushLimiter = null;
let _bulkNotificationLimiter = null;

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

function getEmailLimiter() {
  if (!_emailLimiter) {
    _emailLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: parseInt(process.env.EMAIL_RATE_LIMIT) || 50, // limit each user to 50 emails per hour
      message: {
        success: false,
        error: "Too many email requests, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _emailLimiter;
}

function getSmsLimiter() {
  if (!_smsLimiter) {
    _smsLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: parseInt(process.env.SMS_RATE_LIMIT) || 20, // limit each user to 20 SMS per hour
      message: {
        success: false,
        error: "Too many SMS requests, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _smsLimiter;
}

function getPushLimiter() {
  if (!_pushLimiter) {
    _pushLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: parseInt(process.env.PUSH_RATE_LIMIT) || 100, // limit each user to 100 push notifications per hour
      message: {
        success: false,
        error: "Too many push notification requests, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _pushLimiter;
}

function getBulkNotificationLimiter() {
  if (!_bulkNotificationLimiter) {
    _bulkNotificationLimiter = createRateLimiter({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: parseInt(process.env.BULK_NOTIFICATION_LIMIT) || 5, // limit each user to 5 bulk notifications per day
      message: {
        success: false,
        error:
          "Too many bulk notification requests, please try again tomorrow.",
        retryAfter: "24 hours",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _bulkNotificationLimiter;
}

module.exports = {
  get apiLimiter() {
    return getApiLimiter();
  },
  get strictLimiter() {
    return getStrictLimiter();
  },
  get emailLimiter() {
    return getEmailLimiter();
  },
  get smsLimiter() {
    return getSmsLimiter();
  },
  get pushLimiter() {
    return getPushLimiter();
  },
  get bulkNotificationLimiter() {
    return getBulkNotificationLimiter();
  },
};
