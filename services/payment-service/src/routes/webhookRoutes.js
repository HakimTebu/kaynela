const express = require("express");
const router = express.Router();

// Import controllers
const webhookController = require("../controllers/webhookController");

// Import middleware
const { optionalAuth } = require("../middlewares/auth");
const { validateWebhook } = require("../middlewares/validate");
const { webhookLimiter } = require("../middlewares/rateLimiter");
const { logWebhookReceived } = require("../middlewares/audit");

// Apply optional authentication middleware (webhooks may not always have auth)
router.use(optionalAuth);

// Stripe webhook
router.post(
  "/stripe",
  webhookLimiter,
  logWebhookReceived,
  webhookController.processStripeWebhook
);

// Razorpay webhook
router.post(
  "/razorpay",
  webhookLimiter,
  logWebhookReceived,
  webhookController.processRazorpayWebhook
);

// M-Pesa webhook
router.post(
  "/mpesa",
  webhookLimiter,
  logWebhookReceived,
  webhookController.processMpesaWebhook
);

// Generic webhook
router.post(
  "/generic",
  validateWebhook,
  webhookLimiter,
  logWebhookReceived,
  webhookController.processGenericWebhook
);

// Webhook health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Webhook routes are healthy",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

module.exports = router;
