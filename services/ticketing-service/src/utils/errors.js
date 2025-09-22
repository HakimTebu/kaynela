// Custom error classes
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = "ValidationError";
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden access") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429);
    this.name = "RateLimitError";
  }
}

class TicketGenerationError extends AppError {
  constructor(message = "Ticket generation failed", details = null) {
    super(message, 400);
    this.name = "TicketGenerationError";
    this.details = details;
  }
}

class QRCodeGenerationError extends AppError {
  constructor(message = "QR code generation failed", details = null) {
    super(message, 400);
    this.name = "QRCodeGenerationError";
    this.details = details;
  }
}

class EventValidationError extends AppError {
  constructor(message = "Event validation failed", details = null) {
    super(message, 400);
    this.name = "EventValidationError";
    this.details = details;
  }
}

// Async handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handler middleware
const errorHandler = (logger) => {
  return (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error("Error occurred:", {
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
      user: req.user?.id,
      timestamp: new Date().toISOString(),
    });

    // Mongoose bad ObjectId
    if (err.name === "CastError") {
      const message = "Resource not found";
      error = new NotFoundError(message);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      const message = `Duplicate field value: ${field}`;
      error = new ConflictError(message);
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors).map((val) => val.message).join(", ");
      error = new ValidationError(message);
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
      const message = "Invalid token";
      error = new UnauthorizedError(message);
    }

    if (err.name === "TokenExpiredError") {
      const message = "Token expired";
      error = new UnauthorizedError(message);
    }

    // Ticketing-specific errors
    if (err.name === "TicketGenerationError" || err.name === "QRCodeGenerationError" || err.name === "EventValidationError") {
      error = err; // Keep original ticketing error
    }

    // Default error
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    res.status(statusCode).json({
      success: false,
      error: message,
      ...(error.details && { details: error.details }),
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  };
};

// Not found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  });
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  TicketGenerationError,
  QRCodeGenerationError,
  EventValidationError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
};
