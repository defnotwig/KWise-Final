/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSearch } from '../../contexts/SearchContext-simple';
import { FiSearch, FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage, faBell } from '@fortawesome/free-solid-svg-icons';
import SearchResults from '../Widgets/SearchResults';
import UserProfile from '../UserProfile/UserProfile';
import ChatModal from '../Chat/ChatModal';
import { ProfileImage } from '../../hooks/useProfileImage';
import NotificationsDropdown from '../Notifications/NotificationsDropdown';
import { getServerBaseUrl } from '../../utils/networkConfig';
import './Navbar.css';

const Navbar = () => {
    const { currentUser, logout } = useAuth();
    const { searchQuery, handleSearch, setSearchQuery, setShowResults } = useSearch();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const searchInputRef = useRef(null);
    const [userInfo, setUserInfo] = useState(null);

    // Keyboard shortcut for search (Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Ctrl + K to focus search
            if (event.ctrlKey && event.key === 'k') {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
            // Escape to blur search
            if (event.key === 'Escape' && document.activeElement === searchInputRef.current) {
                searchInputRef.current?.blur();
                setShowResults(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [setShowResults]);
    // Update userInfo only from the verified AuthContext session.
    useEffect(() => {
        setUserInfo(currentUser || null);
    }, [currentUser]);

    // Real-time clock update
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // ENHANCED: Fetch unread counts with proper 304 handling
    const fetchUnreadCounts = async () => {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Use Promise.all with graceful failure handling
            const [messagesResponse, notificationsResponse] = await Promise.all([
                fetch(`${getServerBaseUrl()}/api/messages/unread-count`, { headers })
                    .catch(() => ({ ok: false })), // Graceful failure
                fetch(`${getServerBaseUrl()}/api/notifications?unread=true`, { headers })
                    .catch(() => ({ ok: false })) // Graceful failure
            ]);

            // FIXED: Handle 304 responses properly to prevent unnecessary updates
            if (messagesResponse.ok && messagesResponse.status !== 304) {
                const messagesData = await messagesResponse.json().catch(() => ({ data: {} }));
                const newUnreadCount = messagesData.data?.unreadCount || 0;
                setUnreadMessages(newUnreadCount);
            } else if (messagesResponse.status === 304) {
                console.log('📡 Navbar: Messages count not modified (304)');
            }

            if (notificationsResponse.ok && notificationsResponse.status !== 304) {
                const notificationsData = await notificationsResponse.json().catch(() => ({ data: {} }));
                setUnreadNotifications(notificationsData.data?.unreadCount || 0);
            } else if (notificationsResponse.status === 304) {
                console.log('📡 Navbar: Notifications count not modified (304)');
            }
        } catch (_error) { // NOSONAR - intentionally silent for rate-limited API calls
            // Silent fail to prevent console spam from rate limiting
        }
    };

    // FIXED: Much more conservative auto-refresh to prevent API spam
    useEffect(() => {
        if (currentUser) {
            fetchUnreadCounts();
            // FIXED: Much longer interval and user interaction tracking
            const interval = setInterval(() => {
                const now = Date.now();
                const lastInteraction = globalThis.lastNavbarInteraction || 0;
                
                // Only refresh if user hasn't interacted in last 45 seconds
                if (now - lastInteraction > 45000) {
                    console.log('🔄 Navbar: Auto-refreshing unread counts (user inactive)');
                    fetchUnreadCounts();
                } else {
                    console.log('⏸️ Navbar: Skipping auto-refresh (user recently active)');
                }
            }, 90000); // FIXED: Every 90 seconds instead of 30 seconds
            
            // Also refresh when window gains focus (user comes back to tab)
            const handleFocus = () => {
                fetchUnreadCounts();
            };
            
            // Track user interactions to prevent spam
            const handleUserInteraction = () => {
                globalThis.lastNavbarInteraction = Date.now();
            };
            
            globalThis.addEventListener('focus', handleFocus);
            globalThis.addEventListener('mousedown', handleUserInteraction);
            globalThis.addEventListener('keydown', handleUserInteraction);
            
            return () => {
                clearInterval(interval);
                globalThis.removeEventListener('focus', handleFocus);
                globalThis.removeEventListener('mousedown', handleUserInteraction);
                globalThis.removeEventListener('keydown', handleUserInteraction);
            };
        }
    }, [currentUser]);

    // Listen for messages read events to immediately update unread count
    useEffect(() => {
        const handleMessagesRead = () => {
            fetchUnreadCounts();
        };

        const handleNewMessageSent = () => {
            // Delay slightly to allow backend to process the new message
            setTimeout(fetchUnreadCounts, 1000);
        };

        globalThis.addEventListener('messagesRead', handleMessagesRead);
        globalThis.addEventListener('newMessageSent', handleNewMessageSent);
        
        return () => {
            globalThis.removeEventListener('messagesRead', handleMessagesRead);
            globalThis.removeEventListener('newMessageSent', handleNewMessageSent);
        };
    }, []);


    // Search handlers
    const handleSubmitSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            handleSearch(searchQuery);
        }
    };

    const handleSearchInputChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        if (query.length >= 2) {
            setShowResults(true);
            handleSearch(query);
        } else if (query.length === 0) {
            setShowResults(false);
        }
    };

    // Handle input focus
    const handleInputFocus = () => {
        // Prevent auto-selection of text when focused
        if (searchInputRef.current) {
            // Clear any selection that might occur automatically
            setTimeout(() => {
                if (searchInputRef.current) {
                    searchInputRef.current.setSelectionRange(searchInputRef.current.value.length, searchInputRef.current.value.length);
                }
            }, 0);
        }
        
        if (searchQuery.length >= 2) {
            setShowResults(true);
        }
    };

    // Uppercase the first letter of role for display
    const formatRole = (role) => {
        if (!role) return 'Guest';
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const openProfileModal = () => {
        setProfileModalOpen(true);
        setDropdownOpen(false);
    };

    const closeProfileModal = () => {
        setProfileModalOpen(false);
    };

    return (
        <>
            <div className="navbar">
                {/* Real-time Clock */}
                <div className="navbar-clock">
                    <div className="clock-time">
                        {currentTime.toLocaleTimeString()}
                    </div>
                    <div className="clock-date">
                        {currentTime.toLocaleDateString()}
                    </div>
                </div>

                <div className="navbar-center">
                    {/* Search Bar */}
                    <div className="search-container">
                        <form className="navbar-search" onSubmit={handleSubmitSearch}>
                            <div className="search-input">
                                <FiSearch className="search-icon" />
                                <input
                                    type="text"
                                    ref={searchInputRef}
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={handleSearchInputChange}
                                    onFocus={handleInputFocus}
                                />
                            </div>
                        </form>
                        <SearchResults />
                    </div>
                </div>

                <div className="navbar-actions">
                    {/* Messages Button */}
                    <button 
                        className="icon-btn messages-btn"
                        onClick={() => setChatModalOpen(true)}
                        title="Messages"
                    >
                        <FontAwesomeIcon icon={faMessage} />
                        {unreadMessages > 0 && (
                            <span className="notification-badge">{unreadMessages}</span>
                        )}
                    </button>

                    {/* Notifications Button */}
                    <div className="notifications-container">
                        <button 
                            className="icon-btn notifications-btn"
                            onClick={() => setNotificationsOpen(!notificationsOpen)}
                            title="Notifications"
                        >
                            <FontAwesomeIcon icon={faBell} />
                            {unreadNotifications > 0 && (
                                <span className="notification-badge">{unreadNotifications}</span>
                            )}
                        </button>
                        <NotificationsDropdown 
                            isOpen={notificationsOpen}
                            onClose={() => setNotificationsOpen(false)}
                            currentUser={currentUser}
                        />
                    </div>

                    {/* Enhanced User Profile */}
                    <button type="button" className="user-profile-trigger" onClick={toggleDropdown}>
                        <div className="user-avatar">
                            <ProfileImage
                                userInfo={userInfo}
                                className="profile-image"
                                fallbackContent={
                                    <div className="user-avatar-placeholder">
                                        {(userInfo?.displayName || userInfo?.display_name || userInfo?.name || 'A').charAt(0).toUpperCase()}
                                    </div>
                                }
                                onLoad={(e) => console.log('✅ Navbar profile image loaded:', e.target.src)}
                                onError={(e) => console.log('🚨 Navbar profile image error:', e.target.src)}
                            />
                        </div>
                        <div className="user-info">
                            <span className="user-name">{userInfo?.displayName || userInfo?.display_name || userInfo?.name || 'Admin User'}</span>
                            <span className="user-role">{formatRole(userInfo?.role)}</span>
                        </div>
                        
                        {dropdownOpen && (
                            <div className="dropdown-menu-enhanced">
                                <div className="dropdown-header">
                                    <div className="dropdown-user-info">
                                        <div className="dropdown-name">{userInfo?.displayName || userInfo?.display_name || userInfo?.name || 'Admin User'}</div>
                                        <div className="dropdown-role">{formatRole(userInfo?.role)}</div>
                                    </div>
                                </div>
                                <div className="dropdown-divider"></div>
                                <button type="button" className="dropdown-item-enhanced" onClick={openProfileModal}>
                                    <FiUser className="dropdown-icon" />
                                    Edit Profile
                                </button>
                                <div className="dropdown-item-enhanced">
                                    <FiSettings className="dropdown-icon" />
                                    Settings
                                </div>
                                <div className="dropdown-divider"></div>
                                <button type="button" className="dropdown-item-enhanced logout" onClick={handleLogout}>
                                    <FiLogOut className="dropdown-icon" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Chat Modal */}
            <ChatModal 
                isOpen={chatModalOpen}
                onClose={() => setChatModalOpen(false)}
                currentUser={currentUser}
            />

            {/* Profile Modal */}
            {profileModalOpen && (
                <UserProfile
                    isOpen={profileModalOpen}
                    onClose={closeProfileModal}
                    currentUser={userInfo}
                />
            )}
        </>
    );
};

export default Navbar;
