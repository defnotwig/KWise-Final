/**
 * TASK 8: BATCH PRODUCT OPERATIONS SERVICE
 * Handles bulk operations on multiple products
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Batch delete products
 * @param {Array<number>} productIds - Array of product IDs to delete
 * @param {number} userId - User performing the operation
 * @returns {Promise<Object>} - Results with success/failure counts
 */
async function batchDeleteProducts(productIds, userId) {
    if (!productIds || productIds.length === 0) {
        throw new Error('No product IDs provided');
    }

    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    const client = await query.connect();
    
    try {
        await client.query('BEGIN');

        for (const productId of productIds) {
            try {
                // Check if product exists
                const checkResult = await client.query(
                    'SELECT id, name FROM pc_parts WHERE id = $1',
                    [productId]
                );

                if (checkResult.rows.length === 0) {
                    results.errors.push(`Product ID ${productId} not found`);
                    results.failed++;
                    continue;
                }

                const productName = checkResult.rows[0].name;

                // Delete the product
                await client.query('DELETE FROM pc_parts WHERE id = $1', [productId]);

                // Log the deletion (audit trail)
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, description, ip_address) 
                     VALUES ($1, $2, $3, $4)`,
                    [
                        userId,
                        'BATCH_DELETE_PRODUCT',
                        `Deleted product: ${productName} (ID: ${productId})`,
                        '0.0.0.0' // Placeholder - actual IP should come from request
                    ]
                );

                results.success++;
                logger.info(`Product deleted via batch: ${productName} (ID: ${productId})`);
            } catch (error) {
                logger.error(`Error deleting product ${productId}:`, error);
                results.errors.push(`Product ID ${productId}: ${error.message}`);
                results.failed++;
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Batch delete transaction failed:', error);
        throw new Error('Batch delete operation failed. All changes rolled back.');
    } finally {
        client.release();
    }

    return results;
}

/**
 * Batch update product prices
 * @param {Array<Object>} updates - Array of {id, newPrice} objects
 * @param {number} userId - User performing the operation
 * @returns {Promise<Object>} - Results with success/failure counts
 */
async function batchUpdatePrices(updates, userId) {
    if (!updates || updates.length === 0) {
        throw new Error('No price updates provided');
    }

    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    const client = await query.connect();
    
    try {
        await client.query('BEGIN');

        for (const update of updates) {
            const { id, newPrice } = update;

            try {
                // Validate price
                if (newPrice === undefined || newPrice === null || newPrice < 0) {
                    results.errors.push(`Product ID ${id}: Invalid price ${newPrice}`);
                    results.failed++;
                    continue;
                }

                // Get current product info
                const checkResult = await client.query(
                    'SELECT id, name, price FROM pc_parts WHERE id = $1',
                    [id]
                );

                if (checkResult.rows.length === 0) {
                    results.errors.push(`Product ID ${id} not found`);
                    results.failed++;
                    continue;
                }

                const product = checkResult.rows[0];
                const oldPrice = product.price;

                // Update price
                await client.query(
                    'UPDATE pc_parts SET price = $1, updated_at = NOW() WHERE id = $2',
                    [newPrice, id]
                );

                // Log the update
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, description, ip_address) 
                     VALUES ($1, $2, $3, $4)`,
                    [
                        userId,
                        'BATCH_UPDATE_PRICE',
                        `Updated price for ${product.name}: ₱${oldPrice} → ₱${newPrice}`,
                        '0.0.0.0'
                    ]
                );

                results.success++;
                logger.info(`Price updated via batch: ${product.name} (₱${oldPrice} → ₱${newPrice})`);
            } catch (error) {
                logger.error(`Error updating price for product ${id}:`, error);
                results.errors.push(`Product ID ${id}: ${error.message}`);
                results.failed++;
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Batch price update transaction failed:', error);
        throw new Error('Batch price update operation failed. All changes rolled back.');
    } finally {
        client.release();
    }

    return results;
}

