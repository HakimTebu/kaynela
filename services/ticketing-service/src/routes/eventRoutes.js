const express = require("express");
const router = express.Router();

// Import controllers
const eventController = require("../controllers/eventController");

// Import middleware
const { authMiddleware, requireRole } = require("../middlewares/auth");
const { 
  eventCreationLimiter, 
  adminLimiter 
} = require("../middlewares/rateLimiter");
const { 
  validateEventCreation, 
  validateEventUpdate, 
  validateEventSearch,
  validateQueryParams 
} = require("../middlewares/validate");
const { 
  logEventCreation, 
  logEventUpdate, 
  logEventDeletion, 
  logEventActivation,
  logEventDeactivation 
} = require("../middlewares/audit");

// Public routes (no authentication required)
router.get("/upcoming", eventController.getUpcomingEvents);
router.get("/search", validateEventSearch, eventController.searchEvents);

// Protected routes (authentication required)
router.use(authMiddleware);

// Event creation and management
router.post(
  "/",
  eventCreationLimiter,
  requireRole("admin", "super_admin", "event_organizer"),
  validateEventCreation,
  logEventCreation,
  eventController.createEvent
);

router.get(
  "/",
  validateQueryParams,
  eventController.getEvents
);

router.get(
  "/stats",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  eventController.getEventStats
);

router.get(
  "/:id",
  eventController.getEventById
);

router.put(
  "/:id",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  validateEventUpdate,
  logEventUpdate,
  eventController.updateEvent
);

router.delete(
  "/:id",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  adminLimiter,
  logEventDeletion,
  eventController.deleteEvent
);

// Event lifecycle management
router.post(
  "/:id/publish",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  logEventCreation,
  eventController.publishEvent
);

router.post(
  "/:id/unpublish",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  eventController.unpublishEvent
);

router.post(
  "/:id/activate",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  logEventActivation,
  eventController.activateEvent
);

router.post(
  "/:id/deactivate",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  logEventDeactivation,
  eventController.deactivateEvent
);

router.post(
  "/:id/cancel",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  eventController.cancelEvent
);

module.exports = router;
