const mongoose = require("mongoose");
const {
  REPORT_TYPES,
  REPORT_FORMATS,
  REPORT_STATUS,
  DATA_SOURCES,
  METRICS,
  DIMENSIONS,
  FILTER_OPERATORS,
  TIME_PERIODS,
} = require("../constants");

const ReportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: Object.values(REPORT_TYPES),
      required: true,
      index: true,
    },
    format: {
      type: String,
      enum: Object.values(REPORT_FORMATS),
      required: true,
      default: "pdf",
    },
    status: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      required: true,
      default: "draft",
      index: true,
    },
    
    // Data configuration
    dataSource: {
      type: String,
      enum: Object.values(DATA_SOURCES),
      required: true,
    },
    metrics: [{
      name: {
        type: String,
        enum: Object.values(METRICS),
        required: true,
      },
      field: {
        type: String,
        required: true,
      },
      aggregation: {
        type: String,
        enum: ["sum", "avg", "min", "max", "count", "distinct"],
        default: "sum",
      },
      format: {
        type: String,
        enum: ["number", "currency", "percentage", "date", "text"],
        default: "number",
      },
    }],
    dimensions: [{
      name: {
        type: String,
        enum: Object.values(DIMENSIONS),
        required: true,
      },
      field: {
        type: String,
        required: true,
      },
      grouping: {
        type: String,
        enum: ["none", "hour", "day", "week", "month", "quarter", "year"],
        default: "none",
      },
    }],
    filters: [{
      field: {
        type: String,
        required: true,
      },
      operator: {
        type: String,
        enum: Object.values(FILTER_OPERATORS),
        required: true,
      },
      value: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
      value2: {
        type: mongoose.Schema.Types.Mixed,
        sparse: true, // For BETWEEN operator
      },
    }],
    
    // Time configuration
    timeRange: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      timePeriod: {
        type: String,
        enum: Object.values(TIME_PERIODS),
        default: "month",
      },
      isRelative: {
        type: Boolean,
        default: true,
      },
      relativeValue: {
        type: Number,
        default: 1,
      },
    },
    
    // Schedule configuration
    schedule: {
      isScheduled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "quarterly", "yearly", "custom"],
        sparse: true,
      },
      time: {
        type: String,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        sparse: true,
      },
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        sparse: true,
      },
      dayOfMonth: {
        type: Number,
        min: 1,
        max: 31,
        sparse: true,
      },
      customCron: {
        type: String,
        sparse: true,
      },
      nextRun: {
        type: Date,
        sparse: true,
      },
      lastRun: {
        type: Date,
        sparse: true,
      },
    },
    
    // Output configuration
    output: {
      fileName: {
        type: String,
        trim: true,
        maxlength: 200,
      },
      filePath: {
        type: String,
        trim: true,
        sparse: true,
      },
      fileSize: {
        type: Number,
        min: 0,
        sparse: true,
      },
      mimeType: {
        type: String,
        sparse: true,
      },
      downloadUrl: {
        type: String,
        sparse: true,
      },
      expiresAt: {
        type: Date,
        sparse: true,
      },
    },
    
    // Generation configuration
    generation: {
      startedAt: {
        type: Date,
        sparse: true,
      },
      completedAt: {
        type: Date,
        sparse: true,
      },
      duration: {
        type: Number,
        min: 0,
        sparse: true,
      },
      progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      error: {
        message: {
          type: String,
          sparse: true,
        },
        stack: {
          type: String,
          sparse: true,
        },
        code: {
          type: String,
          sparse: true,
        },
      },
      retryCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 3,
      },
    },
    
    // Access control
    isPublic: {
      type: Boolean,
      default: false,
    },
    allowedRoles: [{
      type: String,
      enum: ["admin", "manager", "user", "guest"],
    }],
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    
    // Metadata
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    
    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
ReportSchema.index({ type: 1, status: 1, createdAt: -1 });
ReportSchema.index({ dataSource: 1, status: 1 });
ReportSchema.index({ "schedule.isScheduled": 1, "schedule.nextRun": 1 });
ReportSchema.index({ "timeRange.startDate": 1, "timeRange.endDate": 1 });
ReportSchema.index({ createdBy: 1, createdAt: -1 });
ReportSchema.index({ tags: 1 });
ReportSchema.index({ category: 1 });
ReportSchema.index({ priority: 1 });

