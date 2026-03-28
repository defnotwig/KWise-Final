const { Pool } = require('pg');
const logger = require('../utils/logger');

// Shared in-memory store for tests
const { store } = require('../utils/testMemoryStore');

// Load environment variables
require('dotenv').config();

// In test environment, provide a lightweight in-memory stub to avoid opening real TCP sockets
const isTest = process.env.NODE_ENV === 'test' && process.env.USE_REAL_DB_IN_TEST !== 'true';

// Import caching middleware (tries Redis first, falls back to in-memory) — disabled in tests to avoid interval handles
let queryCache = null;
if (!isTest) {
  try {
    // Try to load Redis-based cache first
    const QueryCache = require('../middleware/queryCache');
    queryCache = new QueryCache();
    logger.info('✅ Redis query caching middleware loaded successfully');
  } catch (err) {
    // Fall back to in-memory cache
    try {
      const { getQueryCache } = require('../utils/inMemoryCache');
      queryCache = getQueryCache({ 
        maxSize: 2000,
        enabled: true
      });
      logger.info('✅ In-memory query caching enabled (Redis not available)');
      logger.info('   Using LRU cache with 2000 item capacity');
    } catch (fallbackErr) {
      logger.warn('⚠️  Query caching not available:', fallbackErr.message);
    }
  }
} else {
  logger.info('🧪 Test mode: query cache disabled to prevent background intervals');
}

let pool;
if (isTest) {
  // Minimal stubbed pool/client compatible with pg's interface
  pool = {
    async connect() {
      return {
        release() {}
      };
    },
    async query(_text, _params) {
      // Default empty result in tests; individual tests can jest.spyOn and mock implementations
      return { rows: [], rowCount: 0 };
    },
    async end() {
      // no-op
    }
  };
  logger.info('Using stubbed PostgreSQL pool in test environment (no real connections)');
} else {
  // Create real PostgreSQL connection pool
  // 🚀 PERFORMANCE OPTIMIZATION: Tuned for high concurrent load
  const isLoadTestMode = process.env.LOAD_TEST_MODE === 'true';
  
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'humbleludwig13',
    port: process.env.DB_PORT || 5432,
    
    // 🚀 OPTIMIZED CONNECTION POOL SETTINGS
    // Production: 100 connections (handles kiosk concurrent requests)
    // Load Test: 200 connections (stress testing)
    max: isLoadTestMode ? 200 : 100,
    
    // Minimum idle connections (pre-warmed pool)
    min: 10,
    
    // Connection timeout in milliseconds (optimized for fast fail)
    connectionTimeoutMillis: isLoadTestMode ? 30000 : 5000,
    
    // Idle timeout in milliseconds (keep connections alive longer)
    idleTimeoutMillis: 60000,
    
    // Maximum time a client can remain checked out (prevent leaks)
    maxUses: 7500,
    
    // Enable keep-alive to prevent connection drops
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
    
    // 🚀 PostgreSQL-specific optimizations
    statement_timeout: 30000, // 30 second query timeout
    query_timeout: 30000,
    
    // Application name for monitoring
    application_name: 'kwise-backend'
  });
  
  // Handle unexpected pool errors (e.g., PostgreSQL restarts, idle connection termination)
  pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL pool error:', err.message);
  });

  logger.info(`📊 PostgreSQL connection pool initialized:`);
  logger.info(`   Max connections: ${isLoadTestMode ? 200 : 100}`);
  logger.info(`   Min connections: 10`);
  logger.info(`   Connection timeout: ${isLoadTestMode ? 30000 : 5000}ms`);
  logger.info(`   Idle timeout: 60000ms`);
}

