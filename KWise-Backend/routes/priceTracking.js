/**
 * Price Tracking API Routes - Phase 3.2
 * Handles price history, price alerts, and price trends
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   GET /api/price-tracking/history/:productId
 * @desc    Get price history for a specific product
 * @access  Public
 */
router.get('/history/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { days = 30, limit = 100 } = req.query;
        const safeDays = Number.parseInt(days, 10) || 30;

        const history = await query(`
            SELECT 
                ph.id,
                ph.price,
                ph.previous_price,
                ph.price_change,
                ph.price_change_percent,
                ph.source,
                ph.recorded_at,
                ph.notes,
                p.name as product_name,
                p.category
            FROM price_history ph
            JOIN pc_parts p ON p.id = ph.product_id
            WHERE ph.product_id = $1
                AND ph.recorded_at >= NOW() - $2 * INTERVAL '1 day'
            ORDER BY ph.recorded_at DESC
            LIMIT $3
        `, [productId, safeDays, Number.parseInt(limit, 10)]);

        res.json({
            success: true,
            data: history.rows,
            count: history.rowCount,
            filters: { days, limit }
        });

    } catch (error) {
        logger.error('Price history fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch price history',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/price-tracking/update/:productId
 * @desc    Update product price and create history entry
 * @access  Private (Admin, Superadmin)
 */
router.post('/update/:productId', protect, restrictTo('admin', 'superadmin'), async (req, res) => {
    try {
        const { productId } = req.params;
        const { newPrice } = req.body;

        // Validate new price
        if (!newPrice || newPrice < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid price value'
            });
        }

        // Get current price
        const current = await query('SELECT price, name FROM pc_parts WHERE id = $1', [productId]);
        
        if (current.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        const oldPrice = Number.parseFloat(current.rows[0].price);
        const productName = current.rows[0].name;
        const priceChange = newPrice - oldPrice;
        const percentChange = oldPrice === 0 ? 100 : ((priceChange / oldPrice) * 100).toFixed(2);

        // Update product price (trigger will automatically log to price_history)
        await query(
            'UPDATE pc_parts SET price = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3',
            [newPrice, req.user.id, productId]
        );

        // Check and trigger price alerts
        const alerts = await query(
            'SELECT * FROM check_price_alerts($1, $2)',
            [productId, newPrice]
        );

        logger.info(`Price updated for ${productName}: ${oldPrice} → ${newPrice} (${percentChange}%)`, {
            userId: req.user.id,
            productId,
            oldPrice,
            newPrice,
            change: priceChange,
            percentChange
        });

        res.json({
            success: true,
            message: 'Price updated successfully',
            data: {
                productName,
                oldPrice,
                newPrice,
                priceChange,
                percentChange: Number.parseFloat(percentChange),
                alertsTriggered: alerts.rowCount
            }
        });

    } catch (error) {
        logger.error('Price update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update price',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/price-tracking/trends
 * @desc    Get price trends (top gainers/losers)
 * @access  Public
 */
router.get('/trends', async (req, res) => {
    try {
        const { days = 7, limit = 20 } = req.query;
        const safeDays = Number.parseInt(days, 10) || 7;

        const trends = await query(`
            WITH latest_changes AS (
                SELECT DISTINCT ON (product_id)
                    product_id,
                    price,
                    previous_price,
                    price_change,
                    price_change_percent,
                    recorded_at
                FROM price_history
                WHERE recorded_at >= NOW() - $1 * INTERVAL '1 day'
                    AND price_change IS NOT NULL
                ORDER BY product_id, recorded_at DESC
            )
            SELECT 
                p.id,
                p.name,
                p.category,
                p.brand,
                p.price as current_price,
                lc.previous_price,
                lc.price_change,
                lc.price_change_percent,
                lc.recorded_at as last_change_date,
                CASE 
                    WHEN lc.price_change > 0 THEN 'increase'
                    WHEN lc.price_change < 0 THEN 'decrease'
                    ELSE 'stable'
                END as trend_direction
            FROM latest_changes lc
            JOIN pc_parts p ON p.id = lc.product_id
            WHERE p.is_active = true
            ORDER BY ABS(lc.price_change_percent) DESC
            LIMIT $2
        `, [safeDays, Number.parseInt(limit, 10)]);

        // Separate into gainers and losers
        const gainers = trends.rows.filter(r => r.price_change > 0);
        const losers = trends.rows.filter(r => r.price_change < 0);

        res.json({
            success: true,
            data: {
                all: trends.rows,
                gainers: gainers.slice(0, 10),
                losers: losers.slice(0, 10),
                summary: {
                    totalTracked: trends.rowCount,
                    gainersCount: gainers.length,
                    losersCount: losers.length,
                    averageChange: trends.rows.length > 0 
                        ? (trends.rows.reduce((sum, r) => sum + Number.parseFloat(r.price_change_percent), 0) / trends.rows.length).toFixed(2)
                        : 0
                }
            },
            filters: { days, limit }
        });

    } catch (error) {
        logger.error('Price trends fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch price trends',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/price-tracking/alerts
 * @desc    Create or update price alert for a product
 * @access  Private
 */
router.post('/alerts', protect, async (req, res) => {
    try {
        const { productId, targetPrice, condition, percentageDrop } = req.body;

        // Validate input
        if (!productId || !targetPrice) {
            return res.status(400).json({
                success: false,
                error: 'Product ID and target price are required'
            });
        }

        if (!['less_than', 'greater_than', 'drops_by', 'increases_by'].includes(condition)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid condition. Must be: less_than, greater_than, drops_by, or increases_by'
            });
        }

        // Check if product exists
        const product = await query('SELECT id, name, price FROM pc_parts WHERE id = $1', [productId]);
        if (product.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Create or update alert
        const result = await query(`
            INSERT INTO price_alerts (user_id, product_id, target_price, condition, percentage_drop, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            ON CONFLICT (user_id, product_id, is_active)
            DO UPDATE SET 
                target_price = $3,
                condition = $4,
                percentage_drop = $5,
                updated_at = NOW()
            RETURNING *
        `, [req.user.id, productId, targetPrice, condition, percentageDrop]);

        logger.info(`Price alert created/updated`, {
            userId: req.user.id,
            productId,
            targetPrice,
            condition
        });

        res.json({
            success: true,
            message: 'Price alert created successfully',
            data: {
                alert: result.rows[0],
                product: {
                    id: product.rows[0].id,
                    name: product.rows[0].name,
                    currentPrice: product.rows[0].price
                }
            }
        });

    } catch (error) {
        logger.error('Price alert creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create price alert',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/price-tracking/alerts/my-alerts
 * @desc    Get current user's active price alerts
 * @access  Private
 */
router.get('/alerts/my-alerts', protect, async (req, res) => {
    try {
        const alerts = await query(`
            SELECT 
                pa.id,
                pa.target_price,
                pa.condition,
                pa.percentage_drop,
                pa.created_at,
                pa.updated_at,
                p.id as product_id,
                p.name as product_name,
                p.price as current_price,
                p.category,
                CASE 
                    WHEN pa.condition = 'less_than' AND p.price <= pa.target_price THEN true
                    WHEN pa.condition = 'greater_than' AND p.price >= pa.target_price THEN true
                    ELSE false
                END as is_triggered
            FROM price_alerts pa
            JOIN pc_parts p ON p.id = pa.product_id
            WHERE pa.user_id = $1 AND pa.is_active = true
            ORDER BY pa.created_at DESC
        `, [req.user.id]);

        const triggered = alerts.rows.filter(a => a.is_triggered);
        const pending = alerts.rows.filter(a => !a.is_triggered);

        res.json({
            success: true,
            data: {
                all: alerts.rows,
                triggered,
                pending,
                summary: {
                    total: alerts.rowCount,
                    triggered: triggered.length,
                    pending: pending.length
                }
            }
        });

    } catch (error) {
        logger.error('Fetch user alerts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch price alerts',
            message: error.message
        });
    }
});

/**
 * @route   DELETE /api/price-tracking/alerts/:alertId
 * @desc    Delete a price alert
 * @access  Private
 */
router.delete('/alerts/:alertId', protect, async (req, res) => {
    try {
        const { alertId } = req.params;

        // Check if alert exists and belongs to user
        const alert = await query(
            'SELECT * FROM price_alerts WHERE id = $1 AND user_id = $2',
            [alertId, req.user.id]
        );

        if (alert.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found or unauthorized'
            });
        }

        // Soft delete by setting is_active to false
        await query(
            'UPDATE price_alerts SET is_active = false, updated_at = NOW() WHERE id = $1',
            [alertId]
        );

        logger.info(`Price alert deleted`, { userId: req.user.id, alertId });

        res.json({
            success: true,
            message: 'Price alert deleted successfully'
        });

    } catch (error) {
        logger.error('Delete price alert error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete price alert',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/price-tracking/category/:category
 * @desc    Get price summary for a specific category
 * @access  Public
 */
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { days = 30 } = req.query;
        const safeDays = Number.parseInt(days, 10) || 30;

        // Get category price summary
        const summary = await query(`
            WITH recent_prices AS (
                SELECT DISTINCT ON (ph.product_id)
                    ph.product_id,
                    ph.price,
                    ph.previous_price,
                    ph.price_change,
                    ph.price_change_percent,
                    ph.recorded_at
                FROM price_history ph
                JOIN pc_parts p ON p.id = ph.product_id
                WHERE p.category = $1
                    AND ph.recorded_at >= NOW() - $2 * INTERVAL '1 day'
                ORDER BY ph.product_id, ph.recorded_at DESC
            )
            SELECT 
                COUNT(DISTINCT p.id) as total_products,
                COUNT(rp.product_id) as tracked_products,
                AVG(p.price) as avg_current_price,
                MIN(p.price) as min_price,
                MAX(p.price) as max_price,
                AVG(rp.price_change) as avg_price_change,
                AVG(rp.price_change_percent) as avg_percent_change,
                COUNT(*) FILTER (WHERE rp.price_change > 0) as price_increases,
                COUNT(*) FILTER (WHERE rp.price_change < 0) as price_decreases
            FROM pc_parts p
            LEFT JOIN recent_prices rp ON rp.product_id = p.id
            WHERE p.category = $1 AND p.is_active = true
        `, [category, safeDays]);

        // Get trending products in category
        const trending = await query(`
            WITH latest_changes AS (
                SELECT DISTINCT ON (ph.product_id)
                    ph.product_id,
                    ph.price,
                    ph.previous_price,
                    ph.price_change,
                    ph.price_change_percent,
                    ph.recorded_at,
                    p.name,
                    p.brand,
                    p.model
                FROM price_history ph
                JOIN pc_parts p ON p.id = ph.product_id
                WHERE p.category = $1
                    AND ph.recorded_at >= NOW() - $2 * INTERVAL '1 day'
                ORDER BY ph.product_id, ph.recorded_at DESC
            )
            SELECT *
            FROM latest_changes
            WHERE price_change IS NOT NULL
            ORDER BY ABS(price_change_percent) DESC
            LIMIT 5
        `, [category, safeDays]);

        res.json({
            success: true,
            data: {
                category,
                summary: summary.rows[0],
                trending: trending.rows,
                filters: { days }
            }
        });

    } catch (error) {
        logger.error('Category price summary error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch category price summary',
            message: error.message
        });
    }
});

/**
 * @route   GET /api/price-tracking/statistics
 * @desc    Get overall price tracking statistics
 * @access  Public
 */
router.get('/statistics', async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(DISTINCT product_id) as tracked_products,
                COUNT(*) as total_price_changes,
                COUNT(*) FILTER (WHERE price_change > 0) as price_increases,
                COUNT(*) FILTER (WHERE price_change < 0) as price_decreases,
                AVG(price_change) FILTER (WHERE price_change IS NOT NULL) as avg_price_change,
                AVG(price_change_percent) FILTER (WHERE price_change_percent IS NOT NULL) as avg_percent_change,
                MAX(price_change) as biggest_increase,
                MIN(price_change) as biggest_decrease
            FROM price_history
            WHERE recorded_at >= NOW() - INTERVAL '30 days'
        `);

        const activeAlerts = await query(`
            SELECT COUNT(*) as count
            FROM price_alerts
            WHERE is_active = true
        `);

        res.json({
            success: true,
            data: {
                priceHistory: stats.rows[0],
                activeAlerts: Number.parseInt(activeAlerts.rows[0].count, 10),
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        logger.error('Fetch statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

module.exports = router;
