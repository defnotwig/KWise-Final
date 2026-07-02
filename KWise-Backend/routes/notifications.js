/**
 * Enhanced Notifications API Routes
 * Real-time notifications system for admin users
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { query } = require('../config/db');
const logger = require('../utils/logger');

// Get notifications for current user
router.get('/', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = Number.parseInt(req.query.limit, 10) || 20;
        const offset = Number.parseInt(req.query.offset, 10) || 0;
        const unreadOnly = req.query.unread === 'true';

        let whereClause = 'WHERE n.user_id = $1';
        let params = [userId, limit, offset];
        
        if (unreadOnly) {
            whereClause += ' AND n.is_read = false';
        }

        const notifications = await query(`
            SELECT 
                n.id,
                n.title,
                n.message,
                n.type,
                n.is_read,
                n.action_url,
                n.created_at,
                n.read_at,
                u.name as created_by_name,
                u.role as created_by_role
            FROM notifications n
            LEFT JOIN users u ON u.id = n.created_by
            ${whereClause}
            ORDER BY n.created_at DESC
            LIMIT $2 OFFSET $3
        `, params);

        // Get unread count
        const unreadResult = await query(`
            SELECT COUNT(*)::int as unread_count
            FROM notifications
            WHERE user_id = $1 AND is_read = false
        `, [userId]);

        res.json({
            success: true,
            data: {
                notifications: notifications.rows,
                unreadCount: unreadResult.rows[0].unread_count,
                hasMore: notifications.rows.length === limit
            }
        });

    } catch (error) {
        logger.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
});

// Mark notification as read
router.put('/:notificationId/read', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = Number.parseInt(req.params.notificationId, 10);

        const result = await query(`
            UPDATE notifications 
            SET is_read = true, read_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [notificationId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        logger.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

// Mark all notifications as read
router.put('/read-all', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const userId = req.user.id;

        await query(`
            UPDATE notifications 
            SET is_read = true, read_at = NOW()
            WHERE user_id = $1 AND is_read = false
        `, [userId]);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// Create notification (for system/admin use)
router.post('/', protect, restrictTo('superadmin', 'developer'), async (req, res) => {
    try {
        const { user_id, title, message, type = 'info', action_url } = req.body;
        const createdBy = req.user.id;

        // Validate input
        if (!user_id || !title || !message) {
            return res.status(400).json({
                success: false,
                message: 'User ID, title, and message are required'
            });
        }

        // Validate user exists
        const user = await query('SELECT id FROM users WHERE id = $1 AND is_active = true', [user_id]);
        if (user.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const result = await query(`
            INSERT INTO notifications (user_id, title, message, type, action_url, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, user_id, title, message, type, is_read, action_url, created_at
        `, [user_id, title, message, type, action_url, createdBy]);

        const notification = result.rows[0];

        // Emit real-time notification via socket.io if available
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${user_id}`).emit('newNotification', notification);
        }

        res.status(201).json({
            success: true,
            data: notification,
            message: 'Notification created successfully'
        });

    } catch (error) {
        logger.error('Error creating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification'
        });
    }
});

// Delete notification
router.delete('/:notificationId', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = Number.parseInt(req.params.notificationId, 10);

        const result = await query(`
            DELETE FROM notifications 
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [notificationId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
});

// Get notification statistics
router.get('/stats', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await query(`
            SELECT 
                COUNT(*)::int as total,
                COUNT(CASE WHEN is_read = false THEN 1 END)::int as unread,
                COUNT(CASE WHEN type = 'message' THEN 1 END)::int as messages,
                COUNT(CASE WHEN type = 'system' THEN 1 END)::int as system,
                COUNT(CASE WHEN type = 'alert' THEN 1 END)::int as alerts,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END)::int as today
            FROM notifications
            WHERE user_id = $1
        `, [userId]);

        res.json({
            success: true,
            data: stats.rows[0]
        });

    } catch (error) {
        logger.error('Error fetching notification stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification stats'
        });
    }
});

module.exports = router;
