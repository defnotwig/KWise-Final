import React, { useState, useEffect } from 'react';
import './FeedbackStats.css';

const FeedbackStats = () => {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(7); // days

  useEffect(() => {
    fetchStats();
    fetchMonthlyStats();
  }, [timeRange]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `http://localhost:5000/api/admin/ai-stats?days=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        'http://localhost:5000/api/admin/ai-stats/monthly',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch monthly statistics');
      }

      const data = await response.json();
      setMonthlyData(data.months || []);
    } catch (err) {
      console.error('Error fetching monthly stats:', err);
    }
  };

  const calculateAccuracyColor = (accuracy) => {
    if (accuracy >= 90) return '#4caf50'; // Green
    if (accuracy >= 75) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!stats) {
    return <div className="empty-state">No statistics available yet</div>;
  }

  return (
    <div className="feedback-stats-container">
      {/* Header */}
      <div className="stats-header">
        <h3>📊 AI Feedback Statistics</h3>
        <div className="time-range-selector">
          <label>Time Range:</label>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={365}>Last Year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="key-metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <h4>Overall Accuracy</h4>
            <div 
              className="metric-value"
              style={{ color: calculateAccuracyColor(stats.accuracy * 100) }}
            >
              {(stats.accuracy * 100).toFixed(1)}%
            </div>
            <p className="metric-subtitle">AI Suggestions Approved</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📝</div>
          <div className="metric-content">
            <h4>Total Corrections</h4>
            <div className="metric-value">{stats.total_corrections}</div>
            <p className="metric-subtitle">Submitted by Admins</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h4>Avg Response Time</h4>
            <div className="metric-value">
              {stats.avg_response_time ? `${stats.avg_response_time.toFixed(1)}h` : 'N/A'}
            </div>
            <p className="metric-subtitle">Time to Review</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h4>Improvement Rate</h4>
            <div className="metric-value">
              {stats.improvement_rate ? `+${(stats.improvement_rate * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="metric-subtitle">vs Previous Period</p>
          </div>
        </div>
      </div>

      {/* Corrections by Type */}
      {stats.corrections_by_type && stats.corrections_by_type.length > 0 && (
        <div className="stats-section">
          <h4>Corrections by Type</h4>
          <div className="type-breakdown">
            {stats.corrections_by_type.map((item, index) => (
              <div key={index} className="type-item">
                <div className="type-header">
                  <span className="type-name">{item.type}</span>
                  <span className="type-count">{item.count} corrections</span>
                </div>
                <div className="type-bar">
                  <div
                    className="type-bar-fill"
                    style={{
                      width: `${(item.count / stats.total_corrections) * 100}%`,
                      backgroundColor: item.type === 'upgrade' ? '#2196f3' : 
                                     item.type === 'compatibility' ? '#4caf50' : '#ff9800'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Contributors */}
      {stats.top_correctors && stats.top_correctors.length > 0 && (
        <div className="stats-section">
          <h4>🏆 Top Contributors</h4>
          <div className="leaderboard">
            {stats.top_correctors.map((corrector, index) => (
              <div key={index} className="leaderboard-item">
                <div className="rank">{index + 1}</div>
                <div className="corrector-info">
                  <span className="corrector-name">
                    Admin {corrector.admin_id}
                  </span>
                  <span className="corrector-email">{corrector.email || 'N/A'}</span>
                </div>
                <div className="corrector-stats">
                  <span className="correction-count">{corrector.correction_count} corrections</span>
                  <span className="avg-confidence">
                    Avg Confidence: {(corrector.avg_confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Trends */}
      {monthlyData.length > 0 && (
        <div className="stats-section">
          <h4>📈 Monthly Trends</h4>
          <div className="monthly-chart">
            {monthlyData.map((month, index) => (
              <div key={index} className="month-column">
                <div className="month-bars">
                  <div
                    className="bar total-bar"
                    style={{
                      height: `${(month.total_corrections / Math.max(...monthlyData.map(m => m.total_corrections))) * 100}%`,
                      minHeight: '5px'
                    }}
                    title={`Total: ${month.total_corrections}`}
                  />
                  <div
                    className="bar accuracy-bar"
                    style={{
                      height: `${month.accuracy * 100}%`,
                      minHeight: '5px'
                    }}
                    title={`Accuracy: ${(month.accuracy * 100).toFixed(1)}%`}
                  />
                </div>
                <div className="month-label">
                  {new Date(month.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </div>
                <div className="month-stats">
                  <span>{month.total_corrections}</span>
                  <span>{(month.accuracy * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span><span className="legend-box total"></span> Total Corrections</span>
            <span><span className="legend-box accuracy"></span> Accuracy</span>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {stats.recent_corrections && stats.recent_corrections.length > 0 && (
        <div className="stats-section">
          <h4>🕐 Recent Corrections</h4>
          <div className="recent-activity">
            {stats.recent_corrections.slice(0, 5).map((correction, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">✏️</div>
                <div className="activity-content">
                  <div className="activity-header">
                    <span className="activity-type">{correction.type}</span>
                    <span className="activity-time">
                      {new Date(correction.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="activity-text">
                    {correction.corrected_text.substring(0, 100)}
                    {correction.corrected_text.length > 100 ? '...' : ''}
                  </p>
                  <span className="activity-confidence">
                    Confidence: {(correction.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="stats-footer">
        <button className="refresh-stats-btn" onClick={fetchStats}>
          🔄 Refresh Statistics
        </button>
        <p className="last-updated">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default FeedbackStats;
