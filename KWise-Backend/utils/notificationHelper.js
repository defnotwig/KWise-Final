/**
 * Notification Helper
 * Creates notifications for admin activities and system events
 */

const { query } = require('../config/db');
const logger = require('./logger');

// Notification types
const NOTIFICATION_TYPES = {
    ORDER: 'order',
    STOCK: 'stock',
    USER: 'user',
    SYSTEM: 'system',
    ACTIVITY: 'activity',
    WARNING: 'warning',
    SUCCESS: 'success'
};

/**
 * Create notification for admin users
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message  
 * @param {string} options.type - Notification type
 * @param {string} options.actionUrl - Optional URL for action
 * @param {number} options.createdBy - User ID who triggered the notification
 * @param {Array} options.userRoles - Roles to send notification to (default: ['admin', 'superadmin'])
 */
async function createAdminNotification({
    title,
    message,
    type = NOTIFICATION_TYPES.ACTIVITY,
    actionUrl = null,
    createdBy = null,
    userRoles = ['admin', 'superadmin', 'developer']
}) {
    try {
        // Get admin users to notify
        const adminUsers = await query(`
            SELECT id FROM users 
            WHERE role = ANY($1) AND is_active = true
        `, [userRoles]);

        if (adminUsers.rows.length === 0) {
            logger.warn('No admin users found to notify');
            return;
        }

        // Create notifications for each admin user
        const insertPromises = adminUsers.rows.map(user => 
            query(`
                INSERT INTO notifications (user_id, title, message, type, action_url, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [user.id, title, message, type, actionUrl, createdBy])
        );

        await Promise.all(insertPromises);
        
        logger.info(`Created notification for ${adminUsers.rows.length} admin users`, {
            title,
            type,
            adminCount: adminUsers.rows.length
        });

    } catch (error) {
        logger.error('Error creating admin notification:', error);
    }
}

/**
 * Create order-related notifications
 */
async function notifyOrderActivity(orderId, action, userId, customerName, amount) {
    let title, message, actionUrl;
    
    switch (action) {
        case 'created':
            title = '🛒 New Order Received';
            message = `New order #${orderId} from ${customerName} - $${amount}`;
            actionUrl = `/orders/history`;
            break;
        case 'updated':
            title = '📝 Order Updated';
            message = `Order #${orderId} has been updated`;
            actionUrl = `/orders/history`;
            break;
        case 'completed':
            title = '✅ Order Completed';
            message = `Order #${orderId} has been completed - $${amount}`;
            actionUrl = `/orders/history`;
            break;
        case 'cancelled':
            title = '❌ Order Cancelled';
            message = `Order #${orderId} has been cancelled`;
            actionUrl = `/orders/history`;
            break;
        default:
            return;
    }

    await createAdminNotification({
        title,
        message,
        type: NOTIFICATION_TYPES.ORDER,
        actionUrl,
        createdBy: userId
    });
}

/**
 * Create stock-related notifications
 */
async function notifyStockActivity(productName, action, userId, details = '') {
    let title, message, actionUrl;
    
    switch (action) {
        case 'low_stock':
            title = '⚠️ Low Stock Alert';
            message = `${productName} is running low on stock ${details}`;
            actionUrl = `/stock`;
            break;
        case 'out_of_stock':
            title = '🚨 Out of Stock';
            message = `${productName} is out of stock`;
            actionUrl = `/stock`;
            break;
        case 'restocked':
            title = '📦 Stock Replenished';
            message = `${productName} has been restocked ${details}`;
            actionUrl = `/stock`;
            break;
        case 'updated':
            title = '📝 Stock Updated';
            message = `${productName} stock information updated`;
            actionUrl = `/stock`;
            break;
        default:
            return;
    }

    await createAdminNotification({
        title,
        message,
        type: NOTIFICATION_TYPES.STOCK,
        actionUrl,
        createdBy: userId
    });
}

/**
 * Create user activity notifications
 */
async function notifyUserActivity(userName, action, userId, details = '') {
    let title, message, actionUrl;
    
    switch (action) {
        case 'login':
            title = '👤 User Login';
            message = `${userName} has logged in ${details}`;
            actionUrl = `/accounts`;
            break;
        case 'logout':
            title = '👋 User Logout';
            message = `${userName} has logged out`;
            actionUrl = `/accounts`;
            break;
        case 'profile_updated':
            title = '✏️ Profile Updated';
            message = `${userName} updated their profile`;
            actionUrl = `/accounts`;
            break;
        case 'status_changed':
            title = '🔄 Status Changed';
            message = `${userName} is now ${details}`;
            actionUrl = `/accounts`;
            break;
        case 'created':
            title = '👤 New User Account';
            message = `New user account created: ${userName}`;
            actionUrl = `/accounts`;
            break;
        default:
            return;
    }

    await createAdminNotification({
        title,
        message,
        type: NOTIFICATION_TYPES.USER,
        actionUrl,
        createdBy: userId
    });
}

/**
 * Create system notifications
 */
async function notifySystemActivity(action, details, userId = null) {
    let title, message, type;
    
    switch (action) {
        case 'appearance_changed':
            title = '🎨 Appearance Updated';
            message = `System appearance changed to ${details}`;
            type = NOTIFICATION_TYPES.SYSTEM;
            break;
        case 'settings_updated':
            title = '⚙️ Settings Updated';
            message = `System settings have been updated: ${details}`;
            type = NOTIFICATION_TYPES.SYSTEM;
            break;
        case 'backup_completed':
            title = '💾 Backup Completed';
            message = `System backup completed successfully`;
            type = NOTIFICATION_TYPES.SUCCESS;
            break;
        case 'error_occurred':
            title = '⚠️ System Error';
            message = `System error: ${details}`;
            type = NOTIFICATION_TYPES.WARNING;
            break;
        default:
            return;
    }

    await createAdminNotification({
        title,
        message,
        type,
        actionUrl: '/settings',
        createdBy: userId
    });
}

module.exports = {
    createAdminNotification,
    notifyOrderActivity,
    notifyStockActivity,
    notifyUserActivity,
    notifySystemActivity,
    NOTIFICATION_TYPES
};
