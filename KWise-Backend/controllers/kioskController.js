const { query } = require('../config/db');
const { inspect } = require('node:util');
const logger = require('../utils/logger');
const { sanitizeForLog } = require('../utils/securitySanitizer');
const orderLockService = require('../services/orderLockService');
const { compatibilityService } = require('../services/compatibilityService');
const { getImageVariants } = require('../services/imageVariantService');
const valueAnalyzer = {
    generateValueForMoney: async (products, _context, limit = 8) => ({
        valueForMoney: products.slice(0, limit),
        analysis: { source: 'deterministic', code: 'AI_REMOVED' }
    }),
    generateHotPicks: async (products, _context, limit = 8) => ({
        hotPicks: products.slice(0, limit),
        analysis: { source: 'deterministic', code: 'AI_REMOVED' }
    })
};
const aiConfig = { service: { enabled: false } };
const upgradeService = require('../services/upgradeService');

const CUSTOMIZED_SERVICE_TYPES = new Set([
    'pc-customized',
    'pc-customized-ai',
    'prebuilt-pc',
    'preset-pc',
    'community-pc'
]);

const compareText = (left, right) => String(left ?? '').localeCompare(String(right ?? ''));

const parseIntegerValue = (value, fallback = 0) => {
    const parsedValue = Number.parseInt(String(value), 10);
    return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

const parseDecimalValue = (value, fallback = 0) => {
    const parsedValue = Number.parseFloat(String(value));
    return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

const BUILD_COMPONENTS_CACHE_TTL_MS = Math.max(
    parseIntegerValue(process.env.KIOSK_BUILD_COMPONENTS_CACHE_TTL_MS, 30000),
    1000
);
let buildComponentsResponseCache = null;

const parseCurrencyAmount = (value, fallback = 0) => {
    return parseDecimalValue((value ?? 0).toString().replaceAll(/[^\d.]/g, ''), fallback);
};

const parseOptionalDecimalValue = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    return parseDecimalValue(value, null);
};

const normalizePositiveInteger = (value, fallback) => Math.max(parseIntegerValue(value, fallback), 1);

const toLowerCaseText = (value) => {
    if (typeof value === 'string') {
        return value.toLowerCase();
    }

    if (value && typeof value === 'object') {
        return inspect(value, { depth: 5, breakLength: Infinity }).toLowerCase();
    }

    return String(value ?? '').toLowerCase();
};

const CATEGORY_ALIASES = {
    cpu: 'CPU',
    processor: 'CPU',
    gpu: 'GPU',
    graphics: 'GPU',
    'graphics card': 'GPU',
    motherboard: 'Motherboard',
    mobo: 'Motherboard',
    ram: 'RAM',
    memory: 'RAM',
    storage: 'Storage',
    ssd: 'Storage',
    hdd: 'Storage',
    nvme: 'Storage',
    psu: 'PSU',
    'power supply': 'PSU',
    'power supply unit': 'PSU',
    case: 'Case',
    chassis: 'Case',
    cooling: 'Cooling',
    cooler: 'Cooling',
    'cpu cooler': 'Cooling',
    monitor: 'Monitor',
    keyboard: 'Keyboard',
    mouse: 'Mouse',
    headphones: 'Headphones',
    headset: 'Headphones',
    speakers: 'Speakers',
    webcam: 'Webcam'
};

const CATEGORY_KEYS = {
    CPU: 'cpu',
    GPU: 'gpu',
    Motherboard: 'motherboard',
    RAM: 'ram',
    Storage: 'storage',
    PSU: 'psu',
    Case: 'case',
    Cooling: 'cooling',
    Monitor: 'monitor',
    Keyboard: 'keyboard',
    Mouse: 'mouse',
    Headphones: 'headphones',
    Speakers: 'speakers',
    Webcam: 'webcam'
};

const canonicalCategory = (category) => {
    const raw = String(category || '').trim();
    if (!raw) return '';

    const normalized = raw
        .toLowerCase()
        .replaceAll('_', ' ')
        .replaceAll('-', ' ')
        .replaceAll(/\s+/g, ' ')
        .trim();

    return CATEGORY_ALIASES[normalized] || CATEGORY_ALIASES[raw.toLowerCase()] || raw;
};

const categoryKey = (category) => (
    CATEGORY_KEYS[canonicalCategory(category)]
    || String(category || '').trim().toLowerCase().replaceAll(/\s+/g, '-')
);

const includesAny = (value, fragments = []) => fragments.some((fragment) => value.includes(fragment));

const getSafeRatio = (numerator, denominator, fallback = 1) => (
    denominator > 0 ? numerator / denominator : fallback
);

const normalizePurposesList = (purposes) => {
    if (Array.isArray(purposes)) {
        return purposes;
    }

    if (purposes) {
        return [purposes];
    }

    return ['Gaming'];
};

const matchesSpecificationRule = (currentSpecs, upgradeSpecs, rule) => {
    const upgradeMatches = (rule.upgrade || []).every((fragment) => upgradeSpecs.includes(fragment));
    const currentMatches = (rule.current || []).every((fragment) => currentSpecs.includes(fragment));
    const currentMissingMatches = (rule.currentMissing || []).every((fragment) => !currentSpecs.includes(fragment));

    return upgradeMatches && currentMatches && currentMissingMatches;
};

const SPEC_ANALYSIS_RULES = {
    Cooling: {
        fallback: 'advanced cooling technology',
        rules: [
            { upgrade: ['360'], currentMissing: ['360'], result: 'larger 360mm radiator' },
            { upgrade: ['rgb'], currentMissing: ['rgb'], result: 'advanced RGB lighting' },
            { upgrade: ['aio'], currentMissing: ['aio'], result: 'liquid cooling technology' }
        ]
    },
    GPU: {
        fallback: 'next-generation graphics architecture',
        rules: [
            { upgrade: ['rtx'], current: ['gtx'], result: 'RTX ray tracing capabilities' },
            { upgrade: ['16gb'], current: ['8gb'], result: '16GB VRAM vs 8GB' },
            { upgrade: ['4080'], current: ['4060'], result: 'flagship GPU architecture' }
        ]
    },
    CPU: {
        fallback: 'higher core count and frequencies',
        rules: [
            { upgrade: ['i9'], current: ['i7'], result: 'i9 flagship performance' },
            { upgrade: ['x3d'], currentMissing: ['x3d'], result: '3D V-Cache technology' },
            { upgrade: ['14th'], current: ['13th'], result: '14th generation architecture' }
        ]
    },
    RAM: {
        fallback: 'higher capacity and faster speeds',
        rules: [
            { upgrade: ['ddr5'], current: ['ddr4'], result: 'DDR5 next-gen memory' },
            { upgrade: ['32gb'], current: ['16gb'], result: '32GB capacity vs 16GB' },
            { upgrade: ['6000'], currentMissing: ['6000'], result: '6000MHz high-speed' }
        ]
    },
    Storage: {
        fallback: 'faster NVMe technology',
        rules: [
            { upgrade: ['pcie 5'], currentMissing: ['pcie 5'], result: 'PCIe 5.0 interface' },
            { upgrade: ['2tb'], current: ['1tb'], result: '2TB capacity vs 1TB' },
            { upgrade: ['990'], current: ['980'], result: 'latest generation NVMe' }
        ]
    }
};

const PLATFORM_HINTS = {
    intelLga1700: ['lga1700', 'z690', 'b660', 'h610', 'z790', 'b760', 'h770'],
    intelLga1851: ['lga1851', 'z890', 'b860'],
    amdAm5: ['am5', 'x670', 'b650', 'x870', 'b850', 'a620'],
    amdAm4: ['am4', 'x570', 'b550', 'b450', 'a520']
};

const findCartItemByCategory = (cart, category) => (
    cart.find((item) => toLowerCaseText(item.category) === category)
);

const getCpuPlatformHints = (cpuName) => {
    const normalizedCpuName = toLowerCaseText(cpuName);

    if (includesAny(normalizedCpuName, ['i3', 'i5', 'i7', 'i9'])) {
        if (includesAny(normalizedCpuName, ['15', 'ultra 7', 'ultra 9', 'arrow lake'])) {
            return PLATFORM_HINTS.intelLga1851;
        }

        if (includesAny(normalizedCpuName, ['12', '13', '14'])) {
            return PLATFORM_HINTS.intelLga1700;
        }
    }

    if (normalizedCpuName.includes('ryzen')) {
        if (includesAny(normalizedCpuName, ['7000', '8000', '9000'])) {
            return PLATFORM_HINTS.amdAm5;
        }

        if (includesAny(normalizedCpuName, ['3000', '5000'])) {
            return PLATFORM_HINTS.amdAm4;
        }
    }

    return null;
};

const matchesPlatformHints = (productName, platformHints) => (
    !platformHints || includesAny(productName, platformHints)
);

const mapKioskProductRow = (row, options = {}) => {
    const canonical = canonicalCategory(row.category);
    const imagePath = row.image_url || row.image_path || row.file_path || '';
    const imageVariants = getImageVariants(imagePath);
    const product = {
        id: row.id,
        name: row.name,
        category: canonical || row.category,
        categoryKey: row.category_key || categoryKey(canonical || row.category),
        brand: row.brand,
        price: parseDecimalValue(row.price),
        stock: parseIntegerValue(row.stock),
        image: imagePath,
        imagePath,
        imageUrl: imagePath,
        image_url: imagePath,
        image_path: imagePath,
        file_path: row.file_path || imagePath,
        imageVariants,
        image_variants: imageVariants,
        specifications: row.specifications || {},
        dimensions: row.dimensions || {},
        description: row.description || '',
        available: row.available ?? parseIntegerValue(row.stock) > 0
    };

    if (options.includeSalePricing) {
        product.salePrice = row.sale_price == null
            ? null
            : parseDecimalValue(row.sale_price);
        product.effectivePrice = getEffectivePrice(row);
    }

    if (options.includeOnSale) {
        product.onSale = Boolean(row.on_sale);
    }

    if (options.includeTimestamps) {
        product.createdAt = row.created_at;
        product.updatedAt = row.updated_at;
    }

    [
        'compatible',
        'source',
        'engine',
        'aiEnabled',
        'status',
        'score',
        'compatibility_score',
        'compatibility_status',
        'compatibility_reason',
        'compatibility_issues',
        'compatibility_notes',
        'deterministic_issues',
        'warnings',
        'manualChecks',
        'missingSpecs',
        'rulesApplied',
        'verdict',
        'latencyMs',
        'cache',
        'detailed_analysis'
    ].forEach((field) => {
        if (row[field] !== undefined) product[field] = row[field];
    });

    return product;
};

const compactKioskCardProduct = (product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    categoryKey: product.categoryKey,
    brand: product.brand,
    price: product.price,
    salePrice: product.salePrice,
    sale_price: product.salePrice,
    effectivePrice: product.effectivePrice,
    onSale: product.onSale,
    stock: product.stock,
    image: product.image,
    imagePath: product.imagePath,
    imageUrl: product.imageUrl,
    image_url: product.image_url,
    imageVariants: product.imageVariants,
    image_variants: product.imageVariants,
    available: product.available,
    description: product.description || ''
});

