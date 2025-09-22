const mongoose = require("mongoose");
const { LOYALTY_TIERS, POINTS_SOURCES, TRANSACTION_TYPES } = require("../constants");

const LoyaltyPointsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
      min: 0,
      max: 1000000,
    },
    transactionType: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: true,
    },
    source: {
      type: String,
      enum: Object.values(POINTS_SOURCES),
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Set expiry based on source type
        const expiryDays = this.source === "referral" ? 1095 : 
                          this.source === "manual" ? 1825 : 365;
        return new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
      },
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    tierAtTime: {
      type: String,
      enum: Object.keys(LOYALTY_TIERS),
      required: true,
    },
    multiplier: {
      type: Number,
      default: 1.0,
      min: 0.1,
      max: 10.0,
    },
    basePoints: {
      type: Number,
      required: true,
      min: 0,
    },
    bonusPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPoints: {
      type: Number,
      required: true,
      min: 0,
    },
    relatedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      sparse: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
LoyaltyPointsSchema.index({ userId: 1, createdAt: -1 });
LoyaltyPointsSchema.index({ userId: 1, transactionType: 1 });
LoyaltyPointsSchema.index({ userId: 1, source: 1 });
LoyaltyPointsSchema.index({ userId: 1, expiresAt: 1 });
LoyaltyPointsSchema.index({ expiresAt: 1, isExpired: 1 });
LoyaltyPointsSchema.index({ createdAt: 1 });
LoyaltyPointsSchema.index({ transactionType: 1, createdAt: -1 });

// Virtual for days until expiry
LoyaltyPointsSchema.virtual("daysUntilExpiry").get(function () {
  if (this.isExpired) return 0;
  const now = new Date();
  const diffTime = this.expiresAt.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for expiry status
LoyaltyPointsSchema.virtual("expiryStatus").get(function () {
  if (this.isExpired) return "expired";
  const daysLeft = this.daysUntilExpiry;
  if (daysLeft <= 7) return "expiring_soon";
  if (daysLeft <= 30) return "expiring_month";
  return "active";
});

// Pre-save middleware
LoyaltyPointsSchema.pre("save", function (next) {
  // Calculate total points
  this.totalPoints = this.basePoints + this.bonusPoints;
  
  // Check if points have expired
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isExpired = true;
  }
  
  next();
});

// Static methods
LoyaltyPointsSchema.statics.findActivePointsByUser = function (userId) {
  return this.find({
    userId,
    isActive: true,
    isExpired: false,
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: 1 });
};

LoyaltyPointsSchema.statics.findExpiredPoints = function (userId) {
  return this.find({
    userId,
    isActive: true,
    isExpired: false,
    expiresAt: { $lte: new Date() },
  });
};

LoyaltyPointsSchema.statics.findPointsBySource = function (userId, source) {
  return this.find({
    userId,
    source,
    isActive: true,
  }).sort({ createdAt: -1 });
};

LoyaltyPointsSchema.statics.findPointsByTransactionType = function (userId, transactionType) {
  return this.find({
    userId,
    transactionType,
    isActive: true,
  }).sort({ createdAt: -1 });
};

LoyaltyPointsSchema.statics.getTotalActivePoints = function (userId) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        isExpired: false,
        expiresAt: { $gt: new Date() },
      },
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: "$totalPoints" },
        totalBasePoints: { $sum: "$basePoints" },
        totalBonusPoints: { $sum: "$bonusPoints" },
        count: { $sum: 1 },
      },
    },
  ]);
};

LoyaltyPointsSchema.statics.getPointsSummaryByTier = function (userId) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        isExpired: false,
        expiresAt: { $gt: new Date() },
      },
    },
    {
      $group: {
        _id: "$tierAtTime",
        totalPoints: { $sum: "$totalPoints" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

LoyaltyPointsSchema.statics.getExpiringPoints = function (userId, daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    userId,
    isActive: true,
    isExpired: false,
    expiresAt: { $lte: thresholdDate, $gt: new Date() },
  }).sort({ expiresAt: 1 });
};

// Instance methods
LoyaltyPointsSchema.methods.isExpiringSoon = function (daysThreshold = 7) {
  if (this.isExpired) return false;
  const daysLeft = this.daysUntilExpiry;
  return daysLeft <= daysThreshold;
};

LoyaltyPointsSchema.methods.getExpiryWarning = function () {
  if (this.isExpired) return "Points have expired";
  
  const daysLeft = this.daysUntilExpiry;
  if (daysLeft <= 1) return "Points expire tomorrow";
  if (daysLeft <= 7) return `Points expire in ${daysLeft} days`;
  if (daysLeft <= 30) return `Points expire in ${daysLeft} days`;
  
  return null;
};

LoyaltyPointsSchema.methods.markAsExpired = function () {
  this.isExpired = true;
  this.isActive = false;
  return this.save();
};

LoyaltyPointsSchema.methods.extendExpiry = function (additionalDays) {
  this.expiresAt = new Date(this.expiresAt.getTime() + additionalDays * 24 * 60 * 60 * 1000);
  this.isExpired = false;
  return this.save();
};

// Middleware to update related collections
LoyaltyPointsSchema.post("save", async function (doc) {
  // This could trigger updates to user loyalty summary, analytics, etc.
  // Implementation depends on specific business requirements
});

module.exports = mongoose.model("LoyaltyPoints", LoyaltyPointsSchema);