// Connect to database with retry logic
const connectDB = async (retries = 5, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      logger.info('PostgreSQL database connected successfully');
      if (client && typeof client.release === 'function') client.release();
      return;
    } catch (err) {
      logger.error(`Error connecting to PostgreSQL (attempt ${attempt}/${retries}):`, err.message);
      if (attempt === retries) {
        logger.error('All database connection attempts failed. Exiting.');
        process.exit(1);
      }
      logger.info(`Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 30000); // exponential backoff, max 30s
    }
  }
};

// Execute SQL queries with optional caching
const query = async (text, params) => {
  const start = Date.now();
  try {
    // In test mode, use simple in-memory responses for common tables
    if (isTest) {
      const sql = String(text || '');
      const normalized = sql.trim().toUpperCase();

      if (normalized.includes('FROM PC_PARTS')) {
        if (normalized.startsWith('SELECT')) {
          let rows = [...store.parts];
          if (normalized.includes('WHERE ID = $1') && params?.length) {
            rows = store.parts.filter(p => String(p.id) === String(params[0]));
          }
          return { rows, rowCount: rows.length };
        }
        if (normalized.startsWith('DELETE')) {
          const id = params?.[0];
          store.parts = store.parts.filter(p => String(p.id) !== String(id));
          return { rows: [], rowCount: 1 };
        }
      }

      if (normalized.includes('FROM ORDERS')) {
        if (normalized.startsWith('SELECT')) {
          let rows = [...store.orders];
          if (normalized.includes('WHERE ID = $1') && params?.length) {
            rows = store.orders.filter(o => String(o.id) === String(params[0]));
          }
          return { rows, rowCount: rows.length };
        }
        if (normalized.startsWith('DELETE')) {
          const ids = params || [];
          store.orders = store.orders.filter(o => !ids.some(id => String(o.id) === String(id)));
          return { rows: [], rowCount: 1 };
        }
        if (normalized.startsWith('UPDATE')) {
          if (normalized.includes('SET STATUS')) {
            const status = params?.[0];
            const id = params?.[1];
            store.orders = store.orders.map(o => String(o.id) === String(id) ? { ...o, status, queue_status: status } : o);
            return { rows: store.orders.filter(o => String(o.id) === String(id)), rowCount: 1 };
          }
        }
      }

      if (normalized.includes('FROM QUEUE_MANAGEMENT')) {
        if (normalized.startsWith('SELECT')) {
          let rows = [...store.queues];
          if (normalized.includes('WHERE QUEUE_NUMBER = $1') && params?.length) {
            rows = store.queues.filter(q => String(q.queue_number) === String(params[0]));
          }
          return { rows, rowCount: rows.length };
        }
        if (normalized.startsWith('UPDATE')) {
          const queueNumber = params?.[params.length - 1];
          store.queues = store.queues.map(q => String(q.queue_number) === String(queueNumber) ? { ...q, status: params?.[0] || q.status } : q);
          return { rows: store.queues.filter(q => String(q.queue_number) === String(queueNumber)), rowCount: 1 };
        }
      }

      return { rows: [], rowCount: 0 };
    }

    let res;
    
    // Use query cache if available and query is SELECT (read operation)
    if (queryCache && text.trim().toUpperCase().startsWith('SELECT')) {
      res = await queryCache.query(pool.query.bind(pool), text, params);
    } else {
      // Execute write operation (UPDATE/INSERT/DELETE)
      res = await pool.query(text, params);
      
      // ⚡ FIX: Invalidate cache after write operations
      if (queryCache && typeof queryCache.invalidateOnWrite === 'function') {
        const invalidated = queryCache.invalidateOnWrite(text);
        logger.debug(`🧹 Cache invalidation triggered by write: invalidated ${invalidated || 0} entries`);
      }
    }
    
    const duration = Date.now() - start;

    // Only log queries taking longer than 500ms (reduced noise, queue checks are expected to take 200-400ms)
    if (duration > 500) {
      logger.warn(`Long running query (${duration}ms): ${text.substring(0, 100)}...`);
    }

    return res;
  } catch (err) {
    // Suppress "table does not exist" errors ONLY for SELECT queries on metadata tables
    // (expected before first regeneration, but we need to see CREATE/INSERT/UPDATE errors)
    const isMetadataTableSelectError = err.code === '42P01' && 
      (text.includes('pc_upgrade_reference_builds_metadata') || text.includes('pc_customized_ai_builds_metadata')) &&
      (text.trim().toUpperCase().startsWith('SELECT') || text.includes('WHERE id'));
    
    if (!isMetadataTableSelectError) {
      logger.error('Error executing query in transaction:', { text, error: err.message });
    }
    throw err;
  }
};

// Get a client from the pool
const getClient = async () => {
  const client = await pool.connect();
  // In test stub, client has only release(); add query passthrough for consistency
  if (!client.query) {
    client.query = (...args) => pool.query(...args);
  }
  const _query = client.query;
  const _release = client.release;

  // Override release method (no-op safe)
  client.release = () => {
    if (typeof _release === 'function') {
      _release.call(client);
    }
  };

  // Wrap query for timing logs similar to pool.query
  client.query = async (text, params) => {
    const start = Date.now();
    try {
      const res = await _query.call(client, text, params);
      const duration = Date.now() - start;

      if (duration > 200) {
        logger.warn(`Long running query in transaction (${duration}ms): ${text.substring(0, 100)}...`);
      }

      return res;
    } catch (err) {
      // Suppress "table does not exist" errors for metadata tables (expected before first regeneration)
      const isMetadataTableMissing = err.code === '42P01' && (
        text.includes('pc_upgrade_reference_builds_metadata') ||
        text.includes('pc_customized_ai_builds_metadata')
      );
      
      if (!isMetadataTableMissing) {
        logger.error('Error executing query in transaction:', { text, error: err.message });
      }
      throw err;
    }
  };

  return client;
};

// Export the query function and client methods
let poolClosed = false;

module.exports = {
  query,
  getClient,
  connectDB,
  pool,
  /**
   * Gracefully close the PostgreSQL pool (used in tests & shutdown)
   */
  closePool: async () => {
    try {
      if (poolClosed) return; // prevent multiple closures
      if (pool && typeof pool.end === 'function') {
        await pool.end();
      }
      poolClosed = true;
      logger.info('PostgreSQL pool closed');
    } catch (err) {
      logger.error('Failed to close PostgreSQL pool:', err.message);
    }
  },
  /**
   * Get cache statistics (if caching enabled)
   */
  getCacheStats: () => {
    if (queryCache && typeof queryCache.getStats === 'function') {
      return queryCache.getStats();
    }
    return { enabled: false, message: 'Query caching not available' };
  },
  /**
   * Clear query cache (if caching enabled)
   */
  clearCache: async () => {
    if (queryCache && typeof queryCache.clearCache === 'function') {
      await queryCache.clearCache();
      logger.info('Query cache cleared');
      return true;
    }
    return false;
  }
};