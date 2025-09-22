// Centralized RabbitMQ queue configuration for Kaynela Farms Ltd
// Agritourism Platform - Event-Driven Microservices Architecture

module.exports = {
  // User & Authentication Events
  user_registered: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  user_login: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  profile_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  profile_picture_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  address_added: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  address_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  address_deleted: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  paymentMethod_added: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  paymentMethod_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  paymentMethod_deleted: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Agritourism Booking Events
  booking_created: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  booking_confirmed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  booking_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  booking_canceled: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  booking_completed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  booking_reminder: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Lodging & Accommodation Events
  lodging_booking_created: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  lodging_availability_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  lodging_checkin: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  lodging_checkout: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Activity & Experience Events
  activity_booking_created: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  activity_scheduled: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  activity_completed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  activity_canceled: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Event Ticketing Events
  event_created: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  ticket_purchased: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  ticket_validated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  ticket_expired: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  qr_code_generated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Payment Processing Events
  payment_initiated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  payment_processed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  payment_failed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  payment_refunded: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  payment_updates: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  mobile_money_payment: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  card_payment_processed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Loyalty Program Events
  loyaltyPointsEarned: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  loyaltyPointsRedeemed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  loyaltyPointsRefunded: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  loyalty_tier_upgraded: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  loyalty_tier_downgraded: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  loyalty_points_expired: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  loyalty_points_redeem_request: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  loyalty_points_redeemed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  loyalty_points_redeem_failed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  loyaltyPreferencesUpdated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Farm & Product Events
  farm_product_added: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  farm_product_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  farm_product_removed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  farm_seasonal_update: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  farm_activity_scheduled: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Review & Rating Events
  review_created: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  review_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  review_deleted: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  review_flagged: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  review_approved: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  review_rejected: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  farm_visit_rated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Notification Events
  notification_sent: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  notification_failed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  email_notification: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  sms_notification: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  push_notification: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  birthday_notifications: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  seasonal_notifications: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  farm_news_notification: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Analytics & Business Intelligence Events
  analytics_event_tracked: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  user_analytics_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  booking_analytics_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  loyalty_analytics_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  farm_activity_analytics: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  business_metrics_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Referral & Marketing Events
  referral_created: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  referral_completed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  referral_bonus_awarded: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  promotion_events: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  seasonal_promotion_launched: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // System & Maintenance Events
  system_maintenance_scheduled: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  system_maintenance_completed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  database_backup_completed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  service_health_check: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },

  // Legacy queues (maintained for backward compatibility)
  order_created: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  order_status_updated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  order_canceled: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  order_completed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  order_confirmed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  delivery_assigned: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  delivery_completed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  favorite_order_added: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  favorite_order_removed: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
  preferencesUpdated: {
    durable: true,
    arguments: { "x-message-ttl": 86400000, "x-max-length": 10000 },
  },
};
