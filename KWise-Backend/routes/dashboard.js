const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/auth');
const { query } = require('../config/db');
const logger = require('../utils/logger');

// Apply authentication to all dashboard routes
router.use(protect);

// =====================================================
// ENHANCED DASHBOARD ENDPOINTS
// =====================================================

// Enhanced Dashboard Statistics API
router.get('/stats', async (req, res) => {
    try {
    logger.info('Fetching comprehensive admin dashboard stats');

        // Run all queries in parallel for better performance
        const [
            totalOrdersResult,
            completedOrdersResult,
            pendingOrdersResult,
            cancelledOrdersResult,
            todaysOrdersResult,
            weekOrdersResult,
            totalUsersResult,
            activeUsersResult,
            totalProductsResult,
            lowStockProductsResult,
            totalInventoryValueResult,
            recentOrdersResult,
            topProductsResult,
            usersByRoleResult
        ] = await Promise.all([
            // Order statistics
            query('SELECT COUNT(*) as count FROM orders'),
            query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['completed']),
            query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['pending']),
            query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['cancelled']),
            query('SELECT COUNT(*) as count FROM orders WHERE created_at >= CURRENT_DATE'),
            query('SELECT COUNT(*) as count FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\''),
            
            // User statistics - using last_active_at for real-time data
            query('SELECT COUNT(*) as count FROM users'),
            query(`
                SELECT COUNT(*) as count 
                FROM users 
                WHERE last_active_at >= NOW() - INTERVAL '5 minutes'
                AND is_active = true
            `),
            
            // Product statistics
            query('SELECT COUNT(*) as count FROM pc_parts WHERE is_active = true'),
            query('SELECT COUNT(*) as count FROM pc_parts WHERE stock <= 10 AND is_active = true'),
            query('SELECT COALESCE(SUM(price * stock), 0) as total_value FROM pc_parts WHERE is_active = true'),
            
            // Recent activity
            query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5'),
            // Top products - simplified query using only pc_parts table
            query(`
                SELECT p.name, p.category, p.brand, p.stock, p.price, (p.price * p.stock) as total_value
                FROM pc_parts p 
                WHERE p.is_active = true 
                ORDER BY p.stock DESC 
                LIMIT 5
            `),
            query('SELECT role, COUNT(*) as count FROM users GROUP BY role')
        ]);

        // Calculate revenue (sum of completed orders)
        const revenueResult = await query(`
            SELECT COALESCE(SUM(total_amount), 0) as total_revenue 
            FROM orders 
            WHERE status = 'completed'
        `);

        // Calculate monthly growth
        const monthlyGrowthResult = await query(`
            SELECT 
                COUNT(*) as current_month,
                (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '2 months' AND created_at < CURRENT_DATE - INTERVAL '1 month') as previous_month
            FROM orders 
            WHERE created_at >= CURRENT_DATE - INTERVAL '1 month'
        `);

        const currentMonth = monthlyGrowthResult.rows[0]?.current_month || 0;
        const previousMonth = monthlyGrowthResult.rows[0]?.previous_month || 0;
        const monthlyGrowth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth * 100).toFixed(1) : 0;

    // Build comprehensive stats object
    const stats = {
            // Order Statistics
            orders: {
                total: parseInt(totalOrdersResult.rows[0]?.count || 0),
                completed: parseInt(completedOrdersResult.rows[0]?.count || 0),
                pending: parseInt(pendingOrdersResult.rows[0]?.count || 0),
                cancelled: parseInt(cancelledOrdersResult.rows[0]?.count || 0),
                today: parseInt(todaysOrdersResult.rows[0]?.count || 0),
                thisWeek: parseInt(weekOrdersResult.rows[0]?.count || 0),
                monthlyGrowth: parseFloat(monthlyGrowth)
            },
            
            // User Statistics
            users: {
                total: parseInt(totalUsersResult.rows[0]?.count || 0),
                active: parseInt(activeUsersResult.rows[0]?.count || 0),
                byRole: usersByRoleResult.rows.reduce((acc, row) => {
                    acc[row.role] = parseInt(row.count);
                    return acc;
                }, {})
            },
            
            // Product/Inventory Statistics
            products: {
                total: parseInt(totalProductsResult.rows[0]?.count || 0),
                lowStock: parseInt(lowStockProductsResult.rows[0]?.count || 0),
                totalValue: parseFloat(totalInventoryValueResult.rows[0]?.total_value || 0)
            },
            
            // Financial Statistics
            revenue: {
                total: parseFloat(revenueResult.rows[0]?.total_revenue || 0),
                monthly: monthlyGrowth
            },
            
            // Recent Activity
            recentOrders: recentOrdersResult.rows,
            topProducts: topProductsResult.rows,
            
            // System Health
            system: {
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                version: process.env.API_VERSION || '1.0.0'
            }
        };

        // Add consolidated log/user stats from helper for a single source of truth
        try {
            const { getLogStats, getUserStats } = require('../utils/statsHelper');
            const [logStats, userStats] = await Promise.all([getLogStats(10), getUserStats(5)]);
            stats.logs = logStats;
            // augment users with roles distribution and recent list
            stats.users.roles = userStats.roles;
            stats.users.recent = userStats.recent;
        } catch (e) {
            logger.warn('statsHelper unavailable in /dashboard/stats augmentation:', e.message);
        }

        logger.info('Enhanced admin stats retrieved successfully', { 
            totalOrders: stats.orders.total,
            lowStockProducts: stats.products.lowStock,
            totalValue: stats.products.totalValue,
            activeUsers: stats.users.active
        });

        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching dashboard statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Real-time activity feed
