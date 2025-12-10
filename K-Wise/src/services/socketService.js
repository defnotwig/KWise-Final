/**
 * =====================================================
 * SOCKET.IO SERVICE - GLOBAL CONNECTION MANAGER
 * =====================================================
 * Purpose: Initialize and manage Socket.IO client connection
 * Author: K-Wise DevOps Team
 * Date: November 18, 2025
 * =====================================================
 */

import { io } from 'socket.io-client';

let socketInstance = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize Socket.IO connection
 * @param {string} token - JWT authentication token
 * @returns {Socket} Socket.IO client instance
 */
export const initializeSocket = (token) => {
    if (socketInstance) {
        console.log('♻️ Socket already initialized, returning existing instance');
        return socketInstance;
    }

    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    console.log('🔌 Initializing Socket.IO global connection...');
    console.log('🔗 Server URL:', API_BASE);
    console.log('🔑 Token exists:', !!token);

    socketInstance = io(API_BASE, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        timeout: 10000
    });

    // Connection events
    socketInstance.on('connect', () => {
        console.log('✅ Socket.IO connected - ID:', socketInstance.id);
        connectionAttempts = 0;
        
        // Make socket globally available
        if (typeof window !== 'undefined') {
            window.io = socketInstance;
            console.log('🌐 window.io globally available');
        }
    });

    socketInstance.on('disconnect', (reason) => {
        console.log('❌ Socket.IO disconnected -', reason);
        if (reason === 'io server disconnect') {
            // Server forcefully disconnected, reconnect manually
            socketInstance.connect();
        }
    });

    socketInstance.on('connect_error', (error) => {
        connectionAttempts++;
        // ✅ CRITICAL FIX: Improved error handling - distinguish auth errors from network errors
        // "Invalid namespace" usually means authentication failed (JWT expired or invalid)
        const isAuthError = error.message && (
            error.message.includes('Invalid namespace') || 
            error.message.includes('Authentication error') ||
            error.message.includes('No token provided')
        );
        
        if (isAuthError) {
            // Authentication error - log once and stop retrying
            // ✅ FIX: Reduce to info level - expected when user isn't logged in yet
            if (connectionAttempts === 1) {
                console.log('ℹ️ Socket.IO requires authentication - Login to enable real-time features');
            }
            // Don't spam console on auth failures
            return;
        }
        
        // Network/connection errors
        if (connectionAttempts === 1) {
            console.warn(`⚠️ Socket.IO connection failed (will retry ${MAX_RECONNECT_ATTEMPTS} times):`, error.message);
        } else if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('🚫 Max reconnection attempts reached, Socket.IO disabled');
        }
    });

    socketInstance.on('reconnect', (attemptNumber) => {
        console.log(`♻️ Socket.IO reconnected after ${attemptNumber} attempts`);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Socket.IO reconnection attempt ${attemptNumber}...`);
    });

    socketInstance.on('reconnect_failed', () => {
        console.error('🚫 Socket.IO reconnection failed completely');
    });

    // IP Access Control specific events
    socketInstance.on('newIPDetected', (data) => {
        console.log('🆕 New IP detected:', data);
        // Dispatch custom event for components to listen
        window.dispatchEvent(new CustomEvent('ipAccessUpdate', { detail: { type: 'new', data } }));
    });

    socketInstance.on('blockedIPAttempt', (data) => {
        console.log('🚫 Blocked IP attempt:', data);
        window.dispatchEvent(new CustomEvent('ipAccessUpdate', { detail: { type: 'blocked', data } }));
    });

    socketInstance.on('ipStatusChanged', (data) => {
        console.log('🔄 IP status changed:', data);
        window.dispatchEvent(new CustomEvent('ipAccessUpdate', { detail: { type: 'statusChanged', data } }));
    });

    return socketInstance;
};

/**
 * Get current socket instance
 * @returns {Socket|null}
 */
export const getSocket = () => {
    return socketInstance;
};

/**
 * Disconnect and cleanup socket
 */
export const disconnectSocket = () => {
    if (socketInstance) {
        console.log('🔌 Disconnecting Socket.IO...');
        socketInstance.disconnect();
        socketInstance = null;
        
        if (typeof window !== 'undefined') {
            window.io = null;
        }
    }
};

/**
 * Check if socket is connected
 * @returns {boolean}
 */
export const isSocketConnected = () => {
    return socketInstance?.connected || false;
};

const socketService = {
    initializeSocket,
    getSocket,
    disconnectSocket,
    isSocketConnected
};

export default socketService;
