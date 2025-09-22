const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ["login", "logout", "password_change", "email_verification"],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  ipAddress: String,
  userAgent: String,
  metadata: Object,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AuditLog", AuditLogSchema);
