const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const QRCode = require("../models/QRCode");
const { asyncHandler } = require("../utils/errors");
const { 
  NotFoundError, 
  ValidationError, 
  ConflictError,
  TicketGenerationError 
} = require("../utils/errors");
const { 
  publishToDirect, 
  publishToTopic, 
  publishToHeaders,
  EXCHANGES,
  ROUTING_KEYS 
} = require("../services/rabbitmq");
const logger = require("../utils/logger");
const { TICKET_STATUS, NOTIFICATION_TYPES } = require("../constants");

// Create a new ticket
const createTicket = asyncHandler(async (req, res) => {
  const {
    eventId,
    userId,
    ticketType,
    quantity,
    seatNumbers,
    specialRequests,
    accessibilityRequirements,
    dietaryRestrictions,
    paymentId,
    paymentMethod,
  } = req.body;

  // Validate event exists and has capacity
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  if (!event.isActive || !event.isPublished) {
    throw new ValidationError("Event is not available for ticket purchase");
  }

  // Check ticket type availability
  const ticketTypeConfig = event.ticketTypes.find(type => type.name === ticketType);
  if (!ticketTypeConfig) {
    throw new ValidationError("Invalid ticket type");
  }

  if (ticketTypeConfig.sold + quantity > ticketTypeConfig.quantity) {
    throw new ConflictError("Insufficient tickets available");
  }

  // Calculate pricing
  const unitPrice = ticketTypeConfig.price;
  const totalPrice = unitPrice * quantity;

  // Create ticket
  const ticket = new Ticket({
    eventId,
    userId,
    ticketType,
    quantity,
    unitPrice,
    totalPrice,
    seatNumbers,
    specialRequests,
    accessibilityRequirements,
    dietaryRestrictions,
    paymentId,
    paymentMethod,
    paymentStatus: "completed",
    createdBy: req.user._id,
  });

  await ticket.save();

  // Update event ticket count
  await event.sellTickets(ticketType, quantity);

  // Generate QR code
  const qrCode = new QRCode({
    ticketId: ticket._id,
    eventId,
    userId,
    content: JSON.stringify({
      ticketId: ticket._id.toString(),
      eventId: eventId.toString(),
      userId: userId.toString(),
      ticketNumber: ticket.ticketNumber,
    }),
    createdBy: req.user._id,
  });

  await qrCode.save();

  // Update ticket with QR code reference
  ticket.qrCode = {
    data: qrCode.code,
    format: qrCode.format,
    size: qrCode.size,
    generatedAt: qrCode.generatedAt,
    expiresAt: qrCode.expiresAt,
  };

  await ticket.save();

  // Publish events
  await publishToDirect(EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_CREATED, {
    ticketId: ticket._id,
    eventId,
    userId,
    ticketType,
    price: totalPrice,
    userTier: req.user.loyaltyTier || "standard",
  });

  await publishToTopic(EXCHANGES.ANALYTICS, ROUTING_KEYS.ANALYTICS_TICKET, {
    event: "ticket_created",
    ticketId: ticket._id,
    eventId,
    userId,
    ticketType,
    price: totalPrice,
    timestamp: new Date().toISOString(),
  });

  logger.info("Ticket created successfully", {
    ticketId: ticket._id,
    eventId,
    userId,
    requestId: req.requestId,
  });

  res.status(201).json({
    success: true,
    message: "Ticket created successfully",
    data: {
      ticket: await ticket.populate(["eventId", "userId"]),
      qrCode: qrCode,
    },
    requestId: req.requestId,
  });
});

// Get all tickets with filtering and pagination
const getTickets = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    eventId,
    userId,
    ticketType,
    startDate,
    endDate,
    sortBy = "issuedAt",
    sortOrder = "desc",
  } = req.query;

  const query = {};

  // Apply filters
  if (status) query.status = status;
  if (eventId) query.eventId = eventId;
  if (userId) query.userId = userId;
  if (ticketType) query.ticketType = ticketType;
  if (startDate || endDate) {
    query.issuedAt = {};
    if (startDate) query.issuedAt.$gte = new Date(startDate);
    if (endDate) query.issuedAt.$lte = new Date(endDate);
  }

  // Apply user restrictions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      // Can only see tickets for events they organize
      const userEvents = await Event.find({ organizerId: req.user._id }).select("_id");
      query.eventId = { $in: userEvents.map(e => e._id) };
    } else {
      // Regular users can only see their own tickets
      query.userId = req.user._id;
    }
  }

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100),
    sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
    populate: [
      { path: "eventId", select: "name startDate endDate venue" },
      { path: "userId", select: "name email" },
    ],
  };

  const tickets = await Ticket.paginate(query, options);

  logger.info("Tickets retrieved successfully", {
    count: tickets.docs.length,
    total: tickets.totalDocs,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: tickets,
    requestId: req.requestId,
  });
});

