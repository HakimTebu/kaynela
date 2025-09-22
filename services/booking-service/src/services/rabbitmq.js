const amqp = require("amqplib");
const logger = require("../utils/logger");

let connection = null;
let channel = null;

// Exchange names for Kaynela Farms
const EXCHANGES = {
  BOOKING_EVENTS: "kainella.booking.events",
  PAYMENT_EVENTS: "kainella.payment.events",
  LOYALTY_EVENTS: "kainella.loyalty.events",
  NOTIFICATION_EVENTS: "kainella.notification.events",
  SYSTEM_EVENTS: "kainella.system.events",
};

// Exchange types mapping
const EXCHANGE_TYPES = {
  DIRECT: "direct", // For point-to-point messaging (exact routing key match)
  FANOUT: "fanout", // For broadcast messaging (all bound queues)
  TOPIC: "topic", // For pattern-based routing (wildcards)
  HEADERS: "headers", // For header-based routing
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
    // 1. BOOKING_EVENTS - TOPIC exchange for pattern-based routing
    // Allows flexible routing like: booking.created.*, booking.*.confirmed, etc.
    await channel.assertExchange(
      EXCHANGES.BOOKING_EVENTS,
      EXCHANGE_TYPES.TOPIC,
      {
        durable: true,
        autoDelete: false,
      }
    );

    // 2. PAYMENT_EVENTS - DIRECT exchange for point-to-point messaging
    // Exact routing key matches for payment processing
    await channel.assertExchange(
      EXCHANGES.PAYMENT_EVENTS,
      EXCHANGE_TYPES.DIRECT,
      {
        durable: true,
        autoDelete: false,
      }
    );

    // 3. LOYALTY_EVENTS - DIRECT exchange for loyalty operations
    // Exact routing for loyalty service communication
    await channel.assertExchange(
      EXCHANGES.LOYALTY_EVENTS,
      EXCHANGE_TYPES.DIRECT,
      {
        durable: true,
        autoDelete: false,
      }
    );

    // 4. NOTIFICATION_EVENTS - FANOUT exchange for broadcast notifications
    // All notification consumers receive all events
    await channel.assertExchange(
      EXCHANGES.NOTIFICATION_EVENTS,
      EXCHANGE_TYPES.FANOUT,
      {
        durable: true,
        autoDelete: false,
      }
    );

    // 5. SYSTEM_EVENTS - TOPIC exchange for system-wide events
    // Pattern-based routing for system operations
    await channel.assertExchange(
      EXCHANGES.SYSTEM_EVENTS,
      EXCHANGE_TYPES.TOPIC,
      {
        durable: true,
        autoDelete: false,
      }
    );

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
// KAYNELA FARMS SPECIFIC EVENT PUBLISHING FUNCTIONS
// ============================================================================

// BOOKING EVENTS - TOPIC exchange for flexible routing
async function publishBookingCreatedEvent(bookingData) {
  const event = {
    eventType: "BOOKING_CREATED",
    bookingId: bookingData.bookingId,
    userId: bookingData.userId,
    bookingType: bookingData.bookingType,
    startDate: bookingData.startDate,
    endDate: bookingData.endDate,
    totalAmount: bookingData.totalAmount,
    participants: bookingData.participants,
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Topic exchange: routing key pattern allows flexible binding
  // booking.created.* - can be bound by any service interested in booking creation
  await publishEvent(EXCHANGES.BOOKING_EVENTS, "booking.created", event);
  logger.info(
    `✅ Booking created event published to topic exchange: ${bookingData.bookingId}`
  );
}

async function publishBookingConfirmedEvent(bookingData) {
  const event = {
    eventType: "BOOKING_CONFIRMED",
    bookingId: bookingData.bookingId,
    userId: bookingData.userId,
    bookingType: bookingData.bookingType,
    startDate: bookingData.startDate,
    endDate: bookingData.endDate,
    totalAmount: bookingData.totalAmount,
    confirmedAt: bookingData.confirmedAt,
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Topic exchange: booking.confirmed.*
  await publishEvent(EXCHANGES.BOOKING_EVENTS, "booking.confirmed", event);
  logger.info(
    `✅ Booking confirmed event published to topic exchange: ${bookingData.bookingId}`
  );
}

async function publishBookingCompletedEvent(bookingData) {
  const event = {
    eventType: "BOOKING_COMPLETED",
    bookingId: bookingData.bookingId,
    userId: bookingData.userId,
    bookingType: bookingData.bookingType,
    totalAmount: bookingData.totalAmount,
    completedAt: bookingData.completedAt,
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Topic exchange: booking.completed.*
  await publishEvent(EXCHANGES.BOOKING_EVENTS, "booking.completed", event);
  logger.info(
    `✅ Booking completed event published to topic exchange: ${bookingData.bookingId}`
  );
}

async function publishBookingCancelledEvent(bookingData, cancellationReason) {
  const event = {
    eventType: "BOOKING_CANCELLED",
    bookingId: bookingData.bookingId,
    userId: bookingData.userId,
    bookingType: bookingData.bookingType,
    totalAmount: bookingData.totalAmount,
    cancellationReason,
    cancelledAt: new Date(),
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Topic exchange: booking.cancelled.*
  await publishEvent(EXCHANGES.BOOKING_EVENTS, "booking.cancelled", event);
  logger.info(
    `✅ Booking cancelled event published to topic exchange: ${bookingData.bookingId}`
  );
}

async function publishBookingUpdatedEvent(bookingData, updates) {
  const event = {
    eventType: "BOOKING_UPDATED",
    bookingId: bookingData.bookingId,
    userId: bookingData.userId,
    bookingType: bookingData.bookingType,
    updates,
    updatedAt: new Date(),
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Topic exchange: booking.updated.*
  await publishEvent(EXCHANGES.BOOKING_EVENTS, "booking.updated", event);
  logger.info(
    `✅ Booking updated event published to topic exchange: ${bookingData.bookingId}`
  );
}

// LODGING EVENTS - TOPIC exchange for lodging-specific operations
async function publishLodgingAvailabilityUpdateEvent(lodgingData) {
  const event = {
    eventType: "LODGING_AVAILABILITY_UPDATED",
    accommodationType: lodgingData.accommodationType,
    availableDates: lodgingData.availableDates,
    updatedAt: new Date(),
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Topic exchange: lodging.availability.*
  await publishEvent(
    EXCHANGES.BOOKING_EVENTS,
    "lodging.availability.updated",
    event
  );
  logger.info(
    `✅ Lodging availability update event published to topic exchange`
  );
}

// ACTIVITY EVENTS - TOPIC exchange for activity scheduling
async function publishActivityScheduledEvent(activityData) {
  const event = {
    eventType: "ACTIVITY_SCHEDULED",
    activityType: activityData.activityType,
    scheduledDate: activityData.scheduledDate,
    instructorId: activityData.instructorId,
    maxParticipants: activityData.maxParticipants,
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Topic exchange: activity.scheduled.*
  await publishEvent(EXCHANGES.BOOKING_EVENTS, "activity.scheduled", event);
  logger.info(`✅ Activity scheduled event published to topic exchange`);
}

// EVENT EVENTS - TOPIC exchange for event management
async function publishEventCreatedEvent(eventData) {
  const event = {
    eventType: "EVENT_CREATED",
    eventName: eventData.eventName,
    eventType: eventData.eventType,
    eventCapacity: eventData.eventCapacity,
    eventLocation: eventData.eventLocation,
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Topic exchange: event.created.*
  await publishEvent(EXCHANGES.BOOKING_EVENTS, "event.created", event);
  logger.info(`✅ Event created event published to topic exchange`);
}

// PAYMENT EVENTS - DIRECT exchange for point-to-point payment communication
async function publishPaymentProcessedEvent(bookingData, paymentData) {
  const event = {
    eventType: "PAYMENT_PROCESSED",
    bookingId: bookingData.bookingId,
    userId: bookingData.userId,
    paymentMethod: paymentData.paymentMethod,
    amount: paymentData.amount,
    transactionId: paymentData.transactionId,
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for payment service
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "payment.processed", event);
  logger.info(
    `✅ Payment processed event published to direct exchange: ${bookingData.bookingId}`
  );
}

async function publishPaymentFailedEvent(
  bookingData,
  paymentData,
  failureReason
) {
  const event = {
    eventType: "PAYMENT_FAILED",
    bookingId: bookingData.bookingId,
    userId: bookingData.userId,
    paymentMethod: paymentData.paymentMethod,
    amount: paymentData.amount,
    failureReason,
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for payment service
  await publishEvent(EXCHANGES.PAYMENT_EVENTS, "payment.failed", event);
  logger.info(
    `✅ Payment failed event published to direct exchange: ${bookingData.bookingId}`
  );
}

// LOYALTY EVENTS - DIRECT exchange for loyalty service communication
async function publishLoyaltyPointsEarnedEvent(bookingData, pointsEarned) {
  const event = {
    eventType: "LOYALTY_POINTS_EARNED",
    userId: bookingData.userId,
    bookingId: bookingData.bookingId,
    bookingType: bookingData.bookingType,
    pointsEarned,
    totalAmount: bookingData.totalAmount,
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for loyalty service
  await publishEvent(EXCHANGES.LOYALTY_EVENTS, "loyalty.points.earned", event);
  logger.info(
    `✅ Loyalty points earned event published to direct exchange: ${bookingData.userId}`
  );
}

// NOTIFICATION EVENTS - FANOUT exchange for broadcast notifications
async function publishNotificationEvent(
  bookingData,
  notificationType,
  message
) {
  const event = {
    eventType: "NOTIFICATION_SENT",
    userId: bookingData.userId,
    bookingId: bookingData.bookingId,
    notificationType,
    message,
    timestamp: new Date().toISOString(),
    source: "booking-service",
    version: "1.0",
  };

  // Fanout exchange: all notification consumers receive this event
  await publishEvent(EXCHANGES.NOTIFICATION_EVENTS, "", event);
  logger.info(
    `✅ Notification event published to fanout exchange: ${bookingData.bookingId}`
  );
}

// SYSTEM EVENTS - TOPIC exchange for system-wide operations
async function publishSystemEvent(eventType, data) {
  const event = {
    eventType,
    data,
    timestamp: new Date().toISOString(),
    source: "booking-service",
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

// Setup event consumers for the booking service
async function setupEventConsumers() {
  try {
    const { getChannel } = require("./rabbitmq");
    const channel = await getChannel();

    // 1. Consume payment processed events (DIRECT exchange)
    await consumeEvents(
      "booking-payment-processed-queue",
      EXCHANGES.PAYMENT_EVENTS,
      "payment.processed",
      handlePaymentProcessedEvent,
      { durable: true }
    );

    // 2. Consume loyalty points earned events (DIRECT exchange)
    await consumeEvents(
      "booking-loyalty-points-queue",
      EXCHANGES.LOYALTY_EVENTS,
      "loyalty.points.earned",
      handleLoyaltyPointsEarnedEvent,
      { durable: true }
    );

    // 3. Consume system events (TOPIC exchange)
    await consumeEvents(
      "booking-system-events-queue",
      EXCHANGES.SYSTEM_EVENTS,
      "system.booking.*",
      handleSystemEvent,
      { durable: true }
    );

    logger.info("✅ Event consumers setup complete for booking service");
  } catch (error) {
    logger.error("❌ Error setting up event consumers:", error);
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// Event handlers for consumed events
async function handlePaymentProcessedEvent(eventData) {
  logger.info("Processing payment processed event:", eventData);
  // Handle payment processed logic
  // This could include updating booking status, sending confirmations, etc.
}

async function handleLoyaltyPointsEarnedEvent(eventData) {
  logger.info("Processing loyalty points earned event:", eventData);
  // Handle loyalty points logic
  // This could include updating user loyalty status, sending notifications, etc.
}

async function handleSystemEvent(eventData) {
  logger.info("Processing system event:", eventData);
  // Handle system-wide events
  // This could include maintenance notifications, system updates, etc.
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

  // Kaynella Farms specific functions
  publishBookingCreatedEvent,
  publishBookingConfirmedEvent,
  publishBookingCompletedEvent,
  publishBookingCancelledEvent,
  publishBookingUpdatedEvent,
  publishLodgingAvailabilityUpdateEvent,
  publishActivityScheduledEvent,
  publishEventCreatedEvent,
  publishPaymentProcessedEvent,
  publishPaymentFailedEvent,
  publishLoyaltyPointsEarnedEvent,
  publishNotificationEvent,
  publishSystemEvent,
};
