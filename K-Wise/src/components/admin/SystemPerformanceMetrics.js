/**
 * System Performance Metrics Component
 * Displays real-time system performance monitoring including:
 * - Request throughput (requests/second)
 * - Response time distribution (p50, p95, p99)
 * - Database query performance
 * - Concurrent users
 * - Error rate tracking
 * - CPU/Memory usage
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import {
  FiActivity, FiClock, FiDatabase, FiUsers,
  FiAlertTriangle, FiCpu, FiHardDrive, FiRefreshCw
} from 'react-icons/fi';
import './SystemPerformanceMetrics.css';

const SystemPerformanceMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch system metrics from backend
  const fetchMetrics = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('http://localhost:5000/api/system/metrics');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data);
        setError(null);
        
        // Update performance history (keep last 20 points)
        setPerformanceHistory(prev => {
          const timestamp = new Date().toLocaleTimeString();
          const newPoint = {
            time: timestamp,
            throughput: data.data.throughput?.current || 0,
            avgResponseTime: data.data.responseTime?.average || 0,
            p95ResponseTime: data.data.responseTime?.p95 || 0,
            activeUsers: data.data.users?.active || 0,
            errorRate: data.data.errors?.rate || 0
          };
          
          const updated = [...prev, newPoint];
          return updated.slice(-20); // Keep last 20 points
        });
      } else {
        throw new Error(data.message || 'Failed to fetch metrics');
      }
    } catch (err) {
      console.error('Error fetching system metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchMetrics]);

  // Calculate performance rating
  const getPerformanceRating = (avgResponseTime) => {
    if (avgResponseTime < 10) return { label: 'EXCELLENT', color: '#10b981', emoji: '🚀' };
    if (avgResponseTime < 50) return { label: 'GOOD', color: '#06b6d4', emoji: '✅' };
    if (avgResponseTime < 100) return { label: 'FAIR', color: '#f59e0b', emoji: '⚠️' };
    return { label: 'SLOW', color: '#ef4444', emoji: '🐌' };
  };

  // Calculate health status
  const getHealthStatus = () => {
    if (!metrics) return { label: 'UNKNOWN', color: '#6b7280' };
    
    const errorRate = metrics.errors?.rate || 0;
    const avgResponseTime = metrics.responseTime?.average || 0;
    
    if (errorRate > 5 || avgResponseTime > 100) {
      return { label: 'CRITICAL', color: '#ef4444' };
    }
    if (errorRate > 1 || avgResponseTime > 50) {
      return { label: 'WARNING', color: '#f59e0b' };
    }
    return { label: 'HEALTHY', color: '#10b981' };
  };

  // Format numbers with type safety
  const formatNumber = (num) => {
    // Convert to number and validate
    const n = parseFloat(num);
    
    // Check if conversion failed or value is null/undefined
    if (isNaN(n) || num === null || num === undefined) return 'N/A';
    
    // Format based on magnitude
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(2)}K`;
    return n.toFixed(2);
  };

  // Format bytes
  const formatBytes = (bytes) => {
    if (bytes === null || bytes === undefined) return 'N/A';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="system-metrics loading">
        <div className="spinner"></div>
        <p>Loading system metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="system-metrics error">
        <FiAlertTriangle className="error-icon" />
        <h3>Failed to load metrics</h3>
        <p>{error}</p>
        <button onClick={fetchMetrics} className="retry-btn">
          <FiRefreshCw /> Retry
        </button>
      </div>
    );
  }

  if (!metrics) {
    return <div className="system-metrics">No metrics available</div>;
  }

  const performanceRating = getPerformanceRating(metrics.responseTime?.average || 0);
  const healthStatus = getHealthStatus();

  return (
    <div className="system-metrics">
      {/* Header */}
      <div className="metrics-header">
        <div className="header-title">
          <FiActivity className="title-icon" />
          <h2>System Performance Metrics</h2>
          <span 
            className="health-badge"
            style={{ backgroundColor: healthStatus.color }}
          >
            {healthStatus.label}
          </span>
        </div>
        <div className="header-controls">
          <button
            className={`auto-refresh-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <FiRefreshCw className={refreshing ? 'spinning' : ''} />
            Auto-Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button onClick={fetchMetrics} className="refresh-btn">
            <FiRefreshCw className={refreshing ? 'spinning' : ''} />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Performance Stats Cards */}
      <div className="stats-grid">
        {/* Throughput */}
        <div className="stat-card">
          <div className="stat-header">
            <FiActivity className="stat-icon" style={{ color: '#06b6d4' }} />
            <span className="stat-label">Request Throughput</span>
          </div>
          <div className="stat-value">
            {formatNumber(metrics.throughput?.current || 0)} <span className="stat-unit">req/s</span>
          </div>
          <div className="stat-details">
            <div className="detail-row">
              <span>Peak:</span>
              <span className="detail-value">{formatNumber(metrics.throughput?.peak || 0)} req/s</span>
            </div>
            <div className="detail-row">
              <span>Total:</span>
              <span className="detail-value">{formatNumber(metrics.throughput?.total || 0)}</span>
            </div>
          </div>
        </div>

        {/* Response Time */}
        <div className="stat-card">
          <div className="stat-header">
            <FiClock className="stat-icon" style={{ color: performanceRating.color }} />
            <span className="stat-label">Response Time</span>
          </div>
          <div className="stat-value">
            {(metrics.responseTime?.average || 0).toFixed(2)} <span className="stat-unit">ms</span>
          </div>
          <div className="stat-rating" style={{ color: performanceRating.color }}>
            {performanceRating.emoji} {performanceRating.label}
          </div>
          <div className="stat-details">
            <div className="detail-row">
              <span>p50:</span>
              <span className="detail-value">{(metrics.responseTime?.p50 || 0).toFixed(2)} ms</span>
            </div>
            <div className="detail-row">
              <span>p95:</span>
              <span className="detail-value">{(metrics.responseTime?.p95 || 0).toFixed(2)} ms</span>
            </div>
            <div className="detail-row">
              <span>p99:</span>
              <span className="detail-value">{(metrics.responseTime?.p99 || 0).toFixed(2)} ms</span>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="stat-card">
          <div className="stat-header">
            <FiUsers className="stat-icon" style={{ color: '#8b5cf6' }} />
            <span className="stat-label">Active Users</span>
          </div>
          <div className="stat-value">
            {metrics.users?.active || 0} <span className="stat-unit">users</span>
          </div>
          <div className="stat-details">
            <div className="detail-row">
              <span>Peak:</span>
              <span className="detail-value">{metrics.users?.peak || 0}</span>
            </div>
            <div className="detail-row">
              <span>Total Sessions:</span>
              <span className="detail-value">{metrics.users?.total || 0}</span>
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="stat-card">
          <div className="stat-header">
            <FiAlertTriangle 
              className="stat-icon" 
              style={{ color: (metrics.errors?.rate || 0) > 1 ? '#ef4444' : '#10b981' }} 
            />
            <span className="stat-label">Error Rate</span>
          </div>
          <div className="stat-value">
            {(metrics.errors?.rate || 0).toFixed(2)} <span className="stat-unit">%</span>
          </div>
          <div className="stat-details">
            <div className="detail-row">
              <span>Total Errors:</span>
              <span className="detail-value">{metrics.errors?.total || 0}</span>
            </div>
            <div className="detail-row">
              <span>Last 24h:</span>
              <span className="detail-value">{metrics.errors?.last24h || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="charts-grid">
        {/* Throughput Over Time */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Request Throughput Over Time</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={performanceHistory}>
              <defs>
                <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="throughput" 
                stroke="#06b6d4" 
                fill="url(#throughputGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Response Time Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Response Time Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={performanceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgResponseTime" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Average"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="p95ResponseTime" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="p95"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Active Users Over Time */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Active Users</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={performanceHistory}>
              <defs>
                <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="activeUsers" 
                stroke="#8b5cf6" 
                fill="url(#usersGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Error Rate Trend */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Error Rate Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={performanceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="errorRate" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Database Performance */}
      <div className="database-section">
        <h3>
          <FiDatabase /> Database Performance
        </h3>
        <div className="db-stats-grid">
          <div className="db-stat-card">
            <div className="db-stat-label">Query Time (avg)</div>
            <div className="db-stat-value">
              {(metrics.database?.queryTime?.average || 0).toFixed(2)} ms
            </div>
            <div className="db-stat-details">
              p95: {(metrics.database?.queryTime?.p95 || 0).toFixed(2)} ms
            </div>
          </div>
          <div className="db-stat-card">
            <div className="db-stat-label">Active Connections</div>
            <div className="db-stat-value">
              {metrics.database?.connections?.active || 0}
            </div>
            <div className="db-stat-details">
              Max: {metrics.database?.connections?.max || 0}
            </div>
          </div>
          <div className="db-stat-card">
            <div className="db-stat-label">Slow Queries</div>
            <div className="db-stat-value">
              {metrics.database?.slowQueries || 0}
            </div>
            <div className="db-stat-details">
              Threshold: &gt;100ms
            </div>
          </div>
          <div className="db-stat-card">
            <div className="db-stat-label">Database Size</div>
            <div className="db-stat-value">
              {formatBytes(metrics.database?.size || 0)}
            </div>
            <div className="db-stat-details">
              Tables: {metrics.database?.tables || 0}
            </div>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="resources-section">
        <h3>
          <FiCpu /> System Resources
        </h3>
        <div className="resources-grid">
          <div className="resource-card">
            <div className="resource-header">
              <FiCpu className="resource-icon" />
              <span>CPU Usage</span>
            </div>
            <div className="resource-bar">
              <div 
                className="resource-fill cpu"
                style={{ width: `${metrics.system?.cpu?.usage || 0}%` }}
              ></div>
            </div>
            <div className="resource-value">
              {(metrics.system?.cpu?.usage || 0).toFixed(1)}%
            </div>
          </div>
          <div className="resource-card">
            <div className="resource-header">
              <FiHardDrive className="resource-icon" />
              <span>Memory Usage</span>
            </div>
            <div className="resource-bar">
              <div 
                className="resource-fill memory"
                style={{ width: `${metrics.system?.memory?.usage || 0}%` }}
              ></div>
            </div>
            <div className="resource-value">
              {(metrics.system?.memory?.usage || 0).toFixed(1)}% 
              <span className="resource-detail">
                ({formatBytes(metrics.system?.memory?.used || 0)} / {formatBytes(metrics.system?.memory?.total || 0)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Recommendations */}
      {performanceHistory.length > 5 && (
        <div className="recommendations-section">
          <h3>📊 Performance Insights</h3>
          <div className="recommendations-list">
            {(metrics.responseTime?.average || 0) > 50 && (
              <div className="recommendation warning">
                <FiAlertTriangle />
                <p>
                  <strong>High Response Time:</strong> Average response time is {(metrics.responseTime?.average || 0).toFixed(2)}ms. 
                  Consider enabling caching or optimizing database queries.
                </p>
              </div>
            )}
            {(metrics.errors?.rate || 0) > 1 && (
              <div className="recommendation error">
                <FiAlertTriangle />
                <p>
                  <strong>Elevated Error Rate:</strong> Error rate is {(metrics.errors?.rate || 0).toFixed(2)}%. 
                  Check error logs to identify and fix issues.
                </p>
              </div>
            )}
            {(metrics.database?.slowQueries || 0) > 10 && (
              <div className="recommendation warning">
                <FiDatabase />
                <p>
                  <strong>Slow Queries Detected:</strong> {metrics.database?.slowQueries} slow queries (&gt;100ms). 
                  Review query performance and add indexes where needed.
                </p>
              </div>
            )}
            {(metrics.system?.cpu?.usage || 0) > 80 && (
              <div className="recommendation critical">
                <FiCpu />
                <p>
                  <strong>High CPU Usage:</strong> CPU usage is at {(metrics.system?.cpu?.usage || 0).toFixed(1)}%. 
                  Consider scaling resources or optimizing code.
                </p>
              </div>
            )}
            {(metrics.system?.memory?.usage || 0) > 80 && (
              <div className="recommendation critical">
                <FiHardDrive />
                <p>
                  <strong>High Memory Usage:</strong> Memory usage is at {(metrics.system?.memory?.usage || 0).toFixed(1)}%. 
                  Monitor for memory leaks or increase available RAM.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemPerformanceMetrics;
