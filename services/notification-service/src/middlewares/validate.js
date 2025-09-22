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

// Email notification validation
const validateEmailNotification = [
  body("to")
    .isEmail()
    .withMessage("Valid email address required"),
  body("subject")
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Subject must be between 3 and 200 characters"),
  body("templateId")
    .optional()
    .isMongoId()
    .withMessage("Invalid template ID"),
  body("data")
    .optional()
    .isObject()
    .withMessage("Data must be an object"),
  body("priority")
    .optional()
    .isIn(["low", "normal", "high", "urgent"])
    .withMessage("Invalid priority level"),
  handleValidationErrors,
];

// SMS notification validation
const validateSMSNotification = [
  body("to")
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Valid phone number required"),
  body("message")
    .isString()
    .trim()
    .isLength({ min: 1, max: 160 })
    .withMessage("Message must be between 1 and 160 characters"),
  body("templateId")
    .optional()
    .isMongoId()
    .withMessage("Invalid template ID"),
  body("data")
    .optional()
    .isObject()
    .withMessage("Data must be an object"),
  body("priority")
    .optional()
    .isIn(["low", "normal", "high", "urgent"])
    .withMessage("Invalid priority level"),
  handleValidationErrors,
];

// Push notification validation
const validatePushNotification = [
  body("userId")
    .isMongoId()
    .withMessage("Valid user ID required"),
  body("title")
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Title must be between 1 and 100 characters"),
  body("body")
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Body must be between 1 and 500 characters"),
  body("data")
    .optional()
    .isObject()
    .withMessage("Data must be an object"),
  body("priority")
    .optional()
    .isIn(["low", "normal", "high", "urgent"])
    .withMessage("Invalid priority level"),
  handleValidationErrors,
];

// Bulk notification validation
const validateBulkNotification = [
  body("recipients")
    .isArray({ min: 1, max: 1000 })
    .withMessage("Recipients must be an array with 1-1000 items"),
  body("recipients.*.userId")
    .isMongoId()
    .withMessage("Valid user ID required for each recipient"),
  body("recipients.*.channel")
    .isIn(["email", "sms", "push", "all"])
    .withMessage("Invalid channel for recipient"),
  body("templateId")
    .isMongoId()
    .withMessage("Valid template ID required"),
  body("data")
    .optional()
    .isObject()
    .withMessage("Data must be an object"),
  body("priority")
    .optional()
    .isIn(["low", "normal", "high", "urgent"])
    .withMessage("Invalid priority level"),
  handleValidationErrors,
];

// Template creation validation
const validateTemplateCreation = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Template name must be between 3 and 100 characters"),
  body("type")
    .isIn(["email", "sms", "push"])
    .withMessage("Invalid template type"),
  body("subject")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Subject must be between 3 and 200 characters"),
  body("content")
    .isString()
    .trim()
    .isLength({ min: 10, max: 10000 })
    .withMessage("Content must be between 10 and 10,000 characters"),
  body("variables")
    .optional()
    .isArray()
    .withMessage("Variables must be an array"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  handleValidationErrors,
];

// Template update validation
const validateTemplateUpdate = [
  param("templateId")
    .isMongoId()
    .withMessage("Invalid template ID"),
  body("name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Template name must be between 3 and 100 characters"),
  body("subject")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Subject must be between 3 and 200 characters"),
  body("content")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 10000 })
    .withMessage("Content must be between 10 and 10,000 characters"),
  body("variables")
    .optional()
    .isArray()
    .withMessage("Variables must be an array"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  handleValidationErrors,
];

// Notification preferences validation
const validateNotificationPreferences = [
  body("userId")
    .isMongoId()
    .withMessage("Valid user ID required"),
  body("email")
    .optional()
    .isBoolean()
    .withMessage("Email preference must be a boolean"),
  body("sms")
    .optional()
    .isBoolean()
    .withMessage("SMS preference must be a boolean"),
  body("push")
    .optional()
    .isBoolean()
    .withMessage("Push preference must be a boolean"),
  body("categories")
    .optional()
    .isObject()
    .withMessage("Categories must be an object"),
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
    .isIn(["pending", "sent", "failed", "delivered", "read"])
    .withMessage("Invalid status filter"),
  query("channel")
    .optional()
    .isIn(["email", "sms", "push"])
    .withMessage("Invalid channel filter"),
  query("priority")
    .optional()
    .isIn(["low", "normal", "high", "urgent"])
    .withMessage("Invalid priority filter"),
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

// Device token validation
const validateDeviceToken = [
  body("userId")
    .isMongoId()
    .withMessage("Valid user ID required"),
  body("token")
    .isString()
    .trim()
    .isLength({ min: 32, max: 500 })
    .withMessage("Device token must be between 32 and 500 characters"),
  body("platform")
    .isIn(["ios", "android", "web"])
    .withMessage("Invalid platform"),
  body("appVersion")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("App version must be between 1 and 50 characters"),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateEmailNotification,
  validateSMSNotification,
  validatePushNotification,
  validateBulkNotification,
  validateTemplateCreation,
  validateTemplateUpdate,
  validateNotificationPreferences,
  validateQueryParams,
  validateDeviceToken,
};
