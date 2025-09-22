const jwt = require("jsonwebtoken");
const { UnauthorizedError, ForbiddenError } = require("../utils/errors");
const logger = require("../utils/logger");

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Access token required");
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user info to request
    req.user = {
      _id: decoded.userId || decoded._id,
      email: decoded.email,
      role: decoded.role,
      loyaltyTier: decoded.loyaltyTier,
    };

    // Log successful authentication
    logger.info("User authenticated", {
      userId: req.user._id,
      email: req.user.email,
      role: req.user.role,
      requestId: req.requestId,
    });

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      logger.warn("Invalid JWT token", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.requestId,
      });
      return next(new UnauthorizedError("Invalid access token"));
    }

    if (error.name === "TokenExpiredError") {
      logger.warn("Expired JWT token", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.requestId,
      });
      return next(new UnauthorizedError("Access token expired"));
    }

    logger.error("Authentication error", {
      error: error.message,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestId: req.requestId,
    });

    next(new UnauthorizedError("Authentication failed"));
  }
};

// Role-based access control middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn("Insufficient permissions", {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: roles,
        requestId: req.requestId,
      });
      return next(new ForbiddenError("Insufficient permissions"));
    }

    next();
  };
};

// Check if user owns the resource or has admin role
const requireOwnershipOrAdmin = (resourceIdField = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    // Admin users can access any resource
    if (req.user.role === "admin" || req.user.role === "super_admin") {
      return next();
    }

    // Check if user owns the resource
    const resourceId = req.params[resourceIdField] || req.body[resourceIdField];
    if (resourceId && resourceId.toString() !== req.user._id.toString()) {
      logger.warn("Unauthorized resource access", {
        userId: req.user._id,
        resourceId,
        requestId: req.requestId,
      });
      return next(new ForbiddenError("Access denied to this resource"));
    }

    next();
  };
};

// Check if user can access booking (owner or admin)
const requireBookingAccess = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError("Authentication required"));
      }

      // Admin users can access any booking
      if (req.user.role === "admin" || req.user.role === "super_admin") {
        return next();
      }

      const bookingId = req.params.bookingId || req.params.id;
      if (!bookingId) {
        return next(new UnauthorizedError("Booking ID required"));
      }

      // Import Booking model here to avoid circular dependency
      const Booking = require("../models/Booking");
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return next(new NotFoundError("Booking not found"));
      }

      // Check if user owns the booking
      if (booking.userId.toString() !== req.user._id.toString()) {
        logger.warn("Unauthorized booking access", {
          userId: req.user._id,
          bookingId,
          requestId: req.requestId,
        });
        return next(new ForbiddenError("Access denied to this booking"));
      }

      // Add booking to request for use in controllers
      req.booking = booking;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authMiddleware,
  requireRole,
  requireOwnershipOrAdmin,
  requireBookingAccess,
};
