const { query } = require('../config/db');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const { createPart, updatePart, findPartById, listParts } = require('../utils/testMemoryStore');
const isTest = process.env.NODE_ENV === 'test' || process.env.BYPASS_AUTH_FOR_TESTS === 'true';

/**
 * Stock Controller - Main PC Parts Management
 * Handles all stock-related operations for the K-Wise system
 */

/**
 * Normalize tier values from frontend to database format
 * Frontend sends: 'entry', 'mid-tier', 'high-tier', 'elite', 'starter'
 * Database expects: 'Entry', 'Mid Tier', 'High Tier', 'Elite', 'Starter'
 * @param {string} tierValue - The tier value from frontend
 * @returns {string|null} - The normalized tier value for database
 */
const normalizeTierValue = (tierValue) => {
    if (!tierValue || tierValue === '') return null;
    
    const tierMapping = {
        'entry': 'Entry',
        'mid-tier': 'Mid Tier',
        'high-tier': 'High Tier',
        'elite': 'Elite',
        'starter': 'Starter'
    };
    
    const normalizedKey = tierValue.toLowerCase().trim();
    const mappedValue = tierMapping[normalizedKey];
    
    if (mappedValue) {
        logger.info(`🔄 Normalized tier: "${tierValue}" → "${mappedValue}"`);
        return mappedValue;
    }
    
    // If already in correct format, return as-is
    if (['Entry', 'Mid Tier', 'High Tier', 'Elite', 'Starter'].includes(tierValue)) {
        return tierValue;
    }
    
    logger.warn(`⚠️ Unknown tier value: "${tierValue}", setting to null`);
    return null;
};

// Category ID ranges configuration
const CATEGORY_ID_RANGES = {
    'CPU': { min: 10, max: 99 },
    'Motherboard': { min: 100, max: 199 },
    'RAM': { min: 200, max: 299 },
    'Storage': { min: 300, max: 399 },
    'GPU': { min: 400, max: 499 },
    'PSU': { min: 500, max: 599 },
    'Case': { min: 600, max: 699 },
    'Cooling': { min: 700, max: 799 },
    'Monitor': { min: 800, max: 899 },
    'Headphones': { min: 900, max: 999 },
    'Keyboard': { min: 1000, max: 1099 },
    'Mouse': { min: 1100, max: 1199 },
    'Speakers': { min: 1200, max: 1299 },
    'Webcam': { min: 1300, max: 1399 }
};

// Function to get the next available ID for a category
const getNextCategoryId = async (category) => {
    const range = CATEGORY_ID_RANGES[category];
    if (!range) {
        throw new Error(`Category ${category} not found in ID ranges`);
    }

    // Find the highest ID currently used in this category range
    const result = await query(`
        SELECT MAX(id) as max_id 
        FROM pc_parts 
        WHERE id >= $1 AND id <= $2
    `, [range.min, range.max]);

    const maxId = result.rows[0].max_id;
    
    if (!maxId) {
        // No items in this category yet, start from the minimum
        return range.min;
    }
    
    if (maxId >= range.max) {
        throw new Error(`Category ${category} has reached maximum ID limit (${range.max})`);
    }
    
    return maxId + 1;
};

// Function to get category table mapping
const getCategoryTableMapping = (category) => {
    const mapping = {
        'CPU': 'cpu',
        'Motherboard': 'motherboard', 
        'RAM': 'ram',
        'Storage': 'storage',
        'GPU': 'gpu',
        'PSU': 'psu',
        'Case': 'pc_case',
        'Cooling': 'cooling',
        'Monitor': 'monitor',
        'Headphones': 'headphones',
        'Keyboard': 'keyboard',
        'Mouse': 'mouse',
        'Speakers': 'speakers',
        'Webcam': 'webcam'
    };
    return mapping[category];
};

// GET /api/stock - List all parts with filtering, pagination & specification filters
const list = async (req, res) => {
    try {
        const {
            category,
            q,
            page = 1,
            limit = 20,
            sort = 'name',
            order = 'ASC',
            brand,
            minPrice,
            maxPrice,
            inStock = true
        } = req.query;

        // Base clause - filter for kiosk visible products
        // ✅ MODIFIED: For Community Build category, show ALL items including pending
        let whereClause;
        if (category === 'Community Build') {
            // Show all Community Builds regardless of status (for admin review)
            whereClause = 'WHERE 1=1';
        } else {
            whereClause = 'WHERE is_active = true AND kiosk_visible = true';
        }
        const queryParams = [];
        let paramIndex = 1;

        // Category filter - special handling for Community Build
        if (category) {
            if (category === 'Community Build') {
                // Community builds are Pre-Built with buildSource = 'community'
                whereClause += ` AND category = $${paramIndex++} AND specifications->>'buildSource' = $${paramIndex++}`;
                queryParams.push('Pre-Built', 'community');
            } else {
                whereClause += ` AND category = $${paramIndex++}`;
                queryParams.push(category);
            }
        }

        // Text / brand search
        if (q) {
            whereClause += ` AND (name ILIKE $${paramIndex++} OR brand ILIKE $${paramIndex++})`;
            queryParams.push(`%${q}%`, `%${q}%`);
        }

        if (brand) {
            if (brand.includes(',')) {
                // Multiple brands - use IN clause
                const brands = brand.split(',').map(b => b.trim()).filter(b => b);
                const brandPlaceholders = brands.map((_, i) => `$${paramIndex + i}`).join(',');
                whereClause += ` AND brand IN (${brandPlaceholders})`;
                queryParams.push(...brands);
                paramIndex += brands.length;
            } else {
                // Single brand
                whereClause += ` AND brand = $${paramIndex++}`;
                queryParams.push(brand);
            }
        }

        if (minPrice) {
            whereClause += ` AND price >= $${paramIndex++}`;
            queryParams.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            whereClause += ` AND price <= $${paramIndex++}`;
            queryParams.push(parseFloat(maxPrice));
        }

        if (inStock === 'true') {
            whereClause += ' AND stock > 0';
        } else if (inStock === 'false') {
            whereClause += ' AND stock = 0';
        }

        // Tier filter
        const { tier } = req.query;
        if (tier) {
            whereClause += ` AND tier = $${paramIndex++}`;
            queryParams.push(tier);
        }

        // Specification filters: spec_<field>=value OR spec_<field>=min-max
        const specFilters = Object.entries(req.query).filter(([k]) => k.startsWith('spec_'));
        for (const [key, rawVal] of specFilters) {
            const field = key.substring(5); // remove spec_
            if (!field) continue;
            if (typeof rawVal !== 'string' || rawVal.trim() === '') continue;

            // Range syntax: a-b (numbers) or single value equality
            if (/^-?\d+(\.\d+)?-?-?\d*(\.\d+)?$/.test(rawVal) && rawVal.includes('-')) {
                const [min, max] = rawVal.split('-');
                if (min) {
                    whereClause += ` AND (specifications->>$${paramIndex})::numeric >= $${paramIndex + 1}`;
                    queryParams.push(field, parseFloat(min));
                    paramIndex += 2;
                }
                if (max) {
                    whereClause += ` AND (specifications->>$${paramIndex})::numeric <= $${paramIndex + 1}`;
                    queryParams.push(field, parseFloat(max));
                    paramIndex += 2;
                }
            } else if (rawVal === 'true' || rawVal === 'false') {
                whereClause += ` AND (LOWER(specifications->>$${paramIndex}) = $${paramIndex + 1})`;
                queryParams.push(field, rawVal.toLowerCase());
                paramIndex += 2;
            } else {
                // Text equality (case-insensitive)
                whereClause += ` AND (specifications->>$${paramIndex}) ILIKE $${paramIndex + 1}`;
                queryParams.push(field, rawVal);
                paramIndex += 2;
            }
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Sanitize sort/order (whitelist columns)
        const allowedSort = ['name', 'price', 'brand', 'created_at'];
        const safeSort = allowedSort.includes(sort) ? sort : 'name';
        const safeOrder = order && order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // ⚡ FIX: Merge pc_parts.specifications with enriched fields from product_specs
        const mainQuery = `
            SELECT 
                pp.id, pp.name, pp.category, pp.brand, pp.price, pp.stock,
                COALESCE(pp.image_url, pp.image_path) AS image_url,
                pp.created_at, pp.description, pp.compatible_sockets, pp.tier,
                COALESCE(
                    pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
                    pp.specifications,
                    '{}'::jsonb
                ) AS specifications
            FROM pc_parts pp
            LEFT JOIN product_specs ps ON pp.id = ps.product_id
            ${whereClause}
            ORDER BY pp.${safeSort} ${safeOrder}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(parseInt(limit), offset);

        // ⚡ FIX: Update count query to match aliased table
        const countQuery = `SELECT COUNT(*) AS total FROM pc_parts pp ${whereClause}`;
        const countParams = queryParams.slice(0, -2);

        const [result, countResult] = await Promise.all([
            query(mainQuery, queryParams),
            query(countQuery, countParams)
        ]);

        const total = parseInt(countResult.rows[0].total) || 0;
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: total,
                itemsPerPage: parseInt(limit),
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            }
        });
    } catch (error) {
        logger.error('Error listing parts:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve parts' });
    }
};

/**
 * GET /api/stock/all-items - Get all stock items across all categories for admin
 * Used specifically for admin stock selection (Add Items to Order)
 */
const getAllStockItems = async (req, res) => {
    try {
        const { q, limit = 1000 } = req.query; // Increased limit to 1000 to ensure all products are included

        // Base clause - get all active items regardless of kiosk visibility
        let whereClause = 'WHERE pp.is_active = true';
        const queryParams = [];
        let paramIndex = 1;

        // Optional search filter
        if (q && q.trim()) {
            whereClause += ` AND (pp.name ILIKE $${paramIndex++} OR pp.brand ILIKE $${paramIndex++} OR pp.category ILIKE $${paramIndex++} OR pp.description ILIKE $${paramIndex++})`;
            const searchTerm = `%${q.trim()}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // ⚡ FIX: Merge enriched specifications for admin stock items
        const mainQuery = `
            SELECT 
                pp.id, pp.name, pp.category, pp.brand, pp.price, 
                pp.stock as stock_quantity,
                COALESCE(pp.image_url, pp.image_path) AS image_url,
                pp.description, pp.compatible_sockets,
                pp.is_active, pp.kiosk_visible,
                pp.created_at, pp.updated_at,
                COALESCE(
                    pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
                    pp.specifications,
                    '{}'::jsonb
                ) AS specifications
            FROM pc_parts pp
            LEFT JOIN product_specs ps ON pp.id = ps.product_id
            ${whereClause}
            ORDER BY pp.category ASC, pp.name ASC
            LIMIT $${paramIndex++}
        `;

        queryParams.push(parseInt(limit));

        const result = await query(mainQuery, queryParams);

        logger.info(`Admin stock search returned ${result.rows.length} items`, {
            service: 'pc-wise-admin',
            searchQuery: q,
            totalResults: result.rows.length
        });

        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        logger.error('Error getting all stock items:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve stock items',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// GET /api/stock/price-range?category=CPU - min/max price for category
const getPriceRange = async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ success: false, message: 'category is required' });
        }
        const result = await query(`
            SELECT MIN(price) AS min_price, MAX(price) AS max_price
            FROM pc_parts
            WHERE is_active = true AND category = $1
        `, [category]);
        const row = result.rows[0] || {};
        res.json({ success: true, data: { min: parseFloat(row.min_price) || 0, max: parseFloat(row.max_price) || 0 } });
    } catch (error) {
        logger.error('Error getting price range:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve price range' });
    }
};

