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
 * Enhanced Stock Controller with Category-Specific Specifications
 * Handles all stock-related operations for the K-Wise system
 * Enhanced with detailed specifications for each component category
 */

// Category to table mapping for specifications
const CATEGORY_SPEC_TABLES = {
    'CPU': 'cpu',
    'GPU': 'gpu',
    'Motherboard': 'motherboard',
    'RAM': 'ram',
    'Storage': 'storage',
    'PSU': 'psu',
    'Case': 'pc_case',
    'Cooling': 'cooling',
    'Monitor': 'monitors',
    'Keyboard': 'keyboard',
    'Mouse': 'mouse',
    'Headphones': 'headphones',
    'Speakers': 'speakers',
    'Webcam': 'webcams'
};

// GET /api/stock - List all parts with filtering, pagination, and specifications
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
            inStock,
            includeSpecs = 'true'
        } = req.query;

        // Create cache key for this specific query
        const cacheKey = `stock_list_${JSON.stringify(req.query)}`;
        const cachedResult = getCachedData(cacheKey);
        
        if (cachedResult) {
            logger.info('Serving cached stock data', { cacheKey });
            return res.json(cachedResult);
        }

        let whereClause = 'WHERE p.id IS NOT NULL';
        const queryParams = [];
        let paramIndex = 1;

        // Build dynamic WHERE clause
        if (category) {
            whereClause += ` AND p.category = $${paramIndex++}`;
            queryParams.push(category);
        }

        if (q) {
            whereClause += ` AND (p.name ILIKE $${paramIndex++} OR p.brand ILIKE $${paramIndex++})`;
            queryParams.push(`%${q}%`, `%${q}%`);
        }

        if (brand) {
            whereClause += ` AND p.brand = $${paramIndex++}`;
            queryParams.push(brand);
        }

        if (minPrice) {
            whereClause += ` AND p.price >= $${paramIndex++}`;
            queryParams.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            whereClause += ` AND p.price <= $${paramIndex++}`;
            queryParams.push(parseFloat(maxPrice));
        }

        if (inStock === 'true') {
            whereClause += ` AND p.stock > 0`;
        } else if (inStock === 'false') {
            whereClause += ` AND p.stock = 0`;
        }

        // Validate sort field to prevent SQL injection
        const allowedSortFields = ['name', 'category', 'brand', 'price', 'stock', 'created_at'];
        const sortField = allowedSortFields.includes(sort) ? `p.${sort}` : 'p.name';
        const sortDirection = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Calculate offset with validation
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
        const offset = (pageNum - 1) * limitNum;

        // Main query with specifications join
        let mainQuery = `
            SELECT 
                p.id, p.name, p.category, p.brand, p.price, p.stock,
                COALESCE(p.image_url, p.image_path) AS image_url,
                p.created_at
        `;

        // Add specification fields based on category
        if (includeSpecs === 'true' && category && CATEGORY_SPEC_TABLES[category]) {
            const specTable = CATEGORY_SPEC_TABLES[category];
            mainQuery += `, s.*`;
            mainQuery += ` FROM pc_parts p
                LEFT JOIN ${specTable} s ON p.id = s.part_id`;
        } else {
            mainQuery += ` FROM pc_parts p`;
        }

        mainQuery += ` ${whereClause}
            ORDER BY ${sortField} ${sortDirection}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(limitNum, offset);

        // Count query for pagination
        const countQuery = `SELECT COUNT(*) as total FROM pc_parts p ${whereClause}`;
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

// GET /api/stock/categories - Get list of categories with counts
const getCategories = async (req, res) => {
    try {
        const cacheKey = 'stock_categories';
        const cachedResult = getCachedData(cacheKey);
        
        if (cachedResult) {
            return res.json(cachedResult);
        }

        const result = await query(`
            SELECT 
                category,
                COUNT(*) as count,
                SUM(stock) as total_stock,
                AVG(price) as avg_price
            FROM pc_parts 
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY category
        `);

        const response = {
            success: true,
            data: result.rows
        };

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
            WHERE brand IS NOT NULL
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

// GET /api/stock/:id - Get single part with specifications
const get = async (req, res) => {
    try {
        const { id } = req.params;

        // First get the basic part info
        const partResult = await query(`
            SELECT * FROM pc_parts WHERE id = $1
        `, [id]);

        if (partResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const part = partResult.rows[0];
        
        // Get specifications if category has spec table
        let specifications = null;
        if (CATEGORY_SPEC_TABLES[part.category]) {
            const specTable = CATEGORY_SPEC_TABLES[part.category];
            const specResult = await query(`
                SELECT * FROM ${specTable} WHERE part_id = $1
            `, [id]);
            
            if (specResult.rows.length > 0) {
                specifications = specResult.rows[0];
            }
        }

        res.json({
            success: true,
            data: {
                ...part,
                specifications
            }
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
const getSpecificationFields = async (req, res) => {
    try {
        const { category } = req.params;
        
        // Define specification fields for each category
        const specificationFields = {
            'CPU': [
                { name: 'socket', label: 'Socket', type: 'text', required: true },
                { name: 'series', label: 'Series', type: 'text', required: false },
                { name: 'base_clock', label: 'Base Clock (GHz)', type: 'number', step: 0.1, required: false },
                { name: 'turbo_clock', label: 'Turbo Clock (GHz)', type: 'number', step: 0.1, required: false },
                { name: 'cores', label: 'Cores', type: 'number', required: true },
                { name: 'threads', label: 'Threads', type: 'number', required: true },
                { name: 'integrated_gpu', label: 'Integrated GPU', type: 'checkbox', required: false },
                { name: 'lithography', label: 'Lithography (nm)', type: 'number', required: false },
                { name: 'tdp', label: 'TDP (Watts)', type: 'number', required: false }
            ],
            'GPU': [
                { name: 'memory_type', label: 'Memory Type', type: 'text', required: false },
                { name: 'memory_capacity', label: 'Memory (GB)', type: 'number', required: true },
                { name: 'core_clock', label: 'Core Clock (MHz)', type: 'number', required: false },
                { name: 'boost_clock', label: 'Boost Clock (MHz)', type: 'number', required: false },
                { name: 'interface', label: 'Interface', type: 'text', required: false },
                { name: 'length', label: 'Length (mm)', type: 'number', required: false },
                { name: 'tdp', label: 'TDP (Watts)', type: 'number', required: false },
                { name: 'pcie_8pin', label: '8-pin PCIe Connectors', type: 'number', required: false }
            ],
            'Motherboard': [
                { name: 'socket', label: 'Socket', type: 'text', required: true },
                { name: 'chipset', label: 'Chipset', type: 'text', required: true },
                { name: 'memory_type', label: 'Memory Type', type: 'text', required: false },
                { name: 'max_ram', label: 'Max RAM (GB)', type: 'number', required: false },
                { name: 'ram_slots', label: 'RAM Slots', type: 'number', required: false },
                { name: 'm2_slots', label: 'M.2 Slots', type: 'number', required: false },
                { name: 'wireless_networking', label: 'Wireless Networking', type: 'checkbox', required: false },
                { name: 'form_factor', label: 'Form Factor', type: 'text', required: false }
            ],
            'RAM': [
                { name: 'memory_type', label: 'Memory Type', type: 'text', required: true },
                { name: 'configuration', label: 'Configuration', type: 'text', required: false },
                { name: 'speed', label: 'Speed (MHz)', type: 'number', required: true },
                { name: 'voltage', label: 'Voltage (V)', type: 'number', step: 0.01, required: false },
                { name: 'cas_latency', label: 'CAS Latency', type: 'number', required: false },
                { name: 'total_capacity', label: 'Total Capacity (GB)', type: 'number', required: true }
            ],
            'Storage': [
                { name: 'capacity', label: 'Capacity', type: 'text', required: true },
                { name: 'storage_type', label: 'Storage Type', type: 'text', required: true },
                { name: 'interface', label: 'Interface', type: 'text', required: false },
                { name: 'nvme_support', label: 'NVMe Support', type: 'checkbox', required: false },
                { name: 'read_speed', label: 'Read Speed (MB/s)', type: 'number', required: false },
                { name: 'write_speed', label: 'Write Speed (MB/s)', type: 'number', required: false },
                { name: 'form_factor', label: 'Form Factor', type: 'text', required: false }
            ],
            'PSU': [
                { name: 'wattage', label: 'Wattage (W)', type: 'number', required: true },
                { name: 'efficiency_rating', label: 'Efficiency Rating', type: 'text', required: false },
                { name: 'modular', label: 'Modular', type: 'checkbox', required: false },
                { name: 'form_factor', label: 'Form Factor', type: 'text', required: false },
                { name: 'pcie_connectors', label: 'PCIe Connectors', type: 'number', required: false },
                { name: 'sata_connectors', label: 'SATA Connectors', type: 'number', required: false }
            ],
            'Case': [
                { name: 'category', label: 'Case Type', type: 'text', required: false },
                { name: 'color', label: 'Color', type: 'text', required: false },
                { name: 'fans_included', label: 'Fans Included', type: 'number', required: false },
                { name: 'max_gpu_length', label: 'Max GPU Length (mm)', type: 'number', required: false },
                { name: 'max_cpu_cooler_height', label: 'Max CPU Cooler Height (mm)', type: 'number', required: false },
                { name: 'motherboard_support', label: 'Motherboard Support', type: 'text', required: false },
                { name: 'tempered_glass', label: 'Tempered Glass', type: 'checkbox', required: false }
            ],
            'Cooling': [
                { name: 'max_rpm', label: 'Max RPM', type: 'number', required: false },
                { name: 'max_noise', label: 'Max Noise (dBA)', type: 'number', step: 0.1, required: false },
                { name: 'height', label: 'Height (mm)', type: 'number', required: false },
                { name: 'water_cooled', label: 'Water Cooled', type: 'checkbox', required: false },
                { name: 'socket_compatibility', label: 'Socket Compatibility', type: 'text', required: false },
                { name: 'radiator_size', label: 'Radiator Size', type: 'text', required: false }
            ],
            'Monitor': [
                { name: 'screen_size', label: 'Screen Size', type: 'text', required: true },
                { name: 'resolution', label: 'Resolution', type: 'text', required: true },
                { name: 'refresh_rate', label: 'Refresh Rate (Hz)', type: 'number', required: false },
                { name: 'response_time', label: 'Response Time (ms)', type: 'number', step: 0.1, required: false },
                { name: 'panel_type', label: 'Panel Type', type: 'text', required: false },
                { name: 'curved', label: 'Curved', type: 'checkbox', required: false },
                { name: 'vesa_mount', label: 'VESA Mount', type: 'checkbox', required: false }
            ],
            'Keyboard': [
                { name: 'style', label: 'Style', type: 'text', required: false },
                { name: 'switch_type', label: 'Switch Type', type: 'text', required: false },
                { name: 'backlit', label: 'Backlit', type: 'checkbox', required: false },
                { name: 'tenkeyless', label: 'Tenkeyless', type: 'checkbox', required: false },
                { name: 'connection_type', label: 'Connection Type', type: 'text', required: false },
                { name: 'polling_rate', label: 'Polling Rate (Hz)', type: 'number', required: false }
            ],
            'Mouse': [
                { name: 'tracking_method', label: 'Tracking Method', type: 'text', required: false },
                { name: 'connection_type', label: 'Connection Type', type: 'text', required: false },
                { name: 'dpi', label: 'DPI', type: 'number', required: false },
                { name: 'hand_orientation', label: 'Hand Orientation', type: 'text', required: false },
                { name: 'programmable_buttons', label: 'Programmable Buttons', type: 'number', required: false },
                { name: 'polling_rate', label: 'Polling Rate (Hz)', type: 'number', required: false }
            ],
            'Headphones': [
                { name: 'type', label: 'Type', type: 'text', required: false },
                { name: 'frequency', label: 'Frequency Response', type: 'text', required: false },
                { name: 'microphone', label: 'Microphone', type: 'checkbox', required: false },
                { name: 'wireless', label: 'Wireless', type: 'checkbox', required: false },
                { name: 'impedance', label: 'Impedance (Ohms)', type: 'number', required: false },
                { name: 'driver_size', label: 'Driver Size (mm)', type: 'number', required: false }
            ],
            'Speakers': [
                { name: 'configuration', label: 'Configuration', type: 'text', required: false },
                { name: 'total_wattage', label: 'Total Wattage (W)', type: 'number', required: false },
                { name: 'frequency_response', label: 'Frequency Response', type: 'text', required: false },
                { name: 'connection_type', label: 'Connection Type', type: 'text', required: false },
                { name: 'subwoofer', label: 'Subwoofer', type: 'checkbox', required: false },
                { name: 'bluetooth_support', label: 'Bluetooth Support', type: 'checkbox', required: false }
            ],
            'Webcam': [
                { name: 'resolution', label: 'Resolution', type: 'text', required: true },
                { name: 'connection', label: 'Connection', type: 'text', required: false },
                { name: 'focus_type', label: 'Focus Type', type: 'text', required: false },
                { name: 'fov_angle', label: 'FOV Angle (degrees)', type: 'number', required: false },
                { name: 'frame_rate', label: 'Frame Rate (FPS)', type: 'number', required: false },
                { name: 'microphone_builtin', label: 'Built-in Microphone', type: 'checkbox', required: false }
            ]
        };

        res.json({
            success: true,
            data: specificationFields[category] || []
        });
    } catch (error) {
        logger.error('Error getting specification fields:', error);
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

// POST /api/stock - Create new part with specifications
const create = async (req, res) => {
    const client = await query('BEGIN');
    
    try {
        const { name, category, brand, price, stock, specifications } = req.body;
        const image_url = req.file ? `/assets/parts/${req.file.filename}` : null;

        // Clear cache for stock listings
        cache.clear();

        // Check for existing part with same name to prevent duplicates
        const existingPart = await query(`
            SELECT id, name
            FROM pc_parts 
            WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
            LIMIT 1
        `, [name]);

        if (existingPart.rows.length > 0) {
            await query('ROLLBACK');
            return res.status(409).json({
                success: false,
                message: 'A part with this name already exists'
            });
        }

        // Create new part
        const partResult = await query(`
            INSERT INTO pc_parts (name, category, brand, price, stock, image_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, category, brand, parseFloat(price), parseInt(stock), image_url]);

        const newPart = partResult.rows[0];

        // Add specifications if provided and category has spec table
        if (specifications && CATEGORY_SPEC_TABLES[category]) {
            const specTable = CATEGORY_SPEC_TABLES[category];
            const specFields = Object.keys(specifications);
            
            if (specFields.length > 0) {
                const columns = ['part_id', 'name', ...specFields];
                const values = [newPart.id, name, ...specFields.map(field => specifications[field])];
                const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
                
                await query(`
                    INSERT INTO ${specTable} (${columns.join(', ')})
                    VALUES (${placeholders})
                `, values);
            }
        }

        await query('COMMIT');

        logger.info(`New part with specifications created: ${name}`, { 
            partId: newPart.id,
            category,
            hasSpecs: !!specifications
        });

        res.status(201).json({
            success: true,
            data: newPart,
            message: 'Part created successfully with specifications'
        });
    } catch (error) {
        await query('ROLLBACK');
        logger.error('Error creating part with specifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create part',
            error: error.message
        });
    }
};

