import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';

// Enhanced theme system with data attributes
const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState(() => {
        // Get theme from localStorage or default to 'light'
        return localStorage.getItem('kwise-theme') || 'light';
    });

    const [currentLanguage, setCurrentLanguage] = useState(() => {
        return localStorage.getItem('kwise-language') || 'en';
    });

    // Apply theme to document root (but not for kiosk pages)
    useEffect(() => {
        const isKioskRoute = globalThis.location.pathname.includes('/pc-parts') ||
            globalThis.location.pathname.includes('/kiosk') ||
            globalThis.location.pathname.includes('/product') ||
            globalThis.location.pathname.includes('/order-summary') ||
            globalThis.location.pathname === '/';

        if (isKioskRoute) {
            // Remove any theme attribute for kiosk pages
            delete document.documentElement.dataset.theme;
        } else {
            document.documentElement.dataset.theme = currentTheme;
        }
        localStorage.setItem('kwise-theme', currentTheme);
    }, [currentTheme]);

    // Language handling
    useEffect(() => {
        localStorage.setItem('kwise-language', currentLanguage);
    }, [currentLanguage]);

    const changeTheme = (newTheme) => {
        if (['light', 'dark', 'blue', 'green'].includes(newTheme)) {
            setCurrentTheme(newTheme);
        }
    };

    const changeLanguage = (newLanguage) => {
        setCurrentLanguage(newLanguage);
    };

    // Simple translation function (can be expanded)
    const t = useCallback((key) => {
        const translations = {
            en: {
                dashboard: 'Dashboard',
                settings: 'Settings',
                users: 'Users',
                orders: 'Orders',
                appearance: 'Appearance',
                resetToDefault: 'Reset to Default',
                saveSettings: 'Save Settings',
                saveSuccess: 'Settings saved successfully!',
                saveError: 'Failed to save settings.',
                theme: 'Theme',
                language: 'Language',
                system: 'System',
                security: 'Security',
                // Add more translations as needed
            },
            // Add more languages as needed
        };

        return translations[currentLanguage]?.[key] || key;
    }, [currentLanguage]);

    const value = useMemo(() => ({
        currentTheme,
        currentLanguage,
        changeTheme,
        changeLanguage,
        t
    }), [currentTheme, currentLanguage, t]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

ThemeProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export default ThemeContext;