const compactKioskCardProducts = (products) => products.map(compactKioskCardProduct);

const getOrderItemsFromPayload = ({ items = [], selectedParts = [] } = {}) => {
    return items.length > 0 ? items : selectedParts;
};

const getCommunityBuildTier = (totalAmount) => {
    if (totalAmount >= 80000) {
        return 'Elite';
    }

    if (totalAmount >= 50000) {
        return 'High Tier';
    }

    if (totalAmount >= 25000) {
        return 'Mid Tier';
    }

    return 'Entry';
};

const buildCustomizedCommunityBuildData = (serviceType, orderItems, totalAmount, orderId) => {
    const components = orderItems.map((item) => ({
        name: item.category || 'Component',
        value: item.name || item.component || 'Unknown',
        part_id: item.id || item.part_id,
        price: parseDecimalValue(item.price || 0),
        category: item.category || 'Other',
        brand: item.brand || '',
        specifications: item.specifications || {}
    }));

    const tier = getCommunityBuildTier(totalAmount);

    logger.info(`🔥 TIER CALCULATION: totalAmount=${totalAmount}, tier="${tier}"`);

    return {
        buildName: `Customer ${serviceType === 'pc-customized-ai' ? 'AI' : 'Custom'} Build ${orderId}`,
        components,
        totalPrice: totalAmount,
        tier,
        purposes: ['Gaming'],
        baseProductId: null,
        customizations: {
            orderType: serviceType,
            orderId,
            createdFrom: serviceType === 'pc-customized-ai' ? 'AI Suggestion' : 'Manual Selection'
        }
    };
};

const buildPresetCommunityBuildData = (orderItems, totalAmount, orderId) => {
    const hasCustomizations = orderItems.some((item) => item.isCustomized || Object.keys(item.customizations || {}).length > 0);

    if (!hasCustomizations) {
        logger.info('ℹ️ Pre-Built order without customizations - skipping Community Build save');
        return null;
    }

    const firstItem = orderItems[0] || {};
    const components = orderItems
        .filter((item) => item.category === 'prebuilt-component')
        .map((item) => ({
            name: item.componentType || item.category || 'Component',
            value: item.componentValue || item.name || 'Unknown',
            part_id: item.id || null,
            price: parseDecimalValue(item.price || 0),
            category: item.componentType || item.category || 'Other'
        }));

    logger.info(`📦 Components extracted: ${components.length}`);

    return {
        buildName: `Customer Customized Preset ${orderId}`,
        components,
        totalPrice: totalAmount,
        tier: firstItem.tier || firstItem.buildType || 'Mid Tier',
        purposes: firstItem.purposes || ['Gaming'],
        baseProductId: firstItem.baseProductId || firstItem.product_id,
        customizations: firstItem.customizations || {}
    };
};

const buildCommunityBuildPayload = (serviceType, orderItems, totalAmount, orderId) => {
    if (serviceType === 'pc-customized' || serviceType === 'pc-customized-ai') {
        logger.info('✅ PC Customized order detected - will save to Community Builds');
        return buildCustomizedCommunityBuildData(serviceType, orderItems, totalAmount, orderId);
    }

    if (serviceType === 'prebuilt-pc' || serviceType === 'preset-pc') {
        logger.info('✅ Customized Pre-Built order detected - evaluating Community Build save');
        return buildPresetCommunityBuildData(orderItems, totalAmount, orderId);
    }

    return null;
};

const validateCreateOrderRequest = (serviceType, totalAmount, orderItems) => {
    if (!serviceType) {
        return 'Service type is required';
    }

    if (totalAmount === undefined || totalAmount === null) {
        return 'Total amount is required (can be 0 for diagnostic services)';
    }

    if (Number.isNaN(parseDecimalValue(totalAmount, Number.NaN))) {
        return 'Total amount must be a valid number';
    }

    if (!Array.isArray(orderItems)) {
        return 'Order items must be an array';
    }

    return null;
};

const buildQueueOrderData = ({
    customerName,
    email,
    orderItems,
    totalAmount,
    paymentMethod,
    serviceType,
    transactionOrigin,
    phoneNumber,
    notes,
    idempotencyKey
}) => ({
    customerName: customerName || null,
    customerEmail: email,
    items: orderItems,
    totalAmount,
    paymentMethod,
    serviceType,
    transactionOrigin: transactionOrigin || serviceType,
    phoneNumber,
    notes,
    idempotencyKey
});

const runAfterResponse = (task) => {
    const runner = async () => {
        try {
            await task();
        } catch (error) {
            logger.error('Deferred kiosk order side effect failed:', error);
        }
    };

    if (typeof setImmediate === 'function') {
        setImmediate(runner);
        return;
    }

    setTimeout(runner, 0);
};

