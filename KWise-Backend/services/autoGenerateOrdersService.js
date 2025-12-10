/**
 * Auto-Generate Orders Utility
 * TASK 7: Generates test orders for testing purposes
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Generate random test orders
 * @param {Object} options - Configuration { count, customerPrefix, includeServices }
 * @returns {Array} Generated orders
 */
async function generateTestOrders(options = {}) {
    const {
        count = 10,
        customerPrefix = 'Test Customer',
        includeServices = false,
        minItems = 1,
        maxItems = 5,
        minTotal = 5000,
        maxTotal = 50000
    } = options;

    logger.info(`🤖 Generating ${count} test orders...`);

    const orders = [];
    const products = await getRandomProducts();
    const services = includeServices ? await getRandomServices() : [];

    for (let i = 0; i < count; i++) {
        const customerName = `${customerPrefix} ${i + 1}`;
        const itemCount = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
        const orderItems = [];
        let totalAmount = 0;

        // Add random products
        for (let j = 0; j < itemCount; j++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 3) + 1;
            const price = parseFloat(product.price) || 0;
            
            orderItems.push({
                type: 'product',
                name: product.name,
                category: product.category,
                quantity,
                price,
                subtotal: price * quantity
            });

            totalAmount += price * quantity;
        }

        // Optionally add service
        if (includeServices && Math.random() > 0.5 && services.length > 0) {
            const service = services[Math.floor(Math.random() * services.length)];
            const servicePrice = parseFloat(service.price) || 0;
            
            orderItems.push({
                type: 'service',
                name: service.name,
                category: service.category,
                quantity: 1,
                price: servicePrice,
                subtotal: servicePrice
            });

            totalAmount += servicePrice;
        }

        // Adjust to target price range
        if (totalAmount < minTotal) {
            const scaleFactor = minTotal / totalAmount;
            orderItems.forEach(item => {
                item.price = item.price * scaleFactor;
                item.subtotal = item.subtotal * scaleFactor;
            });
            totalAmount = minTotal;
        } else if (totalAmount > maxTotal) {
            const scaleFactor = maxTotal / totalAmount;
            orderItems.forEach(item => {
                item.price = item.price * scaleFactor;
                item.subtotal = item.subtotal * scaleFactor;
            });
            totalAmount = maxTotal;
        }

        // Create order
        const order = {
            customerName,
            items: orderItems,
            totalAmount: Math.round(totalAmount * 100) / 100,
            status: randomStatus(),
            createdAt: randomDate(30) // Random date within last 30 days
        };

        orders.push(order);
    }

    logger.info(`✅ Generated ${orders.length} test orders`);
    return orders;
}

/**
 * Save generated orders to database
 * @param {Array} orders - Orders to save
 * @returns {Object} Result with success count
 */
async function saveGeneratedOrders(orders) {
    logger.info(`💾 Saving ${orders.length} orders to database...`);

    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    for (const order of orders) {
        try {
            // Insert into orders table
            const orderResult = await query(
                `INSERT INTO orders (customer_name, total_amount, status, created_at)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [order.customerName, order.totalAmount, order.status, order.createdAt]
            );

            const orderId = orderResult.rows[0].id;

            // Insert order items
            for (const item of order.items) {
                await query(
                    `INSERT INTO order_items (order_id, component_name, item_name, quantity, price, amount)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [orderId, item.category || 'General', item.name, item.quantity, item.price, item.subtotal]
                );
            }

            results.success++;
            logger.info(`✅ Order #${orderId} created for ${order.customerName}`);

        } catch (error) {
            results.failed++;
            results.errors.push({
                customer: order.customerName,
                error: error.message
            });
            logger.error(`❌ Failed to create order for ${order.customerName}:`, error);
        }
    }

    logger.info(`📊 Save Results: ${results.success} success, ${results.failed} failed`);
    return results;
}

/**
 * Get random products from database
 */
async function getRandomProducts() {
    try {
        const result = await query(
            `SELECT id, name, category, price 
             FROM pc_parts 
             WHERE price > 0 AND stock > 0
             ORDER BY RANDOM()
             LIMIT 50`
        );
        return result.rows;
    } catch (error) {
        logger.error('Error fetching random products:', error);
        return [];
    }
}

/**
 * Get random services from database
 */
async function getRandomServices() {
    try {
        const result = await query(
            `SELECT id, name, category, price 
             FROM services 
             WHERE price > 0
             ORDER BY RANDOM()
             LIMIT 10`
        );
        return result.rows;
    } catch (error) {
        logger.error('Error fetching random services:', error);
        return [];
    }
}

/**
 * Generate random order status
 */
function randomStatus() {
    const statuses = ['pending', 'processing', 'completed', 'cancelled'];
    const weights = [0.3, 0.4, 0.25, 0.05]; // 30% pending, 40% processing, 25% completed, 5% cancelled
    
    const random = Math.random();
    let sum = 0;
    
    for (let i = 0; i < statuses.length; i++) {
        sum += weights[i];
        if (random <= sum) {
            return statuses[i];
        }
    }
    
    return 'pending';
}

/**
 * Generate random date within last N days
 */
function randomDate(daysAgo) {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * daysAgo);
    const randomHours = Math.floor(Math.random() * 24);
    const randomMinutes = Math.floor(Math.random() * 60);
    
    const date = new Date(now);
    date.setDate(date.getDate() - randomDays);
    date.setHours(randomHours);
    date.setMinutes(randomMinutes);
    
    return date;
}

/**
 * Delete all test orders (cleanup utility)
 * @param {string} customerPrefix - Prefix to identify test customers
 */
async function deleteTestOrders(customerPrefix = 'Test Customer') {
    try {
        logger.info(`🗑️ Deleting test orders with prefix: ${customerPrefix}`);

        const result = await query(
            `DELETE FROM orders WHERE customer_name LIKE $1 RETURNING id`,
            [`${customerPrefix}%`]
        );

        logger.info(`✅ Deleted ${result.rowCount} test orders`);
        return { deleted: result.rowCount };

    } catch (error) {
        logger.error('Error deleting test orders:', error);
        throw error;
    }
}

module.exports = {
    generateTestOrders,
    saveGeneratedOrders,
    deleteTestOrders
};
