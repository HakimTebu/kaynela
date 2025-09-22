const amqp = require("amqplib");
const logger = require("../utils/logger");

let connection = null;
let channel = null;

// Exchange names for Kaynela Farms Payment Service
const EXCHANGES = {
  PAYMENT_EVENTS: "kainella.payment.events",
  USER_EVENTS: "kainella.user.events",
  BOOKING_EVENTS: "kainella.booking.events",
  NOTIFICATION_EVENTS: "kainella.notification.events",
  SYSTEM_EVENTS: "kainella.system.events",
  LOYALTY_EVENTS: "kainella.loyalty.events",
};

// Exchange types mapping for different routing needs
const EXCHANGE_TYPES = {
  DIRECT: "direct",    // For point-to-point messaging (exact routing key match)
  FANOUT: "fanout",    // For broadcast messaging (all bound queues)
  TOPIC: "topic",      // For pattern-based routing (wildcards)
  HEADERS: "headers",  // For header-based routing
  DEFAULT: "",         // Pre-declared direct exchange
};

// Connect to RabbitMQ with proper exchange setup
async function connectRabbitMQ() {
  if (connection) return connection;

  const maxRetries = 5;
  const retryDelay = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(
        `🔌 Attempting to connect to RabbitMQ... (attempt ${attempt}/${maxRetries})`
      );

      const rabbitmqUrl = process.env.RABBITMQ_URL;
      if (!rabbitmqUrl) {
        throw new Error("RABBITMQ_URL environment variable is not set");
      }

      connection = await amqp.connect(rabbitmqUrl, {
        heartbeat: parseInt(process.env.RABBITMQ_HEARTBEAT) || 60,
      });

      connection.on("error", (err) => {
        logger.error("RabbitMQ connection error:", err);
        connection = null;
        channel = null;
      });

      connection.on("close", () => {
        logger.warn("RabbitMQ connection closed");
        connection = null;
        channel = null;
      });

      channel = await connection.createChannel();

      // Set QoS for fair dispatch
      await channel.prefetch(parseInt(process.env.RABBITMQ_PREFETCH) || 1);

      // Setup exchanges with proper types
      await setupExchanges();

      logger.info(
        "✅ RabbitMQ connection and exchanges established successfully"
      );
      return connection;
    } catch (err) {
      logger.error(
        `❌ RabbitMQ connection attempt ${attempt} failed:`,
        err.message
      );

      if (attempt === maxRetries) {
        logger.error("❌ All RabbitMQ connection attempts failed");
        throw err;
      }

      logger.info(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

// Setup exchanges with proper types and bindings
async function setupExchanges() {
  try {
    // 1. PAYMENT_EVENTS - DIRECT exchange for payment operations
    // Exact routing for payment service communication
    await channel.assertExchange(EXCHANGES.PAYMENT_EVENTS, EXCHANGE_TYPES.DIRECT, {
      durable: true,
      autoDelete: false,
    });

    // 2. USER_EVENTS - TOPIC exchange for user-related events
    // Allows flexible routing like: user.*, *.registered, etc.
    await channel.assertExchange(EXCHANGES.USER_EVENTS, EXCHANGE_TYPES.TOPIC, {
      durable: true,
      autoDelete: false,
    });

    // 3. BOOKING_EVENTS - TOPIC exchange for booking-related events
    // Pattern-based routing for booking events
    await channel.assertExchange(EXCHANGES.BOOKING_EVENTS, EXCHANGE_TYPES.TOPIC, {
      durable: true,
      autoDelete: false,
    });

    // 4. NOTIFICATION_EVENTS - FANOUT exchange for broadcast notifications
    // All notification consumers receive all events
    await channel.assertExchange(EXCHANGES.NOTIFICATION_EVENTS, EXCHANGE_TYPES.FANOUT, {
      durable: true,
      autoDelete: false,
    });

    // 5. SYSTEM_EVENTS - TOPIC exchange for system-wide events
    // Pattern-based routing for system operations
    await channel.assertExchange(EXCHANGES.SYSTEM_EVENTS, EXCHANGE_TYPES.TOPIC, {
      durable: true,
      autoDelete: false,
    });

    // 6. LOYALTY_EVENTS - DIRECT exchange for loyalty service communication
    // Exact routing for loyalty operations
    await channel.assertExchange(EXCHANGES.LOYALTY_EVENTS, EXCHANGE_TYPES.DIRECT, {
      durable: true,
      autoDelete: false,
    });

    logger.info("✅ All exchanges setup complete");
  } catch (error) {
    logger.error("❌ Error setting up exchanges:", error);
    throw error;
  }
}

// Publish events to appropriate exchanges
async function publishEvent(exchange, routingKey, event, options = {}) {
  try {
    if (!channel) {
      logger.warn(
        "⚠️ RabbitMQ channel not available, attempting to connect..."
      );
      await connectRabbitMQ();
    }

    if (!channel) {
      logger.error("❌ Cannot publish event - RabbitMQ not connected");
      return;
    }

    const message = Buffer.from(JSON.stringify(event));
    const publishOptions = {
      persistent: true,
      ...options,
    };

    // Publish to exchange with routing key
    channel.publish(exchange, routingKey, message, publishOptions);

    logger.debug(
      `Event published to ${exchange} with routing key ${routingKey}:`,
      event.eventType
    );
  } catch (err) {
    logger.error("Failed to publish event:", err);
    throw err;
  }
}

// Consume events from queues with proper exchange bindings
async function consumeEvents(
  queue,
  exchange,
  routingKey,
  handler,
  options = {}
) {
  try {
    if (!channel) {
      logger.warn(
        "⚠️ RabbitMQ channel not available, attempting to connect..."
      );
      await connectRabbitMQ();
    }

    if (!channel) {
      logger.error("❌ Cannot setup consumer - RabbitMQ not connected");
      return;
    }

    // Assert queue
    await channel.assertQueue(queue, {
      durable: true,
      autoDelete: false,
      ...options,
    });

    // Bind queue to exchange with routing key
    await channel.bindQueue(queue, exchange, routingKey);

    // Setup consumer
    channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          await handler(event);
          channel.ack(msg);
        } catch (err) {
          logger.error("Event processing failed:", err);
          // Reject and requeue for retry
          channel.nack(msg, false, true);
        }
      }
    });

    logger.info(
      `Listening for events on ${queue} bound to ${exchange} with routing key ${routingKey}`
    );
  } catch (err) {
    logger.error("Failed to setup consumer:", err);
    throw err;
  }
}