// Get ticket by ID
const getTicketById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ticket = await Ticket.findById(id)
    .populate("eventId", "name startDate endDate venue organizerId")
    .populate("userId", "name email")
    .populate("createdBy", "name email");

  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      if (ticket.eventId.organizerId.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only view tickets for your events");
      }
    } else if (ticket.userId.toString() !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only view your own tickets");
    }
  }

  logger.info("Ticket retrieved successfully", {
    ticketId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: ticket,
    requestId: req.requestId,
  });
});

// Update ticket
const updateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      const event = await Event.findById(ticket.eventId);
      if (event.organizerId.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only update tickets for your events");
      }
    } else if (ticket.userId.toString() !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only update your own tickets");
    }
  }

  // Prevent updates to certain fields
  delete updateData.ticketNumber;
  delete updateData.eventId;
  delete updateData.userId;
  delete updateData.unitPrice;
  delete updateData.totalPrice;
  delete updateData.paymentId;

  // Update ticket
  Object.assign(ticket, updateData, {
    updatedBy: req.user._id,
  });

  await ticket.save();

  // Publish update event
  await publishToDirect(EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_UPDATED, {
    ticketId: ticket._id,
    eventId: ticket.eventId,
    userId: ticket.userId,
    updates: updateData,
  });

  logger.info("Ticket updated successfully", {
    ticketId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Ticket updated successfully",
    data: await ticket.populate(["eventId", "userId"]),
    requestId: req.requestId,
  });
});

// Delete ticket
const deleteTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    throw new ValidationError("Access denied - only administrators can delete tickets");
  }

  // Check if ticket can be deleted
  if (ticket.status === TICKET_STATUS.USED) {
    throw new ValidationError("Cannot delete used tickets");
  }

  // Delete associated QR codes
  await QRCode.deleteMany({ ticketId: id });

  // Update event ticket count if ticket was active
  if (ticket.status === TICKET_STATUS.ACTIVE) {
    const event = await Event.findById(ticket.eventId);
    if (event) {
      await event.refundTickets(ticket.ticketType, ticket.quantity);
    }
  }

  await Ticket.findByIdAndDelete(id);

  // Publish deletion event
  await publishToDirect(EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_CANCELLED, {
    ticketId: id,
    eventId: ticket.eventId,
    userId: ticket.userId,
    reason: "deleted",
  });

  logger.info("Ticket deleted successfully", {
    ticketId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Ticket deleted successfully",
    requestId: req.requestId,
  });
});

// Validate ticket
const validateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { location, deviceInfo } = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Validate ticket
  const validationResult = ticket.validateTicket(req.user._id, location, deviceInfo);

  await ticket.save();

  // Publish validation event
  await publishToDirect(EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_VALIDATED, {
    ticketId: ticket._id,
    eventId: ticket.eventId,
    userId: ticket.userId,
    validationResult,
    scannedBy: req.user._id,
    location,
    deviceInfo,
  });

  logger.info("Ticket validation completed", {
    ticketId: id,
    validationResult,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Ticket validation completed",
    data: {
      ticket: await ticket.populate(["eventId", "userId"]),
      validationResult,
    },
    requestId: req.requestId,
  });
});

// Request ticket transfer
const requestTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { toUserId, reason } = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Check if user owns the ticket
  if (ticket.userId.toString() !== req.user._id.toString()) {
    throw new ValidationError("Access denied - can only transfer your own tickets");
  }

  // Request transfer
  const transfer = ticket.requestTransfer(toUserId, reason);
  await ticket.save();

  // Publish transfer event
  await publishToDirect(EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_TRANSFERRED, {
    ticketId: ticket._id,
    eventId: ticket.eventId,
    fromUserId: req.user._id,
    toUserId,
    reason,
    status: "pending",
  });

  logger.info("Ticket transfer requested", {
    ticketId: id,
    fromUserId: req.user._id,
    toUserId,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Ticket transfer requested successfully",
    data: {
      ticket: await ticket.populate(["eventId", "userId"]),
      transfer,
    },
    requestId: req.requestId,
  });
});

