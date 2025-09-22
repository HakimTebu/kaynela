const express = require("express");
const router = express.Router();

// Import controllers
const ticketController = require("../controllers/ticketController");

// Import middleware
const { authMiddleware, requireRole, requireTicketingAccess } = require("../middlewares/auth");
const { 
  ticketGenerationLimiter, 
  ticketValidationLimiter,
  adminLimiter 
} = require("../middlewares/rateLimiter");
const { 
  validateTicketCreation, 
  validateTicketUpdate, 
  validateTicketValidation,
  validateQueryParams 
} = require("../middlewares/validate");
const { 
  logTicketCreation, 
  logTicketUpdate, 
  logTicketDeletion, 
  logTicketValidation,
  logTicketCancellation 
} = require("../middlewares/audit");

// Apply authentication to all routes
router.use(authMiddleware);

// Ticket creation and management
router.post(
  "/",
  ticketGenerationLimiter,
  validateTicketCreation,
  logTicketCreation,
  ticketController.createTicket
);

router.get(
  "/",
  validateQueryParams,
  ticketController.getTickets
);

router.get(
  "/stats",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  ticketController.getTicketStats
);

router.get(
  "/:id",
  ticketController.getTicketById
);

router.put(
  "/:id",
  validateTicketUpdate,
  logTicketUpdate,
  ticketController.updateTicket
);

router.delete(
  "/:id",
  requireRole("admin", "super_admin"),
  adminLimiter,
  logTicketDeletion,
  ticketController.deleteTicket
);

// Ticket validation
router.post(
  "/:id/validate",
  ticketValidationLimiter,
  validateTicketValidation,
  logTicketValidation,
  ticketController.validateTicket
);

// Ticket transfer operations
router.post(
  "/:id/transfer",
  ticketController.requestTransfer
);

router.post(
  "/:id/transfer/approve",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  ticketController.approveTransfer
);

// Ticket refund operations
router.post(
  "/:id/refund",
  ticketController.requestRefund
);

// Ticket cancellation
router.post(
  "/:id/cancel",
  logTicketCancellation,
  ticketController.cancelTicket
);

module.exports = router;
