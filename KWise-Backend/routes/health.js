/**
 * Health Monitoring Endpoints
 * Provides comprehensive system health checks and recovery capabilities
 * 
 * ROOT CAUSE FIX #7: Architecture Improvements - Health Monitoring System
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); // Fixed: use db.js instead of database.js
const logger = require('../utils/logger');
const ollamaService = require('../ai/services/ollamaService');
const aiCircuitBreaker = require('../services/aiCircuitBreaker'); // Fixed path

/**
 * Basic Health Check
 * GET /api/health
 * Quick health status for load balancers
 */
router.get('/', async (req, res) => {
  try {
    // Quick database ping
    await pool.query('SELECT 1');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'k-wise-backend'
    });
  } catch (error) {
    logger.error('❌ Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

/**
 * Detailed Health Check
 * GET /api/health/detailed
 * Comprehensive system health information
 */
router.get('/detailed', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'k-wise-backend',
      components: {},
      metrics: {}
    };

    // 1. Database Health
    try {
      const dbStart = Date.now();
      const dbResult = await pool.query('SELECT COUNT(*) as count FROM users');
      const dbLatency = Date.now() - dbStart;
      
      healthStatus.components.database = {
        status: 'healthy',
        latency_ms: dbLatency,
        pool_total: pool.totalCount,
        pool_idle: pool.idleCount,
        pool_waiting: pool.waitingCount,
        user_count: Number.parseInt(dbResult.rows[0].count, 10)
      };
    } catch (dbError) {
      healthStatus.status = 'degraded';
      healthStatus.components.database = {
        status: 'unhealthy',
        error: dbError.message
      };
    }

    // 2. AI Service Health
    try {
      const aiHealthy = await ollamaService.checkHealth();
      const selectedModel = ollamaService.getSelectedModel();
      
      healthStatus.components.ai_service = {
        status: aiHealthy ? 'healthy' : 'unhealthy',
        provider: 'ollama',
        selected_model: selectedModel,
        available: aiHealthy
      };

      // Circuit breaker status
      const circuitState = aiCircuitBreaker.getState();
      healthStatus.components.circuit_breaker = {
        state: circuitState,
        healthy: circuitState === 'closed'
      };
    } catch (aiError) {
      healthStatus.status = 'degraded';
      healthStatus.components.ai_service = {
        status: 'unhealthy',
        error: aiError.message
      };
    }

    // 2.5. Auto-Restart Service Health
    try {
      const autoRestartService = global.autoRestartService;
      if (autoRestartService) {
        const restartStatus = autoRestartService.getStatus();
        healthStatus.components.auto_restart = {
          status: restartStatus.enabled ? 'healthy' : 'disabled',
          restart_in_progress: restartStatus.restartInProgress,
          total_restarts: restartStatus.totalRestarts,
          restarts_last_hour: restartStatus.restartsInLastHour,
          cooldown_active: restartStatus.cooldownActive,
          restart_loop_risk: restartStatus.restartLoopRisk
        };
      } else {
        healthStatus.components.auto_restart = {
          status: 'not_initialized',
          message: 'Auto-restart service not available'
        };
      }
    } catch (restartError) {
      healthStatus.components.auto_restart = {
        status: 'error',
        error: restartError.message
      };
    }

    // 3. Memory Metrics
    const memUsage = process.memoryUsage();
    healthStatus.metrics.memory = {
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      external_mb: Math.round(memUsage.external / 1024 / 1024)
    };

    // 4. CPU Metrics
    healthStatus.metrics.cpu = {
      usage_percent: process.cpuUsage().user / 1000000, // Convert to seconds
      load_average: require('node:os').loadavg()
    };

    // 5. System Info
    healthStatus.metrics.system = {
      platform: process.platform,
      node_version: process.version,
      uptime_hours: Math.round(process.uptime() / 3600 * 100) / 100
    };

    // Determine overall status
    const unhealthyComponents = Object.values(healthStatus.components)
      .filter(c => c.status === 'unhealthy').length;
    
    if (unhealthyComponents > 0) {
      healthStatus.status = unhealthyComponents === Object.keys(healthStatus.components).length 
        ? 'unhealthy' 
        : 'degraded';
    }

    res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
  } catch (error) {
    logger.error('❌ Detailed health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Component-Specific Health Checks
 * GET /api/health/components/:component
 * Check individual component health
 */
router.get('/components/:component', async (req, res) => {
  const { component } = req.params;

  try {
    switch (component) {
      case 'database':
        const dbStart = Date.now();
        const result = await pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM users) as users,
            (SELECT COUNT(*) FROM pc_parts) as parts,
            (SELECT COUNT(*) FROM orders) as orders,
            (SELECT COUNT(*) FROM audit_logs) as logs
        `);
        const dbLatency = Date.now() - dbStart;

        return res.json({
          component: 'database',
          status: 'healthy',
          latency_ms: dbLatency,
          pool: {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
          },
          tables: result.rows[0]
        });

      case 'ai':
        const aiHealthy = await ollamaService.checkHealth();
        const models = await ollamaService.getAvailableModels();
        const circuitState = aiCircuitBreaker.getState();

        return res.json({
          component: 'ai_service',
          status: aiHealthy ? 'healthy' : 'unhealthy',
          provider: 'ollama',
          selected_model: ollamaService.getSelectedModel(),
          available_models: models,
          circuit_breaker: {
            state: circuitState,
            healthy: circuitState === 'closed'
          }
        });

      case 'memory':
        const memUsage = process.memoryUsage();
        return res.json({
          component: 'memory',
          status: 'healthy',
          heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss_mb: Math.round(memUsage.rss / 1024 / 1024),
          external_mb: Math.round(memUsage.external / 1024 / 1024)
        });

      case 'circuit-breaker':
        const state = aiCircuitBreaker.getState();
        const stats = aiCircuitBreaker.getStats();
        
        return res.json({
          component: 'circuit_breaker',
          status: state === 'closed' ? 'healthy' : state === 'open' ? 'unhealthy' : 'degraded',
          state: state,
          stats: stats
        });

      default:
        return res.status(404).json({
          error: 'Component not found',
          available_components: ['database', 'ai', 'memory', 'circuit-breaker']
        });
    }
  } catch (error) {
    logger.error(`❌ Component health check failed for ${component}`, { error: error.message });
    res.status(503).json({
      component,
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * Recovery Actions
 * POST /api/health/recovery
 * Trigger recovery actions for degraded services
 */
router.post('/recovery', async (req, res) => {
  const { component, action } = req.body;

  if (!component || !action) {
    return res.status(400).json({
      error: 'Missing required fields: component, action'
    });
  }

  logger.info(`🔧 Recovery action triggered`, { component, action });

  try {
    switch (component) {
      case 'circuit-breaker':
        if (action === 'reset') {
          aiCircuitBreaker.reset();
          logger.info('✅ Circuit breaker reset');
          return res.json({
            success: true,
            component: 'circuit-breaker',
            action: 'reset',
            message: 'Circuit breaker has been reset'
          });
        }
        break;

      case 'database':
        if (action === 'reconnect') {
          // Test database connection
          await pool.query('SELECT 1');
          logger.info('✅ Database connection verified');
          return res.json({
            success: true,
            component: 'database',
            action: 'reconnect',
            message: 'Database connection verified'
          });
        }
        break;

      case 'ai':
        if (action === 'warmup') {
          // Warm up AI service with a simple query
          const aiHealthy = await ollamaService.checkHealth();
          if (aiHealthy) {
            logger.info('✅ AI service warmed up');
            return res.json({
              success: true,
              component: 'ai',
              action: 'warmup',
              message: 'AI service is ready'
            });
          } else {
            throw new Error('AI service not available');
          }
        }
        break;

      case 'memory':
        if (action === 'gc') {
          if (global.gc) {
            global.gc();
            logger.info('✅ Garbage collection triggered');
            return res.json({
              success: true,
              component: 'memory',
              action: 'gc',
              message: 'Garbage collection completed'
            });
          } else {
            return res.status(400).json({
              error: 'Garbage collection not available. Start Node with --expose-gc flag'
            });
          }
        }
        break;

      default:
        return res.status(400).json({
          error: 'Invalid component or action',
          available_components: ['circuit-breaker', 'database', 'ai', 'memory'],
          available_actions: {
            'circuit-breaker': ['reset'],
            'database': ['reconnect'],
            'ai': ['warmup'],
            'memory': ['gc']
          }
        });
    }

    res.status(400).json({
      error: 'Invalid action for component'
    });
  } catch (error) {
    logger.error(`❌ Recovery action failed`, { component, action, error: error.message });
    res.status(500).json({
      success: false,
      component,
      action,
      error: error.message
    });
  }
});

/**
 * Readiness Check
 * GET /api/health/ready
 * Check if service is ready to accept requests
 */
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    await pool.query('SELECT 1');
    const aiHealthy = await ollamaService.checkHealth();

    if (aiHealthy) {
      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        ready: false,
        reason: 'AI service not available',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness Check
 * GET /api/health/live
 * Check if service is alive (for Kubernetes liveness probes)
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString()
  });
});

/**
 * 🔥 ROOT CAUSE FIX #4: Circuit Breaker Management Endpoints
 * GET /api/health/circuit-breaker
 * Get current circuit breaker status
 */
router.get('/circuit-breaker', (req, res) => {
  try {
    const status = aiCircuitBreaker.getStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get circuit breaker status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve circuit breaker status',
      error: error.message
    });
  }
});

/**
 * POST /api/health/circuit-breaker/reset
 * Manually reset circuit breaker to CLOSED state
 */
router.post('/circuit-breaker/reset', (req, res) => {
  try {
    const oldStatus = aiCircuitBreaker.getStatus();
    
    aiCircuitBreaker.reset();
    
    const newStatus = aiCircuitBreaker.getStatus();
    
    logger.info('✅ Circuit breaker manually reset', {
      from: oldStatus.state,
      to: newStatus.state
    });
    
    res.json({
      success: true,
      message: 'Circuit breaker reset successfully',
      previousState: oldStatus.state,
      currentState: newStatus.state,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to reset circuit breaker:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset circuit breaker',
      error: error.message
    });
  }
});

/**
 * 🔄 AUTO-RESTART SERVICE ENDPOINTS
 * Monitor and control automatic backend restart on AI failures
 */

/**
 * GET /api/health/auto-restart
 * Get auto-restart service status
 */
router.get('/auto-restart', (req, res) => {
  try {
    const autoRestartService = global.autoRestartService;
    
    if (!autoRestartService) {
      return res.status(503).json({
        success: false,
        message: 'Auto-restart service not initialized',
        timestamp: new Date().toISOString()
      });
    }
    
    const status = autoRestartService.getStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get auto-restart status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve auto-restart status',
      error: error.message
    });
  }
});

/**
 * POST /api/health/auto-restart/trigger
 * Manually trigger a backend restart (admin only)
 */
router.post('/auto-restart/trigger', (req, res) => {
  try {
    const autoRestartService = global.autoRestartService;
    
    if (!autoRestartService) {
      return res.status(503).json({
        success: false,
        message: 'Auto-restart service not initialized',
        timestamp: new Date().toISOString()
      });
    }
    
    const { reason = 'Manual admin trigger' } = req.body;
    
    logger.warn('🔧 Manual restart triggered by admin', { reason });
    
    // Send response before restart
    res.json({
      success: true,
      message: 'Backend restart initiated',
      reason,
      timestamp: new Date().toISOString()
    });
    
    // Trigger restart after response is sent
    setTimeout(() => {
      autoRestartService.manualRestart(reason);
    }, 500);
    
  } catch (error) {
    logger.error('❌ Failed to trigger restart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger restart',
      error: error.message
    });
  }
});

module.exports = router;
