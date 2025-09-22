const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { roles } = require("../constants");

const UserSchema = new mongoose.Schema(
  {
    // Basic authentication fields
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Invalid email format"],
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    // OAuth fields
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    appleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      validate: {
        validator: validator.isURL,
        message: "Invalid avatar URL",
      },
    },
    provider: {
      type: String,
      enum: ["local", "google", "apple"],
      default: "local",
    },

    // Kaynela Farms specific fields
    phoneNumber: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\+?[\d\s\-\(\)]+$/.test(v);
        },
        message: "Invalid phone number format",
      },
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (v) {
          return v <= new Date();
        },
        message: "Date of birth cannot be in the future",
      },
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: "Kenya",
      },
    },

    // Agritourism preferences
    agritourismPreferences: {
      preferredActivities: [
        {
          type: String,
          enum: [
            "farm_tours",
            "animal_feeding",
            "crop_picking",
            "cooking_classes",
            "wine_tasting",
            "horse_riding",
            "fishing",
            "hiking",
            "camping",
          ],
        },
      ],
      preferredLodgingType: {
        type: String,
        enum: ["farmhouse", "cottage", "glamping", "camping", "guesthouse"],
      },
      dietaryRestrictions: [
        {
          type: String,
          enum: [
            "vegetarian",
            "vegan",
            "gluten_free",
            "dairy_free",
            "nut_free",
            "halal",
            "kosher",
          ],
        },
      ],
      accessibilityNeeds: [
        {
          type: String,
          enum: [
            "wheelchair_access",
            "hearing_assistance",
            "visual_assistance",
            "mobility_support",
          ],
        },
      ],
      groupSize: {
        type: Number,
        min: 1,
        max: 50,
      },
    },

    // Loyalty program
    loyaltyTier: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum", "diamond"],
      default: "bronze",
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    loyaltyPointsHistory: [
      {
        points: Number,
        action: {
          type: String,
          enum: ["earned", "redeemed", "expired", "bonus", "refund"],
        },
        source: {
          type: String,
          enum: [
            "booking",
            "referral",
            "review",
            "social_media",
            "special_event",
            "birthday",
          ],
        },
        description: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
      },
    ],
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    memberSince: {
      type: Date,
      default: Date.now,
    },

    // Farm-specific information
    farmVisits: [
      {
        visitDate: Date,
        activityType: String,
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        feedback: String,
        photos: [String],
      },
    ],
    favoriteFarmProducts: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        productName: String,
        category: String,
      },
    ],
    seasonalPreferences: [
      {
        season: {
          type: String,
          enum: ["spring", "summer", "autumn", "winter", "rainy", "dry"],
        },
        activities: [String],
      },
    ],

    // Password reset & email verification
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    // OTP-based email verification
    emailVerificationOTP: String,
    emailVerificationOTPExpires: Date,
    emailVerificationOTPAttempts: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Account recovery
    accountRecoveryCode: String,
    accountRecoveryExpires: Date,
    accountRecoveryMethod: {
      type: String,
      enum: ["email", "sms", "security_questions", "trusted_device"],
    },
    lastRecoveryAttempt: Date,
    recoveryAttempts: {
      type: Number,
      default: 0,
    },
    lastEmailRecovery: Date,
    lastSMSRecovery: Date,
    lastSecurityQuestionsRecovery: Date,
    lastTrustedDeviceRecovery: Date,
    lastRecoveryDevice: String,
    lastRecoveryIP: String,

    // Security questions
    securityQuestions: [
      {
        question: {
          type: String,
          required: true,
        },
        answer: {
          type: String,
          required: true,
          select: false,
        },
      },
    ],

    // Two-factor authentication
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorBackupCodes: [
      {
        code: {
          type: String,
          select: false,
        },
        used: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Account status and roles
    role: {
      type: String,
      enum: roles,
      default: "customer",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: String,
    suspensionExpires: Date,

    // Login tracking
    lastLogin: Date,
    lastLoginIP: String,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockoutUntil: Date,
    failedLoginAttempts: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        ip: String,
        userAgent: String,
      },
    ],

    // Device management
    trustedDevices: [
      {
        deviceId: String,
        deviceName: String,
        deviceType: String,
        lastUsed: Date,
        ipAddress: String,
        userAgent: String,
        isTrusted: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Communication preferences
    communicationPreferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      marketingEmails: {
        type: Boolean,
        default: false,
      },
      seasonalUpdates: {
        type: Boolean,
        default: true,
      },
      specialOffers: {
        type: Boolean,
        default: true,
      },
      farmNews: {
        type: Boolean,
        default: true,
      },
    },

    // Social connections
    socialConnections: {
      facebook: String,
      instagram: String,
      twitter: String,
    },

    // Referral program
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    referrals: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["pending", "completed", "expired"],
          default: "pending",
        },
        completedAt: Date,
        bonusPoints: Number,
      },
    ],

    // Privacy and consent
    privacyConsent: {
      dataProcessing: {
        type: Boolean,
        default: false,
      },
      marketing: {
        type: Boolean,
        default: false,
      },
      thirdPartySharing: {
        type: Boolean,
        default: false,
      },
      consentDate: Date,
      lastUpdated: Date,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Password hashing middleware
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date(Date.now());
  next();
});

