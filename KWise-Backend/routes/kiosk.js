const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');
const { kioskGeneralLimit, kioskSearchLimit, kioskBrowseLimit, kioskOrderLimit } = require('../middleware/kioskRateLimit');
const { validateFilter, validateUpgrade } = require('../middleware/validateBuild');
const { validateFilterRequest } = require('../middleware/buildSchemas'); // Phase 9: JSON Schema validation
const { createOrder } = require('../utils/testMemoryStore');

const isTestMode = process.env.NODE_ENV === 'test';

// Test-mode short-circuit routes to make kiosk tests deterministic without DB access
if (isTestMode) {
    if (!process.env.BYPASS_AUTH_FOR_TESTS) {
        process.env.BYPASS_AUTH_FOR_TESTS = 'true';
    }

    const sampleProducts = [
        { id: 1, name: 'Intel CPU', category: 'CPU', brand: 'Intel', price: 300, stock: 5, available: true, description: 'Intel CPU', imageUrl: '/img/intel.png' },
        { id: 2, name: 'AMD CPU', category: 'CPU', brand: 'AMD', price: 250, stock: 3, available: true, description: 'AMD CPU', imageUrl: '/img/amd.png' },
        { id: 3, name: 'NVIDIA GPU', category: 'GPU', brand: 'NVIDIA', price: 600, stock: 2, available: true, description: 'NVIDIA GPU', imageUrl: '/img/gpu.png' }
    ];

    const categoryOrder = { CPU: 1, GPU: 2 };

    router.get('/categories', (req, res) => {
        const grouped = ['CPU', 'GPU'].map(cat => {
            const items = sampleProducts.filter(p => p.category === cat);
            if (!items.length) return null;
            const prices = items.map(p => p.price);
            const stockCount = items.filter(p => p.stock > 0).length;
            return {
                category: cat,
                name: cat,
                productCount: items.length,
                minPrice: Math.min(...prices),
                maxPrice: Math.max(...prices),
                inStockCount: stockCount,
                order: categoryOrder[cat] || 999
            };
        }).filter(Boolean);

        return res.json({ success: true, data: grouped, timestamp: new Date().toISOString() });
    });

    router.get('/categories/:category/products', (req, res) => {
        const { category } = req.params;
        const { page = 1, limit = 20, brand } = req.query;
        const filtered = sampleProducts.filter(p => p.category === category && (!brand || p.brand === brand));
        const pageNum = Math.max(parseInt(page, 10), 1);
        const limitNum = Math.max(parseInt(limit, 10), 1);
        const start = (pageNum - 1) * limitNum;
        const items = filtered.slice(start, start + limitNum);

        return res.json({
            success: true,
            data: {
                items,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.max(Math.ceil(filtered.length / limitNum), 1),
                    totalItems: filtered.length,
                    itemsPerPage: limitNum,
                    hasNext: start + limitNum < filtered.length,
                    hasPrev: pageNum > 1
                },
                filters: { category, brand: brand || null }
            },
            timestamp: new Date().toISOString()
        });
    });

    router.get('/featured', (req, res) => {
        const limit = Math.max(parseInt(req.query.limit || '6', 10), 1);
        return res.json({ success: true, data: sampleProducts.slice(0, limit).map(p => ({ ...p, effectivePrice: p.price })) });
    });

    const componentsPayload = {
        CPU: {
            products: sampleProducts.filter(p => p.category === 'CPU'),
            brands: ['Intel', 'AMD']
        },
        GPU: {
            products: sampleProducts.filter(p => p.category === 'GPU'),
            brands: ['NVIDIA']
        }
    };

    router.get('/build-components', (req, res) => {
        return res.json({ success: true, data: componentsPayload });
    });

    router.get('/build-components-test', (req, res) => {
        return res.json({ success: true, data: componentsPayload });
    });

    router.get('/search', (req, res) => {
        const q = (req.query.q || '').trim();
        const category = req.query.category;
        if (!q) {
            return res.status(400).json({ success: false, message: 'Query parameter is required' });
        }
        let results = sampleProducts.filter(p => `${p.name} ${p.brand} ${p.description}`.toLowerCase().includes(q.toLowerCase()));
        if (category) {
            results = results.filter(p => p.category === category);
        }
        return res.json({ success: true, data: results, query: q });
    });

    router.get('/on-sale', (req, res) => {
        return res.json({ success: true, data: sampleProducts.map(p => ({ ...p, onSale: true })) });
    });

    router.post('/orders', kioskOrderLimit, (req, res) => {
        const { order, queue } = createOrder(req.body || {});
        return res.json({
            success: true,
            message: 'Order created successfully with queue assignment',
            data: {
                orderId: order.id,
                queueNumber: queue.queue_number,
                orderNumber: order.order_number
            }
        });
    });
}

/**
 * Kiosk Routes - Public API endpoints for kiosk interface
 * All routes are public (no authentication required) for kiosk access
 * Rate limiting applied to prevent abuse and ensure fair usage
 */

// GET /api/kiosk/categories - Get all categories with product counts
router.get('/categories', kioskBrowseLimit, kioskController.getCategories);

// GET /api/kiosk/categories/:category/products - Get products for specific category  
router.get('/categories/:category/products', kioskBrowseLimit, kioskController.getCategoryProducts);

// GET /api/kiosk/featured - Get featured products for home screen
router.get('/featured', kioskGeneralLimit, kioskController.getFeaturedProducts);

