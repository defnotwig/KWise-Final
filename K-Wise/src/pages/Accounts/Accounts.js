/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    FiUserPlus, FiEdit2, FiTrash2, FiX, FiEye, FiEyeOff, 
    FiRefreshCw, FiClock, FiSearch, FiUsers, FiUserCheck, FiUser 
} from 'react-icons/fi';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI } from '../../services/api';
import { getApiBaseUrl } from '../../utils/networkConfig'; // Network-aware URLs
import './Accounts.css';

const Accounts = () => {
    const { currentUser, isLoading } = useAuth();
    const [users, setUsers] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentEditUser, setCurrentEditUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Phase 3: Enhanced features
    const [managementStats, setManagementStats] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [success, setSuccess] = useState('');

    // Initialize Notyf for professional notifications
    const notyf = useRef(new Notyf({
        duration: 3000,
        position: { x: 'right', y: 'top' },
        dismissible: true,
        types: [
            {
                type: 'success',
                background: '#10b981',
                icon: { className: 'notyf__icon--success', tagName: 'i' }
            },
            {
                type: 'error',
                background: '#ef4444',
                icon: { className: 'notyf__icon--error', tagName: 'i' }
            },
            {
                type: 'warning',
                background: '#f59e0b',
                icon: { className: 'notyf__icon--warning', tagName: 'i' }
            }
        ]
    })).current;
    
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
    });

    // RBAC permissions based on user role
    const canCreateUsers = () => {
        // Superadmin can create all roles, Admin and Developer can create admin/developer roles only
        return currentUser?.role === 'superadmin' || currentUser?.role === 'admin' || currentUser?.role === 'developer';
    };

    const canEditUsers = () => {
        // Only superadmin can edit users
        return currentUser?.role === 'superadmin';
    };

    const canDeleteUsers = () => {
        // Only superadmin can delete users
        return currentUser?.role === 'superadmin';
    };

    // canViewAllUserDetails removed — was unused

    // Phase 3: Enhanced permission functions
    const canViewOnlineStatus = useCallback(() => {
        return currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
    }, [currentUser?.role]);



    const getAvailableRoles = () => {
        if (currentUser?.role === 'superadmin') {
            return ['superadmin', 'admin', 'developer'];
        } else if (currentUser?.role === 'admin' || currentUser?.role === 'developer') {
            return ['admin', 'developer'];
        }
        return [];
    };

    // Check if user has permission to view the accounts page
    const canViewAccounts = () => {
        return currentUser?.role === 'superadmin' || currentUser?.role === 'admin' || currentUser?.role === 'developer';
    };

    // Form data for adding/editing user
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'admin'
    });
    // Form validation errors
    const [errors, setErrors] = useState({});

    // Phase 3: Enhanced API functions
    const apiCall = async (url, options = {}) => {
        const response = await fetch(`${getApiBaseUrl().replace('/api', '')}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return await response.json();
    };

    // Centralized API error normalization
    const handleAPIError = (err) => {
        if (!err) return { message: 'Unknown error' };
        if (err.response?.data?.message) {
            return { message: err.response.data.message };
        }
        if (err.message) return { message: err.message };
        return { message: 'Request failed' };
    };

    // Phase 3: Fetch management statistics
    const fetchManagementStats = useCallback(async () => {
        if (!canViewOnlineStatus()) return;
        try {
            const response = await apiCall('/api/users/stats/overview');
            if (response.success) {
                setManagementStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching management stats (overview):', error);
        }
    }, [canViewOnlineStatus]);

    // Phase 3: Enhanced user deletion
    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        try {
            setError('');
            
            const response = await apiCall(`/api/users/${selectedUser.id}`, {
                method: 'DELETE'
            });

            if (response.success) {
                setSuccess(`User ${selectedUser.name} deleted successfully`);
                setShowDeleteModal(false);
                setSelectedUser(null);
                fetchUsers();
                fetchManagementStats();
                
                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(''), 3000);
            }

        } catch (error) {
            console.error('Error deleting user:', error);
            setError(error.message || 'Failed to delete user');
        }
    };

    // Phase 3: Time formatting functions
    const formatTimeSince = (timestamp) => {
        if (!timestamp) return 'Never';
        
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    // Get status badge class
    const getStatusBadgeClass = (isOnline, status) => {
        if (!isOnline) return 'badge badge-secondary';
        
        switch (status) {
            case 'online': return 'badge badge-success';
            case 'away': return 'badge badge-warning';
            default: return 'badge badge-secondary';
        }
    };

    // Get role badge class
    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'superadmin': return 'badge badge-danger';
            case 'admin': return 'badge badge-primary';
            case 'developer': return 'badge badge-info';
            default: return 'badge badge-secondary';
        }
    };

    // Fetch users function
    const fetchUsers = useCallback(async () => {
        if (!canViewAccounts()) {
            setError('Access denied. You do not have permission to view accounts.');
            setIsDataLoading(false);
            return;
        }

        try {
            setError('');
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search: searchTerm
            };

            console.log('🔍 Fetching users with params:', params);
            const response = await usersAPI.getAll(params);
            console.log('📊 Full API response:', response);
            console.log('📊 Response data:', response.data);

            // Ensure users is always an array
            // The API returns { status: "success", data: [...], pagination: {...} }
            // But axios wraps it in response.data, so we need response.data.data
            const usersData = response.data?.data || response.data?.users || [];
            console.log('👥 Users data type:', typeof usersData, Array.isArray(usersData));
            console.log('👥 Users data:', usersData);

            if (Array.isArray(usersData)) {
                console.log('✅ Setting users data:', usersData.length, 'users');
                setUsers(usersData);
            } else {
                console.error('❌ API returned non-array users data:', usersData);
                setUsers([]);
                setError('Invalid data format received from server');
            }

            // Handle pagination data
            const paginationData = response.data?.pagination || response.data?.meta || { page: 1, limit: 10, total: 0, pages: 1 };
            setPagination({
                page: paginationData.page || 1,
                limit: paginationData.limit || 10,
                total: paginationData.total || usersData.length,
                pages: paginationData.pages || 1
            });

            setLastUpdated(new Date());
        } catch (error) {
            console.error('❌ Error in fetchUsers:', error);
            const errorInfo = handleAPIError(error);
            setError(errorInfo.message || 'Failed to fetch users');
            console.error('Error fetching users:', error);
            // Set empty array on error to prevent map error
            setUsers([]);
        } finally {
            setIsDataLoading(false);
            setIsRefreshing(false);
        }
    }, [pagination.page, pagination.limit, searchTerm]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([
            fetchUsers(),
            fetchManagementStats()
        ]);
        setIsRefreshing(false);
    };

    // Load data when component mounts or when pagination/search changes
    useEffect(() => {
        fetchUsers();
    }, [pagination.page, pagination.limit, searchTerm]);

    // Phase 3: Initialize management stats
    useEffect(() => {
        if (!isLoading && currentUser) {
            fetchManagementStats();
        }
    }, [isLoading, currentUser, fetchManagementStats]);

    // Auto-refresh every 60 seconds for user list and management stats
    useEffect(() => {
        const interval = setInterval(() => {
            fetchUsers();
            fetchManagementStats();
        }, 60000);

        return () => clearInterval(interval);
    }, [fetchManagementStats]);

    useEffect(() => {
        // Optional: future SSE subscription for real-time user stats
        const evt = new EventSource(`${getApiBaseUrl()}/realtime/users`);
        evt.addEventListener('users', (e) => {
            try { const data = JSON.parse(e.data); setManagementStats(ms => ({ ...ms, activeUsers: data.activeUsers, totalUsers: data.totalUsers })); } catch (_e) { console.debug('SSE parse error', _e); }
        });
        return () => evt.close();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Validate name
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        // Validate email
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email is not valid';
        }

        // Validate password for new users or if password field is filled for existing users
        if (!currentEditUser || formData.password) {
            if (!formData.password) {
                newErrors.password = 'Password is required';
            } else if (formData.password.length < 8) {
                newErrors.password = 'Password must be at least 8 characters';
            }
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddUser = async (e) => {
        e.preventDefault();

        if (!canCreateUsers()) {
            setErrors({ submit: 'Access denied. You do not have permission to create users.' });
            return;
        }

        if (!validateForm()) {
            return;
        }

        try {
            const userData = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role
            };

            await usersAPI.create(userData);

            // Refresh the user list
            await fetchUsers();

            setShowAddModal(false);

            // Reset form
            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'admin'
            });

            notyf.success('K-Wise: User has been added successfully!');

        } catch (error) {
            const errorInfo = handleAPIError(error);
            setErrors({ submit: errorInfo.message || 'Failed to add user. Please try again.' });
            console.error('Error adding user:', error);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();

        if (!canEditUsers()) {
            setErrors({ submit: 'Access denied. You do not have permission to edit users.' });
            return;
        }

        if (!validateForm()) {
            return;
        }

        try {
            const userData = {
                name: formData.name,
                email: formData.email,
                role: formData.role
            };

            // Password editing has been disabled for security reasons
            // Passwords can only be set during user creation or via password reset

            await usersAPI.update(currentEditUser.id, userData);

            // Refresh the user list
            await fetchUsers();

            setShowEditModal(false);
            setCurrentEditUser(null);

            // Reset form
            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'admin'
            });

            notyf.success('K-Wise: User has been updated successfully!');

        } catch (error) {
            const errorInfo = handleAPIError(error);
            setErrors({ submit: errorInfo.message || 'Failed to update user. Please try again.' });
            console.error('Error updating user:', error);
        }
    };

    const openEditModal = (user) => {
        if (!canEditUsers()) {
            notyf.error('K-Wise: Access denied. You do not have permission to edit users.');
            return;
        }

        setCurrentEditUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            confirmPassword: '',
            role: user.role
        });
        setShowEditModal(true);
    };

    // handleSearch removed — was unused (search handled inline)

    const handlePageChange = (newPage) => {
        setPagination({ ...pagination, page: newPage });
    };

    // Show loading if authentication is still in progress or we don't have user data yet
    if (isLoading || !currentUser) {
        return <div className="loading">Loading user data...</div>;
    }

    if (isDataLoading) {
        return <div className="loading">Loading user accounts...</div>;
    }

    if (!canViewAccounts()) {
        return (
            <div className="access-denied">
                <h1>Access Denied</h1>
                <p>You do not have permission to view user accounts.</p>
                <p>Current role: {currentUser?.role || 'Unknown'}</p>
            </div>
        );
    }

    return (
        <div className="accounts-container">
            <div className="accounts-header">
                <div className="header-title">
                    <h1>
                        <FiUsers className="icon" />
                        Account Management
                        <span className="phase-badge">Enhanced</span>
                    </h1>
                    <p>Enhanced user management with online status tracking</p>
                </div>

                <div className="header-actions">
                    <button 
                        className="btn btn-secondary"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <FiRefreshCw className={isRefreshing ? 'spin' : ''} />
                        Refresh
                    </button>
                    
                    {canCreateUsers() && (
                        <button 
                            className="btn btn-primary"
                            onClick={() => {
                                setFormData({
                                    name: '',
                                    email: '',
                                    password: '',
                                    confirmPassword: '',
                                    role: getAvailableRoles()[getAvailableRoles().length - 1] || 'admin'
                                });
                                setErrors({});
                                setShowAddModal(true);
                            }}
                        >
                            <FiUserPlus />
                            Add User
                        </button>
                    )}
                </div>
            </div>

            {/* Phase 3: Management Statistics */}
            {managementStats && canViewOnlineStatus() && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FiUsers />
                        </div>
                        <div className="stat-content">
                            <h3>{managementStats.totalUsers}</h3>
                            <p>Total Users</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon online">
                            <FiUserCheck />
                        </div>
                        <div className="stat-content">
                            <h3>{managementStats.onlineUsers}</h3>
                            <p>Online Now</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <FiClock />
                        </div>
                        <div className="stat-content">
                            <h3>{managementStats.recentLogins || managementStats.recent24h}</h3>
                            <p>Recent Logins (24h)</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FiUser />
                        </div>
                        <div className="stat-content">
                            <h3>
                                {managementStats.superadminCount || managementStats.usersByRole?.find(r => r.role === 'superadmin')?.count || 0}
                            </h3>
                            <p>Super Admins</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error and Success Messages */}
            {error && (
                <div className="alert alert-danger">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <strong>Success:</strong> {success}
                </div>
            )}

                        {/* Search and Filters */}
            <div className="controls">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                {lastUpdated && (
                    <div className="last-updated">
                        <FiClock />
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                )}
            </div>
            {/* Users Table */}
            <div className="table-container">
                {isDataLoading ? (
                    <div className="loading-overlay">
                        <FiRefreshCw className="spin" />
                        <p>Loading users...</p>
                    </div>
                ) : (
                    <table className="accounts-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                {canViewOnlineStatus() && <th>Status</th>}
                                {canViewOnlineStatus() && <th>Last Login</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user._id || user.id} className={user.is_online ? 'user-online' : ''}>
                                    <td>
                                        <div className="user-info">
                                            <div className="user-avatar">
                                                {user.profile_picture ? (
                                                    <img 
                                                        src={`${getApiBaseUrl()}/uploads/${user.profile_picture}`}
                                                        alt={user.name}
                                                        className="avatar-image"
                                                    />
                                                ) : (
                                                    <FiUser className="avatar-icon" />
                                                )}
                                            </div>
                                            <div className="user-details">
                                                <span className="user-name">{user.name}</span>
                                                {user.is_online && (
                                                    <span className="online-indicator" title="Online">●</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={getRoleBadgeClass(user.role)}>
                                            {user.role}
                                        </span>
                                    </td>
                                    {canViewOnlineStatus() && (
                                        <td>
                                            <span className={getStatusBadgeClass(user.is_online, user.online_status)}>
                                                {user.is_online ? user.online_status : 'offline'}
                                            </span>
                                        </td>
                                    )}
                                    {canViewOnlineStatus() && (
                                        <td>
                                            <span className="last-login">
                                                {formatTimeSince(user.last_login)}
                                            </span>
                                        </td>
                                    )}
                                    <td>
                                        <div className="action-buttons">
                                            {canEditUsers() && (
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => openEditModal(user)}
                                                    disabled={user.id === currentUser?.id && user.role !== currentUser?.role}
                                                    title="Edit User"
                                                >
                                                    <FiEdit2 />
                                                </button>
                                            )}
                                            {canDeleteUsers() && user.id !== currentUser.id && (
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    title="Delete User"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {users.length === 0 && !isDataLoading && (
                    <div className="empty-state">
                        <p>No users found</p>
                        {searchTerm && <p>Try adjusting your search terms</p>}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="pagination">
                    <button
                        className="page-btn"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                    >
                        Previous
                    </button>

                    {Array.from({ length: pagination.pages }).map((_, index) => (
                        <button
                            key={index + 1}
                            className={`page-btn ${pagination.page === index + 1 ? 'active' : ''}`}
                            onClick={() => handlePageChange(index + 1)}
                        >
                            {index + 1}
                        </button>
                    ))}

                    <button
                        className="page-btn"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                    >
                        Next
                    </button>
                </div>
            )}
            {/* Add User Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2>Add New User</h2>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>
                                <FiX />
                            </button>
                        </div>

                        {errors.submit && (
                            <div className="alert alert-danger">{errors.submit}</div>
                        )}

                        <form onSubmit={handleAddUser}>
                            <div className="form-group">
                                <label htmlFor="name">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="role">Role</label>
                                <select
                                    id="role"
                                    name="role"
                                    className="form-control"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                >
                                    {getAvailableRoles().map(role => (
                                        <option key={role} value={role}>
                                            {role.charAt(0).toUpperCase() + role.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <div className="password-input-group">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        name="password"
                                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                        value={formData.password}
                                        onChange={handleInputChange}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                />
                                {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Add User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit User Modal */}
            {showEditModal && currentEditUser && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2>Edit User</h2>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>
                                <FiX />
                            </button>
                        </div>

                        {errors.submit && (
                            <div className="alert alert-danger">{errors.submit}</div>
                        )}

                        <form onSubmit={handleEditUser}>
                            <div className="form-group">
                                <label htmlFor="name">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="role">Role</label>
                                <select
                                    id="role"
                                    name="role"
                                    className="form-control"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    disabled={currentEditUser._id === currentUser?._id}
                                >
                                    {getAvailableRoles().map(role => (
                                        <option key={role} value={role}>
                                            {role.charAt(0).toUpperCase() + role.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* Password fields removed for security - superadmins cannot edit user passwords */}
                            <div className="form-group">
                                <div className="alert alert-info" style={{ fontSize: '0.9em', marginBottom: '15px' }}>
                                    <strong>Security Notice:</strong> Password editing has been disabled for security reasons. 
                                    Users must reset their own passwords or use the password reset functionality.
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Phase 3: Enhanced Delete Confirmation Modal */}
            {showDeleteModal && selectedUser && (
                <div className="modal-overlay">
                    <div className="modal delete-modal">
                        <div className="modal-header">
                            <h3>Confirm User Deletion</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="delete-warning">
                                <p>Are you sure you want to delete the user:</p>
                                <div className="user-to-delete">
                                    <strong>{selectedUser.name}</strong>
                                    <span className="user-email">({selectedUser.email})</span>
                                    <span className={getRoleBadgeClass(selectedUser.role)}>
                                        {selectedUser.role}
                                    </span>
                                </div>
                                <p className="warning-text">
                                    This action will deactivate the user account and cannot be undone.
                                    The user will no longer be able to access the system.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-danger"
                                onClick={handleDeleteUser}
                            >
                                <FiTrash2 />
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Accounts;