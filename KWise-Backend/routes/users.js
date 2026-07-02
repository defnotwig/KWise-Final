const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { query } = require('../config/db');
const { insertAuditLog } = require('../utils/auditLogHelper');
const { notifyUserActivity } = require('../utils/notificationHelper');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs').promises;
const {
    isAllowedImageMetadata,
    randomImageFilename,
    validateUploadedImageMagic
} = require('../middleware/secureImageUpload');

const sanitizeUser = (user = {}) => {
    const {
        password: _password,
        password_hash: _passwordHash,
        password_reset_token: _passwordResetToken,
        password_reset_expires: _passwordResetExpires,
        reset_token: _resetToken,
        reset_token_expires: _resetTokenExpires,
        reset_attempts: _resetAttempts,
        reset_status: _resetStatus,
        email_verification_token: _emailVerificationToken,
        two_factor_secret: _twoFactorSecret,
        two_factor_recovery_codes: _twoFactorRecoveryCodes,
        refresh_token: _refreshToken,
        session_token: _sessionToken,
        api_key: _apiKey,
        api_key_hash: _apiKeyHash,
        ...safeUser
    } = user;

    return safeUser;
};

// Configure multer for profile image uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        // Save all profile images to uploads directory for consistent access
        const uploadDir = path.join(__dirname, '../uploads');
        
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const userId = req.params.id || req.user?.id;
        cb(null, `profile_${userId}_${randomImageFilename(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (isAllowedImageMetadata(file)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, GIF, and WEBP image files are allowed'), false);
        }
    }
});

// Apply authentication to all user routes
router.use(protect);

// =====================================================
// USER ACCOUNTS ENDPOINTS
// =====================================================

// Roles metadata endpoint (used by frontend UserManagement)
router.get('/roles/available', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const roles = [
            { value: 'superadmin', label: 'Super Admin', description: 'Full system access', level: 3 },
            { value: 'admin', label: 'Admin', description: 'Management access', level: 2 },
            { value: 'developer', label: 'Developer', description: 'Developer / read & limited write', level: 1 }
        ];
        return res.json({
            success: true,
            data: roles,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        logger.error('Error serving roles metadata:', e);
        return res.status(500).json({ success: false, message: 'Failed to load roles metadata' });
    }
});

// Get all users with filtering and pagination
router.get('/', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const {
            role,
            search,
            page = 1,
            limit = 20,
            status
        } = req.query;

        const offset = (page - 1) * limit;
        const limitNum = Math.min(Number.parseInt(limit, 10), 100);

        // Enhanced query with proper status tracking
        let baseQuery = `
            SELECT 
                u.id,
                u.name,
                u.email,
                u.username,
                u.role,
                u.display_name,
                u.profile_image,
                u.profile_picture,
                u.birth_date,
                u.is_active,
                u.created_at,
                u.updated_at,
                u.last_login,
                u.is_online,
                u.online_status,
                u.last_activity,
                u.last_active_at,
                COUNT(DISTINCT l.id) as login_count,
                MAX(CASE WHEN l.action = 'login' THEN l.created_at END) as last_login_from_logs,
                COUNT(DISTINCT a.id) as action_count,
                MAX(a.created_at) as last_activity,
                CASE 
                    WHEN MAX(a.created_at) >= NOW() - INTERVAL '15 minutes' THEN 'online'
                    WHEN MAX(a.created_at) >= NOW() - INTERVAL '1 hour' THEN 'away'
                    ELSE 'offline'
                END as current_status,
                EXTRACT(EPOCH FROM (NOW() - COALESCE(MAX(a.created_at), u.created_at))) as seconds_since_activity
            FROM users u
            LEFT JOIN audit_logs l ON u.id = l.user_id
            LEFT JOIN audit_logs a ON u.id = a.user_id
            WHERE u.is_active = true
        `;
        const queryParams = [];
        let paramCount = 1;

        // Add filters
        if (role) {
            baseQuery += ` AND u.role = $${paramCount}`;
            queryParams.push(role);
            paramCount++;
        }

        if (status === 'active') {
            baseQuery += ` AND u.is_active = true`;
        } else if (status === 'inactive') {
            baseQuery += ` AND u.is_active = false`;
        }

        if (search) {
            baseQuery += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
            paramCount++;
        }

        // Group by user ID to avoid duplicates
        baseQuery += ` GROUP BY u.id`;

        // Get total count
        const countQuery = `SELECT COUNT(*) as count FROM (${baseQuery}) counted_users`;
        const countResult = await query(countQuery, queryParams);
        const total = Number.parseInt(countResult.rows[0].count, 10);

        // Add sorting and pagination
        baseQuery += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        queryParams.push(limitNum, offset);

        // Execute main query
        const result = await query(baseQuery, queryParams);

        // Process and format user data
        const formattedUsers = result.rows.map(user => ({
            ...sanitizeUser(user),
            status: user.current_status,
            last_login: user.last_login_from_logs || user.last_login || 'Never',
            is_online: user.current_status === 'online',
            last_activity: user.last_activity,
            activity_status: user.current_status
        }));

        // Calculate pagination
        const pages = Math.ceil(total / limitNum);

        res.json({
            success: true,
            data: formattedUsers,
            pagination: {
                page: Number.parseInt(page, 10),
                limit: limitNum,
                total,
                pages
            }
        });

    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

// Unified user statistics overview (consolidated real-time stats)
router.get('/stats/overview', restrictTo('admin', 'superadmin', 'developer'), require('../middleware/adminActivityTracker').trackAdminActivity, async (req, res) => {
    try {
        const { getUserStats } = require('../utils/statsHelper');
        const base = await getUserStats();
        // Map helper structure to legacy shape expected by frontend
        const data = {
            totalUsers: base.totals.all,
            onlineUsers: base.totals.active, // approximation; refine with presence logic later
            activeUsers: base.totals.active,
            recentLogins: base.recent.length,
            recent24h: base.recent.length,
            superadminCount: base.roles.superadmin,
            adminCount: base.roles.admin,
            developerCount: base.roles.developer,
            usersByRole: Object.keys(base.roles).map(role => ({ role, count: base.roles[role] })),
            roleDistribution: base.roles,
            timestamp: base.timestamp
        };
        try {
            const sseClients = req.app.get('sseClients');
            if (sseClients?.users?.size) {
                const payload = JSON.stringify(data);
                sseClients.users.forEach(c => c.res.write(`event: users-stats\ndata: ${payload}\n\n`));
            }
        } catch (e) { logger.warn('Failed SSE broadcast in /users/stats/overview:', e.message); }
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Error fetching unified user stats overview:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user stats overview' });
    }
});

// Get user by ID
router.get('/:id', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.username,
                u.role,
                u.display_name,
                u.profile_image,
                u.profile_picture,
                u.birth_date,
                u.is_active,
                u.created_at,
                u.updated_at,
                u.last_login,
                u.is_online,
                u.online_status,
                u.last_activity,
                u.last_active_at,
                COUNT(l.id) as login_count,
                MAX(l.created_at) as last_login,
                COUNT(a.id) as action_count
            FROM users u
            LEFT JOIN audit_logs l ON u.id = l.user_id AND l.action = 'login'
            LEFT JOIN audit_logs a ON u.id = a.user_id
            WHERE u.id = $1
            GROUP BY u.id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get recent actions for this user
        const actionsResult = await query(`
            SELECT action, entity, description, created_at, ip_address
            FROM audit_logs 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [id]);

        const user = sanitizeUser(result.rows[0]);
        user.recent_actions = actionsResult.rows;

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        logger.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user'
        });
    }
});

