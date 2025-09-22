// Notification Service Constants

// Notification Channels
const NOTIFICATION_CHANNELS = {
  EMAIL: "email",
  SMS: "sms",
  PUSH: "push",
  ALL: "all",
};

// Notification Status
const NOTIFICATION_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
  DELIVERED: "delivered",
  READ: "read",
  CANCELLED: "cancelled",
};

// Notification Priority
const NOTIFICATION_PRIORITY = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
};

// Template Types
const TEMPLATE_TYPES = {
  EMAIL: "email",
  SMS: "sms",
  PUSH: "push",
};

// Email Categories
const EMAIL_CATEGORIES = {
  WELCOME: "welcome",
  BOOKING_CONFIRMATION: "booking_confirmation",
  BOOKING_REMINDER: "booking_reminder",
  BOOKING_CANCELLATION: "booking_cancellation",
  LOYALTY_POINTS: "loyalty_points",
  TIER_UPGRADE: "tier_upgrade",
  REWARD_REDEMPTION: "reward_redemption",
  FARM_ACTIVITY: "farm_activity",
  EVENT_NOTIFICATION: "event_notification",
  PAYMENT_CONFIRMATION: "payment_confirmation",
  PAYMENT_FAILED: "payment_failed",
  PASSWORD_RESET: "password_reset",
  EMAIL_VERIFICATION: "email_verification",
  MARKETING: "marketing",
  SYSTEM_UPDATE: "system_update",
  MAINTENANCE: "maintenance",
};

// SMS Categories
const SMS_CATEGORIES = {
  BOOKING_CONFIRMATION: "booking_confirmation",
  BOOKING_REMINDER: "booking_reminder",
  BOOKING_CANCELLATION: "booking_cancellation",
  LOYALTY_POINTS: "loyalty_points",
  TIER_UPGRADE: "tier_upgrade",
  REWARD_REDEMPTION: "reward_redemption",
  FARM_ACTIVITY: "farm_activity",
  EVENT_NOTIFICATION: "event_notification",
  PAYMENT_CONFIRMATION: "payment_confirmation",
  PAYMENT_FAILED: "payment_failed",
  OTP: "otp",
  MARKETING: "marketing",
  SYSTEM_UPDATE: "system_update",
  MAINTENANCE: "maintenance",
};

// Push Notification Categories
const PUSH_CATEGORIES = {
  BOOKING_CONFIRMATION: "booking_confirmation",
  BOOKING_REMINDER: "booking_reminder",
  BOOKING_CANCELLATION: "booking_cancellation",
  LOYALTY_POINTS: "loyalty_points",
  TIER_UPGRADE: "tier_upgrade",
  REWARD_REDEMPTION: "reward_redemption",
  FARM_ACTIVITY: "farm_activity",
  EVENT_NOTIFICATION: "event_notification",
  PAYMENT_CONFIRMATION: "payment_confirmation",
  PAYMENT_FAILED: "payment_failed",
  FARM_VISIT: "farm_visit",
  ACTIVITY_UPDATE: "activity_update",
  SPECIAL_OFFER: "special_offer",
  MARKETING: "marketing",
  SYSTEM_UPDATE: "system_update",
};

// Platform Types
const PLATFORM_TYPES = {
  IOS: "ios",
  ANDROID: "android",
  WEB: "web",
};

// Email Providers
const EMAIL_PROVIDERS = {
  SMTP: "smtp",
  SENDGRID: "sendgrid",
  MAILGUN: "mailgun",
  SES: "ses",
  MAILCHIMP: "mailchimp",
};

// SMS Providers
const SMS_PROVIDERS = {
  TWILIO: "twilio",
  AWS_SNS: "aws_sns",
  MESSAGEBIRD: "messagebird",
  NEXMO: "nexmo",
  AFRICASTALKING: "africastalking",
};

// Push Notification Providers
const PUSH_PROVIDERS = {
  FIREBASE: "firebase",
  APNS: "apns",
  WEB_PUSH: "web_push",
  ONESIGNAL: "onesignal",
};

