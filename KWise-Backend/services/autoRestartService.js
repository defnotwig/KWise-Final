/**
 * Auto-Restart Service
 * 
 * Monitors AI Circuit Breaker and Ollama Service health.
 * Automatically restarts the backend when critical failures are detected.
 * 
 * CRITICAL: This service ensures instant recovery from AI service failures
 * without manual intervention.
 */

const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

class AutoRestartService {
  constructor() {
    this.restartInProgress = false;
    this.restartCount = 0;
    this.lastRestartTime = null;
    this.restartCooldown = 30000; // 30 seconds minimum between restarts (faster recovery)
    this.maxRestartsPerHour = 10; // Allow more restarts for AI instability periods
    this.restartHistory = [];
    this.isShuttingDown = false;
    
    // Circuit breaker monitoring
    this.circuitBreakerStateChangeHandler = null;
    this.ollamaHealthCheckInterval = null;
    
    logger.info('🔄 Auto-Restart Service initialized');
  }

  /**
   * Start monitoring AI services for failures
   * @param {Object} aiCircuitBreaker - Circuit breaker instance
   * @param {Object} ollamaService - Ollama service instance (optional)
   */
  startMonitoring(aiCircuitBreaker, ollamaService = null) {
    if (!aiCircuitBreaker) {
      logger.error('❌ Cannot start monitoring: aiCircuitBreaker is required');
      return;
    }

    logger.info('👁️ Starting AI service monitoring for auto-restart...');

    // Monitor circuit breaker state changes
    this.circuitBreakerStateChangeHandler = (event) => {
      const { from, to, timestamp } = event;
      
      logger.info(`🔄 Circuit Breaker State Change: ${from} → ${to}`, {
        timestamp: new Date(timestamp).toISOString()
      });

      // Trigger restart on OPEN or HALF_OPEN states
      if (to === 'OPEN' || to === 'HALF_OPEN') {
        logger.warn(`⚠️ Circuit breaker entered ${to} state - triggering auto-restart`, {
          from,
          to,
          reason: 'AI service failure detected'
        });
        
        this.scheduleRestart({
          reason: `Circuit breaker ${to}`,
          from,
          to,
          timestamp
        });
      }
    };

    aiCircuitBreaker.on('state_change', this.circuitBreakerStateChangeHandler);

    // Monitor circuit breaker opened events
    aiCircuitBreaker.on('circuit_opened', (event) => {
      logger.error('🔴 Circuit breaker OPENED - critical AI failure', event);
      
      this.scheduleRestart({
        reason: 'Circuit breaker opened',
        failureCount: event.failureCount,
        lastError: event.lastError
      });
    });

    // Monitor circuit breaker reopened events (HALF_OPEN test failed)
    aiCircuitBreaker.on('circuit_reopened', (event) => {
      logger.error('🔴 Circuit breaker REOPENED - recovery failed', event);
      
      this.scheduleRestart({
        reason: 'Circuit breaker reopened',
        error: event.error
      });
    });

    // Optional: Monitor Ollama service health (monitoring only, no restarts)
    if (ollamaService) {
      this.startOllamaHealthCheck(ollamaService);
    }

    logger.info('✅ Auto-restart monitoring active');
    logger.info('🎯 Restart triggers: Circuit Breaker OPEN/HALF_OPEN states only');
    logger.info('📊 Ollama health monitoring: Enabled (logging only, no restarts)');
  }

