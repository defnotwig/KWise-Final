/**
 * AI Routes for K-Wise AI Integration
 * Defines REST API endpoints for AI services
 * Handles authentication and request validation
 * 
 * ✅ FIXED: Temporal Dead Zone - All middleware defined BEFORE route usage
 * ✅ FIXED: All controller methods validated at startup
 * ✅ FIXED: Proper error handling and logging
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const logger = require('../../utils/logger');

const router = express.Router();

// ==========================================
// STEP 1: IMPORT DEPENDENCIES FIRST
// ==========================================
const aiController = require('../controllers/aiController');
const { protect, restrictTo } = require('../../middleware/auth');

// ==========================================
// STEP 2: DEFINE ALL MIDDLEWARE (BEFORE ROUTE USAGE)
// ==========================================

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many AI requests from this IP, please try again later',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('AI rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Too many AI requests from this IP, please try again later',
      data: null
    });
  }
});

// Enhanced rate limiting for expensive operations
const expensiveAIRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for expensive operations
  message: {
    success: false,
    message: 'Rate limit exceeded for AI analysis operations',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Request logging middleware
const logAIRequest = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info('AI request received', {
    endpoint: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;

    logger.info('AI request completed', {
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      success: res.statusCode < 400
    });

    originalSend.call(this, data);
  };

  next();
};

// ==========================================
// STEP 3: VALIDATE ALL CONTROLLER METHODS
// ==========================================

console.log('🔍 AI Routes - Controller Validation');
console.log('  Controller type:', typeof aiController);
console.log('  Controller constructor:', aiController?.constructor?.name);

const requiredMethods = [
  'getHealthStatus', 'getSystemStatus', 'getCacheStatistics',
  'estimateCurrentBuild', 'recommendUpgrade', 'recommendCleaningTier',
  'getHotPicks', 'getValueForMoney', 'analyzeMarketTrends',
  'analyzeCompatibility', 'findCompatibleComponents',
  'optimizeBuild', 'validateBuildCompatibility', 'validateBuildComprehensive',
  'recommendPreBuilds', 'optimizeForBudget',
  'performPCCheckup', 'analyzeUpgradeOptions',
  'recommendServices', 'analyzeBottlenecks',
  'compareProducts', 'generateTrainingDataset',
  'getAIMetrics', 'getTopUpgradePaths', 'getPopularComponents'
];

const missingMethods = requiredMethods.filter(method => typeof aiController[method] !== 'function');

if (missingMethods.length > 0) {
  console.error('❌ FATAL: Missing controller methods:', missingMethods);
  const availableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(aiController))
    .filter(m => m !== 'constructor');
  console.error('❌ Available methods:', availableMethods);
  throw new Error(`Missing aiController methods: ${missingMethods.join(', ')}`);
}

console.log('✅ All', requiredMethods.length, 'controller methods validated');

// Verify middleware
console.log('🔍 Middleware Validation:');
console.log('  protect:', typeof protect, protect ? '✅' : '❌');
console.log('  restrictTo:', typeof restrictTo, restrictTo ? '✅' : '❌');
console.log('  aiRateLimit:', typeof aiRateLimit, aiRateLimit ? '✅' : '❌');
console.log('  expensiveAIRateLimit:', typeof expensiveAIRateLimit, expensiveAIRateLimit ? '✅' : '❌');
console.log('  logAIRequest:', typeof logAIRequest, logAIRequest ? '✅' : '❌');

// ==========================================
// STEP 4: APPLY GLOBAL MIDDLEWARE
// ==========================================

// Apply common middleware to all AI routes
router.use(aiRateLimit);
router.use(logAIRequest);

// Health check endpoint (public)
router.get('/health', aiController.getHealthStatus.bind(aiController));

// PHASE 3: Add circuit breaker and cache status endpoints
router.get('/status', aiController.getSystemStatus.bind(aiController));
router.get('/cache/stats', aiController.getCacheStatistics.bind(aiController));

// ==========================================
// STEP 5: DEFINE ROUTES
// ==========================================

console.log('✅ Starting route registration...');

// Health check endpoint (public)
router.get('/health', aiController.getHealthStatus.bind(aiController));
console.log('  ✅ Registered: GET /health');

// PHASE 3: Add circuit breaker and cache status endpoints
router.get('/status', aiController.getSystemStatus.bind(aiController));
console.log('  ✅ Registered: GET /status');

router.get('/cache/stats', aiController.getCacheStatistics.bind(aiController));
console.log('  ✅ Registered: GET /cache/stats');

// ⚠️ IMPORTANT: NO GLOBAL protect MIDDLEWARE!
// Individual routes decide their own auth requirements
// Public routes: /estimate-current-build, /recommend-upgrade (for kiosk)
// Private routes: /hot-picks, /admin/* (require protect middleware)

// ====================
// VALUE ANALYZER ROUTES
// ====================

/**
 * @route POST /api/ai/estimate-current-build
 * @desc Estimate user's current PC build using AI
 * @access Public (Kiosk users need this)
 * NEW - Phase 1: "Estimate My PC" Feature
 */
