/**
 * =====================================================
 * IP ACCESS CONTROL - ADMIN PAGE
 * =====================================================
 * Purpose: Manage IP addresses, view logs, allow/block devices
 * Author: K-Wise Security Team
 * Date: November 18, 2025
 * =====================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import './IPAccessControl.css';

const IPAccessControl = () => {
  const [activeTab, setActiveTab] = useState('all'); // all, allowed, blocked, pending
  const [ipList, setIpList] = useState([]);
  const [ipLogs, setIpLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageLimit] = useState(20);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('last_seen');
  const [sortOrder, setSortOrder] = useState('DESC');
  
  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedIP, setSelectedIP] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [editingDeviceName, setEditingDeviceName] = useState(null);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  
  // Loading states for buttons
  const [loadingAction, setLoadingAction] = useState(null); // 'allow-{id}', 'block-{id}', 'delete-{id}'

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  /**
   * Fetch IP statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/ip/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      console.error('Error fetching IP stats:', err);
    }
  }, [API_BASE]);

  /**
   * Fetch IP list with filters
   */
  const fetchIPList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      // Fix: Don't pass 'logs' as status filter - it's not a valid enum value
      const statusFilter = (activeTab === 'all' || activeTab === 'logs') ? '' : activeTab;
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: pageLimit,
        status: statusFilter,
        search: searchTerm,
        sortBy,
        sortOrder
      });
      
      const response = await fetch(`${API_BASE}/api/ip/all?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch IP list');
      
      const data = await response.json();
      setIpList(data.data.items);
      setTotalPages(data.data.pagination.totalPages);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching IP list:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, activeTab, currentPage, pageLimit, searchTerm, sortBy, sortOrder]);

  /**
   * Fetch IP access logs
   */
  const fetchLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/ip/logs?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setIpLogs(data.data.items);
    } catch (err) {
      console.error('Error fetching IP logs:', err);
    }
  }, [API_BASE]);

  /**
   * Allow an IP address
   */
  const handleAllowIP = async (ipId) => {
    try {
      setLoadingAction(`allow-${ipId}`);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/ip/${ipId}/allow`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to allow IP');
      }
      
      const data = await response.json();
      alert(data.message || 'IP address allowed successfully');
      
      // Immediate refresh instead of waiting for auto-refresh
      await Promise.all([fetchIPList(), fetchStats()]);
    } catch (err) {
      console.error('Error allowing IP:', err);
      alert(`Failed to allow IP address: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  /**
   * Block an IP address
   */
  const handleBlockIP = async () => {
    if (!selectedIP || !blockReason.trim()) {
      alert('Please provide a reason for blocking');
      return;
    }
    
    try {
      setLoadingAction(`block-${selectedIP.id}`);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/ip/${selectedIP.id}/block`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: blockReason })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to block IP');
      }
      
      const data = await response.json();
      alert(data.message || 'IP address blocked successfully');
      
      setShowBlockModal(false);
      setSelectedIP(null);
      setBlockReason('');
      
      // Immediate refresh instead of waiting for auto-refresh
      await Promise.all([fetchIPList(), fetchStats()]);
    } catch (err) {
      console.error('Error blocking IP:', err);
      alert(`Failed to block IP address: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  /**
   * Delete an IP record
   */
  const handleDeleteIP = async (ipId) => {
    if (!window.confirm('Are you sure you want to delete this IP record? This action cannot be undone.')) return;
    
    try {
      setLoadingAction(`delete-${ipId}`);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/ip/${ipId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete IP');
      }
      
      const data = await response.json();
      alert(data.message || 'IP record deleted successfully');
      
      // Immediate refresh instead of waiting for auto-refresh
      await Promise.all([fetchIPList(), fetchStats()]);
    } catch (err) {
      console.error('Error deleting IP:', err);
      alert(`Failed to delete IP record: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  /**
   * Update device name
   */
  const handleUpdateDeviceName = async (ipId) => {
    if (!deviceNameInput.trim()) {
      alert('Device name cannot be empty');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/ip/${ipId}/device-name`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deviceName: deviceNameInput })
      });
      
      if (!response.ok) throw new Error('Failed to update device name');
      
      setEditingDeviceName(null);
      setDeviceNameInput('');
      
      fetchIPList();
    } catch (err) {
      console.error('Error updating device name:', err);
      alert('Failed to update device name');
    }
  };

  /**
   * View IP details
   */
  const handleViewDetails = async (ip) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/ip/${ip.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch IP details');
      
      const data = await response.json();
      setSelectedIP(data.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching IP details:', err);
      alert('Failed to fetch IP details');
    }
  };

  // Initial data load
  useEffect(() => {
    fetchStats();
    fetchIPList();
    fetchLogs();
  }, [fetchStats, fetchIPList, fetchLogs]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchIPList();
      fetchStats();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchIPList, fetchStats]);

  // Real-time updates via Socket.io AND window events
  useEffect(() => {
    // Handler for custom events dispatched by socketService
    const handleIPAccessUpdate = (event) => {
      const { type, data } = event.detail;
      
      console.log(`🔄 IP Access Update (${type}):`, data);
      
      switch (type) {
        case 'new':
          // New IP detected
          fetchIPList();
          fetchStats();
          break;
        case 'blocked':
          // Blocked IP attempt
          fetchLogs();
          break;
        case 'statusChanged':
          // IP status changed (allow/block)
          fetchIPList();
          fetchStats();
          fetchLogs();
          break;
        default:
          console.warn('Unknown IP update type:', type);
      }
    };

    // Listen for custom events dispatched by socketService
    window.addEventListener('ipAccessUpdate', handleIPAccessUpdate);

    // Also listen directly to window.io if available (fallback)
    if (window.io && window.io.connected) {
      console.log('✅ Socket.IO available, attaching direct listeners');
      
      const handleNewIP = (data) => {
        console.log('🆕 New IP detected (direct):', data);
        fetchIPList();
        fetchStats();
      };
      
      const handleBlockedAttempt = (data) => {
        console.log('🚫 Blocked IP attempt (direct):', data);
        fetchLogs();
      };
      
      const handleStatusChange = (data) => {
        console.log('🔄 IP status changed (direct):', data);
        fetchIPList();
        fetchStats();
      };
      
      window.io.on('newIPDetected', handleNewIP);
      window.io.on('blockedIPAttempt', handleBlockedAttempt);
      window.io.on('ipStatusChanged', handleStatusChange);
      
      return () => {
        window.removeEventListener('ipAccessUpdate', handleIPAccessUpdate);
        window.io.off('newIPDetected', handleNewIP);
        window.io.off('blockedIPAttempt', handleBlockedAttempt);
        window.io.off('ipStatusChanged', handleStatusChange);
      };
    }

    return () => {
      window.removeEventListener('ipAccessUpdate', handleIPAccessUpdate);
    };
  }, [fetchIPList, fetchStats, fetchLogs]);

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  /**
   * Format time ago
   */
  const timeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  /**
   * Get status badge CSS class
   */
  const getStatusClass = (status) => {
    switch (status) {
      case 'allowed':
        return 'status-badge status-allowed';
      case 'blocked':
        return 'status-badge status-blocked';
      case 'pending':
        return 'status-badge status-pending';
      default:
        return 'status-badge';
    }
  };

  return (
    <div className="ip-access-control">
      <div className="ip-header">
        <div className="ip-header-left">
          <h1>🔒 IP Access Control</h1>
          <p className="ip-subtitle">Network-level security management</p>
        </div>
        
        <div className="ip-header-right">
          {/* Socket.IO connection status */}
          <div className="socket-status">
            {window.io?.connected ? (
              <span className="status-connected" title="Real-time updates active">
                🟢 Real-time
              </span>
            ) : (
              <span className="status-disconnected" title="Using polling (5s delay)">
                🔴 Polling mode
              </span>
            )}
          </div>
          
          <div className="auto-refresh-toggle">
            <label>
              <input 
                type="checkbox" 
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <span className="last-update">Last updated: {timeAgo(lastUpdate)}</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="ip-stats-cards">
        <div className="ip-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats.total || 0}</h3>
            <p>Total IPs</p>
          </div>
        </div>
        
        <div className="ip-stat-card stat-success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.allowed || 0}</h3>
            <p>Allowed</p>
          </div>
        </div>
        
        <div className="ip-stat-card stat-danger">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <h3>{stats.blocked || 0}</h3>
            <p>Blocked</p>
          </div>
        </div>
        
        <div className="ip-stat-card stat-warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.pending || 0}</h3>
            <p>Pending</p>
          </div>
        </div>
        
        <div className="ip-stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <h3>{stats.active_last_hour || 0}</h3>
            <p>Active (1h)</p>
          </div>
        </div>
        
        <div className="ip-stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>{stats.total_requests || 0}</h3>
            <p>Total Requests</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ip-tabs">
        <button 
          className={activeTab === 'all' ? 'tab-active' : ''}
          onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
        >
          All Devices ({stats.total || 0})
        </button>
        <button 
          className={activeTab === 'allowed' ? 'tab-active' : ''}
          onClick={() => { setActiveTab('allowed'); setCurrentPage(1); }}
        >
          Allowed ({stats.allowed || 0})
        </button>
        <button 
          className={activeTab === 'blocked' ? 'tab-active' : ''}
          onClick={() => { setActiveTab('blocked'); setCurrentPage(1); }}
        >
          Blocked ({stats.blocked || 0})
        </button>
        <button 
          className={activeTab === 'pending' ? 'tab-active' : ''}
          onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
        >
          Pending ({stats.pending || 0})
        </button>
        <button 
          className={activeTab === 'logs' ? 'tab-active' : ''}
          onClick={() => setActiveTab('logs')}
        >
          Access Logs
        </button>
      </div>

      {/* Search and Filters */}
      {activeTab !== 'logs' && (
        <div className="ip-filters">
          <input 
            type="text"
            placeholder="Search by IP address or device name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="last_seen">Sort by Last Seen</option>
            <option value="first_seen">Sort by First Seen</option>
            <option value="total_requests">Sort by Requests</option>
            <option value="ip_address">Sort by IP Address</option>
          </select>
          
          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="sort-select"
          >
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>
        </div>
      )}

      {/* Content */}
      <div className="ip-content">
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">Error: {error}</div>}
        
        {!loading && !error && activeTab !== 'logs' && (
          <>
            <div className="ip-table-container">
              <table className="ip-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Status</th>
                    <th>Device Name</th>
                    <th>First Seen</th>
                    <th>Last Seen</th>
                    <th>Requests</th>
                    <th>Failed Logins</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ipList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="no-data">No IP addresses found</td>
                    </tr>
                  ) : (
                    ipList.map(ip => (
                      <tr key={ip.id}>
                        <td>
                          <code className="ip-address">{ip.ip_address}</code>
                        </td>
                        <td>
                          <span className={getStatusClass(ip.status)}>
                            {ip.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {editingDeviceName === ip.id ? (
                            <div className="device-name-edit">
                              <input 
                                type="text"
                                value={deviceNameInput}
                                onChange={(e) => setDeviceNameInput(e.target.value)}
                                placeholder="Device name"
                                className="device-name-input"
                              />
                              <button 
                                onClick={() => handleUpdateDeviceName(ip.id)}
                                className="btn-save"
                              >
                                ✓
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingDeviceName(null);
                                  setDeviceNameInput('');
                                }}
                                className="btn-cancel"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="device-name-display">
                              <span>{ip.device_name || 'Unknown Device'}</span>
                              <button 
                                onClick={() => {
                                  setEditingDeviceName(ip.id);
                                  setDeviceNameInput(ip.device_name || '');
                                }}
                                className="btn-edit"
                                title="Edit device name"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </td>
                        <td>{formatTimestamp(ip.first_seen)}</td>
                        <td>
                          <span title={formatTimestamp(ip.last_seen)}>
                            {timeAgo(ip.last_seen)}
                          </span>
                        </td>
                        <td>{ip.total_requests}</td>
                        <td>
                          {ip.failed_login_attempts > 0 && (
                            <span className="failed-logins-badge">
                              {ip.failed_login_attempts}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              onClick={() => handleViewDetails(ip)}
                              className="btn-details"
                              title="View details"
                              disabled={loadingAction !== null}
                            >
                              👁️
                            </button>
                            
                            {ip.status !== 'allowed' && (
                              <button 
                                onClick={() => handleAllowIP(ip.id)}
                                className="btn-allow"
                                title="Allow this IP"
                                disabled={loadingAction !== null}
                              >
                                {loadingAction === `allow-${ip.id}` ? '⏳' : '✅'}
                              </button>
                            )}
                            
                            {ip.status !== 'blocked' && (
                              <button 
                                onClick={() => {
                                  setSelectedIP(ip);
                                  setShowBlockModal(true);
                                }}
                                className="btn-block"
                                title="Block this IP"
                                disabled={loadingAction !== null}
                              >
                                🚫
                              </button>
                            )}
                            
                            <button 
                              onClick={() => handleDeleteIP(ip.id)}
                              className="btn-delete"
                              title="Delete record"
                              disabled={loadingAction !== null}
                            >
                              {loadingAction === `delete-${ip.id}` ? '⏳' : '🗑️'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-pagination"
                >
                  Previous
                </button>
                
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-pagination"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Logs Tab */}
        {!loading && !error && activeTab === 'logs' && (
          <div className="logs-container">
            <h3>Recent Access Logs (Last 50)</h3>
            <div className="logs-table-container">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>IP Address</th>
                    <th>Action</th>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Status</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {ipLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">No logs available</td>
                    </tr>
                  ) : (
                    ipLogs.map(log => (
                      <tr key={log.id} className={!log.success ? 'log-failed' : ''}>
                        <td>{formatTimestamp(log.created_at)}</td>
                        <td><code>{log.ip_address}</code></td>
                        <td>
                          <span className={`action-badge action-${log.action_type}`}>
                            {log.action_type}
                          </span>
                        </td>
                        <td><code>{log.request_method}</code></td>
                        <td className="log-path">{log.request_path}</td>
                        <td>
                          {log.success ? (
                            <span className="status-success">✓ Success</span>
                          ) : (
                            <span className="status-failed" title={log.blocked_reason}>
                              ✗ Failed
                            </span>
                          )}
                        </td>
                        <td>{log.user_name || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="modal-overlay" onClick={() => setShowBlockModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🚫 Block IP Address</h2>
              <button 
                onClick={() => setShowBlockModal(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <p>
                You are about to block: <code>{selectedIP?.ip_address}</code>
              </p>
              
              <div className="form-group">
                <label>
                  Reason for blocking: <span style={{color: '#e53e3e'}}>*</span>
                </label>
                <textarea 
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Enter reason for blocking this IP..."
                  rows="4"
                  className="block-reason-input"
                  autoFocus
                />
                {!blockReason.trim() && (
                  <small style={{color: '#a0aec0', marginTop: '4px', display: 'block'}}>
                    ℹ️ Please enter a reason to enable the Block button
                  </small>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                  setSelectedIP(null);
                }}
                className="btn-cancel-modal"
                disabled={loadingAction !== null}
              >
                Cancel
              </button>
              <button 
                onClick={handleBlockIP}
                className="btn-confirm-block"
                disabled={!blockReason.trim() || loadingAction !== null}
              >
                {loadingAction ? '⏳ Blocking...' : '🚫 Block IP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedIP && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 IP Details</h2>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <label>IP Address:</label>
                  <code>{selectedIP.ip_address}</code>
                </div>
                
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={getStatusClass(selectedIP.status)}>
                    {selectedIP.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="detail-item">
                  <label>Device Name:</label>
                  <span>{selectedIP.device_name || 'Unknown'}</span>
                </div>
                
                <div className="detail-item">
                  <label>User Agent:</label>
                  <span className="user-agent">{selectedIP.user_agent || 'N/A'}</span>
                </div>
                
                <div className="detail-item">
                  <label>First Seen:</label>
                  <span>{formatTimestamp(selectedIP.first_seen)}</span>
                </div>
                
                <div className="detail-item">
                  <label>Last Seen:</label>
                  <span>{formatTimestamp(selectedIP.last_seen)}</span>
                </div>
                
                <div className="detail-item">
                  <label>Total Requests:</label>
                  <span>{selectedIP.total_requests}</span>
                </div>
                
                <div className="detail-item">
                  <label>Failed Logins:</label>
                  <span>{selectedIP.failed_login_attempts}</span>
                </div>
                
                {selectedIP.blocked_reason && (
                  <div className="detail-item full-width">
                    <label>Block Reason:</label>
                    <span className="block-reason">{selectedIP.blocked_reason}</span>
                  </div>
                )}
                
                {selectedIP.blocked_by_name && (
                  <div className="detail-item">
                    <label>Blocked By:</label>
                    <span>{selectedIP.blocked_by_name}</span>
                  </div>
                )}
                
                {selectedIP.blocked_at && (
                  <div className="detail-item">
                    <label>Blocked At:</label>
                    <span>{formatTimestamp(selectedIP.blocked_at)}</span>
                  </div>
                )}
              </div>
              
              {selectedIP.recentLogs && selectedIP.recentLogs.length > 0 && (
                <div className="recent-logs">
                  <h3>Recent Activity (Last 50 requests)</h3>
                  <table className="logs-table-small">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Action</th>
                        <th>Path</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedIP.recentLogs.map(log => (
                        <tr key={log.id}>
                          <td>{timeAgo(log.created_at)}</td>
                          <td>{log.action_type}</td>
                          <td className="log-path">{log.request_path}</td>
                          <td>
                            {log.success ? '✓' : '✗'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="btn-close-modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPAccessControl;
