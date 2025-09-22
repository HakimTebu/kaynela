const LoyaltyPoints = require("../models/LoyaltyPoints");
const Reward = require("../models/Reward");
const { client: redisClient } = require("../config/redis");
const logger = require("../utils/logger");
const {
  publishPointsEarnedEvent,
  publishPointsRedeemedEvent,
  publishTierUpgradedEvent,
  publishUserLoyaltyUpdatedEvent,
  publishNotificationEvent,
} = require("../services/rabbitmq");
const {
  LOYALTY_TIERS,
  POINTS_MULTIPLIERS,
  BUSINESS_RULES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} = require("../constants");

// ============================================================================
// LOYALTY POINTS MANAGEMENT
// ============================================================================

// Add loyalty points to user
const addLoyaltyPoints = async (req, res) => {
  try {
    const { userId, points, reason, source, metadata } = req.body;

    // Get user's current loyalty information (this would come from auth service)
    const userTier = req.user?.loyaltyTier || "bronze";
    const tierConfig = LOYALTY_TIERS[userTier.toUpperCase()];
    
    if (!tierConfig) {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.INVALID_TIER,
        requestId: req.requestId,
      });
    }

    // Calculate points with tier multiplier
    const basePoints = points;
    const tierMultiplier = tierConfig.multiplier;
    const sourceMultiplier = POINTS_MULTIPLIERS[source] || 1.0;
    const totalMultiplier = tierMultiplier * sourceMultiplier;
    const bonusPoints = Math.round(basePoints * (totalMultiplier - 1));
    const totalPoints = basePoints + bonusPoints;

    // Create loyalty points record
    const loyaltyPoints = new LoyaltyPoints({
      userId,
      points: totalPoints,
      transactionType: "earned",
      source,
      reason,
      metadata,
      tierAtTime: userTier,
      multiplier: totalMultiplier,
      basePoints,
      bonusPoints,
      totalPoints,
      processedBy: req.user._id,
    });

    await loyaltyPoints.save();

    // Cache user's total points
    await cacheUserPoints(userId, totalPoints);

    // Publish event
    await publishPointsEarnedEvent(
      { _id: userId, loyaltyTier: userTier },
      {
        points: totalPoints,
        totalPoints: await getUserTotalPoints(userId),
        reason,
        source,
        tier: userTier,
      }
    );

    // Publish notification
    await publishNotificationEvent(
      { _id: userId },
      "points_earned",
      `You earned ${totalPoints} loyalty points for ${reason}!`
    );

    logger.info("Loyalty points added successfully:", {
      userId,
      points: totalPoints,
      reason,
      source,
      requestId: req.requestId,
    });

    res.status(201).json({
      success: true,
      message: SUCCESS_MESSAGES.POINTS_EARNED,
      data: {
        pointsEarned: totalPoints,
        basePoints,
        bonusPoints,
        tierMultiplier,
        sourceMultiplier,
        totalMultiplier,
        newTotalPoints: await getUserTotalPoints(userId),
      },
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error adding loyalty points:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add loyalty points",
      requestId: req.requestId,
    });
  }
};

// Get user's loyalty points summary
const getUserLoyaltySummary = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check access control
    if (req.user._id.toString() !== userId && !["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        requestId: req.requestId,
      });
    }

    // Try to get from cache first
    const cachedSummary = await getCachedLoyaltySummary(userId);
    if (cachedSummary) {
      return res.json({
        success: true,
        data: cachedSummary,
        requestId: req.requestId,
      });
    }

    // Get from database
    const [totalPointsResult] = await LoyaltyPoints.getTotalActivePoints(userId);
    const pointsByTier = await LoyaltyPoints.getPointsSummaryByTier(userId);
    const expiringPoints = await LoyaltyPoints.getExpiringPoints(userId, 30);

    const summary = {
      userId,
      totalPoints: totalPointsResult?.totalPoints || 0,
      totalBasePoints: totalPointsResult?.totalBasePoints || 0,
      totalBonusPoints: totalPointsResult?.totalBonusPoints || 0,
      pointsByTier: pointsByTier.reduce((acc, tier) => {
        acc[tier._id] = tier.totalPoints;
        return acc;
      }, {}),
      expiringPoints: expiringPoints.length,
      expiringPointsList: expiringPoints.slice(0, 5), // Show first 5
      lastUpdated: new Date().toISOString(),
    };

    // Cache the summary
    await cacheLoyaltySummary(userId, summary);

    res.json({
      success: true,
      data: summary,
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error getting loyalty summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get loyalty summary",
      requestId: req.requestId,
    });
  }
};

// Get user's loyalty points history
const getUserLoyaltyHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, transactionType, source } = req.query;

    // Check access control
    if (req.user._id.toString() !== userId && !["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        requestId: req.requestId,
      });
    }

    const skip = (page - 1) * limit;
    const query = { userId, isActive: true };

    if (transactionType) query.transactionType = transactionType;
    if (source) query.source = source;

    const [points, total] = await Promise.all([
      LoyaltyPoints.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LoyaltyPoints.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        points,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error getting loyalty history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get loyalty history",
      requestId: req.requestId,
    });
  }
};

