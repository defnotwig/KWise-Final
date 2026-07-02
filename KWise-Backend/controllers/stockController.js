const { query } = require('../config/db');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('node:path');
const { createPart, updatePart, findPartById, listParts } = require('../utils/testMemoryStore');
const {
    buildCanonicalSpecs,
    syncProductCompatibilitySpecs
} = require('../services/compatibilitySpecService');
const {
    normalizeUploadFolder,
    isAllowedImageMetadata,
    randomImageFilename
} = require('../middleware/secureImageUpload');
const { sanitizeForLog } = require('../utils/securitySanitizer');
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

/**
 * Build WHERE clause fragments for the list query from request query parameters.
 * Returns { whereClause, queryParams, paramIndex }.
 */
const buildListWhereClause = (queryObj) => {
    const { category, q, brand, minPrice, maxPrice, inStock = true, tier } = queryObj;
    let whereClause;
    if (category === 'Community Build') {
        whereClause = 'WHERE 1=1';
    } else {
        whereClause = 'WHERE is_active = true AND kiosk_visible = true';
    }
    const queryParams = [];
    let paramIndex = 1;

    if (category) {
        if (category === 'Community Build') {
            whereClause += ` AND category = $${paramIndex++} AND specifications->>'buildSource' = $${paramIndex++}`;
            queryParams.push('Pre-Built', 'community');
        } else {
            whereClause += ` AND category = $${paramIndex++}`;
            queryParams.push(category);
        }
    }

    if (q) {
        whereClause += ` AND (name ILIKE $${paramIndex++} OR brand ILIKE $${paramIndex++})`;
        queryParams.push(`%${q}%`, `%${q}%`);
    }

    if (brand) {
        const result = appendBrandFilter(whereClause, queryParams, paramIndex, brand);
        whereClause = result.whereClause;
        paramIndex = result.paramIndex;
    }

    if (minPrice) {
        whereClause += ` AND price >= $${paramIndex++}`;
        queryParams.push(Number.parseFloat(minPrice));
    }
    if (maxPrice) {
        whereClause += ` AND price <= $${paramIndex++}`;
        queryParams.push(Number.parseFloat(maxPrice));
    }

    if (inStock === 'true') {
        whereClause += ' AND stock > 0';
    } else if (inStock === 'false') {
        whereClause += ' AND stock = 0';
    }

    if (tier) {
        whereClause += ` AND tier = $${paramIndex++}`;
        queryParams.push(tier);
    }

    return { whereClause, queryParams, paramIndex };
};

/** Append brand filter (single or multiple brands) */
const appendBrandFilter = (whereClause, queryParams, paramIndex, brand) => {
    if (brand.includes(',')) {
        const brands = brand.split(',').map(b => b.trim()).filter(Boolean);
        const placeholders = brands.map((_, i) => `$${paramIndex + i}`).join(',');
        whereClause += ` AND brand IN (${placeholders})`;
        queryParams.push(...brands);
        paramIndex += brands.length;
    } else {
        whereClause += ` AND brand = $${paramIndex++}`;
        queryParams.push(brand);
    }
    return { whereClause, paramIndex };
};

/** Append specification filters (spec_<field>=value or spec_<field>=min-max) */
const appendSpecFilters = (whereClause, queryParams, paramIndex, queryObj) => {
    const specFilters = Object.entries(queryObj).filter(([k]) => k.startsWith('spec_'));
    for (const [key, rawVal] of specFilters) {
        const field = key.substring(5);
        if (!field || typeof rawVal !== 'string' || rawVal.trim() === '') continue;

        if (/^-?\d+(\.\d+)?-?-?\d*(\.\d+)?$/.test(rawVal) && rawVal.includes('-')) {
            const [min, max] = rawVal.split('-');
            if (min) {
                whereClause += ` AND (specifications->>$${paramIndex})::numeric >= $${paramIndex + 1}`;
                queryParams.push(field, Number.parseFloat(min));
                paramIndex += 2;
            }
            if (max) {
                whereClause += ` AND (specifications->>$${paramIndex})::numeric <= $${paramIndex + 1}`;
                queryParams.push(field, Number.parseFloat(max));
                paramIndex += 2;
            }
        } else if (rawVal === 'true' || rawVal === 'false') {
            whereClause += ` AND (LOWER(specifications->>$${paramIndex}) = $${paramIndex + 1})`;
            queryParams.push(field, rawVal.toLowerCase());
            paramIndex += 2;
        } else {
            whereClause += ` AND (specifications->>$${paramIndex}) ILIKE $${paramIndex + 1}`;
            queryParams.push(field, rawVal);
            paramIndex += 2;
        }
    }
    return { whereClause, paramIndex };
};

