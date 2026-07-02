/**
 * Cache Performance Dashboard Component
 * 
 * Real-time visualization of in-memory cache performance:
 * - Cache hit rate and statistics
 * - Memory usage and capacity
 * - Category-specific TTL effectiveness
 * - Query performance metrics
 * - Eviction tracking
 * 
 * Features:
 * - Auto-refresh every 5 seconds
 * - Interactive charts using Recharts
 * - Color-coded performance indicators
 * - Responsive design
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getServerBaseUrl } from '../../utils/networkConfig';
import { 
  FiActivity, FiDatabase, FiCpu, FiTrendingUp, FiZap, 
  FiRefreshCw, FiCheckCircle, FiAlertTriangle 
} from 'react-icons/fi';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './CachePerformanceDashboard.css';

const CachePerformanceDashboard = () => {
  const [cacheStats, setCacheStats] = useState(null);
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch cache statistics from backend
  const fetchCacheStats = useCallback(async () => {
    try {
      const response = await fetch(`${getServerBaseUrl()}/api/cache/stats`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCacheStats(data.data);
        setLastUpdated(new Date());
        
        // Add to performance history (keep last 20 data points)
        setPerformanceHistory(prev => {
          const newHistory = [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            hitRate: Number.parseFloat(data.data.hitRate) || 0,
            hits: data.data.hits || 0,
            misses: data.data.misses || 0,
            currentSize: data.data.currentSize || 0,
            evictions: data.data.evictions || 0
          }];
          
          // Keep only last 20 data points
          return newHistory.slice(-20);
        });
        
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch cache stats');
      }
    } catch (err) {
      console.error('Cache stats fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    fetchCacheStats(); // Initial load
    
    if (autoRefresh) {
      const interval = setInterval(fetchCacheStats, 5000); // Every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchCacheStats]);

  // Calculate performance rating
  const getPerformanceRating = (hitRate) => {
    const rate = Number.parseFloat(hitRate) || 0;
    if (rate >= 80) return { label: 'EXCELLENT', color: '#10b981', icon: FiCheckCircle };
    if (rate >= 60) return { label: 'GOOD', color: '#06b6d4', icon: FiTrendingUp };
    if (rate >= 40) return { label: 'FAIR', color: '#f59e0b', icon: FiAlertTriangle };
    return { label: 'NEEDS OPTIMIZATION', color: '#ef4444', icon: FiAlertTriangle };
  };

  // Calculate fill percentage color
  const getFillColor = (percentage) => {
    const pct = Number.parseFloat(percentage) || 0;
    if (pct >= 90) return '#ef4444'; // Red - Critical
    if (pct >= 70) return '#f59e0b'; // Orange - Warning
    if (pct >= 50) return '#06b6d4'; // Cyan - Good
    return '#10b981'; // Green - Optimal
  };

  // Pie chart colors
  const COLORS = {
    hits: '#10b981',
    misses: '#ef4444',
    unused: '#6b7280'
  };

  if (isLoading && !cacheStats) {
    return (
      <div className="cache-dashboard loading">
        <div className="loading-spinner">
          <FiRefreshCw className="spin" />
          <p>Loading cache statistics...</p>
        </div>
      </div>
    );
  }

  if (error && !cacheStats) {
    return (
      <div className="cache-dashboard error">
        <FiAlertTriangle className="error-icon" />
        <h3>Failed to Load Cache Statistics</h3>
        <p>{error}</p>
        <button onClick={fetchCacheStats} className="retry-button">
          <FiRefreshCw /> Retry
        </button>
      </div>
    );
  }

  const rating = cacheStats ? getPerformanceRating(cacheStats.hitRate) : null;
  const fillColor = cacheStats ? getFillColor(cacheStats.fillPercentage) : '#6b7280';

  // Prepare pie chart data
  const pieData = cacheStats ? [
    { name: 'Hits', value: cacheStats.hits || 0 },
    { name: 'Misses', value: cacheStats.misses || 0 }
  ] : [];

  // Prepare capacity data
  const capacityData = cacheStats ? [
    { name: 'Used', value: cacheStats.currentSize || 0, fill: fillColor },
    { name: 'Available', value: (cacheStats.maxSize || 2000) - (cacheStats.currentSize || 0), fill: '#e5e7eb' }
  ] : [];

  return (
    <div className="cache-dashboard">
      {/* Header */}
      <div className="cache-dashboard-header">
        <div className="header-left">
          <FiActivity className="header-icon" />
          <h2>Cache Performance Dashboard</h2>
        </div>
        <div className="header-right">
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`auto-refresh-toggle ${autoRefresh ? 'active' : ''}`}
            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
          >
            <FiRefreshCw className={autoRefresh ? 'spin-slow' : ''} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
          <button onClick={fetchCacheStats} className="refresh-button">
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      {cacheStats ? (
        <>
          {/* Performance Overview Cards */}
          <div className="stats-grid">
            {/* Hit Rate */}
            <div className="stat-card performance-rating" style={{ borderColor: rating.color }}>
              <div className="stat-header">
                <rating.icon style={{ color: rating.color }} />
                <span>Cache Hit Rate</span>
              </div>
              <div className="stat-value" style={{ color: rating.color }}>
                {cacheStats.hitRate}
              </div>
              <div className="stat-label" style={{ color: rating.color }}>
                {rating.label}
              </div>
            </div>

            {/* Total Requests */}
            <div className="stat-card">
              <div className="stat-header">
                <FiActivity />
                <span>Total Requests</span>
              </div>
              <div className="stat-value">
                {(cacheStats.hits || 0) + (cacheStats.misses || 0)}
              </div>
              <div className="stat-breakdown">
                <span className="stat-hits">✓ {cacheStats.hits} hits</span>
                <span className="stat-misses">✗ {cacheStats.misses} misses</span>
              </div>
            </div>

            {/* Cache Size */}
            <div className="stat-card">
              <div className="stat-header">
                <FiDatabase />
                <span>Cache Size</span>
              </div>
              <div className="stat-value">
                {cacheStats.currentSize} / {cacheStats.maxSize}
              </div>
              <div className="stat-label">
                {cacheStats.fillPercentage} full
              </div>
            </div>

            {/* Evictions */}
            <div className="stat-card">
              <div className="stat-header">
                <FiZap />
                <span>Evictions</span>
              </div>
              <div className="stat-value">
                {cacheStats.evictions || 0}
              </div>
              <div className="stat-label">
                LRU evictions
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-grid">
            {/* Hit Rate History */}
            <div className="chart-card full-width">
              <h3>
                <FiTrendingUp /> Hit Rate Trend (Real-time)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="hitRate" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Hit Rate (%)"
                    dot={{ fill: '#10b981', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Cache Requests Distribution */}
            <div className="chart-card">
              <h3>
                <FiCpu /> Request Distribution
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell 
                        key={`cell-${entry.name}`} 
                        fill={entry.name === 'Hits' ? COLORS.hits : COLORS.misses} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Cache Capacity */}
            <div className="chart-card">
              <h3>
                <FiDatabase /> Cache Capacity
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={capacityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cache Details */}
          <div className="cache-details">
            <h3>Cache Configuration</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Cache Type:</span>
                <span className="detail-value">In-Memory LRU</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Max Capacity:</span>
                <span className="detail-value">{cacheStats.maxSize} items</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Current Size:</span>
                <span className="detail-value">{cacheStats.currentSize} items</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Fill Percentage:</span>
                <span className="detail-value" style={{ color: fillColor }}>
                  {cacheStats.fillPercentage}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value">
                  {cacheStats.enabled ? (
                    <span className="status-enabled">
                      <FiCheckCircle /> Enabled
                    </span>
                  ) : (
                    <span className="status-disabled">
                      <FiAlertTriangle /> Disabled
                    </span>
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">TTL Strategy:</span>
                <span className="detail-value">Category-based (5-30 min)</span>
              </div>
            </div>
          </div>

          {/* Performance Recommendations */}
          {rating && rating.label !== 'EXCELLENT' && (
            <div className="recommendations">
              <h3>
                <FiTrendingUp /> Performance Recommendations
              </h3>
              <ul>
                {Number.parseFloat(cacheStats.hitRate) < 40 && (
                  <li>
                    <FiAlertTriangle className="warning" />
                    Cache hit rate is low. Consider increasing TTL for frequently accessed data.
                  </li>
                )}
                {Number.parseFloat(cacheStats.fillPercentage) > 90 && (
                  <li>
                    <FiAlertTriangle className="warning" />
                    Cache is nearly full. Consider increasing max capacity or reviewing eviction policy.
                  </li>
                )}
                {cacheStats.evictions > 100 && (
                  <li>
                    <FiAlertTriangle className="warning" />
                    High eviction rate detected. Increase cache size for better performance.
                  </li>
                )}
                {Number.parseFloat(cacheStats.hitRate) >= 40 && Number.parseFloat(cacheStats.hitRate) < 80 && (
                  <li>
                    <FiTrendingUp className="info" />
                    Cache performing well. Monitor for trends and adjust TTL as needed.
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="no-data">
          <FiDatabase />
          <p>No cache statistics available</p>
        </div>
      )}
    </div>
  );
};

export default CachePerformanceDashboard;
