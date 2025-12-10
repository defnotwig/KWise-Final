/**
 * ADMIN API MODULE
 * Centralized API functions for admin features
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

/**
 * Orders API
 */
export const ordersAPI = {
    /**
     * Auto-generate test orders
     * @param {Object} config - Configuration for order generation
     * @returns {Promise}
     */
    autoGenerate: (config) => {
        return axiosInstance.post('/orders/auto-generate', config);
    },

    /**
     * Cleanup test orders
     * @param {string} customerPrefix - Prefix to match for deletion
     * @returns {Promise}
     */
    cleanupTestOrders: (customerPrefix = 'Test Customer') => {
        return axiosInstance.delete('/orders/auto-generate/cleanup', {
            data: { customerPrefix }
        });
    },

    /**
     * Get all orders (with optional filters)
     * @param {Object} params - Query parameters (status, limit, offset, etc.)
     * @returns {Promise}
     */
    getAll: (params = {}) => {
        return axiosInstance.get('/orders', { params });
    },

    /**
     * Get order by ID
     * @param {number} id - Order ID
     * @returns {Promise}
     */
    getById: (id) => {
        return axiosInstance.get(`/orders/${id}`);
    },

    /**
     * Update order status
     * @param {number} id - Order ID
     * @param {string} status - New status
     * @returns {Promise}
     */
    updateStatus: (id, status) => {
        return axiosInstance.patch(`/orders/${id}/status`, { status });
    },

    /**
     * Delete order
     * @param {number} id - Order ID
     * @returns {Promise}
     */
    delete: (id) => {
        return axiosInstance.delete(`/orders/${id}`);
    },

    /**
     * Get recent orders for dashboard
     * @param {number} limit - Number of orders to fetch
     * @returns {Promise}
     */
    getRecent: (limit = 10) => {
        return axiosInstance.get('/orders/recent-dashboard', { params: { limit } });
    }
};

/**
 * Products API
 */
export const productsAPI = {
    /**
     * Get all products (with optional filters)
     * @param {Object} params - Query parameters
     * @returns {Promise}
     */
    getAll: (params = {}) => {
        return axiosInstance.get('/pc-parts', { params });
    },

    /**
     * Get product by ID
     * @param {number} id - Product ID
     * @returns {Promise}
     */
    getById: (id) => {
        return axiosInstance.get(`/pc-parts/${id}`);
    },

    /**
     * Create new product
     * @param {Object} productData - Product data
     * @returns {Promise}
     */
    create: (productData) => {
        return axiosInstance.post('/pc-parts', productData);
    },

    /**
     * Update product
     * @param {number} id - Product ID
     * @param {Object} productData - Updated product data
     * @returns {Promise}
     */
    update: (id, productData) => {
        return axiosInstance.put(`/pc-parts/${id}`, productData);
    },

    /**
     * Delete product
     * @param {number} id - Product ID
     * @returns {Promise}
     */
    delete: (id) => {
        return axiosInstance.delete(`/pc-parts/${id}`);
    },

    /**
     * TASK 8: Batch delete products
     * @param {Array<number>} productIds - Array of product IDs
     * @returns {Promise}
     */
    batchDelete: (productIds) => {
        return axiosInstance.post('/admin/products/batch-delete', { productIds });
    },

    /**
     * TASK 8: Batch update prices
     * @param {Array<Object>} updates - Array of {id, newPrice}
     * @returns {Promise}
     */
    batchUpdatePrices: (updates) => {
        return axiosInstance.post('/admin/products/batch-update-prices', { updates });
    },

    /**
     * TASK 8: Batch update categories
     * @param {Array<number>} productIds - Product IDs
     * @param {string} newCategory - New category
     * @returns {Promise}
     */
    batchUpdateCategories: (productIds, newCategory) => {
        return axiosInstance.post('/admin/products/batch-update-categories', { productIds, newCategory });
    },

    /**
     * TASK 8: Batch update stock
     * @param {Array<Object>} updates - Array of {id, newStock}
     * @returns {Promise}
     */
    batchUpdateStock: (updates) => {
        return axiosInstance.post('/admin/products/batch-update-stock', { updates });
    }
};

/**
 * Users API
 */
export const usersAPI = {
    /**
     * Get all users
     * @returns {Promise}
     */
    getAll: () => {
        return axiosInstance.get('/users');
    },

    /**
     * Get user by ID
     * @param {number} id - User ID
     * @returns {Promise}
     */
    getById: (id) => {
        return axiosInstance.get(`/users/${id}`);
    },

    /**
     * Create new user
     * @param {Object} userData - User data
     * @returns {Promise}
     */
    create: (userData) => {
        return axiosInstance.post('/users', userData);
    },

    /**
     * Update user
     * @param {number} id - User ID
     * @param {Object} userData - Updated user data
     * @returns {Promise}
     */
    update: (id, userData) => {
        return axiosInstance.put(`/users/${id}`, userData);
    },

    /**
     * Delete user
     * @param {number} id - User ID
     * @returns {Promise}
     */
    delete: (id) => {
        return axiosInstance.delete(`/users/${id}`);
    }
};

/**
 * Analytics API
 */
export const analyticsAPI = {
    /**
     * Get dashboard statistics
     * @returns {Promise}
     */
    getDashboardStats: () => {
        return axiosInstance.get('/analytics/dashboard');
    },

    /**
     * Get revenue trends
     * @param {Object} params - Date range parameters
     * @returns {Promise}
     */
    getRevenueTrends: (params = {}) => {
        return axiosInstance.get('/analytics/revenue', { params });
    },

    /**
     * Get top products
     * @param {number} limit - Number of products to fetch
     * @returns {Promise}
     */
    getTopProducts: (limit = 10) => {
        return axiosInstance.get('/analytics/top-products', { params: { limit } });
    }
};

// Export all APIs
const adminAPI = {
    orders: ordersAPI,
    products: productsAPI,
    users: usersAPI,
    analytics: analyticsAPI
};

export default adminAPI;
