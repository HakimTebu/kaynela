// Reporting Service Constants

// Report Types
const REPORT_TYPES = {
  ANALYTICS: "analytics",
  FINANCIAL: "financial",
  OPERATIONAL: "operational",
  CUSTOMER: "customer",
  INVENTORY: "inventory",
  CUSTOM: "custom",
};

// Report Formats
const REPORT_FORMATS = {
  PDF: "pdf",
  EXCEL: "excel",
  CSV: "csv",
  JSON: "json",
  HTML: "html",
};

// Report Status
const REPORT_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
  SCHEDULED: "scheduled",
  GENERATING: "generating",
  COMPLETED: "completed",
  FAILED: "failed",
};

// Dashboard Types
const DASHBOARD_TYPES = {
  EXECUTIVE: "executive",
  OPERATIONAL: "operational",
  ANALYTICAL: "analytical",
  CUSTOM: "custom",
  SHARED: "shared",
};

// Widget Types
const WIDGET_TYPES = {
  CHART: "chart",
  TABLE: "table",
  METRIC: "metric",
  KPI: "kpi",
  GAUGE: "gauge",
  PROGRESS: "progress",
  TIMELINE: "timeline",
  MAP: "map",
};

// Chart Types
const CHART_TYPES = {
  LINE: "line",
  BAR: "bar",
  PIE: "pie",
  DOUGHNUT: "doughnut",
  AREA: "area",
  SCATTER: "scatter",
  RADAR: "radar",
  POLAR: "polar",
  BUBBLE: "bubble",
  STACKED_BAR: "stacked_bar",
  STACKED_AREA: "stacked_area",
};

// Schedule Frequencies
const SCHEDULE_FREQUENCIES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
  CUSTOM: "custom",
};

// Export Formats
const EXPORT_FORMATS = {
  PDF: "pdf",
  EXCEL: "excel",
  CSV: "csv",
  JSON: "json",
  HTML: "html",
  XML: "xml",
};

// Data Sources
const DATA_SOURCES = {
  BOOKINGS: "bookings",
  PAYMENTS: "payments",
  LOYALTY: "loyalty",
  NOTIFICATIONS: "notifications",
  USERS: "users",
  ACTIVITIES: "activities",
  INVENTORY: "inventory",
  FINANCIAL: "financial",
  CUSTOM: "custom",
};

// Metrics
const METRICS = {
  COUNT: "count",
  SUM: "sum",
  AVERAGE: "average",
  MIN: "min",
  MAX: "max",
  PERCENTAGE: "percentage",
  RATIO: "ratio",
  GROWTH_RATE: "growth_rate",
  TREND: "trend",
};

// Dimensions
const DIMENSIONS = {
  DATE: "date",
  USER: "user",
  LOCATION: "location",
  CATEGORY: "category",
  STATUS: "status",
  PAYMENT_METHOD: "payment_method",
  LOYALTY_TIER: "loyalty_tier",
  ACTIVITY_TYPE: "activity_type",
  SEASON: "season",
  TIME_PERIOD: "time_period",
};

// Filter Operators
const FILTER_OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "not_equals",
  GREATER_THAN: "greater_than",
  LESS_THAN: "less_than",
  GREATER_THAN_EQUALS: "greater_than_equals",
  LESS_THAN_EQUALS: "less_than_equals",
  CONTAINS: "contains",
  NOT_CONTAINS: "not_contains",
  STARTS_WITH: "starts_with",
  ENDS_WITH: "ends_with",
  IN: "in",
  NOT_IN: "not_in",
  BETWEEN: "between",
  IS_NULL: "is_null",
  IS_NOT_NULL: "is_not_null",
};

// Time Periods
const TIME_PERIODS = {
  HOUR: "hour",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
  CUSTOM: "custom",
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  REPORTS: 3600, // 1 hour
  DASHBOARDS: 1800, // 30 minutes
  ANALYTICS: 300, // 5 minutes
  EXPORTS: 7200, // 2 hours
  TEMPLATES: 86400, // 24 hours
};

