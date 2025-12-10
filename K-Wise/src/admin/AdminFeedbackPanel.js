import React, { useState, useEffect } from 'react';
import CorrectionForm from './CorrectionForm';
import FeedbackStats from './FeedbackStats';
import './AdminFeedbackPanel.css';

const AdminFeedbackPanel = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'stats', 'correction'
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    type: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });

  // Fetch pending suggestions
  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingSuggestions();
    }
  }, [activeTab, pagination.page, filters]);

  const fetchPendingSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await fetch(
        `http://localhost:5000/api/admin/ai-suggestions/pending?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      
      setPendingSuggestions(data.suggestions || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0
      }));
    } catch (err) {
      console.error('Error fetching pending suggestions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = async (suggestionId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `http://localhost:5000/api/admin/ai-suggestions/${suggestionId}/assign`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to assign suggestion');
      }

      // Refresh the list
      fetchPendingSuggestions();
    } catch (err) {
      console.error('Error assigning suggestion:', err);
      setError(err.message);
    }
  };

  const handleCorrect = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setActiveTab('correction');
  };

  const handleCorrectionSubmitted = () => {
    setSelectedSuggestion(null);
    setActiveTab('pending');
    fetchPendingSuggestions();
  };

  const renderPendingTab = () => (
    <div className="pending-tab">
      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Priority:</label>
          <select 
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Type:</label>
          <select 
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="all">All</option>
            <option value="upgrade">Upgrade</option>
            <option value="compatibility">Compatibility</option>
            <option value="estimation">Estimation</option>
          </select>
        </div>

        <button 
          className="refresh-btn"
          onClick={fetchPendingSuggestions}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Suggestions List */}
      {loading ? (
        <div className="loading">Loading suggestions...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : pendingSuggestions.length === 0 ? (
        <div className="empty-state">
          <p>✅ No pending suggestions to review!</p>
          <p>All AI suggestions have been reviewed.</p>
        </div>
      ) : (
        <>
          <div className="suggestions-list">
            {pendingSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="suggestion-card">
                <div className="suggestion-header">
                  <span className={`priority-badge ${suggestion.priority}`}>
                    {suggestion.priority}
                  </span>
                  <span className="type-badge">{suggestion.type}</span>
                  <span className="confidence-score">
                    Confidence: {(suggestion.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="suggestion-content">
                  <h4>{suggestion.original_text || 'No text provided'}</h4>
                  <p className="suggestion-reasoning">
                    {suggestion.reasoning || 'No reasoning provided'}
                  </p>
                </div>

                <div className="suggestion-metadata">
                  <span>Created: {new Date(suggestion.created_at).toLocaleDateString()}</span>
                  {suggestion.assigned_to && (
                    <span>Assigned to: Admin {suggestion.assigned_to}</span>
                  )}
                </div>

                <div className="suggestion-actions">
                  {!suggestion.assigned_to && (
                    <button
                      className="assign-btn"
                      onClick={() => handleAssignToMe(suggestion.id)}
                    >
                      📋 Assign to Me
                    </button>
                  )}
                  <button
                    className="correct-btn"
                    onClick={() => handleCorrect(suggestion)}
                  >
                    ✏️ Submit Correction
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              ← Previous
            </button>
            <span>
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="admin-feedback-panel">
      <div className="panel-header">
        <h2>🤖 AI Feedback Management</h2>
        <p>Review and correct AI suggestions to improve system accuracy</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={activeTab === 'pending' ? 'active' : ''}
          onClick={() => setActiveTab('pending')}
        >
          📋 Pending Suggestions
          {pendingSuggestions.length > 0 && (
            <span className="badge">{pendingSuggestions.length}</span>
          )}
        </button>
        <button
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistics
        </button>
        {selectedSuggestion && (
          <button
            className={activeTab === 'correction' ? 'active' : ''}
            onClick={() => setActiveTab('correction')}
          >
            ✏️ Correction Form
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'pending' && renderPendingTab()}
        
        {activeTab === 'stats' && (
          <FeedbackStats />
        )}
        
        {activeTab === 'correction' && selectedSuggestion && (
          <CorrectionForm
            suggestion={selectedSuggestion}
            onSubmitSuccess={handleCorrectionSubmitted}
            onCancel={() => {
              setSelectedSuggestion(null);
              setActiveTab('pending');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AdminFeedbackPanel;
