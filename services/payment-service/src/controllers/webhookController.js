const crypto = require("crypto");
const Payment = require("../models/Payment");
const Refund = require("../models/Refund");
const { asyncHandler } = require("../utils/errors");
const logger = require("../utils/logger");
const {
  publishPaymentCompletedEvent,
  publishPaymentFailedEvent,
  publishRefundProcessedEvent,
  publishPaymentNotificationEvent,
} = require("../services/rabbitmq");

// Process Stripe webhook
const processStripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const payload = req.body;

  if (!signature) {
    return res.status(400).json({
      success: false,
      error: "Missing Stripe signature",
      requestId: req.requestId,
    });
  }

  try {
    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Stripe webhook secret not configured");
    }

    const event = require("stripe")(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    // Process the event
    await handleStripeEvent(event);

    res.json({
      success: true,
      message: "Webhook processed successfully",
      requestId: req.requestId,
    });
  } catch (err) {
    logger.error("Stripe webhook processing failed:", {
      error: err.message,
      requestId: req.requestId,
    });

    res.status(400).json({
      success: false,
      error: "Webhook processing failed",
      details: err.message,
      requestId: req.requestId,
    });
  }
});

// Process Razorpay webhook
const processRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const payload = req.body;

  if (!signature) {
    return res.status(400).json({
      success: false,
      error: "Missing Razorpay signature",
      requestId: req.requestId,
    });
  }

  try {
    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Razorpay webhook secret not configured");
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(payload))
      .digest("hex");

    if (signature !== expectedSignature) {
      throw new Error("Invalid webhook signature");
    }

    // Process the event
    await handleRazorpayEvent(payload);

    res.json({
      success: true,
      message: "Webhook processed successfully",
      requestId: req.requestId,
    });
  } catch (err) {
    logger.error("Razorpay webhook processing failed:", {
      error: err.message,
      requestId: req.requestId,
    });

    res.status(400).json({
      success: false,
      error: "Webhook processing failed",
      details: err.message,
      requestId: req.requestId,
    });
  }
});

// Process M-Pesa webhook
const processMpesaWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-mpesa-signature"];
  const payload = req.body;

  if (!signature) {
    return res.status(400).json({
      success: false,
      error: "Missing M-Pesa signature",
      requestId: req.requestId,
    });
  }

  try {
    // Verify webhook signature
    const webhookSecret = process.env.MPESA_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("M-Pesa webhook secret not configured");
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(payload))
      .digest("hex");

    if (signature !== expectedSignature) {
      throw new Error("Invalid webhook signature");
    }

    // Process the event
    await handleMpesaEvent(payload);

    res.json({
      success: true,
      message: "Webhook processed successfully",
      requestId: req.requestId,
    });
  } catch (err) {
    logger.error("M-Pesa webhook processing failed:", {
      error: err.message,
      requestId: req.requestId,
    });

    res.status(400).json({
      success: false,
      error: "Webhook processing failed",
      details: err.message,
      requestId: req.requestId,
    });
  }
});

// Process generic webhook
const processGenericWebhook = asyncHandler(async (req, res) => {
  const { event, data, timestamp } = req.body;

  if (!event || !data) {
    return res.status(400).json({
      success: false,
      error: "Invalid webhook payload",
      requestId: req.requestId,
    });
  }

  try {
    // Process the generic event
    await handleGenericEvent(event, data, timestamp);

    res.json({
      success: true,
      message: "Webhook processed successfully",
      requestId: req.requestId,
    });
  } catch (err) {
    logger.error("Generic webhook processing failed:", {
      error: err.message,
      event,
      requestId: req.requestId,
    });

    res.status(400).json({
      success: false,
      error: "Webhook processing failed",
      details: err.message,
      requestId: req.requestId,
    });
  }
});

// Handle Stripe events
async function handleStripeEvent(event) {
  logger.info("Processing Stripe webhook event:", {
    eventType: event.type,
    eventId: event.id,
  });

  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentSuccess(event.data.object);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentFailure(event.data.object);
      break;
    case "charge.refunded":
      await handleRefundSuccess(event.data.object);
      break;
    case "dispute.created":
      await handleDisputeCreated(event.data.object);
      break;
    default:
      logger.info("Unhandled Stripe event type:", event.type);
  }
}

