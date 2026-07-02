/**
 * Enhanced Session Lock Service
 * Prevents duplicate orders and manages multi-tablet concurrency
 * Addresses all user experience and order accuracy issues
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');
const crypto = require('node:crypto');

class EnhancedSessionLockService {
    constructor() {
        this.lockTimeout = 300000; // 5 minutes
        this.sessionTimeout = 1800000; // 30 minutes
        
        // Start cleanup intervals
        this.startCleanupJobs();
    }

    /**
     * Initialize or update a kiosk session
     * @param {String} sessionId - Unique session identifier
     * @param {Object} sessionData - Session information (tablet_id, ip_address, user_agent, cart)
     * @returns {Promise<Object>} - Session information
     */
    async initializeSession(sessionId, sessionData = {}) {
        try {
            const { tablet_id, ip_address, user_agent, cart } = sessionData;
            
            // Calculate cart hash if cart is provided
            const cartHash = cart ? this.generateCartHash(cart) : null;

            const result = await query(`
                INSERT INTO kiosk_sessions (
                    session_id,
                    tablet_id,
                    ip_address,
                    user_agent,
                    current_cart,
                    cart_hash,
                    last_activity,
                    is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, true)
                ON CONFLICT (session_id) 
                DO UPDATE SET
                    tablet_id = EXCLUDED.tablet_id,
                    ip_address = EXCLUDED.ip_address,
                    user_agent = EXCLUDED.user_agent,
                    current_cart = EXCLUDED.current_cart,
                    cart_hash = EXCLUDED.cart_hash,
                    last_activity = CURRENT_TIMESTAMP,
                    is_active = true
                RETURNING *
            `, [sessionId, tablet_id, ip_address, user_agent, JSON.stringify(cart || {}), cartHash]);

            logger.info(`✅ Session initialized: ${sessionId} (Tablet: ${tablet_id || 'unknown'})`);
            return result.rows[0];

        } catch (error) {
            logger.error('❌ Error initializing session:', error);
            throw error;
        }
    }

    /**
     * Update session activity (heartbeat)
     * @param {String} sessionId - Session identifier
     * @param {Object} cart - Current cart state
     * @returns {Promise<Boolean>} - Success status
     */
    async updateSessionActivity(sessionId, cart = null) {
        try {
            const cartHash = cart ? this.generateCartHash(cart) : null;

            await query(`
                UPDATE kiosk_sessions
                SET 
                    last_activity = CURRENT_TIMESTAMP,
                    current_cart = COALESCE($2, current_cart),
                    cart_hash = COALESCE($3, cart_hash)
                WHERE session_id = $1
                  AND is_active = true
            `, [sessionId, cart ? JSON.stringify(cart) : null, cartHash]);

            return true;
        } catch (error) {
            logger.error('❌ Error updating session activity:', error);
            return false;
        }
    }

    /**
     * Acquire order lock to prevent duplicate orders
     * @param {String} sessionId - Session identifier
     * @param {String} cartHash - Hash of cart contents
     * @param {String} paymentMethod - Payment method chosen
     * @param {Number} totalAmount - Total order amount
     * @returns {Promise<Object>} - Lock acquisition result
     */
    async acquireOrderLock(sessionId, cartHash, paymentMethod, totalAmount) {
        try {
            // Check if this exact order already exists (within time window)
            const duplicateCheck = await query(`
                SELECT ol.*, o.order_id_formatted
                FROM order_locks ol
                LEFT JOIN orders o ON ol.order_id = o.id
                WHERE ol.session_id = $1
                  AND ol.cart_hash = $2
                  AND ol.status IN ('locked', 'completed')
                  AND ol.locked_at > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
                ORDER BY ol.locked_at DESC
                LIMIT 1
            `, [sessionId, cartHash]);

            if (duplicateCheck.rows.length > 0) {
                const existingLock = duplicateCheck.rows[0];
                logger.warn(`🚫 Duplicate order detected for session ${sessionId}`);
                
                return {
                    acquired: false,
                    reason: 'duplicate_order_exists',
                    existingOrderId: existingLock.order_id_formatted,
                    lockedAt: existingLock.locked_at
                };
            }

            // Create new lock
            const expiresAt = new Date(Date.now() + this.lockTimeout);
            
            const result = await query(`
                INSERT INTO order_locks (
                    session_id,
                    cart_hash,
                    payment_method,
                    total_amount,
                    locked_at,
                    expires_at,
                    status
                ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, 'locked')
                RETURNING *
            `, [sessionId, cartHash, paymentMethod, totalAmount, expiresAt]);

            logger.info(`🔒 Order lock acquired for session ${sessionId}`);
            
            return {
                acquired: true,
                lockId: result.rows[0].id,
                expiresAt: expiresAt
            };

        } catch (error) {
            logger.error('❌ Error acquiring order lock:', error);
            return {
                acquired: false,
                reason: 'lock_acquisition_failed',
                error: error.message
            };
        }
    }

    /**
     * Complete order lock (mark as completed and link to order)
     * @param {String} sessionId - Session identifier
     * @param {Number} orderId - Created order ID
     * @returns {Promise<Boolean>} - Success status
     */
    async completeOrderLock(sessionId, orderId) {
        try {
            await query(`
                UPDATE order_locks
                SET 
                    status = 'completed',
                    order_id = $2
                WHERE session_id = $1
                  AND status = 'locked'
                  AND expires_at > CURRENT_TIMESTAMP
            `, [sessionId, orderId]);

            logger.info(`✅ Order lock completed for session ${sessionId}, order ${orderId}`);
            return true;

        } catch (error) {
            logger.error('❌ Error completing order lock:', error);
            return false;
        }
    }

    /**
     * Release order lock (cancel)
     * @param {String} sessionId - Session identifier
     * @returns {Promise<Boolean>} - Success status
     */
    async releaseOrderLock(sessionId) {
        try {
            await query(`
                UPDATE order_locks
                SET status = 'cancelled'
                WHERE session_id = $1
                  AND status = 'locked'
            `, [sessionId]);

            logger.info(`🔓 Order lock released for session ${sessionId}`);
            return true;

        } catch (error) {
            logger.error('❌ Error releasing order lock:', error);
            return false;
        }
    }

    /**
     * Generate cart hash for duplicate detection
     * @param {Array} cart - Array of cart items
     * @returns {String} - MD5 hash of cart
     */
    generateCartHash(cart) {
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return null;
        }

        // Sort items by ID and create consistent string representation
        const normalized = cart
            .map(item => ({
                id: item.id || item.product_id,
                name: item.name,
                price: Number.parseFloat(item.price || 0),
                quantity: Number.parseInt(item.quantity || 1, 10)
            }))
            .sort((a, b) => (a.id || a.name).localeCompare(b.id || b.name))
            .map(item => `${item.id}:${item.name}:${item.price}:${item.quantity}`)
            .join('|');

        return crypto.createHash('md5').update(normalized).digest('hex');
    }

    /**
     * Check if session has active order in progress
     * @param {String} sessionId - Session identifier
     * @returns {Promise<Object|null>} - Active order info or null
     */
    async getActiveOrderForSession(sessionId) {
        try {
            const result = await query(`
                SELECT ol.*, o.order_id_formatted
                FROM order_locks ol
                LEFT JOIN orders o ON ol.order_id = o.id
                WHERE ol.session_id = $1
                  AND ol.status IN ('locked', 'completed')
                  AND ol.locked_at > (CURRENT_TIMESTAMP - INTERVAL '10 minutes')
                ORDER BY ol.locked_at DESC
                LIMIT 1
            `, [sessionId]);

            return result.rows[0] || null;

        } catch (error) {
            logger.error('❌ Error checking active order:', error);
            return null;
        }
    }

    /**
     * Get all active sessions (for monitoring)
     * @returns {Promise<Array>} - Array of active sessions
     */
    async getActiveSessions() {
        try {
            const result = await query(`
                SELECT 
                    session_id,
                    tablet_id,
                    last_activity,
                    created_at,
                    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_activity)) as inactive_seconds
                FROM kiosk_sessions
                WHERE is_active = true
                  AND last_activity > (CURRENT_TIMESTAMP - INTERVAL '1 hour')
                ORDER BY last_activity DESC
            `);

            return result.rows;

        } catch (error) {
            logger.error('❌ Error getting active sessions:', error);
            return [];
        }
    }

    /**
     * Cleanup expired locks (called by scheduled job)
     * @returns {Promise<Number>} - Number of locks cleaned up
     */
    async cleanupExpiredLocks() {
        try {
            const result = await query(`
                UPDATE order_locks
                SET status = 'expired'
                WHERE status = 'locked'
                  AND expires_at < CURRENT_TIMESTAMP
                RETURNING id
            `);

            if (result.rowCount > 0) {
                logger.info(`🧹 Cleaned up ${result.rowCount} expired order locks`);
            }

            return result.rowCount;

        } catch (error) {
            logger.error('❌ Error cleaning up locks:', error);
            return 0;
        }
    }

    /**
     * Cleanup old sessions (called by scheduled job)
     * @returns {Promise<Number>} - Number of sessions cleaned up
     */
    async cleanupOldSessions() {
        try {
            const result = await query(`
                UPDATE kiosk_sessions
                SET is_active = false
                WHERE last_activity < (CURRENT_TIMESTAMP - INTERVAL '24 hours')
                  AND is_active = true
                RETURNING id
            `);

            if (result.rowCount > 0) {
                logger.info(`🧹 Cleaned up ${result.rowCount} old sessions`);
            }

            return result.rowCount;

        } catch (error) {
            logger.error('❌ Error cleaning up sessions:', error);
            return 0;
        }
    }

    /**
     * Start scheduled cleanup jobs
     */
    startCleanupJobs() {
        const disableIntervals = process.env.NODE_ENV === 'test' || process.env.DISABLE_INTERVALS_FOR_TESTS === 'true';
        if (disableIntervals) {
            logger.info('🔄 Session cleanup jobs skipped in test mode');
            return;
        }
        // Cleanup expired locks every 2 minutes
        setInterval(() => {
            this.cleanupExpiredLocks();
        }, 120000);

        // Cleanup old sessions every 30 minutes
        setInterval(() => {
            this.cleanupOldSessions();
        }, 1800000);

        logger.info('🔄 Started session cleanup jobs');
    }

    /**
     * Get session statistics (for admin monitoring)
     * @returns {Promise<Object>} - Session statistics
     */
    async getSessionStatistics() {
        try {
            const stats = await query(`
                SELECT
                    COUNT(*) as total_sessions,
                    COUNT(*) FILTER (WHERE is_active = true) as active_sessions,
                    COUNT(*) FILTER (WHERE last_activity > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')) as recently_active,
                    COUNT(DISTINCT tablet_id) as unique_tablets
                FROM kiosk_sessions
                WHERE created_at > (CURRENT_TIMESTAMP - INTERVAL '24 hours')
            `);

            const locks = await query(`
                SELECT
                    COUNT(*) as total_locks,
                    COUNT(*) FILTER (WHERE status = 'locked') as active_locks,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_locks,
                    COUNT(*) FILTER (WHERE status = 'expired') as expired_locks
                FROM order_locks
                WHERE locked_at > (CURRENT_TIMESTAMP - INTERVAL '24 hours')
            `);

            return {
                sessions: stats.rows[0],
                locks: locks.rows[0],
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('❌ Error getting session statistics:', error);
            return null;
        }
    }
}

// Export singleton instance
module.exports = new EnhancedSessionLockService();

