const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const logger = require('../utils/logger');
const { protect, restrictTo } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const isTest = process.env.NODE_ENV === 'test' || process.env.BYPASS_AUTH_FOR_TESTS === 'true';

/**
 * Server-Sent Events (SSE) endpoints for real-time updates
 * Provides live streaming of orders and logs to admin dashboard
 * 
 * ✅ CRITICAL FIX: EventSource API doesn't support custom headers,
 * so we accept tokens via query parameter for SSE endpoints
 */

// Store active SSE connections
const activeConnections = {
    orders: new Set(),
    logs: new Set()
};

/**
 * SSE Authentication Middleware
 * Accepts token from query parameter since EventSource doesn't support custom headers
 */
const sseAuth = async (req, res, next) => {
    try {
        // Get token from query parameter (EventSource limitation)
        const token = req.query.token;
        
        if (!token) {
            res.status(401).json({ 
                success: false, 
                error: 'No authentication token provided' 
            });
            return;
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const userResult = await query(
            'SELECT * FROM users WHERE id = $1 AND is_active = true', 
            [decoded.id]
        );
        
        if (userResult.rows.length === 0) {
            res.status(401).json({ 
                success: false, 
                error: 'User not found or inactive' 
            });
            return;
        }

        // Attach user to request
        req.user = userResult.rows[0];
        next();
    } catch (error) {
        logger.error('SSE authentication error:', error.message);
        res.status(401).json({ 
            success: false, 
            error: 'Invalid or expired token' 
        });
    }
};

/**
 * GET /api/realtime/orders
 * SSE endpoint for real-time order updates
 * RBAC: admin, superadmin
 * Authentication: Token via query parameter (?token=xxx) - EventSource limitation
 */
router.get('/orders', sseAuth, restrictTo('admin', 'superadmin'), async (req, res) => {
    logger.info(`📡 SSE Orders connection established for user ${req.user.id}`);
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ 
        type: 'connected',
        message: 'SSE Orders stream established',
        timestamp: new Date().toISOString()
    })}\n\n`);
    // In test mode immediately emit heartbeat so tests can trigger helpers without waiting
    if (isTest) {
        res.write('event: heartbeat\ndata: "test"\n\n');
    }
    
    // Create client identifier
    const clientId = `${req.user.id}-${Date.now()}`;
    const client = { id: clientId, res, user: req.user };

    // Register in global SSE registry for helpers
    let sseClients = req.app.get('sseClients');
    if (!sseClients) {
        sseClients = { users: new Set(), logs: new Set(), orders: new Set(), queue: new Set(), stock: new Set(), notifications: new Set() };
        req.app.set('sseClients', sseClients);
    }
    sseClients.orders.add(client);

    // Add to local connections
    activeConnections.orders.add(client);
    logger.info(`📈 Active order SSE connections: ${activeConnections.orders.size}`);
    
    // Send initial data - recent orders
    try {
        const recentOrders = await query(`
            SELECT id, customer_name, total_amount, status, queue_number, created_at
            FROM orders
            ORDER BY created_at DESC
            LIMIT 10
        `);
        
        res.write(`data: ${JSON.stringify({
            type: 'initial',
            orders: recentOrders.rows,
            timestamp: new Date().toISOString()
        })}\n\n`);
    } catch (error) {
        logger.error('Error fetching initial orders:', error);
    }
    
    // Keep-alive ping every 30 seconds (skip timer in test to avoid open handles)
    const keepAliveInterval = isTest ? null : setInterval(() => {
        res.write(`event: heartbeat\ndata: "ping"\n\n`);
    }, 30000);
    
    // Handle client disconnect
    req.on('close', () => {
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        activeConnections.orders.delete(client);
        if (sseClients?.orders) sseClients.orders.delete(client);
        logger.info(`📉 SSE Orders client disconnected. Active: ${activeConnections.orders.size}`);
        res.end();
    });
});

/**
 * GET /api/realtime/logs
 * SSE endpoint for real-time log updates
 * RBAC: superadmin only
 * Authentication: Token via query parameter (?token=xxx) - EventSource limitation
 */
router.get('/logs', sseAuth, restrictTo('superadmin'), async (req, res) => {
    logger.info(`📡 SSE Logs connection established for user ${req.user.id}`);
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ 
        type: 'connected',
        message: 'SSE Logs stream established',
        timestamp: new Date().toISOString()
    })}\n\n`);
    if (isTest) {
        res.write('event: heartbeat\ndata: "test"\n\n');
    }
    
    // Create client identifier
    const clientId = `${req.user.id}-${Date.now()}`;
    const client = { id: clientId, res, user: req.user };

    let sseClients = req.app.get('sseClients');
    if (!sseClients) {
        sseClients = { users: new Set(), logs: new Set(), orders: new Set(), queue: new Set(), stock: new Set(), notifications: new Set() };
        req.app.set('sseClients', sseClients);
    }
    sseClients.logs.add(client);

    // Add to active connections
    activeConnections.logs.add(client);
    logger.info(`📈 Active log SSE connections: ${activeConnections.logs.size}`);
    
    // Send initial data - recent logs
    try {
        const recentLogs = await query(`
            SELECT id, user_id, role, action, description, ip_address, created_at, status
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 20
        `);
        
        res.write(`data: ${JSON.stringify({
            type: 'initial',
            logs: recentLogs.rows,
            timestamp: new Date().toISOString()
        })}\n\n`);
    } catch (error) {
        logger.error('Error fetching initial logs:', error);
    }
    
    // Keep-alive ping every 30 seconds (skip timer in test to avoid open handles)
    const keepAliveInterval = isTest ? null : setInterval(() => {
        res.write(`event: heartbeat\ndata: "ping"\n\n`);
    }, 30000);
    
    // Handle client disconnect
    req.on('close', () => {
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        activeConnections.logs.delete(client);
        if (sseClients?.logs) sseClients.logs.delete(client);
        logger.info(`📉 SSE Logs client disconnected. Active: ${activeConnections.logs.size}`);
        res.end();
    });
});