// Create new user (now uses centralized password policy)
router.post('/', restrictTo('admin', 'superadmin'), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const { validatePassword } = require('../utils/passwordPolicy');

        const roleWhitelist = ['superadmin','admin','developer'];
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
        }
        if (!roleWhitelist.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role specified' });
        }
        if (role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Only superadmins can create superadmin accounts' });
        }
        if (name.length < 2 || name.length > 120) {
            return res.status(400).json({ success: false, message: 'Name must be between 2 and 120 characters' });
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        // Centralized password policy validation
        const pw = validatePassword(password);
        if (!pw.valid) {
            return res.status(400).json({ success: false, message: pw.message });
        }

        // Prevent duplicates
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        const saltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generate username from email (before @ symbol)
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

        const result = await query(`
            INSERT INTO users (name, email, username, password, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, email, username, role, is_active, created_at
        `, [name, email, username, hashedPassword, role, true]);

        const newUser = result.rows[0];

        await insertAuditLog(req.app, { userId: req.user.id, action: 'CREATE', entity: 'USER', entityId: newUser.id, description: `Created user: ${newUser.name}`, severity: 'info', ipAddress: req.ip });

        res.status(201).json({ success: true, data: newUser, message: 'User created successfully' });
    } catch (error) {
        logger.error('Error creating user:', error);
        res.status(500).json({ success: false, message: 'Failed to create user' });
    }
});

