const mongoose = require("mongoose");
const { QR_CODE_FORMATS, QR_CODE_SIZES } = require("../constants");

const QRCodeSchema = new mongoose.Schema(
  {
    // QR Code identification
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Associated ticket
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    
    // Associated event
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    
    // Associated user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // QR Code content and format
    content: {
      type: String,
      required: true,
    },
    
    format: {
      type: String,
      enum: Object.values(QR_CODE_FORMATS),
      default: QR_CODE_FORMATS.PNG,
    },
    
    size: {
      type: Number,
      enum: Object.values(QR_CODE_SIZES),
      default: QR_CODE_SIZES.MEDIUM,
    },
    
    // QR Code image data
    imageData: {
      data: Buffer,
      contentType: String,
      width: Number,
      height: Number,
    },
    
    // QR Code styling and customization
    styling: {
      foregroundColor: {
        type: String,
        default: "#000000",
      },
      backgroundColor: {
        type: String,
        default: "#FFFFFF",
      },
      errorCorrectionLevel: {
        type: String,
        enum: ["L", "M", "Q", "H"],
        default: "M",
      },
      margin: {
        type: Number,
        default: 4,
        min: 0,
        max: 10,
      },
      logo: {
        url: String,
        width: Number,
        height: Number,
        opacity: {
          type: Number,
          default: 1,
          min: 0,
          max: 1,
        },
      },
      frame: {
        enabled: {
          type: Boolean,
          default: false,
        },
        color: String,
        width: Number,
        style: {
          type: String,
          enum: ["solid", "dashed", "dotted"],
          default: "solid",
        },
      },
    },
    
    // QR Code metadata
    metadata: {
      version: {
        type: Number,
        default: 1,
      },
      dataType: {
        type: String,
        enum: ["text", "url", "email", "phone", "sms", "vcard", "wifi", "custom"],
        default: "custom",
      },
      encoding: {
        type: String,
        enum: ["UTF-8", "ISO-8859-1", "Shift_JIS"],
        default: "UTF-8",
      },
      compression: {
        type: Boolean,
        default: false,
      },
    },
    
    // Generation and expiry information
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    // Usage tracking
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    lastUsedAt: Date,
    
    usageHistory: [{
      usedAt: {
        type: Date,
        default: Date.now,
      },
      usedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      location: {
        latitude: Number,
        longitude: Number,
        venue: String,
        deviceInfo: String,
      },
      result: {
        type: String,
        enum: ["valid", "invalid", "expired", "already_used", "cancelled"],
      },
      notes: String,
    }],
    
    // Security features
    security: {
      isEncrypted: {
        type: Boolean,
        default: false,
      },
      encryptionKey: String,
      hash: String,
      signature: String,
      salt: String,
    },
    
    // Access control
    accessControl: {
      maxUsage: {
        type: Number,
        default: 1,
        min: 1,
      },
      allowedDevices: [String],
      allowedLocations: [{
        latitude: Number,
        longitude: Number,
        radius: Number, // in meters
        venue: String,
      }],
      timeRestrictions: {
        startTime: String, // HH:MM format
        endTime: String, // HH:MM format
        daysOfWeek: [Number], // 0-6 for Sunday-Saturday
        validFrom: Date,
        validUntil: Date,
      },
      ipRestrictions: [String],
      userAgentRestrictions: [String],
    },
    
    // Analytics and tracking
    analytics: {
      views: {
        type: Number,
        default: 0,
      },
      scans: {
        type: Number,
        default: 0,
      },
      downloads: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
      lastViewedAt: Date,
      lastScannedAt: Date,
      lastDownloadedAt: Date,
      lastSharedAt: Date,
    },
    
    // Integration and webhooks
    webhooks: [{
      url: String,
      events: [String], // ["generated", "scanned", "expired", "deleted"]
      isActive: Boolean,
      lastTriggeredAt: Date,
      failureCount: {
        type: Number,
        default: 0,
      },
      lastFailureAt: Date,
      lastFailureReason: String,
    }],
    
    // Custom fields for extensibility
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    
    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
QRCodeSchema.index({ code: 1 }, { unique: true });
QRCodeSchema.index({ ticketId: 1 });
QRCodeSchema.index({ eventId: 1 });
QRCodeSchema.index({ userId: 1 });
QRCodeSchema.index({ expiresAt: 1 });
QRCodeSchema.index({ isActive: 1 });
QRCodeSchema.index({ generatedAt: 1 });
QRCodeSchema.index({ "usageHistory.usedAt": 1 });
QRCodeSchema.index({ "analytics.lastScannedAt": 1 });

// Virtual fields
QRCodeSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date();
});

QRCodeSchema.virtual("isValid").get(function () {
  return this.isActive && !this.isExpired && this.usageCount < this.accessControl.maxUsage;
});

QRCodeSchema.virtual("canBeUsed").get(function () {
  return this.isValid && this.usageCount < this.accessControl.maxUsage;
});

