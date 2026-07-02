/**
 * ============================================================================
 * USER CONTEXT SERVICE - PHASE 3
 * ============================================================================
 * 
 * Aggregates comprehensive user context from multiple sources:
 * - User profile data
 * - Order history
 * - Interaction patterns
 * - Preferences and settings
 * - Build history
 * 
 * Provides rich context for AI personalization
 * 
 * ============================================================================
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * ============================================================================
 * Get Comprehensive User Context
 * ============================================================================
 */
async function getUserContext(userId) {
    try {
        logger.info(`📊 Fetching comprehensive context for user ${userId}`);

        const [profile, orders, preferences, interactions, builds] = await Promise.all([
            getUserProfile(userId),
            getOrderHistory(userId),
            getUserPreferences(userId),
            getInteractionPatterns(userId),
            getBuildHistory(userId)
        ]);

        const context = {
            userId,
            profile,
            orders: {
                total: orders.length,
                totalSpent: orders.reduce((sum, o) => sum + Number.parseFloat(o.total_price || 0), 0),
                averageOrderValue: orders.length > 0 
                    ? orders.reduce((sum, o) => sum + Number.parseFloat(o.total_price || 0), 0) / orders.length 
                    : 0,
                recentOrders: orders.slice(0, 5),
                categoryPreferences: analyzeCategoryPreferences(orders)
            },
            preferences,
            interactions: {
                totalVisits: interactions.visits || 0,
                totalSearches: interactions.searches || 0,
                totalComparisons: interactions.comparisons || 0,
                favoriteCategories: interactions.favoriteCategories || [],
                priceRange: interactions.priceRange || { min: 0, max: 100000 }
            },
            builds: {
                total: builds.length,
                recent: builds.slice(0, 3),
                averageBudget: builds.length > 0
                    ? builds.reduce((sum, b) => sum + (b.total_price || 0), 0) / builds.length
                    : 0,
                preferredBrands: extractPreferredBrands(builds)
            },
            computed: {
                experienceLevel: computeExperienceLevel(orders, builds, interactions),
                budgetTier: computeBudgetTier(orders, builds),
                primaryUseCase: computePrimaryUseCase(orders, builds, preferences)
            },
            timestamp: new Date().toISOString()
        };

        logger.info(`✅ User context aggregated - ${orders.length} orders, ${builds.length} builds, exp: ${context.computed.experienceLevel}`);

        return context;

    } catch (error) {
        logger.error('Error fetching user context:', error);
        return getDefaultContext(userId);
    }
}

/**
 * ============================================================================
 * Get User Profile
 * ============================================================================
 */
async function getUserProfile(userId) {
    try {
        const result = await query(`
            SELECT 
                id, username, email, role, created_at,
                profile_image_url, last_login, status
            FROM users
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        const user = result.rows[0];
        const accountAge = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            accountAge: accountAge,
            accountAgeCategory: accountAge > 365 ? 'veteran' : accountAge > 90 ? 'experienced' : accountAge > 30 ? 'regular' : 'new',
            status: user.status
        };

    } catch (error) {
        logger.error('Error fetching user profile:', error);
        return null;
    }
}

/**
 * ============================================================================
 * Get Order History
 * ============================================================================
 */
async function getOrderHistory(userId) {
    try {
        const result = await query(`
            SELECT 
                o.id, o.order_number, o.total_price, o.status,
                o.created_at, o.order_type,
                json_agg(
                    json_build_object(
                        'category', p.category,
                        'name', p.name,
                        'price', oi.unit_price,
                        'quantity', oi.quantity
                    )
                ) as items
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.id
            LEFT JOIN pc_parts p ON p.id = oi.part_id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 20
        `, [userId]);

        return result.rows.map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            totalPrice: Number.parseFloat(order.total_price) || 0,
            status: order.status,
            orderType: order.order_type,
            createdAt: order.created_at,
            items: order.items || []
        }));

    } catch (error) {
        logger.error('Error fetching order history:', error);
        return [];
    }
}

/**
 * ============================================================================
 * Get User Preferences
 * ============================================================================
 */
async function getUserPreferences(userId) {
    try {
        const result = await query(`
            SELECT setting_key, setting_value
            FROM settings
            WHERE user_id = $1
        `, [userId]);

        const preferences = {};
        result.rows.forEach(row => {
            preferences[row.setting_key] = row.setting_value;
        });

        return {
            theme: preferences.theme || 'light',
            language: preferences.language || 'en',
            notifications: preferences.notifications === 'true',
            priceAlerts: preferences.price_alerts === 'true',
            newsletter: preferences.newsletter === 'true'
        };

    } catch (error) {
        logger.error('Error fetching user preferences:', error);
        return {};
    }
}

/**
 * ============================================================================
 * Get Interaction Patterns
 * ============================================================================
 */
async function getInteractionPatterns(userId) {
    try {
        // Get search history
        const searchResult = await query(`
            SELECT category, COUNT(*) as count
            FROM search_history
            WHERE user_id = $1
            GROUP BY category
            ORDER BY count DESC
            LIMIT 5
        `, [userId]);

        const favoriteCategories = searchResult.rows.map(r => ({
            category: r.category,
            count: Number.parseInt(r.count, 10)
        }));

        // Get price range from search/browse history
        const priceResult = await query(`
            SELECT 
                MIN(price_min) as min_price,
                MAX(price_max) as max_price,
                AVG((price_min + price_max) / 2) as avg_price
            FROM search_history
            WHERE user_id = $1 AND price_min IS NOT NULL
        `, [userId]);

        const priceData = priceResult.rows[0] || {};

        return {
            visits: 0, // Would track from analytics
            searches: searchResult.rows.reduce((sum, r) => sum + Number.parseInt(r.count, 10), 0),
            comparisons: 0, // Would track from comparison tool usage
            favoriteCategories,
            priceRange: {
                min: Number.parseFloat(priceData.min_price) || 5000,
                max: Number.parseFloat(priceData.max_price) || 50000,
                average: Number.parseFloat(priceData.avg_price) || 20000
            }
        };

    } catch (error) {
        logger.error('Error fetching interaction patterns:', error);
        return {
            visits: 0,
            searches: 0,
            comparisons: 0,
            favoriteCategories: [],
            priceRange: { min: 5000, max: 50000, average: 20000 }
        };
    }
}

/**
 * ============================================================================
 * Get Build History
 * ============================================================================
 */
async function getBuildHistory(userId) {
    try {
        const result = await query(`
            SELECT 
                id, build_name, total_price, purpose,
                components, created_at
            FROM custom_builds
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [userId]);

        return result.rows.map(build => ({
            id: build.id,
            name: build.build_name,
            totalPrice: Number.parseFloat(build.total_price) || 0,
            purpose: build.purpose,
            components: build.components,
            createdAt: build.created_at
        }));

    } catch (error) {
        logger.error('Error fetching build history:', error);
        return [];
    }
}

