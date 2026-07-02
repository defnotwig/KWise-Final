const { query } = require('../config/db');
const logger = require('../utils/logger');
const { sanitizeForLog } = require('../utils/securitySanitizer');

/**
 * Audit logging middleware to track all user actions
 */
class AuditLogger {
    
    /**
     * Log user action to audit_logs table
     * @param {number} userId - User ID performing the action
     * @param {string} action - Action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)
     * @param {string} tableName - Table/resource affected
     * @param {string} recordId - ID of the record affected
     * @param {object} oldValues - Previous values (for updates)
     * @param {object} newValues - New values
     * @param {object} req - Express request object
     */
    static async logAction({
        userId,
        action,
        tableName,
        recordId = null,
        oldValues = null,
        newValues = null,
        req = null
    }) {
        try {
            const ipAddress = req ? (req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                (req.connection.socket ? req.connection.socket.remoteAddress : null)) : null;
            const userAgent = req ? req.get('User-Agent') : null;
            
            // Get user role if userId is provided
            let userRole = null;
            let userName = null;
            
            if (userId) {
                try {
                    const userResult = await query('SELECT name, role FROM users WHERE id = $1', [userId]);
                    if (userResult.rows.length > 0) {
                        userName = userResult.rows[0].name;
                        userRole = userResult.rows[0].role;
                    }
                } catch (userError) {
                    logger.error('Error fetching user for audit log:', userError);
                }
            }

            await query(`
                INSERT INTO audit_logs (
                    user_id, role, action, table_name, entity, record_id, 
                    old_values, new_values, ip_address, user_agent, 
                    description, severity, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            `, [
                userId,
                userRole,
                action.toUpperCase(),
                tableName,
                tableName, // Use tableName as entity for compatibility
                recordId?.toString() || null,
                oldValues ? JSON.stringify(sanitizeForLog(oldValues)) : null,
                newValues ? JSON.stringify(sanitizeForLog(newValues)) : null,
                ipAddress,
                userAgent,
                `${userName || 'System'} performed ${action} on ${tableName}${recordId ? ` (ID: ${recordId})` : ''}`,
                'INFO'
            ]);

            logger.info('Audit log created', { 
                userId, 
                userName,
                userRole,
                action: action.toUpperCase(), 
                tableName, 
                recordId,
                ipAddress 
            });

        } catch (error) {
            logger.error('Error creating audit log:', error);
            // Don't throw error to avoid breaking the main operation
        }
    }

    /**
     * Express middleware to automatically log API actions
     */
    static middleware() {
        return async (req, res, next) => {
            // Store original res.json to intercept response
            const originalJson = res.json;
            
            res.json = function(data) {
                // Only log successful operations
                if (data?.success && req.user?.id) {
                    const method = req.method;
                    const path = req.route?.path || req.path;
                    
                    // Determine action based on HTTP method
                    let action = 'VIEW';
                    if (method === 'POST') action = 'CREATE';
                    else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
                    else if (method === 'DELETE') action = 'DELETE';
                    
                    // Extract table name from path
                    const pathParts = path.split('/').filter(p => p && p !== 'api');
                    const tableName = pathParts[0] || 'unknown';
                    
                    // Extract record ID from params
                    const recordId = req.params.id || req.params.categoryId || req.params.userId;
                    
                    // Log the action
                    AuditLogger.logAction({
                        userId: req.user.id,
                        action,
                        tableName,
                        recordId,
                        newValues: method === 'POST' ? sanitizeForLog(req.body) : (method === 'PUT' || method === 'PATCH' ? sanitizeForLog(req.body) : null),
                        req
                    }).catch(err => {
                        logger.error('Audit logging failed:', err);
                    });
                }
                
                // Call original json method
                return originalJson.call(this, data);
            };
            
            next();
        };
    }

    /**
     * Log authentication events
     */
    static async logAuth(userId, action, req, success = true, details = null) {
        try {
            // Get user information for better logging
            let userName = null;
            let userRole = null;
            
            if (userId) {
                try {
                    const userResult = await query('SELECT name, role FROM users WHERE id = $1', [userId]);
                    if (userResult.rows.length > 0) {
                        userName = userResult.rows[0].name;
                        userRole = userResult.rows[0].role;
                    }
                } catch (userError) {
                    logger.error('Error fetching user for auth log:', userError);
                }
            }
            
            await this.logAction({
                userId,
                action: `AUTH_${action.toUpperCase()}${success ? '_SUCCESS' : '_FAILED'}`,
                tableName: 'users',
                recordId: userId?.toString(),
                newValues: {
                    ...details,
                    success,
                    timestamp: new Date().toISOString(),
                    userName,
                    userRole
                },
                req
            });
        } catch (error) {
            logger.error('Error logging auth event:', error);
        }
    }

    /**
     * Log stock operations with inventory tracking
     */
    static async logStockOperation(userId, action, productId, oldStock, newStock, req) {
        try {
            await this.logAction({
                userId,
                action: `STOCK_${action.toUpperCase()}`,
                tableName: 'pc_parts',
                recordId: productId?.toString(),
                oldValues: { stock: oldStock },
                newValues: { stock: newStock, stockChange: newStock - oldStock },
                req
            });
        } catch (error) {
            logger.error('Error logging stock operation:', error);
        }
    }

    /**
     * Get audit logs with filtering and pagination
     */
    static async getLogs({
        userId = null,
        action = null,
        tableName = null,
        startDate = null,
        endDate = null,
        limit = 50,
        offset = 0
    }) {
        try {
            let whereConditions = [];
            let queryParams = [];
            let paramCount = 0;

            if (userId) {
                paramCount++;
                whereConditions.push(`al.user_id = $${paramCount}`);
                queryParams.push(userId);
            }

            if (action) {
                paramCount++;
                whereConditions.push(`al.action ILIKE $${paramCount}`);
                queryParams.push(`%${action}%`);
            }

            if (tableName) {
                paramCount++;
                whereConditions.push(`al.table_name = $${paramCount}`);
                queryParams.push(tableName);
            }

            if (startDate) {
                paramCount++;
                whereConditions.push(`al.created_at >= $${paramCount}`);
                queryParams.push(startDate);
            }

            if (endDate) {
                paramCount++;
                whereConditions.push(`al.created_at <= $${paramCount}`);
                queryParams.push(endDate);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const logsQuery = `
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.email as user_email,
                    u.role as user_role
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ${whereClause}
                ORDER BY al.created_at DESC
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            queryParams.push(limit, offset);

            const countQuery = `
                SELECT COUNT(*) as total
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ${whereClause}
            `;

            const [logsResult, countResult] = await Promise.all([
                query(logsQuery, queryParams),
                query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
            ]);

            return {
                logs: logsResult.rows,
                total: Number.parseInt(countResult.rows[0]?.total || 0, 10),
                limit,
                offset
            };

        } catch (error) {
            logger.error('Error fetching audit logs:', error);
            throw error;
        }
    }
}

module.exports = AuditLogger;
