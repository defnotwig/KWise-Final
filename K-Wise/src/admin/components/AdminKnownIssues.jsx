/**
 * PRIORITY 3: Admin Known Issues Manager Component
 * Manage compatibility issues reported by users
 * 
 * Features:
 * - View all known issues
 * - Filter by severity, status, components
 * - Verify issues (increase verification count)
 * - Mark issues as resolved with solution
 * - Add/edit workarounds and BIOS updates
 * - Close issues when no longer applicable
 */

import React, { useState, useEffect } from 'react';
import { getServerBaseUrl } from '../../utils/networkConfig';
import './AdminKnownIssues.css';

const AdminKnownIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    severity: 'all',
    status: 'all',
    search: ''
  });
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolveModal, setResolveModal] = useState(false);
  const [resolveData, setResolveData] = useState({
    solution: '',
    workaround: '',
    bios_update: ''
  });

  // Fetch issues
  useEffect(() => {
    fetchKnownIssues();
    // Refresh every 60 seconds
    const interval = setInterval(fetchKnownIssues, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchKnownIssues = async () => {
    setLoading(true);
    setError(null);

    try {      
      // Build component IDs array (empty for all)
      const componentIds = [];
      
      const response = await fetch(
        `${getServerBaseUrl()}/api/feedback/check-issues`,
        {
          method: 'POST',
          headers: {            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ component_ids: componentIds })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch known issues');
      }

      const data = await response.json();
      
      // Apply filters
      let filteredIssues = data.issues || [];
      
      if (filters.severity !== 'all') {
        filteredIssues = filteredIssues.filter(i => i.severity === filters.severity);
      }
      
      if (filters.status !== 'all') {
        filteredIssues = filteredIssues.filter(i => {
          if (filters.status === 'active') return i.status === 'active';
          if (filters.status === 'resolved') return i.status === 'resolved';
          if (filters.status === 'closed') return i.status === 'closed';
          return true;
        });
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredIssues = filteredIssues.filter(i => 
          i.issue_title?.toLowerCase().includes(searchLower) ||
          i.issue_description?.toLowerCase().includes(searchLower) ||
          i.component1_name?.toLowerCase().includes(searchLower) ||
          i.component2_name?.toLowerCase().includes(searchLower)
        );
      }

      setIssues(filteredIssues);

    } catch (err) {
      console.error('Error fetching issues:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIssue = async (issueId) => {
    try {      const response = await fetch(
        `${getServerBaseUrl()}/api/feedback/known-issue/${issueId}/verify`,
        {
          method: 'POST',
          headers: {            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify issue');
      }

      alert('✅ Issue verified successfully!');
      fetchKnownIssues();

    } catch (err) {
      console.error('Error verifying issue:', err);
      alert('❌ Failed to verify issue: ' + err.message);
    }
  };

  const handleResolve = (issue) => {
    setSelectedIssue(issue);
    setResolveModal(true);
    setResolveData({
      solution: issue.solution || '',
      workaround: issue.workaround || '',
      bios_update: issue.bios_update || ''
    });
  };

  const submitResolve = async () => {
    if (!resolveData.solution.trim()) {
      alert('Please provide a solution description');
      return;
    }

    try {      const response = await fetch(
        `${getServerBaseUrl()}/api/feedback/known-issue/${selectedIssue.id}/resolve`,
        {
          method: 'POST',
          headers: {            'Content-Type': 'application/json'
          },
          body: JSON.stringify(resolveData)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resolve issue');
      }

      alert('✅ Issue marked as resolved!');
      setResolveModal(false);
      setSelectedIssue(null);
      fetchKnownIssues();

    } catch (err) {
      console.error('Error resolving issue:', err);
      alert('❌ Failed to resolve issue: ' + err.message);
    }
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      critical: { color: '#dc3545', text: '🔴 CRITICAL', bg: '#dc354520' },
      major: { color: '#fd7e14', text: '🟠 MAJOR', bg: '#fd7e1420' },
      minor: { color: '#ffc107', text: '🟡 MINOR', bg: '#ffc10720' }
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

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: '#3b82f6', text: '🔵 ACTIVE', bg: '#3b82f620' },
      resolved: { color: '#10b981', text: '🟢 RESOLVED', bg: '#10b98120' },
      closed: { color: '#6b7280', text: '⚫ CLOSED', bg: '#6b728020' }
    };
    
    const badge = badges[status] || badges.active;
    
    return (
      <span 
        className="status-badge" 
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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="admin-known-issues">
      <div className="issues-header">
        <div className="header-title">
          <h2>⚠️ Known Compatibility Issues</h2>
          <span className="issues-count">{issues.length} issues</span>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={fetchKnownIssues} 
            className="btn-refresh"
            disabled={loading}
          >
            🔄 {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="issues-filters">
        <input
          type="text"
          placeholder="🔍 Search issues..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />

        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Severities</option>
          <option value="critical">🔴 Critical Only</option>
          <option value="major">🟠 Major Only</option>
          <option value="minor">🟡 Minor Only</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Statuses</option>
          <option value="active">🔵 Active Only</option>
          <option value="resolved">🟢 Resolved Only</option>
          <option value="closed">⚫ Closed Only</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Issues List */}
      <div className="issues-list">
        {(() => {
          if (loading && issues.length === 0) {
            return (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading issues...</p>
              </div>
            );
          }
          if (issues.length === 0) {
            return (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h3>No issues found</h3>
                <p>No compatibility issues match your filters</p>
              </div>
            );
          }
          return (<>{issues.map((issue) => (
            <div key={issue.id} className="issue-card">
              <div className="issue-header">
                <div className="issue-badges">
                  {getSeverityBadge(issue.severity)}
                  {getStatusBadge(issue.status)}
                  <span className="verification-count">
                    ✓ {issue.verification_count || 0} verified
                  </span>
                </div>
                <div className="issue-dates">
                  <span className="reported-date">
                    Reported: {formatDate(issue.created_at)}
                  </span>
                </div>
              </div>

              <div className="issue-content">
                <h3 className="issue-title">{issue.issue_title}</h3>
                
                <div className="affected-components">
                  <strong>🔧 Affected Components:</strong>
                  <div className="component-tags">
                    {issue.component1_name && (
                      <span className="component-tag">
                        {issue.component1_name}
                      </span>
                    )}
                    {issue.component2_name && (
                      <>
                        <span className="separator">+</span>
                        <span className="component-tag">
                          {issue.component2_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <p className="issue-description">{issue.issue_description}</p>

                {issue.workaround && (
                  <div className="workaround-box">
                    <strong>💡 Workaround:</strong>
                    <p>{issue.workaround}</p>
                  </div>
                )}

                {issue.bios_update && (
                  <div className="bios-update-box">
                    <strong>🔧 BIOS Update Required:</strong>
                    <p>{issue.bios_update}</p>
                  </div>
                )}

                {issue.solution && (
                  <div className="solution-box">
                    <strong>✅ Solution:</strong>
                    <p>{issue.solution}</p>
                    {issue.resolved_at && (
                      <small>Resolved: {formatDate(issue.resolved_at)}</small>
                    )}
                  </div>
                )}
              </div>

              <div className="issue-footer">
                <div className="reported-by">
                  <span>👤 Reported by {issue.username || 'User'}</span>
                </div>
                <div className="issue-actions">
                  {issue.status === 'active' && (
                    <>
                      <button 
                        onClick={() => handleVerifyIssue(issue.id)}
                        className="btn-verify"
                      >
                        ✓ Verify
                      </button>
                      <button 
                        onClick={() => handleResolve(issue)}
                        className="btn-resolve"
                      >
                        ✅ Resolve
                      </button>
                    </>
                  )}
                  {issue.status === 'resolved' && (
                    <button 
                      onClick={() => handleResolve(issue)}
                      className="btn-edit"
                    >
                      ✏️ Edit Solution
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}</>);
        })()}
      </div>

      {/* Resolve Modal */}
      {resolveModal && selectedIssue && (
        <button type="button" className="modal-overlay" onClick={() => setResolveModal(false)}>
          <dialog open className="modal-content">
            <div className="modal-header">
              <h3>✅ Resolve Issue</h3>
              <button 
                onClick={() => setResolveModal(false)}
                className="btn-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="resolve-summary">
                <h4>{selectedIssue.issue_title}</h4>
                <div className="summary-badges">
                  {getSeverityBadge(selectedIssue.severity)}
                  <span className="verification-count">
                    ✓ {selectedIssue.verification_count || 0} verified
                  </span>
                </div>
                <p className="description">{selectedIssue.issue_description}</p>
              </div>

              <div className="resolve-form">
                <label>
                  <strong>Solution: *</strong>
                  <textarea
                    value={resolveData.solution}
                    onChange={(e) => setResolveData({ ...resolveData, solution: e.target.value })}
                    placeholder="Describe the solution or fix for this issue..."
                    rows="4"
                    className="form-textarea"
                    required
                  />
                </label>

                <label>
                  <strong>Workaround (Optional):</strong>
                  <textarea
                    value={resolveData.workaround}
                    onChange={(e) => setResolveData({ ...resolveData, workaround: e.target.value })}
                    placeholder="If available, describe a temporary workaround..."
                    rows="3"
                    className="form-textarea"
                  />
                </label>

                <label>
                  <strong>BIOS Update Info (Optional):</strong>
                  <input
                    type="text"
                    value={resolveData.bios_update}
                    onChange={(e) => setResolveData({ ...resolveData, bios_update: e.target.value })}
                    placeholder="e.g., Update to BIOS version F20 or later"
                    className="form-input"
                  />
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setResolveModal(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={submitResolve}
                className="btn-submit"
                disabled={!resolveData.solution.trim()}
              >
                💾 Save Solution
              </button>
            </div>
          </dialog>
        </button>
      )}
    </div>
  );
};

export default AdminKnownIssues;
