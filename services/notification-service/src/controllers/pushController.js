const Notification = require("../models/Notification");
const NotificationTemplate = require("../models/NotificationTemplate");
const { asyncHandler } = require("../utils/errors");
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require("../constants");
const logger = require("../utils/logger");
const { publishNotificationSentEvent, publishNotificationFailedEvent } = require("../services/rabbitmq");

// Send push notification
const sendPushNotification = asyncHandler(async (req, res) => {
  const {
    userId,
    title,
    body,
    data = {},
    templateId,
    templateData = {},
    priority = "normal",
    metadata = {},
  } = req.body;

  try {
    let pushTitle = title;
    let pushBody = body;
    let pushData = data;

    // If template is provided, render it
    if (templateId) {
      const template = await NotificationTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
        });
      }

      if (template.type !== "push") {
        return res.status(400).json({
          success: false,
          error: "Template is not a push notification template",
        });
      }

      const rendered = template.render(templateData);
      if (rendered.missingVariables.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Missing required template variables",
          details: rendered.missingVariables,
        });
      }

      pushTitle = rendered.content.split('\n')[0] || title; // First line as title
      pushBody = rendered.content.split('\n').slice(1).join('\n') || body; // Rest as body

      // Increment template usage
      await template.incrementUsage();
    }

    // TODO: Get user's device tokens from device token collection
    // For now, simulate having a device token
    const deviceToken = "simulated_device_token_123";

    // Create notification record
    const notification = new Notification({
      userId,
      channel: "push",
      type: "push_notification",
      category: metadata.category || "general",
      title: pushTitle,
      body: pushBody,
      recipient: {
        deviceToken,
      },
      templateId: templateId || null,
      templateData,
      priority,
      metadata: {
        ...metadata,
        data: pushData,
      },
      provider: {
        name: "firebase", // This would be configurable
      },
      source: "api",
      createdBy: req.user?._id || null,
    });

    await notification.save();

    // TODO: Actually send push notification using configured provider (Firebase, APNS, etc.)
    // For now, simulate successful sending
    await notification.markAsSent({
      provider: "firebase",
      messageId: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    // Publish event
    await publishNotificationSentEvent(notification);

    res.status(200).json({
      success: true,
      data: {
        notificationId: notification._id,
        status: notification.status,
        sentAt: notification.sentAt,
      },
      message: SUCCESS_MESSAGES.PUSH_SENT,
    });
  } catch (error) {
    logger.error("Failed to send push notification:", error);

    // If notification was created, mark it as failed
    if (notification) {
      await notification.markAsFailed("Push notification sending failed", { error: error.message });
      await publishNotificationFailedEvent(notification, "Push notification sending failed");
    }

    throw error;
  }
});

// Send bulk push notifications
const sendBulkPushNotifications = asyncHandler(async (req, res) => {
  const {
    recipients,
    templateId,
    templateData = {},
    priority = "normal",
    metadata = {},
  } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Recipients array is required",
    });
  }

  if (recipients.length > 1000) {
    return res.status(400).json({
      success: false,
      error: "Maximum 1000 recipients allowed per bulk push operation",
    });
  }

  // Validate template
  const template = await NotificationTemplate.findById(templateId);
  if (!template) {
    return res.status(404).json({
      success: false,
      error: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
    });
  }

  if (template.type !== "push") {
    return res.status(400).json({
      success: false,
      error: "Template is not a push notification template",
    });
  }

  // Validate template variables
  const rendered = template.render(templateData);
  if (rendered.missingVariables.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Missing required template variables",
      details: rendered.missingVariables,
    });
  }

  const pushTitle = rendered.content.split('\n')[0] || "Notification";
  const pushBody = rendered.content.split('\n').slice(1).join('\n') || "You have a new notification";

  const bulkId = `bulk_push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const notifications = [];
  const results = {
    bulkId,
    totalRecipients: recipients.length,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    notifications: [],
  };

  // Create notifications for each recipient
  for (const recipient of recipients) {
    try {
      // TODO: Get user's device tokens from device token collection
      const deviceToken = "simulated_device_token_" + recipient.userId;

      const notification = new Notification({
        userId: recipient.userId,
        channel: "push",
        type: "bulk_push_notification",
        category: metadata.category || "bulk",
        title: pushTitle,
        body: pushBody,
        recipient: {
          deviceToken,
        },
        templateId,
        templateData,
        priority,
        metadata: {
          ...metadata,
          bulkId,
          recipientId: recipient.id || recipient.userId,
        },
        provider: {
          name: "firebase",
        },
        source: "bulk_api",
        createdBy: req.user?._id || null,
        correlationId: bulkId,
      });

      await notification.save();
      notifications.push(notification);
      results.notifications.push({
        userId: recipient.userId,
        notificationId: notification._id,
        status: "created",
      });
    } catch (error) {
      logger.error(`Failed to create push notification for user ${recipient.userId}:`, error);
      results.failedDeliveries++;
      results.notifications.push({
        userId: recipient.userId,
        error: error.message,
        status: "failed",
      });
    }
  }

  // TODO: Process notifications in background job
  // For now, mark all as sent
  for (const notification of notifications) {
    try {
      await notification.markAsSent({
        provider: "firebase",
        messageId: `bulk_push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      results.successfulDeliveries++;
      
      const notificationIndex = results.notifications.findIndex(
        (n) => n.notificationId?.toString() === notification._id.toString()
      );
      if (notificationIndex !== -1) {
        results.notifications[notificationIndex].status = "sent";
      }
    } catch (error) {
      logger.error(`Failed to mark push notification as sent: ${notification._id}`, error);
      results.failedDeliveries++;
    }
  }

  // Increment template usage
  await template.incrementUsage();

  res.status(200).json({
    success: true,
    data: results,
    message: SUCCESS_MESSAGES.BULK_PUSH_SENT,
  });
});

