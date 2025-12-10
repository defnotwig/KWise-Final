/**
 * User Preferences API Routes
 * Handles user personalization settings
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Default preferences template
 */
const DEFAULT_PREFERENCES = {
    theme: 'dark',
    language: 'en',
    currency: 'PHP',
    notifications: true,
    defaultBudget: 30000,
    performancePreset: 'balanced',
    autoSave: true,
    showTutorials: true,
    favoriteCategories: [],
    priceAlerts: {
        enabled: false,
        threshold: 5,
        products: []
    }
};

/**
 * @route   POST /api/preferences
 * @desc    Save or update user preferences
 * @access  Public
 */
router.post('/', async (req, res) => {
    try {
        const { user_id, session_id, preferences } = req.body;

        // Validation
        if (!preferences) {
            return res.status(400).json({
                success: false,
                error: 'preferences object is required'
            });
        }

        if (!user_id && !session_id) {
            return res.status(400).json({
                success: false,
                error: 'Either user_id or session_id is required'
            });
        }

        // Merge with defaults
        const mergedPreferences = {
            ...DEFAULT_PREFERENCES,
            ...preferences
        };

        // Upsert preferences
        let result;
        if (user_id) {
            result = await pool.query(`
                INSERT INTO user_preferences (user_id, preferences)
                VALUES ($1, $2)
                ON CONFLICT (user_id)
                DO UPDATE SET
                    preferences = $2,
                    updated_at = CURRENT_TIMESTAMP,
                    last_accessed_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [user_id, mergedPreferences]);
        } else {
            result = await pool.query(`
                INSERT INTO user_preferences (session_id, preferences)
                VALUES ($1, $2)
                ON CONFLICT (user_id)
                DO UPDATE SET
                    preferences = $2,
                    updated_at = CURRENT_TIMESTAMP,
                    last_accessed_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [session_id, mergedPreferences]);
        }

        logger.info(`Preferences saved for ${user_id || session_id}`);

        res.json({
            success: true,
            message: 'Preferences saved successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error saving preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save preferences',
            details: error.message
        });
    }
});

/**
 * @route   GET /api/preferences/:identifier
 * @desc    Load user preferences by user_id or session_id
 * @access  Public
 */
router.get('/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;

        const result = await pool.query(`
            SELECT * FROM user_preferences
            WHERE user_id = $1 OR session_id = $1
        `, [identifier]);

        if (result.rows.length === 0) {
            // Return default preferences if none found
            return res.json({
                success: true,
                data: {
                    preferences: DEFAULT_PREFERENCES,
                    is_default: true
                }
            });
        }

        // Update last accessed time
        await pool.query(`
            UPDATE user_preferences
            SET last_accessed_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 OR session_id = $1
        `, [identifier]);

        res.json({
            success: true,
            data: {
                ...result.rows[0],
                is_default: false
            }
        });

    } catch (error) {
        logger.error('Error loading preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load preferences'
        });
    }
});

/**
 * @route   PUT /api/preferences/:identifier
 * @desc    Update specific preference fields
 * @access  Public
 */
router.put('/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        const { preferences: updates } = req.body;

        if (!updates) {
            return res.status(400).json({
                success: false,
                error: 'preferences object is required'
            });
        }

        // Get current preferences
        const current = await pool.query(`
            SELECT preferences FROM user_preferences
            WHERE user_id = $1 OR session_id = $1
        `, [identifier]);

        let currentPreferences = current.rows.length > 0 
            ? current.rows[0].preferences 
            : DEFAULT_PREFERENCES;

        // Merge updates
        const mergedPreferences = {
            ...currentPreferences,
            ...updates
        };

        // Update
        const result = await pool.query(`
            UPDATE user_preferences
            SET preferences = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2 OR session_id = $2
            RETURNING *
        `, [mergedPreferences, identifier]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Preferences not found'
            });
        }

        logger.info(`Preferences updated for ${identifier}`);

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences'
        });
    }
});

/**
 * @route   DELETE /api/preferences/:identifier
 * @desc    Reset preferences to default
 * @access  Public
 */
router.delete('/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;

        const result = await pool.query(`
            UPDATE user_preferences
            SET preferences = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2 OR session_id = $2
            RETURNING *
        `, [DEFAULT_PREFERENCES, identifier]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Preferences not found'
            });
        }

        logger.info(`Preferences reset to default for ${identifier}`);

        res.json({
            success: true,
            message: 'Preferences reset to default',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error resetting preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset preferences'
        });
    }
});

/**
 * @route   GET /api/preferences/defaults/get
 * @desc    Get default preferences template
 * @access  Public
 */
router.get('/defaults/get', async (req, res) => {
    res.json({
        success: true,
        data: DEFAULT_PREFERENCES
    });
});

/**
 * @route   PATCH /api/preferences/:identifier/field/:field
 * @desc    Update a single preference field
 * @access  Public
 */
router.patch('/:identifier/field/:field', async (req, res) => {
    try {
        const { identifier, field } = req.params;
        const { value } = req.body;

        if (value === undefined) {
            return res.status(400).json({
                success: false,
                error: 'value is required'
            });
        }

        // Get current preferences
        const current = await pool.query(`
            SELECT preferences FROM user_preferences
            WHERE user_id = $1 OR session_id = $1
        `, [identifier]);

        let currentPreferences = current.rows.length > 0 
            ? current.rows[0].preferences 
            : DEFAULT_PREFERENCES;

        // Update specific field
        currentPreferences[field] = value;

        // Save
        const result = await pool.query(`
            UPDATE user_preferences
            SET preferences = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2 OR session_id = $2
            RETURNING *
        `, [currentPreferences, identifier]);

        logger.info(`Preference field '${field}' updated for ${identifier}`);

        res.json({
            success: true,
            message: `Preference field '${field}' updated`,
            data: {
                field,
                value,
                preferences: result.rows[0].preferences
            }
        });

    } catch (error) {
        logger.error('Error updating preference field:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preference field'
        });
    }
});

module.exports = router;
