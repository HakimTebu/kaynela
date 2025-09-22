const logger = require("./logger");

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access") {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden access") {
    super(message, 403);
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, 409);
  }
}

class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429);
  }
}

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
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestId: req.requestId,
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
      const message = Object.values(err.errors).map((val) => val.message);
      error = new ValidationError(message.join(", "));
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

    // Rate limiting errors
    if (err.status === 429) {
      error = new RateLimitError();
    }

    // Default error
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    // Don't leak error details in production
    const response = {
      success: false,
      error: message,
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
        details: error.details,
      }),
    };

    // Add request ID for tracing
    if (req.requestId) {
      response.requestId = req.requestId;
    }

    res.status(statusCode).json(response);
  };
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
