const express = require("express");
const router = express.Router();

// Import controllers
const analyticsController = require("../controllers/analyticsController");

// Import middleware
const { authMiddleware, requirePaymentAccess } = require("../middlewares/auth");
const { apiLimiter } = require("../middlewares/rateLimiter");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Analytics overview
router.get(
  "/overview",
  requirePaymentAccess(),
  analyticsController.getPaymentAnalyticsOverview
);

// Payment trends
router.get(
  "/trends",
  requirePaymentAccess(),
  analyticsController.getPaymentTrends
);

// Payment method analytics
router.get(
  "/methods",
  requirePaymentAccess(),
  analyticsController.getPaymentMethodAnalytics
);

// Refund analytics
router.get(
  "/refunds",
  requirePaymentAccess(),
  analyticsController.getRefundAnalytics
);

// Revenue analytics
router.get(
  "/revenue",
  requirePaymentAccess(),
  analyticsController.getRevenueAnalytics
);

// Performance metrics
router.get(
  "/performance",
  requirePaymentAccess(),
  analyticsController.getPerformanceMetrics
);

// Export analytics data
router.get(
  "/export",
  requirePaymentAccess(),
  analyticsController.exportAnalyticsData
);

// Health check for analytics routes
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Analytics routes are healthy",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

module.exports = router;
