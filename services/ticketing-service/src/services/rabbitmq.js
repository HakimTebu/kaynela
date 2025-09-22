const amqp = require("amqplib");
const logger = require("../utils/logger");
const { NOTIFICATION_TYPES } = require("../constants");

let connection = null;
let channel = null;
let notificationChannel = null;
let analyticsChannel = null;
let paymentChannel = null;
let loyaltyChannel = null;

// Exchange names
const EXCHANGES = {
  // Direct exchange for specific routing
  TICKET_EVENTS: "ticket.events",
  EVENT_MANAGEMENT: "event.management",
  PAYMENT_INTEGRATION: "payment.integration",
  
  // Fanout exchange for broadcasting
  NOTIFICATIONS: "notifications.fanout",
  SYSTEM_ALERTS: "system.alerts",
  
  // Topic exchange for pattern-based routing
  ANALYTICS: "analytics.topic",
  AUDIT_LOGS: "audit.topic",
  BUSINESS_EVENTS: "business.topic",
  
  // Headers exchange for complex routing
  LOYALTY_EVENTS: "loyalty.headers",
  REPORTING_EVENTS: "reporting.headers",
};

// Queue names
const QUEUES = {
  TICKET_CREATED: "ticket.created.queue",
  TICKET_UPDATED: "ticket.updated.queue",
  TICKET_CANCELLED: "ticket.cancelled.queue",
  TICKET_VALIDATED: "ticket.validated.queue",
  EVENT_CREATED: "event.created.queue",
  EVENT_UPDATED: "event.updated.queue",
  EVENT_CANCELLED: "event.cancelled.queue",
  QR_CODE_GENERATED: "qr.code.generated.queue",
  PAYMENT_PROCESSED: "payment.processed.queue",
  LOYALTY_POINTS_EARNED: "loyalty.points.earned.queue",
  NOTIFICATION_SENT: "notification.sent.queue",
  ANALYTICS_DATA: "analytics.data.queue",
  AUDIT_LOG: "audit.log.queue",
};

// Routing keys
const ROUTING_KEYS = {
  // Direct exchange routing keys
  TICKET_CREATED: "ticket.created",
  TICKET_UPDATED: "ticket.updated",
  TICKET_CANCELLED: "ticket.cancelled",
  TICKET_VALIDATED: "ticket.validated",
  TICKET_REFUNDED: "ticket.refunded",
  TICKET_TRANSFERRED: "ticket.transferred",
  EVENT_CREATED: "event.created",
  EVENT_UPDATED: "event.updated",
  EVENT_CANCELLED: "event.cancelled",
  EVENT_ACTIVATED: "event.activated",
  EVENT_DEACTIVATED: "event.deactivated",
  QR_CODE_GENERATED: "qr.code.generated",
  QR_CODE_VALIDATED: "qr.code.validated",
  
  // Topic exchange routing keys
  ANALYTICS_TICKET: "analytics.ticket.*",
  ANALYTICS_EVENT: "analytics.event.*",
  ANALYTICS_USER: "analytics.user.*",
  AUDIT_TICKET: "audit.ticket.*",
  AUDIT_EVENT: "audit.event.*",
  AUDIT_USER: "audit.user.*",
  BUSINESS_TICKET: "business.ticket.*",
  BUSINESS_EVENT: "business.event.*",
  BUSINESS_USER: "business.user.*",
  
  // Headers exchange routing keys
  LOYALTY_TICKET_PURCHASE: "loyalty.ticket.purchase",
  LOYALTY_EVENT_ATTENDANCE: "loyalty.event.attendance",
  LOYALTY_REFUND_PROCESSED: "loyalty.refund.processed",
  REPORTING_TICKET_SALES: "reporting.ticket.sales",
  REPORTING_EVENT_PERFORMANCE: "reporting.event.performance",
  REPORTING_USER_ACTIVITY: "reporting.user.activity",
};

// Connect to RabbitMQ
const connectRabbitMQ = async () => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";
    
    logger.info("🔌 Connecting to RabbitMQ...");
    
    // Create main connection
    connection = await amqp.connect(rabbitmqUrl);
    
    // Create main channel
    channel = await connection.createChannel();
    
    // Create specialized channels
    notificationChannel = await connection.createChannel();
    analyticsChannel = await connection.createChannel();
    paymentChannel = await connection.createChannel();
    loyaltyChannel = await connection.createChannel();
    
    logger.info("✅ RabbitMQ connection established");
    
    // Setup exchanges
    await setupExchanges();
    
    // Setup queues
    await setupQueues();
    
    // Setup bindings
    await setupBindings();
    
    logger.info("✅ RabbitMQ exchanges, queues, and bindings configured");
    
    // Setup connection event handlers
    setupConnectionHandlers();
    
  } catch (error) {
    logger.error("❌ Failed to connect to RabbitMQ:", error);
    throw error;
  }
};

