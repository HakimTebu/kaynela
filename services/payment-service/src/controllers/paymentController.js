const Payment = require("../models/Payment");
const PaymentMethod = require("../models/PaymentMethod");
const { asyncHandler } = require("../utils/errors");
const logger = require("../utils/logger");
const { client: redisClient } = require("../config/redis");
const {
  publishPaymentCreatedEvent,
  publishPaymentProcessedEvent,
  publishPaymentCompletedEvent,
  publishPaymentFailedEvent,
  publishPaymentCancelledEvent,
  publishPaymentNotificationEvent,
  publishLoyaltyPointsEarnedEvent,
} = require("../services/rabbitmq");

// Create a new payment
const createPayment = asyncHandler(async (req, res) => {
  const {
    userId,
    amount,
    currency,
    paymentMethod,
    paymentProvider,
    description,
    metadata,
    bookingId,
    orderId,
  } = req.body;

  // Validate payment method exists and is usable
  const userPaymentMethod = await PaymentMethod.findOne({
    userId,
    _id: paymentMethod,
    isActive: true,
    isVerified: true,
  });

  if (!userPaymentMethod) {
    return res.status(400).json({
      success: false,
      error: "Invalid or unverified payment method",
      requestId: req.requestId,
    });
  }

  // Check if payment method is expired
  if (userPaymentMethod.isExpired) {
    return res.status(400).json({
      success: false,
      error: "Payment method has expired",
      requestId: req.requestId,
    });
  }

  // Create payment record
  const payment = new Payment({
    userId,
    amount,
    currency,
    paymentMethod: userPaymentMethod.type,
    paymentProvider,
    description,
    metadata,
    bookingId,
    orderId,
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
    createdBy: req.user._id,
  });

  await payment.save();

  // Publish payment created event
  await publishPaymentCreatedEvent(payment);

  // Cache payment for quick access
  await redisClient.setEx(
    `payment:${payment._id}`,
    300, // 5 minutes TTL
    JSON.stringify(payment)
  );

  logger.info("Payment created successfully", {
    paymentId: payment._id,
    userId,
    amount,
    currency,
    requestId: req.requestId,
  });

  res.status(201).json({
    success: true,
    message: "Payment created successfully",
    data: {
      paymentId: payment._id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentProvider: payment.paymentProvider,
      description: payment.description,
      initiatedAt: payment.initiatedAt,
    },
    requestId: req.requestId,
  });
});

