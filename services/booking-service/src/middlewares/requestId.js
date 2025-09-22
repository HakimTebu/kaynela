const { v4: uuidv4 } = require("uuid");

const requestIdMiddleware = (req, res, next) => {
  // Generate unique request ID if not present
  if (!req.requestId) {
    req.requestId = uuidv4();
  }

  // Add request ID to response headers for tracing
  res.setHeader("X-Request-ID", req.requestId);

  // Add request ID to response body if it's a JSON response
  const originalJson = res.json;
  res.json = function (data) {
    if (data && typeof data === "object") {
      data.requestId = req.requestId;
    }
    return originalJson.call(this, data);
  };

  next();
};

module.exports = requestIdMiddleware;
