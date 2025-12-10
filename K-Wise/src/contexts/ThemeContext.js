import React, { createContext, useContext, useState, useEffect } from 'react';

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
        const isKioskRoute = window.location.pathname.includes('/pc-parts') ||
            window.location.pathname.includes('/kiosk') ||
            window.location.pathname.includes('/product') ||
            window.location.pathname.includes('/order-summary') ||
            window.location.pathname === '/';

        if (!isKioskRoute) {
            document.documentElement.setAttribute('data-theme', currentTheme);
        } else {
            // Remove any theme attribute for kiosk pages
            document.documentElement.removeAttribute('data-theme');
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
    const t = (key) => {
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
    };

    const value = {
        currentTheme,
        currentLanguage,
        changeTheme,
        changeLanguage,
        t
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
