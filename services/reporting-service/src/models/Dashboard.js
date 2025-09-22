const mongoose = require("mongoose");
const {
  DASHBOARD_TYPES,
  WIDGET_TYPES,
  CHART_TYPES,
} = require("../constants");

const WidgetSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(WIDGET_TYPES),
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  
  // Chart-specific configuration
  chartType: {
    type: String,
    enum: Object.values(CHART_TYPES),
    sparse: true,
  },
  
  // Data configuration
  dataSource: {
    type: String,
    required: true,
  },
  query: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  refreshInterval: {
    type: Number,
    min: 0,
    default: 0, // 0 means no auto-refresh
  },
  
  // Display configuration
  size: {
    width: {
      type: Number,
      min: 1,
      max: 12,
      default: 6,
    },
    height: {
      type: Number,
      min: 1,
      max: 12,
      default: 4,
    },
  },
  position: {
    x: {
      type: Number,
      min: 0,
      default: 0,
    },
    y: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  
  // Styling
  backgroundColor: {
    type: String,
    default: "#ffffff",
  },
  borderColor: {
    type: String,
    default: "#e0e0e0",
  },
  textColor: {
    type: String,
    default: "#333333",
  },
  
  // Configuration
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  
  // Error handling
  error: {
    message: {
      type: String,
      sparse: true,
    },
    timestamp: {
      type: Date,
      sparse: true,
    },
  },
}, { _id: false });

