const { body, param, query, validationResult } = require("express-validator");
const { ValidationError } = require("../utils/errors");

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(new ValidationError("Validation failed", errorMessages));
  }
  next();
};

// Booking creation validation
const validateCreateBooking = [
  body("bookingType")
    .isIn(["lodging", "activity", "event", "farm_tour", "package"])
    .withMessage("Invalid booking type"),
  body("startDate")
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Start date must be in the future");
      }
      return true;
    }),
  body("endDate")
    .isISO8601()
    .withMessage("End date must be a valid date")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  body("duration")
    .isInt({ min: 1 })
    .withMessage("Duration must be a positive integer"),
  body("participants.adults")
    .isInt({ min: 1 })
    .withMessage("At least one adult participant is required"),
  body("participants.children")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Children count must be a non-negative integer"),
  body("participants.seniors")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Seniors count must be a non-negative integer"),
  body("basePrice")
    .isFloat({ min: 0 })
    .withMessage("Base price must be a positive number"),
  body("currency")
    .optional()
    .isIn(["KES", "USD", "EUR", "GBP"])
    .withMessage("Invalid currency"),
  body("payment.paymentMethod")
    .isIn([
      "mobile_money",
      "credit_card",
      "debit_card",
      "bank_transfer",
      "cash",
    ])
    .withMessage("Invalid payment method"),
  handleValidationErrors,
];

// Booking update validation
const validateUpdateBooking = [
  param("id").isMongoId().withMessage("Invalid booking ID"),
  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date")
    .custom((value, { req }) => {
      if (
        req.body.startDate &&
        new Date(value) <= new Date(req.body.startDate)
      ) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  body("status")
    .optional()
    .isIn([
      "pending",
      "confirmed",
      "active",
      "completed",
      "cancelled",
      "refunded",
    ])
    .withMessage("Invalid status"),
  handleValidationErrors,
];

// Booking cancellation validation
const validateCancelBooking = [
  param("id").isMongoId().withMessage("Invalid booking ID"),
  body("cancellationReason")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Cancellation reason must be between 1 and 500 characters"),
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
  query("status")
    .optional()
    .isIn([
      "pending",
      "confirmed",
      "active",
      "completed",
      "cancelled",
      "refunded",
    ])
    .withMessage("Invalid status filter"),
  query("bookingType")
    .optional()
    .isIn(["lodging", "activity", "event", "farm_tour", "package"])
    .withMessage("Invalid booking type filter"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date filter must be a valid date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date filter must be a valid date"),
  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be a positive number"),
  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be a positive number"),
  handleValidationErrors,
];

// Lodging-specific validation
const validateLodgingBooking = [
  body("lodging.accommodationType")
    .isIn(["farmhouse", "cottage", "glamping", "camping", "guesthouse"])
    .withMessage("Invalid accommodation type"),
  body("lodging.checkInTime")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Check-in time must be in HH:MM format"),
  body("lodging.checkOutTime")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Check-out time must be in HH:MM format"),
  handleValidationErrors,
];

// Activity-specific validation
const validateActivityBooking = [
  body("activity.activityType")
    .isIn([
      "farm_tours",
      "animal_feeding",
      "crop_picking",
      "cooking_classes",
      "wine_tasting",
      "horse_riding",
      "fishing",
      "hiking",
      "camping",
    ])
    .withMessage("Invalid activity type"),
  body("activity.skillLevel")
    .optional()
    .isIn(["beginner", "intermediate", "advanced"])
    .withMessage("Invalid skill level"),
  body("activity.maxParticipants")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max participants must be a positive integer"),
  handleValidationErrors,
];

// Event-specific validation
const validateEventBooking = [
  body("event.eventType")
    .isIn([
      "workshop",
      "festival",
      "celebration",
      "educational",
      "entertainment",
    ])
    .withMessage("Invalid event type"),
  body("event.eventCapacity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Event capacity must be a positive integer"),
  handleValidationErrors,
];

// Special requirements validation
const validateSpecialRequirements = [
  body("specialRequirements.dietaryRestrictions")
    .optional()
    .isArray()
    .withMessage("Dietary restrictions must be an array"),
  body("specialRequirements.dietaryRestrictions.*")
    .optional()
    .isIn([
      "vegetarian",
      "vegan",
      "gluten_free",
      "dairy_free",
      "nut_free",
      "halal",
      "kosher",
    ])
    .withMessage("Invalid dietary restriction"),
  body("specialRequirements.accessibilityNeeds")
    .optional()
    .isArray()
    .withMessage("Accessibility needs must be an array"),
  body("specialRequirements.accessibilityNeeds.*")
    .optional()
    .isIn([
      "wheelchair_access",
      "hearing_assistance",
      "visual_assistance",
      "mobility_support",
    ])
    .withMessage("Invalid accessibility need"),
  handleValidationErrors,
];

module.exports = {
  validateCreateBooking,
  validateUpdateBooking,
  validateCancelBooking,
  validateQueryParams,
  validateLodgingBooking,
  validateActivityBooking,
  validateEventBooking,
  validateSpecialRequirements,
  handleValidationErrors,
};
