/**
 * ============================================================================
 * REDIS CACHE CONFIGURATION
 * ============================================================================
 * Purpose: Multi-tier caching for Hyper-V deployment with 2TB NVMe SSD
 * Features: L1 Memory, L2 Redis, L3 Database
 * Performance: Sub-millisecond cache hits, 95%+ hit rate target
 * Author: GitHub Copilot
 * Date: 2025-11-09
 * ============================================================================
 */

const redis = require('redis');
const logger = require('../utils/logger');

class RedisCache {
    client = null;
    isConnected = false;
    connectionPromise = null;
    l1Cache = new Map();
    l1MaxSize = 1000;
    l1TTL = 60 * 1000;
    stats = {
        l1Hits: 0,
        l2Hits: 0,
        misses: 0,
        errors: 0,
        totalRequests: 0
    };

    /**
     * Initialize Redis connection
     */
    async connect() {
        if (this.isConnected) {
            return;
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        try {
            // Only attempt Redis if enabled in environment
            if (process.env.REDIS_ENABLED !== 'true') {
                logger.info('âš ï¸  Redis caching disabled. Using memory-only cache.');
                this.isConnected = false;
                return;
            }

            const host = process.env.REDIS_HOST || 'localhost';
            const port = Number.parseInt(process.env.REDIS_PORT || '6379', 10);
            const database = Number.parseInt(process.env.REDIS_DB || '0', 10);
            const redisConfig = {
                socket: {
                    host,
                    port,
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            logger.error('Redis: Max retry attempts reached');
                            throw new Error('Redis: Max retry attempts reached');
                        }

                        return Math.min(retries * 100, 3000);
                    }
                },
                password: process.env.REDIS_PASSWORD || undefined,
                database
            };

            this.client = redis.createClient(redisConfig);

            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                this.stats.errors++;
            });

            this.client.on('ready', () => {
                logger.info('âœ… Redis connected successfully');
                this.isConnected = true;
            });

            this.client.on('reconnecting', () => {
                logger.warn('ðŸ”„ Redis reconnecting...');
            });

            this.client.on('end', () => {
                this.isConnected = false;
            });

            this.connectionPromise = this.client.connect()
                .then(async () => {
                    await this.client.ping();
                    logger.info(`ðŸ“Š Redis cache initialized (${host}:${port})`);
                })
                .catch((error) => {
                    logger.warn('âš ï¸  Redis unavailable, falling back to memory-only cache:', error.message);
                    this.isConnected = false;
                    this.client = null;
                })
                .finally(() => {
                    this.connectionPromise = null;
                });

            await this.connectionPromise;
            
        } catch (error) {
            logger.warn('âš ï¸  Redis unavailable, falling back to memory-only cache:', error.message);
            this.isConnected = false;
            this.client = null;
        }
    }

    /**
     * L1 Cache Management (Memory)
     */
    _setL1(key, value, ttl = this.l1TTL) {
        // Evict oldest if at capacity
        if (this.l1Cache.size >= this.l1MaxSize) {
            const firstKey = this.l1Cache.keys().next().value;
            this.l1Cache.delete(firstKey);
        }

        this.l1Cache.set(key, {
            data: value,
            expires: Date.now() + ttl
        });
    }

    _getL1(key) {
        const cached = this.l1Cache.get(key);
        if (!cached) return null;

        // Check expiration
        if (Date.now() > cached.expires) {
            this.l1Cache.delete(key);
            return null;
        }

        this.stats.l1Hits++;
        return cached.data;
    }

    _deleteL1(key) {
        this.l1Cache.delete(key);
    }

    /**
     * Get value from cache (L1 â†’ L2 â†’ null)
     */
    async get(key) {
        this.stats.totalRequests++;

        if (!this.isConnected && process.env.REDIS_ENABLED === 'true') {
            await this.connect();
        }
        
        // Try L1 (Memory) first
        const l1Data = this._getL1(key);
        if (l1Data !== null) {
            return l1Data;
        }

        // Try L2 (Redis)
        if (this.isConnected && this.client) {
            try {
                const value = await this.client.get(key);
                if (value) {
                    this.stats.l2Hits++;
                    const parsed = JSON.parse(value);
                    
                    // Populate L1 for next request
                    this._setL1(key, parsed);
                    
                    return parsed;
                }
            } catch (error) {
                logger.error(`Redis GET error for key ${key}:`, error.message);
                this.stats.errors++;
            }
        }

        this.stats.misses++;
        return null;
    }

    /**
     * Set value in cache (L1 + L2)
     */
    async set(key, value, ttl = 3600) {
        // Set in L1
        this._setL1(key, value, Math.min(ttl * 1000, this.l1TTL));

        if (!this.isConnected && process.env.REDIS_ENABLED === 'true') {
            await this.connect();
        }

        // Set in L2 (Redis)
        if (this.isConnected && this.client) {
            try {
                await this.client.setEx(key, ttl, JSON.stringify(value));
            } catch (error) {
                logger.error(`Redis SET error for key ${key}:`, error.message);
                this.stats.errors++;
            }
        }
    }

    /**
     * Delete key from all cache tiers
     */
    async del(key) {
        this._deleteL1(key);

        if (!this.isConnected && process.env.REDIS_ENABLED === 'true') {
            await this.connect();
        }

        if (this.isConnected && this.client) {
            try {
                await this.client.del(key);
            } catch (error) {
                logger.error(`Redis DEL error for key ${key}:`, error.message);
            }
        }
    }

    /**
     * Delete multiple keys matching pattern
     * Uses SCAN instead of KEYS to avoid blocking Redis event loop (O(N) â†’ O(1) per iteration)
     */
    async delPattern(pattern) {
        // Clear matching L1 entries
        const l1Pattern = String(pattern || '').replaceAll('*', '');
        for (const key of this.l1Cache.keys()) {
            if (key.includes(l1Pattern)) {
                this.l1Cache.delete(key);
            }
        }

        if (!this.isConnected && process.env.REDIS_ENABLED === 'true') {
            await this.connect();
        }

        // Clear matching L2 entries using non-blocking SCAN
        if (this.isConnected && this.client) {
            try {
                let cursor = '0';
                let deletedCount = 0;
                const batchSize = 100;

                do {
                    const result = await this.client.scan(cursor, {
                        MATCH: pattern,
                        COUNT: batchSize,
                    });
                    cursor = result.cursor;
                    const keys = result.keys;

                    if (keys.length > 0) {
                        await this.client.del(keys);
                        deletedCount += keys.length;
                    }
                } while (cursor !== '0');

                if (deletedCount > 0) {
                    logger.info(`ðŸ—‘ï¸  Cleared ${deletedCount} Redis keys matching: ${pattern}`);
                }
            } catch (error) {
                logger.error(`Redis DEL pattern error for ${pattern}:`, error.message);
            }
        }
    }

    /**
     * Flush all cache tiers (L1 memory + L2 Redis only â€” never production data)
     * Safety: Only flushes the configured Redis DB number, never FLUSHALL
     */
    async flush() {
        this.l1Cache.clear();
        logger.info('ðŸ—‘ï¸  L1 cache cleared');

        if (!this.isConnected && process.env.REDIS_ENABLED === 'true') {
            await this.connect();
        }

        if (this.isConnected && this.client) {
            try {
                await this.client.flushDb();
                logger.info('ðŸ—‘ï¸  L2 (Redis) cache cleared (DB only, not FLUSHALL)');
            } catch (error) {
                logger.error('Redis FLUSH error:', error.message);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.totalRequests > 0
            ? ((this.stats.l1Hits + this.stats.l2Hits) / this.stats.totalRequests * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            l1Size: this.l1Cache.size,
            hitRate: `${hitRate}%`,
            isRedisConnected: this.isConnected,
            l1HitRate: this.stats.totalRequests > 0 
                ? (this.stats.l1Hits / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%',
            l2HitRate: this.stats.totalRequests > 0 
                ? (this.stats.l2Hits / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%',
            missRate: this.stats.totalRequests > 0 
                ? (this.stats.misses / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            l1Hits: 0,
            l2Hits: 0,
            misses: 0,
            errors: 0,
            totalRequests: 0
        };
        logger.info('ðŸ“Š Cache statistics reset');
    }

    /**
     * Gracefully close Redis connection
     */
    async disconnect() {
        if (this.client && this.isConnected) {
            try {
                await this.client.quit();
                logger.info('ðŸ‘‹ Redis disconnected');
            } catch (error) {
                logger.warn('Redis disconnect error:', error.message);
            }
        }
    }
}
// Singleton instance
const redisCache = new RedisCache();

module.exports = redisCache;