// GET /api/stock/spec-values/:category?field=socket - distinct specification values
const getSpecificationValues = async (req, res) => {
    try {
        const { category } = req.params;
        const { field } = req.query;
        if (!category || !field) {
            return res.status(400).json({ success: false, message: 'category and field are required' });
        }

        // Special handling for direct column fields (name, brand, etc.)
        if (field === 'name') {
            const sql = `
                SELECT DISTINCT name AS value
                FROM pc_parts
                WHERE category = $1 AND is_active = true AND name IS NOT NULL AND name != ''
                ORDER BY name
            `;
            const result = await query(sql, [category]);
            return res.json({ success: true, data: result.rows.map(r => r.value).filter(v => v !== null) });
        }

        // Standard specification field handling
        const sql = `
            SELECT DISTINCT specifications->>$1 AS value
            FROM pc_parts
            WHERE category = $2 AND is_active = true AND specifications ? $1 AND specifications->>$1 IS NOT NULL
            ORDER BY 1
        `;
        const result = await query(sql, [field, category]);
        res.json({ success: true, data: result.rows.map(r => r.value).filter(v => v !== null) });
    } catch (error) {
        logger.error('Error getting specification values:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve specification values' });
    }
};

// GET /api/stock/spec-range/:category - get min/max values for all numeric specification fields in a category
const getSpecificationRange = async (req, res) => {
    try {
        const { category } = req.params;
        if (!category) {
            return res.status(400).json({ success: false, message: 'category is required' });
        }
        
        // Get all numeric fields for this category from specification_schemas
        const numericFields = await query(`
            SELECT field_name FROM specification_schemas 
            WHERE category = $1 AND field_type = 'number'
            ORDER BY field_name
        `, [category]);
        
        if (numericFields.rows.length === 0) {
            return res.json({ 
                success: true, 
                data: {},
                message: `No numeric specifications found for category '${category}'`
            });
        }
        
        const ranges = {};
        
        // Get min/max values for each numeric field
        for (const field of numericFields.rows) {
            const fieldName = field.field_name;
            const sql = `
                SELECT 
                    MIN((specifications->>$1)::numeric) AS min_value,
                    MAX((specifications->>$1)::numeric) AS max_value,
                    COUNT(*) AS total_items
                FROM pc_parts
                WHERE category = $2 
                AND is_active = true 
                AND specifications ? $1 
                AND specifications->>$1 ~ '^[0-9]*\.?[0-9]+$'
            `;
            
            const result = await query(sql, [fieldName, category]);
            const row = result.rows[0] || {};
            
            if (row.min_value !== null && row.max_value !== null) {
                ranges[fieldName] = { 
                    min: parseFloat(row.min_value) || 0, 
                    max: parseFloat(row.max_value) || 0,
                    totalItems: parseInt(row.total_items) || 0
                };
            }
        }
        
        res.json({ 
            success: true, 
            data: ranges,
            category: category
        });
    } catch (error) {
        logger.error('Error getting specification range:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve specification range' });
    }
};

// GET /api/stock/categories - Get list of categories
const getCategories = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                category, 
                COUNT(*) as count
            FROM pc_parts 
            WHERE is_active = true
            GROUP BY category 
            ORDER BY category
        `);

        // Check for Community Build category (Pre-Built with buildSource = 'community')
        // ✅ CRITICAL FIX: Don't filter by is_active for Community Builds - show ALL pending builds
        const communityBuildResult = await query(`
            SELECT COUNT(*) as count
            FROM pc_parts
            WHERE category = 'Pre-Built'
              AND specifications->>'buildSource' = 'community'
        `);

        const communityBuildCount = parseInt(communityBuildResult.rows[0]?.count || 0);

        // Combine regular categories with Community Build
        // Always show Community Build category (even with 0 count) for admin access
        let categories = result.rows;

        // ✅ FIX: Only add Community Build if not already in array (prevent duplication)
        const hasCommunityBuild = categories.some(cat => cat.category === 'Community Build');
        if (!hasCommunityBuild) {
            categories.push({
                category: 'Community Build',
                count: communityBuildCount.toString()
            });
        }

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        logger.error('Error getting categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories'
        });
    }
};

// GET /api/stock/brands - Get list of unique brands (optionally filtered by category)
const getBrands = async (req, res) => {
    try {
        const { category } = req.query;
        
        let sql = `
            SELECT DISTINCT brand
            FROM pc_parts 
            WHERE brand IS NOT NULL AND is_active = true
        `;
        
        const params = [];
        
        // Add category filter if provided
        if (category) {
            sql += ` AND category = $1`;
            params.push(category);
        }
        
        sql += ` ORDER BY brand`;

        const result = await query(sql, params);

        res.json({
            success: true,
            data: result.rows.map(row => row.brand)
        });

    } catch (error) {
        logger.error('Error getting brands:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve brands'
        });
    }
};

// GET /api/stock/brand-suggestions/:category - Get brand suggestions for autocomplete
const getBrandSuggestions = async (req, res) => {
    try {
        const { category } = req.params;

        const sql = `
            SELECT DISTINCT brand 
            FROM pc_parts 
            WHERE is_active = true 
            AND category = $1 
            AND brand IS NOT NULL 
            AND brand != ''
            ORDER BY brand
        `;

        const result = await query(sql, [category]);

        res.json({
            success: true,
            data: result.rows.map(row => row.brand)
        });
    } catch (error) {
        logger.error('Error fetching brand suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brand suggestions'
        });
    }
};

// GET /api/stock/brands/counts - Get brands with their item counts for a category
const getBrandsWithCounts = async (req, res) => {
    try {
        const { category } = req.query;
        
        let sql = `
            SELECT brand, COUNT(*) as item_count,
                   COUNT(*) as total_count
            FROM pc_parts 
            WHERE brand IS NOT NULL AND is_active = true AND kiosk_visible = true
        `;
        
        const params = [];
        
        // Add category filter if provided
        if (category) {
            sql += ` AND category = $1`;
            params.push(category);
        }
        
        sql += ` GROUP BY brand ORDER BY brand`;

        const result = await query(sql, params);

        // Also get total count for the category
        let totalCountSql = `
            SELECT COUNT(*) as total
            FROM pc_parts 
            WHERE is_active = true AND kiosk_visible = true
        `;
        
        const totalParams = [];
        if (category) {
            totalCountSql += ` AND category = $1`;
            totalParams.push(category);
        }

        const totalResult = await query(totalCountSql, totalParams);
        const totalItems = parseInt(totalResult.rows[0]?.total || 0);

        res.json({
            success: true,
            data: {
                brands: result.rows.map(row => ({
                    name: row.brand,
                    count: parseInt(row.item_count)
                })),
                totalItems: totalItems
            }
        });

    } catch (error) {
        logger.error('Error getting brands with counts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve brand counts'
        });
    }
};

// GET /api/stock/stats - Get inventory statistics
const getStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_products,
                SUM(stock) as total_stock,
                SUM(price * stock) as total_value,
                COUNT(DISTINCT category) as total_categories,
                COUNT(DISTINCT brand) as total_brands
            FROM pc_parts
        `;

        const result = await query(statsQuery);
        const stats = result.rows[0];

        res.json({
            success: true,
            data: {
                totalProducts: parseInt(stats.total_products) || 0,
                totalStock: parseInt(stats.total_stock) || 0,
                totalValue: parseFloat(stats.total_value) || 0,
                totalCategories: parseInt(stats.total_categories) || 0,
                totalBrands: parseInt(stats.total_brands) || 0
            }
        });

    } catch (error) {
        logger.error('Error getting stock stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve stock statistics'
        });
    }
};

