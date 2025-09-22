const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { asyncHandler } = require("../utils/errors");
const { 
  NotFoundError, 
  ValidationError, 
  ConflictError,
  EventValidationError 
} = require("../utils/errors");
const { 
  publishToDirect, 
  publishToTopic, 
  publishToFanout,
  EXCHANGES,
  ROUTING_KEYS 
} = require("../services/rabbitmq");
const logger = require("../utils/logger");
const { EVENT_STATUS, NOTIFICATION_TYPES } = require("../constants");

// Create a new event
const createEvent = asyncHandler(async (req, res) => {
  const eventData = req.body;
  eventData.organizerId = req.user._id;
  eventData.createdBy = req.user._id;

  // Validate event data
  if (eventData.startDate && eventData.endDate) {
    if (new Date(eventData.startDate) >= new Date(eventData.endDate)) {
      throw new EventValidationError("End date must be after start date");
    }
  }

  // Check if user can create events
  if (!["admin", "super_admin", "event_organizer"].includes(req.user.role)) {
    throw new ValidationError("Access denied - insufficient permissions to create events");
  }

  // Create event
  const event = new Event(eventData);
  await event.save();

  // Publish event creation
  await publishToDirect(EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_CREATED, {
    eventId: event._id,
    organizerId: req.user._id,
    name: event.name,
    eventType: event.eventType,
    capacity: event.venue.capacity,
    startDate: event.startDate,
    endDate: event.endDate,
  });

  await publishToTopic(EXCHANGES.ANALYTICS, ROUTING_KEYS.ANALYTICS_EVENT, {
    event: "event_created",
    eventId: event._id,
    organizerId: req.user._id,
    eventType: event.eventType,
    capacity: event.venue.capacity,
    timestamp: new Date().toISOString(),
  });

  logger.info("Event created successfully", {
    eventId: event._id,
    organizerId: req.user._id,
    requestId: req.requestId,
  });

  res.status(201).json({
    success: true,
    message: "Event created successfully",
    data: event,
    requestId: req.requestId,
  });
});

// Get all events with filtering and pagination
const getEvents = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    eventType,
    category,
    startDate,
    endDate,
    organizerId,
    isPublished,
    isActive,
    sortBy = "startDate",
    sortOrder = "asc",
  } = req.query;

  const query = {};

  // Apply filters
  if (status) query.status = status;
  if (eventType) query.eventType = eventType;
  if (category) query.category = category;
  if (organizerId) query.organizerId = organizerId;
  if (isPublished !== undefined) query.isPublished = isPublished === "true";
  if (isActive !== undefined) query.isActive = isActive === "true";
  
  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  // Apply user restrictions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      // Can only see events they organize
      query.organizerId = req.user._id;
    } else {
      // Regular users can only see published and active events
      query.isPublished = true;
      query.isActive = true;
      query.status = { $in: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.ACTIVE, EVENT_STATUS.UPCOMING] };
    }
  }

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100),
    sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
    populate: [
      { path: "organizerId", select: "name email" },
      { path: "createdBy", select: "name email" },
    ],
  };

  const events = await Event.paginate(query, options);

  logger.info("Events retrieved successfully", {
    count: events.docs.length,
    total: events.totalDocs,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: events,
    requestId: req.requestId,
  });
});

// Get event by ID
const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id)
    .populate("organizerId", "name email")
    .populate("createdBy", "name email")
    .populate("staff.userId", "name email")
    .populate("volunteers.userId", "name email");

  if (!event) {
    throw new NotFoundError("Event not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      if (event.organizerId._id.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only view your own events");
      }
    } else if (!event.isPublished || !event.isActive) {
      throw new ValidationError("Access denied - event is not publicly available");
    }
  }

  logger.info("Event retrieved successfully", {
    eventId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: event,
    requestId: req.requestId,
  });
});

// Update event
const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const event = await Event.findById(id);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      if (event.organizerId.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only update your own events");
      }
    } else {
      throw new ValidationError("Access denied - insufficient permissions");
    }
  }

  // Prevent updates to certain fields
  delete updateData.organizerId;
  delete updateData.createdBy;
  delete updateData.analytics;

  // Update event
  Object.assign(event, updateData, {
    updatedBy: req.user._id,
  });

  await event.save();

  // Publish update event
  await publishToDirect(EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_UPDATED, {
    eventId: event._id,
    organizerId: event.organizerId,
    updates: updateData,
  });

  logger.info("Event updated successfully", {
    eventId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Event updated successfully",
    data: event,
    requestId: req.requestId,
  });
});

