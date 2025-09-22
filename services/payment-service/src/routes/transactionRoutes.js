const express = require("express");
const router = express.Router();

// Import controllers
const transactionController = require("../controllers/transactionController");

// Import middleware
const { authMiddleware, requirePaymentAccess } = require("../middlewares/auth");
const { validateTransactionQuery } = require("../middlewares/validate");
const { apiLimiter } = require("../middlewares/rateLimiter");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Transaction retrieval
router.get(
  "/:transactionId",
  requirePaymentAccess(),
  transactionController.getTransaction
);

router.get(
  "/",
  validateTransactionQuery,
  requirePaymentAccess(),
  transactionController.getUserTransactions
);

// Transaction analytics
router.get(
  "/stats/overview",
  requirePaymentAccess(),
  transactionController.getTransactionStats
);

// Transaction search
router.get(
  "/search",
  requirePaymentAccess(),
  transactionController.searchTransactions
);

// Transaction export
router.get(
  "/export",
  requirePaymentAccess(),
  transactionController.exportTransactions
);

// Transaction timeline
router.get(
  "/:transactionId/timeline",
  requirePaymentAccess(),
  transactionController.getTransactionTimeline
);

// Health check for transaction routes
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Transaction routes are healthy",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

module.exports = router;
