const express = require("express");
const router = express.Router();

// Import route modules
const ticketRoutes = require("./ticketRoutes");
const eventRoutes = require("./eventRoutes");
const qrCodeRoutes = require("./qrCodeRoutes");
const validationRoutes = require("./validationRoutes");
const analyticsRoutes = require("./analyticsRoutes");

// Mount routes
router.use("/tickets", ticketRoutes);
router.use("/events", eventRoutes);
router.use("/qr-codes", qrCodeRoutes);
router.use("/validation", validationRoutes);
router.use("/analytics", analyticsRoutes);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Kaynela Farms Ticketing Service is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    requestId: req.requestId,
  });
});

// API documentation endpoint
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Kaynela Farms Ticketing Service API",
    version: "1.0.0",
    documentation: "/docs",
    endpoints: {
      tickets: "/api/tickets",
      events: "/api/events",
      qrCodes: "/api/qr-codes",
      validation: "/api/validation",
      analytics: "/api/analytics",
      health: "/api/health",
    },
    requestId: req.requestId,
  });
});

// 404 handler for undefined routes
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    message: `The requested route ${req.originalUrl} does not exist`,
    availableEndpoints: [
      "/api/tickets",
      "/api/events",
      "/api/qr-codes",
      "/api/validation",
      "/api/analytics",
      "/api/health",
    ],
    requestId: req.requestId,
  });
});

module.exports = router;
