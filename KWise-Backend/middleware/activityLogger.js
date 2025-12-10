const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Comprehensive Activity Logger Middleware
 * Logs ALL admin activities including button clicks, page views, and actions
 * Accessible ONLY by SUPERADMIN
 */

// Activity categories
const ACTIVITY_CATEGORIES = {
    VIEW: 'VIEW',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    EXPORT: 'EXPORT',
    FILTER: 'FILTER',
    SEARCH: 'SEARCH',
    CLICK: 'CLICK',
    NAVIGATE: 'NAVIGATE'
};

/**
 * Log activity to audit_logs table
 */
async function logActivity(userId, role, action, description, ipAddress, metadata = {}) {
    try {
        await query(`
            INSERT INTO audit_logs (user_id, role, action, description, ip_address, metadata, created_at, status)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'SUCCESS')
        `, [userId, role, action, description, ipAddress, JSON.stringify(metadata)]);
        
        logger.info(`✅ Activity logged: ${action} by ${role} (${userId})`);
    } catch (error) {
        logger.error('Failed to log activity:', error);
    }
}

/**
 * Middleware to automatically log API requests
 */
const autoLogActivity = async (req, res, next) => {
    // Skip logging for health checks and static files
    if (req.path === '/api/health' || req.path.startsWith('/static/')) {
        return next();
    }

    // Only log authenticated requests
    if (!req.user) {
        return next();
    }

    const originalSend = res.send;
    const originalJson = res.json;
    
    // Capture response for status
    res.send = function (data) {
        res.locals.responseData = data;
        return originalSend.call(this, data);
    };
    
    res.json = function (data) {
        res.locals.responseData = data;
        return originalJson.call(this, data);
    };

    // Log after response is sent
    res.on('finish', async () => {
        try {
            const method = req.method;
            const path = req.path;
            const statusCode = res.statusCode;
            const userId = req.user.id;
            const role = req.user.role;
            const ipAddress = req.ip || req.connection.remoteAddress;

            // Determine action based on method and path
            let action = 'UNKNOWN';
            let description = `${method} ${path}`;

            if (method === 'GET') {
                if (path.includes('/dashboard')) {
                    action = 'VIEW_DASHBOARD';
                    description = 'Viewed admin dashboard';
                } else if (path.includes('/stock')) {
                    action = 'VIEW_STOCK';
                    description = 'Viewed stock inventory';
                } else if (path.includes('/orders')) {
                    action = 'VIEW_ORDERS';
                    description = 'Viewed orders';
                } else if (path.includes('/users') || path.includes('/accounts')) {
                    action = 'VIEW_USERS';
                    description = 'Viewed user accounts';
                } else if (path.includes('/logs')) {
                    action = 'VIEW_LOGS';
                    description = 'Viewed system logs';
                } else if (path.includes('/search')) {
                    action = 'SEARCH';
                    description = `Searched: ${req.query.q || 'N/A'}`;
                } else {
                    action = 'VIEW';
                    description = `Viewed ${path}`;
                }
            } else if (method === 'POST') {
                if (path.includes('/auth/login')) {
                    action = 'LOGIN';
                    description = 'User logged in successfully';
                } else if (path.includes('/auth/logout')) {
                    action = 'LOGOUT';
                    description = 'User logged out';
                } else if (path.includes('/create') || path.includes('/add')) {
                    action = 'CREATE';
                    description = `Created new item at ${path}`;
                } else {
                    action = 'ACTION';
                    description = `Performed action: ${path}`;
                }
            } else if (method === 'PUT' || method === 'PATCH') {
                action = 'UPDATE';
                description = `Updated item at ${path}`;
            } else if (method === 'DELETE') {
                action = 'DELETE';
                description = `Deleted item at ${path}`;
            }

            // Extract more details from request body/query
            const metadata = {
                method,
                path,
                statusCode,
                query: req.query,
                bodyKeys: req.body ? Object.keys(req.body) : [],
                userAgent: req.headers['user-agent'],
                referer: req.headers['referer']
            };

            // Only log if status indicates success or meaningful action
            if (statusCode < 500) {
                await logActivity(userId, role, action, description, ipAddress, metadata);
            }

        } catch (error) {
            logger.error('Error in autoLogActivity middleware:', error);
        }
    });

    next();
};

/**
 * Manual activity logging helper for specific events
 */
function createActivityLogger(category) {
    return async (req, action, description, additionalMetadata = {}) => {
        if (!req.user) return;

        const userId = req.user.id;
        const role = req.user.role;
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        const metadata = {
            category,
            timestamp: new Date().toISOString(),
            ...additionalMetadata
        };

        await logActivity(userId, role, action, description, ipAddress, metadata);
    };
}

/**
 * Log button clicks and UI interactions (from frontend)
 */
const logUIInteraction = async (req, res) => {
    try {
        const { action, description, component, metadata } = req.body;
        
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const userId = req.user.id;
        const role = req.user.role;
        const ipAddress = req.ip || req.connection.remoteAddress;

        const fullMetadata = {
            component,
            interactionType: 'UI',
            ...metadata
        };

        await logActivity(userId, role, action, description, ipAddress, fullMetadata);

        res.json({ success: true, message: 'Activity logged' });

    } catch (error) {
        logger.error('Error logging UI interaction:', error);
        res.status(500).json({ success: false, message: 'Failed to log activity' });
    }
};

module.exports = {
    autoLogActivity,
    logActivity,
    createActivityLogger,
    logUIInteraction,
    ACTIVITY_CATEGORIES
};

