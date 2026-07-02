const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Enhanced Dashboard Controller for Admin Panel
 * Provides comprehensive dashboard data with PostgreSQL integration
 */

// Get dashboard statistics - Real-time data exactly matching frontend expectations
const getStats = async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));

        // Get real-time counts using PostgreSQL with proper error handling
        const [
            totalOrders,
            todayOrders,
            weekOrders,
            monthOrders,
            totalProducts,
            lowStockProducts,
            totalUsers,
            activeUsers,
            pendingOrders,
            completedOrders,
            cancelledOrders,
            inventoryValue
        ] = await Promise.all([
            query('SELECT COUNT(*) as count FROM orders'),
            query('SELECT COUNT(*) as count FROM orders WHERE created_at >= $1', [startOfDay]),
            query('SELECT COUNT(*) as count FROM orders WHERE created_at >= $1', [startOfWeek]),
            query('SELECT COUNT(*) as count FROM orders WHERE created_at >= $1', [startOfMonth]),
            query('SELECT COUNT(*) as count FROM pc_parts WHERE is_active = true'),
            query('SELECT COUNT(*) as count FROM pc_parts WHERE stock <= 10 AND is_active = true'),
            query('SELECT COUNT(*) as count FROM users'),
            query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
            query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['pending']),
            query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['completed']),
            query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['cancelled']),
            query('SELECT COALESCE(SUM(price * stock), 0) as total FROM pc_parts WHERE is_active = true')
        ]);

        // Calculate real-time revenue
        const [todayRevenue, weekRevenue, monthRevenue, totalRevenue] = await Promise.all([
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1 AND status = $2', [startOfDay, 'completed']),
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1 AND status = $2', [startOfWeek, 'completed']),
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1 AND status = $2', [startOfMonth, 'completed']),
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = $1', ['completed'])
        ]);

        // Structure data exactly as frontend expects
        const stats = {
            // Frontend expects these exact field names
            totalOrders: Number.parseInt(totalOrders.rows[0]?.count || 0, 10),
            todayOrders: Number.parseInt(todayOrders.rows[0]?.count || 0, 10),
            weekOrders: Number.parseInt(weekOrders.rows[0]?.count || 0, 10),
            monthOrders: Number.parseInt(monthOrders.rows[0]?.count || 0, 10),
            completedOrders: Number.parseInt(completedOrders.rows[0]?.count || 0, 10),
            pendingOrders: Number.parseInt(pendingOrders.rows[0]?.count || 0, 10),
            cancelledOrders: Number.parseInt(cancelledOrders.rows[0]?.count || 0, 10),
            
            totalProducts: Number.parseInt(totalProducts.rows[0]?.count || 0, 10),
            lowStockProducts: Number.parseInt(lowStockProducts.rows[0]?.count || 0, 10),
            inventoryValue: Number.parseFloat(inventoryValue.rows[0]?.total || 0),
            
            totalUsers: Number.parseInt(totalUsers.rows[0]?.count || 0, 10),
            activeUsers: Number.parseInt(activeUsers.rows[0]?.count || 0, 10),
            
            totalRevenue: Number.parseFloat(totalRevenue.rows[0]?.total || 0),
            monthlyRevenue: Number.parseFloat(monthRevenue.rows[0]?.total || 0),
            todayRevenue: Number.parseFloat(todayRevenue.rows[0]?.total || 0),
            weekRevenue: Number.parseFloat(weekRevenue.rows[0]?.total || 0),
            
            timestamp: new Date().toISOString(),
            hasOrders: Number.parseInt(totalOrders.rows[0]?.count || 0, 10) > 0,
            uptime: process.uptime()
        };

        // Log the real-time update for audit
        const { insertAuditLog } = require('../utils/auditLogHelper');
        await insertAuditLog(req.app, {
            action: 'DASHBOARD_ACCESS',
            entity: 'dashboard',
            details: JSON.stringify({
                user_id: req.user?.id,
                stats_generated: new Date().toISOString(),
                orders: stats.totalOrders,
                products: stats.totalProducts,
                users: stats.totalUsers
            }),
            description: 'Real-time dashboard statistics accessed',
            severity: 'INFO',
            userId: req.user?.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting real-time dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving real-time dashboard statistics'
        });
    }
};

// Get recent orders
const getRecentOrders = async (req, res) => {
    try {
        const limit = Number.parseInt(req.query.limit, 10) || 10;

        const result = await query(`
            SELECT o.*, u.name as customer_name, u.email as customer_email
            FROM orders o
            LEFT JOIN users u ON o.created_by = u.id
            ORDER BY o.created_at DESC
            LIMIT $1
        `, [limit]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Error getting recent orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving recent orders'
        });
    }
};

// Get top products
const getTopProducts = async (req, res) => {
    try {
        const limit = Number.parseInt(req.query.limit, 10) || 10;

        const result = await query(`
            SELECT p.*, COUNT(oi.id) as order_count
            FROM pc_parts p
            LEFT JOIN order_items oi ON p.id = oi.stock_item_id
            WHERE p.is_active = true
            GROUP BY p.id
            ORDER BY order_count DESC, p.stock DESC
            LIMIT $1
        `, [limit]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Error getting top products:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving top products'
        });
    }
};

