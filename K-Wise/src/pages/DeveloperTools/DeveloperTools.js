/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { FiCode, FiDatabase, FiTerminal, FiActivity, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { handleAPIError } from '../../services/api';
import { getApiBaseUrl } from '../../utils/networkConfig'; // Network-aware API URLs
import './DeveloperTools.css';

const DeveloperTools = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('api-testing');
    const [isLoading, setIsLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState('');
    const [systemStatus, setSystemStatus] = useState({});
    const [logs, setLogs] = useState([]);
    const [databaseStats, setDatabaseStats] = useState({});
    const [error, setError] = useState('');
    const [_lastUpdated, setLastUpdated] = useState(null); // NOSONAR - only setter is used

    // RBAC check
    const getUserRole = () => {
        return currentUser?.role || null;
    };

    const canAccessDeveloperTools = () => {
        const role = getUserRole();
        return role === 'superadmin' || role === 'developer';
    };

    useEffect(() => {
        if (!canAccessDeveloperTools()) {
            globalThis.location.href = '/admin/dashboard';
            return;
        }
        loadSystemStatus();
        loadDatabaseStats();
        loadRecentLogs();
        // Auto-poll every 30s
        const interval = setInterval(() => {
            loadSystemStatus();
            loadRecentLogs();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Enhanced: Load real system status from developer tools endpoint
    const loadSystemStatus = async () => {
        try {
            setError('');
            const response = await fetch(`${getApiBaseUrl()}/dev/system-status`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('📊 System Status Data:', result); // Debug log
            
            if (result.success && result.data) {
                const data = result.data;
                // Transform backend data to frontend format
                const memUsed = data.memory?.heapUsed || 0;
                const memTotal = data.memory?.heapTotal || 1;
                const memPercent = Math.round((memUsed / memTotal) * 100);
                
                const cpuUser = data.cpu?.user || 0;
                const cpuSystem = data.cpu?.system || 0;
                const cpuPercent = Math.min(100, Math.round(((cpuUser + cpuSystem) / 1000000) * 10));
                
                setSystemStatus({
                    apiStatus: data.database?.status === 'connected' ? 'online' : 'offline',
                    databaseStatus: data.database?.status === 'connected' ? 'online' : 'offline',
                    uptime: formatUptime(data.uptime || 0),
                    memoryUsage: `${memPercent}%`,
                    cpuUsage: `${cpuPercent}%`,
                    activeConnections: data.system?.cpuCount || 0,
                    rawData: data
                });
                console.log('✅ System status loaded successfully');
            }
            setLastUpdated(new Date());
        } catch (error) {
            setError('Failed to load system status: ' + error.message);
            console.error('Error loading system status:', error);
        }
    };
    
    // Helper function to format uptime
    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    // Enhanced: Load real database stats
    const loadDatabaseStats = async () => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/dev/database`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success && result.data) {
                const data = result.data;
                // Transform data to match expected format
                setDatabaseStats({
                    totalUsers: data.performance?.users_count || 0,
                    totalOrders: data.performance?.orders_count || 0,
                    totalProducts: data.performance?.products_count || 0,
                    databaseSize: data.performance?.database_size || 'N/A',
                    connectionPool: {
                        active: data.connections?.active_connections || 0,
                        idle: data.connections?.idle_connections || 0,
                        max: data.connections?.total_connections || 0
                    },
                    rawData: data
                });
            }
        } catch (error) {
            console.error('Error loading database stats:', error);
            setError('Failed to load database stats: ' + error.message);
        }
    };

    // Enhanced: Load real logs from system logs endpoint
    const loadRecentLogs = async () => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/dev/system-logs?limit=50`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    // Transform audit logs to log format
                    const formattedLogs = result.data.map(log => ({
                        id: log.id,
                        level: log.severity || 'info',
                        service: log.entity || 'system',
                        message: log.description || log.action,
                        timestamp: log.created_at,
                        user: log.user_name
                    }));
                    setLogs(formattedLogs);
                }
            }
        } catch (error) {
            console.error('Error loading recent logs:', error);
        }
    };

    // Phase 6: Test API endpoint with real endpoint listing
    const testApiEndpoint = async (endpoint) => {
        setIsLoading(true);
        setApiResponse('Testing...');

        try {
            const startTime = performance.now();
            
            // Phase 6: Get list of available endpoints first if testing general API
            if (endpoint === '/api/dev/api-docs') {
                const response = await fetch(`${getApiBaseUrl()}/dev/api-docs`, {
                    headers: {
                    'Content-Type': 'application/json'
                }
                });

                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);

                if (response.ok) {
                    const result = await response.json();
                    setApiResponse(`✅ Success (${responseTime}ms)\n\nAvailable Endpoints:\n${JSON.stringify(result.data, null, 2)}`);
                } else {
                    setApiResponse(`❌ Error: ${response.status} ${response.statusText}`);
                }
            } else {
                // Test other endpoints
                const response = await fetch(`${getApiBaseUrl().replace('/api', '')}${endpoint}`, {
                    headers: {
                    'Content-Type': 'application/json'
                }
                });

                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);

                if (response.ok) {
                    const result = await response.json();
                    setApiResponse(`✅ Success (${responseTime}ms)\n\n${JSON.stringify(result, null, 2)}`);
                } else {
                    setApiResponse(`❌ Error: ${response.status} ${response.statusText}`);
                }
            }
        } catch (error) {
            const errorInfo = handleAPIError(error);
            setApiResponse(`Error: ${errorInfo.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const getLogLevelColor = (level) => {
        switch (level) {
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'debug';
        }
    };

    if (!canAccessDeveloperTools()) {
        return (
            <div className="developer-tools-container">
                <div className="access-denied">
                    <h2>Access Denied</h2>
                    <p>You don't have permission to access Developer Tools.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="developer-tools-container">
            <div className="tools-header">
                <h1><FiCode /> Developer Tools</h1>
                <p>Development and debugging utilities for system administrators</p>
            </div>

            <div className="tools-tabs">
                <button
                    className={`tab-btn ${activeTab === 'api-testing' ? 'active' : ''}`}
                    onClick={() => setActiveTab('api-testing')}
                >
                    <FiTerminal /> API Testing
                </button>
                <button
                    className={`tab-btn ${activeTab === 'system-status' ? 'active' : ''}`}
                    onClick={() => setActiveTab('system-status')}
                >
                    <FiActivity /> System Status
                </button>
                <button
                    className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`}
                    onClick={() => setActiveTab('database')}
                >
                    <FiDatabase /> Database
                </button>
                <button
                    className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logs')}
                >
                    <FiActivity /> System Logs
                </button>
            </div>

            <div className="tools-content">
                {activeTab === 'api-testing' && (
                    <div className="tab-content">
                        <h2>API Testing Console</h2>
                        <div className="api-testing-section">
                            <div className="endpoint-buttons">
                                <button
                                    className="endpoint-btn"
                                    onClick={() => testApiEndpoint('/api/dev/health')}
                                    disabled={isLoading}
                                >
                                    Test Health Endpoint
                                </button>
                                <button
                                    className="endpoint-btn"
                                    onClick={() => testApiEndpoint('/api/users')}
                                    disabled={isLoading}
                                >
                                    Test Users Endpoint
                                </button>
                                <button
                                    className="endpoint-btn"
                                    onClick={() => testApiEndpoint('/api/admin/orders')}
                                    disabled={isLoading}
                                >
                                    Test Orders Endpoint
                                </button>
                                <button
                                    className="endpoint-btn"
                                    onClick={() => testApiEndpoint('/api/stock')}
                                    disabled={isLoading}
                                >
                                    Test Stock Endpoint
                                </button>
                            </div>
                            <div className="api-response">
                                <h3>Response:</h3>
                                <pre>{apiResponse}</pre>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'system-status' && (
                    <div className="tab-content">
                        <h2>System Status Monitor</h2>
                        {error && <div className="error-message">{error}</div>}
                        <div className="status-grid">
                            <div className="status-card">
                                <h3>API Status</h3>
                                <div className={`status-indicator ${systemStatus.apiStatus || 'offline'}`}>
                                    {systemStatus.apiStatus || 'Loading...'}
                                </div>
                            </div>
                            <div className="status-card">
                                <h3>Database Status</h3>
                                <div className={`status-indicator ${systemStatus.databaseStatus || 'offline'}`}>
                                    {systemStatus.databaseStatus || 'Loading...'}
                                </div>
                            </div>
                            <div className="status-card">
                                <h3>System Uptime</h3>
                                <p>{systemStatus.uptime || 'Calculating...'}</p>
                            </div>
                            <div className="status-card">
                                <h3>Memory Usage</h3>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: systemStatus.memoryUsage || '0%' }}
                                    ></div>
                                </div>
                                <p>{systemStatus.memoryUsage || '0%'}</p>
                            </div>
                            <div className="status-card">
                                <h3>CPU Usage</h3>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: systemStatus.cpuUsage || '0%' }}
                                    ></div>
                                </div>
                                <p>{systemStatus.cpuUsage || '0%'}</p>
                            </div>
                            <div className="status-card">
                                <h3>Active Connections</h3>
                                <p>{systemStatus.activeConnections || 0}</p>
                            </div>
                        </div>
                        <button
                            className="refresh-btn"
                            onClick={loadSystemStatus}
                            disabled={isLoading}
                        >
                            <FiRefreshCw className={isLoading ? 'spinning' : ''} /> Refresh Status
                        </button>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div className="tab-content">
                        <h2>Database Management</h2>
                        {error && <div className="error-message">{error}</div>}
                        <div className="database-stats">
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h3>Total Users</h3>
                                    <p>{databaseStats.totalUsers || 0}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Total Orders</h3>
                                    <p>{databaseStats.totalOrders || 0}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Total Products</h3>
                                    <p>{databaseStats.totalProducts || 0}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Database Size</h3>
                                    <p>{databaseStats.databaseSize || 'Calculating...'}</p>
                                </div>
                            </div>
                            <div className="connection-pool">
                                <h3>Connection Pool</h3>
                                <div className="pool-stats">
                                    <div className="pool-item">
                                        <span>Active:</span>
                                        <span>{databaseStats.connectionPool?.active || 0}</span>
                                    </div>
                                    <div className="pool-item">
                                        <span>Idle:</span>
                                        <span>{databaseStats.connectionPool?.idle || 0}</span>
                                    </div>
                                    <div className="pool-item">
                                        <span>Max:</span>
                                        <span>{databaseStats.connectionPool?.max || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            className="refresh-btn"
                            onClick={loadDatabaseStats}
                            disabled={isLoading}
                        >
                            <FiRefreshCw className={isLoading ? 'spinning' : ''} /> Refresh Stats
                        </button>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="tab-content">
                        <h2>System Logs</h2>
                        <div className="logs-container">
                            <div className="logs-header">
                                <h3>Recent System Logs</h3>
                                <button
                                    className="refresh-btn"
                                    onClick={loadRecentLogs}
                                    disabled={isLoading}
                                >
                                    <FiRefreshCw /> Refresh
                                </button>
                            </div>
                            <div className="logs-list">
                                {logs && logs.length > 0 ? logs.map((log, index) => (
                                    <div key={log.id || index} className={`log-entry ${getLogLevelColor(log.level)}`}>
                                        <div className="log-header">
                                            <span className={`log-level ${getLogLevelColor(log.level)}`}>
                                                {(log.level || 'info').toUpperCase()}
                                            </span>
                                            <span className="log-service">{log.service || 'system'}</span>
                                            <span className="log-timestamp">
                                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="log-message">{log.message || 'No message'}</div>
                                    </div>
                                )) : (
                                    <div className="no-logs">
                                        <p>No logs available. System may be starting up or logs endpoint needs configuration.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeveloperTools;
