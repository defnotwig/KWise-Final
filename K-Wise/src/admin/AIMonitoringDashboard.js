/**
 * AI System Monitoring Dashboard
 * WEEK 3 ENHANCEMENT: Real-time monitoring of AI performance and cache metrics
 * 
 * Features:
 * - Real-time cache hit rate monitoring
 * - Response time graphs (last 24 hours)
 * - AI inference metrics
 * - Circuit breaker status
 * - Alert system for performance degradation
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AIMonitoringDashboard.css';

const AIMonitoringDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [responseTimeHistory, setResponseTimeHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Fetch monitoring data
  const fetchMonitoringData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch all monitoring endpoints in parallel
      const [metricsRes, cacheRes, healthRes] = await Promise.all([
        axios.get('/api/ai/metrics', config).catch(err => ({ data: { error: err.message } })),
        axios.get('/api/cache/stats', config).catch(err => ({ data: { error: err.message } })),
        axios.get('/api/health/check', config).catch(err => ({ data: { error: err.message } }))
      ]);

      setMetrics(metricsRes.data);
      setCacheStats(cacheRes.data);
      setSystemHealth(healthRes.data);

      // Update response time history (keep last 100 data points)
      if (metricsRes.data.avgResponseTime) {
        setResponseTimeHistory(prev => {
          const newHistory = [...prev, {
            timestamp: Date.now(),
            responseTime: metricsRes.data.avgResponseTime
          }];
          return newHistory.slice(-100); // Keep last 100 points
        });
      }

      // Check for performance alerts
      checkPerformanceAlerts(metricsRes.data, cacheRes.data, healthRes.data);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
      setLoading(false);
    }
  }, []);

  // Check for performance issues and generate alerts
  const checkPerformanceAlerts = (metrics, cache, health) => {
    const newAlerts = [];

    // Cache hit rate alert
    if (cache?.hitRate < 50) {
      newAlerts.push({
        id: Date.now() + 1,
        severity: 'warning',
        message: `Low cache hit rate: ${cache.hitRate}% (target: 60%+)`,
        timestamp: new Date().toISOString()
      });
    }

    // Response time alert
    if (metrics?.avgResponseTime > 200) {
      newAlerts.push({
        id: Date.now() + 2,
        severity: metrics.avgResponseTime > 500 ? 'critical' : 'warning',
        message: `High response time: ${metrics.avgResponseTime}ms (target: <100ms)`,
        timestamp: new Date().toISOString()
      });
    }

    // Circuit breaker alert
    if (health?.circuitBreaker?.state === 'OPEN') {
      newAlerts.push({
        id: Date.now() + 3,
        severity: 'critical',
        message: 'Circuit breaker OPEN - AI service degraded',
        timestamp: new Date().toISOString()
      });
    }

    // Memory usage alert
    if (cache?.totalEntries > 2500) {
      newAlerts.push({
        id: Date.now() + 4,
        severity: 'info',
        message: `High cache entries: ${cache.totalEntries} (consider cleanup)`,
        timestamp: new Date().toISOString()
      });
    }

    setAlerts(prev => [...newAlerts, ...prev].slice(0, 20)); // Keep last 20 alerts
  };

  // Initial fetch
  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMonitoringData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMonitoringData]);

  // Calculate cache efficiency rating
  const getCacheEfficiencyRating = (hitRate) => {
    if (hitRate >= 80) return { rating: 'Excellent', color: '#10b981', icon: '⭐' };
    if (hitRate >= 60) return { rating: 'Good', color: '#3b82f6', icon: '✅' };
    if (hitRate >= 40) return { rating: 'Fair', color: '#f59e0b', icon: '⚠️' };
    return { rating: 'Poor', color: '#ef4444', icon: '🔴' };
  };

  // Calculate performance rating
  const getPerformanceRating = (avgTime) => {
    if (avgTime < 100) return { rating: 'Excellent', color: '#10b981', icon: '⚡' };
    if (avgTime < 200) return { rating: 'Good', color: '#3b82f6', icon: '✅' };
    if (avgTime < 500) return { rating: 'Fair', color: '#f59e0b', icon: '⚠️' };
    return { rating: 'Poor', color: '#ef4444', icon: '🔴' };
  };

  if (loading) {
    return (
      <div className="ai-monitoring-loading">
        <div className="loading-spinner"></div>
        <p>Loading monitoring data...</p>
      </div>
    );
  }

  const cacheEfficiency = getCacheEfficiencyRating(cacheStats?.hitRate || 0);
  const performanceRating = getPerformanceRating(metrics?.avgResponseTime || 0);

  return (
    <div className="ai-monitoring-dashboard">
      {/* Header */}
      <div className="monitoring-header">
        <div className="header-content">
          <h1>📊 AI System Monitoring</h1>
          <p className="subtitle">Real-time performance metrics and alerts</p>
        </div>
        <div className="header-controls">
          <label className="refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh</span>
          </label>
          <select 
            value={refreshInterval} 
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <button onClick={fetchMonitoringData} className="refresh-button">
            🔄 Refresh Now
          </button>
        </div>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div className="alerts-panel">
          <h3>🚨 Active Alerts ({alerts.length})</h3>
          <div className="alerts-list">
            {alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className={`alert alert-${alert.severity}`}>
                <span className="alert-icon">
                  {alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span className="alert-message">{alert.message}</span>
                <span className="alert-time">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        {/* Cache Hit Rate Card */}
        <div className="metric-card">
          <div className="metric-header">
            <h3>🔥 Cache Hit Rate</h3>
            <span className={`metric-badge badge-${cacheEfficiency.rating.toLowerCase()}`}>
              {cacheEfficiency.icon} {cacheEfficiency.rating}
            </span>
          </div>
          <div className="metric-value" style={{ color: cacheEfficiency.color }}>
            {cacheStats?.hitRate?.toFixed(1) || '0'}%
          </div>
          <div className="metric-details">
            <div className="detail-row">
              <span>Hits:</span>
              <span className="detail-value">{cacheStats?.hits || 0}</span>
            </div>
            <div className="detail-row">
              <span>Misses:</span>
              <span className="detail-value">{cacheStats?.misses || 0}</span>
            </div>
            <div className="detail-row">
              <span>Total Entries:</span>
              <span className="detail-value">{cacheStats?.totalEntries || 0}</span>
            </div>
          </div>
          <div className="metric-progress">
            <div 
              className="progress-bar" 
              style={{ 
                width: `${cacheStats?.hitRate || 0}%`,
                backgroundColor: cacheEfficiency.color
              }}
            ></div>
          </div>
        </div>

        {/* Response Time Card */}
        <div className="metric-card">
          <div className="metric-header">
            <h3>⚡ Response Time</h3>
            <span className={`metric-badge badge-${performanceRating.rating.toLowerCase()}`}>
              {performanceRating.icon} {performanceRating.rating}
            </span>
          </div>
          <div className="metric-value" style={{ color: performanceRating.color }}>
            {metrics?.avgResponseTime?.toFixed(0) || '0'}ms
          </div>
          <div className="metric-details">
            <div className="detail-row">
              <span>Min:</span>
              <span className="detail-value">{metrics?.minResponseTime || 0}ms</span>
            </div>
            <div className="detail-row">
              <span>Max:</span>
              <span className="detail-value">{metrics?.maxResponseTime || 0}ms</span>
            </div>
            <div className="detail-row">
              <span>P95:</span>
              <span className="detail-value">{metrics?.p95ResponseTime || 0}ms</span>
            </div>
          </div>
        </div>

        {/* AI Requests Card */}
        <div className="metric-card">
          <div className="metric-header">
            <h3>🤖 AI Requests</h3>
            <span className="metric-badge badge-info">
              📈 Active
            </span>
          </div>
          <div className="metric-value">
            {metrics?.totalRequests || 0}
          </div>
          <div className="metric-details">
            <div className="detail-row">
              <span>Success:</span>
              <span className="detail-value success">
                {metrics?.successfulRequests || 0}
              </span>
            </div>
            <div className="detail-row">
              <span>Failed:</span>
              <span className="detail-value error">
                {metrics?.failedRequests || 0}
              </span>
            </div>
            <div className="detail-row">
              <span>Success Rate:</span>
              <span className="detail-value">
                {((metrics?.successfulRequests / (metrics?.totalRequests || 1)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* System Health Card */}
        <div className="metric-card">
          <div className="metric-header">
            <h3>💚 System Health</h3>
            <span className={`metric-badge badge-${systemHealth?.status === 'healthy' ? 'excellent' : 'warning'}`}>
              {systemHealth?.status === 'healthy' ? '✅' : '⚠️'} {systemHealth?.status || 'Unknown'}
            </span>
          </div>
          <div className="metric-value">
            {systemHealth?.uptime ? `${(systemHealth.uptime / 3600).toFixed(1)}h` : 'N/A'}
          </div>
          <div className="metric-details">
            <div className="detail-row">
              <span>Database:</span>
              <span className={`detail-value ${systemHealth?.database === 'connected' ? 'success' : 'error'}`}>
                {systemHealth?.database || 'Unknown'}
              </span>
            </div>
            <div className="detail-row">
              <span>AI Service:</span>
              <span className={`detail-value ${systemHealth?.aiService === 'available' ? 'success' : 'error'}`}>
                {systemHealth?.aiService || 'Unknown'}
              </span>
            </div>
            <div className="detail-row">
              <span>Circuit Breaker:</span>
              <span className={`detail-value ${systemHealth?.circuitBreaker?.state === 'CLOSED' ? 'success' : 'error'}`}>
                {systemHealth?.circuitBreaker?.state || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Response Time Chart */}
      <div className="chart-container">
        <h3>📈 Response Time History (Last {responseTimeHistory.length} requests)</h3>
        <div className="response-time-chart">
          {responseTimeHistory.length > 0 ? (
            <div className="chart-bars">
              {responseTimeHistory.map((point, index) => {
                const height = Math.min((point.responseTime / 500) * 100, 100);
                const color = point.responseTime < 100 ? '#10b981' : 
                             point.responseTime < 200 ? '#3b82f6' :
                             point.responseTime < 500 ? '#f59e0b' : '#ef4444';
                
                return (
                  <div key={index} className="chart-bar-wrapper">
                    <div 
                      className="chart-bar" 
                      style={{ 
                        height: `${height}%`,
                        backgroundColor: color
                      }}
                      title={`${point.responseTime}ms at ${new Date(point.timestamp).toLocaleTimeString()}`}
                    ></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-data">No response time data available yet</p>
          )}
        </div>
        <div className="chart-legend">
          <span><span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span> Excellent (&lt;100ms)</span>
          <span><span className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></span> Good (100-200ms)</span>
          <span><span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span> Fair (200-500ms)</span>
          <span><span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span> Poor (&gt;500ms)</span>
        </div>
      </div>

      {/* Cache Layer Breakdown */}
      <div className="cache-layers">
        <h3>🔥 Cache Layer Distribution</h3>
        <div className="layers-grid">
          <div className="layer-card hot">
            <div className="layer-header">
              <span className="layer-icon">🔥</span>
              <h4>HOT Layer</h4>
            </div>
            <div className="layer-count">{cacheStats?.hotEntries || 0}</div>
            <p className="layer-description">Most frequent (30min TTL)</p>
          </div>
          <div className="layer-card warm">
            <div className="layer-header">
              <span className="layer-icon">♨️</span>
              <h4>WARM Layer</h4>
            </div>
            <div className="layer-count">{cacheStats?.warmEntries || 0}</div>
            <p className="layer-description">Moderate access (4hr TTL)</p>
          </div>
          <div className="layer-card cold">
            <div className="layer-header">
              <span className="layer-icon">❄️</span>
              <h4>COLD Layer</h4>
            </div>
            <div className="layer-count">{cacheStats?.coldEntries || 0}</div>
            <p className="layer-description">Rare access (24hr TTL)</p>
          </div>
        </div>
      </div>

      {/* Performance Recommendations */}
      <div className="recommendations">
        <h3>💡 Performance Recommendations</h3>
        <div className="recommendations-list">
          {cacheStats?.hitRate < 60 && (
            <div className="recommendation">
              <span className="rec-icon">⚡</span>
              <div className="rec-content">
                <strong>Increase cache pre-warming</strong>
                <p>Cache hit rate below 60%. Consider pre-warming more popular product combinations.</p>
              </div>
            </div>
          )}
          {metrics?.avgResponseTime > 200 && (
            <div className="recommendation">
              <span className="rec-icon">🚀</span>
              <div className="rec-content">
                <strong>Optimize AI prompts</strong>
                <p>Response time above 200ms. Review prompt length and complexity.</p>
              </div>
            </div>
          )}
          {cacheStats?.totalEntries > 2500 && (
            <div className="recommendation">
              <span className="rec-icon">🧹</span>
              <div className="rec-content">
                <strong>Cache cleanup recommended</strong>
                <p>High cache entry count. Consider more aggressive TTL or cleanup of stale entries.</p>
              </div>
            </div>
          )}
          {(!cacheStats || cacheStats.hitRate >= 60) && 
           (!metrics || metrics.avgResponseTime <= 200) && 
           (!cacheStats || cacheStats.totalEntries <= 2500) && (
            <div className="recommendation success">
              <span className="rec-icon">✅</span>
              <div className="rec-content">
                <strong>All systems optimal</strong>
                <p>No performance issues detected. System running smoothly!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIMonitoringDashboard;
