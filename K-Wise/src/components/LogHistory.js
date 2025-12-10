import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './LogHistory.css';

const LogHistory = () => {
    const { user } = useContext(AuthContext);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    
    // Filters and pagination
    const [filters, setFilters] = useState({
        search: '',
        action: '',
        tableName: '',
        userId: '',
        dateRange: '24h'
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
    });

    // Real-time refresh interval
    const [refreshInterval, setRefreshInterval] = useState(null);

    // Available filter options
    const [filterOptions, setFilterOptions] = useState({
        actions: [],
        tables: [],
        users: []
    });

    useEffect(() => {
        loadLogs();
        loadFilterOptions();
        
        if (autoRefresh) {
            const interval = setInterval(loadLogs, 10000); // Refresh every 10 seconds
            setRefreshInterval(interval);
        }

        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [filters, pagination.page, autoRefresh]);

    useEffect(() => {
        if (autoRefresh && !refreshInterval) {
            const interval = setInterval(loadLogs, 10000);
            setRefreshInterval(interval);
        } else if (!autoRefresh && refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
        }
    }, [autoRefresh]);

    const loadLogs = async () => {
        try {
            setError('');

            const queryParams = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
            });

            const response = await fetch(`/api/audit-logs?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load logs');
            }

            const data = await response.json();
            
            // Ensure logs is always an array
            const logsData = Array.isArray(data.data) ? data.data : [];
            setLogs(logsData);
            
            // Ensure pagination object has default values
            const paginationData = data.pagination || {
                page: 1,
                limit: 50,
                total: 0,
                pages: 0
            };
            setPagination(prev => ({ ...prev, ...paginationData }));

        } catch (error) {
            console.error('Error loading logs:', error);
            setError('Failed to load logs');
        } finally {
            setLoading(false);
        }
    };

    const loadFilterOptions = async () => {
        try {
            const response = await fetch('/api/audit-logs/filters', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setFilterOptions(data.data || { actions: [], tables: [], users: [] });
            }
        } catch (error) {
            console.error('Error loading filter options:', error);
        }
    };

    const exportLogs = async (format = 'csv') => {
        try {
            const queryParams = new URLSearchParams({
                format,
                ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
            });

            const response = await fetch(`/api/audit-logs/export?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to export logs');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Error exporting logs:', error);
            setError('Failed to export logs');
        }
    };

    const getActionIcon = (action) => {
        const icons = {
            LOGIN: 'fas fa-sign-in-alt',
            LOGOUT: 'fas fa-sign-out-alt',
            CREATE: 'fas fa-plus-circle',
            UPDATE: 'fas fa-edit',
            DELETE: 'fas fa-trash',
            VIEW: 'fas fa-eye',
            SEARCH: 'fas fa-search',
            EXPORT: 'fas fa-download',
            CREATE_USER: 'fas fa-user-plus',
            UPDATE_USER: 'fas fa-user-edit',
            DELETE_USER: 'fas fa-user-minus',
            VIEW_USERS: 'fas fa-users',
            VIEW_USER: 'fas fa-user'
        };
        return icons[action] || 'fas fa-info-circle';
    };

    const getActionColor = (action) => {
        const colors = {
            LOGIN: 'success',
            LOGOUT: 'info',
            CREATE: 'success',
            UPDATE: 'warning',
            DELETE: 'danger',
            VIEW: 'info',
            SEARCH: 'secondary',
            EXPORT: 'primary'
        };
        return colors[action] || 'secondary';
    };

    const formatLogDetails = (log) => {
        const details = [];
        
        if (log.table_name) {
            details.push(`Table: ${log.table_name}`);
        }
        
        if (log.record_id) {
            details.push(`Record ID: ${log.record_id}`);
        }
        
        if (log.ip_address) {
            details.push(`IP: ${log.ip_address}`);
        }
        
        if (log.user_agent) {
            const userAgent = log.user_agent.length > 50 
                ? `${log.user_agent.substring(0, 50)}...` 
                : log.user_agent;
            details.push(`Agent: ${userAgent}`);
        }
        
        return details;
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);
        
        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    if (loading && (!logs || logs.length === 0)) {
        return (
            <div className="log-history">
                <div className="loading">Loading logs...</div>
            </div>
        );
    }

    return (
        <div className="log-history">
            <div className="log-history-header">
                <div className="header-title">
                    <h2>
                        <i className="fas fa-history"></i>
                        Log History
                        {autoRefresh && <span className="live-indicator">● LIVE</span>}
                    </h2>
                    <p>Real-time tracking of user activities and system events</p>
                </div>
                
                <div className="header-actions">
                    <button
                        className={`btn btn-sm ${autoRefresh ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        <i className={`fas ${autoRefresh ? 'fa-pause' : 'fa-play'}`}></i>
                        {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
                    </button>
                    
                    <button
                        className="btn btn-sm btn-primary"
                        onClick={loadLogs}
                    >
                        <i className="fas fa-sync-alt"></i>
                        Refresh
                    </button>
                    
                    <div className="dropdown">
                        <button className="btn btn-sm btn-secondary dropdown-toggle">
                            <i className="fas fa-download"></i>
                            Export
                        </button>
                        <div className="dropdown-menu">
                            <button onClick={() => exportLogs('csv')}>Export as CSV</button>
                            <button onClick={() => exportLogs('json')}>Export as JSON</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="filters">
                    <div className="filter-group">
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="form-control"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <select
                            value={filters.action}
                            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                            className="form-control"
                        >
                            <option value="">All Actions</option>
                            {(filterOptions.actions || []).map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <select
                            value={filters.tableName}
                            onChange={(e) => setFilters(prev => ({ ...prev, tableName: e.target.value }))}
                            className="form-control"
                        >
                            <option value="">All Tables</option>
                            {(filterOptions.tables || []).map(table => (
                                <option key={table} value={table}>{table}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <select
                            value={filters.userId}
                            onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                            className="form-control"
                        >
                            <option value="">All Users</option>
                            {(filterOptions.users || []).map(userOption => (
                                <option key={userOption.id} value={userOption.id}>
                                    {userOption.name} ({userOption.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <select
                            value={filters.dateRange}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                            className="form-control"
                        >
                            <option value="">All Time</option>
                            <option value="1h">Last Hour</option>
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                    </div>

                    <button 
                        className="btn btn-secondary"
                        onClick={() => {
                            setFilters({ search: '', action: '', tableName: '', userId: '', dateRange: '24h' });
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && <div className="alert alert-danger">{error}</div>}

            {/* Logs Timeline */}
            <div className="logs-container">
                {!logs || logs.length === 0 ? (
                    <div className="no-logs">
                        <i className="fas fa-history"></i>
                        <p>No logs found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="logs-timeline">
                        {logs.map(log => (
                            <div key={log.id} className="log-entry">
                                <div className="log-icon">
                                    <i className={`${getActionIcon(log.action)} ${getActionColor(log.action)}`}></i>
                                </div>
                                
                                <div className="log-content">
                                    <div className="log-header">
                                        <div className="log-action">
                                            <span className={`action-badge ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                            <span className="log-user">{log.user_name || 'System'}</span>
                                        </div>
                                        <div className="log-time">
                                            <span className="time-ago">{formatTimeAgo(log.created_at)}</span>
                                            <span className="exact-time">
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="log-details">
                                        {formatLogDetails(log).map((detail, index) => (
                                            <span key={index} className="log-detail">{detail}</span>
                                        ))}
                                    </div>
                                    
                                    {(log.old_values || log.new_values) && (
                                        <div className="log-changes">
                                            {log.old_values && (
                                                <div className="changes-section">
                                                    <strong>Before:</strong>
                                                    <pre>{JSON.stringify(log.old_values, null, 2)}</pre>
                                                </div>
                                            )}
                                            {log.new_values && (
                                                <div className="changes-section">
                                                    <strong>After:</strong>
                                                    <pre>{JSON.stringify(log.new_values, null, 2)}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="pagination">
                    <button
                        className="btn btn-sm"
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                        <i className="fas fa-chevron-left"></i> Previous
                    </button>
                    
                    <div className="page-info">
                        <span>Page {pagination.page} of {pagination.pages}</span>
                        <span className="total-info">({pagination.total} total logs)</span>
                    </div>
                    
                    <button
                        className="btn btn-sm"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                        Next <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
            )}
        </div>
    );
};

export default LogHistory;
