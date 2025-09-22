// src/utils/logger.js
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

const { format, transports } = winston;
const { combine, timestamp, printf, label } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, label }) => {
  return `${timestamp} [${label}] ${level.toUpperCase()}: ${message}`;
});

// File transport config
const fileTransport = new DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
});

// Create logger
const logger = winston.createLogger({
  level: "debug",
  format: combine(label({ label: "auth-service" }), timestamp(), logFormat),
  transports: [
    new transports.Console(), // Log to console
    fileTransport, // Also log to file
  ],
  exceptionHandlers: [new transports.Console(), fileTransport],
  rejectionHandlers: [new transports.Console(), fileTransport],
});

module.exports = logger;

// // src/utils/logger.js
// const { createLogger, format, transports } = require('winston');

// const logger = createLogger({
//   level: 'debug',
//   format: format.combine(
//     format.timestamp(),
//     format.printf(({ level, message, timestamp }) => {
//       return `${timestamp} [${level}]: ${message}`;
//     })
//   ),
//   transports: [new transports.Console()]
// });

// module.exports = logger;