/**
 * Broadcast new order to all connected clients
 * Called from order creation endpoints
 */
function broadcastOrder(order) {
    const message = `data: ${JSON.stringify({
        type: 'new_order',
        order: order,
        timestamp: new Date().toISOString()
    })}\n\n`;
    
    activeConnections.orders.forEach(client => {
        try {
            client.res.write(message);
        } catch (error) {
            logger.error('Error broadcasting order to client:', error);
            activeConnections.orders.delete(client);
        }
    });
    
    logger.info(`📤 Broadcasted order ${order.id} to ${activeConnections.orders.size} clients`);
}

/**
 * Broadcast order status update to all connected clients
 */
function broadcastOrderUpdate(orderId, status) {
    const message = `data: ${JSON.stringify({
        type: 'order_updated',
        orderId: orderId,
        status: status,
        timestamp: new Date().toISOString()
    })}\n\n`;
    
    activeConnections.orders.forEach(client => {
        try {
            client.res.write(message);
        } catch (error) {
            logger.error('Error broadcasting order update to client:', error);
            activeConnections.orders.delete(client);
        }
    });
}

/**
 * Broadcast new log entry to all connected clients
 * Called from audit logging
 */
function broadcastLog(logEntry) {
    const message = `data: ${JSON.stringify({
        type: 'new_log',
        log: logEntry,
        timestamp: new Date().toISOString()
    })}\n\n`;
    
    activeConnections.logs.forEach(client => {
        try {
            client.res.write(message);
        } catch (error) {
            logger.error('Error broadcasting log to client:', error);
            activeConnections.logs.delete(client);
        }
    });
}

/**
 * GET /api/realtime/stats
 * Get current SSE connection statistics
 */
router.get('/stats', protect, restrictTo('superadmin'), (req, res) => {
    res.json({
        success: true,
        data: {
            activeOrderStreams: activeConnections.orders.size,
            activeLogStreams: activeConnections.logs.size,
            totalConnections: activeConnections.orders.size + activeConnections.logs.size,
            timestamp: new Date().toISOString()
        }
    });
});

// Export router and broadcast functions
module.exports = {
    router,
    broadcastOrder,
    broadcastOrderUpdate,
    broadcastLog
};

