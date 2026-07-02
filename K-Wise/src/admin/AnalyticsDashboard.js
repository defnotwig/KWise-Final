/**
 * Analytics Dashboard Component
 * TASK 11: Advanced Analytics with Charts and Insights
 * Displays comprehensive business analytics for admin users
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { getServerBaseUrl } from '../utils/networkConfig';
import './AnalyticsDashboard.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140'];

const formatCurrency = (value) => {
  return `₱${Number.parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        {payload.map((entry) => (
          <p key={`${entry.name}-${entry.value}`} style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Revenue') || entry.name.includes('Value') ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      color: PropTypes.string,
    })
  ),
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [timeframe, setTimeframe] = useState('all');
  const [analytics, setAnalytics] = useState({
    revenueTrends: [],
    topProducts: [],
    categoryPerformance: [],
    orderStatus: [],
    customerInsights: { orderFrequency: [], spendingSegments: [] },
    orderPatterns: []
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {      const [
        trendsRes,
        productsRes,
        categoriesRes,
        statusRes,
        insightsRes,
        patternsRes
      ] = await Promise.all([
        axios.get(`${getServerBaseUrl()}/api/admin/analytics/revenue-trends?period=${period}&limit=30`, { withCredentials: true }),
        axios.get(`${getServerBaseUrl()}/api/admin/analytics/top-products?limit=10&timeframe=${timeframe}`, { withCredentials: true }),
        axios.get(`${getServerBaseUrl()}/api/admin/analytics/category-performance`, { withCredentials: true }),
        axios.get(`${getServerBaseUrl()}/api/admin/analytics/order-status`, { withCredentials: true }),
        axios.get(`${getServerBaseUrl()}/api/admin/analytics/customer-insights`, { withCredentials: true }),
        axios.get(`${getServerBaseUrl()}/api/admin/analytics/order-patterns`, { withCredentials: true })
      ]);

      setAnalytics({
        revenueTrends: trendsRes.data.data || [],
        topProducts: productsRes.data.data || [],
        categoryPerformance: categoriesRes.data.data || [],
        orderStatus: statusRes.data.data || [],
        customerInsights: insightsRes.data.data || { orderFrequency: [], spendingSegments: [] },
        orderPatterns: patternsRes.data.data || []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [period, timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-loading">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h1>📊 Analytics Dashboard</h1>
        <div className="analytics-filters">
          <div className="filter-group">
            <label htmlFor="revenue-period">Revenue Period:</label>
            <select id="revenue-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="products-timeframe">Products Timeframe:</label>
            <select id="products-timeframe" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
              <option value="all">All Time</option>
              <option value="month">Last Month</option>
              <option value="week">Last Week</option>
              <option value="day">Today</option>
            </select>
          </div>
        </div>
      </div>

      {/* Revenue Trends Chart */}
      <div className="analytics-section">
        <h2>💰 Revenue Trends ({period})</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.revenueTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#667eea" strokeWidth={2} name="Revenue" />
            <Line type="monotone" dataKey="orderCount" stroke="#43e97b" strokeWidth={2} name="Orders" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products and Category Performance */}
      <div className="analytics-grid">
        <div className="analytics-section">
          <h2>🏆 Top Products ({timeframe})</h2>
          <div className="top-products-list">
            {analytics.topProducts.slice(0, 5).map((product, index) => (
              <div key={product.id} className="product-item">
                <div className="product-rank">#{index + 1}</div>
                <div className="product-details">
                  <div className="product-name">{product.name}</div>
                  <div className="product-stats">
                    <span className="product-category">{product.category}</span>
                    <span className="product-sold">{product.totalQuantity} sold</span>
                    <span className="product-revenue">{formatCurrency(product.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-section">
          <h2>📦 Category Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.categoryPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#764ba2" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Order Status and Customer Insights */}
      <div className="analytics-grid">
        <div className="analytics-section">
          <h2>📋 Order Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.orderStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.status}: ${entry.count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics.orderStatus.map((entry, index) => (
                  <Cell key={`cell-${entry.status}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-section">
          <h2>👥 Customer Segments</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.customerInsights.spendingSegments}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="segment" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="customerCount" fill="#4facfe" name="Customers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Order Patterns (Hourly) */}
      <div className="analytics-section">
        <h2>🕐 Order Patterns (Hourly - Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.orderPatterns}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Orders', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="orderCount" fill="#fa709a" name="Order Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Customer Frequency */}
      <div className="analytics-section">
        <h2>🔄 Customer Order Frequency</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={analytics.customerInsights.orderFrequency}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.customerType}: ${entry.customerCount}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="customerCount"
            >
              {analytics.customerInsights.orderFrequency.map((entry, index) => (
                <Cell key={`cell-${entry.customerType}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
