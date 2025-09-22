const express = require("express");
const router = express.Router();

// Import controllers
const paymentMethodController = require("../controllers/paymentMethodController");

// Import middleware
const { authMiddleware, requirePaymentAccess } = require("../middlewares/auth");
const { validatePaymentMethod, validatePaymentMethodUpdate, validatePaymentMethodDeletion } = require("../middlewares/validate");
const { apiLimiter, strictLimiter } = require("../middlewares/rateLimiter");
const { logPaymentMethodCreation, logPaymentMethodUpdate, logPaymentMethodDeletion } = require("../middlewares/audit");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Payment method creation
router.post(
  "/",
  validatePaymentMethod,
  apiLimiter,
  logPaymentMethodCreation,
  paymentMethodController.createPaymentMethod
);

// Payment method retrieval
router.get(
  "/:paymentMethodId",
  requirePaymentAccess(),
  paymentMethodController.getPaymentMethod
);

router.get(
  "/",
  requirePaymentAccess(),
  paymentMethodController.getUserPaymentMethods
);

// Payment method management
router.put(
  "/:paymentMethodId",
  requirePaymentAccess(),
  validatePaymentMethodUpdate,
  strictLimiter,
  logPaymentMethodUpdate,
  paymentMethodController.updatePaymentMethod
);

router.patch(
  "/:paymentMethodId/default",
  requirePaymentAccess(),
  strictLimiter,
  logPaymentMethodUpdate,
  paymentMethodController.setDefaultPaymentMethod
);

router.patch(
  "/:paymentMethodId/verify",
  requirePaymentAccess(),
  strictLimiter,
  logPaymentMethodUpdate,
  paymentMethodController.verifyPaymentMethod
);

router.delete(
  "/:paymentMethodId",
  requirePaymentAccess(),
  validatePaymentMethodDeletion,
  strictLimiter,
  logPaymentMethodDeletion,
  paymentMethodController.deletePaymentMethod
);

// Payment method analytics
router.get(
  "/analytics/summary",
  requirePaymentAccess(),
  paymentMethodController.getPaymentMethodSummary
);

// Health check for payment method routes
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Payment method routes are healthy",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

module.exports = router;
