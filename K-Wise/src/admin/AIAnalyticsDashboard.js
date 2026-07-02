/**
 * AI Analytics Dashboard Component
 * TASK 14 - PHASE 4: Admin AI-Powered Insights
 * Displays AI-generated business insights, inventory predictions, and customer behavior analysis
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './AIAnalyticsDashboard.css';

const AIAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('insights'); // insights, inventory, customers
  
  // AI Analytics Data
  const [businessInsights, setBusinessInsights] = useState(null);
  const [inventoryPredictions, setInventoryPredictions] = useState(null);
  const [customerBehavior, setCustomerBehavior] = useState(null);
  
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch AI analytics data
  const fetchAIAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);      const config = {
        withCredentials: true
      };

      // Fetch all AI analytics in parallel
      const [insightsRes, inventoryRes, customerRes] = await Promise.all([
        axios.get('/api/admin/ai-analytics/business-insights', config),
        axios.get('/api/admin/ai-analytics/inventory-predictions', config),
        axios.get('/api/admin/ai-analytics/customer-behavior', config)
      ]);

      setBusinessInsights(insightsRes.data.data);
      setInventoryPredictions(inventoryRes.data.data);
      setCustomerBehavior(customerRes.data.data);

    } catch (err) {
      console.error('Error fetching AI analytics:', err);
      setError(err.response?.data?.message || 'Failed to fetch AI analytics');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAIAnalytics();
  }, []);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAIAnalytics();
    }, 600000); // 10 minutes

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="ai-analytics-loading">
        <div className="loading-spinner"></div>
        <p>Generating AI insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-analytics-error">
        <h3>⚠️ Error Loading AI Analytics</h3>
        <p>{error}</p>
        <button onClick={fetchAIAnalytics} className="retry-button">
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className="ai-analytics-dashboard">
      {/* Header */}
      <div className="ai-analytics-header">
        <div className="header-content">
          <h1>🤖 AI Analytics Dashboard</h1>
          <p className="subtitle">AI-powered business insights and predictions</p>
        </div>
        <div className="header-controls">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh (10 min)</span>
          </label>
          <button onClick={fetchAIAnalytics} className="refresh-button">
            🔄 Refresh Now
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="ai-tab-navigation">
        <button
          className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          💡 Business Insights
        </button>
        <button
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Inventory Predictions
        </button>
        <button
          className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          👥 Customer Behavior
        </button>
      </div>

      {/* Tab Content */}
      <div className="ai-tab-content">
        {activeTab === 'insights' && businessInsights && (
          <BusinessInsightsTab insights={businessInsights} />
        )}
        {activeTab === 'inventory' && inventoryPredictions && (
          <InventoryPredictionsTab predictions={inventoryPredictions} />
        )}
        {activeTab === 'customers' && customerBehavior && (
          <CustomerBehaviorTab behavior={customerBehavior} />
        )}
      </div>
    </div>
  );
};