router.post('/estimate-current-build',
  expensiveAIRateLimit,
  aiController.estimateCurrentBuild.bind(aiController)
);
console.log('  ✅ Registered: POST /estimate-current-build (Public)');

/**
 * @route POST /api/ai/recommend-upgrade
 * @desc Get AI-powered upgrade recommendations based on current build
 * @access Public (Kiosk users need this)
 * NEW - Phase 2: AI Upgrade Recommendations
 */
router.post('/recommend-upgrade',
  expensiveAIRateLimit,
  aiController.recommendUpgrade.bind(aiController)
);
console.log('  ✅ Registered: POST /recommend-upgrade (Public)');

/**
 * @route POST /api/ai/recommend-cleaning-tier
 * @desc Get AI-powered cleaning tier recommendation based on assessment
 * @access Public (Kiosk users need this)
 * NEW - PC Cleaning Assessment Feature
 */
router.post('/recommend-cleaning-tier',
  aiController.recommendCleaningTier.bind(aiController)
);
console.log('  ✅ Registered: POST /recommend-cleaning-tier (Public)');

/**
 * @route POST /api/ai/hot-picks
 * @desc Generate Hot Picks recommendations for PC Parts homepage
 * @access Private (All authenticated users)
 */
router.post('/hot-picks',
  protect,
  restrictTo('superadmin', 'admin', 'developer'),
  aiController.getHotPicks.bind(aiController)
);
console.log('  ✅ Registered: POST /hot-picks (Private: superadmin, admin, developer)');

/**
 * @route POST /api/ai/value-for-money
 * @desc Generate Value for Money recommendations
 * @access Private (All authenticated users)
 */
router.post('/value-for-money',
  protect,
  restrictTo('superadmin', 'admin', 'developer'),
  aiController.getValueForMoney.bind(aiController)
);
console.log('  ✅ Registered: POST /value-for-money (Private: superadmin, admin, developer)');

/**
 * @route POST /api/ai/market-trends
 * @desc Analyze market trends and generate insights
 * @access Private (Admin and above)
 */
router.post('/market-trends',
  protect,
  restrictTo('superadmin', 'admin'),
  expensiveAIRateLimit,
  aiController.analyzeMarketTrends.bind(aiController)
);
console.log('  ✅ Registered: POST /market-trends (Private: superadmin, admin)');

// ====================
// COMPATIBILITY ANALYZER ROUTES
// ====================

/**
 * @route POST /api/ai/compatibility/analyze
 * @desc Analyze component compatibility for Product Page
 * @access Public (Kiosk users need this)
 */
router.post('/compatibility/analyze',
  aiController.analyzeCompatibility.bind(aiController)
);
console.log('  ✅ Registered: POST /compatibility/analyze (Public)');

/**
 * @route POST /api/ai/compatibility/find
 * @desc Find compatible components for a base component
 * @access Public (Kiosk users need this)
 */
router.post('/compatibility/find',
  aiController.findCompatibleComponents.bind(aiController)
);
console.log('  ✅ Registered: POST /compatibility/find (Public)');

// ====================
// BUILD OPTIMIZER ROUTES
// ====================

/**
 * @route POST /api/ai/build/optimize
 * @desc Optimize PC build configuration
 * @access Public (Kiosk users need this)
 */
router.post('/build/optimize',
  expensiveAIRateLimit,
  aiController.optimizeBuild.bind(aiController)
);
console.log('  ✅ Registered: POST /build/optimize (Public)');

/**
 * @route POST /api/ai/build/validate-compatibility
 * @desc Validate complete build compatibility
 * @access Public (Kiosk users need this)
 */
router.post('/build/validate-compatibility',
  aiController.validateBuildCompatibility.bind(aiController)
);
console.log('  ✅ Registered: POST /build/validate-compatibility (Public)');

/**
 * @route POST /api/ai/compatibility/validate-build (ALIAS)
 * @desc Alias for /build/validate-compatibility for backward compatibility
 * @access Public (Kiosk users need this)
 */
