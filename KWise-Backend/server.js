require('dotenv').config();

const isLoadTestMode = process.env.LOAD_TEST_MODE === 'true';
const isLiveStackLatencyTest = process.env.LIVE_STACK_LATENCY_TEST === 'true';

if (isLiveStackLatencyTest && process.env.LIVE_STACK_VERBOSE_LOGS !== 'true') {
    console.log = () => {};
    console.debug = () => {};
}

console.log('🚀 Starting K-Wise Backend Server...');
console.log('📂 Current directory:', process.cwd());
console.log('📋 Node version:', process.version);

const express = require('express');
const http = require('node:http');

// ==========================================
// 🔍 STEP 1: ROUTE DEBUGGER - FIND UNDEFINED HANDLERS
// ==========================================
console.log('\n🔍 Installing Route Debugger...');

// Intercept all route registration methods to catch undefined handlers
['post', 'get', 'put', 'delete', 'patch'].forEach(method => {
    const original = express.Router.prototype[method];
    express.Router.prototype[method] = function (...args) {
        const route = args[0];
        const handlers = args.slice(1);

        // Check each handler for undefined
        handlers.forEach((handler, idx) => {
            if (handler === undefined) {
                console.error('\n' + '='.repeat(60));
                console.error('❌ FOUND THE PROBLEM!');
                console.error('='.repeat(60));
                console.error(`Route: ${method.toUpperCase()} ${route}`);
                console.error(`Handler #${idx + 1} is UNDEFINED`);
                console.error('');
                console.error('🔍 This means one of these issues:');
                console.error('   1. Controller method name typo (most common)');
                console.error('   2. Middleware not defined before use');
                console.error('   3. Missing export in controller file');
                console.error('   4. Destructuring non-existent import');
                console.error('');
                console.error('💡 Check the route file that defines this route!');
                console.error('='.repeat(60) + '\n');

                // Create a detailed error
                const error = new Error(`Undefined handler in ${method.toUpperCase()} ${route}`);
                error.route = route;
                error.method = method;
                error.handlerIndex = idx + 1;
                throw error;
            }
        });

        return original.apply(this, args);
    };
});

console.log('✅ Route Debugger installed - Will catch undefined handlers!\n');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const fs = require('node:fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cron = require('node-cron');
const compression = require('compression');
const { csrfProtection } = require('./middleware/csrfProtection');
const { createHotReadCache } = require('./middleware/hotReadCache');

const isLocalAddress = (value) => {
    if (!value) return false;
    return value === '127.0.0.1'
        || value === '::1'
        || value === 'localhost'
        || value.endsWith(':127.0.0.1');
};

const isLocalRequest = (req) => [
    req.ip,
    req.connection?.remoteAddress,
    req.socket?.remoteAddress
].some(isLocalAddress);
const isControlledStressHeader = (req) => (
    typeof req.headers['x-kwise-stress-phase'] === 'string'
    && isLocalRequest(req)
);
const isLocalKioskHotPath = (req) => {
    if (!isLocalRequest(req)) return false;

    const requestPath = req.path || '';
    if (requestPath.startsWith('/assets/') || requestPath.startsWith('/uploads/')) {
        return true;
    }

    if (requestPath === '/api/ip/check' || requestPath.startsWith('/api/health')) {
        return true;
    }

    if (req.method === 'GET' && /^\/api\/(kiosk|stock)(\/|$)/.test(requestPath)) {
        return true;
    }

    return req.method === 'POST'
        && /^\/api\/compatibility\/(analyze|batch|batch-analyze|ram-slots|storage-slots|matrix\/quick-check)(\/|$)/.test(requestPath);
};
const skipControlledStressRateLimit = (req) => (
    isLiveStackLatencyTest || isControlledStressHeader(req) || isLocalKioskHotPath(req) || (isLoadTestMode && isLocalRequest(req))
);

// Safe database import with fallback
let connectDB, query, closePool;
try {
    const db = require('./config/db');
    connectDB = db.connectDB;
    query = db.query;
    closePool = db.closePool;
    console.log('✅ Database config loaded');
} catch (error) {
    console.error('⚠️ Database config failed to load:', error.message);
    // Create dummy functions
    connectDB = async () => {
        console.log('⚠️ Using dummy database connection');
        return true;
    };
    query = async () => {
        console.log('⚠️ Using dummy database query');
        return { rows: [] };
    };
    closePool = async () => console.log('⚠️ Dummy pool close');
}

// Safe logger import with fallback
let logger;
try {
    logger = require('./utils/logger');
    console.log('✅ Logger loaded');
} catch (error) {
    console.error('⚠️ Logger failed to load:', error.message);
    logger = {
        info: console.log,
        error: console.error,
        warn: console.warn
    };
}

const DIRECT_ALLOWED_ORIGINS = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    process.env.FRONTEND_URL
].filter(Boolean));

const NETWORK_ALLOWED_ORIGIN_PATTERNS = [
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:(3000|3001|5000)$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}:(3000|3001|5000)$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(3000|3001|5000)$/
];

const DEFAULT_CORS_METHODS = 'GET,POST,PUT,DELETE,PATCH,OPTIONS';
const DEFAULT_CORS_HEADERS = 'Content-Type,Authorization,X-CSRF-Token,X-Requested-With,X-KWise-Idempotency-Key,X-KWise-Stress-Phase,Cache-Control,Accept,Accept-Language,Accept-Encoding';

const isAllowedOrigin = (origin) => {
    if (!origin) {
        return true;
    }

    return DIRECT_ALLOWED_ORIGINS.has(origin)
        || NETWORK_ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
};

const getAllowedOriginFromRequest = (req) => {
    const origin = req.headers.origin;
    if (typeof origin === 'string' && isAllowedOrigin(origin)) {
        return origin;
    }

    const referer = req.headers.referer;
    if (typeof referer !== 'string') {
        return null;
    }

    try {
        const refererOrigin = new URL(referer).origin;
        return isAllowedOrigin(refererOrigin) ? refererOrigin : null;
    } catch (error) {
        logger.warn('Invalid referer header received', { referer, error: error.message });
        return null;
    }
};

const applyCorsHeaders = (res, origin, methods = DEFAULT_CORS_METHODS, headers = DEFAULT_CORS_HEADERS) => {
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Vary', 'Origin');
    }

    res.header('Access-Control-Allow-Methods', methods);
    res.header('Access-Control-Allow-Headers', headers);
};

const sanitizeSocketMessage = (value) => value
    .replaceAll(/<[^>]*>/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .trim();

const describeUnhandledReason = (reason) => {
    if (reason instanceof Error) {
        return {
            message: reason.message,
            stack: reason.stack
        };
    }

    if (typeof reason === 'string') {
        return { message: reason };
    }

    try {
        return { message: JSON.stringify(reason) };
    } catch (error) {
        return { message: String(reason), serializationError: error.message };
    }
};

const app = express();
const { installLatencyTrace, getLatencyTraceBuffer } = require('./middleware/latencyTrace');
const { getDbQueryTraceBuffer } = require('./utils/dbQueryTrace');
installLatencyTrace(app, logger);

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: false,
})
);
app.use(compression({ threshold: 1024 }));
// HTTP request logging (skip in test)
if (process.env.NODE_ENV !== 'test' && !isLiveStackLatencyTest) {
    app.use(morgan('dev'));
}

// Comprehensive Activity Logging Middleware
const { autoLogActivity, logUIInteraction } = require('./middleware/activityLogger');
// Auth middleware for protecting routes
const { protect, restrictTo } = require('./middleware/auth');

// =====================================================
// 🔒 IP FIREWALL - MUST RUN BEFORE ALL OTHER MIDDLEWARE
// =====================================================
const { ipFirewall } = require('./middleware/ipFirewall');
// IP Firewall will be applied after CORS and body parsing

// Enhanced rate limiting with route-specific configurations
// Load testing mode: Set LOAD_TEST_MODE=true in .env to disable rate limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (isLoadTestMode || isLiveStackLatencyTest) ? 1000000 : 1000, // Effectively unlimited in controlled local stress mode
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }, // Disable validation, we handle proxy manually
    message: {
        error: 'Too many requests from this IP, please try again later',
        retryAfter: '15 minutes'
    },
    skip: skipControlledStressRateLimit
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (isLoadTestMode || isLiveStackLatencyTest) ? 1000000 : 60,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: {
        error: 'Too many authentication requests from this IP, please try again later',
        retryAfter: '15 minutes'
    },
    skip: skipControlledStressRateLimit
});

const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: (isLoadTestMode || isLiveStackLatencyTest) ? 1000000 : 240,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: {
        error: 'Admin request rate limit exceeded',
        retryAfter: '1 minute'
    },
    skip: skipControlledStressRateLimit
});

// Very permissive limiter for real-time endpoints (messaging, notifications)
const realtimeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 500, // 500 requests per minute for polling endpoints (much more permissive)
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }, // Disable validation, we handle proxy manually
    message: {
        error: 'Rate limit exceeded for real-time features',
        retryAfter: '1 minute'
    },
    skip: skipControlledStressRateLimit
});

// Ultra-permissive limiter for frequent polling endpoints
const pollingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 requests per minute for high-frequency polling
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }, // Disable validation, we handle proxy manually
    message: {
        error: 'Polling rate limit exceeded',
        retryAfter: '1 minute'
    },
    skip: skipControlledStressRateLimit
});

// Ultra-permissive limiter for kiosk endpoints (users switching categories rapidly)
const kioskLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: (isLoadTestMode || isLiveStackLatencyTest) ? 1000000 : 1200,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }, // Disable validation, we handle proxy manually
    skipSuccessfulRequests: true, // Don't count successful requests against limit
    skip: skipControlledStressRateLimit,
    message: {
        error: 'Kiosk rate limit exceeded',
        retryAfter: '1 minute'
    }
});

// =====================================================
// 🌐 TRUST PROXY - Essential for IP detection
// =====================================================
// FIX #7: MUST be set BEFORE rate limiter and CORS — was incorrectly placed after them
app.set('trust proxy', 'loopback');
console.log('✅ Trust proxy enabled - will detect real client IPs');

