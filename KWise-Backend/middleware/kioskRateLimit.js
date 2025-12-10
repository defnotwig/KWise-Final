const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware for kiosk API endpoints
 * Prevents abuse and ensures fair usage of public kiosk interface
 */

// General rate limit for most kiosk endpoints
const kioskGeneralLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute per IP (increased to handle legitimate bursts during PC customization)
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests to avoid penalizing normal usage
  skipSuccessfulRequests: true, // Don't count successful requests
  // Custom key generator to handle potential proxy scenarios
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  // Skip rate limiting for order creation (critical endpoint)
  skip: (req) => {
    return req.path === '/orders' && req.method === 'POST';
  }
});

// Stricter rate limit for search endpoints (more resource intensive)
const kioskSearchLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 searches per minute per IP (increased)
  message: {
    error: 'Too many search requests from this IP, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  }
});

// Very lenient rate limit for category/product listing (less resource intensive)
const kioskBrowseLimit = rateLimit({
  windowMs: 10 * 1000, // 10 seconds (shorter window for faster reset)
  max: 1000, // 1000 requests per 10 seconds (100 per second burst allowed)
  message: {
    error: 'Too many browsing requests from this IP, please try again later.',
    retryAfter: '10 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests to prevent blocking normal usage
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  }
});

// Special rate limit for order creation (most critical endpoint)
const kioskOrderLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 orders per 5 minutes per IP (prevents spam while allowing legitimate use)
  message: {
    error: 'Too many order attempts from this IP. Please wait before placing another order.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all attempts to prevent abuse
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  }
});

module.exports = {
  kioskGeneralLimit,
  kioskSearchLimit,
  kioskBrowseLimit,
  kioskOrderLimit
};