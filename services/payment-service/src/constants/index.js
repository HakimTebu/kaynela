// Payment Service Constants

// Payment Methods
const PAYMENT_METHODS = {
  MOBILE_MONEY: "mobile_money",
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
  BANK_TRANSFER: "bank_transfer",
  CASH: "cash",
};

// Payment Providers
const PAYMENT_PROVIDERS = {
  STRIPE: "stripe",
  RAZORPAY: "razorpay",
  MPESA: "mpesa",
  AIRTEL_MONEY: "airtel_money",
  BANK: "bank",
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
};

// Transaction Types
const TRANSACTION_TYPES = {
  PAYMENT: "payment",
  REFUND: "refund",
  CHARGEBACK: "chargeback",
  DISPUTE: "dispute",
  FEE: "fee",
  ADJUSTMENT: "adjustment",
};

// Refund Types
const REFUND_TYPES = {
  FULL: "full",
  PARTIAL: "partial",
};

// Refund Reasons
const REFUND_REASONS = {
  CUSTOMER_REQUEST: "customer_request",
  DUPLICATE_CHARGE: "duplicate_charge",
  FRAUDULENT_CHARGE: "fraudulent_charge",
  PRODUCT_NOT_RECEIVED: "product_not_received",
  PRODUCT_DEFECTIVE: "product_defective",
  SERVICE_NOT_PROVIDED: "service_not_provided",
  CANCELLATION: "cancellation",
  OTHER: "other",
};

// Currencies
const CURRENCIES = {
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
  KES: "KES", // Kenyan Shilling
  UGX: "UGX", // Ugandan Shilling
  TZS: "TZS", // Tanzanian Shilling
};

// Payment Method Status
const PAYMENT_METHOD_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  EXPIRED: "expired",
  SUSPENDED: "suspended",
};

// Webhook Events
const WEBHOOK_EVENTS = {
  PAYMENT_INTENT_SUCCEEDED: "payment_intent.succeeded",
  PAYMENT_INTENT_FAILED: "payment_intent.failed",
  PAYMENT_INTENT_CANCELLED: "payment_intent.cancelled",
  CHARGE_SUCCEEDED: "charge.succeeded",
  CHARGE_FAILED: "charge.failed",
  CHARGE_REFUNDED: "charge.refunded",
  DISPUTE_CREATED: "dispute.created",
  DISPUTE_CLOSED: "dispute.closed",
};

// Mobile Money Providers
const MOBILE_MONEY_PROVIDERS = {
  MPESA: "mpesa",
  AIRTEL_MONEY: "airtel_money",
  MTN_MOBILE_MONEY: "mtn_mobile_money",
  ORANGE_MONEY: "orange_money",
};

// Card Types
const CARD_TYPES = {
  VISA: "visa",
  MASTERCARD: "mastercard",
  AMEX: "amex",
  DISCOVER: "discover",
  JCB: "jcb",
  UNIONPAY: "unionpay",
};

// Bank Transfer Types
const BANK_TRANSFER_TYPES = {
  LOCAL_TRANSFER: "local_transfer",
  INTERNATIONAL_TRANSFER: "international_transfer",
  SEPA: "sepa",
  SWIFT: "swift",
  ACH: "ach",
};

// Fee Types
const FEE_TYPES = {
  PROCESSING_FEE: "processing_fee",
  TRANSACTION_FEE: "transaction_fee",
  CURRENCY_CONVERSION_FEE: "currency_conversion_fee",
  REFUND_FEE: "refund_fee",
  CHARGEBACK_FEE: "chargeback_fee",
  LATE_FEE: "late_fee",
};

// Dispute Status
const DISPUTE_STATUS = {
  OPEN: "open",
  UNDER_REVIEW: "under_review",
  CLOSED: "closed",
  WON: "won",
  LOST: "lost",
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  PAYMENT_METHODS: 3600, // 1 hour
  TRANSACTION_HISTORY: 300, // 5 minutes
  PAYMENT_STATUS: 60, // 1 minute
  USER_PAYMENT_METHODS: 1800, // 30 minutes
  ANALYTICS: 3600, // 1 hour
};

