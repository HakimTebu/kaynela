module.exports = {
  // Booking statuses
  BOOKING_STATUS: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    ACTIVE: "active",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    REFUNDED: "refunded",
  },

  // Booking types
  BOOKING_TYPES: {
    LODGING: "lodging",
    ACTIVITY: "activity",
    EVENT: "event",
    FARM_TOUR: "farm_tour",
    PACKAGE: "package",
  },

  // Accommodation types
  ACCOMMODATION_TYPES: {
    FARMHOUSE: "farmhouse",
    COTTAGE: "cottage",
    GLAMPING: "glamping",
    CAMPING: "camping",
    GUESTHOUSE: "guesthouse",
  },

  // Activity types
  ACTIVITY_TYPES: {
    FARM_TOURS: "farm_tours",
    ANIMAL_FEEDING: "animal_feeding",
    CROP_PICKING: "crop_picking",
    COOKING_CLASSES: "cooking_classes",
    WINE_TASTING: "wine_tasting",
    HORSE_RIDING: "horse_riding",
    FISHING: "fishing",
    HIKING: "hiking",
    CAMPING: "camping",
  },

  // Event types
  EVENT_TYPES: {
    WORKSHOP: "workshop",
    FESTIVAL: "festival",
    CELEBRATION: "celebration",
    EDUCATIONAL: "educational",
    ENTERTAINMENT: "entertainment",
  },

  // Payment methods
  PAYMENT_METHODS: {
    MOBILE_MONEY: "mobile_money",
    CREDIT_CARD: "credit_card",
    DEBIT_CARD: "debit_card",
    BANK_TRANSFER: "bank_transfer",
    CASH: "cash",
  },

  // Payment statuses
  PAYMENT_STATUS: {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
    REFUNDED: "refunded",
  },

  // Cancellation policies
  CANCELLATION_POLICIES: {
    FLEXIBLE: "flexible",
    MODERATE: "moderate",
    STRICT: "strict",
    NON_REFUNDABLE: "non_refundable",
  },

  // Currencies
  CURRENCIES: {
    KES: "KES",
    USD: "USD",
    EUR: "EUR",
    GBP: "GBP",
  },

  // Dietary restrictions
  DIETARY_RESTRICTIONS: {
    VEGETARIAN: "vegetarian",
    VEGAN: "vegan",
    GLUTEN_FREE: "gluten_free",
    DAIRY_FREE: "dairy_free",
    NUT_FREE: "nut_free",
    HALAL: "halal",
    KOSHER: "kosher",
  },

  // Accessibility needs
  ACCESSIBILITY_NEEDS: {
    WHEELCHAIR_ACCESS: "wheelchair_access",
    HEARING_ASSISTANCE: "hearing_assistance",
    VISUAL_ASSISTANCE: "visual_assistance",
    MOBILITY_SUPPORT: "mobility_support",
  },

  // Skill levels
  SKILL_LEVELS: {
    BEGINNER: "beginner",
    INTERMEDIATE: "intermediate",
    ADVANCED: "advanced",
  },

  // Booking sources
  BOOKING_SOURCES: {
    WEBSITE: "website",
    MOBILE_APP: "mobile_app",
    PHONE: "phone",
    WALK_IN: "walk_in",
    TRAVEL_AGENT: "travel_agent",
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Cache TTL (Time To Live) in seconds
  CACHE_TTL: {
    BOOKING_DETAILS: 300, // 5 minutes
    USER_BOOKINGS: 600, // 10 minutes
    AVAILABILITY: 60, // 1 minute
    STATISTICS: 3600, // 1 hour
  },

  // RabbitMQ event types
  RABBITMQ_EVENTS: {
    BOOKING_CREATED: "BOOKING_CREATED",
    BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
    BOOKING_UPDATED: "BOOKING_UPDATED",
    BOOKING_CANCELLED: "BOOKING_CANCELLED",
    BOOKING_COMPLETED: "BOOKING_COMPLETED",
    PAYMENT_PROCESSED: "PAYMENT_PROCESSED",
    PAYMENT_FAILED: "PAYMENT_FAILED",
    LOYALTY_POINTS_EARNED: "LOYALTY_POINTS_EARNED",
    NOTIFICATION_SENT: "NOTIFICATION_SENT",
  },
};
