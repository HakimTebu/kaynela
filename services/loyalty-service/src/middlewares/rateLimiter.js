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
let _pointsEarningLimiter = null;
let _rewardsRedemptionLimiter = null;
let _tierUpgradeLimiter = null;

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

function getPointsEarningLimiter() {
  if (!_pointsEarningLimiter) {
    _pointsEarningLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: parseInt(process.env.POINTS_EARNING_LIMIT) || 20, // limit each user to 20 points earning operations per hour
      message: {
        success: false,
        error: "Too many points earning operations, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip, // Use user ID if authenticated, otherwise IP
      requestId: (req) => req.requestId,
    });
  }
  return _pointsEarningLimiter;
}

function getRewardsRedemptionLimiter() {
  if (!_rewardsRedemptionLimiter) {
    _rewardsRedemptionLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: parseInt(process.env.REWARDS_REDEMPTION_LIMIT) || 5, // limit each user to 5 reward redemptions per hour
      message: {
        success: false,
        error: "Too many reward redemptions, please try again later.",
        retryAfter: "1 hour",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _rewardsRedemptionLimiter;
}

function getTierUpgradeLimiter() {
  if (!_tierUpgradeLimiter) {
    _tierUpgradeLimiter = createRateLimiter({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: parseInt(process.env.TIER_UPGRADE_LIMIT) || 3, // limit each user to 3 tier upgrade attempts per day
      message: {
        success: false,
        error: "Too many tier upgrade attempts, please try again tomorrow.",
        retryAfter: "24 hours",
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.id || req.ip,
      requestId: (req) => req.requestId,
    });
  }
  return _tierUpgradeLimiter;
}

module.exports = {
  get apiLimiter() {
    return getApiLimiter();
  },
  get strictLimiter() {
    return getStrictLimiter();
  },
  get pointsEarningLimiter() {
    return getPointsEarningLimiter();
  },
  get rewardsRedemptionLimiter() {
    return getRewardsRedemptionLimiter();
  },
  get tierUpgradeLimiter() {
    return getTierUpgradeLimiter();
  },
};