// Template Variables
const TEMPLATE_VARIABLES = {
  USER_NAME: "{{user_name}}",
  USER_EMAIL: "{{user_email}}",
  USER_PHONE: "{{user_phone}}",
  BOOKING_ID: "{{booking_id}}",
  BOOKING_DATE: "{{booking_date}}",
  BOOKING_TIME: "{{booking_time}}",
  ACTIVITY_NAME: "{{activity_name}}",
  FARM_NAME: "{{farm_name}}",
  LOYALTY_POINTS: "{{loyalty_points}}",
  LOYALTY_TIER: "{{loyalty_tier}}",
  REWARD_NAME: "{{reward_name}}",
  PAYMENT_AMOUNT: "{{payment_amount}}",
  PAYMENT_STATUS: "{{payment_status}}",
  EVENT_NAME: "{{event_name}}",
  EVENT_DATE: "{{event_date}}",
  EVENT_TIME: "{{event_time}}",
  FARM_ADDRESS: "{{farm_address}}",
  CONTACT_PHONE: "{{contact_phone}}",
  CONTACT_EMAIL: "{{contact_email}}",
  WEBSITE_URL: "{{website_url}}",
  APP_URL: "{{app_url}}",
  UNSUBSCRIBE_URL: "{{unsubscribe_url}}",
  RESET_PASSWORD_URL: "{{reset_password_url}}",
  VERIFY_EMAIL_URL: "{{verify_email_url}}",
};

