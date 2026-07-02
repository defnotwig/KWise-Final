/**
 * =====================================================
 * IP FIREWALL MIDDLEWARE
 * =====================================================
 * Purpose: Network-level access control and IP blocking
 * Author: K-Wise Security Team
 * Date: November 18, 2025
 * =====================================================
 * 
 * Features:
 * - Detect true client IP (handles proxies, load balancers)
 * - Auto-register new IPs as "pending"
 * - Block access for blacklisted IPs
 * - Rate limiting per IP
 * - Device fingerprinting
 * - Audit logging for all requests
 * 
 * Security Layers:
 * 1. IP Status Check (allowed/blocked/pending)
 * 2. Request counting and anomaly detection
 * 3. Failed login tracking
 * 4. DoS/DDoS detection
 * 5. Audit trail logging
 * =====================================================
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

const HOT_PATH_ACTIVITY_INTERVAL_MS = Number.parseInt(process.env.IP_HOT_PATH_ACTIVITY_INTERVAL_MS || '5000', 10);
const HOT_PATH_ACCESS_LOG_SAMPLE_RATE = Math.max(0, Math.min(1, Number.parseFloat(process.env.IP_HOT_PATH_ACCESS_LOG_SAMPLE_RATE || '0')));
const hotPathActivityLastSeen = new Map();

const TRUSTED_PROXY_IPS = new Set(
    (process.env.TRUSTED_PROXY_IPS || '127.0.0.1,::1,::ffff:127.0.0.1')
        .split(',')
        .map(ip => ip.trim())
        .filter(Boolean)
);

const normalizeIP = (ip = '') => {
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        return '127.0.0.1';
    }
    return ip.startsWith('::ffff:') ? ip.substring(7) : ip;
};

const isTrustedProxyRequest = (req) => {
    const remoteAddress = normalizeIP(req.socket?.remoteAddress || req.connection?.remoteAddress || '');
    return TRUSTED_PROXY_IPS.has(remoteAddress);
};

/**
 * Extract true client IP address
 * Handles: X-Forwarded-For, X-Real-IP, Cloudflare, proxies
 */
const extractClientIP = (req) => {
    // Priority order for IP detection
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xRealIP = req.headers['x-real-ip'];
    const cfConnectingIP = req.headers['cf-connecting-ip']; // Cloudflare
    const socketIP = req.socket?.remoteAddress;
    const connectionIP = req.connection?.remoteAddress;

    let clientIP;

    if (isTrustedProxyRequest(req) && xForwardedFor) {
        // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
        // First IP is the original client
        clientIP = xForwardedFor.split(',')[0].trim();
    } else if (isTrustedProxyRequest(req) && cfConnectingIP) {
        clientIP = cfConnectingIP;
    } else if (isTrustedProxyRequest(req) && xRealIP) {
        clientIP = xRealIP;
    } else if (socketIP) {
        clientIP = socketIP;
    } else if (connectionIP) {
        clientIP = connectionIP;
    } else {
        clientIP = req.ip || 'unknown';
    }

    return normalizeIP(clientIP);
};

/**
 * Generate device fingerprint for tracking
 * Combines: User-Agent + Accept-Language + Screen Resolution (if available)
 */
const generateDeviceFingerprint = (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Simple hash-like fingerprint
    const fingerprint = Buffer.from(
        `${userAgent}|${acceptLanguage}|${acceptEncoding}`
    ).toString('base64').substring(0, 64);
    
    return fingerprint;
};

/**
 * Parse user agent to extract device information
 * Returns: { deviceType, os, browser, deviceName }
 */
