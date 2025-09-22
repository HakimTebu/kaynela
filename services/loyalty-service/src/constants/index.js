// Loyalty Service Constants

// Loyalty Tiers
const LOYALTY_TIERS = {
  BRONZE: {
    name: "bronze",
    minPoints: 0,
    maxPoints: 999,
    multiplier: 1.0,
    benefits: ["Basic rewards access", "Standard earning rate"],
    color: "#CD7F32",
  },
  SILVER: {
    name: "silver",
    minPoints: 1000,
    maxPoints: 4999,
    multiplier: 1.2,
    benefits: ["Enhanced rewards", "20% bonus points", "Priority support"],
    color: "#C0C0C0",
  },
  GOLD: {
    name: "gold",
    minPoints: 5000,
    maxPoints: 19999,
    multiplier: 1.5,
    benefits: ["Premium rewards", "50% bonus points", "VIP support", "Exclusive events"],
    color: "#FFD700",
  },
  PLATINUM: {
    name: "platinum",
    minPoints: 20000,
    maxPoints: 99999,
    multiplier: 2.0,
    benefits: ["Elite rewards", "100% bonus points", "Concierge service", "Private tours"],
    color: "#E5E4E2",
  },
  DIAMOND: {
    name: "diamond",
    minPoints: 100000,
    maxPoints: Infinity,
    multiplier: 3.0,
    benefits: ["Ultimate rewards", "200% bonus points", "Personal manager", "All-access pass"],
    color: "#B9F2FF",
  },
};

// Points Earning Sources
const POINTS_SOURCES = {
  BOOKING: "booking",
  FARM_VISIT: "farm_visit",
  ACTIVITY: "activity",
  EVENT: "event",
  REFERRAL: "referral",
  REVIEW: "review",
  SOCIAL_SHARE: "social_share",
  BIRTHDAY: "birthday",
  ANNIVERSARY: "anniversary",
  MANUAL: "manual",
  CORRECTION: "correction",
  COMPENSATION: "compensation",
};

// Points Multipliers by Source
const POINTS_MULTIPLIERS = {
  [POINTS_SOURCES.BOOKING]: 1.0,
  [POINTS_SOURCES.FARM_VISIT]: 1.5,
  [POINTS_SOURCES.ACTIVITY]: 1.2,
  [POINTS_SOURCES.EVENT]: 1.3,
  [POINTS_SOURCES.REFERRAL]: 2.0,
  [POINTS_SOURCES.REVIEW]: 0.5,
  [POINTS_SOURCES.SOCIAL_SHARE]: 0.3,
  [POINTS_SOURCES.BIRTHDAY]: 2.0,
  [POINTS_SOURCES.ANNIVERSARY]: 1.5,
  [POINTS_SOURCES.MANUAL]: 1.0,
  [POINTS_SOURCES.CORRECTION]: 1.0,
  [POINTS_SOURCES.COMPENSATION]: 1.0,
};

// Reward Categories
const REWARD_CATEGORIES = {
  DISCOUNT: "discount",
  FREE_ITEM: "free_item",
  UPGRADE: "upgrade",
  EXPERIENCE: "experience",
  MERCHANDISE: "merchandise",
};

// Reward Status
const REWARD_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  EXPIRED: "expired",
  OUT_OF_STOCK: "out_of_stock",
};

// Points Transaction Types
const TRANSACTION_TYPES = {
  EARNED: "earned",
  REDEEMED: "redeemed",
  TRANSFERRED: "transferred",
  ADJUSTED: "adjusted",
  EXPIRED: "expired",
  BONUS: "bonus",
};

// Points Expiry Rules
const POINTS_EXPIRY = {
  DEFAULT: 365, // days
  TIER_BONUS: 730, // days for tier bonus points
  REFERRAL: 1095, // days for referral points
  MANUAL: 1825, // days for manual adjustments
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  USER_LOYALTY: 300, // 5 minutes
  REWARDS_LIST: 600, // 10 minutes
  TIER_INFO: 3600, // 1 hour
  ANALYTICS: 1800, // 30 minutes
  USER_POINTS: 60, // 1 minute
};

