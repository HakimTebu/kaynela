const express = require("express");
const router = express.Router();

// Import controllers
const notificationController = require("../controllers/notificationController");

// Import middleware
const { authMiddleware, requireRole, requireNotificationAccess } = require("../middlewares/auth");
const { validateQueryParams } = require("../middlewares/validate");
const { logAction } = require("../middlewares/audit");

// ============================================================================
// NOTIFICATION MANAGEMENT ROUTES
// ============================================================================

// Get all notifications (with pagination and filters)
router.get(
  "/",
  authMiddleware,
  validateQueryParams,
  logAction("GET_NOTIFICATIONS", "notifications"),
  notificationController.getNotifications
);

// Get notification by ID
router.get(
  "/:id",
  authMiddleware,
  logAction("GET_NOTIFICATION", "notification"),
  notificationController.getNotificationById
);

// Get notification statistics
router.get(
  "/stats/overview",
  authMiddleware,
  logAction("GET_NOTIFICATION_STATS", "notification_stats"),
  notificationController.getNotificationStats
);

// Mark notification as read
router.patch(
  "/:id/read",
  authMiddleware,
  logAction("MARK_NOTIFICATION_READ", "notification"),
  notificationController.markNotificationAsRead
);

// Mark multiple notifications as read
router.patch(
  "/bulk/read",
  authMiddleware,
  logAction("MARK_MULTIPLE_NOTIFICATIONS_READ", "notifications"),
  notificationController.markMultipleNotificationsAsRead
);

// Delete notification (soft delete)
router.delete(
  "/:id",
  authMiddleware,
  logAction("DELETE_NOTIFICATION", "notification"),
  notificationController.deleteNotification
);

// ============================================================================
// NOTIFICATION PREFERENCES ROUTES
// ============================================================================

// Get user notification preferences
router.get(
  "/preferences/:userId",
  authMiddleware,
  requireNotificationAccess(),
  logAction("GET_NOTIFICATION_PREFERENCES", "notification_preferences"),
  notificationController.getUserNotificationPreferences
);

// Update user notification preferences
router.put(
  "/preferences/:userId",
  authMiddleware,
  requireNotificationAccess(),
  logAction("UPDATE_NOTIFICATION_PREFERENCES", "notification_preferences"),
  notificationController.updateUserNotificationPreferences
);

// ============================================================================
// TEMPLATE MANAGEMENT ROUTES
// ============================================================================

// Get all notification templates
router.get(
  "/templates",
  authMiddleware,
  validateQueryParams,
  logAction("GET_NOTIFICATION_TEMPLATES", "notification_templates"),
  notificationController.getNotificationTemplates
);

// Get notification template by ID
router.get(
  "/templates/:id",
  authMiddleware,
  logAction("GET_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.getNotificationTemplateById
);

// Create notification template
router.post(
  "/templates",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CREATE_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.createNotificationTemplate
);

// Update notification template
router.put(
  "/templates/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.updateNotificationTemplate
);

// Delete notification template
router.delete(
  "/templates/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DELETE_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.deleteNotificationTemplate
);

// Preview template with data
router.post(
  "/templates/:id/preview",
  authMiddleware,
  logAction("PREVIEW_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.previewTemplate
);

// ============================================================================
// BULK OPERATIONS ROUTES
// ============================================================================

// Send bulk notifications (multi-channel)
router.post(
  "/bulk",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("SEND_BULK_NOTIFICATIONS", "bulk_notifications"),
  notificationController.sendBulkNotifications
);

// Get bulk notification status
router.get(
  "/bulk/:bulkId/status",
  authMiddleware,
  logAction("GET_BULK_NOTIFICATION_STATUS", "bulk_notification"),
  notificationController.getBulkNotificationStatus
);

// Cancel bulk notification
router.patch(
  "/bulk/:bulkId/cancel",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CANCEL_BULK_NOTIFICATION", "bulk_notification"),
  notificationController.cancelBulkNotification
);

// ============================================================================
// ANALYTICS AND REPORTING ROUTES
// ============================================================================

// Get notification analytics
router.get(
  "/analytics/overview",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_NOTIFICATION_ANALYTICS", "notification_analytics"),
  notificationController.getNotificationAnalytics
);

// Get notification delivery reports
router.get(
  "/reports/delivery",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_DELIVERY_REPORTS", "delivery_reports"),
  notificationController.getDeliveryReports
);

// Get notification performance metrics
router.get(
  "/metrics/performance",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_PERFORMANCE_METRICS", "performance_metrics"),
  notificationController.getPerformanceMetrics
);

// ============================================================================
// SYSTEM AND MAINTENANCE ROUTES
// ============================================================================

// Get service health and status
router.get(
  "/health/status",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("GET_SERVICE_HEALTH", "service_health"),
  notificationController.getServiceHealth
);

// Retry failed notifications
router.post(
  "/retry/failed",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("RETRY_FAILED_NOTIFICATIONS", "failed_notifications"),
  notificationController.retryFailedNotifications
);

// Clean up expired notifications
router.post(
  "/cleanup/expired",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CLEANUP_EXPIRED_NOTIFICATIONS", "expired_notifications"),
  notificationController.cleanupExpiredNotifications
);

// ============================================================================
// WEBHOOK AND CALLBACK ROUTES
// ============================================================================

// Provider delivery callbacks
router.post(
  "/webhooks/:provider/callback",
  logAction("PROVIDER_CALLBACK", "provider_callback"),
  notificationController.handleProviderCallback
);

// Email delivery status webhook
router.post(
  "/webhooks/email/status",
  logAction("EMAIL_STATUS_WEBHOOK", "email_status"),
  notificationController.handleEmailStatusWebhook
);

// SMS delivery status webhook
router.post(
  "/webhooks/sms/status",
  logAction("SMS_STATUS_WEBHOOK", "sms_status"),
  notificationController.handleSMSStatusWebhook
);

// Push notification delivery status webhook
router.post(
  "/webhooks/push/status",
  logAction("PUSH_STATUS_WEBHOOK", "push_status"),
  notificationController.handlePushStatusWebhook
);

module.exports = router;
