import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Navbar from '../Navbar/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './Layout.css';

const Layout = ({ children }) => {
    const { currentUser, isLoading, logout } = useAuth();
    const { currentTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [lastCheckedPath, setLastCheckedPath] = useState('');

    // Check authentication status
    useEffect(() => {
        const checkAuth = () => {
            console.log("Layout - Checking authentication at path:", location.pathname);
            let user = null;

            // Store current path in sessionStorage to enable restoring after reload
            sessionStorage.setItem('lastPath', location.pathname);

            // Check current user from context
            if (currentUser) {
                console.log("Layout - Found current user in context:", currentUser.name);
                user = currentUser;
            }

            if (user) {
                console.log("Layout - User authenticated:", user.name, user.role);
                setIsAuthenticated(true);

                // Save the path we've authenticated for
                setLastCheckedPath(location.pathname);
            } else {
                console.log("Layout - No authenticated user found. Redirecting to login");
                // Save the current path before redirecting to login
                sessionStorage.setItem('redirectPath', location.pathname);
                setIsAuthenticated(false);

                // Use logout without redirect, then navigate to login
                logout(false);
                navigate('/login', { replace: true });
            }

            setAuthChecked(true);
        };

        // Only run the auth check if:
        // 1. Not loading from auth context
        // 2. Auth hasn't been checked yet OR the path has changed since last check
        // 3. CRITICAL FIX: Don't run check if already authenticated and on same path
        if (!isLoading && (!authChecked || (location.pathname !== lastCheckedPath && !isAuthenticated))) {
            checkAuth();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, isLoading, navigate, location.pathname, authChecked, lastCheckedPath]); // Excluded isAuthenticated and logout to prevent infinite loops

    console.log("Layout render - Auth checked:", authChecked, "Authenticated:", isAuthenticated, "Loading:", isLoading, "Path:", location.pathname);

    // Show loading state if still checking auth
    if (isLoading || !authChecked) {
        return <div className="loading">Loading...</div>;
    }

    // Redirect if not authenticated
    if (!isAuthenticated) {
        return <div className="loading">Redirecting to login...</div>;
    }

    return (
        <div className="admin-layout layout" data-theme={currentTheme}>
            <Sidebar />
            <main className="admin-main-content main-content">
                <Navbar />
                <div className="admin-content-container content-container">
                    {children || <Outlet />}
                </div>
            </main>
        </div>
    );
};

export default Layout;
