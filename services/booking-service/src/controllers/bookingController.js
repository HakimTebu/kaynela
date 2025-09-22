const Booking = require("../models/Booking");
const { asyncHandler } = require("../utils/errors");
const {
  NotFoundError,
  ValidationError,
  ConflictError,
} = require("../utils/errors");
const logger = require("../utils/logger");
const {
  publishBookingCreatedEvent,
  publishBookingConfirmedEvent,
  publishBookingCompletedEvent,
  publishBookingCancelledEvent,
} = require("../services/rabbitmq");
const { client: redisClient } = require("../config/redis");
const constants = require("../constants");

class BookingController {
  // Create a new booking
  createBooking = asyncHandler(async (req, res) => {
    const {
      bookingType,
      startDate,
      endDate,
      duration,
      participants,
      basePrice,
      taxes = 0,
      fees = 0,
      discount = 0,
      currency = "KES",
      lodging,
      activity,
      event,
      package: packageData,
      specialRequirements,
      payment,
      source = "website",
      notes,
    } = req.body;

    // Calculate total amount
    const totalAmount = basePrice + taxes + fees - discount;

    // Create booking object
    const bookingData = {
      userId: req.user._id,
      bookingType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      duration,
      participants,
      basePrice,
      taxes,
      fees,
      discount,
      totalAmount,
      currency,
      payment: {
        ...payment,
        paymentStatus: "pending",
      },
      source,
      notes,
    };

    // Add type-specific data
    if (lodging) {
      bookingData.lodging = lodging;
    }
    if (activity) {
      bookingData.activity = activity;
    }
    if (event) {
      bookingData.event = event;
    }
    if (packageData) {
      bookingData.package = packageData;
    }
    if (specialRequirements) {
      bookingData.specialRequirements = specialRequirements;
    }

    // Create the booking
    const booking = new Booking(bookingData);
    await booking.save();

    // Publish booking created event
    await publishBookingCreatedEvent(booking);

    // Cache the booking
    await this.cacheBooking(booking);

    logger.info("Booking created successfully", {
      bookingId: booking.bookingId,
      userId: req.user._id,
      bookingType,
      totalAmount,
      requestId: req.requestId,
    });

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: {
        booking: {
          id: booking._id,
          bookingId: booking.bookingId,
          status: booking.status,
          totalAmount: booking.totalAmount,
          startDate: booking.startDate,
          endDate: booking.endDate,
        },
      },
      requestId: req.requestId,
    });
  });

  // Get all bookings with pagination and filters
  getBookings = asyncHandler(async (req, res) => {
    const {
      page = constants.PAGINATION.DEFAULT_PAGE,
      limit = constants.PAGINATION.DEFAULT_LIMIT,
      status,
      bookingType,
      startDate,
      endDate,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = { userId: req.user._id };

    if (status) filter.status = status;
    if (bookingType) filter.bookingType = bookingType;
    if (startDate) filter.startDate = { $gte: new Date(startDate) };
    if (endDate) filter.endDate = { $lte: new Date(endDate) };
    if (minPrice || maxPrice) {
      filter.totalAmount = {};
      if (minPrice) filter.totalAmount.$gte = parseFloat(minPrice);
      if (maxPrice) filter.totalAmount.$lte = parseFloat(maxPrice);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const actualLimit = Math.min(
      parseInt(limit),
      constants.PAGINATION.MAX_LIMIT
    );

    // Execute query
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(actualLimit)
        .select("-__v")
        .lean(),
      Booking.countDocuments(filter),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / actualLimit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    logger.info("Bookings retrieved successfully", {
      userId: req.user._id,
      count: bookings.length,
      total,
      page: parseInt(page),
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: actualLimit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
      requestId: req.requestId,
    });
  });

  // Get a single booking by ID
  getBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Try to get from cache first
    const cachedBooking = await this.getCachedBooking(id);
    if (cachedBooking) {
      return res.json({
        success: true,
        data: { booking: cachedBooking },
        requestId: req.requestId,
      });
    }

    // Get from database
    const booking = await Booking.findById(id).select("-__v").lean();

    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    // Check ownership
    if (
      booking.userId.toString() !== req.user._id.toString() &&
      !["admin", "super_admin"].includes(req.user.role)
    ) {
      throw new NotFoundError("Booking not found");
    }

    // Cache the booking
    await this.cacheBooking(booking);

    logger.info("Booking retrieved successfully", {
      bookingId: id,
      userId: req.user._id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: { booking },
      requestId: req.requestId,
    });
  });

  // Update a booking
  updateBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Get the booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    // Check ownership
    if (
      booking.userId.toString() !== req.user._id.toString() &&
      !["admin", "super_admin"].includes(req.user.role)
    ) {
      throw new NotFoundError("Booking not found");
    }

    // Check if booking can be updated
    if (!["pending", "confirmed"].includes(booking.status)) {
      throw new ValidationError("Cannot update booking in current status");
    }

    // Update the booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { ...updateData, lastModified: new Date() },
      { new: true, runValidators: true }
    );

    // Publish booking updated event
    await publishBookingCreatedEvent(updatedBooking);

    // Update cache
    await this.cacheBooking(updatedBooking);

    logger.info("Booking updated successfully", {
      bookingId: id,
      userId: req.user._id,
      updates: Object.keys(updateData),
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: "Booking updated successfully",
      data: { booking: updatedBooking },
      requestId: req.requestId,
    });
  });

  // Cancel a booking
  cancelBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    // Get the booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    // Check ownership
    if (
      booking.userId.toString() !== req.user._id.toString() &&
      !["admin", "super_admin"].includes(req.user.role)
    ) {
      throw new NotFoundError("Booking not found");
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) {
      throw new ValidationError("Booking cannot be cancelled");
    }

    // Calculate cancellation fee
    const cancellationFee = booking.calculateCancellationFee();

    // Update the booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "cancelled",
        "cancellation.cancelledAt": new Date(),
        "cancellation.cancelledBy": req.user._id,
        "cancellation.cancellationReason": cancellationReason,
        "cancellation.cancellationFee": cancellationFee,
        lastModified: new Date(),
      },
      { new: true }
    );

    // Publish booking cancelled event
    await publishBookingCancelledEvent(updatedBooking, cancellationReason);

    // Update cache
    await this.cacheBooking(updatedBooking);

    logger.info("Booking cancelled successfully", {
      bookingId: id,
      userId: req.user._id,
      cancellationFee,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      data: {
        booking: updatedBooking,
        cancellationFee,
      },
      requestId: req.requestId,
    });
  });

  // Confirm a booking (admin only)
  confirmBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check admin role
    if (!["admin", "super_admin"].includes(req.user.role)) {
      throw new ValidationError("Only administrators can confirm bookings");
    }

    // Get the booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.status !== "pending") {
      throw new ValidationError("Only pending bookings can be confirmed");
    }

    // Update the booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "confirmed",
        confirmedAt: new Date(),
        lastModified: new Date(),
      },
      { new: true }
    );

    // Publish booking confirmed event
    await publishBookingConfirmedEvent(updatedBooking);

    // Update cache
    await this.cacheBooking(updatedBooking);

    logger.info("Booking confirmed successfully", {
      bookingId: id,
      adminId: req.user._id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: "Booking confirmed successfully",
      data: { booking: updatedBooking },
      requestId: req.requestId,
    });
  });

  // Complete a booking (admin only)
  completeBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check admin role
    if (!["admin", "super_admin"].includes(req.user.role)) {
      throw new ValidationError("Only administrators can complete bookings");
    }

    // Get the booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (!["confirmed", "active"].includes(booking.status)) {
      throw new ValidationError(
        "Only confirmed or active bookings can be completed"
      );
    }

    // Update the booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "completed",
        completedAt: new Date(),
        lastModified: new Date(),
      },
      { new: true }
    );

    // Publish booking completed event
    await publishBookingCompletedEvent(updatedBooking);

    // Update cache
    await this.cacheBooking(updatedBooking);

    logger.info("Booking completed successfully", {
      bookingId: id,
      adminId: req.user._id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: "Booking completed successfully",
      data: { booking: updatedBooking },
      requestId: req.requestId,
    });
  });

  // Delete a booking (soft delete)
  deleteBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check admin role
    if (!["admin", "super_admin"].includes(req.user.role)) {
      throw new ValidationError("Only administrators can delete bookings");
    }

    // Get the booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    // Soft delete by updating status
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "deleted",
        deletedAt: new Date(),
        lastModified: new Date(),
      },
      { new: true }
    );

    // Remove from cache
    await this.removeCachedBooking(id);

    logger.info("Booking deleted successfully", {
      bookingId: id,
      adminId: req.user._id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: "Booking deleted successfully",
      requestId: req.requestId,
    });
  });

  // Get booking statistics
  getBookingStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Build base filter
    const filter = { userId: req.user._id };
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter;
    }

    // Get statistics
    const stats = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
          averageBookingValue: { $avg: "$totalAmount" },
          pendingBookings: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
    ]);

    // Get booking type distribution
    const typeDistribution = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$bookingType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const result = {
      totalBookings: stats[0]?.totalBookings || 0,
      totalSpent: stats[0]?.totalSpent || 0,
      averageBookingValue: stats[0]?.averageBookingValue || 0,
      statusBreakdown: {
        pending: stats[0]?.pendingBookings || 0,
        confirmed: stats[0]?.confirmedBookings || 0,
        completed: stats[0]?.completedBookings || 0,
        cancelled: stats[0]?.cancelledBookings || 0,
      },
      typeDistribution,
    };

    logger.info("Booking statistics retrieved successfully", {
      userId: req.user._id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: { statistics: result },
      requestId: req.requestId,
    });
  });

  // Cache methods
  async cacheBooking(booking) {
    try {
      const key = `booking:${booking._id}`;
      await redisClient.setEx(
        key,
        constants.CACHE_TTL.BOOKING_DETAILS,
        JSON.stringify(booking)
      );
    } catch (error) {
      logger.warn("Failed to cache booking", { error: error.message });
    }
  }

  async getCachedBooking(bookingId) {
    try {
      const key = `booking:${bookingId}`;
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn("Failed to get cached booking", { error: error.message });
      return null;
    }
  }

  async removeCachedBooking(bookingId) {
    try {
      const key = `booking:${bookingId}`;
      await redisClient.del(key);
    } catch (error) {
      logger.warn("Failed to remove cached booking", { error: error.message });
    }
  }
}

module.exports = new BookingController();
