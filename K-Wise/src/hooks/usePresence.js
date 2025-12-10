import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for managing real-time user presence
 * Handles online/away/offline status based on window focus and socket connection
 */
export const usePresence = () => {
    const socket = useSocket();
    const { user } = useAuth();

    // Set user as online
    const setOnline = useCallback(() => {
        if (socket && user) {
            socket.emit('user:online');
            console.log('[Presence] User set to online');
        }
    }, [socket, user]);

    // Set user as away
    const setAway = useCallback(() => {
        if (socket && user) {
            socket.emit('user:away');
            console.log('[Presence] User set to away');
        }
    }, [socket, user]);

    // Set user as offline
    const setOffline = useCallback(() => {
        if (socket && user) {
            socket.emit('user:offline');
            console.log('[Presence] User set to offline');
        }
    }, [socket, user]);

    useEffect(() => {
        if (!socket || !user) return;

        // Set online when socket connects
        setOnline();

        // Handle window focus/blur for away status
        const handleFocus = () => {
            setOnline();
        };

        const handleBlur = () => {
            setAway();
        };

        // Handle page visibility change (more reliable than focus/blur)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setAway();
            } else {
                setOnline();
            }
        };

        // Handle beforeunload to set offline
        const handleBeforeUnload = () => {
            setOffline();
        };

        // Add event listeners
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup on unmount or socket change
        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            
            // Set offline when component unmounts
            setOffline();
        };
    }, [socket, user, setOnline, setAway, setOffline]);

    // Provide manual control functions
    return {
        setOnline,
        setAway,
        setOffline
    };
};
