const rateLimit = require("express-rate-limit");

// Temporarily use in-memory store only to avoid Redis connection issues
// TODO: Re-enable Redis store once connection issues are resolved

// General API rate limiter
const apiLimiter = rateLimit({
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

// Strict rate limiter for sensitive operations
const strictLimiter = rateLimit({
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

// Payment processing rate limiter
const paymentProcessingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.PAYMENT_PROCESSING_LIMIT) || 20, // limit each user to 20 payment operations per hour
  message: {
    success: false,
    error: "Too many payment operations, please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip, // Use user ID if authenticated, otherwise IP
  requestId: (req) => req.requestId,
});

// Refund rate limiter
const refundLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: parseInt(process.env.REFUND_LIMIT) || 5, // limit each user to 5 refund requests per day
  message: {
    success: false,
    error: "Too many refund requests, please try again tomorrow.",
    retryAfter: "24 hours",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  requestId: (req) => req.requestId,
});

// Webhook rate limiter
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.WEBHOOK_LIMIT) || 100, // limit each IP to 100 webhook calls per minute
  message: {
    success: false,
    error: "Too many webhook calls, please try again later.",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  requestId: (req) => req.requestId,
});

// Admin operations rate limiter
const adminLimiter = rateLimit({
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

module.exports = {
  apiLimiter,
  strictLimiter,
  paymentProcessingLimiter,
  refundLimiter,
  webhookLimiter,
  adminLimiter,
};