// Delete event
const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      if (event.organizerId.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only delete your own events");
      }
    } else {
      throw new ValidationError("Access denied - insufficient permissions");
    }
  }

  // Check if event can be deleted
  if (event.status === EVENT_STATUS.ACTIVE || event.status === EVENT_STATUS.ONGOING) {
    throw new ValidationError("Cannot delete active or ongoing events");
  }

  // Check if there are active tickets
  const activeTickets = await Ticket.countDocuments({
    eventId: id,
    status: { $in: ["active", "reserved"] },
  });

  if (activeTickets > 0) {
    throw new ValidationError("Cannot delete event with active tickets");
  }

  await Event.findByIdAndDelete(id);

  // Publish deletion event
  await publishToDirect(EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_CANCELLED, {
    eventId: id,
    organizerId: event.organizerId,
    reason: "deleted",
  });

  logger.info("Event deleted successfully", {
    eventId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Event deleted successfully",
    requestId: req.requestId,
  });
});

// Publish event
const publishEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      if (event.organizerId.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only publish your own events");
      }
    } else {
      throw new ValidationError("Access denied - insufficient permissions");
    }
  }

  // Publish event
  await event.publish();

  // Publish event activation
  await publishToDirect(EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_ACTIVATED, {
    eventId: event._id,
    organizerId: event.organizerId,
    name: event.name,
  });

  await publishToFanout(EXCHANGES.NOTIFICATIONS, {
    type: NOTIFICATION_TYPES.EVENT_CREATED,
    eventId: event._id,
    organizerId: event.organizerId,
    eventName: event.name,
    timestamp: new Date().toISOString(),
  });

  logger.info("Event published successfully", {
    eventId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Event published successfully",
    data: event,
    requestId: req.requestId,
  });
});

// Unpublish event
const unpublishEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      if (event.organizerId.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only unpublish your own events");
      }
    } else {
      throw new ValidationError("Access denied - insufficient permissions");
    }
  }

  // Unpublish event
  await event.unpublish();

  // Publish event deactivation
  await publishToDirect(EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_DEACTIVATED, {
    eventId: event._id,
    organizerId: event.organizerId,
    name: event.name,
  });

  logger.info("Event unpublished successfully", {
    eventId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Event unpublished successfully",
    data: event,
    requestId: req.requestId,
  });
});

// Activate event
const activateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      if (event.organizerId.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only activate your own events");
      }
    } else {
      throw new ValidationError("Access denied - insufficient permissions");
    }
  }

  // Activate event
  await event.activate();

  // Publish event activation
  await publishToDirect(EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_ACTIVATED, {
    eventId: event._id,
    organizerId: event.organizerId,
    name: event.name,
  });

  logger.info("Event activated successfully", {
    eventId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Event activated successfully",
    data: event,
    requestId: req.requestId,
  });
});

// Deactivate event
const deactivateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      if (event.organizerId.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only deactivate your own events");
      }
    } else {
      throw new ValidationError("Access denied - insufficient permissions");
    }
  }

  // Deactivate event
  await event.deactivate();

  // Publish event deactivation
  await publishToDirect(EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_DEACTIVATED, {
    eventId: event._id,
    organizerId: event.organizerId,
    name: event.name,
  });

  logger.info("Event deactivated successfully", {
    eventId: id,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Event deactivated successfully",
    data: event,
    requestId: req.requestId,
  });
});

// Cancel event
const cancelEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const event = await Event.findById(id);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  // Check access permissions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      if (event.organizerId.toString() !== req.user._id.toString()) {
        throw new ValidationError("Access denied - can only cancel your own events");
      }
    } else {
      throw new ValidationError("Access denied - insufficient permissions");
    }
  }

  // Cancel event
  await event.cancel(reason);

  // Publish event cancellation
  await publishToDirect(EXCHANGES.EVENT_MANAGEMENT, ROUTING_KEYS.EVENT_CANCELLED, {
    eventId: event._id,
    organizerId: event.organizerId,
    name: event.name,
    reason,
  });

  await publishToFanout(EXCHANGES.NOTIFICATIONS, {
    type: NOTIFICATION_TYPES.EVENT_CANCELLED,
    eventId: event._id,
    organizerId: event.organizerId,
    eventName: event.name,
    reason,
    timestamp: new Date().toISOString(),
  });

  logger.info("Event cancelled successfully", {
    eventId: id,
    reason,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    message: "Event cancelled successfully",
    data: event,
    requestId: req.requestId,
  });
});

