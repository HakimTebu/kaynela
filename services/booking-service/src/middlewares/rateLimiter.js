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
let _bookingCreationLimiter = null;
let _paymentLimiter = null;

// Getter functions that create rate limiters on demand
function getApiLimiter() {
  if (!_apiLimiter) {
    _apiLimiter = createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        success: false,
        error: "Too many requests from this IP, please try again later.",
        retryAfter: "15 minutes",
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn("Rate limit exceeded", {
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          requestId: req.requestId,
        });
        res.status(429).json({
          success: false,
          error: "Too many requests from this IP, please try again later.",
          retryAfter: "15 minutes",
          requestId: req.requestId,
        });
      },
    });
  }
  return _apiLimiter;
}

function getStrictLimiter() {
  if (!_strictLimiter) {
    _strictLimiter = createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // Limit each IP to 10 requests per windowMs
      message: {
        success: false,
        error:
          "Too many sensitive operations from this IP, please try again later.",
        retryAfter: "15 minutes",
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn("Strict rate limit exceeded", {
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          requestId: req.requestId,
        });
        res.status(429).json({
          success: false,
          error:
            "Too many sensitive operations from this IP, please try again later.",
          retryAfter: "15 minutes",
          requestId: req.requestId,
        });
      },
    });
  }
  return _strictLimiter;
}

function getBookingCreationLimiter() {
  if (!_bookingCreationLimiter) {
    _bookingCreationLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // Limit each user to 5 booking creations per hour
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP
        return req.user ? req.user._id.toString() : req.ip;
      },
      message: {
        success: false,
        error: "Too many booking creation attempts, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn("Booking creation rate limit exceeded", {
          userId: req.user?._id,
          ip: req.ip,
          requestId: req.requestId,
        });
        res.status(429).json({
          success: false,
          error: "Too many booking creation attempts, please try again later.",
          retryAfter: "1 hour",
          requestId: req.requestId,
        });
      },
    });
  }
  return _bookingCreationLimiter;
}

function getPaymentLimiter() {
  if (!_paymentLimiter) {
    _paymentLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // Limit each user to 10 payment attempts per hour
      keyGenerator: (req) => {
        return req.user ? req.user._id.toString() : req.ip;
      },
      message: {
        success: false,
        error: "Too many payment attempts, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn("Payment rate limit exceeded", {
          userId: req.user?._id,
          ip: req.ip,
          requestId: req.requestId,
        });
        res.status(429).json({
          success: false,
          error: "Too many payment attempts, please try again later.",
          retryAfter: "1 hour",
          requestId: req.requestId,
        });
      },
    });
  }
  return _paymentLimiter;
}

module.exports = {
  get apiLimiter() {
    return getApiLimiter();
  },
  get strictLimiter() {
    return getStrictLimiter();
  },
  get bookingCreationLimiter() {
    return getBookingCreationLimiter();
  },
  get paymentLimiter() {
    return getPaymentLimiter();
  },
};
