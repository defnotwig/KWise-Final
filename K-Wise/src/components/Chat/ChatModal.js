/**
 * Chat Modal Component for Real-time Messaging
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faPaperPlane, faTimes, faUser, faEllipsisH, faPenToSquare, faSync } from '@fortawesome/free-solid-svg-icons';
import { getApiBaseUrl, getServerBaseUrl } from '../../utils/networkConfig';
import './ChatModal.css';

const ChatModal = ({ isOpen, onClose, currentUser }) => {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showNewConversation, setShowNewConversation] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [isTyping, setIsTyping] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const lastMessageCountRef = useRef(0);

    // Memoized API base URL
    const API_BASE = useMemo(() => getApiBaseUrl(), []);
    
    // Memoized auth headers
    const authHeaders = useMemo(() => ({        'Content-Type': 'application/json'
    }), []);

    // Optimized fetch conversations with caching
    const fetchConversations = useCallback(async () => {
        try {
            setConnectionStatus('connected');
            const response = await fetch(`${API_BASE}/messages/conversations`, {
                headers: authHeaders
            });

            if (response.ok) {
                const data = await response.json();
                const newConversations = data.data || [];
                
                // Only update if conversations have actually changed
                setConversations(prevConversations => {
                    const hasChanged = JSON.stringify(prevConversations) !== JSON.stringify(newConversations);
                    return hasChanged ? newConversations : prevConversations;
                });
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
            setConnectionStatus('error');
        }
    }, [API_BASE, authHeaders]);

    // Optimized fetch available users - exclude users with existing conversations
    const fetchAvailableUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            
            // Use dedicated endpoint that excludes existing conversation partners
            const response = await fetch(`${API_BASE}/messages/available-users`, {
                headers: authHeaders
            });

            if (response.ok) {
                const data = await response.json();
                setAvailableUsers(data.data || []);
            } else {
                // Fallback to manual filtering if new endpoint doesn't exist yet
                const usersResponse = await fetch(`${API_BASE}/users`, {
                    headers: authHeaders
                });

                if (usersResponse.ok) {
                    const userData = await usersResponse.json();
                    const conversationUserIds = new Set(conversations.map(conv => conv.other_user_id));
                    
                    const filtered = (userData.data || []).filter(user => 
                        user.id !== currentUser?.id && 
                        !conversationUserIds.has(user.id) &&
                        user.is_active === true &&
                        ['admin', 'superadmin', 'developer'].includes(user.role)
                    );
                    setAvailableUsers(filtered);
                }
            }
        } catch (error) {
            console.error('Error fetching available users:', error);
            setAvailableUsers([]); // Clear list on error
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE, authHeaders, conversations, currentUser?.id]);

    // Typing indicator management
    const handleTyping = useCallback(() => {
        if (!isTyping && activeConversation) {
            setIsTyping(true);
            // Send typing indicator to server
            fetch(`${API_BASE}/messages/typing`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    to_user_id: activeConversation.id,
                    is_typing: true
                })
            }).catch(console.error);
        }

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            if (activeConversation) {
                fetch(`${API_BASE}/messages/typing`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({
                        to_user_id: activeConversation.id,
                        is_typing: false
                    })
                }).catch(console.error);
            }
        }, 2000);
    }, [API_BASE, authHeaders, activeConversation, isTyping]);

    // Start new conversation and update available users list
    const startNewConversation = useCallback(async (user) => {
        setActiveConversation(user);
        setMessages([]);
        setShowNewConversation(false);
        
        // Refresh conversations list to include the new conversation
        setTimeout(() => {
            fetchConversations();
            // Refresh available users to remove this user from the list
            fetchAvailableUsers();
        }, 100);
    }, [fetchConversations, fetchAvailableUsers]);

    // Enhanced mark messages as read
    const markMessagesAsRead = useCallback(async (userId) => {
        try {
            await fetch(`${API_BASE}/messages/read/${userId}`, {
                method: 'PUT',
                headers: authHeaders
            });
            
            // Refresh conversations to update unread badges
            fetchConversations();
            
            // Trigger navbar unread count refresh by dispatching a custom event
            globalThis.dispatchEvent(new CustomEvent('messagesRead'));
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }, [API_BASE, authHeaders, fetchConversations]);

    // Enhanced fetch messages with better error handling
    const fetchMessages = useCallback(async (userId) => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE}/messages/conversation/${userId}`, {
                headers: authHeaders
            });

            if (response.ok) {
                const data = await response.json();
                const newMessages = data.data.messages || [];
                
                // Only update if messages have changed
                setMessages(prevMessages => {
                    const hasChanged = prevMessages.length !== newMessages.length ||
                        newMessages.some((msg, index) => 
                            !prevMessages[index] || msg.id !== prevMessages[index].id
                        );
                    return hasChanged ? newMessages : prevMessages;
                });
                
                setActiveConversation(data.data.otherUser);
                lastMessageCountRef.current = newMessages.length;
                
                // Mark messages as read when conversation is opened
                await markMessagesAsRead(userId);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            setConnectionStatus('error');
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE, authHeaders, markMessagesAsRead]);

    // Optimized poll messages with performance improvements
    const pollMessages = useCallback(async (userId) => {
        try {
            const response = await fetch(`${API_BASE}/messages/conversation/${userId}`, {
                headers: authHeaders
            });

            if (response.ok) {
                const data = await response.json();
                const newMessages = data.data.messages || [];
                
                // Only update if messages have actually changed
                setMessages(prevMessages => {
                    if (newMessages.length !== prevMessages.length) {
                        lastMessageCountRef.current = newMessages.length;
                        return newMessages;
                    }
                    
                    const hasNewMessage = newMessages.some((msg, index) => 
                        !prevMessages[index] || msg.id !== prevMessages[index].id
                    );
                    
                    if (hasNewMessage) {
                        lastMessageCountRef.current = newMessages.length;
                        return newMessages;
                    }
                    
                    return prevMessages;
                });
            }
        } catch (error) {
            console.error('Error polling messages:', error);
            setConnectionStatus('error');
        }
    }, [API_BASE, authHeaders]);

    // Enhanced send message with optimistic updates
    const sendMessage = useCallback(async () => {
        if (!newMessage.trim() || !activeConversation) return;

        const messageContent = newMessage.trim();
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            id: tempId,
            content: messageContent,
            from_user_id: currentUser.id,
            to_user_id: activeConversation.id,
            created_at: new Date().toISOString(),
            is_read: false,
            status: 'sending'
        };

        // Check if this is a new conversation (no existing messages)
        const isNewConversation = messages.length === 0;

        // Optimistic update
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');

        try {
            const response = await fetch(`${API_BASE}/messages/send`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    to_user_id: activeConversation.id,
                    content: messageContent
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Replace optimistic message with real message
                setMessages(prev => 
                    prev.map(msg => msg.id === tempId ? { ...data.data, status: 'sent' } : msg)
                );
                
                // Refresh conversations to update last message
                setTimeout(() => {
                    fetchConversations();
                    
                    // If this was a new conversation, refresh available users to remove this user
                    if (isNewConversation) {
                        fetchAvailableUsers();
                    }
                }, 300);
                
                // Trigger navbar unread count refresh for other users
                globalThis.dispatchEvent(new CustomEvent('newMessageSent'));
            } else {
                // Mark message as failed
                setMessages(prev => 
                    prev.map(msg => msg.id === tempId ? { ...msg, status: 'failed' } : msg)
                );
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Mark message as failed
            setMessages(prev => 
                prev.map(msg => msg.id === tempId ? { ...msg, status: 'failed' } : msg)
            );
        }
    }, [newMessage, activeConversation, currentUser.id, API_BASE, authHeaders, fetchConversations, fetchAvailableUsers, messages.length]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Enhanced message rendering with typing indicators and status
    const renderMessagesWithDivider = useCallback(() => {
        if (messages.length === 0 && !typingUsers.size) {
            return [
                <div key="no-messages" className="no-messages">
                    <FontAwesomeIcon icon={faComments} size="2x" />
                    <p>No messages yet</p>
                    <small>Start the conversation!</small>
                </div>
            ];
        }

        const messageElements = [];
        let unreadDividerAdded = false;

        messages.forEach((message, index) => {
            // Add unread divider before the first unread message
            const isUnread = !message.is_read && message.from_user_id !== currentUser.id;
            if (isUnread && !unreadDividerAdded) {
                messageElements.push(
                    <div key="unread-divider" className="unread-divider">
                        <div className="divider-line"></div>
                        <span className="divider-text">New Messages</span>
                        <div className="divider-line"></div>
                    </div>
                );
                unreadDividerAdded = true;
            }

            // Add the message with enhanced styling
            const isSent = message.from_user_id === currentUser.id;
            const showTime = index === 0 || 
                new Date(message.created_at).getTime() - new Date(messages[index - 1]?.created_at || 0).getTime() > 300000; // 5 minutes

            messageElements.push(
                <div key={message.id} className="message-group">
                    {showTime && (
                        <div className="message-timestamp">
                            {new Date(message.created_at).toLocaleString()}
                        </div>
                    )}
                    <div
                        className={`message ${isSent ? 'sent' : 'received'} ${
                            isUnread ? 'unread' : ''
                        } ${message.status || ''}`}
                    >
                        <div className="message-content">
                            {message.content}
                        </div>
                        <div className="message-meta">
                            <span className="message-time">
                                {new Date(message.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                            {isSent && (
                                <span className={`message-status ${message.status || 'sent'}`}>
                                    {message.status === 'sending' && '⏳'}
                                    {message.status === 'sent' && '✓'}
                                    {message.status === 'failed' && '❌'}
                                    {!message.status && '✓'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            );
        });

        // Add typing indicator if someone is typing
        if (typingUsers.size > 0) {
            messageElements.push(
                <div key="typing-indicator" className="typing-indicator">
                    <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <span className="typing-text">
                        {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </span>
                </div>
            );
        }

        return messageElements;
    }, [messages, typingUsers, currentUser.id]);

    // Enhanced auto-scroll with performance optimization
    useEffect(() => {
        if (messages.length > lastMessageCountRef.current) {
            messagesEndRef.current?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'end'
            });
        }
    }, [messages.length]);

    // Smart conversation fetching
    useEffect(() => {
        if (isOpen) {
            fetchConversations();
        }
    }, [isOpen, fetchConversations]);

    // Optimized auto-select conversation
    useEffect(() => {
        if (isOpen && conversations.length > 0 && !activeConversation) {
            // Prioritize conversations with unread messages, then by most recent activity
            const conversationsWithPriority = conversations.map(conv => ({
                ...conv,
                priority: (conv.unread_count > 0 ? 1000 : 0) + new Date(conv.last_message_time || conv.created_at || 0).getTime()
            }));
            
            // Sort by priority (unread first, then by time)
            conversationsWithPriority.sort((a, b) => b.priority - a.priority);
            
            // Auto-open the highest priority conversation
            const topConversation = conversationsWithPriority[0];
            if (topConversation) {
                fetchMessages(topConversation.other_user_id);
            }
        }
    }, [isOpen, conversations, activeConversation, fetchMessages]);

    // Enhanced real-time polling with adaptive intervals
    useEffect(() => {
        if (!isOpen) return;

        let conversationInterval, messageInterval, typingInterval;

        // Poll conversations with adaptive timing
        const pollConversations = () => {
            if (connectionStatus !== 'error') {
                fetchConversations();
            }
        };

        // Poll messages with exponential backoff on errors
        const pollMessagesWithBackoff = () => {
            if (activeConversation && connectionStatus !== 'error') {
                pollMessages(activeConversation.id);
            }
        };

        // Set up intervals with optimized timing to prevent rate limiting
        conversationInterval = setInterval(pollConversations, 
            connectionStatus === 'error' ? 30000 : 15000); // Much slower: 15s normal, 30s on errors

        if (activeConversation) {
            messageInterval = setInterval(pollMessagesWithBackoff, 
                connectionStatus === 'error' ? 15000 : 8000); // Much slower: 8s normal, 15s on errors
        }

        // Poll for typing indicators less frequently
        typingInterval = setInterval(() => {
            if (activeConversation) {
                // Check typing status from server
                fetch(`${API_BASE}/messages/typing/${activeConversation.id}`, {
                    headers: authHeaders
                })
                .then(response => response.ok ? response.json() : null)
                .then(data => {
                    if (data?.success && data.data.typing_users) {
                        setTypingUsers(new Set(data.data.typing_users));
                    }
                })
                .catch((error) => {
                    // Silent fail for polling to prevent console spam
                    // Only log if it's not a network error
                    if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNABORTED') {
                        console.debug('Typing status polling error:', error.message);
                    }
                });
            }
        }, 10000); // Much slower: every 10 seconds

        // Cleanup intervals
        return () => {
            clearInterval(conversationInterval);
            clearInterval(messageInterval);
            clearInterval(typingInterval);
        };
    }, [isOpen, activeConversation, connectionStatus, fetchConversations, pollMessages, API_BASE, authHeaders]);

    // Smart fetch available users
    useEffect(() => {
        if (showNewConversation) {
            fetchAvailableUsers();
        }
    }, [showNewConversation, fetchAvailableUsers]);

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="chat-modal-overlay">
            <div className="chat-modal">
                <div className="chat-header">
                    <div className="header-left">
                        <h3>
                            <FontAwesomeIcon icon={faComments} />
                            Messages
                        </h3>
                        <div className={`connection-status ${connectionStatus}`}>
                            <span className="status-dot"></span>
                            {connectionStatus === 'connected' && 'Connected'}
                            {connectionStatus === 'connecting' && 'Connecting...'}
                            {connectionStatus === 'error' && 'Connection Error'}
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className="chat-content">
                    {/* Conversations Sidebar */}
                    <div className="conversations-sidebar">
                        <div className="conversations-header">
                            <h4>Conversations</h4>
                            <div className="header-actions">
                                <button 
                                    className="new-conversation-btn"
                                    onClick={() => setShowNewConversation(true)}
                                    title="Start new conversation"
                                >
                                    <FontAwesomeIcon icon={faPenToSquare} />
                                </button>
                                <button 
                                    className="refresh-btn"
                                    onClick={fetchConversations}
                                    title="Refresh conversations"
                                >
                                    <FontAwesomeIcon icon={faSync} />
                                </button>
                            </div>
                        </div>
                        <div className="conversations-list">
                            {conversations.length === 0 ? (
                                <div className="no-conversations">
                                    <FontAwesomeIcon icon={faUser} size="2x" />
                                    <p>No conversations yet</p>
                                    <small>Start chatting with other admin users</small>
                                </div>
                            ) : (
                                conversations.map(conv => (
                                    <button
                                        type="button"
                                        key={conv.other_user_id}
                                        className={`conversation-item ${
                                            activeConversation?.id === conv.other_user_id ? 'active' : ''
                                        }`}
                                        onClick={() => fetchMessages(conv.other_user_id)}
                                    >
                                        <div className="conversation-avatar">
                                            {conv.profile_image ? (
                                                <img 
                                                    src={`${getServerBaseUrl()}/assets/users/${conv.other_user_role}/${conv.profile_image}`}
                                                    alt={conv.other_user_name}
                                                />
                                            ) : (
                                                <div className="avatar-placeholder">
                                                    {conv.other_user_name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className={`status-dot ${conv.is_online ? 'online' : 'offline'}`}></div>
                                        </div>
                                        <div className="conversation-info">
                                            <div className="conversation-name">{conv.other_user_name}</div>
                                            <div className="conversation-role">{conv.other_user_role}</div>
                                            <div className="last-message">
                                                {conv.last_message || 'Start a conversation'}
                                            </div>
                                            <div className="conversation-time">
                                                {conv.last_message_time && 
                                                    new Date(conv.last_message_time).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                }
                                            </div>
                                        </div>
                                        <div className="conversation-badges">
                                            {conv.unread_count > 0 && (
                                                <div className="unread-badge">{conv.unread_count}</div>
                                            )}
                                            {conv.is_online && (
                                                <div className="online-indicator" title="Online">🟢</div>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="messages-area">
                        {activeConversation ? (
                            <>
                                <div className="messages-header">
                                    <div className="user-info">
                                        <div className="user-avatar">
                                            {activeConversation.profile_image ? (
                                                <img 
                                                    src={`${getServerBaseUrl()}/assets/users/${activeConversation.role}/${activeConversation.profile_image}`}
                                                    alt={activeConversation.name}
                                                />
                                            ) : (
                                                <div className="avatar-placeholder">
                                                    {activeConversation.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="user-name">{activeConversation.name}</div>
                                            <div className="user-role">{activeConversation.role}</div>
                                        </div>
                                    </div>
                                    <button className="chat-more-btn">
                                        <FontAwesomeIcon icon={faEllipsisH} />
                                    </button>
                                </div>

                                <div className="messages-list">
                                    {isLoading ? (
                                        <div className="loading-messages">Loading messages...</div>
                                    ) : (
                                        renderMessagesWithDivider()
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="message-input-area">
                                    <div className="message-input">
                                        <input
                                            type="text"
                                            placeholder="Type a message..."
                                            value={newMessage}
                                            onChange={(e) => {
                                                setNewMessage(e.target.value);
                                                handleTyping();
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                            disabled={connectionStatus === 'error'}
                                        />
                                        <button
                                            className="send-btn"
                                            onClick={sendMessage}
                                            disabled={!newMessage.trim() || connectionStatus === 'error'}
                                            title={connectionStatus === 'error' ? 'Connection error' : 'Send message'}
                                        >
                                            <FontAwesomeIcon icon={faPaperPlane} />
                                        </button>
                                    </div>
                                    {connectionStatus === 'error' && (
                                        <div className="connection-error">
                                            ⚠️ Connection error. Messages may not be delivered.
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="no-conversation-selected">
                                <FontAwesomeIcon icon={faComments} size="3x" />
                                <h4>Select a conversation</h4>
                                <p>Choose a conversation from the sidebar to start messaging</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* New Conversation Modal */}
                {showNewConversation && (
                    <div className="new-conversation-modal">
                        <div className="new-conversation-content">
                            <div className="new-conversation-header">
                                <h4>Start New Conversation</h4>
                                <button onClick={() => setShowNewConversation(false)}>
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>
                            <div className="available-users-list">
                                {availableUsers.length === 0 ? (
                                    <p>No available users to chat with</p>
                                ) : (
                                    availableUsers.map(user => (
                                        <button
                                            type="button"
                                            key={user.id}
                                            className="available-user-item"
                                            onClick={() => startNewConversation(user)}
                                        >
                                            <div className="user-avatar">
                                                {user.profile_image ? (
                                                    <img 
                                                        src={`${getServerBaseUrl()}/assets/users/${user.role}/${user.profile_image}`}
                                                        alt={user.name}
                                                    />
                                                ) : (
                                                    <div className="avatar-placeholder">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="user-info">
                                                <div className="user-name">{user.name}</div>
                                                <div className="user-role">{user.role}</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

ChatModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    currentUser: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
};

export default ChatModal;