router.post('/compatibility/validate-build',
  aiController.validateBuildCompatibility.bind(aiController)
);
console.log('  ✅ Registered: POST /compatibility/validate-build (Public, Alias)');

/**
 * ROOT CAUSE FIX #4 & #5: Comprehensive build validation with form factor and bottleneck analysis
 * @route POST /api/ai/build/validate-comprehensive
 * @desc Validate build with form factor compatibility and bottleneck analysis
 * @access Public (Kiosk users need this)
 */
router.post('/build/validate-comprehensive',
  aiController.validateBuildComprehensive.bind(aiController)
);
console.log('  ✅ Registered: POST /build/validate-comprehensive (Public)');

/**
 * @route POST /api/ai/build/recommend-prebuilt
 * @desc Recommend pre-built PC configurations
 * @access Private (All authenticated users)
 */
router.post('/build/recommend-prebuilt',
  protect,
  restrictTo('superadmin', 'admin', 'developer'),
  aiController.recommendPreBuilds.bind(aiController)
);
console.log('  ✅ Registered: POST /build/recommend-prebuilt (Private)');

/**
 * @route POST /api/ai/build/optimize-budget
 * @desc Optimize build configuration for specific budget
 * @access Private (All authenticated users)
 */
router.post('/build/optimize-budget',
  protect,
  restrictTo('superadmin', 'admin', 'developer'),
  expensiveAIRateLimit,
  aiController.optimizeForBudget.bind(aiController)
);
console.log('  ✅ Registered: POST /build/optimize-budget (Private)');

// ====================
// DIAGNOSTIC ANALYZER ROUTES
// ====================

/**
 * @route POST /api/ai/diagnostics/pc-checkup
 * @desc Perform PC checkup and diagnostics
 * @access Private (All authenticated users)
 */
router.post('/diagnostics/pc-checkup',
  protect,
  restrictTo('superadmin', 'admin', 'developer'),
  expensiveAIRateLimit,
  aiController.performPCCheckup.bind(aiController)
);
console.log('  ✅ Registered: POST /diagnostics/pc-checkup (Private)');

/**
 * @route POST /api/ai/diagnostics/upgrade-analysis
 * @desc Analyze upgrade opportunities and recommendations
 * @access Private (All authenticated users)
 */
router.post('/diagnostics/upgrade-analysis',
  protect,
  restrictTo('superadmin', 'admin', 'developer'),
  expensiveAIRateLimit,
  aiController.analyzeUpgradeOptions.bind(aiController)
);
console.log('  ✅ Registered: POST /diagnostics/upgrade-analysis (Private)');

/**
 * @route POST /api/ai/upgrade (ALIAS)
 * @desc Alias for /recommend-upgrade for backward compatibility
 * @access Public (Kiosk users need this)
 */
router.post('/upgrade',
  expensiveAIRateLimit,
  aiController.recommendUpgrade.bind(aiController)
);
console.log('  ✅ Registered: POST /upgrade (Public, Alias)');

/**
 * @route POST /api/ai/future-upgrade (Future Upgrade In-Stock)
 * @desc Get AI-powered future upgrade recommendations from in-stock components
 * @access Public (Kiosk users need this)
 * NEW - Future Upgrade Feature for kiosk
 */
router.post('/future-upgrade',
  expensiveAIRateLimit,
  aiController.recommendUpgrade.bind(aiController)
);
console.log('  ✅ Registered: POST /future-upgrade (Public)');

/**
 * @route POST /api/ai/future-upgrade-external (Future Upgrade External)
 * @desc Get AI-powered future upgrade recommendations including external suggestions
 * @access Public (Kiosk users need this)
 * NEW - Future Upgrade Feature for kiosk with external recommendations
 */
router.post('/future-upgrade-external',
  expensiveAIRateLimit,
  aiController.recommendUpgrade.bind(aiController)
);
console.log('  ✅ Registered: POST /future-upgrade-external (Public)');

/**
 * @route POST /api/ai/diagnostics/recommend-services
 * @desc Recommend PC services based on system analysis
 * @access Private (All authenticated users)
 */
router.post('/diagnostics/recommend-services',
  protect,
  restrictTo('superadmin', 'admin', 'developer'),
  aiController.recommendServices.bind(aiController)
);
console.log('  ✅ Registered: POST /diagnostics/recommend-services (Private)');

/**
 * @route POST /api/ai/diagnostics/analyze-bottlenecks
 * @desc Analyze system performance bottlenecks
 * @access Private (All authenticated users)
 */
router.post('/diagnostics/analyze-bottlenecks',
  protect,
  restrictTo('superadmin', 'admin', 'developer'),
  aiController.analyzeBottlenecks.bind(aiController)
);
console.log('  ✅ Registered: POST /diagnostics/analyze-bottlenecks (Private)');