const DashboardSchema = new mongoose.Schema(
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
      enum: Object.values(DASHBOARD_TYPES),
      required: true,
      default: "custom",
    },
    
    // Layout configuration
    layout: {
      type: {
        type: String,
        enum: ["grid", "freeform", "responsive"],
        default: "grid",
      },
      columns: {
        type: Number,
        min: 1,
        max: 12,
        default: 12,
      },
      rows: {
        type: Number,
        min: 1,
        max: 20,
        default: 10,
      },
      gap: {
        type: Number,
        min: 0,
        max: 50,
        default: 10,
      },
      padding: {
        type: Number,
        min: 0,
        max: 50,
        default: 20,
      },
    },
    
    // Widgets
    widgets: {
      type: [WidgetSchema],
      validate: {
        validator: function(widgets) {
          return widgets.length > 0;
        },
        message: "Dashboard must have at least one widget",
      },
    },
    
    // Theme and styling
    theme: {
      primaryColor: {
        type: String,
        default: "#1976d2",
      },
      secondaryColor: {
        type: String,
        default: "#dc004e",
      },
      backgroundColor: {
        type: String,
        default: "#f5f5f5",
      },
      fontFamily: {
        type: String,
        default: "Roboto, sans-serif",
      },
      fontSize: {
        type: String,
        default: "14px",
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
    
    // Sharing and collaboration
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      permission: {
        type: String,
        enum: ["view", "edit", "admin"],
        default: "view",
      },
      sharedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Versioning
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [{
      version: {
        type: Number,
        required: true,
      },
      data: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
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
    
    // Status
    status: {
      type: String,
      enum: ["draft", "active", "archived", "maintenance"],
      default: "draft",
      index: true,
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
DashboardSchema.index({ type: 1, status: 1, createdAt: -1 });
DashboardSchema.index({ createdBy: 1, createdAt: -1 });
DashboardSchema.index({ tags: 1 });
DashboardSchema.index({ category: 1 });
DashboardSchema.index({ "sharedWith.userId": 1 });
DashboardSchema.index({ isPublic: 1, status: 1 });

// Virtuals
DashboardSchema.virtual("widgetCount").get(function() {
  return this.widgets ? this.widgets.length : 0;
});

DashboardSchema.virtual("activeWidgetCount").get(function() {
  return this.widgets ? this.widgets.filter(w => w.isActive).length : 0;
});

DashboardSchema.virtual("isEditable").get(function() {
  // This should be checked against the current user's permissions
  return true;
});

DashboardSchema.virtual("lastWidgetUpdate").get(function() {
  if (!this.widgets || this.widgets.length === 0) return null;
  
  const lastUpdate = Math.max(
    ...this.widgets.map(w => w.lastUpdated ? w.lastUpdated.getTime() : 0)
  );
  
  return lastUpdate > 0 ? new Date(lastUpdate) : null;
});

// Pre-save middleware
DashboardSchema.pre("save", function(next) {
  // Update lastModifiedBy
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.createdBy; // This should be updated by the controller
  }
  
  // Update version if widgets changed
  if (this.isModified("widgets")) {
    this.version += 1;
    
    // Store previous version
    if (this.previousVersions.length >= 10) {
      this.previousVersions.shift(); // Keep only last 10 versions
    }
    
    this.previousVersions.push({
      version: this.version - 1,
      data: {
        widgets: this.widgets,
        layout: this.layout,
        theme: this.theme,
      },
      createdAt: new Date(),
      createdBy: this.createdBy,
    });
  }
  
  next();
});

// Instance methods
DashboardSchema.methods.addWidget = function(widget) {
  if (!this.widgets) {
    this.widgets = [];
  }
  
  // Generate unique ID if not provided
  if (!widget.id) {
    widget.id = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  this.widgets.push(widget);
  return widget;
};

DashboardSchema.methods.removeWidget = function(widgetId) {
  if (!this.widgets) return false;
  
  const index = this.widgets.findIndex(w => w.id === widgetId);
  if (index > -1) {
    this.widgets.splice(index, 1);
    return true;
  }
  
  return false;
};

DashboardSchema.methods.updateWidget = function(widgetId, updates) {
  if (!this.widgets) return false;
  
  const widget = this.widgets.find(w => w.id === widgetId);
  if (widget) {
    Object.assign(widget, updates);
    widget.lastUpdated = new Date();
    return true;
  }
  
  return false;
};

DashboardSchema.methods.getWidget = function(widgetId) {
  if (!this.widgets) return null;
  
  return this.widgets.find(w => w.id === widgetId);
};

DashboardSchema.methods.shareWithUser = function(userId, permission = "view") {
  if (!this.sharedWith) {
    this.sharedWith = [];
  }
  
  // Check if already shared
  const existingShare = this.sharedWith.find(s => s.userId.toString() === userId.toString());
  if (existingShare) {
    existingShare.permission = permission;
    existingShare.sharedAt = new Date();
  } else {
    this.sharedWith.push({
      userId,
      permission,
      sharedAt: new Date(),
    });
  }
  
  this.isShared = true;
};

DashboardSchema.methods.removeUserShare = function(userId) {
  if (!this.sharedWith) return false;
  
  const index = this.sharedWith.findIndex(s => s.userId.toString() === userId.toString());
  if (index > -1) {
    this.sharedWith.splice(index, 1);
    
    // If no more shares, update isShared flag
    if (this.sharedWith.length === 0) {
      this.isShared = false;
    }
    
    return true;
  }
  
  return false;
};

DashboardSchema.methods.canUserAccess = function(userId, userRole) {
  // Creator has full access
  if (this.createdBy.toString() === userId.toString()) {
    return true;
  }
  
  // Public dashboards
  if (this.isPublic) {
    return true;
  }
  
  // Role-based access
  if (this.allowedRoles && this.allowedRoles.includes(userRole)) {
    return true;
  }
  
  // User-specific access
  if (this.allowedUsers && this.allowedUsers.some(u => u.toString() === userId.toString())) {
    return true;
  }
  
  // Shared access
  if (this.sharedWith && this.sharedWith.some(s => s.userId.toString() === userId.toString())) {
    return true;
  }
  
  return false;
};

// Static methods
DashboardSchema.statics.findByUser = function(userId, role) {
  const query = { isActive: true };
  
  if (role === "admin" || role === "super_admin") {
    return this.find(query);
  }
  
  query.$or = [
    { createdBy: userId },
    { isPublic: true },
    { allowedUsers: userId },
    { allowedRoles: role },
    { "sharedWith.userId": userId },
  ];
  
  return this.find(query);
};

DashboardSchema.statics.findByType = function(type, options = {}) {
  const query = { type, isActive: true, ...options };
  return this.find(query);
};

DashboardSchema.statics.findPublic = function(options = {}) {
  const query = { isPublic: true, isActive: true, ...options };
  return this.find(query);
};

DashboardSchema.statics.getDashboardStats = async function(userId = null) {
  const matchStage = userId ? { createdBy: userId } : {};
  
  return this.aggregate([
    { $match: { ...matchStage, isActive: true } },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        totalWidgets: { $sum: { $size: "$widgets" } },
        avgWidgets: { $avg: { $size: "$widgets" } },
      },
    },
    {
      $project: {
        type: "$_id",
        count: 1,
        totalWidgets: 1,
        avgWidgets: { $round: ["$avgWidgets", 2] },
        _id: 0,
      },
    },
  ]);
};

module.exports = mongoose.model("Dashboard", DashboardSchema);