  /**
   * Start periodic health check for Ollama service
   * 🔥 NOTE: This only MONITORS health - it does NOT trigger restarts
   * Restarts are ONLY triggered by Circuit Breaker OPEN/HALF_OPEN states
   * @param {Object} ollamaService - Ollama service instance
   */
  startOllamaHealthCheck(ollamaService) {
    const checkInterval = 10000; // 10 seconds for monitoring
    let consecutiveFailures = 0;
    const failureThreshold = 2;
    const startupGracePeriod = 30000; // 30 seconds grace period
    const startupTime = Date.now();

    this.ollamaHealthCheckInterval = setInterval(async () => {
      try {
        // Skip health checks during startup grace period
        const timeSinceStartup = Date.now() - startupTime;
        if (timeSinceStartup < startupGracePeriod) {
          logger.debug(`🕐 Startup grace period: ${Math.round((startupGracePeriod - timeSinceStartup) / 1000)}s remaining - skipping health check`);
          return;
        }

        const health = await ollamaService.checkHealth();
        
        // Check health.status instead of health.healthy
        const isUnhealthy = health.status === 'unhealthy';
        
        if (isUnhealthy) {
          consecutiveFailures++;
          
          // 🔥 ONLY LOG - DO NOT RESTART
          // Restarts are handled by Circuit Breaker state changes
          logger.warn(`⚠️ Ollama service unhealthy (${consecutiveFailures}/${failureThreshold}) - monitoring only, restart handled by Circuit Breaker`, {
            status: health.status,
            error: health.error
          });
        } else {
          // Reset consecutive failures on healthy status
          if (consecutiveFailures > 0) {
            logger.debug(`✅ Ollama service recovered - resetting failure count from ${consecutiveFailures}`);
          }
          consecutiveFailures = 0;
        }
      } catch (error) {
        consecutiveFailures++;
        
        // 🔥 ONLY LOG - DO NOT RESTART
        logger.warn(`⚠️ Ollama health check error (${consecutiveFailures}/${failureThreshold}) - monitoring only`, {
          error: error.message
        });
      }
    }, checkInterval);

    logger.info(`✅ Ollama health monitoring started (${checkInterval}ms interval) - monitoring only, restarts controlled by Circuit Breaker`);
  }

  /**
   * Schedule a backend restart with safety checks
   * @param {Object} context - Restart context for logging
   */
  scheduleRestart(context = {}) {
    // Safety check: Don't restart if already in progress
    if (this.restartInProgress) {
      logger.warn('⚠️ Restart already in progress, skipping...', context);
      return;
    }

    // Safety check: Don't restart if already shutting down
    if (this.isShuttingDown) {
      logger.warn('⚠️ Server is shutting down, skipping restart...', context);
      return;
    }

    // Safety check: Cooldown period
    const now = Date.now();
    if (this.lastRestartTime && (now - this.lastRestartTime) < this.restartCooldown) {
      const remainingCooldown = Math.round((this.restartCooldown - (now - this.lastRestartTime)) / 1000);
      logger.warn(`⚠️ Restart cooldown active (${remainingCooldown}s remaining)`, context);
      return;
    }

    // Safety check: Max restarts per hour
    const oneHourAgo = now - (60 * 60 * 1000);
    this.restartHistory = this.restartHistory.filter(time => time > oneHourAgo);
    
    if (this.restartHistory.length >= this.maxRestartsPerHour) {
      logger.error('❌ RESTART LOOP DETECTED - too many restarts in past hour', {
        restartsInLastHour: this.restartHistory.length,
        maxAllowed: this.maxRestartsPerHour,
        context
      });
      
      // TODO: Send critical alert to admin
      logger.error('🚨 CRITICAL: Backend restart loop detected - manual intervention required');
      return;
    }

    // All safety checks passed - proceed with restart
    this.executeRestart(context);
  }

  /**
   * Execute the actual restart
   * @param {Object} context - Restart context for logging
   */
  executeRestart(context = {}) {
    this.restartInProgress = true;
    this.restartCount++;
    const now = Date.now();
    this.lastRestartTime = now;
    this.restartHistory.push(now);

    logger.warn('🔄 INITIATING BACKEND AUTO-RESTART', {
      restartNumber: this.restartCount,
      totalRestartsThisHour: this.restartHistory.length,
      ...context
    });

    // Log restart to file for audit trail
    logger.info('📝 Restart logged to audit trail', {
      timestamp: new Date(now).toISOString(),
      reason: context.reason || 'Unknown',
      restartCount: this.restartCount
    });

    // Give a brief moment for logs to flush
    setTimeout(() => {
      logger.warn('🔄 Executing restart NOW...');
      
      // Clean shutdown with restart
      this.performRestart();
    }, 1000);
  }

