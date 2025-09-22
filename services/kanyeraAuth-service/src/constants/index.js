
module.exports = {
  roles: {
    CUSTOMER: "customer",
    RESTAURANT_STAFF: "restaurant_staff",
    DELIVERY_AGENT: "delivery_agent",
    ADMIN: "admin",
  },
  jwt: {
    ACCESS_EXPIRES: "15m",
    REFRESH_EXPIRES: "7d",
  },
  accountLock: {
    MAX_ATTEMPTS: 5,
    LOCK_TIME: 30 * 60 * 1000, // 30 minutes
  },
};