// ==================== BUSINESS INSIGHTS TAB ====================
const BusinessInsightsTab = ({ insights }) => {
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'increasing': return '#10b981';
      case 'decreasing': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="insights-tab">
      {/* Revenue Trend Card */}
      <div className="insight-card trend-card">
        <div className="card-header">
          <h3>Revenue Trend Analysis</h3>
          <span className="ai-badge">AI Generated</span>
        </div>
        <div className="trend-content">
          <div className="trend-indicator" style={{ color: getTrendColor(insights.revenueTrend) }}>
            <span className="trend-icon">{getTrendIcon(insights.revenueTrend)}</span>
            <span className="trend-text">{insights.revenueTrend?.toUpperCase()}</span>
          </div>
          <p className="trend-description">{insights.trendDescription}</p>
        </div>
      </div>

      {/* Top Performing Category */}
      <div className="insight-card category-card">
        <div className="card-header">
          <h3>Top Performing Category</h3>
        </div>
        <div className="category-content">
          <div className="category-badge">🏆 {insights.topPerformingCategory}</div>
          <p className="category-note">Highest revenue generator this period</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="insight-card recommendations-card">
        <div className="card-header">
          <h3>💡 AI Recommendations</h3>
        </div>
        <ul className="recommendations-list">
          {insights.recommendations?.map((rec, index) => (
            <li key={`rec-${index}-${rec.slice(0, 20)}`} className="recommendation-item">
              <span className="rec-number">{index + 1}</span>
              <span className="rec-text">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Alerts */}
      {insights.alerts && insights.alerts.length > 0 && (
        <div className="insight-card alerts-card">
          <div className="card-header">
            <h3>⚠️ Alerts & Warnings</h3>
          </div>
          <ul className="alerts-list">
            {insights.alerts.map((alert, index) => (
              <li key={`alert-${index}-${alert.slice(0, 20)}`} className="alert-item">
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Opportunities */}
      {insights.opportunities && insights.opportunities.length > 0 && (
        <div className="insight-card opportunities-card">
          <div className="card-header">
            <h3>🚀 Growth Opportunities</h3>
          </div>
          <ul className="opportunities-list">
            {insights.opportunities.map((opp, index) => (
              <li key={`opp-${index}-${opp.slice(0, 20)}`} className="opportunity-item">
                {opp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="insight-metadata">
        <p>Generated: {new Date(insights.generatedAt).toLocaleString()}</p>
        <p>Confidence: {insights.confidence}</p>
      </div>
    </div>
  );
};

BusinessInsightsTab.propTypes = {
  insights: PropTypes.shape({
    revenueTrend: PropTypes.string,
    trendDescription: PropTypes.string,
    topPerformingCategory: PropTypes.string,
    recommendations: PropTypes.arrayOf(PropTypes.string),
    alerts: PropTypes.arrayOf(PropTypes.string),
    opportunities: PropTypes.arrayOf(PropTypes.string),
    generatedAt: PropTypes.string,
    confidence: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
};

// ==================== INVENTORY PREDICTIONS TAB ====================
const InventoryPredictionsTab = ({ predictions }) => {
  return (
    <div className="inventory-tab">
      {/* Critical Items */}
      <div className="prediction-card critical-card">
        <div className="card-header">
          <h3>🚨 Critical Inventory Items</h3>
          <span className="count-badge">{predictions.criticalItems?.length || 0}</span>
        </div>
        <div className="items-grid">
          {predictions.criticalItems?.map((item, index) => (
            <div key={`critical-${item.name}-${index}`} className="critical-item">
              <div className="item-header">
                <h4>{item.name}</h4>
                <span className="priority-badge">HIGH PRIORITY</span>
              </div>
              <p className="item-reason">⚠️ {item.reason}</p>
              <div className="item-stats">
                <span>Recommended Stock: <strong>{item.recommendedStock}</strong></span>
              </div>
            </div>
          ))}
          {(!predictions.criticalItems || predictions.criticalItems.length === 0) && (
            <p className="no-items">✅ No critical items detected</p>
          )}
        </div>
      </div>

      {/* Trending Categories */}
      <div className="prediction-card trending-card">
        <div className="card-header">
          <h3>📈 Trending Categories</h3>
        </div>
        <div className="trending-categories">
          {predictions.trendingCategories?.map((category, index) => (
            <div key={`trending-${category}`} className="trending-category">
              <span className="category-icon">🔥</span>
              <span className="category-name">{category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Restock Priority */}
      <div className="prediction-card restock-card">
        <div className="card-header">
          <h3>📋 Restock Priority List</h3>
        </div>
        <ol className="restock-list">
          {predictions.restockPriority?.slice(0, 10).map((product, index) => (
            <li key={`restock-${index}-${product.slice(0, 15)}`} className="restock-item">
              <span className="priority-number">#{index + 1}</span>
              <span className="product-name">{product}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Sales Data Summary */}
      {predictions.salesData && predictions.salesData.length > 0 && (
        <div className="prediction-card sales-summary-card">
          <div className="card-header">
            <h3>📊 Recent Sales Data</h3>
          </div>
          <div className="sales-summary">
            <p>Analyzing <strong>{predictions.salesData.length}</strong> top-selling products from the last 30 days</p>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="prediction-metadata">
        <p>Generated: {new Date(predictions.generatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
};

InventoryPredictionsTab.propTypes = {
  predictions: PropTypes.shape({
    criticalItems: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        reason: PropTypes.string,
        recommendedStock: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      })
    ),
    trendingCategories: PropTypes.arrayOf(PropTypes.string),
    restockPriority: PropTypes.arrayOf(PropTypes.string),
    salesData: PropTypes.array,
    generatedAt: PropTypes.string,
  }).isRequired,
};

// ==================== CUSTOMER BEHAVIOR TAB ====================
const CustomerBehaviorTab = ({ behavior }) => {
  return (
    <div className="customer-tab">
      {/* Loyal Customers */}
      <div className="behavior-card loyal-card">
        <div className="card-header">
          <h3>⭐ Loyal Customers</h3>
          <span className="count-badge">{behavior.loyalCustomers?.length || 0}</span>
        </div>
        <div className="customer-list">
          {behavior.loyalCustomers?.map((customer, index) => (
            <div key={`loyal-${customer}`} className="customer-item loyal">
              <span className="customer-icon">👑</span>
              <span className="customer-name">{customer}</span>
            </div>
          ))}
          {(!behavior.loyalCustomers || behavior.loyalCustomers.length === 0) && (
            <p className="no-items">No loyal customers identified yet</p>
          )}
        </div>
      </div>

      {/* At-Risk Customers */}
      {behavior.atRiskCustomers && behavior.atRiskCustomers.length > 0 && (
        <div className="behavior-card at-risk-card">
          <div className="card-header">
            <h3>⚠️ At-Risk Customers</h3>
            <span className="count-badge warning">{behavior.atRiskCustomers.length}</span>
          </div>
          <div className="customer-list">
            {behavior.atRiskCustomers.map((customer, index) => (
              <div key={`atrisk-${customer}`} className="customer-item at-risk">
                <span className="customer-icon">⚠️</span>
                <span className="customer-name">{customer}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High-Value Segments */}
      <div className="behavior-card segment-card">
        <div className="card-header">
          <h3>💎 High-Value Customer Segments</h3>
        </div>
        <div className="segment-content">
          <p className="segment-description">{behavior.highValueSegments}</p>
          <div className="ltv-estimate">
            <span className="ltv-label">Avg Customer Lifetime Value:</span>
            <span className="ltv-value">{behavior.avgCustomerLifetimeValue}</span>
          </div>
        </div>
      </div>

      {/* Retention Strategies */}
      <div className="behavior-card strategies-card">
        <div className="card-header">
          <h3>🎯 AI-Recommended Retention Strategies</h3>
        </div>
        <ul className="strategies-list">
          {behavior.retentionStrategies?.map((strategy, index) => (
            <li key={`strategy-${index}-${strategy.slice(0, 15)}`} className="strategy-item">
              <span className="strategy-number">{index + 1}</span>
              <span className="strategy-text">{strategy}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Analytics Summary */}
      <div className="behavior-card summary-card">
        <div className="card-header">
          <h3>📊 Analysis Summary</h3>
        </div>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="stat-label">Total Customers Analyzed:</span>
            <span className="stat-value">{behavior.totalAnalyzed || 0}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Data Period:</span>
            <span className="stat-value">Last 90 Days</span>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="behavior-metadata">
        <p>Generated: {new Date(behavior.generatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
};

CustomerBehaviorTab.propTypes = {
  behavior: PropTypes.shape({
    loyalCustomers: PropTypes.arrayOf(PropTypes.string),
    atRiskCustomers: PropTypes.arrayOf(PropTypes.string),
    highValueSegments: PropTypes.string,
    avgCustomerLifetimeValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    retentionStrategies: PropTypes.arrayOf(PropTypes.string),
    totalAnalyzed: PropTypes.number,
    generatedAt: PropTypes.string,
  }).isRequired,
};

export default AIAnalyticsDashboard;