// Update user
router.put('/:id', restrictTo('admin', 'superadmin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, is_active } = req.body;

        // Check if user exists
        const existingUser = await query('SELECT id, role FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = existingUser.rows[0];
        if (targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Only superadmins can edit superadmin accounts' });
        }
        if (role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Only superadmins can assign the superadmin role' });
        }
        if (Number(id) === Number(req.user.id) && role && role !== req.user.role) {
            return res.status(400).json({ success: false, message: 'Use another superadmin account to change your own role' });
        }

        // Disallow password changes here (dedicated password reset flow required)
        if (req.body.password) {
            return res.status(400).json({ success: false, message: 'Password updates are not allowed via this endpoint' });
        }

        // Build update query (whitelist fields only)
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (name) {
            fields.push(`name = $${paramCount}`);
            values.push(name);
            paramCount++;
        }

        if (email) {
            fields.push(`email = $${paramCount}`);
            values.push(email);
            paramCount++;
        }

        if (role) {
            fields.push(`role = $${paramCount}`);
            values.push(role);
            paramCount++;
        }

        if (typeof is_active === 'boolean') {
            fields.push(`is_active = $${paramCount}`);
            values.push(is_active);
            paramCount++;
        }

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        values.push(id); // Add id for WHERE clause

        const result = await query(`
            UPDATE users 
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount}
            RETURNING id, name, email, role, is_active, created_at, updated_at
        `, values);

        const updatedUser = result.rows[0];

        // Log the action
    await insertAuditLog(req.app, { userId: req.user.id, action: 'UPDATE', entity: 'USER', entityId: id, description: `Updated user: ${updatedUser.name}`, severity: 'info', ipAddress: req.ip });

        res.json({
            success: true,
            data: updatedUser,
            message: 'User updated successfully'
        });

    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});

// Delete user (soft delete)
router.delete('/:id', restrictTo('superadmin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const existingUser = await query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

    // Soft delete by setting is_active to false
        const result = await query(`
            UPDATE users 
            SET is_active = false, updated_at = NOW()
            WHERE id = $1
            RETURNING id, name, email, role
        `, [id]);

        const deletedUser = result.rows[0];

        // Log the action
    await insertAuditLog(req.app, { userId: req.user.id, action: 'DELETE', entity: 'USER', entityId: id, description: `Deleted user: ${deletedUser.name}`, severity: 'warn', ipAddress: req.ip });

        res.json({
            success: true,
            data: deletedUser,
            message: 'User deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

// Get user statistics (LEGACY - prefer /users/stats/overview)
// Removed legacy /stats/summary (use /stats/overview)

// Get user activity
router.get('/:id/activity', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const offset = (page - 1) * limit;
        const limitNum = Math.min(Number.parseInt(limit, 10), 100);

        // Get user activity logs
        const result = await query(`
            SELECT action, entity, entity_id, description, severity, ip_address, created_at
            FROM audit_logs 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
        `, [id, limitNum, offset]);

        // Get total count
        const countResult = await query('SELECT COUNT(*) as count FROM audit_logs WHERE user_id = $1', [id]);
        const total = Number.parseInt(countResult.rows[0].count, 10);

        // Calculate pagination
        const pages = Math.ceil(total / limitNum);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: Number.parseInt(page, 10),
                limit: limitNum,
                total,
                pages
            }
        });

    } catch (error) {
        logger.error('Error fetching user activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user activity'
        });
    }
});

// =====================================================
// REALTIME USER STATUS MANAGEMENT
// =====================================================

