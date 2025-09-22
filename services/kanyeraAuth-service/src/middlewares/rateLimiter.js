// services/auth-service/src/middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");
const { client: redisClient } = require("../config/redis");

// Proper Store class implementation
class RedisRateLimitStore {
  constructor() {
    this.increment = async (key) => {
      const current = await redisClient.incr(key);
      if (current === 1) {
        await redisClient.expire(key, 3600); // 1 hour expiration
      }
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + 3600 * 1000),
      };
    };

    this.decrement = async (key) => {
      await redisClient.decr(key);
    };

    this.resetKey = async (key) => {
      await redisClient.del(key);
    };
  }
}

// Initialize store
const store = new RedisRateLimitStore();

// General API rate limiter (Starbucks-like)
exports.apiLimiter = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    error: "Too many requests. Please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests. Please try again later.",
      retryAfter: "15 minutes",
      status: 429,
    });
  },
});

// Starbucks-like authentication rate limiter
exports.authLimiter = rateLimit({
  store: store,
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 15, // 15 attempts per hour (more generous than 5)
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => {
    // Use email + IP for better tracking
    const email = req.body.email || req.body.username || "unknown";
    const ip = req.ip || req.connection.remoteAddress;
    return `auth:${email}:${ip}`;
  },
  message: {
    error: "Too many login attempts. Please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many login attempts. Please try again in 1 hour.",
      retryAfter: "1 hour",
      status: 429,
      message:
        "For security reasons, your account has been temporarily locked due to multiple failed login attempts.",
    });
  },
});

// Progressive rate limiter for repeated failures
exports.progressiveAuthLimiter = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = req.body.email || req.body.username || "unknown";
    return `progressive:${email}`;
  },
  message: {
    error: "Too many failed attempts. Please wait before trying again.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error:
        "Too many failed attempts. Please wait 15 minutes before trying again.",
      retryAfter: "15 minutes",
      status: 429,
      message:
        "For your security, please wait before attempting to log in again.",
    });
  },
});

// Password reset rate limiter
exports.passwordResetLimiter = rateLimit({
  store: store,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  keyGenerator: (req) => {
    const email = req.body.email || "unknown";
    return `password-reset:${email}`;
  },
  message: {
    error: "Too many password reset requests. Please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many password reset requests. Please try again in 1 hour.",
      retryAfter: "1 hour",
      status: 429,
      message:
        "For security reasons, please wait before requesting another password reset.",
    });
  },
});

// OTP verification rate limiter
exports.otpLimiter = rateLimit({
  store: store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP attempts per 15 minutes
  keyGenerator: (req) => {
    const email = req.body.email || "unknown";
    return `otp:${email}`;
  },
  message: {
    error: "Too many OTP attempts. Please request a new code.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many OTP attempts. Please request a new verification code.",
      retryAfter: "15 minutes",
      status: 429,
      message: "For security reasons, please request a new verification code.",
    });
  },
});
