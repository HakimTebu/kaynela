const Notification = require("../models/Notification");
const NotificationTemplate = require("../models/NotificationTemplate");
const { asyncHandler } = require("../utils/errors");
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require("../constants");
const logger = require("../utils/logger");
const { publishNotificationSentEvent, publishNotificationFailedEvent } = require("../services/rabbitmq");

// Send email notification
const sendEmailNotification = asyncHandler(async (req, res) => {
  const {
    to,
    subject,
    content,
    templateId,
    templateData = {},
    priority = "normal",
    metadata = {},
  } = req.body;

  try {
    let emailSubject = subject;
    let emailContent = content;

    // If template is provided, render it
    if (templateId) {
      const template = await NotificationTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.TEMPLATE_NOT_FOUND,
        });
      }

      if (template.type !== "email") {
        return res.status(400).json({
          success: false,
          error: "Template is not an email template",
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

      emailSubject = rendered.subject;
      emailContent = rendered.content;

      // Increment template usage
      await template.incrementUsage();
    }

    // Create notification record
    const notification = new Notification({
      userId: req.user?._id || null,
      channel: "email",
      type: "email_notification",
      category: metadata.category || "general",
      subject: emailSubject,
      content: emailContent,
      recipient: {
        email: to,
      },
      templateId: templateId || null,
      templateData,
      priority,
      metadata,
      provider: {
        name: "smtp", // This would be configurable
      },
      source: "api",
      createdBy: req.user?._id || null,
    });

    await notification.save();

    // TODO: Actually send email using configured provider (SMTP, SendGrid, etc.)
    // For now, simulate successful sending
    await notification.markAsSent({
      provider: "smtp",
      messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      message: SUCCESS_MESSAGES.EMAIL_SENT,
    });
  } catch (error) {
    logger.error("Failed to send email notification:", error);

    // If notification was created, mark it as failed
    if (notification) {
      await notification.markAsFailed("Email sending failed", { error: error.message });
      await publishNotificationFailedEvent(notification, "Email sending failed");
    }

    throw error;
  }
});

// Send bulk email notifications
const sendBulkEmailNotifications = asyncHandler(async (req, res) => {
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
      error: "Maximum 1000 recipients allowed per bulk operation",
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

  if (template.type !== "email") {
    return res.status(400).json({
      success: false,
      error: "Template is not an email template",
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

  const bulkId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        channel: "email",
        type: "bulk_email_notification",
        category: metadata.category || "bulk",
        subject: rendered.subject,
        content: rendered.content,
        recipient: {
          email: recipient.email,
        },
        templateId,
        templateData,
        priority,
        metadata: {
          ...metadata,
          bulkId,
          recipientId: recipient.id || recipient.email,
        },
        provider: {
          name: "smtp",
        },
        source: "bulk_api",
        createdBy: req.user?._id || null,
        correlationId: bulkId,
      });

      await notification.save();
      notifications.push(notification);
      results.notifications.push({
        email: recipient.email,
        notificationId: notification._id,
        status: "created",
      });
    } catch (error) {
      logger.error(`Failed to create notification for ${recipient.email}:`, error);
      results.failedDeliveries++;
      results.notifications.push({
        email: recipient.email,
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
        provider: "smtp",
        messageId: `bulk_email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      results.successfulDeliveries++;
      
      const notificationIndex = results.notifications.findIndex(
        (n) => n.notificationId?.toString() === notification._id.toString()
      );
      if (notificationIndex !== -1) {
        results.notifications[notificationIndex].status = "sent";
      }
    } catch (error) {
      logger.error(`Failed to mark notification as sent: ${notification._id}`, error);
      results.failedDeliveries++;
    }
  }

  // Increment template usage
  await template.incrementUsage();

  res.status(200).json({
    success: true,
    data: results,
    message: SUCCESS_MESSAGES.BULK_EMAIL_SENT,
  });
});

// Get email notification history
const getEmailNotificationHistory = asyncHandler(async (req, res) => {
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
    channel: "email",
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
    message: SUCCESS_MESSAGES.EMAIL_HISTORY_RETRIEVED,
  });
});

// Get email notification statistics
const getEmailNotificationStats = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  const query = {
    channel: "email",
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
    message: SUCCESS_MESSAGES.EMAIL_STATS_RETRIEVED,
  });
});

// Resend failed email notification
const resendFailedEmailNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id, channel: "email", isActive: true };

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
    message: SUCCESS_MESSAGES.EMAIL_RESENT,
  });
});

// Test email configuration
const testEmailConfiguration = asyncHandler(async (req, res) => {
  const { to, subject = "Test Email", content = "This is a test email from Kaynela Farms Notification Service" } = req.body;

  if (!to) {
    return res.status(400).json({
      success: false,
      error: "Recipient email is required",
    });
  }

  try {
    // TODO: Actually send test email using configured provider
    // For now, simulate successful sending
    logger.info("Test email would be sent to:", { to, subject, content });

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      data: {
        to,
        subject,
        content,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to send test email:", error);
    throw error;
  }
});

module.exports = {
  sendEmailNotification,
  sendBulkEmailNotifications,
  getEmailNotificationHistory,
  getEmailNotificationStats,
  resendFailedEmailNotification,
  testEmailConfiguration,
};