// Approve ticket transfer
const approveTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { transferIndex } = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Check access permissions
  if (!["admin", "super_admin", "event_organizer", "manager"].includes(req.user.role)) {
    throw new ValidationError("Access denied - insufficient permissions");
  }

  // Approve transfer
  const transfer = ticket.approveTransfer(parseInt(transferIndex), req.user._id);
  await ticket.save();

  // Publish transfer approval event
  await publishToDirect(EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_TRANSFERRED, {
    ticketId: ticket._id,
    eventId: ticket.eventId,
    fromUserId: transfer.fromUserId,
    toUserId: transfer.toUserId,
    reason: transfer.reason,
    status: "approved",
    approvedBy: req.user._id,
  });

  logger.info("Ticket transfer approved", {
    ticketId: id,
    transferIndex,
    approvedBy: req.user._id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Ticket transfer approved successfully",
    data: {
      ticket: await ticket.populate(["eventId", "userId"]),
      transfer,
    },
    requestId: req.requestId,
  });
});

// Request refund
const requestRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, amount } = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Check if user owns the ticket
  if (ticket.userId.toString() !== req.user._id.toString()) {
    throw new ValidationError("Access denied - can only request refunds for your own tickets");
  }

  // Request refund
  const refund = ticket.requestRefund(reason, amount);
  await ticket.save();

  // Publish refund event
  await publishToDirect(EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_REFUNDED, {
    ticketId: ticket._id,
    eventId: ticket.eventId,
    userId: ticket.userId,
    reason,
    amount: refund.amount,
    status: "pending",
  });

  logger.info("Ticket refund requested", {
    ticketId: id,
    userId: req.user._id,
    reason,
    amount: refund.amount,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Ticket refund requested successfully",
    data: {
      ticket: await ticket.populate(["eventId", "userId"]),
      refund,
    },
    requestId: req.requestId,
  });
});

// Cancel ticket
const cancelTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      const event = await Event.findById(ticket.eventId);
      if (event.organizerId.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only cancel tickets for your events");
      }
    } else if (ticket.userId.toString() !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only cancel your own tickets");
    }
  }

  // Cancel ticket
  ticket.status = TICKET_STATUS.CANCELLED;
  ticket.cancelledAt = new Date();
  ticket.cancelledBy = req.user._id;
  ticket.cancellationReason = reason;

  await ticket.save();

  // Update event ticket count
  const event = await Event.findById(ticket.eventId);
  if (event && ticket.status === TICKET_STATUS.ACTIVE) {
    await event.refundTickets(ticket.ticketType, ticket.quantity);
  }

  // Publish cancellation event
  await publishToDirect(EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.TICKET_CANCELLED, {
    ticketId: ticket._id,
    eventId: ticket.eventId,
    userId: ticket.userId,
    reason,
    cancelledBy: req.user._id,
  });

  logger.info("Ticket cancelled successfully", {
    ticketId: id,
    reason,
    cancelledBy: req.user._id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Ticket cancelled successfully",
    data: await ticket.populate(["eventId", "userId"]),
    requestId: req.requestId,
  });
});

// Get ticket statistics
const getTicketStats = asyncHandler(async (req, res) => {
  const { eventId, startDate, endDate } = req.query;

  const query = {};

  if (eventId) query.eventId = eventId;
  if (startDate || endDate) {
    query.issuedAt = {};
    if (startDate) query.issuedAt.$gte = new Date(startDate);
    if (endDate) query.issuedAt.$lte = new Date(endDate);
  }

  // Apply user restrictions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      const userEvents = await Event.find({ organizerId: req.user._id }).select("_id");
      query.eventId = { $in: userEvents.map(e => e._id) };
    } else {
      query.userId = req.user._id;
    }
  }

  const stats = await Ticket.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalTickets: { $sum: 1 },
        totalRevenue: { $sum: "$totalPrice" },
        averageTicketPrice: { $avg: "$totalPrice" },
        ticketsByStatus: {
          $push: "$status",
        },
        ticketsByType: {
          $push: "$ticketType",
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalTickets: 1,
        totalRevenue: 1,
        averageTicketPrice: 1,
        statusDistribution: {
          $reduce: {
            input: "$ticketsByStatus",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $literal: {
                    $concat: [
                      "$$this",
                      ": ",
                      { $toString: { $size: { $filter: { input: "$ticketsByStatus", cond: { $eq: ["$$this", "$$this"] } } } } },
                    ],
                  },
                },
              ],
            },
          },
        },
        typeDistribution: {
          $reduce: {
            input: "$ticketsByType",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $literal: {
                    $concat: [
                      "$$this",
                      ": ",
                      { $toString: { $size: { $filter: { input: "$ticketsByType", cond: { $eq: ["$$this", "$$this"] } } } } },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
  ]);

  logger.info("Ticket statistics retrieved successfully", {
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: stats[0] || {
      totalTickets: 0,
      totalRevenue: 0,
      averageTicketPrice: 0,
      statusDistribution: {},
      typeDistribution: {},
    },
    requestId: req.requestId,
  });
});

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  validateTicket,
  requestTransfer,
  approveTransfer,
  requestRefund,
  cancelTicket,
  getTicketStats,
};