// Rate Limiting
const RATE_LIMITS = {
  REPORT_GENERATION: 20, // per hour per user
  DATA_EXPORT: 10, // per day per user
  ANALYTICS_QUERY: 50, // per minute per user
  DASHBOARD_ACCESS: 100, // per hour per user
  ADMIN_OPERATIONS: 100, // per hour per IP
};

// Validation Rules
const VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  WIDGETS_MIN_COUNT: 1,
  WIDGETS_MAX_COUNT: 50,
  RECIPIENTS_MIN_COUNT: 1,
  RECIPIENTS_MAX_COUNT: 100,
  FILTERS_MAX_COUNT: 20,
  METRICS_MAX_COUNT: 10,
  DIMENSIONS_MAX_COUNT: 5,
};

// Business Rules
const BUSINESS_RULES = {
  MAX_REPORTS_PER_USER: 100,
  MAX_DASHBOARDS_PER_USER: 50,
  MAX_SCHEDULED_REPORTS_PER_USER: 20,
  MAX_EXPORT_SIZE_MB: 100,
  REPORT_GENERATION_TIMEOUT_MINUTES: 30,
  EXPORT_PROCESSING_TIMEOUT_MINUTES: 15,
  DATA_RETENTION_DAYS: 1095, // 3 years
  MAX_CONCURRENT_REPORTS: 5,
};

// Error Messages
const ERROR_MESSAGES = {
  REPORT_NOT_FOUND: "Report not found",
  DASHBOARD_NOT_FOUND: "Dashboard not found",
  TEMPLATE_NOT_FOUND: "Report template not found",
  INVALID_REPORT_TYPE: "Invalid report type",
  INVALID_EXPORT_FORMAT: "Invalid export format",
  REPORT_GENERATION_FAILED: "Report generation failed",
  EXPORT_PROCESSING_FAILED: "Export processing failed",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  DATA_SOURCE_UNAVAILABLE: "Data source unavailable",
  SCHEDULE_CONFLICT: "Schedule conflict detected",
};

// Success Messages
const SUCCESS_MESSAGES = {
  REPORT_CREATED: "Report created successfully",
  REPORT_UPDATED: "Report updated successfully",
  REPORT_DELETED: "Report deleted successfully",
  REPORT_GENERATED: "Report generated successfully",
  EXPORT_COMPLETED: "Export completed successfully",
  DASHBOARD_CREATED: "Dashboard created successfully",
  DASHBOARD_UPDATED: "Dashboard updated successfully",
  DASHBOARD_DELETED: "Dashboard deleted successfully",
  SCHEDULE_CREATED: "Schedule created successfully",
  TEMPLATE_SAVED: "Template saved successfully",
};

// Security Constants
const SECURITY = {
  MAX_FILE_SIZE_MB: 50,
  ALLOWED_FILE_TYPES: ["pdf", "xlsx", "csv", "json", "html"],
  API_KEY_HEADER: "X-API-Key",
  WEBHOOK_SIGNATURE_HEADER: "X-Webhook-Signature",
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MINUTES: 5,
};

// Notification Types
const NOTIFICATION_TYPES = {
  REPORT_READY: "report_ready",
  EXPORT_COMPLETED: "export_completed",
  SCHEDULED_REPORT: "scheduled_report",
  REPORT_FAILED: "report_failed",
  EXPORT_FAILED: "export_failed",
  DASHBOARD_SHARED: "dashboard_shared",
  TEMPLATE_UPDATED: "template_updated",
};

module.exports = {
  REPORT_TYPES,
  REPORT_FORMATS,
  REPORT_STATUS,
  DASHBOARD_TYPES,
  WIDGET_TYPES,
  CHART_TYPES,
  SCHEDULE_FREQUENCIES,
  EXPORT_FORMATS,
  DATA_SOURCES,
  METRICS,
  DIMENSIONS,
  FILTER_OPERATORS,
  TIME_PERIODS,
  PAGINATION,
  CACHE_TTL,
  RATE_LIMITS,
  VALIDATION,
  BUSINESS_RULES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  SECURITY,
  NOTIFICATION_TYPES,
};
