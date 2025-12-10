const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Admin Activity Tracking Middleware
 * Updates user activity when they access admin features
 * Provides real-time admin presence tracking
 */
const trackAdminActivity = async (req, res, next) => {
    // Only track for authenticated admin users
    if (!req.user || !['admin', 'superadmin', 'developer'].includes(req.user.role)) {
        return next();
    }

    try {
        // Update user's admin activity timestamp and ensure they're marked as online
        await db.query(`
            UPDATE users 
            SET 
                last_active_at = NOW(),
                last_admin_access = NOW(),
                is_online = true,
                online_status = 'active_admin',
                updated_at = NOW()
            WHERE id = $1 AND is_active = true
        `, [req.user.id]);

        // Log admin activity for audit trail
        logger.info(`Admin activity tracked: ${req.user.name} accessed ${req.originalUrl}`, {
            service: 'pc-wise-admin',
            userId: req.user.id,
            userRole: req.user.role,
            endpoint: req.originalUrl,
            method: req.method,
            adminActivity: true
        });

    } catch (error) {
        // Don't fail the request if activity tracking fails
        logger.warn(`Failed to track admin activity for user ${req.user.id}: ${error.message}`, {
            service: 'pc-wise-admin',
            userId: req.user.id,
            error: error.message
        });
    }

    next();
};

/**
 * Real-time Admin Presence Update
 * Call this when user enters/exits admin dashboard
 */
const updateAdminPresence = async (userId, isActive = true) => {
    try {
        const status = isActive ? 'active_admin' : 'online';
        const lastAdminAccess = isActive ? 'NOW()' : 'last_admin_access';

        await db.query(`
            UPDATE users 
            SET 
                last_active_at = NOW(),
                ${isActive ? 'last_admin_access = NOW(),' : ''}
                is_online = $2,
                online_status = $3,
                updated_at = NOW()
            WHERE id = $1 AND is_active = true
        `, [userId, isActive, status]);

        logger.info(`Admin presence updated: User ${userId} ${isActive ? 'entered' : 'exited'} admin dashboard`, {
            service: 'pc-wise-admin',
            userId: userId,
            adminPresence: isActive,
            status: status
        });

        return true;
    } catch (error) {
        logger.error(`Failed to update admin presence for user ${userId}: ${error.message}`, {
            service: 'pc-wise-admin',
            userId: userId,
            error: error.message
        });
        return false;
    }
};

/**
 * Get Real-time Admin Users
 * Returns users currently active in admin dashboard
 */
const getActiveAdminUsers = async () => {
    try {
        const result = await db.query(`
            SELECT 
                id, name, email, role, 
                last_active_at, last_admin_access, 
                online_status, is_online
            FROM users 
            WHERE 
                is_active = true 
                AND last_active_at >= NOW() - INTERVAL '5 minutes'
                AND (
                    online_status = 'active_admin' 
                    OR last_admin_access >= NOW() - INTERVAL '10 minutes'
                )
            ORDER BY last_admin_access DESC, last_active_at DESC
        `);

        return result.rows;
    } catch (error) {
        logger.error(`Failed to get active admin users: ${error.message}`, {
            service: 'pc-wise-admin',
            error: error.message
        });
        return [];
    }
};

/**
 * Enhanced Login Activity Update
 * Updates user status with admin tracking capabilities
 */
const updateLoginActivity = async (userId, userRole) => {
    try {
        const isAdminRole = ['admin', 'superadmin', 'developer'].includes(userRole);
        
        await db.query(`
            UPDATE users 
            SET 
                last_login = NOW(),
                last_login_at = NOW(),
                last_active_at = NOW(),
                is_online = true,
                online_status = $2,
                ${isAdminRole ? 'last_admin_access = NOW(),' : ''}
                updated_at = NOW()
            WHERE id = $1 AND is_active = true
        `, [userId, isAdminRole ? 'active_admin' : 'online']);

        logger.info(`Login activity updated for user ${userId}`, {
            service: 'pc-wise-admin',
            userId: userId,
            userRole: userRole,
            isAdminRole: isAdminRole
        });

        return true;
    } catch (error) {
        logger.error(`Failed to update login activity for user ${userId}: ${error.message}`, {
            service: 'pc-wise-admin',
            userId: userId,
            error: error.message
        });
        return false;
    }
};

/**
 * Enhanced Logout Activity Update
 * Immediately updates user status to offline
 */
const updateLogoutActivity = async (userId) => {
    try {
        await db.query(`
            UPDATE users 
            SET 
                last_active_at = NOW() - INTERVAL '10 minutes',
                is_online = false,
                online_status = 'offline',
                updated_at = NOW()
            WHERE id = $1 AND is_active = true
        `, [userId]);

        logger.info(`Logout activity updated for user ${userId}`, {
            service: 'pc-wise-admin',
            userId: userId,
            status: 'offline'
        });

        return true;
    } catch (error) {
        logger.error(`Failed to update logout activity for user ${userId}: ${error.message}`, {
            service: 'pc-wise-admin',
            userId: userId,
            error: error.message
        });
        return false;
    }
};

module.exports = {
    trackAdminActivity,
    updateAdminPresence,
    getActiveAdminUsers,
    updateLoginActivity,
    updateLogoutActivity
};
