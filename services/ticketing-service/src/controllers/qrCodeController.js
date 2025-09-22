const QRCode = require("../models/QRCode");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const { asyncHandler } = require("../utils/errors");
const { 
  NotFoundError, 
  ValidationError, 
  QRCodeGenerationError 
} = require("../utils/errors");
const { 
  publishToDirect, 
  publishToTopic, 
  publishToHeaders,
  EXCHANGES,
  ROUTING_KEYS 
} = require("../services/rabbitmq");
const logger = require("../utils/logger");
const QRCodeGenerator = require("../services/qrCodeGenerator");

// Generate QR code for ticket
const generateQRCode = asyncHandler(async (req, res) => {
  const {
    ticketId,
    format = "png",
    size = 300,
    includeLogo = false,
    customStyling = {},
  } = req.body;

  // Validate ticket exists
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (ticket.userId.toString() !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only generate QR codes for your own tickets");
    }
  }

  // Check if QR code already exists
  const existingQRCode = await QRCode.findOne({ ticketId });
  if (existingQRCode) {
    throw new ValidationError("QR code already exists for this ticket");
  }

  // Generate QR code content
  const qrContent = JSON.stringify({
    ticketId: ticket._id.toString(),
    eventId: ticket.eventId.toString(),
    userId: ticket.userId.toString(),
    ticketNumber: ticket.ticketNumber,
    timestamp: new Date().toISOString(),
  });

  // Create QR code record
  const qrCode = new QRCode({
    ticketId,
    eventId: ticket.eventId,
    userId: ticket.userId,
    content: qrContent,
    format,
    size,
    styling: {
      ...customStyling,
      logo: includeLogo ? {
        url: process.env.COMPANY_LOGO_URL || "https://example.com/logo.png",
        width: Math.floor(size * 0.2),
        height: Math.floor(size * 0.2),
        opacity: 0.8,
      } : undefined,
    },
    createdBy: req.user._id,
  });

  await qrCode.save();

  // Generate actual QR code image
  try {
    const qrImageBuffer = await QRCodeGenerator.generateQRCode(qrContent, {
      format,
      size,
      styling: qrCode.styling,
    });

    // Store image data
    qrCode.imageData = {
      data: qrImageBuffer,
      contentType: `image/${format}`,
      width: size,
      height: size,
    };

    await qrCode.save();
  } catch (error) {
    logger.error("Failed to generate QR code image:", error);
    throw new QRCodeGenerationError("Failed to generate QR code image", error.message);
  }

  // Update ticket with QR code reference
  ticket.qrCode = {
    data: qrCode.code,
    format: qrCode.format,
    size: qrCode.size,
    generatedAt: qrCode.generatedAt,
    expiresAt: qrCode.expiresAt,
  };

  await ticket.save();

  // Publish QR code generation event
  await publishToDirect(EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.QR_CODE_GENERATED, {
    qrCodeId: qrCode._id,
    ticketId: ticket._id,
    eventId: ticket.eventId,
    userId: ticket.userId,
    format,
    size,
  });

  await publishToTopic(EXCHANGES.ANALYTICS, ROUTING_KEYS.ANALYTICS_TICKET, {
    event: "qr_code_generated",
    qrCodeId: qrCode._id,
    ticketId: ticket._id,
    format,
    size,
    timestamp: new Date().toISOString(),
  });

  logger.info("QR code generated successfully", {
    qrCodeId: qrCode._id,
    ticketId,
    format,
    size,
    requestId: req.requestId,
  });

  res.status(201).json({
    success: true,
    message: "QR code generated successfully",
    data: {
      qrCode,
      ticket: await ticket.populate(["eventId", "userId"]),
    },
    requestId: req.requestId,
  });
});

// Get QR code by ID
const getQRCodeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const qrCode = await QRCode.findById(id)
    .populate("ticketId", "ticketNumber status")
    .populate("eventId", "name startDate endDate venue")
    .populate("userId", "name email");

  if (!qrCode) {
    throw new NotFoundError("QR code not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (qrCode.userId.toString() !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only view your own QR codes");
    }
  }

  logger.info("QR code retrieved successfully", {
    qrCodeId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: qrCode,
    requestId: req.requestId,
  });
});

