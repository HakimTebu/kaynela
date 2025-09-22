const express = require("express");
const router = express.Router();

// Import controllers
const notificationController = require("../controllers/notificationController");

// Import middleware
const { authMiddleware, requireRole } = require("../middlewares/auth");
const {
  validateTemplateCreation,
  validateTemplateUpdate,
  validateQueryParams,
} = require("../middlewares/validate");
const { strictLimiter } = require("../middlewares/rateLimiter");
const {
  logTemplateCreated,
  logTemplateUpdated,
  logTemplateDeleted,
  logAction,
} = require("../middlewares/audit");

// ============================================================================
// TEMPLATE MANAGEMENT ROUTES
// ============================================================================

// Get all notification templates
router.get(
  "/",
  authMiddleware,
  validateQueryParams,
  logAction("GET_NOTIFICATION_TEMPLATES", "notification_templates"),
  notificationController.getNotificationTemplates
);

// Get notification template by ID
router.get(
  "/:id",
  authMiddleware,
  logAction("GET_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.getNotificationTemplateById
);

// Create notification template
router.post(
  "/",
  authMiddleware,
  requireRole("admin", "super_admin"),
  strictLimiter,
  validateTemplateCreation,
  logTemplateCreated,
  notificationController.createNotificationTemplate
);

// Update notification template
router.put(
  "/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  strictLimiter,
  validateTemplateUpdate,
  logTemplateUpdated,
  notificationController.updateNotificationTemplate
);

// Delete notification template
router.delete(
  "/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  strictLimiter,
  logTemplateDeleted,
  notificationController.deleteNotificationTemplate
);

// Preview template with data
router.post(
  "/:id/preview",
  authMiddleware,
  logAction("PREVIEW_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.previewTemplate
);

// ============================================================================
// TEMPLATE OPERATIONS ROUTES
// ============================================================================

// Clone template
router.post(
  "/:id/clone",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CLONE_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.cloneTemplate
);

// Activate template
router.patch(
  "/:id/activate",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("ACTIVATE_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.activateTemplate
);

// Deactivate template
router.patch(
  "/:id/deactivate",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DEACTIVATE_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.deactivateTemplate
);

// Approve template
router.patch(
  "/:id/approve",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("APPROVE_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.approveTemplate
);

// Reject template
router.patch(
  "/:id/reject",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("REJECT_NOTIFICATION_TEMPLATE", "notification_template"),
  notificationController.rejectTemplate
);

// ============================================================================
// TEMPLATE VARIABLES ROUTES
// ============================================================================

// Get template variables
router.get(
  "/:id/variables",
  authMiddleware,
  logAction("GET_TEMPLATE_VARIABLES", "template_variables"),
  notificationController.getTemplateVariables
);

// Add template variable
router.post(
  "/:id/variables",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("ADD_TEMPLATE_VARIABLE", "template_variable"),
  notificationController.addTemplateVariable
);

// Update template variable
router.put(
  "/:id/variables/:variableId",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_TEMPLATE_VARIABLE", "template_variable"),
  notificationController.updateTemplateVariable
);

// Delete template variable
router.delete(
  "/:id/variables/:variableId",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DELETE_TEMPLATE_VARIABLE", "template_variable"),
  notificationController.deleteTemplateVariable
);

// ============================================================================
// TEMPLATE VERSIONING ROUTES
// ============================================================================

// Get template versions
router.get(
  "/:id/versions",
  authMiddleware,
  logAction("GET_TEMPLATE_VERSIONS", "template_versions"),
  notificationController.getTemplateVersions
);

// Get template version by ID
router.get(
  "/:id/versions/:versionId",
  authMiddleware,
  logAction("GET_TEMPLATE_VERSION", "template_version"),
  notificationController.getTemplateVersionById
);

// Create new template version
router.post(
  "/:id/versions",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CREATE_TEMPLATE_VERSION", "template_version"),
  notificationController.createTemplateVersion
);

// Rollback to template version
router.post(
  "/:id/versions/:versionId/rollback",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("ROLLBACK_TEMPLATE_VERSION", "template_version"),
  notificationController.rollbackTemplateVersion
);

// ============================================================================
// TEMPLATE CATEGORIES ROUTES
// ============================================================================

// Get template categories
router.get(
  "/categories",
  authMiddleware,
  logAction("GET_TEMPLATE_CATEGORIES", "template_categories"),
  notificationController.getTemplateCategories
);

// Create template category
router.post(
  "/categories",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("CREATE_TEMPLATE_CATEGORY", "template_category"),
  notificationController.createTemplateCategory
);

// Update template category
router.put(
  "/categories/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("UPDATE_TEMPLATE_CATEGORY", "template_category"),
  notificationController.updateTemplateCategory
);

// Delete template category
router.delete(
  "/categories/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("DELETE_TEMPLATE_CATEGORY", "template_category"),
  notificationController.deleteTemplateCategory
);

// ============================================================================
// TEMPLATE ANALYTICS ROUTES
// ============================================================================

// Get template usage statistics
router.get(
  "/:id/stats/usage",
  authMiddleware,
  logAction("GET_TEMPLATE_USAGE_STATS", "template_usage_stats"),
  notificationController.getTemplateUsageStats
);

// Get template performance metrics
router.get(
  "/:id/stats/performance",
  authMiddleware,
  logAction("GET_TEMPLATE_PERFORMANCE_STATS", "template_performance_stats"),
  notificationController.getTemplatePerformanceStats
);

// Get template delivery analytics
router.get(
  "/:id/stats/delivery",
  authMiddleware,
  logAction("GET_TEMPLATE_DELIVERY_STATS", "template_delivery_stats"),
  notificationController.getTemplateDeliveryStats
);

// ============================================================================
// TEMPLATE IMPORT/EXPORT ROUTES
// ============================================================================

// Export template
router.get(
  "/:id/export",
  authMiddleware,
  logAction("EXPORT_TEMPLATE", "template_export"),
  notificationController.exportTemplate
);

// Import template
router.post(
  "/import",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("IMPORT_TEMPLATE", "template_import"),
  notificationController.importTemplate
);

// Export all templates
router.get(
  "/export/all",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("EXPORT_ALL_TEMPLATES", "templates_export"),
  notificationController.exportAllTemplates
);

// ============================================================================
// TEMPLATE VALIDATION ROUTES
// ============================================================================

// Validate template syntax
router.post(
  "/:id/validate",
  authMiddleware,
  logAction("VALIDATE_TEMPLATE", "template_validation"),
  notificationController.validateTemplate
);

// Test template rendering
router.post(
  "/:id/test",
  authMiddleware,
  logAction("TEST_TEMPLATE_RENDERING", "template_test"),
  notificationController.testTemplateRendering
);

// ============================================================================
// TEMPLATE SHARING ROUTES
// ============================================================================

// Share template with other users
router.post(
  "/:id/share",
  authMiddleware,
  requireRole("admin", "super_admin"),
  logAction("SHARE_TEMPLATE", "template_sharing"),
  notificationController.shareTemplate
);

// Get shared templates
router.get(
  "/shared",
  authMiddleware,
  logAction("GET_SHARED_TEMPLATES", "shared_templates"),
  notificationController.getSharedTemplates
);

// Accept shared template
router.post(
  "/:id/accept-share",
  authMiddleware,
  logAction("ACCEPT_SHARED_TEMPLATE", "template_sharing"),
  notificationController.acceptSharedTemplate
);

// ============================================================================
// TEMPLATE WORKFLOW ROUTES
// ============================================================================

// Submit template for approval
router.post(
  "/:id/submit",
  authMiddleware,
  logAction("SUBMIT_TEMPLATE_FOR_APPROVAL", "template_workflow"),
  notificationController.submitTemplateForApproval
);

// Get template approval history
router.get(
  "/:id/approval-history",
  authMiddleware,
  logAction("GET_TEMPLATE_APPROVAL_HISTORY", "template_approval_history"),
  notificationController.getTemplateApprovalHistory
);

// Request template review
router.post(
  "/:id/request-review",
  authMiddleware,
  logAction("REQUEST_TEMPLATE_REVIEW", "template_workflow"),
  notificationController.requestTemplateReview
);

module.exports = router;
