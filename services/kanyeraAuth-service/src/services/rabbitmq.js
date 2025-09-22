const amqp = require("amqplib");
const logger = require("../utils/logger");

let connection = null;
let channel = null;

// Exchange names for Kaynela Farms
const EXCHANGES = {
  USER_EVENTS: "kainella.user.events",
  AUTH_EVENTS: "kainella.auth.events",
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
    // 1. USER_EVENTS - TOPIC exchange for user-related events
    // Allows flexible routing like: user.*, *.registered, etc.
    await channel.assertExchange(EXCHANGES.USER_EVENTS, EXCHANGE_TYPES.TOPIC, {
      durable: true,
      autoDelete: false,
    });

    // 2. AUTH_EVENTS - DIRECT exchange for authentication events
    // Exact routing for auth service communication
    await channel.assertExchange(EXCHANGES.AUTH_EVENTS, EXCHANGE_TYPES.DIRECT, {
      durable: true,
      autoDelete: false,
    });

    // 3. LOYALTY_EVENTS - DIRECT exchange for loyalty operations
    // Direct routing for loyalty service communication
    await channel.assertExchange(EXCHANGES.LOYALTY_EVENTS, EXCHANGE_TYPES.DIRECT, {
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

// USER EVENTS - TOPIC exchange for flexible routing
async function publishUserRegisteredEvent(userData) {
  const event = {
    eventType: "USER_REGISTERED",
    userId: userData._id,
    email: userData.email,
    phone: userData.phone,
    timestamp: new Date().toISOString(),
    source: "auth-service",
    version: "1.0",
  };

  // Topic exchange: user.registered.*
  await publishEvent(EXCHANGES.USER_EVENTS, "user.registered", event);
  logger.info(
    `✅ User registered event published to topic exchange: ${userData._id}`
  );
}

async function publishProfileUpdatedEvent(userData, updates) {
  const event = {
    eventType: "USER_PROFILE_UPDATED",
    userId: userData._id,
    updates,
    timestamp: new Date().toISOString(),
    source: "auth-service",
    version: "1.0",
  };

  // Topic exchange: user.profile.updated.*
  await publishEvent(EXCHANGES.USER_EVENTS, "user.profile.updated", event);
  logger.info(
    `✅ Profile updated event published to topic exchange: ${userData._id}`
  );
}

async function publishLoyaltyTierChangedEvent(userData, oldTier, newTier) {
  const event = {
    eventType: "LOYALTY_TIER_CHANGED",
    userId: userData._id,
    oldTier,
    newTier,
    timestamp: new Date().toISOString(),
    source: "auth-service",
    version: "1.0",
  };

  // Topic exchange: user.loyalty.tier.changed.*
  await publishEvent(EXCHANGES.USER_EVENTS, "user.loyalty.tier.changed", event);
  logger.info(
    `✅ Loyalty tier changed event published to topic exchange: ${userData._id}`
  );
}

async function publishUserAnalyticsUpdatedEvent(userData, preferences) {
  const event = {
    eventType: "AGRITOURISM_PREFERENCES_UPDATED",
    userId: userData._id,
    preferences,
    timestamp: new Date().toISOString(),
    source: "auth-service",
    version: "1.0",
  };

  // Topic exchange: user.analytics.updated.*
  await publishEvent(EXCHANGES.USER_EVENTS, "user.analytics.updated", event);
  logger.info(
    `✅ User analytics updated event published to topic exchange: ${userData._id}`
  );
}

async function publishFarmVisitRatedEvent(userData, visitData) {
  const event = {
    eventType: "FARM_VISIT_RATED",
    userId: userData._id,
    visitData,
    timestamp: new Date().toISOString(),
    source: "auth-service",
    version: "1.0",
  };

  // Topic exchange: user.farm.visit.rated.*
  await publishEvent(EXCHANGES.USER_EVENTS, "user.farm.visit.rated", event);
  logger.info(
    `✅ Farm visit rated event published to topic exchange: ${userData._id}`
  );
}

async function publishFarmActivityAnalyticsEvent(userData, activityType, rating) {
  const event = {
    eventType: "FARM_VISIT_ANALYTICS",
    userId: userData._id,
    activityType,
    rating,
    timestamp: new Date().toISOString(),
    source: "auth-service",
    version: "1.0",
  };

  // Topic exchange: user.farm.activity.analytics.*
  await publishEvent(EXCHANGES.USER_EVENTS, "user.farm.activity.analytics", event);
  logger.info(
    `✅ Farm activity analytics event published to topic exchange: ${userData._id}`
  );
}

// LOYALTY EVENTS - DIRECT exchange for loyalty service communication
async function publishLoyaltyPointsEarnedEvent(userData, points, reason) {
  const event = {
    eventType: "LOYALTY_POINTS_EARNED",
    userId: userData._id,
    points,
    reason,
    totalPoints: userData.loyaltyPoints,
    tier: userData.loyaltyTier,
    timestamp: new Date().toISOString(),
    source: "auth-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for loyalty service
  await publishEvent(EXCHANGES.LOYALTY_EVENTS, "loyalty.points.earned", event);
  logger.info(
    `✅ Loyalty points earned event published to direct exchange: ${userData._id}`
  );
}

async function publishLoyaltyPointsRedeemedEvent(userData, points, reason) {
  const event = {
    eventType: "LOYALTY_POINTS_REDEEMED",
    userId: userData._id,
    points,
    reason,
    remainingPoints: userData.loyaltyPoints,
    tier: userData.loyaltyTier,
    timestamp: new Date().toISOString(),
    source: "auth-service",
    version: "1.0",
  };

  // Direct exchange: exact routing key for loyalty service
  await publishEvent(EXCHANGES.LOYALTY_EVENTS, "loyalty.points.redeemed", event);
  logger.info(
    `✅ Loyalty points redeemed event published to direct exchange: ${userData._id}`
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
    source: "auth-service",
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
    source: "auth-service",
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

// Setup event consumers for the auth service
async function setupEventConsumers() {
  try {
    const { getChannel } = require("./rabbitmq");
    const channel = await getChannel();

    // 1. Consume loyalty points earned events (DIRECT exchange)
    await consumeEvents(
      "auth-loyalty-points-queue",
      EXCHANGES.LOYALTY_EVENTS,
      "loyalty.points.earned",
      handleLoyaltyPointsEarnedEvent,
      { durable: true }
    );

    // 2. Consume system events (TOPIC exchange)
    await consumeEvents(
      "auth-system-events-queue",
      EXCHANGES.SYSTEM_EVENTS,
      "system.auth.*",
      handleSystemEvent,
      { durable: true }
    );

    logger.info("✅ Event consumers setup complete for auth service");
  } catch (error) {
    logger.error("❌ Error setting up event consumers:", error);
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// Event handlers for consumed events
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
  publishUserRegisteredEvent,
  publishProfileUpdatedEvent,
  publishLoyaltyTierChangedEvent,
  publishUserAnalyticsUpdatedEvent,
  publishFarmVisitRatedEvent,
  publishFarmActivityAnalyticsEvent,
  publishLoyaltyPointsEarnedEvent,
  publishLoyaltyPointsRedeemedEvent,
  publishNotificationEvent,
  publishSystemEvent,
};
