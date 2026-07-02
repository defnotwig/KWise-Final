const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Log model for PostgreSQL database
 * Works with the audit_logs table in KWiseDB
 */
class Log {
    /**
     * Create a new log entry
     */
    static async create(logData) {
        try {
            const {
                userId,
                userName,
                userRole,
                action,
                description,
                details = {},
                ipAddress = null,
                userAgent = null,
                module = 'SYSTEM',
                severity = 'INFO',
                sessionId = null,
                requestId = null
            } = logData;

            const result = await db.query(`
        INSERT INTO audit_logs (
          user_id, user_name, user_role, action, description, details,
          ip_address, user_agent, module, severity, session_id, request_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING *
      `, [
                userId, userName, userRole, action, description,
                JSON.stringify(details), ipAddress, userAgent,
                module, severity, sessionId, requestId
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating log entry:', error);
            // Don't throw here to prevent logging errors from breaking the main operation
            return null;
        }
    }

    /**
     * Get all logs with pagination and filtering
     */
    static async getAllLogs(options = {}) {
        try {
            const {
                page = 1,
                limit = 50,
                userId = null,
                action = null,
                module = null,
                severity = null,
                startDate = null,
                endDate = null,
                search = null
            } = options;

            const offset = (page - 1) * limit;
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;

            // Build WHERE conditions dynamically
            if (userId) {
                whereConditions.push(`user_id = $${paramIndex++}`);
                queryParams.push(userId);
            }

            if (action) {
                whereConditions.push(`action = $${paramIndex++}`);
                queryParams.push(action);
            }

            if (module) {
                whereConditions.push(`module = $${paramIndex++}`);
                queryParams.push(module);
            }

            if (severity) {
                whereConditions.push(`severity = $${paramIndex++}`);
                queryParams.push(severity);
            }

            if (startDate) {
                whereConditions.push(`created_at >= $${paramIndex++}`);
                queryParams.push(startDate);
            }

            if (endDate) {
                whereConditions.push(`created_at <= $${paramIndex++}`);
                queryParams.push(endDate);
            }

            if (search) {
                whereConditions.push(`(
          description ILIKE $${paramIndex} OR 
          user_name ILIKE $${paramIndex} OR 
          action ILIKE $${paramIndex}
        )`);
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Get total count
            const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
            const countResult = await db.query(countQuery, queryParams);
            const totalItems = Number.parseInt(countResult.rows[0].count, 10);

            // Get paginated results
            const dataQuery = `
        SELECT 
          id, user_id, user_name, user_role, action, description, details,
          ip_address, user_agent, module, severity, session_id, request_id,
          created_at,
          EXTRACT(EPOCH FROM (NOW() - created_at)) as seconds_ago
        FROM audit_logs 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

            queryParams.push(limit, offset);
            const dataResult = await db.query(dataQuery, queryParams);

            return {
                logs: dataResult.rows.map(row => ({
                    ...row,
                    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
                    timeAgo: this.formatTimeAgo(row.seconds_ago),
                    formattedTimestamp: new Date(row.created_at).toLocaleString()
                })),
                pagination: {
                    page: Number.parseInt(page, 10),
                    limit: Number.parseInt(limit, 10),
                    total: totalItems,
                    pages: Math.ceil(totalItems / limit)
                }
            };
        } catch (error) {
            logger.error('Error getting logs:', error);
            throw error;
        }
    }

    /**
     * Get logs by user ID
     */
    static async getLogsByUser(userId, options = {}) {
        return this.getAllLogs({ ...options, userId });
    }

    /**
     * Get logs by action
     */
    static async getLogsByAction(action, options = {}) {
        return this.getAllLogs({ ...options, action });
    }

    /**
     * Get logs by date range
     */
    static async getLogsByDateRange(startDate, endDate, options = {}) {
        return this.getAllLogs({ ...options, startDate, endDate });
    }

    /**
     * Get system logs (non-user actions)
     */
    static async getSystemLogs(options = {}) {
        try {
            const systemActions = ['SYSTEM_START', 'SYSTEM_STOP', 'BACKUP', 'MAINTENANCE'];
            const { page = 1, limit = 50 } = options;
            const offset = (page - 1) * limit;

            const result = await db.query(`
        SELECT 
          id, user_id, user_name, user_role, action, description, details,
          ip_address, user_agent, module, severity, created_at,
          EXTRACT(EPOCH FROM (NOW() - created_at)) as seconds_ago
        FROM audit_logs 
        WHERE action = ANY($1) OR module = 'SYSTEM'
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [systemActions, limit, offset]);

            const countResult = await db.query(`
        SELECT COUNT(*) FROM audit_logs 
        WHERE action = ANY($1) OR module = 'SYSTEM'
      `, [systemActions]);

            return {
                logs: result.rows.map(row => ({
                    ...row,
                    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
                    timeAgo: this.formatTimeAgo(row.seconds_ago),
                    formattedTimestamp: new Date(row.created_at).toLocaleString()
                })),
                pagination: {
                    page: Number.parseInt(page, 10),
                    limit: Number.parseInt(limit, 10),
                    total: Number.parseInt(countResult.rows[0].count, 10),
                    pages: Math.ceil(Number.parseInt(countResult.rows[0].count, 10) / limit)
                }
            };
        } catch (error) {
            logger.error('Error getting system logs:', error);
            throw error;
        }
    }

    /**
     * Get error logs only
     */
    static async getErrorLogs(options = {}) {
        return this.getAllLogs({ ...options, severity: 'ERROR' });
    }

    /**
     * Get user activity statistics
     */
    static async getUserActivityStats(timeframe = '24h') {
        try {
            let timeCondition = '';

            switch (timeframe) {
                case '1h':
                    timeCondition = "created_at >= NOW() - INTERVAL '1 hour'";
                    break;
                case '24h':
                    timeCondition = "created_at >= NOW() - INTERVAL '24 hours'";
                    break;
                case '7d':
                    timeCondition = "created_at >= NOW() - INTERVAL '7 days'";
                    break;
                case '30d':
                    timeCondition = "created_at >= NOW() - INTERVAL '30 days'";
                    break;
                default:
                    timeCondition = "created_at >= NOW() - INTERVAL '24 hours'";
            }

            const result = await db.query(`
        SELECT 
          user_role,
          action,
          module,
          COUNT(*) as count
        FROM audit_logs 
        WHERE ${timeCondition}
        GROUP BY user_role, action, module
        ORDER BY count DESC
      `);

            return result.rows;
        } catch (error) {
            logger.error('Error getting user activity stats:', error);
            throw error;
        }
    }

    /**
     * Clear old logs (older than specified days)
     */
    static async clearOldLogs(daysToKeep = 90) {
        try {
            const safeDays = Number.parseInt(daysToKeep, 10) || 90;
            const result = await db.query(`
        DELETE FROM audit_logs 
        WHERE created_at < NOW() - $1 * INTERVAL '1 day'
        RETURNING id
      `, [safeDays]);

            return result.rowCount;
        } catch (error) {
            logger.error('Error clearing old logs:', error);
            throw error;
        }
    }

    /**
     * Format time ago in human readable format
     */
    static formatTimeAgo(secondsAgo) {
        const seconds = Math.floor(secondsAgo);

        if (seconds < 60) return `${seconds} seconds ago`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

        const days = Math.floor(hours / 24);
        return `${days} day${days === 1 ? '' : 's'} ago`;
    }

    /**
     * Export logs to CSV format
     */
    static async exportLogs(options = {}) {
        try {
            const { logs } = await this.getAllLogs({ ...options, limit: 10000 }); // Large limit for export

            if (logs.length === 0) return '';

            const headers = [
                'ID', 'Timestamp', 'User', 'Role', 'Action', 'Description',
                'Module', 'Severity', 'IP Address'
            ];

            const rows = logs.map(log => [
                log.id,
                log.formattedTimestamp,
                log.user_name,
                log.user_role,
                log.action,
                log.description,
                log.module,
                log.severity,
                log.ip_address || 'N/A'
            ]);

            const csvContent = [headers, ...rows]
                .map(row => row.map(field => `"${String(field).replaceAll('"', '""')}"`).join(','))
                .join('\n');

            return csvContent;
        } catch (error) {
            logger.error('Error exporting logs:', error);
            throw error;
        }
    }
}

module.exports = Log;
