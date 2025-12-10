/**
 * Compatibility Cache API Routes
 * Handles caching of compatibility analysis results
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Generate cache key from build configuration
 */
function generateCacheKey(buildParts) {
    const sortedParts = JSON.stringify(buildParts, Object.keys(buildParts).sort());
    return crypto.createHash('md5').update(sortedParts).digest('hex');
}

/**
 * @route   POST /api/compatibility/cache
 * @desc    Store compatibility analysis result in cache
 * @access  Public
 */
router.post('/', async (req, res) => {
    try {
        const {
            build_parts,
            compatibility_result,
            score,
            issues_count = 0,
            warnings_count = 0,
            performance_tier,
            ttl_days = 7
        } = req.body;

        // Validation
        if (!build_parts || !compatibility_result) {
            return res.status(400).json({
                success: false,
                error: 'build_parts and compatibility_result are required'
            });
        }

        // Generate cache key
        const cache_key = generateCacheKey(build_parts);

        // Calculate expiration
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + ttl_days);

        // Upsert cache entry
        const result = await pool.query(`
            INSERT INTO compatibility_cache (
                cache_key, build_parts, compatibility_result,
                score, issues_count, warnings_count,
                performance_tier, expires_at, hit_count
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
            ON CONFLICT (cache_key)
            DO UPDATE SET
                compatibility_result = EXCLUDED.compatibility_result,
                score = EXCLUDED.score,
                issues_count = EXCLUDED.issues_count,
                warnings_count = EXCLUDED.warnings_count,
                performance_tier = EXCLUDED.performance_tier,
                expires_at = EXCLUDED.expires_at,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            cache_key, build_parts, compatibility_result,
            score, issues_count, warnings_count,
            performance_tier, expires_at
        ]);

        logger.info(`Compatibility result cached: ${cache_key}`);

        res.json({
            success: true,
            message: 'Compatibility result cached successfully',
            data: {
                cache_key,
                expires_at,
                ttl_days
            }
        });

    } catch (error) {
        logger.error('Error caching compatibility result:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cache compatibility result'
        });
    }
});

/**
 * @route   POST /api/compatibility/cache/check
 * @desc    Check if cached result exists and retrieve it
 * @access  Public
 */
router.post('/check', async (req, res) => {
    try {
        const { build_parts } = req.body;

        if (!build_parts) {
            return res.status(400).json({
                success: false,
                error: 'build_parts is required'
            });
        }

        // Generate cache key
        const cache_key = generateCacheKey(build_parts);

        // Check cache
        const result = await pool.query(`
            SELECT * FROM compatibility_cache
            WHERE cache_key = $1
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        `, [cache_key]);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                cached: false,
                message: 'No cached result found'
            });
        }

        // Update hit count and last_hit_at
        await pool.query(`
            UPDATE compatibility_cache
            SET hit_count = hit_count + 1,
                last_hit_at = CURRENT_TIMESTAMP
            WHERE cache_key = $1
        `, [cache_key]);

        const cached = result.rows[0];

        logger.info(`Cache HIT: ${cache_key} (hits: ${cached.hit_count + 1})`);

        res.json({
            success: true,
            cached: true,
            data: {
                cache_key,
                compatibility_result: cached.compatibility_result,
                score: cached.score,
                issues_count: cached.issues_count,
                warnings_count: cached.warnings_count,
                performance_tier: cached.performance_tier,
                cached_at: cached.created_at,
                expires_at: cached.expires_at,
                hit_count: cached.hit_count + 1
            }
        });

    } catch (error) {
        logger.error('Error checking cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check cache'
        });
    }
});

/**
 * @route   GET /api/compatibility/cache/stats
 * @desc    Get cache effectiveness statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await pool.query('SELECT * FROM cache_metrics');

        // Additional detailed stats
        const hitRate = await pool.query(`
            SELECT 
                COUNT(*) as total_entries,
                SUM(hit_count) as total_hits,
                COUNT(CASE WHEN hit_count > 0 THEN 1 END) as used_entries,
                COUNT(CASE WHEN hit_count = 0 THEN 1 END) as unused_entries,
                COUNT(CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired_entries,
                ROUND(AVG(hit_count), 2) as avg_hits_per_entry,
                MAX(hit_count) as max_hits
            FROM compatibility_cache
        `);

        // Performance tier distribution
        const tierDistribution = await pool.query(`
            SELECT 
                performance_tier,
                COUNT(*) as count,
                ROUND(AVG(score), 2) as avg_score
            FROM compatibility_cache
            WHERE performance_tier IS NOT NULL
            GROUP BY performance_tier
            ORDER BY performance_tier
        `);

        res.json({
            success: true,
            data: {
                metrics: stats.rows[0],
                hit_rate: hitRate.rows[0],
                tier_distribution: tierDistribution.rows
            }
        });

    } catch (error) {
        logger.error('Error fetching cache stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cache statistics'
        });
    }
});

/**
 * @route   DELETE /api/compatibility/cache/expired
 * @desc    Clean up expired cache entries
 * @access  Public
 */
router.delete('/expired', async (req, res) => {
    try {
        const result = await pool.query(`
            DELETE FROM compatibility_cache
            WHERE expires_at IS NOT NULL
            AND expires_at < CURRENT_TIMESTAMP
            RETURNING id
        `);

        logger.info(`Cleaned up ${result.rows.length} expired cache entries`);

        res.json({
            success: true,
            message: 'Expired cache entries cleaned up',
            data: {
                deleted_count: result.rows.length
            }
        });

    } catch (error) {
        logger.error('Error cleaning up expired cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clean up expired cache'
        });
    }
});

/**
 * @route   DELETE /api/compatibility/cache/all
 * @desc    Clear all cache entries
 * @access  Admin (will add auth later)
 */
router.delete('/all', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM compatibility_cache RETURNING id');

        logger.warn(`ALL cache entries cleared: ${result.rows.length}`);

        res.json({
            success: true,
            message: 'All cache entries cleared',
            data: {
                deleted_count: result.rows.length
            }
        });

    } catch (error) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache'
        });
    }
});

/**
 * @route   GET /api/compatibility/cache/top
 * @desc    Get most frequently accessed cache entries
 * @access  Public
 */
router.get('/top', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const result = await pool.query(`
            SELECT 
                cache_key,
                score,
                issues_count,
                warnings_count,
                performance_tier,
                hit_count,
                created_at,
                last_hit_at
            FROM compatibility_cache
            WHERE hit_count > 0
            ORDER BY hit_count DESC
            LIMIT $1
        `, [parseInt(limit)]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching top cache entries:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top cache entries'
        });
    }
});

module.exports = router;
