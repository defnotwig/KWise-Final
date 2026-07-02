const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * GET /api/products/search
 * Search for products by category with optional filters
 */
router.get('/search', async (req, res) => {
    try {
        const { category, limit = 100, offset = 0, socket, memory_type, form_factor } = req.query;

        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category parameter is required'
            });
        }

        logger.info(`Searching products: category=${category}, limit=${limit}`);

        let whereConditions = [
            'p.category = $1',
            'p.is_active = true',
            'p.kiosk_visible = true'
        ];
        let params = [category];
        let paramIndex = 2;

        // Add optional filters based on category
        if (category.toLowerCase() === 'motherboard') {
            if (socket) {
                whereConditions.push(`m.socket = $${paramIndex++}`);
                params.push(socket);
            }
            if (memory_type) {
                whereConditions.push(`m.memory_type = $${paramIndex++}`);
                params.push(memory_type);
            }

            const sqlQuery = `
                SELECT 
                    m.id,
                    m.name,
                    m.socket,
                    m.chipset,
                    m.memory_type,
                    m.max_ram,
                    m.ram_slots,
                    m.m2_slots,
                    m.price,
                    COALESCE(p.image_url, p.image_path) AS "imageUrl",
                    p.brand,
                    p.category,
                    p.stock
                FROM motherboard m
                INNER JOIN pc_parts p ON p.id = m.id
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY m.price ASC
                LIMIT $${paramIndex++} OFFSET $${paramIndex}
            `;
            params.push(Number.parseInt(limit, 10), Number.parseInt(offset, 10));

            const result = await query(sqlQuery, params);

            return res.json({
                success: true,
                data: {
                    products: result.rows,
                    total: result.rows.length,
                    category,
                    filters: { socket, memory_type }
                }
            });
        }

        // For other categories, use generic pc_parts query
        const genericQuery = `
            SELECT 
                p.id,
                p.name,
                p.brand,
                p.category,
                p.price,
                p.stock,
                p.tier,
                COALESCE(p.image_url, p.image_path) AS "imageUrl"
            FROM pc_parts p
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY p.price ASC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(Number.parseInt(limit, 10), Number.parseInt(offset, 10));

        const result = await query(genericQuery, params);

        res.json({
            success: true,
            data: {
                products: result.rows,
                total: result.rows.length,
                category
            }
        });

    } catch (error) {
        logger.error('Error searching products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search products',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/products/category/:category
 * Get all products in a specific category
 */
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 100, offset = 0 } = req.query;

        logger.info(`Fetching products for category: ${category}`);

        const sqlQuery = `
            SELECT 
                p.id,
                p.name,
                p.brand,
                p.category,
                p.price,
                p.stock,
                p.tier,
                COALESCE(p.image_url, p.image_path) AS "imageUrl"
            FROM pc_parts p
            WHERE p.category = $1
              AND p.is_active = true
              AND p.kiosk_visible = true
            ORDER BY p.price ASC
            LIMIT $2 OFFSET $3
        `;

        const result = await query(sqlQuery, [category, Number.parseInt(limit, 10), Number.parseInt(offset, 10)]);

        res.json({
            success: true,
            data: {
                products: result.rows,
                total: result.rows.length,
                category
            }
        });

    } catch (error) {
        logger.error('Error fetching products by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/products/:id
 * Get single product by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        logger.info(`Fetching product: ${id}`);

        const sqlQuery = `
            SELECT 
                p.*,
                COALESCE(p.image_url, p.image_path) AS "imageUrl"
            FROM pc_parts p
            WHERE p.id = $1
        `;

        const result = await query(sqlQuery, [id]);

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
        logger.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;

