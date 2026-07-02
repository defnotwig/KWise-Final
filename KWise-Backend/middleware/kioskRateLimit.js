const rateLimit = require('express-rate-limit');

const isHealthCheck = (req) => req.path === '/health' || req.originalUrl?.startsWith('/api/health');
const isControlledLocalStress = process.env.LOAD_TEST_MODE === 'true' || process.env.LIVE_STACK_LATENCY_TEST === 'true';

const isLocalAddress = (value) => {
  if (!value) return false;
  return value === '127.0.0.1'
    || value === '::1'
    || value === 'localhost'
    || value.endsWith(':127.0.0.1');
};

const isLocalStressRequest = (req) => isControlledLocalStress && [
  req.ip,
  req.connection?.remoteAddress,
  req.socket?.remoteAddress
].some(isLocalAddress);

const isLocalRequest = (req) => [
  req.ip,
  req.connection?.remoteAddress,
  req.socket?.remoteAddress
].some(isLocalAddress);

const isControlledStressHeader = (req) => (
  typeof req.headers['x-kwise-stress-phase'] === 'string'
  && isLocalRequest(req)
);

const isLocalKioskHotRequest = (req) => {
  if (!isLocalRequest(req)) return false;

  const requestPath = req.originalUrl || req.path || '';
  if (req.method === 'GET') {
    return /^\/api\/(health|ip\/check|kiosk|stock)(\/|$|\?)/.test(requestPath);
  }

  return req.method === 'POST'
    && /^\/api\/compatibility\/(analyze|batch|batch-analyze|ram-slots|storage-slots|matrix\/quick-check)(\/|$|\?)/.test(requestPath);
};

const skipKioskRateLimit = (req) => isHealthCheck(req)
  || process.env.LIVE_STACK_LATENCY_TEST === 'true'
  || isControlledStressHeader(req)
  || isLocalKioskHotRequest(req)
  || isLocalStressRequest(req);

/**
 * Rate limiting middleware for kiosk API endpoints
 * Prevents abuse and ensures fair usage of public kiosk interface
 */

// General rate limit for most kiosk endpoints
const kioskGeneralLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 180, // Enough for normal kiosk bursts without allowing automated abuse
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  // Custom key generator to handle potential proxy scenarios
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  skip: skipKioskRateLimit
});

// Stricter rate limit for search endpoints (more resource intensive)
const kioskSearchLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: 'Too many search requests from this IP, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  skip: skipKioskRateLimit
});

// Very lenient rate limit for category/product listing (less resource intensive)
const kioskBrowseLimit = rateLimit({
  windowMs: 10 * 1000, // 10 seconds (shorter window for faster reset)
  max: 120,
  message: {
    error: 'Too many browsing requests from this IP, please try again later.',
    retryAfter: '10 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  skip: skipKioskRateLimit
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
  },
  skip: skipKioskRateLimit
});

module.exports = {
  kioskGeneralLimit,
  kioskSearchLimit,
  kioskBrowseLimit,
  kioskOrderLimit
};
