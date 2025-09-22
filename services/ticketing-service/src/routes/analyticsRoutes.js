const express = require("express");
const router = express.Router();

// Import middleware
const { authMiddleware, requireRole } = require("../middlewares/auth");
const { adminLimiter } = require("../middlewares/rateLimiter");

// Apply authentication to all routes
router.use(authMiddleware);

// Get ticket analytics
router.get(
  "/tickets",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  async (req, res) => {
    const { startDate, endDate, eventId, ticketType, status } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.issuedAt = {};
      if (startDate) query.issuedAt.$gte = new Date(startDate);
      if (endDate) query.issuedAt.$lte = new Date(endDate);
    }

    if (eventId) query.eventId = eventId;
    if (ticketType) query.ticketType = ticketType;
    if (status) query.status = status;

    // Apply user restrictions
    if (!["admin", "super_admin"].includes(req.user.role)) {
      if (["event_organizer", "manager"].includes(req.user.role)) {
        const userEvents = await require("../models/Event").find({ organizerId: req.user._id }).select("_id");
        query.eventId = { $in: userEvents.map(e => e._id) };
      }
    }

    const Ticket = require("../models/Ticket");
    const analytics = await Ticket.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          averageTicketPrice: { $avg: "$totalPrice" },
          ticketsByStatus: { $push: "$status" },
          ticketsByType: { $push: "$ticketType" },
          ticketsByDay: {
            $push: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$issuedAt" } },
              count: 1,
              revenue: "$totalPrice",
            },
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
          dailyTrends: {
            $reduce: {
              input: "$ticketsByDay",
              initialValue: {},
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    $literal: {
                      $concat: [
                        "$$this.date",
                        ": ",
                        { $toString: "$$this.count" },
                        " tickets, $",
                        { $toString: "$$this.revenue" },
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

    res.json({
      success: true,
      data: analytics[0] || {
        totalTickets: 0,
        totalRevenue: 0,
        averageTicketPrice: 0,
        statusDistribution: {},
        typeDistribution: {},
        dailyTrends: {},
      },
      requestId: req.requestId,
    });
  }
);

// Get event analytics
router.get(
  "/events",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  async (req, res) => {
    const { startDate, endDate, eventType, category } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    if (eventType) query.eventType = eventType;
    if (category) query.category = category;

    // Apply user restrictions
    if (!["admin", "super_admin"].includes(req.user.role)) {
      query.organizerId = req.user._id;
    }

    const Event = require("../models/Event");
    const analytics = await Event.aggregate([
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
          eventsByMonth: {
            $push: {
              month: { $dateToString: { format: "%Y-%m", date: "$startDate" } },
              count: 1,
              capacity: "$venue.capacity",
            },
          },
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
          monthlyTrends: {
            $reduce: {
              input: "$eventsByMonth",
              initialValue: {},
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    $literal: {
                      $concat: [
                        "$$this.month",
                        ": ",
                        { $toString: "$$this.count" },
                        " events, ",
                        { $toString: "$$this.capacity" },
                        " capacity",
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

    res.json({
      success: true,
      data: analytics[0] || {
        totalEvents: 0,
        publishedEvents: 0,
        activeEvents: 0,
        totalCapacity: 0,
        typeDistribution: {},
        categoryDistribution: {},
        statusDistribution: {},
        monthlyTrends: {},
      },
      requestId: req.requestId,
    });
  }
);

// Get user analytics
router.get(
  "/users",
  requireRole("admin", "super_admin"),
  adminLimiter,
  async (req, res) => {
    const { startDate, endDate } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const Ticket = require("../models/Ticket");
    const analytics = await Ticket.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$userId",
          ticketCount: { $sum: 1 },
          totalSpent: { $sum: "$totalPrice" },
          averageTicketPrice: { $avg: "$totalPrice" },
          lastPurchase: { $max: "$issuedAt" },
          firstPurchase: { $min: "$issuedAt" },
          ticketsByStatus: { $push: "$status" },
          ticketsByType: { $push: "$ticketType" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          userId: "$_id",
          user: { $arrayElemAt: ["$user", 0] },
          ticketCount: 1,
          totalSpent: 1,
          averageTicketPrice: 1,
          lastPurchase: 1,
          firstPurchase: 1,
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
      { $sort: { totalSpent: -1 } },
      { $limit: 100 },
    ]);

    res.json({
      success: true,
      data: analytics,
      requestId: req.requestId,
    });
  }
);

// Get comprehensive dashboard analytics
router.get(
  "/dashboard",
  requireRole("admin", "super_admin", "event_organizer", "manager"),
  async (req, res) => {
    const { startDate, endDate } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Apply user restrictions
    if (!["admin", "super_admin"].includes(req.user.role)) {
      if (["event_organizer", "manager"].includes(req.user.role)) {
        const userEvents = await require("../models/Event").find({ organizerId: req.user._id }).select("_id");
        query.eventId = { $in: userEvents.map(e => e._id) };
      }
    }

    const Ticket = require("../models/Ticket");
    const Event = require("../models/Event");

    // Get ticket analytics
    const ticketAnalytics = await Ticket.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          activeTickets: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          usedTickets: { $sum: { $cond: [{ $eq: ["$status", "used"] }, 1, 0] } },
          cancelledTickets: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        },
      },
    ]);

    // Get event analytics
    const eventQuery = {};
    if (startDate || endDate) {
      eventQuery.startDate = {};
      if (startDate) eventQuery.startDate.$gte = new Date(startDate);
      if (endDate) eventQuery.startDate.$lte = new Date(endDate);
    }

    if (!["admin", "super_admin"].includes(req.user.role)) {
      eventQuery.organizerId = req.user._id;
    }

    const eventAnalytics = await Event.aggregate([
      { $match: eventQuery },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          publishedEvents: { $sum: { $cond: ["$isPublished", 1, 0] } },
          activeEvents: { $sum: { $cond: ["$isActive", 1, 0] } },
          upcomingEvents: { $sum: { $cond: [{ $gt: ["$startDate", new Date()] }, 1, 0] } },
        },
      },
    ]);

    // Get recent activity
    const recentActivity = await Ticket.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          ticketId: "$_id",
          ticketNumber: "$ticketNumber",
          status: "$status",
          totalPrice: "$totalPrice",
          issuedAt: "$issuedAt",
          event: { $arrayElemAt: ["$event", 0] },
          user: { $arrayElemAt: ["$user", 0] },
        },
      },
    ]);

    const dashboard = {
      tickets: ticketAnalytics[0] || {
        totalTickets: 0,
        totalRevenue: 0,
        activeTickets: 0,
        usedTickets: 0,
        cancelledTickets: 0,
      },
      events: eventAnalytics[0] || {
        totalEvents: 0,
        publishedEvents: 0,
        activeEvents: 0,
        upcomingEvents: 0,
      },
      recentActivity,
      summary: {
        totalRevenue: ticketAnalytics[0]?.totalRevenue || 0,
        totalTickets: ticketAnalytics[0]?.totalTickets || 0,
        totalEvents: eventAnalytics[0]?.totalEvents || 0,
        conversionRate: ticketAnalytics[0]?.totalTickets > 0 
          ? ((ticketAnalytics[0]?.usedTickets || 0) / ticketAnalytics[0]?.totalTickets * 100).toFixed(2)
          : 0,
      },
    };

    res.json({
      success: true,
      data: dashboard,
      requestId: req.requestId,
    });
  }
);

module.exports = router;
