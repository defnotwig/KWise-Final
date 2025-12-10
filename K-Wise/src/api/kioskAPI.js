/**
 * Kiosk API - Frontend interface for kiosk-specific backend endpoints
 * Enhanced with error handling, real-time data, and proper console management
 * Using axios for better compatibility and error handling
 */

import axios from 'axios';
import { getApiBaseUrl, getFullImageUrl } from '../utils/networkConfig';

// Dynamic API configuration that adapts to network environment
const API_BASE_URL = getApiBaseUrl();

// Create axios instance for kiosk API
const kioskAxios = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // ✅ FIX: Increased to 30s for order creation (was 15s, caused timeouts)
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
    }
});

console.log('🔧 KioskAPI initialized with base URL:', API_BASE_URL);

/**
 * Enhanced kioskAPI with comprehensive kiosk functionality
 */
const kioskAPI = {
    /**
     * Get all categories available in the kiosk
     */
    async getCategories() {
        try {
            console.log('📊 Fetching kiosk categories...');
            console.log('🔗 Using API URL:', '/kiosk/categories');
            
            const response = await kioskAxios.get('/kiosk/categories');

            console.log('📡 Response status:', response.status, response.statusText);
            console.log('� Raw response data:', response.data);

            const data = response.data;

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch categories');
            }

            console.log('✅ Categories loaded successfully:', data.data.length, 'categories');
            return data.data;

        } catch (error) {
            console.error('❌ Error fetching categories:', error);
            console.error('❌ Error type:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error code:', error.code);
            
            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            } else if (error.request) {
                console.error('❌ Request made but no response received');
                console.error('❌ Request details:', error.request);
            }

            // Return fallback categories to prevent app crash
            return [
                { category: 'CPU', name: 'Central Processing Unit', productCount: 0, inStockCount: 0, order: 10 },
                { category: 'GPU', name: 'Graphics Processing Unit', productCount: 0, inStockCount: 0, order: 50 },
                { category: 'Motherboard', name: 'Motherboard', productCount: 0, inStockCount: 0, order: 20 },
                { category: 'RAM', name: 'Memory (RAM)', productCount: 0, inStockCount: 0, order: 30 },
                { category: 'Storage', name: 'Storage', productCount: 0, inStockCount: 0, order: 40 },
                { category: 'PSU', name: 'Power Supply Unit', productCount: 0, inStockCount: 0, order: 60 },
                { category: 'Case', name: 'PC Case', productCount: 0, inStockCount: 0, order: 70 },
                { category: 'Cooling', name: 'Cooling System', productCount: 0, inStockCount: 0, order: 80 },
                {
                    category: 'Peripherals',
                    name: 'Peripherals',
                    productCount: 0,
                    inStockCount: 0,
                    order: 150,
                    subCategories: [
                        { category: 'Monitor', name: 'Monitor', productCount: 0, inStockCount: 0 },
                        { category: 'Keyboard', name: 'Keyboard', productCount: 0, inStockCount: 0 },
                        { category: 'Mouse', name: 'Mouse', productCount: 0, inStockCount: 0 },
                        { category: 'Headphones', name: 'Headphones', productCount: 0, inStockCount: 0 },
                        { category: 'Speakers', name: 'Speakers', productCount: 0, inStockCount: 0 },
                        { category: 'Webcam', name: 'Webcam', productCount: 0, inStockCount: 0 }
                    ]
                }
            ];
        }
    },

    /**
     * Get products for a specific category - ONLY IN-STOCK ITEMS
     */
    async getCategoryProducts(category, options = {}) {
        const { page = 1, limit = 100, sortBy = 'name', sortOrder = 'asc' } = options;
        
        try {
            console.log(`📦 Fetching products for category: ${category}`);
            console.log('🔗 Using API URL:', `/kiosk/categories/${category}/products`);

            const response = await kioskAxios.get(`/kiosk/categories/${category}/products`, {
                params: {
                    page,
                    limit,
                    sortBy,
                    sortOrder,
                    inStock: true
                }
            });

            console.log('📡 Response status:', response.status, response.statusText);
            console.log('� Raw response data:', response.data);

            const data = response.data;

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch products');
            }

            // 🔥 FIX ISSUE #1: Handle both flat array and nested object response formats
            // Backend can return either:
            // Format 1: { success: true, data: [...] } (flat array)
            // Format 2: { success: true, data: { items: [...], pagination: {...} } } (nested)
            let products = [];
            if (Array.isArray(data.data)) {
                // Flat array format
                products = data.data;
                console.log('✅ Using flat array response format');
            } else if (data.data && Array.isArray(data.data.items)) {
                // Nested format with items array
                products = data.data.items;
                console.log('✅ Using nested response format (data.items)');
            } else {
                console.warn('⚠️ Unexpected response format:', data);
                products = [];
            }

            // Process image URLs to full URLs and map imageUrl to image
            const processedProducts = products.map(product => ({
                ...product,
                image: getFullImageUrl(product.imageUrl || product.image),
                imageUrl: product.imageUrl || product.image, // Keep original field too
                // 🔥 CRITICAL: Ensure both specifications AND dimensions are available for compatibility validation
                specifications: product.specifications || {},
                dimensions: product.dimensions || {},
                description: product.description || '',
                // Add category for fallback image handling in components
                category: product.category || category
            }));

            console.log(`✅ Products loaded successfully for ${category}:`, processedProducts.length, 'products');
            console.log('📸 First product image URL:', processedProducts[0]?.imageUrl);
            console.log('📸 First product full image:', processedProducts[0]?.image);
            console.log('📋 First product specs:', JSON.stringify(processedProducts[0]?.specifications || {}));
            console.log('📏 First product dimensions:', JSON.stringify(processedProducts[0]?.dimensions || {}));

            return {
                data: processedProducts,
                pagination: data.data?.pagination || data.pagination || {
                    total: processedProducts.length,
                    page: page,
                    pages: Math.ceil(processedProducts.length / limit),
                    limit: limit
                }
            };

        } catch (error) {
            console.error(`❌ Error fetching products for category ${category}:`, error);
            console.error('❌ Error type:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error code:', error.code);

            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }

            // Return fallback empty product list
            return {
                data: [],
                pagination: { total: 0, page: 1, pages: 1, limit: limit }
            };
        }
    },

    /**
     * Get featured products for homepage display
     */
    async getFeaturedProducts(limit = 8) {
        try {
            console.log(`⭐ Fetching ${limit} featured products...`);
            console.log('🔗 Using API URL:', '/kiosk/featured');

            const response = await kioskAxios.get('/kiosk/featured', {
                params: { limit }
            });

            console.log('📡 Response status:', response.status, response.statusText);
            console.log('� Raw response data:', response.data);

            const data = response.data;

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch featured products');
            }

            // Process image URLs to full URLs
            const processedProducts = data.data.map(product => ({
                ...product,
                image: getFullImageUrl(product.image)
            }));

            console.log('✅ Featured products loaded successfully:', processedProducts.length, 'products');
            return processedProducts;

        } catch (error) {
            console.error('❌ Error fetching featured products:', error);
            console.error('❌ Error type:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error code:', error.code);

            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }

            // Return fallback empty featured products
            return [];
        }
    },

    /**
     * Get products currently on sale
     */
    async getOnSaleProducts(limit = 8) {
        try {
            console.log(`🔥 Fetching ${limit} on-sale products...`);
            console.log('🔗 Using API URL:', '/kiosk/on-sale');

            const response = await kioskAxios.get('/kiosk/on-sale', {
                params: { limit }
            });

            console.log('📡 Response status:', response.status, response.statusText);
            console.log('� Raw response data:', response.data);

            const data = response.data;

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch on-sale products');
            }

            // Process image URLs to full URLs
            const processedProducts = data.data.map(product => ({
                ...product,
                image: getFullImageUrl(product.image)
            }));

            console.log('✅ On-sale products loaded successfully:', processedProducts.length, 'products');
            return processedProducts;

        } catch (error) {
            console.error('❌ Error fetching on-sale products:', error);
            console.error('❌ Error type:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error code:', error.code);

            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }

            // Return fallback empty on-sale products
            return [];
        }
    },

    /**
     * Search products across all categories
     */
    async searchProducts(query, options = {}) {
        const { page = 1, limit = 20, category = '', sortBy = 'name', sortOrder = 'asc' } = options;
        
        try {
            console.log(`🔍 Searching products with query: "${query}"`);

            const params = {
                q: query, // Stock API uses 'q' parameter
                page: page,
                limit: limit,
                sortBy: sortBy,
                sortOrder: sortOrder,
                inStock: 'true' // Only show in-stock items in kiosk
            };

            if (category) params.category = category;

            // Use stock API search since it's more reliable
            const stockAxios = axios.create({
                baseURL: API_BASE_URL.replace('/kiosk', ''),
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const response = await stockAxios.get('/stock/search', { params });

            console.log('📡 Response status:', response.status, response.statusText);
            console.log('📊 Raw response data:', response.data);

            const data = response.data;

            if (!data.success) {
                throw new Error(data.message || 'Failed to search products');
            }

            // Process image URLs to full URLs
            const processedProducts = data.data.map(product => ({
                ...product,
                image: getFullImageUrl(product.image)
            }));

            console.log(`✅ Search completed for "${query}":`, processedProducts.length, 'products found');

            return {
                data: processedProducts,
                pagination: data.pagination || {
                    total: processedProducts.length,
                    page: page,
                    pages: Math.ceil(processedProducts.length / limit),
                    limit: limit
                }
            };

        } catch (error) {
            console.error(`❌ Error searching products with query "${query}":`, error);
            console.error('❌ Error code:', error.code);

            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }

            // Return fallback empty search results
            return {
                data: [],
                pagination: { total: 0, page: 1, pages: 1, limit: limit }
            };
        }
    },

    /**
     * Get product details by ID
     */
    async getProductById(id) {
        try {
            console.log(`📋 Fetching product details for ID: ${id}`);

            // Use the stock API for individual product details since kiosk doesn't have this endpoint
            const stockAxios = axios.create({
                baseURL: API_BASE_URL.replace('/kiosk', ''),
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const response = await stockAxios.get(`/stock/${id}`);

            console.log('📡 Response status:', response.status, response.statusText);
            console.log('📊 Raw response data:', response.data);

            const data = response.data;

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch product details');
            }

            // Process image URL to full URL
            const processedProduct = {
                ...data.data,
                image: getFullImageUrl(data.data.image)
            };

            console.log('✅ Product details loaded successfully:', processedProduct.name);
            return processedProduct;

        } catch (error) {
            console.error(`❌ Error fetching product details for ID ${id}:`, error);
            console.error('❌ Error code:', error.code);

            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }

            return null;
        }
    },

    /**
     * Get available brands for a category (for filtering)
     */
    async getCategoryBrands(category) {
        try {
            const response = await this.getCategoryProducts(category, { limit: 1000 });
            const brands = [...new Set(response.data.map(product => product.brand))];
            return brands.sort();
        } catch (error) {
            console.error('Error fetching category brands:', error);
            return [];
        }
    },

    /**
     * Get all cleaning service tiers for PC Cleaning
     */
    async getCleaningServices() {
        try {
            console.log('🧹 Fetching cleaning services...');
            
            const response = await kioskAxios.get('/services/cleaning');
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to fetch cleaning services');
            }

            console.log('✅ Cleaning services loaded successfully:', response.data.data.length, 'tiers');
            return response.data.data;

        } catch (error) {
            console.error('❌ Error fetching cleaning services:', error);
            
            // Return fallback cleaning services
            return [
                {
                    id: 1,
                    name: "BASIC TIER CLEAN",
                    price: "₱500.00",
                    priceNumeric: 500,
                    tier: "basic",
                    details: {
                        inclusion: [
                            "No disassembly, Brushed / Air Blow",
                            "Re-apply Deep cool Thermal paste *(Processor)"
                        ],
                        completion: "WALK-IN COMPLETION: 1 HOUR"
                    },
                    icon: "/assets/services/basicclean.webp"
                },
                {
                    id: 2,
                    name: "PRO TIER CLEAN",
                    price: "₱1,000.00",
                    priceNumeric: 1000,
                    tier: "pro",
                    details: {
                        inclusion: [
                            "Disassemble PC Parts",
                            "Do Dust Cleaning on each parts",
                            "Proper Cable Management",
                            "Re-apply Deep cool Thermal paste *(Processor)"
                        ],
                        completion: "WALK-IN COMPLETION: 12 - 24 HOURS"
                    },
                    icon: "/assets/services/proclean.webp"
                },
                {
                    id: 3,
                    name: "PREMIUM TIER CLEAN",
                    price: "₱1,500.00",
                    priceNumeric: 1500,
                    tier: "premium",
                    details: {
                        inclusion: [
                            "Disassemble PC Parts",
                            "Do Dust Cleaning on each parts",
                            "Proper Cable Management",
                            "Re-apply Deep cool Thermal paste *(Processor)",
                            "New Screws"
                        ],
                        completion: "WALK-IN COMPLETION: 5 - 6 HOURS"
                    },
                    icon: "/assets/services/premiumclean.webp"
                }
            ];
        }
    },

    /**
     * Get all checkup options for PC Checkup
     */
    async getCheckupOptions() {
        try {
            console.log('🔍 Fetching checkup options...');
            
            const response = await kioskAxios.get('/services/checkup');
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to fetch checkup options');
            }

            console.log('✅ Checkup options loaded successfully');
            return response.data.data;

        } catch (error) {
            console.error('❌ Error fetching checkup options:', error);
            return [];
        }
    },

    /**
     * Get upgrade categories for PC Upgrade service
     * Returns available upgrade categories with database category mapping
     */
    async getUpgradeCategories() {
        try {
            console.log('🔧 Fetching upgrade categories...');
            
            const response = await kioskAxios.get('/kiosk/upgrade-categories');
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to fetch upgrade categories');
            }

            console.log('✅ Upgrade categories loaded successfully:', response.data.data.length, 'categories');
            return response.data.data;

        } catch (error) {
            console.error('❌ Error fetching upgrade categories:', error);
            
            // Return fallback categories with fixed database mapping
            return [
                { id: 'ram', name: 'RAM (MEMORY)', category: 'RAM', order: 1, productCount: 0 },
                { id: 'storage', name: 'STORAGE', category: 'Storage', order: 2, productCount: 0 },
                { id: 'gpu', name: 'GPU', category: 'GPU', order: 3, productCount: 0 },
                { id: 'processor', name: 'PROCESSOR', category: 'CPU', order: 4, productCount: 0 },
                { id: 'motherboard', name: 'MOTHERBOARD', category: 'Motherboard', order: 5, productCount: 0 },
                { id: 'psu', name: 'PSU', category: 'PSU', order: 6, productCount: 0 },
                { id: 'cpu-cooler', name: 'CPU COOLER', category: 'Cooling', order: 7, productCount: 0 },
                { id: 'chassis', name: 'CHASSIS', category: 'Case', order: 8, productCount: 0 }
            ];
        }
    },

    /**
     * Get all diagnostic issues for Issue Review
     */
    async getDiagnosticIssues() {
        try {
            console.log('⚠️ Fetching diagnostic issues...');
            
            const response = await kioskAxios.get('/services/diagnostic-issues');
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to fetch diagnostic issues');
            }

            console.log('✅ Diagnostic issues loaded successfully');
            return response.data.data;

        } catch (error) {
            console.error('❌ Error fetching diagnostic issues:', error);
            return [];
        }
    },

    /**
     * Get all services (cleaning + checkup + diagnostic)
     */
    async getAllServices() {
        try {
            console.log('🔧 Fetching all services...');
            
            const response = await kioskAxios.get('/services/all');
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to fetch all services');
            }

            console.log('✅ All services loaded successfully');
            return response.data.data;

        } catch (error) {
            console.error('❌ Error fetching all services:', error);
            return {
                cleaning: [],
                checkup: [],
                diagnostic: []
            };
        }
    },

    /**
     * Format price to currency string with peso symbol
     */
    formatPrice(price) {
        if (price == null || isNaN(price)) return '₱0.00';
        
        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice)) return '₱0.00';
        
        return `₱${numericPrice.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    },

    /**
     * Get build components organized for PC customizer
     */
    async getBuildComponents() {
        try {
            console.log('🔧 Fetching build components for PC customizer...');
            console.log('🔗 Using API URL:', '/kiosk/build-components');
            
            const response = await kioskAxios.get('/kiosk/build-components');
            
            console.log('📡 Response status:', response.status, response.statusText);
            console.log('📦 Raw response data:', response.data);
            
            const data = response.data;
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch build components');
            }
            
            // Process the components data
            const processedComponents = {};
            
            Object.entries(data.data).forEach(([category, categoryData]) => {
                processedComponents[category] = {
                    products: categoryData.products?.map(product => ({
                        ...product,
                        // Map both image and imageUrl fields
                        image: getFullImageUrl(product.imageUrl || product.image),
                        imageUrl: getFullImageUrl(product.imageUrl || product.image),
                        // Ensure specifications are available
                        specifications: product.specifications || {},
                        description: product.description || '',
                        // Add category for fallback image handling
                        category: product.category || category
                    })) || [],
                    brands: categoryData.brands || []
                };
            });

            console.log('✅ Build components loaded successfully:', Object.keys(processedComponents).length, 'categories');
            const firstCategory = Object.keys(processedComponents)[0];
            if (firstCategory) {
                console.log('📸 First product image check:', processedComponents[firstCategory]?.products[0]?.image);
                console.log('📋 First product specs:', processedComponents[firstCategory]?.products[0]?.specifications ? 'Available' : 'Missing');
            }
            return processedComponents;
            
        } catch (error) {
            console.error('❌ Error fetching build components:', error);
            console.error('❌ Error type:', error.name);
            console.error('❌ Error message:', error.message);
            
            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }
            
            // Return fallback components to prevent app crash
            return {
                CPU: { products: [], brands: [] },
                GPU: { products: [], brands: [] },
                Motherboard: { products: [], brands: [] },
                RAM: { products: [], brands: [] },
                Storage: { products: [], brands: [] },
                PSU: { products: [], brands: [] },
                Case: { products: [], brands: [] },
                Cooling: { products: [], brands: [] }
            };
        }
    },

    /**
     * Check component compatibility using AI
     */
    async checkCompatibility(selectedComponents, newComponent) {
        try {
            console.log('🔍 Checking component compatibility...');
            console.log('📦 Selected components:', selectedComponents);
            console.log('🆕 New component:', newComponent?.name || newComponent?.id);
            
            // Convert object to array if needed
            let componentsArray = [];
            if (selectedComponents && typeof selectedComponents === 'object') {
                if (Array.isArray(selectedComponents)) {
                    componentsArray = selectedComponents;
                } else {
                    // Convert object {CPU: {...}, Motherboard: {...}} to array
                    componentsArray = Object.values(selectedComponents).filter(comp => comp && comp.id);
                }
            }
            
            console.log('📊 Components array:', componentsArray.length, 'items');
            
            // Category mapping: Convert lowercase category keys to proper case
            const categoryMap = {
                'cpu': 'CPU',
                'gpu': 'GPU',
                'motherboard': 'Motherboard',
                'ram': 'RAM',
                'memory': 'RAM',
                'storage': 'Storage',
                'psu': 'PSU',
                'case': 'Case',
                'cooling': 'Cooling',
                'monitor': 'Monitor',
                'keyboard': 'Keyboard',
                'mouse': 'Mouse',
                'headphones': 'Headphones',
                'speakers': 'Speakers',
                'webcam': 'Webcam'
            };
            
            // ✅ CRITICAL FIX: Normalize category case to match schema enum
            const normalizeComponent = (comp) => {
                if (!comp) return null;
                
                // Build the normalized component, only including fields that exist
                const normalized = {
                    id: comp.id,
                    name: comp.name || 'Unknown'
                };
                
                // Only add category if it exists and is valid
                // Handle both database format (proper case) and cart format (lowercase)
                if (comp.category && typeof comp.category === 'string') {
                    const categoryLower = comp.category.toLowerCase();
                    // Use mapping if lowercase, otherwise keep as-is (database already has proper case)
                    normalized.category = categoryMap[categoryLower] || comp.category;
                }
                
                // Add optional fields if they exist
                if (comp.price !== undefined && comp.price !== null) normalized.price = comp.price;
                if (comp.brand) normalized.brand = comp.brand;
                if (comp.specifications) normalized.specifications = comp.specifications;
                if (comp.image_url) normalized.image_url = comp.image_url;
                if (comp.description || comp.details) normalized.description = comp.description || comp.details;
                
                return normalized;
            };
            
            // Normalize all components
            const normalizedComponents = componentsArray.map(normalizeComponent).filter(c => c && c.name);
            const normalizedNewComponent = normalizeComponent(newComponent);
            
            console.log('🔄 Normalized components:', normalizedComponents);
            console.log('🔄 Normalized new component:', normalizedNewComponent);
            
            // Build the request payload
            const payload = {
                currentProduct: normalizedNewComponent,
                selectedParts: normalizedComponents,
                excludeCategories: normalizedComponents.map(comp => comp.category).filter(Boolean)
            };
            
            const response = await kioskAxios.post('/compatibility/analyze', payload);
            
            const data = response.data;
            
            if (!data.success) {
                throw new Error(data.message || 'Compatibility check failed');
            }
            
            console.log('✅ Compatibility check completed:', data.data);
            return data.data;
            
        } catch (error) {
            console.error('❌ Error checking compatibility:', error);
            console.error('❌ Error response:', error.response?.data);
            
            // Return basic compatibility info if AI fails
            return {
                compatible: true,
                confidence: 0.5,
                issues: [],
                warnings: [],
                suggestions: []
            };
        }
    },

    /**
     * Check full build compatibility (all 6 layers)
     * Used by OrderSummary pages for comprehensive compatibility analysis
     */
    async checkFullBuildCompatibility(components) {
        try {
            console.log('🔍 Checking full build compatibility...');
            console.log('📦 Components to analyze:', Object.keys(components));
            
            const response = await kioskAxios.post('/compatibility/advanced/full-build', {
                components
            }, {
                timeout: 90000 // 90s for AI analysis
            });
            
            const data = response.data;
            
            if (!data.success) {
                throw new Error(data.message || 'Full build compatibility check failed');
            }
            
            console.log('✅ Full build compatibility check completed');
            console.log('📊 Compatibility Score:', data.data?.compatibility_score || 'N/A');
            console.log('📊 Overall Status:', data.data?.overall_status || 'unknown');
            console.log('🔍 Full response structure:', JSON.stringify(data, null, 2));
            
            return data;
            
        } catch (error) {
            console.error('❌ Error checking full build compatibility:', error);
            
            if (error.response) {
                console.error('❌ Response status:', error.response.status);
                console.error('❌ Response data:', error.response.data);
            }
            
            // Return minimal structure to prevent UI crashes
            return {
                success: false,
                message: error.message || 'Compatibility check failed',
                data: {
                    compatibility_score: 50,
                    layers: {},
                    issues: []
                }
            };
        }
    },

    /**
     * Check if a product is on sale and get sale info
     */
    getSaleInfo(product) {
        if (!product.onSale) return null;

        const savings = product.price - (product.salePrice || product.effectivePrice);
        const discountPercent = Math.round((savings / product.price) * 100);

        return {
            isOnSale: true,
            originalPrice: product.price,
            salePrice: product.salePrice || product.effectivePrice,
            savings: savings,
            discountPercent: discountPercent
        };
    },

    /**
     * Utility function to get full image URL
     */
    getFullImageUrl(imageUrl) {
        return getFullImageUrl(imageUrl);
    }
};

export default kioskAPI;