/**
 * In-Memory Cache Manager
 * Provides fast caching without Redis dependency
 * Uses LRU (Least Recently Used) eviction policy
 */

class InMemoryCache {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 1000;
        this.ttl = options.ttl || 300000; // Default 5 minutes
        this.cache = new Map();
        this.accessTimes = new Map();
        this.queryMap = new Map(); // NEW: Maps hash keys to original SQL queries for pattern invalidation
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            size: 0
        };

        // Cleanup interval - remove expired items every minute (skip in test to avoid open handles)
        if (!(process.env.NODE_ENV === 'test' && process.env.DISABLE_INTERVALS_FOR_TESTS === 'true')) {
            this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
        }
    }

    /**
     * Generate cache key from query and params
     */
    generateKey(query, params = []) {
        const crypto = require('crypto');
        const hash = crypto.createHash('md5');
        hash.update(query);
        hash.update(JSON.stringify(params));
        return hash.digest('hex');
    }

    /**
     * Get value from cache
     */
    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.accessTimes.delete(key);
            this.stats.misses++;
            this.stats.size--;
            return null;
        }

        // Update access time
        this.accessTimes.set(key, Date.now());
        this.stats.hits++;
        return entry.value;
    }

    /**
     * Set value in cache
     */
    set(key, value, customTtl = null) {
        const ttl = customTtl || this.ttl;
        
        // Evict oldest item if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictOldest();
        }

        const entry = {
            value,
            createdAt: Date.now(),
            expiresAt: Date.now() + ttl
        };

        this.cache.set(key, entry);
        this.accessTimes.set(key, Date.now());
        this.stats.sets++;
        this.stats.size = this.cache.size;

        return true;
    }

    /**
     * Delete value from cache
     */
    delete(key) {
        const existed = this.cache.delete(key);
        this.accessTimes.delete(key);
        this.queryMap.delete(key); // Also remove query mapping
        if (existed) {
            this.stats.size--;
        }
        return existed;
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        this.accessTimes.clear();
        this.stats.size = 0;
    }

    /**
     * Evict least recently used item
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, time] of this.accessTimes.entries()) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.accessTimes.delete(oldestKey);
            this.stats.evictions++;
            this.stats.size--;
        }
    }

    /**
     * Remove expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                this.accessTimes.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.stats.size = this.cache.size;
            console.log(`🧹 Cache cleanup: Removed ${cleaned} expired entries`);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;

        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: `${hitRate}%`,
            sets: this.stats.sets,
            evictions: this.stats.evictions,
            currentSize: this.stats.size,
            maxSize: this.maxSize,
            fillPercentage: `${((this.stats.size / this.maxSize) * 100).toFixed(2)}%`
        };
    }

    /**
     * Invalidate cache entries by pattern (matches against SQL queries, not hash keys)
     */
    invalidatePattern(pattern) {
        let count = 0;
        const regex = new RegExp(pattern, 'i'); // Case-insensitive

        for (const [key, sql] of this.queryMap.entries()) {
            if (regex.test(sql)) {
                this.cache.delete(key);
                this.accessTimes.delete(key);
                this.queryMap.delete(key);
                count++;
            }
        }

        this.stats.size = this.cache.size;
        return count;
    }

    /**
     * Destroy cache and cleanup
     */
    destroy() {
        clearInterval(this.cleanupInterval);
        this.clear();
    }
}

// Category-specific TTLs (in milliseconds)
const CACHE_TTL = {
    stock: 5 * 60 * 1000,           // 5 minutes
    categories: 10 * 60 * 1000,     // 10 minutes
    brands: 10 * 60 * 1000,         // 10 minutes
    stats: 2 * 60 * 1000,           // 2 minutes
    search: 3 * 60 * 1000,          // 3 minutes
    compatibility: 30 * 60 * 1000,  // 30 minutes
    users: 1 * 60 * 1000,           // 1 minute
    orders: 2 * 60 * 1000,          // 2 minutes
    default: 5 * 60 * 1000          // 5 minutes
};

/**
 * Smart Query Cache Wrapper
 */
class QueryCache {
    constructor(options = {}) {
        this.cache = new InMemoryCache({
            maxSize: options.maxSize || 2000,
            ttl: options.ttl || CACHE_TTL.default
        });
        this.enabled = options.enabled !== false;
        
        console.log('✅ In-Memory Query Cache initialized');
        console.log(`   Max size: ${this.cache.maxSize} items`);
        console.log(`   Default TTL: ${this.cache.ttl}ms`);
    }

    /**
     * Determine cache category from SQL query
     */
    getCategoryFromQuery(sql) {
        const query = sql.toLowerCase();
        
        if (query.includes('pc_parts') || query.includes('stock')) return 'stock';
        if (query.includes('categories')) return 'categories';
        if (query.includes('brands')) return 'brands';
        if (query.includes('stats') || query.includes('count(*)')) return 'stats';
        if (query.includes('search')) return 'search';
        if (query.includes('compatibility')) return 'compatibility';
        if (query.includes('users')) return 'users';
        if (query.includes('orders')) return 'orders';
        
        return 'default';
    }

    /**
     * Execute query with caching
     */
    async query(queryFn, sql, params = []) {
        if (!this.enabled) {
            return await queryFn(sql, params);
        }

        // Only cache SELECT queries
        if (!sql.trim().toUpperCase().startsWith('SELECT')) {
            // Invalidate cache on write operations
            this.invalidateOnWrite(sql);
            return await queryFn(sql, params);
        }

        // Generate cache key
        const cacheKey = this.cache.generateKey(sql, params);
        
        // Try to get from cache
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Execute query
        const result = await queryFn(sql, params);
        
        // Cache the result with category-specific TTL
        const category = this.getCategoryFromQuery(sql);
        const ttl = CACHE_TTL[category] || CACHE_TTL.default;
        this.cache.set(cacheKey, result, ttl);
        
        // ⚡ FIX: Store SQL query for pattern-based invalidation
        this.cache.queryMap.set(cacheKey, sql);

        return result;
    }

    /**
     * Invalidate cache based on write operations
     */
    invalidateOnWrite(sql) {
        const query = sql.toLowerCase();
        let totalInvalidated = 0;
        
        if (query.includes('pc_parts') || query.includes('stock')) {
            const count = this.cache.invalidatePattern('.*pc_parts.*|.*stock.*');
            console.log(`🧹 Invalidated ${count} pc_parts/stock cache entries`);
            totalInvalidated += count;
        }
        if (query.includes('users')) {
            const count = this.cache.invalidatePattern('.*users.*');
            totalInvalidated += count;
        }
        if (query.includes('orders')) {
            const count = this.cache.invalidatePattern('.*orders.*');
            totalInvalidated += count;
        }
        if (query.includes('compatibility')) {
            const count = this.cache.invalidatePattern('.*compatibility.*');
            totalInvalidated += count;
        }
        
        return totalInvalidated;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        if (!this.enabled) {
            return { enabled: false };
        }
        return { enabled: true, ...this.cache.getStats() };
    }

    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Destroy cache
     */
    destroy() {
        this.cache.destroy();
    }
}

// Singleton instance
let queryCacheInstance = null;

function getQueryCache(options = {}) {
    if (!queryCacheInstance) {
        queryCacheInstance = new QueryCache(options);
    }
    return queryCacheInstance;
}

module.exports = {
    InMemoryCache,
    QueryCache,
    getQueryCache,
    CACHE_TTL
};