// GET /api/stock - List all parts with filtering, pagination & specification filters
const list = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sort = 'name',
            order = 'ASC'
        } = req.query;

        // Build WHERE clause from query parameters
        let { whereClause, queryParams, paramIndex } = buildListWhereClause(req.query);

        // Specification filters: spec_<field>=value OR spec_<field>=min-max
        ({ whereClause, paramIndex } = appendSpecFilters(whereClause, queryParams, paramIndex, req.query));

        // Pagination
        const offset = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10);

        // Sanitize sort/order (whitelist columns mapped to qualified names)
        const sortColumnMap = {
            'name': 'pp.name',
            'price': 'pp.price',
            'brand': 'pp.brand',
            'created_at': 'pp.created_at'
        };
        const safeSortColumn = sortColumnMap[sort] || 'pp.name';
        const safeOrder = order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

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
            ORDER BY ${safeSortColumn} ${safeOrder}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(Number.parseInt(limit, 10), offset);

        // ⚡ FIX: Update count query to match aliased table
        const countQuery = `SELECT COUNT(*) AS total FROM pc_parts pp ${whereClause}`;
        const countParams = queryParams.slice(0, -2);

        const [result, countResult] = await Promise.all([
            query(mainQuery, queryParams),
            query(countQuery, countParams)
        ]);

        const total = Number.parseInt(countResult.rows[0].total, 10) || 0;
        const totalPages = Math.ceil(total / Number.parseInt(limit, 10));

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                currentPage: Number.parseInt(page, 10),
                totalPages,
                totalItems: total,
                itemsPerPage: Number.parseInt(limit, 10),
                hasNext: Number.parseInt(page, 10) < totalPages,
                hasPrev: Number.parseInt(page, 10) > 1
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
        if (q?.trim()) {
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

        queryParams.push(Number.parseInt(limit, 10));

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
        res.json({ success: true, data: { min: Number.parseFloat(row.min_price) || 0, max: Number.parseFloat(row.max_price) || 0 } });
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
                AND specifications->>$1 ~ '^[0-9]*.?[0-9]+$'
            `;
            
            const result = await query(sql, [fieldName, category]);
            const row = result.rows[0] || {};
            
            if (row.min_value !== null && row.max_value !== null) {
                ranges[fieldName] = { 
                    min: Number.parseFloat(row.min_value) || 0, 
                    max: Number.parseFloat(row.max_value) || 0,
                    totalItems: Number.parseInt(row.total_items, 10) || 0
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

        const communityBuildCount = Number.parseInt(communityBuildResult.rows[0]?.count || 0, 10);

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
        const totalItems = Number.parseInt(totalResult.rows[0]?.total || 0, 10);

        res.json({
            success: true,
            data: {
                brands: result.rows.map(row => ({
                    name: row.brand,
                    count: Number.parseInt(row.item_count, 10)
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
                totalProducts: Number.parseInt(stats.total_products, 10) || 0,
                totalStock: Number.parseInt(stats.total_stock, 10) || 0,
                totalValue: Number.parseFloat(stats.total_value) || 0,
                totalCategories: Number.parseInt(stats.total_categories, 10) || 0,
                totalBrands: Number.parseInt(stats.total_brands, 10) || 0
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
                case 'number': {
                    // Convert to number, handle invalid numbers
                    const numValue = Number(value);
                    convertedSpecs[key] = Number.isNaN(numValue) ? null : numValue;
                    break;
                }
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
const fs = require('node:fs');

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
    return normalizeUploadFolder(mapping[category] || category, 'other');
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
            const finalName = randomImageFilename(file.originalname);
            
            logger.info(`📄 Generated filename: ${finalName} (from: ${file.originalname})`);
            cb(null, finalName);
        } catch (error) {
            logger.error('❌ Error generating filename:', error);
            cb(null, randomImageFilename(file.originalname));
        }
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (isAllowedImageMetadata(file)) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, GIF, and WEBP image files are allowed'));
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
                price: Number.parseFloat(price),
                stock: Number.parseInt(stock, 10),
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

        let compatibilityWarnings = [];
        let compatibilityMissingSpecs = [];

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

        const canonical = buildCanonicalSpecs({
            name,
            category,
            brand,
            price,
            stock,
            description,
            specifications: parsedSpecifications || {}
        });
        parsedSpecifications = canonical.specs;
        compatibilityWarnings = canonical.warnings;
        compatibilityMissingSpecs = canonical.missingSpecs;

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
            `, [nextId, name, category, brand, Number.parseFloat(price), Number.parseInt(stock, 10), description, parsedSpecifications, image_url, normalizedTier]);

            // Insert into category-specific table if it exists and has specifications
            // DISABLED: We're using JSONB specifications in pc_parts table instead of separate category tables
            // if (categoryTable && parsedSpecifications) {
            //     await insertIntoCategoryTable(categoryTable, nextId, name, parsedSpecifications, Number.parseFloat(price));
            // }

            // Commit transaction
            await query('COMMIT');

            const compatibilitySync = await syncProductCompatibilitySpecs(pcPartsResult.rows[0]);
            compatibilityWarnings = compatibilitySync.warnings || compatibilityWarnings;
            compatibilityMissingSpecs = compatibilitySync.missingSpecs || compatibilityMissingSpecs;

            logger.info(`New part created: ${name}`, { partId: nextId, category, categoryTable });

            res.status(201).json({
                success: true,
                data: {
                    ...pcPartsResult.rows[0],
                    compatibility_warnings: compatibilityWarnings,
                    compatibility_missing_specs: compatibilityMissingSpecs
                },
                message: compatibilityWarnings.length
                    ? 'Part created successfully with compatibility spec warnings'
                    : 'Part created successfully'
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

/**
 * Category table field schemas — defines columns and type conversions for each table.
 * Each field: { col: 'column_name', spec: 'spec_key', type: 'str'|'int'|'float'|'bool' }
 * Special spec values: '_price' uses the price param, '_name' uses the name param.
 */
const CATEGORY_TABLE_SCHEMAS = {
    pc_case: [
        { col: 'name', spec: '_name' },
        { col: 'category', spec: 'category' },
        { col: 'color', spec: 'color' },
        { col: 'fans_included', spec: 'fans_included', type: 'int' },
        { col: 'price', spec: '_price' },
        { col: 'case_category', spec: 'case_category' },
        { col: 'max_gpu_length', spec: 'max_gpu_length' },
        { col: 'max_cpu_cooler_height', spec: 'max_cpu_cooler_height' },
        { col: 'motherboard_support', spec: 'motherboard_support' },
        { col: 'tempered_glass', spec: 'tempered_glass', type: 'bool' },
    ],
    cpu: [
        { col: 'name', spec: '_name' },
        { col: 'socket', spec: 'socket' },
        { col: 'series', spec: 'series' },
        { col: 'base_clock', spec: 'base_clock', type: 'float' },
        { col: 'turbo_clock', spec: 'turbo_clock', type: 'float' },
        { col: 'cores', spec: 'cores', type: 'int' },
        { col: 'threads', spec: 'threads', type: 'int' },
        { col: 'integrated_gpu', spec: 'integrated_gpu', type: 'bool' },
        { col: 'max_ram', spec: 'max_ram', type: 'int' },
        { col: 'lithography', spec: 'lithography', type: 'int' },
        { col: 'tdp', spec: 'tdp', type: 'int' },
        { col: 'price', spec: '_price' },
    ],
    gpu: [
        { col: 'name', spec: '_name' },
        { col: 'memory_type', spec: 'memory_type' },
        { col: 'memory_capacity', spec: 'memory_capacity', type: 'int' },
        { col: 'core_clock', spec: 'core_clock', type: 'float' },
        { col: 'boost_clock', spec: 'boost_clock', type: 'float' },
        { col: 'effective_clock', spec: 'effective_clock', type: 'float' },
        { col: 'interface', spec: 'interface' },
        { col: 'frame_sync', spec: 'frame_sync' },
        { col: 'length', spec: 'length', type: 'int' },
        { col: 'tdp', spec: 'tdp', type: 'int' },
        { col: 'pcie_8pin', spec: 'pcie_8pin', type: 'int' },
        { col: 'ports_display', spec: 'ports_display', type: 'int' },
        { col: 'ports_hdmi', spec: 'ports_hdmi', type: 'int' },
        { col: 'fans', spec: 'fans' },
        { col: 'price', spec: '_price' },
    ],
    ram: [
        { col: 'name', spec: '_name' },
        { col: 'memory_type', spec: 'memory_type' },
        { col: 'configuration', spec: 'configuration' },
        { col: 'speed', spec: 'speed', type: 'int' },
        { col: 'voltage', spec: 'voltage', type: 'float' },
        { col: 'cas_latency', spec: 'cas_latency' },
        { col: 'total_capacity', spec: 'total_capacity' },
        { col: 'price', spec: '_price' },
    ],
    storage: [
        { col: 'name', spec: '_name' },
        { col: 'capacity', spec: 'capacity' },
        { col: 'interface', spec: 'interface' },
        { col: 'form_factor', spec: 'form_factor' },
        { col: 'read_speed', spec: 'read_speed' },
        { col: 'write_speed', spec: 'write_speed' },
    ],
    motherboard: [
        { col: 'name', spec: '_name' },
        { col: 'socket', spec: 'socket' },
        { col: 'chipset', spec: 'chipset' },
        { col: 'form_factor', spec: 'form_factor' },
        { col: 'ram_slots', spec: 'ram_slots', type: 'int' },
        { col: 'max_ram', spec: 'max_ram' },
    ],
    psu: [
        { col: 'name', spec: '_name' },
        { col: 'wattage', spec: 'wattage', type: 'int' },
        { col: 'efficiency', spec: 'efficiency' },
        { col: 'modular', spec: 'modular', type: 'bool' },
        { col: 'certification', spec: 'certification' },
    ],
    cooling: [
        { col: 'name', spec: '_name' },
        { col: 'type', spec: 'type' },
        { col: 'socket_compatibility', spec: 'socket_compatibility' },
        { col: 'max_tdp', spec: 'max_tdp', type: 'int' },
        { col: 'noise_level', spec: 'noise_level' },
    ],
};

/**
 * Update-specific schemas for categories whose update columns differ from insert columns.
 * Falls back to CATEGORY_TABLE_SCHEMAS if not defined here.
 */
const UPDATE_CATEGORY_TABLE_SCHEMAS = {
    storage: [
        { col: 'name', spec: '_name' },
        { col: 'capacity', spec: 'capacity' },
        { col: 'storage_type', spec: 'storage_type' },
        { col: 'interface', spec: 'interface' },
        { col: 'form_factor', spec: 'form_factor' },
        { col: 'read_speed', spec: 'read_speed' },
        { col: 'write_speed', spec: 'write_speed' },
        { col: 'nvme_support', spec: 'nvme_support', type: 'bool' },
        { col: 'cache', spec: 'cache' },
        { col: 'm2_type', spec: 'm2_type' },
        { col: 'price', spec: '_price' },
    ],
    motherboard: [
        { col: 'name', spec: '_name' },
        { col: 'socket', spec: 'socket' },
        { col: 'chipset', spec: 'chipset' },
        { col: 'memory_type', spec: 'memory_type' },
        { col: 'max_ram', spec: 'max_ram', type: 'int' },
        { col: 'ram_slots', spec: 'ram_slots', type: 'int' },
        { col: 'm2_slots', spec: 'm2_slots', type: 'int' },
        { col: 'ethernet_ports', spec: 'ethernet_ports', type: 'int' },
        { col: 'wireless_networking', spec: 'wireless_networking', type: 'bool' },
        { col: 'integrated_gpu_support', spec: 'integrated_gpu_support', type: 'bool' },
        { col: 'price', spec: '_price' },
    ],
    psu: [
        { col: 'name', spec: '_name' },
        { col: 'form_factor', spec: 'form_factor' },
        { col: 'efficiency_rating', spec: 'efficiency_rating' },
        { col: 'wattage', spec: 'wattage', type: 'int' },
        { col: 'length', spec: 'length', type: 'int' },
        { col: 'modular', spec: 'modular', type: 'bool' },
        { col: 'pcie_connectors', spec: 'pcie_connectors' },
        { col: 'sata_connectors', spec: 'sata_connectors' },
        { col: 'price', spec: '_price' },
    ],
    cooling: [
        { col: 'name', spec: '_name' },
        { col: 'max_rpm', spec: 'max_rpm', type: 'int' },
        { col: 'max_noise', spec: 'max_noise', type: 'float' },
        { col: 'height', spec: 'height', type: 'int' },
        { col: 'water_cooled', spec: 'water_cooled', type: 'bool' },
        { col: 'fanless', spec: 'fanless', type: 'bool' },
        { col: 'price', spec: '_price' },
    ],
    monitor: [
        { col: 'name', spec: '_name' },
        { col: 'screen_size', spec: 'screen_size' },
        { col: 'resolution', spec: 'resolution' },
        { col: 'refresh_rate', spec: 'refresh_rate', type: 'int' },
        { col: 'response_time', spec: 'response_time', type: 'float' },
        { col: 'panel_type', spec: 'panel_type' },
        { col: 'aspect_ratio', spec: 'aspect_ratio' },
        { col: 'curved', spec: 'curved', type: 'bool' },
        { col: 'vesa_mount', spec: 'vesa_mount' },
        { col: 'price', spec: '_price' },
    ],
    keyboard: [
        { col: 'name', spec: '_name' },
        { col: 'style', spec: 'style' },
        { col: 'switch_type', spec: 'switch_type' },
        { col: 'backlit', spec: 'backlit', type: 'bool' },
        { col: 'tenkeyless', spec: 'tenkeyless', type: 'bool' },
        { col: 'connection_type', spec: 'connection_type' },
        { col: 'color', spec: 'color' },
        { col: 'polling_rate', spec: 'polling_rate' },
        { col: 'price', spec: '_price' },
    ],
    mouse: [
        { col: 'name', spec: '_name' },
        { col: 'tracking_method', spec: 'tracking_method' },
        { col: 'connection_type', spec: 'connection_type' },
        { col: 'dpi', spec: 'dpi', type: 'int' },
        { col: 'hand_orientation', spec: 'hand_orientation' },
        { col: 'color', spec: 'color' },
        { col: 'programmable_buttons', spec: 'programmable_buttons' },
        { col: 'polling_rate', spec: 'polling_rate' },
        { col: 'price', spec: '_price' },
    ],
    headphones: [
        { col: 'name', spec: '_name' },
        { col: 'type', spec: 'type' },
        { col: 'frequency', spec: 'frequency' },
        { col: 'microphone', spec: 'microphone', type: 'bool' },
        { col: 'wireless', spec: 'wireless', type: 'bool' },
        { col: 'enclosure', spec: 'enclosure' },
        { col: 'color', spec: 'color' },
        { col: 'price', spec: '_price' },
    ],
    speakers: [
        { col: 'name', spec: '_name' },
        { col: 'configuration', spec: 'configuration' },
        { col: 'total_wattage', spec: 'total_wattage', type: 'int' },
        { col: 'frequency_response', spec: 'frequency_response' },
        { col: 'color', spec: 'color' },
        { col: 'price', spec: '_price' },
    ],
    webcam: [
        { col: 'name', spec: '_name' },
        { col: 'resolution', spec: 'resolution' },
        { col: 'connection', spec: 'connection' },
        { col: 'focus_type', spec: 'focus_type' },
        { col: 'operating_system', spec: 'operating_system' },
        { col: 'fov_angle', spec: 'fov_angle', type: 'int' },
        { col: 'frame_rate', spec: 'frame_rate' },
        { col: 'microphone_builtin', spec: 'microphone_builtin', type: 'bool' },
        { col: 'price', spec: '_price' },
    ],
};

/** Convert a spec value according to its declared type */
const convertSpecValue = (rawVal, type) => {
    if (type === 'int') return rawVal ? Number.parseInt(rawVal, 10) : null;
    if (type === 'float') return rawVal ? Number.parseFloat(rawVal) : null;
    if (type === 'bool') return rawVal === 'true' || rawVal === true;
    return rawVal || null;
};

/** Resolve a field's value from specifications, name, or price */
const resolveFieldValue = (field, specifications, name, price) => {
    if (field.spec === '_name') return name;
    if (field.spec === '_price') return price;
    return convertSpecValue(specifications[field.spec], field.type);
};

// Helper function to insert into category-specific tables
const insertIntoCategoryTable = async (tableName, id, name, specifications, price) => {
    const schema = CATEGORY_TABLE_SCHEMAS[tableName];
    if (!schema) {
        logger.info(`⚠️ No specific table handler for ${tableName}`);
        return;
    }

    try {
        const cols = ['id', ...schema.map(f => f.col)];
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const values = [id, ...schema.map(f => resolveFieldValue(f, specifications, name, price))];

        await query(
            `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
            values
        );
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

/**
 * Build dynamic SET clause fields from request body for pc_parts update.
 * Returns { updateFields, values, paramIndex } or null if no fields.
 */
const buildUpdateFields = (body, parsedSpecifications, image_url) => {
    const { name, category, brand, price, stock, description, specifications, tier } = body;
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    const fieldDefs = [
        { key: 'name', value: name },
        { key: 'category', value: category },
        { key: 'brand', value: brand },
        { key: 'price', value: price === undefined ? undefined : Number.parseFloat(price), raw: price },
        { key: 'stock', value: stock === undefined ? undefined : Number.parseInt(stock, 10), raw: stock },
        { key: 'description', value: description },
        { key: 'tier', value: tier === undefined ? undefined : normalizeTierValue(tier), raw: tier },
        { key: 'specifications', value: specifications === undefined ? undefined : parsedSpecifications, raw: specifications },
        { key: 'image_url', value: image_url },
    ];

    for (const fd of fieldDefs) {
        const src = fd.raw === undefined ? fd.value : fd.raw;
        if (src === undefined) continue;
        updateFields.push(`${fd.key} = $${paramIndex++}`);
        values.push(fd.value);
    }

    return updateFields.length > 0 ? { updateFields, values, paramIndex } : null;
};

/** Broadcast stock/price changes via WebSocket after update */
const broadcastUpdateChanges = (id, currentItem, body, resultRow) => {
    const { stock, price } = body;
    try {
        if (stock !== undefined && globalThis.websocketService) {
            const oldStock = currentItem.stock;
            const newStock = Number.parseInt(stock, 10);
            if (oldStock !== newStock) {
                globalThis.websocketService.broadcastStockUpdate(id, newStock, oldStock);
            }
        }
        if (price !== undefined && globalThis.websocketService) {
            const oldPrice = Number.parseFloat(currentItem.price);
            const newPrice = Number.parseFloat(price);
            if (oldPrice !== newPrice) {
                const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
                globalThis.websocketService.broadcastPriceChange(id, newPrice, oldPrice, changePercent);
            }
        }
    } catch (wsError) {
        logger.warn('⚠️ WebSocket broadcasting failed:', wsError.message);
    }
};

// PATCH /api/stock/:id - Update part
/** Handle update in test mode (in-memory storage) */
const handleTestUpdate = (id, body, res) => {
    const item = findPartById(id);
    if (!item) {
        return res.status(404).json({ success: false, message: 'Part not found' });
    }
    const { name, category, brand, price, stock, description, specifications, tier } = body;
    let parsedSpecifications = specifications === undefined ? item.specifications : specifications;
    if (typeof parsedSpecifications === 'string') {
        parsedSpecifications = JSON.parse(parsedSpecifications);
    }
    updatePart(id, {
        name: name ?? item.name,
        category: category ?? item.category,
        brand: brand ?? item.brand,
        price: price === undefined ? item.price : Number.parseFloat(price),
        stock: stock === undefined ? item.stock : Number.parseInt(stock, 10),
        description: description === undefined ? item.description : description,
        specifications: parsedSpecifications,
        tier: tier ?? item.tier
    });
    return res.json({ success: true, data: findPartById(id), message: 'Part updated (test mode)' });
};

/** Parse and optionally convert specifications from request body */
const parseUpdateSpecifications = async (specifications, category) => {
    if (specifications === undefined) return undefined;
    try {
        let parsed = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
        if (parsed && category) {
            parsed = await convertSpecificationValues(category, parsed);
        }
        return parsed;
    } catch (error) {
        logger.error('❌ Error parsing specifications:', error);
        return null;
    }
};

/** Invalidate product caches after update */
const invalidateProductCache = async (id) => {
    try {
        const { getQueryCache } = require('../utils/inMemoryCache');
        const cache = getQueryCache();
        if (cache && typeof cache.invalidate === 'function') {
            await cache.invalidate(['products:*', 'search:*', 'stats:*']);
            logger.info(`🧹 Explicit cache invalidated for product ${id} after update`);
        }
    } catch (cacheError) {
        logger.warn('⚠️ Cache invalidation warning (non-critical):', cacheError.message);
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, brand, price, stock, description, specifications } = req.body;

        if (isTest) {
            return handleTestUpdate(id, req.body, res);
        }
        logger.info('Stock update request received', sanitizeForLog({
            id,
            name,
            category,
            brand,
            price,
            stock,
            descriptionLength: description ? String(description).length : 0,
            specificationKeys: specifications && typeof specifications === 'object' ? Object.keys(specifications) : [],
            requestBodyKeys: Object.keys(req.body)
        }));
// Generate category-based image URL if file uploaded
        let image_url;
        if (req.file) {
            const categoryFolderName = getCategoryFolderName(category || 'other');
            image_url = `/assets/parts/${categoryFolderName}/${req.file.filename}`;
            logger.info(`🖼️ Generated update image URL: ${image_url}`);
        }

        // Get current item to know its category
        const currentItem = await query('SELECT * FROM pc_parts WHERE id = $1', [id]);
        if (currentItem.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Part not found'
            });
        }
        const currentPart = currentItem.rows[0];
        const effectiveCategory = category || currentPart.category;

        // Parse specifications if provided
        let parsedSpecifications = await parseUpdateSpecifications(specifications, effectiveCategory);
        let compatibilityWarnings = [];
        let compatibilityMissingSpecs = [];

        if (parsedSpecifications !== undefined) {
            const canonical = buildCanonicalSpecs({
                ...currentPart,
                ...req.body,
                category: effectiveCategory,
                specifications: parsedSpecifications || {}
            });
            parsedSpecifications = canonical.specs;
            compatibilityWarnings = canonical.warnings;
            compatibilityMissingSpecs = canonical.missingSpecs;
        }

        // Start transaction
        await query('BEGIN');

        try {
            // Build dynamic update query for pc_parts
            const fields = buildUpdateFields(req.body, parsedSpecifications, image_url);

            if (!fields) {
                await query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
            }

            const { updateFields, values, paramIndex } = fields;

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
            //     await updateCategoryTable(categoryTable, id, name || currentItem.rows[0].name, parsedSpecifications, price !== undefined ? Number.parseFloat(price) : currentItem.rows[0].price);
            // }

            // Commit transaction
            await query('COMMIT');

            // ⚡ Explicit cache invalidation
            await invalidateProductCache(id);
            const compatibilitySync = await syncProductCompatibilitySpecs(result.rows[0]);
            compatibilityWarnings = compatibilitySync.warnings || compatibilityWarnings;
            compatibilityMissingSpecs = compatibilitySync.missingSpecs || compatibilityMissingSpecs;

            logger.info(`Part updated: ${result.rows[0].name}`, { partId: id });

            // PHASE 3.2 WEEK 2: Broadcast stock/price updates via WebSocket
            broadcastUpdateChanges(id, currentItem.rows[0], req.body, result.rows[0]);

            res.json({
                success: true,
                data: {
                    ...result.rows[0],
                    compatibility_warnings: compatibilityWarnings,
                    compatibility_missing_specs: compatibilityMissingSpecs
                },
                message: compatibilityWarnings.length
                    ? 'Part updated successfully with compatibility spec warnings'
                    : 'Part updated successfully'
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
    const schema = UPDATE_CATEGORY_TABLE_SCHEMAS[tableName] || CATEGORY_TABLE_SCHEMAS[tableName];
    if (!schema) {
        logger.info(`⚠️ No specific table handler for ${tableName}`);
        return;
    }

    try {
        const setClauses = schema.map((f, i) => `${f.col} = $${i + 2}`);
        setClauses.push('updated_at = CURRENT_TIMESTAMP');
        const values = [id, ...schema.map(f => resolveFieldValue(f, specifications, name, price))];

        await query(
            `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = $1`,
            values
        );
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

        const result = await query(sqlQuery, [Number.parseInt(threshold, 10)]);

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

        const regularPrice = Number.parseFloat(productResult.rows[0].price);
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
