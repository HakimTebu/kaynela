const amqp = require("amqplib");
const logger = require("../utils/logger");

// Exchange definitions with all exchange types
const EXCHANGES = {
  // DIRECT Exchange - Routes messages to queues based on exact routing key match
  REPORTING_EVENTS: {
    name: "kainella.reporting.events",
    type: "direct",
    options: { durable: true },
    description: "Direct exchange for reporting events with exact routing key matching"
  },
  
  // TOPIC Exchange - Routes messages based on wildcard patterns in routing key
  USER_EVENTS: {
    name: "kainella.user.events",
    type: "topic",
    options: { durable: true },
    description: "Topic exchange for user events with pattern-based routing (e.g., user.*.created)"
  },
  
  // FANOUT Exchange - Broadcasts messages to all bound queues (ignores routing keys)
  NOTIFICATION_EVENTS: {
    name: "kainella.notification.events",
    type: "fanout",
    options: { durable: true },
    description: "Fanout exchange for notification events - broadcasts to all bound queues"
  },
  
  // HEADERS Exchange - Routes messages based on header attributes instead of routing keys
  SYSTEM_EVENTS: {
    name: "kainella.system.events",
    type: "headers",
    options: { durable: true },
    description: "Headers exchange for system events using message header attributes"
  },
  
  // DEFAULT Exchange - Pre-declared direct exchange (empty string name)
  DEFAULT: {
    name: "", // Empty string for default exchange
    type: "direct",
    options: { durable: true },
    description: "Default exchange where queues are automatically bound with their own name"
  }
};

// Queue definitions
const QUEUES = {
  REPORT_GENERATION: "kainella.report.generation",
  REPORT_EXPORT: "kainella.report.export",
  DASHBOARD_UPDATES: "kainella.dashboard.updates",
  ANALYTICS_PROCESSING: "kainella.analytics.processing",
  SCHEDULED_REPORTS: "kainella.scheduled.reports",
  DATA_SYNC: "kainella.data.sync",
  SYSTEM_MONITORING: "kainella.system.monitoring"
};

// Routing keys for different exchange types
const ROUTING_KEYS = {
  // DIRECT Exchange routing keys (exact matches)
  REPORT_CREATED: "report.created",
  REPORT_UPDATED: "report.updated",
  REPORT_DELETED: "report.deleted",
  REPORT_GENERATED: "report.generated",
  REPORT_EXPORTED: "report.exported",
  
  // TOPIC Exchange routing keys (pattern-based)
  USER_REGISTERED: "user.registered",
  USER_PROFILE_UPDATED: "user.profile.updated",
  USER_LOYALTY_UPDATED: "user.loyalty.updated",
  BOOKING_CREATED: "booking.created",
  BOOKING_COMPLETED: "booking.completed",
  PAYMENT_PROCESSED: "payment.processed",
  PAYMENT_COMPLETED: "payment.completed",
  
  // HEADERS Exchange attributes
  SYSTEM_MAINTENANCE: "maintenance",
  SYSTEM_BACKUP: "backup",
  SYSTEM_UPDATE: "update",
  SYSTEM_ERROR: "error"
};

let connection = null;
let channel = null;

// Connect to RabbitMQ
const connectRabbitMQ = async () => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";
    
    logger.info("🔌 Connecting to RabbitMQ...");
    connection = await amqp.connect(rabbmqUrl);
    
    connection.on("error", (err) => {
      logger.error("RabbitMQ connection error:", err);
    });
    
    connection.on("close", () => {
      logger.warn("RabbitMQ connection closed");
    });
    
    channel = await connection.createChannel();
    
    // Setup exchanges
    await setupExchanges();
    
    // Setup queues
    await setupQueues();
    
    // Bind queues to exchanges
    await bindQueues();
    
    logger.info("✅ RabbitMQ connected and configured successfully");
    
  } catch (error) {
    logger.error("❌ Failed to connect to RabbitMQ:", error);
    throw error;
  }
};

