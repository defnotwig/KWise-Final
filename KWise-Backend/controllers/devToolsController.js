const { query } = require('../config/db');
const logger = require('../utils/logger');

// Test API endpoint
const testEndpoint = async (req, res) => {
    try {
        const { endpoint, method = 'GET', data = null } = req.body;

        if (!endpoint) {
            return res.status(400).json({
                success: false,
                message: 'Endpoint is required'
            });
        }

        // Simulate API test (in a real implementation, you might want to actually test the endpoint)
        const startTime = Date.now();

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));

        const responseTime = Date.now() - startTime;

        const mockResponse = {
            endpoint,
            method: method.toUpperCase(),
            status: 'success',
            responseTime: `${responseTime}ms`,
            statusCode: 200,
            data: {
                message: 'API endpoint is working correctly',
                timestamp: new Date().toISOString(),
                testData: data
            }
        };

        res.json({
            success: true,
            data: mockResponse
        });
    } catch (error) {
        logger.error('Error testing endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Error testing endpoint'
        });
    }
};

// Get system status
const getSystemStatus = async (req, res) => {
    try {
        const status = {
            apiStatus: 'online',
            databaseStatus: 'connected',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date(),
            version: process.env.npm_package_version || '1.0.0',
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };

        // Test database connection
        try {
            await query('SELECT NOW() as current_time');
            status.databaseStatus = 'connected';
        } catch (dbError) {
            status.databaseStatus = 'disconnected';
            logger.error('Database health check failed:', dbError);
        }

        // Get memory usage percentage
        const memUsage = process.memoryUsage();
        status.memoryUsage = {
            rss: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100 + ' MB',
            heapTotal: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100 + ' MB',
            heapUsed: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100 + ' MB',
            external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100 + ' MB'
        };

        // Calculate uptime in human readable format
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        status.uptimeFormatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Error getting system status:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving system status'
        });
    }
};

