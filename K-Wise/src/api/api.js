/**
 * Centralized API Module for K-Wise Frontend
 * Exports unified access to all API services (admin, kiosk, etc.)
 */

// Import specialized API modules
import kioskAPI from './kioskAPI';
import builderAPI from './builderAPI';
import adminAPI, { ordersAPI, productsAPI, usersAPI, analyticsAPI } from './adminAPI';
import { getApiBaseUrl, getServerBaseUrl } from '../utils/networkConfig';

// API base configuration - NETWORK AWARE (auto-detects LAN IP)
const API_BASE_URL = getApiBaseUrl();
const SERVER_BASE_URL = getServerBaseUrl();

console.log('🔧 API Service initialized with base URL:', API_BASE_URL);

/**
 * Unified API interface for all K-Wise frontend components
 * This ensures consistent API access patterns across the application
 */
const api = {
    // Kiosk-specific endpoints
    kiosk: {
        ...kioskAPI
    },

    // PC Builder endpoints
    builder: {
        ...builderAPI
    },

    // Admin endpoints (TASK 7)
    admin: {
        ...adminAPI
    },

    // General configuration
    config: {
        baseUrl: API_BASE_URL,
        timeout: 90000 // 🔥 INCREASED: 90s for AI compatibility analysis (was 15s, caused timeouts)
    },

    // Common utilities
    utils: {
        /**
         * Convert relative image URL to full URL
         */
        getFullImageUrl: (imageUrl) => {
            if (!imageUrl) return null;
            if (imageUrl.startsWith('http')) return imageUrl;
            return imageUrl.startsWith('/') ? `${SERVER_BASE_URL}${imageUrl}` : `${SERVER_BASE_URL}/${imageUrl}`;
        },

        /**
         * Format specifications from JSON to readable text
         */
        formatSpecifications: (specs) => {
            if (!specs) return {};
            
            // If it's already an object, return it as-is
            if (typeof specs === 'object' && specs !== null) {
                return specs;
            }
            
            // If it's a string, try to parse as JSON
            if (typeof specs === 'string') {
                try {
                    return JSON.parse(specs);
                } catch (e) {
                    console.warn('Failed to parse specifications as JSON:', specs);
                    return {};
                }
            }
            
            return {};
        },

        /**
         * Format price with currency
         */
        formatPrice: (price) => {
            return new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP'
            }).format(price);
        }
    }
};

// Export both unified API and individual modules for flexibility
export default api;
export { kioskAPI, builderAPI, adminAPI, ordersAPI, productsAPI, usersAPI, analyticsAPI };