// Enhanced CORS configuration - BEFORE rate limiting to handle preflight requests
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            callback(null, true);
            return;
        }

        if (isAllowedOrigin(origin)) {
            // FIX #8: Only log CORS in dev to prevent production log pollution
            if (process.env.NODE_ENV !== 'production') {
                console.log(`✅ CORS allowed for origin: ${origin}`);
            }
            callback(null, true);
        } else {
            console.log(`⚠️ CORS denied for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'X-Requested-With',
        'X-KWise-Idempotency-Key',
        'X-KWise-Stress-Phase',
        'Cache-Control',
        'Accept',
        'Accept-Language',
        'Accept-Encoding'
    ],
    optionsSuccessStatus: 200 // For legacy browser support
}));

// Handle preflight OPTIONS requests before rate limiting
app.options('*', (req, res) => {
    applyCorsHeaders(res, getAllowedOriginFromRequest(req));
    res.sendStatus(200);
});

if (isLiveStackLatencyTest) {
    app.get('/api/_debug/live-stack-trace', (req, res) => {
        if (!isLocalRequest(req)) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        return res.json({
            success: true,
            requests: getLatencyTraceBuffer(),
            dbQueries: getDbQueryTraceBuffer(),
            timestamp: new Date().toISOString()
        });
    });
}

app.use(globalLimiter); // Re-enabled after fixing infinite loop

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(csrfProtection);

// =====================================================
// 🔒 IP FIREWALL MIDDLEWARE - Network-level security
// =====================================================
// CRITICAL: Must run AFTER body parsing but BEFORE routes
// This ensures IP blocking works for both kiosk and admin
app.use(ipFirewall);
console.log('✅ IP Firewall middleware enabled');

// PHASE 3.2 WEEK 2: Prometheus metrics middleware for monitoring
try {
    const prometheusMetrics = require('./services/prometheusMetrics');

    // Metrics already initialized in singleton constructor

    // Add request tracking middleware
    app.use((req, res, next) => {
        const startTime = Date.now();
        const requestSize = Number.parseInt(req.headers['content-length'] || '0', 10);

        // Track response
        const originalSend = res.send;
        res.send = function (data) {
            const duration = Date.now() - startTime;
            const responseSize = Buffer.byteLength(JSON.stringify(data || ''));

            // Record HTTP metrics
            prometheusMetrics.recordHttpRequest(
                req.method,
                req.route?.path || req.path,
                res.statusCode,
                duration,
                requestSize,
                responseSize
            );

            return originalSend.call(this, data);
        };

        next();
    });

    // Make prometheus metrics globally available
    globalThis.prometheusMetrics = prometheusMetrics;

    console.log('✅ Prometheus metrics middleware initialized');
} catch (metricsError) {
    console.warn('⚠️ Prometheus metrics initialization failed:', metricsError.message);
    console.warn('📊 Metrics collection will be disabled');
}

const kioskHotReadCacheMs = Number.parseInt(process.env.KIOSK_HOT_READ_CACHE_MS || '30000', 10);
const stockHotReadCacheMs = Number.parseInt(process.env.STOCK_HOT_READ_CACHE_MS || '15000', 10);
const healthHotReadCacheMs = Number.parseInt(process.env.HEALTH_HOT_READ_CACHE_MS || '30000', 10);
app.use('/api/health', createHotReadCache({
    ttlMs: healthHotReadCacheMs,
    maxEntries: 16
}));
app.use('/api/kiosk', createHotReadCache({
    ttlMs: kioskHotReadCacheMs,
    maxEntries: 256
}));
app.use('/api/stock', createHotReadCache({
    ttlMs: stockHotReadCacheMs,
    maxEntries: 512
}));

const healthDependencyCache = {
    expiresAt: 0,
    value: null
};

async function getHealthDependencySnapshot() {
    const ttlMs = Number.parseInt(process.env.HEALTH_CHECK_CACHE_MS || '1000', 10);
    const now = Date.now();
    if (healthDependencyCache.value && healthDependencyCache.expiresAt > now) {
        return healthDependencyCache.value;
    }

    let databaseStatus = 'Unknown';
    try {
        const dbResult = await query('SELECT NOW() as current_time');
        databaseStatus = dbResult.rows && dbResult.rows.length > 0 ? 'Connected' : 'Error';
    } catch (dbError) {
        databaseStatus = 'Disconnected';
        logger.error('Database health check failed:', dbError.message);
    }

    let cacheStatus = { status: 'Not available' };
    try {
        const cacheResult = await query('SELECT COUNT(*) as count FROM compatibility_cache WHERE expires_at > NOW()');
        cacheStatus = {
            status: 'warmed',
            entries: Number.parseInt(cacheResult.rows[0].count, 10)
        };
    } catch (cacheError) {
        logger.debug('Cache health check skipped:', cacheError.message);
        cacheStatus = { status: 'Unknown' };
    }

    healthDependencyCache.value = { databaseStatus, cacheStatus };
    healthDependencyCache.expiresAt = now + ttlMs;
    return healthDependencyCache.value;
}

// Health endpoint with polling limiter for frequent health checks
app.get('/api/health', pollingLimiter, async (req, res) => {
    try {
        const { databaseStatus, cacheStatus } = await getHealthDependencySnapshot();

        const aiStatus = {
            status: 'disabled',
            source: 'offline_kiosk',
            aiEnabled: false,
            engine: 'deterministic',
            message: 'AI, ML, embeddings, and Ollama checks are disabled'
        };

        res.json({
            status: 'success',
            message: 'K-Wise server is healthy',
            timestamp: new Date().toISOString(),
            server: 'server.js',
            database: databaseStatus,
            aiEnabled: false,
            engine: 'deterministic',
            ai: aiStatus,
            cache: cacheStatus
        });
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Disabled AI health endpoint
app.get('/api/health/ai', pollingLimiter, async (req, res) => {
    res.status(410).json({
        success: false,
        code: 'AI_REMOVED',
        source: 'deterministic',
        aiEnabled: false,
        message: 'AI health checks are disabled in offline kiosk mode',
        timestamp: new Date().toISOString()
    });
});

// Health metrics endpoint (JSON format)
app.get('/api/health/metrics', pollingLimiter, async (req, res) => {
    try {
        if (globalThis.prometheusMetrics) {
            const metrics = await globalThis.prometheusMetrics.getMetricsJSON();
            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                success: false,
                message: 'Metrics collection not initialized'
            });
        }
    } catch (error) {
        logger.error('Failed to get health metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get health metrics',
            error: error.message
        });
    }
});

// PHASE 3.2 WEEK 2: Prometheus metrics endpoint for scraping
app.get('/metrics', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        if (globalThis.prometheusMetrics) {
            const metrics = await globalThis.prometheusMetrics.getMetrics();
            res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
            res.send(metrics);
        } else {
            res.status(503).json({
                error: 'Metrics collection not initialized'
            });
        }
    } catch (error) {
        logger.error('Failed to generate metrics:', error);
        res.status(500).json({
            error: 'Failed to generate metrics',
            message: error.message
        });
    }
});

// Prometheus metrics endpoint (JSON format for admin dashboard)
app.get('/api/metrics/json', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        if (globalThis.prometheusMetrics) {
            const metrics = await globalThis.prometheusMetrics.getMetricsJSON();
            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                success: false,
                message: 'Metrics collection not initialized'
            });
        }
    } catch (error) {
        logger.error('Failed to generate JSON metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate metrics',
            error: error.message
        });
    }
});

// ========================================
// 🖼️ STATIC FILE SERVING - SINGLE SOURCE OF TRUTH
// ========================================
// CRITICAL: Serve ONLY from public/assets to avoid confusion
// All image uploads go to: public/assets/parts/{category}/
// Database stores paths as: /assets/parts/{category}/filename
// Frontend requests: http://localhost:5000/assets/parts/{category}/filename

const PUBLIC_ASSETS_DIR = path.join(__dirname, 'public', 'assets');
console.log('🌐 Configuring static file serving:');
console.log(`   Assets directory: ${PUBLIC_ASSETS_DIR}`);

// Verify directory exists
if (!fs.existsSync(PUBLIC_ASSETS_DIR)) {
    console.error('❌ PUBLIC ASSETS DIRECTORY NOT FOUND:', PUBLIC_ASSETS_DIR);
    fs.mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });
    console.log('✅ Created public/assets directory');
}

app.use('/assets', (req, res, next) => {
    const allowedOrigin = getAllowedOriginFromRequest(req);

    // FIX #8: Removed verbose CORS logging for static assets
    if (allowedOrigin) {
        applyCorsHeaders(res, allowedOrigin, 'GET, HEAD, OPTIONS', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
    } else {
        applyCorsHeaders(res, null, 'GET, HEAD, OPTIONS', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
    }

    res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
    res.header('Cache-Control', 'public, max-age=31536000'); // Cache images for 1 year
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Content-Security-Policy', "default-src 'none'; img-src 'self' data: blob:; media-src 'self'; style-src 'none'; script-src 'none'");

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log(`🔄 OPTIONS request for: ${req.path}`);
        return res.sendStatus(200);
    }

    next();
}, express.static(PUBLIC_ASSETS_DIR));

// Serve uploads directory for profile images and other uploads
app.use('/uploads', (req, res, next) => {
    const allowedOrigin = getAllowedOriginFromRequest(req);

    applyCorsHeaders(res, allowedOrigin, 'GET, HEAD, OPTIONS', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache uploads for 24 hours
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Content-Security-Policy', "default-src 'none'; img-src 'self' data: blob:; media-src 'self'; style-src 'none'; script-src 'none'");

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
}, express.static(path.join(__dirname, 'uploads')));

// Safe route imports with fallbacks
const safeRequireRoute = (routePath, routeName) => {
    try {
        console.log(`🔧 Loading ${routeName} from ${routePath}...`);
        const route = require(routePath);
        console.log(`✅ ${routeName} loaded successfully`);
        return route;
    } catch (error) {
        console.error(`❌ ${routeName} failed to load:`, error.message);
        // Return a dummy router
        const router = express.Router();
        router.get('*', (req, res) => {
            res.status(503).json({
                error: `${routeName} temporarily unavailable`,
                message: 'Service is starting up'
            });
        });
        router.post('*', (req, res) => {
            res.status(503).json({
                error: `${routeName} temporarily unavailable`,
                message: 'Service is starting up'
            });
        });
        return router;
    }
};

const createDisabledAIRouter = (featureName) => {
    const router = express.Router();
    router.use((req, res) => {
        res.status(410).json({
            success: false,
            code: 'AI_REMOVED',
            source: 'deterministic',
            feature: featureName,
            message: `${featureName} is disabled in offline kiosk mode`
        });
    });
    return router;
};

// Load core routes
console.log('🔧 Loading core routes...');
const authRoutes = safeRequireRoute('./routes/auths', 'Auth routes');
const userRoutes = safeRequireRoute('./routes/users', 'User routes');
const stockRoutes = safeRequireRoute('./routes/stock', 'Stock routes');
const ordersRoutes = safeRequireRoute('./routes/orders', 'Orders routes');
const settingsRoutes = safeRequireRoute('./routes/settings', 'Settings routes');
const dashboardRoutes = safeRequireRoute('./routes/dashboard', 'Dashboard routes');
const logsRoutes = safeRequireRoute('./routes/logs', 'Logs routes');
const devToolsRoutes = safeRequireRoute('./routes/dev', 'Dev tools routes');
const queueRoutes = safeRequireRoute('./routes/queue', 'Queue management routes');

// Load additional routes
console.log('🔧 Loading additional routes...');
const healthRoutes = express.Router(); // Offline health endpoints are defined inline without Ollama.
const auditLogs = safeRequireRoute('./routes/audit-logs', 'Audit logs');
const adminRoutes = safeRequireRoute('./routes/admin', 'Admin routes');
const imageRoutes = safeRequireRoute('./routes/images', 'Image routes');
const messagesRoutes = safeRequireRoute('./routes/messages', 'Messages routes');
const notificationsRoutes = safeRequireRoute('./routes/notifications', 'Notifications routes');
const searchRoutes = safeRequireRoute('./routes/search', 'Search routes');
const profileRoutes = safeRequireRoute('./routes/profile', 'Profile routes');
const builderRoutes = safeRequireRoute('./routes/builder', 'PC Builder routes');
const assistanceRoutes = safeRequireRoute('./routes/assistanceRoutes', 'Assistance Request routes');

// Load AI routes
console.log('🔧 Loading AI integration routes...');
const aiRoutes = createDisabledAIRouter('AI runtime');

// Load PC Upgrade Parameters routes
console.log('🔧 Loading PC Upgrade Parameters routes...');
const pcUpgradeParametersRoutes = safeRequireRoute('./routes/pcUpgradeParameters', 'PC Upgrade Parameters routes');

// Legacy PC Customized AI reference-build routes stay mounted as disabled responses.
console.log('Loading disabled PC Customized AI Reference Builds routes...');
const pcCustomizedAIBuildsRoutes = createDisabledAIRouter('PC Customized AI reference builds');

// Load Reference Builds routes
console.log('🔧 Loading Reference Builds routes...');
const referenceBuildsRoutes = safeRequireRoute('./routes/referenceBuilds', 'Reference Builds routes');

// PHASE 4 & 5: Load AI Metrics routes
console.log('📊 Loading AI Metrics routes...');
const aiMetricsRoutes = createDisabledAIRouter('AI metrics');

// PHASE 2.2: Load Cache Management routes
console.log('🗄️ Loading Cache Management routes...');
const cacheRoutes = safeRequireRoute('./routes/cacheRoutes', 'Cache Management routes');

// Database initialization
const initializeDatabase = async () => {
    try {
        console.log('🔌 Initializing database connection...');
        await connectDB();
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async (options = {}) => {
    const requestedListen = options.listen === undefined ? true : options.listen;
    // Force no network listener under test to avoid port conflicts across suites
    const listen = process.env.NODE_ENV === 'test' ? false : requestedListen;
    try {
        console.log('🚀 Starting K-Wise Backend Server...');
        console.log('📋 Environment:', process.env.NODE_ENV || 'development');
        console.log('🔧 Port:', PORT);

        // Initialize database
        const dbSuccess = await initializeDatabase();
        if (!dbSuccess) {
            console.log('⚠️ Database initialization failed - starting in limited mode');
        }

        // Mount routes with comprehensive error tracking
        console.log('🚀 Mounting API routes...');

        const safeMountRoute = (path, ...handlers) => {
            try {
                console.log(`  → Mounting ${path}...`);
                app.use(path, ...handlers);
                console.log(`  ✅ ${path} mounted`);
                return true;
            } catch (error) {
                console.error(`  ❌ FAILED to mount ${path}:`, error.message);
                console.error(`     Stack: ${error.stack}`);
                console.error(`     Handlers:`, handlers.map((h, i) => `[${i}]: ${typeof h} ${h?.name || 'anonymous'}`).join(', '));
                throw error; // Re-throw to stop server
            }
        };

        // Mount routes with appropriate rate limiting
        safeMountRoute('/api/health', pollingLimiter, healthRoutes);
        safeMountRoute('/api/auth', authLimiter, authRoutes);
        safeMountRoute('/api/users', userRoutes);
        safeMountRoute('/api/stock', kioskLimiter, stockRoutes);
        safeMountRoute('/api/builder', builderRoutes);

        // Products API for search and filtering
        const productsRoutes = safeRequireRoute('./routes/products', 'Products routes');
        safeMountRoute('/api/products', productsRoutes);

        // Kiosk API endpoints - INLINE FOR SINGLE SERVER APPROACH

        // Apply kiosk rate limiter to all kiosk endpoints
        app.use('/api/kiosk*', kioskLimiter);

        // Legacy inline kiosk browse handlers are disabled by default so
        // KWise-Backend/routes/kiosk.js remains the single kiosk API source.
        if (process.env.KWISE_ENABLE_INLINE_KIOSK_ROUTES === 'true') {

        // Categories endpoint with peripherals consolidation
        app.get('/api/kiosk/categories', async (req, res) => {
            try {
                console.log('📊 Fetching kiosk categories...');

                const result = await query(`
                    SELECT
                        category,
                        COUNT(*) as product_count,
                        MIN(price) as min_price,
                        MAX(price) as max_price,
                        SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as in_stock_count,
                        COALESCE(kiosk_category_order, 999) as kiosk_category_order
                    FROM pc_parts
                    WHERE is_active = true
                    AND (kiosk_visible IS NULL OR kiosk_visible = true)
                    AND stock > 0
                    GROUP BY category, kiosk_category_order
                    ORDER BY kiosk_category_order, category
                `);

                console.log(`📈 Found ${result.rows.length} categories`);

                // Consolidate peripherals
                const peripheralCategories = new Set(['Monitor', 'Keyboard', 'Mouse', 'Headphones', 'Speakers', 'Webcam']);
                let peripheralData = {
                    category: 'Peripherals',
                    name: 'Peripherals',
                    productCount: 0,
                    minPrice: Infinity,
                    maxPrice: 0,
                    inStockCount: 0,
                    order: 150,
                    subCategories: []
                };

                const regularCategories = [];

                result.rows.forEach(row => {
                    if (peripheralCategories.has(row.category)) {
                        peripheralData.productCount += Number.parseInt(row.product_count, 10);
                        peripheralData.minPrice = Math.min(peripheralData.minPrice, Number.parseFloat(row.min_price));
                        peripheralData.maxPrice = Math.max(peripheralData.maxPrice, Number.parseFloat(row.max_price));
                        peripheralData.inStockCount += Number.parseInt(row.in_stock_count, 10);

                        peripheralData.subCategories.push({
                            category: row.category,
                            name: row.category,
                            productCount: Number.parseInt(row.product_count, 10),
                            minPrice: Number.parseFloat(row.min_price),
                            maxPrice: Number.parseFloat(row.max_price),
                            inStockCount: Number.parseInt(row.in_stock_count, 10),
                            order: Number.parseInt(row.kiosk_category_order, 10)
                        });
                    } else {
                        regularCategories.push({
                            category: row.category,
                            name: row.category,
                            productCount: Number.parseInt(row.product_count, 10),
                            minPrice: Number.parseFloat(row.min_price),
                            maxPrice: Number.parseFloat(row.max_price),
                            inStockCount: Number.parseInt(row.in_stock_count, 10),
                            order: Number.parseInt(row.kiosk_category_order, 10)
                        });
                    }
                });

                if (peripheralData.minPrice === Infinity) peripheralData.minPrice = 0;
                peripheralData.subCategories.sort((a, b) => a.order - b.order);

                const categories = [...regularCategories];
                if (peripheralData.productCount > 0) {
                    categories.push(peripheralData);
                }

                categories.sort((a, b) => a.order - b.order);

                console.log(`✅ Returning ${categories.length} categories (${peripheralData.productCount} peripheral products)`);

                res.json({
                    success: true,
                    data: categories,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error fetching categories:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch categories',
                    error: error.message
                });
            }
        });

        // Category products endpoint - ONLY show in-stock items
        app.get('/api/kiosk/categories/:category/products', async (req, res) => {
            try {
                const { category } = req.params;
                const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = req.query;

                console.log(`📦 Fetching products for category: ${category}`);

                const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
                const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
                const offset = (parsedPage - 1) * parsedLimit;
                const kioskSortMap = { 'name': 'name', 'price': 'price', 'brand': 'brand', 'stock': 'stock' };
                const validSortBy = kioskSortMap[sortBy] || 'name';
                const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

                // FIX #5: Get total count BEFORE pagination for correct totalPages/totalItems
                const countResult = await query(`
                    SELECT COUNT(*) as total
                    FROM pc_parts
                    WHERE is_active = true
                    AND (kiosk_visible IS NULL OR kiosk_visible = true)
                    AND LOWER(category) = LOWER($1)
                    AND stock > 0
                `, [category]);
                const totalItems = Number.parseInt(countResult.rows[0].total, 10);
                const totalPages = Math.ceil(totalItems / parsedLimit);

                const result = await query(`
                    SELECT
                        id, name, category, brand, price, stock,
                        COALESCE(image_url, image_path) AS image_url,
                        specifications, dimensions, description,
                        COALESCE(on_sale, false) as on_sale,
                        sale_price, sale_start_date, sale_end_date
                    FROM pc_parts
                    WHERE is_active = true
                    AND (kiosk_visible IS NULL OR kiosk_visible = true)
                    AND LOWER(category) = LOWER($1)
                    AND stock > 0
                    ORDER BY ${validSortBy} ${validSortOrder}
                    LIMIT $2 OFFSET $3
                `, [category, parsedLimit, offset]);

                const products = result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    brand: row.brand,
                    price: Number.parseFloat(row.price),
                    salePrice: row.sale_price ? Number.parseFloat(row.sale_price) : null,
                    effectivePrice: row.on_sale && row.sale_price ? Number.parseFloat(row.sale_price) : Number.parseFloat(row.price),
                    stock: Number.parseInt(row.stock, 10),
                    imageUrl: row.image_url,
                    specifications: row.specifications,
                    dimensions: row.dimensions,
                    description: row.description,
                    onSale: row.on_sale,
                    available: true // Only in-stock items are returned
                }));

                console.log(`✅ Returning ${products.length} products for ${category} (${totalItems} total)`);

                // FIX #5: Use totalItems from COUNT query, not filtered array length
                res.json({
                    success: true,
                    data: {
                        items: products,
                        pagination: {
                            currentPage: parsedPage,
                            totalPages: totalPages,
                            totalItems: totalItems,
                            itemsPerPage: parsedLimit,
                            hasNext: parsedPage < totalPages,
                            hasPrev: parsedPage > 1
                        },
                        filters: {
                            category,
                            inStock: true
                        }
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error(`❌ Error fetching products for ${category}:`, error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch products',
                    error: error.message
                });
            }
        });

        // Featured products endpoint
        // OPTIMIZED: TABLESAMPLE instead of ORDER BY RANDOM() (avoids full table scan)
        app.get('/api/kiosk/featured', async (req, res) => {
            try {
                console.log('🔥 Fetching featured products...');

                const result = await query(`
                    SELECT
                        id, name, category, brand, price, stock,
                        COALESCE(image_url, image_path) AS image_url,
                        specifications, dimensions, description,
                        COALESCE(on_sale, false) as on_sale,
                        sale_price
                    FROM pc_parts TABLESAMPLE SYSTEM(10)
                    WHERE is_active = true
                      AND (kiosk_visible IS NULL OR kiosk_visible = true)
                      AND stock > 0
                    ORDER BY RANDOM()
                    LIMIT 25
                `);

                const products = result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    brand: row.brand,
                    price: Number.parseFloat(row.price),
                    salePrice: row.sale_price ? Number.parseFloat(row.sale_price) : null,
                    effectivePrice: row.on_sale && row.sale_price ? Number.parseFloat(row.sale_price) : Number.parseFloat(row.price),
                    stock: Number.parseInt(row.stock, 10),
                    imageUrl: row.image_url,
                    specifications: row.specifications,
                    dimensions: row.dimensions,
                    description: row.description,
                    onSale: row.on_sale,
                    available: true
                }));

                console.log(`✅ Returning ${products.length} featured products`);

                res.json({
                    success: true,
                    data: products,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error fetching featured products:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch featured products',
                    error: error.message
                });
            }
        });

        // On-sale products endpoint - for kiosk display only
        app.get('/api/kiosk/on-sale', async (req, res) => {
            try {
                console.log('💰 Fetching on-sale products...');

                const result = await query(`
                    SELECT
                        id, name, category, brand, price, sale_price, stock,
                        COALESCE(image_url, image_path) AS image_url,
                        specifications, dimensions, description, on_sale
                    FROM pc_parts
                    WHERE is_active = true
                    AND (kiosk_visible IS NULL OR kiosk_visible = true)
                    AND on_sale = true
                    AND stock > 0
                    ORDER BY updated_at DESC
                    LIMIT 10
                `);

                const products = result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    brand: row.brand,
                    price: Number.parseFloat(row.price),
                    salePrice: Number.parseFloat(row.sale_price),
                    effectivePrice: Number.parseFloat(row.sale_price),
                    stock: Number.parseInt(row.stock, 10),
                    imageUrl: row.image_url,
                    specifications: row.specifications,
                    dimensions: row.dimensions,
                    description: row.description,
                    onSale: row.on_sale,
                    available: true
                }));

                console.log(`✅ Returning ${products.length} on-sale products`);

                res.json({
                    success: true,
                    data: products,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error fetching on-sale products:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch on-sale products',
                    error: error.message
                });
            }
        });

        // Build components endpoint for PC customization
        // OPTIMIZED: Single query with ANY() instead of 8 sequential queries (N+1 → 1)
        app.get('/api/kiosk/build-components', async (req, res) => {
            try {
                const buildCategories = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling'];

                // Single query fetches all categories at once
                const result = await query(`
                    SELECT
                        id, name, category, brand, price, stock,
                        COALESCE(image_url, image_path) AS image_url,
                        specifications, dimensions, description
                    FROM pc_parts
                    WHERE is_active = true
                      AND (kiosk_visible IS NULL OR kiosk_visible = true)
                      AND LOWER(category) = ANY($1::text[])
                      AND stock > 0
                    ORDER BY category, price ASC
                `, [buildCategories.map(c => c.toLowerCase())]);

                // Group results by category in memory
                const buildComponents = {};
                for (const category of buildCategories) {
                    buildComponents[category.toLowerCase()] = { products: [], brands: [] };
                }

                for (const row of result.rows) {
                    const catKey = row.category.toLowerCase();
                    if (buildComponents[catKey] && buildComponents[catKey].products.length < 10) {
                        buildComponents[catKey].products.push({
                            id: row.id,
                            name: row.name,
                            category: row.category,
                            brand: row.brand,
                            price: Number.parseFloat(row.price),
                            stock: Number.parseInt(row.stock, 10),
                            imageUrl: row.image_url,
                            specifications: row.specifications,
                            dimensions: row.dimensions,
                            description: row.description,
                            available: true
                        });
                        if (row.brand && !buildComponents[catKey].brands.includes(row.brand)) {
                            buildComponents[catKey].brands.push(row.brand);
                        }
                    }
                }

                res.json({
                    success: true,
                    data: buildComponents,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error fetching build components:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch build components',
                    error: error.message
                });
            }
        });

        }

        // Admin sale management endpoint - THIS IS WHERE THE MAKE ON SALE FUNCTIONALITY IS
        // SECURITY FIX: Requires authentication + admin role
        app.put('/api/stock/:id/sale', protect, require('./middleware/roleCheck').isAdmin, async (req, res) => {
            try {
                const { id } = req.params;
                const { on_sale, sale_price, sale_start_date, sale_end_date } = req.body;

                console.log(`💰 Admin: Updating sale status for product ${id}:`, { on_sale, sale_price });

                const result = await query(`
                    UPDATE pc_parts
                    SET on_sale = $1,
                        sale_price = $2,
                        sale_start_date = $3,
                        sale_end_date = $4,
                        updated_at = NOW()
                    WHERE id = $5
                    RETURNING id, name, price, on_sale, sale_price
                `, [
                    on_sale || false,
                    on_sale ? sale_price : null,
                    on_sale && sale_start_date ? sale_start_date : null,
                    on_sale && sale_end_date ? sale_end_date : null,
                    id
                ]);

                if (result.rows.length > 0) {
                    console.log(`✅ Sale status updated for: ${result.rows[0].name}`);
                    res.json({
                        success: true,
                        message: on_sale ? 'Product added to sale successfully' : 'Product removed from sale successfully',
                        data: result.rows[0]
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        message: 'Product not found'
                    });
                }

            } catch (error) {
                console.error('❌ Error updating sale status:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update sale status',
                    error: error.message
                });
            }
        });

        // Mount services routes for kiosk real-time services (cleaning, checkup, diagnostic)
        const servicesRoutes = require('./routes/services');
        app.use('/api/services', servicesRoutes);

        // Debug middleware for kiosk orders
        app.use('/api/kiosk/orders', (req, res, next) => {
            logger.info('🔍 DEBUG - Kiosk order middleware check:');
            logger.info('Method:', req.method);
            logger.info('Content-Type:', req.headers['content-type']);
            logger.info('Body keys:', Object.keys(req.body || {}));
            logger.info('Item count:', Array.isArray(req.body?.items) ? req.body.items.length : 0);
            logger.info('Selected part count:', Array.isArray(req.body?.selectedParts) ? req.body.selectedParts.length : 0);
            next();
        });

        // Mount kiosk routes for public kiosk interface
        const kioskRoutes = require('./routes/kiosk');
        safeMountRoute('/api/kiosk', kioskLimiter, kioskRoutes);

        // Mount enhanced kiosk routes (comparison, compatibility, sessions)
        const enhancedKioskRoutes = require('./routes/enhanced-kiosk');
        safeMountRoute('/api/kiosk', kioskLimiter, enhancedKioskRoutes);

        // Mount assistance request routes for kiosk-admin communication
        console.log('🔔 Mounting Assistance Request routes...');
        safeMountRoute('/api/assistance', kioskLimiter, assistanceRoutes);

        // Mount PC Upgrade routes for upgrade analysis and recommendations
        console.log('🔧 Mounting PC Upgrade routes...');
        const pcUpgradeRoutes = require('./routes/pcUpgrade');
        safeMountRoute('/api/pc-upgrade', kioskLimiter, pcUpgradeRoutes);

        // Mount prebuilt PCs routes for kiosk prebuilt PC configurations
        console.log('🖥️  Mounting PreBuilt PCs routes...');
        const prebuiltRoutes = require('./routes/prebuilt');
        safeMountRoute('/api/prebuilt', kioskLimiter, prebuiltRoutes);

        safeMountRoute('/api/orders', ordersRoutes);
        safeMountRoute('/api/queue', realtimeLimiter, queueRoutes); // Queue management with real-time updates
        safeMountRoute('/api/settings', settingsRoutes);
        safeMountRoute('/api/dashboard', realtimeLimiter, dashboardRoutes); // More permissive for real-time updates
        safeMountRoute('/api/logs', logsRoutes);
        safeMountRoute('/api/dev', devToolsRoutes);
        safeMountRoute('/api/audit-logs', auditLogs);
        safeMountRoute('/api/admin', adminLimiter, adminRoutes);
        safeMountRoute('/api/images', imageRoutes);

        // Real-time SSE routes for live updates
        console.log('📡 Mounting Real-time SSE routes...');
        const { router: realtimeRoutes } = require('./routes/realtime');
        safeMountRoute('/api/realtime', pollingLimiter, realtimeRoutes);
        console.log('✅ Real-time SSE routes mounted');

        // FIX #9: Global Search routes (removed duplicate — already loaded at startup as searchRoutes)
        console.log('🔍 Mounting Global Search routes...');
        safeMountRoute('/api/search', searchRoutes);
        console.log('✅ Global Search routes mounted');

        // UI Activity Logging endpoint
        console.log('📝 Mounting Activity Logging routes...');
        const activityRoutes = express.Router();
        activityRoutes.post('/log-interaction', protect, logUIInteraction);
        safeMountRoute('/api/activity', activityRoutes);
        console.log('✅ Activity Logging routes mounted');

        // Apply comprehensive activity logging middleware to all admin routes
        app.use('/api/admin*', autoLogActivity);
        app.use('/api/stock*', autoLogActivity);
        app.use('/api/orders*', autoLogActivity);
        app.use('/api/users*', autoLogActivity);
        console.log('✅ Activity logging middleware applied to admin routes');

        // IP Access Control routes (Security)
        console.log('🔒 Mounting IP Access Control routes...');
        const ipAccessRoutes = safeRequireRoute('./routes/ipAccess', 'IP Access Control routes');
        safeMountRoute('/api/ip', ipAccessRoutes);
        console.log('✅ IP Access Control routes mounted');

        // Phase 3: New Routes (Database Schema Expansion)
        console.log('✅ Mounting Phase 3 routes...');
        const priceHistoryRoutes = require('./routes/priceHistory');
        const buildHistoryRoutes = require('./routes/buildHistory');
        const compatibilityCacheRoutes = require('./routes/compatibilityCache');
        const userPreferencesRoutes = require('./routes/userPreferences');

        safeMountRoute('/api/price-history', priceHistoryRoutes);
        safeMountRoute('/api/builds', buildHistoryRoutes);
        safeMountRoute('/api/compatibility/cache', compatibilityCacheRoutes);
        safeMountRoute('/api/preferences', userPreferencesRoutes);
        console.log('✅ Phase 3 routes mounted successfully');

        // Phase 3.2: Price Tracking System (NEW)
        console.log('💰 Mounting Phase 3.2 Price Tracking routes...');
        const priceTrackingRoutes = require('./routes/priceTracking');
        safeMountRoute('/api/price-tracking', priceTrackingRoutes);
        console.log('✅ Phase 3.2 Price Tracking routes mounted');
        safeMountRoute('/api/messages', pollingLimiter, messagesRoutes); // Ultra-permissive for frequent chat polling
        safeMountRoute('/api/notifications', pollingLimiter, notificationsRoutes); // Ultra-permissive for notifications
        // NOTE: /api/search already mounted above (line ~1190)
        safeMountRoute('/api/profile', profileRoutes);

        // Mount Admin Feedback routes (AI review and correction system)
        console.log('📊 Mounting Admin Feedback routes...');
        const adminFeedbackRoutes = require('./routes/adminFeedback');
        // NOTE: /api/admin already mounted above; mount feedback under a distinct path
        safeMountRoute('/api/admin/feedback', adminFeedbackRoutes);

        // PRIORITY 3: Mount Real-World Data Feedback routes (User feedback, known issues, successful builds)
        console.log(' Mounting Real-World Data Feedback routes...');
        const feedbackRoutes = require('./routes/feedback');
        safeMountRoute('/api/feedback', feedbackRoutes);

        // Mount PC Upgrade Parameters routes
        console.log('⚙️ Mounting PC Upgrade Parameters routes...');
        safeMountRoute('/api/admin/pc-upgrade-parameters', adminLimiter, pcUpgradeParametersRoutes);

        // Mount disabled PC Customized AI Reference Builds routes (both admin and kiosk access)
        console.log('Mounting disabled PC Customized AI Reference Builds routes...');
        safeMountRoute('/api/pc-customized-ai-builds', pcCustomizedAIBuildsRoutes); // Public for kiosk
        safeMountRoute('/api/admin/pc-customized-ai-builds', pcCustomizedAIBuildsRoutes); // Admin access

        // Mount Reference Builds routes (both admin and kiosk access)
        console.log('🏗️ Mounting Reference Builds routes...');
        safeMountRoute('/api/reference-builds', referenceBuildsRoutes); // Public for kiosk
        safeMountRoute('/api/admin/reference-builds', adminLimiter, referenceBuildsRoutes); // Admin access

        // Mount AI integration routes
        console.log('🤖 Mounting AI integration routes...');
        try {
            console.log('  → Loading aiRoutes module...');
            // Test if aiRoutes loads correctly
            const testRouter = aiRoutes;
            console.log('  → aiRoutes module loaded, checking router type:', typeof testRouter);
            console.log('  → Mounting to /api/ai...');
            safeMountRoute('/api/ai', aiRoutes);
            console.log('  ✅ AI integration routes mounted successfully');
        } catch (aiRoutesError) {
            console.error('  ❌ Failed to mount AI routes:', aiRoutesError.message);
            console.error('     Stack:', aiRoutesError.stack);
            throw aiRoutesError;
        }

        // PHASE 4 & 5: Mount AI Metrics routes
        console.log('📊 Mounting AI Metrics routes...');
        safeMountRoute('/api/ai-metrics', aiMetricsRoutes);

        // WEEK 3 PHASE 5: Mount Advanced Monitoring Dashboard
        console.log('📈 Mounting Advanced Monitoring Dashboard routes...');
        const metricsRouter = require('./routes/metrics');
        safeMountRoute('/api/metrics', metricsRouter);

        // PHASE 2.2: Mount Cache Management routes
        console.log('🗄️ Mounting Cache Management routes...');
        safeMountRoute('/api/cache', adminLimiter, cacheRoutes);

        // PHASE 4: Mount System Performance Metrics routes
        console.log('📊 Mounting System Performance Metrics routes...');
        const systemMetricsRoutes = require('./routes/systemMetricsRoutes');
        safeMountRoute('/api/system', adminLimiter, systemMetricsRoutes);

        // PHASE 4: Mount Visual Rule Builder routes
        console.log('🔧 Mounting Visual Rule Builder routes...');
        const ruleBuilderRoutes = require('./routes/ruleBuilderRoutes');
        safeMountRoute('/api/rules', adminLimiter, ruleBuilderRoutes);

        // PHASE 3: Mount Machine Learning routes
        console.log('🤖 Mounting Machine Learning routes...');
        const mlRoutes = createDisabledAIRouter('ML routes');
        safeMountRoute('/api/ml', mlRoutes);

        // Mount AI training routes
        console.log('🎓 Mounting AI training routes...');
        const trainingRoutes = createDisabledAIRouter('AI training');
        safeMountRoute('/api/ai/training', trainingRoutes);

        // PHASE 2.3: Mount Prompt Optimization routes
        console.log('📝 Mounting Prompt Optimization routes...');
        const promptRoutes = createDisabledAIRouter('Prompt optimization');
        safeMountRoute('/api/prompts', promptRoutes);

        // PHASE 2.4: Mount Performance Prediction routes
        console.log('🎮 Mounting Performance Prediction routes...');
        const performanceRoutes = createDisabledAIRouter('Performance prediction');
        safeMountRoute('/api/ai/build', performanceRoutes);

        // Mount compatibility analysis routes
        console.log('🔧 Mounting compatibility analysis routes...');
        const compatibilityRoutes = require('./routes/compatibility');
        safeMountRoute('/api/compatibility', kioskLimiter, compatibilityRoutes);

        // PHASE 1: Mount Advanced Compatibility routes (Power, Clearance, Pairwise, Bottleneck)
        console.log('⚡ Mounting Advanced Compatibility routes (Power Budget, Clearance, Pairwise, Bottleneck)...');
        const advancedCompatibilityRoutes = require('./routes/advancedCompatibilityRoutes');
        app.use('/api/compatibility/advanced', kioskLimiter, advancedCompatibilityRoutes);

        // PHASE 1 ENHANCEMENT: Mount Enhanced Compatibility routes (ProductPage, Future Upgrade)
        console.log('🚀 Mounting Enhanced Compatibility routes (5.0/5.0 Rating System)...');
        const enhancedCompatibilityRoutes = require('./routes/enhancedCompatibility');
        app.use('/api/compatibility/enhanced', kioskLimiter, enhancedCompatibilityRoutes);

        // Mount comprehensive compatibility checker (3200 rules + RuleBuilder + Advanced + Builder)
        console.log('🔍 Mounting Comprehensive Compatibility Checker...');
        const comprehensiveCompatibilityRoutes = safeRequireRoute('./routes/comprehensiveCompatibility', 'Comprehensive Compatibility routes');
        safeMountRoute('/api/compatibility', kioskLimiter, comprehensiveCompatibilityRoutes);
        console.log('✅ Comprehensive Compatibility Checker mounted');

        // Mount build validation routes (Phase A.2)
        console.log('✅ Mounting build validation routes...');
        const buildValidationRoutes = require('./routes/buildValidation');
        app.use('/api/build', kioskLimiter, buildValidationRoutes);

        // Receipt generation endpoints
        const { generateReceiptHTML, generateReceiptText } = require('./utils/receiptGenerator');

        // Generate HTML receipt (SECURITY FIX: Requires authentication)
        app.get('/api/receipts/html/:orderId', protect, async (req, res) => {
            try {
                const { orderId } = req.params;
                const { print } = req.query;

                // Get order data with items
                const orderResult = await query(`
                    SELECT
                        o.*,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'id', oi.id,
                                    'product_id', oi.product_id,
                                    'product_name', oi.product_name,
                                    'quantity', oi.quantity,
                                    'unit_price', oi.unit_price,
                                    'total_price', oi.total_price,
                                    'category', oi.category
                                )
                            ) FILTER (WHERE oi.id IS NOT NULL),
                            '[]'::json
                        ) as items
                    FROM orders o
                    LEFT JOIN order_items oi ON o.id = oi.order_id
                    WHERE o.id = $1
                    GROUP BY o.id
                `, [orderId]);

                if (orderResult.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Order not found'
                    });
                }

                const orderData = orderResult.rows[0];
                const items = orderData.items || [];

                const receiptHTML = generateReceiptHTML(orderData, items);

                if (print === 'true') {
                    res.send(receiptHTML + '<script>window.print(); setTimeout(() => window.close(), 1000);</script>');
                } else {
                    res.send(receiptHTML);
                }
            } catch (error) {
                console.error('Error generating HTML receipt:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to generate receipt',
                    error: error.message
                });
            }
        });

        // Generate text receipt for thermal printers (SECURITY FIX: Requires authentication)
        app.get('/api/receipts/text/:orderId', protect, async (req, res) => {
            try {
                const { orderId } = req.params;

                // Get order data with items
                const orderResult = await query(`
                    SELECT
                        o.*,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'product_name', oi.product_name,
                                    'quantity', oi.quantity,
                                    'unit_price', oi.unit_price,
                                    'total_price', oi.total_price
                                )
                            ) FILTER (WHERE oi.id IS NOT NULL),
                            '[]'::json
                        ) as items
                    FROM orders o
                    LEFT JOIN order_items oi ON o.id = oi.order_id
                    WHERE o.id = $1
                    GROUP BY o.id
                `, [orderId]);

                if (orderResult.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Order not found'
                    });
                }

                const orderData = orderResult.rows[0];
                const items = orderData.items || [];

                const receiptText = generateReceiptText(orderData, items);

                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.send(receiptText);
            } catch (error) {
                console.error('Error generating text receipt:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to generate receipt',
                    error: error.message
                });
            }
        });

        // Generate thermal printer receipt (ESC/POS commands)
        const { generateThermalReceipt, generateThermalReceiptBytes } = require('./utils/thermalPrinter');

        app.post('/api/receipts/thermal', protect, async (req, res) => {
            try {
                const { orderId, orderData, items, format = 'text' } = req.body;

                // If orderId provided, fetch from database
                let finalOrderData = orderData;
                let finalItems = items || [];

                if (orderId && !orderData) {
                    const orderResult = await query(`
                        SELECT
                            o.*,
                            COALESCE(
                                json_agg(
                                    json_build_object(
                                        'product_name', oi.product_name,
                                        'quantity', oi.quantity,
                                        'unit_price', oi.unit_price,
                                        'total_price', oi.total_price,
                                        'name', oi.product_name,
                                        'price', oi.unit_price,
                                        'totalPrice', oi.total_price
                                    )
                                ) FILTER (WHERE oi.id IS NOT NULL),
                                '[]'::json
                            ) as items
                        FROM orders o
                        LEFT JOIN order_items oi ON o.id = oi.order_id
                        WHERE o.id = $1
                        GROUP BY o.id
                    `, [orderId]);

                    if (orderResult.rows.length === 0) {
                        return res.status(404).json({
                            success: false,
                            message: 'Order not found'
                        });
                    }

                    finalOrderData = orderResult.rows[0];
                    finalItems = finalOrderData.items || [];
                }

                // Validate required data
                if (!finalOrderData) {
                    return res.status(400).json({
                        success: false,
                        message: 'Order data is required'
                    });
                }

                // ✅ FIX: Ensure createdAt is a proper Date object
                if (finalOrderData.created_at && typeof finalOrderData.created_at === 'string') {
                    finalOrderData.createdAt = new Date(finalOrderData.created_at);
                } else if (finalOrderData.created_at) {
                    finalOrderData.createdAt = finalOrderData.created_at;
                } else {
                    finalOrderData.createdAt = new Date();
                }

                // Generate thermal receipt
                if (format === 'bytes') {
                    // Return as byte array for direct USB/Bluetooth transmission
                    const receiptBytes = generateThermalReceiptBytes(finalOrderData, finalItems);
                    res.setHeader('Content-Type', 'application/octet-stream');
                    res.setHeader('Content-Disposition', `attachment; filename="receipt-${finalOrderData.queueNumber || 'unknown'}.bin"`);
                    res.send(Buffer.from(receiptBytes));
                } else {
                    // Return as ESC/POS text string
                    const receiptText = generateThermalReceipt(finalOrderData, finalItems);
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.json({
                        success: true,
                        data: {
                            receiptData: receiptText,
                            receiptBytes: Array.from(Buffer.from(receiptText, 'utf-8')),
                            queueNumber: finalOrderData.queueNumber,
                            orderIdFormatted: finalOrderData.orderIdFormatted
                        }
                    });
                }

                console.log(`✅ Thermal receipt generated for queue #${finalOrderData.queueNumber}`);
            } catch (error) {
                console.error('Error generating thermal receipt:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to generate thermal receipt',
                    error: error.message
                });
            }
        });

        // --- Server-Sent Events basic streams (foundation for realtime) ---
        // Reuse existing registry across repeated initializations (tests) to avoid stale closures
        let sseClients = app.get('sseClients');
        if (!sseClients) {
            sseClients = { users: new Set(), logs: new Set(), orders: new Set(), queue: new Set(), stock: new Set(), notifications: new Set() };
            app.set('sseClients', sseClients);
        }

        const releaseSseClient = (set, client, heartbeat, reason = null) => {
            client.connected = false;
            clearInterval(heartbeat);
            set.delete(client);

            if (reason) {
                logger.warn('SSE client disconnected unexpectedly', { reason });
            }
        };

        const sseHandler = (set, req, res) => {
            // Enhanced SSE handler with proper CORS and error handling
            const corsOrigin = getAllowedOriginFromRequest(req);
            const headers = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Headers': 'Cache-Control'
            };

            if (corsOrigin) {
                headers['Access-Control-Allow-Origin'] = corsOrigin;
                headers['Access-Control-Allow-Credentials'] = 'true';
                headers.Vary = 'Origin';
            }

            res.writeHead(200, headers);

            // Send initial heartbeat
            res.write(`event: heartbeat\ndata: {"ts":"${new Date().toISOString()}","status":"connected"}\n\n`);

            const client = {
                res,
                id: Date.now() + Math.random(),
                connected: true
            };
            set.add(client);

            // Heartbeat interval to keep connection alive
            const heartbeat = setInterval(() => {
                if (client.connected) {
                    try {
                        res.write(`event: heartbeat\ndata: {"ts":"${new Date().toISOString()}"}\n\n`);
                    } catch (error) {
                        releaseSseClient(set, client, heartbeat, error.message);
                    }
                }
            }, 30000); // 30 seconds

            // Handle client disconnect
            req.on('close', () => {
                releaseSseClient(set, client, heartbeat);
            });

            req.on('error', (error) => {
                releaseSseClient(set, client, heartbeat, error.message);
            });
        };

        // SSE endpoints with enhanced error handling
        app.get('/api/realtime/users', (req, res) => {
            try {
                sseHandler(sseClients.users, req, res);
            } catch (error) {
                console.error('SSE Users error:', error);
                res.status(500).json({ error: 'SSE connection failed' });
            }
        });

        app.get('/api/realtime/logs', (req, res) => {
            try {
                sseHandler(sseClients.logs, req, res);
            } catch (error) {
                console.error('SSE Logs error:', error);
                res.status(500).json({ error: 'SSE connection failed' });
            }
        });

        app.get('/api/realtime/orders', (req, res) => {
            try {
                sseHandler(sseClients.orders, req, res);
            } catch (error) {
                console.error('SSE Orders error:', error);
                res.status(500).json({ error: 'SSE connection failed' });
            }
        });

        app.get('/api/realtime/queue', (req, res) => {
            try {
                sseHandler(sseClients.queue, req, res);
            } catch (error) {
                console.error('SSE Queue error:', error);
                res.status(500).json({ error: 'SSE connection failed' });
            }
        });

        app.get('/api/realtime/stock', (req, res) => {
            try {
                sseHandler(sseClients.stock, req, res);
            } catch (error) {
                console.error('SSE Stock error:', error);
                res.status(500).json({ error: 'SSE connection failed' });
            }
        });

        app.get('/api/realtime/notifications', (req, res) => {
            try {
                sseHandler(sseClients.notifications, req, res);
            } catch (error) {
                console.error('SSE Notifications error:', error);
                res.status(500).json({ error: 'SSE connection failed' });
            }
        });

        // Enhanced routes for compatibility with frontend calls
        app.use('/api/dashboard-enhanced', dashboardRoutes); // Backward-compatible alias (retain for now)
        // Removed deprecated /api/users-enhanced alias (use /api/users & /api/users/stats/overview instead)

        console.log('✅ All routes mounted successfully');

        // 404 handler
        app.use('*', (req, res) => {
            res.status(404).json({
                status: 'fail',
                message: `Route ${req.originalUrl} not found`
            });
        });

        // Global error handler — uses imported errorHandler for PG/JWT-specific error handling
        const errorHandler = require('./middleware/errorHandler');
        app.use(errorHandler);

        // Lightweight periodic broadcast (will be replaced by real change triggers later)
        if (!app.get('broadcastUserStats')) { // guard so we don't duplicate under repeated startServer in tests
            const broadcastUserStats = async () => {
                // Always resolve latest registry to avoid stale closure when startServer is called again
                const clients = app.get('sseClients') || sseClients;
                if (clients.users.size === 0 && clients.logs.size === 0) return;
                try {
                    // Presence optimization: rely primarily on cached last_activity / last_login columns
                    // Compute counts directly from users table to avoid heavy DISTINCT scans over audit_logs each interval
                    const presenceQ = await query(`
                                                WITH base AS (
                                                    SELECT id, last_login, last_activity
                                                    FROM users
                                                    WHERE is_active = true
                                                )
                                                SELECT
                                                    COUNT(*) AS total,
                                                    COUNT(CASE WHEN COALESCE(last_activity, last_login, NOW() - INTERVAL '100 years') >= NOW() - INTERVAL '15 minutes' THEN 1 END) AS active_15,
                                                    COUNT(CASE WHEN COALESCE(last_activity, last_login, NOW() - INTERVAL '100 years') >= NOW() - INTERVAL '2 minutes' THEN 1 END) AS online_2
                                                FROM base;
                                        `);
                    let totalUsers = 0, activeUsers = 0, online = 0;
                    if (presenceQ?.rows?.[0]) {
                        totalUsers = Number.parseInt(presenceQ.rows[0].total || 0, 10);
                        activeUsers = Number.parseInt(presenceQ.rows[0].active_15 || 0, 10);
                        online = Number.parseInt(presenceQ.rows[0].online_2 || 0, 10);
                    }

                    // Fallback sanity check: if activeUsers seems suspiciously low but audit_logs show more, refresh last_activity lazily
                    if (activeUsers > 0 && online > activeUsers) {
                        activeUsers = online; // guard logical bound
                    }
                    if (totalUsers && activeUsers === 0) {
                        // Minimal fallback sample (cheap) - check audit_logs only if zero active yet we have users
                        const auditFallback = await query(`SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at >= NOW() - INTERVAL '15 minutes'`);
                        const af = Number.parseInt(auditFallback?.rows?.[0]?.count || 0, 10);
                        if (af > activeUsers) activeUsers = af;
                        const auditOnlineFallback = await query(`SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at >= NOW() - INTERVAL '2 minutes'`);
                        const aof = Number.parseInt(auditOnlineFallback?.rows?.[0]?.count || 0, 10);
                        if (aof > online) online = aof;
                    }

                    // Derive away/offline
                    const away = Math.max(activeUsers - online, 0);
                    const offline = Math.max(totalUsers - activeUsers, 0);

                    const payload = JSON.stringify({
                        timestamp: new Date().toISOString(),
                        totalUsers,
                        activeUsers,
                        presence: { online, away, offline }
                    });
                    clients.users.forEach(c => c.res.write(`event: users\ndata: ${payload}\n\n`));
                } catch (e) {
                    logger.error('SSE users broadcast error:', e.message);
                }
            };
            const usersStatsInterval = setInterval(broadcastUserStats, 15000);
            if (usersStatsInterval.unref) usersStatsInterval.unref();
            app.set('broadcastUserStats', broadcastUserStats);
            app.set('usersStatsInterval', usersStatsInterval);
        }

        if (!listen) {
            console.log('🧪 Initialized app for testing (no listening socket)');
            return app;
        }

        // Create HTTP server first (but don't listen yet)
        const server = http.createServer(app);

        // Register error handler BEFORE listening
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`❌ Port ${PORT} is already in use`);
                logger.error(`   Try running: Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force`);
                logger.error(`   Server will attempt graceful recovery...`);
            } else {
                logger.error('❌ Server error:', error);
                logger.error('   Server will attempt graceful recovery...');
            }
        });

        // Now start listening
        server.listen(PORT, '0.0.0.0', async () => {
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🌐 Network access: http://0.0.0.0:${PORT}/api/health`);
            console.log('🎯 Ready for frontend connections from all network interfaces!');

            // ⏰ Initialize Queue Auto-Reset Scheduler (12:00 AM Asia/Manila)
            // Automatically resets queue numbers 1-99 at midnight every day
            try {
                const queueAutoResetScheduler = require('./services/queueAutoResetScheduler');
                queueAutoResetScheduler.start();
                console.log('✅ Queue Auto-Reset Scheduler initialized');
                console.log('   ⏰ Auto-reset: Every day at 12:00 AM (Asia/Manila GMT+8)');
                console.log('   🔢 Queue range: 1-99 (no recycling within day)');
                console.log('   🔄 Reset types: AUTO (midnight) + MANUAL (admin button)');
            } catch (error) {
                console.warn('⚠️  Queue auto-reset scheduler initialization failed:', error.message);
                console.warn('   Queue system will use manual reset only');
            }

            // Schedule automated reference builds (runs monthly on 1st at 2 AM)
            // ROOT CAUSE FIX: Automated monthly updates to keep reference builds current
            try {
                const { generateReferenceBuilds } = require('./scripts/updateReferenceBuilds');

                // Cron: 0 2 1 * * = At 2:00 AM on day 1 of every month
                cron.schedule('0 2 1 * *', async () => {
                    logger.info('🤖 Running monthly reference build update (scheduled)');
                    try {
                        const result = await generateReferenceBuilds();
                        logger.info('✅ Automated reference build update completed', result);
                    } catch (error) {
                        logger.error('❌ Automated reference build update failed:', error);
                    }
                });

                console.log('📅 Automated reference builds scheduled: 1st of every month at 2 AM');
            } catch (error) {
                console.warn('⚠️  Could not schedule reference builds:', error.message);
            }

            try {
                console.log('Initializing deterministic compatibility service...');
                const { compatibilityService } = require('./services/compatibilityService');
                await compatibilityService.initialize();
                globalThis.compatibilityService = compatibilityService;
                console.log('Deterministic compatibility service initialized for offline kiosk mode');
            } catch (compatibilityError) {
                console.warn('Deterministic compatibility service initialization failed:', compatibilityError.message);
            }

            const legacyAIStartupEnabled = false;
            if (legacyAIStartupEnabled) {
            // PHASE 4 & 5: Initialize AI enhancement services
            try {
                console.log('🤖 Initializing AI enhancement services...');
                const enhancedAIService = null;
                const { compatibilityService } = require('./services/compatibilityService');
                const PrecomputeManager = null;
                const CacheWarmingService = null;

                // Initialize enhanced AI service
                await enhancedAIService.initialize();
                await compatibilityService.initialize();

                // 🔥 WEEK 3 PHASE 4: Intelligent Cache Warmup on Startup
                // Pre-populates cache with 100+ most common queries
                // Target: 14% → 40%+ cache hit rate improvement
                try {
                    const cacheWarmupService = require('./services/cacheWarmup');
                    const warmupResult = await cacheWarmupService.warmupCache();
                    console.log(`🔥 Cache warmup complete: ${warmupResult.entriesWarmed} entries warmed`);
                    globalThis.cacheWarmupService = cacheWarmupService; // Make it globally accessible
                } catch (warmupError) {
                    console.warn('⚠️ Cache warmup failed (non-critical):', warmupError.message);
                }

                // Initialize precompute manager with AI services
                const precomputeManager = new PrecomputeManager(enhancedAIService, compatibilityService);
                globalThis.precomputeManager = precomputeManager; // Make it globally accessible

                // PHASE A.1: Initialize cache warming service (boosts cache hit rate from 10% to 60%+)
                const cacheWarming = new CacheWarmingService(compatibilityService);
                cacheWarming.schedulePeriodic(); // Warms cache on startup and every 6 hours
                globalThis.cacheWarming = cacheWarming; // Make it globally accessible

                console.log('✅ AI enhancement services initialized successfully');
                console.log('  📊 AI Logger: Real-time metrics tracking enabled');
                console.log('  🔄 Precompute Manager: Background optimization ready');
                console.log('  🔥 Cache Warming: Scheduled for popular products (every 6 hours)');
                console.log('  📈 Feedback Processor: Monthly analysis scheduled');
                console.log('  🧠 Legacy semantic service disabled');
                console.log('  🧪 Experiment Manager: A/B testing framework ready');
            } catch (aiError) {
                console.warn('⚠️ AI enhancement services initialization failed:', aiError.message);
                console.warn('  AI features will be limited to basic functionality');
            }

            // 🔄 CRITICAL: Initialize Auto-Restart Service for AI/Circuit Breaker failures
            // MOVED OUTSIDE try-catch to ensure it always initializes even if AI enhancement fails
            try {
                console.log('🔄 Initializing Auto-Restart Service...');
                const autoRestartService = null;
                const aiCircuitBreaker = null;
                const ollamaService = null;

                // Start monitoring circuit breaker and Ollama health
                autoRestartService.startMonitoring(aiCircuitBreaker, ollamaService);

                console.log('✅ Auto-Restart Service initialized');
                console.log('  🎯 Restart triggers: Circuit Breaker OPEN/HALF_OPEN states ONLY');
                console.log('  📊 Legacy model monitoring disabled');
                console.log('  ⚡ Instant backend restart on AI Circuit Breaker failures');
                console.log('  🛡️ Restart loop protection: Max 10 restarts/hour, 30s cooldown');

                globalThis.autoRestartService = autoRestartService; // Make globally accessible
            } catch (restartError) {
                console.error('❌ Auto-Restart Service initialization failed:', restartError.message);
                console.warn('  ⚠️ Backend will NOT auto-restart on AI failures - manual intervention required');
            }
            } else {
                console.log('Legacy AI startup and Ollama monitoring disabled for offline kiosk mode');
            }
        });

        // Initialize Socket.io for real-time features
        try {
            const { Server } = require('socket.io');
            const io = new Server(server, {
                cors: {
                    origin: function (origin, callback) {
                        // Allow requests with no origin (like mobile apps)
                        if (!origin) {
                            callback(null, true);
                            return;
                        }

                        callback(null, isAllowedOrigin(origin));
                    },
                    methods: ["GET", "POST"],
                    credentials: true
                }
            });
            const parseSocketCookies = (cookieHeader = '') => cookieHeader
                .split(';')
                .map((entry) => entry.trim())
                .filter(Boolean)
                .reduce((cookies, entry) => {
                    const separatorIndex = entry.indexOf('=');
                    if (separatorIndex > -1) {
                        cookies[entry.slice(0, separatorIndex)] = decodeURIComponent(entry.slice(separatorIndex + 1));
                    }
                    return cookies;
                }, {});

            // Socket.io authentication middleware uses the same HttpOnly cookie model as HTTP admin routes.
            io.use(async (socket, next) => {
                try {
                    const cookies = parseSocketCookies(socket.handshake.headers.cookie || '');
                    const token = cookies.jwt;
                    if (!token) {
                        return next(new Error('Authentication error: No auth cookie provided'));
                    }

                    const jwt = require('jsonwebtoken');
                    const jwtSecret = process.env.JWT_SECRET || require('./config/config').jwt.secret;
                    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });

                    const userResult = await query(`
                        SELECT id, name, email, role, display_name, profile_image, birth_date,
                               last_login, is_online, online_status, last_activity, last_active_at
                        FROM users
                        WHERE id = $1 AND is_active = true
                    `, [decoded.id]);
                    if (userResult.rows.length === 0) {
                        return next(new Error('Authentication error: User not found'));
                    }

                    socket.userId = decoded.id;
                    socket.user = userResult.rows[0];
                    next();
                } catch (error) {
                    logger.warn('Socket authentication failed', {
                        error: error.message,
                        address: socket.handshake.address
                    });
                    next(new Error('Authentication error: Invalid session'));
                }
            });

            // Handle socket connections
            io.on('connection', (socket) => {
                const userId = socket.userId;
                const userName = socket.user.name;

                console.log(`🔌 User ${userName} (ID: ${userId}) connected via Socket.io`);

                // Join user to their personal room for notifications
                socket.join(`user_${userId}`);

                // Set user as online immediately
                query('UPDATE users SET presence_status = $1, last_active_at = NOW() WHERE id = $2', ['online', userId])
                    .then(() => {
                        // Broadcast presence update to all clients
                        io.emit('presence_update', {
                            userId,
                            userName,
                            status: 'online',
                            timestamp: new Date().toISOString()
                        });
                    })
                    .catch(err => console.error('Error updating user presence on connect:', err));

                // Presence status updates
                socket.on('user:online', () => {
                    query('UPDATE users SET presence_status = $1, last_active_at = NOW() WHERE id = $2', ['online', userId])
                        .then(() => {
                            io.emit('presence_update', {
                                userId,
                                userName,
                                status: 'online',
                                timestamp: new Date().toISOString()
                            });
                        })
                        .catch(err => console.error('Error updating presence to online:', err));
                });

                socket.on('user:away', () => {
                    query('UPDATE users SET presence_status = $1, last_active_at = NOW() WHERE id = $2', ['away', userId])
                        .then(() => {
                            io.emit('presence_update', {
                                userId,
                                userName,
                                status: 'away',
                                timestamp: new Date().toISOString()
                            });
                        })
                        .catch(err => console.error('Error updating presence to away:', err));
                });

                socket.on('user:offline', () => {
                    query('UPDATE users SET presence_status = $1, last_active_at = NOW() WHERE id = $2', ['offline', userId])
                        .then(() => {
                            io.emit('presence_update', {
                                userId,
                                userName,
                                status: 'offline',
                                timestamp: new Date().toISOString()
                            });
                        })
                        .catch(err => console.error('Error updating presence to offline:', err));
                });

                // Handle disconnect - set user offline
                socket.on('disconnect', () => {
                    console.log(`🔌 User ${userName} (ID: ${userId}) disconnected from Socket.io`);

                    query('UPDATE users SET presence_status = $1, last_active_at = NOW() WHERE id = $2', ['offline', userId])
                        .then(() => {
                            io.emit('presence_update', {
                                userId,
                                userName,
                                status: 'offline',
                                timestamp: new Date().toISOString()
                            });
                        })
                        .catch(err => console.error('Error updating presence on disconnect:', err));
                });

                // Real-time chat events
                socket.on('joinConversation', (conversationUserId) => {
                    if (typeof conversationUserId !== 'number' || !Number.isInteger(conversationUserId) || conversationUserId <= 0) return;
                    socket.join(`conversation_${Math.min(userId, conversationUserId)}_${Math.max(userId, conversationUserId)}`);
                });

                socket.on('leaveConversation', (conversationUserId) => {
                    if (typeof conversationUserId !== 'number' || !Number.isInteger(conversationUserId) || conversationUserId <= 0) return;
                    socket.leave(`conversation_${Math.min(userId, conversationUserId)}_${Math.max(userId, conversationUserId)}`);
                });

                // PHASE 6: Per-user rate limiting for socket events
                const socketRateLimit = { count: 0, resetTime: Date.now() + 1000 };
                const SOCKET_RATE_LIMIT = 10; // max 10 messages per second

                socket.on('sendMessage', async (data) => {
                    try {
                        // PHASE 6: Rate limit check (10 msg/sec per user)
                        const now = Date.now();
                        if (now > socketRateLimit.resetTime) {
                            socketRateLimit.count = 0;
                            socketRateLimit.resetTime = now + 1000;
                        }
                        socketRateLimit.count++;
                        if (socketRateLimit.count > SOCKET_RATE_LIMIT) {
                            return socket.emit('messageError', { error: 'Rate limit exceeded. Please slow down.' });
                        }

                        // PHASE 6: Input validation
                        if (!data || typeof data.recipientId !== 'number' || !Number.isInteger(data.recipientId) || data.recipientId <= 0) {
                            return socket.emit('messageError', { error: 'Invalid recipient' });
                        }
                        if (!data.content || typeof data.content !== 'string') {
                            return socket.emit('messageError', { error: 'Message content required' });
                        }

                        // PHASE 6: Sanitize content — strip HTML tags, enforce max length
                        const sanitizedContent = sanitizeSocketMessage(data.content)
                            .slice(0, 5000); // Max 5000 chars

                        if (sanitizedContent.length === 0) {
                            return socket.emit('messageError', { error: 'Message cannot be empty' });
                        }

                        // Save message to database
                        const messageResult = await query(`
                            INSERT INTO messages (sender_id, recipient_id, content, created_at)
                            VALUES ($1, $2, $3, NOW())
                            RETURNING id, content, created_at
                        `, [userId, data.recipientId, sanitizedContent]);

                        const message = messageResult.rows[0];
                        const conversationRoom = `conversation_${Math.min(userId, data.recipientId)}_${Math.max(userId, data.recipientId)}`;

                        // Send to conversation room
                        io.to(conversationRoom).emit('newMessage', {
                            id: message.id,
                            senderId: userId,
                            senderName: userName,
                            recipientId: data.recipientId,
                            content: message.content,
                            timestamp: message.created_at
                        });

                        // Send notification to recipient
                        io.to(`user_${data.recipientId}`).emit('newNotification', {
                            type: 'message',
                            title: 'New Message',
                            message: `${userName} sent you a message`,
                            timestamp: new Date().toISOString()
                        });

                    } catch (error) {
                        console.error('Error sending message:', error);
                        socket.emit('messageError', { error: 'Failed to send message' });
                    }
                });

                // Typing indicators
                socket.on('typing', (data) => {
                    // PHASE 6: Validate typing event data
                    if (!data || typeof data.conversationUserId !== 'number' || !Number.isInteger(data.conversationUserId) || data.conversationUserId <= 0) return;
                    if (typeof data.isTyping !== 'boolean') return;
                    const conversationRoom = `conversation_${Math.min(userId, data.conversationUserId)}_${Math.max(userId, data.conversationUserId)}`;
                    socket.to(conversationRoom).emit('userTyping', {
                        userId: userId,
                        userName: userName,
                        isTyping: data.isTyping
                    });
                });
            });

            // Make io available to routes (both methods for compatibility)
            app.set('io', io);
            globalThis.io = io; // Make globally available for assistance routes
            console.log('✅ Socket.io initialized for real-time features');

            // PHASE 3.2 WEEK 2: Initialize WebSocket Service for real-time stock/price updates
            try {
                const websocketService = require('./services/websocketService');
                websocketService.initialize(io);

                // Make websocket service globally available for route handlers
                globalThis.websocketService = websocketService;

                console.log('✅ WebSocket Service initialized for real-time updates');
                console.log('  📦 Stock update broadcasting enabled');
                console.log('  💰 Price change notifications enabled');
                console.log('  📊 Admin metrics broadcasting enabled (5s interval)');
                console.log('  🤖 AI progress tracking enabled');
            } catch (wsError) {
                console.warn('⚠️ WebSocket Service initialization failed:', wsError.message);
                console.warn('📡 Real-time stock/price updates will be limited');
            }

        } catch (error) {
            console.warn('⚠️ Socket.io initialization failed:', error.message);
            console.warn('📡 Real-time features will be limited');
        }

        return server;
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        logger.error('   Server will attempt graceful recovery...');
        // Don't crash - return null to signal failure
        return null;
    }
};

