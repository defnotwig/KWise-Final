/**
 * Advanced Monitoring Dashboard Route
 * Week 3 Phase 5: Real-time performance metrics endpoint
 * 
 * Provides comprehensive system health and performance monitoring:
 * - Cache performance (hit rate, entries, memory usage)
 * - Database performance (connections, query times, index usage)
 * - Circuit breaker status
 * - AI service metrics
 * - System resource usage
 * 
 * Endpoint: GET /api/metrics/dashboard
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const intelligentCache = require('../services/intelligentCache');
const logger = require('../utils/logger');

/**
 * @route GET /api/metrics/dashboard
 * @desc Get comprehensive system performance metrics
 * @access Admin only (add auth middleware in production)
 */
router.get('/dashboard', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
      },
      performance: await getPerformanceMetrics(),
      cache: await getCacheMetrics(),
      database: await getDatabaseMetrics(),
      circuitBreaker: getCircuitBreakerMetrics(),
      ai: await getAIMetrics(),
      resources: getSystemResources()
    };

    res.status(200).json({
      success: true,
      message: 'Performance metrics retrieved successfully',
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching dashboard metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
      error: error.message
    });
  }
});

/**
 * Get performance metrics (latency, throughput)
 */
async function getPerformanceMetrics() {
  try {
    // Get recent AI logs for latency analysis
    const latencyQuery = `
      SELECT 
        AVG(response_time_ms) as avg_latency,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_latency,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_latency,
        MIN(response_time_ms) as min_latency,
        MAX(response_time_ms) as max_latency,
        COUNT(*) as total_requests
      FROM ai_logs
      WHERE created_at > NOW() - INTERVAL '1 hour';
    `;

    const result = await query(latencyQuery);
    const stats = result.rows[0] || {};

    return {
      avgLatency: Math.round(stats.avg_latency || 0) + 'ms',
      p95Latency: Math.round(stats.p95_latency || 0) + 'ms',
      p99Latency: Math.round(stats.p99_latency || 0) + 'ms',
      minLatency: Math.round(stats.min_latency || 0) + 'ms',
      maxLatency: Math.round(stats.max_latency || 0) + 'ms',
      totalRequests: parseInt(stats.total_requests || 0),
      requestsPerSecond: (parseInt(stats.total_requests || 0) / 3600).toFixed(2)
    };
  } catch (error) {
    logger.error('Error getting performance metrics', { error: error.message });
    return {
      error: 'Unable to fetch performance metrics',
      avgLatency: 'N/A'
    };
  }
}

/**
 * Get cache performance metrics
 */
async function getCacheMetrics() {
  try {
    const cacheStats = intelligentCache.getStats();
    
    // Get cache entries from database
    const cacheCountQuery = `
      SELECT 
        COUNT(*) as total_entries,
        SUM(CASE WHEN expires_at > NOW() THEN 1 ELSE 0 END) as active_entries,
        AVG(confidence_score) as avg_confidence
      FROM ai_cache;
    `;

    const result = await query(cacheCountQuery);
    const dbStats = result.rows[0] || {};

    return {
      hitRate: ((cacheStats.hits / (cacheStats.hits + cacheStats.misses || 1)) * 100).toFixed(2) + '%',
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      totalRequests: cacheStats.hits + cacheStats.misses,
      entries: {
        total: parseInt(dbStats.total_entries || 0),
        active: parseInt(dbStats.active_entries || 0),
        hot: cacheStats.hotTier || 0,
        warm: cacheStats.warmTier || 0,
        cold: cacheStats.coldTier || 0
      },
      memoryUsage: (cacheStats.memoryMB || 0).toFixed(2) + ' MB',
      avgConfidence: parseFloat(dbStats.avg_confidence || 0).toFixed(2),
      evictions: cacheStats.evictions || 0
    };
  } catch (error) {
    logger.error('Error getting cache metrics', { error: error.message });
    return {
      error: 'Unable to fetch cache metrics',
      hitRate: 'N/A'
    };
  }
}

/**
 * Get database performance metrics
 */
