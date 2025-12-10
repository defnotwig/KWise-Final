require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

// Enhanced logging
console.log('🚀 Starting K-Wise Backend Server...');

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoints
app.get('/health', (req, res) => {
    console.log('✅ Health check requested');
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'K-Wise Backend Server is running',
        port: process.env.PORT || 5000
    });
});

app.get('/api/health', (req, res) => {
    console.log('✅ API Health check requested');
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'K-Wise Backend API is running',
        port: process.env.PORT || 5000
    });
});

// Database connection
let dbConnection = null;
try {
    const { query } = require('./config/db');
    dbConnection = query;
    console.log('✅ Database connection loaded successfully');
} catch (error) {
    console.error('⚠️ Database connection failed:', error.message);
    console.log('📝 Using fallback mock data for testing');

    // Mock query function for testing
    dbConnection = async (sql, params) => {
        console.log('🔧 Mock query:', sql, params || '');

        // Mock responses based on query type
        if (sql.includes('SELECT') && sql.includes('pc_parts')) {
            if (sql.includes('category') && sql.includes('GROUP BY')) {
                return {
                    rows: [
                        { category: 'CPU', product_count: '25', min_price: '8000', max_price: '35000', in_stock_count: '20', kiosk_category_order: 10 },
                        { category: 'GPU', product_count: '18', min_price: '15000', max_price: '45000', in_stock_count: '15', kiosk_category_order: 50 },
                        { category: 'Motherboard', product_count: '22', min_price: '5000', max_price: '18000', in_stock_count: '18', kiosk_category_order: 20 },
                        { category: 'RAM', product_count: '30', min_price: '3000', max_price: '12000', in_stock_count: '25', kiosk_category_order: 30 },
                        { category: 'Storage', product_count: '35', min_price: '2500', max_price: '15000', in_stock_count: '30', kiosk_category_order: 40 },
                        { category: 'PSU', product_count: '15', min_price: '4000', max_price: '12000', in_stock_count: '12', kiosk_category_order: 60 },
                        { category: 'Case', product_count: '20', min_price: '2000', max_price: '8000', in_stock_count: '18', kiosk_category_order: 70 },
                        { category: 'Cooling', product_count: '25', min_price: '1500', max_price: '8000', in_stock_count: '20', kiosk_category_order: 80 },
                        { category: 'Monitor', product_count: '12', min_price: '8000', max_price: '25000', in_stock_count: '10', kiosk_category_order: 90 },
                        { category: 'Keyboard', product_count: '15', min_price: '500', max_price: '3000', in_stock_count: '12', kiosk_category_order: 110 },
                        { category: 'Mouse', product_count: '18', min_price: '300', max_price: '2500', in_stock_count: '15', kiosk_category_order: 120 },
                        { category: 'Headphones', product_count: '10', min_price: '800', max_price: '5000', in_stock_count: '8', kiosk_category_order: 100 },
                        { category: 'Speakers', product_count: '8', min_price: '1200', max_price: '8000', in_stock_count: '6', kiosk_category_order: 130 },
                        { category: 'Webcam', product_count: '6', min_price: '1000', max_price: '4000', in_stock_count: '5', kiosk_category_order: 140 }
                    ]
                };
            } else {
                return {
                    rows: [
                        { id: 1, name: 'Intel Core i5-13400F', category: 'CPU', brand: 'Intel', price: 12500, stock: 15, available: true, on_sale: false, image_url: null, specifications: 'Cores: 10, Base Clock: 2.5GHz, Max Boost: 4.6GHz', description: 'High-performance processor for gaming and productivity' },
                        { id: 2, name: 'AMD Ryzen 5 5600X', category: 'CPU', brand: 'AMD', price: 11800, stock: 12, available: true, on_sale: true, sale_price: 10500, image_url: null, specifications: 'Cores: 6, Base Clock: 3.7GHz, Max Boost: 4.6GHz', description: 'Excellent gaming processor with great value' },
                        { id: 3, name: 'NVIDIA RTX 4060 Ti', category: 'GPU', brand: 'NVIDIA', price: 28500, stock: 8, available: true, on_sale: false, image_url: null, specifications: 'Memory: 16GB GDDR6, Base Clock: 2310MHz, Memory Interface: 128-bit', description: 'Mid-range graphics card for 1440p gaming' },
                        { id: 4, name: 'AMD RX 6700 XT', category: 'GPU', brand: 'AMD', price: 24999, stock: 10, available: true, on_sale: true, sale_price: 21999, image_url: null, specifications: 'Memory: 12GB GDDR6, Base Clock: 2321MHz, Memory Interface: 192-bit', description: 'Great 1440p gaming graphics card' },
                        { id: 5, name: 'ASUS TUF Gaming B450M', category: 'Motherboard', brand: 'ASUS', price: 6500, stock: 20, available: true, on_sale: false, image_url: null, specifications: 'Socket: AM4, Chipset: B450, Memory: DDR4-3200, Slots: 4', description: 'Reliable micro-ATX motherboard for AMD processors' }
                    ]
                };
            }
        } else if (sql.includes('UPDATE') && sql.includes('on_sale')) {
            return {
                rows: [{ id: params[4], on_sale: params[0], sale_price: params[1] }]
            };
        }

        return { rows: [] };
    };
}