// Process payment
const processPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  // Get payment from cache or database
  let payment = await redisClient.get(`payment:${paymentId}`);
  if (payment) {
    payment = JSON.parse(payment);
  } else {
    payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment not found",
        requestId: req.requestId,
      });
    }
  }

  // Check if payment can be processed
  if (payment.status !== "pending") {
    return res.status(400).json({
      success: false,
      error: "Payment cannot be processed in current status",
      requestId: req.requestId,
    });
  }

  // Check if payment has expired
  if (payment.isExpired) {
    payment.status = "failed";
    payment.errorCode = "PAYMENT_EXPIRED";
    payment.errorMessage = "Payment has expired";
    await payment.save();

    await publishPaymentFailedEvent(payment, { reason: "Payment expired" });
    await publishPaymentNotificationEvent(
      { _id: payment.userId },
      "payment_failure",
      "Payment has expired"
    );

    return res.status(400).json({
      success: false,
      error: "Payment has expired",
      requestId: req.requestId,
    });
  }

  try {
    // Update payment status to processing
    payment.status = "processing";
    await payment.save();

    // Publish payment processed event
    await publishPaymentProcessedEvent(payment);

    // Simulate payment processing (replace with actual provider integration)
    const processingResult = await simulatePaymentProcessing(payment);

    if (processingResult.success) {
      // Payment successful
      payment.status = "completed";
      payment.providerPaymentId = processingResult.providerPaymentId;
      payment.providerTransactionId = processingResult.providerTransactionId;
      payment.processingFee = processingResult.processingFee;
      await payment.save();

      // Update payment method usage
      const paymentMethod = await PaymentMethod.findById(payment.paymentMethod);
      if (paymentMethod) {
        await paymentMethod.incrementUsage(payment.amount);
      }

      // Publish payment completed event
      await publishPaymentCompletedEvent(payment);

      // Calculate and publish loyalty points
      const pointsEarned = Math.floor(payment.amount * 10); // 10 points per currency unit
      await publishLoyaltyPointsEarnedEvent(
        { _id: payment.userId },
        payment,
        pointsEarned
      );

      // Send success notification
      await publishPaymentNotificationEvent(
        { _id: payment.userId },
        "payment_success",
        `Payment of ${payment.amount} ${payment.currency} completed successfully`
      );

      // Update cache
      await redisClient.setEx(
        `payment:${payment._id}`,
        300,
        JSON.stringify(payment)
      );

      logger.info("Payment processed successfully", {
        paymentId: payment._id,
        userId: payment.userId,
        amount: payment.amount,
        requestId: req.requestId,
      });

      res.json({
        success: true,
        message: "Payment processed successfully",
        data: {
          paymentId: payment._id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          providerPaymentId: payment.providerPaymentId,
          providerTransactionId: payment.providerTransactionId,
          processingFee: payment.processingFee,
          completedAt: payment.completedAt,
          pointsEarned,
        },
        requestId: req.requestId,
      });
    } else {
      // Payment failed
      payment.status = "failed";
      payment.errorCode = processingResult.errorCode;
      payment.errorMessage = processingResult.errorMessage;
      payment.errorDetails = processingResult.errorDetails;
      await payment.save();

      await publishPaymentFailedEvent(payment, processingResult.errorDetails);
      await publishPaymentNotificationEvent(
        { _id: payment.userId },
        "payment_failure",
        `Payment failed: ${processingResult.errorMessage}`
      );

      // Update cache
      await redisClient.setEx(
        `payment:${payment._id}`,
        300,
        JSON.stringify(payment)
      );

      res.status(400).json({
        success: false,
        error: "Payment processing failed",
        details: {
          errorCode: payment.errorCode,
          errorMessage: payment.errorMessage,
        },
        requestId: req.requestId,
      });
    }
  } catch (error) {
    // Payment processing error
    payment.status = "failed";
    payment.errorCode = "PROCESSING_ERROR";
    payment.errorMessage = "Payment processing error";
    payment.errorDetails = { error: error.message };
    await payment.save();

    await publishPaymentFailedEvent(payment, { error: error.message });
    await publishPaymentNotificationEvent(
      { _id: payment.userId },
      "payment_failure",
      "Payment processing error occurred"
    );

    logger.error("Payment processing error", {
      paymentId: payment._id,
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: "Payment processing error",
      requestId: req.requestId,
    });
  }
});

// Get payment by ID
const getPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  // Try to get from cache first
  let payment = await redisClient.get(`payment:${paymentId}`);
  if (payment) {
    payment = JSON.parse(payment);
  } else {
    payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment not found",
        requestId: req.requestId,
      });
    }

    // Cache the payment
    await redisClient.setEx(
      `payment:${paymentId}`,
      300,
      JSON.stringify(payment)
    );
  }

  // Check if user can access this payment
  if (payment.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  res.json({
    success: true,
    data: payment,
    requestId: req.requestId,
  });
});

