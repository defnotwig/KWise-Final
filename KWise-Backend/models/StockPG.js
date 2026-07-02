const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Stock model for PostgreSQL database
 * Works with existing KWiseDB tables: stock_categories, stock_items, and component tables (cpu, gpu, etc.)
 */
class Stock {
    /**
     * Get all stock categories with item counts
     */
    static async getCategories() {
        try {
            // Get categories from stock_categories table
            const result = await db.query(`
        SELECT 
          sc.id,
          sc.name,
          sc.slug,
          sc.description,
          COALESCE(si.item_count, 0) as count,
          COALESCE(si.total_value, 0) as total_value
        FROM stock_categories sc
        LEFT JOIN (
          SELECT 
            category_id,
            COUNT(*) as item_count,
            SUM(price * quantity) as total_value
          FROM stock_items
          WHERE is_active = true
          GROUP BY category_id
        ) si ON sc.id = si.category_id
        WHERE sc.is_active = true
        ORDER BY sc.name
      `);

            // Map to expected format with icons
            const categoryIcons = {
                'processor': 'FiCpu',
                'cpu-cooler': 'FiWind',
                'motherboard': 'FiHexagon',
                'video-card': 'FiGrid',
                'memory': 'FiHardDrive',
                'storage': 'FiDatabase',
                'power-supply': 'FiBatteryCharging',
                'case': 'FiBox',
                'monitor': 'FiMonitor',
                'peripherals': 'FiMouse'
            };

            return result.rows.map(row => ({
                category: row.slug,
                name: row.name,
                count: Number.parseInt(row.count, 10),
                totalValue: Number.parseFloat(row.total_value || 0),
                icon: categoryIcons[row.slug] || 'FiPackage'
            }));
        } catch (error) {
            logger.error('Error getting stock categories:', error);
            throw error;
        }
    }

