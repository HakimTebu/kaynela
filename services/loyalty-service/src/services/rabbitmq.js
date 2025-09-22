const amqp = require("amqplib");
const logger = require("../utils/logger");

let connection = null;
let channel = null;

// Exchange names for Kaynela Farms
const EXCHANGES = {
  LOYALTY_EVENTS: "kainella.loyalty.events",
  USER_EVENTS: "kainella.user.events",
  BOOKING_EVENTS: "kainella.booking.events",
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
    // 1. LOYALTY_EVENTS - DIRECT exchange for loyalty operations
    // Exact routing for loyalty service communication
    await channel.assertExchange(EXCHANGES.LOYALTY_EVENTS, EXCHANGE_TYPES.DIRECT, {
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

// LOYALTY EVENTS - DIRECT exchange for loyalty service communication
async function publishPointsEarnedEvent(userData, pointsData) {
  const event = {
    eventType: "LOYALTY_POINTS_EARNED",
    userId: userData._id,
    points: pointsData.points,
    totalPoints: pointsData.totalPoints,
    reason: pointsData.reason,
    source: pointsData.source,
    tier: pointsData.tier,
    timestamp: new Date().toISOString(),
    source: "loyalty-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.LOYALTY_EVENTS, "loyalty.points.earned", event);
  logger.info(
    `✅ Loyalty points earned event published to direct exchange: ${userData._id}`
  );
}

async function publishPointsRedeemedEvent(userData, pointsData, rewardData) {
  const event = {
    eventType: "LOYALTY_POINTS_REDEEMED",
    userId: userData._id,
    points: pointsData.points,
    remainingPoints: pointsData.remainingPoints,
    rewardId: rewardData._id,
    rewardName: rewardData.name,
    tier: userData.loyaltyTier,
    timestamp: new Date().toISOString(),
    source: "loyalty-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.LOYALTY_EVENTS, "loyalty.points.redeemed", event);
  logger.info(
    `✅ Loyalty points redeemed event published to direct exchange: ${userData._id}`
  );
}

async function publishTierUpgradedEvent(userData, oldTier, newTier) {
  const event = {
    eventType: "LOYALTY_TIER_UPGRADED",
    userId: userData._id,
    oldTier,
    newTier,
    totalPoints: userData.loyaltyPoints,
    upgradeDate: new Date(),
    timestamp: new Date().toISOString(),
    source: "loyalty-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.LOYALTY_EVENTS, "loyalty.tier.upgraded", event);
  logger.info(
    `✅ Loyalty tier upgraded event published to direct exchange: ${userData._id}`
  );
}

async function publishRewardCreatedEvent(rewardData) {
  const event = {
    eventType: "REWARD_CREATED",
    rewardId: rewardData._id,
    name: rewardData.name,
    category: rewardData.category,
    pointsCost: rewardData.pointsCost,
    tierRequirement: rewardData.tierRequirement,
    createdBy: rewardData.createdBy,
    timestamp: new Date().toISOString(),
    source: "loyalty-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.LOYALTY_EVENTS, "loyalty.reward.created", event);
  logger.info(
    `✅ Reward created event published to direct exchange: ${rewardData._id}`
  );
}

async function publishRewardRedeemedEvent(userData, rewardData, quantity) {
  const event = {
    eventType: "REWARD_REDEEMED",
    userId: userData._id,
    rewardId: rewardData._id,
    rewardName: rewardData.name,
    quantity,
    tier: userData.loyaltyTier,
    timestamp: new Date().toISOString(),
    source: "loyalty-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for other services
  await publishEvent(EXCHANGES.LOYALTY_EVENTS, "loyalty.reward.redeemed", event);
  logger.info(
    `✅ Reward redeemed event published to direct exchange: ${userData._id}`
  );
}

// USER EVENTS - TOPIC exchange for user-related events
async function publishUserLoyaltyUpdatedEvent(userData, updateType) {
  const event = {
    eventType: "USER_LOYALTY_UPDATED",
    userId: userData._id,
    updateType,
    loyaltyTier: userData.loyaltyTier,
    loyaltyPoints: userData.loyaltyPoints,
    timestamp: new Date().toISOString(),
    source: "loyalty-service",
    version: "1.0",
  };

  // Topic exchange: user.loyalty.updated.*
  await publishEvent(EXCHANGES.USER_EVENTS, "user.loyalty.updated", event);
  logger.info(
    `✅ User loyalty updated event published to topic exchange: ${userData._id}`
  );
}

// BOOKING EVENTS - TOPIC exchange for booking-related events
async function publishBookingCompletedEvent(bookingData, pointsEarned) {
  const event = {
    eventType: "BOOKING_COMPLETED_LOYALTY",
    bookingId: bookingData.bookingId,
    userId: bookingData.userId,
    pointsEarned,
    bookingType: bookingData.bookingType,
    totalAmount: bookingData.totalAmount,
    timestamp: new Date().toISOString(),
    source: "loyalty-service",
    version: "1.0",
  };

  // Topic exchange: booking.completed.loyalty.*
  await publishEvent(EXCHANGES.BOOKING_EVENTS, "booking.completed.loyalty", event);
  logger.info(
    `✅ Booking completed loyalty event published to topic exchange: ${bookingData.bookingId}`
  );
}

// NOTIFICATION EVENTS - FANOUT exchange for broadcast notifications
async function publishNotificationEvent(userData, notificationType, message) {
  const event = {
    eventType: "NOTIFICATION_SENT",
    userId: userData._id,
    notificationType,
    message,
    timestamp: new Date().toISOString(),
    source: "loyalty-service",
    version: "1.0",
  };

  // Fanout exchange: all notification consumers receive this event
  await publishEvent(EXCHANGES.NOTIFICATION_EVENTS, "", event);
  logger.info(
    `✅ Notification event published to fanout exchange: ${userData._id}`
  );
}

// SYSTEM EVENTS - TOPIC exchange for system-wide operations
async function publishSystemEvent(eventType, data) {
  const event = {
    eventType,
    data,
    timestamp: new Date().toISOString(),
    source: "loyalty-service",
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

// Setup event consumers for the loyalty service
async function setupEventConsumers() {
  try {
    const { getChannel } = require("./rabbitmq");
    const channel = await getChannel();

    // 1. Consume user registration events (TOPIC exchange)
    await consumeEvents(
      "loyalty-user-registered-queue",
      EXCHANGES.USER_EVENTS,
      "user.registered",
      handleUserRegisteredEvent,
      { durable: true }
    );

    // 2. Consume booking completed events (TOPIC exchange)
    await consumeEvents(
      "loyalty-booking-completed-queue",
      EXCHANGES.BOOKING_EVENTS,
      "booking.completed",
      handleBookingCompletedEvent,
      { durable: true }
    );

    // 3. Consume profile updated events (TOPIC exchange)
    await consumeEvents(
      "loyalty-profile-updated-queue",
      EXCHANGES.USER_EVENTS,
      "user.profile.updated",
      handleProfileUpdatedEvent,
      { durable: true }
    );

    // 4. Consume system events (TOPIC exchange)
    await consumeEvents(
      "loyalty-system-events-queue",
      EXCHANGES.SYSTEM_EVENTS,
      "system.loyalty.*",
      handleSystemEvent,
      { durable: true }
    );

    logger.info("✅ Event consumers setup complete for loyalty service");
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
  // This could include creating initial loyalty profile, welcome bonus, etc.
}

async function handleBookingCompletedEvent(eventData) {
  logger.info("Processing booking completed event:", eventData);
  // Handle booking completion
  // This could include calculating and awarding loyalty points
}

async function handleProfileUpdatedEvent(eventData) {
  logger.info("Processing profile updated event:", eventData);
  // Handle profile updates
  // This could include updating loyalty preferences, tier calculations, etc.
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
  publishPointsEarnedEvent,
  publishPointsRedeemedEvent,
  publishTierUpgradedEvent,
  publishRewardCreatedEvent,
  publishRewardRedeemedEvent,
  publishUserLoyaltyUpdatedEvent,
  publishBookingCompletedEvent,
  publishNotificationEvent,
  publishSystemEvent,
};
