const Notification = require("../models/Notification");
const NotificationTemplate = require("../models/NotificationTemplate");
const { asyncHandler } = require("../utils/errors");
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require("../constants");
const logger = require("../utils/logger");

// Get all notifications with pagination and filters
const getNotifications = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    channel,
    category,
    priority,
    startDate,
    endDate,
  } = req.query;

  const query = { isActive: true };

  // Add filters
  if (status) query.status = status;
  if (channel) query.channel = channel;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Add user filter if not admin
  if (!["admin", "super_admin"].includes(req.user.role)) {
    query.userId = req.user._id;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("templateId", "name type category");

  const total = await Notification.countDocuments(query);

  res.status(200).json({
    success: true,
    data: notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
    message: SUCCESS_MESSAGES.NOTIFICATIONS_RETRIEVED,
  });
});

// Get notification by ID
const getNotificationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id, isActive: true };

  // Add user filter if not admin
  if (!["admin", "super_admin"].includes(req.user.role)) {
    query.userId = req.user._id;
  }

  const notification = await Notification.findOne(query).populate(
    "templateId",
    "name type category"
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.NOTIFICATION_NOT_FOUND,
    });
  }

  res.status(200).json({
    success: true,
    data: notification,
    message: SUCCESS_MESSAGES.NOTIFICATION_RETRIEVED,
  });
});

// Get notification statistics
const getNotificationStats = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  const query = { isActive: true };

  // Add user filter if not admin
  if (!["admin", "super_admin"].includes(req.user.role)) {
    query.userId = req.user._id;
  } else if (userId) {
    query.userId = userId;
  }

  const [statusStats, channelStats, categoryStats] = await Promise.all([
    Notification.getNotificationStats(query.userId),
    Notification.getChannelStats(query.userId),
    Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          channels: { $addToSet: "$channel" },
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      statusStats,
      channelStats,
      categoryStats,
    },
    message: SUCCESS_MESSAGES.STATS_RETRIEVED,
  });
});

// Mark notification as read
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id, isActive: true };

  // Add user filter if not admin
  if (!["admin", "super_admin"].includes(req.user.role)) {
    query.userId = req.user._id;
  }

  const notification = await Notification.findOne(query);

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.NOTIFICATION_NOT_FOUND,
    });
  }

  if (notification.status === "read") {
    return res.status(400).json({
      success: false,
      error: "Notification is already marked as read",
    });
  }

  await notification.markAsRead();

  res.status(200).json({
    success: true,
    data: notification,
    message: SUCCESS_MESSAGES.NOTIFICATION_MARKED_READ,
  });
});

// Mark multiple notifications as read
const markMultipleNotificationsAsRead = asyncHandler(async (req, res) => {
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return res.status(400).json({
      success: false,
      error: "Notification IDs array is required",
    });
  }

  const query = {
    _id: { $in: notificationIds },
    isActive: true,
  };

  // Add user filter if not admin
  if (!["admin", "super_admin"].includes(req.user.role)) {
    query.userId = req.user._id;
  }

  const result = await Notification.updateMany(
    query,
    {
      $set: {
        status: "read",
        readAt: new Date(),
      },
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: {
      modifiedCount: result.modifiedCount,
      totalCount: notificationIds.length,
    },
    message: SUCCESS_MESSAGES.NOTIFICATIONS_MARKED_READ,
  });
});

// Delete notification
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id, isActive: true };

  // Add user filter if not admin
  if (!["admin", "super_admin"].includes(req.user.role)) {
    query.userId = req.user._id;
  }

  const notification = await Notification.findOne(query);

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.NOTIFICATION_NOT_FOUND,
    });
  }

  // Soft delete
  notification.isActive = false;
  await notification.save();

  res.status(200).json({
    success: true,
    message: SUCCESS_MESSAGES.NOTIFICATION_DELETED,
  });
});

