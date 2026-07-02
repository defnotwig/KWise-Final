/**
 * Dynamic Network Configuration Utility
 * Automatically detects the current network environment and provides appropriate URLs
 */
const getClientEnvValue = (key) => {
    const env = typeof process !== 'undefined' ? process.env || {} : {};
    return env[key] || env[`VITE_${key.replace(/^REACT_APP_/, '')}`];
};

const configuredApiUrl = () => getClientEnvValue('REACT_APP_API_URL') || getClientEnvValue('VITE_API_URL');
const configuredServerUrl = () => getClientEnvValue('REACT_APP_SERVER_URL') || getClientEnvValue('VITE_SERVER_URL');
const configuredBackendPort = () => getClientEnvValue('REACT_APP_BACKEND_PORT')
    || getClientEnvValue('VITE_BACKEND_PORT')
    || '5000';

/**
 * Get the current server's IP from the browser's location
 * @returns {string} Current server IP or localhost
 */
export const getCurrentServerIP = () => {
    if (globalThis.window !== undefined) { // NOSONAR - direct comparison with undefined
        const hostname = globalThis.location.hostname;
        
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
    const backendPort = configuredBackendPort();
    const apiUrl = configuredApiUrl();
    
    // Use environment variable if set, otherwise construct dynamically
    if (apiUrl) {
        return apiUrl;
    }
    
    return `http://${serverIP}:${backendPort}/api`;
};

/**
 * Get the appropriate server base URL for assets and uploads
 * @returns {string} Server base URL
 */
export const getServerBaseUrl = () => {
    const serverIP = getCurrentServerIP();
    const backendPort = configuredBackendPort();
    const serverUrl = configuredServerUrl();
    
    // Use environment variable if set, otherwise construct dynamically
    if (serverUrl) {
        return serverUrl;
    }
    
    return `http://${serverIP}:${backendPort}`;
};

const BACKEND_ASSET_PREFIXES = [
    '/uploads/',
    'uploads/',
    '/assets/parts/',
    'assets/parts/',
    '/assets/prebuilt/',
    'assets/prebuilt/',
    '/assets/community/',
    'assets/community/'
];

const isBackendManagedImagePath = (url) => {
    if (typeof url !== 'string') return false;

    const trimmed = url.trim();
    return BACKEND_ASSET_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
};

const isLikelyBundledFrontendAsset = (pathname) => (
    /^\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.[a-z0-9]+(?:[?#].*)?$/i.test(pathname)
);

const isFrontendManagedAssetUrl = (url) => {
    if (typeof url !== 'string') return false;

    const trimmed = url.trim();
    const frontendOrigin = globalThis.location?.origin || '';
    return trimmed.startsWith('blob:')
        || trimmed.startsWith('data:')
        || trimmed.startsWith('/src/assets/')
        || trimmed.startsWith('src/assets/')
        || trimmed.startsWith('/static/media/')
        || trimmed.startsWith('static/media/')
        || trimmed.startsWith(`${frontendOrigin}/src/assets/`)
        || isLikelyBundledFrontendAsset(trimmed.startsWith('/') ? trimmed : `/${trimmed}`)
        || trimmed.startsWith(`${frontendOrigin}/static/media/`)
        || (frontendOrigin && new URL(trimmed, frontendOrigin).origin === frontendOrigin
            && isLikelyBundledFrontendAsset(new URL(trimmed, frontendOrigin).pathname));
};

const isKnownPlaceholderImageUrl = (url) => {
    if (typeof url !== 'string') return false;

    try {
        const parsed = new URL(url);
        return parsed.hostname === 'example.com';
    } catch {
        return false;
    }
};

/**
 * Get WebSocket URL for real-time features
 * @returns {string} WebSocket URL
 */
export const getWebSocketUrl = () => {
    const serverIP = getCurrentServerIP();
    const backendPort = configuredBackendPort();
    
    return `http://${serverIP}:${backendPort}`;
};

/**
 * Convert a relative image URL to a full URL
 * @param {string} relativePath - Relative path to the image
 * @returns {string} Full image URL
 */
export const getFullImageUrl = (relativePath) => {
    if (!relativePath) return null;

    const imagePath = String(relativePath).trim();

    if (isKnownPlaceholderImageUrl(imagePath)) {
        return null;
    }

    if (isBackendManagedImagePath(imagePath)) {
        const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        return `${getServerBaseUrl()}${cleanPath}`;
    }

    if (isFrontendManagedAssetUrl(imagePath)) {
        return imagePath;
    }
    
    // If already a full URL, return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        const serverBase = getServerBaseUrl();

        if (/^https?:\/\/(localhost|127\.0\.0\.1):5000\//.test(imagePath) && !serverBase.includes(':5000')) {
            return imagePath.replace(/^https?:\/\/(localhost|127\.0\.0\.1):5000/, serverBase);
        }

        return imagePath;
    }
    
    // Ensure path starts with /
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
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