const saveCommunityBuildForOrder = async (serviceType, orderItems, totalAmount, orderId) => {
    logger.info(`🔍 SERVICE TYPE CHECK: "${serviceType}" | Is in customizedServiceTypes: ${CUSTOMIZED_SERVICE_TYPES.has(serviceType)}`);

    if (!CUSTOMIZED_SERVICE_TYPES.has(serviceType)) {
        return null;
    }

    logger.info(`🔍 Checking if order ${orderId} should be saved to Community Builds...`);
    logger.info(`📊 Service Type: "${serviceType}"`);
    logger.info(`📦 Order Items Count: ${orderItems.length}`);
    logger.info(`💰 Total Amount: ${totalAmount}`);

    const buildData = buildCommunityBuildPayload(serviceType, orderItems, totalAmount, orderId);
    if (!buildData) {
        logger.warn('⚠️ Community Build NOT saved. shouldSave=false, hasBuildData=false');
        return null;
    }

    logger.info('Attempting to save community build', {
        buildName: buildData.buildName,
        componentCount: Array.isArray(buildData.components) ? buildData.components.length : 0,
        totalPrice: buildData.totalPrice,
        tier: buildData.tier
    });

    return saveCommunityBuildInternal(buildData);
};

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
                MAX(price) as max_price,
                MIN(COALESCE(kiosk_category_order, 999)) as category_order
            FROM pc_parts
            WHERE is_active = true
              AND (kiosk_visible IS NULL OR kiosk_visible = true)
            GROUP BY category
            ORDER BY category_order, category
        `);

        const categories = result.rows.map((row) => ({
            category: row.category,
            name: formatCategoryDisplayName(row.category),
            productCount: parseIntegerValue(row.product_count),
            inStockCount: parseIntegerValue(row.in_stock_count),
            minPrice: parseDecimalValue(row.min_price),
            maxPrice: parseDecimalValue(row.max_price),
            order: parseIntegerValue(row.category_order, 999)
        }));

        res.json({
            success: true,
            data: categories,
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

        const currentPage = normalizePositiveInteger(page, 1);
        const itemsPerPage = normalizePositiveInteger(limit, 20);
        const offset = (currentPage - 1) * itemsPerPage;
        const validSortBy = ['name', 'price', 'brand', 'created_at', 'updated_at'].includes(String(sortBy)) ? String(sortBy) : 'name';
        const validSortOrder = ['asc', 'desc'].includes(String(sortOrder).toLowerCase()) ? String(sortOrder).toUpperCase() : 'ASC';
        const minPriceValue = parseOptionalDecimalValue(minPrice);
        const maxPriceValue = parseOptionalDecimalValue(maxPrice);

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
        if (minPriceValue !== null) {
            whereParts.push(`price >= $${paramIndex++}`);
            queryParams.push(minPriceValue);
        }
        if (maxPriceValue !== null) {
            whereParts.push(`price <= $${paramIndex++}`);
            queryParams.push(maxPriceValue);
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
        queryParams.push(itemsPerPage, offset);

        const [result, countResult] = await Promise.all([
            query(mainQuery, queryParams),
            query(countQuery, countParams)
        ]);

        const total = parseIntegerValue(countResult.rows[0].total || 0);
        const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

        const products = result.rows.map((row) => mapKioskProductRow(row, {
            includeSalePricing: true,
            includeOnSale: true,
            includeTimestamps: true
        }));

        res.json({
            success: true,
            data: {
                items: products,
                pagination: {
                    currentPage,
                    totalPages,
                    totalItems: total,
                    itemsPerPage,
                    hasNext: currentPage < totalPages,
                    hasPrev: currentPage > 1
                },
                filters: {
                    category,
                    brand,
                    minPrice: minPriceValue,
                    maxPrice: maxPriceValue,
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
 * GET /api/kiosk/catalog/bootstrap?category=CPU
 * Aggregates first-load catalog data to reduce kiosk request storms.
 */
const getCatalogBootstrap = async (req, res) => {
    try {
        const {
            category,
            page = 1,
            limit = 60,
            sort = 'name',
            order = 'ASC',
            includeSpecRanges = 'false'
        } = req.query;

        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'category is required'
            });
        }

        const currentPage = normalizePositiveInteger(page, 1);
        const itemsPerPage = Math.min(normalizePositiveInteger(limit, 60), 500);
        const offset = (currentPage - 1) * itemsPerPage;
        const shouldIncludeSpecRanges = String(includeSpecRanges).toLowerCase() === 'true';
        const sortColumnMap = {
            name: 'pp.name',
            price: 'pp.price',
            brand: 'pp.brand',
            created_at: 'pp.created_at',
            updated_at: 'pp.updated_at'
        };
        const safeSortColumn = sortColumnMap[String(sort)] || 'pp.name';
        const safeOrder = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        const baseWhere = `
            pp.is_active = true
            AND (pp.kiosk_visible IS NULL OR pp.kiosk_visible = true)
            AND pp.category = $1
        `;

        const productsSql = `
            SELECT
                pp.id, pp.name, pp.category, pp.brand, pp.price, pp.sale_price, pp.stock,
                COALESCE(pp.image_url, pp.image_path) AS image_url,
                COALESCE(
                    pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
                    pp.specifications,
                    '{}'::jsonb
                ) AS specifications,
                pp.dimensions, pp.description, pp.on_sale,
                pp.created_at, pp.updated_at,
                CASE WHEN pp.stock > 0 THEN true ELSE false END as available
            FROM pc_parts pp
            LEFT JOIN product_specs ps ON pp.id = ps.product_id
            WHERE ${baseWhere}
            ORDER BY ${safeSortColumn} ${safeOrder}
            LIMIT $2 OFFSET $3
        `;
        const countSql = `SELECT COUNT(*) as total FROM pc_parts pp WHERE ${baseWhere}`;
        const brandsSql = `
            SELECT pp.brand, COUNT(*) as item_count
            FROM pc_parts pp
            WHERE ${baseWhere} AND pp.brand IS NOT NULL
            GROUP BY pp.brand
            ORDER BY pp.brand
        `;
        const priceSql = `
            SELECT MIN(pp.price) AS min_price, MAX(pp.price) AS max_price
            FROM pc_parts pp
            WHERE ${baseWhere}
        `;
        const specFieldsSql = `
            SELECT field_name, field_type, is_required, default_value
            FROM specification_schemas
            WHERE category = $1
            ORDER BY field_name
        `;

        const [productsResult, countResult, brandsResult, priceResult, specFieldsResult] = await Promise.all([
            query(productsSql, [category, itemsPerPage, offset]),
            query(countSql, [category]),
            query(brandsSql, [category]),
            query(priceSql, [category]),
            query(specFieldsSql, [category])
        ]);

        const specRanges = {};

        if (shouldIncludeSpecRanges) {
            const numericFields = specFieldsResult.rows
                .filter((field) => field.field_type === 'number')
                .map((field) => field.field_name);

            await Promise.all(numericFields.map(async (fieldName) => {
                const rangeResult = await query(`
                    SELECT
                        MIN(value::numeric) AS min_value,
                        MAX(value::numeric) AS max_value,
                        COUNT(*) AS total_items
                    FROM (
                        SELECT NULLIF(
                            regexp_replace(
                                COALESCE(pp.specifications->>$2, ps.normalized_specs->'specs'->>$2, ''),
                                '[^0-9.]',
                                '',
                                'g'
                            ),
                            ''
                        ) AS value
                        FROM pc_parts pp
                        LEFT JOIN product_specs ps ON pp.id = ps.product_id
                        WHERE ${baseWhere}
                    ) values_for_field
                    WHERE value ~ '^[0-9]+(\\.[0-9]+)?$'
                `, [category, fieldName]);

                const row = rangeResult.rows[0] || {};
                if (row.min_value !== null && row.max_value !== null) {
                    specRanges[fieldName] = {
                        min: parseDecimalValue(row.min_value),
                        max: parseDecimalValue(row.max_value),
                        totalItems: parseIntegerValue(row.total_items)
                    };
                }
            }));
        }

        const total = parseIntegerValue(countResult.rows[0]?.total || 0);
        const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
        const priceRow = priceResult.rows[0] || {};
        const brands = brandsResult.rows.map((row) => ({
            name: row.brand,
            count: parseIntegerValue(row.item_count)
        }));

        return res.json({
            success: true,
            data: {
                category,
                products: productsResult.rows.map((row) => mapKioskProductRow(row, {
                    includeSalePricing: true,
                    includeOnSale: true,
                    includeTimestamps: true
                })),
                pagination: {
                    currentPage,
                    totalPages,
                    totalItems: total,
                    itemsPerPage,
                    hasNext: currentPage < totalPages,
                    hasPrev: currentPage > 1
                },
                brands,
                totalItems: total,
                priceRange: {
                    min: parseDecimalValue(priceRow.min_price),
                    max: parseDecimalValue(priceRow.max_price)
                },
                specFields: specFieldsResult.rows.map((row) => ({
                    name: row.field_name,
                    field_name: row.field_name,
                    type: row.field_type,
                    field_type: row.field_type,
                    required: row.is_required,
                    defaultValue: row.default_value
                })),
                specRanges,
                cache: {
                    ttlSeconds: Math.round(BUILD_COMPONENTS_CACHE_TTL_MS / 1000),
                    source: 'database',
                    generatedAt: new Date().toISOString()
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching kiosk catalog bootstrap:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch catalog bootstrap',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const productDetailSql = `
    SELECT
        pp.id, pp.name, pp.category, pp.brand, pp.price, pp.sale_price, pp.stock,
        COALESCE(pp.image_url, pp.image_path) AS image_url,
        COALESCE(
            pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
            pp.specifications,
            '{}'::jsonb
        ) AS specifications,
        pp.dimensions, pp.description, pp.on_sale,
        pp.created_at, pp.updated_at,
        CASE WHEN pp.stock > 0 THEN true ELSE false END as available
    FROM pc_parts pp
    LEFT JOIN product_specs ps ON pp.id = ps.product_id
