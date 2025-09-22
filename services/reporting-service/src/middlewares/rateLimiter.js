const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const { client: redisClient } = require("../config/redis");
const logger = require("../utils/logger");

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
let _reportGenerationLimiter = null;
let _dataExportLimiter = null;
let _analyticsQueryLimiter = null;
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

// Strict rate limiter for sensitive operations
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

// Report generation rate limiter
function getReportGenerationLimiter() {
  if (!_reportGenerationLimiter) {
    _reportGenerationLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: parseInt(process.env.REPORT_GENERATION_LIMIT) || 20, // limit each user to 20 report generations per hour
      message: {
        success: false,
        error: "Too many report generations, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip, // Use user ID if authenticated, otherwise IP
      requestId: (req) => req.requestId,
    });
  }
  return _reportGenerationLimiter;
}

// Data export rate limiter
function getDataExportLimiter() {
  if (!_dataExportLimiter) {
    _dataExportLimiter = createRateLimiter({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: parseInt(process.env.DATA_EXPORT_LIMIT) || 10, // limit each user to 10 data exports per day
      message: {
        success: false,
        error: "Too many data exports, please try again tomorrow.",
        retryAfter: "24 hours",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _dataExportLimiter;
}

// Analytics query rate limiter
function getAnalyticsQueryLimiter() {
  if (!_analyticsQueryLimiter) {
    _analyticsQueryLimiter = createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: parseInt(process.env.ANALYTICS_QUERY_LIMIT) || 50, // limit each user to 50 analytics queries per minute
      message: {
        success: false,
        error: "Too many analytics queries, please try again later.",
        retryAfter: "1 minute",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _analyticsQueryLimiter;
}

// Admin operations rate limiter
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
  get reportGenerationLimiter() {
    return getReportGenerationLimiter();
  },
  get dataExportLimiter() {
    return getDataExportLimiter();
  },
  get analyticsQueryLimiter() {
    return getAnalyticsQueryLimiter();
  },
  get adminLimiter() {
    return getAdminLimiter();
  },
};