// GET /api/stock/:id - Get single part
const get = async (req, res) => {
    try {
        const { id } = req.params;

        if (isTest) {
            const item = findPartById(id);
            if (!item) {
                return res.status(404).json({ success: false, message: 'Part not found' });
            }
            return res.json({
                success: true,
                data: {
                    ...item,
                    image_url: item.image_url || '/test/image.png'
                }
            });
        }

        const result = await query(`
            SELECT * FROM pc_parts WHERE id = $1 AND is_active = true
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error getting part:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve part'
        });
    }
};

// GET /api/stock/meta/:category - Get specification fields for category
const getPartSpecFields = async (req, res) => {
    try {
        const { category } = req.params;

        if (isTest) {
            const specFields = [
                { name: 'socket', type: 'text', required: false },
                { name: 'cores', type: 'number', required: false },
                { name: 'threads', type: 'number', required: false },
                { name: 'integrated_gpu', type: 'boolean', required: false },
                { name: 'base_clock', type: 'text', required: false }
            ];
            return res.json({ success: true, data: { fields: specFields } });
        }
        
        // Get specification fields from database
        const result = await query(`
            SELECT field_name, field_type, is_required, default_value
            FROM specification_schemas 
            WHERE category = $1 
            ORDER BY field_name
        `, [category]);

        const specFields = result.rows.map(row => ({
            name: row.field_name,
            type: row.field_type,
            required: row.is_required,
            defaultValue: row.default_value
        }));

        logger.info(`Retrieved ${specFields.length} specification fields for category: ${category}`);

        // 🔥 FIX: Frontend expects data.fields, not just data
        res.json({
            success: true,
            data: {
                fields: specFields
            }
        });
    } catch (error) {
        logger.error('Error getting spec fields:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve specification fields'
        });
    }
};

// Helper function to convert specification values based on their types
const convertSpecificationValues = async (category, specifications) => {
    try {
        if (!specifications || typeof specifications !== 'object') {
            return {};
        }

        // 🔥 CRITICAL FIX: Skip conversion for Pre-Built category
        // Pre-Built specs contain nested arrays/objects that must be preserved
        if (category === 'Pre-Built') {
            logger.info('Skipping specification conversion for Pre-Built category (preserving nested structures)');
            return specifications;
        }

        // Get field types from database
        const result = await query(`
            SELECT field_name, field_type
            FROM specification_schemas 
            WHERE category = $1
        `, [category]);

        const fieldTypes = {};
        result.rows.forEach(row => {
            fieldTypes[row.field_name] = row.field_type;
        });

        const convertedSpecs = {};
        for (const [key, value] of Object.entries(specifications)) {
            if (value === null || value === undefined || value === '') {
                convertedSpecs[key] = null;
                continue;
            }

            const fieldType = fieldTypes[key];
            
            switch (fieldType) {
                case 'boolean':
                    // Convert string 'true'/'false' or actual boolean to boolean
                    convertedSpecs[key] = value === true || value === 'true' || value === '1';
                    break;
                case 'number':
                    // Convert to number, handle invalid numbers
                    const numValue = Number(value);
                    convertedSpecs[key] = isNaN(numValue) ? null : numValue;
                    break;
                case 'text':
                default:
                    // Keep as string, trim whitespace
                    convertedSpecs[key] = String(value).trim() || null;
                    break;
            }
        }

        logger.info(`Converted specifications for ${category}:`, { original: specifications, converted: convertedSpecs });
        return convertedSpecs;
    } catch (error) {
        logger.error('Error converting specification values:', error);
        return specifications; // Return original on error
    }
};

// Multer configuration for file uploads
const fs = require('fs');

// Create per-category directory structure
const createCategoryDirs = () => {
    const categories = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling', 'monitor', 'mouse', 'keyboard', 'speakers', 'headphones', 'webcam'];
    const baseDir = path.join(__dirname, '..', 'public', 'assets', 'parts');
    
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
    
    categories.forEach(category => {
        const categoryDir = path.join(baseDir, category);
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
            logger.info(`📁 Created category directory: ${categoryDir}`);
        }
    });
};

// Initialize directory structure
createCategoryDirs();

// Sanitize filename while preserving original name readability
const sanitizeFilename = (filename) => {
    // Remove unsafe characters but keep readable format
    return filename
        .replace(/[^\w\s.-]/g, '') // Remove special chars except word chars, spaces, dots, dashes
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .toLowerCase();
};

// Map standard categories to folder names
const getCategoryFolderName = (category) => {
    const mapping = {
        'CPU': 'cpu',
        'Motherboard': 'motherboard', 
        'RAM': 'ram',
        'Storage': 'storage',
        'GPU': 'gpu',
        'PSU': 'psu',
        'Case': 'case',
        'Cooling': 'cooling',
        'Monitor': 'monitor',
        'Headphones': 'headphones',
        'Keyboard': 'keyboard',
        'Mouse': 'mouse',
        'Speakers': 'speakers',
        'Webcam': 'webcam'
    };
    return mapping[category] || 'other';
};

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            // Get category from request body, query params, or existing product
            let category = req.body.category || req.query.category;
            
            // If updating existing product, get category from database
            if (!category && req.params.id) {
                try {
                    const result = await query('SELECT category FROM pc_parts WHERE id = $1', [req.params.id]);
                    if (result.rows.length > 0) {
                        category = result.rows[0].category;
                    }
                } catch (error) {
                    logger.error('Error getting category from database:', error);
                }
            }
            
            // Default to 'other' if no category found
            const folderName = getCategoryFolderName(category || 'other');
            const categoryDir = path.join(__dirname, '..', 'public', 'assets', 'parts', folderName);
            
            // Ensure category directory exists
            if (!fs.existsSync(categoryDir)) {
                fs.mkdirSync(categoryDir, { recursive: true });
                logger.info(`📁 Created new category directory: ${categoryDir}`);
            }
            
            logger.info(`📂 Saving image to category folder: ${folderName}`);
            cb(null, categoryDir);
        } catch (error) {
            logger.error('❌ Error setting destination:', error);
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        try {
            // Extract file extension
            const ext = path.extname(file.originalname).toLowerCase();
            
            // Create sanitized friendly filename
            const originalName = path.basename(file.originalname, ext);
            const sanitizedName = sanitizeFilename(originalName);
            
            // Add timestamp to avoid conflicts while keeping original name recognizable
            const timestamp = Date.now();
            const finalName = `${sanitizedName}-${timestamp}${ext}`;
            
            logger.info(`📄 Generated filename: ${finalName} (from: ${file.originalname})`);
            cb(null, finalName);
        } catch (error) {
            logger.error('❌ Error generating filename:', error);
            // Fallback to simple naming
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'part-' + uniqueSuffix + path.extname(file.originalname));
        }
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// POST /api/stock - Create new part
const create = async (req, res) => {
    try {
        const { name, category, brand, price, stock, description, specifications, tier } = req.body;

        if (isTest) {
            const parsedSpecifications = typeof specifications === 'string' ? JSON.parse(specifications) : (specifications || {});
            const newItem = createPart({
                name,
                category,
                brand,
                price: parseFloat(price),
                stock: parseInt(stock),
                description: description || '',
                specifications: parsedSpecifications,
                tier
            });
            return res.status(201).json({ success: true, data: newItem, message: 'Part created (test mode)' });
        }
        
        // Normalize tier value to match database constraint
        const normalizedTier = normalizeTierValue(tier);
        
        // Generate category-based image URL if file uploaded
        let image_url = null;
        if (req.file) {
            const categoryFolderName = getCategoryFolderName(category);
            image_url = `/assets/parts/${categoryFolderName}/${req.file.filename}`;
            logger.info(`🖼️ Generated image URL: ${image_url}`);
        }

        // Parse specifications if it's a JSON string
        let parsedSpecifications = null;
        if (specifications) {
            try {
                parsedSpecifications = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
                logger.info('📋 Parsed specifications for create:', parsedSpecifications);
                
                // Convert specification values based on their types
                parsedSpecifications = await convertSpecificationValues(category, parsedSpecifications);
                logger.info('🔄 Converted specifications for create:', parsedSpecifications);
            } catch (error) {
                logger.error('❌ Error parsing specifications:', error);
                parsedSpecifications = null;
            }
        }

        // Get the next available ID for this category
        const nextId = await getNextCategoryId(category);
        logger.info(`🆔 Generated ID ${nextId} for category ${category}`);

        // Get the category table name
        const categoryTable = getCategoryTableMapping(category);
        
        // Start transaction
        await query('BEGIN');

        try {
            // Insert into pc_parts table with the correct ID
            const pcPartsResult = await query(`
                INSERT INTO pc_parts (id, name, category, brand, price, stock, description, specifications, image_url, tier)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `, [nextId, name, category, brand, parseFloat(price), parseInt(stock), description, parsedSpecifications, image_url, normalizedTier]);

            // Insert into category-specific table if it exists and has specifications
            // DISABLED: We're using JSONB specifications in pc_parts table instead of separate category tables
            // if (categoryTable && parsedSpecifications) {
            //     await insertIntoCategoryTable(categoryTable, nextId, name, parsedSpecifications, parseFloat(price));
            // }

            // Commit transaction
            await query('COMMIT');

            logger.info(`New part created: ${name}`, { partId: nextId, category, categoryTable });

            res.status(201).json({
                success: true,
                data: pcPartsResult.rows[0],
                message: 'Part created successfully'
            });
        } catch (innerError) {
            // Rollback transaction on error
            await query('ROLLBACK');
            throw innerError;
        }
    } catch (error) {
        logger.error('Error creating part:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create part: ' + error.message
        });
    }
};

// Helper function to insert into category-specific tables
const insertIntoCategoryTable = async (tableName, id, name, specifications, price) => {
    try {
        logger.info(`📝 Inserting into ${tableName} table:`, { id, name, specifications });

        switch (tableName) {
            case 'pc_case':
                await query(`
                    INSERT INTO pc_case (id, name, category, color, fans_included, price, case_category, max_gpu_length, max_cpu_cooler_height, motherboard_support, tempered_glass)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    id,
                    name,
                    specifications.category || null,
                    specifications.color || null,
                    specifications.fans_included ? parseInt(specifications.fans_included) : null,
                    price,
                    specifications.case_category || null,
                    specifications.max_gpu_length || null,
                    specifications.max_cpu_cooler_height || null,
                    specifications.motherboard_support || null,
                    specifications.tempered_glass === 'true' || specifications.tempered_glass === true
                ]);
                break;

            case 'cpu':
                await query(`
                    INSERT INTO cpu (id, name, socket, series, base_clock, turbo_clock, cores, threads, integrated_gpu, max_ram, lithography, tdp, price)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                    id, name,
                    specifications.socket || null,
                    specifications.series || null,
                    specifications.base_clock ? parseFloat(specifications.base_clock) : null,
                    specifications.turbo_clock ? parseFloat(specifications.turbo_clock) : null,
                    specifications.cores ? parseInt(specifications.cores) : null,
                    specifications.threads ? parseInt(specifications.threads) : null,
                    specifications.integrated_gpu === 'true' || specifications.integrated_gpu === true,
                    specifications.max_ram ? parseInt(specifications.max_ram) : null,
                    specifications.lithography ? parseInt(specifications.lithography) : null,
                    specifications.tdp ? parseInt(specifications.tdp) : null,
                    price
                ]);
                break;

            case 'gpu':
                await query(`
                    INSERT INTO gpu (id, name, memory_type, memory_capacity, core_clock, boost_clock, effective_clock, interface, frame_sync, length, tdp, pcie_8pin, ports_display, ports_hdmi, fans, price)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                `, [
                    id, name,
                    specifications.memory_type || null,
                    specifications.memory_capacity ? parseInt(specifications.memory_capacity) : null,
                    specifications.core_clock ? parseFloat(specifications.core_clock) : null,
                    specifications.boost_clock ? parseFloat(specifications.boost_clock) : null,
                    specifications.effective_clock ? parseFloat(specifications.effective_clock) : null,
                    specifications.interface || null,
                    specifications.frame_sync || null,
                    specifications.length ? parseInt(specifications.length) : null,
                    specifications.tdp ? parseInt(specifications.tdp) : null,
                    specifications.pcie_8pin ? parseInt(specifications.pcie_8pin) : null,
                    specifications.ports_display ? parseInt(specifications.ports_display) : null,
                    specifications.ports_hdmi ? parseInt(specifications.ports_hdmi) : null,
                    specifications.fans || null,
                    price
                ]);
                break;

            case 'ram':
                await query(`
                    INSERT INTO ram (id, name, memory_type, configuration, speed, voltage, cas_latency, total_capacity, price)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    id, name,
                    specifications.memory_type || null,
                    specifications.configuration || null,
                    specifications.speed ? parseInt(specifications.speed) : null,
                    specifications.voltage ? parseFloat(specifications.voltage) : null,
                    specifications.cas_latency || null,
                    specifications.total_capacity || null,
                    price
                ]);
                break;

            case 'storage':
                await query(`
                    INSERT INTO storage (id, name, capacity, interface, form_factor, read_speed, write_speed)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    id, name,
                    specifications.capacity || null,
                    specifications.interface || null,
                    specifications.form_factor || null,
                    specifications.read_speed || null,
                    specifications.write_speed || null
                ]);
                break;

            case 'motherboard':
                await query(`
                    INSERT INTO motherboard (id, name, socket, chipset, form_factor, ram_slots, max_ram)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    id, name,
                    specifications.socket || null,
                    specifications.chipset || null,
                    specifications.form_factor || null,
                    specifications.ram_slots ? parseInt(specifications.ram_slots) : null,
                    specifications.max_ram || null
                ]);
                break;

            case 'psu':
                await query(`
                    INSERT INTO psu (id, name, wattage, efficiency, modular, certification)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    id, name,
                    specifications.wattage ? parseInt(specifications.wattage) : null,
                    specifications.efficiency || null,
                    specifications.modular === 'true' || specifications.modular === true,
                    specifications.certification || null
                ]);
                break;

            case 'cooling':
                await query(`
                    INSERT INTO cooling (id, name, type, socket_compatibility, max_tdp, noise_level)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    id, name,
                    specifications.type || null,
                    specifications.socket_compatibility || null,
                    specifications.max_tdp ? parseInt(specifications.max_tdp) : null,
                    specifications.noise_level || null
                ]);
                break;

            // Add other category tables as needed
            default:
                logger.info(`⚠️ No specific table handler for ${tableName}`);
        }

        logger.info(`✅ Successfully inserted into ${tableName} table`);
    } catch (error) {
        logger.error(`❌ Error inserting into ${tableName}:`, error);
        throw error;
    }
};

