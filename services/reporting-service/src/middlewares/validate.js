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

// Report creation validation
const validateReportCreation = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Report name must be between 3 and 100 characters"),
  body("type")
    .isIn(["analytics", "financial", "operational", "customer", "inventory", "custom"])
    .withMessage("Invalid report type"),
  body("format")
    .isIn(["pdf", "excel", "csv", "json", "html"])
    .withMessage("Invalid report format"),
  body("schedule")
    .optional()
    .isObject()
    .withMessage("Schedule must be an object"),
  body("filters")
    .optional()
    .isObject()
    .withMessage("Filters must be an object"),
  handleValidationErrors,
];

// Report update validation
const validateReportUpdate = [
  param("id")
    .isMongoId()
    .withMessage("Invalid report ID"),
  body("name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Report name must be between 3 and 100 characters"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  handleValidationErrors,
];

// Analytics query validation
const validateAnalyticsQuery = [
  query("startDate")
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate")
    .isISO8601()
    .withMessage("End date must be a valid ISO date"),
  query("metrics")
    .optional()
    .isArray()
    .withMessage("Metrics must be an array"),
  query("dimensions")
    .optional()
    .isArray()
    .withMessage("Dimensions must be an array"),
  query("filters")
    .optional()
    .isObject()
    .withMessage("Filters must be an object"),
  handleValidationErrors,
];

// Dashboard creation validation
const validateDashboardCreation = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Dashboard name must be between 3 and 100 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be less than 500 characters"),
  body("widgets")
    .isArray({ min: 1 })
    .withMessage("Dashboard must have at least one widget"),
  body("layout")
    .optional()
    .isObject()
    .withMessage("Layout must be an object"),
  handleValidationErrors,
];

// Export request validation
const validateExportRequest = [
  body("reportType")
    .isIn(["analytics", "financial", "operational", "customer", "inventory", "custom"])
    .withMessage("Invalid report type"),
  body("format")
    .isIn(["pdf", "excel", "csv", "json", "html"])
    .withMessage("Invalid export format"),
  body("filters")
    .optional()
    .isObject()
    .withMessage("Filters must be an object"),
  body("dateRange")
    .optional()
    .isObject()
    .withMessage("Date range must be an object"),
  handleValidationErrors,
];

// Scheduled report validation
const validateScheduledReport = [
  body("reportId")
    .isMongoId()
    .withMessage("Invalid report ID"),
  body("schedule")
    .isObject()
    .withMessage("Schedule must be an object"),
  body("schedule.frequency")
    .isIn(["daily", "weekly", "monthly", "quarterly", "yearly"])
    .withMessage("Invalid schedule frequency"),
  body("schedule.time")
    .isString()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Schedule time must be in HH:MM format"),
  body("recipients")
    .isArray({ min: 1 })
    .withMessage("Must have at least one recipient"),
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
  handleValidationErrors,
];

// Report template validation
const validateReportTemplate = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Template name must be between 3 and 100 characters"),
  body("category")
    .isIn(["financial", "operational", "customer", "inventory", "marketing", "custom"])
    .withMessage("Invalid template category"),
  body("template")
    .isObject()
    .withMessage("Template must be an object"),
  body("isPublic")
    .optional()
    .isBoolean()
    .withMessage("isPublic must be a boolean"),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateReportCreation,
  validateReportUpdate,
  validateAnalyticsQuery,
  validateDashboardCreation,
  validateExportRequest,
  validateScheduledReport,
  validateQueryParams,
  validateReportTemplate,
};
