/**
 * PRIORITY 3: Admin Feedback Review Component
 * Allows admins to review, verify, or reject user feedback submissions
 * 
 * Features:
 * - View pending feedback queue
 * - Filter by severity, component type, and status
 * - Approve/reject feedback with admin notes
 * - View helpful votes and user context
 * - Real-time updates
 */

import React, { useState, useEffect } from 'react';
import { getServerBaseUrl } from '../../utils/networkConfig';
import './AdminFeedbackReview.css';

const AdminFeedbackReview = () => {
  const [feedbackQueue, setFeedbackQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    severity: 'all',
    category: 'all',
    status: 'pending'
  });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: '',
    admin_notes: ''
  });

  // Fetch pending feedback
  useEffect(() => {
    fetchPendingFeedback();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingFeedback, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchPendingFeedback = async () => {
    setLoading(true);
    setError(null);

    try {      const params = new URLSearchParams({
        limit: 50,
        ...filters
      });

      const response = await fetch(
        `${getServerBaseUrl()}/api/feedback/admin/pending?${params}`,
        {
          headers: {            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pending feedback');
      }

      const data = await response.json();
      setFeedbackQueue(data.feedback || []);

    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (feedback) => {
    setSelectedFeedback(feedback);
    setReviewModal(true);
    setReviewData({
      status: '',
      admin_notes: ''
    });
  };

  const submitReview = async () => {
    if (!reviewData.status) {
      alert('Please select a review status (Approve or Reject)');
      return;
    }

    try {      const response = await fetch(
        `${getServerBaseUrl()}/api/feedback/admin/${selectedFeedback.id}/review`,
        {
          method: 'POST',
          headers: {            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reviewData)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      // Close modal and refresh
      setReviewModal(false);
      setSelectedFeedback(null);
      fetchPendingFeedback();

      alert(`✅ Feedback ${reviewData.status === 'verified' ? 'approved' : 'rejected'} successfully!`);

    } catch (err) {
      console.error('Error submitting review:', err);
      alert('❌ Failed to submit review: ' + err.message);
    }
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      critical: { color: '#dc3545', text: '🔴 CRITICAL', bg: '#dc354520' },
      major: { color: '#fd7e14', text: '🟠 MAJOR', bg: '#fd7e1420' },
      minor: { color: '#ffc107', text: '🟡 MINOR', bg: '#ffc10720' },
      positive: { color: '#28a745', text: '🟢 POSITIVE', bg: '#28a74520' }
    };
    
    const badge = badges[severity] || badges.minor;
    
    return (
      <span 
        className="severity-badge" 
        style={{ 
          color: badge.color, 
          background: badge.bg,
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: '600',
          border: `1.5px solid ${badge.color}`
        }}
      >
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const renderFeedbackQueue = () => {
    if (loading && feedbackQueue.length === 0) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading feedback...</p>
        </div>
      );
    }
    if (feedbackQueue.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h3>All caught up!</h3>
          <p>No pending feedback to review</p>
        </div>
      );
    }
    return (<>
      {feedbackQueue.map((feedback) => (
        <div key={feedback.id} className="feedback-card">
        <div className="feedback-header">
          <div className="feedback-meta">
            {getSeverityBadge(feedback.severity)}
            <span className="category-tag">{feedback.component_category}</span>
            <span className="time-ago">{formatDate(feedback.created_at)}</span>
          </div>
          <div className="feedback-votes">
            <span className="vote-count">👍 {feedback.helpful_votes || 0} helpful</span>
          </div>
        </div>

        <div className="feedback-content">
          <div className="component-info">
            <strong>Component:</strong> {feedback.component_name}
          </div>
          <div className="issue-type">
            <strong>Type:</strong> {feedback.issue_type}
          </div>
          {feedback.title && (
            <h4 className="feedback-title">{feedback.title}</h4>
          )}
          <p className="feedback-description">{feedback.description}</p>
          
          {feedback.rating && (
            <div className="feedback-rating">
              <strong>Rating:</strong>
              <span className="stars">{'⭐'.repeat(feedback.rating)}</span>
              <span className="rating-num">({feedback.rating}/5)</span>
            </div>
          )}

          {feedback.build_context && (
            <details className="build-context">
              <summary>🔧 Build Context</summary>
              <pre>{JSON.stringify(feedback.build_context, null, 2)}</pre>
            </details>
          )}
        </div>

        <div className="feedback-footer">
          <div className="user-info">
            <span className="username">👤 {feedback.username}</span>
          </div>
          <div className="review-actions">
            <button 
              onClick={() => handleReview(feedback)}
              className="btn-review"
            >
              ✏️ Review
            </button>
          </div>
        </div>
        </div>
      ))}
    </>);
  };

  return (
    <div className="admin-feedback-review">
      <div className="review-header">
        <div className="header-title">
          <h2>📋 Feedback Review Queue</h2>
          <span className="queue-count">{feedbackQueue.length} pending</span>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={fetchPendingFeedback} 
            className="btn-refresh"
            disabled={loading}
          >
            🔄 {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="review-filters">
        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Severities</option>
          <option value="critical">🔴 Critical Only</option>
          <option value="major">🟠 Major Only</option>
          <option value="minor">🟡 Minor Only</option>
          <option value="positive">🟢 Positive Only</option>
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          <option value="cpu">CPU</option>
          <option value="gpu">GPU</option>
          <option value="motherboard">Motherboard</option>
          <option value="ram">RAM</option>
          <option value="storage">Storage</option>
          <option value="psu">PSU</option>
          <option value="cooling">Cooling</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Feedback Queue */}
      <div className="feedback-queue">
        {renderFeedbackQueue()}
      </div>

      {/* Review Modal */}
      {reviewModal && selectedFeedback && (
        <button className="modal-overlay" aria-label="Close modal" onClick={(e) => { if (e.target === e.currentTarget) setReviewModal(false); }} onKeyDown={(e) => { if (e.key === 'Escape') setReviewModal(false); }}>
          <dialog className="modal-content" open>
            <div className="modal-header">
              <h3>📝 Review Feedback</h3>
              <button 
                onClick={() => setReviewModal(false)}
                className="btn-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="review-summary">
                <div className="summary-row">
                  <strong>Component:</strong>
                  <span>{selectedFeedback.component_name}</span>
                </div>
                <div className="summary-row">
                  <strong>Severity:</strong>
                  {getSeverityBadge(selectedFeedback.severity)}
                </div>
                <div className="summary-row">
                  <strong>Issue Type:</strong>
                  <span>{selectedFeedback.issue_type}</span>
                </div>
                <div className="summary-row">
                  <strong>User:</strong>
                  <span>{selectedFeedback.username}</span>
                </div>
                <div className="summary-row">
                  <strong>Helpful Votes:</strong>
                  <span>👍 {selectedFeedback.helpful_votes || 0}</span>
                </div>
              </div>

              <div className="review-description">
                <p>{selectedFeedback.description}</p>
              </div>

              <div className="review-form">
                <div>
                  <strong>Decision:</strong>
                  <div className="decision-buttons">
                    <button
                      className={`btn-decision ${reviewData.status === 'verified' ? 'active approve' : ''}`}
                      onClick={() => setReviewData({ ...reviewData, status: 'verified' })}
                    >
                      ✅ Approve
                    </button>
                    <button
                      className={`btn-decision ${reviewData.status === 'rejected' ? 'active reject' : ''}`}
                      onClick={() => setReviewData({ ...reviewData, status: 'rejected' })}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>

                <label htmlFor="admin-notes-textarea">
                  <strong>Admin Notes:</strong>
                  <textarea
                    id="admin-notes-textarea"
                    value={reviewData.admin_notes}
                    onChange={(e) => setReviewData({ ...reviewData, admin_notes: e.target.value })}
                    placeholder="Add notes about this review (optional)..."
                    rows="4"
                    className="admin-notes-input"
                  />
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setReviewModal(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={submitReview}
                className="btn-submit"
                disabled={!reviewData.status}
              >
                💾 Submit Review
              </button>
            </div>
          </dialog>
        </button>
      )}
    </div>
  );
};

export default AdminFeedbackReview;
