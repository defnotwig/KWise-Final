/**
 * Build History API Routes
 * Handles saving, loading, and sharing PC builds
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');
const crypto = require('node:crypto');
const { protect, restrictTo } = require('../middleware/auth');

/**
 * Generate a unique session ID for anonymous users
 */
function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

const isAdminUser = (user = {}) => ['admin', 'superadmin', 'developer'].includes(user.role);
const canAccessBuild = (build, user) => build.is_public || (user && (isAdminUser(user) || String(build.user_id) === String(user.id)));
const clampLimit = (value, fallback = 20, max = 100) => {
    const parsed = Number.parseInt(value, 10);
    return Math.min(Math.max(Number.isFinite(parsed) ? parsed : fallback, 1), max);
};

/**
 * @route   POST /api/builds
 * @desc    Save a new PC build
 * @access  Public
 */
router.post('/', async (req, res) => {
    try {
        const {
            user_id,
            session_id,
            build_name,
            build_data,
            compatibility_score,
            total_price,
            total_wattage,
            bottleneck_percentage,
            is_public = false,
            tags = []
        } = req.body;

        // Validation
        if (!build_name || !build_data) {
            return res.status(400).json({
                success: false,
                error: 'build_name and build_data are required'
            });
        }

        if (user_id && (!req.user || (!isAdminUser(req.user) && String(user_id) !== String(req.user.id)))) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to save a build for this user'
            });
        }

        const finalUserId = user_id ? (isAdminUser(req.user) ? user_id : req.user.id) : null;
        const finalSessionId = session_id || (!finalUserId ? generateSessionId() : null);

        const result = await pool.query(`
            INSERT INTO build_history (
                user_id, session_id, build_name, build_data,
                compatibility_score, total_price, total_wattage,
                bottleneck_percentage, is_public, tags
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            finalUserId, finalSessionId, build_name, build_data,
            compatibility_score, total_price, total_wattage,
            bottleneck_percentage, is_public, tags
        ]);

        logger.info(`Build saved: ${build_name} (ID: ${result.rows[0].id})`);

        res.json({
            success: true,
            message: 'Build saved successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error saving build:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save build'
        });
    }
});

/**
 * @route   GET /api/builds/:id
 * @desc    Load a specific build by ID
 * @access  Public for shared builds; owner/admin for private builds
 */
router.get('/:id(\\d+|[0-9a-fA-F-]{36})', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT * FROM build_history
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Build not found'
            });
        }

        const build = result.rows[0];

        // Increment view count
        await pool.query(`
            UPDATE build_history
            SET views_count = views_count + 1,
                last_accessed_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);

        if (!canAccessBuild(build, req.user)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to access this build'
            });
        }

        res.json({
            success: true,
            data: build
        });

    } catch (error) {
        logger.error('Error loading build:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load build'
        });
    }
});

/**
 * @route   PUT /api/builds/:id
 * @desc    Update a build
 * @access  Owner/Admin
 */
router.put('/:id(\\d+|[0-9a-fA-F-]{36})', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            build_name,
            build_data,
            compatibility_score,
            total_price,
            total_wattage,
            bottleneck_percentage,
            is_public,
            tags
        } = req.body;

        // Check if build exists
        const existingBuild = await pool.query(
            'SELECT * FROM build_history WHERE id = $1',
            [id]
        );

        if (existingBuild.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Build not found'
            });
        }

        if (!canAccessBuild(existingBuild.rows[0], req.user)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to update this build'
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (build_name) {
            updates.push(`build_name = $${paramCount++}`);
            values.push(build_name);
        }
        if (build_data) {
            updates.push(`build_data = $${paramCount++}`);
            values.push(build_data);
        }
        if (compatibility_score !== undefined) {
            updates.push(`compatibility_score = $${paramCount++}`);
            values.push(compatibility_score);
        }
        if (total_price !== undefined) {
            updates.push(`total_price = $${paramCount++}`);
            values.push(total_price);
        }
        if (total_wattage !== undefined) {
            updates.push(`total_wattage = $${paramCount++}`);
            values.push(total_wattage);
        }
        if (bottleneck_percentage !== undefined) {
            updates.push(`bottleneck_percentage = $${paramCount++}`);
            values.push(bottleneck_percentage);
        }
        if (is_public !== undefined) {
            updates.push(`is_public = $${paramCount++}`);
            values.push(is_public);
            if (is_public && !existingBuild.rows[0].shared_at) {
                updates.push(`shared_at = CURRENT_TIMESTAMP`);
            }
        }
        if (tags) {
            updates.push(`tags = $${paramCount++}`);
            values.push(tags);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No updates provided'
            });
        }

        values.push(id);

        const result = await pool.query(`
            UPDATE build_history
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `, values);

        logger.info(`Build updated: ${id}`);

        res.json({
            success: true,
            message: 'Build updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating build:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update build'
        });
    }
});