// Setup all exchange types
const setupExchanges = async () => {
  try {
    // 1. Direct Exchange - for specific routing
    await channel.assertExchange(EXCHANGES.TICKET_EVENTS, "direct", {
      durable: true,
      autoDelete: false,
    });
    
    await channel.assertExchange(EXCHANGES.EVENT_MANAGEMENT, "direct", {
      durable: true,
      autoDelete: false,
    });
    
    await channel.assertExchange(EXCHANGES.PAYMENT_INTEGRATION, "direct", {
      durable: true,
      autoDelete: false,
    });
    
    // 2. Fanout Exchange - for broadcasting
    await notificationChannel.assertExchange(EXCHANGES.NOTIFICATIONS, "fanout", {
      durable: true,
      autoDelete: false,
    });
    
    await notificationChannel.assertExchange(EXCHANGES.SYSTEM_ALERTS, "fanout", {
      durable: true,
      autoDelete: false,
    });
    
    // 3. Topic Exchange - for pattern-based routing
    await analyticsChannel.assertExchange(EXCHANGES.ANALYTICS, "topic", {
      durable: true,
      autoDelete: false,
    });
    
    await analyticsChannel.assertExchange(EXCHANGES.AUDIT_LOGS, "topic", {
      durable: true,
      autoDelete: false,
    });
    
    await analyticsChannel.assertExchange(EXCHANGES.BUSINESS_EVENTS, "topic", {
      durable: true,
      autoDelete: false,
    });
    
    // 4. Headers Exchange - for complex routing
    await loyaltyChannel.assertExchange(EXCHANGES.LOYALTY_EVENTS, "headers", {
      durable: true,
      autoDelete: false,
    });
    
    await loyaltyChannel.assertExchange(EXCHANGES.REPORTING_EVENTS, "headers", {
      durable: true,
      autoDelete: false,
    });
    
    logger.info("✅ All exchanges configured successfully");
  } catch (error) {
    logger.error("❌ Failed to setup exchanges:", error);
    throw error;
  }
};

// Setup queues
const setupQueues = async () => {
  try {
    // Ticket-related queues
    await channel.assertQueue(QUEUES.TICKET_CREATED, { durable: true });
    await channel.assertQueue(QUEUES.TICKET_UPDATED, { durable: true });
    await channel.assertQueue(QUEUES.TICKET_CANCELLED, { durable: true });
    await channel.assertQueue(QUEUES.TICKET_VALIDATED, { durable: true });
    
    // Event-related queues
    await channel.assertQueue(QUEUES.EVENT_CREATED, { durable: true });
    await channel.assertQueue(QUEUES.EVENT_UPDATED, { durable: true });
    await channel.assertQueue(QUEUES.EVENT_CANCELLED, { durable: true });
    
    // QR code queues
    await channel.assertQueue(QUEUES.QR_CODE_GENERATED, { durable: true });
    
    // Integration queues
    await channel.assertQueue(QUEUES.PAYMENT_PROCESSED, { durable: true });
    await channel.assertQueue(QUEUES.LOYALTY_POINTS_EARNED, { durable: true });
    await channel.assertQueue(QUEUES.NOTIFICATION_SENT, { durable: true });
    await channel.assertQueue(QUEUES.ANALYTICS_DATA, { durable: true });
    await channel.assertQueue(QUEUES.AUDIT_LOG, { durable: true });
    
    logger.info("✅ All queues configured successfully");
  } catch (error) {
    logger.error("❌ Failed to setup queues:", error);
    throw error;
  }
};

