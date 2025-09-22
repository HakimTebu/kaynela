const redis = require("redis");
const logger = require("../utils/logger");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const client = redis.createClient({
  url: redisUrl,
  socket: {
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
    lazyConnect: true,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error("❌ Redis max reconnection attempts reached");
        return new Error("Redis max reconnection attempts reached");
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

// Event handlers
client.on("error", (err) => {
  logger.error("Redis Client Error:", err);
});

client.on("connect", () => {
  logger.info("✅ Redis client connected");
});

client.on("ready", () => {
  logger.info("✅ Redis client ready");
});

client.on("end", () => {
  logger.warn("Redis client connection ended");
});

client.on("reconnecting", () => {
  logger.info("🔄 Redis client reconnecting...");
});

module.exports = { client };