// Rate Limiting
const RATE_LIMITS = {
  PAYMENT_PROCESSING: 20, // per hour per user
  REFUND_REQUESTS: 5, // per day per user
  PAYMENT_METHOD_CREATION: 10, // per hour per user
  WEBHOOK_CALLS: 100, // per minute per IP
  ADMIN_OPERATIONS: 100, // per hour per IP
};

// Validation Rules
const VALIDATION = {
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 1000000,
  DESCRIPTION_MIN_LENGTH: 3,
  DESCRIPTION_MAX_LENGTH: 200,
  REASON_MIN_LENGTH: 3,
  REASON_MAX_LENGTH: 200,
  METADATA_MAX_KEYS: 50,
  METADATA_MAX_VALUE_LENGTH: 1000,
};

// Business Rules
const BUSINESS_RULES = {
  MIN_PAYMENT_AMOUNT: 0.01,
  MAX_PAYMENT_AMOUNT: 1000000,
  MAX_REFUND_AMOUNT: 1000000,
  PAYMENT_TIMEOUT_MINUTES: 30,
  REFUND_PROCESSING_DAYS: 3,
  CHARGEBACK_WINDOW_DAYS: 90,
  DISPUTE_RESPONSE_DAYS: 7,
};

// Error Messages
const ERROR_MESSAGES = {
  INSUFFICIENT_FUNDS: "Insufficient funds for this transaction",
  PAYMENT_METHOD_NOT_FOUND: "Payment method not found",
  TRANSACTION_NOT_FOUND: "Transaction not found",
  INVALID_AMOUNT: "Invalid payment amount",
  PAYMENT_ALREADY_PROCESSED: "Payment has already been processed",
  REFUND_AMOUNT_EXCEEDS_PAYMENT: "Refund amount cannot exceed original payment",
  PAYMENT_METHOD_EXPIRED: "Payment method has expired",
  TRANSACTION_TIMED_OUT: "Transaction has timed out",
  INVALID_CURRENCY: "Invalid currency for this payment method",
  WEBHOOK_SIGNATURE_INVALID: "Invalid webhook signature",
};

// Success Messages
const SUCCESS_MESSAGES = {
  PAYMENT_PROCESSED: "Payment processed successfully",
  PAYMENT_COMPLETED: "Payment completed successfully",
  REFUND_PROCESSED: "Refund processed successfully",
  PAYMENT_METHOD_CREATED: "Payment method created successfully",
  PAYMENT_METHOD_UPDATED: "Payment method updated successfully",
  PAYMENT_METHOD_DELETED: "Payment method deleted successfully",
  WEBHOOK_PROCESSED: "Webhook processed successfully",
};

// Security Constants
const SECURITY = {
  WEBHOOK_SIGNATURE_HEADER: "X-Webhook-Signature",
  WEBHOOK_TOLERANCE_SECONDS: 300, // 5 minutes
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MINUTES: 5,
};

// Notification Types
const NOTIFICATION_TYPES = {
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILURE: "payment_failure",
  REFUND_PROCESSED: "refund_processed",
  PAYMENT_METHOD_ADDED: "payment_method_added",
  PAYMENT_METHOD_EXPIRED: "payment_method_expired",
  DISPUTE_CREATED: "dispute_created",
  CHARGEBACK_RECEIVED: "chargeback_received",
};

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUS,
  TRANSACTION_TYPES,
  REFUND_TYPES,
  REFUND_REASONS,
  CURRENCIES,
  PAYMENT_METHOD_STATUS,
  WEBHOOK_EVENTS,
  MOBILE_MONEY_PROVIDERS,
  CARD_TYPES,
  BANK_TRANSFER_TYPES,
  FEE_TYPES,
  DISPUTE_STATUS,
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
