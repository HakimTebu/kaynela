// services/auth-service/src/config/redis.js
const redis = require("redis");
const { promisify } = require("util");

const client = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    tls: process.env.NODE_ENV === "production",
    rejectUnauthorized: false,
  },
  password: process.env.REDIS_PASSWORD, // Optional if in URL
});

client.on("error", (err) => console.error("Redis error:", err));
client.on("connect", () => console.log("Redis connected"));
client.on("ready", () => console.log("Redis ready"));
client.on("end", () => console.log("Redis disconnected"));

module.exports = { client };
