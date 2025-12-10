/**
 * System Metrics Routes
 * Provides real-time system performance monitoring data
 */

const express = require('express');
const router = express.Router();
const os = require('os');
const db = require('../config/db');

// Store metrics history in memory
const metricsHistory = {
  requests: [],
  responseTimes: [],
  errors: [],
  maxHistorySize: 1000
};

// Middleware to track request metrics
let requestCount = 0;
let errorCount = 0;
let peakThroughput = 0;
let peakUsers = 0;
let totalSessions = 0;
const activeUsers = new Set();

// Track request and response times
router.use((req, res, next) => {
  req.startTime = Date.now();
  requestCount++;
  
  // Track user session
  if (req.user) {
    if (!activeUsers.has(req.user.id)) {
      activeUsers.add(req.user.id);
      totalSessions++;
    }
  }
  
  // Override res.json to capture response time
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - req.startTime;
    
    metricsHistory.responseTimes.push({
      timestamp: Date.now(),
      time: responseTime,
      path: req.path
    });
    
    // Keep only recent metrics
    if (metricsHistory.responseTimes.length > metricsHistory.maxHistorySize) {
      metricsHistory.responseTimes.shift();
    }
    
    return originalJson.call(this, data);
  };
  
  next();
});

// Calculate percentile
function calculatePercentile(arr, percentile) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

// GET /api/system/metrics - Get current system metrics
router.get('/metrics', async (req, res) => {
  try {
    // Calculate throughput (requests per second over last minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = metricsHistory.responseTimes.filter(
      r => r.timestamp > oneMinuteAgo
    );
    const currentThroughput = recentRequests.length / 60;
    
    if (currentThroughput > peakThroughput) {
      peakThroughput = currentThroughput;
    }
    
    // Calculate response time statistics
    const responseTimes = metricsHistory.responseTimes
      .filter(r => r.timestamp > oneMinuteAgo)
      .map(r => r.time);
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    const p50 = calculatePercentile(responseTimes, 50);
    const p95 = calculatePercentile(responseTimes, 95);
    const p99 = calculatePercentile(responseTimes, 99);
    
    // Calculate error rate
    const recentErrors = metricsHistory.errors.filter(
      e => e.timestamp > oneMinuteAgo
    );
    const errorRate = recentRequests.length > 0
      ? (recentErrors.length / recentRequests.length) * 100
      : 0;
    
    const last24hErrors = metricsHistory.errors.filter(
      e => e.timestamp > Date.now() - 86400000
    ).length;
    
    // Database metrics
    let dbMetrics = {
      queryTime: { average: 0, p95: 0 },
      connections: { active: 0, max: 10 },
      slowQueries: 0,
      size: 0,
      tables: 0
    };
    
    try {
      // Get database size
      const sizeResult = await db.query(`
        SELECT pg_database_size(current_database()) as size
      `);
      dbMetrics.size = sizeResult.rows[0]?.size || 0;
      
      // Get table count
      const tablesResult = await db.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      dbMetrics.tables = parseInt(tablesResult.rows[0]?.count || 0);
      
      // Get connection count
      const connectionsResult = await db.query(`
        SELECT count(*) as active
        FROM pg_stat_activity
        WHERE state = 'active'
      `);
      dbMetrics.connections.active = parseInt(connectionsResult.rows[0]?.active || 0);
      
      // Simulate query time metrics (in production, track actual query times)
      const queryStart = Date.now();
      await db.query('SELECT 1');
      const queryTime = Date.now() - queryStart;
      
      dbMetrics.queryTime.average = queryTime;
      dbMetrics.queryTime.p95 = queryTime * 1.2; // Estimate
    } catch (dbError) {
      console.error('Error fetching database metrics:', dbError);
    }
    
    // System resources
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    
    // Update peak users
    if (activeUsers.size > peakUsers) {
      peakUsers = activeUsers.size;
    }
    
    // Compile all metrics
    const metrics = {
      throughput: {
        current: currentThroughput.toFixed(2),
        peak: peakThroughput.toFixed(2),
        total: requestCount
      },
      responseTime: {
        average: avgResponseTime,
        p50: p50,
        p95: p95,
        p99: p99
      },
      users: {
        active: activeUsers.size,
        peak: peakUsers,
        total: totalSessions
      },
      errors: {
        rate: errorRate,
        total: errorCount,
        last24h: last24hErrors
      },
      database: dbMetrics,
      system: {
        cpu: {
          usage: cpuUsage,
          cores: os.cpus().length
        },
        memory: {
          usage: memoryUsage,
          used: usedMemory,
          total: totalMemory,
          free: freeMemory
        },
        uptime: os.uptime(),
        platform: os.platform()
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: metrics,
      message: 'System metrics retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system metrics',
      error: error.message
    });
  }
});

// POST /api/system/metrics/error - Track error occurrence
router.post('/metrics/error', (req, res) => {
  try {
    errorCount++;
    
    metricsHistory.errors.push({
      timestamp: Date.now(),
      message: req.body.message || 'Unknown error',
      path: req.body.path || 'Unknown'
    });
    
    // Keep only recent errors
    if (metricsHistory.errors.length > metricsHistory.maxHistorySize) {
      metricsHistory.errors.shift();
    }
    
    res.json({
      success: true,
      message: 'Error tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking error metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track error',
      error: error.message
    });
  }
});

// GET /api/system/metrics/history - Get metrics history
router.get('/metrics/history', (req, res) => {
  try {
    const duration = parseInt(req.query.duration) || 60; // minutes
    const cutoff = Date.now() - (duration * 60 * 1000);
    
    const history = {
      responseTimes: metricsHistory.responseTimes.filter(r => r.timestamp > cutoff),
      errors: metricsHistory.errors.filter(e => e.timestamp > cutoff),
      totalRequests: requestCount,
      totalErrors: errorCount
    };
    
    res.json({
      success: true,
      data: history,
      message: 'Metrics history retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching metrics history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics history',
      error: error.message
    });
  }
});

// DELETE /api/system/metrics/reset - Reset metrics (admin only)
router.delete('/metrics/reset', (req, res) => {
  try {
    requestCount = 0;
    errorCount = 0;
    peakThroughput = 0;
    peakUsers = 0;
    totalSessions = 0;
    activeUsers.clear();
    metricsHistory.requests = [];
    metricsHistory.responseTimes = [];
    metricsHistory.errors = [];
    
    res.json({
      success: true,
      message: 'Metrics reset successfully'
    });
  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset metrics',
      error: error.message
    });
  }
});

module.exports = router;