// ====================
// PRODUCT COMPARISON
// ====================

/**
 * @route POST /api/ai/compare-products
 * @desc Compare two products with AI value analysis
 * @access Public (kiosk usage)
 * NEW - Task 5: Product Comparison Feature
 */
router.post('/compare-products', aiController.compareProducts.bind(aiController));
console.log('  ✅ Registered: POST /compare-products (Public)');

// ====================
// ADMIN ANALYTICS ROUTES
// ====================

/**
 * PHASE 4: AI Fine-Tuning - Training Dataset Generation
 * @route POST /api/ai/training/generate-dataset
 * @desc Generate hardware examples training dataset from database
 * @access Private (Admin and above)
 * NEW - Phase 4: Generate training data for fine-tuning DeepSeek R1
 */
router.post('/training/generate-dataset',
  protect,
  restrictTo('superadmin', 'admin'),
  aiController.generateTrainingDataset.bind(aiController)
);
console.log('  ✅ Registered: POST /training/generate-dataset (Private: superadmin, admin)');

/**
 * @route GET /api/ai/admin/metrics
 * @desc Get comprehensive AI system metrics
 * @access Private (Admin and above)
 * NEW - Phase 4: Admin Dashboard Analytics
 */
router.get('/admin/metrics',
  protect,
  restrictTo('superadmin', 'admin'),
  aiController.getAIMetrics.bind(aiController)
);
console.log('  ✅ Registered: GET /admin/metrics (Private: superadmin, admin)');

/**
 * @route GET /api/ai/admin/top-upgrade-paths
 * @desc Get most popular upgrade paths from AI recommendations
 * @access Private (Admin and above)
 * NEW - Phase 4: Admin Dashboard Analytics
 */
router.get('/admin/top-upgrade-paths',
  protect,
  restrictTo('superadmin', 'admin'),
  aiController.getTopUpgradePaths.bind(aiController)
);
console.log('  ✅ Registered: GET /admin/top-upgrade-paths (Private: superadmin, admin)');

/**
 * @route GET /api/ai/admin/popular-components
 * @desc Get most ordered components from AI-assisted purchases
 * @access Private (Admin and above)
 * NEW - Phase 4: Admin Dashboard Analytics
 */
router.get('/admin/popular-components',
  protect,
  restrictTo('superadmin', 'admin'),
  aiController.getPopularComponents.bind(aiController)
);
console.log('  ✅ Registered: GET /admin/popular-components (Private: superadmin, admin)');

console.log('✅ All AI routes registered successfully!');

// ====================
// ERROR HANDLING
// ====================

// Global error handler for AI routes
router.use((error, req, res, next) => {
  logger.error('AI route error', {
    error: error.message,
    stack: error.stack,
    endpoint: req.path,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Determine error type and appropriate response
  let statusCode = 500;
  let message = 'Internal server error';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid request data';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Access forbidden';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'AI service temporarily unavailable';
  } else if (error.message && error.message.includes('timeout')) {
    statusCode = 504;
    message = 'AI service timeout';
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    data: null,
    error: process.env.NODE_ENV === 'development' ? {
      message: error.message,
      stack: error.stack
    } : undefined,
    timestamp: new Date().toISOString()
  });
});

// Handle 404 for AI routes
router.use('*', (req, res) => {
  logger.warn('AI route not found', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    message: 'AI endpoint not found',
    data: null,
    availableEndpoints: [
      'GET /api/ai/health',
      'POST /api/ai/estimate-current-build',
      'POST /api/ai/recommend-upgrade',
      'POST /api/ai/hot-picks',
      'POST /api/ai/value-for-money',
      'POST /api/ai/market-trends',
      'POST /api/ai/compare-products',
      'POST /api/ai/compatibility/analyze',
      'POST /api/ai/compatibility/find',
      'POST /api/ai/build/optimize',
      'POST /api/ai/build/validate-compatibility',
      'POST /api/ai/build/recommend-prebuilt',
      'POST /api/ai/build/optimize-budget',
      'POST /api/ai/diagnostics/pc-checkup',
      'POST /api/ai/diagnostics/upgrade-analysis',
      'POST /api/ai/diagnostics/recommend-services',
      'POST /api/ai/diagnostics/analyze-bottlenecks',
      'GET /api/ai/admin/metrics',
      'GET /api/ai/admin/top-upgrade-paths',
      'GET /api/ai/admin/popular-components'
    ]
  });
});

module.exports = router;