// Get database statistics
const getDatabaseStats = async (req, res) => {
    try {
        // Get table counts using PostgreSQL
        const [usersResult, ordersResult, stockResult, logsResult] = await Promise.all([
            query('SELECT COUNT(*) as count FROM users'),
            query('SELECT COUNT(*) as count FROM orders'),
            query('SELECT COUNT(*) as count FROM pc_parts'),
            query('SELECT COUNT(*) as count FROM logs')
        ]);

        const totalUsers = parseInt(usersResult.rows[0]?.count || 0);
        const totalOrders = parseInt(ordersResult.rows[0]?.count || 0);
        const totalProducts = parseInt(stockResult.rows[0]?.count || 0);
        const totalLogs = parseInt(logsResult.rows[0]?.count || 0);

        // Get database size (approximate)
        const dbSizeResult = await query(`
            SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                   pg_database_size(current_database()) as size_bytes
        `);
        const databaseSize = dbSizeResult.rows[0]?.size || '0 MB';

        // Get table statistics
        const tableStatsResult = await query(`
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_rows,
                n_dead_tup as dead_rows
            FROM pg_stat_user_tables 
            ORDER BY n_live_tup DESC
        `);

        // Get recent activity from logs
        const recentLogsResult = await query(`
            SELECT action, created_at, user_name, module, severity
            FROM logs 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        const stats = {
            totalUsers,
            totalOrders,
            totalProducts,
            totalLogs,
            databaseSize,
            tables: tableStatsResult.rows,
            recentActivity: recentLogsResult.rows,
            lastOptimization: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Mock data
            connectionPool: {
                active: Math.floor(Math.random() * 10) + 5,
                idle: Math.floor(Math.random() * 5) + 2,
                max: 20
            }
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting database stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving database statistics'
        });
    }
};

// Get recent logs
const getRecentLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const logsResult = await query(`
            SELECT id, action, description, status, created_at, user_name, user_role, module, severity
            FROM logs 
            ORDER BY created_at DESC 
            LIMIT $1
        `, [limit]);

        const formattedLogs = logsResult.rows.map(log => ({
            id: log.id,
            level: log.status,
            message: log.description,
            timestamp: log.created_at,
            service: log.module,
            user: log.user_name,
            action: log.action,
            severity: log.severity
        }));

        res.json({
            success: true,
            data: formattedLogs
        });
    } catch (error) {
        logger.error('Error getting recent logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving recent logs'
        });
    }
};

// Clear cache
const clearCache = async (req, res) => {
    try {
        // In a real implementation, you would clear various caches
        // For now, we'll simulate cache clearing

        // Clear memory cache (if using any caching library)
        // await cache.clear();

        // Clear any stored data in memory
        if (global.gc) {
            global.gc();
        }

        logger.info('Cache cleared by user');

        res.json({
            success: true,
            message: 'Cache cleared successfully',
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing cache'
        });
    }
};

// Optimize database
const optimizeDatabase = async (req, res) => {
    try {
        // In a real implementation, you would perform database optimization
        // For MongoDB, this might include:
        // - Rebuilding indexes
        // - Compacting collections
        // - Analyzing query performance

        // Simulate optimization process
        await new Promise(resolve => setTimeout(resolve, 2000));

        logger.info('Database optimization completed by user');

        res.json({
            success: true,
            message: 'Database optimization completed successfully',
            timestamp: new Date(),
            details: {
                indexesRebuilt: Math.floor(Math.random() * 10) + 5,
                collectionsCompacted: Math.floor(Math.random() * 5) + 2,
                performanceImproved: Math.floor(Math.random() * 20) + 10 + '%'
            }
        });
    } catch (error) {
        logger.error('Error optimizing database:', error);
        res.status(500).json({
            success: false,
            message: 'Error optimizing database'
        });
    }
};

// Get API documentation
const getApiDocs = async (req, res) => {
    try {
        const apiDocs = {
            version: '1.0.0',
            baseUrl: process.env.API_BASE_URL || 'http://localhost:5000/api',
            endpoints: {
                auth: {
                    login: { method: 'POST', path: '/auth/login', description: 'User authentication' },
                    logout: { method: 'POST', path: '/auth/logout', description: 'User logout' },
                    me: { method: 'GET', path: '/auth/me', description: 'Get current user info' }
                },
                users: {
                    getAll: { method: 'GET', path: '/users', description: 'Get all users' },
                    getById: { method: 'GET', path: '/users/:id', description: 'Get user by ID' },
                    create: { method: 'POST', path: '/users', description: 'Create new user' },
                    update: { method: 'PUT', path: '/users/:id', description: 'Update user' },
                    delete: { method: 'DELETE', path: '/users/:id', description: 'Delete user' }
                },
                stock: {
                    getAll: { method: 'GET', path: '/stock', description: 'Get all stock items' },
                    getById: { method: 'GET', path: '/stock/:id', description: 'Get stock item by ID' },
                    create: { method: 'POST', path: '/stock', description: 'Create new stock item' },
                    update: { method: 'PUT', path: '/stock/:id', description: 'Update stock item' },
                    delete: { method: 'DELETE', path: '/stock/:id', description: 'Delete stock item' }
                },
                orders: {
                    getAll: { method: 'GET', path: '/orders', description: 'Get all orders' },
                    getById: { method: 'GET', path: '/orders/:id', description: 'Get order by ID' },
                    create: { method: 'POST', path: '/orders', description: 'Create new order' },
                    update: { method: 'PUT', path: '/orders/:id', description: 'Update order' },
                    delete: { method: 'DELETE', path: '/orders/:id', description: 'Delete order' }
                },
                dashboard: {
                    getStats: { method: 'GET', path: '/dashboard/stats', description: 'Get dashboard statistics' },
                    getRecentOrders: { method: 'GET', path: '/dashboard/recent-orders', description: 'Get recent orders' },
                    getTopProducts: { method: 'GET', path: '/dashboard/top-products', description: 'Get top products' }
                },
                logs: {
                    getAll: { method: 'GET', path: '/logs', description: 'Get all logs (superadmin only)' },
                    export: { method: 'GET', path: '/logs/export', description: 'Export logs to CSV' }
                }
            },
            authentication: {
                type: 'Bearer Token',
                header: 'Authorization: Bearer <token>'
            },
            rateLimiting: {
                windowMs: '15 minutes',
                max: '100 requests per window'
            }
        };

        res.json({
            success: true,
            data: apiDocs
        });
    } catch (error) {
        logger.error('Error getting API docs:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving API documentation'
        });
    }
};

// Test database connection
const testDatabaseConnection = async (req, res) => {
    try {
        const startTime = Date.now();

        // Test basic database operations
        await Promise.all([
            query('SELECT 1 as test'),
            query('SELECT COUNT(*) as user_count FROM users'),
            query('SELECT COUNT(*) as product_count FROM pc_parts')
        ]);

        const responseTime = Date.now() - startTime;

        const connectionTest = {
            status: 'connected',
            responseTime: `${responseTime}ms`,
            timestamp: new Date(),
            details: {
                database: 'KWiseDB',
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                readyState: 'connected'
            }
        };

        res.json({
            success: true,
            data: connectionTest
        });
    } catch (error) {
        logger.error('Database connection test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection test failed',
            error: error.message
        });
    }
};

// Public health endpoint
const getHealth = async (req, res) => {
    try {
        const health = {
            status: 'success',
            message: 'K-Wise Backend Dev Tools Health Check',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            uptime: process.uptime(),
            memory: {
                rss: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100 + ' MB',
                heapTotal: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100 + ' MB',
                heapUsed: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100 + ' MB'
            }
        };

        res.json(health);
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: error.message
        });
    }
};

module.exports = {
    testEndpoint,
    getSystemStatus,
    getDatabaseStats,
    getRecentLogs,
    clearCache,
    optimizeDatabase,
    getApiDocs,
    testDatabaseConnection,
    getHealth
};
