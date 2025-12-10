/**
 * Dynamic Network Configuration Utility
 * Automatically detects the current network environment and provides appropriate URLs
 */

/**
 * Get the current server's IP from the browser's location
 * @returns {string} Current server IP or localhost
 */
export const getCurrentServerIP = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        
        // If accessing via IP address, use that IP
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            return hostname;
        }
        
        // If accessing via localhost or 127.0.0.1, use localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'localhost';
        }
        
        // For other hostnames, try to use the hostname
        return hostname;
    }
    
    // Fallback for server-side rendering
    return 'localhost';
};

/**
 * Get the appropriate API base URL based on current network
 * @returns {string} API base URL
 */
export const getApiBaseUrl = () => {
    const serverIP = getCurrentServerIP();
    const backendPort = process.env.REACT_APP_BACKEND_PORT || '5000';
    
    // Use environment variable if set, otherwise construct dynamically
    if (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes('localhost')) {
        return process.env.REACT_APP_API_URL;
    }
    
    return `http://${serverIP}:${backendPort}/api`;
};

/**
 * Get the appropriate server base URL for assets and uploads
 * @returns {string} Server base URL
 */
export const getServerBaseUrl = () => {
    const serverIP = getCurrentServerIP();
    const backendPort = process.env.REACT_APP_BACKEND_PORT || '5000';
    
    // Use environment variable if set, otherwise construct dynamically
    if (process.env.REACT_APP_SERVER_URL && !process.env.REACT_APP_SERVER_URL.includes('localhost')) {
        return process.env.REACT_APP_SERVER_URL;
    }
    
    return `http://${serverIP}:${backendPort}`;
};

/**
 * Get WebSocket URL for real-time features
 * @returns {string} WebSocket URL
 */
export const getWebSocketUrl = () => {
    const serverIP = getCurrentServerIP();
    const backendPort = process.env.REACT_APP_BACKEND_PORT || '5000';
    
    return `http://${serverIP}:${backendPort}`;
};

/**
 * Convert a relative image URL to a full URL
 * @param {string} relativePath - Relative path to the image
 * @returns {string} Full image URL
 */
export const getFullImageUrl = (relativePath) => {
    if (!relativePath) return null;
    
    // If already a full URL, return as-is
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        // But if it's a localhost URL and we're on a different IP, convert it
        if (relativePath.includes('localhost:5000') && getCurrentServerIP() !== 'localhost') {
            return relativePath.replace('localhost:5000', `${getCurrentServerIP()}:5000`);
        }
        return relativePath;
    }
    
    // Ensure path starts with /
    const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    
    return `${getServerBaseUrl()}${cleanPath}`;
};

/**
 * Network configuration object
 */
export const networkConfig = {
    getCurrentServerIP,
    getApiBaseUrl,
    getServerBaseUrl,
    getWebSocketUrl,
    getFullImageUrl,
    
    // Convenience getters
    get apiBaseUrl() {
        return getApiBaseUrl();
    },
    
    get serverBaseUrl() {
        return getServerBaseUrl();
    },
    
    get wsUrl() {
        return getWebSocketUrl();
    }
};

export default networkConfig;