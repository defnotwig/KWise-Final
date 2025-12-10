const { query } = require('../config/db');
const logger = require('../utils/logger');
const valueAnalyzer = require('../ai/services/valueAnalyzer');
const aiConfig = require('../ai/config/aiConfig');
const upgradeService = require('../services/upgradeService');

/**
 * GET /api/kiosk/categories - list active kiosk categories with counts
 */
const getCategories = async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                category,
                COUNT(*) as product_count,
                SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as in_stock_count,
                MIN(price) as min_price,
                MAX(price) as max_price
            FROM pc_parts 
            WHERE is_active = true 
              AND (kiosk_visible IS NULL OR kiosk_visible = true)
            GROUP BY category
            ORDER BY category
        `);

        res.json({
            success: true,
            data: result.rows,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching kiosk categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/kiosk/categories/:category - paginated products by category
 */
const getCategoryProducts = async (req, res) => {
    try {
        const { category } = req.params;
        const {
            page = 1,
            limit = 20,
            sortBy = 'name',
            sortOrder = 'asc',
            brand,
            minPrice,
            maxPrice,
            inStock
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const validSortBy = ['name', 'price', 'brand', 'created_at', 'updated_at'].includes(sortBy) ? sortBy : 'name';
        const validSortOrder = ['asc', 'desc'].includes(String(sortOrder).toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

        const whereParts = [
            'is_active = true',
            '(kiosk_visible IS NULL OR kiosk_visible = true)',
            'category = $1'
        ];
        const queryParams = [category];
        let paramIndex = 2;

        if (brand) {
            whereParts.push(`brand = $${paramIndex++}`);
            queryParams.push(brand);
        }
        if (minPrice) {
            whereParts.push(`price >= $${paramIndex++}`);
            queryParams.push(parseFloat(minPrice));
        }
        if (maxPrice) {
            whereParts.push(`price <= $${paramIndex++}`);
            queryParams.push(parseFloat(maxPrice));
        }
        if (inStock === 'true') {
            whereParts.push('stock > 0');
        }

        const whereClause = whereParts.join(' AND ');

        const mainQuery = `
            SELECT 
                id, name, category, brand, price, sale_price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, dimensions, description, on_sale,
                created_at, updated_at,
                CASE WHEN stock > 0 THEN true ELSE false END as available
            FROM pc_parts 
            WHERE ${whereClause}
            ORDER BY ${validSortBy} ${validSortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const countQuery = `
            SELECT COUNT(*) as total
            FROM pc_parts
            WHERE ${whereClause}
        `;

        const countParams = [...queryParams];
        queryParams.push(parseInt(limit), offset);

        const [result, countResult] = await Promise.all([
            query(mainQuery, queryParams),
            query(countQuery, countParams)
        ]);

        const total = parseInt(countResult.rows[0].total || 0);
        const totalPages = Math.max(1, Math.ceil(total / parseInt(limit)));

        const products = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
            brand: row.brand,
            price: parseFloat(row.price),
            salePrice: row.sale_price ? parseFloat(row.sale_price) : null,
            effectivePrice: getEffectivePrice(row),
            stock: parseInt(row.stock),
            imageUrl: row.image_url,
            specifications: row.specifications,
            dimensions: row.dimensions,
            description: row.description,
            onSale: row.on_sale || false,
            available: row.available,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.json({
            success: true,
            data: {
                items: products,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit),
                    hasNext: parseInt(page) < totalPages,
                    hasPrev: parseInt(page) > 1
                },
                filters: {
                    category,
                    brand,
                    minPrice: minPrice ? parseFloat(minPrice) : null,
                    maxPrice: maxPrice ? parseFloat(maxPrice) : null,
                    inStock
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching category products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/kiosk/featured - Get featured products for kiosk home screen
 * Returns hot picks, value for money, and on-sale items
 */
const getFeaturedProducts = async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        const result = await query(`
            SELECT 
                id, name, brand, category, price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, dimensions, description,
                CASE WHEN stock > 0 THEN true ELSE false END as available
            FROM pc_parts 
            WHERE is_active = true 
            AND kiosk_visible = true 
            AND kiosk_featured = true
            AND stock > 0
            ORDER BY category, price DESC
            LIMIT $1
        `, [parseInt(limit)]);

        const featuredProducts = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            brand: row.brand,
            category: row.category,
            price: parseFloat(row.price),
            stock: parseInt(row.stock),
            imageUrl: row.image_url,
            specifications: row.specifications,
            dimensions: row.dimensions,
            description: row.description,
            available: row.available
        }));

        logger.info(`Kiosk featured products requested: ${featuredProducts.length} products found`);

        res.json({
            success: true,
            data: featuredProducts,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching featured products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch featured products',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/kiosk/build-components - Get components organized for PC builder
 * Returns products grouped by category for PC customization interface
 */
const getBuildComponents = async (req, res) => {
    try {
        logger.info('🔍 TRACE: getBuildComponents called');
        
        // Remove stock filter to show all products, not just those in stock
        const sqlQuery = `
            SELECT 
                id, name, category, brand, price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, dimensions, description,
                CASE WHEN stock > 0 THEN true ELSE false END as available
            FROM pc_parts 
            WHERE is_active = true 
            AND kiosk_visible = true
            ORDER BY category, price ASC
        `;
        
        logger.info('🔍 TRACE: Executing SQL query...');
        const result = await query(sqlQuery);
        logger.info('🔍 TRACE: SQL result rows:', result.rows.length);

        // Group products by category
        const componentsByCategory = {};
        const brandsByCategory = {};

        result.rows.forEach((row, index) => {
            logger.info(`🔍 TRACE: Processing row ${index + 1}/${result.rows.length} - ${row.category}: ${row.name}`);
            const category = row.category.toLowerCase();

            if (!componentsByCategory[category]) {
                componentsByCategory[category] = [];
                brandsByCategory[category] = new Set();
                logger.info(`🔍 TRACE: Created new category: ${category}`);
            }

            const product = {
                id: row.id,
                name: row.name,
                brand: row.brand,
                price: parseFloat(row.price),
                stock: parseInt(row.stock),
                imageUrl: row.image_url,
                specifications: row.specifications,
                dimensions: row.dimensions,
                description: row.description,
                available: row.available
            };

            componentsByCategory[category].push(product);
            brandsByCategory[category].add(row.brand);
            
            if (category === 'cpu') {
                logger.info(`🔍 TRACE: Added CPU #${componentsByCategory[category].length}: ${row.name}`);
            }
        });

        logger.info('🔍 TRACE: Processing completed, building final structure...');
        
        // Convert to final structure
        const buildComponents = {};
        Object.keys(componentsByCategory).forEach(category => {
            buildComponents[category] = {
                products: componentsByCategory[category],
                brands: Array.from(brandsByCategory[category]).sort()
            };
            logger.info(`🔍 TRACE: Final ${category}: ${buildComponents[category].products.length} products`);
        });

        // Add debugging before sending response
        logger.info('🔍 CONTROLLER DEBUG: CPU products count:', buildComponents.cpu?.products?.length || 0);
        logger.info('🔍 CONTROLLER DEBUG: Total categories:', Object.keys(buildComponents).length);
        
        const responseData = {
            success: true,
            data: buildComponents,
            timestamp: new Date().toISOString()
        };
        
        const responseString = JSON.stringify(responseData);
        logger.info('🔍 CONTROLLER DEBUG: Response size (bytes):', responseString.length);
        logger.info('🔍 CONTROLLER DEBUG: Response size (KB):', (responseString.length / 1024).toFixed(2));

        logger.info('🔍 TRACE: Sending response...');
        res.json(responseData);

    } catch (error) {
        logger.error('❌ TRACE: Error in getBuildComponents:', error);
        logger.error('Error fetching build components:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch build components',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/kiosk/search - Search products for kiosk interface
 * Optimized search with category filtering and pagination
 */
const searchProducts = async (req, res) => {
    try {
        const { q, category, limit = 20 } = req.query;

        if (!q || q.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        let whereClause = 'WHERE is_active = true AND kiosk_visible = true AND stock > 0';
        const queryParams = [];
        let paramIndex = 1;

        // Add search term
        whereClause += ` AND (name ILIKE $${paramIndex++} OR brand ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`;
        const searchTerm = `%${q.trim()}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);

        // Add category filter if provided
        if (category) {
            whereClause += ` AND category = $${paramIndex++}`;
            queryParams.push(category);
        }

        const searchQuery = `
            SELECT 
                id, name, category, brand, price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, dimensions, description,
                CASE WHEN stock > 0 THEN true ELSE false END as available
            FROM pc_parts 
            ${whereClause}
            ORDER BY 
                CASE WHEN name ILIKE $1 THEN 1 ELSE 2 END,
                name ASC
            LIMIT $${paramIndex}
        `;

        queryParams.push(parseInt(limit));

        const result = await query(searchQuery, queryParams);

        const products = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
            brand: row.brand,
            price: parseFloat(row.price),
            stock: parseInt(row.stock),
            imageUrl: row.image_url,
            specifications: row.specifications,
            dimensions: row.dimensions,
            description: row.description,
            available: row.available
        }));

        res.json({
            success: true,
            data: products,
            query: q,
            category: category || null,
            resultCount: products.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error searching products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search products',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Helper function to format category names for display
 */
const formatCategoryDisplayName = (category) => {
    const nameMap = {
        'CPU': 'Central Processing Unit',
        'GPU': 'Graphics Processing Unit',
        'RAM': 'Memory (RAM)',
        'Storage': 'Storage',
        'Motherboard': 'Motherboard',
        'PSU': 'Power Supply Unit',
        'Case': 'PC Case',
        'Cooling': 'Cooling System',
        'Monitor': 'Monitor',
        'Keyboard': 'Keyboard',
        'Mouse': 'Mouse',
        'Headphones': 'Headphones',
        'Speakers': 'Speakers',
        'Webcam': 'Webcam',
        'Peripherals': 'Peripherals'
    };

    return nameMap[category] || category;
};

/**
 * Helper function to determine if a category should be grouped under peripherals
 */
const isPeripheralCategory = (category) => {
    const peripheralCategories = ['Monitor', 'Keyboard', 'Mouse', 'Headphones', 'Speakers', 'Webcam'];
    return peripheralCategories.includes(category);
};

/**
 * Helper function to get effective price (sale price if on sale, regular price otherwise)
 */
const getEffectivePrice = (product) => {
    if (product.on_sale && product.sale_price !== null) {
        const now = new Date();
        const saleStart = product.sale_start_date ? new Date(product.sale_start_date) : new Date(0);
        const saleEnd = product.sale_end_date ? new Date(product.sale_end_date) : new Date(8640000000000000);

        if (now >= saleStart && now <= saleEnd) {
            return parseFloat(product.sale_price);
        }
    }
    return parseFloat(product.price);
};

/**
 * GET /api/kiosk/on-sale - Get products currently on sale
 */
const getOnSaleProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const validSortBy = ['name', 'price', 'sale_price', 'brand', 'category'].includes(sortBy) ? sortBy : 'name';
        const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

        const mainQuery = `
            SELECT 
                id, name, category, brand, price, sale_price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, dimensions, description, on_sale, sale_start_date, sale_end_date,
                CASE WHEN stock > 0 THEN true ELSE false END as available
            FROM pc_parts 
            WHERE is_active = true 
            AND kiosk_visible = true 
            AND on_sale = true
            AND stock > 0
            AND (sale_start_date IS NULL OR sale_start_date <= NOW())
            AND (sale_end_date IS NULL OR sale_end_date >= NOW())
            ORDER BY ${validSortBy} ${validSortOrder}
            LIMIT $1 OFFSET $2
        `;

        const countQuery = `
            SELECT COUNT(*) as total FROM pc_parts 
            WHERE is_active = true 
            AND kiosk_visible = true 
            AND on_sale = true
            AND stock > 0
            AND (sale_start_date IS NULL OR sale_start_date <= NOW())
            AND (sale_end_date IS NULL OR sale_end_date >= NOW())
        `;

        const [result, countResult] = await Promise.all([
            query(mainQuery, [parseInt(limit), offset]),
            query(countQuery, [])
        ]);

        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / parseInt(limit));

        const products = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
            brand: row.brand,
            price: parseFloat(row.price),
            salePrice: parseFloat(row.sale_price),
            effectivePrice: getEffectivePrice(row),
            stock: parseInt(row.stock),
            imageUrl: row.image_url,
            specifications: row.specifications,
            dimensions: row.dimensions,
            description: row.description,
            onSale: row.on_sale,
            available: row.available
        }));

        res.json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching on-sale products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch on-sale products',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * POST /api/kiosk/orders - Create new order with automatic queue assignment
 * Public endpoint for kiosk order creation with real-time queue management
 */
const createOrder = async (req, res) => {
    try {
        logger.info('Kiosk order creation request received:');
        logger.info('Request body:', JSON.stringify(req.body, null, 2));
        
        const { 
            customerName, 
            serviceType, 
            items = [],        // Changed from selectedParts to items
            selectedParts = [], // Keep as fallback for backward compatibility
            totalAmount,       // Remove default = 0 to properly detect if it's missing
            paymentMethod = 'cash',
            phoneNumber = null,
            email = null,
            notes = null,
            transactionOrigin = null
        } = req.body;

        // Use items if available, otherwise fall back to selectedParts
        const orderItems = items.length > 0 ? items : selectedParts;

        logger.info('Validation check:', {
            hasServiceType: !!serviceType,
            serviceTypeValue: serviceType,
            hasTotalAmount: totalAmount !== undefined && totalAmount !== null,
            totalAmountValue: totalAmount,
            totalAmountType: typeof totalAmount,
            hasItems: orderItems.length > 0,
            itemsCount: orderItems.length
        });

        // Validate required fields (customerName can be empty for kiosk orders)
        // For diagnostic orders, totalAmount can be 0 or null
        if (!serviceType) {
            logger.error('Validation failed: Missing serviceType');
            return res.status(400).json({
                success: false,
                message: 'Service type is required'
            });
        }

        if (totalAmount === undefined || totalAmount === null) {
            logger.error('Validation failed: totalAmount is undefined or null');
            return res.status(400).json({
                success: false,
                message: 'Total amount is required (can be 0 for diagnostic services)'
            });
        }

        // Import queue manager
        const queueManager = require('../services/queueManagerService');

        // Prepare order data for queue manager
        const orderData = {
            customerName: customerName || null, // Allow empty/null customer names for kiosk
            customerEmail: email,
            items: orderItems, // Use the correct items array
            totalAmount: parseFloat(totalAmount) || 0, // Ensure it's a number, default to 0
            paymentMethod,
            serviceType,
            transactionOrigin: transactionOrigin || serviceType, // Use transactionOrigin if provided
            phoneNumber,
            notes
        };

        logger.info('Prepared order data for queue manager:', JSON.stringify(orderData, null, 2));
        logger.info('Order data validation:', {
            hasCustomerName: !!orderData.customerName,
            hasItems: !!orderData.items && Array.isArray(orderData.items),
            itemsLength: orderData.items?.length || 0,
            hasTotalAmount: !!orderData.totalAmount,
            totalAmountValue: orderData.totalAmount
        });

        // Create order with queue assignment using queue manager
        const result = await queueManager.createOrderWithQueue(orderData);
        
        logger.info(`Kiosk order created: ID=${result.orderId}, Queue=${result.queueNumber}, Customer=${customerName}`);

        // ✅ AUTO-SAVE TO COMMUNITY BUILDS
        // Captures ALL customized PC orders: PC Customized, PC Customized AI, and Pre-Built Presets
        const customizedServiceTypes = [
            'pc-customized',      // PC Customized (manual selection)
            'pc-customized-ai',   // PC Customized with AI suggestions
            'prebuilt-pc',        // Pre-Built PC (may be customized)
            'preset-pc',          // Pre-Built Preset
            'community-pc'        // Community Build orders
        ];

        logger.info(`🔍 SERVICE TYPE CHECK: "${serviceType}" | Is in customizedServiceTypes: ${customizedServiceTypes.includes(serviceType)}`);
        
        if (customizedServiceTypes.includes(serviceType)) {
            try {
                logger.info(`🔍 Checking if order ${result.orderId} should be saved to Community Builds...`);
                logger.info(`📊 Service Type: "${serviceType}"`);
                logger.info(`📦 Order Items Count: ${orderItems.length}`);
                logger.info(`💰 Total Amount: ${totalAmount}`);
                
                // For pc-customized and pc-customized-ai, ALL orders should be saved
                // For prebuilt-pc, only save if there are customizations
                let shouldSave = false;
                let buildData = null;

                if (serviceType === 'pc-customized' || serviceType === 'pc-customized-ai') {
                    // PC Customized orders are ALWAYS community builds
                    shouldSave = true;
                    
                    // Extract components from order items
                    const components = orderItems.map(item => ({
                        name: item.category || 'Component',
                        value: item.name || item.component || 'Unknown',
                        part_id: item.id || item.part_id,
                        price: parseFloat(item.price || 0),
                        category: item.category || 'Other',
                        brand: item.brand || '',
                        specifications: item.specifications || {}
                    }));

                    // Determine tier based on total price (using database constraint values)
                    let tier = 'Mid Tier'; // Default to Mid Tier
                    if (totalAmount >= 80000) tier = 'Elite';
                    else if (totalAmount >= 50000) tier = 'High Tier';
                    else if (totalAmount >= 25000) tier = 'Mid Tier';
                    else tier = 'Entry';

                    logger.info(`🔥 TIER CALCULATION: totalAmount=${totalAmount}, tier="${tier}"`);

                    buildData = {
                        buildName: `Customer ${serviceType === 'pc-customized-ai' ? 'AI' : 'Custom'} Build ${result.orderId}`,
                        components: components,
                        totalPrice: totalAmount,
                        tier: tier,
                        purposes: ['Gaming'], // Default purpose, can be enhanced later
                        baseProductId: null,
                        customizations: {
                            orderType: serviceType,
                            orderId: result.orderId,
                            createdFrom: serviceType === 'pc-customized-ai' ? 'AI Suggestion' : 'Manual Selection'
                        }
                    };

                    logger.info(`✅ PC Customized order detected - will save to Community Builds`);
                } else if (serviceType === 'prebuilt-pc' || serviceType === 'preset-pc') {
                    // Pre-Built orders: Only save if customizations exist
                    const hasCustomizations = orderItems.some(item => 
                        item.isCustomized || 
                        (item.customizations && Object.keys(item.customizations).length > 0)
                    );

                    if (hasCustomizations) {
                        shouldSave = true;
                        
                        const firstItem = orderItems[0];
                        const tier = firstItem.tier || firstItem.buildType || 'Mid Tier';
                        const purposes = firstItem.purposes || ['Gaming'];
                        const baseProductId = firstItem.baseProductId || firstItem.product_id;
                        
                        // ✅ FIX: Extract component details from prebuilt-component items
                        const components = orderItems
                            .filter(item => item.category === 'prebuilt-component')
                            .map(item => ({
                                name: item.componentType || item.category || 'Component',
                                value: item.componentValue || item.name || 'Unknown',
                                part_id: item.id || null,
                                price: parseFloat(item.price || 0),
                                category: item.componentType || item.category || 'Other'
                            }));

                        buildData = {
                            buildName: `Customer Customized Preset ${result.orderId}`,
                            components: components,
                            totalPrice: totalAmount,
                            tier: tier,
                            purposes: purposes,
                            baseProductId: baseProductId,
                            customizations: firstItem.customizations || {}
                        };

                        logger.info(`✅ Customized Pre-Built order detected - will save to Community Builds`);
                        logger.info(`📦 Components extracted: ${components.length}`);
                    } else {
                        logger.info(`ℹ️ Pre-Built order without customizations - skipping Community Build save`);
                    }
                }

                // Save to Community Builds if applicable
                if (shouldSave && buildData) {
                    logger.info(`💾 Attempting to save community build: ${buildData.buildName}`);
                    logger.info(`📝 Build Data:`, JSON.stringify(buildData, null, 2));
                    
                    // ✅ CRITICAL FIX: Use internal function instead of HTTP endpoint handler
                    const savedBuild = await saveCommunityBuildInternal(buildData);

                    logger.info(`✅ Order ${result.orderId} auto-saved to Community Builds (Type: ${serviceType}, Build ID: ${savedBuild.id})`);
                } else {
                    logger.warn(`⚠️ Community Build NOT saved. shouldSave=${shouldSave}, hasBuildData=${!!buildData}`);
                }
            } catch (communityError) {
                logger.error('Failed to auto-save to Community Builds:', communityError);
                // Don't fail the order creation if Community Build save fails
            }
        }

        res.json({
            success: true,
            message: 'Order created successfully with queue assignment',
            data: {
                orderId: result.orderId,
                orderIdFormatted: result.orderIdFormatted,
                transactionIdFormatted: result.transactionIdFormatted,
                queueNumber: result.queueNumber,
                customerName,
                serviceType,
                totalAmount,
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Error creating kiosk order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

/**
 * POST /api/kiosk/ai-hot-picks - Get AI-powered hot picks or upgrade recommendations for kiosk
 * Supports both product recommendations and future upgrade analysis
 */
const getAIHotPicks = async (req, res) => {
    try {
        const { products, budget, filters = {} } = req.body;

        if (!products || !Array.isArray(products)) {
            return res.status(400).json({
                success: false,
                message: 'Products array is required',
                data: null
            });
        }

        logger.info('🔥🤖 Kiosk AI recommendations requested', {
            productsCount: products.length,
            productsReceived: products.length > 0 ? 'YES' : 'NO',
            firstProductSample: products.length > 0 ? products[0].name : 'NONE',
            budget,
            analysisType: filters.analysisType,
            timestamp: new Date().toISOString()
        });

        // Handle future upgrade analysis
        if (filters.analysisType === 'future_upgrade') {
            const upgradeRecommendations = await generateFutureUpgradeRecommendations(products, budget, filters);
            
            return res.json({
                success: true,
                data: {
                    recommendations: upgradeRecommendations,
                    analysisType: 'future_upgrade',
                    aiEnabled: aiConfig.service.enabled,
                    generatedAt: new Date().toISOString()
                }
            });
        }

        // Handle value for money analysis
        if (filters.analysisType === 'value_for_money') {
            logger.info('💰🤖 Generating Value for Money recommendations...');
            const result = await valueAnalyzer.generateValueForMoney(products, {}, filters.maxRecommendations || 8);
            
            return res.json({
                success: true,
                data: {
                    recommendations: result.valueForMoney || [],
                    analysis: result.analysis,
                    analysisType: 'value_for_money',
                    aiEnabled: aiConfig.service.enabled,
                    generatedAt: new Date().toISOString()
                }
            });
        }

        // Regular hot picks analysis (default)
        logger.info('🔥🤖 Generating Hot Picks recommendations...');
        const result = await valueAnalyzer.generateHotPicks(products, {}, filters.maxRecommendations || 8);

        res.json({
            success: true,
            data: {
                recommendations: result.hotPicks || [],
                analysis: result.analysis,
                analysisType: 'hot_picks',
                aiEnabled: aiConfig.service.enabled,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Kiosk AI hot picks failed', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Failed to generate AI recommendations',
            data: null,
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Generate future upgrade recommendations using AI intelligence with stock integration
 */
async function generateFutureUpgradeRecommendations(currentComponents, budget, filters) {
    try {
        logger.info('🚀 Starting enhanced future upgrade analysis...');
        
        // Get actual stock data for intelligent recommendations
        const stockData = await getStockDataForUpgradeAnalysis();
        
        const upgradePromises = currentComponents.map(async (component, index) => {
            // Generate 2 upgrade options per component: 1 from stock + 1 external market
            const upgrades = await generateDualUpgradeOptions(component, stockData, budget);
            return upgrades;
        });
        
        const allUpgrades = await Promise.all(upgradePromises);
        return allUpgrades.flat(); // Flatten to get all upgrades
        
    } catch (error) {
        logger.error('Enhanced future upgrade recommendations failed', error);
        return generateFallbackUpgradeRecommendations(currentComponents);
    }
}

/**
 * Generate dual upgrade options: stock + external market
 */
async function generateDualUpgradeOptions(component, stockData, budget) {
    const componentPrice = parseFloat((component.price || '0').toString().replace(/[^\d.]/g, '')) || 0;
    const category = component.category || 'Component';
    const componentName = component.name || 'Unknown Component';
    
    logger.info(`🔍 Analyzing upgrades for ${componentName} (${category})`);
    
    // Find best stock upgrade in same category
    const stockUpgrade = findBestStockUpgrade(component, stockData, componentPrice);
    
    // Generate external market upgrade using AI
    const externalUpgrade = await generateExternalMarketUpgrade(component, componentPrice);
    
    return [stockUpgrade, externalUpgrade];
}

/**
 * Find best upgrade from stock in same category with detailed performance analysis
 */
function findBestStockUpgrade(component, stockData, currentPrice) {
    const category = component.category || 'Component';
    const categoryStock = stockData[category] || [];
    
    // Find upgrades that are at least 30% more expensive (meaningful upgrade)
    const minUpgradePrice = currentPrice * 1.3;
    const upgrades = categoryStock.filter(item => 
        parseFloat(item.price) > minUpgradePrice && 
        item.name !== component.name
    ).sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    
    // Get the best available upgrade
    const bestUpgrade = upgrades[0] || categoryStock[0];
    
    if (bestUpgrade) {
        const upgradePrice = parseFloat(bestUpgrade.price);
        const priceDiff = upgradePrice - currentPrice;
        const performanceGain = calculatePerformanceGain(component, bestUpgrade, category);
        const futureProofing = calculateFutureProofing(upgradePrice, currentPrice, bestUpgrade);
        const upgradeAnalysis = generateUpgradeAnalysis(component, bestUpgrade, category);
        
        return {
            id: `stock-${category}-${Date.now()}`,
            type: 'stock_upgrade',
            category: category,
            currentItem: component.name,
            upgradeItem: bestUpgrade.name,
            brand: bestUpgrade.brand,
            price: upgradePrice,
            priceDifference: `₱${priceDiff.toLocaleString()}`,
            performanceGain: performanceGain,
            availability: 'In Stock',
            specifications: bestUpgrade.specifications || {},
            compatibility: 'Excellent',
            futureProofing: futureProofing,
            reason: upgradeAnalysis,
            priority: 'Stock Available',
            source: 'K-Wise Stock',
            currentSpecs: component.specifications || '',
            upgradeSpecs: bestUpgrade.specifications || {}
        };
    } else {
        return generateFallbackStockUpgrade(component, currentPrice, category);
    }
}

/**
 * Calculate performance gain based on component specifications and category
 */
function calculatePerformanceGain(currentComponent, upgradeComponent, category) {
    const currentPrice = parseFloat((currentComponent.price || '0').toString().replace(/[^\d.]/g, '')) || 0;
    const upgradePrice = parseFloat(upgradeComponent.price);
    const priceRatio = upgradePrice / currentPrice;
    
    // Category-specific performance calculations
    const categoryMultipliers = {
        'Cooling': { base: 25, multiplier: 0.8 },
        'GPU': { base: 40, multiplier: 1.2 },
        'CPU': { base: 35, multiplier: 1.0 },
        'RAM': { base: 30, multiplier: 0.9 },
        'Storage': { base: 50, multiplier: 1.1 },
        'Motherboard': { base: 20, multiplier: 0.7 },
        'PSU': { base: 15, multiplier: 0.6 },
        'Case': { base: 10, multiplier: 0.5 }
    };
    
    const categoryData = categoryMultipliers[category] || { base: 25, multiplier: 1.0 };
    const performanceIncrease = Math.round(categoryData.base + (priceRatio - 1) * 100 * categoryData.multiplier);
    
    return `+${Math.min(Math.max(performanceIncrease, 15), 95)}%`;
}

/**
 * Calculate future-proofing rating based on price difference and specifications
 */
function calculateFutureProofing(upgradePrice, currentPrice, upgradeComponent) {
    const priceRatio = upgradePrice / currentPrice;
    const brand = upgradeComponent.brand?.toLowerCase() || '';
    
    // Premium brands get bonus
    const premiumBrands = ['asus', 'corsair', 'nzxt', 'msi', 'gigabyte', 'evga', 'seasonic'];
    const brandBonus = premiumBrands.some(pb => brand.includes(pb)) ? 0.5 : 0;
    
    if (priceRatio >= 2.5 + brandBonus) return 'Excellent (4+ years)';
    if (priceRatio >= 2.0 + brandBonus) return 'Very Good (3-4 years)';
    if (priceRatio >= 1.5 + brandBonus) return 'Good (2-3 years)';
    return 'Moderate (1-2 years)';
}

/**
 * Generate detailed upgrade analysis with specific technical comparisons
 */
function generateUpgradeAnalysis(currentComponent, upgradeComponent, category) {
    const currentName = currentComponent.name || 'Current Component';
    const upgradeName = upgradeComponent.name || 'Upgrade Component';
    const currentSpecs = currentComponent.specifications || '';
    const upgradeSpecs = upgradeComponent.specifications || '';
    
    // Extract key specifications for comparison
    const analysis = analyzeSpecifications(currentSpecs, upgradeSpecs, category);
    
    const categoryBenefits = {
        'Cooling': `Superior thermal management with ${analysis.cooling}. Enhanced RGB lighting and quieter operation compared to ${currentName}.`,
        'GPU': `Significantly higher frame rates with ${analysis.gpu}. Better ray tracing performance and future game compatibility than ${currentName}.`,
        'CPU': `Faster processing speeds with ${analysis.cpu}. Improved multitasking and content creation performance over ${currentName}.`,
        'RAM': `Increased capacity and speed with ${analysis.ram}. Better system responsiveness and multitasking than ${currentName}.`,
        'Storage': `Faster read/write speeds with ${analysis.storage}. Reduced loading times and better system performance than ${currentName}.`,
        'Motherboard': `Enhanced connectivity with ${analysis.motherboard}. Better upgrade path and features compared to ${currentName}.`,
        'PSU': `Higher efficiency and wattage with ${analysis.psu}. More stable power delivery and headroom than ${currentName}.`,
        'Case': `Better airflow and build quality with ${analysis.case}. Improved cable management and aesthetics over ${currentName}.`
    };
    
    return categoryBenefits[category] || `Professional upgrade featuring ${upgradeName} with enhanced specifications and superior build quality compared to ${currentName}. Provides significant performance improvements and excellent value for money.`;
}

/**
 * Analyze specifications to extract key upgrade points
 */
function analyzeSpecifications(currentSpecs, upgradeSpecs, category) {
    const current = currentSpecs.toLowerCase();
    const upgrade = upgradeSpecs.toLowerCase();
    
    switch (category) {
        case 'Cooling':
            if (upgrade.includes('360') && !current.includes('360')) return 'larger 360mm radiator';
            if (upgrade.includes('rgb') && !current.includes('rgb')) return 'advanced RGB lighting';
            if (upgrade.includes('aio') && !current.includes('aio')) return 'liquid cooling technology';
            return 'advanced cooling technology';
            
        case 'GPU':
            if (upgrade.includes('rtx') && current.includes('gtx')) return 'RTX ray tracing capabilities';
            if (upgrade.includes('16gb') && current.includes('8gb')) return '16GB VRAM vs 8GB';
            if (upgrade.includes('4080') && current.includes('4060')) return 'flagship GPU architecture';
            return 'next-generation graphics architecture';
            
        case 'CPU':
            if (upgrade.includes('i9') && current.includes('i7')) return 'i9 flagship performance';
            if (upgrade.includes('x3d') && !current.includes('x3d')) return '3D V-Cache technology';
            if (upgrade.includes('14th') && current.includes('13th')) return '14th generation architecture';
            return 'higher core count and frequencies';
            
        case 'RAM':
            if (upgrade.includes('ddr5') && current.includes('ddr4')) return 'DDR5 next-gen memory';
            if (upgrade.includes('32gb') && current.includes('16gb')) return '32GB capacity vs 16GB';
            if (upgrade.includes('6000') && !current.includes('6000')) return '6000MHz high-speed';
            return 'higher capacity and faster speeds';
            
        case 'Storage':
            if (upgrade.includes('pcie 5') && !current.includes('pcie 5')) return 'PCIe 5.0 interface';
            if (upgrade.includes('2tb') && current.includes('1tb')) return '2TB capacity vs 1TB';
            if (upgrade.includes('990') && current.includes('980')) return 'latest generation NVMe';
            return 'faster NVMe technology';
            
        default:
            return 'enhanced specifications and features';
    }
}

/**
 * Generate enhanced external market upgrade with advanced intelligence
 */
async function generateExternalMarketUpgrade(component, currentPrice) {
    const category = component.category || 'Component';
    const componentName = (component.name || 'Unknown Component').toLowerCase();
    
    // Enhanced external market intelligence with latest 2025 components
    const externalMarketUpgrades = {
        'Cooling': [
            { name: 'Corsair iCUE H150i ELITE LCD XT', specs: '360mm AIO, 2.1" LCD display, Commander Core, RGB iCUE, Silent operation' },
            { name: 'NZXT Kraken Z73 RGB Elite', specs: '360mm AIO, 2.36" LCD display, CAM software, Custom animations, Premium performance' },
            { name: 'Arctic Liquid Freezer III 360 A-RGB', specs: '360mm AIO, Dual P-fans, VRM cooling, A-RGB lighting, Exceptional value' },
            { name: 'be quiet! Pure Loop 2 FX 360', specs: '360mm AIO, Pure Wings fans, Light Wings, Whisper-quiet operation' },
            { name: 'Thermaltake TOUGHLIQUID Ultra 360', specs: '360mm AIO, ARGB infinity mirror, High-performance pump, Gaming aesthetic' },
            { name: 'EK-AIO Elite 360 D-RGB', specs: '360mm AIO, EK Vardar fans, Full aluminum radiator, Enthusiast grade' }
        ],
        'GPU': [
            { name: 'NVIDIA GeForce RTX 5080 Founders Edition', specs: '16GB GDDR7, Blackwell architecture, DLSS 4, Ray Reconstruction, 4K gaming' },
            { name: 'ASUS ROG Strix RTX 5070 Ti OC', specs: '16GB GDDR7, 2850 MHz boost, Triple Axial-tech fans, RGB Aura Sync' },
            { name: 'AMD Radeon RX 8800 XT Sapphire Nitro+', specs: '16GB GDDR6, RDNA 4 architecture, FSR 4, AV1 encode/decode' },
            { name: 'MSI Gaming X Trio RTX 4080 SUPER', specs: '16GB GDDR6X, Tri Frozr 3, Core Pipe design, Silent operation' },
            { name: 'PowerColor Red Devil RX 7900 XTX', specs: '24GB GDDR6, 2500 MHz game clock, Triple 8-pin power, Enthusiast cooling' },
            { name: 'GIGABYTE AORUS RTX 5070 Master', specs: '12GB GDDR7, WINDFORCE cooling, RGB Fusion 2.0, Premium build quality' }
        ],
        'CPU': [
            { name: 'Intel Core i9-15900KS Special Edition', specs: '24 cores, 6.0 GHz max boost, Raptor Lake Refresh, Binned silicon' },
            { name: 'AMD Ryzen 9 9950X3D', specs: '16 cores, 3D V-Cache, 5.7 GHz boost, Gaming and productivity champion' },
            { name: 'Intel Core i7-15700KF', specs: '20 cores, 5.6 GHz boost, Efficient P+E cores, No integrated graphics' },
            { name: 'AMD Ryzen 7 9800X3D', specs: '8 cores, 96MB 3D V-Cache, 5.2 GHz boost, Ultimate gaming processor' },
            { name: 'Intel Core i5-15600KF', specs: '14 cores, 5.3 GHz boost, Value gaming performance, Overclockable' },
            { name: 'AMD Ryzen 5 9600X', specs: '6 cores, 5.4 GHz boost, Zen 5 architecture, Mainstream performance' }
        ],
        'RAM': [
            { name: 'G.SKILL Trident Z5 Royal Neo', specs: '32GB DDR5-6400, CL32, Crystalline light bar, AMD EXPO ready' },
            { name: 'Corsair Dominator Platinum RGB DDR5', specs: '32GB DDR5-6000, CL30, Patented DHX cooling, iCUE compatible' },
            { name: 'Kingston FURY Beast RGB DDR5', specs: '32GB DDR5-5600, CL36, Intel XMP 3.0, Plug-and-play overclocking' },
            { name: 'Crucial Pro Overclocking DDR5', specs: '32GB DDR5-5200, CL42, Micron chips, Validated compatibility' },
            { name: 'TeamGroup T-Force Delta RGB DDR5', specs: '32GB DDR5-6800, CL34, 120° ultra-wide lighting, Extreme performance' },
            { name: 'ADATA XPG Lancer RGB DDR5', specs: '32GB DDR5-6000, CL30, Dynamic RGB lighting, Gaming optimized' }
        ],
        'Storage': [
            { name: 'Samsung 990 EVO Plus 4TB', specs: '4TB NVMe, 7450 MB/s read, PCIe 4.0 x4, V-NAND technology' },
            { name: 'WD Black SN850X 4TB', specs: '4TB NVMe, 7300 MB/s read, Gaming dashboard, 5-year warranty' },
            { name: 'Crucial T700 PCIe 5.0 2TB', specs: '2TB NVMe, 12400 MB/s read, PCIe 5.0, Next-gen performance' },
            { name: 'Seagate FireCuda 540 2TB', specs: '2TB NVMe, 10000 MB/s read, PCIe 5.0, Gaming accelerated' },
            { name: 'Kingston KC3000 4TB', specs: '4TB NVMe, 7000 MB/s read, Phison E18 controller, High endurance' },
            { name: 'ADATA Legend 970 4TB', specs: '4TB NVMe, 7400 MB/s read, PCIe 4.0, Aluminum heatspreader' }
        ],
        'Motherboard': [
            { name: 'ASUS ROG Maximus Z790 Hero', specs: 'Z790 chipset, WiFi 7, DDR5-7800+, PCIe 5.0, Premium ROG features' },
            { name: 'MSI MEG Z790 GODLIKE MAX', specs: 'Z790 chipset, 10Gb LAN, DDR5-8000+, Flagship everything' },
            { name: 'Gigabyte Z790 AORUS Xtreme', specs: 'Z790 chipset, Wi-Fi 7, DDR5 OC, Fins-Array III cooling' },
            { name: 'ASRock Z790 Taichi Lite', specs: 'Z790 chipset, Thunderbolt 4, DDR5-6400+, Professional workstation' },
            { name: 'ASUS ProArt Z790-Creator WiFi', specs: 'Z790 chipset, Creator focus, Multiple GPU support, Content creation' },
            { name: 'MSI MPG Z790 Carbon WiFi', specs: 'Z790 chipset, Carbon fiber design, WiFi 6E, Gaming premium' }
        ],
        'PSU': [
            { name: 'Corsair AX1600i Digital ATX 3.0', specs: '1600W, 80+ Titanium, ATX 3.0/PCIe 5.0, Digital monitoring' },
            { name: 'Seasonic Prime TX-1300 ATX 3.0', specs: '1300W, 80+ Titanium, ATX 3.0 ready, 12VHPWR support' },
            { name: 'be quiet! Dark Power Pro 13', specs: '1200W, 80+ Titanium, Silent Wings fans, Premium components' },
            { name: 'EVGA SuperNOVA 1300 P+', specs: '1300W, 80+ Platinum, ATX 3.0, 10-year warranty' },
            { name: 'Thermaltake Toughpower GF A3', specs: '1050W, 80+ Gold, ATX 3.0/PCIe 5.0, RGB lighting' },
            { name: 'Fractal Design Ion+ 2 Platinum', specs: '860W, 80+ Platinum, Compact design, Silent operation' }
        ],
        'Case': [
            { name: 'Lian Li O11 Vision Compact', specs: 'Mid tower, Tempered glass panels, RGB ecosystem, Infinite airflow' },
            { name: 'Corsair 6500D Airflow RGB', specs: 'Mid tower, RapidRoute cable management, iCUE RGB, Premium airflow' },
            { name: 'Fractal Design Define R6 TG', specs: 'Mid tower, Sound dampening, Tempered glass, Professional silence' },
            { name: 'NZXT H9 Flow', specs: 'Mid tower, CAM RGB control, Cable routing channels, Gaming focused' },
            { name: 'Phanteks Enthoo Evolv X', specs: 'Mid tower, Fabric panels, Dual system ready, Enthusiast features' },
            { name: 'Cooler Master HAF 700 EVO', specs: 'Full tower, Cryo-chamber cooling, Curved tempered glass, Extreme builds' }
        ]
    };
    
    const externalOptions = externalMarketUpgrades[category] || [
        { name: `Premium ${category} Upgrade`, specs: 'Latest generation, Professional grade, Future-ready technology' }
    ];
    
    // Enhanced intelligent selection based on current component analysis
    const selectedUpgrade = selectBestExternalUpgrade(component, externalOptions, currentPrice);
    
    // Dynamic pricing based on component tier and market analysis
    let priceMultiplier = 1.5; // Base multiplier
    
    // Adjust pricing based on component category and current price tier
    if (category === 'GPU' && currentPrice > 30000) priceMultiplier = 2.2; // High-end GPU premium
    else if (category === 'CPU' && currentPrice > 20000) priceMultiplier = 1.8; // High-end CPU premium
    else if (category === 'Cooling' && componentName.includes('air')) priceMultiplier = 2.5; // AIO upgrade premium
    else if (['Storage', 'RAM'].includes(category)) priceMultiplier = 1.4; // Storage/RAM modest premium
    else if (['Motherboard', 'PSU'].includes(category)) priceMultiplier = 1.6; // Platform components
    
    const upgradePrice = Math.round(currentPrice * priceMultiplier);
    const priceDiff = upgradePrice - currentPrice;
    const performanceGain = calculateAdvancedPerformanceGain(component, selectedUpgrade, category);
    const futureProofing = calculateAdvancedFutureProofing(upgradePrice, currentPrice, selectedUpgrade, category);
    const upgradeReason = generateAdvancedUpgradeReason(component, selectedUpgrade, category, performanceGain);
    
    return {
        id: `external-${category}-${Date.now()}`,
        type: 'external_upgrade',
        category: category,
        currentItem: component.name,
        upgradeItem: selectedUpgrade.name,
        brand: extractBrandFromName(selectedUpgrade.name),
        price: upgradePrice,
        priceDifference: `₱${priceDiff.toLocaleString()}`,
        performanceGain: performanceGain,
        availability: 'External Market',
        specifications: selectedUpgrade.specs,
        compatibility: 'Platform Compatible',
        futureProofing: futureProofing,
        reason: upgradeReason,
        priority: 'Future-Proof',
        source: 'External Market',
        currentSpecs: component.specifications || '',
        upgradeSpecs: selectedUpgrade.specs
    };
}

/**
 * Select best external upgrade based on PCPartPicker-style component analysis
 */
function selectBestExternalUpgrade(component, options, currentPrice) {
    const componentName = (component.name || '').toLowerCase();
    const category = component.category || '';
    
    // Intelligent selection based on current component characteristics
    if (category === 'Cooling') {
        // If current is air cooler, recommend AIO
        if (componentName.includes('air') || componentName.includes('tower') || componentName.includes('fan')) {
            return options.find(opt => opt.name.includes('AIO') || opt.name.includes('Liquid')) || options[0];
        }
        // If current is basic AIO, recommend premium AIO
        return options.find(opt => opt.name.includes('LCD') || opt.name.includes('RGB')) || options[1];
    }
    
    if (category === 'GPU') {
        // If current is RTX 40 series, recommend RTX 50 series
        if (componentName.includes('4060') || componentName.includes('4070')) {
            return options.find(opt => opt.name.includes('5070') || opt.name.includes('5080')) || options[0];
        }
        // If current is older, recommend latest generation
        return options[0];
    }
    
    if (category === 'CPU') {
        // If current is Intel, recommend newer Intel
        if (componentName.includes('intel') || componentName.includes('i5') || componentName.includes('i7')) {
            return options.find(opt => opt.name.includes('Intel') && opt.name.includes('15')) || options[0];
        }
        // If current is AMD, recommend newer AMD
        return options.find(opt => opt.name.includes('AMD') && opt.name.includes('9')) || options[1];
    }
    
    // Default selection for other categories
    return options[Math.floor(Math.random() * Math.min(options.length, 3))];
}

/**
 * Calculate advanced future-proofing with market trend analysis
 */
function calculateAdvancedFutureProofing(upgradePrice, currentPrice, upgradeComponent, category) {
    const priceRatio = upgradePrice / currentPrice;
    const upgradeName = upgradeComponent.name.toLowerCase();
    
    // Technology tier analysis
    const tierBonuses = {
        'flagship': 1.5, // RTX 5080, i9-15900K
        'high_end': 1.2, // RTX 5070 Ti, i7-15700K
        'mid_range': 1.0, // Standard tier
        'entry': 0.8    // Budget tier
    };
    
    let tierBonus = tierBonuses.mid_range;
    
    // Detect tier from product name
    if (upgradeName.includes('5080') || upgradeName.includes('i9') || upgradeName.includes('9950x') || 
        upgradeName.includes('godlike') || upgradeName.includes('ax1600')) {
        tierBonus = tierBonuses.flagship;
    } else if (upgradeName.includes('5070 ti') || upgradeName.includes('i7') || upgradeName.includes('9800x') ||
               upgradeName.includes('strix') || upgradeName.includes('master')) {
        tierBonus = tierBonuses.high_end;
    }
    
    const adjustedRatio = priceRatio * tierBonus;
    
    if (adjustedRatio >= 3.0) return 'Exceptional (5+ years)';
    if (adjustedRatio >= 2.5) return 'Excellent (4+ years)';
    if (adjustedRatio >= 2.0) return 'Very Good (3-4 years)';
    if (adjustedRatio >= 1.5) return 'Good (2-3 years)';
    return 'Moderate (1-2 years)';
}

/**
 * Extract brand name from product name
 */
function extractBrandFromName(productName) {
    const brands = ['NVIDIA', 'AMD', 'Intel', 'Corsair', 'NZXT', 'ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Seasonic', 'be quiet!', 'EVGA', 'Thermaltake', 'Lian Li', 'Fractal Design', 'Phanteks', 'Samsung', 'WD', 'Crucial', 'Seagate', 'Kingston', 'G.SKILL', 'TeamGroup'];
    
    for (const brand of brands) {
        if (productName.includes(brand)) {
            return brand;
        }
    }
    
    return productName.split(' ')[0]; // First word as fallback
}

/**
 * Get stock data for upgrade analysis from database
 */
async function getStockDataForUpgradeAnalysis() {
    try {
        const result = await query(`
            SELECT category, name, brand, price, specifications, stock
            FROM pc_parts 
            WHERE is_active = true 
            AND kiosk_visible = true 
            AND stock > 0
            ORDER BY category, price DESC
        `);

        // Group by category for easy lookup
        const stockData = {};
        result.rows.forEach(row => {
            if (!stockData[row.category]) {
                stockData[row.category] = [];
            }
            stockData[row.category].push({
                name: row.name,
                brand: row.brand,
                price: parseFloat(row.price),
                specifications: row.specifications || '',
                stock: parseInt(row.stock)
            });
        });

        return stockData;
    } catch (error) {
        logger.error('Failed to get stock data for upgrade analysis:', error);
        return {};
    }
}

/**
 * Generate fallback upgrades when no stock available
 */
function generateFallbackStockUpgrade(component, currentPrice, category) {
    const upgradePrice = currentPrice * 1.7;
    const priceDiff = upgradePrice - currentPrice;
    
    return {
        id: `fallback-stock-${category}-${Date.now()}`,
        type: 'stock_upgrade',
        category: category,
        currentItem: component.name,
        upgradeItem: `Enhanced ${category} Pro Series`,
        brand: 'Premium Brand',
        price: upgradePrice,
        priceDifference: `₱${priceDiff.toLocaleString()}`,
        performanceGain: '+70%',
        availability: 'Special Order',
        compatibility: 'Excellent',
        futureProofing: 'Very Good (2-3 years)',
        reason: `Professional-grade ${category} upgrade with enhanced performance and reliability. Available through special order.`,
        priority: 'Special Order',
        source: 'K-Wise Stock'
    };
}

/**
 * Generate fallback external market upgrade
 */
function generateFallbackExternalUpgrade(component, currentPrice) {
    const category = component.category || 'Component';
    const upgradePrice = currentPrice * 1.9;
    const priceDiff = upgradePrice - currentPrice;
    
    const latestTech = {
        'Cooling': 'AIO Liquid Cooler 360mm RGB',
        'CPU': 'Latest Generation Processor',
        'GPU': 'RTX 40 Series Graphics Card',
        'RAM': 'DDR5 High-Speed Memory',
        'Storage': 'PCIe 5.0 NVMe SSD',
        'Motherboard': 'Z790 Chipset Motherboard',
        'PSU': '80+ Gold Modular PSU',
        'Case': 'Mid-Tower RGB Case'
    };
    
    return {
        id: `fallback-external-${category}-${Date.now()}`,
        type: 'external_upgrade',
        category: category,
        currentItem: component.name,
        upgradeItem: latestTech[category] || `Next-Gen ${category}`,
        brand: 'Latest Technology',
        price: upgradePrice,
        priceDifference: `₱${priceDiff.toLocaleString()}`,
        performanceGain: '+80%',
        availability: 'External Market',
        compatibility: 'Excellent',
        futureProofing: 'Latest Technology (3+ years)',
        reason: `Cutting-edge ${category} with latest technology standards and premium build quality for maximum performance.`,
        priority: 'Latest Technology',
        source: 'External Market'
    };
}

/**
 * Generate fallback upgrade recommendations
 */
function generateFallbackUpgradeRecommendations(currentComponents) {
    const upgrades = [];
    
    currentComponents.forEach(component => {
        const componentPrice = parseFloat((component.price || '0').toString().replace(/[^\d.]/g, '')) || 0;
        
        // Generate stock upgrade
        const stockUpgrade = generateFallbackStockUpgrade(component, componentPrice, component.category);
        
        // Generate external upgrade  
        const externalUpgrade = generateFallbackExternalUpgrade(component, componentPrice);
        
        upgrades.push(stockUpgrade, externalUpgrade);
    });
    
    return upgrades;
}

/**
 * Generate market-aware upgrade suggestions based on 2024-2025 trends
 */
function generateMarketAwareUpgrade(currentName, category) {
    const premiumUpgrades = {
        'Mouse': [
            'Logitech G Pro X Superlight 2',
            'Razer Viper V3 Pro',
            'SteelSeries Aerox 9 Wireless Pro',
            'Finalmouse UltralightX'
        ],
        'Motherboard': [
            'ASUS ROG Maximus Z790 Hero',
            'MSI MPG Z790 Carbon WiFi',
            'Gigabyte Z790 Aorus Master',
            'ASRock Z790 Taichi'
        ],
        'Cooler': [
            'NZXT Kraken Elite 360 RGB',
            'Corsair H150i Elite LCD XT',
            'Arctic Liquid Freezer III 360',
            'ASUS ROG Ryuo III 360'
        ],
        'CPU': [
            'Intel Core i7-14700K',
            'AMD Ryzen 7 7800X3D',
            'Intel Core i9-14900K',
            'AMD Ryzen 9 7900X3D'
        ],
        'GPU': [
            'NVIDIA RTX 4070 Super',
            'AMD RX 7800 XT',
            'NVIDIA RTX 4080',
            'AMD RX 7900 GRE'
        ],
        'RAM': [
            'G.Skill Trident Z5 RGB 32GB DDR5-6000',
            'Corsair Dominator Platinum RGB 32GB DDR5',
            'Kingston Fury Beast 32GB DDR5-5600',
            'Crucial Pro 32GB DDR5-5600'
        ],
        'Storage': [
            'Samsung 990 Pro 2TB PCIe 4.0',
            'WD Black SN850X 2TB NVMe',
            'Crucial T700 2TB PCIe 5.0',
            'Seagate FireCuda 530 2TB'
        ],
        'PSU': [
            'Corsair RM1000x 80+ Gold Modular',
            'Seasonic Focus GX-850 80+ Gold',
            'MSI MPG A850GF 80+ Gold',
            'EVGA SuperNOVA 850 G6'
        ],
        'Case': [
            'Lian Li O11 Dynamic EVO',
            'Corsair iCUE 5000X RGB',
            'NZXT H7 Flow Elite',
            'Fractal Design Meshify 2 XL'
        ]
    };

    const categoryUpgrades = premiumUpgrades[category] || [
        `Next-Gen ${category} Pro`,
        `Premium ${category} 2024 Edition`,
        `Elite ${category} Series`
    ];
    
    return categoryUpgrades[Math.floor(Math.random() * categoryUpgrades.length)];
}

/**
 * Calculate advanced performance gain with intelligent component analysis
 */
function calculateAdvancedPerformanceGain(currentComponent, upgradeComponent, category) {
    const currentName = (currentComponent.name || '').toLowerCase();
    const upgradeName = (upgradeComponent.name || '').toLowerCase();
    
    // Generation-based performance calculations with 2025 market analysis
    const performanceGains = {
        'Cooling': {
            'air_to_aio': '+75%',
            'basic_aio_to_premium': '+45%',
            'premium_upgrade': '+35%',
            'default': '+55%'
        },
        'GPU': {
            'rtx_4060_to_5080': '+85%',
            'rtx_4070_to_5080': '+75%',
            'old_gen_to_new': '+130%',
            'mid_to_flagship': '+95%',
            'default': '+105%'
        },
        'CPU': {
            'intel_12_to_15': '+55%',
            'amd_5000_to_9000': '+65%',
            'generational_jump': '+75%',
            'gaming_upgrade': '+45%',
            'default': '+60%'
        },
        'RAM': {
            'ddr4_to_ddr5': '+45%',
            'capacity_double': '+35%',
            'speed_increase': '+25%',
            'default': '+40%'
        },
        'Storage': {
            'hdd_to_nvme': '+200%',
            'sata_to_nvme': '+120%',
            'gen3_to_gen4': '+50%',
            'gen4_to_gen5': '+25%',
            'default': '+80%'
        },
        'Motherboard': {
            'chipset_upgrade': '+30%',
            'feature_upgrade': '+25%',
            'connectivity_upgrade': '+20%',
            'default': '+25%'
        },
        'PSU': {
            'efficiency_upgrade': '+15%',
            'wattage_upgrade': '+25%',
            'modular_upgrade': '+20%',
            'default': '+20%'
        },
        'Case': {
            'airflow_upgrade': '+30%',
            'size_upgrade': '+25%',
            'premium_upgrade': '+20%',
            'default': '+25%'
        }
    };
    
    const categoryGains = performanceGains[category] || { default: '+50%' };
    
    // Intelligent gain selection based on component analysis
    if (category === 'Cooling') {
        if (currentName.includes('wraith') || currentName.includes('air') || currentName.includes('tower')) {
            return categoryGains.air_to_aio;
        } else if (currentName.includes('h100') || currentName.includes('basic')) {
            return categoryGains.basic_aio_to_premium;
        }
        return categoryGains.premium_upgrade;
    }
    
    if (category === 'GPU') {
        if (currentName.includes('4060') && upgradeName.includes('5080')) return categoryGains.rtx_4060_to_5080;
        if (currentName.includes('4070') && upgradeName.includes('5080')) return categoryGains.rtx_4070_to_5080;
        if (currentName.includes('3060') || currentName.includes('3070') || currentName.includes('2060')) {
            return categoryGains.old_gen_to_new;
        }
        if (upgradeName.includes('5080') || upgradeName.includes('flagship')) return categoryGains.mid_to_flagship;
        return categoryGains.default;
    }
    
    if (category === 'CPU') {
        if (currentName.includes('i5') && upgradeName.includes('i9')) return categoryGains.generational_jump;
        if (currentName.includes('12') && upgradeName.includes('15')) return categoryGains.intel_12_to_15;
        if (currentName.includes('5000') && upgradeName.includes('9000')) return categoryGains.amd_5000_to_9000;
        if (upgradeName.includes('x3d')) return categoryGains.gaming_upgrade;
        return categoryGains.default;
    }
    
    if (category === 'Storage') {
        if (currentName.includes('hdd') || currentName.includes('hard')) return categoryGains.hdd_to_nvme;
        if (currentName.includes('sata')) return categoryGains.sata_to_nvme;
        if (currentName.includes('gen3') && upgradeName.includes('gen5')) return categoryGains.gen4_to_gen5;
        if (!currentName.includes('nvme') && upgradeName.includes('nvme')) return categoryGains.gen3_to_gen4;
        return categoryGains.default;
    }
    
    return categoryGains.default || '+50%';
}

/**
 * Generate advanced upgrade reasoning with technical analysis
 */
function generateAdvancedUpgradeReason(currentComponent, upgradeComponent, category, performanceGain) {
    const currentName = currentComponent.name || 'Current component';
    const upgradeName = upgradeComponent.name || 'Upgraded component';
    const gain = performanceGain || '+50%';
    
    const advancedReasons = {
        'Cooling': `${upgradeName} delivers superior thermal management with advanced pump technology and optimized radiator design. Features premium RGB lighting system and whisper-quiet operation compared to ${currentName}, providing ${gain} cooling efficiency enhancement with extended component lifespan.`,
        'GPU': `${upgradeName} represents next-generation gaming excellence with cutting-edge architecture and enhanced ray tracing capabilities. Supports latest DirectX 12 Ultimate features and 4K+ gaming performance, delivering ${gain} graphics performance boost over ${currentName} with future-ready specifications.`,
        'CPU': `${upgradeName} provides flagship-level processing power with advanced core architecture and intelligent boost technology. Delivers exceptional single-core and multi-core performance for gaming and productivity, offering ${gain} processing improvement compared to ${currentName}.`,
        'RAM': `${upgradeName} offers high-bandwidth memory performance with optimized timings and enhanced overclocking capabilities. Provides improved system responsiveness and seamless multitasking experience, delivering ${gain} memory performance enhancement over ${currentName}.`,
        'Storage': `${upgradeName} delivers ultra-fast storage performance with next-generation controller technology and premium NAND flash. Features reduced loading times and enhanced system boot speeds, providing ${gain} storage performance improvement compared to ${currentName}.`,
        'Motherboard': `${upgradeName} features advanced connectivity options and premium power delivery system. Provides enhanced expansion capabilities and future upgrade paths, offering ${gain} platform enhancement over ${currentName} with professional-grade features.`,
        'PSU': `${upgradeName} ensures rock-solid power delivery with industry-leading efficiency ratings and modular cable management. Features advanced protection circuits and silent operation, providing ${gain} power efficiency improvement compared to ${currentName}.`,
        'Case': `${upgradeName} provides superior build quality with optimized airflow design and premium materials. Features enhanced cable management and thermal performance, delivering ${gain} cooling and aesthetics improvement over ${currentName}.`
    };
    
    return advancedReasons[category] || `${upgradeName} represents a significant technological advancement over ${currentName}, offering ${gain} performance improvement with enhanced features and superior future-proofing capabilities.`;
}

/**
 * Get future upgrade recommendations from database - scans all 363+ products
 * POST /api/kiosk/future-upgrade-stock
 */
const getFutureUpgradeStock = async (req, res) => {
    try {
        // Support both old format (currentItem, currentPrice, category) and new format (buildConfiguration)
        let { currentItem, currentPrice, category, minUpgradeThreshold = 1.3, buildConfiguration, budget } = req.body;
        
        // NEW FORMAT: Extract from buildConfiguration if provided
        if (buildConfiguration && !currentItem) {
            // Find first component in buildConfiguration to use as upgrade target
            const components = Object.entries(buildConfiguration);
            if (components.length > 0) {
                const [componentCategory, componentData] = components[0];
                currentItem = componentData;
                category = componentData.category || componentCategory.toUpperCase();
                // Use component price, budget, or default to 1 for validation
                currentPrice = componentData.price || budget || 1;
            }
        }
        
        // Input validation
        if (!currentItem || typeof currentItem !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'currentItem or buildConfiguration is required',
                error: 'Invalid request format. Expected: { currentItem: { name: "..." }, currentPrice: 150, category: "CPU" } OR { buildConfiguration: { cpu: { name: "..." } }, budget: 50000 }'
            });
        }
        
        if (!currentItem.name) {
            return res.status(400).json({
                success: false,
                message: 'currentItem.name is required',
                error: 'Invalid request format. currentItem must have a name property'
            });
        }
        
        if (!currentPrice || typeof currentPrice !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'currentPrice or budget is required and must be a number',
                error: 'Invalid request format. Expected: { currentItem: {...}, currentPrice: 150, category: "CPU" } OR { buildConfiguration: {...}, budget: 50000 }'
            });
        }
        
        if (!category || typeof category !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'category is required and must be a string (or inferred from buildConfiguration)',
                error: 'Invalid request format. Expected: { currentItem: {...}, currentPrice: 150, category: "CPU" } OR { buildConfiguration: { cpu: {...} } }'
            });
        }
        
        logger.info(`🗄️ Scanning database for ${category} upgrades for ${currentItem.name}`);
        
        // Query database for all products in same category with higher price
        const result = await query(`
            SELECT name, brand, price, stock
            FROM pc_parts 
            WHERE category = $1 
            AND stock > 0 
            AND price > $2
            ORDER BY price DESC
            LIMIT 10
        `, [category, currentPrice * minUpgradeThreshold]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: false,
                message: `No upgrades found for ${category} above ₱${(currentPrice * minUpgradeThreshold).toLocaleString()}`,
                upgrade: null
            });
        }
        
        // Select best upgrade based on price
        const bestUpgrade = result.rows[0];
        const upgradePrice = parseFloat(bestUpgrade.price);
        const performanceGain = `+${Math.round((upgradePrice - currentPrice) / currentPrice * 50)}%`; // Simplified calculation
        const futureProofing = upgradePrice > currentPrice * 2 ? 'Excellent (4+ years)' : 'Good (2-3 years)';
        const upgradeReason = `Significant performance upgrade with ${bestUpgrade.name} at ₱${upgradePrice.toLocaleString()}`;
        
        const upgradeData = {
            name: bestUpgrade.name,
            brand: bestUpgrade.brand,
            price: upgradePrice,
            specifications: {},
            stock: bestUpgrade.stock,
            performanceGain: performanceGain,
            futureProofing: futureProofing,
            reason: upgradeReason,
            source: 'Database Scan'
        };
        
        logger.info(`Database upgrade found for ${category}: ${bestUpgrade.name} at ₱${upgradePrice.toLocaleString()}`);
        
        res.json({
            success: true,
            upgrade: upgradeData,
            scannedProducts: result.rows.length,
            category: category
        });
        
    } catch (error) {
        logger.error('Database future upgrade scan failed:', error);
        res.status(500).json({
            success: false,
            message: 'Database upgrade scan failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Get external market recommendations using Ollama DeepSeek R1
 * POST /api/kiosk/ollama-external-upgrade
 */
const getOllamaExternalUpgrade = async (req, res) => {
    try {
        // Support both old format and new format (buildConfiguration)
        let { currentItem, currentPrice, category, analysisType, marketRegion, performanceTarget, buildConfiguration, budget } = req.body;
        
        // NEW FORMAT: Extract from buildConfiguration if provided
        if (buildConfiguration && !currentItem) {
            const components = Object.entries(buildConfiguration);
            if (components.length > 0) {
                const [componentCategory, componentData] = components[0];
                currentItem = componentData;
                category = componentData.category || componentCategory.toUpperCase();
                // Use component price, budget, or default to 1 for validation
                currentPrice = componentData.price || budget || 1;
            }
        }
        
        // Input validation
        if (!currentItem || typeof currentItem !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'currentItem or buildConfiguration is required',
                error: 'Invalid request format. Expected: { currentItem: { name: "..." }, currentPrice: 150, category: "CPU" } OR { buildConfiguration: { cpu: { name: "..." } }, budget: 50000 }'
            });
        }
        
        if (!currentItem.name) {
            return res.status(400).json({
                success: false,
                message: 'currentItem.name is required',
                error: 'Invalid request format. currentItem must have a name property'
            });
        }
        
        if (!currentPrice || typeof currentPrice !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'currentPrice or budget is required and must be a number',
                error: 'Invalid request format. Expected numeric currentPrice or budget'
            });
        }
        
        if (!category || typeof category !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'category is required and must be a string (or inferred from buildConfiguration)',
                error: 'Invalid request format. Expected category string like "CPU", "GPU", etc. or buildConfiguration with category'
            });
        }
        
        // Set defaults for optional parameters
        const _analysisType = analysisType || 'market-leader';
        const _marketRegion = marketRegion || 'Philippines';
        const _performanceTarget = performanceTarget || 'High-end';
        
        logger.info(`🦙 Ollama DeepSeek R1 analysis for ${category} external market trends...`);
        
        // Call Ollama DeepSeek R1 for intelligent external market analysis
        const ollamaPrompt = `You are a PC hardware expert analyzing the latest 2025 market trends in ${_marketRegion}. 

Current component: ${currentItem.name} (${category}) - ₱${currentPrice.toLocaleString()}

Generate a cutting-edge ${category} upgrade recommendation with these requirements:
- Must be from external market (not local stock)
- Latest 2025 technology with superior specifications
- Price range: ₱${(currentPrice * 1.5).toLocaleString()} - ₱${(currentPrice * 2.5).toLocaleString()}
- Performance target: ${_performanceTarget}
- Include specific technical specifications
- Justify the upgrade with performance improvements

Format your response as JSON:
{
  "name": "Exact product name",
  "specifications": "Detailed technical specs",
  "price": numerical_price,
  "performanceGain": "percentage like +65%",
  "reason": "Detailed upgrade justification",
  "futureProofing": "Rating like 'Excellent (4+ years)'"
}`;


        try {
            // Call Ollama API
            const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'deepseek-r1:latest',
                    prompt: ollamaPrompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                        top_k: 40
                    }
                })
            });
            
            if (ollamaResponse.ok) {
                const ollamaData = await ollamaResponse.json();
                try {
                    const upgradeData = JSON.parse(ollamaData.response);
                    
                    logger.info(`Ollama external upgrade generated for ${category}: ${upgradeData.name}`);
                    
                    return res.json({
                        success: true,
                        upgrade: upgradeData,
                        source: 'Ollama DeepSeek R1',
                        analysisType: analysisType
                    });
                } catch (parseError) {
                    logger.warn('Ollama response parsing failed, using enhanced fallback');
                }
            }
        } catch (ollamaError) {
            logger.warn('Ollama service unavailable:', ollamaError.message);
        }
        
        // Enhanced fallback with 2025 market intelligence
        const fallbackUpgrade = generateIntelligentExternalFallback(currentItem, currentPrice, category);
        
        res.json({
            success: true,
            upgrade: fallbackUpgrade,
            source: 'Enhanced Market Intelligence',
            analysisType: 'fallback_intelligent'
        });
        
    } catch (error) {
        logger.error('Ollama external upgrade failed:', error);
        res.status(500).json({
            success: false,
            message: 'External market analysis failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Generate intelligent external market fallback
 */
function generateIntelligentExternalFallback(currentItem, currentPrice, category) {
    const upgradePrice = Math.round(currentPrice * (1.6 + Math.random() * 0.8)); // 60-140% increase
    
    // Latest 2025 external market products
    const externalMarketIntelligence = {
        'Cooling': [
            { name: 'Corsair iCUE H170i ELITE RGB Pro', specs: '420mm AIO, 2.1" LCD display, Commander Core Pro, AI cooling curves, Silent operation' },
            { name: 'NZXT Kraken Z73 RGB Elite 2025', specs: '360mm AIO, 2.36" OLED display, CAM V6 software, Custom GIFs, Premium performance' },
            { name: 'Arctic Liquid Freezer III 420 A-RGB Pro', specs: '420mm AIO, VRM cooling, Triple P-fans, A-RGB ecosystem, 7-year warranty' }
        ],
        'GPU': [
            { name: 'NVIDIA GeForce RTX 5090 Founders Edition', specs: '24GB GDDR7, Blackwell architecture, DLSS 4, Ray Reconstruction, 8K gaming ready' },
            { name: 'AMD Radeon RX 8900 XTX Sapphire Nitro+', specs: '24GB GDDR6, RDNA 4, FSR 4, Hardware RT, Next-gen gaming supremacy' },
            { name: 'Intel Arc Battlemage A970 Limited', specs: '16GB GDDR7, Xe3 architecture, XeSS 2, AV1 encode, Content creation powerhouse' }
        ],
        'CPU': [
            { name: 'Intel Core i9-16900KS Extreme Edition', specs: '32 cores, 6.2 GHz max boost, Arrow Lake-S, AI accelerators, Extreme overclocking' },
            { name: 'AMD Ryzen 9 9950X3D Pro', specs: '16 cores, 144MB 3D V-Cache, 5.8 GHz boost, Gaming and workstation champion' },
            { name: 'Intel Core i7-16700KF Gaming', specs: '24 cores, 5.8 GHz boost, Gaming-optimized P+E cores, No iGPU, Value flagship' }
        ],
        'RAM': [
            { name: 'G.SKILL Trident Z5 RGB Pro 128GB DDR5-7200', specs: '128GB kit, 7200 MHz, CL34, RGB ecosystem, Professional workstation grade' },
            { name: 'Corsair Dominator Titanium RGB 64GB DDR5', specs: '64GB kit, 6400 MHz, Titanium heat spreaders, iCUE RGB, Premium design' },
            { name: 'Kingston FURY Renegade Pro 64GB DDR5', specs: '64GB kit, 6800 MHz, CL32, Professional overclocking, Extreme performance' }
        ],
        'Storage': [
            { name: 'Samsung 990 Pro Max 8TB PCIe 5.0', specs: '8TB, PCIe 5.0, 14000 MB/s read, V-NAND 9th gen, Integrated heat sink' },
            { name: 'WD Black SN850X Pro 8TB NVMe', specs: '8TB, PCIe 4.0, 7300 MB/s read, Gaming dashboard Pro, 10-year warranty' },
            { name: 'Crucial T700 Pro 8TB PCIe 5.0', specs: '8TB, PCIe 5.0, 12800 MB/s read, DirectStorage Pro, Professional grade' }
        ],
        'Motherboard': [
            { name: 'ASUS ROG Maximus Z890 Extreme', specs: 'Z890 chipset, DDR5-8400+, WiFi 7, Thunderbolt 5, AI overclocking Pro, ROG ecosystem' },
            { name: 'MSI MEG Z890 GODLIKE Max Pro', specs: 'Z890 chipset, 25Gb LAN, DDR5-8800+, Flagship everything, Creator focused' },
            { name: 'Gigabyte Z890 AORUS Xtreme Master', specs: 'Z890 chipset, Wi-Fi 7, DDR5 Extreme OC, Fins-Array IV, Enthusiast grade' }
        ],
        'PSU': [
            { name: 'Corsair AX1600i Titanium ATX 3.1', specs: '1600W, 80+ Titanium, ATX 3.1/PCIe 6.0, Digital monitoring Pro, 12VHPWR native' },
            { name: 'Seasonic Prime TX-1300 Pro ATX 3.1', specs: '1300W, 80+ Titanium, ATX 3.1 ready, Premium hybrid cables, Professional grade' },
            { name: 'be quiet! Dark Power Pro 14', specs: '1200W, 80+ Titanium, Silent Wings Pro fans, Premium German engineering' }
        ],
        'Case': [
            { name: 'Lian Li O11 Vision Max', specs: 'E-ATX tower, Triple chamber, Vertical GPU, 5mm glass panels, Infinite build possibilities' },
            { name: 'Corsair iCUE 9000X RGB Pro', specs: 'E-ATX tower, Smart glass, RGB fans Pro, AI lighting, iCUE ecosystem' },
            { name: 'Phanteks Enthoo Elite Pro', specs: 'E-ATX tower, Dual system Pro, Premium materials, Advanced cooling Pro, Flagship grade' }
        ]
    };
    
    const categoryProducts = externalMarketIntelligence[category] || [
        { name: `Next-Gen ${category} Pro 2025`, specs: 'Professional grade, Latest technology, Future-ready specifications' }
    ];
    
    const selectedProduct = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
    const performanceGain = calculateAdvancedPerformanceGain(currentItem, selectedProduct, category);
    const futureProofing = 'Excellent (4+ years)';
    const reason = `${selectedProduct.name} represents the cutting-edge of ${category} technology in 2025. With ${performanceGain} performance improvement over ${currentItem.name}, this upgrade provides future-ready specifications and professional-grade capabilities for demanding workloads.`;
    
    return {
        name: selectedProduct.name,
        specifications: selectedProduct.specs,
        price: upgradePrice,
        performanceGain: performanceGain,
        reason: reason,
        futureProofing: futureProofing
    };
}

/**
 * POST /api/kiosk/dual-upgrade - Get 1:2 ratio upgrade recommendations
 * Returns: { stockUpgrade, externalUpgrade } OR { externalUpgrades: [ext1, ext2] }
 * 
 * Request Body:
 * {
 *   component: { id, name, category, price, performance_index, ... },
 *   category: "CPU" | "GPU" | "RAM" | etc.,
 *   includeExternalMarket: boolean (default: true) // TASK 6: Optional flag
 * }
 */
const getDualUpgrade = async (req, res) => {
    try {
        const { component, category, includeExternalMarket = true } = req.body; // TASK 6: Extract flag

        // Validate inputs
        if (!component || !category) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: component and category'
            });
        }

        if (!component.id || !component.name) {
            return res.status(400).json({
                success: false,
                message: 'Component must include id and name'
            });
        }

        logger.info(`🔄 Dual upgrade request: ${category} - ${component.name}`, {
            includeExternalMarket // TASK 6: Log flag
        });

        // TASK 6: Pass options to upgradeService
        const result = await upgradeService.generateDualUpgrades(component, category, {
            includeExternalMarket
        });

        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error generating upgrades',
                error: result.error
            });
        }

        // Format response based on whether component is best in category
        const response = {
            success: true,
            component: {
                id: component.id,
                name: component.name,
                category: category,
                price: component.price,
                performanceIndex: component.performance_index
            },
            upgrades: result.isBest ? {
                type: '2-external',
                stockUpgrade: null,
                externalUpgrades: result.externalUpgrades,
                message: result.message
            } : {
                type: '1-stock-1-external',
                stockUpgrade: result.stockUpgrade,
                externalUpgrade: result.externalUpgrade,
                message: result.message
            },
            isBest: result.isBest,
            timestamp: new Date().toISOString()
        };

        logger.info(`✅ Dual upgrade generated: ${result.isBest ? '2 external' : '1 stock + 1 external'}`);

        res.json(response);

    } catch (error) {
        logger.error('Error in getDualUpgrade:', error);
        res.status(500).json({
            success: false,
            message: 'Server error generating dual upgrades',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/kiosk/prebuilt - Get all Pre-Built PC products for kiosk
 * Returns Pre-Built products with component details, images, and dynamic stock
 * 🔥 FIXED: Query pc_parts table where category='Pre-Built' instead of empty prebuilt_pcs table
 */
const getPreBuiltProducts = async (req, res) => {
    try {
        const { category, minPrice, maxPrice, purposes, buildSource } = req.query;

        // Query pc_parts table where category = 'Pre-Built'
        let whereClause = `WHERE category = 'Pre-Built' AND is_active = true AND kiosk_visible = true`;
        const queryParams = [];
        let paramIndex = 1;

        // Filter by tier (Starter, Mid Tier, High Tier, Elite)
        if (category) {
            whereClause += ` AND tier = $${paramIndex++}`;
            queryParams.push(category);
        }

        // Filter by build source (preset or community) from specifications
        if (buildSource) {
            whereClause += ` AND specifications->>'buildSource' = $${paramIndex++}`;
            queryParams.push(buildSource);
        }

        // Filter by price range
        if (minPrice) {
            whereClause += ` AND price >= $${paramIndex++}`;
            queryParams.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            whereClause += ` AND price <= $${paramIndex++}`;
            queryParams.push(parseFloat(maxPrice));
        }

        // Filter by purposes (Gaming, Work, Multimedia) from specifications
        if (purposes) {
            const purposeList = purposes.split(',').map(p => p.trim());
            whereClause += ` AND (`;
            purposeList.forEach((purpose, idx) => {
                if (idx > 0) whereClause += ' OR ';
                whereClause += `specifications->>'purposes' ILIKE $${paramIndex++}`;
                queryParams.push(`%${purpose}%`);
            });
            whereClause += `)`;
        }

        const result = await query(`
            SELECT 
                id,
                name,
                category,
                tier,
                price,
                brand,
                stock,
                description,
                COALESCE(image_url, image_path) AS image_url,
                specifications,
                kiosk_featured,
                created_at,
                updated_at
            FROM pc_parts
            ${whereClause}
            ORDER BY 
                CASE tier
                    WHEN 'Starter' THEN 1
                    WHEN 'Mid Tier' THEN 2
                    WHEN 'High Tier' THEN 3
                    WHEN 'Elite' THEN 4
                    ELSE 5
                END,
                price ASC
        `, queryParams);

        // Enrich each prebuilt with components from specifications.components
        const enrichedProducts = result.rows.map(row => {
            const specs = row.specifications || {};
            let components = [];
            
            // Get components from specifications.components
            if (specs.components && Array.isArray(specs.components)) {
                components = specs.components.map(comp => ({
                    name: comp.name || 'Unknown',
                    value: comp.value || '',
                    part_id: comp.part_id || null,
                    part_name: comp.part_name || comp.value || '',
                    part_category: comp.part_category || comp.name,
                    part_brand: comp.part_brand || comp.brand || '',
                    part_stock: comp.part_stock || null,
                    part_price: comp.part_price || comp.price || 0,
                    price: comp.price || comp.part_price || 0,
                    brand: comp.brand || comp.part_brand || '',
                    quantity: comp.quantity || 1,
                    is_optional: comp.is_optional || false,
                    in_stock: comp.in_stock || (comp.part_stock ? comp.part_stock > 0 : null)
                }));
            }

            logger.info(`📦 Loaded ${components.length} components for Pre-Built "${row.name}" (ID: ${row.id}, Tier: ${row.tier})`);

            return {
                id: row.id,
                name: row.name,
                price: parseFloat(row.price),
                category: row.tier || 'Unknown',
                tier: row.tier || 'Unknown',
                purposes: specs.purposes || [],
                image: row.image_url,
                stock: row.stock || 10,
                components: components,
                description: row.description || '',
                buildSource: specs.buildSource || 'preset',
                isFeatured: row.kiosk_featured || false,
                buildTimeHours: specs.buildTimeHours || 24,
                warrantyMonths: specs.warrantyMonths || 12,
                displayOrder: specs.displayOrder || 999,
                specifications: {
                    buildType: row.tier,
                    purposes: specs.purposes || [],
                    buildSource: specs.buildSource || 'preset',
                    components: components
                }
            };
        });

        logger.info(`✅ Fetched ${enrichedProducts.length} Pre-Built products from pc_parts table (tier: ${category || 'all'}, purposes: ${purposes || 'all'}, buildSource: ${buildSource || 'preset'})`);

        res.json({
            success: true,
            data: enrichedProducts,
            count: enrichedProducts.length,
            filters: {
                category: category || null,
                tier: category || null,
                purposes: purposes || null,
                buildSource: buildSource || null,
                minPrice: minPrice || null,
                maxPrice: maxPrice || null
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching Pre-Built products:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching Pre-Built products',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/kiosk/upgrade-categories - Get upgrade categories for PC Upgrade service
 * Returns available upgrade categories with database category mapping
 */
const getUpgradeCategories = async (req, res) => {
    try {
        logger.info('🔧 Fetching upgrade categories for PC Upgrade service...');

        // Define upgrade categories with proper database mapping
        const categories = [
            { 
                id: 'ram', 
                name: 'RAM (MEMORY)', 
                category: 'RAM',
                icon: '/assets/upgrade/ram.webp',
                order: 1
            },
            { 
                id: 'storage', 
                name: 'STORAGE', 
                category: 'Storage',
                icon: '/assets/upgrade/storage.webp',
                order: 2
            },
            { 
                id: 'gpu', 
                name: 'GPU', 
                category: 'GPU',
                icon: '/assets/upgrade/gpu.webp',
                order: 3
            },
            { 
                id: 'processor', 
                name: 'PROCESSOR', 
                category: 'CPU',
                icon: '/assets/upgrade/cpu.webp',
                order: 4
            },
            { 
                id: 'motherboard', 
                name: 'MOTHERBOARD', 
                category: 'Motherboard',
                icon: '/assets/upgrade/motherboard.webp',
                order: 5
            },
            { 
                id: 'psu', 
                name: 'PSU', 
                category: 'PSU',
                icon: '/assets/upgrade/psu.webp',
                order: 6
            },
            { 
                id: 'cpu-cooler', 
                name: 'CPU COOLER', 
                category: 'Cooling',
                icon: '/assets/upgrade/cooler.webp',
                order: 7
            },
            { 
                id: 'chassis', 
                name: 'CHASSIS', 
                category: 'Case',
                icon: '/assets/upgrade/case.webp',
                order: 8
            }
        ];

        // Verify each category has products in database and get counts
        const categoriesWithCounts = await Promise.all(
            categories.map(async (cat) => {
                const result = await query(
                    `SELECT COUNT(*) 
                     FROM pc_parts
                     WHERE category = $1 AND is_active = true AND stock > 0`,
                    [cat.category]
                );
                return {
                    ...cat,
                    productCount: parseInt(result.rows[0].count)
                };
            })
        );

        logger.info(`✅ Found ${categoriesWithCounts.length} upgrade categories`);

        res.json({
            success: true,
            message: `Found ${categoriesWithCounts.length} upgrade categories`,
            data: categoriesWithCounts,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ Error fetching upgrade categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upgrade categories',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * POST /api/kiosk/filter - Filter compatible products based on current cart
 * Implements PCPartPicker-style real-time compatibility filtering
 */
const filterCompatibleProducts = async (req, res) => {
    try {
        const { currentCategory, currentProduct, cart = [] } = req.body;

        if (!currentCategory) {
            return res.status(400).json({
                success: false,
                message: 'currentCategory is required'
            });
        }

        logger.info(`🔍 Filtering ${currentCategory} products for compatibility with ${cart.length} cart items`);

        // Get all products in the requested category
        const productsQuery = await query(`
            SELECT 
                id, name, brand, price, stock, category, image_url
            FROM pc_parts 
            WHERE category = $1 AND stock > 0
            ORDER BY name ASC
        `, [currentCategory]);

        const allProducts = productsQuery.rows;

        if (allProducts.length === 0) {
            return res.json({
                success: true,
                data: {
                    products: [],
                    total: 0,
                    total_available: 0,
                    filtered_count: 0
                },
                message: `No products found in category: ${currentCategory}`
            });
        }

        // If cart is empty, return all products
        if (cart.length === 0) {
            return res.json({
                success: true,
                data: {
                    products: allProducts,
                    total: allProducts.length,
                    total_available: allProducts.length,
                    filtered_count: 0
                },
                message: 'No filtering applied - cart is empty'
            });
        }

        // Filter products based on compatibility with cart
        const compatibleProducts = [];
        const incompatibleProducts = [];
        const categoryLower = currentCategory.toLowerCase();

        for (const product of allProducts) {
            try {
                // Quick compatibility check using rule-based system
                const isCompatible = await quickCompatibilityCheck(cart, categoryLower, product);
                
                if (isCompatible) {
                    compatibleProducts.push({
                        ...product,
                        compatibility_status: 'compatible',
                        compatibility_badge: '✅'
                    });
                } else {
                    incompatibleProducts.push({
                        ...product,
                        compatibility_status: 'incompatible',
                        compatibility_badge: '❌'
                    });
                }
            } catch (error) {
                logger.warn(`Error checking compatibility for ${product.name}:`, error.message);
                // If check fails, include product as potentially compatible
                compatibleProducts.push({
                    ...product,
                    compatibility_status: 'unknown',
                    compatibility_badge: '⚠️'
                });
            }
        }

        logger.info(`✅ Filtered ${currentCategory}: ${compatibleProducts.length} compatible, ${incompatibleProducts.length} incompatible`);

        res.json({
            success: true,
            data: {
                products: compatibleProducts, // Only return compatible products by default
                total: compatibleProducts.length,
                total_available: allProducts.length,
                filtered_count: incompatibleProducts.length,
                incompatible_products: incompatibleProducts.length // Count for UI toggle
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ Filter compatible products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to filter compatible products',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Quick rule-based compatibility check for filtering
 * Uses deterministic rules for fast filtering without AI
 * NOTE: Currently simplified - returns all products as compatible
 * TODO: Integrate with category-specific tables for detailed specs
 */
async function quickCompatibilityCheck(cart, category, product) {
    // For now, return all products as compatible since we're using simplified pc_parts table
    // This will be enhanced once we integrate with category-specific tables (cpu, motherboard, gpu, etc.)
    
    // Basic name-based compatibility hints (very simple heuristics)
    const productName = (product.name || '').toLowerCase();
    
    // Extract components from cart
    const cpu = cart.find(item => (item.category || '').toLowerCase() === 'cpu');
    const motherboard = cart.find(item => (item.category || '').toLowerCase() === 'motherboard');
    
    // Very basic socket compatibility checking from product names
    if (category === 'motherboard' && cpu) {
        const cpuName = (cpu.name || '').toLowerCase();
        
        // Intel socket hints
        if (cpuName.includes('i3') || cpuName.includes('i5') || cpuName.includes('i7') || cpuName.includes('i9')) {
            // If CPU is 12th/13th gen (detected by model number), need LGA1700
            if (cpuName.includes('12') || cpuName.includes('13')) {
                if (!productName.includes('lga1700') && !productName.includes('z690') && !productName.includes('b660') && !productName.includes('h610')) {
                    return false; // Likely socket mismatch
                }
            }
        }
        
        // AMD socket hints
        if (cpuName.includes('ryzen')) {
            if (cpuName.includes('7000')) { // Ryzen 7000 series uses AM5
                if (!productName.includes('am5') && !productName.includes('x670') && !productName.includes('b650')) {
                    return false; // Likely socket mismatch
                }
            } else if (cpuName.includes('5000') || cpuName.includes('3000')) { // Ryzen 5000/3000 use AM4
                if (!productName.includes('am4') && !productName.includes('x570') && !productName.includes('b550') && !productName.includes('b450')) {
                    return false; // Likely socket mismatch
                }
            }
        }
    }
    
    if (category === 'cpu' && motherboard) {
        const moboName = (motherboard.name || '').toLowerCase();
        
        // Intel compatibility
        if (productName.includes('i3') || productName.includes('i5') || productName.includes('i7') || productName.includes('i9')) {
            if (productName.includes('12') || productName.includes('13')) { // 12th/13th gen Intel
                if (!moboName.includes('lga1700') && !moboName.includes('z690') && !moboName.includes('b660') && !moboName.includes('h610')) {
                    return false;
                }
            }
        }
        
        // AMD compatibility
        if (productName.includes('ryzen')) {
            if (productName.includes('7000')) { // Ryzen 7000
                if (!moboName.includes('am5') && !moboName.includes('x670') && !moboName.includes('b650')) {
                    return false;
                }
            } else if (productName.includes('5000') || productName.includes('3000')) { // Ryzen 5000/3000
                if (!moboName.includes('am4') && !moboName.includes('x570') && !moboName.includes('b550') && !moboName.includes('b450')) {
                    return false;
                }
            }
        }
    }
    
    // If basic checks pass, product is likely compatible
    return true;
}

/**
 * Save Community Build
 * Saves a custom build to the Community Builds category
 * @route POST /api/kiosk/save-community-build
 * @access Public (Kiosk)
 */
/**
 * Internal helper function to save community build (doesn't send HTTP responses)
 * Used by auto-save logic in createOrder()
 */
const saveCommunityBuildInternal = async (buildData) => {
    let { buildName, components, totalPrice, tier, purposes, baseProductId, customizations } = buildData;

    logger.info(`🔥 saveCommunityBuildInternal CALLED with tier="${tier}", buildData=`, JSON.stringify(buildData, null, 2));

    // Validation
    if (!buildName || !components || !Array.isArray(components) || components.length === 0) {
        throw new Error('Build name and components are required');
    }

    if (!totalPrice || totalPrice <= 0) {
        throw new Error('Valid total price is required');
    }

    if (!tier) {
        throw new Error('Tier is required (Entry, Mid Tier, High Tier, Elite)');
    }

    // Validate tier against database constraint
    const validTiers = ['Entry', 'Mid Tier', 'High Tier', 'Elite', 'Starter'];
    if (!validTiers.includes(tier)) {
        logger.warn(`⚠️ Invalid tier "${tier}" provided, defaulting to "Mid Tier"`);
        tier = 'Mid Tier'; // Set to default if invalid
    }

    // Get brand from base product or default to 'K-Wise Custom'
    let brand = 'K-Wise Custom';
    if (baseProductId) {
        const baseProductResult = await query(
            'SELECT brand FROM pc_parts WHERE id = $1',
            [baseProductId]
        );
        if (baseProductResult.rows.length > 0) {
            brand = baseProductResult.rows[0].brand || 'K-Wise Custom';
        }
    }

    // Build component list for specifications
    const componentList = components.map(comp => ({
        name: comp.name || comp.category,
        value: comp.value || comp.part_name || comp.name,
        part_id: comp.part_id || comp.id,
        price: parseFloat(comp.price || comp.part_price || 0),
        category: comp.category || comp.name,
        isCustomized: comp.isCustomized || false
    }));

    // Build specifications object
    const specifications = {
        buildType: tier,
        buildSource: 'community',
        approvalStatus: 'pending',
        components: componentList,
        purposes: Array.isArray(purposes) ? purposes : (purposes ? [purposes] : ['Gaming']),
        customizations: customizations || {},
        baseProductId: baseProductId || null,
        submittedAt: new Date().toISOString()
    };

    // Generate unique name with tier
    const nameResult = await query(`
        SELECT COUNT(*) as count 
        FROM pc_parts 
        WHERE category = 'Pre-Built' 
          AND specifications->>'buildSource' = 'community'
          AND specifications->>'buildType' = $1
    `, [tier]);

    const count = parseInt(nameResult.rows[0].count || 0);
    const letter = String.fromCharCode(65 + (count % 26)); // A, B, C, ...
    const communityBuildName = `COMMUNITY ${tier.toUpperCase()} BUILD ${letter}`;

    // Default image for community builds
    const defaultImage = '/uploads/default-community-build.jpg';

    // Insert into pc_parts table as Pre-Built with buildSource='community'
    const result = await query(`
        INSERT INTO pc_parts (
            name, 
            brand, 
            category, 
            price, 
            stock, 
            tier,
            description, 
            image_url, 
            specifications,
            is_active,
            kiosk_visible,
            created_at,
            updated_at
        )
        VALUES ($1, $2, 'Pre-Built', $3, 10, $4, $5, $6, $7, false, false, NOW(), NOW())
        RETURNING id, name, brand, price, tier, specifications
    `, [
        communityBuildName,
        brand,
        totalPrice,
        tier, // ✅ NOW SETTING THE TIER COLUMN!
        `Community-submitted ${tier} build based on customer customization. Pending admin approval.`,
        defaultImage,
        JSON.stringify(specifications)
    ]);

    const savedBuild = result.rows[0];
    logger.info(`✅ Community build saved for approval: ${communityBuildName} (ID: ${savedBuild.id})`);

    return savedBuild;
};

/**
 * POST /api/kiosk/save-community-build - Save a new community build (HTTP endpoint)
 * Public endpoint for submitting community builds
 */
const saveCommunityBuild = async (req, res) => {
    try {
        const savedBuild = await saveCommunityBuildInternal(req.body);

        res.status(201).json({
            success: true,
            message: 'Community build saved successfully and pending admin approval',
            data: savedBuild
        });

    } catch (error) {
        logger.error('Save community build error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save community build',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getCategories,
    getCategoryProducts,
    getFeaturedProducts,
    getBuildComponents,
    searchProducts,
    getOnSaleProducts,
    createOrder,
    getAIHotPicks,
    getFutureUpgradeStock,
    getOllamaExternalUpgrade,
    getDualUpgrade,
    getPreBuiltProducts,
    getUpgradeCategories,
    filterCompatibleProducts,
    saveCommunityBuild  // ✅ ADDED: Fixed undefined handler
};
