const express = require("express");
const router = express.Router();

// Import controllers
const qrCodeController = require("../controllers/qrCodeController");

// Import middleware
const { authMiddleware, requireRole } = require("../middlewares/auth");
const { 
  qrCodeGenerationLimiter, 
  adminLimiter 
} = require("../middlewares/rateLimiter");
const { 
  validateQRCodeGeneration, 
  validateQueryParams 
} = require("../middlewares/validate");
const { 
  logQRCodeGeneration, 
  logQRCodeValidation 
} = require("../middlewares/audit");

// Apply authentication to all routes
router.use(authMiddleware);

// QR code generation and management
router.post(
  "/",
  qrCodeGenerationLimiter,
  validateQRCodeGeneration,
  logQRCodeGeneration,
  qrCodeController.generateQRCode
);

router.get(
  "/stats",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  qrCodeController.getQRCodeStats
);

router.get(
  "/:id",
  qrCodeController.getQRCodeById
);

router.put(
  "/:id",
  qrCodeController.updateQRCode
);

router.delete(
  "/:id",
  requireRole("admin", "super_admin"),
  adminLimiter,
  qrCodeController.deleteQRCode
);

// QR code operations
router.post(
  "/:id/regenerate",
  qrCodeController.regenerateQRCode
);

router.post(
  "/:id/extend-expiry",
  qrCodeController.extendQRCodeExpiry
);

// QR code validation
router.post(
  "/validate",
  logQRCodeValidation,
  qrCodeController.validateQRCode
);

// QR code retrieval by relationships
router.get(
  "/ticket/:ticketId",
  qrCodeController.getQRCodesByTicket
);

router.get(
  "/event/:eventId",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  qrCodeController.getQRCodesByEvent
);

router.get(
  "/user/:userId",
  qrCodeController.getQRCodesByUser
);

module.exports = router;
