const redis = require("redis");
const logger = require("../utils/logger");

const client = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    connectTimeout: 10000,
    lazyConnect: true,
  },
  retry_strategy: (options) => {
    if (options.error && options.error.code === "ECONNREFUSED") {
      logger.error("❌ Redis server refused connection");
      return new Error("Redis server refused connection");
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error("❌ Redis retry time exhausted");
      return new Error("Retry time exhausted");
    }
    if (options.attempt > 10) {
      logger.error("❌ Redis max retry attempts reached");
      return new Error("Max retry attempts reached");
    }
    return Math.min(options.attempt * 100, 3000);
  },
});

client.on("error", (err) => {
  logger.error("❌ Redis client error:", err);
});

client.on("connect", () => {
  logger.info("🔌 Redis client connecting...");
});

client.on("ready", () => {
  logger.info("✅ Redis client ready");
});

client.on("end", () => {
  logger.info("🔌 Redis client disconnected");
});

module.exports = { client };