// Get push notification history
const getPushNotificationHistory = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    category,
    priority,
    startDate,
    endDate,
  } = req.query;

  const query = {
    channel: "push",
    isActive: true,
  };

  // Add filters
  if (status) query.status = status;
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
    message: SUCCESS_MESSAGES.PUSH_HISTORY_RETRIEVED,
  });
});

// Get push notification statistics
const getPushNotificationStats = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  const query = {
    channel: "push",
    isActive: true,
  };

  // Add user filter if not admin
  if (!["admin", "super_admin"].includes(req.user.role)) {
    query.userId = req.user._id;
  } else if (userId) {
    query.userId = userId;
  }

  const [statusStats, categoryStats, dailyStats] = await Promise.all([
    Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
    Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
          sent: {
            $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      statusStats,
      categoryStats,
      dailyStats,
    },
    message: SUCCESS_MESSAGES.PUSH_STATS_RETRIEVED,
  });
});

// Resend failed push notification
const resendFailedPushNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id, channel: "push", isActive: true };

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

  if (notification.status !== "failed") {
    return res.status(400).json({
      success: false,
      error: "Only failed notifications can be resent",
    });
  }

  // Reset status and schedule for retry
  notification.status = "pending";
  notification.deliveryAttempts = 0;
  notification.nextRetryAt = new Date();
  notification.statusHistory.push({
    status: "pending",
    timestamp: new Date(),
    reason: "Resent by user",
  });

  await notification.save();

  res.status(200).json({
    success: true,
    data: notification,
    message: SUCCESS_MESSAGES.PUSH_RESENT,
  });
});

// Test push notification configuration
const testPushNotificationConfiguration = asyncHandler(async (req, res) => {
  const { 
    title = "Test Push Notification", 
    body = "This is a test push notification from Kaynela Farms Notification Service",
    data = {}
  } = req.body;

  try {
    // TODO: Actually send test push notification using configured provider
    // For now, simulate successful sending
    logger.info("Test push notification would be sent:", { title, body, data });

    res.status(200).json({
      success: true,
      message: "Test push notification sent successfully",
      data: {
        title,
        body,
        data,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to send test push notification:", error);
    throw error;
  }
});

// Register device token
const registerDeviceToken = asyncHandler(async (req, res) => {
  const {
    userId,
    token,
    platform,
    appVersion,
    metadata = {},
  } = req.body;

  try {
    // TODO: Save device token to device token collection
    // For now, simulate successful registration
    logger.info("Device token registered:", {
      userId,
      token,
      platform,
      appVersion,
      metadata,
      requestId: req.requestId,
    });

    res.status(200).json({
      success: true,
      data: {
        userId,
        token,
        platform,
        appVersion,
        registeredAt: new Date().toISOString(),
      },
      message: SUCCESS_MESSAGES.DEVICE_TOKEN_REGISTERED,
    });
  } catch (error) {
    logger.error("Failed to register device token:", error);
    throw error;
  }
});

// Unregister device token
const unregisterDeviceToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  try {
    // TODO: Remove device token from device token collection
    // For now, simulate successful unregistration
    logger.info("Device token unregistered:", { token, requestId: req.requestId });

    res.status(200).json({
      success: true,
      message: "Device token unregistered successfully",
      data: {
        token,
        unregisteredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to unregister device token:", error);
    throw error;
  }
});

// Get user's device tokens
const getUserDeviceTokens = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if user can access these tokens
  if (!["admin", "super_admin"].includes(req.user.role) && req.user._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      error: "Access denied - can only access own device tokens",
    });
  }

  try {
    // TODO: Fetch device tokens from device token collection
    // For now, return simulated data
    const deviceTokens = [
      {
        id: "token_1",
        token: "simulated_device_token_123",
        platform: "ios",
        appVersion: "1.0.0",
        isActive: true,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    res.status(200).json({
      success: true,
      data: deviceTokens,
      message: SUCCESS_MESSAGES.DEVICE_TOKENS_RETRIEVED,
    });
  } catch (error) {
    logger.error("Failed to get user device tokens:", error);
    throw error;
  }
});

module.exports = {
  sendPushNotification,
  sendBulkPushNotifications,
  getPushNotificationHistory,
  getPushNotificationStats,
  resendFailedPushNotification,
  testPushNotificationConfiguration,
  registerDeviceToken,
  unregisterDeviceToken,
  getUserDeviceTokens,
};
