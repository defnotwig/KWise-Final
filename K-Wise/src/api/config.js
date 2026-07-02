// API Configuration for K-Wise Frontend
// Handles backend API URL resolution with robust error handling
import { getApiBaseUrl } from '../utils/networkConfig';
import { withCsrfHeader } from '../utils/authSecurity';

const API_CONFIG = {
    // Base URL for API calls - dynamically resolved
    BASE_URL: getApiBaseUrl(),
    
    // API endpoints
    ENDPOINTS: {
        STOCK: '/api/stock',
        STOCK_CATEGORIES: '/api/stock/categories',
        STOCK_BRANDS: '/api/stock/brands',
        STOCK_STATS: '/api/stock/stats',
        STOCK_META: '/api/stock/meta',
        AUTH: '/api/auth',
        HEALTH: '/api/health'
    },

    // Request timeout (milliseconds)
    TIMEOUT: 15000,
    
    // Default headers
    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

/**
 * Makes an API request with comprehensive error handling
 * @param {string} endpoint - The API endpoint (relative to base URL)
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<object>} - Promise that resolves to the response data
 */
export const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    // Set up request options with defaults
    const requestOptions = {
        method: 'GET',
        timeout: API_CONFIG.TIMEOUT,
        credentials: 'include',
        ...options
    };

    // Only set default headers if not dealing with FormData
    if (requestOptions.body instanceof FormData) {
        // For FormData, only add non-Content-Type headers
        requestOptions.headers = {
            ...withCsrfHeader(options.headers || {}, requestOptions.method)
        };
    } else {
        requestOptions.headers = {
            ...API_CONFIG.DEFAULT_HEADERS,
            ...withCsrfHeader(options.headers || {}, requestOptions.method)
        };
    }

    try {
        console.log(`🌐 API Request: ${requestOptions.method} ${url}`);
        
        const response = await fetch(url, {
            ...requestOptions,
            credentials: 'include',
            signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
        });
        
        console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
        
        // Check if response is ok
        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
                console.error(`❌ Error Response Body:`, errorText);
            } catch (e) {
                console.error(`❌ Could not read error response:`, e);
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Try to parse JSON response
        let data;
        try {
            const text = await response.text();
            if (text) {
                data = JSON.parse(text);
            } else {
                data = { success: true, data: null, message: 'Empty response' };
            }
        } catch (parseError) {
            console.error(`❌ JSON Parse Error:`, parseError);
            throw new Error('Invalid JSON response from server');
        }
        
        console.log(`✅ API Success: ${url}`, { success: data.success, dataType: typeof data.data });
        return data;
        
    } catch (error) {
        console.error(`❌ API Request Failed: ${url}`, error);
        
        // Provide user-friendly error messages
        if (error.name === 'TimeoutError') {
            throw new Error('Request timed out. Please check your connection and try again.');
        }
        
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            throw new Error('Cannot connect to server. Please ensure the backend is running on port 5000.');
        }
        
        throw error;
    }
};

/**
 * Stock API functions
 */
export const stockAPI = {
    // Get all stock items with filters
    getItems: (params = {}) => {
        const searchParams = new URLSearchParams();
        
        // Add parameters
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                searchParams.append(key, params[key]);
            }
        });
        
        const queryString = searchParams.toString();
        const endpoint = queryString ? `${API_CONFIG.ENDPOINTS.STOCK}?${searchParams}` : API_CONFIG.ENDPOINTS.STOCK;
        return apiRequest(endpoint);
    },
    
    // Get single item by ID
    getItem: (id) => apiRequest(`${API_CONFIG.ENDPOINTS.STOCK}/${id}`),
    
    // Create new item
    createItem: (data) => {
        // Handle FormData differently - don't set Content-Type for FormData
        const options = {
            method: 'POST'
        };
        
        if (data instanceof FormData) {
            options.body = data;
            // Don't set Content-Type for FormData - let browser set it with boundary
        } else {
            options.body = JSON.stringify(data);
            options.headers = { 'Content-Type': 'application/json' };
        }
        
        return apiRequest(API_CONFIG.ENDPOINTS.STOCK, options);
    },
    
    // Update item
    updateItem: (id, data) => {
        const options = {
            method: 'PATCH'
        };
        
        if (data instanceof FormData) {
            options.body = data;
            // Don't set Content-Type for FormData
        } else {
            options.body = JSON.stringify(data);
            options.headers = { 'Content-Type': 'application/json' };
        }
        
        return apiRequest(`${API_CONFIG.ENDPOINTS.STOCK}/${id}`, options);
    },
    
    // Delete item
    deleteItem: (id) => apiRequest(`${API_CONFIG.ENDPOINTS.STOCK}/${id}`, {
        method: 'DELETE'
    }),
    
    // Get categories
    getCategories: () => apiRequest(API_CONFIG.ENDPOINTS.STOCK_CATEGORIES),
    
    // Get brands
    getBrands: () => apiRequest(API_CONFIG.ENDPOINTS.STOCK_BRANDS),
    
    // Get statistics
    getStats: () => apiRequest(API_CONFIG.ENDPOINTS.STOCK_STATS),
    
    // Get specification fields for category
    getSpecificationFields: (category) => apiRequest(`${API_CONFIG.ENDPOINTS.STOCK_META}/${category}`)
};

/**
 * Health check API
 */
export const healthAPI = {
    check: () => apiRequest(API_CONFIG.ENDPOINTS.HEALTH)
};

export default API_CONFIG;
