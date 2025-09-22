// Ticketing Service Constants

// Ticket Types
const TICKET_TYPES = {
  GENERAL: "general",
  VIP: "vip",
  STUDENT: "student",
  SENIOR: "senior",
  CHILD: "child",
  FAMILY: "family",
};

// Ticket Status
const TICKET_STATUS = {
  ACTIVE: "active",
  USED: "used",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  REFUNDED: "refunded",
  TRANSFERRED: "transferred",
  PENDING: "pending",
  RESERVED: "reserved",
};

// Event Types
const EVENT_TYPES = {
  FARM_TOUR: "farm_tour",
  WORKSHOP: "workshop",
  FESTIVAL: "festival",
  DINING: "dining",
  ACTIVITY: "activity",
  CONCERT: "concert",
  EXHIBITION: "exhibition",
  EDUCATIONAL: "educational",
  RECREATIONAL: "recreational",
  CULTURAL: "cultural",
};

// Event Status
const EVENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ACTIVE: "active",
  INACTIVE: "inactive",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  SOLD_OUT: "sold_out",
  UPCOMING: "upcoming",
  ONGOING: "ongoing",
  PAST: "past",
};

// QR Code Formats
const QR_CODE_FORMATS = {
  PNG: "png",
  SVG: "svg",
  PDF: "pdf",
};

// QR Code Sizes
const QR_CODE_SIZES = {
  SMALL: 100,
  MEDIUM: 300,
  LARGE: 500,
  EXTRA_LARGE: 1000,
};

// Ticket Categories
const TICKET_CATEGORIES = {
  ADULT: "adult",
  CHILD: "child",
  SENIOR: "senior",
  STUDENT: "student",
  FAMILY: "family",
  GROUP: "group",
  CORPORATE: "corporate",
  VIP: "vip",
  PREMIUM: "premium",
  STANDARD: "standard",
};

// Event Categories
const EVENT_CATEGORIES = {
  AGRICULTURE: "agriculture",
  TOURISM: "tourism",
  EDUCATION: "education",
  ENTERTAINMENT: "entertainment",
  FOOD: "food",
  CULTURE: "culture",
  NATURE: "nature",
  ADVENTURE: "adventure",
  WELLNESS: "wellness",
  SHOPPING: "shopping",
};

// Venue Types
const VENUE_TYPES = {
  INDOOR: "indoor",
  OUTDOOR: "outdoor",
  MIXED: "mixed",
  FARM: "farm",
  BARN: "barn",
  FIELD: "field",
  GARDEN: "garden",
  WORKSHOP: "workshop",
  RESTAURANT: "restaurant",
  AMPHITHEATER: "amphitheater",
};

// Payment Methods
const PAYMENT_METHODS = {
  CASH: "cash",
  CARD: "card",
  MOBILE_MONEY: "mobile_money",
  BANK_TRANSFER: "bank_transfer",
  ONLINE: "online",
  INVOICE: "invoice",
};

// Ticket Validation Results
const VALIDATION_RESULTS = {
  VALID: "valid",
  INVALID: "invalid",
  ALREADY_USED: "already_used",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  NOT_FOUND: "not_found",
  DUPLICATE: "duplicate",
};

// Seat Types
const SEAT_TYPES = {
  ASSIGNED: "assigned",
  GENERAL_ADMISSION: "general_admission",
  STANDING: "standing",
  WHEELCHAIR_ACCESSIBLE: "wheelchair_accessible",
  VIP: "vip",
  PREMIUM: "premium",
};

// Event Duration Types
const EVENT_DURATION_TYPES = {
  SINGLE_DAY: "single_day",
  MULTI_DAY: "multi_day",
  RECURRING: "recurring",
  SEASONAL: "seasonal",
  ONGOING: "ongoing",
};

// Ticket Transfer Status
const TRANSFER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
};

// Refund Reasons
const REFUND_REASONS = {
  CANCELLATION: "cancellation",
  POSTPONEMENT: "postponement",
  DUPLICATE_PURCHASE: "duplicate_purchase",
  TECHNICAL_ISSUE: "technical_issue",
  CUSTOMER_REQUEST: "customer_request",
  EVENT_CANCELLED: "event_cancelled",
  MEDICAL_EMERGENCY: "medical_emergency",
  TRAVEL_ISSUE: "travel_issue",
  OTHER: "other",
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  TICKETS: 1800, // 30 minutes
  EVENTS: 3600, // 1 hour
  QR_CODES: 7200, // 2 hours
  USER_TICKETS: 900, // 15 minutes
  EVENT_DETAILS: 1800, // 30 minutes
  VALIDATION_RESULTS: 300, // 5 minutes
};

// Rate Limiting
const RATE_LIMITS = {
  TICKET_GENERATION: 50, // per hour per user
  QRCODE_GENERATION: 100, // per hour per user
  EVENT_CREATION: 10, // per day per user
  TICKET_VALIDATION: 200, // per minute per user
  ADMIN_OPERATIONS: 100, // per hour per IP
};

