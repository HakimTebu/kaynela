const Payment = require("../models/Payment");
const { asyncHandler } = require("../utils/errors");
const logger = require("../utils/logger");
const { client: redisClient } = require("../config/redis");

// Get transaction by ID
const getTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  // Try to get from cache first
  let transaction = await redisClient.get(`transaction:${transactionId}`);
  if (transaction) {
    transaction = JSON.parse(transaction);
  } else {
    transaction = await Payment.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
        requestId: req.requestId,
      });
    }

    // Cache the transaction
    await redisClient.setEx(
      `transaction:${transactionId}`,
      300,
      JSON.stringify(transaction)
    );
  }

  // Check if user can access this transaction
  if (transaction.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  res.json({
    success: true,
    data: transaction,
    requestId: req.requestId,
  });
});

// Get user transactions with filters
const getUserTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, paymentMethod, startDate, endDate, minAmount, maxAmount } = req.query;
  const userId = req.user._id;

  // Build filter
  const filter = { userId, isActive: true };
  if (status) filter.status = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  if (minAmount || maxAmount) {
    filter.amount = {};
    if (minAmount) filter.amount.$gte = parseFloat(minAmount);
    if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Payment.countDocuments(filter);
  const totalPages = Math.ceil(total / parseInt(limit));

  // Get transactions
  const transactions = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("bookingId", "bookingNumber description")
    .populate("orderId", "orderNumber description");

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    requestId: req.requestId,
  });
});

// Get transaction statistics
const getTransactionStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user._id;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const end = endDate ? new Date(endDate) : new Date();

  // Get transaction summary
  const summary = await Payment.getPaymentSummary(userId);

  // Get transaction analytics
  const analytics = await Payment.getPaymentAnalytics(start, end);

  // Calculate additional statistics
  const totalTransactions = await Payment.countDocuments({ userId, isActive: true });
  const totalAmount = await Payment.aggregate([
    { $match: { userId: userId, isActive: true } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const avgTransactionAmount = totalAmount.length > 0 ? totalAmount[0].total / totalTransactions : 0;

  res.json({
    success: true,
    data: {
      summary,
      analytics,
      statistics: {
        totalTransactions,
        totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
        avgTransactionAmount: Math.round(avgTransactionAmount * 100) / 100,
      },
      period: {
        startDate: start,
        endDate: end,
      },
    },
    requestId: req.requestId,
  });
});

// Search transactions
const searchTransactions = asyncHandler(async (req, res) => {
  const { query, page = 1, limit = 20 } = req.query;
  const userId = req.user._id;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: "Search query must be at least 2 characters long",
      requestId: req.requestId,
    });
  }

  // Build search filter
  const searchFilter = {
    userId,
    isActive: true,
    $or: [
      { description: { $regex: query, $options: "i" } },
      { providerPaymentId: { $regex: query, $options: "i" } },
      { providerTransactionId: { $regex: query, $options: "i" } },
    ],
  };

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Payment.countDocuments(searchFilter);
  const totalPages = Math.ceil(total / parseInt(limit));

  // Search transactions
  const transactions = await Payment.find(searchFilter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("bookingId", "bookingNumber description")
    .populate("orderId", "orderNumber description");

  res.json({
    success: true,
    data: {
      transactions,
      searchQuery: query,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    requestId: req.requestId,
  });
});

// Export transactions
const exportTransactions = asyncHandler(async (req, res) => {
  const { format = "json", startDate, endDate, status } = req.query;
  const userId = req.user._id;

  // Build filter
  const filter = { userId, isActive: true };
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Get transactions
  const transactions = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .populate("bookingId", "bookingNumber description")
    .populate("orderId", "orderNumber description");

  if (format === "csv") {
    // Convert to CSV format
    const csvData = transactions.map(t => ({
      ID: t._id,
      Amount: t.amount,
      Currency: t.currency,
      Status: t.status,
      PaymentMethod: t.paymentMethod,
      Description: t.description,
      CreatedAt: t.createdAt,
      CompletedAt: t.completedAt,
    }));

    const csv = convertToCSV(csvData);
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="transactions_${Date.now()}.csv"`);
    res.send(csv);
  } else {
    // JSON format
    res.json({
      success: true,
      data: {
        transactions,
        exportInfo: {
          format: "json",
          totalRecords: transactions.length,
          exportedAt: new Date().toISOString(),
        },
      },
      requestId: req.requestId,
    });
  }
});

// Get transaction timeline
const getTransactionTimeline = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  const transaction = await Payment.findById(transactionId);
  if (!transaction) {
    return res.status(404).json({
      success: false,
      error: "Transaction not found",
      requestId: req.requestId,
    });
  }

  // Check if user can access this transaction
  if (transaction.userId.toString() !== req.user._id.toString() && 
      !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      requestId: req.requestId,
    });
  }

  // Build timeline
  const timeline = [];

  // Payment initiated
  if (transaction.initiatedAt) {
    timeline.push({
      event: "Payment Initiated",
      timestamp: transaction.initiatedAt,
      description: `Payment of ${transaction.amount} ${transaction.currency} was initiated`,
      status: "completed",
    });
  }

  // Payment processed
  if (transaction.processedAt) {
    timeline.push({
      event: "Payment Processed",
      timestamp: transaction.processedAt,
      description: "Payment was sent to payment provider for processing",
      status: "completed",
    });
  }

  // Payment completed
  if (transaction.completedAt) {
    timeline.push({
      event: "Payment Completed",
      timestamp: transaction.completedAt,
      description: `Payment was successfully completed`,
      status: "completed",
    });
  }

  // Payment failed
  if (transaction.failedAt) {
    timeline.push({
      event: "Payment Failed",
      timestamp: transaction.failedAt,
      description: `Payment failed: ${transaction.errorMessage}`,
      status: "failed",
    });
  }

  // Payment cancelled
  if (transaction.cancelledAt) {
    timeline.push({
      event: "Payment Cancelled",
      timestamp: transaction.cancelledAt,
      description: `Payment was cancelled`,
      status: "cancelled",
    });
  }

  // Sort timeline by timestamp
  timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  res.json({
    success: true,
    data: {
      transactionId: transaction._id,
      timeline,
    },
    requestId: req.requestId,
  });
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];
  
  for (const row of data) {
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
  getTransaction,
  getUserTransactions,
  getTransactionStats,
  searchTransactions,
  exportTransactions,
  getTransactionTimeline,
};