// ============================================================================
// REWARD REDEMPTION
// ============================================================================

// Redeem reward with loyalty points
const redeemReward = async (req, res) => {
  try {
    const { rewardId } = req.params;
    const { userId, quantity = 1 } = req.body;

    // Check access control
    if (req.user._id.toString() !== userId && !["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        requestId: req.requestId,
      });
    }

    // Get reward details
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({
        success: false,
        error: "Reward not found",
        requestId: req.requestId,
      });
    }

    // Check if reward is available
    if (!reward.isAvailableForUser(req.user.loyaltyTier, req.user.loyaltyPoints)) {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.REWARD_NOT_AVAILABLE,
        requestId: req.requestId,
      });
    }

    // Check if user can redeem
    if (!reward.canRedeem(quantity)) {
      return res.status(400).json({
        success: false,
        error: "Cannot redeem this quantity",
        requestId: req.requestId,
      });
    }

    const totalPointsCost = reward.pointsCost * quantity;

    // Check if user has enough points
    const userTotalPoints = await getUserTotalPoints(userId);
    if (userTotalPoints < totalPointsCost) {
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.INSUFFICIENT_POINTS,
        requestId: req.requestId,
      });
    }

    // Create loyalty points record for redemption
    const redemptionRecord = new LoyaltyPoints({
      userId,
      points: -totalPointsCost,
      transactionType: "redeemed",
      source: "reward_redemption",
      reason: `Redeemed ${quantity}x ${reward.name}`,
      metadata: {
        rewardId: reward._id,
        rewardName: reward.name,
        quantity,
        pointsCost: reward.pointsCost,
        totalPointsCost,
      },
      tierAtTime: req.user.loyaltyTier,
      multiplier: 1.0,
      basePoints: -totalPointsCost,
      bonusPoints: 0,
      totalPoints: -totalPointsCost,
      processedBy: req.user._id,
    });

    await redemptionRecord.save();

    // Update reward redemption count
    await reward.incrementRedemptions(quantity);

    // Update cache
    await cacheUserPoints(userId, userTotalPoints - totalPointsCost);

    // Publish events
    await publishPointsRedeemedEvent(
      { _id: userId, loyaltyTier: req.user.loyaltyTier },
      {
        points: totalPointsCost,
        remainingPoints: userTotalPoints - totalPointsCost,
      },
      reward
    );

    await publishNotificationEvent(
      { _id: userId },
      "points_redeemed",
      `You redeemed ${quantity}x ${reward.name} for ${totalPointsCost} points!`
    );

    logger.info("Reward redeemed successfully:", {
      userId,
      rewardId,
      quantity,
      pointsCost: totalPointsCost,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.POINTS_REDEEMED,
      data: {
        reward: {
          id: reward._id,
          name: reward.name,
          category: reward.category,
        },
        quantity,
        pointsCost: totalPointsCost,
        remainingPoints: userTotalPoints - totalPointsCost,
        redemptionId: redemptionRecord._id,
      },
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error redeeming reward:", error);
    res.status(500).json({
      success: false,
      error: "Failed to redeem reward",
      requestId: req.requestId,
    });
  }
};

// ============================================================================
// TIER MANAGEMENT
// ============================================================================

// Check and upgrade user tier
const checkAndUpgradeTier = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check access control
    if (req.user._id.toString() !== userId && !["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        requestId: req.requestId,
      });
    }

    const totalPoints = await getUserTotalPoints(userId);
    const currentTier = req.user.loyaltyTier;
    const newTier = calculateLoyaltyTier(totalPoints);

    if (newTier === currentTier) {
      return res.json({
        success: true,
        message: "User already at appropriate tier",
        data: {
          currentTier,
          totalPoints,
          nextTier: getNextTier(currentTier),
          pointsToNextTier: getPointsToNextTier(currentTier, totalPoints),
        },
        requestId: req.requestId,
      });
    }

    // Publish tier upgrade event
    await publishTierUpgradedEvent(
      { _id: userId, loyaltyTier: newTier, loyaltyPoints: totalPoints },
      currentTier,
      newTier
    );

    // Publish user loyalty updated event
    await publishUserLoyaltyUpdatedEvent(
      { _id: userId, loyaltyTier: newTier, loyaltyPoints: totalPoints },
      "tier_upgraded"
    );

    // Publish notification
    await publishNotificationEvent(
      { _id: userId },
      "tier_upgraded",
      `Congratulations! You've been upgraded to ${newTier} tier!`
    );

    logger.info("Tier upgrade processed:", {
      userId,
      oldTier: currentTier,
      newTier,
      totalPoints,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.TIER_UPGRADED,
      data: {
        oldTier: currentTier,
        newTier,
        totalPoints,
        tierBenefits: LOYALTY_TIERS[newTier.toUpperCase()]?.benefits || [],
      },
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error checking/upgrading tier:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process tier upgrade",
      requestId: req.requestId,
    });
  }
};

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