// Handle Razorpay events
async function handleRazorpayEvent(payload) {
  logger.info("Processing Razorpay webhook event:", {
    eventType: payload.event,
    eventId: payload.payload.payment.entity.id,
  });

  switch (payload.event) {
    case "payment.captured":
      await handlePaymentSuccess(payload.payload.payment.entity);
      break;
    case "payment.failed":
      await handlePaymentFailure(payload.payload.payment.entity);
      break;
    case "refund.processed":
      await handleRefundSuccess(payload.payload.refund.entity);
      break;
    default:
      logger.info("Unhandled Razorpay event type:", payload.event);
  }
}

// Handle M-Pesa events
async function handleMpesaEvent(payload) {
  logger.info("Processing M-Pesa webhook event:", {
    eventType: payload.ResultCode,
    transactionId: payload.MerchantRequestID,
  });

  if (payload.ResultCode === "0") {
    // Payment successful
    await handleMpesaPaymentSuccess(payload);
  } else {
    // Payment failed
    await handleMpesaPaymentFailure(payload);
  }
}

// Handle generic events
async function handleGenericEvent(eventType, data, timestamp) {
  logger.info("Processing generic webhook event:", {
    eventType,
    timestamp,
  });

  switch (eventType) {
    case "payment.success":
      await handlePaymentSuccess(data);
      break;
    case "payment.failure":
      await handlePaymentFailure(data);
      break;
    case "refund.processed":
      await handleRefundSuccess(data);
      break;
    default:
      logger.info("Unhandled generic event type:", eventType);
  }
}

// Handle payment success
async function handlePaymentSuccess(paymentData) {
  try {
    // Find payment by provider payment ID
    const payment = await Payment.findOne({
      providerPaymentId: paymentData.id,
      isActive: true,
    });

    if (!payment) {
      logger.warn("Payment not found for provider payment ID:", paymentData.id);
      return;
    }

    // Update payment status
    payment.status = "completed";
    payment.providerTransactionId = paymentData.transaction_id || paymentData.id;
    payment.completedAt = new Date();
    await payment.save();

    // Publish payment completed event
    await publishPaymentCompletedEvent(payment);

    // Send success notification
    await publishPaymentNotificationEvent(
      { _id: payment.userId },
      "payment_success",
      `Payment of ${payment.amount} ${payment.currency} completed successfully`
    );

    logger.info("Payment completed via webhook:", {
      paymentId: payment._id,
      providerPaymentId: paymentData.id,
    });
  } catch (error) {
    logger.error("Error handling payment success:", error);
  }
}

// Handle payment failure
async function handlePaymentFailure(paymentData) {
  try {
    // Find payment by provider payment ID
    const payment = await Payment.findOne({
      providerPaymentId: paymentData.id,
      isActive: true,
    });

    if (!payment) {
      logger.warn("Payment not found for provider payment ID:", paymentData.id);
      return;
    }

    // Update payment status
    payment.status = "failed";
    payment.errorCode = paymentData.last_payment_error?.code || "PAYMENT_FAILED";
    payment.errorMessage = paymentData.last_payment_error?.message || "Payment failed";
    payment.errorDetails = paymentData.last_payment_error || {};
    payment.failedAt = new Date();
    await payment.save();

    // Publish payment failed event
    await publishPaymentFailedEvent(payment, paymentData.last_payment_error);

    // Send failure notification
    await publishPaymentNotificationEvent(
      { _id: payment.userId },
      "payment_failure",
      `Payment failed: ${payment.errorMessage}`
    );

    logger.info("Payment failed via webhook:", {
      paymentId: payment._id,
      providerPaymentId: paymentData.id,
      error: payment.errorMessage,
    });
  } catch (error) {
    logger.error("Error handling payment failure:", error);
  }
}

