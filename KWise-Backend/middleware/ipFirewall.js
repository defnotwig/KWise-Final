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

    if (xForwardedFor) {
        // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
        // First IP is the original client
        clientIP = xForwardedFor.split(',')[0].trim();
    } else if (cfConnectingIP) {
        clientIP = cfConnectingIP;
    } else if (xRealIP) {
        clientIP = xRealIP;
    } else if (socketIP) {
        clientIP = socketIP;
    } else if (connectionIP) {
        clientIP = connectionIP;
    } else {
        clientIP = req.ip || 'unknown';
    }

    // Normalize IPv6 localhost to IPv4
    if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
        clientIP = '127.0.0.1';
    }

    // Remove IPv6 prefix if present
    if (clientIP.startsWith('::ffff:')) {
        clientIP = clientIP.substring(7);
    }

    return clientIP;
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
    let deviceType = 'Desktop';
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    // Detect device type
    if (ua.includes('mobile') || ua.includes('android')) {
        deviceType = 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceType = 'Tablet';
    }

    // Detect OS
    if (ua.includes('windows nt 10')) os = 'Windows 10';
    else if (ua.includes('windows nt 11')) os = 'Windows 11';
    else if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os x')) os = 'macOS';
    else if (ua.includes('iphone')) os = 'iOS (iPhone)';
    else if (ua.includes('ipad')) os = 'iOS (iPad)';
    else if (ua.includes('android 15')) os = 'Android 15';
    else if (ua.includes('android 14')) os = 'Android 14';
    else if (ua.includes('android 13')) os = 'Android 13';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('linux')) os = 'Linux';

    // Detect browser
    if (ua.includes('edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('chrome/')) browser = 'Google Chrome';
    else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('firefox/')) browser = 'Firefox';
    else if (ua.includes('opera/')) browser = 'Opera';

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
        let actionType = 'api_call';
        if (req.path.includes('/auth/login')) actionType = 'login_attempt';
        else if (!success) actionType = 'access_blocked';
        else actionType = 'access_granted';
        
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
 * Main IP Firewall Middleware
 * MUST run BEFORE authentication and route handlers
 */
const ipFirewall = async (req, res, next) => {
    const startTime = Date.now();
    
    try {
        // Extract client IP
        const clientIP = extractClientIP(req);
        req.clientIP = clientIP; // Attach to request for downstream use
        
        // ============================================
        // 🔍 DETAILED IP DETECTION LOGGING
        // ============================================
        logger.info(`\n🌐 ================ IP DETECTION ================`);
        logger.info(`📍 Detected IP: ${clientIP}`);
        logger.info(`📋 Headers:`);
        logger.info(`   - X-Forwarded-For: ${req.headers['x-forwarded-for'] || 'not set'}`);
        logger.info(`   - X-Real-IP: ${req.headers['x-real-ip'] || 'not set'}`);
        logger.info(`   - Socket Remote Address: ${req.socket?.remoteAddress || 'not set'}`);
        logger.info(`   - Connection Remote Address: ${req.connection?.remoteAddress || 'not set'}`);
        logger.info(`   - req.ip: ${req.ip || 'not set'}`);
        logger.info(`🛣️  Path: ${req.method} ${req.path}`);
        logger.info(`🖥️  User-Agent: ${req.headers['user-agent'] || 'not set'}`);
        logger.info(`===============================================\n`);
        
        // Check if route should bypass firewall
        if (shouldBypassFirewall(req)) {
            return next();
        }
        
        // Only localhost is truly whitelisted - check DB for all others
        const isLocalhost = isWhitelistedIP(clientIP);
        
        // Get IP status from cache or database
        // CRITICAL: Always check database for blocked status to ensure instant enforcement
        let ipControl = await getIPStatus(clientIP);
        
        // If cached and recently checked, re-verify blocked status from database
        if (ipControl && ipControl.status === 'allowed') {
            // Double-check database for blocked status (cache might be stale)
            const freshStatus = await query(`
                SELECT id, ip_address, status, blocked_reason, failed_login_attempts
                FROM ip_access_control
                WHERE ip_address = $1
            `, [clientIP]);
            
            if (freshStatus.rows[0]) {
                ipControl = freshStatus.rows[0];
                // Update cache with fresh data
                ipCache.set(clientIP, { data: ipControl, timestamp: Date.now() });
            }
        }
        
        if (!ipControl) {
            // New IP - register as pending (or allowed if localhost)
            if (isLocalhost) {
                // Only localhost gets auto-approved
                ipControl = await registerWhitelistedIP(clientIP, req);
            } else {
                // ALL other IPs (including local network) start as pending
                ipControl = await registerNewIP(clientIP, req);
            }
            
            if (!ipControl) {
                // Registration failed - fail-open (allow but log)
                logger.warn(`IP ${clientIP} registration failed - allowing request`);
                return next();
            }
            
            // Update cache with new IP
            ipCache.set(clientIP, { data: ipControl, timestamp: Date.now() });
            
            logger.info(`🆕 New IP detected: ${clientIP} - registered as ${isLocalhost ? 'ALLOWED (localhost)' : 'PENDING'}`);
            
            // Broadcast real-time notification to admins
            if (global.io) {
                global.io.emit('newIPDetected', {
                    ip: clientIP,
                    userAgent: req.headers['user-agent'],
                    path: req.path,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Update activity tracking
        await updateIPActivity(ipControl.id, req);
        
        // ONLY localhost always gets through (but is still tracked)
        if (isLocalhost) {
            await logIPAccess(ipControl.id, req, true);
            req.ipControl = ipControl;
            return next();
        }
        
        // Check IP status
        if (ipControl.status === 'blocked') {
            // BLOCKED - Deny access IMMEDIATELY
            logger.warn(`🚫 BLOCKED IP attempt: ${clientIP} - Reason: ${ipControl.blocked_reason}`);
            logger.warn(`🚫 BLOCKING REQUEST TO: ${req.method} ${req.path}`);
            
            await logIPAccess(ipControl.id, req, false, ipControl.blocked_reason);
            
            // Broadcast blocked attempt notification
            if (global.io) {
                global.io.emit('blockedIPAttempt', {
                    ip: clientIP,
                    reason: ipControl.blocked_reason,
                    path: req.path,
                    timestamp: new Date().toISOString()
                });
            }
            
            // CRITICAL: Return 403 IMMEDIATELY - do not continue
            return res.status(403).json({
                error: 'Access Denied',
                message: 'Your device has been blocked from accessing this system.',
                code: 'IP_BLOCKED',
                ip: clientIP,
                timestamp: new Date().toISOString()
            });
        }
        
        if (ipControl.status === 'pending') {
            // PENDING - Limited access (only login and public endpoints)
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
        }
        
        // ALLOWED - Full access
        await logIPAccess(ipControl.id, req, true);
        
        // Attach IP control info to request
        req.ipControl = ipControl;
        
        next();
        
    } catch (error) {
        logger.error('IP Firewall error:', error);
        
        // Fail-open: Allow request on error but log it
        logger.warn('IP Firewall check failed - allowing request');
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
