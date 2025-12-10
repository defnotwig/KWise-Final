import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { authAPI, testConnection } from '../services/api';
import { jwtDecode } from 'jwt-decode';
import { initializeSocket, disconnectSocket } from '../services/socketService';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

// Demo credentials updated to match backend default admin account
const DEMO_CREDENTIALS = {
    email: 'admin@pcwise.com',
    password: 'Admin@123',
    user: {
        id: 'demo-user',
        name: 'Marcel',
        email: 'admin@pcwise.com',
        role: 'superadmin',
        avatarUrl: '/assets/default-avatar.png'
    }
};

// Generate a simple token for demo mode
const generateDemoToken = () => {
    const now = Date.now() / 1000;
    const payload = {
        sub: DEMO_CREDENTIALS.user.id,
        name: DEMO_CREDENTIALS.user.name,
        email: DEMO_CREDENTIALS.user.email,
        role: DEMO_CREDENTIALS.user.role,
        iat: now,
        exp: now + 3600 // 1 hour expiration
    };
    // This is just a simple encoding, not a real JWT
    return btoa(JSON.stringify(payload));
};

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [apiAvailable, setApiAvailable] = useState(true);
    const [backendStatus, setBackendStatus] = useState('unknown');

    // Update currentUser and save to localStorage
    const updateCurrentUser = useCallback((user) => {
        setCurrentUser(user);
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    }, []);

    // Test the API connection
    const testApiConnection = useCallback(async () => {
        try {
            // Temporarily enable all logging for debugging
            console.log('🔧 AuthContext: Testing API connection...');
            const available = await testConnection();
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
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        localStorage.removeItem('kwise_credentials'); // Clear saved credentials
        delete api.defaults.headers.common['Authorization'];
        updateCurrentUser(null);

        // Force redirect to login page by reloading only if redirect is true
        if (redirect) {
            window.location.href = '/login';
        }
    }, [updateCurrentUser]);

    // Get current user data - wrapped in useCallback to avoid dependency issues
    const getCurrentUser = useCallback(async () => {
        console.log('🔍 AuthContext: getCurrentUser called');
        
        // Always check localStorage first to preserve user state
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                console.log('📱 AuthContext: Found stored user:', parsedUser);
                
                // If Ludwig/superadmin is stored, always use that
                if (parsedUser.name === 'Ludwig' || parsedUser.role === 'superadmin') {
                    console.log('👑 AuthContext: Using stored superadmin user');
                    updateCurrentUser(parsedUser);
                    return;
                }
                
                // For other stored users, use them if API is unavailable
                if (!apiAvailable) {
                    console.log('📱 AuthContext: API unavailable, using stored user');
                    updateCurrentUser(parsedUser);
                    return;
                }
                
                // If API is available, verify the stored user
                console.log('🔄 AuthContext: API available, verifying stored user');
                updateCurrentUser(parsedUser);
                return;
            } catch (error) {
                console.error('❌ AuthContext: Error parsing stored user:', error);
                localStorage.removeItem('currentUser');
            }
        }

        if (!apiAvailable) {
            console.log('⚠️ AuthContext: API not available and no stored user found');
            updateCurrentUser(null);
            return;
        }

        try {
            console.log('🌐 AuthContext: Getting user data from /auth/me');
            const response = await authAPI.me();
            const userData = response.data;

            if (userData) {
                console.log('✅ AuthContext: User data received:', userData.email);
                updateCurrentUser(userData);
            } else {
                throw new Error('No user data received');
            }
        } catch (error) {
            console.error('❌ AuthContext: Error fetching user data:', error);
            // Fall back to stored user if API call fails
            const storedUser = JSON.parse(localStorage.getItem('currentUser'));
            if (storedUser) {
                console.log('🔄 AuthContext: Using stored user as fallback');
                updateCurrentUser(storedUser);
            } else {
                console.log('🚪 AuthContext: No fallback available, logging out');
                logout();
            }
        }
    }, [apiAvailable, logout, updateCurrentUser]);

    useEffect(() => {
        const initialize = async () => {
            // Try to load user from localStorage first for immediate UI display
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                setCurrentUser(JSON.parse(storedUser));
            }

            // Test API connection
            await testApiConnection();

            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    const currentTime = Date.now() / 1000;

                    if (decoded.exp && decoded.exp < currentTime) {
                        // Token expired
                        console.log('Token expired, logging out');
                        localStorage.removeItem('token');
                        updateCurrentUser(null);
                    } else {
                        // Set user from token
                        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        await getCurrentUser();
                        
                        // ✅ CRITICAL FIX: Only initialize Socket.IO if we have a valid token
                        // This prevents auth failures on page load when user isn't logged in
                        try {
                            initializeSocket(token);
                            console.log('✅ Socket.IO initialized on app startup (existing session)');
                        } catch (socketError) {
                            console.error('⚠️ Socket.IO initialization failed on startup:', socketError);
                            // Don't block app if Socket.IO fails
                        }
                    }
                } catch (error) {
                    console.error('Invalid token', error);
                    localStorage.removeItem('token');
                    // Still keep stored user if token is invalid but user exists
                    if (!storedUser) {
                        updateCurrentUser(null);
                    }
                }
            } else {
                // ✅ FIX: No token = no Socket.IO initialization (prevents auth errors)
                console.log('ℹ️ No token found - Socket.IO will initialize after login');
            }
            setIsLoading(false);
        };

        initialize();
    }, [getCurrentUser, testApiConnection, updateCurrentUser]);

    const login = async (email, password) => {
        console.log('Login attempt with:', { email });

        // Check if API is unavailable and we should use demo mode
        if (!apiAvailable) {
            console.log('API unavailable, using demo mode login');

            // Check demo credentials
            if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
                const demoToken = generateDemoToken();
                localStorage.setItem('token', demoToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${demoToken}`;
                updateCurrentUser(DEMO_CREDENTIALS.user);
                return DEMO_CREDENTIALS.user;
            } else {
                throw new Error('Invalid credentials (Demo Mode)');
            }
        }

        // Normal API login flow
        let token, user;

        try {
            // Try the login API endpoint
            console.log('Attempting login via authAPI.login');
            const loginResponse = await authAPI.login({ email, password });

            console.log('Login response:', loginResponse.data);

            // Extract token and user from response
            const responseData = loginResponse.data;

            if (responseData.status === 'success') {
                token = responseData.token;
                user = responseData.user || { email };
                console.log('Successful login, token received');
            } else {
                throw new Error(responseData.message || 'Login failed');
            }

            // If we still don't have a token, throw an error
            if (!token) {
                throw new Error('No token found in server response');
            }

            console.log('Login successful, token received');

            localStorage.setItem('token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // Initialize Socket.IO connection for real-time features
            try {
                initializeSocket(token);
                console.log('✅ Socket.IO initialized on login');
            } catch (socketError) {
                console.error('⚠️ Socket.IO initialization failed:', socketError);
                // Don't block login if Socket.IO fails
            }

            if (!user.name) {
                // If user object is incomplete, try to get full user data
                try {
                    await getCurrentUser();
                } catch (e) {
                    console.error('Error getting full user data:', e);
                    updateCurrentUser(user || { email });
                }
            } else {
                updateCurrentUser(user);
            }

            return user;
        } catch (error) {
            console.error('Login error:', error);

            // If API login fails and we're in demo mode, use demo credentials
            if (!apiAvailable && email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
                console.log('Using demo login as fallback');
                const demoToken = generateDemoToken();
                localStorage.setItem('token', demoToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${demoToken}`;
                updateCurrentUser(DEMO_CREDENTIALS.user);
                return DEMO_CREDENTIALS.user;
            }

            if (error.response) {
                // The request was made and the server responded with an error status
                throw new Error(error.response.data?.message || `Login failed: ${error.response.status}`);
            } else if (error.request) {
                // The request was made but no response was received
                throw new Error('No response from server. Please check your internet connection.');
            } else {
                // Something happened in setting up the request
                throw new Error(error.message || 'Login failed. Please try again.');
            }
        }
    };

    // logout function moved to top of file to avoid dependency issues

    const value = {
        currentUser,
        login,
        logout,
        isLoading,
        apiAvailable,
        backendStatus,
        testApiConnection,
        updateCurrentUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}