// Setup bindings
const setupBindings = async () => {
  try {
    // Direct exchange bindings
    await channel.bindQueue(QUEUES.TICKET_CREATED, EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_CREATED);
    await channel.bindQueue(QUEUES.TICKET_UPDATED, EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_UPDATED);
    await channel.bindQueue(QUEUES.TICKET_CANCELLED, EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_CANCELLED);
    await channel.bindQueue(QUEUES.TICKET_VALIDATED, EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_VALIDATED);
    
    await channel.bindQueue(QUEUES.EVENT_CREATED, EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_CREATED);
    await channel.bindQueue(QUEUES.EVENT_UPDATED, EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_UPDATED);
    await channel.bindQueue(QUEUES.EVENT_CANCELLED, EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_CANCELLED);
    
    // Topic exchange bindings
    await analyticsChannel.bindQueue(QUEUES.ANALYTICS_DATA, EXCHANGES.ANALYTICS, ROUTING_KEYS.ANALYTICS_TICKET);
    await analyticsChannel.bindQueue(QUEUES.ANALYTICS_DATA, EXCHANGES.ANALYTICS, ROUTING_KEYS.ANALYTICS_EVENT);
    await analyticsChannel.bindQueue(QUEUES.ANALYTICS_DATA, EXCHANGES.ANALYTICS, ROUTING_KEYS.ANALYTICS_USER);
    
    await analyticsChannel.bindQueue(QUEUES.AUDIT_LOG, EXCHANGES.AUDIT_LOGS, ROUTING_KEYS.AUDIT_TICKET);
    await analyticsChannel.bindQueue(QUEUES.AUDIT_LOG, EXCHANGES.AUDIT_LOGS, ROUTING_KEYS.AUDIT_EVENT);
    await analyticsChannel.bindQueue(QUEUES.AUDIT_LOG, EXCHANGES.AUDIT_LOGS, ROUTING_KEYS.AUDIT_USER);
    
    // Fanout exchange bindings (no routing key needed)
    await notificationChannel.bindQueue(QUEUES.NOTIFICATION_SENT, EXCHANGES.NOTIFICATIONS, "");
    await notificationChannel.bindQueue(QUEUES.NOTIFICATION_SENT, EXCHANGES.SYSTEM_ALERTS, "");
    
    // Headers exchange bindings
    await loyaltyChannel.bindQueue(QUEUES.LOYALTY_POINTS_EARNED, EXCHANGES.LOYALTY_EVENTS, "", {
      "event-type": "ticket_purchase",
      "service": "ticketing",
    });
    
    await loyaltyChannel.bindQueue(QUEUES.LOYALTY_POINTS_EARNED, EXCHANGES.LOYALTY_EVENTS, "", {
      "event-type": "event_attendance",
      "service": "ticketing",
    });
    
    logger.info("✅ All bindings configured successfully");
  } catch (error) {
    logger.error("❌ Failed to setup bindings:", error);
    throw error;
  }
};

// Setup connection event handlers
const setupConnectionHandlers = () => {
  connection.on("error", (err) => {
    logger.error("RabbitMQ connection error:", err);
  });
  
  connection.on("close", () => {
    logger.warn("RabbitMQ connection closed");
  });
  
  connection.on("reconnect", () => {
    logger.info("RabbitMQ reconnected");
  });
};

// Publish messages to different exchange types
const publishMessage = async (exchange, routingKey, message, options = {}) => {
  try {
    if (!channel) {
      throw new Error("RabbitMQ channel not available");
    }
    
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    const publishOptions = {
      persistent: true,
      timestamp: Date.now(),
      messageId: options.messageId || require("uuid").v4(),
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      headers: {
        service: "ticketing-service",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        ...options.headers,
      },
      ...options,
    };
    
    const success = channel.publish(exchange, routingKey, messageBuffer, publishOptions);
    
    if (success) {
      logger.debug("Message published successfully:", {
        exchange,
        routingKey,
        messageId: publishOptions.messageId,
        timestamp: publishOptions.timestamp,
      });
    } else {
      throw new Error("Failed to publish message");
    }
    
    return success;
  } catch (error) {
    logger.error("Failed to publish message:", error);
    throw error;
  }
};

// Publish to direct exchange
const publishToDirect = async (exchange, routingKey, message, options = {}) => {
  return publishMessage(exchange, routingKey, message, options);
};

// Publish to fanout exchange (no routing key)
const publishToFanout = async (exchange, message, options = {}) => {
  return publishMessage(exchange, "", message, options);
};

// Publish to topic exchange
const publishToTopic = async (exchange, routingKey, message, options = {}) => {
  return publishMessage(exchange, routingKey, message, options);
};

// Publish to headers exchange
const publishToHeaders = async (exchange, message, headers = {}, options = {}) => {
  try {
    if (!loyaltyChannel) {
      throw new Error("Loyalty channel not available");
    }
    
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    const publishOptions = {
      persistent: true,
      timestamp: Date.now(),
      messageId: options.messageId || require("uuid").v4(),
      correlationId: options.correlationId,
      replyTo: options.replyTo,
      headers: {
        service: "ticketing-service",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        ...headers,
        ...options.headers,
      },
      ...options,
    };
    
    const success = loyaltyChannel.publish(exchange, "", messageBuffer, publishOptions);
    
    if (success) {
      logger.debug("Message published to headers exchange successfully:", {
        exchange,
        headers: publishOptions.headers,
        messageId: publishOptions.messageId,
        timestamp: publishOptions.timestamp,
      });
    } else {
      throw new Error("Failed to publish message to headers exchange");
    }
    
    return success;
  } catch (error) {
    logger.error("Failed to publish message to headers exchange:", error);
    throw error;
  }
};

