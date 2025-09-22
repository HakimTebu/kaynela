const express = require("express");
const router = express.Router();

// Import controllers
const emailController = require("../controllers/emailController");

// Import middleware
const { authMiddleware, requireRole } = require("../middlewares/auth");
const {
  validateEmailNotification,
  validateBulkNotification,
  validateQueryParams,
} = require("../middlewares/validate");
const { emailLimiter, bulkNotificationLimiter } = require("../middlewares/rateLimiter");
const {
  logEmailSent,
  logBulkNotification,
  logAction,
} = require("../middlewares/audit");

// ============================================================================
// EMAIL NOTIFICATION ROUTES
// ============================================================================

// Send single email notification
router.post(
  "/send",
  authMiddleware,
  emailLimiter,
  validateEmailNotification,
  logEmailSent,
  emailController.sendEmailNotification
);

// Send bulk email notifications
router.post(
  "/bulk",
  authMiddleware,
  requireRole("admin", "super_admin"),
  bulkNotificationLimiter,
  validateBulkNotification,
  logBulkNotification,
  emailController.sendBulkEmailNotifications
);

// Get email notification history
router.get(
  "/history",
  authMiddleware,
  validateQueryParams,
  logAction("GET_EMAIL_HISTORY", "email_notifications"),
  emailController.getEmailNotificationHistory
);

// Get email notification statistics
router.get(
  "/stats",
  authMiddleware,
  logAction("GET_EMAIL_STATS", "email_stats"),
  emailController.getEmailNotificationStats
);

// Resend failed email notification
router.post(
  "/:id/resend",
  authMiddleware,
  logAction("RESEND_EMAIL", "email_notification"),
  emailController.resendFailedEmailNotification
);

// Test email configuration
router.post(
  "/test",
  authMiddleware,
  requireRole("admin", "super_admin"),
  emailLimiter,
  logAction("TEST_EMAIL_CONFIG", "email_config"),
  emailController.testEmailConfiguration
);

// ============================================================================
// EMAIL TEMPLATE ROUTES
// ============================================================================

// Get email templates
router.get(
  "/templates",
  authMiddleware,
  validateQueryParams,
  logAction("GET_EMAIL_TEMPLATES", "email_templates"),
  emailController.getEmailTemplates
);

// Get email template by ID
router.get(
  "/templates/:id",
  authMiddleware,
  logAction("GET_EMAIL_TEMPLATE", "email_template"),
  emailController.getEmailTemplateById
);

// Create email template
router.post(
  "/templates",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CREATE_EMAIL_TEMPLATE", "email_template"),
  emailController.createEmailTemplate
);

// Update email template
router.put(
  "/templates/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_EMAIL_TEMPLATE", "email_template"),
  emailController.updateEmailTemplate
);

// Delete email template
router.delete(
  "/templates/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DELETE_EMAIL_TEMPLATE", "email_template"),
  emailController.deleteEmailTemplate
);

// Preview email template
router.post(
  "/templates/:id/preview",
  authMiddleware,
  logAction("PREVIEW_EMAIL_TEMPLATE", "email_template"),
  emailController.previewEmailTemplate
);

// ============================================================================
// EMAIL PROVIDER ROUTES
// ============================================================================

// Get email provider configuration
router.get(
  "/providers/config",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_EMAIL_PROVIDER_CONFIG", "email_provider_config"),
  emailController.getEmailProviderConfig
);

// Update email provider configuration
router.put(
  "/providers/config",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_EMAIL_PROVIDER_CONFIG", "email_provider_config"),
  emailController.updateEmailProviderConfig
);

// Test email provider connection
router.post(
  "/providers/test",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("TEST_EMAIL_PROVIDER", "email_provider"),
  emailController.testEmailProviderConnection
);

// ============================================================================
// EMAIL ANALYTICS ROUTES
// ============================================================================

// Get email delivery analytics
router.get(
  "/analytics/delivery",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_EMAIL_DELIVERY_ANALYTICS", "email_delivery_analytics"),
  emailController.getEmailDeliveryAnalytics
);

// Get email engagement analytics
router.get(
  "/analytics/engagement",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_EMAIL_ENGAGEMENT_ANALYTICS", "email_engagement_analytics"),
  emailController.getEmailEngagementAnalytics
);

// Get email performance metrics
router.get(
  "/analytics/performance",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_EMAIL_PERFORMANCE_ANALYTICS", "email_performance_analytics"),
  emailController.getEmailPerformanceAnalytics
);

// ============================================================================
// EMAIL WEBHOOK ROUTES
// ============================================================================

// Email delivery status webhook (for providers like SendGrid, Mailgun)
router.post(
  "/webhooks/delivery",
  logAction("EMAIL_DELIVERY_WEBHOOK", "email_delivery_webhook"),
  emailController.handleEmailDeliveryWebhook
);

// Email bounce webhook
router.post(
  "/webhooks/bounce",
  logAction("EMAIL_BOUNCE_WEBHOOK", "email_bounce_webhook"),
  emailController.handleEmailBounceWebhook
);

// Email spam report webhook
router.post(
  "/webhooks/spam",
  logAction("EMAIL_SPAM_WEBHOOK", "email_spam_webhook"),
  emailController.handleEmailSpamWebhook
);

// Email unsubscribe webhook
router.post(
  "/webhooks/unsubscribe",
  logAction("EMAIL_UNSUBSCRIBE_WEBHOOK", "email_unsubscribe_webhook"),
  emailController.handleEmailUnsubscribeWebhook
);

// ============================================================================
// EMAIL CAMPAIGN ROUTES
// ============================================================================

// Create email campaign
router.post(
  "/campaigns",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CREATE_EMAIL_CAMPAIGN", "email_campaign"),
  emailController.createEmailCampaign
);

// Get email campaigns
router.get(
  "/campaigns",
  authMiddleware,
  validateQueryParams,
  logAction("GET_EMAIL_CAMPAIGNS", "email_campaigns"),
  emailController.getEmailCampaigns
);

// Get email campaign by ID
router.get(
  "/campaigns/:id",
  authMiddleware,
  logAction("GET_EMAIL_CAMPAIGN", "email_campaign"),
  emailController.getEmailCampaignById
);

// Update email campaign
router.put(
  "/campaigns/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_EMAIL_CAMPAIGN", "email_campaign"),
  emailController.updateEmailCampaign
);

// Delete email campaign
router.delete(
  "/campaigns/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DELETE_EMAIL_CAMPAIGN", "email_campaign"),
  emailController.deleteEmailCampaign
);

// Send email campaign
router.post(
  "/campaigns/:id/send",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("SEND_EMAIL_CAMPAIGN", "email_campaign"),
  emailController.sendEmailCampaign
);

// Get email campaign statistics
router.get(
  "/campaigns/:id/stats",
  authMiddleware,
  logAction("GET_EMAIL_CAMPAIGN_STATS", "email_campaign_stats"),
  emailController.getEmailCampaignStats
);

module.exports = router;