// Get channel for direct operations
async function getChannel() {
  if (!channel) {
    await connectRabbitMQ();
  }
  return channel;
}

// Close connections gracefully
async function closeConnections() {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info("✅ RabbitMQ connections closed gracefully");
  } catch (err) {
    logger.error("❌ Error closing RabbitMQ connections:", err);
  }
}

// ============================================================================
// KAYNELA FARMS PAYMENT SERVICE SPECIFIC EVENT PUBLISHING FUNCTIONS
// ============================================================================

// PAYMENT EVENTS - DIRECT exchange for payment service communication
async function publishPaymentCreatedEvent(paymentData) {
  const event = {
    eventType: "PAYMENT_CREATED",
    paymentId: paymentData._id,
    userId: paymentData.userId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    paymentMethod: paymentData.paymentMethod,
    paymentProvider: paymentData.paymentProvider,
    status: paymentData.status,
    description: paymentData.description,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "payment.created", event);
  logger.info(
    `✅ Payment created event published to direct exchange: ${paymentData._id}`
  );
}

async function publishPaymentProcessedEvent(paymentData) {
  const event = {
    eventType: "PAYMENT_PROCESSED",
    paymentId: paymentData._id,
    userId: paymentData.userId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    paymentMethod: paymentData.paymentMethod,
    paymentProvider: paymentData.paymentProvider,
    status: paymentData.status,
    providerPaymentId: paymentData.providerPaymentId,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "payment.processed", event);
  logger.info(
    `✅ Payment processed event published to direct exchange: ${paymentData._id}`
  );
}

async function publishPaymentCompletedEvent(paymentData) {
  const event = {
    eventType: "PAYMENT_COMPLETED",
    paymentId: paymentData._id,
    userId: paymentData.userId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    paymentMethod: paymentData.paymentMethod,
    paymentProvider: paymentData.paymentProvider,
    providerPaymentId: paymentData.providerPaymentId,
    completedAt: paymentData.completedAt,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "payment.completed", event);
  logger.info(
    `✅ Payment completed event published to direct exchange: ${paymentData._id}`
  );
}

async function publishPaymentFailedEvent(paymentData, errorDetails) {
  const event = {
    eventType: "PAYMENT_FAILED",
    paymentId: paymentData._id,
    userId: paymentData.userId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    paymentMethod: paymentData.paymentMethod,
    paymentProvider: paymentData.paymentProvider,
    errorCode: paymentData.errorCode,
    errorMessage: paymentData.errorMessage,
    errorDetails,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "payment.failed", event);
  logger.info(
    `✅ Payment failed event published to direct exchange: ${paymentData._id}`
  );
}

