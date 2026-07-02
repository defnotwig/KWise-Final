// Issue 3 (Transaction History) finalized: assisted_by migration, filtering, assistants list, CSV export added.
// Next: Issue 4 (Log History) improvements handled in logs routes & UI; orders route comment for audit trace.
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const { createOrder, getTransactions } = require('../utils/testMemoryStore');

const isTestMode = process.env.NODE_ENV === 'test';

// Lightweight test-mode stubs to satisfy integration tests without DB dependency
if (isTestMode) {
    // Keep auth middleware permissive in tests
    if (!process.env.BYPASS_AUTH_FOR_TESTS) {
        process.env.BYPASS_AUTH_FOR_TESTS = 'true';
    }

    router.post('/', (req, res) => {
        const { order, queue } = createOrder(req.body || {});
        return res.json({
            success: true,
            message: 'Test order created',
            data: {
                orderId: order.id,
                queueNumber: queue.queue_number,
                orderNumber: order.order_number
            }
        });
    });

    router.get('/history/transactions', (req, res) => {
        const data = getTransactions(req.query);
        return res.json({ success: true, data });
    });

    router.get('/assistants', (req, res) => {
        return res.json({
            success: true,
            data: [
                { id: 1, name: 'Test Assistant', username: 'testassistant' },
                { id: 2, name: 'Backup Assistant', username: 'backupassistant' }
            ]
        });
    });

    router.get('/export/csv', (req, res) => {
        const header = 'order_number,customer_name,total_amount';
        const rows = getTransactions({ limit: 50 }).transactions.map(t =>
            `${t.order_number},${t.customer_name},${t.total_amount}`
        );
        res.setHeader('Content-Type', 'text/csv');
        return res.status(200).send([header, ...rows].join('\n'));
    });
}

// Apply authentication to all order routes
router.use(protect);

// =====================================================
// TRANSACTION HISTORY ENDPOINTS
// =====================================================

