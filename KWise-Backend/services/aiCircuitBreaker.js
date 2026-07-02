/**
 * AI Circuit Breaker System for K-Wise
 * Implements circuit breaker pattern with health monitoring
 * Provides graceful degradation when AI service is unreliable
 * 
 * @module AICircuitBreaker
 * @author K-Wise AI Integration Team
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const EventEmitter = require('node:events');

/**
 * Circuit Breaker States:
 * - CLOSED: Service is healthy, requests pass through
 * - OPEN: Service is failing, requests fail fast with fallback
 * - HALF_OPEN: Testing if service has recovered
 */
class AICircuitBreaker extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    
    this.config = {
      failureThreshold: config.failureThreshold || 5, // Open circuit after 5 consecutive failures
      successThreshold: config.successThreshold || 3, // Close circuit after 3 consecutive successes
      timeout: config.timeout || 60000, // Try again after 60s in OPEN state
      slowCallThreshold: config.slowCallThreshold || 15000, // Consider >15s response as slow
      halfOpenMaxCalls: config.halfOpenMaxCalls || 3 // Max calls to test in HALF_OPEN state
    };
    
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      fallbackCalls: 0,
      circuitOpens: 0,
      circuitCloses: 0,
      avgLatency: 0,
      latencies: []
    };
    
    this.halfOpenCallCount = 0;
    
    logger.info('🔌 AI Circuit Breaker initialized', {
      state: this.state,
      config: this.config
    });
  }

  /**
   * Execute function with circuit breaker protection
   * @param {Function} fn - Async function to execute
   * @param {*} fallback - Fallback value if circuit is open
   * @param {Object} context - Context for logging
   * @returns {Promise<Object>} - Result with success status
   */
  async call(fn, fallback, context = {}) {
    this.metrics.totalCalls++;
    
    // Check circuit state
    if (this.state === 'OPEN') {
      // Check if timeout has passed to transition to HALF_OPEN
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.transitionTo('HALF_OPEN');
        logger.info('🔄 Circuit breaker: OPEN → HALF_OPEN (testing recovery)', context);
      } else {
        // Circuit is still open, use fallback
        this.metrics.fallbackCalls++;
        logger.warn('⚡ Circuit breaker OPEN - using fallback', {
          ...context,
          timeSinceLastFailure: `${Math.floor((Date.now() - this.lastFailureTime) / 1000)}s`,
          nextRetry: `${Math.floor((this.config.timeout - (Date.now() - this.lastFailureTime)) / 1000)}s`
        });
        
        return {
          success: false,
          data: fallback,
          source: 'fallback',
          reason: 'circuit_open',
          circuitState: this.state
        };
      }
    }
    
    // HALF_OPEN: Limit number of test calls
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
        this.metrics.fallbackCalls++;
        return {
          success: false,
          data: fallback,
          source: 'fallback',
          reason: 'half_open_limit_reached',
          circuitState: this.state
        };
      }
      this.halfOpenCallCount++;
    }
    
    // Execute the function with timeout protection
    try {
      const startTime = Date.now();
      
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Slow call timeout')), this.config.slowCallThreshold)
        )
      ]);
      
      const latency = Date.now() - startTime;
      
      // Success
      this.onSuccess(latency, context);
      
      return {
        success: true,
        data: result,
        source: 'ai',
        latency,
        circuitState: this.state
      };
      
    } catch (error) {
      // Failure
      this.onFailure(error, context);
      this.metrics.fallbackCalls++;
      
      logger.error('❌ AI call failed, using fallback', {
        ...context,
        error: error.message,
        state: this.state,
        failureCount: this.failureCount
      });
      
      return {
        success: false,
        data: fallback,
        source: 'fallback',
        reason: error.message,
        circuitState: this.state
      };
    }
  }

  /**
   * Handle successful call
   * @param {Number} latency - Call latency in ms
   * @param {Object} context - Context for logging
   */
  onSuccess(latency, context = {}) {
    this.failureCount = 0;
    this.lastSuccessTime = Date.now();
    this.metrics.successfulCalls++;
    
    // Track latency
    this.metrics.latencies.push(latency);
    if (this.metrics.latencies.length > 1000) {
      this.metrics.latencies.shift(); // Keep last 1000
    }
    this.metrics.avgLatency = this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
        this.halfOpenCallCount = 0;
        logger.info('✅ Circuit breaker: HALF_OPEN → CLOSED (service recovered)', {
          ...context,
          consecutiveSuccesses: this.successCount,
          latency: `${latency}ms`
        });
        
        this.emit('circuit_closed', {
          successCount: this.successCount,
          latency
        });
      }
    }
    
    logger.debug('✅ AI call successful', {
      ...context,
      latency: `${latency}ms`,
      state: this.state
    });
  }

  /**
   * Handle failed call
   * @param {Error} error - Error object
   * @param {Object} context - Context for logging
   */
  onFailure(error, context = {}) {
    this.successCount = 0;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.metrics.failedCalls++;
    
    if (this.state === 'HALF_OPEN') {
      // Single failure in HALF_OPEN reopens circuit
      this.transitionTo('OPEN');
      this.halfOpenCallCount = 0;
      logger.warn('⚠️ Circuit breaker: HALF_OPEN → OPEN (test failed)', {
        ...context,
        error: error.message
      });
      
      this.emit('circuit_reopened', {
        error: error.message
      });
      
      this.notifyAdmin({
        event: 'circuit_reopened',
        failures: this.failureCount,
        lastError: error.message
      });
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Threshold reached, open circuit
      this.transitionTo('OPEN');
      this.metrics.circuitOpens++;
      
      logger.error('🔴 Circuit breaker OPEN - AI service unstable', {
        ...context,
        consecutiveFailures: this.failureCount,
        threshold: this.config.failureThreshold,
        error: error.message
      });
      
      this.emit('circuit_opened', {
        failureCount: this.failureCount,
        lastError: error.message
      });
      
      this.notifyAdmin({
        event: 'circuit_breaker_opened',
        failures: this.failureCount,
        lastError: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Transition to new state
   * @param {String} newState - New circuit state
   */
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    
    if (newState === 'CLOSED') {
      this.metrics.circuitCloses++;
      this.successCount = 0;
      this.failureCount = 0;
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenCallCount = 0;
    }
    
    this.emit('state_change', {
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });
  }

  /**
   * Notify admin of circuit breaker events
   * @param {Object} event - Event details
   */
  notifyAdmin(event) {
    // Emit event for external notification systems
    this.emit('admin_notification', event);
    
    logger.warn('📧 Admin notification queued', event);
    
    // TODO: Integrate with admin notification system
    // - Email notification
    // - WebSocket notification to admin dashboard
    // - SMS for critical events
  }

  /**
   * Get current circuit breaker status
   * @returns {Object} - Status details
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      lastSuccess: this.lastSuccessTime ? new Date(this.lastSuccessTime).toISOString() : null,
      config: this.config,
      metrics: {
        totalCalls: this.metrics.totalCalls,
        successfulCalls: this.metrics.successfulCalls,
        failedCalls: this.metrics.failedCalls,
        fallbackCalls: this.metrics.fallbackCalls,
        successRate: this.metrics.totalCalls > 0 
          ? `${(this.metrics.successfulCalls / this.metrics.totalCalls * 100).toFixed(2)}%` 
          : '0%',
        fallbackRate: this.metrics.totalCalls > 0 
          ? `${(this.metrics.fallbackCalls / this.metrics.totalCalls * 100).toFixed(2)}%` 
          : '0%',
        avgLatency: `${Math.round(this.metrics.avgLatency)}ms`,
        circuitOpens: this.metrics.circuitOpens,
        circuitCloses: this.metrics.circuitCloses
      },
      healthy: this.state === 'CLOSED',
      degraded: this.state === 'HALF_OPEN',
      unhealthy: this.state === 'OPEN'
    };
  }

  /**
   * Get detailed metrics
   * @returns {Object} - Detailed metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      p50Latency: this.calculatePercentile(this.metrics.latencies, 50),
      p95Latency: this.calculatePercentile(this.metrics.latencies, 95),
      p99Latency: this.calculatePercentile(this.metrics.latencies, 99),
      maxLatency: Math.max(...this.metrics.latencies, 0)
    };
  }

  /**
   * Calculate percentile from latency array
   * @param {Array<Number>} arr - Latency values
   * @param {Number} percentile - Percentile to calculate
   * @returns {Number} - Percentile value
   */
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
    return sorted[index] || 0;
  }

  /**
   * Reset circuit breaker state (for testing or manual intervention)
   */
  reset() {
    const oldState = this.state;
    this.transitionTo('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCallCount = 0;
    this.lastFailureTime = null;
    
    logger.info('🔄 Circuit breaker manually reset', {
      from: oldState,
      to: this.state
    });
    
    this.emit('manual_reset', {
      previousState: oldState,
      timestamp: Date.now()
    });
  }

  /**
   * Force circuit open (for testing or maintenance)
   */
  forceOpen() {
    this.transitionTo('OPEN');
    this.lastFailureTime = Date.now();
    
    logger.warn('🔴 Circuit breaker manually opened', {
      timestamp: new Date().toISOString()
    });
    
    this.emit('force_open', {
      timestamp: Date.now()
    });
  }

  /**
   * Check if circuit allows requests
   * @returns {Boolean} - True if requests are allowed
   */
  isRequestAllowed() {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF_OPEN') return this.halfOpenCallCount < this.config.halfOpenMaxCalls;
    return false; // OPEN state
  }

  /**
   * Get current circuit breaker state
   * ROOT CAUSE FIX #7: Added for health monitoring endpoint
   * @returns {String} - Current state (CLOSED, OPEN, HALF_OPEN)
   */
  getState() {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   * ROOT CAUSE FIX #7: Added for health monitoring and telemetry
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      metrics: {
        totalCalls: this.metrics.totalCalls,
        successfulCalls: this.metrics.successfulCalls,
        failedCalls: this.metrics.failedCalls,
        fallbackCalls: this.metrics.fallbackCalls,
        circuitOpens: this.metrics.circuitOpens,
        circuitCloses: this.metrics.circuitCloses,
        avgLatency: Math.round(this.metrics.avgLatency),
        successRate: this.metrics.totalCalls > 0 
          ? Number.parseFloat((this.metrics.successfulCalls / this.metrics.totalCalls * 100).toFixed(2))
          : 0
      },
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime
    };
  }
}

// Create singleton instance with PHASE 3 optimized settings
const aiCircuitBreaker = new AICircuitBreaker({
  failureThreshold: 10,        // PHASE 3: Allow more failures before opening (was 5)
  successThreshold: 2,         // Recover quickly (keep 2)
  timeout: 30000,              // 30s retry window
  slowCallThreshold: 45000,    // 🔥 ROOT CAUSE FIX: DeepSeek R1 1.5B needs 30-40s for compatibility analysis (was 12s)
  halfOpenMaxCalls: 3          // PHASE 3: Allow more test calls (was 2)
});

module.exports = aiCircuitBreaker;