// Virtuals
ReportSchema.virtual("isOverdue").get(function() {
  if (!this.schedule.nextRun) return false;
  return new Date() > this.schedule.nextRun;
});

ReportSchema.virtual("isGenerating").get(function() {
  return this.status === "generating";
});

ReportSchema.virtual("canRetry").get(function() {
  return this.status === "failed" && this.generation.retryCount < 3;
});

ReportSchema.virtual("estimatedCompletion").get(function() {
  if (!this.generation.startedAt || this.generation.progress === 0) return null;
  
  const elapsed = Date.now() - this.generation.startedAt.getTime();
  const estimatedTotal = (elapsed / this.generation.progress) * 100;
  return new Date(this.generation.startedAt.getTime() + estimatedTotal);
});

// Pre-save middleware
ReportSchema.pre("save", function(next) {
  // Update lastModifiedBy
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.createdBy; // This should be updated by the controller
  }
  
  // Update nextRun for scheduled reports
  if (this.schedule.isScheduled && this.schedule.frequency && this.schedule.time) {
    this.updateNextRun();
  }
  
  next();
});

// Instance methods
ReportSchema.methods.updateNextRun = function() {
  if (!this.schedule.frequency || !this.schedule.time) return;
  
  const now = new Date();
  const [hours, minutes] = this.schedule.time.split(":").map(Number);
  
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);
  
  // If time has passed today, move to next occurrence
  if (nextRun <= now) {
    switch (this.schedule.frequency) {
      case "daily":
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case "weekly":
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case "monthly":
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      case "quarterly":
        nextRun.setMonth(nextRun.getMonth() + 3);
        break;
      case "yearly":
        nextRun.setFullYear(nextRun.getFullYear() + 1);
        break;
    }
  }
  
  this.schedule.nextRun = nextRun;
};

ReportSchema.methods.startGeneration = function() {
  this.status = "generating";
  this.generation.startedAt = new Date();
  this.generation.progress = 0;
  this.generation.error = {};
};

ReportSchema.methods.completeGeneration = function() {
  this.status = "completed";
  this.generation.completedAt = new Date();
  this.generation.progress = 100;
  this.generation.duration = this.generation.completedAt - this.generation.startedAt;
};

ReportSchema.methods.failGeneration = function(error) {
  this.status = "failed";
  this.generation.error = {
    message: error.message,
    stack: error.stack,
    code: error.code || "UNKNOWN_ERROR",
  };
  this.generation.progress = 0;
};

ReportSchema.methods.incrementRetryCount = function() {
  this.generation.retryCount += 1;
};

// Static methods
ReportSchema.statics.findByUser = function(userId, role) {
  const query = { isActive: true };
  
  if (role === "admin" || role === "super_admin") {
    return this.find(query);
  }
  
  query.$or = [
    { createdBy: userId },
    { isPublic: true },
    { allowedUsers: userId },
    { allowedRoles: role },
  ];
  
  return this.find(query);
};

ReportSchema.statics.findScheduledReports = function() {
  return this.find({
    "schedule.isScheduled": true,
    "schedule.nextRun": { $lte: new Date() },
    status: { $in: ["active", "scheduled"] },
    isActive: true,
  });
};

ReportSchema.statics.findOverdueReports = function() {
  return this.find({
    "schedule.isScheduled": true,
    "schedule.nextRun": { $lt: new Date() },
    status: { $in: ["active", "scheduled"] },
    isActive: true,
  });
};

ReportSchema.statics.findByType = function(type, options = {}) {
  const query = { type, isActive: true, ...options };
  return this.find(query);
};

ReportSchema.statics.findByDataSource = function(dataSource, options = {}) {
  const query = { dataSource, isActive: true, ...options };
  return this.find(query);
};

ReportSchema.statics.getReportStats = async function(userId = null) {
  const matchStage = userId ? { createdBy: userId } : {};
  
  return this.aggregate([
    { $match: { ...matchStage, isActive: true } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        types: { $addToSet: "$type" },
      },
    },
    {
      $project: {
        status: "$_id",
        count: 1,
        types: 1,
        _id: 0,
      },
    },
  ]);
};

module.exports = mongoose.model("Report", ReportSchema);
