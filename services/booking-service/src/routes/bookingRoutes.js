const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const {
  authMiddleware,
  requireRole,
  requireBookingAccess,
} = require("../middlewares/auth");
const {
  validateCreateBooking,
  validateUpdateBooking,
  validateCancelBooking,
  validateQueryParams,
} = require("../middlewares/validate");
const { logAction } = require("../middlewares/audit");
const {
  apiLimiter,
  bookingCreationLimiter,
} = require("../middlewares/rateLimiter");

// Apply authentication to all routes
router.use(authMiddleware);

// Create a new booking
router.post(
  "/",
  bookingCreationLimiter,
  validateCreateBooking,
  logAction("create", "booking"),
  bookingController.createBooking
);

// Get all bookings with pagination and filters
router.get(
  "/",
  validateQueryParams,
  logAction("read", "bookings"),
  bookingController.getBookings
);

// Get booking statistics
router.get(
  "/stats",
  logAction("read", "booking_statistics"),
  bookingController.getBookingStats
);

// Get a single booking by ID
router.get(
  "/:id",
  requireBookingAccess(),
  logAction("read", "booking"),
  bookingController.getBooking
);

// Update a booking
router.put(
  "/:id",
  requireBookingAccess(),
  validateUpdateBooking,
  logAction("update", "booking"),
  bookingController.updateBooking
);

// Cancel a booking
router.post(
  "/:id/cancel",
  requireBookingAccess(),
  validateCancelBooking,
  logAction("cancel", "booking"),
  bookingController.cancelBooking
);

// Confirm a booking (admin only)
router.post(
  "/:id/confirm",
  requireRole("admin", "super_admin"),
  logAction("confirm", "booking"),
  bookingController.confirmBooking
);

// Complete a booking (admin only)
router.post(
  "/:id/complete",
  requireRole("admin", "super_admin"),
  logAction("complete", "booking"),
  bookingController.completeBooking
);

// Delete a booking (admin only)
router.delete(
  "/:id",
  requireRole("admin", "super_admin"),
  logAction("delete", "booking"),
  bookingController.deleteBooking
);

module.exports = router;
