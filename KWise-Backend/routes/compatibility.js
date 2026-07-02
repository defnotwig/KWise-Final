/**
 * Compatibility Analysis Routes
 * Offline deterministic hardware compatibility analysis.
 */

const express = require('express');
const router = express.Router();
const { kioskGeneralLimit } = require('../middleware/kioskRateLimit');
const { softValidateBuild } = require('../middleware/validateBuild'); // Soft validation for gradual migration
const { 
    validateCompatibilityAnalysis,
    validateFullBuildAnalysis
} = require('../middleware/buildSchemas'); // Phase 9: JSON Schema validation
const { compatibilityService } = require('../services/compatibilityService');
const advancedCompatibilityService = require('../services/advancedCompatibilityService');
const compatibilityRules = require('../services/compatibilityRules'); // Phase 2 integration
const detailedCompatibilityService = require('../services/detailedCompatibilityService'); // NEW: Detailed compatibility validation
const { query, pool } = require('../config/db'); // Phase 3: Import both query and pool
const logger = require('../utils/logger');
const crypto = require('node:crypto'); // Phase 3: For cache key generation
const batchResponseCache = new Map();
const BATCH_RESPONSE_CACHE_TTL_MS = Number.parseInt(process.env.COMPATIBILITY_BATCH_RESPONSE_CACHE_MS || '30000', 10);
const BATCH_RESPONSE_CACHE_MAX_ENTRIES = Number.parseInt(process.env.COMPATIBILITY_BATCH_RESPONSE_CACHE_MAX_ENTRIES || '50', 10);

/**
 * Phase 3: Generate cache key from build configuration
 */
function generateCacheKey(buildParts) {
    const sortedParts = JSON.stringify(buildParts, Object.keys(buildParts).sort());
    return crypto.createHash('md5').update(sortedParts).digest('hex');
}

function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function generateBatchResponseCacheKey(payload) {
    return crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function getCachedBatchResponse(cacheKey) {
    if (BATCH_RESPONSE_CACHE_TTL_MS <= 0) return null;
    const cached = batchResponseCache.get(cacheKey);
    if (!cached || cached.expiresAt <= Date.now()) {
        batchResponseCache.delete(cacheKey);
        return null;
    }
    return cached.response;
}

function setCachedBatchResponse(cacheKey, response) {
    if (BATCH_RESPONSE_CACHE_TTL_MS <= 0) return;
    batchResponseCache.set(cacheKey, {
        response,
        expiresAt: Date.now() + BATCH_RESPONSE_CACHE_TTL_MS
    });
    while (batchResponseCache.size > BATCH_RESPONSE_CACHE_MAX_ENTRIES) {
        batchResponseCache.delete(batchResponseCache.keys().next().value);
    }
}

function toPartArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'object') {
        return Object.entries(value)
            .filter(([, part]) => part)
            .map(([category, part]) => {
                if (typeof part === 'object') {
                    return {
                        ...part,
                        category: part.category || category
                    };
                }

                return { id: part, category };
            });
    }

    return [];
}

function idsNeedingHydration(parts) {
    return [...new Set(parts
        .map((part) => {
            if (typeof part === 'number') return part;
            if (typeof part === 'string' && /^\d+$/.test(part)) return Number.parseInt(part, 10);
            if (part?.id && !part.specifications) return Number.parseInt(part.id, 10);
            return null;
        })
        .filter((id) => Number.isInteger(id) && id > 0))];
}

async function fetchProductsByIds(productIds) {
    if (!productIds.length) return new Map();

    try {
        const result = await query(`
            SELECT
                pp.id, pp.name, pp.category, pp.brand, pp.price, pp.stock,
                COALESCE(pp.image_url, pp.image_path) AS image_url,
                pp.description, pp.dimensions, pp.kiosk_visible, pp.is_active,
                COALESCE(
                    pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
                    pp.specifications,
                    '{}'::jsonb
                ) AS specifications,
                ps.normalized_specs
            FROM pc_parts pp
            LEFT JOIN product_specs ps ON pp.id = ps.product_id
            WHERE pp.id = ANY($1::int[])
        `, [productIds]);

        return new Map(result.rows.map((row) => [String(row.id), row]));
    } catch (error) {
        logger.warn('[Compatibility] product_specs hydration skipped, falling back to pc_parts only:', error.message);
        try {
            const fallback = await query(`
                SELECT id, name, category, brand, price, stock, image_url, description, specifications, dimensions, kiosk_visible, is_active
                FROM pc_parts
                WHERE id = ANY($1::int[])
            `, [productIds]);

            return new Map(fallback.rows.map((row) => [String(row.id), row]));
        } catch (fallbackError) {
            logger.warn('[Compatibility] dimensions hydration skipped, falling back to core pc_parts columns:', fallbackError.message);
            const coreFallback = await query(`
                SELECT id, name, category, brand, price, stock, image_url, description, specifications, kiosk_visible, is_active
                FROM pc_parts
                WHERE id = ANY($1::int[])
            `, [productIds]);

            return new Map(coreFallback.rows.map((row) => [String(row.id), { ...row, dimensions: {} }]));
        }
    }
}

async function hydrateParts(parts) {
    const hydrationMap = await fetchProductsByIds(idsNeedingHydration(parts));

    return parts
        .map((part) => {
            const key = String(typeof part === 'object' ? part.id : part);
            const hydrated = hydrationMap.get(key);
            if (!hydrated && typeof part !== 'object') return null;
            if (!hydrated) return part;
            if (typeof part !== 'object') return hydrated;

            return {
                ...hydrated,
                ...part,
                specifications: {
                    ...(hydrated.specifications || {}),
                    ...(part.specifications || {})
                }
            };
        })
        .filter(Boolean);
}

function toCompatibilityContract(result = {}) {
    const issues = result.problems || result.compatibility_issues || result.deterministic_issues || result.issues || [];
    const warnings = result.warnings || result.compatibility_warnings || [];
    const missingSpecs = result.missingSpecs || result.manualChecks || result.manual_checks || [];
    const score = result.score ?? result.compatibility_score ?? result.compatibilityScore ?? 0;
    const status = result.status || result.verdict || result.compatibility_status || (result.compatible === false ? 'incompatible' : 'manual_check');

    return {
        ...result,
        engine: 'deterministic',
        source: 'deterministic',
        aiEnabled: false,
        status,
        score,
        compatible: result.compatible !== false,
        issues,
        warnings,
        missingSpecs,
        latencyMs: result.latencyMs ?? null
    };
}

function summarizeResults(results = [], startedAt = Date.now()) {
    const scoreValues = results
        .map((result) => result.score ?? result.compatibility_score)
        .filter((score) => Number.isFinite(score));
    const averageScore = scoreValues.length
        ? Math.round(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length)
        : 0;

    return {
        engine: 'deterministic',
        source: 'deterministic',
        aiEnabled: false,
        status: results.some((product) => product.compatible === false)
            ? 'incompatible'
            : results.some((product) => product.verdict === 'manual_check' || product.status === 'manual_check')
                ? 'manual_check'
                : results.some((product) => product.verdict === 'warning' || product.status === 'warning')
                    ? 'warning'
                    : 'compatible',
        score: averageScore,
        issues: results.flatMap((product) => product.compatibility_issues || product.deterministic_issues || product.issues || []),
        warnings: results.flatMap((product) => product.warnings || product.compatibility_warnings || []),
        missingSpecs: results.flatMap((product) => product.missingSpecs || product.manualChecks || []),
        latencyMs: Date.now() - startedAt
    };
}

/**
 * POST /api/compatibility/batch
 * Deterministically score many candidate products against the selected local build in one request.
 */
