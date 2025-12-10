import { useEffect, useState } from 'react';
import './IPBlockGuard.css';

/**
 * IP Block Guard Component
 * Prevents blocked IPs from accessing the frontend
 * Checks IP status on mount and periodically
 */
const IPBlockGuard = ({ children }) => {
    const [isBlocked, setIsBlocked] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [blockReason, setBlockReason] = useState('');
    const [clientIP, setClientIP] = useState('');

    const checkIPStatus = async () => {
        try {
            // Use window.location.hostname to support both localhost and network access
            const backendHost = window.location.hostname === 'localhost' 
                ? 'localhost' 
                : window.location.hostname;
            const backendUrl = `http://${backendHost}:5000/api/ip/check`;
            
            console.log('🔍 Checking IP status at:', backendUrl);
            
            const response = await fetch(backendUrl, {
                method: 'GET',
                credentials: 'include',
                // ✅ Add timeout to prevent hanging
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });

            // Handle 403 Forbidden (IP is blocked)
            if (response.status === 403) {
                const data = await response.json();
                console.log('🚫 IP is blocked:', data);
                setIsBlocked(true);
                setBlockReason(data.blockedReason || data.message || 'Access denied');
                setClientIP(data.ip || 'Unknown');
                setIsChecking(false);
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ IP check response:', data);
            
            // Check if IP is blocked (should not happen if 403 handled above)
            if (data.status === 'blocked' || data.blocked === true) {
                setIsBlocked(true);
                setBlockReason(data.blockedReason || data.message || 'Access denied');
                setClientIP(data.ip || 'Unknown');
            } else {
                setIsBlocked(false);
                setBlockReason('');
                setClientIP(data.ip || '');
            }
        } catch (error) {
            // ✅ Improved error handling - distinguish between network errors and timeouts
            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                console.warn('⚠️ IP check timeout - backend may be starting up, allowing access');
            } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                console.warn('⚠️ Backend connection refused - server may be starting, allowing access');
            } else {
                console.error('❌ Failed to check IP status:', error);
            }
            // On error, allow access but log the issue
            setIsBlocked(false);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        // Check IP status immediately on mount
        checkIPStatus();

        // Re-check every 30 seconds to catch real-time blocks
        const interval = setInterval(checkIPStatus, 30000);

        return () => clearInterval(interval);
    }, []);

    // Show loading screen while checking
    if (isChecking) {
        return (
            <div className="ip-guard-loading">
                <div className="ip-guard-spinner"></div>
                <p>Verifying access...</p>
            </div>
        );
    }

    // Show block screen if blocked
    if (isBlocked) {
        return (
            <div className="ip-guard-blocked">
                <div className="ip-guard-blocked-content">
                    <div className="ip-guard-icon">🚫</div>
                    <h1>Access Denied</h1>
                    <p className="ip-guard-message">{blockReason}</p>
                    {clientIP && (
                        <p className="ip-guard-ip">Your IP: <code>{clientIP}</code></p>
                    )}
                    <p className="ip-guard-instructions">
                        If you believe this is a mistake, please contact the administrator.
                    </p>
                </div>
            </div>
        );
    }

    // Allow access if not blocked
    return <>{children}</>;
};

export default IPBlockGuard;
