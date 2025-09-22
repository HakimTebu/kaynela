class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends CustomError {
  constructor(message = "Bad Request", errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class UnauthorizedError extends CustomError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

class ForbiddenError extends CustomError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

class NotFoundError extends CustomError {
  constructor(message = "Not Found") {
    super(message, 404);
  }
}

class ConflictError extends CustomError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}

class InternalServerError extends CustomError {
  constructor(message = "Internal Server Error") {
    super(message, 500);
  }
}

// Error handling middleware that uses logger
const errorHandler = (logger) => {
  return (err, req, res, next) => {
    // Log the error
    logger.error(
      `${err.statusCode || 500} - ${err.message} - ${req.originalUrl} - ${
        req.method
      } - ${req.ip}`
    );

    // If the error stack is available and we're in development, log it
    if (process.env.NODE_ENV === "development" && err.stack) {
      logger.error(err.stack);
    }

    // Handle validation errors (from express-validator)
    if (err.errors && Array.isArray(err.errors)) {
      return res.status(err.statusCode || 400).json({
        success: false,
        error: err.message,
        errors: err.errors,
      });
    }

    // Handle operational errors that we created
    if (err.isOperational) {
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message,
      });
    }

    // Handle unexpected errors
    res.status(500).json({
      success: false,
      error: "Something went wrong!",
    });
  };
};

module.exports = {
  CustomError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  errorHandler,
}; 