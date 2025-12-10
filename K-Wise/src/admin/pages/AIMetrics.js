/**
 * AIMetrics.js - Admin Dashboard for AI Enhancement Features
 * Phase 4: Admin Integration
 * 
 * Displays:
 * - Total AI estimations performed
 * - Estimation success rates (confidence scores)
 * - Total AI recommendations generated
 * - Recommendation acceptance rates
 * - Popular upgrade paths
 * - Revenue from AI-assisted orders
 * - AI service health status
 * - Recent AI interactions
 */

import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { useNavigate } from 'react-router-dom';
import './AIMetrics.css';
import api from '../../api/api';
import aiService from '../../api/aiService';
import AIMetricsWidget from '../components/AIMetricsWidget';

const AIMetrics = () => {
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  
  // Metrics state
  const [metrics, setMetrics] = useState({
    totalEstimations: 0,
    avgConfidenceScore: 0,
    totalRecommendations: 0,
    recommendationAcceptanceRate: 0,
    aiAssistedOrders: 0,
    aiAssistedRevenue: 0,
    estimationSuccessRate: 0
  });
  
  // Charts data
  const [usageOverTime, setUsageOverTime] = useState([]);
  const [confidenceDistribution, setConfidenceDistribution] = useState([]);
  const [popularUpgrades, setPopularUpgrades] = useState([]);
  const [recentInteractions, setRecentInteractions] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7days'); // 7days, 30days, 90days, all
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch AI metrics from backend using aiService
      const [metricsResponse, pathsResponse, componentsResponse] = await Promise.all([
        aiService.getAIMetrics(),
        aiService.getTopUpgradePaths(),
        aiService.getPopularComponents()
      ]);

      if (metricsResponse.success) {
        // Merge overview and estimation stats into metrics state
        setMetrics({
          totalEstimations: metricsResponse.data.overview.totalEstimations,
          avgConfidenceScore: metricsResponse.data.estimationStats.avgConfidence,
          totalRecommendations: metricsResponse.data.overview.totalRecommendations,
          recommendationAcceptanceRate: metricsResponse.data.overview.conversionRate,
          aiAssistedOrders: metricsResponse.data.overview.aiAssistedOrders,
          aiAssistedRevenue: 0, // To be calculated from order data
          estimationSuccessRate: metricsResponse.data.estimationStats.successRate
        });
      }

      if (pathsResponse.success) {
        setPopularUpgrades(pathsResponse.data.paths || []);
      }

      if (componentsResponse.success) {
        // Convert components to usage over time format for charts
        const componentsData = componentsResponse.data.components || [];
        setUsageOverTime(componentsData);
        setConfidenceDistribution(componentsData);
      }
    } catch (err) {
      console.error('Error loading AI metrics:', err);
      setError(err.message || 'Failed to load AI metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = async () => {
    try {
      const response = await api.admin.getAILogs({ limit: 50 });
      if (response.success) {
        setRecentInteractions(response.data);
        setShowLogsModal(true);
      }
    } catch (err) {
      console.error('Error loading AI logs:', err);
      alert('Failed to load AI logs');
    }
  };

  const handleExportData = async () => {
    try {
      const response = await api.admin.exportAITrainingData();
      if (response.success) {
        // Download CSV file
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_training_data_${new Date().toISOString()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Failed to export training data');
    }
  };

  const formatPrice = (price) => {
    return `₱${(price || 0).toLocaleString('en-PH')}`;
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="ai-metrics-container">
        <div className="ai-metrics-loading">
          <div className="loading-spinner"></div>
          <p>Loading AI metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-metrics-container">
        <div className="ai-metrics-error">
          <p>❌ {error}</p>
          <button onClick={loadMetrics}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-metrics-container">
      {/* Header */}
      <div className="ai-metrics-header">
        <div className="header-left">
          <h1>🤖 AI Enhancement Metrics</h1>
          <p>Monitor AI-powered PC upgrade features</p>
        </div>
        <div className="header-right">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button className="export-btn" onClick={handleExportData}>
            📥 Export Training Data
          </button>
          <button className="logs-btn" onClick={handleViewLogs}>
            📋 View Logs
          </button>
        </div>
      </div>

      {/* Phase 4 & 5 Monitoring Widget */}
      <AIMetricsWidget />

      {/* Key Metrics Cards */}
      <div className="metrics-cards">
        <div className="metric-card">
          <div className="metric-icon">🔍</div>
          <div className="metric-content">
            <h3>Total Estimations</h3>
            <div className="metric-value">{metrics.totalEstimations.toLocaleString()}</div>
            <div className="metric-label">AI PC estimations performed</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <h3>Success Rate</h3>
            <div className="metric-value">{formatPercentage(metrics.estimationSuccessRate)}</div>
            <div className="metric-label">Estimations with ≥80% confidence</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💡</div>
          <div className="metric-content">
            <h3>Recommendations</h3>
            <div className="metric-value">{metrics.totalRecommendations.toLocaleString()}</div>
            <div className="metric-label">AI upgrade recommendations generated</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>Acceptance Rate</h3>
            <div className="metric-value">{formatPercentage(metrics.recommendationAcceptanceRate)}</div>
            <div className="metric-label">Recommendations applied by users</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🛒</div>
          <div className="metric-content">
            <h3>AI-Assisted Orders</h3>
            <div className="metric-value">{metrics.aiAssistedOrders.toLocaleString()}</div>
            <div className="metric-label">Orders with AI features</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>AI Revenue</h3>
            <div className="metric-value">{formatPrice(metrics.aiAssistedRevenue)}</div>
            <div className="metric-label">Revenue from AI-assisted orders</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Usage Over Time */}
        <div className="chart-card">
          <h2>📈 AI Usage Over Time</h2>
          <div className="chart-content">
            {usageOverTime.length > 0 ? (
              <div className="line-chart">
                {usageOverTime.map((item, idx) => (
                  <div key={idx} className="chart-bar-group">
                    <div className="chart-bar-container">
                      <div 
                        className="chart-bar estimations"
                        style={{ 
                          height: `${(item.estimations / Math.max(...usageOverTime.map(i => i.estimations))) * 100}%` 
                        }}
                        title={`${item.estimations} estimations`}
                      ></div>
                      <div 
                        className="chart-bar recommendations"
                        style={{ 
                          height: `${(item.recommendations / Math.max(...usageOverTime.map(i => i.recommendations))) * 100}%` 
                        }}
                        title={`${item.recommendations} recommendations`}
                      ></div>
                    </div>
                    <div className="chart-label">{item.date}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No usage data available</p>
            )}
          </div>
          <div className="chart-legend">
            <span><span className="legend-color estimations"></span> Estimations</span>
            <span><span className="legend-color recommendations"></span> Recommendations</span>
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="chart-card">
          <h2>🎯 Confidence Score Distribution</h2>
          <div className="chart-content">
            {confidenceDistribution.length > 0 ? (
              <div className="pie-chart">
                {confidenceDistribution.map((item, idx) => (
                  <div key={idx} className="pie-segment" style={{ '--percentage': item.percentage }}>
                    <div className="pie-label">
                      <strong>{item.range}</strong>
                      <span>{item.count} ({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No confidence data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Popular Upgrade Paths */}
      <div className="popular-upgrades-section">
        <h2>🔥 Popular Upgrade Paths</h2>
        <div className="upgrades-table">
          {popularUpgrades.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Component</th>
                  <th>Popular Upgrade</th>
                  <th>Count</th>
                  <th>Avg Price</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {popularUpgrades.map((item, idx) => (
                  <tr key={idx}>
                    <td>#{idx + 1}</td>
                    <td>{item.category}</td>
                    <td>{item.product_name}</td>
                    <td>{item.count}</td>
                    <td>{formatPrice(item.avg_price)}</td>
                    <td>{formatPrice(item.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data">No upgrade data available</p>
          )}
        </div>
      </div>

      {/* Recent Interactions */}
      <div className="recent-interactions-section">
        <h2>🕒 Recent AI Interactions</h2>
        <div className="interactions-list">
          {recentInteractions.length > 0 ? (
            recentInteractions.slice(0, 10).map((item) => (
              <div key={item.id} className="interaction-item" onClick={() => setSelectedLog(item)}>
                <div className="interaction-header">
                  <span className={`endpoint-badge ${item.endpoint.includes('estimate') ? 'estimate' : 'recommend'}`}>
                    {item.endpoint.includes('estimate') ? '🔍 Estimation' : '💡 Recommendation'}
                  </span>
                  <span className="interaction-time">{formatDate(item.created_at)}</span>
                </div>
                <div className="interaction-details">
                  <span className="user-id">User #{item.user_id || 'Guest'}</span>
                  <span className="execution-time">{item.execution_time_ms}ms</span>
                </div>
              </div>
            ))
          ) : (
            <p className="no-data">No recent interactions</p>
          )}
        </div>
      </div>

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="logs-modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="logs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal-header">
              <h2>📋 AI Interaction Logs</h2>
              <button onClick={() => setShowLogsModal(false)}>✕</button>
            </div>
            <div className="logs-modal-content">
              {recentInteractions.map((log) => (
                <div key={log.id} className="log-entry">
                  <div className="log-header">
                    <span className="log-endpoint">{log.endpoint}</span>
                    <span className="log-time">{formatDate(log.created_at)}</span>
                  </div>
                  <div className="log-body">
                    <div className="log-prompt">
                      <strong>Prompt:</strong>
                      <pre>{JSON.stringify(JSON.parse(log.prompt || '{}'), null, 2)}</pre>
                    </div>
                    <div className="log-response">
                      <strong>Response:</strong>
                      <pre>{JSON.stringify(JSON.parse(log.response || '{}'), null, 2)}</pre>
                    </div>
                  </div>
                  <div className="log-footer">
                    <span>User: {log.user_id || 'Guest'}</span>
                    <span>Execution: {log.execution_time_ms}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Log Detail Modal */}
      {selectedLog && (
        <div className="log-detail-overlay" onClick={() => setSelectedLog(null)}>
          <div className="log-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="log-detail-header">
              <h2>Interaction Detail</h2>
              <button onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <div className="log-detail-content">
              <div className="detail-section">
                <h3>Endpoint</h3>
                <p>{selectedLog.endpoint}</p>
              </div>
              <div className="detail-section">
                <h3>Timestamp</h3>
                <p>{formatDate(selectedLog.created_at)}</p>
              </div>
              <div className="detail-section">
                <h3>Execution Time</h3>
                <p>{selectedLog.execution_time_ms}ms</p>
              </div>
              <div className="detail-section">
                <h3>Prompt</h3>
                <pre>{JSON.stringify(JSON.parse(selectedLog.prompt || '{}'), null, 2)}</pre>
              </div>
              <div className="detail-section">
                <h3>Response</h3>
                <pre>{JSON.stringify(JSON.parse(selectedLog.response || '{}'), null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIMetrics;