  /**
   * Perform the actual restart operation
   */
  performRestart() {
    try {
      const isWindows = process.platform === 'win32';
      const serverPath = path.join(__dirname, '..', 'server.js');
      
      logger.info('🔄 Restart details:', {
        platform: process.platform,
        serverPath,
        nodeExecutable: process.execPath,
        args: process.argv
      });

      // For development with nodemon, simply exit - nodemon will restart
      // Check multiple indicators for dev mode
      const isDevMode = process.env.NODE_ENV !== 'production' || 
                       process.env.npm_lifecycle_event === 'dev' ||
                       process.env.npm_lifecycle_event === 'start' ||
                       process.argv.some(arg => arg.includes('nodemon'));
      
      if (isDevMode) {
        logger.warn('🔄 DEV MODE: Exiting process - nodemon/dev server will restart automatically');
        logger.warn('🔄 Exit code: 1 (error) to ensure restart');
        
        // Force immediate exit without waiting for pending operations
        setImmediate(() => {
          process.exit(1); // Exit with error code to trigger nodemon restart
        });
        return;
      }

      // For production with PM2, exit with code 0 - PM2 will restart
      if (process.env.PM2_HOME || process.env.PM_ID) {
        logger.warn('🔄 PM2 MODE: Exiting process - PM2 will restart automatically');
        process.exit(0); // PM2 will restart on any exit
        return;
      }

      // For standalone Node process, spawn new instance
      logger.warn('🔄 STANDALONE MODE: Spawning new process...');
      
      const child = spawn(process.execPath, [serverPath], {
        detached: true,
        stdio: 'inherit',
        env: process.env,
        cwd: path.join(__dirname, '..')
      });

      child.unref(); // Allow parent to exit
      
      logger.info('✅ New process spawned, shutting down current process...');
      
      // Exit current process
      setTimeout(() => {
        process.exit(0);
      }, 500);

    } catch (error) {
      logger.error('❌ Failed to restart backend:', {
        error: error.message,
        stack: error.stack
      });
      
      // If spawn fails, just exit and let process manager handle it
      logger.error('🔴 Restart failed - exiting to allow manual recovery');
      process.exit(1);
    }
  }

  /**
   * Stop monitoring and cleanup
   */
  stopMonitoring() {
    logger.info('🛑 Stopping auto-restart monitoring...');
    
    this.isShuttingDown = true;

    if (this.ollamaHealthCheckInterval) {
      clearInterval(this.ollamaHealthCheckInterval);
      this.ollamaHealthCheckInterval = null;
    }

    // Note: We don't remove circuit breaker listeners here
    // because we want restarts to work until the very end
    
    logger.info('✅ Auto-restart monitoring stopped');
  }

  /**
   * Get service status
   * @returns {Object} - Status details
   */
  getStatus() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const restartsInLastHour = this.restartHistory.filter(time => time > oneHourAgo).length;
    
    return {
      enabled: !this.isShuttingDown,
      restartInProgress: this.restartInProgress,
      totalRestarts: this.restartCount,
      restartsInLastHour,
      lastRestartTime: this.lastRestartTime ? new Date(this.lastRestartTime).toISOString() : null,
      cooldownActive: this.lastRestartTime && (now - this.lastRestartTime) < this.restartCooldown,
      cooldownRemaining: this.lastRestartTime ? Math.max(0, Math.round((this.restartCooldown - (now - this.lastRestartTime)) / 1000)) : 0,
      restartLoopRisk: restartsInLastHour >= (this.maxRestartsPerHour - 1),
      config: {
        restartCooldown: `${this.restartCooldown / 1000}s`,
        maxRestartsPerHour: this.maxRestartsPerHour
      }
    };
  }

  /**
   * Manually trigger a restart (for testing or admin control)
   * @param {String} reason - Reason for manual restart
   */
  manualRestart(reason = 'Manual trigger') {
    logger.warn('🔧 Manual restart triggered', { reason });
    
    this.scheduleRestart({
      reason,
      manual: true,
      triggeredBy: 'admin'
    });
  }
}

// Export singleton instance
const autoRestartService = new AutoRestartService();

module.exports = autoRestartService;
