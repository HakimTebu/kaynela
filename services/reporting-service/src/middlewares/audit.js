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

// Specific audit loggers for reporting operations
const logReportCreation = logAction("REPORT_CREATED", "report");
const logReportUpdate = logAction("REPORT_UPDATED", "report");
const logReportDeletion = logAction("REPORT_DELETED", "report");
const logReportGeneration = logAction("REPORT_GENERATED", "report");
const logReportExport = logAction("REPORT_EXPORTED", "report");
const logDashboardCreation = logAction("DASHBOARD_CREATED", "dashboard");
const logDashboardUpdate = logAction("DASHBOARD_UPDATED", "dashboard");
const logDashboardDeletion = logAction("DASHBOARD_DELETED", "dashboard");
const logAnalyticsQuery = logAction("ANALYTICS_QUERIED", "analytics");
const logScheduledReportCreation = logAction("SCHEDULED_REPORT_CREATED", "scheduled_report");
const logScheduledReportUpdate = logAction("SCHEDULED_REPORT_UPDATED", "scheduled_report");
const logScheduledReportDeletion = logAction("SCHEDULED_REPORT_DELETED", "scheduled_report");
const logDataExport = logAction("DATA_EXPORTED", "data_export");
const logReportTemplateCreation = logAction("REPORT_TEMPLATE_CREATED", "report_template");
const logReportTemplateUpdate = logAction("REPORT_TEMPLATE_UPDATED", "report_template");
const logReportTemplateDeletion = logAction("REPORT_TEMPLATE_DELETED", "report_template");

module.exports = {
  logAction,
  logReportCreation,
  logReportUpdate,
  logReportDeletion,
  logReportGeneration,
  logReportExport,
  logDashboardCreation,
  logDashboardUpdate,
  logDashboardDeletion,
  logAnalyticsQuery,
  logScheduledReportCreation,
  logScheduledReportUpdate,
  logScheduledReportDeletion,
  logDataExport,
  logReportTemplateCreation,
  logReportTemplateUpdate,
  logReportTemplateDeletion,
};