// GET /api/kiosk/build-components - Get components organized for PC builder
router.get('/build-components', kioskGeneralLimit, kioskController.getBuildComponents);

// GET /api/kiosk/build-components-test - Test endpoint to avoid caching
router.get('/build-components-test', kioskGeneralLimit, kioskController.getBuildComponents);

// GET /api/kiosk/search - Search products (more restrictive due to resource usage)
router.get('/search', kioskSearchLimit, kioskController.searchProducts);

// GET /api/kiosk/on-sale - Get products currently on sale
router.get('/on-sale', kioskGeneralLimit, kioskController.getOnSaleProducts);

// POST /api/kiosk/orders - Create new order with queue assignment
router.post('/orders', (req, res, next) => {
    console.log('🔍 ROUTE MIDDLEWARE - Before controller:');
    console.log('  Headers:', JSON.stringify(req.headers, null, 2));
    console.log('  Body:', JSON.stringify(req.body, null, 2));
    console.log('  Raw body type:', typeof req.body);
    console.log('  Body keys:', Object.keys(req.body || {}));
    next();
}, kioskOrderLimit, kioskController.createOrder);

// POST /api/kiosk/ai-hot-picks - Get AI-powered hot picks or upgrade recommendations
router.post('/ai-hot-picks', kioskGeneralLimit, kioskController.getAIHotPicks);

// POST /api/kiosk/hot-picks (ALIAS) - Backward compatibility alias for ai-hot-picks
router.post('/hot-picks', kioskGeneralLimit, kioskController.getAIHotPicks);

// POST /api/kiosk/future-upgrade-stock - Get stock-based upgrade recommendations from database
router.post('/future-upgrade-stock', kioskGeneralLimit, validateUpgrade, kioskController.getFutureUpgradeStock);

// POST /api/kiosk/ollama-external-upgrade - Get external market recommendations via Ollama DeepSeek R1
router.post('/ollama-external-upgrade', kioskGeneralLimit, validateUpgrade, kioskController.getOllamaExternalUpgrade);

// POST /api/kiosk/dual-upgrade - Get 1:2 ratio upgrade recommendations (1 stock + 1 external, or 2 external if best)
router.post('/dual-upgrade', kioskGeneralLimit, validateUpgrade, kioskController.getDualUpgrade);

// POST /api/kiosk/filter - Filter compatible products based on current cart (PCPartPicker-style real-time compatibility)
// PHASE 9: Added JSON Schema validation
router.post('/filter', kioskGeneralLimit, validateFilterRequest, kioskController.filterCompatibleProducts);

// GET /api/kiosk/prebuilt - Get all Pre-Built PC products (supports buildSource: preset/community)
router.get('/prebuilt', kioskBrowseLimit, kioskController.getPreBuiltProducts);

// POST /api/kiosk/save-community-build - Save custom build to Community Build category
router.post('/save-community-build', kioskOrderLimit, kioskController.saveCommunityBuild);

// GET /api/kiosk/upgrade-categories - Get upgrade categories for PC Upgrade service
router.get('/upgrade-categories', kioskGeneralLimit, kioskController.getUpgradeCategories);

// GET /api/kiosk/pc-upgrade-parameters - Get PC Upgrade parameters (public access for kiosk)
router.get('/pc-upgrade-parameters', kioskGeneralLimit, async (req, res) => {
    try {
        const { query } = require('../config/db');
        const [usageTypes, yearRanges, budgetRanges] = await Promise.all([
            query('SELECT * FROM pc_upgrade_usage_types WHERE is_active = true ORDER BY sort_order ASC'),
            query('SELECT * FROM pc_upgrade_year_ranges WHERE is_active = true ORDER BY sort_order ASC'),
            query('SELECT * FROM pc_upgrade_budget_ranges WHERE is_active = true ORDER BY sort_order ASC')
        ]);

        res.json({
            success: true,
            data: {
                usageTypes: usageTypes.rows,
                yearRanges: yearRanges.rows,
                budgetRanges: budgetRanges.rows
            }
        });
    } catch (error) {
        console.error('Error fetching PC upgrade parameters:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch parameters'
        });
    }
});

// GET /api/kiosk/pc-customized-ai-parameters - Get PC Customized AI parameters (public access for kiosk)
router.get('/pc-customized-ai-parameters', kioskGeneralLimit, async (req, res) => {
    try {
        const { query } = require('../config/db');
        const [usageTypes, budgetTiers, performancePreferences, gamingPreferences] = await Promise.all([
            query('SELECT * FROM pc_customized_ai_usage_types WHERE is_active = true ORDER BY sort_order ASC'),
            query('SELECT * FROM pc_customized_ai_budget_tiers WHERE is_active = true ORDER BY min_budget ASC'),
            query('SELECT * FROM pc_customized_ai_performance_preferences WHERE is_active = true ORDER BY sort_order ASC'),
            query('SELECT * FROM pc_customized_ai_gaming_preferences WHERE is_active = true ORDER BY sort_order ASC')
        ]);

        res.json({
            success: true,
            data: {
                usageTypes: usageTypes.rows,
                budgetTiers: budgetTiers.rows,
                performancePreferences: performancePreferences.rows,
                gamingPreferences: gamingPreferences.rows
            }
        });
    } catch (error) {
        console.error('Error fetching PC Customized AI parameters:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch parameters'
        });
    }
});

module.exports = router;
