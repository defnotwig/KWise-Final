const { Pool } = require('pg');

const SPEC_TABLES = {
    'CPU': 'cpu_specs',
    'GPU': 'gpu_specs',
    'Motherboard': 'motherboard_specs',
    'RAM': 'ram_specs',
    'Storage': 'storage_specs',
    'PSU': 'psu_specs',
    'Case': 'case_specs',
    'Cooling': 'cooling_specs',
    'Monitor': 'monitor_specs',
    'Headphones': 'headphones_specs',
    'Keyboard': 'keyboard_specs',
    'Mouse': 'mouse_specs',
    'Speakers': 'speakers_specs',
    'Webcam': 'webcam_specs'
};

const quoteIdentifier = (identifier) => {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
        throw new Error(`Invalid SQL identifier: ${identifier}`);
    }
    return `"${identifier.replace(/"/g, '""')}"`;
};

class PCPartsModel {
    constructor(pool) {
        this.pool = pool;
    }

    // List parts with filtering, sorting, and pagination
    async listParts(options = {}) {
        const {
            category,
            q: searchQuery,
            page = 1,
            limit = 20,
            sort = 'name',
            order = 'ASC',
            brand,
            minPrice,
            maxPrice,
            inStock = true
        } = options;

        let query = `
            SELECT p.id, p.name, p.category, p.brand, p.price, p.stock, p.image_url, p.original_filename, p.file_path, p.is_active, p.created_at
            FROM pc_parts p
        `;

        const params = [];
        let paramCount = 0;

        // Add filters
        if (category) {
            query += ` WHERE p.category = $${++paramCount}`;
            params.push(category);
        }

        if (brand) {
            query += (category ? ' AND' : ' WHERE') + ` p.brand ILIKE $${++paramCount}`;
            params.push(`%${brand}%`);
        }

        if (searchQuery) {
            query += (category || brand ? ' AND' : ' WHERE') + ` (p.name ILIKE $${++paramCount} OR p.brand ILIKE $${paramCount})`;
            params.push(`%${searchQuery}%`);
        }

        if (minPrice) {
            query += (category || brand || searchQuery ? ' AND' : ' WHERE') + ` p.price >= $${++paramCount}`;
            params.push(minPrice);
        }

        if (maxPrice) {
            query += (category || brand || searchQuery || minPrice ? ' AND' : ' WHERE') + ` p.price <= $${++paramCount}`;
            params.push(maxPrice);
        }

        if (inStock) {
            const hasWhere = category || brand || searchQuery || minPrice || maxPrice;
            query += (hasWhere ? ' AND' : ' WHERE') + ` p.stock > 0`;
        }

        // Add sorting
        const validSorts = ['name', 'price', 'brand', 'created_at', 'stock'];
        const validOrders = ['ASC', 'DESC'];
        
        if (validSorts.includes(sort) && validOrders.includes(order.toUpperCase())) {
            query += ` ORDER BY p.${sort} ${order.toUpperCase()}`;
        } else {
            query += ` ORDER BY p.name ASC`;
        }

        // Add pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        params.push(limit, offset);

        const result = await this.pool.query(query, params);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM pc_parts p
        `;

        const countParams = [];
        let countParamCount = 0;
        let whereAdded = false;

        if (category) {
            countQuery += ` WHERE p.category = $${++countParamCount}`;
            countParams.push(category);
            whereAdded = true;
        }

        if (brand) {
            countQuery += whereAdded ? ` AND` : ` WHERE`;
            countQuery += ` p.brand ILIKE $${++countParamCount}`;
            countParams.push(`%${brand}%`);
            whereAdded = true;
        }

        if (searchQuery) {
            countQuery += whereAdded ? ` AND` : ` WHERE`;
            countQuery += ` (p.name ILIKE $${++countParamCount} OR p.brand ILIKE $${countParamCount})`;
            countParams.push(`%${searchQuery}%`);
            whereAdded = true;
        }

        if (minPrice) {
            countQuery += whereAdded ? ` AND` : ` WHERE`;
            countQuery += ` p.price >= $${++countParamCount}`;
            countParams.push(minPrice);
            whereAdded = true;
        }

        if (maxPrice) {
            countQuery += whereAdded ? ` AND` : ` WHERE`;
            countQuery += ` p.price <= $${++countParamCount}`;
            countParams.push(maxPrice);
            whereAdded = true;
        }

        if (inStock) {
            countQuery += whereAdded ? ` AND` : ` WHERE`;
            countQuery += ` p.stock > 0`;
        }

        const countResult = await this.pool.query(countQuery, countParams);
        const total = Number.parseInt(countResult.rows[0].total, 10);

        return {
            items: result.rows,
            pagination: {
                page: Number.parseInt(page, 10),
                limit: Number.parseInt(limit, 10),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Get single part with full specifications
    async getPart(id) {
        const query = `
            SELECT p.*
            FROM pc_parts p
            WHERE p.id = $1
        `;

        const result = await this.pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const part = result.rows[0];
        
        // Return the part without additional specs since our database schema only has the main pc_parts table
        return part;
    }

    // Create new part with specifications
    async createPart(data) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Insert into pc_parts with enhanced image fields
            const partQuery = `
                INSERT INTO pc_parts (id, name, category, brand, price, stock, image_url, images, original_filename, file_path, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `;

            const partValues = [
                data.id,
                data.name,
                data.category,
                data.brand,
                data.price,
                data.stock || 0,
                data.image_url || null,
                data.images || '[]',
                data.original_filename || null,
                data.file_path || null,
                data.is_active !== undefined ? data.is_active : true
            ];

            const partResult = await client.query(partQuery, partValues);
            const part = partResult.rows[0];

            // Insert specifications if provided
            if (data.specs) {
                await this.insertSpecs(client, part.id, part.category, data.specs);
            }

            await client.query('COMMIT');
            return await this.getPart(part.id);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Update part and specifications
    async updatePart(id, data) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Update pc_parts with enhanced image fields
            const partQuery = `
                UPDATE pc_parts 
                SET name = COALESCE($2, name),
                    category = COALESCE($3, category),
                    brand = COALESCE($4, brand),
                    price = COALESCE($5, price),
                    stock = COALESCE($6, stock),
                    image_url = COALESCE($7, image_url),
                    description = COALESCE($8, description),
                    original_filename = COALESCE($9, original_filename),
                    file_path = COALESCE($10, file_path),
                    is_active = COALESCE($11, is_active)
                WHERE id = $1
                RETURNING *
            `;

            const partValues = [
                id,
                data.name,
                data.category,
                data.brand,
                data.price,
                data.stock,
                data.image_url,
                data.description || null,
                data.original_filename,
                data.file_path,
                data.is_active
            ];

            const partResult = await client.query(partQuery, partValues);
            
            if (partResult.rows.length === 0) {
                throw new Error('Part not found');
            }

            const part = partResult.rows[0];

            // Update specifications if provided
            if (data.specs) {
                await this.updateSpecs(client, id, part.category, data.specs);
            }

            await client.query('COMMIT');
            return await this.getPart(id);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Soft delete part
    async deletePart(id) {
        const query = `
            DELETE FROM pc_parts 
            WHERE id = $1
            RETURNING *
        `;

        const result = await this.pool.query(query, [id]);
        return result.rows[0] || null;
    }

    // Helper method to insert specifications
    async insertSpecs(client, partId, category, specs) {
        const tableName = SPEC_TABLES[category];
        if (!tableName) return;

        const allowedColumns = await this.getAllowedSpecColumns(client, tableName);
        const entries = Object.entries(specs || {});
        const invalidColumns = entries.map(([key]) => key).filter((key) => !allowedColumns.has(key));
        if (invalidColumns.length > 0) {
            throw new Error(`Invalid specification fields: ${invalidColumns.join(', ')}`);
        }

        if (entries.length === 0) return;

        const columns = ['part_id', ...entries.map(([key]) => key)];
        const values = [partId, ...entries.map(([, value]) => value)];
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const query = `
            INSERT INTO ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(', ')})
            VALUES (${placeholders})
        `;

        await client.query(query, values);
    }

    // Helper method to update specifications
    async updateSpecs(client, partId, category, specs) {
        const tableName = SPEC_TABLES[category];
        if (!tableName) return;

        const allowedColumns = await this.getAllowedSpecColumns(client, tableName);
        const entries = Object.entries(specs || {});
        const invalidColumns = entries.map(([key]) => key).filter((key) => !allowedColumns.has(key));
        if (invalidColumns.length > 0) {
            throw new Error(`Invalid specification fields: ${invalidColumns.join(', ')}`);
        }

        if (entries.length === 0) return;

        const updates = entries
            .map(([key], i) => `${quoteIdentifier(key)} = $${i + 2}`)
            .join(', ');
        
        const values = [partId, ...entries.map(([, value]) => value)];

        const query = `
            UPDATE ${quoteIdentifier(tableName)} 
            SET ${updates}, updated_at = now()
            WHERE part_id = $1
        `;

        await client.query(query, values);
    }

    async getAllowedSpecColumns(client, tableName) {
        const result = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1
              AND column_name NOT IN ('part_id', 'created_at', 'updated_at')
        `, [tableName]);
        return new Set(result.rows.map((row) => row.column_name));
    }

    // Get list of categories
    async getCategories() {
        const query = `
            SELECT 
                category, 
                COUNT(*)::integer as count,
                COALESCE(SUM(price * stock), 0)::numeric(10,2) as total_value
            FROM pc_parts 
            WHERE is_active = true
            GROUP BY category
            ORDER BY category
        `;

        const result = await this.pool.query(query);
        return result.rows.map(row => ({
            category: row.category,
            count: Number.parseInt(row.count, 10),
            totalValue: Number.parseFloat(row.total_value || 0)
        }));
    }

    // Get specification fields for a category
    async getSpecFields(category) {
        const tableName = SPEC_TABLES[category];
        if (!tableName) return [];

        const query = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = $1 AND column_name NOT IN ('part_id', 'created_at', 'updated_at')
            ORDER BY ordinal_position
        `;

        const result = await this.pool.query(query, [tableName]);
        return result.rows;
    }
}

module.exports = PCPartsModel;