// Rate Limiting
const RATE_LIMITS = {
  POINTS_EARNING: 20, // per hour per user
  REWARDS_REDEMPTION: 5, // per hour per user
  TIER_UPGRADE: 3, // per day per user
  POINTS_TRANSFER: 10, // per day per user
  ADMIN_OPERATIONS: 100, // per hour per IP
};

// Validation Rules
const VALIDATION = {
  POINTS_MIN: 1,
  POINTS_MAX: 10000,
  POINTS_ADJUSTMENT_MIN: -10000,
  POINTS_ADJUSTMENT_MAX: 10000,
  REASON_MIN_LENGTH: 3,
  REASON_MAX_LENGTH: 200,
  REWARD_NAME_MIN_LENGTH: 3,
  REWARD_NAME_MAX_LENGTH: 100,
  REWARD_DESCRIPTION_MIN_LENGTH: 10,
  REWARD_DESCRIPTION_MAX_LENGTH: 500,
};

// Business Rules
const BUSINESS_RULES = {
  MIN_POINTS_FOR_TIER_UPGRADE: 1000,
  POINTS_PER_DOLLAR: 10, // Base earning rate
  MAX_POINTS_PER_TRANSACTION: 10000,
  MIN_POINTS_FOR_REDEMPTION: 100,
  REFERRAL_BONUS_POINTS: 500,
  BIRTHDAY_BONUS_POINTS: 1000,
  ANNIVERSARY_BONUS_POINTS: 750,
  REVIEW_BONUS_POINTS: 50,
  SOCIAL_SHARE_BONUS_POINTS: 25,
};

// Notification Types
const NOTIFICATION_TYPES = {
  POINTS_EARNED: "points_earned",
  POINTS_REDEEMED: "points_redeemed",
  TIER_UPGRADED: "tier_upgraded",
  REWARD_AVAILABLE: "reward_available",
  POINTS_EXPIRING: "points_expiring",
  BIRTHDAY_BONUS: "birthday_bonus",
  ANNIVERSARY_BONUS: "anniversary_bonus",
  REFERRAL_BONUS: "referral_bonus",
};

// Error Messages
const ERROR_MESSAGES = {
  INSUFFICIENT_POINTS: "Insufficient loyalty points for this operation",
  INVALID_TIER: "Invalid loyalty tier specified",
  REWARD_NOT_AVAILABLE: "Reward is not available for redemption",
  USER_NOT_FOUND: "User not found",
  POINTS_LIMIT_EXCEEDED: "Points limit exceeded for this operation",
  INVALID_TRANSACTION: "Invalid transaction type",
  EXPIRED_REWARD: "Reward has expired",
  TIER_REQUIREMENT_NOT_MET: "User does not meet tier requirement for this reward",
};

// Success Messages
const SUCCESS_MESSAGES = {
  POINTS_EARNED: "Loyalty points earned successfully",
  POINTS_REDEEMED: "Reward redeemed successfully",
  TIER_UPGRADED: "Loyalty tier upgraded successfully",
  REWARD_CREATED: "Reward created successfully",
  POINTS_TRANSFERRED: "Points transferred successfully",
  POINTS_ADJUSTED: "Points adjusted successfully",
};

module.exports = {
  LOYALTY_TIERS,
  POINTS_SOURCES,
  POINTS_MULTIPLIERS,
  REWARD_CATEGORIES,
  REWARD_STATUS,
  TRANSACTION_TYPES,
  POINTS_EXPIRY,
  PAGINATION,
  CACHE_TTL,
  RATE_LIMITS,
  VALIDATION,
  BUSINESS_RULES,
  NOTIFICATION_TYPES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};
