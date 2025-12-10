const express = require('express');
const logger = require('../utils/logger');
const router = express.Router();
const { query } = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for audit log access
const auditLogLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    message: 'Too many audit log requests, please try again later'
});

// Middleware to ensure user is authenticated for all routes
router.use(protect);
router.use(auditLogLimit);

// GET /api/audit-logs - Get audit logs with filtering and pagination
router.get('/', 
    restrictTo('superadmin'), // SUPERADMIN ONLY - Full access to all activities
    async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 50, 
                search = '', 
                action = '', 
                tableName = '', 
                userId = '', 
                dateRange = '' 
            } = req.query;

            let whereConditions = ['1=1'];
            let queryParams = [];
            let paramCount = 0;

            // Apply filters
            if (search) {
                paramCount++;
                whereConditions.push(`(
                    al.action ILIKE $${paramCount} OR 
                    al.table_name ILIKE $${paramCount} OR 
                    u.name ILIKE $${paramCount} OR 
                    al.ip_address ILIKE $${paramCount}
                )`);
                queryParams.push(`%${search}%`);
            }

            if (action) {
                paramCount++;
                whereConditions.push(`al.action = $${paramCount}`);
                queryParams.push(action);
            }

            if (tableName) {
                paramCount++;
                whereConditions.push(`al.table_name = $${paramCount}`);
                queryParams.push(tableName);
            }

            if (userId) {
                paramCount++;
                whereConditions.push(`al.user_id = $${paramCount}`);
                queryParams.push(parseInt(userId));
            }

            // Date range filter
            if (dateRange) {
                paramCount++;
                let dateCondition = '';
                switch (dateRange) {
                    case '1h':
                        dateCondition = `al.created_at >= NOW() - INTERVAL '1 hour'`;
                        break;
                    case '24h':
                        dateCondition = `al.created_at >= NOW() - INTERVAL '24 hours'`;
                        break;
                    case '7d':
                        dateCondition = `al.created_at >= NOW() - INTERVAL '7 days'`;
                        break;
                    case '30d':
                        dateCondition = `al.created_at >= NOW() - INTERVAL '30 days'`;
                        break;
                    default:
                        dateCondition = '1=1';
                }
                whereConditions.push(dateCondition);
            }

            const whereClause = whereConditions.join(' AND ');
            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM audit_logs al 
                LEFT JOIN users u ON al.user_id = u.id 
                WHERE ${whereClause}
            `;
            const countResult = await query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].total);

            // Get logs with pagination
            const logsQuery = `
                SELECT 
                    al.id,
                    al.user_id,
                    u.name as user_name,
                    u.email as user_email,
                    u.role as user_role,
                    al.role,
                    al.action,
                    al.table_name,
                    al.entity,
                    al.entity_type,
                    al.record_id,
                    al.entity_id,
                    al.old_values,
                    al.new_values,
                    al.description,
                    al.severity,
                    al.status,
                    al.ip_address,
                    al.user_agent,
                    al.details,
                    al.created_at,
                    EXTRACT(EPOCH FROM (NOW() - al.created_at)) as seconds_ago
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE ${whereClause}
                ORDER BY al.created_at DESC
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;
            
            queryParams.push(parseInt(limit), offset);
            const logsResult = await query(logsQuery, queryParams);

            res.json({
                success: true,
                data: logsResult.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });

        } catch (error) {
            logger.error('Error fetching audit logs:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching audit logs',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }
);

// GET /api/audit-logs/filters - Get available filter options
router.get('/filters', 
    restrictTo('superadmin', 'admin', 'developer'),
    async (req, res) => {
        try {
            // Get distinct actions
            const actionsQuery = `
                SELECT DISTINCT action 
                FROM audit_logs 
                WHERE action IS NOT NULL 
                ORDER BY action
            `;
            const actionsResult = await query(actionsQuery);

            // Get distinct table names
            const tablesQuery = `
                SELECT DISTINCT table_name 
                FROM audit_logs 
                WHERE table_name IS NOT NULL 
                ORDER BY table_name
            `;
            const tablesResult = await query(tablesQuery);

            // Get users who have logs
            const usersQuery = `
                SELECT DISTINCT u.id, u.name, u.email 
                FROM users u 
                INNER JOIN audit_logs al ON u.id = al.user_id 
                ORDER BY u.name
            `;
            const usersResult = await query(usersQuery);

            res.json({
                success: true,
                data: {
                    actions: actionsResult.rows.map(row => row.action),
                    tables: tablesResult.rows.map(row => row.table_name),
                    users: usersResult.rows
                }
            });

        } catch (error) {
            logger.error('Error fetching filter options:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching filter options'
            });
        }
    }
);

