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

// Specific audit loggers for notification operations
const logEmailSent = logAction("EMAIL_SENT", "email_notification");
const logSMSSent = logAction("SMS_SENT", "sms_notification");
const logPushSent = logAction("PUSH_SENT", "push_notification");
const logBulkNotification = logAction("BULK_NOTIFICATION_SENT", "bulk_notification");
const logTemplateCreated = logAction("TEMPLATE_CREATED", "notification_template");
const logTemplateUpdated = logAction("TEMPLATE_UPDATED", "notification_template");
const logTemplateDeleted = logAction("TEMPLATE_DELETED", "notification_template");
const logPreferencesUpdated = logAction("PREFERENCES_UPDATED", "notification_preferences");
const logDeviceTokenRegistered = logAction("DEVICE_TOKEN_REGISTERED", "device_token");

module.exports = {
  logAction,
  logEmailSent,
  logSMSSent,
  logPushSent,
  logBulkNotification,
  logTemplateCreated,
  logTemplateUpdated,
  logTemplateDeleted,
  logPreferencesUpdated,
  logDeviceTokenRegistered,
};
