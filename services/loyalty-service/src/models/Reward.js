const mongoose = require("mongoose");
const { REWARD_CATEGORIES, REWARD_STATUS, LOYALTY_TIERS } = require("../constants");

const RewardSchema = new mongoose.Schema(
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
      required: true,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      enum: Object.values(REWARD_CATEGORIES),
      required: true,
      index: true,
    },
    pointsCost: {
      type: Number,
      required: true,
      min: 1,
      max: 100000,
    },
    tierRequirement: {
      type: String,
      enum: Object.keys(LOYALTY_TIERS),
      default: "bronze",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isLimited: {
      type: Boolean,
      default: false,
    },
    maxRedemptions: {
      type: Number,
      min: 1,
      sparse: true, // Only required if isLimited is true
    },
    currentRedemptions: {
      type: Number,
      default: 0,
      min: 0,
    },
    isStackable: {
      type: Boolean,
      default: false,
    },
    maxStackSize: {
      type: Number,
      min: 1,
      sparse: true, // Only required if isStackable is true
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
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    terms: {
      type: String,
      trim: true,
      maxlength: 1000,
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
    status: {
      type: String,
      enum: Object.values(REWARD_STATUS),
      default: "active",
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    redemptionInstructions: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    applicableServices: [{
      type: String,
      trim: true,
      maxlength: 100,
    }],
    blackoutDates: [{
      startDate: Date,
      endDate: Date,
      reason: String,
    }],
    minimumPurchase: {
      type: Number,
      min: 0,
      default: 0,
    },
    maximumDiscount: {
      type: Number,
      min: 0,
      default: 0,
    },
    percentageDiscount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    fixedDiscount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
RewardSchema.index({ category: 1, isActive: 1, tierRequirement: 1 });
RewardSchema.index({ pointsCost: 1, isActive: 1 });
RewardSchema.index({ isActive: 1, status: 1 });
RewardSchema.index({ expiryDate: 1, isExpired: 1 });
RewardSchema.index({ priority: -1, createdAt: -1 });
RewardSchema.index({ tags: 1 });
RewardSchema.index({ createdAt: 1 });
RewardSchema.index({ lastModifiedBy: 1 });

// Virtual for availability status
RewardSchema.virtual("availabilityStatus").get(function () {
  if (!this.isActive) return "inactive";
  if (this.isExpired) return "expired";
  if (this.status !== "active") return this.status;
  if (this.isLimited && this.currentRedemptions >= this.maxRedemptions) return "out_of_stock";
  if (this.expiryDate && new Date() > this.expiryDate) return "expired";
  return "available";
});

// Virtual for remaining redemptions
RewardSchema.virtual("remainingRedemptions").get(function () {
  if (!this.isLimited) return null;
  return Math.max(0, this.maxRedemptions - this.currentRedemptions);
});

// Virtual for days until expiry
RewardSchema.virtual("daysUntilExpiry").get(function () {
  if (!this.expiryDate) return null;
  if (this.isExpired) return 0;
  const now = new Date();
  const diffTime = this.expiryDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for discount amount
RewardSchema.virtual("discountAmount").get(function () {
  if (this.percentageDiscount > 0) {
    return this.percentageDiscount;
  }
  if (this.fixedDiscount > 0) {
    return this.fixedDiscount;
  }
  return 0;
});

// Pre-save middleware
RewardSchema.pre("save", function (next) {
  // Check if reward has expired
  if (this.expiryDate && new Date() > this.expiryDate) {
    this.isExpired = true;
    this.status = "expired";
  }
  
  // Update last modified timestamp
  this.lastModifiedAt = new Date();
  
  next();
});

// Static methods
RewardSchema.statics.findActiveRewards = function (filters = {}) {
  const query = {
    isActive: true,
    status: "active",
    isExpired: false,
    ...filters,
  };
  
  if (filters.expiryDate) {
    query.expiryDate = { $gt: filters.expiryDate };
  }
  
  return this.find(query).sort({ priority: -1, createdAt: -1 });
};

RewardSchema.statics.findRewardsByTier = function (tier, filters = {}) {
  const tierOrder = Object.keys(LOYALTY_TIERS);
  const userTierIndex = tierOrder.indexOf(tier);
  
  // Find rewards available for user's tier and below
  const availableTiers = tierOrder.slice(0, userTierIndex + 1);
  
  return this.find({
    tierRequirement: { $in: availableTiers },
    isActive: true,
    status: "active",
    isExpired: false,
    ...filters,
  }).sort({ priority: -1, pointsCost: 1 });
};

RewardSchema.statics.findRewardsByCategory = function (category, filters = {}) {
  return this.find({
    category,
    isActive: true,
    status: "active",
    isExpired: false,
    ...filters,
  }).sort({ priority: -1, pointsCost: 1 });
};

RewardSchema.statics.findRewardsByPointsRange = function (minPoints, maxPoints, filters = {}) {
  return this.find({
    pointsCost: { $gte: minPoints, $lte: maxPoints },
    isActive: true,
    status: "active",
    isExpired: false,
    ...filters,
  }).sort({ pointsCost: 1, priority: -1 });
};

RewardSchema.statics.findExpiringRewards = function (daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    isActive: true,
    status: "active",
    expiryDate: { $lte: thresholdDate, $gt: new Date() },
  }).sort({ expiryDate: 1 });
};

RewardSchema.statics.getRewardsSummary = function () {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        status: "active",
        isExpired: false,
      },
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        totalPointsCost: { $sum: "$pointsCost" },
        avgPointsCost: { $avg: "$pointsCost" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

// Instance methods
RewardSchema.methods.isAvailableForUser = function (userTier, userPoints) {
  if (!this.isActive || this.status !== "active" || this.isExpired) {
    return false;
  }
  
  // Check tier requirement
  const tierOrder = Object.keys(LOYALTY_TIERS);
  const userTierIndex = tierOrder.indexOf(userTier);
  const rewardTierIndex = tierOrder.indexOf(this.tierRequirement);
  
  if (userTierIndex < rewardTierIndex) {
    return false;
  }
  
  // Check points requirement
  if (userPoints < this.pointsCost) {
    return false;
  }
  
  // Check availability
  if (this.isLimited && this.currentRedemptions >= this.maxRedemptions) {
    return false;
  }
  
  // Check expiry
  if (this.expiryDate && new Date() > this.expiryDate) {
    return false;
  }
  
  return true;
};

RewardSchema.methods.canRedeem = function (quantity = 1) {
  if (!this.isAvailableForUser()) {
    return false;
  }
  
  if (this.isLimited) {
    return this.currentRedemptions + quantity <= this.maxRedemptions;
  }
  
  return true;
};

RewardSchema.methods.incrementRedemptions = function (quantity = 1) {
  if (this.isLimited) {
    this.currentRedemptions = Math.min(this.currentRedemptions + quantity, this.maxRedemptions);
  }
  return this.save();
};

RewardSchema.methods.decrementRedemptions = function (quantity = 1) {
  if (this.isLimited) {
    this.currentRedemptions = Math.max(0, this.currentRedemptions - quantity);
  }
  return this.save();
};

RewardSchema.methods.extendExpiry = function (additionalDays) {
  if (this.expiryDate) {
    this.expiryDate = new Date(this.expiryDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
  } else {
    this.expiryDate = new Date(Date.now() + additionalDays * 24 * 60 * 60 * 1000);
  }
  this.isExpired = false;
  this.status = "active";
  return this.save();
};

RewardSchema.methods.markAsExpired = function () {
  this.isExpired = true;
  this.status = "expired";
  this.isActive = false;
  return this.save();
};

// Middleware to update related collections
RewardSchema.post("save", async function (doc) {
  // This could trigger updates to analytics, notifications, etc.
  // Implementation depends on specific business requirements
});

module.exports = mongoose.model("Reward", RewardSchema);
