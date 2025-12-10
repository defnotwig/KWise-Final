/**
 * TASK 13: INVENTORY ALERTS SERVICE
 * Monitor and alert for low stock levels
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

// Default thresholds
const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const DEFAULT_OUT_OF_STOCK_THRESHOLD = 0;

/**
 * Get low stock products
 * @param {number} threshold - Stock level threshold
 * @returns {Promise<Array>} - Array of low stock products
 */
async function getLowStockProducts(threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
    try {
        const result = await query(
            `SELECT id, name, category, stock, price, tier
             FROM pc_parts
             WHERE stock > $1 AND stock <= $2
             ORDER BY stock ASC, category`,
            [DEFAULT_OUT_OF_STOCK_THRESHOLD, threshold]
        );

        return result.rows;
    } catch (error) {
        logger.error('Error fetching low stock products:', error);
        throw error;
    }
}

/**
 * Get out of stock products
 * @returns {Promise<Array>} - Array of out of stock products
 */
async function getOutOfStockProducts() {
    try {
        const result = await query(
            `SELECT id, name, category, stock, price, tier
             FROM pc_parts
             WHERE stock = 0
             ORDER BY category, name`,
            []
        );

        return result.rows;
    } catch (error) {
        logger.error('Error fetching out of stock products:', error);
        throw error;
    }
}

/**
 * Get inventory alerts summary
 * @param {number} lowStockThreshold - Threshold for low stock
 * @returns {Promise<Object>} - Alerts summary
 */
async function getInventoryAlerts(lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD) {
    try {
        const [lowStock, outOfStock] = await Promise.all([
            getLowStockProducts(lowStockThreshold),
            getOutOfStockProducts()
        ]);

        // Group by category
        const lowStockByCategory = lowStock.reduce((acc, product) => {
            if (!acc[product.category]) {
                acc[product.category] = [];
            }
            acc[product.category].push(product);
            return acc;
        }, {});

        const outOfStockByCategory = outOfStock.reduce((acc, product) => {
            if (!acc[product.category]) {
                acc[product.category] = [];
            }
            acc[product.category].push(product);
            return acc;
        }, {});

        return {
            summary: {
                lowStockCount: lowStock.length,
                outOfStockCount: outOfStock.length,
                totalAlertsCount: lowStock.length + outOfStock.length,
                threshold: lowStockThreshold
            },
            lowStock: {
                total: lowStock.length,
                products: lowStock,
                byCategory: lowStockByCategory
            },
            outOfStock: {
                total: outOfStock.length,
                products: outOfStock,
                byCategory: outOfStockByCategory
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Error getting inventory alerts:', error);
        throw error;
    }
}

/**
 * Check if product needs restocking
 * @param {number} productId - Product ID
 * @param {number} threshold - Stock threshold
 * @returns {Promise<Object>} - Alert status
 */
async function checkProductAlert(productId, threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
    try {
        const result = await query(
            'SELECT id, name, category, stock FROM pc_parts WHERE id = $1',
            [productId]
        );

        if (result.rows.length === 0) {
            throw new Error('Product not found');
        }

        const product = result.rows[0];
        const alertLevel = product.stock === 0 ? 'critical' : product.stock <= threshold ? 'warning' : 'normal';

        return {
            productId: product.id,
            productName: product.name,
            category: product.category,
            currentStock: product.stock,
            threshold,
            alertLevel,
            needsRestock: alertLevel !== 'normal'
        };
    } catch (error) {
        logger.error('Error checking product alert:', error);
        throw error;
    }
}

module.exports = {
    getLowStockProducts,
    getOutOfStockProducts,
    getInventoryAlerts,
    checkProductAlert,
    DEFAULT_LOW_STOCK_THRESHOLD,
    DEFAULT_OUT_OF_STOCK_THRESHOLD
};
