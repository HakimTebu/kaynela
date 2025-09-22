const Payment = require("../models/Payment");
const Refund = require("../models/Refund");
const PaymentMethod = require("../models/PaymentMethod");
const { asyncHandler } = require("../utils/errors");
const logger = require("../utils/logger");
const { client: redisClient } = require("../config/redis");

// Get payment analytics overview
const getPaymentAnalyticsOverview = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user._id;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const end = endDate ? new Date(endDate) : new Date();

  try {
    // Get cached analytics if available
    const cacheKey = `analytics:overview:${userId}:${start.toISOString().split('T')[0]}:${end.toISOString().split('T')[0]}`;
    let analytics = await redisClient.get(cacheKey);

    if (analytics) {
      analytics = JSON.parse(analytics);
    } else {
      // Calculate analytics
      analytics = await calculatePaymentAnalytics(userId, start, end);

      // Cache for 1 hour
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(analytics));
    }

    res.json({
      success: true,
      data: analytics,
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error getting payment analytics overview:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get analytics overview",
      requestId: req.requestId,
    });
  }
});

// Get payment trends
const getPaymentTrends = asyncHandler(async (req, res) => {
  const { period = "daily", startDate, endDate } = req.query;
  const userId = req.user._id;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  try {
    const trends = await calculatePaymentTrends(userId, start, end, period);

    res.json({
      success: true,
      data: trends,
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error getting payment trends:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get payment trends",
      requestId: req.requestId,
    });
  }
});

// Get payment method analytics
const getPaymentMethodAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user._id;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  try {
    const analytics = await calculatePaymentMethodAnalytics(userId, start, end);

    res.json({
      success: true,
      data: analytics,
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error getting payment method analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get payment method analytics",
      requestId: req.requestId,
    });
  }
});

// Get refund analytics
const getRefundAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user._id;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  try {
    const analytics = await calculateRefundAnalytics(userId, start, end);

    res.json({
      success: true,
      data: analytics,
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error getting refund analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get refund analytics",
      requestId: req.requestId,
    });
  }
});

// Get revenue analytics
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, currency = "KES" } = req.query;
  const userId = req.user._id;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  try {
    const analytics = await calculateRevenueAnalytics(userId, start, end, currency);

    res.json({
      success: true,
      data: analytics,
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error getting revenue analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get revenue analytics",
      requestId: req.requestId,
    });
  }
});

// Get performance metrics
const getPerformanceMetrics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user._id;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  try {
    const metrics = await calculatePerformanceMetrics(userId, start, end);

    res.json({
      success: true,
      data: metrics,
      requestId: req.requestId,
    });
  } catch (error) {
    logger.error("Error getting performance metrics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get performance metrics",
      requestId: req.requestId,
    });
  }
});

// Export analytics data
const exportAnalyticsData = asyncHandler(async (req, res) => {
  const { format = "json", startDate, endDate, type = "overview" } = req.query;
  const userId = req.user._id;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  try {
    let data;
    let filename;

    switch (type) {
      case "overview":
        data = await calculatePaymentAnalytics(userId, start, end);
        filename = "payment_analytics_overview";
        break;
      case "trends":
        data = await calculatePaymentTrends(userId, start, end, "daily");
        filename = "payment_trends";
        break;
      case "methods":
        data = await calculatePaymentMethodAnalytics(userId, start, end);
        filename = "payment_method_analytics";
        break;
      case "refunds":
        data = await calculateRefundAnalytics(userId, start, end);
        filename = "refund_analytics";
        break;
      case "revenue":
        data = await calculateRevenueAnalytics(userId, start, end, "KES");
        filename = "revenue_analytics";
        break;
      default:
        data = await calculatePaymentAnalytics(userId, start, end);
        filename = "payment_analytics";
    }

    if (format === "csv") {
      const csv = convertToCSV(data);
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}_${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: {
          analytics: data,
          exportInfo: {
            format: "json",
            type,
            period: { startDate: start, endDate: end },
            exportedAt: new Date().toISOString(),
          },
        },
        requestId: req.requestId,
      });
    }
  } catch (error) {
    logger.error("Error exporting analytics data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export analytics data",
      requestId: req.requestId,
    });
  }
});

// Calculate payment analytics
async function calculatePaymentAnalytics(userId, startDate, endDate) {
  const payments = await Payment.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        avgAmount: { $avg: "$amount" },
      },
    },
  ]);

  const totalPayments = await Payment.countDocuments({
    userId,
    createdAt: { $gte: startDate, $lte: endDate },
    isActive: true,
  });

  const totalAmount = await Payment.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  const successfulPayments = await Payment.countDocuments({
    userId,
    status: "completed",
    createdAt: { $gte: startDate, $lte: endDate },
    isActive: true,
  });

  const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

  return {
    summary: {
      totalPayments,
      totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
      successfulPayments,
      successRate: Math.round(successRate * 100) / 100,
    },
    byStatus: payments,
    period: { startDate, endDate },
  };
}