// Setup all exchange types
const setupExchanges = async () => {
  try {
    logger.info("🏗️ Setting up RabbitMQ exchanges...");
    
    for (const [key, exchange] of Object.entries(EXCHANGES)) {
      if (exchange.name === "") continue; // Skip default exchange
      
      await channel.assertExchange(exchange.name, exchange.type, exchange.options);
      logger.info(`✅ Exchange '${exchange.name}' (${exchange.type}) setup complete`);
    }
    
    logger.info("✅ All exchanges setup complete");
  } catch (error) {
    logger.error("❌ Failed to setup exchanges:", error);
    throw error;
  }
};

// Setup queues
const setupQueues = async () => {
  try {
    logger.info("📋 Setting up RabbitMQ queues...");
    
    for (const [key, queueName] of Object.entries(QUEUES)) {
      await channel.assertQueue(queueName, { durable: true });
      logger.info(`✅ Queue '${queueName}' setup complete`);
    }
    
    logger.info("✅ All queues setup complete");
  } catch (error) {
    logger.error("❌ Failed to setup queues:", error);
    throw error;
  }
};

// Bind queues to exchanges with appropriate binding strategies
const bindQueues = async () => {
  try {
    logger.info("🔗 Binding queues to exchanges...");
    
    // DIRECT Exchange bindings (exact routing key matches)
    await channel.bindQueue(QUEUES.REPORT_GENERATION, EXCHANGES.REPORTING_EVENTS.name, ROUTING_KEYS.REPORT_CREATED);
    await channel.bindQueue(QUEUES.REPORT_GENERATION, EXCHANGES.REPORTING_EVENTS.name, ROUTING_KEYS.REPORT_UPDATED);
    await channel.bindQueue(QUEUES.REPORT_EXPORT, EXCHANGES.REPORTING_EVENTS.name, ROUTING_KEYS.REPORT_EXPORTED);
    
    // TOPIC Exchange bindings (pattern-based routing)
    await channel.bindQueue(QUEUES.DASHBOARD_UPDATES, EXCHANGES.USER_EVENTS.name, "user.*.updated");
    await channel.bindQueue(QUEUES.ANALYTICS_PROCESSING, EXCHANGES.USER_EVENTS.name, "*.created");
    await channel.bindQueue(QUEUES.ANALYTICS_PROCESSING, EXCHANGES.USER_EVENTS.name, "*.completed");
    
    // FANOUT Exchange bindings (broadcast to all bound queues)
    await channel.bindQueue(QUEUES.SYSTEM_MONITORING, EXCHANGES.NOTIFICATION_EVENTS.name, "");
    
    // HEADERS Exchange bindings (header-based routing)
    await channel.bindQueue(QUEUES.SYSTEM_MONITORING, EXCHANGES.SYSTEM_EVENTS.name, "", {
      "x-match": "any",
      "priority": "high",
      "environment": "production"
    });
    
    // DEFAULT Exchange binding (queue bound to itself)
    await channel.bindQueue(QUEUES.DATA_SYNC, "", QUEUES.DATA_SYNC);
    
    logger.info("✅ All queue bindings complete");
  } catch (error) {
    logger.error("❌ Failed to bind queues:", error);
    throw error;
  }
};

// Publish events to different exchange types
const publishEvent = async (exchangeName, routingKey, message, headers = {}) => {
  try {
    if (!channel) {
      throw new Error("RabbitMQ channel not available");
    }
    
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    // Publish based on exchange type
    if (exchangeName === EXCHANGES.NOTIFICATION_EVENTS.name) {
      // FANOUT Exchange - ignore routing key, broadcast to all bound queues
      channel.publish(exchangeName, "", messageBuffer, { headers });
      logger.info(`📢 Published to FANOUT exchange '${exchangeName}' (broadcast)`);
    } else if (exchangeName === EXCHANGES.SYSTEM_EVENTS.name) {
      // HEADERS Exchange - use headers for routing, ignore routing key
      channel.publish(exchangeName, "", messageBuffer, { headers });
      logger.info(`📢 Published to HEADERS exchange '${exchangeName}' with headers:`, headers);
    } else if (exchangeName === "") {
      // DEFAULT Exchange - use routing key as queue name
      channel.publish(exchangeName, routingKey, messageBuffer, { headers });
      logger.info(`📢 Published to DEFAULT exchange with routing key '${routingKey}'`);
    } else {
      // DIRECT/TOPIC Exchange - use routing key for routing
      channel.publish(exchangeName, routingKey, messageBuffer, { headers });
      logger.info(`📢 Published to ${getExchangeType(exchangeName)} exchange '${exchangeName}' with routing key '${routingKey}'`);
    }
    
    return true;
  } catch (error) {
    logger.error("❌ Failed to publish event:", error);
    throw error;
  }
};