async function publishPaymentCancelledEvent(paymentData, reason) {
  const event = {
    eventType: "PAYMENT_CANCELLED",
    paymentId: paymentData._id,
    userId: paymentData.userId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    paymentMethod: paymentData.paymentMethod,
    paymentProvider: paymentData.paymentProvider,
    cancellationReason: reason,
    cancelledAt: paymentData.cancelledAt,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "payment.cancelled", event);
  logger.info(
    `✅ Payment cancelled event published to direct exchange: ${paymentData._id}`
  );
}

async function publishRefundCreatedEvent(refundData) {
  const event = {
    eventType: "REFUND_CREATED",
    refundId: refundData._id,
    transactionId: refundData.transactionId,
    userId: refundData.userId,
    amount: refundData.amount,
    currency: refundData.currency,
    refundType: refundData.refundType,
    reason: refundData.reason,
    status: refundData.status,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "refund.created", event);
  logger.info(
    `✅ Refund created event published to direct exchange: ${refundData._id}`
  );
}

async function publishRefundProcessedEvent(refundData) {
  const event = {
    eventType: "REFUND_PROCESSED",
    refundId: refundData._id,
    transactionId: refundData.transactionId,
    userId: refundData.userId,
    amount: refundData.amount,
    currency: refundData.currency,
    status: refundData.status,
    providerRefundId: refundData.providerRefundId,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "refund.processed", event);
  logger.info(
    `✅ Refund processed event published to direct exchange: ${refundData._id}`
  );
}

async function publishPaymentMethodCreatedEvent(paymentMethodData) {
  const event = {
    eventType: "PAYMENT_METHOD_CREATED",
    paymentMethodId: paymentMethodData._id,
    userId: paymentMethodData.userId,
    type: paymentMethodData.type,
    provider: paymentMethodData.provider,
    name: paymentMethodData.name,
    isDefault: paymentMethodData.isDefault,
    isVerified: paymentMethodData.isVerified,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "payment_method.created", event);
  logger.info(
    `✅ Payment method created event published to direct exchange: ${paymentMethodData._id}`
  );
}

async function publishPaymentMethodUpdatedEvent(paymentMethodData, updateType) {
  const event = {
    eventType: "PAYMENT_METHOD_UPDATED",
    paymentMethodId: paymentMethodData._id,
    userId: paymentMethodData.userId,
    type: paymentMethodData.type,
    provider: paymentMethodData.provider,
    updateType,
    isDefault: paymentMethodData.isDefault,
    isVerified: paymentMethodData.isVerified,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "payment_method.updated", event);
  logger.info(
    `✅ Payment method updated event published to direct exchange: ${paymentMethodData._id}`
  );
}