`;

async function fetchKioskProductByRouteId(routeId) {
    const rawId = String(routeId || '').trim();
    const isNumericId = /^\d+$/.test(rawId);
    const legacyToken = !isNumericId ? rawId.match(/^(.+)-(\d+)$/) : null;
    const numericId = isNumericId ? parseIntegerValue(rawId, 0) : 0;

    if (!numericId && !legacyToken) {
        return null;
    }

    if (legacyToken) {
        const category = canonicalCategory(legacyToken[1]);
        const routeIndex = Math.max(parseIntegerValue(legacyToken[2], 0), 0);
        const result = await query(`
            ${productDetailSql}
            WHERE pp.category = $1
              AND pp.is_active = true
              AND (pp.kiosk_visible IS NULL OR pp.kiosk_visible = true)
            ORDER BY pp.name ASC
            LIMIT 1 OFFSET $2
        `, [category, routeIndex]);
        return result.rows[0] || null;
    }

    const result = await query(`
        ${productDetailSql}
        WHERE pp.id = $1
          AND pp.is_active = true
          AND (pp.kiosk_visible IS NULL OR pp.kiosk_visible = true)
        LIMIT 1
    `, [numericId]);
    return result.rows[0] || null;
}

const COMPATIBLE_CATEGORY_MAP = {
    CPU: ['Motherboard', 'Cooling', 'RAM', 'PSU', 'Case'],
    Cooling: ['CPU', 'Motherboard', 'RAM', 'Case'],
    Motherboard: ['CPU', 'Cooling', 'RAM', 'Storage', 'GPU', 'PSU', 'Case'],
    GPU: ['Motherboard', 'PSU', 'Case'],
    RAM: ['Motherboard', 'Cooling'],
    Storage: ['Motherboard', 'Case'],
    PSU: ['CPU', 'GPU', 'Case'],
    Case: ['Motherboard', 'GPU', 'PSU', 'Cooling', 'Storage'],
    Monitor: ['Webcam', 'Speakers'],
    Keyboard: ['Mouse', 'Headphones'],
    Mouse: ['Keyboard', 'Headphones'],
    Headphones: ['Speakers', 'Mouse'],
    Speakers: ['Headphones', 'Monitor'],
    Webcam: ['Monitor', 'Headphones']
};

async function fetchCandidateProductsByCategories(categories, limitPerCategory, excludedId) {
    if (!categories.length) return [];

    const result = await query(`
        WITH candidates AS (
            SELECT
                pp.id, pp.name, pp.category, pp.brand, pp.price, pp.sale_price, pp.stock,
                COALESCE(pp.image_url, pp.image_path) AS image_url,
                COALESCE(
                    pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
                    pp.specifications,
                    '{}'::jsonb
                ) AS specifications,
                pp.dimensions, pp.description, pp.on_sale,
                pp.created_at, pp.updated_at,
                CASE WHEN pp.stock > 0 THEN true ELSE false END as available,
                ROW_NUMBER() OVER (
                    PARTITION BY pp.category
                    ORDER BY CASE WHEN pp.stock > 0 THEN 0 ELSE 1 END, pp.price ASC, pp.name ASC
                ) AS category_rank
            FROM pc_parts pp
            LEFT JOIN product_specs ps ON pp.id = ps.product_id
            WHERE pp.is_active = true
              AND (pp.kiosk_visible IS NULL OR pp.kiosk_visible = true)
              AND pp.category = ANY($1::text[])
              AND pp.id <> $3
        )
        SELECT *
        FROM candidates
        WHERE category_rank <= $2
        ORDER BY category, category_rank
    `, [categories, limitPerCategory, excludedId || 0]);

    return result.rows.map((row) => mapKioskProductRow(row, {
        includeSalePricing: true,
        includeOnSale: true,
        includeTimestamps: true
    }));
}

function summarizeCandidateResults(results = []) {
    return {
        total: results.length,
        compatible: results.filter((product) => product.compatible !== false).length,
        warnings: results.filter((product) => product.verdict === 'warning' || product.status === 'warning').length,
        failed: results.filter((product) => product.compatible === false).length,
        manualCheck: results.filter((product) => product.verdict === 'manual_check' || product.status === 'manual_check').length
    };
}

/**
 * GET /api/kiosk/products/:id - Stable kiosk product detail contract.
 * Supports numeric IDs and legacy route tokens such as "Motherboard-9".
 */
const getProductById = async (req, res) => {
    try {
        const row = await fetchKioskProductByRouteId(req.params.id);
        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        return res.json({
            success: true,
            data: mapKioskProductRow(row, {
                includeSalePricing: true,
                includeOnSale: true,
                includeTimestamps: true
            }),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching kiosk product detail:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch product detail',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/kiosk/products/:id/compatible - Deterministic compatible product groups.
 */
const getProductCompatibleProducts = async (req, res) => {
    const startedAt = Date.now();
    try {
        const row = await fetchKioskProductByRouteId(req.params.id);
        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const product = mapKioskProductRow(row, {
            includeSalePricing: true,
            includeOnSale: true,
            includeTimestamps: true
        });
        const categories = COMPATIBLE_CATEGORY_MAP[product.category] || [];
        const limitPerCategory = Math.min(normalizePositiveInteger(req.query.limitPerCategory, 4), 12);
        const candidates = await fetchCandidateProductsByCategories(categories, limitPerCategory, product.id);
        const results = categories.length > 0
            ? await compatibilityService.analyzeBatch([product], candidates, {
                mode: 'product_compatible',
                targetCategory: product.category,
                referenceProduct: product
            })
            : [];
        const normalizedResults = results.map((candidate) => mapKioskProductRow(candidate, {
            includeSalePricing: true,
            includeOnSale: true,
            includeTimestamps: true
        }));
        const groups = {};

        for (const category of categories) {
            groups[category] = normalizedResults.filter((candidate) => candidate.category === category);
        }

        return res.json({
            success: true,
            source: 'deterministic',
            engine: 'deterministic',
            aiEnabled: false,
            data: {
                product,
                categories,
                groups,
                products: normalizedResults,
                summary: summarizeCandidateResults(normalizedResults),
                latencyMs: Date.now() - startedAt
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching compatible products:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch compatible products',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * POST /api/kiosk/compatibility/candidates - Kiosk candidate annotations.
 */
const checkCompatibilityCandidates = async (req, res) => {
    const startedAt = Date.now();
    try {
        const {
            contextParts = [],
            candidates = [],
            mode = 'candidate_filter',
            targetCategory,
            referenceProduct
        } = req.body || {};

        if (!Array.isArray(candidates) || candidates.length === 0) {
            return res.json({
                success: true,
                source: 'deterministic',
                engine: 'deterministic',
                aiEnabled: false,
                data: [],
                results: [],
                summary: summarizeCandidateResults([]),
                latencyMs: Date.now() - startedAt
            });
        }

        const limitedCandidates = candidates.slice(0, 500);
        const results = await compatibilityService.analyzeBatch(contextParts, limitedCandidates, {
            mode,
            targetCategory,
            referenceProduct,
            strict: false,
            includeManual: true,
            includeFailed: true
        });

        return res.json({
            success: true,
            source: 'deterministic',
            engine: 'deterministic',
            aiEnabled: false,
            mode,
            targetCategory,
            data: results,
            results,
            summary: summarizeCandidateResults(results),
            latencyMs: Date.now() - startedAt
        });
    } catch (error) {
        logger.error('Error checking kiosk candidate compatibility:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check compatibility candidates',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const buildReceiptItem = (row) => {
    const item = row.item_data || row || {};
    const price = parseDecimalValue(item.price ?? item.unit_price ?? 0);
    const quantity = parseIntegerValue(item.quantity ?? 1, 1);
    const amount = parseDecimalValue(item.amount ?? item.subtotal ?? (price * quantity));

    return {
        id: item.id,
        name: item.item_name || item.component_name || item.name || 'Order Item',
        componentName: item.component_name || item.item_name || item.name || 'Order Item',
        quantity,
        price,
        amount,
        description: item.description || '',
        status: item.status || ''
    };
};

const buildReceiptModel = (order, items) => {
    const orderJson = order.order_data || order || {};
    const receiptItems = items.map(buildReceiptItem);
    const totalAmount = parseDecimalValue(
        orderJson.total_amount ?? receiptItems.reduce((sum, item) => sum + item.amount, 0)
    );

    return {
        orderId: orderJson.id,
        orderNumber: orderJson.order_number || '',
        orderIdFormatted: orderJson.order_id_formatted || orderJson.order_number || '',
        transactionIdFormatted: orderJson.transaction_id_formatted || '',
        queueNumber: orderJson.queue_number || '',
        paymentMethod: orderJson.payment_method || '',
        serviceType: orderJson.service_type || '',
        status: orderJson.status || '',
        queueStatus: orderJson.queue_status || '',
        customerName: orderJson.customer_name || '',
        totalAmount,
        items: receiptItems,
        createdAt: orderJson.created_at || null,
        generatedAt: new Date().toISOString()
    };
};

/**
 * GET /api/kiosk/orders/:orderId/receipt - Pure receipt model for in-page fallback
 * and reprint flows. Does not return HTML.
 */
const getOrderReceipt = async (req, res) => {
    try {
        const rawOrderId = String(req.params.orderId || '').trim();
        const numericOrderId = parseIntegerValue(rawOrderId.replaceAll(/[^\d]/g, ''), 0);

        if (!rawOrderId) {
            return res.status(400).json({
                success: false,
                message: 'Order id is required'
            });
        }

        const orderResult = await query(`
            SELECT to_jsonb(o) AS order_data
            FROM orders o
            WHERE ($1::integer > 0 AND o.id = $1::integer)
               OR o.order_number = $2
               OR to_jsonb(o)->>'order_id_formatted' = $2
               OR to_jsonb(o)->>'transaction_id_formatted' = $2
            ORDER BY o.created_at DESC
            LIMIT 1
        `, [numericOrderId, rawOrderId]);

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order receipt not found'
            });
        }

        const orderData = orderResult.rows[0].order_data || {};
        const itemsResult = await query(`
            SELECT to_jsonb(oi) AS item_data
            FROM order_items oi
            WHERE oi.order_id = $1
            ORDER BY oi.id ASC
        `, [orderData.id]);

        return res.json({
            success: true,
            data: buildReceiptModel(orderResult.rows[0], itemsResult.rows),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching kiosk order receipt:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch order receipt',
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
        const itemsPerPage = normalizePositiveInteger(limit, 6);

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
        `, [itemsPerPage]);

        const featuredProducts = compactKioskCardProducts(result.rows.map((row) => mapKioskProductRow(row)));

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
 * GET /api/kiosk/homepage - Aggregate kiosk home recommendations in one read
 * Returns the same product contract used by the existing featured/on-sale endpoints.
 */
