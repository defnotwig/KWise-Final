import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../contexts/AuthContext';
import { getServerBaseUrl } from '../utils/networkConfig';
import { MessageSquare, Send, X, Users } from 'lucide-react';

const appendMessage = (previousMessages, message) => [...previousMessages, message];
const addOnlineUser = (previousUsers, userData) => [...previousUsers, userData];
const removeOnlineUser = (previousUsers, userId) => previousUsers.filter((onlineUser) => onlineUser.id !== userId);

const getMessageKey = (message) => (
  message.id || `${message.timestamp || 'no-time'}-${message.sender_id || 'no-sender'}-${message.content || 'no-content'}`
);

const MessagingCenter = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch recent messages when opening chat
  useEffect(() => {
    const fetchMessages = async () => {
      if (!isOpen || !user?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`${getServerBaseUrl()}/api/messages/recent`, {
          credentials: 'include',
          headers: {            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(data.data?.messages || data.messages || []);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, user?.id]);

  // Real-time message listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setMessages((previousMessages) => appendMessage(previousMessages, message));
      
      if (!isOpen && message.sender_id !== user?.id) {
        setUnreadCount((previousUnreadCount) => previousUnreadCount + 1);
      }
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleUserJoined = (userData) => {
      setOnlineUsers((previousUsers) => addOnlineUser(previousUsers, userData));
    };

    const handleUserLeft = (userData) => {
      setOnlineUsers((previousUsers) => removeOnlineUser(previousUsers, userData.id));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('users:online', handleOnlineUsers);
    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);

    // Request online users when socket connects
    socket.emit('users:get-online');

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('users:online', handleOnlineUsers);
      socket.off('user:joined', handleUserJoined);
      socket.off('user:left', handleUserLeft);
    };
  }, [socket, isOpen, user?.id]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      sender_id: user.id,
      sender_name: user.name,
      sender_role: user.role
    };

    // Add to local state immediately for better UX
    setMessages(prev => [...prev, messageData]);
    setNewMessage('');

    // Send via socket
    socket.emit('message:send', messageData);

    try {
      // Also save to database
      await fetch(`${getServerBaseUrl()}/api/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: messageData.content })
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'superadmin':
        return 'text-red-600 dark:text-red-400';
      case 'admin':
        return 'text-blue-600 dark:text-blue-400';
      case 'developer':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  let messagesContent = null;
  if (loading) {
    messagesContent = (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  } else if (messages.length === 0) {
    messagesContent = (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Start the conversation!</p>
      </div>
    );
  } else {
    messagesContent = messages.map((message) => (
      <div
        key={getMessageKey(message)}
        className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
            message.sender_id === user.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900'
          }`}
        >
          {message.sender_id !== user.id && (
            <p className={`text-xs font-medium mb-1 ${getRoleColor(message.sender_role)}`}>
              {message.sender_name}
            </p>
          )}
          <p className="text-sm">{message.content}</p>
          <p className={`text-xs mt-1 ${
            message.sender_id === user.id
              ? 'text-blue-100'
              : 'text-gray-500'
          }`}>
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    ));
  }

  return (
    <div className="relative">
      {/* Messages Button */}
      <button
        onClick={handleOpenChat}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        title="Messages"
      >
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Team Chat
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                <span>{onlineUsers.length} online</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Online Users */}
          <div className="px-4 py-2 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {onlineUsers.map((onlineUser) => (
                <div
                  key={onlineUser.id}
                  className="flex items-center space-x-1 text-xs bg-gray-100 rounded-full px-2 py-1"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className={`font-medium ${getRoleColor(onlineUser.role)}`}>
                    {onlineUser.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messagesContent}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MessagingCenter;
