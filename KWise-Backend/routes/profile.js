const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const { query } = require('../config/db');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');
const {
    isAllowedImageMetadata,
    randomImageFilename,
    validateUploadedImageMagic
} = require('../middleware/secureImageUpload');

// Apply authentication to all profile routes
router.use(protect);

// Configure multer for profile image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads');
        
        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const userId = req.user.id;
        cb(null, `profile_${userId}_${randomImageFilename(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (isAllowedImageMetadata(file)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, GIF, and WEBP image files are allowed'));
        }
    }
});

/**
 * Get current user profile
 * @route GET /api/profile
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await query(`
            SELECT id, name, email, role, profile_picture, profile_image, 
                   created_at, last_login, presence_status, phone, timezone, language
            FROM users 
            WHERE id = $1 AND is_active = true
        `, [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }
        
        const profile = result.rows[0];
        
        // Remove sensitive fields
        delete profile.password;
        
        res.json({
            success: true,
            data: profile,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

/**
 * Update user profile
 * @route PUT /api/profile
 */
router.put('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, timezone, language } = req.body;
        
        // Validate required fields
        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Name must be at least 2 characters long'
            });
        }
        
        // Update user profile
        const result = await query(`
            UPDATE users 
            SET name = $1, phone = $2, timezone = $3, language = $4, updated_at = NOW()
            WHERE id = $5 AND is_active = true
            RETURNING id, name, email, role, profile_picture, profile_image, phone, timezone, language
        `, [name.trim(), phone, timezone, language, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found or update failed'
            });
        }
        
        const updatedProfile = result.rows[0];
        
        // Log profile update
        try {
            const { insertAuditLog } = require('../utils/auditLogHelper');
            await insertAuditLog(req.app, {
                userId: userId,
                action: 'PROFILE_UPDATE',
                entity: 'users',
                entityId: userId,
                description: `User ${name} updated their profile`,
                severity: 'INFO',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                userName: name,
                userRole: req.user.role
            });
        } catch (auditError) {
            logger.error('Failed to log profile update:', auditError);
        }
        
        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('profile_updated', {
                userId: userId,
                name: name,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: updatedProfile,
            message: 'Profile updated successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error updating user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

/**
 * Upload profile picture
 * @route POST /api/profile/picture
 */
router.post('/picture', upload.single('profilePicture'), validateUploadedImageMagic, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }
        
        const userId = req.user.id;
        const imagePath = `/uploads/${req.file.filename}`; // Updated to use uploads path
        
        // Update user's profile picture in database
        const result = await query(`
            UPDATE users 
            SET profile_image = $1, updated_at = NOW()
            WHERE id = $2 AND is_active = true
            RETURNING id, name, profile_image
        `, [req.file.filename, userId]); // Store just filename, not full path
        
        if (result.rows.length === 0) {
            // Delete uploaded file if DB update failed
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'User not found or update failed'
            });
        }
        
        const updatedUser = result.rows[0];
        
        // Log profile picture update
        try {
            const { insertAuditLog } = require('../utils/auditLogHelper');
            await insertAuditLog(req.app, {
                userId: userId,
                action: 'PROFILE_PICTURE_UPDATE',
                entity: 'users',
                entityId: userId,
                description: `User ${updatedUser.name} updated their profile picture`,
                severity: 'INFO',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                userName: updatedUser.name,
                userRole: req.user.role
            });
        } catch (auditError) {
            logger.error('Failed to log profile picture update:', auditError);
        }
        
        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('profile_picture_updated', {
                userId: userId,
                profilePicture: imagePath,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: {
                id: updatedUser.id,
                name: updatedUser.name,
                profile_image: updatedUser.profile_image,
                imageUrl: imagePath
            },
            message: 'Profile picture updated successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error uploading profile picture:', error);
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture'
        });
    }
});

/**
 * Delete profile picture
 * @route DELETE /api/profile/picture
 */
router.delete('/picture', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get current profile picture path
        const currentResult = await query(`
            SELECT profile_picture FROM users WHERE id = $1 AND is_active = true
        `, [userId]);
        
        if (currentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const currentPicture = currentResult.rows[0].profile_picture;
        
        // Update database to remove profile picture
        const result = await query(`
            UPDATE users 
            SET profile_picture = NULL, updated_at = NOW()
            WHERE id = $1 AND is_active = true
            RETURNING id, name
        `, [userId]);
        
        // Delete physical file if it exists
        if (currentPicture && currentPicture.startsWith('/assets/users/')) {
            const filePath = path.join(__dirname, '../public', currentPicture);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        const updatedUser = result.rows[0];
        
        // Log profile picture deletion
        try {
            const { insertAuditLog } = require('../utils/auditLogHelper');
            await insertAuditLog(req.app, {
                userId: userId,
                action: 'PROFILE_PICTURE_DELETE',
                entity: 'users',
                entityId: userId,
                description: `User ${updatedUser.name} deleted their profile picture`,
                severity: 'INFO',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                userName: updatedUser.name,
                userRole: req.user.role
            });
        } catch (auditError) {
            logger.error('Failed to log profile picture deletion:', auditError);
        }
        
        res.json({
            success: true,
            message: 'Profile picture deleted successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error deleting profile picture:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete profile picture'
        });
    }
});

module.exports = router;
