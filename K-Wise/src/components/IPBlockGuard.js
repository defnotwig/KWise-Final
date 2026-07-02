import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { getApiBaseUrl } from '../utils/networkConfig';
import './IPBlockGuard.css';

const IP_CHECK_TTL_MS = 30000;
const IP_CHECK_STORAGE_KEY = 'kwise_ip_check_cache';
let cachedIpCheck = null;
let inFlightIpCheck = null;

const getBackendUrl = () => `${getApiBaseUrl()}/ip/check`;

const normalizeAllowedStatus = (data = {}) => ({
    isBlocked: data.status === 'blocked' || data.blocked === true,
    blockReason: data.blockedReason || data.message || 'Access denied',
    clientIP: data.ip || ''
});

const readStoredIpCheck = () => {
    try {
        const stored = JSON.parse(sessionStorage.getItem(IP_CHECK_STORAGE_KEY) || 'null');
        if (stored?.value && Date.now() - stored.timestamp < IP_CHECK_TTL_MS) {
            return stored;
        }
    } catch {
        sessionStorage.removeItem(IP_CHECK_STORAGE_KEY);
    }

    return null;
};

const writeStoredIpCheck = (value) => {
    const record = { timestamp: Date.now(), value };
    cachedIpCheck = record;

    try {
        sessionStorage.setItem(IP_CHECK_STORAGE_KEY, JSON.stringify(record));
    } catch {
        // Session storage is an optimization only.
    }
};

const fetchIpStatus = async () => {
    if (cachedIpCheck && Date.now() - cachedIpCheck.timestamp < IP_CHECK_TTL_MS) {
        return cachedIpCheck.value;
    }

    const stored = readStoredIpCheck();
    if (stored) {
        cachedIpCheck = stored;
        return stored.value;
    }

    if (inFlightIpCheck) {
        return inFlightIpCheck;
    }

    inFlightIpCheck = (async () => {
        const backendUrl = getBackendUrl();
        console.debug('Checking IP status at:', backendUrl);

        const response = await fetch(backendUrl, {
            method: 'GET',
            credentials: 'include',
            signal: AbortSignal.timeout(5000)
        });

        if (response.status === 403) {
            const data = await response.json();
            return {
                isBlocked: true,
                blockReason: data.blockedReason || data.message || 'Access denied',
                clientIP: data.ip || 'Unknown'
            };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return normalizeAllowedStatus(await response.json());
    })()
        .then((value) => {
            writeStoredIpCheck(value);
            return value;
        })
        .finally(() => {
            inFlightIpCheck = null;
        });

    return inFlightIpCheck;
};

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
    const mountedRef = useRef(true);

    const checkIPStatus = async () => {
        try {
            const status = await fetchIpStatus();
            if (!mountedRef.current) {
                return;
            }

            if (status.isBlocked) {
                setIsBlocked(true);
                setBlockReason(status.blockReason);
                setClientIP(status.clientIP || 'Unknown');
            } else {
                setIsBlocked(false);
                setBlockReason('');
                setClientIP(status.clientIP || '');
            }
        } catch (error) {
            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                console.warn('IP check timeout - backend may be starting up, allowing access');
            } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                console.warn('Backend connection refused - server may be starting, allowing access');
            } else {
                console.error('Failed to check IP status:', error);
            }

            if (mountedRef.current) {
                setIsBlocked(false);
            }
        } finally {
            if (mountedRef.current) {
                setIsChecking(false);
            }
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        // Check IP status immediately on mount
        checkIPStatus();

        // Re-check every 30 seconds to catch real-time blocks
        const interval = setInterval(checkIPStatus, 30000);

        return () => {
            mountedRef.current = false;
            clearInterval(interval);
        };
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
                    <div className="ip-guard-icon">ðŸš«</div>
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

IPBlockGuard.propTypes = {
    children: PropTypes.node.isRequired
};

export default IPBlockGuard;
