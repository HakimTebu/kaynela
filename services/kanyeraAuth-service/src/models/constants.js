module.exports = {
  roles: {
    CUSTOMER: "customer",
    FARM_STAFF: "farm_staff",
    TOUR_GUIDE: "tour_guide",
    ACTIVITY_INSTRUCTOR: "activity_instructor",
    LODGING_MANAGER: "lodging_manager",
    EVENT_COORDINATOR: "event_coordinator",
    ADMIN: "admin",
    SUPER_ADMIN: "super_admin",
  },
  jwt: {
    ACCESS_EXPIRES: "15m",
    REFRESH_EXPIRES: "7d",
  },
  accountLock: {
    MAX_ATTEMPTS: 5,
    LOCK_TIME: 30 * 60 * 1000, // 30 minutes
  },
  loyalty: {
    TIERS: {
      BRONZE: "bronze",
      SILVER: "silver",
      GOLD: "gold",
      PLATINUM: "platinum",
      DIAMOND: "diamond",
    },
    POINTS_MULTIPLIERS: {
      BRONZE: 1.0,
      SILVER: 1.1,
      GOLD: 1.2,
      PLATINUM: 1.3,
      DIAMOND: 1.5,
    },
  },
  agritourism: {
    ACTIVITIES: [
      "farm_tours",
      "animal_feeding",
      "crop_picking",
      "cooking_classes",
      "wine_tasting",
      "horse_riding",
      "fishing",
      "hiking",
      "camping",
    ],
    LODGING_TYPES: [
      "farmhouse",
      "cottage",
      "glamping",
      "camping",
      "guesthouse",
    ],
    DIETARY_RESTRICTIONS: [
      "vegetarian",
      "vegan",
      "gluten_free",
      "dairy_free",
      "nut_free",
      "halal",
      "kosher",
    ],
  },
};
