const mongoose = require("mongoose");
const { 
  PAYMENT_STATUS, 
  PAYMENT_METHODS, 
  PAYMENT_PROVIDERS, 
  CURRENCIES,
  TRANSACTION_TYPES 
} = require("../constants");

const PaymentSchema = new mongoose.Schema(
  {
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
      default: "KES",
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: true,
    },
    paymentProvider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDERS),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      required: true,
      default: "pending",
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Provider-specific fields
    providerPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    providerTransactionId: {
      type: String,
      sparse: true,
      index: true,
    },
    // Payment processing details
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
    initiatedAt: {
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
    cancelledAt: {
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
    // Retry logic
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    lastRetryAt: {
      type: Date,
      sparse: true,
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
    // Security and compliance
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    deviceFingerprint: {
      type: String,
      trim: true,
    },
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
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ paymentMethod: 1, status: 1 });
PaymentSchema.index({ paymentProvider: 1, status: 1 });
PaymentSchema.index({ amount: 1, currency: 1 });
PaymentSchema.index({ providerPaymentId: 1, paymentProvider: 1 });
PaymentSchema.index({ initiatedAt: 1, status: 1 });
PaymentSchema.index({ createdAt: 1 });
PaymentSchema.index({ updatedAt: 1 });

// Virtual for payment duration
PaymentSchema.virtual("paymentDuration").get(function () {
  if (this.completedAt && this.initiatedAt) {
    return this.completedAt.getTime() - this.initiatedAt.getTime();
  }
  return null;
});

// Virtual for payment age
PaymentSchema.virtual("paymentAge").get(function () {
  return Date.now() - this.initiatedAt.getTime();
});

// Virtual for is expired
PaymentSchema.virtual("isExpired").get(function () {
  if (this.status === "pending") {
    const expiryTime = 30 * 60 * 1000; // 30 minutes
    return this.paymentAge > expiryTime;
  }
  return false;
});

// Virtual for total amount (including fees)
PaymentSchema.virtual("totalAmount").get(function () {
  return this.amount + this.processingFee;
});

// Pre-save middleware
PaymentSchema.pre("save", function (next) {
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
      case "cancelled":
        this.cancelledAt = now;
        break;
    }
  }

  next();
});

// Static methods
PaymentSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ userId, isActive: true, ...filters }).sort({ createdAt: -1 });
};

PaymentSchema.statics.findByStatus = function (status, filters = {}) {
  return this.find({ status, isActive: true, ...filters }).sort({ createdAt: -1 });
};

PaymentSchema.statics.findByPaymentMethod = function (paymentMethod, filters = {}) {
  return this.find({ paymentMethod, isActive: true, ...filters }).sort({ createdAt: -1 });
};

PaymentSchema.statics.findByProvider = function (paymentProvider, filters = {}) {
  return this.find({ paymentProvider, isActive: true, ...filters }).sort({ createdAt: -1 });
};

PaymentSchema.statics.findExpiredPayments = function () {
  const expiryTime = 30 * 60 * 1000; // 30 minutes
  const cutoffTime = new Date(Date.now() - expiryTime);
  
  return this.find({
    status: "pending",
    initiatedAt: { $lt: cutoffTime },
    isActive: true,
  });
};

PaymentSchema.statics.findFailedPaymentsForRetry = function () {
  return this.find({
    status: "failed",
    retryCount: { $lt: 3 },
    isActive: true,
  });
};

PaymentSchema.statics.getPaymentSummary = function (userId) {
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

PaymentSchema.statics.getPaymentAnalytics = function (startDate, endDate) {
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
          paymentMethod: "$paymentMethod",
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
PaymentSchema.methods.canRetry = function () {
  return this.status === "failed" && this.retryCount < 3;
};

PaymentSchema.methods.incrementRetryCount = function () {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  return this.save();
};

PaymentSchema.methods.canCancel = function () {
  return ["pending", "processing"].includes(this.status);
};

PaymentSchema.methods.cancel = function (reason, cancelledBy) {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  this.lastModifiedBy = cancelledBy;
  this.metadata.cancellationReason = reason;
  return this.save();
};

PaymentSchema.methods.canRefund = function () {
  return this.status === "completed";
};

PaymentSchema.methods.getRefundableAmount = function () {
  if (this.status === "completed") {
    return this.amount;
  }
  return 0;
};

// Middleware to update related collections
PaymentSchema.post("save", async function (doc) {
  // This could trigger updates to user analytics, notifications, etc.
  // Implementation depends on specific business requirements
});

module.exports = mongoose.model("Payment", PaymentSchema);
