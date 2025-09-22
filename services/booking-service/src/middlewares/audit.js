const logger = require("../utils/logger");

const logAction = (action, resource = "booking") => {
  return (req, res, next) => {
    const auditData = {
      action,
      resource,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString(),
    };

    // Log the action
    logger.info(`Audit: ${action} on ${resource}`, auditData);

    // Add audit data to request for use in controllers
    req.auditData = auditData;

    next();
  };
};

module.exports = { logAction };
