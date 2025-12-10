const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const logger = require('../utils/logger');
const { protect } = require('../middleware/auth');

/**
 * Global Search Endpoint
 * Searches across all admin data: products, orders, users, logs
 * Returns categorized results with navigation hints
 */

router.get('/global', protect, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.json({
                success: true,
                data: {
                    products: [],
                    orders: [],
                    users: [],
                    logs: [],
                    totalResults: 0
                },
                message: 'Query too short. Minimum 2 characters required.'
            });
        }

        const searchTerm = `%${q.trim()}%`;
        logger.info(`🔍 Global search for: "${q}"`);

        // Search across all data in parallel
        const [
            productsResult,
            ordersResult,
            usersResult,
            logsResult
        ] = await Promise.all([
            // Search products
            query(`
                SELECT 
                    id,
                    name,
                    category,
                    brand,
                    price,
                    stock,
                    image_url,
                    'product' as type,
                    '/admin/stock' as navigation_path
                FROM pc_parts
                WHERE is_active = true
                  AND (
                    LOWER(name) LIKE LOWER($1)
                    OR LOWER(category) LIKE LOWER($1)
                    OR LOWER(brand) LIKE LOWER($1)
                    OR CAST(id AS TEXT) LIKE $1
                  )
                ORDER BY 
                    CASE 
                        WHEN LOWER(name) LIKE LOWER($1) THEN 1
                        WHEN LOWER(category) LIKE LOWER($1) THEN 2
                        WHEN LOWER(brand) LIKE LOWER($1) THEN 3
                        ELSE 4
                    END,
                    name
                LIMIT 10
            `, [searchTerm]),

            // Search orders
            query(`
                SELECT 
                    id,
                    customer_name,
                    customer_email,
                    total_amount as price,
                    status,
                    queue_number,
                    created_at,
                    'order' as type,
                    '/admin/orders' as navigation_path
                FROM orders
                WHERE 
                    LOWER(customer_name) LIKE LOWER($1)
                    OR LOWER(customer_email) LIKE LOWER($1)
                    OR CAST(id AS TEXT) LIKE $1
                    OR CAST(queue_number AS TEXT) LIKE $1
                ORDER BY created_at DESC
                LIMIT 10
            `, [searchTerm]),

            // Search users
            query(`
                SELECT 
                    id,
                    username,
                    username as name,
                    email,
                    role,
                    is_active,
                    'user' as type,
                    '/admin/accounts' as navigation_path
                FROM users
                WHERE 
                    LOWER(username) LIKE LOWER($1)
                    OR LOWER(email) LIKE LOWER($1)
                    OR CAST(id AS TEXT) LIKE $1
                ORDER BY 
                    CASE 
                        WHEN LOWER(username) LIKE LOWER($1) THEN 1
                        WHEN LOWER(email) LIKE LOWER($1) THEN 2
                        ELSE 3
                    END,
                    username
                LIMIT 10
            `, [searchTerm]),

            // Search logs (SUPERADMIN only)
            req.user.role === 'superadmin' ? query(`
                SELECT 
                    id,
                    action,
                    description,
                    user_id,
                    role,
                    ip_address,
                    created_at,
                    status,
                    'log' as type,
                    '/admin/logs' as navigation_path
                FROM audit_logs
                WHERE 
                    LOWER(action) LIKE LOWER($1)
                    OR LOWER(description) LIKE LOWER($1)
                    OR LOWER(role) LIKE LOWER($1)
                    OR CAST(user_id AS TEXT) LIKE $1
                    OR ip_address LIKE $1
                ORDER BY created_at DESC
                LIMIT 10
            `, [searchTerm]) : Promise.resolve({ rows: [] })
        ]);

        // Format results
        const results = {
            products: productsResult.rows.map(p => ({
                id: p.id,
                title: p.name,
                subtitle: `${p.category} - ${p.brand}`,
                description: `₱${parseFloat(p.price).toLocaleString()} | Stock: ${p.stock}`,
                image: p.image_url,
                type: 'product',
                navigationPath: `/admin/stock/${p.category}`,
                metadata: {
                    category: p.category,
                    price: p.price,
                    stock: p.stock
                }
            })),
            orders: ordersResult.rows.map(o => ({
                id: o.id,
                title: `Order #${o.id}`,
                subtitle: o.customer_name,
                description: `${o.status} | ₱${parseFloat(o.price).toLocaleString()} | ${new Date(o.created_at).toLocaleDateString()}`,
                type: 'order',
                navigationPath: '/admin/orders',
                metadata: {
                    status: o.status,
                    amount: o.price,
                    queueNumber: o.queue_number
                }
            })),
            users: usersResult.rows.map(u => ({
                id: u.id,
                title: u.username,
                subtitle: u.name || u.username,
                description: `${u.email} | ${u.role} | ${u.is_active ? 'Active' : 'Inactive'}`,
                type: 'user',
                navigationPath: '/admin/accounts',
                metadata: {
                    role: u.role,
                    email: u.email,
                    isActive: u.is_active
                }
            })),
            logs: logsResult.rows.map(l => ({
                id: l.id,
                title: l.action,
                subtitle: `${l.role} - ${l.ip_address}`,
                description: l.description,
                type: 'log',
                navigationPath: '/admin/logs',
                metadata: {
                    userId: l.user_id,
                    role: l.role,
                    status: l.status,
                    timestamp: l.created_at
                }
            }))
        };

        const totalResults = 
            results.products.length + 
            results.orders.length + 
            results.users.length + 
            results.logs.length;

        logger.info(`✅ Search complete. Found ${totalResults} results`);

        res.json({
            success: true,
            data: results,
            totalResults: totalResults,
            query: q,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Global search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
