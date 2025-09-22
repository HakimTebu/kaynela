const logger = require("../utils/logger");

// Audit logging middleware
const logAction = (action, resourceType, resourceId = null) => {
  return (req, res, next) => {
    // Store original send method
    const originalSend = res.send;
    const originalJson = res.json;

    // Override send method to capture response
    res.send = function (data) {
      // Log the action after response is sent
      setTimeout(() => {
        const auditData = {
          action,
          resourceType,
          resourceId: resourceId || req.params.id || req.body.id,
          userId: req.user?._id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
          statusCode: res.statusCode,
          responseSize: data ? data.length : 0,
          success: res.statusCode < 400,
        };

        logger.info("Audit Log:", auditData);
      }, 0);

      // Call original send method
      return originalSend.call(this, data);
    };

    // Override json method to capture response
    res.json = function (data) {
      // Log the action after response is sent
      setTimeout(() => {
        const auditData = {
          action,
          resourceType,
          resourceId: resourceId || req.params.id || req.body.id,
          userId: req.user?._id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
          statusCode: res.statusCode,
          responseSize: data ? JSON.stringify(data).length : 0,
          success: res.statusCode < 400,
        };

        logger.info("Audit Log:", auditData);
      }, 0);

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Specific audit loggers for loyalty operations
const logPointsEarning = logAction("POINTS_EARNED", "loyalty_points");
const logPointsRedemption = logAction("POINTS_REDEEMED", "loyalty_points");
const logTierUpgrade = logAction("TIER_UPGRADED", "loyalty_tier");
const logRewardCreation = logAction("REWARD_CREATED", "reward");
const logRewardRedemption = logAction("REWARD_REDEEMED", "reward");
const logPointsTransfer = logAction("POINTS_TRANSFERRED", "loyalty_points");
const logPointsAdjustment = logAction("POINTS_ADJUSTED", "loyalty_points");

module.exports = {
  logAction,
  logPointsEarning,
  logPointsRedemption,
  logTierUpgrade,
  logRewardCreation,
  logRewardRedemption,
  logPointsTransfer,
  logPointsAdjustment,
};
