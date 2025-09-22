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

// Specific audit loggers for ticketing operations
const logTicketCreation = logAction("TICKET_CREATED", "ticket");
const logTicketUpdate = logAction("TICKET_UPDATED", "ticket");
const logTicketDeletion = logAction("TICKET_DELETED", "ticket");
const logTicketValidation = logAction("TICKET_VALIDATED", "ticket");
const logTicketCancellation = logAction("TICKET_CANCELLED", "ticket");
const logEventCreation = logAction("EVENT_CREATED", "event");
const logEventUpdate = logAction("EVENT_UPDATED", "event");
const logEventDeletion = logAction("EVENT_DELETED", "event");
const logEventActivation = logAction("EVENT_ACTIVATED", "event");
const logEventDeactivation = logAction("EVENT_DEACTIVATED", "event");
const logQRCodeGeneration = logAction("QR_CODE_GENERATED", "qr_code");
const logQRCodeValidation = logAction("QR_CODE_VALIDATED", "qr_code");
const logTicketRefund = logAction("TICKET_REFUNDED", "ticket");
const logTicketTransfer = logAction("TICKET_TRANSFERRED", "ticket");
const logBulkTicketOperation = logAction("BULK_TICKET_OPERATION", "ticket");
const logEventCapacityUpdate = logAction("EVENT_CAPACITY_UPDATED", "event");
const logTicketTypeUpdate = logAction("TICKET_TYPE_UPDATED", "event");

module.exports = {
  logAction,
  logTicketCreation,
  logTicketUpdate,
  logTicketDeletion,
  logTicketValidation,
  logTicketCancellation,
  logEventCreation,
  logEventUpdate,
  logEventDeletion,
  logEventActivation,
  logEventDeactivation,
  logQRCodeGeneration,
  logQRCodeValidation,
  logTicketRefund,
  logTicketTransfer,
  logBulkTicketOperation,
  logEventCapacityUpdate,
  logTicketTypeUpdate,
};
