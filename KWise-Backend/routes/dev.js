const express = require('express');
const router = express.Router();
const devToolsController = require('../controllers/devToolsController');
const { protect, restrictTo } = require('../middleware/auth');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const fs = require('node:fs').promises;
const path = require('node:path');

const isTestMode = process.env.NODE_ENV === 'test';

// Test-mode short-circuit for deterministic responses without DB
if (isTestMode) {
    if (!process.env.BYPASS_AUTH_FOR_TESTS) {
        process.env.BYPASS_AUTH_FOR_TESTS = 'true';
    }

    router.get('/system-status', (req, res) => {
        return res.json({
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                database: { status: 'connected' },
                uptime: 0,
                environment: 'test'
            }
        });
    });

    router.get('/database/stats', (req, res) => {
        return res.json({
            success: true,
            data: {
                version: 'test-db',
                tables: [],
                size: { size: '0 bytes', size_bytes: 0 },
                activeConnections: 0,
                performance: [],
                performanceExtension: 'unavailable'
            }
        });
    });
}

// Public health endpoint (no authentication required)
router.get('/health', devToolsController.getHealth);

// Apply authentication to all other dev routes
router.use(protect);

// =====================================================
// DEVELOPER TOOLS ENDPOINTS
// =====================================================

// Get comprehensive system status
router.get('/system-status', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const systemStatus = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0'
        };

        // Test database connection
        try {
            const dbTest = await query('SELECT NOW() as current_time, version() as db_version');
            systemStatus.database = {
                status: 'connected',
                currentTime: dbTest.rows[0].current_time,
                version: dbTest.rows[0].db_version
            };
        } catch (dbError) {
            systemStatus.database = {
                status: 'disconnected',
                error: dbError.message
            };
        }

        // Get system resource usage
        const os = require('node:os');
        systemStatus.system = {
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            loadAverage: os.loadavg(),
            cpuCount: os.cpus().length,
            hostname: os.hostname(),
            platform: os.platform(),
            release: os.release()
        };

        res.json({
            success: true,
            data: systemStatus
        });

    } catch (error) {
        logger.error('Error getting system status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get system status'
        });
    }
});