// Setup event consumers
const setupEventConsumers = async () => {
  try {
    logger.info("🔄 Setting up event consumers...");
    
    // Consumer for ticket events
    await channel.consume(QUEUES.TICKET_CREATED, (msg) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        logger.info("Received ticket created event:", content);
        
        // Process the event
        processTicketCreatedEvent(content);
        
        // Acknowledge the message
        channel.ack(msg);
      }
    });
    
    // Consumer for event management
    await channel.consume(QUEUES.EVENT_CREATED, (msg) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        logger.info("Received event created event:", content);
        
        // Process the event
        processEventCreatedEvent(content);
        
        // Acknowledge the message
        channel.ack(msg);
      }
    });
    
    // Consumer for analytics data
    await analyticsChannel.consume(QUEUES.ANALYTICS_DATA, (msg) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        logger.info("Received analytics data:", content);
        
        // Process analytics data
        processAnalyticsData(content);
        
        // Acknowledge the message
        analyticsChannel.ack(msg);
      }
    });
    
    logger.info("✅ Event consumers setup completed");
  } catch (error) {
    logger.error("❌ Failed to setup event consumers:", error);
    throw error;
  }
};

// Event processing functions
const processTicketCreatedEvent = (data) => {
  // Process ticket created event
  logger.info("Processing ticket created event:", data);
  
  // Send notification
  publishToFanout(EXCHANGES.NOTIFICATIONS, {
    type: NOTIFICATION_TYPES.TICKET_CREATED,
    userId: data.userId,
    ticketId: data.ticketId,
    eventId: data.eventId,
    timestamp: new Date().toISOString(),
  });
  
  // Send analytics data
  publishToTopic(EXCHANGES.ANALYTICS, ROUTING_KEYS.ANALYTICS_TICKET, {
    event: "ticket_created",
    ticketId: data.ticketId,
    userId: data.userId,
    eventId: data.eventId,
    ticketType: data.ticketType,
    price: data.price,
    timestamp: new Date().toISOString(),
  });
  
  // Send loyalty event
  publishToHeaders(EXCHANGES.LOYALTY_EVENTS, {
    event: "ticket_purchase",
    userId: data.userId,
    ticketId: data.ticketId,
    eventId: data.eventId,
    amount: data.price,
    timestamp: new Date().toISOString(),
  }, {
    "event-type": "ticket_purchase",
    "service": "ticketing",
    "user-tier": data.userTier || "standard",
  });
};

const processEventCreatedEvent = (data) => {
  // Process event created event
  logger.info("Processing event created event:", data);
  
  // Send notification
  publishToFanout(EXCHANGES.NOTIFICATIONS, {
    type: NOTIFICATION_TYPES.EVENT_CREATED,
    eventId: data.eventId,
    organizerId: data.organizerId,
    eventName: data.name,
    timestamp: new Date().toISOString(),
  });
  
  // Send analytics data
  publishToTopic(EXCHANGES.ANALYTICS, ROUTING_KEYS.ANALYTICS_EVENT, {
    event: "event_created",
    eventId: data.eventId,
    organizerId: data.organizerId,
    eventType: data.eventType,
    capacity: data.capacity,
    timestamp: new Date().toISOString(),
  });
};

const processAnalyticsData = (data) => {
  // Process analytics data
  logger.info("Processing analytics data:", data);
  
  // Store analytics data or forward to reporting service
  publishToHeaders(EXCHANGES.REPORTING_EVENTS, {
    event: "analytics_data",
    data: data,
    timestamp: new Date().toISOString(),
  }, {
    "event-type": "analytics_data",
    "service": "ticketing",
    "data-category": data.category || "general",
  });
};

// Close connections
const closeConnections = async () => {
  try {
    if (loyaltyChannel) await loyaltyChannel.close();
    if (paymentChannel) await paymentChannel.close();
    if (analyticsChannel) await analyticsChannel.close();
    if (notificationChannel) await notificationChannel.close();
    if (channel) await channel.close();
    if (connection) await connection.close();
    
    logger.info("✅ RabbitMQ connections closed");
  } catch (error) {
    logger.error("❌ Error closing RabbitMQ connections:", error);
  }
};

module.exports = {
  connectRabbitMQ,
  setupEventConsumers,
  publishMessage,
  publishToDirect,
  publishToFanout,
  publishToTopic,
  publishToHeaders,
  closeConnections,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
};