// POST /api/stock/:id/image - Upload part image
const uploadImage = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        // Get product category to build correct image URL
        const productResult = await query('SELECT category FROM pc_parts WHERE id = $1', [id]);
        
        if (productResult.rows.length === 0) {
            // Clean up uploaded file since product wasn't found
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const category = productResult.rows[0].category;
        const categoryFolderName = getCategoryFolderName(category);
        const image_url = `/assets/parts/${categoryFolderName}/${req.file.filename}`;
        
        logger.info(`🖼️ Updating image for product ${id} in category ${category}: ${image_url}`);
        
        const result = await query(`
            UPDATE pc_parts SET image_url = $1, updated_at = NOW() WHERE id = $2
            RETURNING *
        `, [image_url, id]);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Image uploaded successfully',
            imageInfo: {
                originalName: req.file.originalname,
                filename: req.file.filename,
                category: category,
                categoryFolder: categoryFolderName,
                url: image_url
            }
        });
    } catch (error) {
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        logger.error('Error uploading image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image'
        });
    }
};

// PATCH /api/stock/:id - Update part
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, brand, price, stock, description, specifications, tier } = req.body;

        if (isTest) {
            const item = findPartById(id);
            if (!item) {
                return res.status(404).json({ success: false, message: 'Part not found' });
            }
            const parsedSpecifications = specifications !== undefined
                ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications)
                : item.specifications;
            updatePart(id, {
                name: name ?? item.name,
                category: category ?? item.category,
                brand: brand ?? item.brand,
                price: price !== undefined ? parseFloat(price) : item.price,
                stock: stock !== undefined ? parseInt(stock) : item.stock,
                description: description !== undefined ? description : item.description,
                specifications: parsedSpecifications,
                tier: tier ?? item.tier
            });
            const updated = findPartById(id);
            return res.json({ success: true, data: updated, message: 'Part updated (test mode)' });
        }
        
        // 🐛 DEBUG: Log all received data
        logger.info('🔍 DEBUG - Update Request Data:');
        logger.info('  ID:', id);
        logger.info('  Name:', name);
        logger.info('  Category:', category);
        logger.info('  Brand:', brand);
        logger.info('  Price:', price);
        logger.info('  Stock:', stock);
        logger.info('  Description:', description);
        logger.info('  Description type:', typeof description);
        logger.info('  Description length:', description ? description.length : 'null/undefined');
        logger.info('  Specifications:', specifications);
        logger.info('  Request body keys:', Object.keys(req.body));
        logger.info('  Full req.body:', req.body);
        
        // Generate category-based image URL if file uploaded
        let image_url = undefined;
        if (req.file) {
            const categoryFolderName = getCategoryFolderName(category || 'other');
            image_url = `/assets/parts/${categoryFolderName}/${req.file.filename}`;
            logger.info(`🖼️ Generated update image URL: ${image_url}`);
        }

        // Parse specifications if it's a JSON string
        let parsedSpecifications = undefined;
        if (specifications !== undefined) {
            try {
                parsedSpecifications = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
                logger.info('📋 Parsed specifications for update:', parsedSpecifications);
                
                // Convert specification values based on their types (if we have category info)
                if (parsedSpecifications && category) {
                    parsedSpecifications = await convertSpecificationValues(category, parsedSpecifications);
                    logger.info('🔄 Converted specifications for update:', parsedSpecifications);
                }
            } catch (error) {
                logger.error('❌ Error parsing specifications:', error);
                parsedSpecifications = null;
            }
        }

        // Get current item to know its category
        const currentItem = await query('SELECT * FROM pc_parts WHERE id = $1', [id]);
        if (currentItem.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Part not found'
            });
        }

        const currentCategory = currentItem.rows[0].category;
        const categoryTable = getCategoryTableMapping(currentCategory);

        // Start transaction
        await query('BEGIN');

        try {
            // Build dynamic update query for pc_parts
            let updateFields = [];
            let values = [];
            let paramIndex = 1;

            if (name !== undefined) {
                updateFields.push(`name = $${paramIndex++}`);
                values.push(name);
            }
            if (category !== undefined) {
                updateFields.push(`category = $${paramIndex++}`);
                values.push(category);
            }
            if (brand !== undefined) {
                updateFields.push(`brand = $${paramIndex++}`);
                values.push(brand);
            }
            if (price !== undefined) {
                updateFields.push(`price = $${paramIndex++}`);
                values.push(parseFloat(price));
            }
            if (stock !== undefined) {
                updateFields.push(`stock = $${paramIndex++}`);
                values.push(parseInt(stock));
            }
            if (description !== undefined) {
                logger.info('🔍 DEBUG - Adding description to update fields:', description);
                updateFields.push(`description = $${paramIndex++}`);
                values.push(description);
            }
            if (tier !== undefined) {
                const normalizedTier = normalizeTierValue(tier);
                updateFields.push(`tier = $${paramIndex++}`);
                values.push(normalizedTier);
                logger.info('🏆 DEBUG - Adding tier to update:', tier, '→', normalizedTier);
            }
            if (specifications !== undefined) {
                updateFields.push(`specifications = $${paramIndex++}`);
                values.push(parsedSpecifications);
            }
            if (image_url !== undefined) {
                updateFields.push(`image_url = $${paramIndex++}`);
                values.push(image_url);
            }

            logger.info('🔍 DEBUG - Update fields:', updateFields);
            logger.info('🔍 DEBUG - Update values:', values);

            if (updateFields.length === 0) {
                await query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
            }

            values.push(id);
            const updateQuery = `
                UPDATE pc_parts 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            logger.info('🔍 DEBUG - Final SQL Query:', updateQuery);
            logger.info('🔍 DEBUG - Final Query Values:', values);

            const result = await query(updateQuery, values);

            logger.info('🔍 DEBUG - Query result:', result.rows[0]);

            // Update category-specific table if specifications were updated
            // DISABLED: We're using JSONB specifications in pc_parts table instead of separate category tables
            // if (specifications !== undefined && parsedSpecifications && categoryTable) {
            //     await updateCategoryTable(categoryTable, id, name || currentItem.rows[0].name, parsedSpecifications, price !== undefined ? parseFloat(price) : currentItem.rows[0].price);
            // }

            // Commit transaction
            await query('COMMIT');

            // ⚡ EXPLICIT CACHE INVALIDATION FIX
            // Force immediate cache invalidation for this product
            // This prevents the 3-5 minute stale data issue
            try {
                const { getQueryCache } = require('../utils/inMemoryCache');
                const cache = getQueryCache();
                if (cache && typeof cache.invalidate === 'function') {
                    await cache.invalidate([
                        `products:*`,
                        `search:*`,
                        `stats:*`
                    ]);
                    logger.info(`🧹 Explicit cache invalidated for product ${id} after update`);
                }
            } catch (cacheError) {
                logger.warn('⚠️ Cache invalidation warning (non-critical):', cacheError.message);
            }

            logger.info(`Part updated: ${result.rows[0].name}`, { partId: id });

            // PHASE 3.2 WEEK 2: Broadcast stock update via WebSocket
            try {
                if (stock !== undefined && global.websocketService) {
                    const oldStock = currentItem.rows[0].stock;
                    const newStock = parseInt(stock);
                    
                    if (oldStock !== newStock) {
                        global.websocketService.broadcastStockUpdate(id, newStock, oldStock);
                        logger.info('📡 WebSocket: Stock update broadcasted', { 
                            productId: id, 
                            oldStock, 
                            newStock,
                            product: result.rows[0].name 
                        });
                    }
                }
                
                // Broadcast price change via WebSocket
                if (price !== undefined && global.websocketService) {
                    const oldPrice = parseFloat(currentItem.rows[0].price);
                    const newPrice = parseFloat(price);
                    
                    if (oldPrice !== newPrice) {
                        const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
                        global.websocketService.broadcastPriceChange(id, newPrice, oldPrice, changePercent);
                        logger.info('💰 WebSocket: Price change broadcasted', { 
                            productId: id, 
                            oldPrice, 
                            newPrice, 
                            changePercent: changePercent.toFixed(2) + '%',
                            product: result.rows[0].name 
                        });
                    }
                }
            } catch (wsError) {
                logger.warn('⚠️ WebSocket broadcasting failed:', wsError.message);
                // Don't fail the update if WebSocket fails
            }

            res.json({
                success: true,
                data: result.rows[0],
                message: 'Part updated successfully'
            });
        } catch (innerError) {
            // Rollback transaction on error
            await query('ROLLBACK');
            throw innerError;
        }
    } catch (error) {
        logger.error('Error updating part:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update part: ' + error.message
        });
    }
};

// Helper function to update category-specific tables
const updateCategoryTable = async (tableName, id, name, specifications, price) => {
    try {
        logger.info(`📝 Updating ${tableName} table:`, { id, name, specifications });

        switch (tableName) {
            case 'pc_case':
                await query(`
                    UPDATE pc_case SET 
                        name = $2,
                        category = $3,
                        color = $4,
                        fans_included = $5,
                        price = $6,
                        case_category = $7,
                        max_gpu_length = $8,
                        max_cpu_cooler_height = $9,
                        motherboard_support = $10,
                        tempered_glass = $11,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id,
                    name,
                    specifications.category || null,
                    specifications.color || null,
                    specifications.fans_included ? parseInt(specifications.fans_included) : null,
                    price,
                    specifications.case_category || null,
                    specifications.max_gpu_length || null,
                    specifications.max_cpu_cooler_height || null,
                    specifications.motherboard_support || null,
                    specifications.tempered_glass === 'true' || specifications.tempered_glass === true
                ]);
                break;

            case 'cpu':
                await query(`
                    UPDATE cpu SET
                        name = $2,
                        socket = $3,
                        series = $4,
                        base_clock = $5,
                        turbo_clock = $6,
                        cores = $7,
                        threads = $8,
                        integrated_gpu = $9,
                        max_ram = $10,
                        lithography = $11,
                        tdp = $12,
                        price = $13,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.socket || null,
                    specifications.series || null,
                    specifications.base_clock ? parseFloat(specifications.base_clock) : null,
                    specifications.turbo_clock ? parseFloat(specifications.turbo_clock) : null,
                    specifications.cores ? parseInt(specifications.cores) : null,
                    specifications.threads ? parseInt(specifications.threads) : null,
                    specifications.integrated_gpu === 'true' || specifications.integrated_gpu === true,
                    specifications.max_ram ? parseInt(specifications.max_ram) : null,
                    specifications.lithography ? parseInt(specifications.lithography) : null,
                    specifications.tdp ? parseInt(specifications.tdp) : null,
                    price
                ]);
                break;

            case 'gpu':
                await query(`
                    UPDATE gpu SET
                        name = $2,
                        memory_type = $3,
                        memory_capacity = $4,
                        core_clock = $5,
                        boost_clock = $6,
                        effective_clock = $7,
                        interface = $8,
                        frame_sync = $9,
                        length = $10,
                        tdp = $11,
                        pcie_8pin = $12,
                        ports_display = $13,
                        ports_hdmi = $14,
                        fans = $15,
                        price = $16,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.memory_type || null,
                    specifications.memory_capacity ? parseInt(specifications.memory_capacity) : null,
                    specifications.core_clock ? parseFloat(specifications.core_clock) : null,
                    specifications.boost_clock ? parseFloat(specifications.boost_clock) : null,
                    specifications.effective_clock ? parseFloat(specifications.effective_clock) : null,
                    specifications.interface || null,
                    specifications.frame_sync || null,
                    specifications.length ? parseInt(specifications.length) : null,
                    specifications.tdp ? parseInt(specifications.tdp) : null,
                    specifications.pcie_8pin ? parseInt(specifications.pcie_8pin) : null,
                    specifications.ports_display ? parseInt(specifications.ports_display) : null,
                    specifications.ports_hdmi ? parseInt(specifications.ports_hdmi) : null,
                    specifications.fans || null,
                    price
                ]);
                break;

            case 'ram':
                await query(`
                    UPDATE ram SET
                        name = $2,
                        memory_type = $3,
                        configuration = $4,
                        speed = $5,
                        voltage = $6,
                        cas_latency = $7,
                        total_capacity = $8,
                        price = $9,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.memory_type || null,
                    specifications.configuration || null,
                    specifications.speed ? parseInt(specifications.speed) : null,
                    specifications.voltage ? parseFloat(specifications.voltage) : null,
                    specifications.cas_latency || null,
                    specifications.total_capacity || null,
                    price
                ]);
                break;

            case 'storage':
                await query(`
                    UPDATE storage SET
                        name = $2,
                        capacity = $3,
                        storage_type = $4,
                        interface = $5,
                        form_factor = $6,
                        read_speed = $7,
                        write_speed = $8,
                        nvme_support = $9,
                        cache = $10,
                        m2_type = $11,
                        price = $12,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.capacity || null,
                    specifications.storage_type || null,
                    specifications.interface || null,
                    specifications.form_factor || null,
                    specifications.read_speed || null,
                    specifications.write_speed || null,
                    specifications.nvme_support === 'true' || specifications.nvme_support === true,
                    specifications.cache || null,
                    specifications.m2_type || null,
                    price
                ]);
                break;

            case 'motherboard':
                await query(`
                    UPDATE motherboard SET
                        name = $2,
                        socket = $3,
                        chipset = $4,
                        memory_type = $5,
                        max_ram = $6,
                        ram_slots = $7,
                        m2_slots = $8,
                        ethernet_ports = $9,
                        wireless_networking = $10,
                        integrated_gpu_support = $11,
                        price = $12,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.socket || null,
                    specifications.chipset || null,
                    specifications.memory_type || null,
                    specifications.max_ram ? parseInt(specifications.max_ram) : null,
                    specifications.ram_slots ? parseInt(specifications.ram_slots) : null,
                    specifications.m2_slots ? parseInt(specifications.m2_slots) : null,
                    specifications.ethernet_ports ? parseInt(specifications.ethernet_ports) : null,
                    specifications.wireless_networking === 'true' || specifications.wireless_networking === true,
                    specifications.integrated_gpu_support === 'true' || specifications.integrated_gpu_support === true,
                    price
                ]);
                break;

            case 'psu':
                await query(`
                    UPDATE psu SET
                        name = $2,
                        form_factor = $3,
                        efficiency_rating = $4,
                        wattage = $5,
                        length = $6,
                        modular = $7,
                        pcie_connectors = $8,
                        sata_connectors = $9,
                        price = $10,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.form_factor || null,
                    specifications.efficiency_rating || null,
                    specifications.wattage ? parseInt(specifications.wattage) : null,
                    specifications.length ? parseInt(specifications.length) : null,
                    specifications.modular === 'true' || specifications.modular === true,
                    specifications.pcie_connectors || null,
                    specifications.sata_connectors || null,
                    price
                ]);
                break;

            case 'cooling':
                await query(`
                    UPDATE cooling SET
                        name = $2,
                        max_rpm = $3,
                        max_noise = $4,
                        height = $5,
                        water_cooled = $6,
                        fanless = $7,
                        price = $8,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.max_rpm ? parseInt(specifications.max_rpm) : null,
                    specifications.max_noise ? parseFloat(specifications.max_noise) : null,
                    specifications.height ? parseInt(specifications.height) : null,
                    specifications.water_cooled === 'true' || specifications.water_cooled === true,
                    specifications.fanless === 'true' || specifications.fanless === true,
                    price
                ]);
                break;

            case 'monitor':
                await query(`
                    UPDATE monitor SET
                        name = $2,
                        screen_size = $3,
                        resolution = $4,
                        refresh_rate = $5,
                        response_time = $6,
                        panel_type = $7,
                        aspect_ratio = $8,
                        curved = $9,
                        vesa_mount = $10,
                        price = $11,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.screen_size || null,
                    specifications.resolution || null,
                    specifications.refresh_rate ? parseInt(specifications.refresh_rate) : null,
                    specifications.response_time ? parseFloat(specifications.response_time) : null,
                    specifications.panel_type || null,
                    specifications.aspect_ratio || null,
                    specifications.curved === 'true' || specifications.curved === true,
                    specifications.vesa_mount || null,
                    price
                ]);
                break;

            case 'keyboard':
                await query(`
                    UPDATE keyboard SET
                        name = $2,
                        style = $3,
                        switch_type = $4,
                        backlit = $5,
                        tenkeyless = $6,
                        connection_type = $7,
                        color = $8,
                        polling_rate = $9,
                        price = $10,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.style || null,
                    specifications.switch_type || null,
                    specifications.backlit === 'true' || specifications.backlit === true,
                    specifications.tenkeyless === 'true' || specifications.tenkeyless === true,
                    specifications.connection_type || null,
                    specifications.color || null,
                    specifications.polling_rate || null,
                    price
                ]);
                break;

            case 'mouse':
                await query(`
                    UPDATE mouse SET
                        name = $2,
                        tracking_method = $3,
                        connection_type = $4,
                        dpi = $5,
                        hand_orientation = $6,
                        color = $7,
                        programmable_buttons = $8,
                        polling_rate = $9,
                        price = $10,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.tracking_method || null,
                    specifications.connection_type || null,
                    specifications.dpi ? parseInt(specifications.dpi) : null,
                    specifications.hand_orientation || null,
                    specifications.color || null,
                    specifications.programmable_buttons || null,
                    specifications.polling_rate || null,
                    price
                ]);
                break;

            case 'headphones':
                await query(`
                    UPDATE headphones SET
                        name = $2,
                        type = $3,
                        frequency = $4,
                        microphone = $5,
                        wireless = $6,
                        enclosure = $7,
                        color = $8,
                        price = $9,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.type || null,
                    specifications.frequency || null,
                    specifications.microphone === 'true' || specifications.microphone === true,
                    specifications.wireless === 'true' || specifications.wireless === true,
                    specifications.enclosure || null,
                    specifications.color || null,
                    price
                ]);
                break;

            case 'speakers':
                await query(`
                    UPDATE speakers SET
                        name = $2,
                        configuration = $3,
                        total_wattage = $4,
                        frequency_response = $5,
                        color = $6,
                        price = $7,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.configuration || null,
                    specifications.total_wattage ? parseInt(specifications.total_wattage) : null,
                    specifications.frequency_response || null,
                    specifications.color || null,
                    price
                ]);
                break;

            case 'webcam':
                await query(`
                    UPDATE webcam SET
                        name = $2,
                        resolution = $3,
                        connection = $4,
                        focus_type = $5,
                        operating_system = $6,
                        fov_angle = $7,
                        frame_rate = $8,
                        microphone_builtin = $9,
                        price = $10,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    id, name,
                    specifications.resolution || null,
                    specifications.connection || null,
                    specifications.focus_type || null,
                    specifications.operating_system || null,
                    specifications.fov_angle ? parseInt(specifications.fov_angle) : null,
                    specifications.frame_rate || null,
                    specifications.microphone_builtin === 'true' || specifications.microphone_builtin === true,
                    price
                ]);
                break;

            default:
                logger.info(`⚠️ No specific table handler for ${tableName}`);
        }

        logger.info(`✅ Successfully updated ${tableName} table`);
    } catch (error) {
        logger.error(`❌ Error updating ${tableName}:`, error);
        throw error;
    }
};

// DELETE /api/stock/:id - Soft delete part with pre-built PC history
const deletePart = async (req, res) => {
    try {
        const { id } = req.params;

        // First, get the full item data
        const itemResult = await query(`
            SELECT * FROM pc_parts WHERE id = $1
        `, [id]);

        if (itemResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Part not found'
            });
        }

        const item = itemResult.rows[0];
        const userId = req.user ? req.user.id : null;

        // If this is a pre-built PC, save to history before deleting
        if (item.category === 'Pre-Built') {
            try {
                await query(`
                    INSERT INTO pre_built_pc_history 
                    (pre_built_pc_id, snapshot_data, action, action_by, notes)
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    id,
                    JSON.stringify(item),
                    'deleted',
                    userId,
                    `Pre-built PC "${item.name}" deleted - ID will remain in transaction history`
                ]);
                
                logger.info(`Pre-built PC history saved before deletion`, { pcId: id, name: item.name });
            } catch (historyError) {
                logger.error('Error saving pre-built PC history:', historyError);
                // Continue with deletion even if history save fails
            }
        }

        // Perform soft delete
        const result = await query(`
            UPDATE pc_parts 
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [id]);

        logger.info(`Part deleted: ${result.rows[0].name}`, { 
            partId: id, 
            category: item.category,
            historySaved: item.category === 'Pre-Built'
        });

        res.json({
            success: true,
            message: item.category === 'Pre-Built' 
                ? 'Pre-built PC deleted successfully. History preserved for transaction records.' 
                : 'Part deleted successfully',
            historySaved: item.category === 'Pre-Built'
        });
    } catch (error) {
        logger.error('Error deleting part:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete part'
        });
    }
};

// Search function for stock items
const search = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const sqlQuery = `
            SELECT 
                id, name, category, brand, price, stock,
                COALESCE(image_url, image_path) AS image_url,
                created_at
            FROM pc_parts 
            WHERE (name ILIKE $1 OR brand ILIKE $1 OR category ILIKE $1)
            AND stock > 0 AND is_active = true
            ORDER BY name ASC
            LIMIT 50
        `;

        const searchTerm = `%${q.trim()}%`;
        const result = await query(sqlQuery, [searchTerm]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error searching parts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search parts'
        });
    }
};

// Get low stock items
const getLowStock = async (req, res) => {
    try {
        const { threshold = 5 } = req.query;

        const sqlQuery = `
            SELECT 
                id, name, category, brand, price, stock,
                COALESCE(image_url, image_path) AS image_url,
                created_at
            FROM pc_parts 
            WHERE stock <= $1 AND stock > 0 AND is_active = true
            ORDER BY stock ASC, name ASC
        `;

        const result = await query(sqlQuery, [parseInt(threshold)]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error getting low stock items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve low stock items'
        });
    }
};

// Utility function to migrate existing images to category folders
const migrateExistingImages = async (req, res) => {
    try {
        logger.info('🚀 Starting image migration to category folders...');
        
        // Get all products with images
        const result = await query(`
            SELECT id, name, category, image_url 
            FROM pc_parts 
            WHERE image_url IS NOT NULL AND image_url != ''
        `);
        
        const products = result.rows;
        logger.info(`📋 Found ${products.length} products with images to migrate`);
        
        let migrated = 0;
        let errors = 0;
        const migrations = [];
        
        for (const product of products) {
            try {
                // Check if already in category folder
                if (product.image_url.includes('/parts/') && product.image_url.split('/').length > 4) {
                    logger.info(`✅ Product ${product.id} already in category folder: ${product.image_url}`);
                    continue;
                }
                
                // Extract filename from current URL
                const filename = path.basename(product.image_url);
                const oldPath = path.join(__dirname, '..', 'public', product.image_url);
                
                // Generate new category-based path
                const categoryFolderName = getCategoryFolderName(product.category);
                const newDir = path.join(__dirname, '..', 'public', 'assets', 'parts', categoryFolderName);
                const newPath = path.join(newDir, filename);
                const newUrl = `/assets/parts/${categoryFolderName}/${filename}`;
                
                // Ensure category directory exists
                if (!fs.existsSync(newDir)) {
                    fs.mkdirSync(newDir, { recursive: true });
                }
                
                // Move file if it exists
                if (fs.existsSync(oldPath)) {
                    // Copy file to new location
                    fs.copyFileSync(oldPath, newPath);
                    
                    // Update database
                    await query('UPDATE pc_parts SET image_url = $1 WHERE id = $2', [newUrl, product.id]);
                    
                    // Delete old file
                    fs.unlinkSync(oldPath);
                    
                    migrations.push({
                        id: product.id,
                        name: product.name,
                        category: product.category,
                        oldUrl: product.image_url,
                        newUrl: newUrl,
                        status: 'migrated'
                    });
                    
                    migrated++;
                    logger.info(`📁 Migrated ${product.name} (${product.category}): ${filename}`);
                } else {
                    logger.info(`⚠️ File not found for product ${product.id}: ${oldPath}`);
                    migrations.push({
                        id: product.id,
                        name: product.name,
                        category: product.category,
                        oldUrl: product.image_url,
                        newUrl: null,
                        status: 'file_not_found'
                    });
                }
                
            } catch (error) {
                logger.error(`❌ Error migrating product ${product.id}:`, error);
                errors++;
                migrations.push({
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    oldUrl: product.image_url,
                    newUrl: null,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        logger.info(`✅ Migration complete: ${migrated} migrated, ${errors} errors`);
        
        res.json({
            success: true,
            message: 'Image migration completed',
            summary: {
                total: products.length,
                migrated: migrated,
                errors: errors
            },
            details: migrations
        });
        
    } catch (error) {
        logger.error('❌ Error during image migration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to migrate images',
            error: error.message
        });
    }
};

/**
 * Make Product On Sale
 * Marks a product as on sale with sale price and optional duration
 */
const makeOnSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { salePrice, saleDuration = null } = req.body;

        logger.info(`Making product ${id} on sale with price: ${salePrice}`);

        // Validate sale price
        if (!salePrice || salePrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid sale price is required'
            });
        }

        // Get current product to validate sale price vs regular price
        const productResult = await query('SELECT price FROM pc_parts WHERE id = $1', [id]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const regularPrice = parseFloat(productResult.rows[0].price);
        if (salePrice >= regularPrice) {
            return res.status(400).json({
                success: false,
                message: 'Sale price must be lower than regular price'
            });
        }

        // Calculate sale end date if duration is provided
        let saleEndDate = null;
        if (saleDuration && saleDuration > 0) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + saleDuration);
            saleEndDate = endDate.toISOString();
        }

        // Update product with sale information
        const result = await query(`
            UPDATE pc_parts 
            SET 
                on_sale = true,
                sale_price = $1,
                sale_start_date = NOW(),
                sale_end_date = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [salePrice, saleEndDate, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        logger.info(`✅ Product ${id} successfully marked as on sale`);

        res.json({
            success: true,
            message: 'Product marked as on sale successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('❌ Error making product on sale:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to make product on sale',
            error: error.message
        });
    }
};