// Get user payments
const getUserPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, paymentMethod, startDate, endDate } = req.query;
  const userId = req.user._id;

  // Build filter
  const filter = { userId, isActive: true };
  if (status) filter.status = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Payment.countDocuments(filter);
  const totalPages = Math.ceil(total / parseInt(limit));

  // Get payments
  const payments = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("bookingId", "bookingNumber description")
    .populate("orderId", "orderNumber description");

  res.json({
    success: true,
    data: {
      payments,
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

// Cancel payment
const cancelPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const { reason } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return res.status(404).json({
      success: false,
      error: "Payment not found",
      requestId: req.requestId,
    });
  }

  // Check if user can cancel this payment
  if (payment.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Check if payment can be cancelled
  if (!payment.canCancel()) {
    return res.status(400).json({
      success: false,
      error: "Payment cannot be cancelled in current status",
      requestId: req.requestId,
    });
  }

  // Cancel the payment
  await payment.cancel(reason, req.user._id);

  // Publish payment cancelled event
  await publishPaymentCancelledEvent(payment, reason);

  // Send cancellation notification
  await publishPaymentNotificationEvent(
    { _id: payment.userId },
    "payment_cancelled",
    `Payment of ${payment.amount} ${payment.currency} has been cancelled`
  );

  // Update cache
  await redisClient.setEx(
    `payment:${payment._id}`,
    300,
    JSON.stringify(payment)
  );

  logger.info("Payment cancelled successfully", {
    paymentId: payment._id,
    userId: payment.userId,
    reason,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Payment cancelled successfully",
    data: {
      paymentId: payment._id,
      status: payment.status,
      cancelledAt: payment.cancelledAt,
      cancellationReason: reason,
    },
    requestId: req.requestId,
  });
});

// Retry failed payment
const retryPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return res.status(404).json({
      success: false,
      error: "Payment not found",
      requestId: req.requestId,
    });
  }

  // Check if user can retry this payment
  if (payment.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Check if payment can be retried
  if (!payment.canRetry()) {
    return res.status(400).json({
      success: false,
      error: "Payment cannot be retried",
      requestId: req.requestId,
    });
  }

  // Reset payment for retry
  payment.status = "pending";
  payment.errorCode = undefined;
  payment.errorMessage = undefined;
  payment.errorDetails = undefined;
  await payment.save();

  // Publish payment created event for retry
  await publishPaymentCreatedEvent(payment);

  // Update cache
  await redisClient.setEx(
    `payment:${payment._id}`,
    300,
    JSON.stringify(payment)
  );

  logger.info("Payment retry initiated", {
    paymentId: payment._id,
    userId: payment.userId,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Payment retry initiated",
    data: {
      paymentId: payment._id,
      status: payment.status,
      initiatedAt: payment.initiatedAt,
    },
    requestId: req.requestId,
  });
});

// Get payment analytics
const getPaymentAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user._id;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const end = endDate ? new Date(endDate) : new Date();

  // Get payment summary
  const summary = await Payment.getPaymentSummary(userId);

  // Get payment analytics
  const analytics = await Payment.getPaymentAnalytics(start, end);

  res.json({
    success: true,
    data: {
      summary,
      analytics,
      period: {
        startDate: start,
        endDate: end,
      },
    },
    requestId: req.requestId,
  });
});

// Simulate payment processing (replace with actual provider integration)
async function simulatePaymentProcessing(payment) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate success/failure (90% success rate for demo)
  const isSuccess = Math.random() > 0.1;

  if (isSuccess) {
    return {
      success: true,
      providerPaymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      providerTransactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      processingFee: Math.round(payment.amount * 0.029 * 100) / 100, // 2.9% fee
    };
  } else {
    const errorCodes = ["INSUFFICIENT_FUNDS", "CARD_DECLINED", "INVALID_CARD", "EXPIRED_CARD"];
    const errorMessages = [
      "Insufficient funds",
      "Card was declined",
      "Invalid card details",
      "Card has expired",
    ];

    const randomIndex = Math.floor(Math.random() * errorCodes.length);
    return {
      success: false,
      errorCode: errorCodes[randomIndex],
      errorMessage: errorMessages[randomIndex],
      errorDetails: { reason: "Simulated payment failure" },
    };
  }
}

module.exports = {
  createPayment,
  processPayment,
  getPayment,
  getUserPayments,
  cancelPayment,
  retryPayment,
  getPaymentAnalytics,
};