// Update user login status (called on login/logout)
router.post('/update-status', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { status = 'online' } = req.body;
        const userId = req.user.id;

        // Update user status and last activity
        await query(`
            UPDATE users SET 
                status = $1,
                is_online = $2,
                last_login = NOW(),
                last_activity = NOW()
            WHERE id = $3
        `, [status, status === 'online', userId]);

        // Log the status update via helper
        await insertAuditLog(req.app, {
            userId,
            action: 'STATUS_UPDATE',
            entity: 'user',
            details: JSON.stringify({ status, timestamp: new Date().toISOString() }),
            description: `User status updated to ${status}`,
            severity: 'INFO',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: { status }
        });

    } catch (error) {
        logger.error('Error updating user status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});

// Get real-time user stats
router.get('/realtime/stats', restrictTo('admin', 'superadmin'), async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN is_online = true THEN 1 END) as online_users,
                COUNT(CASE WHEN last_login >= NOW() - INTERVAL '24 hours' THEN 1 END) as active_today,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
                COUNT(CASE WHEN role = 'superadmin' THEN 1 END) as superadmin_count,
                COUNT(CASE WHEN role = 'developer' THEN 1 END) as developer_count
            FROM users 
            WHERE is_active = true
        `);

        res.json({
            success: true,
            data: stats.rows[0]
        });

    } catch (error) {
        logger.error('Error fetching realtime user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch realtime stats'
        });
    }
});

// Get online users
// (Removed earlier duplicate /online route; unified definition retained below with broader access)

// Update user profile (name, display name, profile image, birth date)
router.put('/:id/profile', upload.single('profileImage'), validateUploadedImageMagic, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, displayName, birthDate } = req.body;

        // Check if user can edit this profile (self or admin)
        if (req.user.id !== Number.parseInt(id, 10) && !['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own profile'
            });
        }

        // Validate input
        if (!name || !displayName) {
            return res.status(400).json({
                success: false,
                message: 'Name and display name are required'
            });
        }

        let updateQuery = 'UPDATE users SET name = $1, display_name = $2, updated_at = NOW()';
        let queryParams = [name, displayName];
        let paramIndex = 3;

        // Only superadmin can update birth date
        if (req.user.role === 'superadmin' && birthDate) {
            // Handle birth date to account for timezone issues
            // Create a date object at noon in the input date to avoid timezone conversion issues
            const birthDateLocal = new Date(birthDate + 'T12:00:00');
            updateQuery += `, birth_date = $${paramIndex}`;
            queryParams.push(birthDateLocal);
            paramIndex++;
        }

        // Handle profile image upload
        let profileImagePath = null;
        if (req.file) {
            profileImagePath = req.file.filename;
            updateQuery += `, profile_image = $${paramIndex}`;
            queryParams.push(profileImagePath);
            paramIndex++;
        }

        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        queryParams.push(id);

        const result = await query(updateQuery, queryParams);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Log the profile update
        await insertAuditLog(req.app, {
            userId: req.user.id,
            action: 'UPDATE',
            tableName: 'users',
            recordId: id,
            description: 'Profile updated',
            severity: 'INFO',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Create notification for profile update
        const updatedUser = result.rows[0];
        await notifyUserActivity(
            updatedUser.name, 
            'profile_updated', 
            req.user.id,
            `Updated profile: ${updatedUser.name} (${updatedUser.display_name || updatedUser.name})`
        );

        // If birth date was updated and it's a superadmin, create birthday notification
        if (req.user.role === 'superadmin' && birthDate) {
            const birthDateObj = new Date(birthDate);
            const today = new Date();
            const thisYearBirthday = new Date(today.getFullYear(), birthDateObj.getMonth(), birthDateObj.getDate());
            
            // If birthday is coming up within 30 days, create notification
            const daysDiff = Math.ceil((thisYearBirthday - today) / (1000 * 60 * 60 * 24));
            if (daysDiff >= 0 && daysDiff <= 30) {
                await notifyUserActivity(
                    'System',
                    'birthday_reminder',
                    null,
                    `Upcoming birthday: ${updatedUser.name} on ${thisYearBirthday.toLocaleDateString()}`
                );
            }
        }

        delete updatedUser.password; // Remove password from response

        res.json({
            success: true,
            data: {
                ...updatedUser,
                profileImage: profileImagePath
            },
            message: 'Profile updated successfully'
        });

    } catch (error) {
        logger.error('Error updating user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Update user last login and status
router.patch('/:id/activity', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, action } = req.body;

        // Update user last login and status
        const updateQuery = status ? 
            'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *' :
            'UPDATE users SET updated_at = NOW() WHERE id = $1 RETURNING *';

        const result = await query(updateQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Log the activity
        if (req.user && action) {
            await insertAuditLog(req.app, {
                userId: req.user.id,
                action,
                tableName: 'users',
                recordId: id,
                description: `User activity: ${action}`,
                severity: 'INFO',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'User activity updated successfully'
        });

    } catch (error) {
        logger.error('Error updating user activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user activity'
        });
    }
});

// Get online users (users active in last 15 minutes)
router.get('/online', restrictTo('admin', 'superadmin', 'developer'), async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                u.last_login,
                MAX(al.created_at) as last_activity
            FROM users u
            LEFT JOIN audit_logs al ON u.id = al.user_id
            WHERE u.is_active = true
            AND (
                u.last_login >= NOW() - INTERVAL '15 minutes'
                OR al.created_at >= NOW() - INTERVAL '15 minutes'
            )
            GROUP BY u.id, u.name, u.email, u.role, u.last_login
            ORDER BY GREATEST(u.last_login, MAX(al.created_at)) DESC
        `);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        logger.error('Error fetching online users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch online users'
        });
    }
});

// Get management statistics for enhanced admin dashboard
// Removed duplicate management stats endpoint (use /stats/overview)

module.exports = router;
// NOTE: Consider consolidating multiple stats endpoints earlier: /stats/summary and another later; a unified /stats/overview is recommended.
