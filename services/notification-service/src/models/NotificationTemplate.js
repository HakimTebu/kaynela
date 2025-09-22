const mongoose = require("mongoose");
const {
  TEMPLATE_TYPES,
  TEMPLATE_CATEGORIES,
  EMAIL_CATEGORIES,
  SMS_CATEGORIES,
  PUSH_CATEGORIES,
} = require("../constants");

const NotificationTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TEMPLATE_TYPES),
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(TEMPLATE_CATEGORIES),
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: function () {
        return this.type === "email";
      },
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    variables: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
      },
      description: {
        type: String,
        trim: true,
        maxlength: 200,
      },
      required: {
        type: Boolean,
        default: false,
      },
      defaultValue: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      example: {
        type: String,
        trim: true,
        maxlength: 200,
      },
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    version: {
      type: String,
      default: "1.0.0",
      trim: true,
    },
    language: {
      type: String,
      default: "en",
      trim: true,
      maxlength: 10,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUsedAt: {
      type: Date,
      sparse: true,
    },
    approvalStatus: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    approvedAt: {
      type: Date,
      sparse: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      sparse: true,
    },
    expiryDate: {
      type: Date,
      sparse: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    channels: [{
      type: String,
      enum: ["email", "sms", "push"],
      required: true,
    }],
    targetAudience: {
      userRoles: [{
        type: String,
        trim: true,
        maxlength: 50,
      }],
      loyaltyTiers: [{
        type: String,
        trim: true,
        maxlength: 50,
      }],
      userSegments: [{
        type: String,
        trim: true,
        maxlength: 100,
      }],
    },
    scheduling: {
      isScheduled: {
        type: Boolean,
        default: false,
      },
      startDate: {
        type: Date,
        sparse: true,
      },
      endDate: {
        type: Date,
        sparse: true,
      },
      timeZone: {
        type: String,
        default: "UTC",
        trim: true,
      },
      recurrence: {
        type: String,
        enum: ["none", "daily", "weekly", "monthly", "yearly"],
        default: "none",
      },
      recurrenceConfig: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
NotificationTemplateSchema.index({ type: 1, category: 1, isActive: 1 });
NotificationTemplateSchema.index({ category: 1, isActive: 1 });
NotificationTemplateSchema.index({ isActive: 1, approvalStatus: 1 });
NotificationTemplateSchema.index({ approvalStatus: 1, isExpired: 1 });
NotificationTemplateSchema.index({ tags: 1 });
NotificationTemplateSchema.index({ language: 1, isActive: 1 });
NotificationTemplateSchema.index({ "targetAudience.userRoles": 1 });
NotificationTemplateSchema.index({ "targetAudience.loyaltyTiers": 1 });
NotificationTemplateSchema.index({ createdAt: 1 });
NotificationTemplateSchema.index({ lastModifiedBy: 1 });

// Virtual for template status
NotificationTemplateSchema.virtual("status").get(function () {
  if (this.isExpired) return "expired";
  if (!this.isActive) return "inactive";
  if (this.approvalStatus === "rejected") return "rejected";
  if (this.approvalStatus === "pending") return "pending_approval";
  if (this.approvalStatus === "draft") return "draft";
  return "active";
});

// Virtual for days until expiry
NotificationTemplateSchema.virtual("daysUntilExpiry").get(function () {
  if (!this.expiryDate) return null;
  if (this.isExpired) return 0;
  const now = new Date();
  const diffTime = this.expiryDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for template complexity
NotificationTemplateSchema.virtual("complexity").get(function () {
  const variableCount = this.variables.length;
  const contentLength = this.content.length;
  
  if (variableCount > 10 || contentLength > 5000) return "high";
  if (variableCount > 5 || contentLength > 2000) return "medium";
  return "low";
});

// Pre-save middleware
NotificationTemplateSchema.pre("save", function (next) {
  // Check if template has expired
  if (this.expiryDate && new Date() > this.expiryDate) {
    this.isExpired = true;
  }
  
  // Update last modified timestamp
  this.lastModifiedAt = new Date();
  
  // Increment version if content changed
  if (this.isModified("content") || this.isModified("subject")) {
    const currentVersion = this.version.split(".");
    const patch = parseInt(currentVersion[2]) + 1;
    this.version = `${currentVersion[0]}.${currentVersion[1]}.${patch}`;
  }
  
  next();
});

// Static methods
NotificationTemplateSchema.statics.findActiveTemplates = function (filters = {}) {
  const query = {
    isActive: true,
    approvalStatus: "approved",
    isExpired: false,
    ...filters,
  };
  
  if (filters.expiryDate) {
    query.expiryDate = { $gt: filters.expiryDate };
  }
  
  return this.find(query).sort({ priority: -1, createdAt: -1 });
};

NotificationTemplateSchema.statics.findTemplatesByType = function (type, filters = {}) {
  return this.find({
    type,
    isActive: true,
    approvalStatus: "approved",
    isExpired: false,
    ...filters,
  }).sort({ priority: -1, createdAt: -1 });
};

NotificationTemplateSchema.statics.findTemplatesByCategory = function (category, filters = {}) {
  return this.find({
    category,
    isActive: true,
    approvalStatus: "approved",
    isExpired: false,
    ...filters,
  }).sort({ priority: -1, createdAt: -1 });
};

NotificationTemplateSchema.statics.findTemplatesByAudience = function (userRole, loyaltyTier, filters = {}) {
  const query = {
    isActive: true,
    approvalStatus: "approved",
    isExpired: false,
    ...filters,
  };
  
  // Add audience filters
  if (userRole) {
    query.$or = [
      { "targetAudience.userRoles": { $exists: false } },
      { "targetAudience.userRoles": { $size: 0 } },
      { "targetAudience.userRoles": userRole },
    ];
  }
  
  if (loyaltyTier) {
    query.$or = [
      { "targetAudience.loyaltyTiers": { $exists: false } },
      { "targetAudience.loyaltyTiers": { $size: 0 } },
      { "targetAudience.loyaltyTiers": loyaltyTier },
    ];
  }
  
  return this.find(query).sort({ priority: -1, createdAt: -1 });
};

NotificationTemplateSchema.statics.findExpiringTemplates = function (daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    isActive: true,
    approvalStatus: "approved",
    expiryDate: { $lte: thresholdDate, $gt: new Date() },
  }).sort({ expiryDate: 1 });
};

NotificationTemplateSchema.statics.getTemplateStats = function () {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        approvalStatus: "approved",
        isExpired: false,
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        categories: { $addToSet: "$category" },
        avgUsageCount: { $avg: "$usageCount" },
        totalUsageCount: { $sum: "$usageCount" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

// Instance methods
NotificationTemplateSchema.methods.isAvailableForUser = function (userRole, loyaltyTier) {
  if (!this.isActive || this.approvalStatus !== "approved" || this.isExpired) {
    return false;
  }
  
  // Check user role requirements
  if (this.targetAudience.userRoles && this.targetAudience.userRoles.length > 0) {
    if (!this.targetAudience.userRoles.includes(userRole)) {
      return false;
    }
  }
  
  // Check loyalty tier requirements
  if (this.targetAudience.loyaltyTiers && this.targetAudience.loyaltyTiers.length > 0) {
    if (!this.targetAudience.loyaltyTiers.includes(loyaltyTier)) {
      return false;
    }
  }
  
  // Check scheduling
  if (this.scheduling.isScheduled) {
    const now = new Date();
    if (this.scheduling.startDate && now < this.scheduling.startDate) {
      return false;
    }
    if (this.scheduling.endDate && now > this.scheduling.endDate) {
      return false;
    }
  }
  
  return true;
};

NotificationTemplateSchema.methods.incrementUsage = function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

NotificationTemplateSchema.methods.render = function (data = {}) {
  let renderedContent = this.content;
  let renderedSubject = this.subject;
  
  // Replace variables in content
  this.variables.forEach((variable) => {
    const placeholder = `{{${variable.name}}}`;
    const value = data[variable.name] || variable.defaultValue || "";
    
    renderedContent = renderedContent.replace(new RegExp(placeholder, "g"), value);
    
    if (renderedSubject) {
      renderedSubject = renderedSubject.replace(new RegExp(placeholder, "g"), value);
    }
  });
  
  return {
    content: renderedContent,
    subject: renderedSubject,
    variables: this.variables,
    missingVariables: this.variables
      .filter((v) => v.required && !data[v.name] && !v.defaultValue)
      .map((v) => v.name),
  };
};

NotificationTemplateSchema.methods.validateVariables = function (data = {}) {
  const missingRequired = this.variables
    .filter((v) => v.required && !data[v.name] && !v.defaultValue)
    .map((v) => v.name);
  
  const extraVariables = Object.keys(data).filter(
    (key) => !this.variables.find((v) => v.name === key)
  );
  
  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    extraVariables,
    totalVariables: this.variables.length,
    providedVariables: Object.keys(data).length,
  };
};

NotificationTemplateSchema.methods.clone = function (newName, createdBy) {
  const clonedTemplate = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    name: newName,
    version: "1.0.0",
    usageCount: 0,
    lastUsedAt: null,
    approvalStatus: "draft",
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    createdBy,
    lastModifiedBy: createdBy,
    createdAt: undefined,
    updatedAt: undefined,
  });
  
  return clonedTemplate.save();
};

// Middleware to update related collections
NotificationTemplateSchema.post("save", async function (doc) {
  // This could trigger updates to analytics, notifications, etc.
  // Implementation depends on specific business requirements
});

module.exports = mongoose.model("NotificationTemplate", NotificationTemplateSchema);
