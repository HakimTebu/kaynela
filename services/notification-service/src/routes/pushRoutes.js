const express = require("express");
const router = express.Router();

// Import controllers
const pushController = require("../controllers/pushController");

// Import middleware
const { authMiddleware, requireRole } = require("../middlewares/auth");
const {
  validatePushNotification,
  validateBulkNotification,
  validateQueryParams,
  validateDeviceToken,
} = require("../middlewares/validate");
const { pushLimiter, bulkNotificationLimiter } = require("../middlewares/rateLimiter");
const {
  logPushSent,
  logBulkNotification,
  logAction,
} = require("../middlewares/audit");

// ============================================================================
// PUSH NOTIFICATION ROUTES
// ============================================================================

// Send single push notification
router.post(
  "/send",
  authMiddleware,
  pushLimiter,
  validatePushNotification,
  logPushSent,
  pushController.sendPushNotification
);

// Send bulk push notifications
router.post(
  "/bulk",
  authMiddleware,
  requireRole("admin", "super_admin"),
  bulkNotificationLimiter,
  validateBulkNotification,
  logBulkNotification,
  pushController.sendBulkPushNotifications
);

// Get push notification history
router.get(
  "/history",
  authMiddleware,
  validateQueryParams,
  logAction("GET_PUSH_HISTORY", "push_notifications"),
  pushController.getPushNotificationHistory
);

// Get push notification statistics
router.get(
  "/stats",
  authMiddleware,
  logAction("GET_PUSH_STATS", "push_stats"),
  pushController.getPushNotificationStats
);

// Resend failed push notification
router.post(
  "/:id/resend",
  authMiddleware,
  logAction("RESEND_PUSH", "push_notification"),
  pushController.resendFailedPushNotification
);

// Test push notification configuration
router.post(
  "/test",
  authMiddleware,
  requireRole("admin", "super_admin"),
  pushLimiter,
  logAction("TEST_PUSH_CONFIG", "push_config"),
  pushController.testPushNotificationConfiguration
);

// ============================================================================
// DEVICE TOKEN MANAGEMENT ROUTES
// ============================================================================

// Register device token
router.post(
  "/devices/register",
  authMiddleware,
  validateDeviceToken,
  logAction("REGISTER_DEVICE_TOKEN", "device_token"),
  pushController.registerDeviceToken
);

// Unregister device token
router.delete(
  "/devices/:token",
  authMiddleware,
  logAction("UNREGISTER_DEVICE_TOKEN", "device_token"),
  pushController.unregisterDeviceToken
);

// Get user's device tokens
router.get(
  "/devices/:userId",
  authMiddleware,
  logAction("GET_USER_DEVICE_TOKENS", "device_tokens"),
  pushController.getUserDeviceTokens
);

// Update device token
router.put(
  "/devices/:token",
  authMiddleware,
  logAction("UPDATE_DEVICE_TOKEN", "device_token"),
  pushController.updateDeviceToken
);

// ============================================================================
// PUSH TEMPLATE ROUTES
// ============================================================================

// Get push templates
router.get(
  "/templates",
  authMiddleware,
  validateQueryParams,
  logAction("GET_PUSH_TEMPLATES", "push_templates"),
  pushController.getPushTemplates
);

// Get push template by ID
router.get(
  "/templates/:id",
  authMiddleware,
  logAction("GET_PUSH_TEMPLATE", "push_template"),
  pushController.getPushTemplateById
);

// Create push template
router.post(
  "/templates",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CREATE_PUSH_TEMPLATE", "push_template"),
  pushController.createPushTemplate
);

// Update push template
router.put(
  "/templates/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_PUSH_TEMPLATE", "push_template"),
  pushController.updatePushTemplate
);

// Delete push template
router.delete(
  "/templates/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DELETE_PUSH_TEMPLATE", "push_template"),
  pushController.deletePushTemplate
);

// Preview push template
router.post(
  "/templates/:id/preview",
  authMiddleware,
  logAction("PREVIEW_PUSH_TEMPLATE", "push_template"),
  pushController.previewPushTemplate
);

// ============================================================================
// PUSH PROVIDER ROUTES
// ============================================================================

// Get push provider configuration
router.get(
  "/providers/config",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_PUSH_PROVIDER_CONFIG", "push_provider_config"),
  pushController.getPushProviderConfig
);

// Update push provider configuration
router.put(
  "/providers/config",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_PUSH_PROVIDER_CONFIG", "push_provider_config"),
  pushController.updatePushProviderConfig
);

// Test push provider connection
router.post(
  "/providers/test",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("TEST_PUSH_PROVIDER", "push_provider"),
  pushController.testPushProviderConnection
);

// ============================================================================
// PUSH ANALYTICS ROUTES
// ============================================================================

// Get push delivery analytics
router.get(
  "/analytics/delivery",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_PUSH_DELIVERY_ANALYTICS", "push_delivery_analytics"),
  pushController.getPushDeliveryAnalytics
);