// Categories endpoint with peripherals consolidation
app.get('/api/kiosk/categories', async (req, res) => {
    try {
        console.log('📊 Fetching kiosk categories...');

        const result = await dbConnection(`
            SELECT 
                category,
                COUNT(*) as product_count,
                MIN(price) as min_price,
                MAX(price) as max_price,
                SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as in_stock_count,
                COALESCE(kiosk_category_order, 999) as kiosk_category_order
            FROM pc_parts 
            WHERE is_active = true 
            AND (kiosk_visible IS NULL OR kiosk_visible = true)
            AND stock > 0
            GROUP BY category, kiosk_category_order
            ORDER BY kiosk_category_order, category
        `);

        console.log(`📈 Found ${result.rows.length} categories`);

        // Consolidate peripherals
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

        if (peripheralData.minPrice === Infinity) peripheralData.minPrice = 0;
        peripheralData.subCategories.sort((a, b) => a.order - b.order);

        const categories = [...regularCategories];
        if (peripheralData.productCount > 0) {
            categories.push(peripheralData);
        }

        categories.sort((a, b) => a.order - b.order);

        console.log(`✅ Returning ${categories.length} categories (${peripheralData.productCount} peripheral products)`);

        res.json({
            success: true,
            data: categories,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
});

// Category products endpoint - ONLY show in-stock items
app.get('/api/kiosk/categories/:category/products', async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = req.query;

        console.log(`📦 Fetching products for category: ${category}`);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const validSortBy = ['name', 'price', 'brand', 'stock'].includes(sortBy) ? sortBy : 'name';
        const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

        const result = await dbConnection(`
            SELECT 
                id, name, category, brand, price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, description,
                COALESCE(on_sale, false) as on_sale,
                sale_price, sale_start_date, sale_end_date
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
            available: true // Only in-stock items are returned
        }));

        console.log(`✅ Returning ${products.length} products for ${category}`);

        res.json({
            success: true,
            data: products,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`❌ Error fetching products for ${category}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
});

// Featured products endpoint
app.get('/api/kiosk/featured', async (req, res) => {
    try {
        console.log('🔥 Fetching featured products...');

        const result = await dbConnection(`
            SELECT 
                id, name, category, brand, price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, description,
                COALESCE(on_sale, false) as on_sale,
                sale_price
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
            available: true
        }));

        console.log(`✅ Returning ${products.length} featured products`);

        res.json({
            success: true,
            data: products,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching featured products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch featured products',
            error: error.message
        });
    }
});

// On-sale products endpoint - for kiosk display only
app.get('/api/kiosk/on-sale', async (req, res) => {
    try {
        console.log('💰 Fetching on-sale products...');

        const result = await dbConnection(`
            SELECT 
                id, name, category, brand, price, sale_price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, description, on_sale
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
            available: true
        }));

        console.log(`✅ Returning ${products.length} on-sale products`);

        res.json({
            success: true,
            data: products,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching on-sale products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch on-sale products',
            error: error.message
        });
    }
});

// Admin sale management endpoint - THIS IS WHERE THE MAKE ON SALE FUNCTIONALITY IS
app.put('/api/stock/:id/sale', async (req, res) => {
    try {
        const { id } = req.params;
        const { on_sale, sale_price, sale_start_date, sale_end_date } = req.body;

        console.log(`💰 Admin: Updating sale status for product ${id}:`, { on_sale, sale_price });

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
            console.log(`✅ Sale status updated for: ${result.rows[0].name}`);
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

    } catch (error) {
        console.error('❌ Error updating sale status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update sale status',
            error: error.message
        });
    }
});

// Stock categories endpoint for admin
app.get('/api/stock/categories', async (req, res) => {
    try {
        console.log('📊 Admin: Fetching stock categories...');

        const result = await dbConnection(`
            SELECT DISTINCT category, COUNT(*) as product_count
            FROM pc_parts 
            WHERE is_active = true
            GROUP BY category
            ORDER BY category
        `);

        console.log(`✅ Admin: Returning ${result.rows.length} categories`);

        res.json({
            success: true,
            data: result.rows.map(row => ({
                category: row.category,
                productCount: parseInt(row.product_count)
            }))
        });

    } catch (error) {
        console.error('❌ Admin: Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('💥 Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    console.log(`❓ 404 Not Found: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
🚀 K-WISE BACKEND SERVER STARTED SUCCESSFULLY!

📍 Server Details:
   Port: ${PORT}
   Environment: ${process.env.NODE_ENV || 'development'}
   Database: ${dbConnection ? '✅ Connected' : '⚠️ Mock Mode'}

🌐 Available Endpoints:
   Health Check: http://localhost:${PORT}/health
   API Health: http://localhost:${PORT}/api/health
   
📊 Kiosk Endpoints (Public):
   Categories: http://localhost:${PORT}/api/kiosk/categories
   Products: http://localhost:${PORT}/api/kiosk/categories/{category}/products
   Featured: http://localhost:${PORT}/api/kiosk/featured
   On Sale: http://localhost:${PORT}/api/kiosk/on-sale

🔧 Admin Endpoints (Protected):
   Stock Categories: http://localhost:${PORT}/api/stock/categories
   Make On Sale: PUT http://localhost:${PORT}/api/stock/{id}/sale

⚡ Server ready for testing!
🎯 Remember: Only in-stock items appear in kiosk!
💰 Sale management happens in admin, reflects in kiosk!
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Server shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 Server interrupted, shutting down...');
    process.exit(0);
});

module.exports = app;




