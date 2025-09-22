const PaymentMethod = require("../models/PaymentMethod");
const { asyncHandler } = require("../utils/errors");
const logger = require("../utils/logger");
const { client: redisClient } = require("../config/redis");
const {
  publishPaymentMethodCreatedEvent,
  publishPaymentMethodUpdatedEvent,
  publishPaymentNotificationEvent,
} = require("../services/rabbitmq");

// Create a new payment method
const createPaymentMethod = asyncHandler(async (req, res) => {
  const {
    type,
    provider,
    name,
    description,
    isDefault,
    metadata,
    // Card-specific fields
    cardType,
    last4Digits,
    expiryMonth,
    expiryYear,
    cardBrand,
    // Mobile money specific fields
    mobileMoneyProvider,
    phoneNumber,
    // Bank transfer specific fields
    bankTransferType,
    bankName,
    accountNumber,
    accountHolderName,
    routingNumber,
  } = req.body;

  const userId = req.user._id;

  // Validate payment method type and provider compatibility
  if (!isValidPaymentMethodType(type, provider)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payment method type and provider combination",
      requestId: req.requestId,
    });
  }

  // Validate required fields based on type
  const validationError = validatePaymentMethodFields(type, req.body);
  if (validationError) {
    return res.status(400).json({
      success: false,
      error: validationError,
      requestId: req.requestId,
    });
  }

  // Check if payment method already exists (for cards)
  if (type === "credit_card" || type === "debit_card") {
    const existingCard = await PaymentMethod.findOne({
      userId,
      type,
      last4Digits,
      expiryMonth,
      expiryYear,
      isActive: true,
    });

    if (existingCard) {
      return res.status(409).json({
        success: false,
        error: "Payment method already exists",
        requestId: req.requestId,
      });
    }
  }

  // Create payment method
  const paymentMethod = new PaymentMethod({
    userId,
    type,
    provider,
    name,
    description,
    isDefault,
    metadata,
    // Card-specific fields
    cardType,
    last4Digits,
    expiryMonth,
    expiryYear,
    cardBrand,
    // Mobile money specific fields
    mobileMoneyProvider,
    phoneNumber,
    // Bank transfer specific fields
    bankTransferType,
    bankName,
    accountNumber,
    accountHolderName,
    routingNumber,
    createdBy: req.user._id,
  });

  await paymentMethod.save();

  // Publish payment method created event
  await publishPaymentMethodCreatedEvent(paymentMethod);

  // Send notification
  await publishPaymentNotificationEvent(
    { _id: userId },
    "payment_method_added",
    `New ${type} payment method "${name}" has been added`
  );

  logger.info("Payment method created successfully", {
    paymentMethodId: paymentMethod._id,
    userId,
    type,
    provider,
    requestId: req.requestId,
  });

  res.status(201).json({
    success: true,
    message: "Payment method created successfully",
    data: {
      paymentMethodId: paymentMethod._id,
      type: paymentMethod.type,
      provider: paymentMethod.provider,
      name: paymentMethod.name,
      isDefault: paymentMethod.isDefault,
      isVerified: paymentMethod.isVerified,
      displayName: paymentMethod.displayName,
    },
    requestId: req.requestId,
  });
});

// Get payment method by ID
const getPaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.params;

  const paymentMethod = await PaymentMethod.findById(paymentMethodId);
  if (!paymentMethod) {
    return res.status(404).json({
      success: false,
      error: "Payment method not found",
      requestId: req.requestId,
    });
  }

  // Check if user can access this payment method
  if (paymentMethod.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  res.json({
    success: true,
    data: paymentMethod,
    requestId: req.requestId,
  });
});

// Get user payment methods
const getUserPaymentMethods = asyncHandler(async (req, res) => {
  const { type, provider, status } = req.query;
  const userId = req.user._id;

  // Build filter
  const filter = { userId, isActive: true };
  if (type) filter.type = type;
  if (provider) filter.provider = provider;
  if (status) filter.status = status;

  // Get payment methods
  const paymentMethods = await PaymentMethod.find(filter)
    .sort({ isDefault: -1, createdAt: -1 });

  res.json({
    success: true,
    data: paymentMethods,
    requestId: req.requestId,
  });
});

// Update payment method
const updatePaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.params;
  const { name, description, isDefault, metadata } = req.body;

  const paymentMethod = await PaymentMethod.findById(paymentMethodId);
  if (!paymentMethod) {
    return res.status(404).json({
      success: false,
      error: "Payment method not found",
      requestId: req.requestId,
    });
  }

  // Check if user can update this payment method
  if (paymentMethod.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Update fields
  if (name !== undefined) paymentMethod.name = name;
  if (description !== undefined) paymentMethod.description = description;
  if (isDefault !== undefined) paymentMethod.isDefault = isDefault;
  if (metadata !== undefined) paymentMethod.metadata = metadata;
  paymentMethod.lastModifiedBy = req.user._id;

  await paymentMethod.save();

  // Publish payment method updated event
  await publishPaymentMethodUpdatedEvent(paymentMethod, "general_update");

  logger.info("Payment method updated successfully", {
    paymentMethodId: paymentMethod._id,
    userId: paymentMethod.userId,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Payment method updated successfully",
    data: {
      paymentMethodId: paymentMethod._id,
      name: paymentMethod.name,
      description: paymentMethod.description,
      isDefault: paymentMethod.isDefault,
      metadata: paymentMethod.metadata,
      updatedAt: paymentMethod.updatedAt,
    },
    requestId: req.requestId,
  });
});