// Update QR code
const updateQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const qrCode = await QRCode.findById(id);
  if (!qrCode) {
    throw new NotFoundError("QR code not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (qrCode.userId.toString() !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only update your own QR codes");
    }
  }

  // Prevent updates to certain fields
  delete updateData.code;
  delete updateData.ticketId;
  delete updateData.eventId;
  delete updateData.userId;
  delete updateData.content;
  delete updateData.security;

  // Update QR code
  Object.assign(qrCode, updateData, {
    updatedBy: req.user._id,
  });

  await qrCode.save();

  logger.info("QR code updated successfully", {
    qrCodeId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "QR code updated successfully",
    data: qrCode,
    requestId: req.requestId,
  });
});

// Delete QR code
const deleteQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const qrCode = await QRCode.findById(id);
  if (!qrCode) {
    throw new NotFoundError("QR code not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    throw new ValidationError("Access denied - only administrators can delete QR codes");
  }

  // Check if QR code can be deleted
  if (qrCode.usageCount > 0) {
    throw new ValidationError("Cannot delete QR code that has been used");
  }

  await QRCode.findByIdAndDelete(id);

  // Update ticket to remove QR code reference
  const ticket = await Ticket.findById(qrCode.ticketId);
  if (ticket && ticket.qrCode) {
    ticket.qrCode = undefined;
    await ticket.save();
  }

  logger.info("QR code deleted successfully", {
    qrCodeId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "QR code deleted successfully",
    requestId: req.requestId,
  });
});

// Regenerate QR code
const regenerateQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newSize, newFormat } = req.body;

  const qrCode = await QRCode.findById(id);
  if (!qrCode) {
    throw new NotFoundError("QR code not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (qrCode.userId.toString() !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only regenerate your own QR codes");
    }
  }

  // Regenerate QR code
  await qrCode.regenerate(newSize, newFormat);

  // Generate new image if size or format changed
  if (newSize || newFormat) {
    try {
      const qrImageBuffer = await QRCodeGenerator.generateQRCode(qrCode.content, {
        format: qrCode.format,
        size: qrCode.size,
        styling: qrCode.styling,
      });

      // Update image data
      qrCode.imageData = {
        data: qrImageBuffer,
        contentType: `image/${qrCode.format}`,
        width: qrCode.size,
        height: qrCode.size,
      };

      await qrCode.save();
    } catch (error) {
      logger.error("Failed to regenerate QR code image:", error);
      throw new QRCodeGenerationError("Failed to regenerate QR code image", error.message);
    }
  }

  logger.info("QR code regenerated successfully", {
    qrCodeId: id,
    newSize,
    newFormat,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "QR code regenerated successfully",
    data: qrCode,
    requestId: req.requestId,
  });
});

// Validate QR code
const validateQRCode = asyncHandler(async (req, res) => {
  const { qrCodeData, location, deviceInfo } = req.body;

  if (!qrCodeData) {
    throw new ValidationError("QR code data is required");
  }

  // Find QR code by content or code
  const qrCode = await QRCode.findOne({
    $or: [
      { content: qrCodeData },
      { code: qrCodeData },
    ],
  });

  if (!qrCode) {
    throw new NotFoundError("QR code not found");
  }

  // Validate QR code
  const validationResult = qrCode.scan(req.user._id, location, deviceInfo);
  await qrCode.save();

  // Update ticket status if validation was successful
  if (validationResult.valid) {
    const ticket = await Ticket.findById(qrCode.ticketId);
    if (ticket) {
      ticket.status = "used";
      ticket.checkedInAt = new Date();
      ticket.attended = true;
      await ticket.save();
    }
  }

  // Publish validation event
  await publishToDirect(EXCHANGES.TICKET_EVENTS, ROUTING_KEYS.QR_CODE_VALIDATED, {
    qrCodeId: qrCode._id,
    ticketId: qrCode.ticketId,
    eventId: qrCode.eventId,
    userId: qrCode.userId,
    validationResult,
    scannedBy: req.user._id,
    location,
    deviceInfo,
  });

  await publishToTopic(EXCHANGES.ANALYTICS, ROUTING_KEYS.ANALYTICS_TICKET, {
    event: "qr_code_validated",
    qrCodeId: qrCode._id,
    ticketId: qrCode.ticketId,
    validationResult,
    timestamp: new Date().toISOString(),
  });

  logger.info("QR code validation completed", {
    qrCodeId: qrCode._id,
    validationResult,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "QR code validation completed",
    data: {
      qrCode: await qrCode.populate(["ticketId", "eventId", "userId"]),
      validationResult,
    },
    requestId: req.requestId,
  });
});

