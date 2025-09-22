const express = require("express");
const router = express.Router();

// Import middleware
const { authMiddleware, requireRole, requireLoyaltyAccess } = require("../middlewares/auth");
const { apiLimiter, pointsEarningLimiter, rewardsRedemptionLimiter, tierUpgradeLimiter } = require("../middlewares/rateLimiter");
const { logPointsEarning, logPointsRedemption, logTierUpgrade } = require("../middlewares/audit");
const {
  validatePointsEarning,
  validatePointsRedemption,
  validateTierUpgrade,
  validatePointsAdjustment,
} = require("../middlewares/validate");

// Import controllers
const {
  addLoyaltyPoints,
  getUserLoyaltySummary,
  getUserLoyaltyHistory,
  redeemReward,
  checkAndUpgradeTier,
  adjustUserPoints,
} = require("../controllers/loyaltyController");

// ============================================================================
// LOYALTY POINTS MANAGEMENT ROUTES
// ============================================================================

// Add loyalty points to user
router.post(
  "/points/earn",
  authMiddleware,
  pointsEarningLimiter,
  logPointsEarning,
  validatePointsEarning,
  addLoyaltyPoints
);

// Get user's loyalty summary
router.get(
  "/summary/:userId",
  authMiddleware,
  requireLoyaltyAccess(),
  getUserLoyaltySummary
);

// Get user's loyalty history
router.get(
  "/history/:userId",
  authMiddleware,
  requireLoyaltyAccess(),
  getUserLoyaltyHistory
);

// ============================================================================
// REWARD REDEMPTION ROUTES
// ============================================================================

// Redeem reward with loyalty points
router.post(
  "/rewards/:rewardId/redeem",
  authMiddleware,
  rewardsRedemptionLimiter,
  logPointsRedemption,
  validatePointsRedemption,
  redeemReward
);

// ============================================================================
// TIER MANAGEMENT ROUTES
// ============================================================================

// Check and upgrade user tier
router.post(
  "/tier/upgrade/:userId",
  authMiddleware,
  tierUpgradeLimiter,
  logTierUpgrade,
  validateTierUpgrade,
  checkAndUpgradeTier
);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// Adjust user points (admin only)
router.post(
  "/admin/points/adjust",
  authMiddleware,
  requireRole("admin", "super_admin"),
  apiLimiter,
  validatePointsAdjustment,
  adjustUserPoints
);

// Get loyalty analytics (admin only)
router.get(
  "/admin/analytics",
  authMiddleware,
  requireRole("admin", "super_admin"),
  apiLimiter,
  (req, res) => {
    res.json({
      success: true,
      message: "Loyalty analytics endpoint - to be implemented",
      requestId: req.requestId,
    });
  }
);

// Get system-wide loyalty statistics (admin only)
router.get(
  "/admin/statistics",
  authMiddleware,
  requireRole("admin", "super_admin"),
  apiLimiter,
  (req, res) => {
    res.json({
      success: true,
      message: "Loyalty statistics endpoint - to be implemented",
      requestId: req.requestId,
    });
  }
);

// ============================================================================
// HEALTH AND STATUS ROUTES
// ============================================================================

// Get loyalty service status
router.get("/status", (req, res) => {
  res.json({
    success: true,
    message: "Kaynela Farms Loyalty Service is operational",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    requestId: req.requestId,
  });
});

// Get loyalty service metrics
router.get("/metrics", authMiddleware, requireRole("admin", "super_admin"), (req, res) => {
  res.json({
    success: true,
    message: "Loyalty service metrics - to be implemented",
    requestId: req.requestId,
  });
});

module.exports = router;
