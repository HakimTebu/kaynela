const express = require("express");
const router = express.Router();

// Import controllers
const smsController = require("../controllers/smsController");

// Import middleware
const { authMiddleware, requireRole } = require("../middlewares/auth");
const {
  validateSMSNotification,
  validateBulkNotification,
  validateQueryParams,
} = require("../middlewares/validate");
const { smsLimiter, bulkNotificationLimiter } = require("../middlewares/rateLimiter");
const {
  logSMSSent,
  logBulkNotification,
  logAction,
} = require("../middlewares/audit");

// ============================================================================
// SMS NOTIFICATION ROUTES
// ============================================================================

// Send single SMS notification
router.post(
  "/send",
  authMiddleware,
  smsLimiter,
  validateSMSNotification,
  logSMSSent,
  smsController.sendSMSNotification
);

// Send bulk SMS notifications
router.post(
  "/bulk",
  authMiddleware,
  requireRole("admin", "super_admin"),
  bulkNotificationLimiter,
  validateBulkNotification,
  logBulkNotification,
  smsController.sendBulkSMSNotifications
);

// Get SMS notification history
router.get(
  "/history",
  authMiddleware,
  validateQueryParams,
  logAction("GET_SMS_HISTORY", "sms_notifications"),
  smsController.getSMSNotificationHistory
);

// Get SMS notification statistics
router.get(
  "/stats",
  authMiddleware,
  logAction("GET_SMS_STATS", "sms_stats"),
  smsController.getSMSNotificationStats
);

// Resend failed SMS notification
router.post(
  "/:id/resend",
  authMiddleware,
  logAction("RESEND_SMS", "sms_notification"),
  smsController.resendFailedSMSNotification
);

// Test SMS configuration
router.post(
  "/test",
  authMiddleware,
  requireRole("admin", "super_admin"),
  smsLimiter,
  logAction("TEST_SMS_CONFIG", "sms_config"),
  smsController.testSMSConfiguration
);

// Send OTP SMS
router.post(
  "/otp",
  authMiddleware,
  smsLimiter,
  logAction("SEND_OTP_SMS", "otp_sms"),
  smsController.sendOTPSMS
);

// ============================================================================
// SMS TEMPLATE ROUTES
// ============================================================================

// Get SMS templates
router.get(
  "/templates",
  authMiddleware,
  validateQueryParams,
  logAction("GET_SMS_TEMPLATES", "sms_templates"),
  smsController.getSMSTemplates
);

// Get SMS template by ID
router.get(
  "/templates/:id",
  authMiddleware,
  logAction("GET_SMS_TEMPLATE", "sms_template"),
  smsController.getSMSTemplateById
);

// Create SMS template
router.post(
  "/templates",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CREATE_SMS_TEMPLATE", "sms_template"),
  smsController.createSMSTemplate
);

// Update SMS template
router.put(
  "/templates/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_SMS_TEMPLATE", "sms_template"),
  smsController.updateSMSTemplate
);

// Delete SMS template
router.delete(
  "/templates/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DELETE_SMS_TEMPLATE", "sms_template"),
  smsController.deleteSMSTemplate
);

// Preview SMS template
router.post(
  "/templates/:id/preview",
  authMiddleware,
  logAction("PREVIEW_SMS_TEMPLATE", "sms_template"),
  smsController.previewSMSTemplate
);

// ============================================================================
// SMS PROVIDER ROUTES
// ============================================================================

// Get SMS provider configuration
router.get(
  "/providers/config",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_SMS_PROVIDER_CONFIG", "sms_provider_config"),
  smsController.getSMSProviderConfig
);

// Update SMS provider configuration
router.put(
  "/providers/config",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_SMS_PROVIDER_CONFIG", "sms_provider_config"),
  smsController.updateSMSProviderConfig
);

// Test SMS provider connection
router.post(
  "/providers/test",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("TEST_SMS_PROVIDER", "sms_provider"),
  smsController.testSMSProviderConnection
);

// ============================================================================
// SMS ANALYTICS ROUTES
// ============================================================================

// Get SMS delivery analytics
router.get(
  "/analytics/delivery",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_SMS_DELIVERY_ANALYTICS", "sms_delivery_analytics"),
  smsController.getSMSDeliveryAnalytics
);

// Get SMS performance metrics
router.get(
  "/analytics/performance",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_SMS_PERFORMANCE_ANALYTICS", "sms_performance_analytics"),
  smsController.getSMSPerformanceAnalytics
);

// Get SMS cost analytics
router.get(
  "/analytics/cost",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_SMS_COST_ANALYTICS", "sms_cost_analytics"),
  smsController.getSMSCostAnalytics
);

// ============================================================================
// SMS WEBHOOK ROUTES
// ============================================================================

// SMS delivery status webhook (for providers like Twilio, AWS SNS)
router.post(
  "/webhooks/delivery",
  logAction("SMS_DELIVERY_WEBHOOK", "sms_delivery_webhook"),
  smsController.handleSMSDeliveryWebhook
);

// SMS delivery receipt webhook
router.post(
  "/webhooks/receipt",
  logAction("SMS_RECEIPT_WEBHOOK", "sms_receipt_webhook"),
  smsController.handleSMSReceiptWebhook
);

// SMS error webhook
router.post(
  "/webhooks/error",
  logAction("SMS_ERROR_WEBHOOK", "sms_error_webhook"),
  smsController.handleSMSErrorWebhook
);

// ============================================================================
// SMS CAMPAIGN ROUTES
// ============================================================================

// Create SMS campaign
router.post(
  "/campaigns",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CREATE_SMS_CAMPAIGN", "sms_campaign"),
  smsController.createSMSCampaign
);

// Get SMS campaigns
router.get(
  "/campaigns",
  authMiddleware,
  validateQueryParams,
  logAction("GET_SMS_CAMPAIGNS", "sms_campaigns"),
  smsController.getSMSCampaigns
);

// Get SMS campaign by ID
router.get(
  "/campaigns/:id",
  authMiddleware,
  logAction("GET_SMS_CAMPAIGN", "sms_campaign"),
  smsController.getSMSCampaignById
);

// Update SMS campaign
router.put(
  "/campaigns/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_SMS_CAMPAIGN", "sms_campaign"),
  smsController.updateSMSCampaign
);

// Delete SMS campaign
router.delete(
  "/campaigns/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DELETE_SMS_CAMPAIGN", "sms_campaign"),
  smsController.deleteSMSCampaign
);

// Send SMS campaign
router.post(
  "/campaigns/:id/send",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("SEND_SMS_CAMPAIGN", "sms_campaign"),
  smsController.sendSMSCampaign
);

// Get SMS campaign statistics
router.get(
  "/campaigns/:id/stats",
  authMiddleware,
  logAction("GET_SMS_CAMPAIGN_STATS", "sms_campaign_stats"),
  smsController.getSMSCampaignStats
);

// ============================================================================
// SMS VERIFICATION ROUTES
// ============================================================================

// Verify OTP
router.post(
  "/verify/otp",
  authMiddleware,
  logAction("VERIFY_OTP", "otp_verification"),
  smsController.verifyOTP
);

// Resend OTP
router.post(
  "/resend/otp",
  authMiddleware,
  smsLimiter,
  logAction("RESEND_OTP", "otp_resend"),
  smsController.resendOTP
);

module.exports = router;
