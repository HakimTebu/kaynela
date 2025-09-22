const { v4: uuidv4 } = require('uuid');

/**
 * Request ID Middleware
 * Generates a unique request ID for each request and adds it to headers
 */
const requestIdMiddleware = (req, res, next) => {
  // Generate request ID if not present
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Add to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Add to request headers for downstream services
  req.headers['x-request-id'] = requestId;
  
  next();
};

module.exports = requestIdMiddleware; 