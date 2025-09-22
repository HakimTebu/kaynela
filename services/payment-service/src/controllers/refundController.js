const Refund = require("../models/Refund");
const Payment = require("../models/Payment");
const { asyncHandler } = require("../utils/errors");
const logger = require("../utils/logger");
const { client: redisClient } = require("../config/redis");
const {
  publishRefundCreatedEvent,
  publishRefundProcessedEvent,
  publishPaymentNotificationEvent,
} = require("../services/rabbitmq");

// Create a new refund
const createRefund = asyncHandler(async (req, res) => {
  const {
    transactionId,
    amount,
    currency,
    reason,
    refundType,
    description,
    requiresApproval,
    metadata,
  } = req.body;

  // Validate transaction exists and can be refunded
  const transaction = await Payment.findById(transactionId);
  if (!transaction) {
    return res.status(404).json({
      success: false,
      error: "Transaction not found",
      requestId: req.requestId,
    });
  }

  // Check if user can refund this transaction
  if (transaction.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Check if transaction can be refunded
  if (!transaction.canRefund()) {
    return res.status(400).json({
      success: false,
      error: "Transaction cannot be refunded in current status",
      requestId: req.requestId,
    });
  }

  // Check refund amount
  const refundableAmount = transaction.getRefundableAmount();
  if (amount > refundableAmount) {
    return res.status(400).json({
      success: false,
      error: "Refund amount cannot exceed original payment amount",
      requestId: req.requestId,
    });
  }

  // Create refund record
  const refund = new Refund({
    transactionId,
    userId: transaction.userId,
    amount,
    currency: transaction.currency,
    refundType,
    reason,
    description,
    requiresApproval: requiresApproval || amount > 1000, // Auto-approve small amounts
    metadata,
    createdBy: req.user._id,
  });

  await refund.save();

  // Publish refund created event
  await publishRefundCreatedEvent(refund);

  // Send notification
  await publishPaymentNotificationEvent(
    { _id: transaction.userId },
    "refund_requested",
    `Refund request of ${amount} ${currency} has been submitted`
  );

  logger.info("Refund created successfully", {
    refundId: refund._id,
    transactionId,
    userId: transaction.userId,
    amount,
    currency,
    requestId: req.requestId,
  });

  res.status(201).json({
    success: true,
    message: "Refund request created successfully",
    data: {
      refundId: refund._id,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
      refundType: refund.refundType,
      reason: refund.reason,
      requiresApproval: refund.requiresApproval,
      requestedAt: refund.requestedAt,
    },
    requestId: req.requestId,
  });
});

// Process refund
const processRefund = asyncHandler(async (req, res) => {
  const { refundId } = req.params;

  const refund = await Refund.findById(refundId);
  if (!refund) {
    return res.status(404).json({
      success: false,
      error: "Refund not found",
      requestId: req.requestId,
    });
  }

  // Check if user can process this refund
  if (!["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied - admin privileges required",
      requestId: req.requestId,
    });
  }

  // Check if refund can be processed
  if (refund.status !== "pending") {
    return res.status(400).json({
      success: false,
      error: "Refund cannot be processed in current status",
      requestId: req.requestId,
    });
  }

  try {
    // Update refund status to processing
    refund.status = "processing";
    await refund.save();

    // Publish refund processed event
    await publishRefundProcessedEvent(refund);

    // Simulate refund processing (replace with actual provider integration)
    const processingResult = await simulateRefundProcessing(refund);

    if (processingResult.success) {
      // Refund successful
      refund.status = "completed";
      refund.providerRefundId = processingResult.providerRefundId;
      refund.providerTransactionId = processingResult.providerTransactionId;
      await refund.save();

      // Update original transaction status
      const transaction = await Payment.findById(refund.transactionId);
      if (transaction) {
        if (refund.refundType === "full") {
          transaction.status = "refunded";
        } else {
          transaction.status = "partially_refunded";
        }
        await transaction.save();
      }

      // Send success notification
      await publishPaymentNotificationEvent(
        { _id: refund.userId },
        "refund_processed",
        `Refund of ${refund.amount} ${refund.currency} has been processed successfully`
      );

      logger.info("Refund processed successfully", {
        refundId: refund._id,
        transactionId: refund.transactionId,
        userId: refund.userId,
        amount: refund.amount,
        requestId: req.requestId,
      });

      res.json({
        success: true,
        message: "Refund processed successfully",
        data: {
          refundId: refund._id,
          status: refund.status,
          amount: refund.amount,
          currency: refund.currency,
          providerRefundId: refund.providerRefundId,
          providerTransactionId: refund.providerTransactionId,
          completedAt: refund.completedAt,
        },
        requestId: req.requestId,
      });
    } else {
      // Refund failed
      refund.status = "failed";
      refund.errorCode = processingResult.errorCode;
      refund.errorMessage = processingResult.errorMessage;
      refund.errorDetails = processingResult.errorDetails;
      await refund.save();

      // Send failure notification
      await publishPaymentNotificationEvent(
        { _id: refund.userId },
        "refund_failed",
        `Refund failed: ${processingResult.errorMessage}`
      );

      res.status(400).json({
        success: false,
        error: "Refund processing failed",
        details: {
          errorCode: refund.errorCode,
          errorMessage: refund.errorMessage,
        },
        requestId: req.requestId,
      });
    }
  } catch (error) {
    // Refund processing error
    refund.status = "failed";
    refund.errorCode = "PROCESSING_ERROR";
    refund.errorMessage = "Refund processing error";
    refund.errorDetails = { error: error.message };
    await refund.save();

    logger.error("Refund processing error", {
      refundId: refund._id,
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: "Refund processing error",
      requestId: req.requestId,
    });
  }
});