// Get QR codes by ticket
const getQRCodesByTicket = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;

  // Validate ticket exists
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (ticket.userId.toString() !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only view QR codes for your own tickets");
    }
  }

  const qrCodes = await QRCode.findByTicket(ticketId);

  logger.info("QR codes retrieved for ticket", {
    ticketId,
    count: qrCodes.length,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: qrCodes,
    requestId: req.requestId,
  });
});

// Get QR codes by event
const getQRCodesByEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  // Validate event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (event.organizerId.toString() !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only view QR codes for your own events");
    }
  }

  const qrCodes = await QRCode.findByEvent(eventId);

  logger.info("QR codes retrieved for event", {
    eventId,
    count: qrCodes.length,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: qrCodes,
    requestId: req.requestId,
  });
});

// Get QR codes by user
const getQRCodesByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (userId !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only view your own QR codes");
    }
  }

  const qrCodes = await QRCode.findByUser(userId);

  logger.info("QR codes retrieved for user", {
    userId,
    count: qrCodes.length,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: qrCodes,
    requestId: req.requestId,
  });
});

// Get QR code statistics
const getQRCodeStats = asyncHandler(async (req, res) => {
  const { eventId, startDate, endDate } = req.query;

  const query = {};

  if (eventId) query.eventId = eventId;
  if (startDate || endDate) {
    query.generatedAt = {};
    if (startDate) query.generatedAt.$gte = new Date(startDate);
    if (endDate) query.generatedAt.$lte = new Date(endDate);
  }

  // Apply user restrictions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    query.userId = req.user._id;
  }

  const stats = await QRCode.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalQRCodes: { $sum: 1 },
        totalUsage: { $sum: "$usageCount" },
        totalViews: { $sum: "$analytics.views" },
        totalScans: { $sum: "$analytics.scans" },
        totalDownloads: { $sum: "$analytics.downloads" },
        totalShares: { $sum: "$analytics.shares" },
        qrCodesByFormat: { $push: "$format" },
        qrCodesBySize: { $push: "$size" },
      },
    },
    {
      $project: {
        _id: 0,
        totalQRCodes: 1,
        totalUsage: 1,
        totalViews: 1,
        totalScans: 1,
        totalDownloads: 1,
        totalShares: 1,
        formatDistribution: {
          $reduce: {
            input: "$qrCodesByFormat",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $literal: {
                    $concat: [
                      "$$this",
                      ": ",
                      { $toString: { $size: { $filter: { input: "$qrCodesByFormat", cond: { $eq: ["$$this", "$$this"] } } } } },
                    ],
                  },
                },
              ],
            },
          },
        },
        sizeDistribution: {
          $reduce: {
            input: "$qrCodesBySize",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $literal: {
                    $concat: [
                      "$$this",
                      ": ",
                      { $toString: { $size: { $filter: { input: "$qrCodesBySize", cond: { $eq: ["$$this", "$$this"] } } } } },
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

  logger.info("QR code statistics retrieved successfully", {
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: stats[0] || {
      totalQRCodes: 0,
      totalUsage: 0,
      totalViews: 0,
      totalScans: 0,
      totalDownloads: 0,
      totalShares: 0,
      formatDistribution: {},
      sizeDistribution: {},
    },
    requestId: req.requestId,
  });
});

// Extend QR code expiry
const extendQRCodeExpiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { days } = req.body;

  if (!days || days <= 0) {
    throw new ValidationError("Days must be a positive number");
  }

  const qrCode = await QRCode.findById(id);
  if (!qrCode) {
    throw new NotFoundError("QR code not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (qrCode.userId.toString() !== req.user._id.toString()) {
      throw new ValidationError("Access denied - can only extend expiry for your own QR codes");
    }
  }

  // Extend expiry
  await qrCode.extendExpiry(days);

  logger.info("QR code expiry extended", {
    qrCodeId: id,
    days,
    newExpiry: qrCode.expiresAt,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "QR code expiry extended successfully",
    data: qrCode,
    requestId: req.requestId,
  });
});

module.exports = {
  generateQRCode,
  getQRCodeById,
  updateQRCode,
  deleteQRCode,
  regenerateQRCode,
  validateQRCode,
  getQRCodesByTicket,
  getQRCodesByEvent,
  getQRCodesByUser,
  getQRCodeStats,
  extendQRCodeExpiry,
};