/**
 * @route   DELETE /api/builds/:id
 * @desc    Delete a build
 * @access  Owner/Admin
 */
router.delete('/:id(\\d+|[0-9a-fA-F-]{36})', protect, async (req, res) => {
    try {
        const { id } = req.params;

        const existingBuild = await pool.query(
            'SELECT user_id, is_public FROM build_history WHERE id = $1',
            [id]
        );

        if (existingBuild.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Build not found'
            });
        }

        if (!canAccessBuild(existingBuild.rows[0], req.user)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to delete this build'
            });
        }

        const result = await pool.query(
            'DELETE FROM build_history WHERE id = $1 RETURNING *',
            [id]
        );

        logger.info(`Build deleted: ${id}`);

        res.json({
            success: true,
            message: 'Build deleted successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error deleting build:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete build'
        });
    }
});

/**
 * @route   GET /api/builds/public/browse
 * @desc    Browse public builds
 * @access  Public
 */
router.get('/public/browse', async (req, res) => {
    try {
        const {
            limit = 20,
            offset = 0,
            sort = 'views',
            category,
            min_price,
            max_price,
            tags
        } = req.query;

        let query = `
            SELECT 
                id, build_name, compatibility_score, total_price,
                total_wattage, bottleneck_percentage, views_count,
                likes_count, tags, created_at, shared_at
            FROM build_history
            WHERE is_public = TRUE
        `;

        const params = [];
        let paramCount = 1;

        if (min_price) {
            query += ` AND total_price >= $${paramCount++}`;
            params.push(Number.parseFloat(min_price));
        }
        if (max_price) {
            query += ` AND total_price <= $${paramCount++}`;
            params.push(Number.parseFloat(max_price));
        }
        if (tags) {
            query += ` AND tags && $${paramCount++}`;
            params.push(Array.isArray(tags) ? tags : [tags]);
        }

        // Sorting
        const sortOptions = {
            'views': 'views_count DESC',
            'likes': 'likes_count DESC',
            'recent': 'created_at DESC',
            'price_low': 'total_price ASC',
            'price_high': 'total_price DESC',
            'score': 'compatibility_score DESC'
        };

        query += ` ORDER BY ${sortOptions[sort] || sortOptions.views}`;
        query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        params.push(clampLimit(limit, 20, 100), Number.parseInt(offset, 10) || 0);

        const result = await pool.query(query, params);

        // Get total count for pagination
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM build_history WHERE is_public = TRUE'
        );

        res.json({
            success: true,
            data: {
                builds: result.rows,
                pagination: {
                    total: Number.parseInt(countResult.rows[0].total, 10),
                    limit: Number.parseInt(limit, 10),
                    offset: Number.parseInt(offset, 10),
                    has_more: Number.parseInt(offset, 10) + result.rows.length < Number.parseInt(countResult.rows[0].total, 10)
                }
            }
        });

    } catch (error) {
        logger.error('Error browsing public builds:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to browse public builds'
        });
    }
});

/**
 * @route   POST /api/builds/:id/like
 * @desc    Like a build
 * @access  Authenticated
 */
router.post('/:id(\\d+|[0-9a-fA-F-]{36})/like', protect, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            UPDATE build_history
            SET likes_count = likes_count + 1
            WHERE id = $1 AND is_public = TRUE
            RETURNING id, build_name, likes_count
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Build not found or not public'
            });
        }

        logger.info(`Build liked: ${id}`);

        res.json({
            success: true,
            message: 'Build liked successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error liking build:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to like build'
        });
    }
});

/**
 * @route   GET /api/builds/user/:identifier
 * @desc    Get user's builds (by user_id or session_id)
 * @access  Owner/Admin
 */
router.get('/user/:identifier', protect, async (req, res) => {
    try {
        const { identifier } = req.params;
        const { limit = 50 } = req.query;

        if (!isAdminUser(req.user) && String(identifier) !== String(req.user.id)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to view these builds'
            });
        }

        const result = await pool.query(`
            SELECT id, user_id, build_name, build_data, compatibility_score, total_price,
                   total_wattage, bottleneck_percentage, is_public, tags, views_count,
                   likes_count, created_at, updated_at
            FROM build_history
            WHERE user_id = $1
            ORDER BY updated_at DESC
            LIMIT $2
        `, [identifier, clampLimit(limit, 50, 100)]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching user builds:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user builds'
        });
    }
});

/**
 * @route   GET /api/builds/view/popular
 * @desc    Get popular builds using the view
 * @access  Public
 */
router.get('/view/popular', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const result = await pool.query(`
            SELECT * FROM popular_builds
            LIMIT $1
        `, [clampLimit(limit, 10, 100)]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching popular builds:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch popular builds'
        });
    }
});

module.exports = router;
