/**
 * Real-time Messages API Routes
 * Handles chat/messaging functionality for admin users
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { query } = require('../config/db');
const logger = require('../utils/logger');

// Get conversations list for current user
router.get('/conversations', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const userId = req.user.id;
        
        const conversations = await query(`
            SELECT 
                other_user_id,
                other_user_name,
                other_user_role,
                profile_image,
                is_online,
                online_status,
                last_message_at,
                last_message,
                unread_count
            FROM (
                SELECT DISTINCT
                    CASE 
                        WHEN m.from_user_id = $1 THEN m.to_user_id
                        ELSE m.from_user_id
                    END as other_user_id,
                    u.name as other_user_name,
                    u.role as other_user_role,
                    u.profile_image,
                    u.is_online,
                    u.online_status,
                    m.created_at as last_message_at,
                    m.content as last_message,
                    (SELECT COUNT(*)::int FROM messages m3 
                     WHERE m3.to_user_id = $1 AND m3.from_user_id = CASE WHEN m.from_user_id = $1 THEN m.to_user_id ELSE m.from_user_id END
                       AND m3.is_read = false AND m3.is_deleted = false) as unread_count,
                    ROW_NUMBER() OVER (
                        PARTITION BY CASE WHEN m.from_user_id = $1 THEN m.to_user_id ELSE m.from_user_id END 
                        ORDER BY m.created_at DESC
                    ) as rn
                FROM messages m
                JOIN users u ON u.id = CASE 
                    WHEN m.from_user_id = $1 THEN m.to_user_id
                    ELSE m.from_user_id
                END
                WHERE (m.from_user_id = $1 OR m.to_user_id = $1)
                  AND m.is_deleted = false
                  AND u.is_active = true
            ) ranked_messages
            WHERE rn = 1
            ORDER BY last_message_at DESC
        `, [userId]);

        res.json({
            success: true,
            data: conversations.rows,
            count: conversations.rows.length
        });

    } catch (error) {
        logger.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations'
        });
    }
});

// Get available users for starting new conversations (excluding existing conversation partners)
router.get('/available-users', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get users that don't have existing conversations with current user
        const availableUsers = await query(`
            SELECT 
                u.id,
                u.name,
                u.role,
                u.profile_image,
                u.is_online,
                u.online_status,
                u.created_at
            FROM users u
            WHERE u.id != $1 
              AND u.is_active = true
              AND u.role IN ('admin', 'superadmin', 'developer')
              AND u.id NOT IN (
                  SELECT DISTINCT 
                      CASE 
                          WHEN m.from_user_id = $1 THEN m.to_user_id
                          ELSE m.from_user_id
                      END as conversation_partner_id
                  FROM messages m
                  WHERE (m.from_user_id = $1 OR m.to_user_id = $1)
                    AND m.is_deleted = false
              )
            ORDER BY u.is_online DESC, u.name ASC
        `, [userId]);

        res.json({
            success: true,
            data: availableUsers.rows,
            count: availableUsers.rows.length,
            message: `Found ${availableUsers.rows.length} users available for new conversations`
        });

    } catch (error) {
        logger.error('Error fetching available users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available users'
        });
    }
});

// Get messages for a specific conversation
router.get('/conversation/:userId', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = parseInt(req.params.userId);
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        // Validate other user exists and is active
        const otherUser = await query('SELECT id, name, role FROM users WHERE id = $1 AND is_active = true', [otherUserId]);
        if (otherUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const messages = await query(`
            SELECT 
                m.id,
                m.from_user_id,
                m.to_user_id,
                m.content,
                m.message_type,
                m.is_read,
                m.created_at,
                u.name as from_user_name,
                u.role as from_user_role
            FROM messages m
            JOIN users u ON u.id = m.from_user_id
            WHERE ((m.from_user_id = $1 AND m.to_user_id = $2)
               OR (m.from_user_id = $2 AND m.to_user_id = $1))
              AND m.is_deleted = false
            ORDER BY m.created_at DESC
            LIMIT $3 OFFSET $4
        `, [currentUserId, otherUserId, limit, offset]);

        // Mark messages as read (where current user is recipient)
        await query(`
            UPDATE messages 
            SET is_read = true, read_at = NOW()
            WHERE to_user_id = $1 AND from_user_id = $2 AND is_read = false
        `, [currentUserId, otherUserId]);

        res.json({
            success: true,
            data: {
                messages: messages.rows.reverse(), // Reverse to show oldest first
                otherUser: otherUser.rows[0],
                hasMore: messages.rows.length === limit
            }
        });

    } catch (error) {
        logger.error('Error fetching conversation messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
});

// Send a new message
router.post('/send', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const fromUserId = req.user.id;
        const { to_user_id, content, message_type = 'text' } = req.body;

        // Validate input
        if (!to_user_id || !content?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Recipient and message content are required'
            });
        }

        // Validate recipient exists and is active
        const recipient = await query('SELECT id, name, role FROM users WHERE id = $1 AND is_active = true', [to_user_id]);
        if (recipient.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        // Cannot send message to self
        if (fromUserId === parseInt(to_user_id)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send message to yourself'
            });
        }

        // Insert message
        const result = await query(`
            INSERT INTO messages (from_user_id, to_user_id, content, message_type)
            VALUES ($1, $2, $3, $4)
            RETURNING id, from_user_id, to_user_id, content, message_type, is_read, created_at
        `, [fromUserId, to_user_id, content.trim(), message_type]);

        const message = result.rows[0];

        // Emit real-time message via socket.io if available
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${to_user_id}`).emit('newMessage', {
                ...message,
                from_user_name: req.user.name,
                from_user_role: req.user.role
            });
        }

        // Create notification for recipient
        await query(`
            INSERT INTO notifications (user_id, title, message, type, created_by, action_url)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            to_user_id,
            `New message from ${req.user.name}`,
            content.length > 100 ? content.substring(0, 100) + '...' : content,
            'message',
            fromUserId,
            `/admin/messages/${fromUserId}`
        ]);

        res.status(201).json({
            success: true,
            data: message,
            message: 'Message sent successfully'
        });

    } catch (error) {
        logger.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
});

// Mark messages as read
router.put('/read/:conversationUserId', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const conversationUserId = parseInt(req.params.conversationUserId);

        await query(`
            UPDATE messages 
            SET is_read = true, read_at = NOW()
            WHERE to_user_id = $1 AND from_user_id = $2 AND is_read = false
        `, [currentUserId, conversationUserId]);

        res.json({
            success: true,
            message: 'Messages marked as read'
        });

    } catch (error) {
        logger.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark messages as read'
        });
    }
});

// Get unread message count
router.get('/unread-count', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(`
            SELECT COUNT(*)::int as unread_count
            FROM messages
            WHERE to_user_id = $1 AND is_read = false AND is_deleted = false
        `, [userId]);

        res.json({
            success: true,
            data: {
                unreadCount: result.rows[0].unread_count
            }
        });

    } catch (error) {
        logger.error('Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count'
        });
    }
});

// Delete message (soft delete)
router.delete('/:messageId', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const userId = req.user.id;
        const messageId = parseInt(req.params.messageId);

        // Only allow deletion of own messages
        const result = await query(`
            UPDATE messages 
            SET is_deleted = true, updated_at = NOW()
            WHERE id = $1 AND from_user_id = $2
            RETURNING id
        `, [messageId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found or not authorized'
            });
        }

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message'
        });
    }
});

// Typing indicator endpoints for enhanced chat UX
router.post('/typing', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { to_user_id, is_typing } = req.body;

        if (!to_user_id) {
            return res.status(400).json({
                success: false,
                message: 'to_user_id is required'
            });
        }

        // For now, we'll just acknowledge the typing status
        // In a production environment, this would likely use WebSockets or Redis
        logger.info(`User ${userId} typing status to ${to_user_id}: ${is_typing}`);

        res.json({
            success: true,
            message: 'Typing status updated'
        });

    } catch (error) {
        logger.error('Error updating typing status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update typing status'
        });
    }
});

// Get typing users for a conversation
router.get('/typing/:userId', protect, restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { userId } = req.params;

        // For now, return empty array as typing indicators require real-time infrastructure
        // In production, this would query a Redis cache or similar real-time store
        res.json({
            success: true,
            data: {
                typing_users: []
            }
        });

    } catch (error) {
        logger.error('Error fetching typing users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch typing users'
        });
    }
});

module.exports = router;
