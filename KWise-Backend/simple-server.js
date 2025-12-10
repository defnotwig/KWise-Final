require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Simple K-Wise Backend Server is running'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Simple K-Wise Backend API is running'
    });
});

// Simple database connection test
let dbConnection = null;
try {
    const { query } = require('./config/db');
    dbConnection = query;
    console.log('✅ Database connection loaded');
} catch (error) {
    console.error('⚠️ Database connection failed:', error.message);
    // Create mock query function
    dbConnection = async (sql) => {
        console.log('Mock query:', sql);
        return { rows: [{ count: 375, category: 'CPU', name: 'Test Product' }] };
    };
}

// Kiosk API endpoints
app.get('/api/kiosk/categories', async (req, res) => {
    try {
        console.log('📡 Kiosk categories requested');

        if (dbConnection && typeof dbConnection === 'function') {
            const result = await dbConnection(`
                SELECT 
                    category,
                    COUNT(*) as product_count,
                    MIN(price) as min_price,
                    MAX(price) as max_price,
                    SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as in_stock_count,
                    COALESCE(kiosk_category_order, 999) as kiosk_category_order
                FROM pc_parts 
                WHERE is_active = true AND (kiosk_visible IS NULL OR kiosk_visible = true)
                GROUP BY category, kiosk_category_order
                ORDER BY kiosk_category_order, category
            `);

            // Process categories with peripherals consolidation
            const peripheralCategories = ['Monitor', 'Keyboard', 'Mouse', 'Headphones', 'Speakers', 'Webcam'];
            let peripheralData = {
                category: 'Peripherals',
                name: 'Peripherals',
                productCount: 0,
                minPrice: Infinity,
                maxPrice: 0,
                inStockCount: 0,
                order: 150,
                subCategories: []
            };

            const regularCategories = [];

            result.rows.forEach(row => {
                if (peripheralCategories.includes(row.category)) {
                    peripheralData.productCount += parseInt(row.product_count);
                    peripheralData.minPrice = Math.min(peripheralData.minPrice, parseFloat(row.min_price));
                    peripheralData.maxPrice = Math.max(peripheralData.maxPrice, parseFloat(row.max_price));
                    peripheralData.inStockCount += parseInt(row.in_stock_count);

                    peripheralData.subCategories.push({
                        category: row.category,
                        name: row.category,
                        productCount: parseInt(row.product_count),
                        minPrice: parseFloat(row.min_price),
                        maxPrice: parseFloat(row.max_price),
                        inStockCount: parseInt(row.in_stock_count),
                        order: parseInt(row.kiosk_category_order)
                    });
                } else {
                    regularCategories.push({
                        category: row.category,
                        name: row.category,
                        productCount: parseInt(row.product_count),
                        minPrice: parseFloat(row.min_price),
                        maxPrice: parseFloat(row.max_price),
                        inStockCount: parseInt(row.in_stock_count),
                        order: parseInt(row.kiosk_category_order)
                    });
                }
            });

            if (peripheralData.minPrice === Infinity) {
                peripheralData.minPrice = 0;
            }
            peripheralData.subCategories.sort((a, b) => a.order - b.order);

            const categories = [...regularCategories];
            if (peripheralData.productCount > 0) {
                categories.push(peripheralData);
            }

            categories.sort((a, b) => a.order - b.order);

            res.json({
                success: true,
                data: categories,
                timestamp: new Date().toISOString()
            });
        } else {
            // Fallback categories
            res.json({
                success: true,
                data: [
                    { category: 'CPU', name: 'Central Processing Unit', productCount: 50, inStockCount: 45, order: 10 },
                    { category: 'Motherboard', name: 'Motherboard', productCount: 30, inStockCount: 28, order: 20 },
                    { category: 'RAM', name: 'Memory (RAM)', productCount: 40, inStockCount: 35, order: 30 },
                    { category: 'Storage', name: 'Storage', productCount: 60, inStockCount: 55, order: 40 },
                    { category: 'GPU', name: 'Graphics Processing Unit', productCount: 25, inStockCount: 20, order: 50 },
                    { category: 'PSU', name: 'Power Supply Unit', productCount: 20, inStockCount: 18, order: 60 },
                    { category: 'Case', name: 'PC Case', productCount: 15, inStockCount: 12, order: 70 },
                    { category: 'Cooling', name: 'Cooling System', productCount: 35, inStockCount: 30, order: 80 },
                    {
                        category: 'Peripherals',
                        name: 'Peripherals',
                        productCount: 90,
                        inStockCount: 80,
                        order: 150,
                        subCategories: [
                            { category: 'Monitor', name: 'Monitor', productCount: 20, inStockCount: 18 },
                            { category: 'Keyboard', name: 'Keyboard', productCount: 15, inStockCount: 14 },
                            { category: 'Mouse', name: 'Mouse', productCount: 15, inStockCount: 13 },
                            { category: 'Headphones', name: 'Headphones', productCount: 15, inStockCount: 12 },
                            { category: 'Speakers', name: 'Speakers', productCount: 15, inStockCount: 13 },
                            { category: 'Webcam', name: 'Webcam', productCount: 10, inStockCount: 10 }
                        ]
                    }
                ],
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
});

app.get('/api/kiosk/categories/:category/products', async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = req.query;

        console.log('📡 Kiosk products requested for category:', category);

        if (dbConnection && typeof dbConnection === 'function') {
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const validSortBy = ['name', 'price', 'brand', 'stock'].includes(sortBy) ? sortBy : 'name';
            const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

            const result = await dbConnection(`
                SELECT 
                    id, name, category, brand, price, stock,
                    COALESCE(image_url, image_path) AS image_url,
                    specifications, description,
                    COALESCE(on_sale, false) as on_sale,
                    sale_price, sale_start_date, sale_end_date,
                    CASE WHEN stock > 0 THEN true ELSE false END as available
                FROM pc_parts 
                WHERE is_active = true 
                AND (kiosk_visible IS NULL OR kiosk_visible = true)
                AND category = $1
                AND stock > 0
                ORDER BY ${validSortBy} ${validSortOrder}
                LIMIT $2 OFFSET $3
            `, [category, parseInt(limit), offset]);

            const products = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                category: row.category,
                brand: row.brand,
                price: parseFloat(row.price),
                salePrice: row.sale_price ? parseFloat(row.sale_price) : null,
                effectivePrice: row.on_sale && row.sale_price ? parseFloat(row.sale_price) : parseFloat(row.price),
                stock: parseInt(row.stock),
                imageUrl: row.image_url,
                specifications: row.specifications,
                description: row.description,
                onSale: row.on_sale,
                available: row.available
            }));

            res.json({
                success: true,
                data: products,
                timestamp: new Date().toISOString()
            });
        } else {
            // Fallback products
            res.json({
                success: true,
                data: [
                    {
                        id: 1,
                        name: `Sample ${category} Product 1`,
                        category: category,
                        brand: 'Sample Brand',
                        price: 5000,
                        effectivePrice: 5000,
                        stock: 10,
                        available: true,
                        onSale: false
                    },
                    {
                        id: 2,
                        name: `Sample ${category} Product 2`,
                        category: category,
                        brand: 'Another Brand',
                        price: 7500,
                        effectivePrice: 6750,
                        stock: 5,
                        available: true,
                        onSale: true,
                        salePrice: 6750
                    }
                ],
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
});

app.get('/api/kiosk/featured', async (req, res) => {
    try {
        console.log('📡 Kiosk featured products requested');

        if (dbConnection && typeof dbConnection === 'function') {
            const result = await dbConnection(`
                SELECT 
                    id, name, category, brand, price, stock,
                    COALESCE(image_url, image_path) AS image_url,
                    specifications, description,
                    COALESCE(on_sale, false) as on_sale,
                    sale_price,
                    CASE WHEN stock > 0 THEN true ELSE false END as available
                FROM pc_parts 
                WHERE is_active = true 
                AND (kiosk_visible IS NULL OR kiosk_visible = true)
                AND stock > 0
                ORDER BY RANDOM()
                LIMIT 15
            `);

            const products = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                category: row.category,
                brand: row.brand,
                price: parseFloat(row.price),
                salePrice: row.sale_price ? parseFloat(row.sale_price) : null,
                effectivePrice: row.on_sale && row.sale_price ? parseFloat(row.sale_price) : parseFloat(row.price),
                stock: parseInt(row.stock),
                imageUrl: row.image_url,
                specifications: row.specifications,
                description: row.description,
                onSale: row.on_sale,
                available: row.available
            }));

            res.json({
                success: true,
                data: products,
                timestamp: new Date().toISOString()
            });
        } else {
            // Fallback featured products
            res.json({
                success: true,
                data: [
                    { id: 1, name: 'Featured CPU 1', category: 'CPU', brand: 'Intel', price: 15000, effectivePrice: 15000, stock: 10, available: true, onSale: false },
                    { id: 2, name: 'Featured GPU 1', category: 'GPU', brand: 'NVIDIA', price: 25000, effectivePrice: 22500, stock: 5, available: true, onSale: true, salePrice: 22500 },
                    { id: 3, name: 'Featured RAM 1', category: 'RAM', brand: 'Corsair', price: 8000, effectivePrice: 8000, stock: 15, available: true, onSale: false },
                    { id: 4, name: 'Featured Motherboard 1', category: 'Motherboard', brand: 'ASUS', price: 12000, effectivePrice: 10800, stock: 8, available: true, onSale: true, salePrice: 10800 },
                    { id: 5, name: 'Featured Storage 1', category: 'Storage', brand: 'Samsung', price: 6000, effectivePrice: 6000, stock: 20, available: true, onSale: false },
                    { id: 6, name: 'Featured PSU 1', category: 'PSU', brand: 'Corsair', price: 5000, effectivePrice: 5000, stock: 12, available: true, onSale: false }
                ],
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Error fetching featured products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch featured products',
            error: error.message
        });
    }
});

app.get('/api/kiosk/on-sale', async (req, res) => {
    try {
        console.log('📡 Kiosk on-sale products requested');

        if (dbConnection && typeof dbConnection === 'function') {
            const result = await dbConnection(`
                SELECT 
                    id, name, category, brand, price, sale_price, stock,
                    COALESCE(image_url, image_path) AS image_url,
                    specifications, description, on_sale,
                    CASE WHEN stock > 0 THEN true ELSE false END as available
                FROM pc_parts 
                WHERE is_active = true 
                AND (kiosk_visible IS NULL OR kiosk_visible = true)
                AND on_sale = true
                AND stock > 0
                ORDER BY updated_at DESC
                LIMIT 10
            `);

            const products = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                category: row.category,
                brand: row.brand,
                price: parseFloat(row.price),
                salePrice: parseFloat(row.sale_price),
                effectivePrice: parseFloat(row.sale_price),
                stock: parseInt(row.stock),
                imageUrl: row.image_url,
                specifications: row.specifications,
                description: row.description,
                onSale: row.on_sale,
                available: row.available
            }));

            res.json({
                success: true,
                data: products,
                timestamp: new Date().toISOString()
            });
        } else {
            // Fallback on-sale products
            res.json({
                success: true,
                data: [
                    { id: 11, name: 'Sale GPU 1', category: 'GPU', brand: 'AMD', price: 20000, salePrice: 17000, effectivePrice: 17000, stock: 3, available: true, onSale: true },
                    { id: 12, name: 'Sale CPU 1', category: 'CPU', brand: 'AMD', price: 18000, salePrice: 15300, effectivePrice: 15300, stock: 7, available: true, onSale: true },
                    { id: 13, name: 'Sale Monitor 1', category: 'Monitor', brand: 'LG', price: 15000, salePrice: 12750, effectivePrice: 12750, stock: 4, available: true, onSale: true }
                ],
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Error fetching on-sale products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch on-sale products',
            error: error.message
        });
    }
});

