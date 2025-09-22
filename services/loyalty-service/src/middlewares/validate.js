const { body, param, query, validationResult } = require("express-validator");

// Generic validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errorMessages,
      requestId: req.requestId,
    });
  }
  next();
};

// Points earning validation
const validatePointsEarning = [
  body("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),
  body("points")
    .isInt({ min: 1, max: 10000 })
    .withMessage("Points must be between 1 and 10,000"),
  body("reason")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Reason must be between 3 and 100 characters"),
  body("source")
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Source must be between 2 and 50 characters"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
  handleValidationErrors,
];

// Points redemption validation
const validatePointsRedemption = [
  body("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),
  body("points")
    .isInt({ min: 1, max: 10000 })
    .withMessage("Points must be between 1 and 10,000"),
  body("rewardId")
    .isMongoId()
    .withMessage("Invalid reward ID"),
  body("quantity")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Quantity must be between 1 and 100"),
  handleValidationErrors,
];

// Tier upgrade validation
const validateTierUpgrade = [
  body("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),
  body("newTier")
    .isIn(["bronze", "silver", "gold", "platinum", "diamond"])
    .withMessage("Invalid tier level"),
  body("upgradeReason")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Upgrade reason must be between 3 and 200 characters"),
  handleValidationErrors,
];

// Reward creation validation
const validateRewardCreation = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Reward name must be between 3 and 100 characters"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be between 10 and 500 characters"),
  body("pointsCost")
    .isInt({ min: 1, max: 100000 })
    .withMessage("Points cost must be between 1 and 100,000"),
  body("category")
    .isIn(["discount", "free_item", "upgrade", "experience", "merchandise"])
    .withMessage("Invalid reward category"),
  body("tierRequirement")
    .optional()
    .isIn(["bronze", "silver", "gold", "platinum", "diamond"])
    .withMessage("Invalid tier requirement"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("expiryDate")
    .optional()
    .isISO8601()
    .withMessage("Expiry date must be a valid ISO date"),
  handleValidationErrors,
];

// Reward redemption validation
const validateRewardRedemption = [
  param("rewardId")
    .isMongoId()
    .withMessage("Invalid reward ID"),
  body("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),
  body("quantity")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Quantity must be between 1 and 100"),
  handleValidationErrors,
];

// User loyalty data validation
const validateUserLoyaltyData = [
  param("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),
  handleValidationErrors,
];

// Points transfer validation
const validatePointsTransfer = [
  body("fromUserId")
    .isMongoId()
    .withMessage("Invalid source user ID"),
  body("toUserId")
    .isMongoId()
    .withMessage("Invalid destination user ID"),
  body("points")
    .isInt({ min: 1, max: 10000 })
    .withMessage("Points must be between 1 and 10,000"),
  body("reason")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Transfer reason must be between 3 and 100 characters"),
  handleValidationErrors,
];

// Query parameters validation
const validateQueryParams = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("tier")
    .optional()
    .isIn(["bronze", "silver", "gold", "platinum", "diamond"])
    .withMessage("Invalid tier filter"),
  query("category")
    .optional()
    .isIn(["discount", "free_item", "upgrade", "experience", "merchandise"])
    .withMessage("Invalid category filter"),
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  handleValidationErrors,
];

// Points adjustment validation (admin only)
const validatePointsAdjustment = [
  body("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),
  body("points")
    .isInt({ min: -10000, max: 10000 })
    .withMessage("Points adjustment must be between -10,000 and 10,000"),
  body("reason")
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Adjustment reason must be between 3 and 200 characters"),
  body("adjustmentType")
    .isIn(["manual", "correction", "compensation", "penalty"])
    .withMessage("Invalid adjustment type"),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validatePointsEarning,
  validatePointsRedemption,
  validateTierUpgrade,
  validateRewardCreation,
  validateRewardRedemption,
  validateUserLoyaltyData,
  validatePointsTransfer,
  validateQueryParams,
  validatePointsAdjustment,
};
