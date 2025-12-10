/**
 * =====================================================
 * IP ACCESS CONTROL CONTROLLER
 * =====================================================
 * Purpose: Manage IP addresses, view logs, allow/block IPs
 * Author: K-Wise Security Team
 * Date: November 18, 2025
 * =====================================================
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');
const { invalidateIPCache } = require('../middleware/ipFirewall');

/**
 * Get all IP addresses with filtering and pagination
 * GET /api/ip/all
 */
const getAllIPs = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            status, 
            search,
            sortBy = 'last_seen',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build WHERE clause
        const conditions = [];
        const values = [];
        let paramCount = 0;

        if (status && status !== 'all') {
            paramCount++;
            conditions.push(`status = $${paramCount}`);
            values.push(status);
        }

        if (search) {
            paramCount++;
            conditions.push(`(ip_address ILIKE $${paramCount} OR device_name ILIKE $${paramCount})`);
            values.push(`%${search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Valid sort columns
        const validSortColumns = ['last_seen', 'first_seen', 'total_requests', 'ip_address', 'status'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'last_seen';
        const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM ip_access_control ${whereClause}`,
            values
        );
        const totalItems = parseInt(countResult.rows[0].total);

        // Get paginated results
        values.push(parseInt(limit), offset);
        const result = await query(`
            SELECT 
                id,
                ip_address,
                status,
                device_name,
                user_agent,
                first_seen,
                last_seen,
                total_requests,
                failed_login_attempts,
                blocked_reason,
                blocked_at,
                notes,
                created_at,
                updated_at
            FROM ip_access_control
            ${whereClause}
            ORDER BY ${sortColumn} ${orderDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, values);

        res.json({
            success: true,
            data: {
                items: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalItems,
                    totalPages: Math.ceil(totalItems / parseInt(limit))
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Get all IPs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IP addresses',
            error: error.message
        });
    }
};

/**
 * Get IP statistics summary
 * GET /api/ip/stats
 */
const getIPStats = async (req, res) => {
    try {
        const statsResult = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'allowed' THEN 1 END) as allowed,
                COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN last_seen >= NOW() - INTERVAL '1 hour' THEN 1 END) as active_last_hour,
                COUNT(CASE WHEN last_seen >= NOW() - INTERVAL '24 hours' THEN 1 END) as active_last_24h,
                SUM(total_requests) as total_requests,
                SUM(failed_login_attempts) as total_failed_logins
            FROM ip_access_control
        `);

        const recentLogsResult = await query(`
            SELECT COUNT(*) as recent_logs
            FROM ip_logs
            WHERE created_at >= NOW() - INTERVAL '1 hour'
        `);

        const stats = {
            ...statsResult.rows[0],
            recent_logs: parseInt(recentLogsResult.rows[0].recent_logs)
        };

        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Get IP stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IP statistics',
            error: error.message
        });
    }
};

/**
 * Allow an IP address
 * PUT /api/ip/:id/allow
 */
const allowIP = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;

        const result = await query(`
            UPDATE ip_access_control
            SET 
                status = 'allowed',
                blocked_reason = NULL,
                blocked_by = NULL,
                blocked_at = NULL,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found'
            });
        }

        const ipData = result.rows[0];

        // Invalidate cache immediately
        invalidateIPCache(ipData.ip_address);

        // Log audit action
        if (adminId) {
            await query(`
                INSERT INTO audit_logs (user_id, action, entity, description, ip_address)
                VALUES ($1, 'IP_ALLOWED', 'ip_access_control', $2, $3)
            `, [
                adminId,
                `Allowed IP address: ${ipData.ip_address}`,
                ipData.ip_address
            ]);
        }

        logger.info(`✅ IP ${ipData.ip_address} allowed by admin ${adminId}`);

        // Broadcast to connected admins
        if (global.io) {
            global.io.emit('ipStatusChanged', {
                id: ipData.id,
                ip: ipData.ip_address,
                status: 'allowed',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'IP address allowed successfully',
            data: ipData
        });

    } catch (error) {
        logger.error('Allow IP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to allow IP address',
            error: error.message
        });
    }
};

/**
 * Block an IP address
 * PUT /api/ip/:id/block
 */
const blockIP = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user?.id;

        const result = await query(`
            UPDATE ip_access_control
            SET 
                status = 'blocked',
                blocked_reason = $1,
                blocked_by = $2,
                blocked_at = NOW(),
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [
            reason || 'Blocked by administrator',
            adminId,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found'
            });
        }

        const ipData = result.rows[0];

        // Invalidate cache immediately
        invalidateIPCache(ipData.ip_address);

        // Log audit action
        if (adminId) {
            await query(`
                INSERT INTO audit_logs (user_id, action, entity, description, ip_address)
                VALUES ($1, 'IP_BLOCKED', 'ip_access_control', $2, $3)
            `, [
                adminId,
                `Blocked IP address: ${ipData.ip_address} - Reason: ${reason || 'Manual block'}`,
                ipData.ip_address
            ]);
        }

        logger.warn(`🚫 IP ${ipData.ip_address} blocked by admin ${adminId}`);

        // Broadcast to connected admins
        if (global.io) {
            global.io.emit('ipStatusChanged', {
                id: ipData.id,
                ip: ipData.ip_address,
                status: 'blocked',
                reason: ipData.blocked_reason,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'IP address blocked successfully',
            data: ipData
        });

    } catch (error) {
        logger.error('Block IP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to block IP address',
            error: error.message
        });
    }
};