// Search events
const searchEvents = asyncHandler(async (req, res) => {
  const {
    query,
    category,
    location,
    priceRange,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = "startDate",
    sortOrder = "asc",
  } = req.query;

  if (!query || query.trim().length < 2) {
    throw new ValidationError("Search query must be at least 2 characters long");
  }

  const searchOptions = {
    category,
    location,
    priceRange: priceRange ? JSON.parse(priceRange) : null,
    startDate,
    endDate,
  };

  const events = await Event.search(query.trim(), searchOptions)
    .populate("organizerId", "name email")
    .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(Math.min(parseInt(limit), 100));

  const total = await Event.countDocuments({
    $and: [
      { isPublished: true, isActive: true },
      {
        $or: [
          { name: { $regex: query.trim(), $options: "i" } },
          { description: { $regex: query.trim(), $options: "i" } },
          { tags: { $in: [new RegExp(query.trim(), "i")] } },
          { category: { $regex: query.trim(), $options: "i" } },
        ],
      },
    ],
  });

  logger.info("Event search completed successfully", {
    query: query.trim(),
    results: events.length,
    total,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: {
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
    requestId: req.requestId,
  });
});

// Get upcoming events
const getUpcomingEvents = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const events = await Event.findUpcoming(parseInt(limit))
    .populate("organizerId", "name email");

  logger.info("Upcoming events retrieved successfully", {
    count: events.length,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: events,
    requestId: req.requestId,
  });
});

// Get event statistics
const getEventStats = asyncHandler(async (req, res) => {
  const { organizerId, startDate, endDate } = req.query;

  const query = {};

  if (organizerId) query.organizerId = organizerId;
  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  // Apply user restrictions
  if (!["admin", "super_admin"].includes(req.user.role)) {
    if (["event_organizer", "manager"].includes(req.user.role)) {
      query.organizerId = req.user._id;
    } else {
      throw new ValidationError("Access denied - insufficient permissions");
    }
  }

  const stats = await Event.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        publishedEvents: { $sum: { $cond: ["$isPublished", 1, 0] } },
        activeEvents: { $sum: { $cond: ["$isActive", 1, 0] } },
        totalCapacity: { $sum: "$venue.capacity" },
        eventsByType: { $push: "$eventType" },
        eventsByCategory: { $push: "$category" },
        eventsByStatus: { $push: "$status" },
      },
    },
    {
      $project: {
        _id: 0,
        totalEvents: 1,
        publishedEvents: 1,
        activeEvents: 1,
        totalCapacity: 1,
        typeDistribution: {
          $reduce: {
            input: "$eventsByType",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $literal: {
                    $concat: [
                      "$$this",
                      ": ",
                      { $toString: { $size: { $filter: { input: "$eventsByType", cond: { $eq: ["$$this", "$$this"] } } } } },
                    ],
                  },
                },
              ],
            },
          },
        },
        categoryDistribution: {
          $reduce: {
            input: "$eventsByCategory",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $literal: {
                    $concat: [
                      "$$this",
                      ": ",
                      { $toString: { $size: { $filter: { input: "$eventsByCategory", cond: { $eq: ["$$this", "$$this"] } } } } },
                    ],
                  },
                },
              ],
            },
          },
        },
        statusDistribution: {
          $reduce: {
            input: "$eventsByStatus",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $literal: {
                    $concat: [
                      "$$this",
                      ": ",
                      { $toString: { $size: { $filter: { input: "$eventsByStatus", cond: { $eq: ["$$this", "$$this"] } } } } },
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

  logger.info("Event statistics retrieved successfully", {
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: stats[0] || {
      totalEvents: 0,
      publishedEvents: 0,
      activeEvents: 0,
      totalCapacity: 0,
      typeDistribution: {},
      categoryDistribution: {},
      statusDistribution: {},
    },
    requestId: req.requestId,
  });
});

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  publishEvent,
  unpublishEvent,
  activateEvent,
  deactivateEvent,
  cancelEvent,
  searchEvents,
  getUpcomingEvents,
  getEventStats,
};
