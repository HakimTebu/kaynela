const amqp = require("amqplib");
const logger = require("../utils/logger");

let connection = null;
let channel = null;

// Exchange names for Kaynela Farms
const EXCHANGES = {
  NOTIFICATION_EVENTS: "kainella.notification.events",
  USER_EVENTS: "kainella.user.events",
  BOOKING_EVENTS: "kainella.booking.events",
  LOYALTY_EVENTS: "kainella.loyalty.events",
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
    // 1. NOTIFICATION_EVENTS - FANOUT exchange for broadcast notifications
    // All notification consumers receive all events
    await channel.assertExchange(EXCHANGES.NOTIFICATION_EVENTS, EXCHANGE_TYPES.FANOUT, {
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

    // 4. LOYALTY_EVENTS - TOPIC exchange for loyalty-related events
    // Pattern-based routing for loyalty events
    await channel.assertExchange(EXCHANGES.LOYALTY_EVENTS, EXCHANGE_TYPES.TOPIC, {
      durable: true,
      autoDelete: false,
    });

    // 5. SYSTEM_EVENTS - TOPIC exchange for system-wide events
    // Pattern-based routing for system operations
    await channel.assertExchange(EXCHANGES.SYSTEM_EVENTS, EXCHANGE_TYPES.TOPIC, {
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
// KAYNELA FARMS SPECIFIC EVENT PUBLISHING FUNCTIONS
// ============================================================================

// NOTIFICATION EVENTS - FANOUT exchange for broadcast notifications
async function publishNotificationSentEvent(notificationData) {
  const event = {
    eventType: "NOTIFICATION_SENT",
    notificationId: notificationData._id,
    userId: notificationData.userId,
    channel: notificationData.channel,
    type: notificationData.type,
    category: notificationData.category,
    status: notificationData.status,
    timestamp: new Date().toISOString(),
    source: "notification-service",
    version: "1.0",
  };

  // Fanout exchange: all notification consumers receive this event
  await publishEvent(EXCHANGES.NOTIFICATION_EVENTS, "", event);
  logger.info(
    `✅ Notification sent event published to fanout exchange: ${notificationData._id}`
  );
}

async function publishNotificationDeliveredEvent(notificationData) {
  const event = {
    eventType: "NOTIFICATION_DELIVERED",
    notificationId: notificationData._id,
    userId: notificationData.userId,
    channel: notificationData.channel,
    type: notificationData.type,
    category: notificationData.category,
    deliveredAt: notificationData.deliveredAt,
    timestamp: new Date().toISOString(),
    source: "notification-service",
    version: "1.0",
  };

  // Fanout exchange: all notification consumers receive this event
  await publishEvent(EXCHANGES.NOTIFICATION_EVENTS, "", event);
  logger.info(
    `✅ Notification delivered event published to fanout exchange: ${notificationData._id}`
  );
}

async function publishNotificationFailedEvent(notificationData, reason) {
  const event = {
    eventType: "NOTIFICATION_FAILED",
    notificationId: notificationData._id,
    userId: notificationData.userId,
    channel: notificationData.channel,
    type: notificationData.type,
    category: notificationData.category,
    reason,
    deliveryAttempts: notificationData.deliveryAttempts,
    timestamp: new Date().toISOString(),
    source: "notification-service",
    version: "1.0",
  };

  // Fanout exchange: all notification consumers receive this event
  await publishEvent(EXCHANGES.NOTIFICATION_EVENTS, "", event);
  logger.info(
    `✅ Notification failed event published to fanout exchange: ${notificationData._id}`
  );
}

async function publishBulkNotificationEvent(bulkData) {
  const event = {
    eventType: "BULK_NOTIFICATION_SENT",
    bulkId: bulkData.bulkId,
    totalRecipients: bulkData.totalRecipients,
    successfulDeliveries: bulkData.successfulDeliveries,
    failedDeliveries: bulkData.failedDeliveries,
    channels: bulkData.channels,
    templateId: bulkData.templateId,
    timestamp: new Date().toISOString(),
    source: "notification-service",
    version: "1.0",
  };

  // Fanout exchange: all notification consumers receive this event
  await publishEvent(EXCHANGES.NOTIFICATION_EVENTS, "", event);
  logger.info(
    `✅ Bulk notification event published to fanout exchange: ${bulkData.bulkId}`
  );
}

// USER EVENTS - TOPIC exchange for user-related events
async function publishUserNotificationPreferencesUpdatedEvent(userData, preferences) {
  const event = {
    eventType: "USER_NOTIFICATION_PREFERENCES_UPDATED",
    userId: userData._id,
    preferences,
    timestamp: new Date().toISOString(),
    source: "notification-service",
    version: "1.0",
  };

  // Topic exchange: user.notification.preferences.updated.*
  await publishEvent(EXCHANGES.USER_EVENTS, "user.notification.preferences.updated", event);
  logger.info(
    `✅ User notification preferences updated event published to topic exchange: ${userData._id}`
  );
}

async function publishDeviceTokenRegisteredEvent(userData, deviceData) {
  const event = {
    eventType: "DEVICE_TOKEN_REGISTERED",
    userId: userData._id,
    platform: deviceData.platform,
    appVersion: deviceData.appVersion,
    timestamp: new Date().toISOString(),
    source: "notification-service",
    version: "1.0",
  };

  // Topic exchange: user.device.token.registered.*
  await publishEvent(EXCHANGES.USER_EVENTS, "user.device.token.registered", event);
  logger.info(
    `✅ Device token registered event published to topic exchange: ${userData._id}`
  );
}

// BOOKING EVENTS - TOPIC exchange for booking-related events
async function publishBookingNotificationEvent(bookingData, notificationType) {
  const event = {
    eventType: "BOOKING_NOTIFICATION_SENT",
    bookingId: bookingData.bookingId,
    userId: bookingData.userId,
    notificationType,
    timestamp: new Date().toISOString(),
    source: "notification-service",
    version: "1.0",
  };

  // Topic exchange: booking.notification.sent.*
  await publishEvent(EXCHANGES.BOOKING_EVENTS, "booking.notification.sent", event);
  logger.info(
    `✅ Booking notification event published to topic exchange: ${bookingData.bookingId}`
  );
}

// LOYALTY EVENTS - TOPIC exchange for loyalty-related events
async function publishLoyaltyNotificationEvent(loyaltyData, notificationType) {
  const event = {
    eventType: "LOYALTY_NOTIFICATION_SENT",
    userId: loyaltyData.userId,
    notificationType,
    loyaltyTier: loyaltyData.loyaltyTier,
    loyaltyPoints: loyaltyData.loyaltyPoints,
    timestamp: new Date().toISOString(),
    source: "notification-service",
    version: "1.0",
  };

  // Topic exchange: loyalty.notification.sent.*
  await publishEvent(EXCHANGES.LOYALTY_EVENTS, "loyalty.notification.sent", event);
  logger.info(
    `✅ Loyalty notification event published to topic exchange: ${loyaltyData.userId}`
  );
}

// SYSTEM EVENTS - TOPIC exchange for system-wide operations
async function publishSystemNotificationEvent(eventType, data) {
  const event = {
    eventType,
    data,
    timestamp: new Date().toISOString(),
    source: "notification-service",
    version: "1.0",
  };

  // Topic exchange: system.notification.* for system-wide events
  await publishEvent(
    EXCHANGES.SYSTEM_EVENTS,
    `system.notification.${eventType.toLowerCase()}`,
    event
  );
  logger.info(`✅ System notification event published to topic exchange: ${eventType}`);
}

// ============================================================================
// EVENT CONSUMERS SETUP
// ============================================================================

// Setup event consumers for the notification service
async function setupEventConsumers() {
  try {
    const { getChannel } = require("./rabbitmq");
    const channel = await getChannel();

    // 1. Consume user registration events (TOPIC exchange)
    await consumeEvents(
      "notification-user-registered-queue",
      EXCHANGES.USER_EVENTS,
      "user.registered",
      handleUserRegisteredEvent,
      { durable: true }
    );

    // 2. Consume booking events (TOPIC exchange)
    await consumeEvents(
      "notification-booking-events-queue",
      EXCHANGES.BOOKING_EVENTS,
      "booking.*",
      handleBookingEvent,
      { durable: true }
    );

    // 3. Consume loyalty events (TOPIC exchange)
    await consumeEvents(
      "notification-loyalty-events-queue",
      EXCHANGES.LOYALTY_EVENTS,
      "loyalty.*",
      handleLoyaltyEvent,
      { durable: true }
    );

    // 4. Consume system events (TOPIC exchange)
    await consumeEvents(
      "notification-system-events-queue",
      EXCHANGES.SYSTEM_EVENTS,
      "system.*",
      handleSystemEvent,
      { durable: true }
    );

    logger.info("✅ Event consumers setup complete for notification service");
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
  // This could include sending welcome notifications, setting up preferences, etc.
}

async function handleBookingEvent(eventData) {
  logger.info("Processing booking event:", eventData);
  // Handle booking events
  // This could include sending confirmation, reminder, or cancellation notifications
}

async function handleLoyaltyEvent(eventData) {
  logger.info("Processing loyalty event:", eventData);
  // Handle loyalty events
  // This could include sending points earned, tier upgrade, or reward notifications
}

async function handleSystemEvent(eventData) {
  logger.info("Processing system event:", eventData);
  // Handle system-wide events
  // This could include sending maintenance notifications, system updates, etc.
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
  publishNotificationSentEvent,
  publishNotificationDeliveredEvent,
  publishNotificationFailedEvent,
  publishBulkNotificationEvent,
  publishUserNotificationPreferencesUpdatedEvent,
  publishDeviceTokenRegisteredEvent,
  publishBookingNotificationEvent,
  publishLoyaltyNotificationEvent,
  publishSystemNotificationEvent,
};
