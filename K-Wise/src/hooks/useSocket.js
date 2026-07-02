import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getWebSocketUrl } from '../utils/networkConfig';

const useSocket = () => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    
    if (currentUser && !socketRef.current) {
      console.log('🔌 Initializing Socket.IO connection...');
      console.log('👤 User:', currentUser.name, '(', currentUser.role, ')');
      
      const wsUrl = getWebSocketUrl();
      console.log('🔗 Connecting to WebSocket URL:', wsUrl);
      
      const newSocket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket.IO connected');
        setConnected(true);
        
        // Set user as online immediately
        newSocket.emit('user:online');
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Socket.IO disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
        setConnected(false);
      });

      // Listen for presence updates
      newSocket.on('presence_update', (data) => {
        console.log('👥 Presence update:', data);
        setPresence(prev => ({
          ...prev,
          [data.userId]: {
            status: data.status,
            userName: data.userName,
            timestamp: data.timestamp
          }
        }));
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Handle window focus/blur for presence
      const handleFocus = () => {
        if (newSocket.connected) {
          newSocket.emit('user:online');
        }
      };

      const handleBlur = () => {
        if (newSocket.connected) {
          newSocket.emit('user:away');
        }
      };

      const handleBeforeUnload = () => {
        if (newSocket.connected) {
          newSocket.emit('user:offline');
        }
      };

      globalThis.addEventListener('focus', handleFocus);
      globalThis.addEventListener('blur', handleBlur);
      globalThis.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        globalThis.removeEventListener('focus', handleFocus);
        globalThis.removeEventListener('blur', handleBlur);
        globalThis.removeEventListener('beforeunload', handleBeforeUnload);
        
        if (newSocket) {
          newSocket.emit('user:offline');
          newSocket.disconnect();
        }
        socketRef.current = null;
      };
    }

    return () => {
      if (!currentUser && socketRef.current) {
        console.log('🔌 Disconnecting socket (user logged out)');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
    };
  }, [currentUser]);

  return {
    socket,
    connected,
    presence,
    // Helper methods
    setOnline: () => socket?.emit('user:online'),
    setAway: () => socket?.emit('user:away'),
    setOffline: () => socket?.emit('user:offline'),
    joinConversation: (userId) => socket?.emit('joinConversation', userId),
    leaveConversation: (userId) => socket?.emit('leaveConversation', userId),
    sendMessage: (recipientId, content) => socket?.emit('sendMessage', { recipientId, content }),
    setTyping: (conversationUserId, isTyping) => socket?.emit('typing', { conversationUserId, isTyping })
  };
};

export default useSocket;
