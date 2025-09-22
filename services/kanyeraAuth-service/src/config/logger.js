// // services/auth-service/src/config/logger.js
// const { Client } = require("@elastic/elasticsearch");
// const client = new Client({ node: "http://elasticsearch:9200" });

// exports.logAuditEvent = async (event) => {
//   await client.index({
//     index: "audit-logs",
//     body: {
//       timestamp: new Date(),
//       ...event,
//     },
//   });
// };


// src/config/logger.js

const winston = require("winston");
const { format, transports } = winston;
const { combine, timestamp, printf } = format;
const { Client } = require("@elastic/elasticsearch");

const esClient = new Client({ node: "http://elasticsearch:9200" });

// Custom Winston Transport for Elasticsearch
class ElasticsearchTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
    this.name = "ElasticsearchTransport";
  }

  log(info, callback) {
    const { level, message, ...meta } = info;

    esClient
      .index({
        index: "logs",
        body: {
          timestamp: new Date(),
          level,
          message,
          meta,
        },
      })
      .then(() => {
        callback();
      })
      .catch((err) => {
        console.error("Elasticsearch log error:", err);
        callback(err);
      });
  }
}

// Custom log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = winston.createLogger({
  level: "debug",
  format: combine(timestamp(), logFormat),
  transports: [new winston.transports.Console(), new ElasticsearchTransport()],
});

// Audit event utility
async function logAuditEvent(event) {
  try {
    await esClient.index({
      index: "audit-logs",
      body: {
        timestamp: new Date(),
        ...event,
      },
    });
  } catch (err) {
    console.error("Audit log error:", err);
    throw err;
  }
}

module.exports = {
  logger,
  logAuditEvent,
};