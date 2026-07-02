/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { FiSearch, FiDownload, FiCalendar, FiUser, FiActivity, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { logsAPI, handleAPIError } from '../../services/api';
import './LogHistory.css';

// Issue 4 Frontend Enhancement: Dynamic meta (roles/actions/severities), severity filter, unified API usage
const LogHistory = () => {
    const { currentUser } = useAuth();

    // Core state
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]); // client-side search fallback
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedAction, setSelectedAction] = useState('all');
    const [selectedSeverity, setSelectedSeverity] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [logsPerPage] = useState(20);

    // Meta
    const [availableRoles, setAvailableRoles] = useState(['superadmin','admin','developer']);
    const [availableActions, setAvailableActions] = useState(['login','logout']);
    const [availableSeverities, setAvailableSeverities] = useState(['INFO','WARN','ERROR']);

    // Pagination meta
    const [totalLogs, setTotalLogs] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Fetch metadata once
    useEffect(() => {
        (async () => {
            try {
                const res = await logsAPI.getMeta();
                const meta = res?.data?.data || {};
                if (Array.isArray(meta.roles) && meta.roles.length) setAvailableRoles(meta.roles);
                if (Array.isArray(meta.actions) && meta.actions.length) setAvailableActions(meta.actions);
                if (Array.isArray(meta.severities) && meta.severities.length) setAvailableSeverities(meta.severities);
            } catch (e) {
                // Non-fatal; leave defaults
                console.warn('Meta fetch failed (using defaults)', e.message);
            }
        })();
    }, []);

    // Fetch logs whenever filters/page change
    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const params = {
                page: currentPage,
                limit: logsPerPage
            };
            if (searchTerm) params.search = searchTerm;
            if (selectedRole !== 'all') params.role = selectedRole;
            if (selectedAction !== 'all') params.action = selectedAction;
            if (selectedSeverity !== 'all') params.severity = selectedSeverity;
            if (dateRange.start) params.from = dateRange.start;
            if (dateRange.end) params.to = dateRange.end;

            const response = await logsAPI.getAll(params);
            const result = response?.data || {};
            const apiLogs = Array.isArray(result.data) ? result.data : [];

            const mapped = apiLogs.map(row => ({
                id: row.id,
                _id: row.id,
                userName: row.user_name || row.userName || row.username || 'Unknown',
                userId: row.user_id || row.userId || row.userid || null,
                userRole: row.user_role || row.role || 'unknown',
                action: row.action || row.event || 'unknown',
                description: row.description || row.details || '',
                ipAddress: row.ip_address || row.ip || 'N/A',
                timestamp: row.created_at || row.timestamp || new Date().toISOString(),
                severity: (row.severity || row.status || 'INFO').toUpperCase(),
                status: (() => {
                    const sev = (row.severity || row.status || 'info').toLowerCase();
                    if (sev === 'info') return 'success';
                    if (sev === 'error') return 'failed';
                    if (sev === 'warn' || sev === 'warning') return 'warning';
                    return sev;
                })()
            }));

            setLogs(mapped);
            setFilteredLogs(mapped); // server already filtered
            const total = Number.parseInt(result?.pagination?.total || mapped.length, 10);
            setTotalLogs(total);
            setTotalPages(result?.pagination?.pages || Math.ceil(total / logsPerPage));
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Error fetching logs:', err);
            const errorInfo = handleAPIError(err);
            setError(errorInfo.message || 'Failed to load logs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [currentPage, searchTerm, selectedRole, selectedAction, selectedSeverity, dateRange]);

    // Auto-refresh every 60s (independent of filter changes)
    useEffect(() => {
        const id = setInterval(() => { fetchLogs(); }, 60000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Client fallback search (only within current page results)
    useEffect(() => {
        if (!Array.isArray(logs)) return;
        if (!searchTerm) { setFilteredLogs(logs); return; }
        const term = searchTerm.toLowerCase();
        setFilteredLogs(logs.filter(l =>
            l.userName?.toLowerCase().includes(term) ||
            l.description?.toLowerCase().includes(term) ||
            l.action?.toLowerCase().includes(term)
        ));
    }, [logs, searchTerm]);

    const exportLogs = async () => {
        try {
            const filters = {};
            if (searchTerm) filters.search = searchTerm;
            if (selectedRole !== 'all') filters.role = selectedRole;
            if (selectedAction !== 'all') filters.action = selectedAction;
            if (selectedSeverity !== 'all') filters.severity = selectedSeverity;
            if (dateRange.start) filters.from = dateRange.start;
            if (dateRange.end) filters.to = dateRange.end;
            const response = await logsAPI.exportLogs('csv', filters);
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting logs:', err);
            const errorInfo = handleAPIError(err);
            setError(errorInfo.message || 'Failed to export logs');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success': return 'success';
            case 'failed': return 'danger';
            case 'warning': return 'warning';
            default: return 'info';
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'login':
            case 'logout':
            case 'user_create':
            case 'user_delete':
                return <FiUser />;
            default:
                return <FiActivity />;
        }
    };

    const currentLogs = filteredLogs || [];
    const paginate = (page) => setCurrentPage(page);

    if (isLoading) {
        return (
            <div className="log-history-container">
                <div className="loading-spinner">Loading log history...</div>
            </div>
        );
    }

    return (
        <div className="log-history-container">
            <div className="log-history-header">
                <div className="header-left">
                    <h1><FiActivity /> Log History</h1>
                    <p>Monitor all user activities and system events</p>
                </div>
                <div className="header-right">
                    {lastUpdated && (
                        <span className="last-updated">Last updated: {lastUpdated.toLocaleTimeString()}</span>
                    )}
                    <button className="refresh-btn" onClick={fetchLogs} disabled={isLoading}>
                        <FiRefreshCw className={isLoading ? 'spinning' : ''} />
                    </button>
                    <button className="export-btn" onClick={exportLogs}>
                        <FiDownload /> Export CSV
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="filters-section">
                <div className="search-filter">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <div className="filter-controls">
                    <select value={selectedRole} onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}>
                        <option value="all">All Roles</option>
                        {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select value={selectedAction} onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}>
                        <option value="all">All Actions</option>
                        {availableActions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={selectedSeverity} onChange={(e) => { setSelectedSeverity(e.target.value); setCurrentPage(1); }}>
                        <option value="all">All Severities</option>
                        {availableSeverities.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="date-filters">
                        <input type="date" value={dateRange.start} onChange={(e) => { setDateRange({ ...dateRange, start: e.target.value }); setCurrentPage(1); }} />
                        <input type="date" value={dateRange.end} onChange={(e) => { setDateRange({ ...dateRange, end: e.target.value }); setCurrentPage(1); }} />
                    </div>
                </div>
            </div>

            <div className="logs-stats">
                <div className="stat-card"><h3>Total Logs</h3><p>{totalLogs}</p></div>
                <div className="stat-card"><h3>Success</h3><p>{currentLogs.filter(l => l.status === 'success').length}</p></div>
                <div className="stat-card"><h3>Failed</h3><p>{currentLogs.filter(l => l.status === 'failed').length}</p></div>
                <div className="stat-card"><h3>Current Page</h3><p>{currentPage} of {totalPages || 1}</p></div>
            </div>

            <div className="logs-table-container">
                <table className="logs-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Role</th>
                            <th>Action</th>
                            <th>Description</th>
                            <th>IP Address</th>
                            <th>Timestamp</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentLogs.length ? currentLogs.map(log => (
                            <tr key={log._id || log.id} className={`log-row ${getStatusColor(log.status)}`}>
                                <td>{log._id || log.id}</td>
                                <td>
                                    <div className="user-info">
                                        <span className="user-name">{log.userName}</span>
                                        <span className="user-id">ID: {log.userId}</span>
                                    </div>
                                </td>
                                <td><span className={`role-badge ${log.userRole}`}>{log.userRole}</span></td>
                                <td>
                                    <div className="action-cell">
                                        {getActionIcon(log.action)}
                                        <span>{log.action.replace('_', ' ')}</span>
                                    </div>
                                </td>
                                <td className="description-cell">{log.description}</td>
                                <td>{log.ipAddress}</td>
                                <td>
                                    <div className="timestamp-cell"><FiCalendar /><span>{new Date(log.timestamp).toLocaleString()}</span></div>
                                </td>
                                <td><span className={`status-badge ${getStatusColor(log.status)}`}>{log.status}</span></td>
                            </tr>
                        )) : (
                            <tr><td colSpan="8" className="text-center">No logs found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="page-btn">Previous</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 50).map(num => (
                        <button key={num} onClick={() => paginate(num)} className={`page-btn ${currentPage === num ? 'active' : ''}`}>{num}</button>
                    ))}
                    <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="page-btn">Next</button>
                </div>
            )}
        </div>
    );
};

export default LogHistory;