// Get push engagement analytics
router.get(
  "/analytics/engagement",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_PUSH_ENGAGEMENT_ANALYTICS", "push_engagement_analytics"),
  pushController.getPushEngagementAnalytics
);

// Get push performance metrics
router.get(
  "/analytics/performance",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_PUSH_PERFORMANCE_ANALYTICS", "push_performance_analytics"),
  pushController.getPushPerformanceAnalytics
);

// Get device analytics
router.get(
  "/analytics/devices",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_DEVICE_ANALYTICS", "device_analytics"),
  pushController.getDeviceAnalytics
);

// ============================================================================
// PUSH WEBHOOK ROUTES
// ============================================================================

// Push delivery status webhook (for providers like Firebase, APNS)
router.post(
  "/webhooks/delivery",
  logAction("PUSH_DELIVERY_WEBHOOK", "push_delivery_webhook"),
  pushController.handlePushDeliveryWebhook
);

// Push error webhook
router.post(
  "/webhooks/error",
  logAction("PUSH_ERROR_WEBHOOK", "push_error_webhook"),
  pushController.handlePushErrorWebhook
);

// Push feedback webhook
router.post(
  "/webhooks/feedback",
  logAction("PUSH_FEEDBACK_WEBHOOK", "push_feedback_webhook"),
  pushController.handlePushFeedbackWebhook
);

// ============================================================================
// PUSH CAMPAIGN ROUTES
// ============================================================================

// Create push campaign
router.post(
  "/campaigns",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CREATE_PUSH_CAMPAIGN", "push_campaign"),
  pushController.createPushCampaign
);

// Get push campaigns
router.get(
  "/campaigns",
  authMiddleware,
  validateQueryParams,
  logAction("GET_PUSH_CAMPAIGNS", "push_campaigns"),
  pushController.getPushCampaigns
);

// Get push campaign by ID
router.get(
  "/campaigns/:id",
  authMiddleware,
  logAction("GET_PUSH_CAMPAIGN", "push_campaign"),
  pushController.getPushCampaignById
);

// Update push campaign
router.put(
  "/campaigns/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_PUSH_CAMPAIGN", "push_campaign"),
  pushController.updatePushCampaign
);

// Delete push campaign
router.delete(
  "/campaigns/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DELETE_PUSH_CAMPAIGN", "push_campaign"),
  pushController.deletePushCampaign
);

// Send push campaign
router.post(
  "/campaigns/:id/send",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("SEND_PUSH_CAMPAIGN", "push_campaign"),
  pushController.sendPushCampaign
);

// Get push campaign statistics
router.get(
  "/campaigns/:id/stats",
  authMiddleware,
  logAction("GET_PUSH_CAMPAIGN_STATS", "push_campaign_stats"),
  pushController.getPushCampaignStats
);

// ============================================================================
// PUSH SCHEDULING ROUTES
// ============================================================================

// Schedule push notification
router.post(
  "/schedule",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("SCHEDULE_PUSH_NOTIFICATION", "scheduled_push"),
  pushController.schedulePushNotification
);

// Get scheduled push notifications
router.get(
  "/schedule",
  authMiddleware,
  validateQueryParams,
  logAction("GET_SCHEDULED_PUSH_NOTIFICATIONS", "scheduled_pushes"),
  pushController.getScheduledPushNotifications
);

// Update scheduled push notification
router.put(
  "/schedule/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_SCHEDULED_PUSH_NOTIFICATION", "scheduled_push"),
  pushController.updateScheduledPushNotification
);

// Cancel scheduled push notification
router.delete(
  "/schedule/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CANCEL_SCHEDULED_PUSH_NOTIFICATION", "scheduled_push"),
  pushController.cancelScheduledPushNotification
);

// ============================================================================
// PUSH SEGMENTATION ROUTES
// ============================================================================

// Create push segment
router.post(
  "/segments",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CREATE_PUSH_SEGMENT", "push_segment"),
  pushController.createPushSegment
);

// Get push segments
router.get(
  "/segments",
  authMiddleware,
  validateQueryParams,
  logAction("GET_PUSH_SEGMENTS", "push_segments"),
  pushController.getPushSegments
);

// Get push segment by ID
router.get(
  "/segments/:id",
  authMiddleware,
  logAction("GET_PUSH_SEGMENT", "push_segment"),
  pushController.getPushSegmentById
);

// Update push segment
router.put(
  "/segments/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_PUSH_SEGMENT", "push_segment"),
  pushController.updatePushSegment
);

// Delete push segment
router.delete(
  "/segments/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DELETE_PUSH_SEGMENT", "push_segment"),
  pushController.deletePushSegment
);

// Send push to segment
router.post(
  "/segments/:id/send",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("SEND_PUSH_TO_SEGMENT", "push_segment"),
  pushController.sendPushToSegment
);

module.exports = router;