const parseUserAgent = (userAgent) => {
    if (!userAgent) {
        return {
            deviceType: 'Unknown',
            os: 'Unknown',
            browser: 'Unknown',
            deviceName: 'Unknown Device'
        };
    }

    const ua = userAgent.toLowerCase();

    // Detect device type
    const deviceType = (ua.includes('mobile') || ua.includes('android'))
        ? 'Mobile'
        : (ua.includes('tablet') || ua.includes('ipad')) ? 'Tablet' : 'Desktop'; // NOSONAR - simple ternary

    // Detect OS via ordered rules
    const osRules = [
        ['windows nt 10', 'Windows 10'],
        ['windows nt 11', 'Windows 11'],
        ['windows', 'Windows'],
        ['mac os x', 'macOS'],
        ['iphone', 'iOS (iPhone)'],
        ['ipad', 'iOS (iPad)'],
        ['android 15', 'Android 15'],
        ['android 14', 'Android 14'],
        ['android 13', 'Android 13'],
        ['android', 'Android'],
        ['linux', 'Linux']
    ];
    const os = (osRules.find(([key]) => ua.includes(key)) || [null, 'Unknown OS'])[1];

    // Detect browser via ordered rules
    const browserRules = [
        ['edg/', 'Microsoft Edge'],
        ['chrome/', 'Google Chrome'],
        ['firefox/', 'Firefox'],
        ['opera/', 'Opera']
    ];
    let browser = 'Unknown Browser';
    const matchedBrowser = browserRules.find(([key]) => ua.includes(key));
    if (matchedBrowser) {
        browser = matchedBrowser[1];
    } else if (ua.includes('safari/') && !ua.includes('chrome')) {
        browser = 'Safari';
    }

    const deviceName = `${deviceType} - ${os} (${browser})`;

    return { deviceType, os, browser, deviceName };
};

/**
 * Check if IP is in allowed whitelist (ONLY localhost - nothing else)
 * Only localhost (127.0.0.1, ::1) bypasses all checks
 * ALL other IPs including local network MUST go through IP control
 */
const isWhitelistedIP = (ip) => {
    const whitelist = [
        '127.0.0.1',
        'localhost',
        '::1',
        '::ffff:127.0.0.1'
    ];
    
    // CRITICAL: Never auto-whitelist local network IPs (192.168.x.x, 10.x.x.x)
    // These MUST be explicitly allowed in ip_access_control table
    return whitelist.includes(ip);
};

/**
 * Check if route should bypass IP firewall
 * Health checks, metrics, and public endpoints
 */
const shouldBypassFirewall = (req) => {
    // ⚠️ SECURITY: ONLY truly public routes should bypass
    // Health checks, metrics, and monitoring endpoints MUST NOT bypass
    // Blocked IPs should be blocked EVERYWHERE
    const bypassRoutes = [
        // IP Check endpoint (MUST bypass to allow frontend IP guard to work)
        '/api/ip/check',
        
        // Login/Auth endpoints (users need to access these even if pending)
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        
        // Static assets only
        '/assets/',
        '/uploads/'
    ];
    
    return bypassRoutes.some(route => req.path.startsWith(route));
};

const isHotReadPath = (req) => {
    if (req.method === 'GET') {
        return /^\/api\/(health|kiosk|stock)(\/|$)/.test(req.path || '');
    }

    if (req.method === 'POST') {
        return /^\/api\/compatibility\/(analyze|batch|batch-analyze|ram-slots|storage-slots|matrix\/quick-check)(\/|$)/.test(req.path || '');
    }

    return false;
};

const runInBackground = (label, task) => {
    setImmediate(() => {
        task().catch((error) => {
            logger.error(`${label} failed:`, error.message);
        });
    });
};

const shouldSampleHotPathAccess = () => HOT_PATH_ACCESS_LOG_SAMPLE_RATE > 0 && Math.random() < HOT_PATH_ACCESS_LOG_SAMPLE_RATE;

const shouldUpdateHotPathActivity = (ipControlId) => {
    const now = Date.now();
    const lastSeen = hotPathActivityLastSeen.get(ipControlId) || 0;
    if ((now - lastSeen) < HOT_PATH_ACTIVITY_INTERVAL_MS) {
        return false;
    }

    hotPathActivityLastSeen.set(ipControlId, now);
    return true;
};