router.post('/batch', kioskGeneralLimit, async (req, res) => {
    const startedAt = Date.now();

    try {
        const {
            contextParts = [],
            candidates = [],
            mode = 'candidate_filter',
            targetCategory,
            referenceProduct
        } = req.body || {};
        const candidateParts = toPartArray(candidates);

        if (!Array.isArray(candidateParts) || candidateParts.length === 0) {
            return res.json({
                success: true,
                source: 'deterministic',
                engine: 'deterministic',
                aiEnabled: false,
                status: 'compatible',
                score: 0,
                issues: [],
                warnings: [],
                missingSpecs: [],
                mode,
                data: [],
                results: [],
                summary: { total: 0, compatible: 0, warnings: 0, failed: 0, manualCheck: 0 },
                latencyMs: Date.now() - startedAt,
                cache: { hit: false, key: null }
            });
        }

        if (candidateParts.length > 500) {
            return res.status(400).json({
                success: false,
                source: 'deterministic',
                engine: 'deterministic',
                aiEnabled: false,
                code: 'BATCH_TOO_LARGE',
                message: 'Batch compatibility checks are limited to 500 candidates per request'
            });
        }

        const batchCacheKey = generateBatchResponseCacheKey({
            contextParts,
            candidates: candidateParts,
            mode,
            targetCategory,
            referenceProduct
        });
        const cachedBatchResponse = getCachedBatchResponse(batchCacheKey);
        if (cachedBatchResponse) {
            return res.json({
                ...cachedBatchResponse,
                latencyMs: Date.now() - startedAt,
                cache: {
                    ...(cachedBatchResponse.cache || {}),
                    hit: true,
                    key: batchCacheKey
                }
            });
        }

        const [hydratedContext, hydratedCandidates] = await Promise.all([
            hydrateParts(toPartArray(contextParts)),
            hydrateParts(candidateParts)
        ]);

        const results = await compatibilityService.analyzeBatch(hydratedContext, hydratedCandidates, {
            mode,
            targetCategory,
            referenceProduct
        });
        const summary = {
            total: results.length,
            compatible: results.filter((product) => product.compatible !== false).length,
            warnings: results.filter((product) => product.verdict === 'warning').length,
            failed: results.filter((product) => product.compatible === false).length,
            manualCheck: results.filter((product) => product.verdict === 'manual_check').length
        };
        const contract = summarizeResults(results, startedAt);

        const responseBody = {
            success: true,
            source: 'deterministic',
            engine: 'deterministic',
            aiEnabled: false,
            status: contract.status,
            score: contract.score,
            issues: contract.issues,
            warnings: contract.warnings,
            missingSpecs: contract.missingSpecs,
            mode,
            targetCategory,
            data: results,
            results,
            summary,
            latencyMs: contract.latencyMs,
            cache: {
                hit: results.length > 0 && results.every((product) => product.cache?.hit),
                key: batchCacheKey
            }
        };
        setCachedBatchResponse(batchCacheKey, responseBody);

        return res.json(responseBody);
    } catch (error) {
        logger.error('Deterministic batch compatibility failed:', error);
        return res.status(500).json({
            success: false,
            source: 'deterministic',
            engine: 'deterministic',
            aiEnabled: false,
            message: 'Batch compatibility check failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/compatibility/analyze
 * Analyze compatibility between current product and available stock
 * PHASE 3: Integrated with compatibility_cache for 3-5x performance boost
 * PHASE 9: Added JSON Schema validation
 */
router.post('/analyze', kioskGeneralLimit, validateCompatibilityAnalysis, async (req, res) => {
    try {
        // PHASE 1 FIX: Support multiple request formats for different use cases
        const { 
            currentProduct, 
            selectedParts,      // For PC Customized (AI/Manual)
            currentBuild,       // For PC Upgrade
            upgradeCategory,
            targetCategory,
            mode,
            excludeCategories = [],
            skipCache = false   // Phase 3: Allow cache bypass for testing
        } = req.body;

        if (process.env.KWISE_VERBOSE_COMPATIBILITY_LOGS === 'true') {
            logger.info(`🔍 === ENTERING /analyze ROUTE ===`);
            logger.info(`🔍 Request body keys: ${Object.keys(req.body).join(', ')}`);
        }

        // PHASE 1 FIX: Validate at least one input method
        if (!currentProduct && !selectedParts && !currentBuild) {
            return res.status(400).json({
                success: false,
                message: 'One of currentProduct, selectedParts, or currentBuild is required',
                hint: 'Provide currentProduct for product page, selectedParts for custom build, or currentBuild for upgrade analysis'
            });
        }

        if (mode === 'pair_check' && currentProduct) {
            const startedAt = Date.now();
            const pairCacheKey = generateBatchResponseCacheKey({
                route: 'compatibility-analyze-pair',
                currentProduct,
                selectedParts,
                targetCategory,
                upgradeCategory,
                excludeCategories
            });
            const cachedPairResponse = !skipCache ? getCachedBatchResponse(pairCacheKey) : null;
            if (cachedPairResponse) {
                return res.json({
                    ...cachedPairResponse,
                    latencyMs: Date.now() - startedAt,
                    data: {
                        ...(cachedPairResponse.data || {}),
                        latencyMs: Date.now() - startedAt,
                        cache: {
                            ...(cachedPairResponse.data?.cache || {}),
                            hit: true,
                            key: pairCacheKey
                        }
                    },
                    cache: {
                        ...(cachedPairResponse.cache || {}),
                        hit: true,
                        key: pairCacheKey
                    }
                });
            }

            const [hydratedContext, hydratedCandidateList] = await Promise.all([
                hydrateParts(toPartArray(selectedParts)),
                hydrateParts(toPartArray([currentProduct]))
            ]);
            const candidate = hydratedCandidateList[0] || currentProduct;
            const [result] = await compatibilityService.analyzeBatch(hydratedContext, [candidate], {
                mode: 'pair_check',
                referenceProduct: candidate
            });
            const contract = toCompatibilityContract({
                ...(result || {}),
                latencyMs: Date.now() - startedAt
            });
            const responseBody = {
                success: true,
                ...contract,
                cache: {
                    hit: false,
                    key: pairCacheKey
                },
                data: {
                    ...contract,
                    cache: {
                        hit: false,
                        key: pairCacheKey
                    }
                },
                message: 'Deterministic compatibility check completed'
            };
            setCachedBatchResponse(pairCacheKey, responseBody);

            return res.json(responseBody);
        }

        // ===================================================================
        // PHASE 3: CHECK CACHE FIRST (3-5x Performance Improvement)
        // ===================================================================
        if (!skipCache && (selectedParts || currentBuild)) {
            const buildConfiguration = selectedParts || currentBuild;
            const cache_key = generateCacheKey(buildConfiguration);
            
            try {
                const cacheStart = Date.now();
                const cacheResult = await pool.query(`
                    SELECT * FROM compatibility_cache
                    WHERE cache_key = $1
                    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                `, [cache_key]);

                if (cacheResult.rows.length > 0) {
                    // CACHE HIT! Return cached result immediately
                    await pool.query(`
                        UPDATE compatibility_cache
                        SET hit_count = hit_count + 1,
                            last_hit_at = CURRENT_TIMESTAMP
                        WHERE cache_key = $1
                    `, [cache_key]);

                    const cached = cacheResult.rows[0];
                    const cacheDuration = Date.now() - cacheStart;
                    
                    logger.info(`⚡ CACHE HIT! ${cache_key} (${cacheDuration}ms, hits: ${cached.hit_count + 1})`);
                    
                    // FIX #6: Transform cached data to camelCase
                    const cachedData = cached.compatibility_result.data || cached.compatibility_result;
                    const transformedCachedData = Array.isArray(cachedData) ? cachedData.map(product => ({
                        ...product,
                        compatibilityScore: product.compatibility_score || product.compatibilityScore,
                        compatibilityReason: product.compatibility_reason || product.compatibilityReason,
                        compatibilityIssues: product.deterministic_issues || product.compatibilityIssues || []
                    })) : cachedData;
                    
                    return res.json({
                        success: true,
                        data: transformedCachedData,
                        cached: true,
                        source: 'deterministic',
                        engine: 'deterministic',
                        aiEnabled: false,
                        status: Array.isArray(transformedCachedData) ? summarizeResults(transformedCachedData).status : toCompatibilityContract(transformedCachedData).status,
                        score: Array.isArray(transformedCachedData) ? summarizeResults(transformedCachedData).score : toCompatibilityContract(transformedCachedData).score,
                        issues: Array.isArray(transformedCachedData) ? summarizeResults(transformedCachedData).issues : toCompatibilityContract(transformedCachedData).issues,
                        warnings: Array.isArray(transformedCachedData) ? summarizeResults(transformedCachedData).warnings : toCompatibilityContract(transformedCachedData).warnings,
                        missingSpecs: Array.isArray(transformedCachedData) ? summarizeResults(transformedCachedData).missingSpecs : toCompatibilityContract(transformedCachedData).missingSpecs,
                        latencyMs: cacheDuration,
                        cache: { hit: true, key: cache_key },
                        cache_key,
                        hit_count: cached.hit_count + 1,
                        cached_at: cached.created_at,
                        expires_at: cached.expires_at,
                        message: `Retrieved from cache (${cacheDuration}ms) - ${cached.hit_count + 1} hits`
                    });
                } else {
                    logger.info(`💾 Cache MISS for ${cache_key} - will cache result after analysis`);
                }
            } catch (cacheError) {
                logger.error(`⚠️ Cache check failed (continuing without cache):`, cacheError.message);
                // Continue to normal analysis if cache fails
            }
        }

        // PHASE 1 FIX: Convert selectedParts or currentBuild to currentProduct format
        let product = currentProduct;
        let allBuildParts = []; // Track all parts in the build for compatibility checking
        
        if (selectedParts && !currentProduct) {
            // Handle both array and object formats for selectedParts
            let selectedPartIds = [];
            
            if (Array.isArray(selectedParts)) {
                // Array format: [{id: 1, name: '...', category: '...'}, ...]
                logger.info(`🔄 PC Customized mode: selectedParts is ARRAY with ${selectedParts.length} items`);
                allBuildParts = selectedParts.filter(part => part && part.id);
                selectedPartIds = allBuildParts.map(p => p.id);
                
                if (allBuildParts.length > 0) {
                    product = allBuildParts[0]; // Use first as reference
                    logger.info(`✅ Using ${allBuildParts.length} parts from array`);
                    allBuildParts.forEach(p => logger.info(`   - ${p.name} (${p.category})`));
                }
            } else {
                // Object format: {CPU: 123, Motherboard: 456, ...}
                selectedPartIds = Object.values(selectedParts).filter(id => id); // Filter out null/undefined
                
                if (selectedPartIds.length > 0) {
                    logger.info(`🔄 PC Customized mode: Fetching ${selectedPartIds.length} selected parts from object`);
                    logger.info(`   IDs: ${selectedPartIds.join(', ')}, targetCategory: ${targetCategory}`);
                    
                    // Fetch ALL selected parts
                    const partsResult = await query(
                        'SELECT * FROM pc_parts WHERE id = ANY($1::int[])', 
                        [selectedPartIds]
                    );
                    
                    if (partsResult.rows.length === 0) {
                        return res.status(400).json({
                            success: false,
                            message: `No products found with IDs: ${selectedPartIds.join(', ')}`
                        });
                    }
                    
                    allBuildParts = partsResult.rows;
                    product = allBuildParts[0]; // Use first as reference for category/base info
                    logger.info(`✅ Retrieved ${allBuildParts.length} selected parts`);
                    allBuildParts.forEach(p => logger.info(`   - ${p.name} (${p.category})`));
                }
            }
        }
        
        if (currentBuild && !currentProduct && !selectedParts) {
            // For PC Upgrade: Fetch ALL build components for compatibility
            const buildPartIds = Object.values(currentBuild).filter(id => id);
            if (buildPartIds.length > 0) {
                logger.info(`🔄 PC Upgrade mode: Fetching ${buildPartIds.length} current build parts`);
                logger.info(`   IDs: ${buildPartIds.join(', ')}, upgradeCategory: ${upgradeCategory}`);
                
                // Fetch ALL build parts
                const partsResult = await query(
                    'SELECT * FROM pc_parts WHERE id = ANY($1::int[])', 
                    [buildPartIds]
                );
                
                if (partsResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: `No products found with IDs: ${buildPartIds.join(', ')}`
                    });
                }
                
                allBuildParts = partsResult.rows;
                product = allBuildParts[0]; // Use first as reference
                logger.info(`✅ Retrieved ${allBuildParts.length} build parts`);
                allBuildParts.forEach(p => logger.info(`   - ${p.name} (${p.category})`));
            }
        }

        if (!product) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine reference product from request'
            });
        }

        logger.info(`🔍 Reference product: ${product.name} (${product.category})`);

        // ✅ CRITICAL FIX: Validate category field exists
        if (!product.category) {
            logger.error(`❌ Product missing category field: ${product.name || 'Unknown'}`);
            return res.status(400).json({
                success: false,
                message: 'Product category is required for compatibility analysis',
                hint: 'Cart items must include a category field. Clear cart and re-add items from Product Page.'
            });
        }

        logger.info(`🔍 Compatibility analysis request for: ${product.name}`);
        
        // Add timestamp-based seed for better variety across requests
        const varietySeed = Date.now() % 1000;
        logger.info(`🎲 Variety seed: ${varietySeed}`);

        // Define the core 7 PC component categories for compatibility analysis (using actual DB names)
        const coreCategories = ['CPU', 'Cooling', 'Motherboard', 'GPU', 'RAM', 'Storage', 'PSU', 'Case'];
        const currentCategory = product.category?.toUpperCase();
        
        // Map Cooling to CPU Cooler for display purposes (but keep as Cooling in database)
        const categoryDisplayMap = {
            'Cooling': 'CPU Cooler',
            'CPU': 'CPU',
            'Motherboard': 'Motherboard', 
            'GPU': 'GPU',
            'RAM': 'RAM',
            'Storage': 'Storage',
            'PSU': 'PSU',
            'Case': 'Case'
        };
        
        // Exclude current product's category from the 7 core categories
        // PHASE 1 FIX: If targetCategory or upgradeCategory is specified, only search in that category
        let compatibleCategories;
        if (targetCategory || upgradeCategory) {
            const requestedCategory = (targetCategory || upgradeCategory).toUpperCase();
            compatibleCategories = [requestedCategory];
            logger.info(`🎯 Target category specified: ${requestedCategory}`);
        } else {
            compatibleCategories = coreCategories.filter(cat => 
                cat.toUpperCase() !== currentCategory && !excludeCategories.map(c => c.toUpperCase()).includes(cat.toUpperCase())
            );
        }
        
        // Verify categories exist in database
        const categoryCheckResult = await query(`
            SELECT DISTINCT category 
            FROM pc_parts 
            WHERE category = ANY($1) 
            AND is_active = true 
            AND stock > 0
        `, [compatibleCategories]);
        
        const availableCategories = categoryCheckResult.rows.map(row => row.category);
        const finalCompatibleCategories = compatibleCategories.filter(cat => 
            availableCategories.some(avail => avail.toUpperCase() === cat.toUpperCase())
        );

        logger.info(`📋 Current category: ${currentCategory}, Compatible categories: ${finalCompatibleCategories.join(', ')}`);
        logger.info(`🎯 Target: Return exactly 7 products (1 from each of the ${finalCompatibleCategories.length} core categories)`);
        logger.info(`🔍 DEBUG: Core categories: ${coreCategories.join(', ')}`);
        logger.info(`🔍 DEBUG: Available categories in DB: ${availableCategories.join(', ')}`);
        logger.info(`🔍 DEBUG: Final compatible categories: ${finalCompatibleCategories.join(', ')}`);

        // PERFORMANCE OPTIMIZATION: Single query instead of loop (60x speedup)
        // Instead of 7 sequential queries (30+ seconds), fetch all categories in one query (<500ms)
        logger.info(`🚀 OPTIMIZED: Fetching all ${finalCompatibleCategories.length} categories in single query`);
        
        const startTime = Date.now();
        
        // Single optimized query using DISTINCT ON to get 1 product per category
        const allCategoryProducts = await query(`
            WITH ranked_products AS (
                SELECT 
                    id, name, category, brand, price, stock, 
                    description, specifications, image_url, is_active,
                    ROW_NUMBER() OVER (
                        PARTITION BY category 
                        ORDER BY 
                            CASE 
                                WHEN $3 % 6 = 0 THEN price
                                WHEN $3 % 6 = 1 THEN -price
                                WHEN $3 % 6 = 2 THEN stock
                                WHEN $3 % 6 = 3 THEN id
                                ELSE RANDOM()
                            END DESC
                    ) as row_num
                FROM pc_parts 
                WHERE 
                    category = ANY($1)
                    AND is_active = true 
                    AND stock > 0
                    AND (kiosk_visible IS NULL OR kiosk_visible = true)
                    AND id != $2
            )
            SELECT id, name, category, brand, price, stock, description, specifications, image_url, is_active
            FROM ranked_products
            WHERE row_num <= 30
            ORDER BY category, row_num
        `, [finalCompatibleCategories, product.id || 0, varietySeed]);
        
        const queryDuration = Date.now() - startTime;
        logger.info(`⚡ Query completed in ${queryDuration}ms (fetched ${allCategoryProducts.rows.length} products)`);
        
        // Group products by category
        const productsByCategory = {};
        allCategoryProducts.rows.forEach(product => {
            if (!productsByCategory[product.category]) {
                productsByCategory[product.category] = [];
            }
            productsByCategory[product.category].push(product);
        });
        
        const finalRecommendations = [];
        
        // Process each category with deterministic analysis
        for (const category of finalCompatibleCategories) {
            try {
                const categoryProducts = productsByCategory[category] || [];
                
                if (categoryProducts.length === 0) {
                    logger.warn(`📭 No products available in ${category} category`);
                    continue;
                }
                
                logger.info(`📦 Processing ${categoryProducts.length} products in ${category}`);
                
                // Shuffle for variety
                const shuffledProducts = categoryProducts.sort(() => Math.random() - 0.5);
                
                // ROOT CAUSE FIX: For PC Customized/Upgrade, check compatibility against ALL selected parts
                // OPTIMIZATION: pass all build parts as context for deterministic candidate filtering.
                let compatibleInCategory;
                if (allBuildParts.length > 1) {
                    // PC Customized or Upgrade: Check candidates against entire build
                    logger.info(`   🔍 Checking compatibility against ${allBuildParts.length} build parts (optimized)`);
                    
                    // OPTIMIZATION: Use the most critical component (CPU or Motherboard) as primary reference
                    // and validate against specs of all other parts
                    const primaryPart = allBuildParts.find(p => p.category === 'CPU') || 
                                       allBuildParts.find(p => p.category === 'Motherboard') || 
                                       allBuildParts[0];
                    
                    logger.info(`   📌 Using ${primaryPart.name} (${primaryPart.category}) as primary reference`);
                    
                    // PHASE 2 OPTIMIZATION: Only use rules for multi-part builds (>= 3 parts)
                    // Rules require loading specs, which is slower for single-product scenarios
                    const shouldUseRules = false;
                    
                    if (shouldUseRules) {
                        // PHASE 2: Use deterministic rule-based filtering FIRST (2,513 rules)
                        // This is faster and more accurate for known compatibility issues.
                        logger.info(`   🎯 PHASE 2: Applying 2,513 deterministic compatibility rules`);
                        
                        const ruleBasedResults = [];
                        const startRuleCheck = Date.now();
                        
                        for (const candidate of shuffledProducts.slice(0, 20)) { // Check more candidates with rules
                            try {
                                // Load build context with all parts' specs
                                const buildContext = {
                                    parts: await Promise.all(allBuildParts.map(async (part) => ({
                                        id: part.id,
                                        category: part.category,
                                        name: part.name,
                                        specs: await compatibilityRules.loadNormalizedSpecs(part.id)
                                    })))
                                };
                                
                                // Load candidate specs
                                const candidateWithSpecs = {
                                    id: candidate.id,
                                    category: candidate.category,
                                    name: candidate.name,
                                    specs: await compatibilityRules.loadNormalizedSpecs(candidate.id)
                                };
                                
                                // Compute compatibility using 2,513 rules
                                const ruleResult = await compatibilityRules.computeCompatibilityScore(
                                    buildContext,
                                    candidateWithSpecs
                                );
                                
                                // Only include if compatible or has minor warnings
                                if (ruleResult.compatible !== false) {
                                    ruleBasedResults.push({
                                        ...candidate,
                                        compatibility_score: ruleResult.score,
                                        compatibility_reason: ruleResult.summary,
                                        compatibility_issues: ruleResult.issues,
                                        validation_method: 'rule_based'
                                    });
                                }
                                
                            } catch (error) {
                                logger.warn(`   ⚠️ Rule check failed for ${candidate.name}: ${error.message}`);
                            }
                        }
                        
                        const ruleDuration = Date.now() - startRuleCheck;
                        logger.info(`   ⚡ Rule-based check completed in ${ruleDuration}ms (${ruleBasedResults.length} compatible)`);
                        
                        // If rules found compatible products, use them.
                        if (ruleBasedResults.length > 0) {
                            compatibleInCategory = ruleBasedResults;
                            logger.info(`   ✅ Using ${ruleBasedResults.length} rule-validated products`);
                        } else {
                            // Fall back to deterministic candidate analysis if rules reject all candidates.
                            logger.info(`   🤖 Rules rejected all candidates, using deterministic candidate analysis`);
                            compatibleInCategory = await compatibilityService.analyzeCompatibility(
                                primaryPart,
                                shuffledProducts.slice(0, 10)
                            );
                            logger.info(`   ✅ Deterministic analysis found ${compatibleInCategory?.length || 0} compatible products`);
                        }
                    } else {
                        // For small builds (< 3 parts), use the deterministic service directly.
                        logger.info(`   Using deterministic analysis for ${allBuildParts.length}-part build`);
                        compatibleInCategory = await compatibilityService.analyzeCompatibility(
                            primaryPart,
                            shuffledProducts.slice(0, 10)
                        );
                        logger.info(`   Deterministic analysis found ${compatibleInCategory?.length || 0} compatible products`);
                    }
                } else {
                    // Product Page: Check compatibility with single reference product
                    compatibleInCategory = await compatibilityService.analyzeCompatibility(
                        product,
                        shuffledProducts.slice(0, 10)
                    );
                }

                if (compatibleInCategory && compatibleInCategory.length > 0) {
                    // Get the best compatible product from this category
                    const bestInCategory = compatibleInCategory
                        .sort((a, b) => b.compatibility_score - a.compatibility_score)[0];
                    
                    finalRecommendations.push(bestInCategory);
                    logger.info(`✅ Added ${category}: ${bestInCategory.name} (Score: ${bestInCategory.compatibility_score})`);
                } else {
                    // Deterministic analysis rejected all candidates.
                    logger.warn(`No deterministic-compatible products found for ${category}; skipping recommendations for this category`);
                    
                    // Get a good product for variety (not always the first one)
                    logger.debug(`Skipped legacy fallback for ${category} because offline mode never recommends hard-incompatible products`);
                    continue;
                    const randomIndex = Math.floor(Math.random() * Math.min(shuffledProducts.length, 3));
                    const fallbackProduct = shuffledProducts[randomIndex];
                    
                    // Add basic compatibility scoring based on price tier and specifications
                    let compatibilityScore = 75; // Base score
                    if (product.price && fallbackProduct.price) {
                        const priceDiff = Math.abs(product.price - fallbackProduct.price) / product.price;
                        if (priceDiff < 0.3) compatibilityScore = 85; // Similar price tier
                        if (priceDiff < 0.1) compatibilityScore = 90; // Very similar price tier
                    }
                    
                    finalRecommendations.push({
                        ...fallbackProduct,
                        compatibility_score: compatibilityScore,
                        compatibility_reason: `Selected ${category} component with ${compatibilityScore}% compatibility`
                    });
                    logger.info(`🔄 Fallback added ${category}: ${fallbackProduct.name} (Score: ${compatibilityScore})`);
                }
            } catch (error) {
                logger.error(`Error processing ${category} products:`, error);
            }
        }
        
        const totalDuration = Date.now() - startTime;
        logger.info(`✅ OPTIMIZATION: Total processing time ${totalDuration}ms (was 30+ seconds)`);

        // Ensure we have exactly the right number of recommendations (1 per category)
        logger.info(`🎯 Final result: ${finalRecommendations.length} products from ${finalCompatibleCategories.length} core categories`);

        if (finalRecommendations.length === 0) {
            logger.warn(`⚠️ No compatible products found in any core category`);
            return res.json({
                success: true,
                data: [],
                message: 'No compatible products found in stock from core categories'
            });
        }

        // Add deterministic cache metadata from selected candidate checks.
        const firstWithMetadata = finalRecommendations.find(r => r.source || r.cached || r.latency);
        const cacheMetadata = firstWithMetadata ? {
            cache: firstWithMetadata.cache || { hit: false, key: null },
            source: 'deterministic',
            latencyMs: firstWithMetadata.latencyMs || null
        } : {
            cache: { hit: false, key: null },
            source: 'deterministic',
            latencyMs: null
        };

        // ===================================================================
        // PHASE 3: STORE RESULT IN CACHE (for 3-5x speedup on next request)
        // ===================================================================
        if (!skipCache && (selectedParts || currentBuild) && finalRecommendations.length > 0) {
            const buildConfiguration = selectedParts || currentBuild;
            const cache_key = generateCacheKey(buildConfiguration);
            
            try {
                const expires_at = new Date();
                expires_at.setDate(expires_at.getDate() + 7); // 7 days TTL

                const responseData = {
                    data: finalRecommendations,
                    deterministicAnalysis: {
                        totalCategories: finalCompatibleCategories.length,
                        productsPerCategory: 1,
                        targetCategories: 7,
                        coreCategories: coreCategories
                    }
                };

                // Calculate overall compatibility score
                const avgScore = finalRecommendations.reduce((sum, p) => sum + (p.compatibility_score || 75), 0) / finalRecommendations.length;
                const issuesCount = finalRecommendations.reduce((sum, p) => sum + (p.compatibility_issues?.length || 0), 0);

                await pool.query(`
                    INSERT INTO compatibility_cache (
                        cache_key, build_parts, compatibility_result,
                        score, issues_count, warnings_count,
                        performance_tier, expires_at, hit_count
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
                    ON CONFLICT (cache_key)
                    DO UPDATE SET
                        compatibility_result = EXCLUDED.compatibility_result,
                        score = EXCLUDED.score,
                        issues_count = EXCLUDED.issues_count,
                        warnings_count = EXCLUDED.warnings_count,
                        performance_tier = EXCLUDED.performance_tier,
                        expires_at = EXCLUDED.expires_at,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `, [
                    cache_key,
                    buildConfiguration,
                    responseData,
                    Math.round(avgScore),
                    issuesCount,
                    0, // warnings_count
                    avgScore >= 85 ? 'high' : avgScore >= 70 ? 'medium' : 'low',
                    expires_at
                ]);

                logger.info(`💾 Cached compatibility result: ${cache_key} (score: ${Math.round(avgScore)}, expires: 7 days)`);
            } catch (cacheError) {
                logger.error(`⚠️ Failed to cache result (non-critical):`, cacheError.message);
                // Don't fail the request if caching fails
            }
        }

        // FIX #6: Transform snake_case to camelCase for frontend consistency
        const transformedRecommendations = finalRecommendations.map(product => ({
            ...product,
            compatibilityScore: product.compatibility_score,
            compatibilityReason: product.compatibility_reason,
            compatibilityIssues: product.deterministic_issues || []
        }));

        res.json({
            success: true,
            source: 'deterministic',
            engine: 'deterministic',
            aiEnabled: false,
            ...summarizeResults(transformedRecommendations),
            data: transformedRecommendations,
            deterministicAnalysis: {
                totalCategories: finalCompatibleCategories.length,
                productsPerCategory: 1,
                targetCategories: 7,
                coreCategories: coreCategories
            },
            ...cacheMetadata,
            message: `Found ${finalRecommendations.length} compatible products from ${finalCompatibleCategories.length} core categories`
        });

    } catch (error) {
        logger.error('❌ Compatibility analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during compatibility analysis',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/compatibility/status
 * Get deterministic compatibility service status for debugging
 */
router.get('/status', async (req, res) => {
    try {
        const status = compatibilityService.getStatus();
        
        res.json({
            success: true,
            data: status,
            message: 'Compatibility service status retrieved'
        });
    } catch (error) {
        logger.error('❌ Error getting compatibility status:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving compatibility service status'
        });
    }
});

/**
 * POST /api/compatibility/analyze-bulk
 * Bulk compatibility analysis for all products in a category against cart items
 * This is used by PC-Parts page to show badges on ALL products, not just 1 per category
 * PHASE 9: Added JSON Schema validation
 */
router.post('/analyze-bulk', kioskGeneralLimit, validateCompatibilityAnalysis, async (req, res) => {
    try {
        const { cartItems, targetProducts, currentCategory } = req.body;

        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart items are required for bulk analysis'
            });
        }

        if (!targetProducts || !Array.isArray(targetProducts) || targetProducts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Target products are required for bulk analysis'
            });
        }

        logger.info(`🔍 === BULK COMPATIBILITY ANALYSIS ===`);
        logger.info(`📦 Cart items: ${cartItems.length}`);
        logger.info(`🎯 Target products: ${targetProducts.length} in category: ${currentCategory}`);

        const startTime = Date.now();
        const scores = {};

        // FIX #2: Parallel batch processing for 7x speed boost
        // BEFORE: Sequential processing = 35.8s for 29 products
        // AFTER: Parallel batches = <5s for 50 products
        
        // Filter cart items (skip same category)
        const eligibleCartItems = cartItems.filter(cartItem => {
            if (cartItem.category.toUpperCase() === currentCategory?.toUpperCase()) {
                logger.info(`⏭️ Skipping ${cartItem.name} - same category as viewing`);
                return false;
            }
            return true;
        });

        logger.info(`⚡ Processing ${eligibleCartItems.length} cart items in parallel batches...`);

        // Process cart items in parallel batches of 10
        const BATCH_SIZE = 10;
        const allResults = [];

        for (let i = 0; i < eligibleCartItems.length; i += BATCH_SIZE) {
            const batch = eligibleCartItems.slice(i, i + BATCH_SIZE);
            logger.info(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(eligibleCartItems.length / BATCH_SIZE)} (${batch.length} items)`);

            // Analyze all items in batch PARALLEL
            const batchPromises = batch.map(async (cartItem) => {
                try {
                    logger.debug(`🔍 Analyzing ${cartItem.name} (${cartItem.category}) against ${targetProducts.length} products`);

                    // PERFORMANCE FIX: Skip advanced analysis for bulk operations
                    const compatibilityResults = await compatibilityService.analyzeCompatibility(
                        cartItem,
                        targetProducts,
                        { skipAdvanced: true } // Skip power/clearance/bottleneck/thermal/real-world analysis
                    );

                    if (compatibilityResults && compatibilityResults.length > 0) {
                        logger.info(`Deterministic analysis found ${compatibilityResults.length} compatible products for ${cartItem.name}`);
                        return { success: true, results: compatibilityResults, cartItem };
                    } else {
                        logger.warn(`Deterministic analysis found no compatible products for ${cartItem.name}, skipping fallback scoring`);
                        return { success: false, cartItem };
                    }
                } catch (error) {
                    logger.error(`❌ Error analyzing ${cartItem.name}:`, error.message);
                    return { success: false, error, cartItem };
                }
            });

            // Wait for all items in batch to complete
            const batchResults = await Promise.all(batchPromises);
            allResults.push(...batchResults);
        }

        // Accumulate scores from all results
        allResults.forEach(result => {
            if (result.success && result.results) {
                result.results.forEach(r => {
                    const productId = r.id;
                    const compatScore = r.compatibility_score || 75;
                    
                    // Take the MAXIMUM score if multiple cart items are compatible
                    if (!scores[productId] || scores[productId] < compatScore) {
                        scores[productId] = compatScore;
                    }
                });
            }
        });

        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const productsPerSecond = (targetProducts.length / Number.parseFloat(elapsedTime)).toFixed(1);
        
        logger.info(`✅ Bulk analysis complete in ${elapsedTime}s (${productsPerSecond} products/sec)`);
        logger.info(`📊 ${Object.keys(scores).length} products scored`);
        
        // Performance metrics
        const performanceNote = elapsedTime < 5 ? '🚀 EXCELLENT' : elapsedTime < 10 ? '✅ GOOD' : '⚠️ SLOW';
        logger.info(`⏱️ Performance: ${performanceNote} - Target: <5s for 50 products`);


        res.json({
            success: true,
            scores: scores,
            metadata: {
                cartItems: cartItems.length,
                targetProducts: targetProducts.length,
                scoredProducts: Object.keys(scores).length,
                currentCategory: currentCategory,
                source: 'deterministic',
                performance: {
                    elapsedTime: `${elapsedTime}s`,
                    productsPerSecond: Number.parseFloat(productsPerSecond),
                    batchSize: BATCH_SIZE,
                    processedBatches: Math.ceil(eligibleCartItems.length / BATCH_SIZE)
                }
            },
            message: `Analyzed ${targetProducts.length} products against ${eligibleCartItems.length} cart items in ${elapsedTime}s`
        });

    } catch (error) {
        logger.error('❌ Bulk compatibility analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during bulk compatibility analysis',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/compatibility/simple
 * Simple compatibility check without AI (fallback)
 */
router.post('/simple', kioskGeneralLimit, async (req, res) => {
    try {
        const { currentProduct, limit = 6 } = req.body;

        if (!currentProduct) {
            return res.status(400).json({
                success: false,
                message: 'Current product information is required'
            });
        }

        // Simple category-based compatibility - exactly 1 product per category
        const allCategories = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case'];
        const currentCategory = currentProduct.category?.toUpperCase();
        const compatibleCategories = allCategories.filter(cat => cat !== currentCategory);

        const compatibleProducts = [];

        // Get exactly 1 product from each compatible category
        for (const category of compatibleCategories) {
            try {
                // Use the existing stock API query for simple analysis
                const result = await query(`
                    SELECT 
                        id, name, category, brand, price, stock, 
                        description, specifications, image_url, is_active
                    FROM pc_parts 
                    WHERE category = $1 
                    AND is_active = true 
                    AND stock > 0
                    ORDER BY price DESC
                    LIMIT 1
                `, [category]);

                const products = result.rows;

                if (products && products.length > 0) {
                    const product = products[0];
                    compatibleProducts.push({
                        ...product,
                        compatibility_score: 80,
                        compatibility_reason: `Selected ${category} component - category-based compatibility`
                    });
                    logger.info(`✅ Simple mode - Added ${category}: ${product.name}`);
                }
            } catch (error) {
                logger.error(`Error fetching ${category} products:`, error);
            }
        }

        logger.info(`🎯 Simple compatibility analysis: ${compatibleProducts.length} products (1 from each category)`);

        res.json({
            success: true,
            data: compatibleProducts.slice(0, limit),
            deterministicAnalysis: {
                source: 'deterministic',
                method: 'simple_category_based',
                totalCategories: compatibleCategories.length,
                productsPerCategory: 1
            },
            message: `Found ${compatibleProducts.length} compatible products using simple analysis (1 per category)`
        });

    } catch (error) {
        logger.error('❌ Simple compatibility analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during simple compatibility analysis'
        });
    }
});

/**
 * ============================================================================
 * POST /api/compatibility/analyze-enhanced
 * ============================================================================
 * Enhanced compatibility analysis with Phase 2 deterministic rules + AI
 * PCPartPicker-style analysis with badges, issues, and recommendations
 * PHASE 9: Added JSON Schema validation
 */
router.post('/analyze-enhanced', kioskGeneralLimit, validateCompatibilityAnalysis, async (req, res) => {
    try {
        const { currentBuild, candidateCategory, candidateProducts } = req.body;

        logger.info(`📊 Enhanced compatibility analysis for ${candidateCategory} with ${candidateProducts?.length || 0} candidates`);

        if (!candidateProducts || candidateProducts.length === 0) {
            return res.json({
                success: true,
                products: [],
                summary: { total: 0, compatible: 0, incompatible: 0, warnings: 0 }
            });
        }

        // Step 1: Load normalized specs for current build
        const buildContext = await loadBuildContext(currentBuild);

        // Step 2: Analyze each candidate with Phase 2 rules
        const analyzed = await Promise.all(
            candidateProducts.map(async (product) => {
                try {
                    const candidateSpecs = await compatibilityRules.loadNormalizedSpecs(product.id);
                    const candidate = {
                        id: product.id,
                        category: candidateCategory,
                        specs: candidateSpecs
                    };

                    const result = await compatibilityRules.computeCompatibilityScore(buildContext, candidate);
                    const biosWarning = checkBiosWarning(product, buildContext, candidateCategory);

                    return {
                        ...product,
                        compatible: result.compatible,
                        badge: result.badge,
                        compatibilityScore: result.percentageScore,
                        deterministicScore: result.score,
                        maxScore: result.maxScore,
                        issues: result.issues || [],
                        recommendations: result.recommendations || [],
                        ruleResults: result.ruleResults || {},
                        biosWarning: biosWarning,
                        disabled: !result.compatible
                    };
                } catch (error) {
                    logger.error(`Error analyzing product ${product.id}:`, error);
                    return {
                        ...product,
                        compatible: false,
                        badge: '❌ Incompatible',
                        compatibilityScore: 0,
                        issues: [{ severity: 'critical', message: 'Analysis failed', details: error.message }],
                        recommendations: [],
                        disabled: true
                    };
                }
            })
        );

        analyzed.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

        const summary = {
            total: analyzed.length,
            compatible: analyzed.filter(p => p.badge === '✅ Compatible').length,
            incompatible: analyzed.filter(p => p.badge === '❌ Incompatible').length,
            warnings: analyzed.filter(p => p.badge === '⚠️ May Work').length
        };

        logger.info(`✅ Analysis complete: ${summary.compatible} compatible, ${summary.incompatible} incompatible, ${summary.warnings} warnings`);

        res.json({ success: true, products: analyzed, summary: summary });
    } catch (error) {
        logger.error('Enhanced compatibility analysis failed:', error);
        res.status(500).json({ success: false, error: error.message, products: [], summary: { total: 0, compatible: 0, incompatible: 0, warnings: 0 } });
    }
});

/**
 * ============================================================================
 * POST /api/compatibility/batch-analyze
 * ============================================================================
 * Batch analyze multiple candidates - used by hierarchical selection
 */
router.post('/batch-analyze', kioskGeneralLimit, async (req, res) => {
    try {
        const { currentBuild, candidates } = req.body;
        if (!candidates || candidates.length === 0) {
            return res.json({ success: true, results: [] });
        }

        const [hydratedContext, hydratedCandidates] = await Promise.all([
            hydrateParts(toPartArray(currentBuild)),
            hydrateParts(toPartArray(candidates))
        ]);

        const ranked = await compatibilityService.analyzeBatch(hydratedContext, hydratedCandidates, {
            mode: 'legacy_batch_analyze'
        });
        const results = ranked.map((product) => ({
            productId: product.id,
            compatible: product.compatible,
            badge: product.compatible === false
                ? 'Incompatible'
                : product.verdict === 'warning'
                    ? 'May Work'
                    : 'Compatible',
            score: product.compatibility_score,
            issues: product.deterministic_issues || product.compatibility_issues || [],
            warnings: product.warnings || [],
            recommendations: product.manualChecks || [],
            source: 'deterministic',
            verdict: product.verdict,
            rulesApplied: product.rulesApplied || []
        }));

        res.json({ success: true, results: results });
    } catch (error) {
        logger.error('Batch analysis failed:', error);
        res.status(500).json({ success: false, error: error.message, results: [] });
    }
});

/**
 * ============================================================================
 * POST /api/compatibility/explain
 * ============================================================================
 * Get detailed compatibility explanation - used by "Why Incompatible?" modal
 */
router.post('/explain', kioskGeneralLimit, async (req, res) => {
    try {
        const { currentBuild, productId, category } = req.body;
        const buildContext = await loadBuildContext(currentBuild);
        const productSpecs = await compatibilityRules.loadNormalizedSpecs(productId);
        const candidate = { id: productId, category: category, specs: productSpecs };
        const result = await compatibilityRules.computeCompatibilityScore(buildContext, candidate);

        const productResult = await query('SELECT * FROM pc_parts WHERE id = $1', [productId]);
        const product = productResult.rows[0];

        res.json({
            success: true,
            product: product,
            analysis: {
                compatible: result.compatible,
                badge: result.badge,
                score: result.percentageScore,
                maxScore: result.maxScore,
                issues: result.issues,
                recommendations: result.recommendations,
                ruleResults: result.ruleResults
            }
        });
    } catch (error) {
        logger.error('Compatibility explanation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * ============================================================================
 * Helper Functions
 * ============================================================================
 */

async function loadBuildContext(currentBuild) {
    if (!currentBuild) return {};
    const context = {};

    for (const [category, component] of Object.entries(currentBuild)) {
        if (!component || !component.id) continue;
        try {
            const specs = await compatibilityRules.loadNormalizedSpecs(component.id);
            context[category.toLowerCase()] = { id: component.id, specs: specs };
        } catch (error) {
            logger.warn(`Failed to load specs for ${category}:`, error.message);
        }
    }
    return context;
}

function checkBiosWarning(product, buildContext, category) {
    try {
        if (category !== 'CPU' && category !== 'Motherboard') return null;

        if (category === 'CPU' && buildContext.motherboard) {
            const mbChipset = buildContext.motherboard.specs?.chipset?.toLowerCase() || '';
            const cpuGen = extractCpuGeneration(product.name);

            if (cpuGen === '7000' && ['x570', 'b550'].some(c => mbChipset.includes(c))) {
                return { severity: 'warning', message: 'BIOS update required', details: 'Ryzen 7000 series requires BIOS update on X570/B550 motherboards' };
            }
            if (cpuGen === '5000' && ['x470', 'b450', 'a320'].some(c => mbChipset.includes(c))) {
                return { severity: 'warning', message: 'BIOS update required', details: 'Ryzen 5000 series requires BIOS update on 400-series motherboards' };
            }
            if (['13', '14'].includes(cpuGen) && ['z690', 'b660', 'h670'].some(c => mbChipset.includes(c))) {
                return { severity: 'warning', message: 'BIOS update may be required', details: '13th/14th gen Intel may require BIOS update on 600-series motherboards' };
            }
        }

        if (category === 'Motherboard' && buildContext.cpu) {
            const mbChipset = extractChipset(product.name, product.specifications);
            const cpuGen = extractCpuGeneration(buildContext.cpu.specs?.name || '');

            if (cpuGen === '7000' && ['x570', 'b550'].some(c => mbChipset.includes(c))) {
                return { severity: 'warning', message: 'BIOS update required', details: 'This motherboard requires BIOS update for Ryzen 7000 series' };
            }
            if (['13', '14'].includes(cpuGen) && ['z690', 'b660'].some(c => mbChipset.includes(c))) {
                return { severity: 'warning', message: 'BIOS update may be required', details: 'This motherboard may need BIOS update for 13th/14th gen Intel' };
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

function extractCpuGeneration(name) {
    if (!name) return null;
    const nameLower = name.toLowerCase();
    if (nameLower.includes('ryzen')) {
        if (nameLower.match(/7\d{3}/)) return '7000';
        if (nameLower.match(/5\d{3}/)) return '5000';
        if (nameLower.match(/3\d{3}/)) return '3000';
    }
    if (nameLower.includes('core')) {
        if (nameLower.match(/i[3579][- ]14\d{3}/)) return '14';
        if (nameLower.match(/i[3579][- ]13\d{3}/)) return '13';
        if (nameLower.match(/i[3579][- ]12\d{3}/)) return '12';
    }
    return null;
}

function extractChipset(name, specifications) {
    const nameLower = name.toLowerCase();
    const specsStr = typeof specifications === 'string' ? specifications.toLowerCase() : JSON.stringify(specifications).toLowerCase();
    const chipsets = ['x670e', 'x670', 'b650', 'a620', 'x570', 'b550', 'x470', 'b450', 'z790', 'z690', 'b760', 'b660', 'h770', 'h670'];
    for (const chipset of chipsets) {
        if (nameLower.includes(chipset) || specsStr.includes(chipset)) return chipset;
    }
    return '';
}

/**
 * GET /api/compatibility/rules
 * Retrieve all compatibility rules with filtering and statistics
 */
router.get('/rules', async (req, res) => {
    try {
        const { category, severity, enabled } = req.query;

        // Build WHERE clause dynamically
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (category) {
            whereConditions.push(`rule_category = $${paramIndex++}`);
            params.push(category);
        }

        if (severity) {
            whereConditions.push(`severity = $${paramIndex++}`);
            params.push(severity);
        }

        if (enabled !== undefined) {
            whereConditions.push(`enabled = $${paramIndex++}`);
            params.push(enabled === 'true' || enabled === true);
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';

        // Get rules
        const rulesQuery = `
            SELECT 
                id,
                rule_name,
                rule_category,
                component_a_category,
                component_b_category,
                rule_type,
                rule_expression,
                severity,
                error_message,
                solution_message,
                priority,
                enabled,
                created_at,
                updated_at
            FROM compatibility_rules
            ${whereClause}
            ORDER BY priority DESC, rule_category, rule_name
        `;

        const rulesResult = await query(rulesQuery, params);

        // Get statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_rules,
                COUNT(CASE WHEN enabled = true THEN 1 END) as enabled_rules,
                COUNT(DISTINCT rule_category) as total_categories,
                COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_rules,
                COUNT(CASE WHEN severity = 'error' THEN 1 END) as error_rules,
                COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_rules,
                COUNT(CASE WHEN severity = 'info' THEN 1 END) as info_rules
            FROM compatibility_rules
            ${whereClause}
        `;

        const statsResult = await query(statsQuery, params);

        // Get category breakdown
        const categoryQuery = `
            SELECT 
                rule_category,
                COUNT(*) as count,
                COUNT(CASE WHEN enabled = true THEN 1 END) as enabled_count,
                ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM compatibility_rules ${whereClause})), 2) as percentage
            FROM compatibility_rules
            ${whereClause}
            GROUP BY rule_category
            ORDER BY count DESC
        `;

        const categoryResult = await query(categoryQuery, params);

        res.json({
            success: true,
            data: {
                rules: rulesResult.rows,
                statistics: statsResult.rows[0],
                categoryBreakdown: categoryResult.rows
            },
            meta: {
                totalCount: rulesResult.rows.length,
                filters: { category, severity, enabled },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Error fetching compatibility rules:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch compatibility rules',
            error: error.message
        });
    }
});