/**
 * Update IP device name
 * PUT /api/ip/:id/device-name
 */
const updateDeviceName = async (req, res) => {
    try {
        const { id } = req.params;
        const { deviceName } = req.body;

        const result = await query(`
            UPDATE ip_access_control
            SET 
                device_name = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [deviceName, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found'
            });
        }

        res.json({
            success: true,
            message: 'Device name updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Update device name error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update device name',
            error: error.message
        });
    }
};

/**
 * Delete an IP record
 * DELETE /api/ip/:id
 */
const deleteIP = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.id;

        // Get IP info before deletion for logging
        const ipResult = await query(`
            SELECT ip_address FROM ip_access_control WHERE id = $1
        `, [id]);

        if (ipResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found'
            });
        }

        const ipAddress = ipResult.rows[0].ip_address;

        // Delete (cascade will delete associated logs)
        await query(`DELETE FROM ip_access_control WHERE id = $1`, [id]);

        // Log audit action
        if (adminId) {
            await query(`
                INSERT INTO audit_logs (user_id, action, entity, description, ip_address)
                VALUES ($1, 'IP_DELETED', 'ip_access_control', $2, $3)
            `, [
                adminId,
                `Deleted IP record: ${ipAddress}`,
                ipAddress
            ]);
        }

        logger.info(`🗑️ IP ${ipAddress} deleted by admin ${adminId}`);

        res.json({
            success: true,
            message: 'IP record deleted successfully'
        });

    } catch (error) {
        logger.error('Delete IP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete IP record',
            error: error.message
        });
    }
};

/**
 * Get IP access logs with pagination
 * GET /api/ip/logs
 */
const getIPLogs = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 100,
            ipAddress,
            actionType,
            success,
            startDate,
            endDate
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const conditions = [];
        const values = [];
        let paramCount = 0;

        if (ipAddress) {
            paramCount++;
            conditions.push(`ip_address = $${paramCount}`);
            values.push(ipAddress);
        }

        if (actionType) {
            paramCount++;
            conditions.push(`action_type = $${paramCount}`);
            values.push(actionType);
        }

        if (success !== undefined && success !== 'all') {
            paramCount++;
            conditions.push(`success = $${paramCount}`);
            values.push(success === 'true');
        }

        if (startDate) {
            paramCount++;
            conditions.push(`created_at >= $${paramCount}`);
            values.push(startDate);
        }

        if (endDate) {
            paramCount++;
            conditions.push(`created_at <= $${paramCount}`);
            values.push(endDate);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM ip_logs ${whereClause}`,
            values
        );
        const totalItems = parseInt(countResult.rows[0].total);

        // Get logs
        values.push(parseInt(limit), offset);
        const result = await query(`
            SELECT 
                l.*,
                u.name as user_name
            FROM ip_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, values);

        res.json({
            success: true,
            data: {
                items: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalItems,
                    totalPages: Math.ceil(totalItems / parseInt(limit))
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Get IP logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IP logs',
            error: error.message
        });
    }
};

/**
 * Get detailed info for a specific IP
 * GET /api/ip/:id
 */
const getIPDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                ac.*,
                b.name as blocked_by_name
            FROM ip_access_control ac
            LEFT JOIN users b ON ac.blocked_by = b.id
            WHERE ac.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found'
            });
        }

        const ipData = result.rows[0];

        // Get recent logs for this IP
        const logsResult = await query(`
            SELECT *
            FROM ip_logs
            WHERE ip_control_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [id]);

        res.json({
            success: true,
            data: {
                ...ipData,
                recentLogs: logsResult.rows
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Get IP details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IP details',
            error: error.message
        });
    }
};

/**
 * Check IP status (Public endpoint - no auth required)
 * GET /api/ip/check
 * Used by frontend IP guard to check if current IP is blocked
 */
const checkIPStatus = async (req, res) => {
    try {
        const { extractClientIP } = require('../middleware/ipFirewall');
        const ip = extractClientIP(req);
        
        logger.info(`🔍 IP Check Request from: ${ip}`);
        
        // Query database for IP control record
        const result = await query(
            'SELECT id, ip_address, status, blocked_reason, device_name FROM ip_access_control WHERE ip_address = $1',
            [ip]
        );
        
        if (result.rows.length === 0) {
            // IP not in database - allow by default
            return res.json({
                blocked: false,
                status: 'allowed',
                ip: ip
            });
        }
        
        const ipControl = result.rows[0];
        
        if (ipControl.status === 'blocked') {
            // IP is blocked
            logger.warn(`🚫 IP ${ip} is blocked - Reason: ${ipControl.blocked_reason}`);
            return res.json({
                blocked: true,
                status: 'blocked',
                blockedReason: ipControl.blocked_reason || 'Access denied by administrator',
                ip: ip,
                deviceName: ipControl.device_name
            });
        }
        
        // IP is allowed or pending
        return res.json({
            blocked: false,
            status: ipControl.status,
            ip: ip,
            deviceName: ipControl.device_name
        });
        
    } catch (error) {
        logger.error('Error checking IP status:', error);
        // Fail open on error (allow access)
        return res.json({
            blocked: false,
            status: 'error',
            ip: req.ip || 'unknown',
            error: 'Failed to check IP status'
        });
    }
};

module.exports = {
    getAllIPs,
    getIPStats,
    allowIP,
    blockIP,
    updateDeviceName,
    deleteIP,
    getIPLogs,
    getIPDetails,
    checkIPStatus
};