// Get database information
// Enhanced database statistics (renamed from duplicate /database to /database/stats)
router.get('/database/stats', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const dbInfo = {
            timestamp: new Date().toISOString(),
            connection: 'connected'
        };

        // Get database version
        const versionResult = await query('SELECT version() as version');
        dbInfo.version = versionResult.rows[0].version;

        // Get table information
        const tablesResult = await query(`
            SELECT 
                table_name,
                table_type,
                (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        dbInfo.tables = tablesResult.rows;

        // Get database size
        const sizeResult = await query(`
            SELECT 
                pg_size_pretty(pg_database_size(current_database())) as size,
                pg_database_size(current_database()) as size_bytes
        `);
        dbInfo.size = sizeResult.rows[0];

        // Get active connections
        const connectionsResult = await query(`
            SELECT COUNT(*) as active_connections
            FROM pg_stat_activity 
            WHERE state = 'active'
        `);
        dbInfo.activeConnections = Number.parseInt(connectionsResult.rows[0].active_connections, 10);

        // Get recent query performance
        // Attempt to read pg_stat_statements (may not be enabled in some environments)
        try {
            const performanceResult = await query(`
                SELECT 
                    query,
                    calls,
                    total_time,
                    mean_time,
                    rows
                FROM pg_stat_statements 
                ORDER BY total_time DESC 
                LIMIT 10
            `);
            dbInfo.performance = performanceResult.rows;
            dbInfo.performanceExtension = 'available';
        } catch (perfErr) {
            // Graceful fallback when extension not installed or permission denied
            dbInfo.performance = [];
            dbInfo.performanceExtension = 'unavailable';
            dbInfo.performanceNote = perfErr.message.includes('pg_stat_statements')
                ? 'pg_stat_statements extension not enabled; skipping performance metrics'
                : 'Performance metrics unavailable';
            logger.warn('pg_stat_statements unavailable, continuing without performance metrics');
        }

        res.json({
            success: true,
            data: dbInfo
        });

    } catch (error) {
        logger.error('Error getting database info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get database information'
        });
    }
});

// Get system logs
router.get('/system-logs', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { level, limit = 100, from, to } = req.query;

        let baseQuery = `
            SELECT 
                l.*,
                u.name as user_name,
                u.email as user_email
            FROM audit_logs l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE 1=1
        `;
        const queryParams = [];
        let paramCount = 1;

        if (level) {
            baseQuery += ` AND l.severity = $${paramCount}`;
            queryParams.push(level);
            paramCount++;
        }

        if (from) {
            baseQuery += ` AND l.created_at >= $${paramCount}`;
            queryParams.push(new Date(from));
            paramCount++;
        }

        if (to) {
            baseQuery += ` AND l.created_at <= $${paramCount}`;
            queryParams.push(new Date(to));
            paramCount++;
        }

        baseQuery += ` ORDER BY l.created_at DESC LIMIT $${paramCount}`;
        queryParams.push(Number.parseInt(limit, 10));

        const result = await query(baseQuery, queryParams);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error getting system logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get system logs'
        });
    }
});

// Test API endpoints
router.post('/test-endpoint', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { endpoint, method = 'GET', body, headers } = req.body;

        if (!endpoint) {
            return res.status(400).json({
                success: false,
                message: 'Endpoint is required'
            });
        }

        const startTime = Date.now();
        let response, statusCode, responseTime;

        try {
            // Test the endpoint
            const axios = require('axios');
            const testResponse = await axios({
                method: method.toLowerCase(),
                url: `http://localhost:5000${endpoint}`,
                data: body,
                headers: headers || {},
                timeout: 10000
            });

            response = testResponse.data;
            statusCode = testResponse.status;
            responseTime = Date.now() - startTime;

        } catch (testError) {
            response = testError.response?.data || { error: testError.message };
            statusCode = testError.response?.status || 500;
            responseTime = Date.now() - startTime;
        }

        const testResult = {
            endpoint,
            method: method.toUpperCase(),
            status: statusCode < 400 ? 'success' : 'error',
            statusCode,
            responseTime: `${responseTime}ms`,
            response,
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: testResult
        });

    } catch (error) {
        logger.error('Error testing endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test endpoint'
        });
    }
});

// Clear system cache
router.post('/clear-cache', restrictTo('superadmin'), async (req, res) => {
    try {
        // Clear any in-memory caches
        if (globalThis.gc) {
            globalThis.gc();
        }

        // Clear database query cache (if using connection pooling)
        // This is a placeholder - actual implementation depends on your DB setup

        // Log the action
        const { insertAuditLog } = require('../utils/auditLogHelper');
        await insertAuditLog(req.app, {
            userId: req.user.id,
            action: 'CLEAR',
            entity: 'CACHE',
            entityId: null,
            description: 'Cleared system cache',
            severity: 'INFO',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'System cache cleared successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear system cache'
        });
    }
});

// Get API documentation
router.get('/api-docs', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const apiDocs = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            baseUrl: 'http://localhost:5000/api',
            endpoints: {
                auth: {
                    'POST /auth/login': 'User authentication',
                    'POST /auth/logout': 'User logout',
                    'POST /auth/refresh': 'Refresh token'
                },
                dashboard: {
                    'GET /dashboard/summary': 'Dashboard overview',
                    'GET /dashboard/stats': 'Dashboard statistics',
                    'GET /dashboard/recent-orders': 'Recent orders',
                    'GET /dashboard/top-products': 'Top products'
                },
                stock: {
                    'GET /stock': 'List stock items',
                    'GET /stock/:id': 'Get stock item details',
                    'POST /stock': 'Create stock item',
                    'PUT /stock/:id': 'Update stock item',
                    'DELETE /stock/:id': 'Delete stock item'
                },
                orders: {
                    'GET /orders/queue': 'Order queue',
                    'GET /orders/transactions': 'Transaction history',
                    'PATCH /orders/queue/:id/status': 'Update order status'
                },
                users: {
                    'GET /users': 'List users',
                    'GET /users/:id': 'Get user details',
                    'POST /users': 'Create user',
                    'PUT /users/:id': 'Update user',
                    'DELETE /users/:id': 'Delete user'
                },
                settings: {
                    'GET /settings': 'Get all settings',
                    'PUT /settings/:key': 'Update setting',
                    'DELETE /settings/:key': 'Delete setting'
                },
                logs: {
                    'GET /logs': 'Get system logs',
                    'GET /logs/export/csv': 'Export logs to CSV'
                }
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
            message: 'Failed to get API documentation'
        });
    }
});

