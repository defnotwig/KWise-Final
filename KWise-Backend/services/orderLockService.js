/**
 * Order Lock Service
 * Prevents duplicate orders using mutex-based locking
 * Handles concurrent order creation from multiple tablets/clients
 */

const { Mutex } = require('async-mutex');
const crypto = require('node:crypto');
const { query, pool } = require('../config/db');
const logger = require('../utils/logger');

const parseIntegerSetting = (value, fallback) => {
    const parsedValue = Number.parseInt(String(value ?? ''), 10);
    return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

const parseCurrencyAmount = (value, fallback = 0) => {
    const parsedValue = Number.parseFloat(String(value ?? ''));
    return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

class OrderLockService {
    constructor() {
        // Mutex for order creation critical section
        this.orderMutex = new Mutex();
        
        // Configuration
        this.config = {
            lockTimeout: parseIntegerSetting(process.env.ORDER_LOCK_TIMEOUT_MS, 10000),
            hashWindowMinutes: parseIntegerSetting(process.env.ORDER_HASH_WINDOW_MINUTES, 5),
            cleanupInterval: parseIntegerSetting(process.env.PENDING_ORDERS_CLEANUP_INTERVAL_MS, 60000)
        };
        this.completedOrderCache = new Map();
        this.cleanupIntervalId = null;

        // Start automatic cleanup
        this.startAutomaticCleanup();
        
        logger.info('🔒 Order Lock Service initialized');
        logger.info(`   - Lock timeout: ${this.config.lockTimeout}ms`);
        logger.info(`   - Hash window: ${this.config.hashWindowMinutes} minutes`);
        logger.info(`   - Cleanup interval: ${this.config.cleanupInterval}ms`);
    }

    getCompletionTtlMs() {
        return Math.max(1, this.config.hashWindowMinutes) * 60 * 1000;
    }

    rememberCompletedOrder(orderHash, orderResult, items) {
        this.completedOrderCache.set(orderHash, {
            expiresAt: Date.now() + this.getCompletionTtlMs(),
            order: {
                isDuplicate: true,
                orderId: orderResult.orderId,
                orderNumber: orderResult.orderNumber,
                orderIdFormatted: orderResult.orderIdFormatted,
                transactionIdFormatted: orderResult.transactionIdFormatted,
                queueNumber: orderResult.queueNumber,
                totalAmount: parseCurrencyAmount(orderResult.totalAmount),
                items
            }
        });
    }

    getRememberedCompletedOrder(orderHash) {
        const cached = this.completedOrderCache.get(orderHash);
        if (!cached) {
            return null;
        }

        if (cached.expiresAt <= Date.now()) {
            this.completedOrderCache.delete(orderHash);
            return null;
        }

        return cached.order;
    }

    cleanupCompletedOrderCache() {
        const now = Date.now();
        for (const [orderHash, cached] of this.completedOrderCache.entries()) {
            if (cached.expiresAt <= now) {
                this.completedOrderCache.delete(orderHash);
            }
        }
    }

    /**
     * Generate order hash for deduplication
     * Hash includes: customer name, items (sorted), total, time window
     * @param {Object} orderData - Order data
     * @returns {string} MD5 hash (32 characters)
     */
    generateOrderHash(orderData) {
        try {
            if (orderData.idempotencyKey) {
                const explicitHash = crypto
                    .createHash('sha256')
                    .update(String(orderData.idempotencyKey))
                    .digest('hex')
                    .slice(0, 32);
                logger.debug(`Generated idempotency order hash: ${explicitHash.substring(0, 8)}...`);
                return explicitHash;
            }

            const { customerName, items, totalAmount } = orderData;
            let normalizedItems = [];
            if (Array.isArray(items)) {
                normalizedItems = items;
            } else if (items) {
                normalizedItems = [items];
            }

            // Sort items by name for consistent hashing
            const sortedItems = normalizedItems
                .map(item => ({
                    name: String(item?.name || '').trim(),
                    price: parseCurrencyAmount(item?.price).toFixed(2),
                    quantity: item.quantity || 1
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            // Round timestamp to 5-minute window to catch rapid duplicates
            const now = new Date();
            const timeWindow = Math.floor(now.getTime() / (this.config.hashWindowMinutes * 60 * 1000));

            // Create hash input string
            const hashInput = JSON.stringify({
                customer: String(customerName || '').trim().toLowerCase(),
                items: sortedItems,
                total: parseCurrencyAmount(totalAmount).toFixed(2),
                window: timeWindow
            });

            // Generate MD5 hash
            const hash = crypto.createHash('md5').update(hashInput).digest('hex');
            
            logger.debug(`Generated order hash: ${hash.substring(0, 8)}...`);
            return hash;
        } catch (error) {
            logger.error('Error generating order hash:', error);
            throw error;
        }
    }

    /**
     * Check for duplicate order in pending_orders table
     * @param {string} orderHash - Order hash to check
     * @returns {Promise<Object|null>} Existing order data or null
     */
    async checkDuplicateOrder(orderHash) {
        try {
            const result = await query(`
                SELECT 
                    id,
                    order_hash,
                    order_data,
                    order_id,
                    status,
                    created_at
                FROM pending_orders
                WHERE order_hash = $1 
                AND status IN ('pending', 'completed')
                AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 1
            `, [orderHash]);

            if (result.rows.length > 0) {
                const duplicate = result.rows[0];
                logger.warn(`⚠️ Duplicate order detected! Hash: ${orderHash.substring(0, 8)}...`);
                logger.warn(`   - Original created: ${duplicate.created_at}`);
                logger.warn(`   - Status: ${duplicate.status}`);
                return duplicate;
            }

            return null;
        } catch (error) {
            logger.error('Error checking duplicate order:', error);
            throw error;
        }
    }

    /**
     * Add pending order to tracking table
     * @param {string} orderHash - Order hash
     * @param {Object} orderData - Full order data
     * @returns {Promise<number>} Pending order ID
     */
    async addPendingOrder(orderHash, orderData) {
        try {
            const result = await query(`
                INSERT INTO pending_orders (
                    order_hash,
                    order_data,
                    status,
                    created_at,
                    expires_at
                ) VALUES ($1, $2, $3, NOW(), NOW() + $4 * INTERVAL '1 minute')
                ON CONFLICT (order_hash) DO UPDATE
                SET
                    order_data = EXCLUDED.order_data,
                    status = EXCLUDED.status,
                    order_id = NULL,
                    created_at = NOW(),
                    completed_at = NULL,
                    expires_at = EXCLUDED.expires_at
                RETURNING id
            `, [orderHash, JSON.stringify(orderData), 'pending', Number.parseInt(this.config.hashWindowMinutes, 10) || 30]);

            const pendingId = result.rows[0].id;
            logger.debug(`Added pending order: ID=${pendingId}, Hash=${orderHash.substring(0, 8)}...`);
            return pendingId;
        } catch (error) {
            logger.error('Error adding pending order:', error);
            throw error;
        }
    }

    /**
     * Mark pending order as completed
     * @param {string} orderHash - Order hash
     * @param {number} orderId - Created order ID
     */
    async completePendingOrder(orderHash, orderId) {
        try {
            await pool.query(`
                UPDATE pending_orders
                SET 
                    status = 'completed',
                    order_id = $2,
                    completed_at = NOW()
                WHERE order_hash = $1
            `, [orderHash, orderId]);

            logger.debug(`Completed pending order: Hash=${orderHash.substring(0, 8)}..., OrderID=${orderId}`);
        } catch (error) {
            logger.error('Error completing pending order:', error);
            // Non-critical error, don't throw
        }
    }

    /**
     * Mark pending order as failed
     * @param {string} orderHash - Order hash
     */
    async failPendingOrder(orderHash) {
        try {
            await pool.query(`
                UPDATE pending_orders
                SET 
                    status = 'failed',
                    completed_at = NOW()
                WHERE order_hash = $1
            `, [orderHash]);

            logger.debug(`Failed pending order: Hash=${orderHash.substring(0, 8)}...`);
        } catch (error) {
            logger.error('Error failing pending order:', error);
            // Non-critical error, don't throw
        }
    }

    /**
     * Cleanup expired pending orders
     * @returns {Promise<number>} Number of cleaned orders
     */
    async cleanupExpiredOrders() {
        try {
            this.cleanupCompletedOrderCache();
            const result = await query('SELECT cleanup_expired_pending_orders() as count');
            const count = Number(result?.rows?.[0]?.count ?? 0);
            
            if (count > 0) {
                logger.info(`🧹 Cleaned up ${count} expired pending orders`);
            }
            
            return count;
        } catch (error) {
            logger.error('Error cleaning up expired orders:', error);
            return 0;
        }
    }

    /**
     * Start automatic cleanup of expired orders
     */
    startAutomaticCleanup() {
        if (process.env.NODE_ENV === 'test' && process.env.DISABLE_INTERVALS_FOR_TESTS === 'true') {
            logger.info('🧪 Skipping automatic cleanup interval in test mode');
            return;
        }
        this.cleanupIntervalId = setInterval(() => {
            this.cleanupExpiredOrders().catch(err => {
                logger.error('Auto-cleanup error:', err);
            });
        }, this.config.cleanupInterval);
        this.cleanupIntervalId.unref?.();

        logger.info(`🧹 Automatic cleanup started (every ${this.config.cleanupInterval}ms)`);
    }

    /**
     * Execute order creation with mutex lock and deduplication
     * @param {Function} orderCreationFn - Function that creates the order
     * @param {Object} orderData - Order data
     * @returns {Promise<Object>} Created order result
     */
    async executeWithLock(orderCreationFn, orderData) {
        // Generate order hash for deduplication
        const orderHash = this.generateOrderHash(orderData);

        const rememberedOrder = this.getRememberedCompletedOrder(orderHash);
        if (rememberedOrder) {
            logger.warn('Returning remembered completed duplicate order');
            return {
                ...rememberedOrder,
                items: orderData.items
            };
        }

        // Check for duplicate BEFORE acquiring lock (fast path)
        const duplicate = await this.checkDuplicateOrder(orderHash);
        if (duplicate) {
            logger.warn('🚫 Duplicate order rejected (pre-lock check)');
            
            // If the duplicate has an associated order_id, fetch the full order details
            if (duplicate.order_id) {
                const orderResult = await query(`
                    SELECT 
                        id,
                        order_number,
                        order_id_formatted,
                        transaction_id_formatted,
                        queue_number,
                        total_amount
                    FROM orders
                    WHERE id = $1
                `, [duplicate.order_id]);

                if (orderResult.rows.length > 0) {
                    const existingOrder = orderResult.rows[0];
                    return {
                        isDuplicate: true,
                        orderId: existingOrder.id,
                        orderNumber: existingOrder.order_number,
                        orderIdFormatted: existingOrder.order_id_formatted,
                        transactionIdFormatted: existingOrder.transaction_id_formatted,
                        queueNumber: existingOrder.queue_number,
                        totalAmount: parseCurrencyAmount(existingOrder.total_amount),
                        items: orderData.items
                    };
                }
            }

            // Fallback: return duplicate data
            return {
                isDuplicate: true,
                message: 'Duplicate order detected. Please check your recent orders.',
                duplicateData: duplicate.order_data
            };
        }

        // Acquire mutex lock with timeout
        let release;
        try {
            release = await this.orderMutex.acquire();
            logger.debug(`🔒 Lock acquired for order creation`);

            // Double-check for duplicates after acquiring lock (race condition safety)
            const rememberedOrderAfterLock = this.getRememberedCompletedOrder(orderHash);
            if (rememberedOrderAfterLock) {
                logger.warn('Returning remembered completed duplicate order after lock');
                return {
                    ...rememberedOrderAfterLock,
                    items: orderData.items
                };
            }

            const duplicateAfterLock = await this.checkDuplicateOrder(orderHash);
            if (duplicateAfterLock) {
                logger.warn('🚫 Duplicate order rejected (post-lock check)');
                
                if (duplicateAfterLock.order_id) {
                    const orderResult = await query(`
                        SELECT 
                            id,
                            order_number,
                            order_id_formatted,
                            transaction_id_formatted,
                            queue_number,
                            total_amount
                        FROM orders
                        WHERE id = $1
                    `, [duplicateAfterLock.order_id]);

                    if (orderResult.rows.length > 0) {
                        const existingOrder = orderResult.rows[0];
                        return {
                            isDuplicate: true,
                            orderId: existingOrder.id,
                            orderNumber: existingOrder.order_number,
                            orderIdFormatted: existingOrder.order_id_formatted,
                            transactionIdFormatted: existingOrder.transaction_id_formatted,
                            queueNumber: existingOrder.queue_number,
                            totalAmount: parseCurrencyAmount(existingOrder.total_amount),
                            items: orderData.items
                        };
                    }
                }

                return {
                    isDuplicate: true,
                    message: 'Duplicate order detected. Please check your recent orders.',
                    duplicateData: duplicateAfterLock.order_data
                };
            }

            // Add to pending orders BEFORE creation
            await this.addPendingOrder(orderHash, orderData);

            // Execute order creation function
            logger.info('📝 Creating new order (no duplicate found)');
            const result = await orderCreationFn();

            this.rememberCompletedOrder(orderHash, result, orderData.items);
            if (process.env.ORDER_PERSIST_IDEMPOTENCY_COMPLETIONS === 'true') {
                this.completePendingOrder(orderHash, result.orderId).catch((error) => {
                    logger.warn('Pending order completion update skipped after response-path completion', {
                        error: error.message
                    });
                });
            }

            logger.info(`✅ Order created successfully: ID=${result.orderId}`);
            return {
                ...result,
                isDuplicate: false
            };

        } catch (error) {
            logger.error('❌ Error during locked order creation:', error);
            
            if (process.env.ORDER_PERSIST_IDEMPOTENCY_COMPLETIONS === 'true') {
                this.failPendingOrder(orderHash).catch((failError) => {
                    logger.warn('Pending order failure update skipped after order error', {
                        error: failError.message
                    });
                });
            }
            
            throw error;
        } finally {
            if (release) {
                release();
                logger.debug(`🔓 Lock released`);
            }
        }
    }

    /**
     * Get lock statistics
     * @returns {Object} Lock statistics
     */
    getStats() {
        return {
            isLocked: this.orderMutex.isLocked(),
            config: this.config
        };
    }
}

// Export singleton instance
const orderLockService = new OrderLockService();

module.exports = orderLockService;