// Graceful shutdown handler
const stopServer = async () => {
    try {
        console.log('🔄 Shutting down server and closing resources...');

        // Stop auto-restart service first to prevent restart during shutdown
        try {
            if (globalThis.autoRestartService) {
                globalThis.autoRestartService.stopMonitoring();
                console.log('✅ Auto-restart service stopped');
            }
        } catch (e) {
            console.error('⚠️ Error stopping auto-restart service:', e.message);
        }

        try {
            const interval = app.get('usersStatsInterval');
            if (interval) {
                clearInterval(interval);
                app.set('usersStatsInterval', null);
            }
            const sseClients = app.get('sseClients');
            if (sseClients) {
                ['users', 'logs', 'orders', 'queue', 'stock', 'notifications'].forEach(k => {
                    if (sseClients[k]) {
                        sseClients[k].forEach(c => {
                            try {
                                c.res.end();
                            } catch (error) {
                                logger.warn('Failed to close SSE response during shutdown', { channel: k, error: error.message });
                            }
                        });
                        sseClients[k].clear();
                    }
                });
            }
        } catch (e) {
            console.error('⚠️ Error clearing realtime resources:', e.message);
        }
        if (closePool) await closePool();
        console.log('✅ Shutdown complete');
    } catch (err) {
        console.error('❌ Error during shutdown:', err.message);
    }
};

