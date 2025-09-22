const express = require("express");
const router = express.Router();

// Import controller
const reportController = require("../controllers/reportController");

// Import middleware
const { authMiddleware, requireRole, requireOwnershipOrAdmin } = require("../middlewares/auth");
const {
  validateReportCreation,
  validateReportUpdate,
  validateQueryParams,
} = require("../middlewares/validate");
const {
  logReportCreation,
  logReportUpdate,
  logReportDeletion,
  logReportGeneration,
} = require("../middlewares/audit");
const { reportGenerationLimiter, strictLimiter } = require("../middlewares/rateLimiter");

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/reports - Get all reports
router.get("/", validateQueryParams, reportController.getReports);

// GET /api/reports/stats - Get report statistics
router.get("/stats", reportController.getReportStats);

// GET /api/reports/search - Search reports
router.get("/search", validateQueryParams, reportController.searchReports);

// POST /api/reports - Create new report
router.post(
  "/",
  validateReportCreation,
  reportGenerationLimiter,
  logReportCreation,
  reportController.createReport
);

// GET /api/reports/:id - Get report by ID
router.get("/:id", reportController.getReportById);

// PUT /api/reports/:id - Update report
router.put(
  "/:id",
  validateReportUpdate,
  requireOwnershipOrAdmin("createdBy"),
  logReportUpdate,
  reportController.updateReport
);

// DELETE /api/reports/:id - Delete report
router.delete(
  "/:id",
  requireOwnershipOrAdmin("createdBy"),
  logReportDeletion,
  reportController.deleteReport
);

// POST /api/reports/:id/generate - Generate report
router.post(
  "/:id/generate",
  reportGenerationLimiter,
  logReportGeneration,
  reportController.generateReport
);

// GET /api/reports/:id/status - Get report generation status
router.get("/:id/status", reportController.getReportStatus);

// Admin routes
router.use(requireRole("admin", "super_admin"));

// GET /api/reports/admin/overdue - Get overdue reports (admin only)
router.get("/admin/overdue", (req, res) => {
  // Implementation for admin overdue reports
  res.json({
    success: true,
    message: "Admin overdue reports endpoint",
    requestId: req.requestId,
  });
});

// POST /api/reports/admin/:id/retry - Retry failed report generation (admin only)
router.post("/admin/:id/retry", strictLimiter, (req, res) => {
  // Implementation for admin retry report generation
  res.json({
    success: true,
    message: "Admin retry report generation endpoint",
    requestId: req.requestId,
  });
});

module.exports = router;
