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

// Ticket creation validation
const validateTicketCreation = [
  body("eventId")
    .isMongoId()
    .withMessage("Invalid event ID"),
  body("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),
  body("ticketType")
    .isIn(["general", "vip", "student", "senior", "child", "family"])
    .withMessage("Invalid ticket type"),
  body("quantity")
    .isInt({ min: 1, max: 10 })
    .withMessage("Quantity must be between 1 and 10"),
  body("seatNumbers")
    .optional()
    .isArray()
    .withMessage("Seat numbers must be an array"),
  body("specialRequests")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Special requests must be less than 500 characters"),
  handleValidationErrors,
];

// Event creation validation
const validateEventCreation = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Event name must be between 3 and 200 characters"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("eventType")
    .isIn(["farm_tour", "workshop", "festival", "dining", "activity", "concert", "exhibition"])
    .withMessage("Invalid event type"),
  body("startDate")
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  body("endDate")
    .isISO8601()
    .withMessage("End date must be a valid ISO date"),
  body("venue")
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Venue must be between 3 and 200 characters"),
  body("capacity")
    .isInt({ min: 1, max: 10000 })
    .withMessage("Capacity must be between 1 and 10,000"),
  body("ticketTypes")
    .isArray({ min: 1 })
    .withMessage("Must have at least one ticket type"),
  body("ticketTypes.*.name")
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Ticket type name must be between 2 and 50 characters"),
  body("ticketTypes.*.price")
    .isFloat({ min: 0, max: 10000 })
    .withMessage("Ticket price must be between 0 and 10,000"),
  body("ticketTypes.*.quantity")
    .isInt({ min: 1, max: 10000 })
    .withMessage("Ticket quantity must be between 1 and 10,000"),
  handleValidationErrors,
];

// QR code generation validation
const validateQRCodeGeneration = [
  body("ticketId")
    .isMongoId()
    .withMessage("Invalid ticket ID"),
  body("format")
    .optional()
    .isIn(["png", "svg", "pdf"])
    .withMessage("Invalid QR code format"),
  body("size")
    .optional()
    .isInt({ min: 100, max: 1000 })
    .withMessage("QR code size must be between 100 and 1000 pixels"),
  body("includeLogo")
    .optional()
    .isBoolean()
    .withMessage("includeLogo must be a boolean"),
  handleValidationErrors,
];

// Ticket validation (scanning)
const validateTicketValidation = [
  body("ticketId")
    .isMongoId()
    .withMessage("Invalid ticket ID"),
  body("qrCode")
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("QR code must be between 10 and 1000 characters"),
  body("scannedBy")
    .isMongoId()
    .withMessage("Invalid scanner user ID"),
  body("location")
    .optional()
    .isObject()
    .withMessage("Location must be an object"),
  body("location.latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude"),
  body("location.longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude"),
  handleValidationErrors,
];

// Event update validation
const validateEventUpdate = [
  param("id")
    .isMongoId()
    .withMessage("Invalid event ID"),
  body("name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Event name must be between 3 and 200 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  handleValidationErrors,
];

// Ticket update validation
const validateTicketUpdate = [
  param("id")
    .isMongoId()
    .withMessage("Invalid ticket ID"),
  body("status")
    .optional()
    .isIn(["active", "used", "cancelled", "expired", "refunded"])
    .withMessage("Invalid ticket status"),
  body("specialRequests")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Special requests must be less than 500 characters"),
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
  query("sortBy")
    .optional()
    .isString()
    .withMessage("Sort by must be a string"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
  query("status")
    .optional()
    .isString()
    .withMessage("Status must be a string"),
  query("eventType")
    .optional()
    .isString()
    .withMessage("Event type must be a string"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO date"),
  handleValidationErrors,
];

// Event search validation
const validateEventSearch = [
  query("query")
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Search query must be between 2 and 100 characters"),
  query("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),
  query("location")
    .optional()
    .isString()
    .withMessage("Location must be a string"),
  query("priceRange")
    .optional()
    .isObject()
    .withMessage("Price range must be an object"),
  query("priceRange.min")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be non-negative"),
  query("priceRange.max")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be non-negative"),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateTicketCreation,
  validateEventCreation,
  validateQRCodeGeneration,
  validateTicketValidation,
  validateEventUpdate,
  validateTicketUpdate,
  validateQueryParams,
  validateEventSearch,
};