/**
 * Remove Product From Sale
 * Removes sale status from a product
 */
const removeFromSale = async (req, res) => {
    try {
        const { id } = req.params;

        logger.info(`Removing product ${id} from sale`);

        // Update product to remove sale information
        const result = await query(`
            UPDATE pc_parts 
            SET 
                on_sale = false,
                sale_price = NULL,
                sale_start_date = NULL,
                sale_end_date = NULL,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        logger.info(`✅ Product ${id} successfully removed from sale`);

        res.json({
            success: true,
            message: 'Product removed from sale successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('❌ Error removing product from sale:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove product from sale',
            error: error.message
        });
    }
};

// GET /api/stock/items/:category - Get items by category (for component picker)
const getItemsByCategory = async (req, res) => {
    try {
        let { category } = req.params;
        
        logger.info(`📦 Fetching items for category: ${category}`);
        
        // 🔥 FIX: Map "Power Supply" to "PSU" for database compatibility
        const categoryMapping = {
            'Power Supply': 'PSU',
            'power supply': 'PSU',
            'CPU Cooler': 'Cooling',
            'cpu cooler': 'Cooling'
        };
        
        // Apply category mapping if exists
        const mappedCategory = categoryMapping[category] || category;
        
        if (mappedCategory !== category) {
            logger.info(`📝 Mapped category "${category}" -> "${mappedCategory}"`);
        }
        
        // Query items by category (note: use is_active not status)
        const result = await query(`
            SELECT id, name, brand, price, stock, image_url, category
            FROM pc_parts
            WHERE category = $1 AND is_active = true
            ORDER BY name ASC
        `, [mappedCategory]);
        
        logger.info(`✅ Found ${result.rows.length} items for category: ${mappedCategory}`);
        
        res.json({
            success: true,
            category: mappedCategory,
            originalCategory: category,
            count: result.rows.length,
            items: result.rows
        });
        
    } catch (error) {
        logger.error('❌ Error fetching items by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch items',
            error: error.message
        });
    }
};

/**
 * POST /api/stock/approve-community-build/:id - Approve a community build
 * Makes a pending community build visible in kiosk
 */
const approveCommunityBuild = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Update specifications to set approvalStatus = 'approved'
        // Also set is_active = true and kiosk_visible = true
        const result = await query(`
            UPDATE pc_parts
            SET 
                specifications = jsonb_set(
                    jsonb_set(specifications, '{approvalStatus}', '"approved"'),
                    '{approvedAt}', to_jsonb(NOW()::text)
                ),
                is_active = true,
                kiosk_visible = true,
                updated_at = NOW()
            WHERE id = $1 
              AND category = 'Pre-Built'
              AND specifications->>'buildSource' = 'community'
              AND specifications->>'approvalStatus' = 'pending'
            RETURNING id, name, specifications
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Community build not found or already approved/rejected'
            });
        }

        const approvedBuild = result.rows[0];
        logger.info(`✅ Community build approved: ${approvedBuild.name} (ID: ${id})`);

        res.json({
            success: true,
            message: 'Community build approved successfully',
            data: approvedBuild
        });

    } catch (error) {
        logger.error(`Error approving community build ${id}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve community build',
            error: error.message
        });
    }
};

/**
 * POST /api/stock/reject-community-build/:id - Reject a community build
 * Sets status to rejected (build remains in database but not visible)
 */
const rejectCommunityBuild = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    try {
        const result = await query(`
            UPDATE pc_parts
            SET 
                specifications = jsonb_set(
                    jsonb_set(
                        jsonb_set(specifications, '{approvalStatus}', '"rejected"'),
                        '{rejectedAt}', to_jsonb(NOW()::text)
                    ),
                    '{rejectionReason}', to_jsonb($2::text)
                ),
                is_active = false,
                kiosk_visible = false,
                updated_at = NOW()
            WHERE id = $1 
              AND category = 'Pre-Built'
              AND specifications->>'buildSource' = 'community'
              AND specifications->>'approvalStatus' = 'pending'
            RETURNING id, name, specifications
        `, [id, reason || 'No reason provided']);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Community build not found or already approved/rejected'
            });
        }

        const rejectedBuild = result.rows[0];
        logger.info(`❌ Community build rejected: ${rejectedBuild.name} (ID: ${id})`);

        res.json({
            success: true,
            message: 'Community build rejected',
            data: rejectedBuild
        });

    } catch (error) {
        logger.error(`Error rejecting community build ${id}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject community build',
            error: error.message
        });
    }
};