async function getDatabaseMetrics() {
  try {
    // Get active connections
    const connectionsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN state = 'idle' THEN 1 ELSE 0 END) as idle
      FROM pg_stat_activity
      WHERE datname = 'KWiseDB';
    `;

    const connectionsResult = await query(connectionsQuery);
    const connections = connectionsResult.rows[0] || {};

    // Get top slow queries
    const slowQueriesQuery = `
      SELECT 
        query,
        calls,
        total_time / 1000 as total_time_sec,
        mean_time as avg_time_ms
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat%'
      ORDER BY mean_time DESC
      LIMIT 5;
    `;

    let slowQueries = [];
    try {
      const slowResult = await query(slowQueriesQuery);
      slowQueries = slowResult.rows.map(q => ({
        query: q.query.substring(0, 100) + '...',
        calls: parseInt(q.calls || 0),
        avgTime: Math.round(q.avg_time_ms || 0) + 'ms'
      }));
    } catch (err) {
      // pg_stat_statements extension might not be enabled
      slowQueries = [{ note: 'pg_stat_statements extension not enabled' }];
    }

    // Get index usage statistics for critical tables
    const indexUsageQuery = `
      SELECT 
        relname as table_name,
        ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) as index_usage_pct,
        idx_scan,
        seq_scan
      FROM pg_stat_user_tables
      WHERE relname IN ('specification_schemas', 'users', 'messages', 'pc_parts', 'compatibility_rules')
      ORDER BY relname;
    `;

    const indexResult = await query(indexUsageQuery);
    const indexUsage = indexResult.rows.map(row => ({
      table: row.table_name,
      indexUsage: (row.index_usage_pct || 0) + '%',
      indexScans: parseInt(row.idx_scan || 0),
      seqScans: parseInt(row.seq_scan || 0)
    }));

    return {
      connections: {
        total: parseInt(connections.total || 0),
        active: parseInt(connections.active || 0),
        idle: parseInt(connections.idle || 0),
        maxAllowed: 20
      },
      queryPerformance: {
        slowQueries
      },
      indexUsage
    };
  } catch (error) {
    logger.error('Error getting database metrics', { error: error.message });
    return {
      error: 'Unable to fetch database metrics',
      connections: { total: 'N/A' }
    };
  }
}

/**
 * Get circuit breaker status
 */
function getCircuitBreakerMetrics() {
  try {
    // Check if circuit breaker service exists globally
    const circuitBreaker = global.circuitBreaker || { state: 'UNKNOWN' };

    return {
      state: circuitBreaker.state || 'UNKNOWN',
      failureCount: circuitBreaker.failureCount || 0,
      successCount: circuitBreaker.successCount || 0,
      lastFailure: circuitBreaker.lastFailureTime || null,
      nextRetry: circuitBreaker.nextRetryTime || null,
      successRate: circuitBreaker.successCount 
        ? ((circuitBreaker.successCount / (circuitBreaker.successCount + circuitBreaker.failureCount)) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  } catch (error) {
    logger.error('Error getting circuit breaker metrics', { error: error.message });
    return {
      state: 'UNKNOWN',
      error: 'Circuit breaker metrics unavailable'
    };
  }
}

/**
 * Get AI service metrics
 */
async function getAIMetrics() {
  try {
    // Get AI usage stats from last hour
    const aiStatsQuery = `
      SELECT 
        endpoint,
        COUNT(*) as requests,
        AVG(response_time_ms) as avg_response_time,
        SUM(CASE WHEN response_code = 200 THEN 1 ELSE 0 END) as successful_requests
      FROM ai_logs
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY endpoint
      ORDER BY requests DESC
      LIMIT 10;
    `;

    const result = await query(aiStatsQuery);
    const endpointStats = result.rows.map(row => ({
      endpoint: row.endpoint,
      requests: parseInt(row.requests || 0),
      avgResponseTime: Math.round(row.avg_response_time || 0) + 'ms',
      successRate: ((parseInt(row.successful_requests || 0) / parseInt(row.requests || 1)) * 100).toFixed(2) + '%'
    }));

    // Get cache warmup stats if available
    const warmupStats = global.cacheWarmupService 
      ? global.cacheWarmupService.getWarmupStats()
      : { entriesWarmed: 0, inProgress: false };

    return {
      ollamaStatus: 'Connected', // Assume connected if no errors
      modelLoaded: 'DeepSeek R1 1.5B',
      endpointStats,
      cacheWarmup: {
        entriesWarmed: warmupStats.entriesWarmed || 0,
        inProgress: warmupStats.inProgress || false,
        lastRun: warmupStats.endTime 
          ? new Date(warmupStats.endTime).toISOString()
          : 'Never'
      }
    };
  } catch (error) {
    logger.error('Error getting AI metrics', { error: error.message });
    return {
      error: 'Unable to fetch AI metrics',
      ollamaStatus: 'Unknown'
    };
  }
}

/**
 * Get system resource usage
 */
function getSystemResources() {
  try {
    const memUsage = process.memoryUsage();

    return {
      memory: {
        heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        rss: (memUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
        external: (memUsage.external / 1024 / 1024).toFixed(2) + ' MB'
      },
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime())
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: process.platform === 'linux' ? require('os').loadavg() : [0, 0, 0]
      }
    };
  } catch (error) {
    logger.error('Error getting system resources', { error: error.message });
    return {
      error: 'Unable to fetch system resources'
    };
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * @route GET /api/metrics/health
 * @desc Quick health check endpoint
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    // Quick database check
    const dbResult = await query('SELECT NOW()');
    const dbHealthy = dbResult.rows.length > 0;

    res.status(200).json({
      success: true,
      message: 'System is healthy',
      data: {
        status: 'healthy',
        database: dbHealthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'System health check failed',
      data: {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message
      }
    });
  }
});

module.exports = router;