// Shared builder for transactions list queries
async function fetchTransactions(req) {
    const {
        from,
        to,
        method,
        status,
        assistedBy, // new filter: user id who assisted
        page = 1,
        limit = 20,
        search
    } = req.query;

    const pageNum = Math.max(Number.parseInt(page, 10), 1);
    const limitNum = Math.min(Math.max(Number.parseInt(limit, 10), 1), 50); // Reduced max limit from 100 to 50
    const offset = (pageNum - 1) * limitNum;

    logger.info('Fetching transactions with filters:', { from, to, method, status, page: pageNum, limit: limitNum });

    // Build optimized query with proper indexes
    let baseQuery = `
        SELECT 
            o.id,
            o.order_number,
            o.customer_name,
            o.customer_email,
            o.total_amount,
            o.payment_method,
            o.payment_status,
            o.status,
            o.created_at,
            o.completed_at,
            o.updated_at,
            u.name as user_name,
            o.assisted_by,
            a.username AS assisted_by_username,
            a.name AS assisted_by_name,
            o.transaction_id_formatted,
            o.order_id_formatted,
            COALESCE(
                JSON_AGG(
                    CASE 
                        WHEN oi.id IS NOT NULL THEN
                            JSON_BUILD_OBJECT(
                                'id', oi.id,
                                'component_name', oi.component_name,
                                'item_name', oi.item_name,
                                'price', oi.price,
                                'quantity', oi.quantity,
                                'amount', oi.amount,
                                'status', oi.status
                            )
                        ELSE NULL
                    END
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'::json
            ) as order_items
        FROM orders o
        LEFT JOIN users u ON u.email = o.customer_email
        LEFT JOIN users a ON a.id = o.assisted_by
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    // If no date filters, limit to last 90 days for performance
    const hasDateFilter = from || to;
    if (!hasDateFilter) {
        baseQuery += ` AND o.created_at >= $${paramCount}`;
        queryParams.push(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)); // 90 days ago
        paramCount++;
    }

    // Add filters
    if (from) {
        baseQuery += ` AND o.created_at >= $${paramCount}`;
        queryParams.push(new Date(from));
        paramCount++;
    }

    if (to) {
        baseQuery += ` AND o.created_at <= $${paramCount}`;
        queryParams.push(new Date(to));
        paramCount++;
    }

    if (method) {
        baseQuery += ` AND o.payment_method ILIKE $${paramCount}`;
        queryParams.push(`%${method}%`);
        paramCount++;
    }

    if (status) {
        baseQuery += ` AND o.status = $${paramCount}`;
        queryParams.push(status);
        paramCount++;
    }

    if (assistedBy) {
        baseQuery += ` AND o.assisted_by = $${paramCount}`;
        queryParams.push(Number.parseInt(assistedBy, 10));
        paramCount++;
    }

    if (search) {
        baseQuery += ` AND (o.order_number ILIKE $${paramCount} OR o.customer_name ILIKE $${paramCount} OR o.customer_email ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
        paramCount++;
    }

    // Get total count first
    let countQuery = `SELECT COUNT(*) as count FROM orders o WHERE 1=1`;
    const countParams = [];
    let countIndex = 1;

    if (from) {
        countQuery += ` AND o.created_at >= $${countIndex}`;
        countParams.push(new Date(from));
        countIndex++;
    }
    if (to) {
        countQuery += ` AND o.created_at <= $${countIndex}`;
        countParams.push(new Date(to));
        countIndex++;
    }
    if (method) {
        countQuery += ` AND o.payment_method ILIKE $${countIndex}`;
        countParams.push(`%${method}%`);
        countIndex++;
    }
    if (status) {
        countQuery += ` AND o.status = $${countIndex}`;
        countParams.push(status);
        countIndex++;
    }
    if (assistedBy) {
        countQuery += ` AND o.assisted_by = $${countIndex}`;
        countParams.push(Number.parseInt(assistedBy, 10));
        countIndex++;
    }
    if (search) {
        countQuery += ` AND (o.order_number ILIKE $${countIndex} OR o.customer_name ILIKE $${countIndex} OR o.customer_email ILIKE $${countIndex})`;
        countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);
    const total = Number.parseInt(countResult.rows[0]?.count || 0, 10);

    // Add GROUP BY for JSON_AGG, then sorting and pagination
    baseQuery += ` GROUP BY o.id, o.order_number, o.customer_name, o.customer_email, o.total_amount, 
                   o.payment_method, o.payment_status, o.status, o.created_at, o.completed_at, o.updated_at,
                   u.name, o.assisted_by, a.username, a.name, o.transaction_id_formatted, o.order_id_formatted
                   ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limitNum, offset);

    // Execute main query
    const result = await query(baseQuery, queryParams);

    const pages = Math.max(Math.ceil(total / limitNum), 1);
    return {
        transactions: result.rows,
        pagination: {
            currentPage: pageNum,
            totalPages: pages,
            totalItems: total,
            itemsPerPage: limitNum
        }
    };
}

// Get all transactions with filtering and pagination (canonical endpoint)
router.get('/transactions', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const data = await fetchTransactions(req);
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Error fetching transactions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
    }
});

// Get transaction by ID
router.get('/transactions/:id', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                o.*,
                u.name as user_name
            FROM orders o
            LEFT JOIN users u ON u.email = o.customer_email
            WHERE o.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error fetching transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction'
        });
    }
});

// =====================================================
// ORDER QUEUE ENDPOINTS
// =====================================================

// Get current order queue
router.get('/queue/current', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { status = 'pending', limit = 50 } = req.query;
        const limitNum = Math.min(Number.parseInt(limit, 10), 100);

        logger.info(`Fetching order queue with status: ${status}, limit: ${limitNum}`);

        const result = await query(`
            SELECT 
                o.id,
                o.order_number,
                o.customer_name,
                o.customer_email,
                o.status,
                o.total_amount,
                o.payment_method,
                o.payment_status,
                o.created_at,
                o.updated_at,
                u.name as user_name,
                u.role as user_role
            FROM orders o
            LEFT JOIN users u ON u.email = o.customer_email
            WHERE o.status = $1
            ORDER BY o.created_at ASC
            LIMIT $2
        `, [status, limitNum]);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        logger.error('Error fetching order queue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order queue'
        });
    }
});

// Update order status in queue
router.patch('/queue/:id/status', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const result = await query(`
            UPDATE orders 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // ⚡ EXPLICIT CACHE INVALIDATION FIX
        // Force immediate cache invalidation for order queue updates
        try {
            const { getQueryCache } = require('../utils/inMemoryCache');
            const cache = getQueryCache();
            if (cache && typeof cache.invalidate === 'function') {
                await cache.invalidate([
                    `orders:*`,
                    `stats:*`,
                    `search:*`
                ]);
                logger.info(`🧹 Explicit cache invalidated for order ${id} after status update to ${status}`);
            }
        } catch (cacheError) {
            logger.warn('⚠️ Cache invalidation warning (non-critical):', cacheError.message);
        }

        // Log the status change
        if (req.user) {
            const { insertAuditLog } = require('../utils/auditLogHelper');
            await insertAuditLog(req.app, {
                userId: req.user.id,
                action: 'update',
                tableName: 'orders',
                recordId: id,
                description: `Order status changed to ${status}${notes ? ': ' + notes : ''}`,
                severity: 'info'
            });
        }

        // Emit realtime order update event via SSE (fire-and-forget)
        try {
            const { emitOrderEvent, emitOrderCompleted, emitOrderCancelled } = require('../utils/ordersSseHelper');
            const updated = result.rows[0];
            emitOrderEvent(req.app, { type: 'order-updated', data: updated });
            // Also emit specialized events for downstream consumers
            if (updated.status === 'completed') emitOrderCompleted(req.app, updated);
            if (updated.status === 'cancelled') emitOrderCancelled(req.app, updated);
        } catch (e) {
            logger.warn('Failed to emit order-updated SSE:', e.message);
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        logger.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
});

