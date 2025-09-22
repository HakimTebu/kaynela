const { v4: uuidv4 } = require("uuid");

const requestIdMiddleware = (req, res, next) => {
  // Generate unique request ID
  req.requestId = uuidv4();

  // Add request ID to response headers
  res.setHeader("X-Request-ID", req.requestId);

  // Add request ID to response body for JSON responses
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
