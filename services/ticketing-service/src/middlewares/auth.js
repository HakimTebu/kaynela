const jwt = require("jsonwebtoken");
const { UnauthorizedError, ForbiddenError } = require("../utils/errors");
const logger = require("../utils/logger");

// JWT Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Access token required");
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      throw new UnauthorizedError("Access token required");
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user info to request
    req.user = {
      _id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      loyaltyTier: decoded.loyaltyTier,
      loyaltyPoints: decoded.loyaltyPoints,
    };

    logger.debug("User authenticated:", {
      userId: req.user._id,
      role: req.user.role,
      requestId: req.requestId,
    });

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      next(new UnauthorizedError("Invalid token"));
    } else if (error.name === "TokenExpiredError") {
      next(new UnauthorizedError("Token expired"));
    } else {
      next(error);
    }
  }
};

// Role-based access control middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn("Access denied - insufficient role:", {
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

// Check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceUserIdField = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    // Admin can access all resources
    if (["admin", "super_admin"].includes(req.user.role)) {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    if (resourceUserId && resourceUserId.toString() === req.user._id.toString()) {
      return next();
    }

    logger.warn("Access denied - resource ownership required:", {
      userId: req.user._id,
      resourceUserId,
      requestId: req.requestId,
    });

    return next(new ForbiddenError("Access denied - resource ownership required"));
  };
};

// Check if user can access ticketing data
const requireTicketingAccess = () => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    // Admin can access all ticketing data
    if (["admin", "super_admin"].includes(req.user.role)) {
      return next();
    }

    // Event organizers can access their events
    if (["event_organizer", "manager"].includes(req.user.role)) {
      return next();
    }

    // Users can only access their own tickets
    const targetUserId = req.params.userId || req.body.userId;
    if (targetUserId && targetUserId.toString() === req.user._id.toString()) {
      return next();
    }

    logger.warn("Access denied - ticketing data access restricted:", {
      userId: req.user._id,
      targetUserId,
      requestId: req.requestId,
    });

    return next(new ForbiddenError("Access denied - can only access own ticketing data"));
  };
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    if (!token) {
      return next(); // Continue without authentication
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user info to request
    req.user = {
      _id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      loyaltyTier: decoded.loyaltyTier,
      loyaltyPoints: decoded.loyaltyPoints,
    };

    logger.debug("Optional authentication successful:", {
      userId: req.user._id,
      requestId: req.requestId,
    });

    next();
  } catch (error) {
    // Log error but don't fail the request
    logger.debug("Optional authentication failed:", {
      error: error.message,
      requestId: req.requestId,
    });
    next(); // Continue without authentication
  }
};

module.exports = {
  authMiddleware,
  requireRole,
  requireOwnershipOrAdmin,
  requireTicketingAccess,
  optionalAuth,
};