process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received, shutting down gracefully');
    await stopServer();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🔄 SIGINT received, shutting down gracefully');
    await stopServer();
    process.exit(0);
});

// Global safety-net error handlers
process.on('uncaughtException', async (err) => {
    console.error('⚠️ Uncaught Exception:', err.message);
    console.error(err.stack);
    logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
    // PHASE 6: Graceful shutdown on fatal error to prevent zombie processes
    try {
        await stopServer();
    } catch (error) {
        logger.error('Failed to stop server after uncaught exception', { error: error.message });
    }
    process.exit(1);
});

// FIX #6 (v3 per code review): Graceful shutdown with re-entrancy guard.
// Original code crashed immediately on ANY stray promise (e.g. Redis timeout).
// v3: Added isShuttingDown flag to prevent infinite recursion if stopServer()
// itself triggers an unhandled rejection during the shutdown sequence.
let isShuttingDown = false;
process.on('unhandledRejection', async (reason) => {
    const reasonDetails = describeUnhandledReason(reason);
    console.error('⚠️ Unhandled Rejection (graceful shutdown):', reasonDetails.message);
    logger.error('Unhandled Rejection - initiating graceful shutdown', reasonDetails);
    if (isShuttingDown) {
        // Already shutting down — don't recurse, just log and let the pending exit complete
        logger.error('Rejection during shutdown — ignoring to prevent recursion');
        return;
    }
    isShuttingDown = true;
    try {
        await stopServer();
    } catch (error) {
        logger.error('Failed to stop server after unhandled rejection', { error: error.message });
    }
    // Delay exit to allow PM2 to detect clean shutdown vs crash loop
    setTimeout(() => process.exit(1), 1500);
});

// Export for testing; auto-start unless in test environment
if (require.main === module) {
    startServer();
}

// Default export the Express app for supertest while preserving helpers
app.startServer = startServer;
app.stopServer = stopServer;
app.app = app; // maintain compatibility with destructured { app }

module.exports = app;