/**
 * GET /api/compatibility/rules/stats
 * Get comprehensive rule statistics
 */
router.get('/rules/stats', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_rules,
                COUNT(CASE WHEN enabled = true THEN 1 END) as enabled_rules,
                COUNT(CASE WHEN enabled = false THEN 1 END) as disabled_rules,
                COUNT(DISTINCT rule_category) as total_categories,
                COUNT(DISTINCT component_a_category) as component_types_covered,
                COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_rules,
                COUNT(CASE WHEN severity = 'error' THEN 1 END) as error_rules,
                COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_rules,
                COUNT(CASE WHEN severity = 'info' THEN 1 END) as info_rules,
                MIN(created_at) as oldest_rule,
                MAX(created_at) as newest_rule
            FROM compatibility_rules
        `;

        const statsResult = await query(statsQuery);

        res.json({
            success: true,
            data: statsResult.rows[0],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching rule statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rule statistics',
            error: error.message
        });
    }
});

/**
 * POST /api/compatibility/advanced/full-build
 * Comprehensive compatibility analysis for complete builds
 * Used by OrderSummary pages for full build validation
 * PHASE 11: Integrated with comprehensive compatibilityRules.js (23 rules + PHASE 3/4 enhancements)
 * PHASE 12: Added detailed compatibility service with verbose, real-world notes
 */
router.post('/advanced/full-build', kioskGeneralLimit, validateFullBuildAnalysis, async (req, res) => {
    try {
        const { components } = req.body;

        logger.info('🔍 Full build compatibility check requested');
        logger.info('📦 Components:', Object.keys(components || {}).join(', '));

        // Validate input
        if (!components || typeof components !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Components object is required',
                hint: 'Provide components as { cpu: {...}, gpu: {...}, motherboard: {...}, ... }'
            });
        }

        // Check if we have any components
        const componentKeys = Object.keys(components);
        if (componentKeys.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one component is required',
                hint: 'Add components to your build before checking compatibility'
            });
        }

        const deterministicResult = await compatibilityService.analyzeFullBuild(components);
        const contract = toCompatibilityContract(deterministicResult);
        return res.json({
            success: true,
            source: 'deterministic',
            engine: 'deterministic',
            aiEnabled: false,
            data: deterministicResult,
            compatible: contract.compatible,
            status: contract.status,
            score: contract.score,
            verdict: deterministicResult.verdict,
            problems: deterministicResult.problems,
            issues: contract.issues,
            warnings: contract.warnings,
            notes: deterministicResult.notes,
            manualChecks: deterministicResult.manualChecks,
            missingSpecs: contract.missingSpecs,
            rulesApplied: deterministicResult.rulesApplied,
            latencyMs: deterministicResult.latencyMs,
            cache: deterministicResult.cache,
            timestamp: new Date().toISOString()
        });

        // PHASE 11: Use comprehensive analyzeFullBuild with compatibilityRules integration
        // This includes ALL 23 validation rules + PHASE 3/4 enhancements
        const analysisResult = await advancedCompatibilityService.analyzeFullBuild(components);

        // PHASE 12: Run detailed compatibility service for verbose notes
        const detailedResult = await detailedCompatibilityService.validateFullBuild(components);

        // CRITICAL NULL SAFETY: Check if services returned error objects
        // 🔥 FIX: Use strict null check - score of 0 is VALID (highly incompatible build)
        if (analysisResult.overall_status === 'error' || analysisResult.compatibility_score === undefined || analysisResult.compatibility_score === null) {
            logger.error('❌ Analysis service returned error:', analysisResult.error);
            return res.status(500).json({
                success: false,
                message: 'Compatibility analysis failed',
                error: analysisResult.error || 'Unknown error in analysis service',
                hint: 'One or more validation rules failed. Check backend logs for details.'
            });
        }

        // 🔥 FIX: REMOVED INCORRECT VALIDATION ERROR CHECK
        // The detailedCompatibilityService is designed to catch errors and return them as issues
        // This is NOT a service failure - it's a handled validation error that should be shown to user
        // Only the analysisResult check above is needed for actual service failures

        // ===================================================================
        // DEDUPLICATION & ENHANCEMENT: Remove duplicate issues and add detailed specs
        // ===================================================================
        
        /**
         * Deduplicate issues by creating a unique signature for each issue
         * ENHANCED: More aggressive deduplication using issue type only for critical issues
         * IGNORES layer property - multiple validation layers can find the same incompatibility
         */
        const deduplicateIssues = (issues) => {
            const seen = new Set();
            const uniqueIssues = [];
            
            console.log(`\n🔍 DEDUPLICATION DEBUG:`);
            
            issues.forEach((issue, index) => {
                // NULL SAFETY: Skip invalid issues
                if (!issue || typeof issue !== 'object') {
                    console.log(`   [${index}] ⚠️ SKIP (invalid issue object)`);
                    return;
                }
                
                // Create normalized signature from message
                const message = (issue.message || issue.issue || String(issue)).toLowerCase()
                    .replace(/\s+/g, ' ')
                    .replace(/[^\w\s]/g, '')
                    .trim();
                
                // Extract key terms to identify the issue type
                const issueType = message.includes('socket') && message.includes('mismatch') ? 'socket' :
                                message.includes('socket') && message.includes('incompatible') ? 'socket' :
                                message.includes('form factor') && message.includes('incompatible') ? 'formfactor' :
                                message.includes('memory type') || message.includes('ram type') ? 'ramtype' :
                                message.includes('gpu') && message.includes('length') && message.includes('exceed') ? 'gpulength' :
                                message.includes('cooler') && message.includes('height') && message.includes('exceed') ? 'coolerheight' :
                                message.includes('no cpu cooler') || message.includes('cpu cooler selected') ? 'nocooler' :
                                message.includes('no psu') || message.includes('psu selected') ? 'nopsu' :
                                message.includes('pcie') && (message.includes('multi') || message.includes('electrical')) ? 'multigpu' :
                                'other';
                
                const severity = issue.severity || 'warning';
                
                // For critical issues with same type, deduplicate aggressively (use only severity + type)
                // For other issues, include message snippet for more precise matching
                let signature;
                if (severity === 'critical' && (issueType === 'socket' || issueType === 'nocooler' || issueType === 'formfactor' || issueType === 'ramtype' || issueType === 'gpulength')) {
                    signature = `${severity}:${issueType}`;
                } else {
                    signature = `${severity}:${issueType}:${message.substring(0, 30)}`;
                }
                
                console.log(`   [${index}] Type="${issueType}", Severity="${severity}", Signature="${signature}"`);
                console.log(`       Message: "${message.substring(0, 80)}..."`);
                console.log(`       Layer: ${issue.layer || 'unknown'}, Component: ${issue.component || 'unknown'}`);
                
                if (!seen.has(signature)) {
                    seen.add(signature);
                    uniqueIssues.push(issue);
                    console.log(`       ✅ KEEP (first occurrence of signature)`);
                } else {
                    console.log(`       🔄 DEDUPE (duplicate signature already seen)`);
                }
            });
            
            console.log(`\n✅ Deduplication: ${issues.length} → ${uniqueIssues.length} (removed ${issues.length - uniqueIssues.length} duplicates)\n`);
            return uniqueIssues;
        };

        /**
         * Enhance issue messages with specific numerical details and component specs
         * ENHANCED: Replaces "unknown" messages with specific data or actionable fallbacks
         */
        const enhanceIssueDetails = (issue, components) => {
            // NULL SAFETY: Handle invalid issues
            if (!issue || typeof issue !== 'object') {
                return { message: 'Invalid issue', severity: 'warning', details: 'Issue data malformed' };
            }
            
            let enhanced = { ...issue };
            const msg = (issue.message || issue.issue || '').toLowerCase();
            
            // Add socket details (AM4 vs AM5, LGA1700, etc.)
            if (msg.includes('socket')) {
                const cpu = components.cpu || components.CPU;
                const mb = components.motherboard || components.Motherboard;
                
                if (cpu && mb) {
                    const cpuSocket = cpu.specifications?.socket || extractSocketFromName(cpu.name) || 'Unknown';
                    const mbSocket = mb.specifications?.socket || extractSocketFromName(mb.name) || 'Unknown';
                    
                    if (cpuSocket !== 'Unknown' && mbSocket !== 'Unknown') {
                        enhanced.message = `Socket mismatch: ${cpu.name} (${cpuSocket}) incompatible with ${mb.name} (${mbSocket})`;
                        enhanced.details = `CPU socket ${cpuSocket} does not match motherboard socket ${mbSocket}. These sockets are physically incompatible.`;
                    } else if (cpuSocket !== 'Unknown') {
                        enhanced.message = `Socket compatibility issue: ${cpu.name} (${cpuSocket}) - verify motherboard socket compatibility`;
                        enhanced.details = `CPU uses ${cpuSocket} socket. Ensure motherboard supports ${cpuSocket}.`;
                    } else if (mbSocket !== 'Unknown') {
                        enhanced.message = `Socket compatibility issue: ${mb.name} (${mbSocket}) - verify CPU socket compatibility`;
                        enhanced.details = `Motherboard uses ${mbSocket} socket. Ensure CPU is compatible with ${mbSocket}.`;
                    }
                }
            }
            
            // Add GPU length details (numerical measurements)
            if (msg.includes('gpu') && msg.includes('length')) {
                const gpu = components.gpu || components.GPU;
                const pcCase = components.case || components.Case;
                
                if (gpu && pcCase) {
                    // 🔥 FIX: Check dimensions FIRST (most reliable), then specifications
                    const gpuDims = gpu.dimensions || {};
                    const gpuSpecs = gpu.specifications || {};
                    const caseDims = pcCase.dimensions || {};
                    const caseSpecs = pcCase.specifications || {};
                    
                    // GPU length: dimensions > specifications
                    const gpuLength = gpuDims.length_mm || gpuSpecs.length_mm || gpuSpecs.Length || gpuSpecs.length || extractLengthFromName(gpu.name);
                    
                    // 🔥 CRITICAL FIX: Case GPU clearance: dimensions > specifications
                    // Also handle string format like "265mm" and convert to number
                    let caseMaxGPU = caseDims.max_gpu_length_mm || caseSpecs.max_gpu_length_mm || caseSpecs['Max Gpu Length'] || 0;
                    
                    // 🔥 Handle string format like "265mm" from specifications.max_gpu_length
                    if (!caseMaxGPU && caseSpecs.max_gpu_length) {
                        const parsed = String(caseSpecs.max_gpu_length).replace(/[^\d.]/g, '');
                        caseMaxGPU = parsed ? Number.parseFloat(parsed) : 0;
                    }
                    
                    if (gpuLength && caseMaxGPU) {
                        const diff = gpuLength - caseMaxGPU;
                        enhanced.message = `GPU ${gpu.name} (${gpuLength}mm) exceeds case ${pcCase.name} max clearance (${caseMaxGPU}mm)`;
                        enhanced.details = `GPU length ${gpuLength}mm is ${diff}mm longer than case maximum ${caseMaxGPU}mm. GPU will not physically fit.`;
                    } else if (gpuLength) {
                        enhanced.message = `GPU ${gpu.name} length is ${gpuLength}mm - verify case GPU clearance`;
                        enhanced.details = `GPU is ${gpuLength}mm long. Check case specifications for max GPU length support.`;
                    } else if (caseMaxGPU) {
                        enhanced.message = `Case ${pcCase.name} supports GPUs up to ${caseMaxGPU}mm - verify GPU length`;
                        enhanced.details = `Case has ${caseMaxGPU}mm GPU clearance. Check GPU specifications for length.`;
                    }
                }
            }
            
            // Add form factor details (ATX vs Micro-ATX vs Mini-ITX)
            if (msg.includes('form factor')) {
                const mb = components.motherboard || components.Motherboard;
                const pcCase = components.case || components.Case;
                
                if (mb && pcCase) {
                    const mbFormFactor = mb.specifications?.form_factor || extractFormFactorFromName(mb.name) || 'Unknown';
                    let caseFormFactors = pcCase.specifications?.supported_form_factors || [];
                    // 🔥 FIX: Ensure it's always an array (could be string from DB)
                    if (!Array.isArray(caseFormFactors)) {
                        caseFormFactors = typeof caseFormFactors === 'string' ? [caseFormFactors] : [];
                    }
                    
                    if (mbFormFactor !== 'Unknown' && caseFormFactors.length > 0) {
                        enhanced.message = `Form factor incompatible: ${mb.name} (${mbFormFactor}) not supported by ${pcCase.name} (${caseFormFactors.join(', ')})`;
                        enhanced.details = `Motherboard form factor ${mbFormFactor} does not fit in case that supports ${caseFormFactors.join(', ')}.`;
                    } else if (mbFormFactor !== 'Unknown') {
                        enhanced.message = `Form factor check needed: ${mb.name} is ${mbFormFactor} - verify case compatibility`;
                        enhanced.details = `Motherboard is ${mbFormFactor} form factor. Ensure case supports this form factor.`;
                    }
                }
            }
            
            // Add RAM type details (DDR4 vs DDR5)
            if (msg.includes('memory') || msg.includes('ram')) {
                const ram = components.ram || components.RAM;
                const mb = components.motherboard || components.Motherboard;
                
                if (ram && mb) {
                    const ramType = ram.specifications?.type || ram.specifications?.memory_type || extractRAMTypeFromName(ram.name) || 'Unknown';
                    const mbType = mb.specifications?.memory_type || extractRAMTypeFromName(mb.name) || 'Unknown';
                    
                    if (ramType !== 'Unknown' && mbType !== 'Unknown' && ramType !== mbType) {
                        enhanced.message = `Memory type incompatible: ${ram.name} (${ramType}) vs ${mb.name} (${mbType})`;
                        enhanced.details = `RAM type ${ramType} is physically incompatible with motherboard ${mbType} slots. Notch positions differ.`;
                    } else if (ramType !== 'Unknown') {
                        enhanced.message = `RAM ${ram.name} is ${ramType} - verify motherboard memory type support`;
                        enhanced.details = `RAM uses ${ramType} modules. Ensure motherboard supports ${ramType}.`;
                    }
                }
            }
            
            // Add cooler height details (ONLY if cooler actually exceeds - strict validation)
            if (msg.includes('cooler') && msg.includes('height')) {
                const cooler = components.cooling || components.Cooling;
                const pcCase = components.case || components.Case;
                
                if (cooler && pcCase) {
                    const coolerHeight = cooler.specifications?.height || cooler.specifications?.height_mm || extractHeightFromName(cooler.name);
                    const caseMaxHeight = pcCase.specifications?.max_cooler_height_mm || pcCase.specifications?.['Max Cpu Cooler Height'] || 999;
                    
                    // ONLY create specific warning if we have actual measurements
                    if (coolerHeight && caseMaxHeight && caseMaxHeight !== 999) {
                        if (coolerHeight > caseMaxHeight) {
                            const overage = coolerHeight - caseMaxHeight;
                            enhanced.message = `Cooler ${cooler.name} (${coolerHeight}mm) exceeds case ${pcCase.name} max height (${caseMaxHeight}mm) by ${overage}mm`;
                            enhanced.details = `Cooler height ${coolerHeight}mm is ${overage}mm too tall for case maximum ${caseMaxHeight}mm. Side panel will not close.`;
                        } else {
                            // Actually compatible! Don't mark as issue
                            const clearance = caseMaxHeight - coolerHeight;
                            enhanced.message = `Cooler ${cooler.name} (${coolerHeight}mm) fits in case ${pcCase.name} (${caseMaxHeight}mm max) with ${clearance}mm clearance`;
                            enhanced.severity = 'compatible'; // Mark as compatible, not an issue
                        }
                    } else if (coolerHeight) {
                        enhanced.message = `Cooler ${cooler.name} height is ${coolerHeight}mm - verify case CPU cooler clearance`;
                        enhanced.details = `Cooler is ${coolerHeight}mm tall. Check case specifications for max cooler height.`;
                    } else if (caseMaxHeight && caseMaxHeight !== 999) {
                        enhanced.message = `Case ${pcCase.name} supports coolers up to ${caseMaxHeight}mm - verify cooler height`;
                        enhanced.details = `Case has ${caseMaxHeight}mm cooler clearance. Check cooler specifications for height.`;
                    }
                }
            }
            
            return enhanced;
        };
        
        /**
         * Helper functions to extract specs from product names when DB specs are missing
         */
        const extractSocketFromName = (name) => {
            if (!name) return null;
            const socketPatterns = [
                /\b(AM4|AM5)\b/i,
                /\b(LGA\s*1700|LGA1700)\b/i,
                /\b(LGA\s*1200|LGA1200)\b/i,
                /\b(LGA\s*1151|LGA1151)\b/i,
                /\b(LGA\s*2066|LGA2066)\b/i,
                /\b(TR4|sTRX4|sTR5)\b/i
            ];
            for (const pattern of socketPatterns) {
                const match = name.match(pattern);
                if (match) return match[1].toUpperCase().replace(/\s/g, '');
            }
            return null;
        };
        
        const extractFormFactorFromName = (name) => {
            if (!name) return null;
            if (/mini.?itx/i.test(name)) return 'Mini-ITX';
            if (/micro.?atx/i.test(name)) return 'Micro-ATX';
            if (/e.?atx|eatx/i.test(name)) return 'E-ATX';
            if (/\batx\b/i.test(name)) return 'ATX';
            return null;
        };
        
        const extractRAMTypeFromName = (name) => {
            if (!name) return null;
            if (/ddr5/i.test(name)) return 'DDR5';
            if (/ddr4/i.test(name)) return 'DDR4';
            if (/ddr3/i.test(name)) return 'DDR3';
            return null;
        };
        
        const extractLengthFromName = (name) => {
            if (!name) return null;
            const match = name.match(/(\d{2,3})\s*mm/i);
            return match ? Number.parseInt(match[1], 10) : null;
        };
        
        const extractHeightFromName = (name) => {
            if (!name) return null;
            const match = name.match(/(\d{2,3})\s*mm/i);
            return match ? Number.parseInt(match[1], 10) : null;
        };

        // Merge and deduplicate issues - CROSS-SEVERITY DEDUPLICATION
        // This prevents the SAME issue from appearing in BOTH critical AND warnings sections
        const allFromAnalysis = [
            ...(analysisResult.critical_issues || []),
            ...(analysisResult.warnings || [])
        ];
        
        const allFromDetailed = [
            ...(detailedResult.criticalIssues || []),
            ...(detailedResult.warnings || [])
        ];
        
        // ENHANCED: First collect ALL issues, then deduplicate ACROSS severities
        // Socket mismatch should ONLY appear in critical OR warnings, not both
        const allCombined = [...allFromAnalysis, ...allFromDetailed];
        
        /**
         * ULTRA-AGGRESSIVE CROSS-SEVERITY DEDUPLICATION
         * Extracts issue type from message to identify same issues regardless of severity
         */
        const getIssueTypeSignature = (message) => {
            // NULL SAFETY: Handle undefined, null, or non-string messages
            if (!message || typeof message !== 'string') {
                return 'OTHER_INVALID_MESSAGE';
            }
            const msg = message.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
            
            // Socket issues (CPU-Motherboard)
            if ((msg.includes('socket') && (msg.includes('mismatch') || msg.includes('incompatible'))) ||
                (msg.includes('am4') && msg.includes('am5')) ||
                (msg.includes('lga') && msg.includes('incompatible'))) {
                return 'SOCKET_MISMATCH';
            }
            
            // Form factor issues (Motherboard-Case)
            if ((msg.includes('form factor') && msg.includes('incompatible')) ||
                (msg.includes('atx') && msg.includes('not supported')) ||
                (msg.includes('micro') && msg.includes('not fit'))) {
                return 'FORMFACTOR_MISMATCH';
            }
            
            // RAM type issues (DDR4 vs DDR5)
            if ((msg.includes('memory type') && msg.includes('incompatible')) ||
                (msg.includes('ram type') && msg.includes('incompatible')) ||
                (msg.includes('ddr4') && msg.includes('ddr5'))) {
                return 'RAM_TYPE_MISMATCH';
            }
            
            // GPU length issues
            if ((msg.includes('gpu') && msg.includes('length') && (msg.includes('exceed') || msg.includes('clearance'))) ||
                (msg.includes('gpu') && msg.includes('fit') && msg.includes('case'))) {
                return 'GPU_LENGTH';
            }
            
            // Cooler height issues
            if ((msg.includes('cooler') && msg.includes('height') && (msg.includes('exceed') || msg.includes('clearance'))) ||
                (msg.includes('cooler') && msg.includes('fit') && msg.includes('case'))) {
                return 'COOLER_HEIGHT';
            }
            
            // Missing components
            if (msg.includes('no cpu cooler') || msg.includes('cpu cooler selected') || msg.includes('missing cpu cooler')) {
                return 'NO_COOLER';
            }
            if (msg.includes('no psu') || msg.includes('psu selected') || msg.includes('missing psu')) {
                return 'NO_PSU';
            }
            
            // Power issues
            if ((msg.includes('power') && msg.includes('exceed')) || 
                (msg.includes('wattage') && msg.includes('insufficient'))) {
                return 'POWER_EXCEEDED';
            }
            
            // Multi-GPU / PCIe lane issues
            if ((msg.includes('pcie') && (msg.includes('multi') || msg.includes('electrical') || msg.includes('lane'))) ||
                (msg.includes('sli') || msg.includes('crossfire'))) {
                return 'MULTI_GPU_PCIE';
            }
            
            // Cooler socket support
            if (msg.includes('cooler') && msg.includes('socket') && msg.includes('support')) {
                return 'COOLER_SOCKET';
            }
            
            // For other messages, create signature from first 40 chars to catch similar messages
            return `OTHER_${msg.substring(0, 40)}`;
        };
        
        // Create issue type signatures to detect cross-severity duplicates
        const issueTypeSignatures = new Map(); // signature -> {item, severity, priority}
        
        // Priority order: critical > warning > info (lower number = higher priority)
        const severityPriority = { critical: 1, error: 1, warning: 2, info: 3, note: 4 };
        
        console.log(`\n🔍 CROSS-SEVERITY DEDUPLICATION:`);
        console.log(`   Total items to process: ${allCombined.length}`);
        
        allCombined.forEach((item, idx) => {
            const message = item.message || item.issue || String(item);
            const issueType = getIssueTypeSignature(message);
            const severity = (item.severity || 'warning').toLowerCase();
            const priority = severityPriority[severity] || 2;
            
            console.log(`   [${idx}] Type="${issueType}" Severity="${severity}" Priority=${priority}`);
            console.log(`       Msg: "${message.substring(0, 60)}..."`);
            
            // Keep only the HIGHEST severity version of each issue type
            if (!issueTypeSignatures.has(issueType)) {
                issueTypeSignatures.set(issueType, { item: { ...item, severity }, severity, priority });
                console.log(`       ✅ KEEP (first occurrence)`);
            } else {
                const existing = issueTypeSignatures.get(issueType);
                if (priority < existing.priority) {
                    // This version has higher severity - replace
                    issueTypeSignatures.set(issueType, { item: { ...item, severity }, severity, priority });
                    console.log(`       🔄 REPLACE (higher severity: ${severity} > ${existing.severity})`);
                } else {
                    console.log(`       🗑️ DISCARD (duplicate, lower/equal severity)`);
                }
            }
        });
        
        // Now separate by final severity (after cross-severity deduplication)
        let allIssues = [];
        let allWarnings = [];
        
        issueTypeSignatures.forEach(({ item, severity }) => {
            // Force severity to be 'critical' for allIssues
            if (severity === 'critical' || severity === 'error') {
                allIssues.push({ ...item, severity: 'critical' });
            } else {
                allWarnings.push({ ...item, severity: 'warning' });
            }
        });
        
        console.log(`\n📊 AFTER CROSS-SEVERITY DEDUP:`);
        console.log(`   Unique issue types: ${issueTypeSignatures.size}`);
        console.log(`   Critical issues: ${allIssues.length}`);
        console.log(`   Warnings: ${allWarnings.length}`);
        
        console.log(`\n📊 BEFORE DEDUPLICATION:`);
        console.log(`   analysisResult.critical_issues: ${(analysisResult.critical_issues || []).length} issues`);
        console.log(`   analysisResult.warnings: ${(analysisResult.warnings || []).length} warnings`);
        console.log(`   detailedResult.criticalIssues: ${(detailedResult.criticalIssues || []).length} issues`);
        console.log(`   detailedResult.warnings: ${(detailedResult.warnings || []).length} warnings`);
        console.log(`   TOTAL allIssues (severity=critical): ${allIssues.length}`);
        console.log(`   TOTAL allWarnings (severity!=critical): ${allWarnings.length}`);
        
        // Log socket mismatch issues before deduplication
        const socketIssuesBefore = [...allIssues, ...allWarnings].filter(i => {
            const msg = (i.message || '').toLowerCase();
            return msg.includes('socket') && (msg.includes('mismatch') || msg.includes('incompatible'));
        });
        console.log(`   Socket mismatch issues BEFORE dedup (from both arrays): ${socketIssuesBefore.length}`);
        socketIssuesBefore.forEach((issue, idx) => {
            console.log(`      ${idx + 1}. "${issue.message}" [severity: ${issue.severity}] [in: ${issue.severity === 'critical' ? 'CRITICAL' : 'WARNINGS'}]`);
        });
        
        // Filter out optimization warnings (these belong in compatible notes, not warnings)
        // Also filter out "unknown/cannot verify" messages - they clutter the UI
        // 🔥 CRITICAL FIX: Aggressively filter non-actionable messages to clean up Order Summary
        const optimizationKeywords = [
            'motherboard has',
            'm.2 slot',
            'm2 slot',
            'extra storage',
            'supports newer',
            'pcie generation',
            'electrically x4',
            'x16 slots are',
            'rule: optimization',
            'storage slots available',
            'expansion slot',
            'supports ddr',
            'pcie 4.0',
            'pcie 5.0',
            'sata port',
            // NEW: Additional optimization/info messages that belong in Compatible section
            'slot available',
            'slots available',
            'port available',
            'ports available',
            'supported',
            'can support',
            'will support',
            'enough power',
            'sufficient power',
            'adequate power',
            'adequate cooling',
            'sufficient cooling',
            'headroom',
            'within spec',
            'within specifications',
            'meets requirements',
            'is sufficient',
            // More optimization patterns
            'gpu supports',
            'cpu supports',
            'ram supports',
            'memory supports',
            'backward compatible',
            'forward compatible',
            'newer generation',
            'older generation',
            'fully compatible',
            'is compatible with',
            'works with',
            'nvme slot',
            // 🔥 NEW: RAM and storage slot availability (positive info, not warnings)
            'ram slots',
            'memory slots',
            '4 ram',
            '2 ram',
            'dimm slots',
            'storage slots',
            'drive bays',
            'sata slots',
            'sata slot',
            'expansion card',
            'pcie slot'
        ];
        
        // NEW: Filter out vague "unknown/cannot verify" messages entirely
        // These don't provide actionable information and clutter the UI
        const vagueMessagePatterns = [
            'compatibility unknown',
            'cannot verify',
            'cannot be verified',
            'specification missing',
            'specs missing',
            'specifications missing',
            'data unavailable',
            'information unavailable',
            'details unavailable',
            'unable to determine',
            'unable to verify',
            'unknown compatibility',
            'compatibility not verified',
            // ENHANCED: More patterns for vague/unhelpful messages
            'height compatibility unknown',
            'length not specified',
            'not specified',
            'check cooler specifications',
            'check motherboard specs',
            'please check',
            'please verify',
            'unknown',  // Catch-all for any "unknown" messages
            'not available',
            'data not available',
            'info not available',
            'rule: optimization', // These are info, not warnings
            'electrically x4',
            'electrically x8',
            'x16 electrical',
            // 🔥 NEW: Filter out chipset info messages (non-actionable)
            'chipset info',
            'chipset information',
            'chipset details',
            'info needed',
            'information needed',
            'details needed'
        ];
        
        // Track filtered optimization notes to add to compatible section
        const filteredOptimizationNotes = [];
        
        allWarnings = allWarnings.filter(warning => {
            const msg = (warning.message || warning.warning || String(warning)).toLowerCase();
            
            // Filter out vague "unknown" messages entirely
            const isVague = vagueMessagePatterns.some(pattern => msg.includes(pattern));
            if (isVague) {
                logger.debug(`🔇 Removed vague message (no useful info): ${msg.substring(0, 50)}...`);
                return false;
            }
            
            // Filter out optimization messages and move to compatible notes
            const isOptimization = optimizationKeywords.some(keyword => msg.includes(keyword));
            if (isOptimization) {
                logger.debug(`🔄 Moved optimization warning to compatible notes: ${msg.substring(0, 50)}...`);
                // Convert to compatible note
                filteredOptimizationNotes.push({
                    message: `✅ ${warning.message || warning.warning}`,
                    details: warning.details || 'System capability noted',
                    category: 'System Capabilities'
                });
                return false;
            }
            
            return true;
        });
        
        // Also filter allIssues for items incorrectly marked as critical
        allIssues = allIssues.filter(issue => {
            const msg = (issue.message || issue.issue || String(issue)).toLowerCase();
            
            // Vague messages shouldn't be critical issues
            const isVague = vagueMessagePatterns.some(pattern => msg.includes(pattern));
            if (isVague) {
                logger.debug(`🔇 Removed vague critical issue: ${msg.substring(0, 50)}...`);
                return false;
            }
            
            // Items marked as 'compatible' by enhanceIssueDetails should be filtered
            if (issue.severity === 'compatible') {
                filteredOptimizationNotes.push({
                    message: `✅ ${issue.message || issue.issue}`,
                    details: issue.details || 'Component compatibility confirmed',
                    category: 'Verified Compatible'
                });
                return false;
            }
            
            return true;
        });
        
        // Deduplicate
        console.log(`\n🔄 RUNNING DEDUPLICATION...`);
        allIssues = deduplicateIssues(allIssues);
        allWarnings = deduplicateIssues(allWarnings);
        
        // Log socket mismatch issues after deduplication
        const socketIssuesAfter = allIssues.filter(i => {
            const msg = (i.message || '').toLowerCase();
            return msg.includes('socket') && (msg.includes('mismatch') || msg.includes('incompatible'));
        });
        console.log(`\n📊 AFTER DEDUPLICATION:`);
        console.log(`   TOTAL allIssues: ${allIssues.length}`);
        console.log(`   Socket mismatch issues AFTER dedup: ${socketIssuesAfter.length}`);
        socketIssuesAfter.forEach((issue, idx) => {
            console.log(`      ${idx + 1}. "${issue.message}" [severity: ${issue.severity}]`);
        });
        console.log(`\n`);
        
        // Enhance with detailed specs
        allIssues = allIssues.map(issue => enhanceIssueDetails(issue, components));
        allWarnings = allWarnings.map(warning => enhanceIssueDetails(warning, components));

        // Extract comprehensive compatible notes (what DOES work) with detailed specifications
        const compatibleNotes = [];
        
        // Check what's compatible
        const cpu = components.cpu || components.CPU;
        const mb = components.motherboard || components.Motherboard;
        const ram = components.ram || components.RAM;
        const gpu = components.gpu || components.GPU;
        const pcCase = components.case || components.Case;
        const cooling = components.cooling || components.Cooling;
        const psu = components.psu || components.PSU;
        const storage = components.storage || components.Storage;
        
        // === CPU + MOTHERBOARD COMPATIBILITY ===
        if (cpu && mb) {
            const cpuSocket = cpu.specifications?.socket;
            const mbSocket = mb.specifications?.socket;
            const cpuTDP = cpu.specifications?.tdp || cpu.specifications?.tdp_w;
            const mbChipset = mb.specifications?.chipset;
            
            // Socket match
            if (cpuSocket && mbSocket && cpuSocket === mbSocket) {
                compatibleNotes.push({
                    message: `✅ ${cpu.name} (${cpuSocket}) is compatible with ${mb.name} (${mbSocket})`,
                    details: `Socket ${cpuSocket} match confirmed. Physical CPU installation is compatible.`,
                    category: 'Socket Compatibility'
                });
            }
            
            // Chipset info
            if (mbChipset) {
                compatibleNotes.push({
                    message: `✅ Motherboard chipset: ${mbChipset}`,
                    details: `${mb.name} uses ${mbChipset} chipset with ${cpuSocket} socket support`,
                    category: 'Chipset'
                });
            }
            
            // TDP info
            if (cpuTDP) {
                compatibleNotes.push({
                    message: `✅ CPU TDP: ${cpuTDP}W`,
                    details: `${cpu.name} has thermal design power of ${cpuTDP}W`,
                    category: 'Power Consumption'
                });
            }
        }
        
        // === MOTHERBOARD SPECIFICATIONS ===
        if (mb) {
            const mbFormFactor = mb.specifications?.form_factor;
            const memorySlots = mb.specifications?.['Ram Slots'] || mb.specifications?.memory_slots || mb.specifications?.ram_slots;
            const maxMemory = mb.specifications?.max_memory || mb.specifications?.max_memory_gb;
            const m2Slots = mb.specifications?.['M2 Slots'] || mb.specifications?.m2_slots || mb.specifications?.nvme_slots;
            const sataPorts = mb.specifications?.['SATA Ports'] || mb.specifications?.sata_ports || mb.specifications?.sata;
            const pcieSlots = mb.specifications?.pcie_slots;
            const memoryType = mb.specifications?.memory_type;
            
            if (mbFormFactor) {
                compatibleNotes.push({
                    message: `✅ Motherboard form factor: ${mbFormFactor}`,
                    details: `${mb.name} is ${mbFormFactor} sized`,
                    category: 'Form Factor'
                });
            }
            
            if (memorySlots) {
                const slotWord = memorySlots === 1 ? 'slot' : 'slots';
                compatibleNotes.push({
                    message: `✅ Motherboard has ${memorySlots} RAM ${slotWord}`,
                    details: maxMemory ? `Supports up to ${maxMemory}GB total RAM capacity (${memorySlots} ${slotWord})` : `${memorySlots} DIMM ${slotWord} available`,
                    category: 'Memory Support'
                });
            }
            
            if (m2Slots) {
                const slotWord = m2Slots === 1 ? 'slot' : 'slots';
                compatibleNotes.push({
                    message: `✅ Motherboard has ${m2Slots} M.2 ${slotWord} for NVMe/SATA drives`,
                    details: `${m2Slots} M.2 expansion ${slotWord} for high-speed storage`,
                    category: 'Storage Interfaces'
                });
            }
            
            if (sataPorts) {
                const portWord = sataPorts === 1 ? 'port' : 'ports';
                compatibleNotes.push({
                    message: `✅ Motherboard has ${sataPorts} SATA ${portWord} for HDD/SSD`,
                    details: `${sataPorts} SATA 6Gb/s ${portWord} available for storage devices`,
                    category: 'Storage Interfaces'
                });
            }
            
            if (pcieSlots) {
                const slotWord = pcieSlots === 1 ? 'slot' : 'slots';
                compatibleNotes.push({
                    message: `✅ Motherboard has ${pcieSlots} PCIe expansion ${slotWord}`,
                    details: `${pcieSlots} PCIe ${slotWord} for GPU, sound cards, and other expansion cards`,
                    category: 'Expansion Slots'
                });
                
                // Add PCIe x16 electrical lanes info if available
                const pciex16Slots = mb.specifications?.pcie_x16_slots || 1;
                const pciex16Electrical = mb.specifications?.pcie_x16_electrical_lanes || pciex16Slots;
                
                if (pciex16Slots) {
                    const x16SlotWord = pciex16Slots === 1 ? 'slot' : 'slots';
                    compatibleNotes.push({
                        message: `✅ Motherboard has ${pciex16Slots} PCIe x16 ${x16SlotWord} (${pciex16Electrical} electrical x16)`,
                        details: `${pciex16Slots} physical PCIe x16 ${x16SlotWord}, ${pciex16Electrical} operating at full x16 electrical bandwidth`,
                        category: 'PCIe x16 Slots'
                    });
                }
            }
            
            if (memoryType) {
                compatibleNotes.push({
                    message: `✅ Motherboard supports ${memoryType} memory`,
                    details: `${mb.name} uses ${memoryType} RAM modules`,
                    category: 'Memory Type'
                });
            }
        }
        
        // === RAM COMPATIBILITY ===
        if (ram && mb) {
            const ramType = ram.specifications?.type || ram.specifications?.memory_type;
            const mbType = mb.specifications?.memory_type;
            const ramCapacity = ram.specifications?.capacity || ram.specifications?.capacity_gb;
            const ramSpeed = ram.specifications?.speed || ram.specifications?.frequency;
            const ramModules = ram.specifications?.modules || 1;
            
            if (ramType && mbType && ramType === mbType) {
                compatibleNotes.push({
                    message: `✅ RAM type (${ramType}) matches motherboard (${mbType})`,
                    details: `${ram.name} and ${mb.name} are memory type compatible`,
                    category: 'Memory Type Compatibility'
                });
            }
            
            if (ramCapacity) {
                compatibleNotes.push({
                    message: `✅ RAM capacity: ${ramCapacity}GB (${ramModules}x module${ramModules > 1 ? 's' : ''})`,
                    details: ramModules > 1 ? `${ramModules} × ${ramCapacity / ramModules}GB modules = ${ramCapacity}GB total` : `${ramCapacity}GB single module`,
                    category: 'Memory Capacity'
                });
            }
            
            if (ramSpeed) {
                compatibleNotes.push({
                    message: `✅ RAM speed: ${ramSpeed}MHz`,
                    details: `${ram.name} operates at ${ramSpeed}MHz frequency`,
                    category: 'Memory Speed'
                });
            }
        }
        
        // === GPU + CASE COMPATIBILITY ===
        if (gpu) {
            const gpuLength = gpu.specifications?.length_mm || gpu.specifications?.Length || gpu.specifications?.length || 0;
            const gpuPower = gpu.specifications?.power || gpu.specifications?.tdp || gpu.specifications?.power_w;
            const gpuSlots = gpu.specifications?.slot_width || gpu.specifications?.slots || 2;
            const gpuPCIe = gpu.specifications?.interface || gpu.specifications?.pcie;
            const gpuMemory = gpu.specifications?.memory_capacity || gpu.specifications?.vram;
            const gpuPowerConnector = gpu.specifications?.pcie_8pin || gpu.specifications?.power_connector_required;
            
            if (pcCase) {
                const caseMaxGPU = pcCase.specifications?.max_gpu_length_mm || pcCase.specifications?.['Max Gpu Length'] || 0;
                
                // GPU length compatibility
                if (gpuLength && caseMaxGPU && gpuLength <= caseMaxGPU) {
                    const clearance = caseMaxGPU - gpuLength;
                    compatibleNotes.push({
                        message: `✅ GPU length: ${gpuLength}mm fits in case (${caseMaxGPU}mm max) with ${clearance}mm clearance`,
                        details: `${gpu.name} (${gpuLength}mm) has ${clearance}mm spare clearance in ${pcCase.name} (${caseMaxGPU}mm max GPU length)`,
                        category: 'GPU Physical Fit'
                    });
                }
            }
            
            if (gpuPower) {
                compatibleNotes.push({
                    message: `✅ GPU power consumption: ${gpuPower}W TDP`,
                    details: `${gpu.name} requires ${gpuPower}W under full load`,
                    category: 'GPU Power Requirement'
                });
            }
            
            if (gpuSlots) {
                const slotWord = gpuSlots === 1 ? 'slot' : 'slots';
                compatibleNotes.push({
                    message: `✅ GPU occupies ${gpuSlots} expansion ${slotWord}`,
                    details: `${gpu.name} is ${gpuSlots}-slot width GPU (${gpuSlots * 20}mm vertical space)`,
                    category: 'GPU Slot Width'
                });
            }
            
            if (gpuPCIe) {
                compatibleNotes.push({
                    message: `✅ GPU uses ${gpuPCIe} interface`,
                    details: `${gpu.name} supports ${gpuPCIe} for high-speed data transfer`,
                    category: 'GPU Interface'
                });
            }
            
            if (gpuMemory) {
                compatibleNotes.push({
                    message: `✅ GPU memory: ${gpuMemory}GB VRAM`,
                    details: `${gpu.name} has ${gpuMemory}GB dedicated video memory`,
                    category: 'GPU Memory'
                });
            }
            
            if (gpuPowerConnector) {
                const connectorCount = typeof gpuPowerConnector === 'number' ? gpuPowerConnector : 1;
                const connectorWord = connectorCount === 1 ? 'connector' : 'connectors';
                compatibleNotes.push({
                    message: `✅ GPU requires ${connectorCount}× PCIe 8-pin power ${connectorWord}`,
                    details: `${gpu.name} needs ${connectorCount} dedicated 8-pin PCIe power ${connectorWord} from PSU`,
                    category: 'GPU Power Connectors'
                });
            }
        }
        
        // === CASE SPECIFICATIONS ===
        if (pcCase) {
            let caseFormFactors = pcCase.specifications?.supported_form_factors || [];
            // 🔥 FIX: Ensure it's always an array (could be string from DB)
            if (!Array.isArray(caseFormFactors)) {
                caseFormFactors = typeof caseFormFactors === 'string' ? [caseFormFactors] : [];
            }
            const caseMaxGPU = pcCase.specifications?.max_gpu_length_mm || pcCase.specifications?.['Max Gpu Length'];
            const caseMaxCooler = pcCase.specifications?.max_cooler_height_mm || pcCase.specifications?.['Max Cpu Cooler Height'];
            const caseType = pcCase.specifications?.case_type || pcCase.specifications?.type;
            
            if (caseFormFactors.length > 0) {
                compatibleNotes.push({
                    message: `✅ Case supports ${caseFormFactors.join(', ')} motherboards`,
                    details: `${pcCase.name} compatible with ${caseFormFactors.join(', ')} form factors`,
                    category: 'Case Form Factor Support'
                });
            }
            
            if (caseMaxGPU) {
                compatibleNotes.push({
                    message: `✅ Case supports GPUs up to ${caseMaxGPU}mm length`,
                    details: `Maximum GPU clearance: ${caseMaxGPU}mm`,
                    category: 'GPU Clearance Limit'
                });
            }
            
            if (caseMaxCooler) {
                compatibleNotes.push({
                    message: `✅ Case supports CPU coolers up to ${caseMaxCooler}mm height`,
                    details: `Maximum cooler clearance: ${caseMaxCooler}mm`,
                    category: 'Cooler Height Limit'
                });
            }
            
            if (caseType) {
                compatibleNotes.push({
                    message: `✅ Case type: ${caseType}`,
                    details: `${pcCase.name} is a ${caseType} case`,
                    category: 'Case Type'
                });
            }
        }
        
        // === FORM FACTOR MATCH ===
        if (mb && pcCase) {
            const mbFormFactor = mb.specifications?.form_factor;
            let caseFormFactors = pcCase.specifications?.supported_form_factors || [];
            // 🔥 FIX: Ensure it's always an array (could be string from DB)
            if (!Array.isArray(caseFormFactors)) {
                caseFormFactors = typeof caseFormFactors === 'string' ? [caseFormFactors] : [];
            }
            if (mbFormFactor && caseFormFactors.some(ff => ff.toLowerCase().includes(mbFormFactor.toLowerCase()))) {
                compatibleNotes.push({
                    message: `✅ Motherboard ${mbFormFactor} fits in case`,
                    details: `${mb.name} (${mbFormFactor}) is compatible with ${pcCase.name} (supports ${caseFormFactors.join(', ')})`,
                    category: 'Form Factor Compatibility'
                });
            }
        }
        
        // === PSU COMPATIBILITY ===
        if (psu) {
            const psuWattage = psu.specifications?.wattage || psu.specifications?.power;
            const psuEfficiency = psu.specifications?.efficiency || psu.specifications?.certification;
            const psuModular = psu.specifications?.modular;
            
            if (psuWattage) {
                compatibleNotes.push({
                    message: `✅ PSU wattage: ${psuWattage}W`,
                    details: psuEfficiency ? `${psuWattage}W ${psuEfficiency} certified PSU` : `${psuWattage}W power supply`,
                    category: 'PSU Power'
                });
            }
            
            if (psuModular) {
                compatibleNotes.push({
                    message: `✅ PSU is ${psuModular}`,
                    details: `${psu.name} has ${psuModular} cable design for cleaner builds`,
                    category: 'PSU Features'
                });
            }
        }
        
        // === COOLING COMPATIBILITY ===
        if (cooling) {
            const coolerType = cooling.specifications?.type || cooling.specifications?.cooling_type;
            const coolerHeight = cooling.specifications?.height || cooling.specifications?.height_mm;
            const coolerTDP = cooling.specifications?.max_tdp || cooling.specifications?.tdp_rating;
            const coolerMaxRPM = cooling.specifications?.max_rpm;
            const coolerSocket = cooling.specifications?.socket || cooling.specifications?.supported_sockets;
            
            if (coolerType) {
                compatibleNotes.push({
                    message: `✅ Cooler type: ${coolerType}`,
                    details: `${cooling.name} is a ${coolerType} cooling solution`,
                    category: 'Cooling Type'
                });
            }
            
            // Check cooler height vs case clearance
            if (coolerHeight && pcCase) {
                const caseMaxHeight = pcCase.specifications?.max_cooler_height_mm || pcCase.specifications?.['Max Cpu Cooler Height'] || 999;
                if (caseMaxHeight && coolerHeight <= caseMaxHeight) {
                    const clearance = caseMaxHeight - coolerHeight;
                    compatibleNotes.push({
                        message: `✅ Cooler height: ${coolerHeight}mm fits in case (${caseMaxHeight}mm max) with ${clearance}mm clearance`,
                        details: `${cooling.name} (${coolerHeight}mm) has ${clearance}mm clearance in ${pcCase.name} (${caseMaxHeight}mm max cooler height)`,
                        category: 'Cooler Physical Fit'
                    });
                }
            } else if (coolerHeight) {
                compatibleNotes.push({
                    message: `✅ Cooler height: ${coolerHeight}mm`,
                    details: `${cooling.name} cooler height is ${coolerHeight}mm`,
                    category: 'Cooler Dimensions'
                });
            }
            
            // Check TDP compatibility with CPU
            if (coolerTDP && cpu) {
                const cpuTDP = cpu.specifications?.tdp || cpu.specifications?.tdp_w;
                if (cpuTDP && coolerTDP >= cpuTDP) {
                    const headroom = coolerTDP - cpuTDP;
                    compatibleNotes.push({
                        message: `✅ Cooler rated for ${coolerTDP}W TDP, CPU requires ${cpuTDP}W (${headroom}W headroom)`,
                        details: `${cooling.name} can adequately cool ${cpu.name} with ${headroom}W thermal headroom`,
                        category: 'Cooling Capacity'
                    });
                } else if (cpuTDP) {
                    compatibleNotes.push({
                        message: `✅ Cooler TDP rating: ${coolerTDP || 'Not specified'}W for ${cpuTDP}W CPU`,
                        details: `${cooling.name} cooling capacity vs ${cpu.name} thermal requirements`,
                        category: 'Cooling Capacity'
                    });
                }
            }
            
            if (coolerMaxRPM) {
                compatibleNotes.push({
                    message: `✅ Cooler max speed: ${coolerMaxRPM} RPM`,
                    details: `${cooling.name} fan can reach ${coolerMaxRPM} RPM for maximum cooling`,
                    category: 'Cooling Performance'
                });
            }
            
            if (coolerSocket && cpu) {
                const cpuSocket = cpu.specifications?.socket;
                if (cpuSocket && (coolerSocket.includes(cpuSocket) || coolerSocket === cpuSocket)) {
                    compatibleNotes.push({
                        message: `✅ Cooler supports ${cpuSocket} socket`,
                        details: `${cooling.name} is compatible with ${cpu.name} (${cpuSocket} socket)`,
                        category: 'Socket Compatibility'
                    });
                }
            }
        }
        
        // === STORAGE COMPATIBILITY ===
        if (storage && mb) {
            const storageType = storage.specifications?.type || storage.specifications?.interface;
            const storageCapacity = storage.specifications?.capacity || storage.specifications?.capacity_gb;
            const storageFormFactor = storage.specifications?.form_factor;
            
            if (storageType) {
                const isNVMe = storageType.toLowerCase().includes('nvme') || storageType.toLowerCase().includes('m.2');
                const isSATA = storageType.toLowerCase().includes('sata');
                
                const mbM2Slots = mb.specifications?.['M2 Slots'] || mb.specifications?.m2_slots;
                const mbSataPorts = mb.specifications?.['SATA Ports'] || mb.specifications?.sata_ports;
                
                if (isNVMe && mbM2Slots) {
                    const slotWord = mbM2Slots === 1 ? 'slot' : 'slots';
                    compatibleNotes.push({
                        message: `✅ Storage ${storage.name} uses M.2 NVMe interface`,
                        details: `Motherboard has ${mbM2Slots} M.2 ${slotWord} for NVMe drives`,
                        category: 'Storage Interface'
                    });
                } else if (isSATA && mbSataPorts) {
                    const portWord = mbSataPorts === 1 ? 'port' : 'ports';
                    compatibleNotes.push({
                        message: `✅ Storage ${storage.name} uses SATA interface`,
                        details: `Motherboard has ${mbSataPorts} SATA ${portWord} for drives`,
                        category: 'Storage Interface'
                    });
                }
            }
            
            if (storageCapacity) {
                compatibleNotes.push({
                    message: `✅ Storage capacity: ${storageCapacity}GB`,
                    details: `${storage.name} provides ${storageCapacity}GB of storage`,
                    category: 'Storage Capacity'
                });
            }
        }

        // ===================================================================
        // GROUP COMPATIBLE NOTES BY CATEGORY (reduce 23 lines to ~8 groups)
        // ===================================================================
        
        // Add filtered optimization notes to compatible notes (they were moved from warnings)
        compatibleNotes.push(...filteredOptimizationNotes);
        
        const groupedCompatibleNotes = [];
        const notesByCategory = {};
        
        // Define category groups to consolidate related items
        const categoryGroups = {
            'Socket Compatibility': 'CPU & Socket',
            'Chipset': 'CPU & Socket',
            'Socket': 'CPU & Socket',
            
            'Memory Support': 'Memory',
            'Memory Type': 'Memory',
            'Memory Type Compatibility': 'Memory',
            'Memory Capacity': 'Memory',
            'Memory Speed': 'Memory',
            
            'Storage Interfaces': 'Storage',
            'Storage Interface': 'Storage',
            'Storage Capacity': 'Storage',
            
            'Form Factor': 'Form Factor & Case',
            'Form Factor Compatibility': 'Form Factor & Case',
            'Case Form Factor Support': 'Form Factor & Case',
            'Case Type': 'Form Factor & Case',
            
            'GPU Physical Fit': 'Graphics Card',
            'GPU Power Requirement': 'Graphics Card',
            'GPU Slot Width': 'Graphics Card',
            'GPU Interface': 'Graphics Card',
            'GPU Memory': 'Graphics Card',
            'GPU Power Connectors': 'Graphics Card',
            'GPU Clearance Limit': 'Graphics Card',
            
            'Cooling Type': 'Cooling',
            'Cooler Physical Fit': 'Cooling',
            'Cooler Dimensions': 'Cooling',
            'Cooling Capacity': 'Cooling',
            'Cooling Performance': 'Cooling',
            'Cooler Height Limit': 'Cooling',
            
            'PSU Power': 'Power Supply',
            'PSU Features': 'Power Supply',
            'Power Consumption': 'Power Supply',
            
            'PCIe x16 Slots': 'Expansion Slots',
            'Expansion Slots': 'Expansion Slots',
            
            'System Capabilities': 'System Features',
            'Verified Compatible': 'Verified Compatible'
        };
        
        // Group notes by consolidated category
        compatibleNotes.forEach(note => {
            const originalCategory = note.category || 'General';
            const groupedCategory = categoryGroups[originalCategory] || originalCategory;
            
            if (!notesByCategory[groupedCategory]) {
                notesByCategory[groupedCategory] = [];
            }
            notesByCategory[groupedCategory].push(note);
        });
        
        // Create grouped notes with all details in one message per category
        // Sort by importance: CPU/Socket first, then Memory, Storage, etc.
        const categoryOrder = [
            'CPU & Socket',
            'Memory', 
            'Form Factor & Case',
            'Graphics Card',
            'Cooling',
            'Power Supply',
            'Storage',
            'Expansion Slots',
            'System Features',
            'Verified Compatible',
            'General'
        ];
        
        const sortedCategories = Object.keys(notesByCategory).sort((a, b) => {
            const indexA = categoryOrder.indexOf(a);
            const indexB = categoryOrder.indexOf(b);
            const orderA = indexA === -1 ? 999 : indexA;
            const orderB = indexB === -1 ? 999 : indexB;
            return orderA - orderB;
        });
        
        sortedCategories.forEach(category => {
            const notes = notesByCategory[category];
            if (notes.length === 1) {
                // Single note - use as is but update category
                groupedCompatibleNotes.push({
                    ...notes[0],
                    category: category
                });
            } else {
                // Multiple notes in same category - combine into one grouped note
                // Extract key info from each message
                const keyPoints = notes.map(n => {
                    let msg = n.message.replace(/^✅\s*/i, '');
                    // Shorten long messages
                    if (msg.length > 80) {
                        msg = msg.substring(0, 77) + '...';
                    }
                    return msg;
                });
                
                groupedCompatibleNotes.push({
                    message: `✅ ${category}`,
                    details: keyPoints.join(' • '),
                    category: category,
                    count: notes.length,
                    items: notes // Include original notes for expansion
                });
            }
        });

        // Merge results with deduplication and enhancements
        const mergedResult = {
            ...analysisResult,
            detailed_compatibility: detailedResult,
            all_issues: allIssues,
            all_warnings: allWarnings,
            all_notes: [
                ...(detailedResult.notes || []),
                ...compatibleNotes
            ],
            compatible_notes: groupedCompatibleNotes, // ENHANCED: Grouped by category
            compatible_notes_raw: compatibleNotes, // Keep original for reference
            overall_compatible: analysisResult.compatible && detailedResult.compatible
        };

        logger.info('✅ Full build compatibility analysis completed');
        logger.info(`📊 Compatibility Score: ${analysisResult.compatibility_score}/100`);
        logger.info(`🔍 Critical Issues: ${mergedResult.all_issues.length} (deduplicated)`);
        logger.info(`⚠️ Warnings: ${mergedResult.all_warnings.length} (deduplicated)`);
        logger.info(`📝 Notes: ${mergedResult.all_notes.length}`);
        logger.info(`✅ Compatible: ${mergedResult.compatible_notes.length}`);

        res.json({
            success: true,
            data: mergedResult,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ Error in full build compatibility check:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze build compatibility',
            error: error.message
        });
    }
});

/**
 * POST /api/compatibility/matrix/quick-check
 * Fast compatibility check using pre-computed matrix (< 50ms target)
 * Falls back to full analysis if matrix entry doesn't exist
 */
router.post('/matrix/quick-check', kioskGeneralLimit, async (req, res) => {
    try {
        const { productId, candidateIds } = req.body;

        if (!productId || !candidateIds || !Array.isArray(candidateIds)) {
            return res.status(400).json({
                success: false,
                message: 'productId and candidateIds (array) are required'
            });
        }

        const startTime = Date.now();
        const results = [];
        let matrixHits = 0;
        let matrixMisses = 0;

        // Query compatibility matrix for each candidate
        for (const candidateId of candidateIds) {
            try {
                // Order IDs consistently (smaller first)
                const [idA, idB] = productId < candidateId 
                    ? [productId, candidateId] 
                    : [candidateId, productId];

                // Query matrix
                const matrixResult = await pool.query(`
                    SELECT 
                        product_a_id,
                        product_b_id,
                        compatibility_score,
                        compatible,
                        critical_issues,
                        warnings,
                        recommendations,
                        pair_type,
                        last_updated
                    FROM compatibility_matrix
                    WHERE product_a_id = $1 AND product_b_id = $2
                    LIMIT 1
                `, [idA, idB]);

                if (matrixResult.rows.length > 0) {
                    // MATRIX HIT
                    const matrixData = matrixResult.rows[0];
                    matrixHits++;

                    results.push({
                        id: candidateId,
                        compatibility_score: matrixData.compatibility_score,
                        compatible: matrixData.compatible,
                        issues: matrixData.critical_issues || [],
                        warnings: matrixData.warnings || [],
                        recommendations: matrixData.recommendations || [],
                        pair_type: matrixData.pair_type,
                        source: 'matrix',
                        last_updated: matrixData.last_updated
                    });
                } else {
                    // MATRIX MISS - Mark for full analysis
                    matrixMisses++;
                    results.push({
                        id: candidateId,
                        compatibility_score: null,
                        compatible: null,
                        source: 'needs_analysis',
                        requires_full_check: true
                    });
                }

            } catch (error) {
                logger.error(`Error checking matrix for product ${candidateId}:`, error);
                results.push({
                    id: candidateId,
                    compatibility_score: null,
                    compatible: null,
                    source: 'error',
                    error: error.message
                });
            }
        }

        const executionTime = Date.now() - startTime;
        const hitRate = ((matrixHits / candidateIds.length) * 100).toFixed(1);

        logger.info(`⚡ Quick-check completed: ${matrixHits} hits, ${matrixMisses} misses (${hitRate}% hit rate) in ${executionTime}ms`);

        res.json({
            success: true,
            results,
            fromMatrix: matrixHits > 0,
            matrixHits,
            matrixMisses,
            hitRate: Number.parseFloat(hitRate),
            executionTime,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ Error in quick-check:', error);
        res.status(500).json({
            success: false,
            message: 'Quick-check failed',
            error: error.message
        });
    }
});

/**
 * POST /api/compatibility/ram-slots
 * Check available RAM slots based on motherboard and existing RAM configuration
 * Used for multi-RAM selection in PC Customizer
 */
router.post('/ram-slots', kioskGeneralLimit, async (req, res) => {
    try {
        const { motherboard, existingRAM = [] } = req.body;

        if (!motherboard) {
            return res.status(400).json({
                success: false,
                message: 'Motherboard information is required'
            });
        }

        // Get total RAM slots from motherboard
        const totalSlots = Number.parseInt(motherboard.specifications?.ram_slots, 10) || 4;

        // Calculate used slots from existing RAM
        let usedSlots = 0;
        for (const ram of existingRAM) {
            const sticksCount = Number.parseInt(ram.specifications?.sticks_count, 10) || 1;
            usedSlots += sticksCount;
        }

        const availableSlots = Math.max(0, totalSlots - usedSlots);

        logger.info(`🎰 RAM Slots Check: Total=${totalSlots}, Used=${usedSlots}, Available=${availableSlots}`);

        res.json({
            success: true,
            data: {
                totalSlots,
                usedSlots,
                availableSlots,
                canAddMore: availableSlots > 0,
                motherboard: {
                    name: motherboard.name || motherboard.product_name,
                    ramSlots: totalSlots
                },
                existingRAM: existingRAM.map(ram => ({
                    name: ram.name || ram.product_name,
                    sticksCount: Number.parseInt(ram.specifications?.sticks_count, 10) || 1,
                    configuration: ram.specifications?.configuration || 'Unknown'
                }))
            }
        });

    } catch (error) {
        logger.error('❌ Error checking RAM slots:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check RAM slots',
            error: error.message
        });
    }
});

/**
 * POST /api/compatibility/storage-slots
 * Check available Storage slots (M.2 NVMe and SATA) based on motherboard
 * Used for multi-Storage selection in PC Customizer
 */
router.post('/storage-slots', kioskGeneralLimit, async (req, res) => {
    try {
        const { motherboard, existingStorage = [] } = req.body;

        if (!motherboard) {
            return res.status(400).json({
                success: false,
                message: 'Motherboard information is required'
            });
        }

        // Get total M.2 and SATA slots from motherboard
        const totalM2Slots = Number.parseInt(motherboard.specifications?.m2_slots, 10) || 2;
        const totalSATAPorts = Number.parseInt(motherboard.specifications?.sata_ports, 10) || 6;

        // Calculate used slots from existing storage
        let usedM2Slots = 0;
        let usedSATAPorts = 0;

        for (const storage of existingStorage) {
            const interface_type = storage.specifications?.interface || storage.specifications?.bus_type || '';
            
            if (interface_type.toLowerCase().includes('nvme') || interface_type.toLowerCase().includes('m.2')) {
                usedM2Slots++;
            } else if (interface_type.toLowerCase().includes('sata')) {
                usedSATAPorts++;
            }
        }

        const availableM2Slots = Math.max(0, totalM2Slots - usedM2Slots);
        const availableSATAPorts = Math.max(0, totalSATAPorts - usedSATAPorts);

        logger.info(`💾 Storage Slots Check: M.2 Total=${totalM2Slots}, Used=${usedM2Slots}, Available=${availableM2Slots} | SATA Total=${totalSATAPorts}, Used=${usedSATAPorts}, Available=${availableSATAPorts}`);

        res.json({
            success: true,
            data: {
                m2: {
                    total: totalM2Slots,
                    used: usedM2Slots,
                    available: availableM2Slots
                },
                sata: {
                    total: totalSATAPorts,
                    used: usedSATAPorts,
                    available: availableSATAPorts
                },
                canAddMore: availableM2Slots > 0 || availableSATAPorts > 0,
                motherboard: {
                    name: motherboard.name || motherboard.product_name,
                    m2Slots: totalM2Slots,
                    sataPorts: totalSATAPorts
                },
                existingStorage: existingStorage.map(storage => ({
                    name: storage.name || storage.product_name,
                    interface: storage.specifications?.interface || storage.specifications?.bus_type || 'Unknown',
                    formFactor: storage.specifications?.form_factor || 'Unknown'
                }))
            }
        });

    } catch (error) {
        logger.error('❌ Error checking storage slots:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check storage slots',
            error: error.message
        });
    }
});

/**
 * POST /api/compatibility/detailed-check
 * Perform detailed compatibility validation using detailedCompatibilityChecker
 * Used for comprehensive compatibility checking with physical clearances and power requirements
 */
router.post('/detailed-check', kioskGeneralLimit, async (req, res) => {
    try {
        const { product, currentBuild } = req.body;

        if (!product || !currentBuild) {
            return res.status(400).json({
                success: false,
                message: 'Product and currentBuild are required'
            });
        }

        // Import the detailed compatibility checker
        const DetailedCompatibilityChecker = require('../utils/detailedCompatibilityChecker');

        // Run detailed compatibility check
        const result = DetailedCompatibilityChecker.checkCompatibility(product, currentBuild);

        logger.info(`🔍 Detailed Check: ${product.name || product.product_name} - Score: ${result.score}%, Compatible: ${result.compatible}`);

        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ Error in detailed compatibility check:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform detailed compatibility check',
            error: error.message
        });
    }
});

module.exports = router;
