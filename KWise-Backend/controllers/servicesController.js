const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Services Controller - API endpoints for cleaning, checkup, and upgrade services
 * Handles service-specific queries optimized for kiosk interface
 */

/**
 * GET /api/services/cleaning - Get all cleaning service tiers
 */
const getCleaningServices = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                id,
                name,
                category,
                tier_level,
                price,
                description,
                inclusions,
                completion_time,
                is_featured,
                display_order
            FROM pc_services 
            WHERE category = 'cleaning' AND is_active = true
            ORDER BY display_order, price ASC
        `);

        // Format the response to match frontend expectations
        const services = result.rows.map(service => ({
            id: service.id,
            name: service.name,
            price: `₱${parseFloat(service.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            priceNumeric: parseFloat(service.price),
            icon: `/assets/services/${service.tier_level.toLowerCase()}clean.webp`, // Default icon path
            tier: service.tier_level,
            details: {
                inclusion: service.inclusions || [],
                completion: service.completion_time || 'Processing time varies'
            },
            description: service.description,
            featured: service.is_featured
        }));

        res.json({
            success: true,
            message: `Found ${services.length} cleaning service tiers`,
            data: services,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching cleaning services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cleaning services',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * GET /api/services/checkup - Get checkup service options
 */
const getCheckupOptions = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                id,
                name,
                category,
                tier_level,
                price,
                description,
                inclusions,
                completion_time,
                is_featured
            FROM pc_services 
            WHERE category = 'checkup' AND is_active = true
            ORDER BY display_order, price ASC
        `);

        const services = result.rows.map(service => ({
            id: service.id,
            name: service.name,
            price: `₱${parseFloat(service.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            priceNumeric: parseFloat(service.price),
            tier: service.tier_level,
            description: service.description,
            inclusions: service.inclusions || [],
            completionTime: service.completion_time,
            featured: service.is_featured
        }));

        res.json({
            success: true,
            message: `Found ${services.length} checkup service options`,
            data: services,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching checkup services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch checkup services',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * GET /api/services/diagnostic-issues - Get diagnostic issue categories
 */
const getDiagnosticIssues = async (req, res) => {
    try {
        const { category } = req.query;
        
        let whereClause = 'WHERE is_active = true';
        const params = [];
        
        if (category) {
            whereClause += ' AND category = $1';
            params.push(category);
        }

        const result = await query(`
            SELECT 
                id,
                category,
                issue_name,
                description,
                estimated_fix_time,
                estimated_cost,
                severity
            FROM diagnostic_issues 
            ${whereClause}
            ORDER BY category, display_order, issue_name
        `, params);

        // Group by category
        const groupedIssues = result.rows.reduce((acc, issue) => {
            const cat = issue.category;
            if (!acc[cat]) {
                acc[cat] = {
                    category: cat,
                    categoryDisplay: cat.charAt(0).toUpperCase() + cat.slice(1),
                    options: []
                };
            }
            
            acc[cat].options.push({
                id: issue.id,
                name: issue.issue_name,
                description: issue.description,
                estimatedTime: issue.estimated_fix_time,
                estimatedCost: issue.estimated_cost ? `₱${parseFloat(issue.estimated_cost).toLocaleString()}` : 'Quote on inspection',
                severity: issue.severity
            });
            
            return acc;
        }, {});

        const categories = Object.values(groupedIssues);

        res.json({
            success: true,
            message: `Found ${result.rows.length} diagnostic issues across ${categories.length} categories`,
            data: categories,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching diagnostic issues:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch diagnostic issues',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * GET /api/services/all - Get all services (cleaning + checkup)
 */
const getAllServices = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                id,
                name,
                category,
                tier_level,
                price,
                description,
                inclusions,
                completion_time,
                is_featured,
                display_order
            FROM pc_services 
            WHERE is_active = true
            ORDER BY category, display_order, price ASC
        `);

        // Group by category
        const servicesByCategory = result.rows.reduce((acc, service) => {
            const cat = service.category;
            if (!acc[cat]) {
                acc[cat] = [];
            }
            
            acc[cat].push({
                id: service.id,
                name: service.name,
                price: `₱${parseFloat(service.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                priceNumeric: parseFloat(service.price),
                tier: service.tier_level,
                description: service.description,
                inclusions: service.inclusions || [],
                completionTime: service.completion_time,
                featured: service.is_featured
            });
            
            return acc;
        }, {});

        res.json({
            success: true,
            message: `Found services in ${Object.keys(servicesByCategory).length} categories`,
            data: servicesByCategory,
            totalServices: result.rows.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching all services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * GET /api/services/featured - Get featured services
 */
const getFeaturedServices = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                id,
                name,
                category,
                tier_level,
                price,
                description,
                inclusions,
                completion_time
            FROM pc_services 
            WHERE is_active = true AND is_featured = true
            ORDER BY display_order, price ASC
        `);

        const services = result.rows.map(service => ({
            id: service.id,
            name: service.name,
            category: service.category,
            price: `₱${parseFloat(service.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            priceNumeric: parseFloat(service.price),
            tier: service.tier_level,
            description: service.description,
            inclusions: service.inclusions || [],
            completionTime: service.completion_time
        }));

        res.json({
            success: true,
            message: `Found ${services.length} featured services`,
            data: services,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching featured services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch featured services',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    getCleaningServices,
    getCheckupOptions,
    getDiagnosticIssues,
    getAllServices,
    getFeaturedServices
};