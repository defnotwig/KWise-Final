/**
 * Notifications Dropdown Component
 */

import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiX, FiCheck, FiMessageCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import './NotificationsDropdown.css';

const NotificationsDropdown = ({ isOpen, onClose, currentUser }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('http://localhost:5000/api/notifications?limit=10', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data.data.notifications || []);
                setUnreadCount(data.data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setNotifications(prev => 
                    prev.map(notif => 
                        notif.id === notificationId 
                            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
                            : notif
                    )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/notifications/read-all', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setNotifications(prev => 
                    prev.map(notif => ({ ...notif, is_read: true, read_at: new Date().toISOString() }))
                );
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Get notification icon
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'message':
                return <FiMessageCircle className="notification-icon message" />;
            case 'alert':
                return <FiAlertTriangle className="notification-icon alert" />;
            case 'system':
                return <FiInfo className="notification-icon system" />;
            default:
                return <FiBell className="notification-icon default" />;
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            fetchNotifications();
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="notifications-dropdown" ref={dropdownRef}>
            <div className="notifications-header">
                <div className="header-content">
                    <h3>
                        <FiBell />
                        Notifications
                    </h3>
                    {unreadCount > 0 && (
                        <span className="unread-count">{unreadCount}</span>
                    )}
                </div>
                <div className="header-actions">
                    {unreadCount > 0 && (
                        <button className="mark-all-read" onClick={markAllAsRead}>
                            <FiCheck />
                            Mark all read
                        </button>
                    )}
                    <button className="close-dropdown" onClick={onClose}>
                        <FiX />
                    </button>
                </div>
            </div>

            <div className="notifications-content">
                {isLoading ? (
                    <div className="loading-notifications">
                        <div className="loading-spinner"></div>
                        <p>Loading notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="no-notifications">
                        <FiBell size={32} />
                        <h4>All caught up!</h4>
                        <p>You have no new notifications</p>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {notifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                onClick={() => !notification.is_read && markAsRead(notification.id)}
                            >
                                <div className="notification-content">
                                    <div className="notification-header">
                                        {getNotificationIcon(notification.type)}
                                        <div className="notification-meta">
                                            <h4 className="notification-title">{notification.title}</h4>
                                            <span className="notification-time">
                                                {formatTimeAgo(notification.created_at)}
                                            </span>
                                        </div>
                                        {!notification.is_read && (
                                            <div className="unread-indicator"></div>
                                        )}
                                    </div>
                                    <p className="notification-message">{notification.message}</p>
                                    {notification.created_by_name && (
                                        <div className="notification-sender">
                                            From: {notification.created_by_name} ({notification.created_by_role})
                                        </div>
                                    )}
                                </div>
                                {notification.action_url && (
                                    <div className="notification-action">
                                        <button className="action-btn">View</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="notifications-footer">
                <button className="view-all-btn">
                    View All Notifications
                </button>
            </div>
        </div>
    );
};

export default NotificationsDropdown;
