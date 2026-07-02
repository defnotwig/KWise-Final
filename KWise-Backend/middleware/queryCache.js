/**
 * ============================================================================
 * DATABASE QUERY CACHING MIDDLEWARE
 * ============================================================================
 * Purpose: Intelligent query result caching with automatic invalidation
 * Features: Read-through cache, write-through invalidation, TTL management
 * Performance Target: 90%+ cache hit rate on read queries
 * Author: GitHub Copilot
 * Date: 2025-11-09
 * ============================================================================
 */

const redisCache = require('../config/redis');
const logger = require('../utils/logger');
const crypto = require('node:crypto');

const WRITE_OPERATION_PATTERN = /^(insert|update|delete|create|alter|drop)/;

class QueryCache {
    constructor() {
        this.defaultTTL = {
            products: 300,          // 5 minutes - product data changes moderately
            compatibility: 1800,    // 30 minutes - rules change rarely
            users: 60,              // 1 minute - user data changes frequently
            orders: 120,            // 2 minutes - order data moderately dynamic
            specs: 600,             // 10 minutes - specifications rarely change
            stats: 30,              // 30 seconds - statistics need freshness
            search: 180             // 3 minutes - search results can be cached
        };

        this.invalidationRules = {
            'INSERT INTO pc_parts': ['products:*', 'search:*'],
            'UPDATE pc_parts': ['products:*', 'search:*'],
            'DELETE FROM pc_parts': ['products:*', 'search:*'],
            'INSERT INTO orders': ['orders:*', 'stats:*'],
            'UPDATE orders': ['orders:*', 'stats:*'],
            'INSERT INTO users': ['users:*', 'stats:*'],
            'UPDATE users': ['users:*'],
            'INSERT INTO compatibility_rules': ['compatibility:*'],
            'UPDATE compatibility_rules': ['compatibility:*'],
            'DELETE FROM compatibility_rules': ['compatibility:*']
        };

        this.ready = null;
    }

    async ensureReady() {
        if (this.ready) {
            await this.ready;
            return;
        }

        this.ready = redisCache.connect()
            .catch((error) => {
                logger.warn('⚠️ Redis query cache connection failed, using memory fallback only:', error.message);
            })
            .finally(() => {
                this.ready = null;
            });

        await this.ready;
    }

    /**
     * Generate cache key from SQL query and params
     */
    generateKey(sql, params = []) {
        const normalized = this.normalizeQuery(sql);
        const paramStr = JSON.stringify(params);
        const hash = crypto.createHash('md5')
            .update(normalized + paramStr)
            .digest('hex')
            .substring(0, 12);
        
        const category = this.getCategoryFromQuery(normalized);
        return `${category}:query:${hash}`;
    }

    /**
     * Normalize SQL query for consistent caching
     */
    normalizeQuery(sql) {
        return String(sql ?? '')
            .toLowerCase()
            .trim()
            .replaceAll(/\s+/g, ' ')
            .replaceAll(/--.*$/gm, '')
            .replaceAll(/\/\*.*?\*\//g, '');
    }

    /**
     * Determine cache category from SQL query
     */
    getCategoryFromQuery(sql) {
        if (sql.includes('pc_parts') || sql.includes('product')) return 'products';
        if (sql.includes('compatibility_rules') || sql.includes('bios_compatibility')) return 'compatibility';
        if (sql.includes('users') && !sql.includes('orders')) return 'users';
        if (sql.includes('orders') || sql.includes('order_items')) return 'orders';
        if (sql.includes('specifications') || sql.includes('product_specs')) return 'specs';
        if (sql.includes('count(') || sql.includes('sum(') || sql.includes('avg(')) return 'stats';
        return 'search';
    }

    /**
     * Get TTL for query category
     */
    getTTL(category) {
        return this.defaultTTL[category] || 300;
    }

    /**
     * Check if query should be cached
     */
    shouldCache(sql) {
        const normalized = this.normalizeQuery(sql);
        
        // Don't cache write operations
        if (WRITE_OPERATION_PATTERN.exec(normalized)) {
            return false;
        }

        // Don't cache time-sensitive queries
        if (normalized.includes('now()') || normalized.includes('current_timestamp')) {
            return false;
        }

        // Don't cache random or limit without order
        if (normalized.includes('random()')) {
            return false;
        }

        return true;
    }

    /**
     * Execute query with caching
     */
    async query(dbQuery, sql, params = []) {
        // Don't cache writes - execute directly and invalidate
        if (!this.shouldCache(sql)) {
            const result = await dbQuery(sql, params);
            await this.invalidateByQuery(sql);
            return result;
        }

        await this.ensureReady();

        const key = this.generateKey(sql, params);
        
        // Try cache first
        const cached = await redisCache.get(key);
        if (cached !== null) {
            logger.debug(`💾 Cache HIT: ${key}`);
            return cached;
        }

        logger.debug(`🔍 Cache MISS: ${key}`);
        
        // Execute query
        const result = await dbQuery(sql, params);
        
        // Cache result
        const category = this.getCategoryFromQuery(this.normalizeQuery(sql));
        const ttl = this.getTTL(category);
        await redisCache.set(key, result, ttl);
        
        return result;
    }

    /**
     * Invalidate cache based on write query
     */
    async invalidateByQuery(sql) {
        const normalized = this.normalizeQuery(sql);
        
        let invalidatedCount = 0;
        for (const [pattern, invalidations] of Object.entries(this.invalidationRules)) {
            if (normalized.includes(pattern.toLowerCase())) {
                for (const inv of invalidations) {
                    await redisCache.delPattern(inv);
                    invalidatedCount++;
                    logger.info(`🗑️  Invalidated cache pattern: ${inv} (trigger: ${pattern})`);
                }
                break;
            }
        }
        return invalidatedCount;
    }

    /**
     * ⚡ FIX: Added missing invalidateOnWrite method
     * This is called by config/db.js after every write operation
     * Critical for preventing stale cache after stock updates
     */
    invalidateOnWrite(sql) {
        // This needs to be synchronous for db.js compatibility
        // Fire async invalidation but don't wait
        this.invalidateByQuery(sql).catch(err => {
            logger.error('❌ Cache invalidation error:', err.message);
        });
        
        // Return estimated count (will log actual count async)
        const normalized = this.normalizeQuery(sql);
        for (const [pattern, invalidations] of Object.entries(this.invalidationRules)) {
            if (normalized.includes(pattern.toLowerCase())) {
                return invalidations.length;
            }
        }
        return 0;
    }

    /**
     * Manually invalidate specific patterns
     */
    async invalidate(patterns) {
        if (typeof patterns === 'string') {
            patterns = [patterns];
        }

        for (const pattern of patterns) {
            await redisCache.delPattern(pattern);
        }
    }

    /**
     * Clear all query cache
     */
    async clearAll() {
        await redisCache.flush();
        logger.info('🗑️  All query cache cleared');
    }

    async clearCache() {
        await this.clearAll();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return redisCache.getStats();
    }
}

module.exports = QueryCache;
module.exports.QueryCache = QueryCache;
