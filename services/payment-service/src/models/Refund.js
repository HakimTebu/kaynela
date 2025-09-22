const mongoose = require("mongoose");
const { 
  REFUND_TYPES, 
  REFUND_REASONS, 
  PAYMENT_STATUS,
  CURRENCIES
} = require("../constants");

const RefundSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      max: 1000000,
    },
    currency: {
      type: String,
      enum: Object.values(CURRENCIES),
      required: true,
    },
    refundType: {
      type: String,
      enum: Object.values(REFUND_TYPES),
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(REFUND_REASONS),
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      required: true,
      default: "pending",
      index: true,
    },
    // Provider-specific fields
    providerRefundId: {
      type: String,
      sparse: true,
      index: true,
    },
    providerTransactionId: {
      type: String,
      sparse: true,
      index: true,
    },
    // Processing details
    processingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    processingFeeCurrency: {
      type: String,
      enum: Object.values(CURRENCIES),
      default: "KES",
    },
    exchangeRate: {
      type: Number,
      default: 1,
      min: 0,
    },
    // Timing fields
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      sparse: true,
    },
    completedAt: {
      type: Date,
      sparse: true,
    },
    failedAt: {
      type: Date,
      sparse: true,
    },
    // Error handling
    errorCode: {
      type: String,
      sparse: true,
    },
    errorMessage: {
      type: String,
      sparse: true,
    },
    errorDetails: {
      type: mongoose.Schema.Types.Mixed,
      sparse: true,
    },
    // Approval workflow
    requiresApproval: {
      type: Boolean,
      default: false,
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
    approvalNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Related entities
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      sparse: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      sparse: true,
      index: true,
    },
    // Metadata and attachments
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    attachments: [{
      filename: String,
      url: String,
      uploadedAt: Date,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    }],
    // Audit fields
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
RefundSchema.index({ userId: 1, createdAt: -1 });
RefundSchema.index({ status: 1, createdAt: -1 });
RefundSchema.index({ refundType: 1, status: 1 });
RefundSchema.index({ reason: 1, status: 1 });
RefundSchema.index({ providerRefundId: 1 });
RefundSchema.index({ requestedAt: 1, status: 1 });
RefundSchema.index({ requiresApproval: 1, status: 1 });
RefundSchema.index({ createdAt: 1 });
RefundSchema.index({ updatedAt: 1 });

// Virtual for refund duration
RefundSchema.virtual("refundDuration").get(function () {
  if (this.completedAt && this.requestedAt) {
    return this.completedAt.getTime() - this.requestedAt.getTime();
  }
  return null;
});

// Virtual for refund age
RefundSchema.virtual("refundAge").get(function () {
  return Date.now() - this.requestedAt.getTime();
});

// Virtual for total amount (including fees)
RefundSchema.virtual("totalAmount").get(function () {
  return this.amount + this.processingFee;
});

// Virtual for is overdue (for approval)
RefundSchema.virtual("isOverdue").get(function () {
  if (this.requiresApproval && this.status === "pending") {
    const approvalWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
    return this.refundAge > approvalWindow;
  }
  return false;
});

// Pre-save middleware
RefundSchema.pre("save", function (next) {
  // Update last modified timestamp
  this.lastModifiedAt = new Date();

  // Set processing timestamp based on status
  if (this.isModified("status")) {
    const now = new Date();
    
    switch (this.status) {
      case "processing":
        this.processedAt = now;
        break;
      case "completed":
        this.completedAt = now;
        break;
      case "failed":
        this.failedAt = now;
        break;
    }
  }

  // Set approval timestamp
  if (this.isModified("approvedBy") && this.approvedBy) {
    this.approvedAt = new Date();
  }

  next();
});

// Static methods
RefundSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ userId, isActive: true, ...filters }).sort({ createdAt: -1 });
};

RefundSchema.statics.findByStatus = function (status, filters = {}) {
  return this.find({ status, isActive: true, ...filters }).sort({ createdAt: -1 });
};

RefundSchema.statics.findByTransaction = function (transactionId, filters = {}) {
  return this.find({ transactionId, isActive: true, ...filters }).sort({ createdAt: -1 });
};

RefundSchema.statics.findPendingApprovals = function () {
  return this.find({
    requiresApproval: true,
    status: "pending",
    isActive: true,
  }).sort({ requestedAt: 1 });
};

RefundSchema.statics.findOverdueApprovals = function () {
  const approvalWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
  const cutoffTime = new Date(Date.now() - approvalWindow);
  
  return this.find({
    requiresApproval: true,
    status: "pending",
    requestedAt: { $lt: cutoffTime },
    isActive: true,
  });
};

RefundSchema.statics.getRefundSummary = function (userId) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        avgAmount: { $avg: "$amount" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

RefundSchema.statics.getRefundAnalytics = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          status: "$status",
          reason: "$reason",
        },
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        totalFees: { $sum: "$processingFee" },
      },
    },
    {
      $sort: { "_id.date": 1, "_id.status": 1 },
    },
  ]);
};

// Instance methods
RefundSchema.methods.canApprove = function () {
  return this.requiresApproval && this.status === "pending";
};

RefundSchema.methods.approve = function (approvedBy, notes = "") {
  this.status = "processing";
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.approvalNotes = notes;
  this.lastModifiedBy = approvedBy;
  return this.save();
};

RefundSchema.methods.canCancel = function () {
  return ["pending", "processing"].includes(this.status);
};

RefundSchema.methods.cancel = function (reason, cancelledBy) {
  this.status = "cancelled";
  this.lastModifiedBy = cancelledBy;
  this.metadata.cancellationReason = reason;
  return this.save();
};

RefundSchema.methods.addAttachment = function (filename, url, uploadedBy) {
  this.attachments.push({
    filename,
    url,
    uploadedAt: new Date(),
    uploadedBy,
  });
  return this.save();
};

// Middleware to update related collections
RefundSchema.post("save", async function (doc) {
  // This could trigger updates to payment status, notifications, etc.
  // Implementation depends on specific business requirements
});

module.exports = mongoose.model("Refund", RefundSchema);