/**
 * Log IP access attempt to database
 */
const logIPAccess = async (ipControlId, req, success, blockedReason = null) => {
    try {
        const ip = extractClientIP(req);
        const userAgent = req.headers['user-agent'] || null;
        const fingerprint = generateDeviceFingerprint(req);
        const userId = req.user?.id || null;
        
        // Determine action type
        let actionType;
        if (req.path.includes('/auth/login')) actionType = 'login_attempt';
        else if (success) actionType = 'access_granted';
        else actionType = 'access_blocked';
        
        await query(`
            INSERT INTO ip_logs (
                ip_address, 
                ip_control_id, 
                request_method, 
                request_path, 
                response_status,
                user_agent, 
                device_fingerprint, 
                user_id, 
                action_type, 
                success, 
                blocked_reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
            ip,
            ipControlId,
            req.method,
            req.path,
            success ? 200 : 403,
            userAgent,
            fingerprint,
            userId,
            actionType,
            success,
            blockedReason
        ]);
    } catch (error) {
        logger.error('IP Log failed:', error.message);
        // Don't throw - logging failure shouldn't block requests
    }
};

/**
 * Update IP control record with latest activity
 */
const updateIPActivity = async (ipControlId, req) => {
    try {
        const userAgent = req.headers['user-agent'] || null;
        const fingerprint = generateDeviceFingerprint(req);
        const deviceInfo = parseUserAgent(userAgent);
        
        await query(`
            UPDATE ip_access_control 
            SET 
                last_seen = NOW(),
                total_requests = total_requests + 1,
                user_agent = $1,
                device_fingerprint = $2,
                device_name = COALESCE(device_name, $3)
            WHERE id = $4
        `, [
            userAgent,
            fingerprint,
            deviceInfo.deviceName,
            ipControlId
        ]);
    } catch (error) {
        logger.error('IP activity update failed:', error.message);
    }
};

const recordAllowedAccess = async (ipControlId, req) => {
    if (!isHotReadPath(req)) {
        await updateIPActivity(ipControlId, req);
        await logIPAccess(ipControlId, req, true);
        return;
    }

    if (shouldUpdateHotPathActivity(ipControlId)) {
        runInBackground('IP hot-path activity update', () => updateIPActivity(ipControlId, req));
    }

    if (shouldSampleHotPathAccess()) {
        runInBackground('IP hot-path access log', () => logIPAccess(ipControlId, req, true));
    }
};

/**
 * Register new IP address as "pending"
 */
const registerNewIP = async (ip, req) => {
    try {
        const userAgent = req.headers['user-agent'] || null;
        const fingerprint = generateDeviceFingerprint(req);
        const deviceInfo = parseUserAgent(userAgent);
        
        const result = await query(`
            INSERT INTO ip_access_control (
                ip_address, 
                status, 
                device_name,
                user_agent, 
                device_fingerprint,
                total_requests
            ) VALUES ($1, 'pending', $2, $3, $4, 1)
            ON CONFLICT (ip_address) DO UPDATE
            SET 
                last_seen = NOW(),
                total_requests = ip_access_control.total_requests + 1,
                device_name = EXCLUDED.device_name,
                user_agent = EXCLUDED.user_agent,
                device_fingerprint = EXCLUDED.device_fingerprint
            RETURNING id, status
        `, [ip, deviceInfo.deviceName, userAgent, fingerprint]);
        
        return result.rows[0];
    } catch (error) {
        logger.error('IP registration failed:', error.message);
        // Return null if registration fails (fail-open for new IPs)
        return null;
    }
};

/**
 * Register whitelisted IP address as "allowed"
 * Localhost and internal network IPs are auto-approved
 */
const registerWhitelistedIP = async (ip, req) => {
    try {
        const userAgent = req.headers['user-agent'] || null;
        const fingerprint = generateDeviceFingerprint(req);
        const deviceInfo = parseUserAgent(userAgent);
        
        // Determine device name based on IP
        let deviceName = deviceInfo.deviceName;
        if (ip === '127.0.0.1' || ip === 'localhost') {
            deviceName = `Localhost (${deviceInfo.os} - ${deviceInfo.browser})`;
        } else if (ip === '::1') {
            deviceName = `Localhost IPv6 (${deviceInfo.os})`;
        } else if (ip === '::ffff:127.0.0.1') {
            deviceName = `Localhost IPv4-mapped (${deviceInfo.os})`;
        } else if (ip.startsWith('192.168.')) {
            deviceName = `Local Network - ${deviceInfo.deviceName}`;
        } else if (ip.startsWith('10.')) {
            deviceName = `Internal Network - ${deviceInfo.deviceName}`;
        }
        
        const result = await query(`
            INSERT INTO ip_access_control (
                ip_address, 
                status, 
                device_name,
                user_agent, 
                device_fingerprint,
                total_requests,
                notes
            ) VALUES ($1, 'allowed', $2, $3, $4, 1, 'Auto-approved whitelisted IP')
            ON CONFLICT (ip_address) DO UPDATE
            SET 
                last_seen = NOW(),
                total_requests = ip_access_control.total_requests + 1,
                user_agent = EXCLUDED.user_agent,
                device_fingerprint = EXCLUDED.device_fingerprint,
                device_name = EXCLUDED.device_name
            RETURNING id, status
        `, [ip, deviceName, userAgent, fingerprint]);
        
        return result.rows[0];
    } catch (error) {
        logger.error('Whitelisted IP registration failed:', error.message);
        return null;
    }
};

// Global IP cache to reduce database hits
const ipCache = new Map();
const CACHE_TTL = 1000; // 1 second cache for INSTANT block enforcement

/**
 * Get IP status from cache or database
 */
const getIPStatus = async (clientIP) => {
    const cached = ipCache.get(clientIP);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }
    
    const ipResult = await query(`
        SELECT id, ip_address, status, blocked_reason, failed_login_attempts
        FROM ip_access_control
        WHERE ip_address = $1
    `, [clientIP]);
    
    const data = ipResult.rows[0] || null;
    ipCache.set(clientIP, { data, timestamp: Date.now() });
    return data;
};

/**
 * Invalidate IP cache entry
 */
const invalidateIPCache = (clientIP) => {
    ipCache.delete(clientIP);
};

/**
 * Handle registration of a new IP (not seen before)
 */
const handleNewIPRegistration = async (clientIP, isLocalhost, req) => {
    let ipControl;
    if (isLocalhost) {
        ipControl = await registerWhitelistedIP(clientIP, req);
    } else {
        ipControl = await registerNewIP(clientIP, req);
    }

    if (!ipControl) {
        logger.warn(`IP ${clientIP} registration failed - allowing request`);
        return null;
    }

    ipCache.set(clientIP, { data: ipControl, timestamp: Date.now() });
    logger.info(`🆕 New IP detected: ${clientIP} - registered as ${isLocalhost ? 'ALLOWED (localhost)' : 'PENDING'}`);

    if (globalThis.io) {
        globalThis.io.emit('newIPDetected', {
            ip: clientIP,
            userAgent: req.headers['user-agent'],
            path: req.path,
            timestamp: new Date().toISOString()
        });
    }

    return ipControl;
};

/**
 * Handle blocked IP response
 */
const handleBlockedIP = async (ipControl, clientIP, req, res) => {
    logger.warn(`🚫 BLOCKED IP attempt: ${clientIP} - Reason: ${ipControl.blocked_reason}`);
    await logIPAccess(ipControl.id, req, false, ipControl.blocked_reason);

    if (globalThis.io) {
        globalThis.io.emit('blockedIPAttempt', {
            ip: clientIP,
            reason: ipControl.blocked_reason,
            path: req.path,
            timestamp: new Date().toISOString()
        });
    }

    return res.status(403).json({
        error: 'Access Denied',
        message: 'Your device has been blocked from accessing this system.',
        code: 'IP_BLOCKED',
        ip: clientIP,
        timestamp: new Date().toISOString()
    });
};

/**
 * Handle pending IP access check
 */
const handlePendingIP = async (ipControl, clientIP, req, res) => {
    const allowedForPending = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/health',
        '/api/products',
        '/api/kiosk/categories',
        '/api/kiosk/featured'
    ];

    const isAllowedPath = allowedForPending.some(route => req.path.startsWith(route));

    if (!isAllowedPath) {
        logger.warn(`⏳ PENDING IP restricted: ${clientIP} - Path: ${req.path}`);
        await logIPAccess(ipControl.id, req, false, 'Pending IP - limited access');
        return res.status(403).json({
            error: 'Access Restricted',
            message: 'Your device is pending approval. Please contact administrator.',
            code: 'IP_PENDING',
            timestamp: new Date().toISOString()
        });
    }

    return null; // allowed
};

/**
 * Main IP Firewall Middleware
 * MUST run BEFORE authentication and route handlers
 */
const ipFirewall = async (req, res, next) => {
    const startTime = Date.now();
    
    try {
        const clientIP = extractClientIP(req);
        req.clientIP = clientIP;
        
        logger.debug(`🌐 IP Detection: ${clientIP} | ${req.method} ${req.path}`);
        
        if (shouldBypassFirewall(req)) {
            return next();
        }
        
        const isLocalhost = isWhitelistedIP(clientIP);
        let ipControl = await getIPStatus(clientIP);
        
        if (!ipControl) {
            ipControl = await handleNewIPRegistration(clientIP, isLocalhost, req);
            if (!ipControl) return next();
        }
        
        if (isLocalhost) {
            await recordAllowedAccess(ipControl.id, req);
            req.ipControl = ipControl;
            return next();
        }
        
        if (ipControl.status === 'blocked') {
            await updateIPActivity(ipControl.id, req);
            return handleBlockedIP(ipControl, clientIP, req, res);
        }
        
        if (ipControl.status === 'pending') {
            await updateIPActivity(ipControl.id, req);
            const denied = await handlePendingIP(ipControl, clientIP, req, res);
            if (denied) return;
        }
        
        await recordAllowedAccess(ipControl.id, req);
        req.ipControl = ipControl;
        next();
        
    } catch (error) {
        logger.error('IP Firewall error:', error);
        const protectedPath = /^\/api\/(admin|auth|users|settings|rules|system|metrics|cache)/.test(req.path || '');
        if (protectedPath) {
            return res.status(503).json({
                success: false,
                message: 'Security access check is temporarily unavailable'
            });
        }
        logger.warn('IP Firewall check failed - allowing public kiosk request only');
        next();
    } finally {
        const duration = Date.now() - startTime;
        if (duration > 100) {
            logger.warn(`IP Firewall slow check: ${duration}ms for ${req.path}`);
        }
    }
};

/**
 * Track failed login attempts per IP
 */
const trackFailedLogin = async (ip) => {
    try {
        await query(`
            UPDATE ip_access_control 
            SET failed_login_attempts = failed_login_attempts + 1
            WHERE ip_address = $1
        `, [ip]);
        
        logger.warn(`Failed login from IP: ${ip}`);
    } catch (error) {
        logger.error('Failed login tracking error:', error.message);
    }
};

/**
 * Reset failed login attempts on successful login
 */
const resetFailedLogins = async (ip) => {
    try {
        await query(`
            UPDATE ip_access_control 
            SET failed_login_attempts = 0
            WHERE ip_address = $1
        `, [ip]);
    } catch (error) {
        logger.error('Reset failed logins error:', error.message);
    }
};

module.exports = {
    ipFirewall,
    extractClientIP,
    trackFailedLogin,
    resetFailedLogins,
    generateDeviceFingerprint,
    isWhitelistedIP,
    invalidateIPCache
};