/**
 * ============================================================================
 * Helper Functions
 * ============================================================================
 */

function analyzeCategoryPreferences(orders) {
    const categoryCount = {};
    
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                if (item.category) {
                    categoryCount[item.category] = (categoryCount[item.category] || 0) + (item.quantity || 1);
                }
            });
        }
    });

    return Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));
}

function extractPreferredBrands(builds) {
    const brandCount = {};

    builds.forEach(build => {
        if (build.components) {
            Object.values(build.components).forEach(component => {
                if (component && component.brand) {
                    brandCount[component.brand] = (brandCount[component.brand] || 0) + 1;
                }
            });
        }
    });

    return Object.entries(brandCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([brand, count]) => ({ brand, count }));
}

function computeExperienceLevel(orders, builds, interactions) {
    let score = 0;

    // Orders contribute
    score += Math.min(orders.length * 10, 30);

    // Builds contribute
    score += Math.min(builds.length * 15, 40);

    // Interactions contribute
    score += Math.min(interactions.searches * 2, 20);

    // Categorize
    if (score >= 70) return 'expert';
    if (score >= 40) return 'intermediate';
    if (score >= 15) return 'beginner';
    return 'novice';
}

function computeBudgetTier(orders, builds) {
    const allSpending = [
        ...orders.map(o => Number.parseFloat(o.totalPrice) || 0),
        ...builds.map(b => b.totalPrice || 0)
    ];

    if (allSpending.length === 0) return 'budget';

    const avgSpending = allSpending.reduce((sum, val) => sum + val, 0) / allSpending.length;

    if (avgSpending >= 80000) return 'enthusiast';
    if (avgSpending >= 50000) return 'high_end';
    if (avgSpending >= 30000) return 'mid_range';
    if (avgSpending >= 15000) return 'budget_conscious';
    return 'budget';
}

function computePrimaryUseCase(orders, builds, preferences) {
    // Analyze components purchased
    const gpuOrders = orders.filter(o => 
        o.items && o.items.some(item => item.category === 'GPU')
    );
    
    const highEndGPUs = gpuOrders.filter(o => 
        o.items.some(item => item.price > 30000)
    );

    const cpuOrders = orders.filter(o =>
        o.items && o.items.some(item => item.category === 'CPU')
    );

    const multiCoreCPUs = cpuOrders.filter(o =>
        o.items.some(item => item.name && (item.name.includes('Ryzen 9') || item.name.includes('i9')))
    );

    // Scoring different use cases
    const scores = {
        gaming: highEndGPUs.length * 20 + gpuOrders.length * 10,
        content_creation: multiCoreCPUs.length * 20 + cpuOrders.length * 10,
        workstation: multiCoreCPUs.length * 15 + orders.length * 5,
        general: orders.length * 5
    };

    const primary = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return primary ? primary[0] : 'general';
}

function getDefaultContext(userId) {
    return {
        userId,
        profile: null,
        orders: { total: 0, totalSpent: 0, averageOrderValue: 0, recentOrders: [], categoryPreferences: [] },
        preferences: {},
        interactions: { totalVisits: 0, totalSearches: 0, totalComparisons: 0, favoriteCategories: [], priceRange: { min: 5000, max: 50000 } },
        builds: { total: 0, recent: [], averageBudget: 0, preferredBrands: [] },
        computed: {
            experienceLevel: 'novice',
            budgetTier: 'budget',
            primaryUseCase: 'general'
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * ============================================================================
 * Exports
 * ============================================================================
 */
module.exports = {
    getUserContext,
    getUserProfile,
    getOrderHistory,
    getUserPreferences,
    getInteractionPatterns,
    getBuildHistory
};