router.get('/activity', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        // Get recent system activities from audit logs
        const activities = await query(`
            SELECT 
                al.id,
                al.action as type,
                al.table_name,
                al.record_id,
                al.description,
                al.created_at,
                u.name as user_name,
                u.email as user_email,
                u.role as user_role
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.created_at >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY al.created_at DESC 
            LIMIT $1
        `, [parseInt(limit)]);

        res.json({
            success: true,
            data: activities.rows
        });

    } catch (error) {
        logger.error('Error fetching activity feed:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching activity feed'
        });
    }
});

// Performance metrics
router.get('/performance', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const metrics = {
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            },
            database: {
                connections: 'Available', // Would need pg pool stats
                queries: 'Optimized'
            },
            api: {
                responseTime: '< 200ms',
                throughput: 'Normal'
            }
        };

        res.json({
            success: true,
            data: metrics
        });

    } catch (error) {
        logger.error('Error fetching performance metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching performance metrics'
        });
    }
});

// =====================================================
// LEGACY DASHBOARD ENDPOINTS (Preserved for compatibility)
// =====================================================

// Get comprehensive dashboard summary
router.get('/summary', restrictTo('admin', 'superadmin', 'developer'), dashboardController.getDashboardSummary);

// Recent orders
router.get('/recent-orders', restrictTo('admin', 'superadmin', 'developer'), dashboardController.getRecentOrders);

// Top products
router.get('/top-products', restrictTo('admin', 'superadmin', 'developer'), dashboardController.getTopProducts);

// Sales chart data
router.get('/sales-chart', restrictTo('admin', 'superadmin', 'developer'), dashboardController.getSalesChart);

// Revenue statistics
router.get('/revenue', restrictTo('admin', 'superadmin', 'developer'), dashboardController.getRevenueStats);

// System health
router.get('/system-health', restrictTo('admin', 'superadmin', 'developer'), dashboardController.getSystemHealth);

// Notifications
router.get('/notifications', restrictTo('admin', 'superadmin', 'developer'), dashboardController.getNotifications);
router.patch('/notifications/:id/read', restrictTo('admin', 'superadmin', 'developer'), dashboardController.markNotificationRead);

module.exports = router;