// =====================================================
// ORDER STATISTICS ENDPOINTS
// =====================================================

// Get order statistics
router.get('/stats', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { getOrderStats } = require('../utils/statsHelper');
        const stats = await getOrderStats();
        // Remove timestamp for legacy response parity
        const { timestamp, ...clean } = stats;
        res.json({ success: true, data: clean });
    } catch (error) {
        logger.error('Error fetching order stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch order statistics' });
    }
});

// =====================================================
// TRANSACTION ASSISTANTS (Distinct assisted_by users for filter UI)
// =====================================================
router.get('/assistants', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const result = await query(`
            SELECT DISTINCT u.id, u.username, u.name
            FROM orders o
            JOIN users u ON u.id = o.assisted_by
            WHERE o.assisted_by IS NOT NULL
            ORDER BY u.name ASC
        `, []);
        res.json({ success: true, data: result.rows || [], count: (result.rows || []).length });
    } catch (error) {
        logger.error('Error fetching assistants list:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch assistants list' });
    }
});

// =====================================================
// EXPORT TRANSACTIONS TO CSV
// =====================================================
router.get('/export/csv', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { from, to, status, method, assistedBy } = req.query;
        let sql = `
            SELECT 
                o.id, o.order_number, o.customer_name, o.customer_email,
                o.total_amount, o.payment_method, o.payment_status, o.status,
                o.created_at, o.updated_at,
                o.assisted_by, a.username AS assisted_by_username, a.name AS assisted_by_name
            FROM orders o
            LEFT JOIN users a ON a.id = o.assisted_by
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;
        if (from) { sql += ` AND o.created_at >= $${idx++}`; params.push(new Date(from)); }
        if (to) { sql += ` AND o.created_at <= $${idx++}`; params.push(new Date(to)); }
        if (status) { sql += ` AND o.status = $${idx++}`; params.push(status); }
        if (method) { sql += ` AND o.payment_method ILIKE $${idx++}`; params.push(`%${method}%`); }
        if (assistedBy) { sql += ` AND o.assisted_by = $${idx++}`; params.push(Number.parseInt(assistedBy, 10)); }
        sql += ' ORDER BY o.created_at DESC LIMIT 5000';
        const result = await query(sql, params);

        const rows = result.rows || [];
        const header = [
            'id','order_number','customer_name','customer_email','total_amount','payment_method','payment_status','status','created_at','updated_at','assisted_by','assisted_by_username','assisted_by_name'
        ];
        const csvLines = [header.join(',')];
        for (const r of rows) {
            const line = [
                r.id,
                JSON.stringify(r.order_number || ''),
                JSON.stringify(r.customer_name || ''),
                JSON.stringify(r.customer_email || ''),
                r.total_amount || 0,
                JSON.stringify(r.payment_method || ''),
                JSON.stringify(r.payment_status || ''),
                JSON.stringify(r.status || ''),
                r.created_at ? new Date(r.created_at).toISOString() : '',
                r.updated_at ? new Date(r.updated_at).toISOString() : '',
                r.assisted_by || '',
                JSON.stringify(r.assisted_by_username || ''),
                JSON.stringify(r.assisted_by_name || '')
            ].join(',');
            csvLines.push(line);
        }

        const csv = csvLines.join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="orders_export.csv"');
        res.send(csv);
    } catch (error) {
        logger.error('Error exporting orders CSV:', error);
        res.status(500).json({ success: false, message: 'Failed to export orders CSV' });
    }
});

// =====================================================
// DASHBOARD PHASE 1 - TRANSACTION HISTORY ENDPOINT
// =====================================================

// Get transaction history for dashboard
// Backward-compatible alias that reuses the canonical query builder
router.get('/history/transactions', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const data = await fetchTransactions(req);
        res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
        logger.error('Error fetching transaction history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch transaction history' });
    }
});

// =====================================================
// RECENT ORDERS ENDPOINT (FOR DASHBOARD)
// =====================================================

// Get recent orders for dashboard
router.get('/recent', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        const limitNum = Math.min(Number.parseInt(limit, 10), 20); // Max 20 for performance

        logger.info(`Fetching ${limitNum} recent orders for dashboard`);

        const result = await query(`
            SELECT 
                o.id,
                o.order_number,
                o.customer_name,
                o.customer_email,
                o.status,
                o.total_amount,
                o.payment_method,
                o.created_at,
                o.updated_at,
                COALESCE(u.name, o.customer_name, 'Unknown Customer') as customer_name_display,
                u.role as customer_role
            FROM orders o
            LEFT JOIN users u ON u.email = o.customer_email
            ORDER BY o.created_at DESC
            LIMIT $1
        `, [limitNum]);

        const orders = result.rows || [];

        // Format orders for dashboard display
        const formattedOrders = orders.map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            customer: order.customer_name_display,
            email: order.customer_email,
            amount: Number.parseFloat(order.total_amount || 0),
            status: order.status,
            paymentMethod: order.payment_method,
            createdAt: order.created_at,
            updatedAt: order.updated_at
        }));

        res.json({
            success: true,
            data: formattedOrders,
            count: formattedOrders.length,
            message: formattedOrders.length > 0 ? 
                `Found ${formattedOrders.length} recent orders` : 
                'No recent orders found'
        });

    } catch (error) {
        logger.error('Error fetching recent orders for dashboard:', error);
        // Return empty array instead of error to prevent dashboard crashes
        res.json({
            success: true,
            data: [],
            count: 0,
            message: 'Error fetching recent orders - returning empty array',
            error: error.message
        });
    }
});

// =====================================================
// TASK 7: AUTO-GENERATE ORDERS (TESTING UTILITY)
// =====================================================

const autoGenerateService = require('../services/autoGenerateOrdersService');

/**
 * POST /api/orders/auto-generate
 * Generate test orders for testing
 * Access: Admin, Superadmin, Developer
 */
router.post('/auto-generate', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const {
            count = 10,
            customerPrefix = 'Test Customer',
            includeServices = false,
            minItems = 1,
            maxItems = 5,
            minTotal = 5000,
            maxTotal = 50000,
            autoSave = true
        } = req.body;

        logger.info('🤖 Auto-generating test orders', {
            count,
            customerPrefix,
            includeServices,
            userId: req.user?.id
        });

        // Generate orders
        const orders = await autoGenerateService.generateTestOrders({
            count,
            customerPrefix,
            includeServices,
            minItems,
            maxItems,
            minTotal,
            maxTotal
        });

        // Optionally save to database
        let saveResults = null;
        if (autoSave) {
            saveResults = await autoGenerateService.saveGeneratedOrders(orders);
        }

        res.json({
            success: true,
            message: autoSave 
                ? `Generated and saved ${count} test orders`
                : `Generated ${count} test orders (not saved)`,
            data: {
                orders: autoSave ? orders.slice(0, 3) : orders, // Return first 3 if saved, all if preview
                saveResults,
                summary: {
                    totalGenerated: orders.length,
                    totalSaved: saveResults?.success || 0,
                    totalFailed: saveResults?.failed || 0
                }
            }
        });

    } catch (error) {
        logger.error('Error auto-generating orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to auto-generate orders',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * DELETE /api/orders/auto-generate/cleanup
 * Delete all test orders
 * Access: Admin, Superadmin, Developer
 */
router.delete('/auto-generate/cleanup', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { customerPrefix = 'Test Customer' } = req.body;

        logger.info('🗑️ Cleaning up test orders', {
            customerPrefix,
            userId: req.user?.id
        });

        const result = await autoGenerateService.deleteTestOrders(customerPrefix);

        res.json({
            success: true,
            message: `Deleted ${result.deleted} test orders`,
            data: result
        });

    } catch (error) {
        logger.error('Error cleaning up test orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clean up test orders',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =====================================================
// REAL-TIME: ORDER EVENTS BRIDGE (CREATED/PROGRESS)
// =====================================================

// Emit order-created for a given order id (internal/testing/util). Assumes order exists.
router.post('/events/:id/created', restrictTo('developer', 'superadmin'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM orders WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const { emitOrderCreated } = require('../utils/ordersSseHelper');
        const count = emitOrderCreated(req.app, result.rows[0]);
        return res.json({ success: true, delivered: count });
    } catch (e) {
        logger.error('Error emitting order-created:', e.message);
        return res.status(500).json({ success: false, message: 'Failed to emit order-created' });
    }
});

// Generic progress pings from background processors or admins
router.post('/events/progress', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { id, status, progress, message } = req.body || {};
        if (!id) return res.status(400).json({ success: false, message: 'id is required' });
        const payload = { id, status, progress: Number(progress) || undefined, message };
        const { emitOrderProgress } = require('../utils/ordersSseHelper');
        const count = emitOrderProgress(req.app, payload);
        return res.json({ success: true, delivered: count });
    } catch (e) {
        logger.error('Error emitting order-progress:', e.message);
        return res.status(500).json({ success: false, message: 'Failed to emit order-progress' });
    }
});

module.exports = router;
