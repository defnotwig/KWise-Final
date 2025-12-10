import { stockAPI, ordersAPI, usersAPI } from '../services/api';

// Enhanced search functionality with parallel API calls and caching
class SearchService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Clear expired cache entries
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    // Calculate relevance score for search results
    calculateRelevance(text, query) {
        if (!text || !query) return 0;
        
        const textLower = text.toLowerCase();
        const queryLower = query.toLowerCase();
        
        // Exact match gets highest score
        if (textLower === queryLower) return 100;
        
        // Starts with gets high score
        if (textLower.startsWith(queryLower)) return 80;
        
        // Contains gets medium score
        if (textLower.includes(queryLower)) return 60;
        
        // Word boundary matches
        const words = textLower.split(/\s+/);
        const queryWords = queryLower.split(/\s+/);
        
        let wordMatches = 0;
        queryWords.forEach(queryWord => {
            words.forEach(word => {
                if (word.includes(queryWord) || queryWord.includes(word)) {
                    wordMatches++;
                }
            });
        });
        
        // Fuzzy matching bonus
        const fuzzyScore = Math.min(wordMatches * 15, 40);
        
        return fuzzyScore;
    }

    // Search in products/stock
    async searchProducts(query) {
        try {
            const response = await stockAPI.getAllStockItems();
            if (response.data?.success && response.data?.data) {
                return response.data.data.map(item => ({
                    id: `product_${item.id}`,
                    type: 'product',
                    title: item.name,
                    subtitle: `${item.brand} - ${item.category}`,
                    description: `Stock: ${item.stock} | Price: ₱${item.price}`,
                    path: `/admin/stock/${item.category}`,
                    icon: 'package',
                    price: item.price,
                    stock: item.stock,
                    category: item.category,
                    relevance: this.calculateRelevance(`${item.name} ${item.brand} ${item.category}`, query),
                    metadata: {
                        totalValue: item.price * item.stock,
                        inStock: item.stock > 0,
                        lowStock: item.stock <= 10
                    }
                }));
            }
            return [];
        } catch (error) {
            console.error('Product search failed:', error);
            return [];
        }
    }

    // Search in orders
    async searchOrders(query) {
        try {
            // Use the correct orders endpoint that exists
            const response = await ordersAPI.getTransactionHistory({ limit: 100 });
            if (response.data?.success && response.data?.data) {
                return response.data.data.map(order => ({
                    id: `order_${order.id}`,
                    type: 'order',
                    title: `Order #${order.id}`,
                    subtitle: `${order.customer_name}`,
                    description: `Status: ${order.status} | Total: ₱${order.total}`,
                    path: `/admin/history`,
                    icon: 'shopping-cart',
                    price: order.total,
                    status: order.status,
                    relevance: this.calculateRelevance(`${order.customer_name} ${order.status} ${order.id}`, query),
                    metadata: {
                        customerId: order.customer_id,
                        orderDate: order.created_at,
                        isPending: order.status === 'pending',
                        isCompleted: order.status === 'completed'
                    }
                }));
            }
            return [];
        } catch (error) {
            console.error('Order search failed:', error);
            return [];
        }
    }

    // Search in users
    async searchUsers(query) {
        try {
            const response = await usersAPI.getAllUsers();
            if (response.data?.success && response.data?.data) {
                return response.data.data.map(user => ({
                    id: `user_${user.id}`,
                    type: 'user',
                    title: user.name,
                    subtitle: user.email,
                    description: `Role: ${user.role}`,
                    path: `/admin/accounts`,
                    icon: 'user',
                    role: user.role,
                    relevance: this.calculateRelevance(`${user.name} ${user.email} ${user.role}`, query),
                    metadata: {
                        lastLogin: user.last_login,
                        isActive: user.is_active,
                        isAdmin: ['admin', 'superadmin'].includes(user.role)
                    }
                }));
            }
            return [];
        } catch (error) {
            console.error('User search failed:', error);
            return [];
        }
    }

    // Search admin pages and features
    searchAdminPages(query) {
        const adminPages = [
            {
                id: 'page_dashboard',
                type: 'page',
                title: 'Dashboard',
                subtitle: 'Admin overview and analytics',
                description: 'View system statistics, charts, and real-time data',
                path: '/admin/dashboard',
                icon: 'dashboard',
                keywords: ['dashboard', 'overview', 'stats', 'analytics', 'home', 'main']
            },
            {
                id: 'page_accounts',
                type: 'page',
                title: 'User Accounts',
                subtitle: 'Manage user accounts and permissions',
                description: 'View, edit, and manage all user accounts',
                path: '/admin/accounts',
                icon: 'users',
                keywords: ['accounts', 'users', 'manage', 'permissions', 'profiles']
            },
            {
                id: 'page_stock',
                type: 'page',
                title: 'Stock Management',
                subtitle: 'Inventory and product management',
                description: 'Manage inventory, products, and stock levels',
                path: '/admin/stock',
                icon: 'box',
                keywords: ['stock', 'inventory', 'products', 'items', 'warehouse']
            },
            {
                id: 'page_orders',
                type: 'page',
                title: 'Order Queue',
                subtitle: 'Active orders and processing',
                description: 'View and manage current order queue',
                path: '/admin/orders',
                icon: 'list',
                keywords: ['orders', 'queue', 'processing', 'active', 'current']
            },
            {
                id: 'page_history',
                type: 'page',
                title: 'Transaction History',
                subtitle: 'Order and transaction records',
                description: 'View complete transaction and order history',
                path: '/admin/history',
                icon: 'history',
                keywords: ['history', 'transactions', 'records', 'orders', 'past']
            },
            {
                id: 'page_logs',
                type: 'page',
                title: 'System Logs',
                subtitle: 'System activity and audit logs',
                description: 'Monitor system activity and view audit trails',
                path: '/admin/logs',
                icon: 'file-text',
                keywords: ['logs', 'audit', 'activity', 'system', 'monitoring']
            },
            {
                id: 'page_settings',
                type: 'page',
                title: 'Settings',
                subtitle: 'System configuration and preferences',
                description: 'Configure system settings and preferences',
                path: '/admin/settings',
                icon: 'settings',
                keywords: ['settings', 'config', 'preferences', 'configuration']
            },
            {
                id: 'page_devtools',
                type: 'page',
                title: 'Developer Tools',
                subtitle: 'Development and debugging tools',
                description: 'Access developer tools and debugging features',
                path: '/admin/dev-tools',
                icon: 'code',
                keywords: ['dev', 'developer', 'tools', 'debug', 'development']
            }
        ];
        
        return adminPages
            .map(page => {
                // Check relevance against title, subtitle, description, and keywords
                const searchText = `${page.title} ${page.subtitle} ${page.description} ${page.keywords.join(' ')}`;
                const relevance = this.calculateRelevance(searchText, query);
                
                return {
                    ...page,
                    relevance
                };
            })
            .filter(page => page.relevance > 0); // Only return pages with some relevance
    }

    // Main search function using global search API
    async search(query, options = {}) {
        if (!query || query.length < 2) {
            return {
                results: [],
                total: 0,
                query,
                searchTime: 0,
                suggestions: []
            };
        }

        const startTime = Date.now();
        this.clearExpiredCache();

        // Check cache first
        const cacheKey = `search_${query.toLowerCase()}_${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return {
                ...cached.data,
                fromCache: true,
                searchTime: Date.now() - startTime
            };
        }

        try {
            // Call the global search API endpoint
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/search/global?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Search API returned ${response.status}`);
            }

            const apiData = await response.json();

            if (!apiData.success) {
                throw new Error(apiData.message || 'Search failed');
            }

            // Transform API results to match the expected format
            const { data } = apiData;
            let allResults = [];

            // Add products
            if (data.products && data.products.length > 0) {
                allResults = allResults.concat(data.products.map(p => ({
                    ...p,
                    icon: 'package',
                    relevance: 100 // API results are pre-filtered and relevant
                })));
            }

            // Add orders
            if (data.orders && data.orders.length > 0) {
                allResults = allResults.concat(data.orders.map(o => ({
                    ...o,
                    icon: 'shopping-cart',
                    path: o.navigationPath,
                    relevance: 90
                })));
            }

            // Add users
            if (data.users && data.users.length > 0) {
                allResults = allResults.concat(data.users.map(u => ({
                    ...u,
                    icon: 'user',
                    path: u.navigationPath,
                    relevance: 80
                })));
            }

            // Add logs (if available - SUPERADMIN only)
            if (data.logs && data.logs.length > 0) {
                allResults = allResults.concat(data.logs.map(l => ({
                    ...l,
                    icon: 'file-text',
                    path: l.navigationPath,
                    relevance: 70
                })));
            }

            // Add admin pages search
            const pageResults = this.searchAdminPages(query);
            allResults = allResults.concat(pageResults);

            // Sort by relevance
            allResults.sort((a, b) => b.relevance - a.relevance);

            const limit = options.limit || 20;
            const filteredResults = allResults.slice(0, limit);

            // Generate search suggestions
            const suggestions = this.generateSuggestions(query, allResults);

            const result = {
                results: filteredResults,
                total: filteredResults.length,
                totalFound: apiData.totalResults || allResults.length,
                query,
                searchTime: Date.now() - startTime,
                suggestions,
                categories: this.categorizeResults(filteredResults),
                fromCache: false
            };

            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            console.error('Global search error:', error);
            // Fallback to local search if API fails
            console.log('📡 Falling back to local search...');
            return this.localSearch(query, options);
        }
    }

    // Local search fallback method
    async localSearch(query, options = {}) {
        const startTime = Date.now();
        const {
            includeProducts = true,
            includeOrders = true,
            includeUsers = true,
            limit = 20,
            minRelevance = 10
        } = options;

        try {
            // Execute searches in parallel
            const searchPromises = [];
            
            if (includeProducts) {
                searchPromises.push(this.searchProducts(query));
            }
            
            if (includeOrders) {
                searchPromises.push(this.searchOrders(query));
            }
            
            if (includeUsers) {
                searchPromises.push(this.searchUsers(query));
            }

            // Add admin pages search
            searchPromises.push(this.searchAdminPages(query));

            const searchResults = await Promise.all(searchPromises);

            // Combine and process results
            let allResults = [];
            searchResults.forEach(results => {
                allResults = allResults.concat(results);
            });

            // Filter by relevance and sort
            const filteredResults = allResults
                .filter(result => result.relevance >= minRelevance)
                .sort((a, b) => {
                    if (b.relevance !== a.relevance) {
                        return b.relevance - a.relevance;
                    }
                    const typePriority = { product: 3, order: 2, user: 1 };
                    return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
                })
                .slice(0, limit);

            const suggestions = this.generateSuggestions(query, allResults);

            return {
                results: filteredResults,
                total: filteredResults.length,
                totalFound: allResults.length,
                query,
                searchTime: Date.now() - startTime,
                suggestions,
                categories: this.categorizeResults(filteredResults),
                fromCache: false,
                fallbackMode: true
            };

        } catch (error) {
            console.error('Local search error:', error);
            return {
                results: [],
                total: 0,
                query,
                searchTime: Date.now() - startTime,
                error: error.message,
                suggestions: []
            };
        }
    }

    // Generate search suggestions based on partial matches
    generateSuggestions(query, allResults) {
        const suggestions = new Set();
        const queryLower = query.toLowerCase();

        allResults.forEach(result => {
            const title = result.title.toLowerCase();
            const subtitle = result.subtitle?.toLowerCase() || '';
            
            // Add similar titles
            if (title.includes(queryLower) && title !== queryLower) {
                suggestions.add(result.title);
            }
            
            // Add category suggestions for products
            if (result.type === 'product' && result.category) {
                suggestions.add(result.category);
            }
            
            // Add brand suggestions
            if (result.subtitle && subtitle.includes(' - ')) {
                const brand = result.subtitle.split(' - ')[0];
                if (brand.toLowerCase().includes(queryLower)) {
                    suggestions.add(brand);
                }
            }
        });

        return Array.from(suggestions).slice(0, 5);
    }

    // Categorize results by type
    categorizeResults(results) {
        const categories = {
            products: results.filter(r => r.type === 'product'),
            orders: results.filter(r => r.type === 'order'),
            users: results.filter(r => r.type === 'user')
        };

        return {
            products: {
                count: categories.products.length,
                items: categories.products.slice(0, 5)
            },
            orders: {
                count: categories.orders.length,
                items: categories.orders.slice(0, 5)
            },
            users: {
                count: categories.users.length,
                items: categories.users.slice(0, 5)
            }
        };
    }

    // Clear all cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys()),
            timeout: this.cacheTimeout
        };
    }
}

// Export singleton instance
const searchService = new SearchService();
export default searchService;