/**
 * Batch update product categories
 * @param {Array<number>} productIds - Array of product IDs
 * @param {string} newCategory - New category to assign
 * @param {number} userId - User performing the operation
 * @returns {Promise<Object>} - Results with success/failure counts
 */
async function batchUpdateCategories(productIds, newCategory, userId) {
    if (!productIds || productIds.length === 0) {
        throw new Error('No product IDs provided');
    }

    if (!newCategory) {
        throw new Error('New category is required');
    }

    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    const client = await query.connect();
    
    try {
        await client.query('BEGIN');

        for (const productId of productIds) {
            try {
                // Get current product info
                const checkResult = await client.query(
                    'SELECT id, name, category FROM pc_parts WHERE id = $1',
                    [productId]
                );

                if (checkResult.rows.length === 0) {
                    results.errors.push(`Product ID ${productId} not found`);
                    results.failed++;
                    continue;
                }

                const product = checkResult.rows[0];
                const oldCategory = product.category;

                // Update category
                await client.query(
                    'UPDATE pc_parts SET category = $1, updated_at = NOW() WHERE id = $2',
                    [newCategory, productId]
                );

                // Log the update
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, description, ip_address) 
                     VALUES ($1, $2, $3, $4)`,
                    [
                        userId,
                        'BATCH_UPDATE_CATEGORY',
                        `Updated category for ${product.name}: ${oldCategory} → ${newCategory}`,
                        '0.0.0.0'
                    ]
                );

                results.success++;
                logger.info(`Category updated via batch: ${product.name} (${oldCategory} → ${newCategory})`);
            } catch (error) {
                logger.error(`Error updating category for product ${productId}:`, error);
                results.errors.push(`Product ID ${productId}: ${error.message}`);
                results.failed++;
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Batch category update transaction failed:', error);
        throw new Error('Batch category update operation failed. All changes rolled back.');
    } finally {
        client.release();
    }

    return results;
}

/**
 * Batch update product stock levels
 * @param {Array<Object>} updates - Array of {id, newStock} objects
 * @param {number} userId - User performing the operation
 * @returns {Promise<Object>} - Results with success/failure counts
 */
async function batchUpdateStock(updates, userId) {
    if (!updates || updates.length === 0) {
        throw new Error('No stock updates provided');
    }

    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    const client = await query.connect();
    
    try {
        await client.query('BEGIN');

        for (const update of updates) {
            const { id, newStock } = update;

            try {
                // Validate stock
                if (newStock === undefined || newStock === null || newStock < 0) {
                    results.errors.push(`Product ID ${id}: Invalid stock ${newStock}`);
                    results.failed++;
                    continue;
                }

                // Get current product info
                const checkResult = await client.query(
                    'SELECT id, name, stock FROM pc_parts WHERE id = $1',
                    [id]
                );

                if (checkResult.rows.length === 0) {
                    results.errors.push(`Product ID ${id} not found`);
                    results.failed++;
                    continue;
                }

                const product = checkResult.rows[0];
                const oldStock = product.stock;

                // Update stock
                await client.query(
                    'UPDATE pc_parts SET stock = $1, updated_at = NOW() WHERE id = $2',
                    [newStock, id]
                );

                // Log the update
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, description, ip_address) 
                     VALUES ($1, $2, $3, $4)`,
                    [
                        userId,
                        'BATCH_UPDATE_STOCK',
                        `Updated stock for ${product.name}: ${oldStock} → ${newStock}`,
                        '0.0.0.0'
                    ]
                );

                results.success++;
                logger.info(`Stock updated via batch: ${product.name} (${oldStock} → ${newStock})`);
            } catch (error) {
                logger.error(`Error updating stock for product ${id}:`, error);
                results.errors.push(`Product ID ${id}: ${error.message}`);
                results.failed++;
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Batch stock update transaction failed:', error);
        throw new Error('Batch stock update operation failed. All changes rolled back.');
    } finally {
        client.release();
    }

    return results;
}

module.exports = {
    batchDeleteProducts,
    batchUpdatePrices,
    batchUpdateCategories,
    batchUpdateStock
};