    /**
     * Get items by category
     */
    static async getItemsByCategory(categorySlug) {
        try {
            // First, get category ID
            const categoryResult = await db.query(
                'SELECT id FROM stock_categories WHERE slug = $1',
                [categorySlug]
            );

            if (categoryResult.rows.length === 0) {
                return [];
            }

            const categoryId = categoryResult.rows[0].id;

            // Get items from stock_items table
            const result = await db.query(`
        SELECT 
          id,
          name,
          description,
          price,
          quantity,
          is_active,
          classification,
          extended_metadata,
          created_at,
          updated_at
        FROM stock_items
        WHERE category_id = $1 AND is_active = true
        ORDER BY name
      `, [categoryId]);

            return result.rows.map(row => ({
                id: row.id,
                itemName: row.name,
                description: row.description,
                price: Number.parseFloat(row.price),
                quantity: row.quantity,
                isActive: row.is_active,
                classification: row.classification,
                extendedMetadata: row.extended_metadata,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
        } catch (error) {
            logger.error('Error getting items by category:', error);
            throw error;
        }
    }

    /**
     * Get all PC parts from dedicated component tables
     */
    static async getAllPCParts() {
        try {
            // Get data from all component tables
            const queries = [
                { table: 'cpu', category: 'processor' },
                { table: 'gpu', category: 'video-card' },
                { table: 'motherboard', category: 'motherboard' },
                { table: 'ram', category: 'memory' },
                { table: 'storage', category: 'storage' },
                { table: 'psu', category: 'power-supply' },
                { table: 'pc_case', category: 'case' },
                { table: 'cooling', category: 'cpu-cooler' },
                { table: 'monitor', category: 'monitor' }
            ];

            let allParts = [];

            for (const { table, category } of queries) {
                try {
                    const result = await db.query(`
            SELECT 
              id,
              name,
              price,
              '${category}' as category
            FROM ${table}
            ORDER BY name
          `);

                    const parts = result.rows.map(row => ({
                        id: `${table}_${row.id}`,
                        itemName: row.name,
                        price: Number.parseFloat(row.price),
                        category: category,
                        source: table,
                        sourceId: row.id
                    }));

                    allParts = allParts.concat(parts);
                } catch (tableError) {
                    logger.warn(`Error getting data from table ${table}:`, tableError.message);
                }
            }

            return allParts;
        } catch (error) {
            logger.error('Error getting all PC parts:', error);
            throw error;
        }
    }

    /**
     * Get stock statistics
     */
    static async getStockStats() {
        try {
            const stats = await db.query(`
        SELECT 
          COUNT(*) as total_items,
          SUM(quantity) as total_quantity,
          SUM(price * quantity) as total_value,
          COUNT(CASE WHEN quantity < 10 THEN 1 END) as low_stock_items,
          COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock_items
        FROM stock_items
        WHERE is_active = true
      `);

            return {
                totalItems: Number.parseInt(stats.rows[0].total_items, 10),
                totalQuantity: Number.parseInt(stats.rows[0].total_quantity || 0, 10),
                totalValue: Number.parseFloat(stats.rows[0].total_value || 0),
                lowStockItems: Number.parseInt(stats.rows[0].low_stock_items, 10),
                outOfStockItems: Number.parseInt(stats.rows[0].out_of_stock_items, 10)
            };
        } catch (error) {
            logger.error('Error getting stock statistics:', error);
            throw error;
        }
    }

    /**
     * Get low stock alerts
     */
    static async getLowStockAlerts(threshold = 10) {
        try {
            const result = await db.query(`
        SELECT 
          si.id,
          si.name,
          si.quantity,
          si.price,
          sc.name as category_name
        FROM stock_items si
        JOIN stock_categories sc ON si.category_id = sc.id
        WHERE si.quantity <= $1 AND si.is_active = true
        ORDER BY si.quantity ASC, si.name
      `, [threshold]);

            return result.rows.map(row => ({
                id: row.id,
                itemName: row.name,
                quantity: row.quantity,
                price: Number.parseFloat(row.price),
                categoryName: row.category_name
            }));
        } catch (error) {
            logger.error('Error getting low stock alerts:', error);
            throw error;
        }
    }

    /**
     * Get item by ID
     */
    static async getItemById(id) {
        try {
            const result = await db.query(`
        SELECT 
          si.*,
          sc.name as category_name,
          sc.slug as category_slug
        FROM stock_items si
        JOIN stock_categories sc ON si.category_id = sc.id
        WHERE si.id = $1
      `, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                id: row.id,
                itemName: row.name,
                description: row.description,
                price: Number.parseFloat(row.price),
                quantity: row.quantity,
                categoryName: row.category_name,
                categorySlug: row.category_slug,
                classification: row.classification,
                extendedMetadata: row.extended_metadata,
                isActive: row.is_active,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            logger.error('Error getting item by ID:', error);
            throw error;
        }
    }

    /**
     * Add new stock item
     */
    static async addItem(itemData) {
        try {
            const { categoryId, name, description, price, quantity, classification, extendedMetadata } = itemData;

            const result = await db.query(`
        INSERT INTO stock_items (category_id, name, description, price, quantity, classification, extended_metadata, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
        RETURNING *
      `, [categoryId, name, description, price, quantity, classification || null, extendedMetadata || {}]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error adding stock item:', error);
            throw error;
        }
    }

    /**
     * Update stock item
     */
    static async updateItem(id, updateData) {
        try {
            const { name, description, price, quantity, classification, extendedMetadata } = updateData;

            const result = await db.query(`
        UPDATE stock_items 
        SET name = $2, description = $3, price = $4, quantity = $5, classification = $6, extended_metadata = $7, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id, name, description, price, quantity, classification || null, extendedMetadata || {}]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating stock item:', error);
            throw error;
        }
    }

    /**
     * Delete stock item (soft delete)
     */
    static async deleteItem(id) {
        try {
            const result = await db.query(`
        UPDATE stock_items 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error deleting stock item:', error);
            throw error;
        }
    }
}

module.exports = Stock;