// Set payment method as default
const setDefaultPaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.params;

  const paymentMethod = await PaymentMethod.findById(paymentMethodId);
  if (!paymentMethod) {
    return res.status(404).json({
      success: false,
      error: "Payment method not found",
      requestId: req.requestId,
    });
  }

  // Check if user can update this payment method
  if (paymentMethod.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Set as default
  await paymentMethod.setAsDefault();

  // Publish payment method updated event
  await publishPaymentMethodUpdatedEvent(paymentMethod, "set_default");

  logger.info("Payment method set as default", {
    paymentMethodId: paymentMethod._id,
    userId: paymentMethod.userId,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Payment method set as default successfully",
    data: {
      paymentMethodId: paymentMethod._id,
      isDefault: paymentMethod.isDefault,
      updatedAt: paymentMethod.updatedAt,
    },
    requestId: req.requestId,
  });
});

// Verify payment method
const verifyPaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.params;
  const { verificationMethod } = req.body;

  const paymentMethod = await PaymentMethod.findById(paymentMethodId);
  if (!paymentMethod) {
    return res.status(404).json({
      success: false,
      error: "Payment method not found",
      requestId: req.requestId,
    });
  }

  // Check if user can verify this payment method
  if (paymentMethod.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Mark as verified
  await paymentMethod.markAsVerified(verificationMethod);

  // Publish payment method updated event
  await publishPaymentMethodUpdatedEvent(paymentMethod, "verification");

  logger.info("Payment method verified successfully", {
    paymentMethodId: paymentMethod._id,
    userId: paymentMethod.userId,
    verificationMethod,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Payment method verified successfully",
    data: {
      paymentMethodId: paymentMethod._id,
      isVerified: paymentMethod.isVerified,
      verificationMethod: paymentMethod.verificationMethod,
      verifiedAt: paymentMethod.verifiedAt,
    },
    requestId: req.requestId,
  });
});

// Delete payment method
const deletePaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.params;

  const paymentMethod = await PaymentMethod.findById(paymentMethodId);
  if (!paymentMethod) {
    return res.status(404).json({
      success: false,
      error: "Payment method not found",
      requestId: req.requestId,
    });
  }

  // Check if user can delete this payment method
  if (paymentMethod.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Check if payment method can be deleted
  if (!paymentMethod.canDelete()) {
    return res.status(400).json({
      success: false,
      error: "Payment method cannot be deleted - it has been used for transactions",
      requestId: req.requestId,
    });
  }

  // Soft delete
  await paymentMethod.softDelete(req.user._id);

  // Publish payment method updated event
  await publishPaymentMethodUpdatedEvent(paymentMethod, "deletion");

  logger.info("Payment method deleted successfully", {
    paymentMethodId: paymentMethod._id,
    userId: paymentMethod.userId,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Payment method deleted successfully",
    requestId: req.requestId,
  });
});

// Get payment method summary
const getPaymentMethodSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const summary = await PaymentMethod.getPaymentMethodSummary(userId);

  res.json({
    success: true,
    data: summary,
    requestId: req.requestId,
  });
});

// Validate payment method type and provider compatibility
function isValidPaymentMethodType(type, provider) {
  const validCombinations = {
    "credit_card": ["stripe", "razorpay"],
    "debit_card": ["stripe", "razorpay"],
    "mobile_money": ["mpesa", "airtel_money"],
    "bank_transfer": ["bank"],
    "cash": ["bank"],
  };

  return validCombinations[type] && validCombinations[type].includes(provider);
}

// Validate required fields based on payment method type
function validatePaymentMethodFields(type, body) {
  const requiredFields = {
    "credit_card": ["cardType", "last4Digits", "expiryMonth", "expiryYear", "cardBrand"],
    "debit_card": ["cardType", "last4Digits", "expiryMonth", "expiryYear", "cardBrand"],
    "mobile_money": ["mobileMoneyProvider", "phoneNumber"],
    "bank_transfer": ["bankName", "accountNumber", "accountHolderName"],
    "cash": [],
  };

  const missingFields = requiredFields[type]?.filter(field => !body[field]) || [];
  
  if (missingFields.length > 0) {
    return `Missing required fields for ${type}: ${missingFields.join(", ")}`;
  }

  return null;
}

module.exports = {
  createPaymentMethod,
  getPaymentMethod,
  getUserPaymentMethods,
  updatePaymentMethod,
  setDefaultPaymentMethod,
  verifyPaymentMethod,
  deletePaymentMethod,
  getPaymentMethodSummary,
};
