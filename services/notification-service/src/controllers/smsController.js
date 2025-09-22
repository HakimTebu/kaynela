const Notification = require("../models/Notification");
const NotificationTemplate = require("../models/NotificationTemplate");
const { asyncHandler } = require("../utils/errors");
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require("../constants");
const logger = require("../utils/logger");
const { publishNotificationSentEvent, publishNotificationFailedEvent } = require("../services/rabbitmq");

// Send SMS notification
const sendSMSNotification = asyncHandler(async (req, res) => {
  const {
    to,
    message,
    templateId,
    templateData = {},
    priority = "normal",
    metadata = {},
  } = req.body;

  try {
    let smsMessage = message;

    // If template is provided, render it
    if (templateId) {
      const template = await NotificationTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
        });
      }

      if (template.type !== "sms") {
        return res.status(400).json({
          success: false,
          error: "Template is not an SMS template",
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

      smsMessage = rendered.content;

      // Increment template usage
      await template.incrementUsage();
    }

    // Create notification record
    const notification = new Notification({
      userId: req.user?._id || null,
      channel: "sms",
      type: "sms_notification",
      category: metadata.category || "general",
      message: smsMessage,
      recipient: {
        phone: to,
      },
      templateId: templateId || null,
      templateData,
      priority,
      metadata,
      provider: {
        name: "twilio", // This would be configurable
      },
      source: "api",
      createdBy: req.user?._id || null,
    });

    await notification.save();

    // TODO: Actually send SMS using configured provider (Twilio, AWS SNS, etc.)
    // For now, simulate successful sending
    await notification.markAsSent({
      provider: "twilio",
      messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      message: SUCCESS_MESSAGES.SMS_SENT,
    });
  } catch (error) {
    logger.error("Failed to send SMS notification:", error);

    // If notification was created, mark it as failed
    if (notification) {
      await notification.markAsFailed("SMS sending failed", { error: error.message });
      await publishNotificationFailedEvent(notification, "SMS sending failed");
    }

    throw error;
  }
});

// Send bulk SMS notifications
const sendBulkSMSNotifications = asyncHandler(async (req, res) => {
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

  if (recipients.length > 100) {
    return res.status(400).json({
      success: false,
      error: "Maximum 100 recipients allowed per bulk SMS operation",
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

  if (template.type !== "sms") {
    return res.status(400).json({
      success: false,
      error: "Template is not an SMS template",
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

  const bulkId = `bulk_sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      const notification = new Notification({
        userId: recipient.userId || null,
        channel: "sms",
        type: "bulk_sms_notification",
        category: metadata.category || "bulk",
        message: rendered.content,
        recipient: {
          phone: recipient.phone,
        },
        templateId,
        templateData,
        priority,
        metadata: {
          ...metadata,
          bulkId,
          recipientId: recipient.id || recipient.phone,
        },
        provider: {
          name: "twilio",
        },
        source: "bulk_api",
        createdBy: req.user?._id || null,
        correlationId: bulkId,
      });

      await notification.save();
      notifications.push(notification);
      results.notifications.push({
        phone: recipient.phone,
        notificationId: notification._id,
        status: "created",
      });
    } catch (error) {
      logger.error(`Failed to create SMS notification for ${recipient.phone}:`, error);
      results.failedDeliveries++;
      results.notifications.push({
        phone: recipient.phone,
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
        provider: "twilio",
        messageId: `bulk_sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      results.successfulDeliveries++;
      
      const notificationIndex = results.notifications.findIndex(
        (n) => n.notificationId?.toString() === notification._id.toString()
      );
      if (notificationIndex !== -1) {
        results.notifications[notificationIndex].status = "sent";
      }
    } catch (error) {
      logger.error(`Failed to mark SMS notification as sent: ${notification._id}`, error);
      results.failedDeliveries++;
    }
  }

  // Increment template usage
  await template.incrementUsage();

  res.status(200).json({
    success: true,
    data: results,
    message: SUCCESS_MESSAGES.BULK_SMS_SENT,
  });
});

// Get SMS notification history
const getSMSNotificationHistory = asyncHandler(async (req, res) => {
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
    channel: "sms",
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
    message: SUCCESS_MESSAGES.SMS_HISTORY_RETRIEVED,
  });
});

// Get SMS notification statistics
const getSMSNotificationStats = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  const query = {
    channel: "sms",
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
    message: SUCCESS_MESSAGES.SMS_STATS_RETRIEVED,
  });
});

// Resend failed SMS notification
const resendFailedSMSNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id, channel: "sms", isActive: true };

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
    message: SUCCESS_MESSAGES.SMS_RESENT,
  });
});

// Test SMS configuration
const testSMSConfiguration = asyncHandler(async (req, res) => {
  const { to, message = "Test SMS from Kaynela Farms Notification Service" } = req.body;

  if (!to) {
    return res.status(400).json({
      success: false,
      error: "Recipient phone number is required",
    });
  }

  try {
    // TODO: Actually send test SMS using configured provider
    // For now, simulate successful sending
    logger.info("Test SMS would be sent to:", { to, message });

    res.status(200).json({
      success: true,
      message: "Test SMS sent successfully",
      data: {
        to,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to send test SMS:", error);
    throw error;
  }
});

// Send OTP SMS
const sendOTPSMS = asyncHandler(async (req, res) => {
  const { to, purpose = "verification" } = req.body;

  if (!to) {
    return res.status(400).json({
      success: false,
      error: "Recipient phone number is required",
    });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const message = `Your Kaynela Farms verification code is: ${otp}. Valid for 10 minutes.`;

  try {
    // Create notification record
    const notification = new Notification({
      userId: req.user?._id || null,
      channel: "sms",
      type: "otp_sms",
      category: "otp",
      message,
      recipient: {
        phone: to,
      },
      priority: "high",
      metadata: {
        purpose,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
      provider: {
        name: "twilio",
      },
      source: "api",
      createdBy: req.user?._id || null,
    });

    await notification.save();

    // TODO: Actually send SMS using configured provider
    // For now, simulate successful sending
    await notification.markAsSent({
      provider: "twilio",
      messageId: `otp_sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    // Publish event
    await publishNotificationSentEvent(notification);

    res.status(200).json({
      success: true,
      data: {
        notificationId: notification._id,
        status: notification.status,
        sentAt: notification.sentAt,
        purpose,
        expiresAt: notification.metadata.expiresAt,
      },
      message: SUCCESS_MESSAGES.OTP_SMS_SENT,
    });
  } catch (error) {
    logger.error("Failed to send OTP SMS:", error);

    // If notification was created, mark it as failed
    if (notification) {
      await notification.markAsFailed("OTP SMS sending failed", { error: error.message });
      await publishNotificationFailedEvent(notification, "OTP SMS sending failed");
    }

    throw error;
  }
});

module.exports = {
  sendSMSNotification,
  sendBulkSMSNotifications,
  getSMSNotificationHistory,
  getSMSNotificationStats,
  resendFailedSMSNotification,
  testSMSConfiguration,
  sendOTPSMS,
};