app.get('/api/kiosk/build-components', async (req, res) => {
    try {
        console.log('📡 Kiosk build components requested');

        const buildComponents = {
            cpu: {
                products: [
                    { id: 101, name: 'Intel Core i5-13400', brand: 'Intel', price: 12000, stock: 8, available: true },
                    { id: 102, name: 'AMD Ryzen 5 5600X', brand: 'AMD', price: 11000, stock: 10, available: true }
                ],
                brands: ['Intel', 'AMD']
            },
            motherboard: {
                products: [
                    { id: 201, name: 'ASUS Prime B450M-A', brand: 'ASUS', price: 5500, stock: 5, available: true },
                    { id: 202, name: 'MSI B450 TOMAHAWK MAX', brand: 'MSI', price: 6200, stock: 7, available: true }
                ],
                brands: ['ASUS', 'MSI']
            },
            ram: {
                products: [
                    { id: 301, name: 'Corsair Vengeance 16GB', brand: 'Corsair', price: 4500, stock: 12, available: true },
                    { id: 302, name: 'G.Skill Ripjaws 16GB', brand: 'G.Skill', price: 4200, stock: 15, available: true }
                ],
                brands: ['Corsair', 'G.Skill']
            }
        };

        res.json({
            success: true,
            data: buildComponents,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching build components:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch build components',
            error: error.message
        });
    }
});

