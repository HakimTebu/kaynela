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

// Payment creation validation
const validatePaymentCreation = [
  body("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),
  body("amount")
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage("Amount must be between 0.01 and 1,000,000"),
  body("currency")
    .isIn(["USD", "EUR", "GBP", "KES", "UGX", "TZS"])
    .withMessage("Invalid currency"),
  body("paymentMethod")
    .isIn(["mobile_money", "credit_card", "debit_card", "bank_transfer", "cash"])
    .withMessage("Invalid payment method"),
  body("paymentProvider")
    .isIn(["stripe", "razorpay", "mpesa", "airtel_money", "bank"])
    .withMessage("Invalid payment provider"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Description must be between 3 and 200 characters"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
  handleValidationErrors,
];

// Payment method validation
const validatePaymentMethod = [
  body("type")
    .isIn(["mobile_money", "credit_card", "debit_card", "bank_transfer", "cash"])
    .withMessage("Invalid payment method type"),
  body("provider")
    .isIn(["stripe", "razorpay", "mpesa", "airtel_money", "bank"])
    .withMessage("Invalid payment provider"),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
  handleValidationErrors,
];

// Refund validation
const validateRefundCreation = [
  body("transactionId")
    .isMongoId()
    .withMessage("Invalid transaction ID"),
  body("amount")
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage("Amount must be between 0.01 and 1,000,000"),
  body("reason")
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Refund reason must be between 3 and 200 characters"),
  body("refundType")
    .isIn(["full", "partial"])
    .withMessage("Invalid refund type"),
  handleValidationErrors,
];

// Transaction query validation
const validateTransactionQuery = [
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
    .isIn(["pending", "processing", "completed", "failed", "cancelled", "refunded"])
    .withMessage("Invalid status filter"),
  query("paymentMethod")
    .optional()
    .isIn(["mobile_money", "credit_card", "debit_card", "bank_transfer", "cash"])
    .withMessage("Invalid payment method filter"),
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

// Payment method update validation
const validatePaymentMethodUpdate = [
  param("id")
    .isMongoId()
    .withMessage("Invalid payment method ID"),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
  handleValidationErrors,
];

// Webhook validation
const validateWebhook = [
  body("event")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Event must be between 3 and 100 characters"),
  body("data")
    .isObject()
    .withMessage("Data must be an object"),
  body("timestamp")
    .optional()
    .isISO8601()
    .withMessage("Timestamp must be a valid ISO date"),
  handleValidationErrors,
];

// Payment capture validation
const validatePaymentCapture = [
  param("id")
    .isMongoId()
    .withMessage("Invalid payment ID"),
  body("amount")
    .optional()
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage("Amount must be between 0.01 and 1,000,000"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Description must be between 3 and 200 characters"),
  handleValidationErrors,
];

// Payment cancellation validation
const validatePaymentCancellation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid payment ID"),
  body("reason")
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Cancellation reason must be between 3 and 200 characters"),
  handleValidationErrors,
];

// Payment method deletion validation
const validatePaymentMethodDeletion = [
  param("id")
    .isMongoId()
    .withMessage("Invalid payment method ID"),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validatePaymentCreation,
  validatePaymentMethod,
  validateRefundCreation,
  validateTransactionQuery,
  validatePaymentMethodUpdate,
  validateWebhook,
  validatePaymentCapture,
  validatePaymentCancellation,
  validatePaymentMethodDeletion,
};
