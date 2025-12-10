/**
 * Queue Management Service
 * Handles queue number recycling (1-99), order ID formatting (OID-YEAR-0001),
 * transaction ID monthly reset (TID2509-1), and real-time queue management
 * PHASE 2 + TASK 4: Integrated order deduplication and mutex locking for concurrent safety
 * ⏰ AUTO-RESET: Automatically checks for midnight reset on every queue request
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');
const orderLockService = require('./orderLockService');

class QueueManagerService {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the queue management system
     */
    async initialize() {
        try {
            logger.info('🎯 Initializing Queue Management System...');

            // Ensure queue numbers 1-99 exist
            await this.ensureQueueNumbers();

            // Initialize counters for current periods
            await this.initializeCounters();

            this.initialized = true;
            logger.info('✅ Queue Management System initialized successfully');
        } catch (error) {
            logger.error('❌ Failed to initialize Queue Management System:', error);
            throw error;
        }
    }

    /**
     * Ensure all queue numbers 1-99 exist in queue_management table
     */
    async ensureQueueNumbers() {
        try {
            // First check if queue numbers already exist to avoid unnecessary INSERT
            const existingCount = await query(`
                SELECT COUNT(*) as count FROM queue_management 
                WHERE queue_number BETWEEN 1 AND 99
            `);

            const existing = parseInt(existingCount.rows[0].count);

            if (existing < 99) {
                const result = await query(`
                    INSERT INTO queue_management (queue_number, status)
                    SELECT generate_series(1, 99), 'available'
                    ON CONFLICT (queue_number) DO NOTHING
                    RETURNING queue_number
                `);

                if (result.rows.length > 0) {
                    logger.info(`🔢 Created ${result.rows.length} new queue numbers`);
                }
            } else {
                logger.info(`🔢 All queue numbers already initialized (${existing}/99)`);
            }
        } catch (error) {
            logger.error('❌ Error ensuring queue numbers:', error);
            throw error;
        }
    }

    /**
     * Initialize counters for current year and month
     */
    async initializeCounters() {
        try {
            const currentYear = new Date().getFullYear().toString();
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

            await query(`
                INSERT INTO order_counters (counter_type, counter_period, current_value, reset_date)
                VALUES 
                    ('order_yearly', $1, 0, $2),
                    ('transaction_monthly', $3, 0, $4)
                ON CONFLICT (counter_type, counter_period) DO NOTHING
            `, [
                currentYear,
                `${currentYear}-01-01`,
                currentMonth,
                new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
            ]);

            logger.info(`📊 Counter periods initialized: ${currentYear} (yearly), ${currentMonth} (monthly)`);
        } catch (error) {
            logger.error('❌ Error initializing counters:', error);
            throw error;
        }
    }

    /**
     * Get next available queue number
     * ⏰ AUTO-RESET: Automatically checks and applies midnight reset if needed
     * @returns {Promise<number|null>} Queue number (1-99) or null if all busy
     */
    async getNextQueueNumber() {
        try {
            // ⏰ STEP 1: Check and apply auto-reset if midnight passed
            // This is the "lazy check" strategy - ensures reset even if cron fails
            try {
                const resetResult = await query(`SELECT check_and_apply_auto_reset() as reset_applied`);
                if (resetResult.rows[0].reset_applied) {
                    logger.info('✅ Auto-reset detected and applied (midnight passed)');
                }
            } catch (resetError) {
                logger.warn('⚠️ Auto-reset check failed (non-critical):', resetError.message);
                // Continue with queue assignment even if auto-reset check fails
            }
            
            // STEP 2: Get next available queue number (uses enhanced get_next_queue_number function)
            const result = await query(`SELECT get_next_queue_number() as queue_number`);
            
            return result.rows.length > 0 ? result.rows[0].queue_number : null;
        } catch (error) {
            logger.error('❌ Error getting next queue number:', error);
            throw error;
        }
    }

    /**
     * Generate formatted order ID (OID-YEAR-0001)
     * @returns {Promise<string>} Formatted order ID
     */
    async generateOrderId() {
        try {
            const result = await query('SELECT generate_formatted_order_id() as order_id');
            return result.rows[0].order_id;
        } catch (error) {
            logger.error('❌ Error generating order ID:', error);
            throw error;
        }
    }

    /**
     * Generate formatted transaction ID (TID2509-1)
     * @returns {Promise<string>} Formatted transaction ID
     */
    async generateTransactionId() {
        try {
            const result = await query('SELECT generate_formatted_transaction_id() as transaction_id');
            return result.rows[0].transaction_id;
        } catch (error) {
            logger.error('❌ Error generating transaction ID:', error);
            throw error;
        }
    }

    /**
     * Assign queue number to order
     * @param {number} orderId - Order ID to assign queue to
     * @returns {Promise<number>} Assigned queue number
     */
    async assignQueueToOrder(orderId) {
        try {
            const result = await query('SELECT assign_queue_to_order($1) as queue_number', [orderId]);
            const queueNumber = result.rows[0].queue_number;

            logger.info(`🎯 Assigned queue number ${queueNumber} to order ${orderId}`);
            return queueNumber;
        } catch (error) {
            logger.error(`❌ Error assigning queue to order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Update queue status
     * @param {number} queueNumber - Queue number to update
     * @param {string} status - New status ('assigned', 'processing', 'completed')
     * @param {number} orderId - Associated order ID
     */
    async updateQueueStatus(queueNumber, status, orderId = null) {
        try {
            await query(`
                UPDATE queue_management 
                SET 
                    status = $1,
                    order_id = $2,
                    updated_at = NOW(),
                    assigned_at = CASE WHEN $4 = 'assigned' AND status = 'available' THEN NOW() ELSE assigned_at END,
                    completed_at = CASE WHEN $5 = 'completed' THEN NOW() ELSE completed_at END
                WHERE queue_number = $3
            `, [status, orderId, queueNumber, status, status]);

            logger.info(`🔄 Updated queue ${queueNumber} status to ${status}`);
        } catch (error) {
            logger.error(`❌ Error updating queue ${queueNumber} status:`, error);
            throw error;
        }
    }

    /**
     * Complete order and release queue number
     * ⚡ UPDATED FIX: Clear is_now_serving when completing order
     * Auto-advance logic is now handled in routes/queue.js
     * @param {number} orderId - Order ID to complete
     */
    async completeOrder(orderId) {
        try {
            // ✅ CRITICAL FIX: Use transaction for atomic completion
            await query('BEGIN');
            
            try {
                // First get the queue information INCLUDING is_now_serving flag
                const queueInfo = await query(`
                    SELECT qm.queue_number, qm.is_now_serving
                    FROM orders o
                    INNER JOIN queue_management qm ON o.queue_number = qm.queue_number
                    WHERE o.id = $1 AND o.queue_number IS NOT NULL
                `, [orderId]);

                // Update order status to completed
                await query(`
                    UPDATE orders 
                    SET 
                        queue_status = 'completed',
                        queue_completed_at = NOW(),
                        status = 'completed',
                        completed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $1
                `, [orderId]);

                // ⚡ NEW FIX: Release queue AND clear is_now_serving
                // Auto-advance to next queue is now handled in routes/queue.js
                if (queueInfo.rows.length > 0) {
                    const queueNumber = queueInfo.rows[0].queue_number;
                    const wasNowServing = queueInfo.rows[0].is_now_serving;

                    // ⚡ CRITICAL FIX: Mark as completed but KEEP used_in_cycle = TRUE
                    // Queue numbers CANNOT be reused within the same day/cycle
                    // ✅ DUAL-STATION FIX: Clear ALL station fields to prevent conflicts
                    await query(`
                        UPDATE queue_management 
                        SET 
                            status = 'completed',
                            order_id = NULL,
                            is_now_serving = FALSE,
                            now_serving_station = NULL,
                            now_serving_set_at = NULL,
                            now_serving_set_by = NULL,
                            now_serving_station_set_at = NULL,
                            now_serving_station_set_by = NULL,
                            completed_at = NOW(),
                            updated_at = NOW()
                        WHERE queue_number = $1
                    `, [queueNumber]);

                    if (wasNowServing) {
                        logger.info(`✅ Order ${orderId} completed - Queue ${queueNumber} marked COMPLETED (used_in_cycle preserved, no reuse until reset)`);
                    } else {
                        logger.info(`✅ Order ${orderId} completed - Queue ${queueNumber} marked COMPLETED (used_in_cycle preserved)`);
                    }
                } else {
                    logger.info(`✅ Order ${orderId} completed (no queue assignment found)`);
                }
                
                // ✅ COMMIT transaction immediately
                await query('COMMIT');
                logger.info(`✅ Complete order transaction committed for order ${orderId}`);
            } catch (txError) {
                // Rollback on error
                await query('ROLLBACK');
                logger.error(`❌ Failed to complete order ${orderId}, transaction rolled back:`, txError);
                throw txError;
            }
        } catch (error) {
            logger.error(`❌ Error completing order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Get active queue display data with order items
     * ✅ CRITICAL FIX: Properly filter out completed and cancelled orders
     * @returns {Promise<Array>} Array of queue data for real-time display with detailed items
     */
    async getActiveQueue() {
        try {
            // ✅ FIX: Direct query without GROUP BY to avoid order_items aggregation issues
            // Only return queues that are truly active (not completed/cancelled)
            const result = await query(`
                SELECT 
                    qm.queue_number,
                    qm.status as queue_status,
                    qm.is_now_serving,
                    qm.now_serving_set_at,
                    qm.now_serving_set_by,
                    o.id as order_id,
                    o.order_id_formatted,
                    o.customer_name,
                    o.total_amount,
                    o.queue_status as order_queue_status,
                    qm.assigned_at,
                    o.status as display_status,
                    o.created_at,
                    o.transaction_id_formatted,
                    o.payment_method,
                    o.queue_assigned_at
                FROM queue_management qm
                INNER JOIN orders o ON qm.order_id = o.id
                WHERE 
                    qm.order_id IS NOT NULL
                    AND o.status NOT IN ('completed', 'cancelled')
                    AND o.queue_status NOT IN ('completed', 'cancelled')
                ORDER BY qm.queue_number
            `);

            // ✅ CRITICAL FIX: Fetch order_items separately for each order to ensure reliability
            // This prevents JSON_AGG issues that can occur during concurrent updates
            const ordersWithItems = await Promise.all(
                result.rows.map(async (order) => {
                    try {
                        const itemsResult = await query(`
                            SELECT 
                                id,
                                component_name,
                                item_name,
                                price,
                                quantity,
                                amount,
                                status,
                                description
                            FROM order_items
                            WHERE order_id = $1
                            ORDER BY id
                        `, [order.order_id]);

                        return {
                            ...order,
                            order_items: itemsResult.rows || []
                        };
                    } catch (itemError) {
                        logger.error(`❌ Error fetching items for order ${order.order_id}:`, itemError);
                        // Return order with empty items array instead of failing entire request
                        return {
                            ...order,
                            order_items: []
                        };
                    }
                })
            );

            logger.info(`✅ Active queue fetched: ${ordersWithItems.length} orders with items (filtered out completed/cancelled)`);
            return ordersWithItems;
        } catch (error) {
            logger.error('❌ Error getting active queue with items:', error);
            throw error;
        }
    }

    /**
     * Get queue statistics
     * ✅ UPDATED: Include queue cycle and reset availability
     * @returns {Promise<Object>} Queue statistics
     */
    async getQueueStats() {
        try {
            const result = await query(`
                SELECT 
                    COUNT(CASE WHEN status = 'available' AND used_in_cycle = FALSE THEN 1 END) as available_queues,
                    COUNT(CASE WHEN used_in_cycle = TRUE THEN 1 END) as used_queues,
                    COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_queues,
                    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_queues,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_queues,
                    COUNT(*) as total_queues,
                    MAX(queue_cycle) as current_cycle
                FROM queue_management
            `);

            const stats = result.rows[0];

            // 🔥 NEW: Get queue availability info with auto-reset countdown
            const availabilityResult = await query(`SELECT * FROM get_queue_availability()`);
            const availability = availabilityResult.rows[0];

            // Get current period counters
            const countersResult = await query(`
                SELECT counter_type, counter_period, current_value
                FROM order_counters
                WHERE counter_period = EXTRACT(YEAR FROM CURRENT_DATE)::TEXT
                   OR counter_period = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
                ORDER BY counter_type
            `);

            const counters = {};
            countersResult.rows.forEach(row => {
                counters[row.counter_type] = {
                    period: row.counter_period,
                    value: parseInt(row.current_value)
                };
            });

            // Get today's completed/cancelled counts from orders table (more reliable)
            const todayStats = await query(`
                SELECT 
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_today,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_today
                FROM orders
                WHERE DATE(updated_at) = CURRENT_DATE
                AND queue_number IS NOT NULL
            `);

            const todayData = todayStats.rows[0];

            return {
                activeCount: parseInt(stats.processing_queues) || 0,
                pendingCount: parseInt(stats.assigned_queues) || 0,
                completedToday: parseInt(todayData.completed_today) || 0,
                cancelledToday: parseInt(todayData.cancelled_today) || 0,
                totalQueues: parseInt(stats.total_queues) || 0,
                availableQueues: parseInt(availability.available_queues) || 0,
                usedQueues: parseInt(availability.used_queues) || 0,
                currentCycle: parseInt(availability.current_cycle) || 1,
                needsReset: availability.needs_reset || false,
                lastAssignedQueue: parseInt(availability.last_assigned_queue) || 0,
                // ⏰ NEW: Auto-reset countdown fields
                lastResetDate: availability.last_reset_date,
                nextAutoResetAt: availability.next_auto_reset_at,
                hoursUntilReset: parseFloat(availability.hours_until_reset) || 0,
                resetType: availability.reset_type || 'auto',
                counters,
                efficiency: Math.round((parseInt(availability.available_queues) / 99) * 100) || 0
            };
        } catch (error) {
            logger.error('❌ Error getting queue stats:', error);
            throw error;
        }
    }

    /**
     * Create order with queue management
     * ✅ SIMPLIFIED: Removed complex locking mechanisms that caused timeouts
     * Direct PostgreSQL transaction is fast and reliable
     * @param {Object} orderData - Order data
     * @returns {Promise<Object>} Created order with queue information
     */
    async createOrderWithQueue(orderData) {
        try {
            const {
                customerName,
                customerEmail,
                items,
                totalAmount,
                paymentMethod = 'Cash',
                serviceType = 'self-order',
                serviceFee = 0,
                laborCharges = 0,
                otherCharges = 0,
                serviceNotes = null,
                underlyingIssues = null,
                cleaningAssessment = null,
                manualProcessing = false,
                manualProcessingNotes = null,
                phoneNumber = null,
                notes = null,
                transactionOrigin = null
            } = orderData;

            // Validate required fields (customerName can be null/empty for kiosk orders)
            if (!items || !Array.isArray(items) || items.length === 0) {
                throw new Error('Missing required field: items');
            }

            if (totalAmount === undefined || totalAmount === null) {
                throw new Error('Missing required field: totalAmount');
            }

            logger.info('✅ Creating order - validation passed');

            // ✅ SIMPLIFIED: Use a simple, fast function call instead of complex transaction
            // PostgreSQL function handles everything atomically
            const result = await query(`
                WITH new_queue AS (
                    SELECT queue_number
                    FROM queue_management
                    WHERE status = 'available'
                    ORDER BY queue_number
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                ),
                new_order_id AS (
                    SELECT generate_formatted_order_id() as order_id
                ),
                new_transaction_id AS (
                    SELECT generate_formatted_transaction_id() as transaction_id
                ),
                new_order_number AS (
                    -- ✅ FIX: Use sequence with timestamp to ensure uniqueness (prevents duplicate constraint violation)
                    SELECT 'KW' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || LPAD(nextval('order_number_sequence')::TEXT, 4, '0') as order_number
                ),
                inserted_order AS (
                    INSERT INTO orders (
                        order_number,
                        order_id_formatted,
                        transaction_id_formatted,
                        customer_name,
                        customer_email,
                        total_amount,
                        payment_method,
                        payment_status,
                        status,
                        queue_number,
                        queue_status,
                        queue_assigned_at,
                        service_type,
                        assessment_data
                    )
                    SELECT
                        (SELECT order_number FROM new_order_number),
                        (SELECT order_id FROM new_order_id),
                        (SELECT transaction_id FROM new_transaction_id),
                        $1,
                        $2,
                        $3,
                        $4,
                        'pending',
                        'pending',
                        (SELECT queue_number FROM new_queue),
                        'assigned',
                        NOW(),
                        $5,
                        $6::jsonb
                    RETURNING id, order_number, order_id_formatted, transaction_id_formatted, queue_number
                ),
                updated_queue AS (
                    UPDATE queue_management
                    SET 
                        status = 'assigned',
                        order_id = (SELECT id FROM inserted_order),
                        assigned_at = NOW(),
                        updated_at = NOW()
                    WHERE queue_number = (SELECT queue_number FROM new_queue)
                    RETURNING queue_number
                )
                SELECT * FROM inserted_order
            `, [
                customerName || null,
                customerEmail || null,
                parseFloat(totalAmount),
                paymentMethod,
                serviceType,
                cleaningAssessment ? JSON.stringify(cleaningAssessment) : null
            ]);

            if (result.rows.length === 0) {
                throw new Error('No queue numbers available. All queues are currently busy.');
            }

            const order = result.rows[0];
            logger.info(`✅ Order created: ${order.order_id_formatted} -> Queue #${order.queue_number}`);

            // Add order items
            for (const item of items) {
                const hasDescription = item.description && item.description.trim().length > 0;

                if (hasDescription) {
                    await query(`
                        INSERT INTO order_items (
                            order_id,
                            stock_item_id,
                            item_name,
                            component_name,
                            quantity,
                            price,
                            amount,
                            status,
                            description
                        ) VALUES ($1, NULL, $2, $3, $4, $5, $6, 'pending', $7)
                    `, [
                        order.id,
                        item.name,
                        item.category || item.name,
                        item.quantity || 1,
                        parseFloat(item.price || 0),
                        parseFloat(item.totalPrice || item.price || 0),
                        item.description
                    ]);
                } else {
                    await query(`
                        INSERT INTO order_items (
                            order_id,
                            stock_item_id,
                            item_name,
                            component_name,
                            quantity,
                            price,
                            amount,
                            status
                        ) VALUES ($1, NULL, $2, $3, $4, $5, $6, 'pending')
                    `, [
                        order.id,
                        item.name,
                        item.category || item.name,
                        item.quantity || 1,
                        parseFloat(item.price || 0),
                        parseFloat(item.totalPrice || item.price || 0)
                    ]);
                }
            }

            logger.info(`🛒 Order complete with ${items.length} items`);

            return {
                orderId: order.id,
                orderNumber: order.order_number,
                orderIdFormatted: order.order_id_formatted,
                transactionIdFormatted: order.transaction_id_formatted,
                queueNumber: order.queue_number,
                totalAmount: parseFloat(totalAmount),
                items: items
            };
        } catch (error) {
            logger.error('❌ Error creating order:', error);
            throw error;
        }
    }

    /**
     * Cleanup completed queues (maintenance function)
     * @returns {Promise<number>} Number of cleaned queues
     */
    async cleanupCompletedQueues() {
        try {
            const result = await query('SELECT cleanup_completed_queues() as cleaned_count');
            const cleanedCount = result.rows[0].cleaned_count;

            if (cleanedCount > 0) {
                logger.info(`🧹 Cleaned up ${cleanedCount} completed queue(s)`);
            }

            return cleanedCount;
        } catch (error) {
            logger.error('❌ Error cleaning up completed queues:', error);
            throw error;
        }
    }

    /**
     * Check if system is initialized
     */
    isInitialized() {
        return this.initialized;
    }
}

// Export singleton instance
const queueManager = new QueueManagerService();

module.exports = queueManager;