// Admin sale management
app.put('/api/stock/:id/sale', async (req, res) => {
    try {
        const { id } = req.params;
        const { on_sale, sale_price, sale_start_date, sale_end_date } = req.body;

        console.log('📡 Update sale status for product:', id, { on_sale, sale_price });

        if (dbConnection && typeof dbConnection === 'function') {
            const result = await dbConnection(`
                UPDATE pc_parts 
                SET on_sale = $1, 
                    sale_price = $2, 
                    sale_start_date = $3, 
                    sale_end_date = $4,
                    updated_at = NOW()
                WHERE id = $5 
                RETURNING id, name, price, on_sale, sale_price
            `, [
                on_sale || false,
                on_sale ? sale_price : null,
                on_sale && sale_start_date ? sale_start_date : null,
                on_sale && sale_end_date ? sale_end_date : null,
                id
            ]);

            if (result.rows.length > 0) {
                res.json({
                    success: true,
                    message: on_sale ? 'Product added to sale successfully' : 'Product removed from sale successfully',
                    data: result.rows[0]
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
        } else {
            // Mock response
            res.json({
                success: true,
                message: on_sale ? 'Product added to sale successfully' : 'Product removed from sale successfully',
                data: { id: parseInt(id), on_sale, sale_price }
            });
        }
    } catch (error) {
        console.error('❌ Error updating sale status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update sale status',
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
🚀 Simple K-Wise Backend Server Started!
📍 Port: ${PORT}
🌐 Health Check: http://localhost:${PORT}/health
🔗 API Health: http://localhost:${PORT}/api/health
📊 Categories: http://localhost:${PORT}/api/kiosk/categories
🔥 Featured: http://localhost:${PORT}/api/kiosk/featured
💰 On Sale: http://localhost:${PORT}/api/kiosk/on-sale
⚡ Ready for testing!
    `);
});

module.exports = app;





























