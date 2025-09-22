const AuditLog = require("../models/AuditLog");

exports.logAction = (action) => {
  return async (req, res, next) => {
    try {
      await AuditLog.create({
        action,
        user: req.user?._id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        metadata: {
          route: req.originalUrl,
          method: req.method,
        },
      });
    } catch (err) {
      console.error("Audit log failed:", err);
    }
    next();
  };
};
