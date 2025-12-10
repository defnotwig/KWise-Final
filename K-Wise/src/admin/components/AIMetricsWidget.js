/**
 * AI Metrics Widget - Real-time AI Performance Dashboard
 * Displays comprehensive AI health metrics for admin monitoring
 * 
 * @component AIMetricsWidget
 * @author K-Wise AI Integration Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import './AIMetricsWidget.css';
import './AIMetricsWidget.css';

const AIMetricsWidget = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch metrics from API
  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('http://localhost:5000/api/ai-metrics/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
        setLastUpdate(new Date(data.timestamp));
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to fetch metrics');
      }
    } catch (err) {
      console.error('Failed to fetch AI metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Helper function to get status color
  const getStatusColor = (value, thresholds) => {
    if (value >= thresholds.good) return 'status-good';
    if (value >= thresholds.warning) return 'status-warning';
    return 'status-critical';
  };

  // Helper function to format latency
  const formatLatency = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading && !metrics) {
    return (
      <div className="ai-metrics-widget loading">
        <div className="spinner"></div>
        <p>Loading AI metrics...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="ai-metrics-widget error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to Load Metrics</h3>
        <p>{error}</p>
        <button onClick={fetchMetrics} className="retry-button">
          🔄 Retry
        </button>
      </div>
    );
  }

  const { ai_performance, precompute, feedback, embedding_cache, circuit_breaker } = metrics || {};

  return (
    <div className="ai-metrics-widget">
      {/* Header */}
      <div className="widget-header">
        <div className="header-left">
          <h2>🤖 AI Performance Metrics</h2>
          {lastUpdate && (
            <span className="last-update">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="header-right">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button onClick={fetchMetrics} className="refresh-button" disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="metrics-grid">
        {/* AI Performance */}
        {ai_performance && (
          <div className="metric-card primary">
            <div className="card-header">
              <h3>📊 AI Performance</h3>
              <span className={`circuit-badge ${circuit_breaker?.state === 'CLOSED' ? 'healthy' : 'unhealthy'}`}>
                {circuit_breaker?.state || 'UNKNOWN'}
              </span>
            </div>
            <div className="card-body">
              <div className="metric-row">
                <div className="metric-item">
                  <span className="metric-label">Total Calls</span>
                  <span className="metric-value large">{ai_performance.totalCalls || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Success Rate</span>
                  <span className={`metric-value large ${getStatusColor(ai_performance.successRate || 0, { good: 95, warning: 85 })}`}>
                    {(ai_performance.successRate || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="metric-row">
                <div className="metric-item">
                  <span className="metric-label">Avg Latency</span>
                  <span className={`metric-value ${getStatusColor(10000 - (ai_performance.avgLatency || 0), { good: 8000, warning: 5000 })}`}>
                    {formatLatency(ai_performance.avgLatency || 0)}
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">P95 Latency</span>
                  <span className="metric-value">
                    {formatLatency(ai_performance.p95Latency || 0)}
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">P99 Latency</span>
                  <span className="metric-value">
                    {formatLatency(ai_performance.p99Latency || 0)}
                  </span>
                </div>
              </div>
              <div className="metric-row">
                <div className="metric-item">
                  <span className="metric-label">Fallback Rate</span>
                  <span className={`metric-value ${getStatusColor(100 - (ai_performance.fallbackRate || 0), { good: 90, warning: 80 })}`}>
                    {(ai_performance.fallbackRate || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Cache Hit Rate</span>
                  <span className={`metric-value ${getStatusColor(ai_performance.cacheHitRate || 0, { good: 20, warning: 10 })}`}>
                    {(ai_performance.cacheHitRate || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scenario Breakdown */}
        {ai_performance?.scenarios && (
          <div className="metric-card">
            <div className="card-header">
              <h3>🎯 Per-Scenario Performance</h3>
            </div>
            <div className="card-body">
              {Object.entries(ai_performance.scenarios).map(([scenario, stats]) => (
                <div key={scenario} className="scenario-row">
                  <div className="scenario-name">{scenario}</div>
                  <div className="scenario-stats">
                    <span className="stat">
                      <strong>{stats.calls || 0}</strong> calls
                    </span>
                    <span className={`stat ${getStatusColor(stats.successRate || 0, { good: 95, warning: 85 })}`}>
                      <strong>{(stats.successRate || 0).toFixed(1)}%</strong> success
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Precompute Manager */}
        {precompute && (
          <div className="metric-card">
            <div className="card-header">
              <h3>🔄 Precompute Manager</h3>
            </div>
            <div className="card-body">
              <div className="metric-row">
                <div className="metric-item">
                  <span className="metric-label">Total Precomputed</span>
                  <span className="metric-value">{precompute.totalPrecomputed || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Success Rate</span>
                  <span className={`metric-value ${getStatusColor(precompute.successRate || 0, { good: 95, warning: 85 })}`}>
                    {(precompute.successRate || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="metric-row">
                <div className="metric-item">
                  <span className="metric-label">Queue Length</span>
                  <span className="metric-value">{precompute.queueLength || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Processor */}
        {feedback && (
          <div className="metric-card">
            <div className="card-header">
              <h3>📈 Feedback System</h3>
            </div>
            <div className="card-body">
              <div className="metric-row">
                <div className="metric-item">
                  <span className="metric-label">Total Feedback</span>
                  <span className="metric-value">{feedback.totalFeedback || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Avg Rating</span>
                  <span className={`metric-value ${getStatusColor(feedback.avgRating || 0, { good: 4, warning: 3 })}`}>
                    {(feedback.avgRating || 0).toFixed(1)} / 5.0
                  </span>
                </div>
              </div>
              <div className="metric-row">
                <div className="metric-item">
                  <span className="metric-label">Critical Issues</span>
                  <span className={`metric-value ${feedback.criticalIssues > 0 ? 'status-critical' : 'status-good'}`}>
                    {feedback.criticalIssues || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Embedding Cache */}
        {embedding_cache && (
          <div className="metric-card">
            <div className="card-header">
              <h3>🧠 Embedding Cache</h3>
            </div>
            <div className="card-body">
              <div className="metric-row">
                <div className="metric-item">
                  <span className="metric-label">Cache Size</span>
                  <span className="metric-value">
                    {embedding_cache.size || 0} / {embedding_cache.maxSize || 500}
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Usage</span>
                  <span className="metric-value">{embedding_cache.usage || '0%'}</span>
                </div>
              </div>
              <div className="cache-progress-bar">
                <div 
                  className="cache-progress-fill" 
                  style={{ width: embedding_cache.usage || '0%' }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button onClick={() => setError(null)} className="dismiss-button">✕</button>
        </div>
      )}
    </div>
  );
};

export default AIMetricsWidget;
