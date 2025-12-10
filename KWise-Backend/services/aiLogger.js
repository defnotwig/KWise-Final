/**
 * AI Logger Service - Comprehensive Metrics Tracking
 * Tracks AI performance, accuracy, resource usage, and alerts
 * 
 * @module AILogger
 * @author K-Wise AI Integration Team
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const crypto = require('crypto');
const db = require('../config/db');

class AILogger {
  constructor(baseLogger) {
    this.logger = baseLogger || logger;
    
    // In-memory metrics (reset daily)
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      fallbackUsage: 0,
      cacheHits: 0,
      avgLatency: 0,
      latencies: [],
      scenarios: {},
      errors: {},
      lastReset: new Date()
    };
    
    // Alert thresholds
    this.thresholds = {
      slowCall: 20000, // 20s
      consecutiveFailures: 5,
      highLatencyP95: 15000, // 15s
      lowSuccessRate: 0.90 // 90%
    };
    
    // Consecutive failure counter for alerting
    this.consecutiveFailures = 0;
  }

  /**
   * Log an AI call with comprehensive metrics
   * @param {string} scenario - AI scenario (compatibility, upgrade, etc.)
   * @param {Object} params - Call parameters
   * @param {Object} result - Call result
   * @param {number} duration - Call duration in ms
   */
  logAICall(scenario, params, result, duration) {
    try {
      // Update metrics
      this.metrics.totalCalls++;
      this.metrics.latencies.push(duration);
      
      // Keep last 1000 latencies
      if (this.metrics.latencies.length > 1000) {
        this.metrics.latencies.shift();
      }
      
      // Calculate rolling average
      this.metrics.avgLatency = 
        this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length;
      
      // Track success/failure
      if (result.success) {
        this.metrics.successfulCalls++;
        this.consecutiveFailures = 0;
      } else {
        this.metrics.failedCalls++;
        this.consecutiveFailures++;
        
        if (result.source === 'fallback') {
          this.metrics.fallbackUsage++;
        }
        
        // Track error types
        const errorType = result.reason || 'unknown';
        this.metrics.errors[errorType] = (this.metrics.errors[errorType] || 0) + 1;
      }
      
      // Track cache hits
      if (result.cached || result.source === 'cache') {
        this.metrics.cacheHits++;
      }
      
      // Track per-scenario metrics
      if (!this.metrics.scenarios[scenario]) {
        this.metrics.scenarios[scenario] = { 
          calls: 0, 
          avgLatency: 0, 
          latencies: [],
          successes: 0,
          failures: 0
        };
      }
      
      this.metrics.scenarios[scenario].calls++;
      this.metrics.scenarios[scenario].latencies.push(duration);
      
      // Keep last 100 latencies per scenario
      if (this.metrics.scenarios[scenario].latencies.length > 100) {
        this.metrics.scenarios[scenario].latencies.shift();
      }
      
      this.metrics.scenarios[scenario].avgLatency = 
        this.metrics.scenarios[scenario].latencies.reduce((a, b) => a + b, 0) 
        / this.metrics.scenarios[scenario].latencies.length;
      
      if (result.success) {
        this.metrics.scenarios[scenario].successes++;
      } else {
        this.metrics.scenarios[scenario].failures++;
      }
      
      // Structured log entry
      this.logger.info('AI_CALL', {
        scenario,
        success: result.success,
        source: result.source,
        latency: duration,
        confidence: result.data?.confidence,
        promptTokens: this.estimateTokens(params.prompt || ''),
        timestamp: new Date().toISOString(),
        circuitState: result.circuitState,
        partsHash: this.hashSensitiveData(params.parts),
        userContextHash: this.hashSensitiveData(params.userContext)
      });
      
      // Alert on anomalies
      this.checkAndAlert(scenario, result, duration);
      
      // Persist to database (async, don't block)
      this.persistAILog(scenario, params, result, duration).catch(err => {
        this.logger.error('Failed to persist AI log', { error: err.message });
      });
      
    } catch (error) {
      this.logger.error('Error in logAICall', { error: error.message });
    }
  }

  /**
   * Check for anomalies and send alerts
   */
  checkAndAlert(scenario, result, duration) {
    // Alert on slow calls
    if (duration > this.thresholds.slowCall) {
      this.logger.warn('SLOW_AI_CALL', { 
        scenario, 
        duration, 
        threshold: this.thresholds.slowCall 
      });
    }
    
    // Alert on consecutive failures
    if (this.consecutiveFailures >= this.thresholds.consecutiveFailures) {
      this.logger.error('CONSECUTIVE_AI_FAILURES', { 
        scenario, 
        count: this.consecutiveFailures,
        reason: result.reason,
        circuitState: result.circuitState
      });
      
      // Notify admin (could integrate with notification service)
      this.notifyAdmin({
        event: 'consecutive_ai_failures',
        scenario,
        failures: this.consecutiveFailures,
        reason: result.reason
      });
    }
    
    // Alert on low success rate (check every 100 calls)
    if (this.metrics.totalCalls % 100 === 0) {
      const successRate = this.metrics.successfulCalls / this.metrics.totalCalls;
      
      if (successRate < this.thresholds.lowSuccessRate) {
        this.logger.warn('LOW_AI_SUCCESS_RATE', {
          successRate: (successRate * 100).toFixed(2) + '%',
          threshold: (this.thresholds.lowSuccessRate * 100) + '%',
          totalCalls: this.metrics.totalCalls,
          failures: this.metrics.failedCalls
        });
      }
    }
  }

  /**
   * Log admin feedback on AI recommendations
   */
  async logAdminFeedback(recommendationId, feedback) {
    try {
      this.logger.info('ADMIN_FEEDBACK', {
        recommendationId,
        accurate: feedback.accurate,
        category: feedback.category,
        notes: feedback.notes,
        timestamp: new Date().toISOString()
      });
      
      // Store in database
      await db.query(
        `INSERT INTO ai_feedback (recommendation_id, accurate, category, specific_issues, corrected_recommendation, admin_notes, admin_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          recommendationId,
          feedback.accurate,
          feedback.category,
          JSON.stringify(feedback.specificIssues || []),
          feedback.correctedRecommendation,
          feedback.notes,
          feedback.adminId
        ]
      );
      
      this.logger.info('✅ Admin feedback stored successfully');
      
    } catch (error) {
      this.logger.error('Error logging admin feedback', { error: error.message });
      throw error;
    }
  }

  /**
   * Persist AI log to database
   * ROOT CAUSE FIX: Changed from ai_metrics (daily aggregated) to ai_audit_logs (individual events)
   * ai_metrics table is for daily aggregated metrics (metric_date, total_calls, successful_calls, etc.)
   * ai_audit_logs table is for individual AI events/calls
   */
  async persistAILog(scenario, params, result, duration) {
    try {
      // Build event data JSON with all relevant metrics
      const eventData = {
        scenario,
        success: result.success,
        source: result.source,
        latency_ms: duration,
        confidence: result.data?.confidence || null,
        prompt_tokens: this.estimateTokens(params.prompt || ''),
        circuit_state: result.circuitState || 'unknown',
        error_type: result.reason || null,
        params: params // Store original parameters for analysis
      };
      
      // Insert into ai_audit_logs (correct table for individual AI events)
      await db.query(
        `INSERT INTO ai_audit_logs (
          event_type,
          event_data,
          created_at
        ) VALUES ($1, $2, NOW())`,
        [
          'recommendation_generated', // Event type for AI calls
          JSON.stringify(eventData)
        ]
      );
      
      // Also update aggregated daily metrics in ai_metrics table
      // This uses INSERT...ON CONFLICT to either insert new row or update existing row for today
      await db.query(
        `INSERT INTO ai_metrics (
          metric_date,
          scenario,
          total_calls,
          successful_calls,
          failed_calls,
          fallback_usage,
          cache_hits,
          avg_latency,
          created_at,
          updated_at
        ) VALUES (
          CURRENT_DATE,
          $1,
          1,
          $2,
          $3,
          $4,
          $5,
          $6,
          NOW(),
          NOW()
        )
        ON CONFLICT (metric_date, scenario)
        DO UPDATE SET
          total_calls = ai_metrics.total_calls + 1,
          successful_calls = ai_metrics.successful_calls + $2,
          failed_calls = ai_metrics.failed_calls + $3,
          fallback_usage = ai_metrics.fallback_usage + $4,
          cache_hits = ai_metrics.cache_hits + $5,
          avg_latency = (ai_metrics.avg_latency * ai_metrics.total_calls + $6) / (ai_metrics.total_calls + 1),
          updated_at = NOW()`,
        [
          scenario,
          result.success ? 1 : 0,
          result.success ? 0 : 1,
          result.source === 'fallback' ? 1 : 0,
          (result.cached || result.source === 'cache') ? 1 : 0,
          duration
        ]
      );
      
    } catch (error) {
      // Silent fail - don't block AI operations
      this.logger.warn('Failed to persist AI metrics', { error: error.message });
    }
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary() {
    const p95 = this.calculatePercentile(this.metrics.latencies, 95);
    const p99 = this.calculatePercentile(this.metrics.latencies, 99);
    
    const successRateNum = this.metrics.totalCalls > 0 
      ? (this.metrics.successfulCalls / this.metrics.totalCalls * 100) 
      : 0;
    
    const fallbackRateNum = this.metrics.totalCalls > 0
      ? (this.metrics.fallbackUsage / this.metrics.totalCalls * 100)
      : 0;
    
    const cacheHitRateNum = this.metrics.totalCalls > 0
      ? (this.metrics.cacheHits / this.metrics.totalCalls * 100)
      : 0;
    
    // Per-scenario metrics
    const scenarioMetrics = {};
    Object.keys(this.metrics.scenarios).forEach(scenario => {
      const data = this.metrics.scenarios[scenario];
      const scenarioSuccessRate = data.calls > 0 
        ? ((data.successes / data.calls) * 100)
        : 0;
      
      scenarioMetrics[scenario] = {
        calls: data.calls,
        avgLatency: Math.round(data.avgLatency) || 0,
        successRate: scenarioSuccessRate,
        successRateFormatted: scenarioSuccessRate.toFixed(2) + '%'
      };
    });
    
    return {
      totalCalls: this.metrics.totalCalls,
      successfulCalls: this.metrics.successfulCalls,
      failedCalls: this.metrics.failedCalls,
      fallbackUsage: this.metrics.fallbackUsage,
      cacheHits: this.metrics.cacheHits,
      successRate: successRateNum,
      successRateFormatted: successRateNum.toFixed(2) + '%',
      fallbackRate: fallbackRateNum,
      fallbackRateFormatted: fallbackRateNum.toFixed(2) + '%',
      cacheHitRate: cacheHitRateNum,
      cacheHitRateFormatted: cacheHitRateNum.toFixed(2) + '%',
      avgLatency: Math.round(this.metrics.avgLatency) || 0,
      avgLatencyMs: Math.round(this.metrics.avgLatency) || 0,
      p95Latency: Math.round(p95) || 0,
      p99Latency: Math.round(p99) || 0,
      scenarios: scenarioMetrics,
      errors: this.metrics.errors,
      lastReset: this.metrics.lastReset,
      consecutiveFailures: this.consecutiveFailures
    };
  }

  /**
   * Get historical metrics from database
   */
  async getHistoricalMetrics(days = 7) {
    try {
      const result = await db.query(
        `SELECT 
          DATE(created_at) as date,
          scenario,
          COUNT(*) as total_calls,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
          AVG(latency_ms) as avg_latency,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency,
          AVG(confidence) as avg_confidence
         FROM ai_metrics
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at), scenario
         ORDER BY date DESC, scenario`,
        []
      );
      
      return result.rows;
    } catch (error) {
      this.logger.error('Error fetching historical metrics', { error: error.message });
      return [];
    }
  }

  /**
   * Calculate percentile from array
   */
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * Estimate tokens from text (rough estimation: ~4 chars per token)
   */
  estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Hash sensitive data for logging
   */
  hashSensitiveData(data) {
    if (!data) return null;
    
    try {
      return crypto
        .createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex')
        .substring(0, 16);
    } catch (error) {
      return null;
    }
  }

  /**
   * Notify admin of critical events
   */
  notifyAdmin(event) {
    // Log for now - can integrate with email/SMS/WebSocket later
    this.logger.warn('ADMIN_NOTIFICATION', event);
    
    // TODO: Integrate with notification service
    // - Email notification
    // - WebSocket push to admin dashboard
    // - SMS for critical alerts
  }

  /**
   * Reset metrics (called daily via cron)
   */
  resetMetrics() {
    this.logger.info('📊 Resetting AI metrics', {
      oldMetrics: this.getMetricsSummary()
    });
    
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      fallbackUsage: 0,
      cacheHits: 0,
      avgLatency: 0,
      latencies: [],
      scenarios: {},
      errors: {},
      lastReset: new Date()
    };
    
    this.consecutiveFailures = 0;
    
    this.logger.info('✅ AI metrics reset complete');
  }

  /**
   * Get consecutive failures count
   */
  getConsecutiveFailures() {
    return this.consecutiveFailures;
  }
}

// Create singleton instance
const aiLogger = new AILogger(logger);

module.exports = aiLogger;
