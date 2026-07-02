import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import api, { authAPI, testConnection } from '../services/api';
import { initializeSocket, disconnectSocket } from '../services/socketService';
import { clearLegacyAuthStorage, installCredentialedRequestDefaults } from '../utils/authSecurity';

const AuthContext = createContext();
installCredentialedRequestDefaults();

export function useAuth() {
    return useContext(AuthContext);
}

const AUTH_STORAGE_KEYS = ['token', 'authToken', 'currentUser', 'userRole', 'kwise_credentials'];
const STARTUP_PROBE_CACHE_MS = 30000;
const SESSION_PROBE_CACHE_MS = 10000;
const API_CONNECTION_STORAGE_KEY = 'kwise_api_connection_cache';
const AUTH_SESSION_STORAGE_KEY = 'kwise_auth_session_cache';
let apiConnectionCache = null;
let apiConnectionPromise = null;
let verifiedSessionPromise = null;

const shouldVerifySessionForCurrentPath = () => {
    const pathname = globalThis.location?.pathname || '';
    return pathname.startsWith('/admin');
};

const readSessionRecord = (key, ttlMs) => {
    try {
        const stored = JSON.parse(sessionStorage.getItem(key) || 'null');
        if (stored?.value !== undefined && Date.now() - stored.timestamp < ttlMs) {
            return stored.value;
        }
    } catch {
        sessionStorage.removeItem(key);
    }

    return undefined;
};

const writeSessionRecord = (key, value) => {
    try {
        sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), value }));
    } catch {
        // Session storage is a local optimization only.
    }
};

const clearAuthStorage = () => {
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    sessionStorage.removeItem(API_CONNECTION_STORAGE_KEY);
    clearLegacyAuthStorage();
    delete api.defaults.headers.common['Authorization'];
};

const probeApiConnection = async () => {
    if (apiConnectionCache && Date.now() - apiConnectionCache.timestamp < STARTUP_PROBE_CACHE_MS) {
        return apiConnectionCache.value;
    }

    const stored = readSessionRecord(API_CONNECTION_STORAGE_KEY, STARTUP_PROBE_CACHE_MS);
    if (stored !== undefined) {
        apiConnectionCache = { timestamp: Date.now(), value: stored };
        return stored;
    }

    if (!apiConnectionPromise) {
        apiConnectionPromise = testConnection()
            .then((value) => {
                apiConnectionCache = { timestamp: Date.now(), value };
                writeSessionRecord(API_CONNECTION_STORAGE_KEY, value);
                return value;
            })
            .finally(() => {
                apiConnectionPromise = null;
            });
    }

    return apiConnectionPromise;
};

const getVerifiedSession = async () => {
    const stored = readSessionRecord(AUTH_SESSION_STORAGE_KEY, SESSION_PROBE_CACHE_MS);
    if (stored !== undefined) {
        return { data: stored };
    }

    if (!verifiedSessionPromise) {
        verifiedSessionPromise = authAPI.me()
            .then((response) => {
                writeSessionRecord(AUTH_SESSION_STORAGE_KEY, response.data);
                return response;
            })
            .catch((error) => {
                if (error.response?.status === 401 || error.response?.status === 429) {
                    const guestSession = { authenticated: false };
                    writeSessionRecord(AUTH_SESSION_STORAGE_KEY, guestSession);
                    return { data: guestSession };
                }

                throw error;
            })
            .finally(() => {
                verifiedSessionPromise = null;
            });
    }

    return verifiedSessionPromise;
};

const extractLoginPayload = (responseData, email) => {
    if (responseData?.status !== 'success') {
        throw new Error(responseData?.message || 'Login failed');
    }

    return {
        user: responseData.user || { email }
    };
};