// Calculate payment trends
async function calculatePaymentTrends(userId, startDate, endDate, period) {
  let dateFormat;
  let groupBy;

  switch (period) {
    case "hourly":
      dateFormat = "%Y-%m-%d-%H";
      groupBy = { $dateToString: { format: "%Y-%m-%d-%H", date: "$createdAt" } };
      break;
    case "daily":
      dateFormat = "%Y-%m-%d";
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      break;
    case "weekly":
      dateFormat = "%Y-%U";
      groupBy = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
      break;
    case "monthly":
      dateFormat = "%Y-%m";
      groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
      break;
    default:
      dateFormat = "%Y-%m-%d";
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
  }

  const trends = await Payment.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: groupBy,
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        avgAmount: { $avg: "$amount" },
        successfulCount: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return {
    period,
    dateFormat,
    trends,
    periodInfo: { startDate, endDate },
  };
}

// Calculate payment method analytics
async function calculatePaymentMethodAnalytics(userId, startDate, endDate) {
  const methodAnalytics = await Payment.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$paymentMethod",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        avgAmount: { $avg: "$amount" },
        successCount: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        failureCount: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
      },
    },
    {
      $sort: { totalAmount: -1 },
    },
  ]);

  const providerAnalytics = await Payment.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$paymentProvider",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        avgAmount: { $avg: "$amount" },
      },
    },
    {
      $sort: { totalAmount: -1 },
    },
  ]);

  return {
    byMethod: methodAnalytics,
    byProvider: providerAnalytics,
    period: { startDate, endDate },
  };
}

// Calculate refund analytics
async function calculateRefundAnalytics(userId, startDate, endDate) {
  const refundAnalytics = await Refund.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        avgAmount: { $avg: "$amount" },
      },
    },
  ]);

  const refundReasons = await Refund.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$reason",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  const totalRefunds = await Refund.countDocuments({
    userId,
    createdAt: { $gte: startDate, $lte: endDate },
    isActive: true,
  });

  const totalRefundAmount = await Refund.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return {
    summary: {
      totalRefunds,
      totalRefundAmount: totalRefundAmount.length > 0 ? totalRefundAmount[0].total : 0,
    },
    byStatus: refundAnalytics,
    byReason: refundReasons,
    period: { startDate, endDate },
  };
}

// Calculate revenue analytics
async function calculateRevenueAnalytics(userId, startDate, endDate, currency) {
  const revenueByDay = await Payment.aggregate([
    {
      $match: {
        userId: userId,
        status: "completed",
        currency: currency,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const revenueByMethod = await Payment.aggregate([
    {
      $match: {
        userId: userId,
        status: "completed",
        currency: currency,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$paymentMethod",
        revenue: { $sum: "$amount" },
        count: { $sum: 1 },
        avgAmount: { $avg: "$amount" },
      },
    },
    {
      $sort: { revenue: -1 },
    },
  ]);

  const totalRevenue = await Payment.aggregate([
    {
      $match: {
        userId: userId,
        status: "completed",
        currency: currency,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return {
    summary: {
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      currency,
    },
    byDay: revenueByDay,
    byMethod: revenueByMethod,
    period: { startDate, endDate },
  };
}

// Calculate performance metrics
async function calculatePerformanceMetrics(userId, startDate, endDate) {
  const payments = await Payment.find({
    userId,
    createdAt: { $gte: startDate, $lte: endDate },
    isActive: true,
  });

  const totalPayments = payments.length;
  const successfulPayments = payments.filter(p => p.status === "completed").length;
  const failedPayments = payments.filter(p => p.status === "failed").length;
  const pendingPayments = payments.filter(p => p.status === "pending").length;

  // Calculate average processing time
  const completedPayments = payments.filter(p => p.status === "completed" && p.completedAt);
  const totalProcessingTime = completedPayments.reduce((total, payment) => {
    return total + (payment.completedAt.getTime() - payment.initiatedAt.getTime());
  }, 0);

  const avgProcessingTime = completedPayments.length > 0 
    ? totalProcessingTime / completedPayments.length 
    : 0;

  // Calculate success rate
  const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

  // Calculate failure rate
  const failureRate = totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0;

  return {
    summary: {
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
    },
    performance: {
      avgProcessingTime: Math.round(avgProcessingTime / 1000), // Convert to seconds
      totalProcessingTime: Math.round(totalProcessingTime / 1000),
    },
    period: { startDate, endDate },
  };
}

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || typeof data !== "object") return "";
  
  // Flatten nested objects for CSV
  const flattenObject = (obj, prefix = "") => {
    const flattened = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}_${key}` : key;
        if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, flattenObject(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    return flattened;
  };

  let csvData;
  if (Array.isArray(data)) {
    csvData = data.map(item => flattenObject(item));
  } else {
    csvData = [flattenObject(data)];
  }

  if (csvData.length === 0) return "";
  
  const headers = Object.keys(csvData[0]);
  const csvRows = [headers.join(",")];
  
  for (const row of csvData) {
    const values = headers.map(header => {
      const value = row[header];
      const escapedValue = String(value).replace(/"/g, '""');
      return `"${escapedValue}"`;
    });
    csvRows.push(values.join(","));
  }
  
  return csvRows.join("\n");
}

module.exports = {
  getPaymentAnalyticsOverview,
  getPaymentTrends,
  getPaymentMethodAnalytics,
  getRefundAnalytics,
  getRevenueAnalytics,
  getPerformanceMetrics,
  exportAnalyticsData,
};
