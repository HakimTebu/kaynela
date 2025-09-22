const Report = require("../models/Report");
const { asyncHandler } = require("../utils/errors");
const logger = require("../utils/logger");
const { client: redisClient } = require("../config/redis");
const {
  publishDirectEvent,
  publishTopicEvent,
  publishFanoutEvent,
  publishHeadersEvent,
  publishDefaultEvent,
  ROUTING_KEYS,
} = require("../services/rabbitmq");

// Create a new report
const createReport = asyncHandler(async (req, res) => {
  const reportData = {
    ...req.body,
    createdBy: req.user._id,
  };

  const report = new Report(reportData);
  await report.save();

  // Publish DIRECT event for report creation
  await publishDirectEvent(ROUTING_KEYS.REPORT_CREATED, {
    reportId: report._id,
    userId: req.user._id,
    reportType: report.type,
    dataSource: report.dataSource,
    timestamp: new Date().toISOString(),
  });

  // Publish FANOUT event for notifications
  await publishFanoutEvent({
    type: "REPORT_CREATED",
    reportId: report._id,
    userId: req.user._id,
    reportName: report.name,
    timestamp: new Date().toISOString(),
  });

  logger.info("Report created:", {
    reportId: report._id,
    userId: req.user._id,
    reportType: report.type,
    requestId: req.requestId,
  });

  res.status(201).json({
    success: true,
    message: "Report created successfully",
    data: report,
    requestId: req.requestId,
  });
});

// Get all reports for the user
const getReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, status, dataSource, sortBy = "createdAt", sortOrder = "desc" } = req.query;
  
  // Build filter
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (dataSource) filter.dataSource = dataSource;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Report.countDocuments(filter);
  const totalPages = Math.ceil(total / parseInt(limit));

  // Get reports
  const reports = await Report.find(filter)
    .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("createdBy", "email firstName lastName");

  res.json({
    success: true,
    data: {
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    requestId: req.requestId,
  });
});

// Get report by ID
const getReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try to get from cache first
  let report = await redisClient.get(`report:${id}`);
  if (report) {
    report = JSON.parse(report);
  } else {
    report = await Report.findById(id).populate("createdBy", "email firstName lastName");
    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
        requestId: req.requestId,
      });
    }

    // Cache the report
    await redisClient.setEx(
      `report:${id}`,
      3600, // 1 hour
      JSON.stringify(report)
    );
  }

  // Check if user can access this report
  if (!report.canUserAccess(req.user._id, req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  res.json({
    success: true,
    data: report,
    requestId: req.requestId,
  });
});

// Update report
const updateReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = {
    ...req.body,
    lastModifiedBy: req.user._id,
  };

  const report = await Report.findById(id);
  if (!report) {
    return res.status(404).json({
      success: false,
      error: "Report not found",
      requestId: req.requestId,
    });
  }

  // Check if user can modify this report
  if (report.createdBy.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Update report
  Object.assign(report, updateData);
  await report.save();

  // Clear cache
  await redisClient.del(`report:${id}`);

  // Publish DIRECT event for report update
  await publishDirectEvent(ROUTING_KEYS.REPORT_UPDATED, {
    reportId: report._id,
    userId: req.user._id,
    reportType: report.type,
    timestamp: new Date().toISOString(),
  });

  // Publish TOPIC event for user updates
  await publishTopicEvent("user.report.updated", {
    reportId: report._id,
    userId: req.user._id,
    action: "updated",
    timestamp: new Date().toISOString(),
  });

  logger.info("Report updated:", {
    reportId: report._id,
    userId: req.user._id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Report updated successfully",
    data: report,
    requestId: req.requestId,
  });
});

// Delete report
const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await Report.findById(id);
  if (!report) {
    return res.status(404).json({
      success: false,
      error: "Report not found",
      requestId: req.requestId,
    });
  }

  // Check if user can delete this report
  if (report.createdBy.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Soft delete
  report.isActive = false;
  await report.save();

  // Clear cache
  await redisClient.del(`report:${id}`);

  // Publish DIRECT event for report deletion
  await publishDirectEvent(ROUTING_KEYS.REPORT_DELETED, {
    reportId: report._id,
    userId: req.user._id,
    reportType: report.type,
    timestamp: new Date().toISOString(),
  });

  logger.info("Report deleted:", {
    reportId: report._id,
    userId: req.user._id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Report deleted successfully",
    requestId: req.requestId,
  });
});

// Generate report
const generateReport = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await Report.findById(id);
  if (!report) {
    return res.status(404).json({
      success: false,
      error: "Report not found",
      requestId: req.requestId,
    });
  }

  // Check if user can generate this report
  if (!report.canUserAccess(req.user._id, req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Check if report can be generated
  if (report.status === "generating") {
    return res.status(400).json({
      success: false,
      error: "Report is already being generated",
      requestId: req.requestId,
    });
  }

  // Start generation
  report.startGeneration();
  await report.save();

  // Clear cache
  await redisClient.del(`report:${id}`);

  // Publish DIRECT event for report generation
  await publishDirectEvent(ROUTING_KEYS.REPORT_GENERATED, {
    reportId: report._id,
    userId: req.user._id,
    reportType: report.type,
    dataSource: report.dataSource,
    timestamp: new Date().toISOString(),
  });

  // Publish HEADERS event for system monitoring
  await publishHeadersEvent({
    type: "REPORT_GENERATION_STARTED",
    reportId: report._id,
    userId: req.user._id,
    priority: report.priority,
    timestamp: new Date().toISOString(),
  }, {
    "priority": report.priority,
    "environment": process.env.NODE_ENV || "development",
    "service": "reporting",
  });

  logger.info("Report generation started:", {
    reportId: report._id,
    userId: req.user._id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Report generation started",
    data: {
      reportId: report._id,
      status: report.status,
      estimatedCompletion: report.estimatedCompletion,
    },
    requestId: req.requestId,
  });
});

// Get report status
const getReportStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await Report.findById(id).select("status generation schedule");
  if (!report) {
    return res.status(404).json({
      success: false,
      error: "Report not found",
      requestId: req.requestId,
    });
  }

  res.json({
    success: true,
    data: {
      reportId: report._id,
      status: report.status,
      progress: report.generation.progress,
      startedAt: report.generation.startedAt,
      completedAt: report.generation.completedAt,
      estimatedCompletion: report.estimatedCompletion,
      nextRun: report.schedule.nextRun,
      isOverdue: report.isOverdue,
    },
    requestId: req.requestId,
  });
});

// Get report statistics
const getReportStats = asyncHandler(async (req, res) => {
  const stats = await Report.getReportStats(req.user._id);

  res.json({
    success: true,
    data: stats,
    requestId: req.requestId,
  });
});

// Search reports
const searchReports = asyncHandler(async (req, res) => {
  const { query, page = 1, limit = 20 } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: "Search query must be at least 2 characters long",
      requestId: req.requestId,
    });
  }

  // Build search filter
  const searchFilter = {
    $or: [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { tags: { $in: [new RegExp(query, "i")] } },
      { category: { $regex: query, $options: "i" } },
    ],
    isActive: true,
  };

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Report.countDocuments(searchFilter);
  const totalPages = Math.ceil(total / parseInt(limit));

  // Search reports
  const reports = await Report.find(searchFilter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("createdBy", "email firstName lastName");

  res.json({
    success: true,
    data: {
      reports,
      searchQuery: query,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    requestId: req.requestId,
  });
});

module.exports = {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  generateReport,
  getReportStatus,
  getReportStats,
  searchReports,
};