// PATCH /api/stock/:id - Update part with specifications
const update = async (req, res) => {
    const client = await query('BEGIN');
    
    try {
        const { id } = req.params;
        const { name, category, brand, price, stock, specifications } = req.body;
        const image_url = req.file ? `/assets/parts/${req.file.filename}` : undefined;

        // First get current part info
        const currentPart = await query(`
            SELECT * FROM pc_parts WHERE id = $1
        `, [id]);

        if (currentPart.rows.length === 0) {
            await query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Part not found'
            });
        }

        const currentCategory = currentPart.rows[0].category;

        // Update basic part info
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
        if (image_url !== undefined) {
            updateFields.push(`image_url = $${paramIndex++}`);
            values.push(image_url);
        }

        if (updateFields.length > 0) {
            values.push(id);
            const updateQuery = `
                UPDATE pc_parts 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            await query(updateQuery, values);
        }

        // Handle specifications update
        if (specifications) {
            const targetCategory = category || currentCategory;
            
            if (CATEGORY_SPEC_TABLES[targetCategory]) {
                const specTable = CATEGORY_SPEC_TABLES[targetCategory];
                
                // Delete existing specifications if category changed
                if (category && category !== currentCategory && CATEGORY_SPEC_TABLES[currentCategory]) {
                    const oldSpecTable = CATEGORY_SPEC_TABLES[currentCategory];
                    await query(`DELETE FROM ${oldSpecTable} WHERE part_id = $1`, [id]);
                }
                
                // Update or insert specifications
                const specFields = Object.keys(specifications);
                
                if (specFields.length > 0) {
                    // Check if specifications exist
                    const existingSpec = await query(`
                        SELECT id FROM ${specTable} WHERE part_id = $1
                    `, [id]);
                    
                    if (existingSpec.rows.length > 0) {
                        // Update existing specifications
                        const updateSpecFields = specFields.map((field, index) => 
                            `${field} = $${index + 2}`
                        );
                        const updateSpecValues = [id, ...specFields.map(field => specifications[field])];
                        
                        await query(`
                            UPDATE ${specTable}
                            SET ${updateSpecFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                            WHERE part_id = $1
                        `, updateSpecValues);
                    } else {
                        // Insert new specifications
                        const columns = ['part_id', 'name', ...specFields];
                        const values = [id, name || currentPart.rows[0].name, ...specFields.map(field => specifications[field])];
                        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
                        
                        await query(`
                            INSERT INTO ${specTable} (${columns.join(', ')})
                            VALUES (${placeholders})
                        `, values);
                    }
                }
            }
        }

        await query('COMMIT');

        // Get updated part with specifications
        const updatedPart = await get(req, res);
        
        logger.info(`Part updated with specifications: ${name || currentPart.rows[0].name}`, { 
            partId: id,
            hasSpecs: !!specifications
        });

        // Clear related cache entries after successful update
        cache.clear();

    } catch (error) {
        await query('ROLLBACK');
        logger.error('Error updating part with specifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update part'
        });
    }
};

// DELETE /api/stock/:id - Hard delete part with specifications
const deletePart = async (req, res) => {
    try {
        const { id } = req.params;

        // Get part info for logging before deletion
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

        const part = partInfo.rows[0];
        
        // Delete specifications first (handled by CASCADE, but explicit for logging)
        if (CATEGORY_SPEC_TABLES[part.category]) {
            const specTable = CATEGORY_SPEC_TABLES[part.category];
            await query(`DELETE FROM ${specTable} WHERE part_id = $1`, [id]);
        }

        // Perform hard delete of main part (CASCADE will handle specs)
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

        logger.info(`Part and specifications permanently deleted: ${part.name}`, { 
            partId: id,
            category: part.category,
            brand: part.brand
        });

        res.json({
            success: true,
            message: 'Part and specifications permanently deleted from database'
        });
    } catch (error) {
        logger.error('Error deleting part with specifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete part'
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

module.exports = {
    list,
    getCategories,
    getBrands,
    getStats,
    get,
    getSpecificationFields,
    upload,
    create,
    uploadImage,
    update,
    delete: deletePart
};