const mongoose = require("mongoose");
const { 
  PAYMENT_METHODS, 
  PAYMENT_PROVIDERS, 
  PAYMENT_METHOD_STATUS,
  CARD_TYPES,
  MOBILE_MONEY_PROVIDERS,
  BANK_TRANSFER_TYPES
} = require("../constants");

const PaymentMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: true,
    },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDERS),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_METHOD_STATUS),
      required: true,
      default: "active",
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Method-specific fields
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    // Card-specific fields
    cardType: {
      type: String,
      enum: Object.values(CARD_TYPES),
      sparse: true,
    },
    last4Digits: {
      type: String,
      sparse: true,
      maxlength: 4,
    },
    expiryMonth: {
      type: Number,
      sparse: true,
      min: 1,
      max: 12,
    },
    expiryYear: {
      type: Number,
      sparse: true,
      min: new Date().getFullYear(),
    },
    cardBrand: {
      type: String,
      sparse: true,
      trim: true,
    },
    // Mobile money specific fields
    mobileMoneyProvider: {
      type: String,
      enum: Object.values(MOBILE_MONEY_PROVIDERS),
      sparse: true,
    },
    phoneNumber: {
      type: String,
      sparse: true,
      trim: true,
    },
    // Bank transfer specific fields
    bankTransferType: {
      type: String,
      enum: Object.values(BANK_TRANSFER_TYPES),
      sparse: true,
    },
    bankName: {
      type: String,
      sparse: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      sparse: true,
      trim: true,
    },
    accountHolderName: {
      type: String,
      sparse: true,
      trim: true,
    },
    routingNumber: {
      type: String,
      sparse: true,
      trim: true,
    },
    // Provider-specific fields
    providerMethodId: {
      type: String,
      sparse: true,
      index: true,
    },
    providerCustomerId: {
      type: String,
      sparse: true,
      index: true,
    },
    // Security and verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationMethod: {
      type: String,
      sparse: true,
      trim: true,
    },
    verifiedAt: {
      type: Date,
      sparse: true,
    },
    // Usage statistics
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUsedAt: {
      type: Date,
      sparse: true,
    },
    totalAmountProcessed: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Metadata and preferences
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
PaymentMethodSchema.index({ userId: 1, type: 1 });
PaymentMethodSchema.index({ userId: 1, isDefault: 1 });
PaymentMethodSchema.index({ userId: 1, status: 1 });
PaymentMethodSchema.index({ provider: 1, status: 1 });
PaymentMethodSchema.index({ providerMethodId: 1, provider: 1 });
PaymentMethodSchema.index({ createdAt: 1 });
PaymentMethodSchema.index({ updatedAt: 1 });

// Virtual for is expired (for cards)
PaymentMethodSchema.virtual("isExpired").get(function () {
  if (this.type === "credit_card" || this.type === "debit_card") {
    if (this.expiryYear && this.expiryMonth) {
      const now = new Date();
      const expiryDate = new Date(this.expiryYear, this.expiryMonth - 1, 1);
      return now > expiryDate;
    }
  }
  return false;
});

// Virtual for display name
PaymentMethodSchema.virtual("displayName").get(function () {
  if (this.type === "credit_card" || this.type === "debit_card") {
    return `${this.cardBrand} •••• ${this.last4Digits}`;
  } else if (this.type === "mobile_money") {
    return `${this.mobileMoneyProvider} ${this.phoneNumber}`;
  } else if (this.type === "bank_transfer") {
    return `${this.bankName} ${this.accountNumber}`;
  }
  return this.name;
});

// Virtual for is usable
PaymentMethodSchema.virtual("isUsable").get(function () {
  return this.status === "active" && !this.isExpired && this.isVerified;
});

// Pre-save middleware
PaymentMethodSchema.pre("save", function (next) {
  // Update last modified timestamp
  this.lastModifiedAt = new Date();

  // Ensure only one default method per user per type
  if (this.isModified("isDefault") && this.isDefault) {
    this.constructor.updateMany(
      { userId: this.userId, type: this.type, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }

  // Update status if card is expired
  if (this.isExpired && this.status === "active") {
    this.status = "expired";
  }

  next();
});

// Static methods
PaymentMethodSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ userId, isActive: true, ...filters }).sort({ isDefault: -1, createdAt: -1 });
};

PaymentMethodSchema.statics.findDefaultByUser = function (userId, type = null) {
  const query = { userId, isDefault: true, isActive: true };
  if (type) query.type = type;
  return this.findOne(query);
};

PaymentMethodSchema.statics.findByType = function (userId, type, filters = {}) {
  return this.find({ userId, type, isActive: true, ...filters }).sort({ isDefault: -1, createdAt: -1 });
};

PaymentMethodSchema.statics.findByProvider = function (userId, provider, filters = {}) {
  return this.find({ userId, provider, isActive: true, ...filters }).sort({ createdAt: -1 });
};

PaymentMethodSchema.statics.findExpiredCards = function () {
  const now = new Date();
  return this.find({
    type: { $in: ["credit_card", "debit_card"] },
    status: "active",
    isActive: true,
    $or: [
      { expiryYear: { $lt: now.getFullYear() } },
      {
        expiryYear: now.getFullYear(),
        expiryMonth: { $lt: now.getMonth() + 1 },
      },
    ],
  });
};

PaymentMethodSchema.statics.findUnverifiedMethods = function (userId) {
  return this.find({
    userId,
    isVerified: false,
    isActive: true,
  });
};

PaymentMethodSchema.statics.getPaymentMethodSummary = function (userId) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        verifiedCount: { $sum: { $cond: ["$isVerified", 1, 0] } },
        defaultCount: { $sum: { $cond: ["$isDefault", 1, 0] } },
        totalAmountProcessed: { $sum: "$totalAmountProcessed" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

// Instance methods
PaymentMethodSchema.methods.markAsVerified = function (verificationMethod) {
  this.isVerified = true;
  this.verificationMethod = verificationMethod;
  this.verifiedAt = new Date();
  return this.save();
};

PaymentMethodSchema.methods.incrementUsage = function (amount) {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  this.totalAmountProcessed += amount || 0;
  return this.save();
};

PaymentMethodSchema.methods.setAsDefault = function () {
  // Remove default from other methods of same type
  this.constructor.updateMany(
    { userId: this.userId, type: this.type, _id: { $ne: this._id } },
    { isDefault: false }
  );
  
  this.isDefault = true;
  return this.save();
};

PaymentMethodSchema.methods.canDelete = function () {
  return this.usageCount === 0;
};

PaymentMethodSchema.methods.softDelete = function (deletedBy) {
  this.isActive = false;
  this.lastModifiedBy = deletedBy;
  this.metadata.deletedAt = new Date();
  this.metadata.deletedBy = deletedBy;
  return this.save();
};

// Middleware to update related collections
PaymentMethodSchema.post("save", async function (doc) {
  // This could trigger updates to user preferences, notifications, etc.
  // Implementation depends on specific business requirements
});

module.exports = mongoose.model("PaymentMethod", PaymentMethodSchema);