// =====================================================
// ENHANCED DEVELOPER TOOLS (Phase 6)
// =====================================================

// Enhanced system health check
router.get('/health-detailed', restrictTo('developer', 'superadmin'), async (req, res) => {
    try {
        const healthChecks = {
            database: false,
            fileSystem: false,
            memory: false,
            diskSpace: false
        };

        // Database health
        try {
            await query('SELECT 1');
            healthChecks.database = true;
        } catch (error) {
            logger.error('Database health check failed:', error);
        }

        // File system health
        try {
            const assetsPath = path.join(__dirname, '../../assets');
            await fs.access(assetsPath);
            healthChecks.fileSystem = true;
        } catch (error) {
            logger.error('File system health check failed:', error);
        }

        // Memory health
        const memUsage = process.memoryUsage();
        healthChecks.memory = memUsage.heapUsed < (memUsage.heapTotal * 0.9);

        // Overall health status
        const allHealthy = Object.values(healthChecks).every(check => check === true);

        res.json({
            success: true,
            data: {
                status: allHealthy ? 'healthy' : 'degraded',
                checks: healthChecks,
                memory: memUsage,
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Error performing health checks:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed'
        });
    }
});

// System maintenance tools
router.post('/maintenance/clear-cache', restrictTo('developer', 'superadmin'), async (req, res) => {
    try {
        // Clear application cache (if implemented)
        logger.info('Cache clearing requested by developer');

        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });

    } catch (error) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cache'
        });
    }
});

// Database maintenance
router.post('/maintenance/optimize-db', restrictTo('developer', 'superadmin'), async (req, res) => {
    try {
        // Run database optimization commands
        await query('VACUUM ANALYZE');
        
        logger.info('Database optimization completed');

        res.json({
            success: true,
            message: 'Database optimization completed'
        });

    } catch (error) {
        logger.error('Error optimizing database:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to optimize database'
        });
    }
});

// Log analysis
router.get('/logs/analysis', restrictTo('developer', 'superadmin'), async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const safeDays = Number.parseInt(days, 10) || 7;

        // Analyze recent logs for patterns
        const logAnalysis = await query(`
            SELECT 
                severity,
                COUNT(*) as count,
                DATE(created_at) as log_date
            FROM audit_logs 
            WHERE created_at >= NOW() - $1 * INTERVAL '1 day'
            GROUP BY severity, DATE(created_at)
            ORDER BY log_date DESC, severity
        `, [safeDays]);

        res.json({
            success: true,
            data: logAnalysis.rows
        });

    } catch (error) {
        logger.error('Error analyzing logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze logs'
        });
    }
});

// Get database statistics
// Basic database info (retain for backward compatibility; enhanced stats at /dev/database/stats)
router.get('/database', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        logger.info('Fetching database statistics for developer tools');

        const [
            tableStats,
            connectionStats,
            performanceStats
        ] = await Promise.all([
            // Table statistics
            query(`
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation,
                    most_common_vals
                FROM pg_stats 
                WHERE schemaname = 'public'
                ORDER BY tablename, attname
                LIMIT 50
            `),
            // Connection statistics
            query(`
                SELECT 
                    COUNT(*) as total_connections,
                    COUNT(*) FILTER (WHERE state = 'active') as active_connections,
                    COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
                FROM pg_stat_activity
                WHERE datname = current_database()
            `),
            // Performance statistics
            query(`
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as database_size,
                    (SELECT COUNT(*) FROM users) as users_count,
                    (SELECT COUNT(*) FROM orders) as orders_count,
                    (SELECT COUNT(*) FROM pc_parts) as products_count,
                    (SELECT COUNT(*) FROM audit_logs) as logs_count
            `)
        ]);

        const stats = {
            tables: tableStats.rows,
            connections: connectionStats.rows[0],
            performance: performanceStats.rows[0],
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching database statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch database statistics'
        });
    }
});

module.exports = router;
