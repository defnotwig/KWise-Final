/**
 * =====================================================================
 * PREBUILT PCS API ROUTES
 * =====================================================================
 * Serves prebuilt PC configurations dynamically from database
 * Supports filtering by category, purposes, and price range
 */

const express = require('express');
const logger = require('../utils/logger');
const router = express.Router();
const { query } = require('../config/db');

/**
 * GET /api/prebuilt/all
 * Get all available prebuilt PCs
 */
router.get('/all', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, name, category, total_price as price,
        purposes, image_url as image, addons,
        description, is_featured, is_available,
        stock_quantity, display_order
      FROM prebuilt_pcs
      WHERE is_available = true
      ORDER BY display_order, id
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
    
  } catch (error) {
    logger.error('Error fetching prebuilt PCs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prebuilt PCs',
      error: error.message
    });
  }
});

/**
 * GET /api/prebuilt/featured
 * Get featured prebuilt PCs
 */
router.get('/featured', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, name, category, total_price as price,
        purposes, image_url as image, addons,
        description, is_featured, is_available,
        stock_quantity, display_order
      FROM prebuilt_pcs
      WHERE is_available = true AND is_featured = true
      ORDER BY display_order, id
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
    
  } catch (error) {
    logger.error('Error fetching featured prebuilt PCs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured prebuilt PCs',
      error: error.message
    });
  }
});

/**
 * GET /api/prebuilt/by-category
 * Get prebuilt PCs filtered by category and purposes
 * Query params: category, purposes (comma-separated)
 */
router.get('/by-category', async (req, res) => {
  try {
    const { category, purposes } = req.query;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category parameter is required'
      });
    }
    
    let queryText = `
      SELECT 
        id, name, category, total_price as price,
        purposes, image_url as image, addons,
        description, is_featured, is_available,
        stock_quantity, display_order
      FROM prebuilt_pcs
      WHERE is_available = true
      AND LOWER(category) = LOWER($1)
    `;
    
    const params = [category];
    
    // Filter by purposes if provided
    if (purposes) {
      const purposesArray = purposes.split(',').map(p => p.trim().toLowerCase());
      queryText += ` AND purposes && $2`;
      params.push(purposesArray);
    }
    
    queryText += ` ORDER BY display_order, id`;
    
    const result = await query(queryText, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      filters: {
        category,
        purposes: purposes ? purposes.split(',') : null
      }
    });
    
  } catch (error) {
    logger.error('Error fetching filtered prebuilt PCs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prebuilt PCs',
      error: error.message
    });
  }
});

/**
 * GET /api/prebuilt/:id
 * Get specific prebuilt PC with components
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get prebuilt PC details
    const pcResult = await query(`
      SELECT 
        id, name, category, total_price as price,
        purposes, image_url as image, addons,
        description, is_featured, is_available,
        stock_quantity, build_time_hours, warranty_months
      FROM prebuilt_pcs
      WHERE id = $1 AND is_available = true
    `, [id]);
    
    if (pcResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prebuilt PC not found'
      });
    }
    
    const pc = pcResult.rows[0];
    
    // Get components
    const componentsResult = await query(`
      SELECT 
        pc.component_role,
        pc.quantity,
        pc.is_optional,
        pp.id as part_id,
        pp.name as part_name,
        pp.category as part_category,
        pp.price as part_price,
        pp.stock as part_stock,
        pp.brand as part_brand
      FROM prebuilt_components pc
      LEFT JOIN pc_parts pp ON pc.pc_part_id = pp.id
      WHERE pc.prebuilt_pc_id = $1
      ORDER BY pc.id
    `, [id]);
    
    // Parse component_role to extract type and name
    const components = componentsResult.rows.map(comp => {
      const [type, ...nameParts] = comp.component_role.split(':');
      return {
        name: type.trim(),
        value: nameParts.join(':').trim() || comp.part_name || 'Not specified',
        part_id: comp.part_id,
        part_stock: comp.part_stock,
        part_price: comp.part_price,
        quantity: comp.quantity,
        is_optional: comp.is_optional,
        in_stock: comp.part_id ? (comp.part_stock > 0) : null
      };
    });
    
    pc.components = components;
    
    res.json({
      success: true,
      data: pc
    });
    
  } catch (error) {
    logger.error('Error fetching prebuilt PC details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prebuilt PC details',
      error: error.message
    });
  }
});

/**
 * GET /api/prebuilt/categories
 * Get available categories with counts
 */
router.get('/categories/list', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        category,
        COUNT(*) as count,
        MIN(total_price) as min_price,
        MAX(total_price) as max_price
      FROM prebuilt_pcs
      WHERE is_available = true
      GROUP BY category
      ORDER BY min_price
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    logger.error('Error fetching prebuilt categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

/**
 * GET /api/prebuilt/check-stock/:id
 * Check if all components are in stock
 */
router.get('/check-stock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        COUNT(*) as total_components,
        COUNT(CASE WHEN pp.stock_quantity > 0 THEN 1 END) as in_stock_count,
        COUNT(CASE WHEN pp.stock_quantity = 0 THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN pp.id IS NULL THEN 1 END) as unlinked_count
      FROM prebuilt_components pc
      LEFT JOIN pc_parts pp ON pc.pc_part_id = pp.id
      WHERE pc.prebuilt_pc_id = $1
    `, [id]);
    
    const stockInfo = result.rows[0];
    const allInStock = (Number.parseInt(stockInfo.in_stock_count, 10) + Number.parseInt(stockInfo.unlinked_count, 10)) === Number.parseInt(stockInfo.total_components, 10);
    
    res.json({
      success: true,
      data: {
        ...stockInfo,
        all_in_stock: allInStock,
        build_ready: allInStock
      }
    });
    
  } catch (error) {
    logger.error('Error checking stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check stock',
      error: error.message
    });
  }
});

module.exports = router;