// Get sales chart data
const getSalesChart = async (req, res) => {
    try {
        const days = Number.parseInt(req.query.days, 10) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const result = await query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as orders,
                COALESCE(SUM(total_amount), 0) as revenue
            FROM orders 
            WHERE created_at >= $1 AND status = 'completed'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [startDate]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Error getting sales chart data:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving sales chart data'
        });
    }
};

// Get revenue statistics
const getRevenueStats = async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        const [todayRev, weekRev, monthRev, yearRev, totalRev] = await Promise.all([
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1 AND status = $2', [startOfDay, 'completed']),
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1 AND status = $2', [startOfWeek, 'completed']),
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1 AND status = $2', [startOfMonth, 'completed']),
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1 AND status = $2', [startOfYear, 'completed']),
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = $1', ['completed'])
        ]);

        const revenue = {
            today: Number.parseFloat(todayRev.rows[0]?.total || 0),
            week: Number.parseFloat(weekRev.rows[0]?.total || 0),
            month: Number.parseFloat(monthRev.rows[0]?.total || 0),
            year: Number.parseFloat(yearRev.rows[0]?.total || 0),
            total: Number.parseFloat(totalRev.rows[0]?.total || 0)
        };

        res.json({
            success: true,
            data: revenue
        });
    } catch (error) {
        logger.error('Error getting revenue stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving revenue statistics'
        });
    }
};

// Get system health
const getSystemHealth = async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            database: 'connected',
            version: process.env.npm_package_version || '1.0.0'
        };

        // Test database connection
        try {
            await query('SELECT NOW() as current_time');
            health.database = 'connected';
        } catch (dbError) {
            health.database = 'disconnected';
            health.status = 'degraded';
            logger.error('Database health check failed:', dbError);
        }

        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        logger.error('Error getting system health:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving system health'
        });
    }
};

// Get notifications
const getNotifications = async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM audit_logs 
            WHERE severity IN ('WARN', 'ERROR')
            ORDER BY created_at DESC
            LIMIT 50
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Error getting notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving notifications'
        });
    }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            UPDATE audit_logs 
            SET read_at = NOW() 
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating notification'
        });
    }
};

// Get comprehensive dashboard summary
const getDashboardSummary = async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Get all statistics in parallel
        const [
            totalOrders,
            todayOrders,
            totalProducts,
            lowStockProducts,
            totalUsers,
            pendingOrders,
            completedOrders,
            totalRevenue,
            monthRevenue,
            recentOrders,
            topProducts,
            systemHealth
        ] = await Promise.all([
            query('SELECT COUNT(*) as count FROM orders'),
            query('SELECT COUNT(*) as count FROM orders WHERE created_at >= $1', [startOfDay]),
            query('SELECT COUNT(*) as count FROM pc_parts WHERE is_active = true'),
            query('SELECT COUNT(*) as count FROM pc_parts WHERE stock <= 10 AND is_active = true'),
            query('SELECT COUNT(*) as count FROM users'),
            query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['pending']),
            query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['completed']),
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = $1', ['completed']),
            query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1 AND status = $2', [startOfMonth, 'completed']),
            query('SELECT o.*, u.name as customer_name FROM orders o LEFT JOIN users u ON o.created_by = u.id ORDER BY o.created_at DESC LIMIT 5'),
            query('SELECT p.*, COUNT(oi.id) as order_count FROM pc_parts p LEFT JOIN order_items oi ON p.id = oi.stock_item_id WHERE p.is_active = true GROUP BY p.id ORDER BY order_count DESC LIMIT 5'),
            query('SELECT NOW() as current_time')
        ]);

        const summary = {
            overview: {
                totalOrders: Number.parseInt(totalOrders.rows[0]?.count || 0, 10),
                todayOrders: Number.parseInt(todayOrders.rows[0]?.count || 0, 10),
                totalProducts: Number.parseInt(totalProducts.rows[0]?.count || 0, 10),
                lowStockProducts: Number.parseInt(lowStockProducts.rows[0]?.count || 0, 10),
                totalUsers: Number.parseInt(totalUsers.rows[0]?.count || 0, 10),
                pendingOrders: Number.parseInt(pendingOrders.rows[0]?.count || 0, 10),
                completedOrders: Number.parseInt(completedOrders.rows[0]?.count || 0, 10)
            },
            revenue: {
                total: Number.parseFloat(totalRevenue.rows[0]?.total || 0),
                month: Number.parseFloat(monthRevenue.rows[0]?.total || 0)
            },
            recentOrders: recentOrders.rows,
            topProducts: topProducts.rows,
            systemHealth: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: 'connected'
            }
        };

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        logger.error('Error getting dashboard summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving dashboard summary'
        });
    }
};

module.exports = {
    getStats,
    getRecentOrders,
    getTopProducts,
    getSalesChart,
    getRevenueStats,
    getSystemHealth,
    getNotifications,
    markNotificationRead,
    getDashboardSummary
};