QRCodeSchema.virtual("remainingUsage").get(function () {
  return Math.max(0, this.accessControl.maxUsage - this.usageCount);
});

QRCodeSchema.virtual("daysUntilExpiry").get(function () {
  const now = new Date();
  const timeDiff = this.expiresAt.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

QRCodeSchema.virtual("ageInDays").get(function () {
  const now = new Date();
  const timeDiff = now.getTime() - this.generatedAt.getTime();
  return Math.floor(timeDiff / (1000 * 3600 * 24));
});

// Pre-save middleware
QRCodeSchema.pre("save", function (next) {
  // Generate unique code if not provided
  if (!this.code) {
    this.code = generateUniqueCode();
  }
  
  // Set expiry date if not provided
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  
  // Generate hash for security
  if (!this.security.hash) {
    this.security.hash = generateHash(this.content);
  }
  
  // Increment version
  this.version += 1;
  
  next();
});

// Pre-validate middleware
QRCodeSchema.pre("validate", function (next) {
  // Validate expiry date is in the future
  if (this.expiresAt && this.expiresAt <= new Date()) {
    this.invalidate("expiresAt", "Expiry date must be in the future");
  }
  
  // Validate max usage is positive
  if (this.accessControl.maxUsage <= 0) {
    this.invalidate("accessControl.maxUsage", "Max usage must be positive");
  }
  
  // Validate usage count doesn't exceed max usage
  if (this.usageCount > this.accessControl.maxUsage) {
    this.invalidate("usageCount", "Usage count cannot exceed max usage");
  }
  
  next();
});

// Instance methods
QRCodeSchema.methods.scan = function (scannedBy, location = null, deviceInfo = null) {
  if (!this.canBeUsed) {
    const result = this.isExpired ? "expired" : 
                   !this.isActive ? "invalid" : 
                   this.usageCount >= this.accessControl.maxUsage ? "already_used" : "invalid";
    
    this.addUsageRecord(result, scannedBy, location, deviceInfo);
    return { valid: false, reason: result };
  }
  
  // QR Code is valid
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  this.analytics.scans += 1;
  this.analytics.lastScannedAt = new Date();
  
  this.addUsageRecord("valid", scannedBy, location, deviceInfo);
  
  return { valid: true, reason: "QR Code valid" };
};

QRCodeSchema.methods.addUsageRecord = function (result, usedBy, location, deviceInfo) {
  this.usageHistory.push({
    usedAt: new Date(),
    usedBy,
    location,
    result,
    notes: deviceInfo,
  });
};

QRCodeSchema.methods.incrementView = function () {
  this.analytics.views += 1;
  this.analytics.lastViewedAt = new Date();
  return this.save();
};

QRCodeSchema.methods.incrementDownload = function () {
  this.analytics.downloads += 1;
  this.analytics.lastDownloadedAt = new Date();
  return this.save();
};

QRCodeSchema.methods.incrementShare = function () {
  this.analytics.shares += 1;
  this.analytics.lastSharedAt = new Date();
  return this.save();
};

QRCodeSchema.methods.extendExpiry = function (days) {
  this.expiresAt = new Date(this.expiresAt.getTime() + days * 24 * 60 * 60 * 1000);
  return this.save();
};

QRCodeSchema.methods.regenerate = function (newSize = null, newFormat = null) {
  if (newSize) this.size = newSize;
  if (newFormat) this.format = newFormat;
  
  this.generatedAt = new Date();
  this.version += 1;
  
  return this.save();
};

QRCodeSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

QRCodeSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

// Static methods
QRCodeSchema.statics.findByTicket = function (ticketId) {
  return this.find({ ticketId, isActive: true }).sort({ generatedAt: -1 });
};

QRCodeSchema.statics.findByEvent = function (eventId) {
  return this.find({ eventId, isActive: true }).sort({ generatedAt: -1 });
};

QRCodeSchema.statics.findByUser = function (userId) {
  return this.find({ userId, isActive: true }).sort({ generatedAt: -1 });
};

QRCodeSchema.statics.findExpired = function () {
  return this.find({
    expiresAt: { $lt: new Date() },
    isActive: true,
  });
};

QRCodeSchema.statics.findExpiringSoon = function (days = 7) {
  const threshold = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.find({
    expiresAt: { $lte: threshold, $gt: new Date() },
    isActive: true,
  });
};

QRCodeSchema.statics.findByUsage = function (minUsage = 1) {
  return this.find({
    usageCount: { $gte: minUsage },
    isActive: true,
  }).sort({ usageCount: -1 });
};

// Helper functions
function generateUniqueCode() {
  const prefix = "QR";
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 8);
  return `${prefix}${timestamp}${random}`.toUpperCase();
}

function generateHash(content) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(content).digest("hex");
}

module.exports = mongoose.model("QRCode", QRCodeSchema);
