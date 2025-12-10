import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { usersAPI } from '../services/api';
import './UserManagement.css';

const UserManagement = () => {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    
    // Filters and pagination
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        status: '',
        presence: '' // online / away / offline
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });
    const [sortConfig, setSortConfig] = useState({
        field: 'created_at',
        direction: 'DESC'
    });

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [availableRoles, setAvailableRoles] = useState([]);

    // Form states
    const [createForm, setCreateForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'developer'
    });
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        role: '',
        is_active: true,
        password: ''
    });

    const [searchInput, setSearchInput] = useState(''); // debounced input

    useEffect(() => {
        loadUsers();
        loadAvailableRoles();
    }, [filters, pagination.page, sortConfig]);

    // Auto-polling every 30s when enabled
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            loadUsers();
            setLastRefreshed(new Date());
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, filters, pagination.page, sortConfig]);

    // Debounce search input -> filters.search
    useEffect(() => {
        const t = setTimeout(() => {
            setFilters(prev => prev.search === searchInput ? prev : { ...prev, search: searchInput });
            if (pagination.page !== 1) setPagination(prev => ({ ...prev, page: 1 }));
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError('');
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                sortBy: sortConfig.field,
                sortOrder: sortConfig.direction,
                role: filters.role || undefined,
                status: filters.status || undefined,
                search: filters.search || undefined
            };
            const { data } = await usersAPI.getAll(params);
            setUsers(data?.data || []);
            if (data?.pagination) {
                setPagination(prev => ({ ...prev, ...data.pagination }));
            }
            setLastRefreshed(new Date());
        } catch (e) {
            console.error('Error loading users:', e);
            setError(e.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableRoles = async () => {
        try {
            const { data } = await usersAPI.getAvailableRoles();
            setAvailableRoles(data?.data || []);
        } catch (e) {
            console.warn('Failed to load roles metadata (fallback to defaults)');
            setAvailableRoles([
                { value: 'superadmin', label: 'Super Admin', description: 'Full access' },
                { value: 'admin', label: 'Admin', description: 'Management access' },
                { value: 'developer', label: 'Developer', description: 'Developer scope' }
            ]);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const payload = { ...createForm };
            const { data } = await usersAPI.create(payload);
            if (!data?.success) throw new Error(data?.message || 'Failed to create user');
            setSuccess('User created successfully');
            setShowCreateModal(false);
            setCreateForm({ name: '', email: '', password: '', role: 'developer' });
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const updatePayload = { name: editForm.name, email: editForm.email, role: editForm.role, is_active: editForm.is_active };
            const { data } = await usersAPI.update(selectedUser.id, updatePayload);
            if (!data?.success) throw new Error(data?.message || 'Failed to update user');
            setSuccess('User updated successfully');
            setShowEditModal(false);
            setSelectedUser(null);
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        }
    };

    const handleDeleteUser = async () => {
        setError('');
        setSuccess('');
        try {
            const { data } = await usersAPI.delete(selectedUser.id);
            if (!data?.success) throw new Error(data?.message || 'Failed to delete user');
            setSuccess('User deleted successfully');
            setShowDeleteModal(false);
            setSelectedUser(null);
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        }
    };

    const openEditModal = (userToEdit) => {
        setSelectedUser(userToEdit);
        setEditForm({
            name: userToEdit.name,
            email: userToEdit.email,
            role: userToEdit.role,
            is_active: userToEdit.is_active,
            password: ''
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (userToDelete) => {
        setSelectedUser(userToDelete);
        setShowDeleteModal(true);
    };

    const handleSort = (field) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'ASC' ? 'DESC' : 'ASC'
        }));
    };

    const getRoleBadgeClass = (role) => {
        const classes = {
            superadmin: 'badge-danger',
            admin: 'badge-warning',
            developer: 'badge-info'
        };
        return classes[role] || 'badge-secondary';
    };

    const deriveOnlineStatus = (u) => {
        if (typeof u.is_online === 'boolean') {
            return u.is_online ? (u.online_status || 'online') : (u.online_status || 'offline');
        }
        if (u.last_login) {
            const mins = (Date.now() - new Date(u.last_login).getTime()) / 60000;
            if (mins < 5) return 'online';
            if (mins < 60) return 'away';
        }
        return 'offline';
    };

    const relativeTime = (ts) => {
        if (!ts) return '';
        const diff = Date.now() - new Date(ts).getTime();
        const sec = Math.floor(diff / 1000);
        if (sec < 60) return sec + 's ago';
        const min = Math.floor(sec / 60);
        if (min < 60) return min + 'm ago';
        const hr = Math.floor(min / 60);
        if (hr < 24) return hr + 'h ago';
        const day = Math.floor(hr / 24);
        if (day < 7) return day + 'd ago';
        const wk = Math.floor(day / 7);
        if (wk < 4) return wk + 'w ago';
        const mo = Math.floor(day / 30);
        if (mo < 12) return mo + 'mo ago';
        const yr = Math.floor(day / 365);
        return yr + 'y ago';
    };

    const displayUsers = users.filter(u => {
        if (!filters.presence) return true;
        return deriveOnlineStatus(u) === filters.presence;
    });

    const canCreateUsers = () => {
        return ['superadmin', 'admin'].includes(user?.role);
    };

    const canEditUser = (targetUser) => {
        if (user?.id === targetUser.id) return true; // Can edit own profile
        
        const roleHierarchy = { superadmin: 3, admin: 2, developer: 1 };
        const userLevel = roleHierarchy[user?.role] || 0;
        const targetLevel = roleHierarchy[targetUser.role] || 0;
        
        return userLevel >= targetLevel;
    };

    const canDeleteUser = (targetUser) => {
        if (user?.id === targetUser.id) return false; // Can't delete own account
        
        if (!['superadmin', 'admin'].includes(user?.role)) return false;
        
        const roleHierarchy = { superadmin: 3, admin: 2, developer: 1 };
        const userLevel = roleHierarchy[user?.role] || 0;
        const targetLevel = roleHierarchy[targetUser.role] || 0;
        
        return userLevel >= targetLevel;
    };

    if (loading && users.length === 0) {
        return (
            <div className="user-management">
                <div className="loading">Loading users...</div>
            </div>
        );
    }

    return (
        <div className="user-management">
            <div className="user-management-header">
                <h2>User Management</h2>
                <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
                    <button 
                        className="btn btn-neutral-refresh"
                        onClick={() => { loadUsers(); setLastRefreshed(new Date()); }}
                        title="Manual refresh"
                    >
                        ↻
                    </button>
                    <label style={{display:'flex', alignItems:'center', gap:'0.25rem', fontSize:'0.75rem'}}>
                        <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} />
                        Auto (30s)
                    </label>
                    {lastRefreshed && <span style={{fontSize:'0.65rem', color:'#666'}}>Updated {lastRefreshed.toLocaleTimeString()}</span>}
                    {canCreateUsers() && (
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <i className="fas fa-plus"></i> Add User
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="form-control"
                    />
                    
                    <select
                        value={filters.role}
                        onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                        className="form-control"
                    >
                        <option value="">All Roles</option>
                        {availableRoles.map(role => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="form-control"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>

                    <select
                        value={filters.presence}
                        onChange={(e) => setFilters(prev => ({ ...prev, presence: e.target.value }))}
                        className="form-control"
                    >
                        <option value="">All Presence</option>
                        <option value="online">Online</option>
                        <option value="away">Away</option>
                        <option value="offline">Offline</option>
                    </select>

                    <button 
                        className="btn btn-secondary"
                        onClick={() => {
                            setFilters({ search: '', role: '', status: '', presence: '' });
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                    >
                        Clear Filters
                    </button>
                </div>
                <div className="presence-legend">
                    <span className="legend-item"><span className="dot online"></span>Online (&lt;5m)</span>
                    <span className="legend-item"><span className="dot away"></span>Away (&lt;1h)</span>
                    <span className="legend-item"><span className="dot offline"></span>Offline</span>
                    <span className="legend-item recent">● recent login (&lt;24h)</span>
                </div>
            </div>

            {/* Messages */}
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Users Table */}
            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('name')} className="sortable">
                                Name {sortConfig.field === 'name' && (
                                    <i className={`fas fa-sort-${sortConfig.direction === 'ASC' ? 'up' : 'down'}`}></i>
                                )}
                            </th>
                            <th onClick={() => handleSort('email')} className="sortable">
                                Email {sortConfig.field === 'email' && (
                                    <i className={`fas fa-sort-${sortConfig.direction === 'ASC' ? 'up' : 'down'}`}></i>
                                )}
                            </th>
                            <th onClick={() => handleSort('role')} className="sortable">
                                Role {sortConfig.field === 'role' && (
                                    <i className={`fas fa-sort-${sortConfig.direction === 'ASC' ? 'up' : 'down'}`}></i>
                                )}
                            </th>
                            <th>Online</th>
                            <th>Status</th>
                            <th onClick={() => handleSort('last_login')} className="sortable">
                                Last Login {sortConfig.field === 'last_login' && (
                                    <i className={`fas fa-sort-${sortConfig.direction === 'ASC' ? 'up' : 'down'}`}></i>
                                )}
                            </th>
                            <th onClick={() => handleSort('created_at')} className="sortable">
                                Created {sortConfig.field === 'created_at' && (
                                    <i className={`fas fa-sort-${sortConfig.direction === 'ASC' ? 'up' : 'down'}`}></i>
                                )}
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayUsers.map(userItem => {
                            const onlineState = deriveOnlineStatus(userItem);
                            const recentLogin = userItem.last_login && ((Date.now() - new Date(userItem.last_login).getTime()) < 24 * 60 * 60 * 1000);
                            return (
                                <tr key={userItem.id} className={`user-row ${onlineState} ${recentLogin ? 'recent-login' : ''}`}>
                                    <td>{userItem.name}</td>
                                    <td>{userItem.email}</td>
                                    <td>
                                        <span className={`badge ${getRoleBadgeClass(userItem.role)}`}>
                                            {userItem.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`presence-badge ${onlineState}`}>{onlineState}</span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${userItem.is_active ? 'active' : 'inactive'}`}>
                                            {userItem.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        {userItem.last_login ? (
                                            <span title={new Date(userItem.last_login).toLocaleString()}>
                                                {new Date(userItem.last_login).toLocaleDateString()} · {relativeTime(userItem.last_login)}
                                            </span>
                                        ) : 'Never'}
                                    </td>
                                    <td>{new Date(userItem.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            {canEditUser(userItem) && (
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => openEditModal(userItem)}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                            )}
                                            {canDeleteUser(userItem) && (
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => openDeleteModal(userItem)}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {users.length === 0 && !loading && (
                    <div className="no-users">
                        <p>No users found matching your criteria.</p>
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
                        Previous
                    </button>
                    
                    <span className="page-info">
                        Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                    </span>
                    
                    <button
                        className="btn btn-sm"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create New User</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowCreateModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Password <small style={{fontWeight:'normal'}}>min 8 chars, letters & numbers</small></label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                        required
                                        minLength="6"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Role</label>
                                    <select
                                        className="form-control"
                                        value={createForm.role}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                                        required
                                    >
                                        {availableRoles.map(role => (
                                            <option key={role.value} value={role.value}>
                                                {role.label} - {role.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Edit User: {selectedUser.name}</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowEditModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleEditUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Role</label>
                                    <select
                                        className="form-control"
                                        value={editForm.role}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                                        required
                                    >
                                        {availableRoles.map(role => (
                                            <option key={role.value} value={role.value}>
                                                {role.label} - {role.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editForm.is_active}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                        />
                                        Active User
                                    </label>
                                </div>
                                
                                <div className="form-group">
                                    <label>Password Editing Disabled</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value="********"
                                        readOnly
                                        disabled
                                        title="Password changes are disabled. Use reset password flow instead."
                                    />
                                    <small className="text-muted">Use the password reset feature to change a user's password.</small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Update User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete User Modal */}
            {showDeleteModal && selectedUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Delete User</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete user <strong>{selectedUser.name}</strong>?</p>
                            <p className="text-muted">This action will deactivate the user account and cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button 
                                type="button" 
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-danger"
                                onClick={handleDeleteUser}
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