// Helper function to get exchange type
const getExchangeType = (exchangeName) => {
  for (const [key, exchange] of Object.entries(EXCHANGES)) {
    if (exchange.name === exchangeName) {
      return exchange.type.toUpperCase();
    }
  }
  return "UNKNOWN";
};

// Specific publishing functions for different exchange types
const publishDirectEvent = (routingKey, message) => {
  return publishEvent(EXCHANGES.REPORTING_EVENTS.name, routingKey, message);
};

const publishTopicEvent = (routingKey, message) => {
  return publishEvent(EXCHANGES.USER_EVENTS.name, routingKey, message);
};

const publishFanoutEvent = (message) => {
  return publishEvent(EXCHANGES.NOTIFICATION_EVENTS.name, "", message);
};

const publishHeadersEvent = (message, headers) => {
  return publishEvent(EXCHANGES.SYSTEM_EVENTS.name, "", message, headers);
};

const publishDefaultEvent = (routingKey, message) => {
  return publishEvent(EXCHANGES.DEFAULT.name, routingKey, message);
};

// Consume events from queues
const consumeEvents = async (queueName, callback) => {
  try {
    if (!channel) {
      throw new Error("RabbitMQ channel not available");
    }
    
    await channel.consume(queueName, (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`📥 Consumed message from queue '${queueName}':`, content);
          
          callback(content, msg);
          
          // Acknowledge the message
          channel.ack(msg);
        } catch (error) {
          logger.error("❌ Error processing message:", error);
          // Reject the message and requeue
          channel.nack(msg, false, true);
        }
      }
    });
    
    logger.info(`✅ Consumer setup for queue '${queueName}'`);
  } catch (error) {
    logger.error("❌ Failed to setup consumer:", error);
    throw error;
  }
};

// Setup event consumers for the reporting service
const setupEventConsumers = async () => {
  try {
    logger.info("👂 Setting up event consumers...");
    
    // Consume user events (TOPIC exchange)
    await consumeEvents(QUEUES.DASHBOARD_UPDATES, async (data, msg) => {
      logger.info("🔄 Processing dashboard update event:", data);
      // Handle dashboard update logic
    });
    
    // Consume analytics events (TOPIC exchange)
    await consumeEvents(QUEUES.ANALYTICS_PROCESSING, async (data, msg) => {
      logger.info("🔄 Processing analytics event:", data);
      // Handle analytics processing logic
    });
    
    // Consume system events (HEADERS exchange)
    await consumeEvents(QUEUES.SYSTEM_MONITORING, async (data, msg) => {
      logger.info("🔄 Processing system monitoring event:", data);
      // Handle system monitoring logic
    });
    
    // Consume data sync events (DEFAULT exchange)
    await consumeEvents(QUEUES.DATA_SYNC, async (data, msg) => {
      logger.info("🔄 Processing data sync event:", data);
      // Handle data sync logic
    });
    
    logger.info("✅ All event consumers setup complete");
  } catch (error) {
    logger.error("❌ Failed to setup event consumers:", error);
    throw error;
  }
};

// Get RabbitMQ channel
const getChannel = () => {
  return channel;
};

// Close connections
const closeConnections = async () => {
  try {
    if (channel) {
      await channel.close();
      logger.info("✅ RabbitMQ channel closed");
    }
    
    if (connection) {
      await connection.close();
      logger.info("✅ RabbitMQ connection closed");
    }
  } catch (error) {
    logger.error("❌ Error closing RabbitMQ connections:", error);
  }
};

module.exports = {
  connectRabbitMQ,
  setupExchanges,
  setupQueues,
  bindQueues,
  publishEvent,
  publishDirectEvent,
  publishTopicEvent,
  publishFanoutEvent,
  publishHeadersEvent,
  publishDefaultEvent,
  consumeEvents,
  setupEventConsumers,
  getChannel,
  closeConnections,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
};