/**
 * POST /api/stock/remove-backgrounds - Remove backgrounds from all product images
 * Batch processes all images excluding Pre-Built category
 */
const removeBackgrounds = async (req, res) => {
    try {
        const backgroundRemovalService = require('../utils/backgroundRemovalService');
        const { category, dryRun = false } = req.body;

        logger.info(`🎨 Starting background removal batch process${dryRun ? ' (DRY RUN)' : ''}...`);

        // Get all images to process (exclude Pre-Built)
        let whereClause = 'WHERE is_active = true AND image_url IS NOT NULL AND category != $1';
        const params = ['Pre-Built'];

        if (category) {
            whereClause += ' AND category = $2';
            params.push(category);
        }

        const result = await query(`
            SELECT id, name, category, image_url
            FROM pc_parts
            ${whereClause}
            ORDER BY category, name
        `, params);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'No images found to process',
                processed: 0,
                failed: 0
            });
        }

        logger.info(`📊 Found ${result.rows.length} images to process`);

        if (dryRun) {
            return res.json({
                success: true,
                message: `Would process ${result.rows.length} images (dry run)`,
                items: result.rows.map(r => ({
                    id: r.id,
                    name: r.name,
                    category: r.category,
                    image: r.image_url
                })),
                dryRun: true
            });
        }

        const results = [];
        const assetsPath = path.join(__dirname, '..', 'public', 'assets', 'parts');

        for (const item of result.rows) {
            try {
                // Build full image path
                const imagePath = path.join(assetsPath, item.image_url.replace('/assets/parts/', ''));

                // Check if file exists
                const fileExists = await backgroundRemovalService.fileExists(imagePath);
                if (!fileExists) {
                    logger.warn(`⚠️ Image file not found: ${imagePath}`);
                    results.push({
                        id: item.id,
                        name: item.name,
                        success: false,
                        error: 'File not found'
                    });
                    continue;
                }

                // Process image
                await backgroundRemovalService.processProductImage(imagePath, {
                    threshold: 245,
                    tolerance: 5,
                    edgeBuffer: 3,
                    preserveWhite: true
                });

                results.push({
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    success: true
                });

                logger.info(`✅ Processed: ${item.name}`);

            } catch (error) {
                logger.error(`❌ Failed to process ${item.name}:`, error.message);
                results.push({
                    id: item.id,
                    name: item.name,
                    success: false,
                    error: error.message
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        logger.info(`✅ Background removal complete: ${successful} successful, ${failed} failed`);

        res.json({
            success: true,
            message: `Processed ${result.rows.length} images: ${successful} successful, ${failed} failed`,
            processed: successful,
            failed: failed,
            results: results
        });

    } catch (error) {
        logger.error('Error in background removal batch process:', error);
        res.status(500).json({
            success: false,
            message: 'Background removal batch process failed',
            error: error.message
        });
    }
};

/**
 * POST /api/stock/:id/remove-background - Remove background from single product image
 */
const removeSingleBackground = async (req, res) => {
    try {
        const { id } = req.params;
        const backgroundRemovalService = require('../utils/backgroundRemovalService');

        // Get item details
        const result = await query('SELECT id, name, category, image_url FROM pc_parts WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const item = result.rows[0];

        if (!item.image_url) {
            return res.status(400).json({
                success: false,
                message: 'Product has no image'
            });
        }

        if (item.category === 'Pre-Built') {
            return res.status(400).json({
                success: false,
                message: 'Background removal not supported for Pre-Built category'
            });
        }

        // Build full image path
        const assetsPath = path.join(__dirname, '..', 'public', 'assets', 'parts');
        const imagePath = path.join(assetsPath, item.image_url.replace('/assets/parts/', ''));

        // Check if file exists
        const fileExists = await backgroundRemovalService.fileExists(imagePath);
        if (!fileExists) {
            return res.status(404).json({
                success: false,
                message: 'Image file not found on server'
            });
        }

        // Process image
        await backgroundRemovalService.processProductImage(imagePath, {
            threshold: 240,
            tolerance: 10,
            blur: 2
        });

        logger.info(`✅ Background removed for: ${item.name} (ID: ${id})`);

        res.json({
            success: true,
            message: `Background removed successfully for "${item.name}"`,
            data: {
                id: item.id,
                name: item.name,
                category: item.category
            }
        });

    } catch (error) {
        logger.error(`Error removing background for product ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove background',
            error: error.message
        });
    }
};

module.exports = {
    list,
    getAllStockItems,
    getCategories,
    getBrands,
    getBrandSuggestions,    // NEW - Brand autocomplete suggestions
    getBrandsWithCounts,
    getPriceRange,
    getStats,
    get,
    getPartSpecFields,
    getSpecificationValues,
    getSpecificationRange,
    search,
    getLowStock,
    upload,
    create,
    uploadImage,
    update,
    delete: deletePart,
    migrateExistingImages,
    makeOnSale,
    removeFromSale,
    getItemsByCategory,
    approveCommunityBuild,   // NEW - Approve community builds
    rejectCommunityBuild,    // NEW - Reject community builds
    removeBackgrounds,       // NEW - Batch background removal
    removeSingleBackground   // NEW - Single image background removal
};