// Validation Rules
const VALIDATION = {
  TICKET_NAME_MIN_LENGTH: 2,
  TICKET_NAME_MAX_LENGTH: 50,
  EVENT_NAME_MIN_LENGTH: 3,
  EVENT_NAME_MAX_LENGTH: 200,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 2000,
  VENUE_MIN_LENGTH: 3,
  VENUE_MAX_LENGTH: 200,
  SPECIAL_REQUESTS_MAX_LENGTH: 500,
  QR_CODE_MIN_LENGTH: 10,
  QR_CODE_MAX_LENGTH: 1000,
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 10000,
  PRICE_MIN: 0,
  PRICE_MAX: 10000,
  QUANTITY_MIN: 1,
  QUANTITY_MAX: 10,
};

// Business Rules
const BUSINESS_RULES = {
  MAX_TICKETS_PER_USER: 10,
  MAX_EVENTS_PER_ORGANIZER: 100,
  TICKET_EXPIRY_DAYS: 365,
  QR_CODE_EXPIRY_DAYS: 30,
  MIN_EVENT_NOTICE_HOURS: 24,
  MAX_EVENT_DURATION_DAYS: 30,
  REFUND_WINDOW_HOURS: 48,
  TRANSFER_WINDOW_HOURS: 24,
  CANCELLATION_WINDOW_HOURS: 72,
};

// Error Messages
const ERROR_MESSAGES = {
  TICKET_NOT_FOUND: "Ticket not found",
  EVENT_NOT_FOUND: "Event not found",
  INVALID_TICKET_TYPE: "Invalid ticket type",
  INVALID_EVENT_TYPE: "Invalid event type",
  TICKET_ALREADY_USED: "Ticket has already been used",
  TICKET_EXPIRED: "Ticket has expired",
  EVENT_SOLD_OUT: "Event is sold out",
  INSUFFICIENT_CAPACITY: "Insufficient capacity for requested tickets",
  INVALID_QR_CODE: "Invalid QR code",
  TICKET_GENERATION_FAILED: "Ticket generation failed",
  QR_CODE_GENERATION_FAILED: "QR code generation failed",
  EVENT_VALIDATION_FAILED: "Event validation failed",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  TICKET_TRANSFER_FAILED: "Ticket transfer failed",
  REFUND_PROCESSING_FAILED: "Refund processing failed",
};

// Success Messages
const SUCCESS_MESSAGES = {
  TICKET_CREATED: "Ticket created successfully",
  TICKET_UPDATED: "Ticket updated successfully",
  TICKET_DELETED: "Ticket deleted successfully",
  TICKET_VALIDATED: "Ticket validated successfully",
  TICKET_CANCELLED: "Ticket cancelled successfully",
  EVENT_CREATED: "Event created successfully",
  EVENT_UPDATED: "Event updated successfully",
  EVENT_DELETED: "Event deleted successfully",
  QR_CODE_GENERATED: "QR code generated successfully",
  QR_CODE_VALIDATED: "QR code validated successfully",
  TICKET_TRANSFERRED: "Ticket transferred successfully",
  REFUND_PROCESSED: "Refund processed successfully",
  BULK_OPERATION_COMPLETED: "Bulk operation completed successfully",
};

// Security Constants
const SECURITY = {
  QR_CODE_SECRET_KEY: "kainella-qr-secret",
  TICKET_HASH_ALGORITHM: "sha256",
  MAX_LOGIN_ATTEMPTS: 5,
  SESSION_TIMEOUT_MINUTES: 30,
  API_KEY_HEADER: "X-API-Key",
  WEBHOOK_SIGNATURE_HEADER: "X-Webhook-Signature",
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MINUTES: 5,
};

// Notification Types
const NOTIFICATION_TYPES = {
  TICKET_CREATED: "ticket_created",
  TICKET_UPDATED: "ticket_updated",
  TICKET_CANCELLED: "ticket_cancelled",
  EVENT_REMINDER: "event_reminder",
  EVENT_CANCELLED: "event_cancelled",
  EVENT_POSTPONED: "event_postponed",
  TICKET_VALIDATED: "ticket_validated",
  QR_CODE_GENERATED: "qr_code_generated",
  REFUND_PROCESSED: "refund_processed",
  TRANSFER_REQUESTED: "transfer_requested",
  TRANSFER_APPROVED: "transfer_approved",
  TRANSFER_REJECTED: "transfer_rejected",
};

module.exports = {
  TICKET_TYPES,
  TICKET_STATUS,
  EVENT_TYPES,
  EVENT_STATUS,
  QR_CODE_FORMATS,
  QR_CODE_SIZES,
  TICKET_CATEGORIES,
  EVENT_CATEGORIES,
  VENUE_TYPES,
  PAYMENT_METHODS,
  VALIDATION_RESULTS,
  SEAT_TYPES,
  EVENT_DURATION_TYPES,
  TRANSFER_STATUS,
  REFUND_REASONS,
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
