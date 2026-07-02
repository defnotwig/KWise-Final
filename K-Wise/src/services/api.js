import axios from 'axios';
import { getApiBaseUrl } from '../utils/networkConfig';
import { withCsrfHeader, clearLegacyAuthStorage, stripLegacyAuthHeader } from '../utils/authSecurity';
import { installAxiosGetCache } from '../utils/httpClientCache';

// Dynamic API configuration that adapts to network environment
const API_BASE_URL = getApiBaseUrl();
const VERBOSE_API_LOGS = process.env.VITE_KWISE_VERBOSE_LOGS === 'true'
    || process.env.REACT_APP_KWISE_VERBOSE_LOGS === 'true';
const baseConsole = globalThis.console || { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
const console = {
    ...baseConsole,
    log: (...args) => {
        if (VERBOSE_API_LOGS) {
            baseConsole.log(...args);
        }
    },
    debug: (...args) => {
        if (VERBOSE_API_LOGS) {
            baseConsole.debug(...args);
        }
    }
};

const createClientRequestKey = (prefix = 'kwise') => {
    if (globalThis.crypto?.randomUUID) {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

console.log('🔧 API Service initialized with base URL:', API_BASE_URL);

// Create axios instance with base configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000, // ✅ FIX: Set to 30s for standard operations (60s was excessive except for AI)
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request deduplication — prevents identical concurrent requests from flooding the backend
api.interceptors.request.use((config) => {
    config.withCredentials = true;
    config.headers = withCsrfHeader(stripLegacyAuthHeader(config.headers || {}), config.method);
    return config;
});

installAxiosGetCache(api, {
    ttlMs: process.env.VITE_KWISE_CLIENT_CACHE_MS || 15000,
    maxEntries: 300,
    cacheablePath: (pathname) => (
        pathname.startsWith('/api/kiosk/')
        || pathname.startsWith('/kiosk/')
        || pathname.startsWith('/api/stock')
        || pathname.startsWith('/stock')
        || pathname === '/api/health'
        || pathname === '/health'
    )
});

// Prevent multiple concurrent 401 responses from triggering duplicate redirects
let isRedirecting = false;

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config?.url || '';
        const isAuthProbe = requestUrl.includes('/auth/me');
        const isAdminPath = globalThis.location?.pathname?.startsWith('/admin');

        if (error.response?.status === 401 && isAdminPath && !isAuthProbe && !isRedirecting) {
            isRedirecting = true;
            clearLegacyAuthStorage();
            localStorage.removeItem('currentUser');
            globalThis.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Authentication API
export const authAPI = {
    login: (credentials) => {
        console.log('Calling /api/auth/login with:', credentials);
        return api.post('/auth/login', credentials);
    },
    logout: () => {
        console.log('Calling /api/auth/logout');
        return api.post('/auth/logout');
    },
    me: () => {
        console.log('Calling /api/auth/me');
        return api.get('/auth/me');
    },
    changePassword: (data) => {
        console.log('Calling /api/auth/change-password');
        return api.post('/auth/change-password', data);
    },
    forgotPassword: (email) => {
        console.log('Calling /api/auth/forgot-password with:', email);
        return api.post('/auth/forgot-password', { email });
    },
    resetPassword: (data) => {
        console.log('Calling /api/auth/reset-password');
        return api.post('/auth/reset-password', data);
    },
    verifyTwoFactor: (data) => {
        console.log('Calling /api/auth/verify-2fa');
        return api.post('/auth/verify-2fa', data);
    },
    register: (userData) => {
        console.log('Calling /api/auth/register');
        return api.post('/auth/register', userData);
    },
    verifyEmail: (token) => {
        console.log('Calling /api/auth/verify-email');
        return api.post('/auth/verify-email', { token });
    },

    // Enhanced Password Reset Flow (New Backend Endpoints)
    requestReset: (email) => {
        console.log('Calling /api/auth/request-reset with:', email);
        return api.post('/auth/request-reset', { email });
    },
    verifyResetCode: (email, code) => {
        console.log('Calling /api/auth/verify-reset-code');
        return api.post('/auth/verify-reset-code', { email, code });
    },
    resetPasswordEnhanced: (resetSessionId, newPassword) => {
        console.log('Calling /api/auth/reset-password-enhanced');
        return api.post('/auth/reset-password-enhanced', { resetSessionId, newPassword });
    },

    // Add missing directLogin function
    directLogin: (credentials) => {
        console.log('Calling /api/auth/login (direct) with:', credentials);
        return api.post('/auth/login', credentials);
    }
};

// Users API
export const usersAPI = {
    getAll: (params = {}) => {
        console.log('Calling /api/users with params:', params);
        return api.get('/users', { params });
    },
    getAvailableRoles: () => {
        console.log('Calling /api/users/roles/available');
        return api.get('/users/roles/available');
    },
    getById: (id) => {
        console.log('Calling /api/users/:id with id:', id);
        return api.get(`/users/${id}`);
    },
    create: (userData) => {
        console.log('Calling /api/users (POST) with:', userData);
        return api.post('/users', userData);
    },
    update: (id, userData) => {
        console.log('Calling /api/users/:id (PUT) with id:', id, 'data:', userData);
        return api.put(`/users/${id}`, userData);
    },
    delete: (id) => {
        console.log('Calling /api/users/:id (DELETE) with id:', id);
        return api.delete(`/users/${id}`);
    },
    updateRole: (id, role) => {
        console.log('Calling /api/users/:id/role (PATCH) with id:', id, 'role:', role);
        return api.patch(`/users/${id}/role`, { role });
    },
    getProfile: () => {
        console.log('Calling /api/users/profile');
        return api.get('/users/profile');
    },
    updateProfile: (data) => {
        console.log('Calling /api/users/profile (PUT) with:', data);
        return api.put('/users/profile', data);
    },
    search: (params) => {
        console.log('Calling /api/users/search with params:', params);
        return api.get('/users', { params });
    },
    // Unified stats overview (consolidated real-time + distribution)
    getStatsOverview: () => {
        console.log('Calling /api/users/stats/overview');
        return api.get('/users/stats/overview');
    },
    
    // Missing function for search service
    getAllUsers: (params = {}) => {
        console.log('Calling /api/users (getAllUsers) with params:', params);
        return api.get('/users', { params });
    }
};

// Stock API
export const stockAPI = {
    // Alias for getAll - used by AI suggestions
    get: (urlOrParams = {}) => {
        // If first param is a string, it's a URL path
        if (typeof urlOrParams === 'string') {
            console.log('Calling custom path:', urlOrParams);
            return api.get(urlOrParams);
        }
        // Otherwise it's params for /stock
        console.log('Calling /api/stock (stockAPI.get) with params:', urlOrParams);
        return api.get('/stock', { params: urlOrParams });
    },
    getAll: (params = {}) => {
        console.log('Calling /api/stock with params:', params);
        return api.get('/stock', { params });
    },
    // Get items by category or params - used by AI suggestions  
    getItems: (categoryOrParams) => {
        // If it's a string, treat as category
        if (typeof categoryOrParams === 'string') {
            console.log('Calling /api/stock (stockAPI.getItems) with category:', categoryOrParams);
            return api.get('/stock', { params: { category: categoryOrParams } });
        }
        // Otherwise treat as params object
        console.log('Calling /api/stock (stockAPI.getItems) with params:', categoryOrParams);
        return api.get('/stock', { params: categoryOrParams });
    },
    getCatalogBootstrap: (params = {}) => {
        console.log('Calling /api/kiosk/catalog/bootstrap with params:', params);
        return api.get('/kiosk/catalog/bootstrap', { params });
    },
    getById: (id) => {
        console.log('Calling /api/stock/:id with id:', id);
        return api.get(`/stock/${id}`);
    },
    create: (stockData) => {
        console.log('Calling /api/stock (POST) with:', stockData);
        return api.post('/stock', stockData);
    },
    update: (id, stockData) => {
        console.log('Calling /api/stock/:id (PUT) with id:', id, 'data:', stockData);
        return api.put(`/stock/${id}`, stockData);
    },
    delete: (id) => {
        console.log('Calling /api/stock/:id (DELETE) with id:', id);
        return api.delete(`/stock/${id}`);
    },
    getCategories: () => {
        console.log('Calling /api/stock/categories');
        return api.get('/stock/categories');
    },
    getByCategory: (category) => {
        const url = `/stock?category=${category}`;
        console.log('🔗 stockAPI.getByCategory: Calling URL:', url, 'for category:', category);
        return api.get(url);
    },
    getItemsByCategory: (category) => {
        console.log('Calling /api/stock with category filter:', category);
        return api.get(`/stock?category=${category}`);
    },
    addItem: (category, itemData) => {
        console.log('Calling /api/stock (POST) with category:', category, 'data:', itemData);
        // Add category to the item data
        const dataWithCategory = { ...itemData, category };
        return api.post('/stock', dataWithCategory);
    },
    addItemWithImage: (formData) => {
        console.log('Calling /api/stock (POST) with FormData for image upload');
        return api.post('/stock', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    updateItem: (id, itemData) => {
        console.log('Calling /api/stock/:id (PATCH) with id:', id, 'data:', itemData);
        return api.patch(`/stock/${id}`, itemData);
    },
    updateItemWithImage: (id, formData) => {
        console.log('Calling /api/stock/:id (PATCH) with FormData for image upload');
        return api.patch(`/stock/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    deleteItem: (category, id) => {
        console.log('Calling /api/stock/:id (DELETE) with id:', id);
        return api.delete(`/stock/${id}`);
    },
    updateQuantity: (id, quantity) => {
        console.log('Calling /api/stock/:id/quantity (PATCH) with id:', id, 'quantity:', quantity);
        return api.patch(`/stock/${id}/quantity`, { quantity });
    },
    search: (query) => {
        console.log('Calling /api/stock/search with query:', query);
        return api.get('/stock/search', { params: { q: query } });
    },
    getLowStock: () => {
        console.log('Calling /api/stock/low-stock');
        return api.get('/stock/low-stock');
    },
    getStockHistory: (id) => {
        console.log('Calling /api/stock/:id/history with id:', id);
        return api.get(`/stock/${id}/history`);
    },
    
    // Missing function for search service
    getAllStockItems: (params = {}) => {
        console.log('Calling /api/stock/all-items (getAllStockItems) with params:', params);
        return api.get('/stock/all-items', { params });
    },
    // Dynamic filtering helpers
    getPriceRange: (category) => {
        console.log('Calling /api/stock/price-range with category:', category);
        return api.get('/stock/price-range', { params: { category } });
    },
    getPartMeta: (category) => {
        console.log('Calling /api/stock/meta/:category with category:', category);
        return api.get(`/stock/meta/${encodeURIComponent(category)}`);
    },
    getSpecValues: (category, field) => {
        console.log('Calling /api/stock/spec-values/:category with category & field:', category, field);
        return api.get(`/stock/spec-values/${encodeURIComponent(category)}`, { params: { field } });
    },
    getSpecRange: (category, field) => {
        console.log('Calling /api/stock/spec-range/:category with category & field:', category, field);
        return api.get(`/stock/spec-range/${encodeURIComponent(category)}`, { params: { field } });
    },
    getBrandsForCategory: (category) => {
        console.log('Calling /api/stock/brands with category filter:', category);
        return api.get('/stock/brands', { params: { category } });
    },
    getBrandsWithCounts: (category) => {
        console.log('Calling /api/stock/brands/counts with category filter:', category);
        return api.get('/stock/brands/counts', { params: { category } });
    },
    getSpecificationRange: (category) => {
        console.log('Calling /api/stock/spec-range/:category with category:', category);
        return api.get(`/stock/spec-range/${encodeURIComponent(category)}`);
    },
    
    // AI-Powered Compatibility Analysis
    analyzeCompatibility: (currentProduct) => {
        console.log('Calling /api/compatibility/analyze with current product:', currentProduct.name);
        return api.post('/compatibility/analyze', { currentProduct });
    },
    getCompatibilityStatus: () => {
        console.log('Calling /api/compatibility/status');
        return api.get('/compatibility/status');
    },
    
    // PHASE 1 ENHANCEMENT: Enhanced Compatibility API (5.0/5.0 Rating)
    getEnhancedCompatibleProducts: (productId, category, specifications) => {
        console.log('🚀 [Enhanced] Calling /api/compatibility/enhanced/product-page for:', productId);
        return api.post('/compatibility/enhanced/product-page', { 
            productId, 
            category, 
            specifications 
        });
    },
    getFutureUpgradeExternal: (currentComponent, targetCategory, budget) => {
        console.log('🔮 [Enhanced] Calling /api/compatibility/enhanced/future-upgrade-external');
        return api.post('/compatibility/enhanced/future-upgrade-external', {
            currentComponent,
            targetCategory,
            budget
        });
    },
    getFutureUpgradeInStock: (currentBuild, budget, priority) => {
        console.log('📈 [Enhanced] Calling /api/compatibility/enhanced/future-upgrade-instock');
        return api.post('/compatibility/enhanced/future-upgrade-instock', {
            currentBuild,
            budget,
            priority
        });
    },
    
    // Sale Management Functions (NEW)
    makeOnSale: (id, saleData) => {
        console.log('Calling /api/stock/:id/sale (PUT) with id:', id, 'data:', saleData);
        return api.put(`/stock/${id}/sale`, saleData);
    },
    removeFromSale: (id) => {
        console.log('Calling /api/stock/:id/sale (DELETE) with id:', id);
        return api.delete(`/stock/${id}/sale`);
    }
};

// Orders API
export const ordersAPI = {
    getAll: (params = {}) => {
        console.log('Calling /api/orders with params:', params);
        return api.get('/orders', { params });
    },
    getById: (id) => {
        console.log('Calling /api/orders/:id with id:', id);
        return api.get(`/orders/${id}`);
    },
    create: (orderData) => {
        console.log('Calling /api/orders (POST) with:', orderData);
        return api.post('/orders', orderData);
    },
    update: (id, orderData) => {
        console.log('Calling /api/orders/:id (PUT) with id:', id, 'data:', orderData);
        return api.put(`/orders/${id}`, orderData);
    },
    delete: (id) => {
        console.log('Calling /api/orders/:id (DELETE) with id:', id);
        return api.delete(`/orders/${id}`);
    },
    updateStatus: (id, status) => {
        console.log('Calling /api/orders/:id/status (PATCH) with id:', id, 'status:', status);
        return api.patch(`/orders/${id}/status`, { status });
    },
    getQueue: () => {
        console.log('Calling /api/queue/status');
        return api.get('/queue/status');
    },
    getPending: () => {
        console.log('Calling /api/orders/pending');
        return api.get('/orders/pending');
    },
    getCompleted: () => {
        console.log('Calling /api/orders/completed');
        return api.get('/orders/completed');
    },
    getByDateRange: (startDate, endDate) => {
        console.log('Calling /api/orders/date-range with startDate:', startDate, 'endDate:', endDate);
        return api.get('/orders/date-range', {
            params: { startDate, endDate }
        });
    },
    getOrderStats: () => {
        console.log('Calling /api/orders/stats');
        return api.get('/orders/stats');
    },
    processOrder: (id) => {
        console.log('Calling /api/orders/:id/process with id:', id);
        return api.post(`/orders/${id}/process`);
    },
    completeOrder: (id) => {
        console.log('Calling /api/orders/:id/complete with id:', id);
        return api.post(`/orders/${id}/complete`);
    },
    cancelOrder: (id, reason) => {
        console.log('Calling /api/orders/:id/cancel with id:', id, 'reason:', reason);
        return api.post(`/orders/${id}/cancel`, { reason });
    },

    // Missing functions that are being called
    getCurrentQueue: () => {
        console.log('Calling /api/queue/active');
        return api.get('/queue/active');
    },
    getTransactionHistory: async (params = {}) => {
        console.log('Calling /api/orders/history/transactions with params:', params);
        try {
            // Use a longer timeout for transaction history (45 seconds)
            const res = await api.get('/orders/history/transactions', { 
                params,
                timeout: 45000 // 45 seconds for heavy queries
            });
            const body = res.data || {};
            // Backend canonical shape: { success:true, data:{ transactions:[], pagination:{...} } }
            // Fallback legacy shapes handled gracefully
            const container = body.data || body;
            let transactions = [];
            if (Array.isArray(container.transactions)) {
                transactions = container.transactions;
            } else if (Array.isArray(container.data)) {
                transactions = container.data;
            }
            const paginationRaw = container.pagination || {};
            const pagination = {
                currentPage: paginationRaw.currentPage || paginationRaw.page || 1,
                totalPages: paginationRaw.totalPages || paginationRaw.pages || 1,
                totalItems: paginationRaw.totalItems || paginationRaw.total || transactions.length,
                itemsPerPage: paginationRaw.itemsPerPage || paginationRaw.limit || (transactions.length || 20)
            };
            return { success: true, data: { transactions, pagination } };
        } catch (err) {
            // Improved error logging - don't spam console with timeouts
            if (err.code === 'ECONNABORTED' && err.message.includes('timeout')) {
                console.warn('Transaction history request timed out - using default pagination');
            } else {
                console.error('getTransactionHistory error:', err.message);
            }
            return { success: false, data: { transactions: [], pagination: { currentPage:1, totalPages:1, totalItems:0, itemsPerPage:20 } }, error: err.message };
        }
    },
    getAssistants: async () => {
        console.log('Calling /api/orders/assistants');
        try {
            const res = await api.get('/orders/assistants');
            const rows = res.data?.data || [];
            return rows.map(r => ({ id: r.id, username: r.username, name: r.name || r.username }));
        } catch (e) {
            console.error('getAssistants error:', e.message);
            return [];
        }
    },
    exportOrdersCSV: (params = {}) => {
        console.log('Calling /api/orders/export/csv with params:', params);
        return api.get('/orders/export/csv', { params, responseType: 'blob' });
    },
    exportOrdersPDF: () => {
        console.log('Calling /api/orders/export/pdf');
        return api.get('/orders/export/pdf');
    },
    search: (params) => {
        console.log('Calling /api/orders/search with params:', params);
        return api.get('/orders', { params });
    }
};

// Queue Management API
export const queueAPI = {
    getStatus: () => {
        console.log('Calling /api/queue/status');
        return api.get('/queue/status');
    },
    getActive: () => {
        console.log('Calling /api/queue/active');
        return api.get('/queue/active');
    },
    assignToOrder: (orderId) => {
        console.log('Calling /api/queue/assign/:orderId with orderId:', orderId);
        return api.post(`/queue/assign/${orderId}`);
    },
    updateStatus: (queueNumber, status, customerName) => {
        console.log('Calling /api/queue/:queueNumber/status with queueNumber:', queueNumber, 'status:', status);
        return api.put(`/queue/${queueNumber}/status`, { status, customerName });
    },
    updateCustomer: (queueNumber, customerName) => {
        console.log('Calling /api/queue/:queueNumber/customer with queueNumber:', queueNumber, 'customerName:', customerName);
        return api.patch(`/queue/${queueNumber}/customer`, { customerName });
    },
    completeOrder: (orderId, customerName) => {
        console.log('Calling /api/queue/complete/:orderId with orderId:', orderId);
        return api.post(`/queue/complete/${orderId}`, { customerName });
    },
    cleanup: () => {
        console.log('Calling /api/queue/cleanup');
        return api.post('/queue/cleanup');
    },
    getNextAvailable: () => {
        console.log('Calling /api/queue/next-available');
        return api.get('/queue/next-available');
    },
    setNowServing: (queueNumber, station = null) => {
        console.log('Calling PUT /api/queue/:queueNumber/now-serving with queueNumber:', queueNumber, 'station:', station);
        return api.put(`/queue/${queueNumber}/now-serving`, { station });
    },
    setNowServingLeft: (queueNumber) => {
        console.log('Calling PUT /api/queue/:queueNumber/now-serving-left with queueNumber:', queueNumber);
        return api.put(`/queue/${queueNumber}/now-serving-left`);
    },
    setNowServingRight: (queueNumber) => {
        console.log('Calling PUT /api/queue/:queueNumber/now-serving-right with queueNumber:', queueNumber);
        return api.put(`/queue/${queueNumber}/now-serving-right`);
    },
    clearNowServing: (station) => {
        console.log('Calling POST /api/queue/clear-now-serving with station:', station);
        return api.post('/queue/clear-now-serving', { station });
    },
    resetQueueCycle: () => {
        console.log('Calling POST /api/queue/reset-cycle');
        return api.post('/queue/reset-cycle');
    },
    getNowServing: () => {
        console.log('Calling GET /api/queue/now-serving');
        return api.get('/queue/now-serving');
    },
    getUnifiedQueueView: (params = {}) => {
        console.log('Calling GET /api/queue/unified with params:', params);
        return api.get('/queue/unified', { params });
    },
    exportMonitor: () => {
        console.log('Calling GET /api/queue/export-monitor');
        return api.get('/queue/export-monitor', { 
            responseType: 'blob',
            timeout: 60000 
        });
    }
};

// Settings API
export const settingsAPI = {
    getAll: () => {
        console.log('Calling /api/settings');
        return api.get('/settings');
    },
    getByKey: (key) => {
        console.log('Calling /api/settings/:key with key:', key);
        return api.get(`/settings/${key}`);
    },
    update: (key, value) => {
        console.log('Calling /api/settings/:key (PUT) with key:', key, 'value:', value);
        return api.put(`/settings/${key}`, { value });
    },
    updateMultiple: (settings) => {
        console.log('Calling /api/settings/multiple (PUT) with:', settings);
        return api.put('/settings/multiple', settings);
    },
    resetToDefault: (key) => {
        console.log('Calling /api/settings/:key/reset (POST) with key:', key);
        return api.post(`/settings/${key}/reset`);
    },
    getSystemInfo: () => {
        console.log('Calling /api/settings/system-info');
        return api.get('/settings/system-info');
    },
    getBackupStatus: () => {
        console.log('Calling /api/settings/backup-status');
        return api.get('/settings/backup-status');
    },
    createBackup: () => {
        console.log('Calling /api/settings/backup (POST)');
        return api.post('/settings/backup');
    },
    restoreBackup: (backupId) => {
        console.log('Calling /api/settings/restore/:backupId (POST) with backupId:', backupId);
        return api.post(`/settings/restore/${backupId}`);
    },

    // Missing function that is being called
    getAppSettings: () => {
        console.log('Calling /api/settings/app');
        return api.get('/settings/app');
    },

    // Phase 4: Add missing updateAppSettings function
    updateAppSettings: (settings) => {
        console.log('Calling /api/settings/app (PUT) with:', settings);
        return api.put('/settings/app', settings);
    },

    // Phase 4: Additional settings API functions
    getSystemStats: () => {
        console.log('Calling /api/settings/system-stats');
        return api.get('/settings/system-stats');
    },

    testEmail: (emailConfig) => {
        console.log('Calling /api/settings/test-email (POST) with:', emailConfig);
        return api.post('/settings/test-email', emailConfig);
    },

    triggerBackup: () => {
        console.log('Calling /api/settings/backup (POST)');
        return api.post('/settings/backup');
    },

    updateAdvancedSettings: (settings) => {
        console.log('Calling /api/settings/advanced (PUT) with:', settings);
        return api.put('/settings/advanced', settings);
    },

    getHealthCheck: () => {
        console.log('Calling /api/settings/health');
        return api.get('/settings/health');
    }
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => {
        console.log('Calling /api/dashboard/stats');
        return api.get('/dashboard/stats');
    },
    getRecentOrders: (limit = 10) => {
        console.log('Calling /api/dashboard/recent-orders with limit:', limit);
        return api.get('/dashboard/recent-orders', { params: { limit } });
    },
    getTopProducts: (limit = 5) => {
        console.log('Calling /api/dashboard/top-products with limit:', limit);
        return api.get('/dashboard/top-products', { params: { limit } });
    },
    getSalesChart: (period = 'week') => {
        console.log('Calling /api/dashboard/sales-chart with period:', period);
        return api.get('/dashboard/sales-chart', { params: { period } });
    },
    getRevenueStats: (period = 'month') => {
        console.log('Calling /api/dashboard/revenue with period:', period);
        return api.get('/dashboard/revenue', { params: { period } });
    },
    getSystemHealth: () => {
        console.log('Calling /api/dashboard/system-health');
        return api.get('/dashboard/system-health');
    },
    getNotifications: () => {
        console.log('Calling /api/dashboard/notifications');
        return api.get('/dashboard/notifications');
    },
    markNotificationRead: (id) => {
        console.log('Calling /api/dashboard/notifications/:id/read with id:', id);
        return api.patch(`/dashboard/notifications/${id}/read`);
    }
};

// Logs API
export const logsAPI = {
    getAll: (params = {}) => {
        console.log('Calling /api/logs with params:', params);
        return api.get('/logs', { params });
    },
    getMeta: () => {
        console.log('Calling /api/logs/meta');
        return api.get('/logs/meta');
    },
    getByUser: (userId) => {
        console.log('Calling /api/logs/user/:userId with userId:', userId);
        return api.get(`/logs/user/${userId}`);
    },
    getByAction: (action) => {
        console.log('Calling /api/logs/action/:action with action:', action);
        return api.get(`/logs/action/${action}`);
    },
    getByDateRange: (startDate, endDate) => {
        console.log('Calling /api/logs/date-range with startDate:', startDate, 'endDate:', endDate);
        return api.get('/logs/date-range', { params: { startDate, endDate } });
    },
    getSystemLogs: () => {
        console.log('Calling /api/logs/system');
        return api.get('/logs/system');
    },
    getErrorLogs: () => {
        console.log('Calling /api/logs/errors');
        return api.get('/logs/errors');
    },
    exportLogs: (format = 'csv', filters = {}) => {
        const params = { format, ...filters };
        console.log('Calling /api/logs/export with params:', params);
        return api.get('/logs/export', { params, responseType: 'blob' });
    },
    clearOldLogs: (days = 30) => {
        console.log('Calling /api/logs/clear (DELETE) with days:', days);
        return api.delete('/logs/clear', { params: { days } });
    }
};

// Developer Tools API
export const devToolsAPI = {
    testEndpoint: (endpoint, method = 'GET', data = null) => {
        console.log('Calling /api/dev/test-endpoint with endpoint:', endpoint, 'method:', method, 'data:', data);
        return api.post('/dev/test-endpoint', { endpoint, method, data });
    },
    getSystemStatus: () => {
        console.log('Calling /api/dev/system-status');
        return api.get('/dev/system-status');
    },
    getDatabaseStats: () => {
        console.log('Calling /api/dev/database/stats');
        return api.get('/dev/database/stats');
    },
    getRecentLogs: (limit = 50) => {
        console.log('Calling /api/dev/recent-logs with limit:', limit);
        return api.get('/dev/recent-logs', { params: { limit } });
    },
    clearCache: () => {
        console.log('Calling /api/dev/clear-cache (POST)');
        return api.post('/dev/clear-cache');
    },
    optimizeDatabase: () => {
        console.log('Calling /api/dev/optimize-database (POST)');
        return api.post('/dev/optimize-database');
    },
    getApiDocs: () => {
        console.log('Calling /api/dev/api-docs');
        return api.get('/dev/api-docs');
    },
    testDatabaseConnection: () => {
        console.log('Calling /api/dev/test-db-connection');
        return api.get('/dev/test-db-connection');
    }
};

// Real-time updates using Server-Sent Events
export const realtimeAPI = {
    subscribeToOrders: () => new EventSource(`${API_BASE_URL}/realtime/orders`),
    subscribeToStock: () => new EventSource(`${API_BASE_URL}/realtime/stock`),
    subscribeToLogs: () => new EventSource(`${API_BASE_URL}/realtime/logs`),
    subscribeToNotifications: () => new EventSource(`${API_BASE_URL}/realtime/notifications`),
    subscribeToUsers: () => new EventSource(`${API_BASE_URL}/realtime/users`)
};

// Health check
export const healthAPI = {
    check: () => {
        console.log('Calling /api/health');
        return api.get('/health');
    },
    ping: () => {
        console.log('Calling /api/ping');
        return api.get('/ping');
    }
};

// Error handling utility
export const handleAPIError = (error) => {
    if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        switch (status) {
            case 400:
                return { error: 'Bad Request', message: data.message || 'Invalid data provided' };
            case 401:
                return { error: 'Unauthorized', message: 'Please log in again' };
            case 403:
                return { error: 'Forbidden', message: 'You don\'t have permission to perform this action' };
            case 404:
                return { error: 'Not Found', message: 'The requested resource was not found' };
            case 422:
                return { error: 'Validation Error', message: data.message || 'Data validation failed' };
            case 500:
                return { error: 'Server Error', message: 'Internal server error occurred' };
            default:
                return { error: 'Error', message: data.message || 'An error occurred' };
        }
    } else if (error.request) {
        // Network error
        return { error: 'Network Error', message: 'Unable to connect to server' };
    } else {
        // Other error
        return { error: 'Error', message: error.message || 'An unexpected error occurred' };
    }
};

// Utility functions
export const apiUtils = {
    // Debounce function for search
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Format date for API
    formatDate: (date) => {
        return new Date(date).toISOString();
    },

    // Parse API response
    parseResponse: (response) => {
        return response.data;
    },

    // Create query string from object
    createQueryString: (params) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                searchParams.append(key, params[key]);
            }
        });
        return searchParams.toString();
    }
};

// General utility functions
export const testConnection = async () => {
    try {
        // Temporarily increase logging to confirm connectivity is working
        if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Testing API connection to:', API_BASE_URL);
        }

        const response = await api.get('/health');
        if (process.env.NODE_ENV === 'development') {
            console.log('✅ Health check response:', response.data);
        }
        return true;
    } catch (error) {
        const isCanceled = error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.message === 'canceled';
        if (isCanceled) {
            return false;
        }

        // Log errors to see what's happening
        if (process.env.NODE_ENV === 'development') {
            console.error('❌ Connection test failed:', error.message);
        }

        // Try a direct fetch as fallback with cache busting
        try {
            const directResponse = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (directResponse.ok) {
                if (process.env.NODE_ENV === 'development') {
                    console.log('✅ Direct fetch succeeded - API is available');
                }
                return true;
            }
        } catch (fetchError) {
            // Log fetch errors
            if (process.env.NODE_ENV === 'development') {
                console.error('❌ Direct fetch also failed:', fetchError.message);
            }
        }

        return false;
    }
};

// Kiosk API (NEW)
export const kioskAPI = {
    getOnSaleProducts: () => {
        console.log('Calling /api/kiosk/on-sale');
        return api.get('/kiosk/on-sale');
    },
    getFeaturedProducts: () => {
        console.log('Calling /api/kiosk/featured');
        return api.get('/kiosk/featured');
    },
    getCategoryProducts: (category, params = {}) => {
        console.log('Calling /api/kiosk/category with category:', category, 'params:', params);
        return api.get('/kiosk/category', { params: { category, ...params } });
    },
    // Kiosk order creation with queue management integration
    createOrder: (orderData) => {
        const idempotencyKey = orderData.idempotencyKey
            || orderData.clientRequestId
            || createClientRequestKey('kiosk-order');
        console.log('📤 Calling /api/kiosk/orders (POST) with queue management:');
        console.log('Order data summary:', {
            itemCount: orderData.items?.length || 0,
            selectedPartCount: orderData.selectedParts?.length || 0,
            idempotencyKey
        });
        console.log('📦 Order data keys:', Object.keys(orderData));
        console.log('📦 Items count:', orderData.items?.length);
        console.log('📦 Total amount:', orderData.totalAmount);
        console.log('📦 Service type:', orderData.serviceType);
        
        // Use the api instance which has proper config
        return api.post('/kiosk/orders', orderData, {
            timeout: 5000,
            headers: {
                'X-KWise-Idempotency-Key': idempotencyKey
            }
        });
    }
};

// Add directLogin to the default api object for backward compatibility
api.directLogin = (credentials) => api.post('/auth/login', credentials);

export const sseAPI = {
    // Connect to real-time queue updates with auto-reconnect
    connectToQueueUpdates: (onMessage, onError, onOpen) => {
        console.log('Connecting to /api/realtime/queue SSE stream');
        
        let eventSource = null;
        let reconnectTimeout = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 10;
        const reconnectDelay = 3000; // 3 seconds
        
        const connect = () => {
            try {
                eventSource = new EventSource(`${API_BASE_URL}/realtime/queue`, {
                    withCredentials: false
                });
                
                eventSource.onopen = (event) => {
                    console.log('✅ Queue SSE connection opened successfully');
                    reconnectAttempts = 0; // Reset on successful connection
                    if (onOpen) onOpen(event);
                };
                
                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('📨 Queue SSE message received:', data);
                        if (onMessage) onMessage(data);
                    } catch (error) {
                        console.error('Error parsing queue SSE message:', error);
                    }
                };
                
                eventSource.addEventListener('ping', (event) => {
                    console.log('🏓 Queue SSE heartbeat received');
                });
                
                eventSource.addEventListener('queue-update', (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('🔄 Queue update event:', data);
                        if (onMessage) onMessage(data);
                    } catch (error) {
                        console.error('Error parsing queue update:', error);
                    }
                });
                
                eventSource.onerror = (error) => {
                    console.error('❌ Queue SSE connection error:', error);
                    eventSource.close();
                    
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        console.log(`🔄 Reconnecting to Queue SSE (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
                        reconnectTimeout = setTimeout(connect, reconnectDelay);
                    } else {
                        console.error('❌ Max reconnection attempts reached for Queue SSE');
                    }
                    
                    if (onError) onError(error);
                };
            } catch (error) {
                console.error('Failed to create Queue SSE connection:', error);
                if (onError) onError(error);
            }
        };
        
        connect();
        
        // Return object with close method
        return {
            close: () => {
                if (reconnectTimeout) clearTimeout(reconnectTimeout);
                if (eventSource) eventSource.close();
            },
            getReadyState: () => eventSource?.readyState || EventSource.CLOSED
        };
    },

    // Connect to real-time order updates
    connectToOrderUpdates: (onMessage, onError, onOpen) => {
        console.log('Connecting to /api/realtime/orders SSE stream');
        const eventSource = new EventSource(`${API_BASE_URL}/realtime/orders`);
        
        eventSource.onopen = (event) => {
            console.log('Orders SSE connection opened');
            if (onOpen) onOpen(event);
        };
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Orders SSE message received:', data);
                if (onMessage) onMessage(data);
            } catch (error) {
                console.error('Error parsing orders SSE message:', error);
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('Orders SSE connection error:', error);
            if (onError) onError(error);
        };
        
        return eventSource;
    }
};

export default api;