// Rate Limiting
const RATE_LIMITS = {
  EMAIL_PER_HOUR: 50,
  SMS_PER_HOUR: 20,
  PUSH_PER_HOUR: 100,
  BULK_NOTIFICATIONS_PER_DAY: 5,
  TEMPLATE_OPERATIONS_PER_HOUR: 30,
  PREFERENCES_UPDATE_PER_HOUR: 10,
  DEVICE_TOKEN_OPERATIONS_PER_HOUR: 20,
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  TEMPLATE: 3600, // 1 hour
  USER_PREFERENCES: 1800, // 30 minutes
  DEVICE_TOKENS: 7200, // 2 hours
  NOTIFICATION_HISTORY: 300, // 5 minutes
  TEMPLATE_VARIABLES: 86400, // 24 hours
  PROVIDER_CONFIG: 3600, // 1 hour
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Validation Rules
const VALIDATION = {
  EMAIL_SUBJECT_MIN_LENGTH: 3,
  EMAIL_SUBJECT_MAX_LENGTH: 200,
  EMAIL_CONTENT_MIN_LENGTH: 10,
  EMAIL_CONTENT_MAX_LENGTH: 10000,
  SMS_MESSAGE_MIN_LENGTH: 1,
  SMS_MESSAGE_MAX_LENGTH: 160,
  PUSH_TITLE_MIN_LENGTH: 1,
  PUSH_TITLE_MAX_LENGTH: 100,
  PUSH_BODY_MIN_LENGTH: 1,
  PUSH_BODY_MAX_LENGTH: 500,
  TEMPLATE_NAME_MIN_LENGTH: 3,
  TEMPLATE_NAME_MAX_LENGTH: 100,
  DEVICE_TOKEN_MIN_LENGTH: 32,
  DEVICE_TOKEN_MAX_LENGTH: 500,
  APP_VERSION_MAX_LENGTH: 50,
};

// Error Messages
const ERROR_MESSAGES = {
  INVALID_EMAIL: "Invalid email address",
  INVALID_PHONE: "Invalid phone number",
  INVALID_TEMPLATE: "Invalid template",
  TEMPLATE_NOT_FOUND: "Template not found",
  USER_NOT_FOUND: "User not found",
  DEVICE_TOKEN_NOT_FOUND: "Device token not found",
  INVALID_CHANNEL: "Invalid notification channel",
  INVALID_PRIORITY: "Invalid priority level",
  INVALID_STATUS: "Invalid status",
  TEMPLATE_VARIABLES_MISSING: "Required template variables missing",
  PROVIDER_NOT_CONFIGURED: "Notification provider not configured",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  INVALID_RECIPIENTS: "Invalid recipients list",
  BULK_NOTIFICATION_LIMIT_EXCEEDED: "Bulk notification limit exceeded",
  TEMPLATE_ALREADY_EXISTS: "Template with this name already exists",
  INVALID_TEMPLATE_TYPE: "Invalid template type",
  CONTENT_TOO_LONG: "Content exceeds maximum length",
  INVALID_PLATFORM: "Invalid platform type",
  DEVICE_TOKEN_ALREADY_EXISTS: "Device token already registered",
};

// Success Messages
const SUCCESS_MESSAGES = {
  EMAIL_SENT: "Email sent successfully",
  SMS_SENT: "SMS sent successfully",
  PUSH_SENT: "Push notification sent successfully",
  BULK_NOTIFICATION_SENT: "Bulk notification sent successfully",
  TEMPLATE_CREATED: "Template created successfully",
  TEMPLATE_UPDATED: "Template updated successfully",
  TEMPLATE_DELETED: "Template deleted successfully",
  PREFERENCES_UPDATED: "Notification preferences updated successfully",
  DEVICE_TOKEN_REGISTERED: "Device token registered successfully",
  DEVICE_TOKEN_UPDATED: "Device token updated successfully",
  DEVICE_TOKEN_DELETED: "Device token deleted successfully",
};

// Notification Events
const NOTIFICATION_EVENTS = {
  USER_REGISTERED: "user.registered",
  BOOKING_CREATED: "booking.created",
  BOOKING_CONFIRMED: "booking.confirmed",
  BOOKING_CANCELLED: "booking.cancelled",
  BOOKING_REMINDER: "booking.reminder",
  LOYALTY_POINTS_EARNED: "loyalty.points.earned",
  LOYALTY_TIER_UPGRADED: "loyalty.tier.upgraded",
  REWARD_REDEEMED: "reward.redeemed",
  PAYMENT_CONFIRMED: "payment.confirmed",
  PAYMENT_FAILED: "payment.failed",
  FARM_ACTIVITY_UPDATE: "farm.activity.update",
  EVENT_NOTIFICATION: "event.notification",
  SYSTEM_MAINTENANCE: "system.maintenance",
  SYSTEM_UPDATE: "system.update",
};

// Template Categories
const TEMPLATE_CATEGORIES = {
  BOOKING: "booking",
  LOYALTY: "loyalty",
  PAYMENT: "payment",
  FARM_ACTIVITY: "farm_activity",
  EVENT: "event",
  SYSTEM: "system",
  MARKETING: "marketing",
  SECURITY: "security",
};

// Notification Preferences
const NOTIFICATION_PREFERENCES = {
  EMAIL: "email",
  SMS: "sms",
  PUSH: "push",
  IN_APP: "in_app",
  NONE: "none",
};

// Delivery Attempts
const DELIVERY_ATTEMPTS = {
  MAX_ATTEMPTS: 3,
  RETRY_DELAY: 300000, // 5 minutes in milliseconds
  BACKOFF_MULTIPLIER: 2,
};

// Notification Expiry
const NOTIFICATION_EXPIRY = {
  EMAIL: 7 * 24 * 60 * 60 * 1000, // 7 days
  SMS: 24 * 60 * 60 * 1000, // 24 hours
  PUSH: 7 * 24 * 60 * 60 * 1000, // 7 days
};

module.exports = {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUS,
  NOTIFICATION_PRIORITY,
  TEMPLATE_TYPES,
  EMAIL_CATEGORIES,
  SMS_CATEGORIES,
  PUSH_CATEGORIES,
  PLATFORM_TYPES,
  EMAIL_PROVIDERS,
  SMS_PROVIDERS,
  PUSH_PROVIDERS,
  TEMPLATE_VARIABLES,
  RATE_LIMITS,
  CACHE_TTL,
  PAGINATION,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  NOTIFICATION_EVENTS,
  TEMPLATE_CATEGORIES,
  NOTIFICATION_PREFERENCES,
  DELIVERY_ATTEMPTS,
  NOTIFICATION_EXPIRY,
};
