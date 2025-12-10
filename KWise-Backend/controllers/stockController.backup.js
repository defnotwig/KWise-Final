const { query } = require('../config/db');
const logger = require('../utils/logger');

// Simple in-memory cache for performance optimization
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached data
const getCachedData = (key) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
};

// Helper function to set cached data
const setCachedData = (key, data) => {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
};

/**
 * Stock Controller - Main PC Parts Management
 * Handles all stock-related operations for the K-Wise system
 * Enhanced with caching and performance optimizations
 */

// GET /api/stock - List all parts with filtering and pagination
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
            inStock
        } = req.query;

        // Create cache key for this specific query
        const cacheKey = `stock_list_${JSON.stringify(req.query)}`;
        const cachedResult = getCachedData(cacheKey);
        
        if (cachedResult) {
            logger.info('Serving cached stock data', { cacheKey });
            return res.json(cachedResult);
        }

        let whereClause = 'WHERE is_active = true';
        const queryParams = [];
        let paramIndex = 1;

        // Build dynamic WHERE clause
        if (category) {
            whereClause += ` AND category = $${paramIndex++}`;
            queryParams.push(category);
        }

        if (q) {
            whereClause += ` AND (name ILIKE $${paramIndex++} OR brand ILIKE $${paramIndex++})`;
            queryParams.push(`%${q}%`, `%${q}%`);
        }

        if (brand) {
            whereClause += ` AND brand = $${paramIndex++}`;
            queryParams.push(brand);
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
            whereClause += ` AND stock > 0`;
        } else if (inStock === 'false') {
            whereClause += ` AND stock = 0`;
        }
        // If inStock is not specified or 'all', show all items regardless of stock

        // Validate sort field to prevent SQL injection
        const allowedSortFields = ['name', 'category', 'brand', 'price', 'stock', 'created_at'];
        const sortField = allowedSortFields.includes(sort) ? sort : 'name';
        const sortDirection = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Calculate offset with validation
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
        const offset = (pageNum - 1) * limitNum;

        // Main query with optimized selection
        const mainQuery = `
            SELECT 
                id, name, category, brand, price, stock,
                COALESCE(image_url, image_path) AS image_url,
                created_at,
                0 as sold  -- Add sold column for compatibility
            FROM pc_parts 
            ${whereClause}
            ORDER BY ${sortField} ${sortDirection}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(limitNum, offset);

        // Count query for pagination
        const countQuery = `SELECT COUNT(*) as total FROM pc_parts ${whereClause}`;
        const countParams = queryParams.slice(0, -2); // Remove limit and offset

        const [result, countResult] = await Promise.all([
            query(mainQuery, queryParams),
            query(countQuery, countParams)
        ]);

        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limitNum);

        const response = {
            success: true,
            data: result.rows,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: total,
                itemsPerPage: limitNum,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        };

        // Cache the result
        setCachedData(cacheKey, response);

        res.json(response);

    } catch (error) {
        logger.error('Error listing parts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve parts'
        });
    }
};

// GET /api/stock/categories - Get list of categories with caching
const getCategories = async (req, res) => {
    try {
        const cacheKey = 'stock_categories';
        const cachedResult = getCachedData(cacheKey);
        
        if (cachedResult) {
            logger.info('Serving cached categories data');
            return res.json(cachedResult);
        }

        const result = await query(`
            SELECT 
                category, 
                COUNT(*) as count,
                SUM(price * stock) as totalValue
            FROM pc_parts 
            WHERE is_active = true
            GROUP BY category 
            ORDER BY category
        `);

        const response = {
            success: true,
            data: result.rows.map(row => ({
                category: row.category,
                count: parseInt(row.count),
                totalValue: parseFloat(row.totalvalue) || 0
            }))
        };

        // Cache the result for 10 minutes (categories don't change often)
        setCachedData(cacheKey, response);

        res.json(response);

    } catch (error) {
        logger.error('Error getting categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories'
        });
    }
};

// GET /api/stock/brands - Get list of unique brands
const getBrands = async (req, res) => {
    try {
        const result = await query(`
            SELECT DISTINCT brand
            FROM pc_parts 
            WHERE brand IS NOT NULL AND is_active = true
            ORDER BY brand
        `);

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
            WHERE is_active = true
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
        
        // Return common spec fields based on category
        const specFields = {
            'CPU': ['socket', 'cores', 'threads', 'base_clock', 'boost_clock', 'cache'],
            'GPU': ['memory', 'memory_type', 'cuda_cores', 'base_clock', 'boost_clock'],
            'RAM': ['capacity', 'speed', 'type', 'latency', 'voltage'],
            'Storage': ['capacity', 'interface', 'form_factor', 'read_speed', 'write_speed'],
            'Motherboard': ['socket', 'chipset', 'form_factor', 'ram_slots', 'max_ram'],
            'PSU': ['wattage', 'efficiency', 'modular', 'certification'],
            'Case': ['form_factor', 'max_gpu_length', 'max_cpu_cooler_height'],
            'Cooling': ['type', 'socket_compatibility', 'max_tdp', 'noise_level']
        };

        res.json({
            success: true,
            data: specFields[category] || []
        });
    } catch (error) {
        logger.error('Error getting spec fields:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve specification fields'
        });
    }
};

// Multer configuration for file uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the parts directory exists
const partsDir = path.join(__dirname, '..', 'public', 'assets', 'parts');
if (!fs.existsSync(partsDir)) {
    fs.mkdirSync(partsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, partsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'part-' + uniqueSuffix + path.extname(file.originalname));
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
        const { name, category, brand, price, stock } = req.body;
        const image_url = req.file ? `/assets/parts/${req.file.filename}` : null;

        // Clear cache for stock listings
        cache.clear();

        // Since we're using hard deletes, just create new part directly
        // Check for existing active part with same name to prevent duplicates
        const existingPart = await query(`
            SELECT id, name
            FROM pc_parts 
            WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
            LIMIT 1
        `, [name]);

        if (existingPart.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'A part with this name already exists'
            });
        }

        // Create new part
        const result = await query(`
            INSERT INTO pc_parts (name, category, brand, price, stock, image_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, category, brand, parseFloat(price), parseInt(stock), image_url]);

        logger.info(`New part created: ${name}`, { partId: result.rows[0].id });

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Part created successfully'
        });
    } catch (error) {
        logger.error('Error creating part:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create part',
            error: error.message
        });
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

        const image_url = `/assets/parts/${req.file.filename}`;
        
        const result = await query(`
            UPDATE pc_parts SET image_url = $1 WHERE id = $2
            RETURNING *
        `, [image_url, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Part not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Image uploaded successfully'
        });
    } catch (error) {
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
        const { name, category, brand, price, stock, description, specifications } = req.body;
    // Use consistent asset path (previously used /uploads causing broken preview)
    const image_url = req.file ? `/assets/parts/${req.file.filename}` : undefined;

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
            updateFields.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (specifications !== undefined) {
            updateFields.push(`specifications = $${paramIndex++}`);
            values.push(specifications);
        }
        if (image_url !== undefined) {
            updateFields.push(`image_url = $${paramIndex++}`);
            values.push(image_url);
        }

        if (updateFields.length === 0) {
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

        const result = await query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Part not found'
            });
        }

        logger.info(`Part updated: ${result.rows[0].name}`, { partId: id });

        // Clear related cache entries after successful update
        const cacheKeys = Array.from(cache.keys()).filter(key => 
            key.includes('stock_list') || key.includes('categories') || key.includes('brands')
        );
        cacheKeys.forEach(key => cache.delete(key));
        console.log('🗑️ Cleared cache keys after update:', cacheKeys.length);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Part updated successfully'
        });
    } catch (error) {
        logger.error('Error updating part:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update part'
        });
    }
};

// DELETE /api/stock/:id - Hard delete part (permanent removal)
const deletePart = async (req, res) => {
    try {
        const { id } = req.params;

        // First get the part info for logging before deletion
        const partInfo = await query(`
            SELECT id, name, category, brand, image_url
            FROM pc_parts 
            WHERE id = $1
        `, [id]);

        if (partInfo.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Part not found'
            });
        }

        // Perform hard delete (permanent removal from database)
        const result = await query(`
            DELETE FROM pc_parts 
            WHERE id = $1
            RETURNING id, name
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Part not found or already deleted'
            });
        }

        // Clear cache for stock listings
        cache.clear();

        logger.info(`Part permanently deleted: ${partInfo.rows[0].name}`, { 
            partId: id,
            category: partInfo.rows[0].category,
            brand: partInfo.rows[0].brand
        });

        res.json({
            success: true,
            message: 'Part permanently deleted from database'
        });
    } catch (error) {
        logger.error('Error deleting part:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete part'
        });
    }
};

module.exports = {
    list,
    getCategories,
    getBrands,
    getStats,
    get,
    getPartSpecFields,
    upload,
    create,
    uploadImage,
    update,
    delete: deletePart
};