const getLoginErrorMessage = (error) => {
    if (error.response) {
        return error.response.data?.message || `Login failed: ${error.response.status}`;
    }

    if (error.request) {
        return 'No response from server. Please check your internet connection.';
    }

    return error.message || 'Login failed. Please try again.';
};

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [apiAvailable, setApiAvailable] = useState(true);
    const [backendStatus, setBackendStatus] = useState('unknown');

    // Update currentUser from the verified cookie-backed backend session only.
    const updateCurrentUser = useCallback((user) => {
        setCurrentUser(user);
        localStorage.removeItem('currentUser');
    }, []);

    // Test the API connection
    const testApiConnection = useCallback(async () => {
        try {
            // Temporarily enable all logging for debugging
            console.log('🔧 AuthContext: Testing API connection...');
            const available = await probeApiConnection();
            console.log('🔧 AuthContext: API connection test result:', available);
            setApiAvailable(available);
            setBackendStatus(available ? 'connected' : 'unavailable');
            return available;
        } catch (error) {
            console.error('🔧 AuthContext: API connection test failed:', error);
            setApiAvailable(false);
            setBackendStatus('error');
            return false;
        }
    }, []);

    const initializeRealtimeSession = useCallback(() => {
        try {
            initializeSocket();
            console.log('✅ Socket.IO initialized');
        } catch (socketError) {
            console.error('⚠️ Socket.IO initialization failed:', socketError);
        }
    }, []);

    const persistAuthenticatedSession = useCallback(() => {
        clearLegacyAuthStorage();
        sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        delete api.defaults.headers.common['Authorization'];
        initializeRealtimeSession();
    }, [initializeRealtimeSession]);

    // Logout function - wrapped in useCallback to avoid dependency issues
    const logout = useCallback(async (redirect = true) => {
        console.log('Logging out user, redirect:', redirect);

        // Disconnect Socket.IO
        try {
            disconnectSocket();
            console.log('✅ Socket.IO disconnected on logout');
        } catch (socketError) {
            console.error('⚠️ Socket.IO disconnect error:', socketError);
        }

        try {
            // Call backend logout API to invalidate session
            await authAPI.logout();
        } catch (error) {
            console.error('Error during logout API call:', error);
            // Continue with local cleanup even if API call fails
        }

        // Clean up local storage and state
        clearAuthStorage();
        updateCurrentUser(null);

        // Force redirect to login page by reloading only if redirect is true
        if (redirect) {
            globalThis.location.href = '/login';
        }
    }, [updateCurrentUser]);

    // Get current user data - wrapped in useCallback to avoid dependency issues
    const getCurrentUser = useCallback(async () => {
        if (!apiAvailable) {
            updateCurrentUser(null);
            return;
        }

        try {
            const response = await getVerifiedSession();
            const userData = response.data?.data || response.data?.user || response.data;

            if (response.data?.authenticated === false || !userData) {
                updateCurrentUser(null);
            } else if (userData?.id || userData?.email) {
                updateCurrentUser(userData);
            } else {
                throw new Error('No user data received');
            }
        } catch (error) {
            const isGuestSession = error.response?.status === 401;
            const isCanceled = error.code === 'ERR_CANCELED' || error.name === 'CanceledError';

            if (!isGuestSession && !isCanceled) {
                console.error('AuthContext: Error fetching verified user data:', error);
            }
            clearAuthStorage();
            updateCurrentUser(null);
        }
    }, [apiAvailable, updateCurrentUser]);

    const resolveAuthenticatedUser = useCallback(async (user, email) => {
        if (user.name) {
            updateCurrentUser(user);
            return user;
        }

        try {
            await getCurrentUser();
            return user || { email };
        } catch (error) {
            console.error('Error getting full user data:', error);
            const fallbackUser = user || { email };
            updateCurrentUser(fallbackUser);
            return fallbackUser;
        }
    }, [getCurrentUser, updateCurrentUser]);

    useEffect(() => {
        const initialize = async () => {
            const shouldVerifySession = shouldVerifySessionForCurrentPath();

            await testApiConnection();
            clearLegacyAuthStorage();
            delete api.defaults.headers.common['Authorization'];
            if (shouldVerifySession) {
                await getCurrentUser();
            } else {
                updateCurrentUser(null);
            }
            setIsLoading(false);
        };

        initialize();
    }, [getCurrentUser, testApiConnection, updateCurrentUser]);

    const login = useCallback(async (email, password) => {
        console.log('Login attempt with:', { email });

        if (!apiAvailable) {
            throw new Error('Backend unavailable. Existing signed-in sessions can continue offline, but new logins require the backend.');
        }

        try {
            console.log('Attempting login via authAPI.login');
            const loginResponse = await authAPI.login({ email, password });
            console.log('Login response:', loginResponse.data);
            const { user } = extractLoginPayload(loginResponse.data, email);

            persistAuthenticatedSession();

            return resolveAuthenticatedUser(user, email);
        } catch (error) {
            console.error('Login error:', error);
            throw new Error(getLoginErrorMessage(error));
        }
    }, [apiAvailable, persistAuthenticatedSession, resolveAuthenticatedUser]);

    // logout function moved to top of file to avoid dependency issues

    const value = useMemo(() => ({
        currentUser,
        user: currentUser,
        login,
        logout,
        isLoading,
        apiAvailable,
        backendStatus,
        testApiConnection,
        updateCurrentUser
    }), [
        apiAvailable,
        backendStatus,
        currentUser,
        isLoading,
        login,
        logout,
        testApiConnection,
        updateCurrentUser
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired
};
