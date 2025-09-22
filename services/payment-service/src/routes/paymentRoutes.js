const express = require("express");
const router = express.Router();

// Import controllers
const paymentController = require("../controllers/paymentController");

// Import middleware
const { authMiddleware, requireRole, requirePaymentAccess } = require("../middlewares/auth");
const { validatePaymentCreation, validatePaymentCapture, validatePaymentCancellation } = require("../middlewares/validate");
const { paymentProcessingLimiter, strictLimiter } = require("../middlewares/rateLimiter");
const { logPaymentCreation, logPaymentProcessing, logPaymentCompletion, logPaymentFailure, logPaymentCancellation } = require("../middlewares/audit");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Payment creation and processing
router.post(
  "/",
  validatePaymentCreation,
  paymentProcessingLimiter,
  logPaymentCreation,
  paymentController.createPayment
);

router.post(
  "/:paymentId/process",
  requirePaymentAccess(),
  paymentProcessingLimiter,
  logPaymentProcessing,
  paymentController.processPayment
);

// Payment retrieval
router.get(
  "/:paymentId",
  requirePaymentAccess(),
  paymentController.getPayment
);

router.get(
  "/",
  requirePaymentAccess(),
  paymentController.getUserPayments
);

// Payment management
router.patch(
  "/:paymentId/capture",
  requireRole("admin", "super_admin"),
  validatePaymentCapture,
  strictLimiter,
  logPaymentCompletion,
  paymentController.processPayment
);

router.patch(
  "/:paymentId/cancel",
  requirePaymentAccess(),
  validatePaymentCancellation,
  strictLimiter,
  logPaymentCancellation,
  paymentController.cancelPayment
);

router.post(
  "/:paymentId/retry",
  requirePaymentAccess(),
  paymentProcessingLimiter,
  logPaymentCreation,
  paymentController.retryPayment
);

// Payment analytics
router.get(
  "/analytics/overview",
  requirePaymentAccess(),
  paymentController.getPaymentAnalytics
);

// Health check for payment service
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Payment routes are healthy",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

module.exports = router;