// Get refund by ID
const getRefund = asyncHandler(async (req, res) => {
  const { refundId } = req.params;

  const refund = await Refund.findById(refundId);
  if (!refund) {
    return res.status(404).json({
      success: false,
      error: "Refund not found",
      requestId: req.requestId,
    });
  }

  // Check if user can access this refund
  if (refund.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Populate transaction details
  await refund.populate("transactionId", "amount currency description");

  res.json({
    success: true,
    data: refund,
    requestId: req.requestId,
  });
});

// Get user refunds
const getUserRefunds = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, refundType, startDate, endDate } = req.query;
  const userId = req.user._id;

  // Build filter
  const filter = { userId, isActive: true };
  if (status) filter.status = status;
  if (refundType) filter.refundType = refundType;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Refund.countDocuments(filter);
  const totalPages = Math.ceil(total / parseInt(limit));

  // Get refunds
  const refunds = await Refund.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("transactionId", "amount currency description");

  res.json({
    success: true,
    data: {
      refunds,
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

// Approve refund (admin only)
const approveRefund = asyncHandler(async (req, res) => {
  const { refundId } = req.params;
  const { notes } = req.body;

  const refund = await Refund.findById(refundId);
  if (!refund) {
    return res.status(404).json({
      success: false,
      error: "Refund not found",
      requestId: req.requestId,
    });
  }

  // Check if user can approve this refund
  if (!["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied - admin privileges required",
      requestId: req.requestId,
    });
  }

  // Check if refund can be approved
  if (!refund.canApprove()) {
    return res.status(400).json({
      success: false,
      error: "Refund cannot be approved in current status",
      requestId: req.requestId,
    });
  }

  // Approve the refund
  await refund.approve(req.user._id, notes);

  // Send approval notification
  await publishPaymentNotificationEvent(
    { _id: refund.userId },
    "refund_approved",
    `Your refund request of ${refund.amount} ${refund.currency} has been approved`
  );

  logger.info("Refund approved successfully", {
    refundId: refund._id,
    approvedBy: req.user._id,
    notes,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Refund approved successfully",
    data: {
      refundId: refund._id,
      status: refund.status,
      approvedBy: refund.approvedBy,
      approvedAt: refund.approvedAt,
      approvalNotes: refund.approvalNotes,
    },
    requestId: req.requestId,
  });
});

// Cancel refund
const cancelRefund = asyncHandler(async (req, res) => {
  const { refundId } = req.params;
  const { reason } = req.body;

  const refund = await Refund.findById(refundId);
  if (!refund) {
    return res.status(404).json({
      success: false,
      error: "Refund not found",
      requestId: req.requestId,
    });
  }

  // Check if user can cancel this refund
  if (refund.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Check if refund can be cancelled
  if (!refund.canCancel()) {
    return res.status(400).json({
      success: false,
      error: "Refund cannot be cancelled in current status",
      requestId: req.requestId,
    });
  }

  // Cancel the refund
  await refund.cancel(reason, req.user._id);

  // Send cancellation notification
  await publishPaymentNotificationEvent(
    { _id: refund.userId },
    "refund_cancelled",
    `Your refund request of ${refund.amount} ${refund.currency} has been cancelled`
  );

  logger.info("Refund cancelled successfully", {
    refundId: refund._id,
    userId: refund.userId,
    reason,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Refund cancelled successfully",
    data: {
      refundId: refund._id,
      status: refund.status,
      cancelledAt: refund.cancelledAt,
      cancellationReason: reason,
    },
    requestId: req.requestId,
  });
});

// Get refund analytics
const getRefundAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user._id;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const end = endDate ? new Date(endDate) : new Date();

  // Get refund summary
  const summary = await Refund.getRefundSummary(userId);

  // Get refund analytics
  const analytics = await Refund.getRefundAnalytics(start, end);

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

// Simulate refund processing (replace with actual provider integration)
async function simulateRefundProcessing(refund) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate success/failure (95% success rate for demo)
  const isSuccess = Math.random() > 0.05;

  if (isSuccess) {
    return {
      success: true,
      providerRefundId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      providerTransactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  } else {
    const errorCodes = ["INSUFFICIENT_FUNDS", "ACCOUNT_CLOSED", "INVALID_ACCOUNT", "PROCESSING_ERROR"];
    const errorMessages = [
      "Insufficient funds in account",
      "Account has been closed",
      "Invalid account details",
      "Processing error occurred",
    ];

    const randomIndex = Math.floor(Math.random() * errorCodes.length);
    return {
      success: false,
      errorCode: errorCodes[randomIndex],
      errorMessage: errorMessages[randomIndex],
      errorDetails: { reason: "Simulated refund failure" },
    };
  }
}

module.exports = {
  createRefund,
  processRefund,
  getRefund,
  getUserRefunds,
  approveRefund,
  cancelRefund,
  getRefundAnalytics,
};