// USER EVENTS - TOPIC exchange for user-related events
async function publishUserPaymentUpdatedEvent(userData, updateType) {
  const event = {
    eventType: "USER_PAYMENT_UPDATED",
    userId: userData._id,
    updateType,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Topic exchange: user.payment.updated.*
  await publishEvent(EXCHANGES.USER_EVENTS, "user.payment.updated", event);
  logger.info(
    `✅ User payment updated event published to topic exchange: ${userData._id}`
  );
}

// BOOKING EVENTS - TOPIC exchange for booking-related events
async function publishBookingPaymentCompletedEvent(bookingData, paymentData) {
  const event = {
    eventType: "BOOKING_PAYMENT_COMPLETED",
    bookingId: bookingData._id,
    userId: bookingData.userId,
    paymentId: paymentData._id,
    amount: paymentData.amount,
    currency: paymentData.currency,
    paymentMethod: paymentData.paymentMethod,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Topic exchange: booking.payment.completed.*
  await publishEvent(EXCHANGES.BOOKING_EVENTS, "booking.payment.completed", event);
  logger.info(
    `✅ Booking payment completed event published to topic exchange: ${bookingData._id}`
  );
}

// NOTIFICATION EVENTS - FANOUT exchange for broadcast notifications
async function publishPaymentNotificationEvent(userData, notificationType, message) {
  const event = {
    eventType: "PAYMENT_NOTIFICATION_SENT",
    userId: userData._id,
    notificationType,
    message,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Fanout exchange: all notification consumers receive this event
  await publishEvent(EXCHANGES.NOTIFICATION_EVENTS, "", event);
  logger.info(
    `✅ Payment notification event published to fanout exchange: ${userData._id}`
  );
}

// LOYALTY EVENTS - DIRECT exchange for loyalty service communication
async function publishLoyaltyPointsEarnedEvent(userData, paymentData, pointsEarned) {
  const event = {
    eventType: "LOYALTY_POINTS_EARNED",
    userId: userData._id,
    paymentId: paymentData._id,
    amount: paymentData.amount,
    currency: paymentData.currency,
    pointsEarned,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for loyalty service
  await publishEvent(EXCHANGES.LOYALTY_EVENTS, "loyalty.points.earned", event);
  logger.info(
    `✅ Loyalty points earned event published to direct exchange: ${userData._id}`
  );
}

// SYSTEM EVENTS - TOPIC exchange for system-wide operations
async function publishSystemEvent(eventType, data) {
  const event = {
    eventType,
    data,
    timestamp: new Date().toISOString(),
    source: "payment-service",
    version: "1.0",
  };

  // Topic exchange: system.* for system-wide events
  await publishEvent(
    EXCHANGES.SYSTEM_EVENTS,
    `system.${eventType.toLowerCase()}`,
    event
  );
  logger.info(`✅ System event published to topic exchange: ${eventType}`);
}

// ============================================================================
// EVENT CONSUMERS SETUP
// ============================================================================

// Setup event consumers for the payment service
async function setupEventConsumers() {
  try {
    const { getChannel } = require("./rabbitmq");
    const channel = await getChannel();

    // 1. Consume user registration events (TOPIC exchange)
    await consumeEvents(
      "payment-user-registered-queue",
      EXCHANGES.USER_EVENTS,
      "user.registered",
      handleUserRegisteredEvent,
      { durable: true }
    );

    // 2. Consume booking created events (TOPIC exchange)
    await consumeEvents(
      "payment-booking-created-queue",
      EXCHANGES.BOOKING_EVENTS,
      "booking.created",
      handleBookingCreatedEvent,
      { durable: true }
    );

    // 3. Consume profile updated events (TOPIC exchange)
    await consumeEvents(
      "payment-profile-updated-queue",
      EXCHANGES.USER_EVENTS,
      "user.profile.updated",
      handleProfileUpdatedEvent,
      { durable: true }
    );

    // 4. Consume system events (TOPIC exchange)
    await consumeEvents(
      "payment-system-events-queue",
      EXCHANGES.SYSTEM_EVENTS,
      "system.payment.*",
      handleSystemEvent,
      { durable: true }
    );

    // 5. Consume loyalty events (DIRECT exchange)
    await consumeEvents(
      "payment-loyalty-events-queue",
      EXCHANGES.LOYALTY_EVENTS,
      "loyalty.points.earned",
      handleLoyaltyPointsEarnedEvent,
      { durable: true }
    );

    logger.info("✅ Event consumers setup complete for payment service");
  } catch (error) {
    logger.error("❌ Error setting up event consumers:", error);
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// Event handlers for consumed events
async function handleUserRegisteredEvent(eventData) {
  logger.info("Processing user registered event:", eventData);
  // Handle new user registration
  // This could include creating default payment methods, welcome bonuses, etc.
}

async function handleBookingCreatedEvent(eventData) {
  logger.info("Processing booking created event:", eventData);
  // Handle booking creation
  // This could include payment method validation, fraud checks, etc.
}

async function handleProfileUpdatedEvent(eventData) {
  logger.info("Processing profile updated event:", eventData);
  // Handle profile updates
  // This could include updating payment preferences, validation, etc.
}

async function handleSystemEvent(eventData) {
  logger.info("Processing system event:", eventData);
  // Handle system-wide events
  // This could include maintenance notifications, system updates, etc.
}

async function handleLoyaltyPointsEarnedEvent(eventData) {
  logger.info("Processing loyalty points earned event:", eventData);
  // Handle loyalty points earned
  // This could include updating payment analytics, user preferences, etc.
}

module.exports = {
  // Core RabbitMQ functions
  connectRabbitMQ,
  publishEvent,
  consumeEvents,
  getChannel,
  closeConnections,
  setupEventConsumers,

  // Exchange constants
  EXCHANGES,
  EXCHANGE_TYPES,

  // Kaynella Farms Payment Service specific functions
  publishPaymentCreatedEvent,
  publishPaymentProcessedEvent,
  publishPaymentCompletedEvent,
  publishPaymentFailedEvent,
  publishPaymentCancelledEvent,
  publishRefundCreatedEvent,
  publishRefundProcessedEvent,
  publishPaymentMethodCreatedEvent,
  publishPaymentMethodUpdatedEvent,
  publishUserPaymentUpdatedEvent,
  publishBookingPaymentCompletedEvent,
  publishPaymentNotificationEvent,
  publishLoyaltyPointsEarnedEvent,
  publishSystemEvent,
};
