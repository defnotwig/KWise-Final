/**
 * =====================================================
 * IP ACCESS CONTROL ROUTES
 * =====================================================
 * Purpose: API endpoints for IP management
 * Author: K-Wise Security Team
 * Date: November 18, 2025
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const {
    getAllIPs,
    getIPStats,
    allowIP,
    blockIP,
    updateDeviceName,
    deleteIP,
    getIPLogs,
    getIPDetails
} = require('../controllers/ipAccessController');

/**
 * GET /api/ip/check
 * Check current IP status (PUBLIC ENDPOINT - runs before auth)
 * Used by frontend IP guard to block access before rendering
 */
router.get('/check', async (req, res) => {
    try {
        const { query } = require('../config/db');
        const logger = require('../utils/logger');
        
        // Extract client IP (same logic as IP firewall)
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                        req.headers['x-real-ip'] ||
                        req.socket.remoteAddress ||
                        req.connection.remoteAddress ||
                        req.ip;

        logger.info(`🔍 IP Check Request from: ${clientIP}`);

        // Query database for IP status
        const result = await query(
            `SELECT id, ip_address, status, device_name, blocked_reason, blocked_at
             FROM ip_access_control
             WHERE ip_address = $1`,
            [clientIP]
        );

        if (result.rows.length === 0) {
            // IP not in database - allow access (will be added on first API call)
            return res.json({
                success: true,
                status: 'allowed',
                ip: clientIP,
                message: 'Access granted'
            });
        }

        const ipControl = result.rows[0];

        if (ipControl.status === 'blocked') {
            // IP is blocked - return 403
            logger.warn(`🚫 Frontend IP check: ${clientIP} is BLOCKED`);
            return res.status(403).json({
                success: false,
                status: 'blocked',
                ip: clientIP,
                blockedReason: ipControl.blocked_reason,
                message: 'Your device has been blocked from accessing this system.',
                code: 'IP_BLOCKED'
            });
        }

        // IP is allowed or pending
        return res.json({
            success: true,
            status: ipControl.status,
            ip: clientIP,
            deviceName: ipControl.device_name,
            message: 'Access granted'
        });

    } catch (error) {
        console.error('❌ Error checking IP status:', error);
        // On error, allow access (fail-open for availability)
        return res.status(500).json({
            success: false,
            message: 'Failed to check IP status',
            error: error.message
        });
    }
});

// All OTHER routes require authentication
router.use(protect);

// Admin and Superadmin only for IP management
const adminOnly = roleCheck(['admin', 'superadmin']);

/**
 * GET /api/ip/all
 * Get all IP addresses with filtering and pagination
 * Query params: page, limit, status, search, sortBy, sortOrder
 */
router.get('/all', adminOnly, getAllIPs);

/**
 * GET /api/ip/stats
 * Get IP statistics summary
 */
router.get('/stats', adminOnly, getIPStats);

/**
 * GET /api/ip/logs
 * Get IP access logs with filtering
 * Query params: page, limit, ipAddress, actionType, success, startDate, endDate
 */
router.get('/logs', adminOnly, getIPLogs);

/**
 * GET /api/ip/:id
 * Get detailed info for a specific IP
 */
router.get('/:id', adminOnly, getIPDetails);

/**
 * PUT /api/ip/:id/allow
 * Allow an IP address
 */
router.put('/:id/allow', adminOnly, allowIP);

/**
 * PUT /api/ip/:id/block
 * Block an IP address
 * Body: { reason: string }
 */
router.put('/:id/block', adminOnly, blockIP);

/**
 * PUT /api/ip/:id/device-name
 * Update IP device name
 * Body: { deviceName: string }
 */
router.put('/:id/device-name', adminOnly, updateDeviceName);

/**
 * DELETE /api/ip/:id
 * Delete an IP record
 */
router.delete('/:id', adminOnly, deleteIP);

/**
 * GET /api/ip/events/stream
 * Server-Sent Events for real-time IP updates
 */
router.get('/events/stream', adminOnly, (req, res) => {
    // Set headers for SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true'
    });

    // Send initial heartbeat
    res.write(`event: heartbeat\ndata: {"status":"connected","timestamp":"${new Date().toISOString()}"}\n\n`);

    // Create client object
    const client = {
        id: Date.now() + Math.random(),
        res,
        connected: true
    };

    // Add to global SSE clients registry (if available)
    if (global.ipAccessClients) {
        global.ipAccessClients.add(client);
    } else {
        global.ipAccessClients = new Set([client]);
    }

    // Heartbeat interval
    const heartbeat = setInterval(() => {
        if (client.connected) {
            try {
                res.write(`event: heartbeat\ndata: {"timestamp":"${new Date().toISOString()}"}\n\n`);
            } catch (error) {
                client.connected = false;
                clearInterval(heartbeat);
                if (global.ipAccessClients) {
                    global.ipAccessClients.delete(client);
                }
            }
        }
    }, 30000); // 30 seconds

    // Handle client disconnect
    req.on('close', () => {
        client.connected = false;
        clearInterval(heartbeat);
        if (global.ipAccessClients) {
            global.ipAccessClients.delete(client);
        }
    });

    req.on('error', () => {
        client.connected = false;
        clearInterval(heartbeat);
        if (global.ipAccessClients) {
            global.ipAccessClients.delete(client);
        }
    });
});

module.exports = router;
