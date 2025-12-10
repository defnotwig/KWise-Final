/**
 * Price History API Routes
 * Handles price tracking and market trend analysis
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * @route   POST /api/price-history
 * @desc    Record a new price point
 * @access  Public (will add auth later)
 */
router.post('/', async (req, res) => {
    try {
        const { product_id, price, source = 'manual', currency = 'PHP', notes } = req.body;

        // Validation
        if (!product_id || !price) {
            return res.status(400).json({
                success: false,
                error: 'product_id and price are required'
            });
        }

        // Check if product exists
        const productCheck = await pool.query(
            'SELECT id, name FROM pc_parts WHERE id = $1',
            [product_id]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Insert price history
        const result = await pool.query(`
            INSERT INTO price_history (product_id, price, source, currency, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [product_id, price, source, currency, notes]);

        logger.info(`Price recorded for product ${product_id}: ${currency} ${price}`);

        res.json({
            success: true,
            message: 'Price recorded successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error recording price:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record price'
        });
    }
});

/**
 * @route   GET /api/price-history/:productId
 * @desc    Get price history for a product
 * @access  Public
 */
router.get('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { limit = 30, days = 30 } = req.query;

        const result = await pool.query(`
            SELECT 
                ph.*,
                p.name as product_name,
                p.category
            FROM price_history ph
            JOIN pc_parts p ON ph.product_id = p.id
            WHERE ph.product_id = $1
            AND ph.recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
            ORDER BY ph.recorded_at DESC
            LIMIT $2
        `, [productId, parseInt(limit)]);

        // Calculate price statistics
        const stats = await pool.query(`
            SELECT 
                MIN(price) as lowest_price,
                MAX(price) as highest_price,
                AVG(price) as average_price,
                COUNT(*) as total_records
            FROM price_history
            WHERE product_id = $1
            AND recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
        `, [productId]);

        res.json({
            success: true,
            data: {
                history: result.rows,
                statistics: stats.rows[0],
                period_days: parseInt(days)
            }
        });

    } catch (error) {
        logger.error('Error fetching price history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch price history'
        });
    }
});

/**
 * @route   GET /api/price-history/alerts/drops
 * @desc    Get products with recent price drops
 * @access  Public
 */
router.get('/alerts/drops', async (req, res) => {
    try {
        const { threshold = 5, days = 7, limit = 20 } = req.query;

        const result = await pool.query(`
            WITH latest_prices AS (
                SELECT DISTINCT ON (product_id)
                    product_id,
                    price as current_price,
                    recorded_at
                FROM price_history
                ORDER BY product_id, recorded_at DESC
            ),
            previous_prices AS (
                SELECT DISTINCT ON (product_id)
                    product_id,
                    price as previous_price
                FROM price_history
                WHERE recorded_at < NOW() - INTERVAL '${parseInt(days)} days'
                ORDER BY product_id, recorded_at DESC
            )
            SELECT 
                p.id,
                p.name,
                p.category,
                p.price as current_price,
                lp.current_price as tracked_price,
                pp.previous_price,
                ROUND((pp.previous_price - lp.current_price) / pp.previous_price * 100, 2) as drop_percentage,
                pp.previous_price - lp.current_price as drop_amount
            FROM pc_parts p
            JOIN latest_prices lp ON p.id = lp.product_id
            JOIN previous_prices pp ON p.id = pp.product_id
            WHERE ((pp.previous_price - lp.current_price) / pp.previous_price * 100) >= $1
            ORDER BY drop_percentage DESC
            LIMIT $2
        `, [parseFloat(threshold), parseInt(limit)]);

        res.json({
            success: true,
            data: {
                alerts: result.rows,
                threshold_percentage: parseFloat(threshold),
                period_days: parseInt(days)
            }
        });

    } catch (error) {
        logger.error('Error fetching price drop alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch price drop alerts'
        });
    }
});

/**
 * @route   GET /api/price-history/trends/market
 * @desc    Get overall market price trends
 * @access  Public
 */
router.get('/trends/market', async (req, res) => {
    try {
        const { category, days = 30 } = req.query;

        let query = `
            WITH daily_averages AS (
                SELECT 
                    DATE(ph.recorded_at) as date,
                    p.category,
                    AVG(ph.price) as avg_price,
                    COUNT(*) as product_count
                FROM price_history ph
                JOIN pc_parts p ON ph.product_id = p.id
                WHERE ph.recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
        `;

        const params = [];
        if (category) {
            query += ` AND p.category = $1`;
            params.push(category);
        }

        query += `
                GROUP BY DATE(ph.recorded_at), p.category
                ORDER BY date DESC, category
            )
            SELECT * FROM daily_averages
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                trends: result.rows,
                period_days: parseInt(days),
                category: category || 'all'
            }
        });

    } catch (error) {
        logger.error('Error fetching market trends:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch market trends'
        });
    }
});

/**
 * @route   GET /api/price-history/view/latest
 * @desc    Get latest prices using the view
 * @access  Public
 */
router.get('/view/latest', async (req, res) => {
    try {
        const { category, limit = 50 } = req.query;

        let query = 'SELECT * FROM latest_product_prices';
        const params = [];

        if (category) {
            query += ' WHERE category = $1';
            params.push(category);
        }

        query += ' ORDER BY price_change_percent DESC LIMIT $' + (params.length + 1);
        params.push(parseInt(limit));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching latest prices:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch latest prices'
        });
    }
});

/**
 * @route   DELETE /api/price-history/:id
 * @desc    Delete a price history entry
 * @access  Admin (will add auth later)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM price_history WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Price history entry not found'
            });
        }

        logger.info(`Price history entry deleted: ${id}`);

        res.json({
            success: true,
            message: 'Price history entry deleted successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error deleting price history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete price history entry'
        });
    }
});

module.exports = router;