// GET /api/audit-logs/stats - Get audit log statistics (admin and superadmin only)
router.get('/stats', 
    restrictTo('superadmin', 'admin'),
    async (req, res) => {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_logs,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_logs,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as week_logs,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as month_logs,
                    COUNT(DISTINCT user_id) as active_users,
                    COUNT(DISTINCT action) as unique_actions,
                    COUNT(DISTINCT table_name) as affected_tables
                FROM audit_logs
            `;
            
            const result = await query(statsQuery);
            const stats = result.rows[0];

            // Get most common actions
            const actionsQuery = `
                SELECT action, COUNT(*) as count
                FROM audit_logs
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY action
                ORDER BY count DESC
                LIMIT 10
            `;
            const actionsResult = await query(actionsQuery);

            // Get most active users
            const usersQuery = `
                SELECT u.name, u.email, COUNT(*) as log_count
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.created_at >= NOW() - INTERVAL '30 days'
                GROUP BY u.id, u.name, u.email
                ORDER BY log_count DESC
                LIMIT 10
            `;
            const usersResult = await query(usersQuery);

            res.json({
                success: true,
                data: {
                    summary: {
                        total: parseInt(stats.total_logs),
                        today: parseInt(stats.today_logs),
                        week: parseInt(stats.week_logs),
                        month: parseInt(stats.month_logs),
                        activeUsers: parseInt(stats.active_users),
                        uniqueActions: parseInt(stats.unique_actions),
                        affectedTables: parseInt(stats.affected_tables)
                    },
                    topActions: actionsResult.rows,
                    topUsers: usersResult.rows
                }
            });

        } catch (error) {
            logger.error('Error fetching audit log stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching audit log statistics'
            });
        }
    }
);

// GET /api/audit-logs/export - Export audit logs (admin and superadmin only)
router.get('/export', 
    restrictTo('superadmin', 'admin'),
    async (req, res) => {
        try {
            const { 
                format = 'csv',
                search = '', 
                action = '', 
                tableName = '', 
                userId = '', 
                dateRange = '' 
            } = req.query;

            let whereConditions = ['1=1'];
            let queryParams = [];
            let paramCount = 0;

            // Apply same filters as main logs endpoint
            if (search) {
                paramCount++;
                whereConditions.push(`(
                    al.action ILIKE $${paramCount} OR 
                    al.table_name ILIKE $${paramCount} OR 
                    u.name ILIKE $${paramCount}
                )`);
                queryParams.push(`%${search}%`);
            }

            if (action) {
                paramCount++;
                whereConditions.push(`al.action = $${paramCount}`);
                queryParams.push(action);
            }

            if (tableName) {
                paramCount++;
                whereConditions.push(`al.table_name = $${paramCount}`);
                queryParams.push(tableName);
            }

            if (userId) {
                paramCount++;
                whereConditions.push(`al.user_id = $${paramCount}`);
                queryParams.push(parseInt(userId));
            }

            // Date range filter
            if (dateRange) {
                let dateCondition = '';
                switch (dateRange) {
                    case '1h':
                        dateCondition = `al.created_at >= NOW() - INTERVAL '1 hour'`;
                        break;
                    case '24h':
                        dateCondition = `al.created_at >= NOW() - INTERVAL '24 hours'`;
                        break;
                    case '7d':
                        dateCondition = `al.created_at >= NOW() - INTERVAL '7 days'`;
                        break;
                    case '30d':
                        dateCondition = `al.created_at >= NOW() - INTERVAL '30 days'`;
                        break;
                    default:
                        dateCondition = '1=1';
                }
                whereConditions.push(dateCondition);
            }

            const whereClause = whereConditions.join(' AND ');

            // Get logs for export (limit to prevent memory issues)
            const logsQuery = `
                SELECT 
                    al.id,
                    u.name as user_name,
                    u.email as user_email,
                    al.action,
                    al.table_name,
                    al.record_id,
                    al.ip_address,
                    al.created_at
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE ${whereClause}
                ORDER BY al.created_at DESC
                LIMIT 10000
            `;
            
            const logsResult = await query(logsQuery, queryParams);
            const logs = logsResult.rows;

            if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
                res.json(logs);
            } else {
                // CSV format
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
                
                // CSV headers
                const csvHeaders = 'ID,User Name,User Email,Action,Table,Record ID,IP Address,Timestamp\n';
                res.write(csvHeaders);
                
                // CSV rows
                logs.forEach(log => {
                    const row = [
                        log.id,
                        `"${log.user_name || ''}"`,
                        `"${log.user_email || ''}"`,
                        `"${log.action || ''}"`,
                        `"${log.table_name || ''}"`,
                        `"${log.record_id || ''}"`,
                        `"${log.ip_address || ''}"`,
                        `"${new Date(log.created_at).toISOString()}"`
                    ].join(',');
                    res.write(row + '\n');
                });
                
                res.end();
            }

        } catch (error) {
            logger.error('Error exporting audit logs:', error);
            res.status(500).json({
                success: false,
                message: 'Error exporting audit logs'
            });
        }
    }
);

// DELETE /api/audit-logs/cleanup - Clean up old logs (superadmin only)
router.delete('/cleanup', 
    restrictTo('superadmin'),
    async (req, res) => {
        try {
            const { days = 90 } = req.query;
            
            const cleanupQuery = `
                DELETE FROM audit_logs 
                WHERE created_at < NOW() - INTERVAL '${parseInt(days)} days'
            `;
            
            const result = await query(cleanupQuery);
            
            res.json({
                success: true,
                message: `Cleaned up audit logs older than ${days} days`,
                deletedCount: result.rowCount
            });

        } catch (error) {
            logger.error('Error cleaning up audit logs:', error);
            res.status(500).json({
                success: false,
                message: 'Error cleaning up audit logs'
            });
        }
    }
);

module.exports = router;