// Get user notification preferences
const getUserNotificationPreferences = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if user can access these preferences
  if (!["admin", "super_admin"].includes(req.user.role) && req.user._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      error: "Access denied - can only access own notification preferences",
    });
  }

  // This would typically fetch from a separate preferences collection
  // For now, return a default structure
  const preferences = {
    userId,
    email: true,
    sms: true,
    push: true,
    inApp: true,
    categories: {
      booking: { email: true, sms: true, push: true },
      loyalty: { email: true, sms: false, push: true },
      payment: { email: true, sms: true, push: false },
      marketing: { email: false, sms: false, push: false },
      system: { email: true, sms: false, push: true },
    },
    frequency: "immediate",
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "08:00",
      timezone: "UTC",
    },
  };

  res.status(200).json({
    success: true,
    data: preferences,
    message: SUCCESS_MESSAGES.PREFERENCES_RETRIEVED,
  });
});

// Update user notification preferences
const updateUserNotificationPreferences = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const preferences = req.body;

  // Check if user can update these preferences
  if (!["admin", "super_admin"].includes(req.user.role) && req.user._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      error: "Access denied - can only update own notification preferences",
    });
  }

  // This would typically update a separate preferences collection
  // For now, return success
  logger.info("Notification preferences updated:", {
    userId,
    preferences,
    updatedBy: req.user._id,
    requestId: req.requestId,
  });

  res.status(200).json({
    success: true,
    message: SUCCESS_MESSAGES.PREFERENCES_UPDATED,
  });
});

// Get notification templates
const getNotificationTemplates = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    category,
    isActive,
    approvalStatus,
  } = req.query;

  const query = {};

  // Add filters
  if (type) query.type = type;
  if (category) query.category = category;
  if (isActive !== undefined) query.isActive = isActive === "true";
  if (approvalStatus) query.approvalStatus = approvalStatus;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const templates = await NotificationTemplate.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select("-content"); // Exclude content for list view

  const total = await NotificationTemplate.countDocuments(query);

  res.status(200).json({
    success: true,
    data: templates,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
    message: SUCCESS_MESSAGES.TEMPLATES_RETRIEVED,
  });
});

// Get notification template by ID
const getNotificationTemplateById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const template = await NotificationTemplate.findById(id);

  if (!template) {
    return res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
    });
  }

  res.status(200).json({
    success: true,
    data: template,
    message: SUCCESS_MESSAGES.TEMPLATE_RETRIEVED,
  });
});

// Create notification template
const createNotificationTemplate = asyncHandler(async (req, res) => {
  const templateData = {
    ...req.body,
    createdBy: req.user._id,
  };

  const template = await NotificationTemplate.create(templateData);

  res.status(201).json({
    success: true,
    data: template,
    message: SUCCESS_MESSAGES.TEMPLATE_CREATED,
  });
});

// Update notification template
const updateNotificationTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = {
    ...req.body,
    lastModifiedBy: req.user._id,
  };

  const template = await NotificationTemplate.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!template) {
    return res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
    });
  }

  res.status(200).json({
    success: true,
    data: template,
    message: SUCCESS_MESSAGES.TEMPLATE_UPDATED,
  });
});

// Delete notification template
const deleteNotificationTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const template = await NotificationTemplate.findById(id);

  if (!template) {
    return res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
    });
  }

  // Check if template is in use
  const usageCount = await Notification.countDocuments({ templateId: id });
  if (usageCount > 0) {
    return res.status(400).json({
      success: false,
      error: "Cannot delete template that is currently in use",
    });
  }

  await NotificationTemplate.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: SUCCESS_MESSAGES.TEMPLATE_DELETED,
  });
});

// Preview template with data
const previewTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data = {} } = req.body;

  const template = await NotificationTemplate.findById(id);

  if (!template) {
    return res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
    });
  }

  const rendered = template.render(data);

  if (!rendered.missingVariables.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Missing required template variables",
      details: rendered.missingVariables,
    });
  }

  res.status(200).json({
    success: true,
    data: {
      original: {
        subject: template.subject,
        content: template.content,
      },
      rendered: {
        subject: rendered.subject,
        content: rendered.content,
      },
      variables: template.variables,
    },
    message: SUCCESS_MESSAGES.TEMPLATE_PREVIEW_GENERATED,
  });
});

module.exports = {
  getNotifications,
  getNotificationById,
  getNotificationStats,
  markNotificationAsRead,
  markMultipleNotificationsAsRead,
  deleteNotification,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  getNotificationTemplates,
  getNotificationTemplateById,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  previewTemplate,
};