const getHomepageProducts = async (req, res) => {
    try {
        const itemsPerSection = normalizePositiveInteger(req.query.limit, 8);
        const maxRows = 500;

        const result = await query(`
            SELECT
                id, name, category, brand, price, sale_price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, dimensions, description,
                kiosk_featured, on_sale, sale_start_date, sale_end_date,
                CASE WHEN stock > 0 THEN true ELSE false END AS available
            FROM pc_parts
            WHERE is_active = true
            AND (kiosk_visible IS NULL OR kiosk_visible = true)
            AND stock > 0
            AND COALESCE(image_url, image_path) IS NOT NULL
            AND COALESCE(image_url, image_path) <> ''
            ORDER BY kiosk_featured DESC NULLS LAST, stock DESC, price ASC
            LIMIT $1
        `, [maxRows]);

        const products = result.rows.map((row) => mapKioskProductRow(row, {
            includeSalePricing: true,
            includeOnSale: true
        }));

        const isProductOnSale = (product) => {
            const price = parseDecimalValue(product.price);
            const salePrice = parseDecimalValue(product.salePrice || product.sale_price || product.effectivePrice);
            return product.onSale === true || (price > 0 && salePrice > 0 && salePrice < price);
        };

        const onSale = products
            .filter(isProductOnSale)
            .sort((left, right) => parseDecimalValue(left.effectivePrice || left.salePrice || left.price) - parseDecimalValue(right.effectivePrice || right.salePrice || right.price))
            .slice(0, itemsPerSection);

        const valueForMoney = [...products]
            .sort((left, right) => parseDecimalValue(left.effectivePrice || left.price) - parseDecimalValue(right.effectivePrice || right.price))
            .slice(0, itemsPerSection);

        const hotPicks = [...products]
            .sort((left, right) => parseIntegerValue(right.stock) - parseIntegerValue(left.stock) || compareText(left.name, right.name))
            .slice(0, itemsPerSection);

        res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
        res.json({
            success: true,
            data: {
                onSale: compactKioskCardProducts(onSale),
                hotPicks: compactKioskCardProducts(hotPicks),
                valueForMoney: compactKioskCardProducts(valueForMoney)
            },
            cache: {
                source: 'backend-memory-or-db',
                ttlSeconds: 30
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching kiosk homepage products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch homepage products',
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
        const requestedLimit = Math.min(normalizePositiveInteger(req.query.limit, 500), 1000);
        const cacheKey = `limit:${requestedLimit}`;

        if (
            buildComponentsResponseCache
            && buildComponentsResponseCache.key === cacheKey
            && Date.now() < buildComponentsResponseCache.expiresAt
        ) {
            res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
            res.setHeader('X-KWise-Cache', 'hit');
            res.type('application/json').send(buildComponentsResponseCache.body);
            return;
        }

        const buildCategories = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling'];

        const sqlQuery = `
            SELECT
                pp.id, pp.name, pp.category, pp.brand, pp.price, pp.sale_price, pp.stock,
                COALESCE(pp.image_url, pp.image_path) AS image_url,
                COALESCE(
                    pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
                    pp.specifications,
                    '{}'::jsonb
                ) AS specifications,
                pp.dimensions, pp.description, pp.on_sale,
                pp.created_at, pp.updated_at,
                CASE WHEN pp.stock > 0 THEN true ELSE false END as available,
                ROW_NUMBER() OVER (PARTITION BY pp.category ORDER BY pp.price ASC, pp.name ASC) AS category_rank
            FROM pc_parts pp
            LEFT JOIN product_specs ps ON pp.id = ps.product_id
            WHERE pp.is_active = true
              AND (pp.kiosk_visible IS NULL OR pp.kiosk_visible = true)
              AND pp.category = ANY($1::text[])
            ORDER BY pp.category, pp.price ASC, pp.name ASC
        `;

        const result = await query(sqlQuery, [buildCategories]);

        // Group products by category
        const componentsByCategory = {};
        const brandsByCategory = {};
        buildCategories.forEach((category) => {
            const key = categoryKey(category);
            componentsByCategory[key] = [];
            brandsByCategory[key] = new Set();
        });

        result.rows.forEach((row) => {
            const category = categoryKey(row.category);

            if (!componentsByCategory[category]) {
                componentsByCategory[category] = [];
                brandsByCategory[category] = new Set();
            }

            if (componentsByCategory[category].length >= requestedLimit) return;

            const product = mapKioskProductRow(row, {
                includeSalePricing: true,
                includeOnSale: true,
                includeTimestamps: true
            });

            componentsByCategory[category].push(product);
            if (row.brand) {
                brandsByCategory[category].add(row.brand);
            }
        });

        // Convert to final structure
        const buildComponents = {};
        Object.keys(componentsByCategory).forEach(category => {
            buildComponents[category] = {
                products: componentsByCategory[category],
                brands: Array.from(brandsByCategory[category]).sort(compareText),
                count: componentsByCategory[category].length
            };
        });

        const responseData = {
            success: true,
            data: buildComponents,
            timestamp: new Date().toISOString()
        };

        const responseBody = JSON.stringify(responseData);
        buildComponentsResponseCache = {
            key: cacheKey,
            expiresAt: Date.now() + BUILD_COMPONENTS_CACHE_TTL_MS,
            body: responseBody
        };

        res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
        res.setHeader('X-KWise-Cache', 'miss');
        res.type('application/json').send(responseBody);

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
        const itemsPerPage = normalizePositiveInteger(limit, 20);

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

        queryParams.push(itemsPerPage);

        const result = await query(searchQuery, queryParams);

        const products = result.rows.map((row) => mapKioskProductRow(row));

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
            return parseDecimalValue(product.sale_price);
        }
    }
    return parseDecimalValue(product.price);
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

        const currentPage = normalizePositiveInteger(page, 1);
        const itemsPerPage = normalizePositiveInteger(limit, 20);
        const offset = (currentPage - 1) * itemsPerPage;
        const validSortBy = ['name', 'price', 'sale_price', 'brand', 'category'].includes(String(sortBy)) ? String(sortBy) : 'name';
        const validSortOrder = ['asc', 'desc'].includes(String(sortOrder).toLowerCase()) ? String(sortOrder).toUpperCase() : 'ASC';

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
            AND (
                (sale_start_date IS NULL OR sale_start_date <= NOW())
                AND (sale_end_date IS NULL OR sale_end_date >= NOW())
                OR (sale_price IS NOT NULL AND sale_price > 0 AND sale_price < price)
            )
            ORDER BY ${validSortBy} ${validSortOrder}
            LIMIT $1 OFFSET $2
        `;

        const countQuery = `
            SELECT COUNT(*) as total FROM pc_parts
            WHERE is_active = true
            AND kiosk_visible = true
            AND on_sale = true
            AND stock > 0
            AND (
                (sale_start_date IS NULL OR sale_start_date <= NOW())
                AND (sale_end_date IS NULL OR sale_end_date >= NOW())
                OR (sale_price IS NOT NULL AND sale_price > 0 AND sale_price < price)
            )
        `;

        const [result, countResult] = await Promise.all([
            query(mainQuery, [itemsPerPage, offset]),
            query(countQuery, [])
        ]);

        const total = parseIntegerValue(countResult.rows[0].total);
        const totalPages = Math.ceil(total / itemsPerPage);

        const products = compactKioskCardProducts(result.rows.map((row) => mapKioskProductRow(row, {
            includeSalePricing: true,
            includeOnSale: true
        })));

        res.json({
            success: true,
            data: products,
            pagination: {
                page: currentPage,
                limit: itemsPerPage,
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
        logger.info('Kiosk order creation request received', sanitizeForLog({
            serviceType: req.body.serviceType,
            itemCount: Array.isArray(req.body.items) ? req.body.items.length : 0,
            selectedPartCount: Array.isArray(req.body.selectedParts) ? req.body.selectedParts.length : 0,
            totalAmount: req.body.totalAmount,
            paymentMethod: req.body.paymentMethod,
            transactionOrigin: req.body.transactionOrigin
        }));

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
        const idempotencyKey = req.get('X-KWise-Idempotency-Key')
            || req.body.idempotencyKey
            || req.body.clientRequestId
            || null;

        const orderItems = getOrderItemsFromPayload({ items, selectedParts });
        const normalizedTotalAmount = parseDecimalValue(totalAmount, Number.NaN);

        logger.info('Validation check:', {
            hasServiceType: !!serviceType,
            serviceTypeValue: serviceType,
            hasTotalAmount: totalAmount !== undefined && totalAmount !== null,
            totalAmountValue: totalAmount,
            totalAmountType: typeof totalAmount,
            normalizedTotalAmount,
            hasItems: orderItems.length > 0,
            itemsCount: orderItems.length
        });

        const validationMessage = validateCreateOrderRequest(serviceType, totalAmount, orderItems);
        if (validationMessage) {
            logger.error(`Validation failed: ${validationMessage}`);
            return res.status(400).json({
                success: false,
                message: validationMessage
            });
        }

        // Import queue manager
        const queueManager = require('../services/queueManagerService');

        const orderData = buildQueueOrderData({
            customerName,
            email,
            orderItems,
            totalAmount: normalizedTotalAmount,
            paymentMethod,
            serviceType,
            transactionOrigin,
            phoneNumber,
            notes,
            idempotencyKey
        });

        logger.info('Prepared order data for queue manager', {
            hasCustomerName: !!orderData.customerName,
            hasItems: !!orderData.items && Array.isArray(orderData.items),
            itemsLength: orderData.items?.length || 0,
            hasTotalAmount: !Number.isNaN(orderData.totalAmount),
            totalAmountValue: orderData.totalAmount,
            serviceType: orderData.serviceType,
            idempotencyKeyPresent: Boolean(idempotencyKey)
        });

        // Create order with queue assignment using queue manager
        const result = await orderLockService.executeWithLock(
            () => queueManager.createOrderWithQueue(orderData),
            orderData
        );
        if (result.isDuplicate && !result.orderId) {
            return res.status(409).json({
                success: false,
                message: result.message || 'Duplicate order is already being processed'
            });
        }

        logger.info('Kiosk order created', {
            orderId: result.orderId,
            queueNumber: result.queueNumber,
            customerName,
            duplicate: Boolean(result.isDuplicate)
        });

        const responseBody = {
            success: true,
            message: result.isDuplicate
                ? 'Order already submitted; returning existing queue assignment'
                : 'Order created successfully with queue assignment',
            data: {
                orderId: result.orderId,
                orderIdFormatted: result.orderIdFormatted,
                transactionIdFormatted: result.transactionIdFormatted,
                queueNumber: result.queueNumber,
                customerName,
                serviceType,
                totalAmount: normalizedTotalAmount,
                createdAt: new Date().toISOString()
            }
        };

        res.json(responseBody);

        if (!result.isDuplicate) {
            runAfterResponse(async () => {
                const savedBuild = await saveCommunityBuildForOrder(serviceType, orderItems, normalizedTotalAmount, result.orderId);
                if (savedBuild) {
                    logger.info('Order auto-saved to Community Builds', {
                        orderId: result.orderId,
                        serviceType,
                        buildId: savedBuild.id
                    });
                }
            });
        }

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
    const componentPrice = parseCurrencyAmount(component.price);
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
        parseDecimalValue(item.price) > minUpgradePrice &&
        item.name !== component.name
    ).sort((a, b) => parseDecimalValue(b.price) - parseDecimalValue(a.price));

    // Get the best available upgrade
    const bestUpgrade = upgrades[0] || categoryStock[0];

    if (bestUpgrade) {
        const upgradePrice = parseDecimalValue(bestUpgrade.price);
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
    const currentPrice = parseCurrencyAmount(currentComponent.price);
    const upgradePrice = parseDecimalValue(upgradeComponent.price);

    // Category-specific performance calculations
    const categoryMultipliers = {
        'Cooling': { base: 25, multiplier: 0.8 },
        'GPU': { base: 40, multiplier: 1.2 },
        'CPU': { base: 35, multiplier: 1 },
        'RAM': { base: 30, multiplier: 0.9 },
        'Storage': { base: 50, multiplier: 1.1 },
        'Motherboard': { base: 20, multiplier: 0.7 },
        'PSU': { base: 15, multiplier: 0.6 },
        'Case': { base: 10, multiplier: 0.5 }
    };

    const categoryData = categoryMultipliers[category] || { base: 25, multiplier: 1 };
    const priceRatio = getSafeRatio(upgradePrice, currentPrice, 1.5);
    const performanceIncrease = Math.round(categoryData.base + (priceRatio - 1) * 100 * categoryData.multiplier);

    return `+${Math.min(Math.max(performanceIncrease, 15), 95)}%`;
}

/**
 * Calculate future-proofing rating based on price difference and specifications
 */
function calculateFutureProofing(upgradePrice, currentPrice, upgradeComponent) {
    const priceRatio = getSafeRatio(upgradePrice, currentPrice, 1);
    const brand = toLowerCaseText(upgradeComponent.brand);

    // Premium brands get bonus
    const premiumBrands = ['asus', 'corsair', 'nzxt', 'msi', 'gigabyte', 'evga', 'seasonic'];
    const brandBonus = premiumBrands.some(pb => brand.includes(pb)) ? 0.5 : 0;

    if (priceRatio >= 2.5 + brandBonus) return 'Excellent (4+ years)';
    if (priceRatio >= 2 + brandBonus) return 'Very Good (3-4 years)';
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
    const analysisSummary = analyzeSpecifications(currentSpecs, upgradeSpecs, category);

    const categoryBenefits = {
        'Cooling': `Superior thermal management with ${analysisSummary}. Enhanced RGB lighting and quieter operation compared to ${currentName}.`,
        'GPU': `Significantly higher frame rates with ${analysisSummary}. Better ray tracing performance and future game compatibility than ${currentName}.`,
        'CPU': `Faster processing speeds with ${analysisSummary}. Improved multitasking and content creation performance over ${currentName}.`,
        'RAM': `Increased capacity and speed with ${analysisSummary}. Better system responsiveness and multitasking than ${currentName}.`,
        'Storage': `Faster read/write speeds with ${analysisSummary}. Reduced loading times and better system performance than ${currentName}.`,
        'Motherboard': `Enhanced connectivity with ${analysisSummary}. Better upgrade path and features compared to ${currentName}.`,
        'PSU': `Higher efficiency and wattage with ${analysisSummary}. More stable power delivery and headroom than ${currentName}.`,
        'Case': `Better airflow and build quality with ${analysisSummary}. Improved cable management and aesthetics over ${currentName}.`
    };

    return categoryBenefits[category] || `Professional upgrade featuring ${upgradeName} with enhanced specifications and superior build quality compared to ${currentName}. Provides significant performance improvements and excellent value for money.`;
}

/**
 * Analyze specifications to extract key upgrade points
 */
function analyzeSpecifications(currentSpecs, upgradeSpecs, category) {
    const current = toLowerCaseText(currentSpecs);
    const upgrade = toLowerCaseText(upgradeSpecs);
    const categoryRules = SPEC_ANALYSIS_RULES[category];

    if (!categoryRules) {
        return 'enhanced specifications and features';
    }

    const matchingRule = categoryRules.rules.find((rule) => matchesSpecificationRule(current, upgrade, rule));
    return matchingRule ? matchingRule.result : categoryRules.fallback;
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
    const priceRatio = getSafeRatio(upgradePrice, currentPrice, 1);
    const upgradeName = toLowerCaseText(upgradeComponent.name);

    // Technology tier analysis
    const tierBonuses = {
        'flagship': 1.5, // RTX 5080, i9-15900K
        'high_end': 1.2, // RTX 5070 Ti, i7-15700K
        'mid_range': 1, // Standard tier
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

    if (adjustedRatio >= 3) return 'Exceptional (5+ years)';
    if (adjustedRatio >= 2.5) return 'Excellent (4+ years)';
    if (adjustedRatio >= 2) return 'Very Good (3-4 years)';
    if (adjustedRatio >= 1.5) return 'Good (2-3 years)';
    return 'Moderate (1-2 years)';
}

/**
 * Extract brand name from product name
 */
function extractBrandFromName(productName) {
    const normalizedProductName = String(productName ?? '');
    const brands = ['NVIDIA', 'AMD', 'Intel', 'Corsair', 'NZXT', 'ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Seasonic', 'be quiet!', 'EVGA', 'Thermaltake', 'Lian Li', 'Fractal Design', 'Phanteks', 'Samsung', 'WD', 'Crucial', 'Seagate', 'Kingston', 'G.SKILL', 'TeamGroup'];

    for (const brand of brands) {
        if (normalizedProductName.includes(brand)) {
            return brand;
        }
    }

    return normalizedProductName.split(' ')[0] || 'Unknown';
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
                price: parseDecimalValue(row.price),
                specifications: row.specifications || '',
                stock: parseIntegerValue(row.stock)
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
        const componentPrice = parseCurrencyAmount(component.price);

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
const ADVANCED_PERFORMANCE_GAINS = {
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

function getCoolingAdvancedPerformanceGain(currentName, upgradeName, categoryGains) {
    if (includesAny(currentName, ['wraith', 'air', 'tower'])) {
        return categoryGains.air_to_aio;
    }

    if (includesAny(currentName, ['h100', 'basic'])) {
        return categoryGains.basic_aio_to_premium;
    }

    return categoryGains.premium_upgrade;
}

function getGpuAdvancedPerformanceGain(currentName, upgradeName, categoryGains) {
    if (currentName.includes('4060') && upgradeName.includes('5080')) return categoryGains.rtx_4060_to_5080;
    if (currentName.includes('4070') && upgradeName.includes('5080')) return categoryGains.rtx_4070_to_5080;
    if (includesAny(currentName, ['3060', '3070', '2060'])) return categoryGains.old_gen_to_new;
    if (includesAny(upgradeName, ['5080', 'flagship'])) return categoryGains.mid_to_flagship;
    return categoryGains.default;
}

function getCpuAdvancedPerformanceGain(currentName, upgradeName, categoryGains) {
    if (currentName.includes('i5') && upgradeName.includes('i9')) return categoryGains.generational_jump;
    if (currentName.includes('12') && upgradeName.includes('15')) return categoryGains.intel_12_to_15;
    if (currentName.includes('5000') && upgradeName.includes('9000')) return categoryGains.amd_5000_to_9000;
    if (upgradeName.includes('x3d')) return categoryGains.gaming_upgrade;
    return categoryGains.default;
}

function getStorageAdvancedPerformanceGain(currentName, upgradeName, categoryGains) {
    if (includesAny(currentName, ['hdd', 'hard'])) return categoryGains.hdd_to_nvme;
    if (currentName.includes('sata')) return categoryGains.sata_to_nvme;
    if (currentName.includes('gen3') && upgradeName.includes('gen5')) return categoryGains.gen4_to_gen5;
    if (!currentName.includes('nvme') && upgradeName.includes('nvme')) return categoryGains.gen3_to_gen4;
    return categoryGains.default;
}

const ADVANCED_PERFORMANCE_GAIN_SELECTORS = {
    'Cooling': getCoolingAdvancedPerformanceGain,
    'GPU': getGpuAdvancedPerformanceGain,
    'CPU': getCpuAdvancedPerformanceGain,
    'Storage': getStorageAdvancedPerformanceGain
};

function calculateAdvancedPerformanceGain(currentComponent, upgradeComponent, category) {
    const currentName = toLowerCaseText(currentComponent.name);
    const upgradeName = toLowerCaseText(upgradeComponent.name);
    const categoryGains = ADVANCED_PERFORMANCE_GAINS[category] || { default: '+50%' };
    const categorySelector = ADVANCED_PERFORMANCE_GAIN_SELECTORS[category];

    if (categorySelector) {
        return categorySelector(currentName, upgradeName, categoryGains);
    }

    return categoryGains.default || '+50%';
}

/**
 * Generate advanced upgrade reasoning with technical analysis
 */
function generateAdvancedUpgradeReason(currentComponent, upgradeComponent, category, performanceGain = '+50%') {
    const currentName = currentComponent.name || 'Current component';
    const upgradeName = upgradeComponent.name || 'Upgraded component';

    const advancedReasons = {
        'Cooling': `${upgradeName} delivers superior thermal management with advanced pump technology and optimized radiator design. Features premium RGB lighting system and whisper-quiet operation compared to ${currentName}, providing ${performanceGain} cooling efficiency enhancement with extended component lifespan.`,
        'GPU': `${upgradeName} represents next-generation gaming excellence with cutting-edge architecture and enhanced ray tracing capabilities. Supports latest DirectX 12 Ultimate features and 4K+ gaming performance, delivering ${performanceGain} graphics performance boost over ${currentName} with future-ready specifications.`,
        'CPU': `${upgradeName} provides flagship-level processing power with advanced core architecture and intelligent boost technology. Delivers exceptional single-core and multi-core performance for gaming and productivity, offering ${performanceGain} processing improvement compared to ${currentName}.`,
        'RAM': `${upgradeName} offers high-bandwidth memory performance with optimized timings and enhanced overclocking capabilities. Provides improved system responsiveness and seamless multitasking experience, delivering ${performanceGain} memory performance enhancement over ${currentName}.`,
        'Storage': `${upgradeName} delivers ultra-fast storage performance with next-generation controller technology and premium NAND flash. Features reduced loading times and enhanced system boot speeds, providing ${performanceGain} storage performance improvement compared to ${currentName}.`,
        'Motherboard': `${upgradeName} features advanced connectivity options and premium power delivery system. Provides enhanced expansion capabilities and future upgrade paths, offering ${performanceGain} platform enhancement over ${currentName} with professional-grade features.`,
        'PSU': `${upgradeName} ensures rock-solid power delivery with industry-leading efficiency ratings and modular cable management. Features advanced protection circuits and silent operation, providing ${performanceGain} power efficiency improvement compared to ${currentName}.`,
        'Case': `${upgradeName} provides superior build quality with optimized airflow design and premium materials. Features enhanced cable management and thermal performance, delivering ${performanceGain} cooling and aesthetics improvement over ${currentName}.`
    };

    return advancedReasons[category] || `${upgradeName} represents a significant technological advancement over ${currentName}, offering ${performanceGain} performance improvement with enhanced features and superior future-proofing capabilities.`;
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

        const normalizedCurrentPrice = parseDecimalValue(currentPrice, Number.NaN);
        const minimumUpgradeThreshold = parseDecimalValue(minUpgradeThreshold, 1.3);

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

        if (Number.isNaN(normalizedCurrentPrice) || normalizedCurrentPrice <= 0) {
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
        `, [category, normalizedCurrentPrice * minimumUpgradeThreshold]);

        if (result.rows.length === 0) {
            return res.json({
                success: false,
                message: `No upgrades found for ${category} above ₱${(normalizedCurrentPrice * minimumUpgradeThreshold).toLocaleString()}`,
                upgrade: null
            });
        }

        // Select best upgrade based on price
        const bestUpgrade = result.rows[0];
        const upgradePrice = parseDecimalValue(bestUpgrade.price);
        const performanceGain = `+${Math.round((upgradePrice - normalizedCurrentPrice) / normalizedCurrentPrice * 50)}%`; // Simplified calculation
        const futureProofing = upgradePrice > normalizedCurrentPrice * 2 ? 'Excellent (4+ years)' : 'Good (2-3 years)';
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
const getOllamaExternalUpgrade = async (_req, res) => {
    return res.status(410).json({
        success: false,
        code: 'AI_REMOVED',
        source: 'deterministic',
        message: 'Ollama external upgrade analysis is disabled in offline kiosk mode'
    });
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
        const result = await Promise.resolve(
            upgradeService.generateDualUpgrades(component, category, {
                includeExternalMarket
            })
        );

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
        const minimumPrice = parseOptionalDecimalValue(minPrice);
        const maximumPrice = parseOptionalDecimalValue(maxPrice);

        // Query pc_parts table where category = 'Pre-Built'. Community builds
        // are local kiosk content and may be hidden from normal stock browsing,
        // so the community source is allowed through this dedicated route.
        let whereClause = buildSource === 'community'
            ? `WHERE category = 'Pre-Built'`
            : `WHERE category = 'Pre-Built' AND is_active = true AND kiosk_visible = true`;
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
        if (minimumPrice !== null) {
            whereClause += ` AND price >= $${paramIndex++}`;
            queryParams.push(minimumPrice);
        }

        if (maximumPrice !== null) {
            whereClause += ` AND price <= $${paramIndex++}`;
            queryParams.push(maximumPrice);
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
                price: parseDecimalValue(row.price),
                category: row.tier || 'Unknown',
                tier: row.tier || 'Unknown',
                purposes: specs.purposes || [],
                image: row.image_url,
                imageUrl: row.image_url,
                image_url: row.image_url,
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
                    productCount: parseIntegerValue(result.rows[0].count)
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
        const { currentCategory, cart = [] } = req.body;

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
 * Uses lightweight platform heuristics until category-specific spec tables are available.
 */
async function quickCompatibilityCheck(cart, category, product) {
    const normalizedCategory = toLowerCaseText(category);
    const productName = toLowerCaseText(product.name);
    const cpu = findCartItemByCategory(cart, 'cpu');
    const motherboard = findCartItemByCategory(cart, 'motherboard');

    if (normalizedCategory === 'motherboard' && cpu) {
        return matchesPlatformHints(productName, getCpuPlatformHints(cpu.name));
    }

    if (normalizedCategory === 'cpu' && motherboard) {
        return matchesPlatformHints(toLowerCaseText(motherboard.name), getCpuPlatformHints(product.name));
    }

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

    logger.info('saveCommunityBuildInternal called', {
        buildName,
        componentCount: Array.isArray(components) ? components.length : 0,
        totalPrice,
        tier,
        baseProductId: baseProductId || null
    });

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
        price: parseDecimalValue(comp.price || comp.part_price || 0),
        category: comp.category || comp.name,
        isCustomized: comp.isCustomized || false
    }));

    // Build specifications object
    const specifications = {
        buildType: tier,
        buildSource: 'community',
        approvalStatus: 'pending',
        components: componentList,
        purposes: normalizePurposesList(purposes),
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

    const count = parseIntegerValue(nameResult.rows[0].count || 0);
    const letter = String.fromCodePoint(65 + (count % 26)); // A, B, C, ...
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
    getCatalogBootstrap,
    getProductById,
    getProductCompatibleProducts,
    checkCompatibilityCandidates,
    getFeaturedProducts,
    getHomepageProducts,
    getBuildComponents,
    searchProducts,
    getOnSaleProducts,
    createOrder,
    getOrderReceipt,
    getAIHotPicks,
    getFutureUpgradeStock,
    getOllamaExternalUpgrade,
    getDualUpgrade,
    getPreBuiltProducts,
    getUpgradeCategories,
    filterCompatibleProducts,
    saveCommunityBuild  // ✅ ADDED: Fixed undefined handler
};
