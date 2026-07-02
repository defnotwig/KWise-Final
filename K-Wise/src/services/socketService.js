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
import { getServerBaseUrl } from '../utils/networkConfig';

let socketInstance = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize Socket.IO connection
  * @returns {Socket} Socket.IO client instance
 */
export const initializeSocket = () => {
    if (socketInstance) {
        console.log('♻️ Socket already initialized, returning existing instance');
        return socketInstance;
    }

    const API_BASE = getServerBaseUrl();
    
    console.log('🔌 Initializing Socket.IO global connection...');
    console.log('🔗 Server URL:', API_BASE);

    socketInstance = io(API_BASE, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
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
        if (globalThis.window !== undefined) {
            globalThis.io = socketInstance;
            console.log('🌐 globalThis.io globally available');
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
        // ✅ CRITICAL FIX: Only log warnings, not errors, for connection attempts
        // This prevents console spam when backend is starting up
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
        globalThis.dispatchEvent(new CustomEvent('ipAccessUpdate', { detail: { type: 'new', data } }));
    });

    socketInstance.on('blockedIPAttempt', (data) => {
        console.log('🚫 Blocked IP attempt:', data);
        globalThis.dispatchEvent(new CustomEvent('ipAccessUpdate', { detail: { type: 'blocked', data } }));
    });

    socketInstance.on('ipStatusChanged', (data) => {
        console.log('🔄 IP status changed:', data);
        globalThis.dispatchEvent(new CustomEvent('ipAccessUpdate', { detail: { type: 'statusChanged', data } }));
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
        
        if (globalThis.window !== undefined) {
            globalThis.io = null;
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
