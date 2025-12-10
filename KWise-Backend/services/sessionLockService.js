/**
 * Session Lock Service for K-Wise Kiosk
 * Prevents duplicate orders when 2 tablets are used simultaneously
 * Implements intelligent session management and cart deduplication
 * 
 * ROOT CAUSE SOLUTION for Issue #3: Multi-Tablet Duplicate Orders
 * - Generates unique session IDs per tablet
 * - Implements cart hash-based deduplication
 * - Provides mutex-like order locking
 * - Tracks session activity to prevent race conditions
 * 
 * @module SessionLockService
 * @version 1.0.0
 */

const { query } = require('../config/db');
const crypto = require('crypto');
const logger = require('../utils/logger');

class SessionLockService {
    constructor() {
        this.SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
        this.ORDER_LOCK_TIMEOUT = 60 * 1000; // 60 seconds for order processing

        // Start cleanup job
        this.startCleanupJob();

        logger.info('🔒 Session Lock Service initialized');
    }

    /**
     * Create or retrieve session for tablet
     * @param {String} tabletId - Unique tablet identifier
     * @returns {Promise<String>} - Session ID
     */
    async getOrCreateSession(tabletId) {
        try {
            // Check for existing active session for this tablet
            const existingSession = await query(`
        SELECT session_id, last_activity
        FROM kiosk_sessions
        WHERE tablet_id = $1
          AND status = 'active'
          AND expires_at > NOW()
        ORDER BY last_activity DESC
        LIMIT 1
      `, [tabletId]);

            if (existingSession.rows.length > 0) {
                const session = existingSession.rows[0];

                // Update last activity
                await query(`
          UPDATE kiosk_sessions
          SET last_activity = NOW()
          WHERE session_id = $1
        `, [session.session_id]);

                return session.session_id;
            }

            // Create new session
            const sessionId = this.generateSessionId();
            const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT);

            await query(`
        INSERT INTO kiosk_sessions (
          session_id,
          tablet_id,
          status,
          expires_at
        ) VALUES ($1, $2, $3, $4)
      `, [sessionId, tabletId, 'active', expiresAt]);

            logger.info('📱 New session created', { sessionId, tabletId });

            return sessionId;
        } catch (error) {
            logger.error('❌ Failed to get/create session', { error: error.message });
            throw error;
        }
    }

    /**
     * Update session cart hash
     * @param {String} sessionId - Session ID
     * @param {Array} cartItems - Cart items array
     */
    async updateCartHash(sessionId, cartItems) {
        try {
            const cartHash = this.generateCartHash(cartItems);

            await query(`
        UPDATE kiosk_sessions
        SET cart_hash = $1,
            last_activity = NOW()
        WHERE session_id = $2
      `, [cartHash, sessionId]);

            return cartHash;
        } catch (error) {
            logger.error('❌ Failed to update cart hash', { error: error.message });
        }
    }

    /**
     * Acquire order lock to prevent duplicate submissions
     * @param {String} sessionId - Session ID
     * @param {String} cartHash - Cart hash
     * @param {String} paymentMethod - Payment method
     * @param {Number} totalAmount - Total amount
     * @returns {Promise<Object>} - Lock result { acquired: boolean, reason?: string }
     */
    async acquireOrderLock(sessionId, cartHash, paymentMethod, totalAmount) {
        try {
            // Check if this exact order was already placed recently (last 5 minutes)
            const recentDuplicate = await query(`
        SELECT id, blocked, block_reason, created_order_id
        FROM order_deduplication_log
        WHERE cart_hash = $1
          AND payment_method = $2
          AND total_amount = $3
          AND attempt_timestamp > NOW() - INTERVAL '5 minutes'
        ORDER BY attempt_timestamp DESC
        LIMIT 1
      `, [cartHash, paymentMethod, totalAmount]);

            if (recentDuplicate.rows.length > 0) {
                const duplicate = recentDuplicate.rows[0];

                if (duplicate.created_order_id) {
                    logger.warn('🚫 Duplicate order detected - already created', {
                        cartHash,
                        existingOrderId: duplicate.created_order_id
                    });

                    return {
                        acquired: false,
                        reason: 'duplicate_order_exists',
                        existingOrderId: duplicate.created_order_id
                    };
                }
            }

            // Check if session already has an active order lock
            const sessionLock = await query(`
        SELECT order_lock_acquired, order_lock_at
        FROM kiosk_sessions
        WHERE session_id = $1
      `, [sessionId]);

            if (sessionLock.rows.length > 0 && sessionLock.rows[0].order_lock_acquired) {
                const lockTime = new Date(sessionLock.rows[0].order_lock_at);
                const timeSinceLock = Date.now() - lockTime.getTime();

                if (timeSinceLock < this.ORDER_LOCK_TIMEOUT) {
                    logger.warn('⏳ Order lock already held by this session', {
                        sessionId,
                        timeSinceLock: `${timeSinceLock}ms`
                    });

                    return {
                        acquired: false,
                        reason: 'lock_already_held'
                    };
                }
            }

            // Acquire lock
            await query(`
        UPDATE kiosk_sessions
        SET order_lock_acquired = TRUE,
            order_lock_at = NOW(),
            status = 'ordering'
        WHERE session_id = $1
      `, [sessionId]);

            // Log deduplication attempt
            await query(`
        INSERT INTO order_deduplication_log (
          session_id,
          cart_hash,
          payment_method,
          total_amount,
          blocked
        ) VALUES ($1, $2, $3, $4, $5)
      `, [sessionId, cartHash, paymentMethod, totalAmount, false]);

            logger.info('✅ Order lock acquired', { sessionId, cartHash });

            return {
                acquired: true
            };
        } catch (error) {
            logger.error('❌ Failed to acquire order lock', { error: error.message });
            throw error;
        }
    }

    /**
     * Release order lock after order creation
     * @param {String} sessionId - Session ID
     * @param {Number} orderId - Created order ID
     */
    async releaseOrderLock(sessionId, orderId = null) {
        try {
            await query(`
        UPDATE kiosk_sessions
        SET order_lock_acquired = FALSE,
            order_lock_at = NULL,
            status = 'completed'
        WHERE session_id = $1
      `, [sessionId]);

            // Update deduplication log with created order ID
            if (orderId) {
                await query(`
          UPDATE order_deduplication_log
          SET created_order_id = $1
          WHERE session_id = $2
            AND created_order_id IS NULL
          ORDER BY attempt_timestamp DESC
          LIMIT 1
        `, [orderId, sessionId]);
            }

            logger.info('🔓 Order lock released', { sessionId, orderId });
        } catch (error) {
            logger.error('❌ Failed to release order lock', { error: error.message });
        }
    }

    /**
     * Generate unique session ID
     * @returns {String} - Session ID
     */
    generateSessionId() {
        return `SESSION_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    /**
     * Generate cart hash for deduplication
     * @param {Array} cartItems - Cart items
     * @returns {String} - MD5 hash
     */
    generateCartHash(cartItems) {
        // Sort items by ID to ensure consistent hash
        const sorted = [...cartItems].sort((a, b) => {
            const aId = a.id || a.name;
            const bId = b.id || b.name;
            return aId > bId ? 1 : -1;
        });

        // Create string representation
        const cartString = sorted.map(item =>
            `${item.id || item.name}:${item.quantity}:${item.price}`
        ).join('|');

        return crypto.createHash('md5').update(cartString).digest('hex');
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions() {
        try {
            const result = await query(`
        UPDATE kiosk_sessions
        SET status = 'abandoned'
        WHERE status IN ('active', 'ordering')
          AND (
            expires_at < NOW()
            OR (last_activity < NOW() - INTERVAL '30 minutes')
          )
        RETURNING id
      `);

            if (result.rows.length > 0) {
                logger.info('🧹 Cleaned up expired sessions', { count: result.rows.length });
            }
        } catch (error) {
            logger.error('❌ Session cleanup failed', { error: error.message });
        }
    }

    /**
     * Start periodic cleanup job
     */
    startCleanupJob() {
        // Run cleanup every 5 minutes
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 5 * 60 * 1000);

        // Initial cleanup
        this.cleanupExpiredSessions();
    }

    /**
     * Get session statistics
     * @returns {Promise<Object>} - Session stats
     */
    async getSessionStats() {
        try {
            const stats = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
          COUNT(*) FILTER (WHERE status = 'ordering') as ordering_sessions,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
          COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned_sessions,
          COUNT(*) FILTER (WHERE order_lock_acquired = TRUE) as locked_sessions
        FROM kiosk_sessions
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

            const dedupStats = await query(`
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(*) FILTER (WHERE blocked = TRUE) as blocked_attempts,
          COUNT(DISTINCT cart_hash) as unique_carts
        FROM order_deduplication_log
        WHERE attempt_timestamp > NOW() - INTERVAL '24 hours'
      `);

            return {
                sessions: stats.rows[0],
                deduplication: dedupStats.rows[0],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('❌ Failed to get session stats', { error: error.message });
            return null;
        }
    }
}

// Create singleton instance
const sessionLockService = new SessionLockService();

module.exports = sessionLockService;

