const mongoose = require("mongoose");
const {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUS,
  NOTIFICATION_PRIORITY,
  EMAIL_CATEGORIES,
  SMS_CATEGORIES,
  PUSH_CATEGORIES,
} = require("../constants");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(NOTIFICATION_CHANNELS),
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    title: {
      type: String,
      required: function () {
        return this.channel === "push";
      },
      trim: true,
      maxlength: 200,
    },
    subject: {
      type: String,
      required: function () {
        return this.channel === "email";
      },
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    content: {
      type: String,
      required: function () {
        return this.channel === "email";
      },
      trim: true,
      maxlength: 10000,
    },
    recipient: {
      email: {
        type: String,
        required: function () {
          return this.channel === "email";
        },
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: function () {
          return this.channel === "sms";
        },
        trim: true,
      },
      deviceToken: {
        type: String,
        required: function () {
          return this.channel === "push";
        },
        trim: true,
      },
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotificationTemplate",
      sparse: true,
    },
    templateData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: String,
      enum: Object.values(NOTIFICATION_PRIORITY),
      default: "normal",
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUS),
      default: "pending",
      index: true,
    },
    statusHistory: [{
      status: {
        type: String,
        enum: Object.values(NOTIFICATION_STATUS),
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      reason: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      providerResponse: {
        type: mongoose.Schema.Types.Mixed,
      },
    }],
    deliveryAttempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    lastDeliveryAttempt: {
      type: Date,
      sparse: true,
    },
    nextRetryAt: {
      type: Date,
      sparse: true,
    },
    sentAt: {
      type: Date,
      sparse: true,
    },
    deliveredAt: {
      type: Date,
      sparse: true,
    },
    readAt: {
      type: Date,
      sparse: true,
    },
    expiresAt: {
      type: Date,
      sparse: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    provider: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      id: {
        type: String,
        trim: true,
      },
      response: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    source: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    correlationId: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ channel: 1, status: 1 });
NotificationSchema.index({ status: 1, createdAt: -1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });
NotificationSchema.index({ category: 1, createdAt: -1 });
NotificationSchema.index({ templateId: 1 });
NotificationSchema.index({ "recipient.email": 1 });
NotificationSchema.index({ "recipient.phone": 1 });
NotificationSchema.index({ "recipient.deviceToken": 1 });
NotificationSchema.index({ nextRetryAt: 1, status: "pending" });
NotificationSchema.index({ expiresAt: 1, status: { $ne: "sent" } });
NotificationSchema.index({ correlationId: 1 });
NotificationSchema.index({ createdAt: 1 });

// Virtual for notification age
NotificationSchema.virtual("age").get(function () {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for is expired
NotificationSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return Date.now() > this.expiresAt.getTime();
});

// Virtual for can retry
NotificationSchema.virtual("canRetry").get(function () {
  if (this.status === "sent" || this.status === "delivered") return false;
  if (!this.nextRetryAt) return true;
  return Date.now() >= this.nextRetryAt.getTime();
});

// Pre-save middleware
NotificationSchema.pre("save", function (next) {
  // Set expiry date if not provided
  if (!this.expiresAt) {
    const now = new Date();
    switch (this.channel) {
      case "email":
        this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        break;
      case "sms":
        this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        break;
      case "push":
        this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        break;
    }
  }

  // Add to status history if status changed
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }

  next();
});

// Static methods
NotificationSchema.statics.findPendingNotifications = function (limit = 100) {
  return this.find({
    status: "pending",
    isActive: true,
    $or: [
      { nextRetryAt: { $exists: false } },
      { nextRetryAt: { $lte: new Date() } },
    ],
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

NotificationSchema.statics.findUserNotifications = function (userId, filters = {}) {
  const query = { userId, isActive: true, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

NotificationSchema.statics.findNotificationsByStatus = function (status, filters = {}) {
  const query = { status, isActive: true, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

NotificationSchema.statics.findNotificationsByChannel = function (channel, filters = {}) {
  const query = { channel, isActive: true, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

NotificationSchema.statics.findNotificationsByCategory = function (category, filters = {}) {
  const query = { category, isActive: true, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

NotificationSchema.statics.getNotificationStats = function (userId = null) {
  const matchStage = { isActive: true };
  if (userId) matchStage.userId = new mongoose.Types.ObjectId(userId);

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        channels: { $addToSet: "$channel" },
        categories: { $addToSet: "$category" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

NotificationSchema.statics.getChannelStats = function (userId = null) {
  const matchStage = { isActive: true };
  if (userId) matchStage.userId = new mongoose.Types.ObjectId(userId);

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$channel",
        total: { $sum: 1 },
        sent: {
          $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
        delivered: {
          $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
        },
        read: {
          $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Instance methods
NotificationSchema.methods.markAsSent = function (providerResponse = null) {
  this.status = "sent";
  this.sentAt = new Date();
  this.deliveryAttempts += 1;
  this.lastDeliveryAttempt = new Date();
  
  if (providerResponse) {
    this.provider.response = providerResponse;
  }
  
  return this.save();
};

NotificationSchema.methods.markAsDelivered = function () {
  this.status = "delivered";
  this.deliveredAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsRead = function () {
  this.status = "read";
  this.readAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsFailed = function (reason, providerResponse = null) {
  this.status = "failed";
  this.deliveryAttempts += 1;
  this.lastDeliveryAttempt = new Date();
  
  if (reason) {
    this.statusHistory.push({
      status: "failed",
      timestamp: new Date(),
      reason,
    });
  }
  
  if (providerResponse) {
    this.provider.response = providerResponse;
  }
  
  return this.save();
};

NotificationSchema.methods.scheduleRetry = function (delayMinutes = 5) {
  this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  return this.save();
};

NotificationSchema.methods.cancel = function (reason = "Cancelled by user") {
  this.status = "cancelled";
  this.statusHistory.push({
    status: "cancelled",
    timestamp: new Date(),
    reason,
  });
  return this.save();
};

// Middleware to update related collections
NotificationSchema.post("save", async function (doc) {
  // This could trigger updates to user notification preferences, analytics, etc.
  // Implementation depends on specific business requirements
});

module.exports = mongoose.model("Notification", NotificationSchema);