// Adjust user points (admin only)
const adjustUserPoints = async (req, res) => {
  try {
    const { userId, points, reason, adjustmentType } = req.body;

    // Check admin access
    if (!["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Admin access required",
        requestId: req.requestId,
      });
    }

    const userTotalPoints = await getUserTotalPoints(userId);
    const newTotalPoints = userTotalPoints + points;

    if (newTotalPoints < 0) {
      return res.status(400).json({
        success: false,
        error: "Adjustment would result in negative points",
        requestId: req.requestId,
      });
    }

    // Create adjustment record
    const adjustmentRecord = new LoyaltyPoints({
      userId,
      points,
      transactionType: "adjusted",
      source: adjustmentType,
      reason,
      metadata: {
        adjustmentType,
        previousTotal: userTotalPoints,
        newTotal: newTotalPoints,
        adjustedBy: req.user._id,
      },
      tierAtTime: "bronze", // Will be updated based on actual user tier
      multiplier: 1.0,
      basePoints: points,
      bonusPoints: 0,
      totalPoints: points,
      processedBy: req.user._id,
    });

    await adjustmentRecord.save();

    // Update cache
    await cacheUserPoints(userId, newTotalPoints);

    // Publish events
    await publishPointsEarnedEvent(
      { _id: userId },
      {
        points: Math.abs(points),
        totalPoints: newTotalPoints,
        reason,
        source: adjustmentType,
        tier: "bronze", // Will be updated based on actual user tier
      }
    );

    logger.info("Points adjusted successfully:", {
      userId,
      points,
      reason,
      adjustmentType,
      adjustedBy: req.user._id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.POINTS_ADJUSTED,
      data: {
        userId,
        points,
        previousTotal: userTotalPoints,
        newTotal: newTotalPoints,
        adjustmentType,
        reason,
        adjustmentId: adjustmentRecord._id,
      },
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error adjusting points:", error);
    res.status(500).json({
      success: false,
      error: "Failed to adjust points",
      requestId: req.requestId,
    });
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Calculate loyalty tier based on points
function calculateLoyaltyTier(points) {
  if (points >= 100000) return "diamond";
  if (points >= 20000) return "platinum";
  if (points >= 5000) return "gold";
  if (points >= 1000) return "silver";
  return "bronze";
}

// Get next tier
function getNextTier(currentTier) {
  const tiers = ["bronze", "silver", "gold", "platinum", "diamond"];
  const currentIndex = tiers.indexOf(currentTier);
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
}

// Get points needed for next tier
function getPointsToNextTier(currentTier, currentPoints) {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 0;
  
  const nextTierConfig = LOYALTY_TIERS[nextTier.toUpperCase()];
  return Math.max(0, nextTierConfig.minPoints - currentPoints);
}

// Get user's total points
async function getUserTotalPoints(userId) {
  try {
    const cachedPoints = await getCachedUserPoints(userId);
    if (cachedPoints !== null) {
      return cachedPoints;
    }

    const [result] = await LoyaltyPoints.getTotalActivePoints(userId);
    const totalPoints = result?.totalPoints || 0;
    
    await cacheUserPoints(userId, totalPoints);
    return totalPoints;
  } catch (error) {
    logger.error("Error getting user total points:", error);
    return 0;
  }
}

// Cache user points
async function cacheUserPoints(userId, points) {
  try {
    await redisClient.setEx(
      `user:${userId}:points`,
      60, // 1 minute TTL
      points.toString()
    );
  } catch (error) {
    logger.error("Error caching user points:", error);
  }
}

// Get cached user points
async function getCachedUserPoints(userId) {
  try {
    const cached = await redisClient.get(`user:${userId}:points`);
    return cached ? parseInt(cached) : null;
  } catch (error) {
    logger.error("Error getting cached user points:", error);
    return null;
  }
}

// Cache loyalty summary
async function cacheLoyaltySummary(userId, summary) {
  try {
    await redisClient.setEx(
      `user:${userId}:loyalty_summary`,
      300, // 5 minutes TTL
      JSON.stringify(summary)
    );
  } catch (error) {
    logger.error("Error caching loyalty summary:", error);
  }
}

// Get cached loyalty summary
async function getCachedLoyaltySummary(userId) {
  try {
    const cached = await redisClient.get(`user:${userId}:loyalty_summary`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error("Error getting cached loyalty summary:", error);
    return null;
  }
}

module.exports = {
  addLoyaltyPoints,
  getUserLoyaltySummary,
  getUserLoyaltyHistory,
  redeemReward,
  checkAndUpgradeTier,
  adjustUserPoints,
};