// Update loyalty tier based on points
UserSchema.pre("save", function (next) {
  if (this.isModified("loyaltyPoints")) {
    if (this.loyaltyPoints >= 1000) {
      this.loyaltyTier = "platinum";
    } else if (this.loyaltyPoints >= 500) {
      this.loyaltyTier = "gold";
    } else if (this.loyaltyPoints >= 100) {
      this.loyaltyTier = "silver";
    } else {
      this.loyaltyTier = "bronze";
    }
  }
  next();
});

// Update average order value
UserSchema.pre("save", function (next) {
  if (this.isModified("totalOrders") && this.isModified("totalSpent")) {
    if (this.totalOrders > 0) {
      this.averageOrderValue = this.totalSpent / this.totalOrders;
    }
  }
  next();
});

// Account locking after 5 failed attempts
UserSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil > Date.now()) {
    throw new Error("Account is temporarily locked");
  }

  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 min lock
  }
  await this.save();
};

UserSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

UserSchema.methods.generateAuthToken = function () {
  const payload = {
    userId: this._id,
    role: this.role,
    is2FAEnabled: this.is2FAEnabled,
    loyaltyTier: this.loyaltyTier,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h", // Extended from 15m to 1h
  });
};

UserSchema.methods.check2FARequirement = function () {
  return this.is2FAEnabled;
};

UserSchema.methods.generateRefreshToken = function (deviceInfo = {}) {
  const refreshToken = jwt.sign(
    { userId: this._id },
    process.env.REFRESH_SECRET,
    { expiresIn: "30d" }
  );

  this.refreshTokens = this.refreshTokens.concat({
    token: refreshToken,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    deviceInfo,
  });

  return refreshToken;
};

// Loyalty points methods
UserSchema.methods.addLoyaltyPoints = async function (
  points,
  reason = "order"
) {
  this.loyaltyPoints += points;
  await this.save();

  // Publish event for analytics
  if (this.constructor.publishLoyaltyPointsEarnedEvent) {
    await this.constructor.publishLoyaltyPointsEarnedEvent(this, points, reason);
  }
};

UserSchema.methods.redeemLoyaltyPoints = async function (
  points,
  reason = "reward"
) {
  if (this.loyaltyPoints < points) {
    throw new Error("Insufficient loyalty points");
  }

  this.loyaltyPoints -= points;
  await this.save();

  // Publish event for analytics
  if (this.constructor.publishLoyaltyPointsRedeemedEvent) {
    await this.constructor.publishLoyaltyPointsRedeemedEvent(this, points, reason);
  }
};

// Static methods
UserSchema.statics.findByLoyaltyTier = function (tier) {
  return this.find({ loyaltyTier: tier, status: "active" });
};

UserSchema.statics.getTopSpenders = function (limit = 10) {
  return this.find({ status: "active" })
    .sort({ totalSpent: -1 })
    .limit(limit)
    .select("name email totalSpent loyaltyTier");
};

// Indexes for performance
UserSchema.index({ resetPasswordToken: 1 });
UserSchema.index({ resetPasswordExpires: 1 }, { expireAfterSeconds: 0 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ emailVerificationExpires: 1 }, { expireAfterSeconds: 0 });
UserSchema.index({ accountRecoveryCode: 1 });
UserSchema.index({ accountRecoveryExpires: 1 }, { expireAfterSeconds: 0 });
UserSchema.index({ accountRecoveryMethod: 1 });
UserSchema.index({ recoveryAttempts: 1 });
UserSchema.index({ lastRecoveryAttempt: 1 });
UserSchema.index({ loyaltyTier: 1, totalSpent: -1 });
UserSchema.index({ status: 1, lastLogin: -1 });
UserSchema.index({ email: 1, status: 1 });
UserSchema.index({ phone: 1, status: 1 });

module.exports = mongoose.model("User", UserSchema);
