const express = require("express");
const router = express.Router();

// Import controllers
const refundController = require("../controllers/refundController");

// Import middleware
const { authMiddleware, requireRole, requirePaymentAccess } = require("../middlewares/auth");
const { validateRefundCreation } = require("../middlewares/validate");
const { refundLimiter, strictLimiter } = require("../middlewares/rateLimiter");
const { logRefundCreation, logRefundProcessing } = require("../middlewares/audit");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Refund creation and processing
router.post(
  "/",
  validateRefundCreation,
  refundLimiter,
  logRefundCreation,
  refundController.createRefund
);

router.post(
  "/:refundId/process",
  requireRole("admin", "super_admin"),
  strictLimiter,
  logRefundProcessing,
  refundController.processRefund
);

// Refund retrieval
router.get(
  "/:refundId",
  requirePaymentAccess(),
  refundController.getRefund
);

router.get(
  "/",
  requirePaymentAccess(),
  refundController.getUserRefunds
);

// Refund management
router.patch(
  "/:refundId/approve",
  requireRole("admin", "super_admin"),
  strictLimiter,
  refundController.approveRefund
);

router.patch(
  "/:refundId/cancel",
  requirePaymentAccess(),
  strictLimiter,
  refundController.cancelRefund
);

// Refund analytics
router.get(
  "/analytics/overview",
  requirePaymentAccess(),
  refundController.getRefundAnalytics
);

// Health check for refund routes
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Refund routes are healthy",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

module.exports = router;
