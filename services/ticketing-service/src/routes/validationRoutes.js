const express = require("express");
const router = express.Router();

// Import controllers
const ticketController = require("../controllers/ticketController");
const qrCodeController = require("../controllers/qrCodeController");

// Import middleware
const { authMiddleware, requireRole } = require("../middlewares/auth");
const { ticketValidationLimiter } = require("../middlewares/rateLimiter");
const { logTicketValidation, logQRCodeValidation } = require("../middlewares/audit");

// Apply authentication to all routes
router.use(authMiddleware);

// Ticket validation
router.post(
  "/ticket/:id",
  ticketValidationLimiter,
  logTicketValidation,
  ticketController.validateTicket
);

// QR code validation
router.post(
  "/qr-code",
  ticketValidationLimiter,
  logQRCodeValidation,
  qrCodeController.validateQRCode
);

// Bulk validation (for staff/administrators)
router.post(
  "/bulk",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  ticketValidationLimiter,
  async (req, res) => {
    const { tickets } = req.body;
    
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Tickets array is required",
        requestId: req.requestId,
      });
    }

    if (tickets.length > 10) {
      return res.status(400).json({
        success: false,
        error: "Maximum 10 tickets can be validated at once",
        requestId: req.requestId,
      });
    }

    const results = [];
    
    for (const ticketData of tickets) {
      try {
        const { ticketId, location, deviceInfo } = ticketData;
        
        // Find ticket
        const ticket = await require("../models/Ticket").findById(ticketId);
        if (!ticket) {
          results.push({
            ticketId,
            success: false,
            error: "Ticket not found",
          });
          continue;
        }

        // Validate ticket
        const validationResult = ticket.validateTicket(req.user._id, location, deviceInfo);
        await ticket.save();

        results.push({
          ticketId,
          success: true,
          validationResult,
        });
      } catch (error) {
        results.push({
          ticketId: ticketData.ticketId,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: "Bulk validation completed",
      data: results,
      requestId: req.requestId,
    });
  }
);

// Get validation history
router.get(
  "/history",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  async (req, res) => {
    const { page = 1, limit = 20, startDate, endDate, eventId } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (eventId) query.eventId = eventId;

    // Apply user restrictions
    if (!["admin", "super_admin"].includes(req.user.role)) {
      if (["event_organizer", "manager"].includes(req.user.role)) {
        const userEvents = await require("../models/Event").find({ organizerId: req.user._id }).select("_id");
        query.eventId = { $in: userEvents.map(e => e._id) };
      }
    }

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      sort: { createdAt: -1 },
      populate: [
        { path: "eventId", select: "name startDate endDate venue" },
        { path: "userId", select: "name email" },
        { path: "scannedBy", select: "name email" },
      ],
    };

    const Ticket = require("../models/Ticket");
    const validationHistory = await Ticket.aggregate([
      { $match: query },
      { $unwind: "$validationHistory" },
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "eventId",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "validationHistory.scannedBy",
          foreignField: "_id",
          as: "scannedBy",
        },
      },
      {
        $project: {
          ticketId: "$_id",
          ticketNumber: "$ticketNumber",
          eventId: { $arrayElemAt: ["$eventId", 0] },
          userId: { $arrayElemAt: ["$userId", 0] },
          scannedBy: { $arrayElemAt: ["$scannedBy", 0] },
          validation: "$validationHistory",
        },
      },
      { $sort: { "validation.scannedAt": -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
    ]);

    const total = await Ticket.aggregate([
      { $match: query },
      { $unwind: "$validationHistory" },
      { $count: "total" },
    ]);

    res.json({
      success: true,
      data: {
        history: validationHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0]?.total || 0,
          pages: Math.ceil((total[0]?.total || 0) / parseInt(limit)),
        },
      },
      requestId: req.requestId,
    });
  }
);

module.exports = router;