// Handle refund success
async function handleRefundSuccess(refundData) {
  try {
    // Find refund by provider refund ID
    const refund = await Refund.findOne({
      providerRefundId: refundData.id,
      isActive: true,
    });

    if (!refund) {
      logger.warn("Refund not found for provider refund ID:", refundData.id);
      return;
    }

    // Update refund status
    refund.status = "completed";
    refund.providerTransactionId = refundData.transaction_id || refundData.id;
    refund.completedAt = new Date();
    await refund.save();

    // Update original payment status
    const payment = await Payment.findById(refund.transactionId);
    if (payment) {
      if (refund.refundType === "full") {
        payment.status = "refunded";
      } else {
        payment.status = "partially_refunded";
      }
      await payment.save();
    }

    // Publish refund processed event
    await publishRefundProcessedEvent(refund);

    // Send success notification
    await publishPaymentNotificationEvent(
      { _id: refund.userId },
      "refund_processed",
      `Refund of ${refund.amount} ${refund.currency} processed successfully`
    );

    logger.info("Refund completed via webhook:", {
      refundId: refund._id,
      providerRefundId: refundData.id,
    });
  } catch (error) {
    logger.error("Error handling refund success:", error);
  }
}

// Handle dispute created
async function handleDisputeCreated(disputeData) {
  try {
    // Find payment by provider payment ID
    const payment = await Payment.findOne({
      providerPaymentId: disputeData.payment_intent,
      isActive: true,
    });

    if (!payment) {
      logger.warn("Payment not found for dispute:", disputeData.id);
      return;
    }

    // Update payment metadata with dispute information
    payment.metadata.dispute = {
      id: disputeData.id,
      reason: disputeData.reason,
      amount: disputeData.amount,
      status: disputeData.status,
      createdAt: disputeData.created,
    };
    await payment.save();

    logger.info("Dispute created via webhook:", {
      paymentId: payment._id,
      disputeId: disputeData.id,
      reason: disputeData.reason,
    });
  } catch (error) {
    logger.error("Error handling dispute created:", error);
  }
}

// Handle M-Pesa payment success
async function handleMpesaPaymentSuccess(mpesaData) {
  try {
    // Find payment by M-Pesa transaction ID
    const payment = await Payment.findOne({
      providerTransactionId: mpesaData.MerchantRequestID,
      isActive: true,
    });

    if (!payment) {
      logger.warn("Payment not found for M-Pesa transaction:", mpesaData.MerchantRequestID);
      return;
    }

    // Update payment status
    payment.status = "completed";
    payment.providerPaymentId = mpesaData.CheckoutRequestID;
    payment.completedAt = new Date();
    await payment.save();

    // Publish payment completed event
    await publishPaymentCompletedEvent(payment);

    // Send success notification
    await publishPaymentNotificationEvent(
      { _id: payment.userId },
      "payment_success",
      `M-Pesa payment of ${payment.amount} ${payment.currency} completed successfully`
    );

    logger.info("M-Pesa payment completed via webhook:", {
      paymentId: payment._id,
      transactionId: mpesaData.MerchantRequestID,
    });
  } catch (error) {
    logger.error("Error handling M-Pesa payment success:", error);
  }
}

// Handle M-Pesa payment failure
async function handleMpesaPaymentFailure(mpesaData) {
  try {
    // Find payment by M-Pesa transaction ID
    const payment = await Payment.findOne({
      providerTransactionId: mpesaData.MerchantRequestID,
      isActive: true,
    });

    if (!payment) {
      logger.warn("Payment not found for M-Pesa transaction:", mpesaData.MerchantRequestID);
      return;
    }

    // Update payment status
    payment.status = "failed";
    payment.errorCode = mpesaData.ResultCode;
    payment.errorMessage = mpesaData.ResultDesc || "M-Pesa payment failed";
    payment.errorDetails = { mpesaResult: mpesaData };
    payment.failedAt = new Date();
    await payment.save();

    // Publish payment failed event
    await publishPaymentFailedEvent(payment, { mpesaResult: mpesaData });

    // Send failure notification
    await publishPaymentNotificationEvent(
      { _id: payment.userId },
      "payment_failure",
      `M-Pesa payment failed: ${payment.errorMessage}`
    );

    logger.info("M-Pesa payment failed via webhook:", {
      paymentId: payment._id,
      transactionId: mpesaData.MerchantRequestID,
      error: payment.errorMessage,
    });
  } catch (error) {
    logger.error("Error handling M-Pesa payment failure:", error);
  }
}

module.exports = {
  processStripeWebhook,
  processRazorpayWebhook,
  processMpesaWebhook,
  processGenericWebhook,
};
