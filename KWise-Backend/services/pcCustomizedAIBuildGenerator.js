/**
 * PC CUSTOMIZED AI BUILD GENERATOR
 * 
 * Generates reference builds for PC Customized with AI feature based on:
 * - Usage Type (Gaming, Work, Content Creation, etc.)
 * - Budget Range (10k-25k, 26k-50k, 51k-75k, 76k-100k, 100k+)
 * - Performance Preference (Balanced, Performance, Budget)
 * - Gaming Preference (if usage is Gaming)
 * 
 * CORE COMPONENTS ONLY (8 categories):
 * - CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Cooling
 * 
 * STRATEGY: BUDGET FILTERING + ROUND-ROBIN SELECTION
 * - TIER 1: Filter products within ±40% of target price (strict budget adherence)
 * - TIER 2: Expand to ±100% if no matches (flexible fallback)
 * - TIER 3: Use ANY product if still no matches (last resort)
 * - Within each tier: Round-robin selection (picks least-used product)
 * - Result: Strict budget adherence + Equal product distribution across builds
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

// Track product usage for equal distribution across builds
const productUsageCount = {};

const CATEGORY_DB_NAMES = {
  cpu: 'CPU',
  gpu: 'GPU',
  motherboard: 'Motherboard',
  ram: 'RAM',
  storage: 'Storage',
  psu: 'PSU',
  case: 'Case',
  cooling: 'Cooling'
};

class PCCustomizedAIBuildGenerator {
  
  /**
   * Generate all possible builds based on active parameters
   */
  static async generateAllBuilds() {
    try {
      logger.info('🚀 Starting PC Customized AI builds generation...');
      
      // Reset product usage tracking for equal distribution
      Object.keys(productUsageCount).forEach(key => delete productUsageCount[key]);
      logger.info('🔄 Reset product usage tracking for equal distribution');
      this.categoryProductCache = {};

      const existingBuildsResult = await query(`
        SELECT build_key, cpu_id, gpu_id, motherboard_id, ram_id, storage_id, psu_id, case_id, cooling_id, total_price
        FROM pc_customized_ai_reference_builds
        WHERE is_active = true
      `);

      const existingKeys = new Set();
      const existingProductIds = new Set();
      existingBuildsResult.rows.forEach(row => {
        existingKeys.add(row.build_key);
        [row.cpu_id, row.gpu_id, row.motherboard_id, row.ram_id, row.storage_id, row.psu_id, row.case_id, row.cooling_id]
          .filter(Boolean)
          .forEach(id => existingProductIds.add(Number(id)));
      });

      const newProductsResult = await query(`
        SELECT id, category FROM pc_parts 
        WHERE is_active = true
          AND category NOT IN ('Pre-Built','Community Build','Headphones','Keyboard','Monitor','Mouse','Speakers','Webcam')
      `);

      const newProductIds = new Set(
        newProductsResult.rows
          .map(r => Number(r.id))
          .filter(id => !existingProductIds.has(id))
      );

      logger.info('📈 Existing vs new product snapshot', {
        existingBuilds: existingKeys.size,
        existingProducts: existingProductIds.size,
        newProducts: newProductIds.size
      });
      
      // Fetch all active parameters
      const [usageTypes, budgetRanges, performancePrefs] = await Promise.all([
        query('SELECT * FROM pc_customized_usage_types WHERE is_active = true ORDER BY sort_order'),
        query('SELECT * FROM pc_customized_budget_ranges WHERE is_active = true ORDER BY sort_order'),
        query('SELECT * FROM pc_customized_performance_preferences WHERE is_active = true ORDER BY sort_order')
      ]);

      logger.info('📊 Parameters:', {
        usageTypes: usageTypes.rows.length,
        budgetRanges: budgetRanges.rows.length,
        performancePrefs: performancePrefs.rows.length
      });

      let totalBuildsGenerated = 0;
      const errors = [];

      // Fetch gaming preferences for gaming builds
      const gamingPrefs = await query('SELECT * FROM pc_customized_gaming_preferences WHERE is_active = true ORDER BY sort_order');
      
      // Use optimized batch generation
      try {
        totalBuildsGenerated = await this.generateAllBuildsOptimized(
          usageTypes.rows,
          budgetRanges.rows,
          performancePrefs.rows,
          gamingPrefs.rows,
          { existingKeys, newProductIds }
        );
      } catch (error) {
        logger.error('Error in batch generation', { error: error.message });
        errors.push({ error: error.message });
      }

      logger.info('✅ PC Customized AI builds generation completed', {
        totalGenerated: totalBuildsGenerated,
        errors: errors.length
      });

      return {
        success: true,
        totalBuildsGenerated,
        errors
      };
    } catch (error) {
      logger.error('❌ Failed to generate builds', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate all builds in memory first, then batch insert
   */
  static async generateAllBuildsOptimized(usageTypes, budgetRanges, performancePrefs, gamingPrefs, context = {}) {
    const startTime = Date.now();
    const allBuilds = [];
    logger.info(`🔨 Preparing ${usageTypes.length * budgetRanges.length * performancePrefs.length}+ build configurations...`);
    
    for (const usage of usageTypes) {
      for (const budget of budgetRanges) {
        for (const perf of performancePrefs) {
          // If gaming usage, also generate builds for each gaming preference
          if (usage.name === 'gaming' && gamingPrefs.length > 0) {
            for (const gamingPref of gamingPrefs) {
              const build = await this.prepareSingleBuild(usage, budget, perf, gamingPref, context);
              if (build) allBuilds.push(build);
            }
          } else {
            const build = await this.prepareSingleBuild(usage, budget, perf, null, context);
            if (build) allBuilds.push(build);
          }
        }
      }
    }
    
    // Batch insert all builds at once
    if (allBuilds.length > 0) {
      await this.batchInsertBuilds(allBuilds);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const avgTime = (duration / allBuilds.length * 1000).toFixed(0);
    logger.info(`⚡ PERFORMANCE: Generated ${allBuilds.length} builds in ${duration}s (avg: ${avgTime}ms per build)`);
    
    return allBuilds.length;
  }

  /**
   * Prepare a single build data (no database insert)
   */
  static async prepareSingleBuild(usage, budget, performance, gamingPref = null, context = {}) {
    try {
      const { existingKeys = new Set(), newProductIds = new Set() } = context;
      const requiredCategories = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling'];

      const rawTargetBudget = Number(budget.representative_budget || budget.max_budget || budget.min_budget);
      if (!Number.isFinite(rawTargetBudget) || rawTargetBudget <= 0) {
        logger.warn('⚠️  Skipping build due to invalid target budget', { budget });
        return null;
      }

      const minBudgetRaw = Number(budget.min_budget) || Math.max(0, rawTargetBudget * 0.9);
      let maxBudgetRaw;
      if (Number.isFinite(Number(budget.max_budget)) && Number(budget.max_budget) > 0) {
        maxBudgetRaw = Number(budget.max_budget);
      } else {
        // Unlimited tier: use representative * 1.5 or min * 2, whichever is larger
        const repBased = rawTargetBudget * 1.5;
        const minBased = minBudgetRaw * 2;
        maxBudgetRaw = Math.max(repBased, minBased, rawTargetBudget * 1.2);
      }

      const { total: cheapestPossibleTotal, missingCategories } = await this.calculateCheapestPossibleTotal(requiredCategories);
      if (missingCategories.length) {
        logger.warn(`⚠️  Skipping build due to missing category data: ${missingCategories.join(', ')}`);
        return null;
      }

      // Aim for middle of tier when possible, but ensure >= cheapest
      const tierMidpoint = (minBudgetRaw + maxBudgetRaw) / 2;
      const targetBudget = Math.min(maxBudgetRaw, Math.max(Math.max(rawTargetBudget, tierMidpoint), cheapestPossibleTotal * 1.05));
      const minBudget = Math.max(minBudgetRaw, cheapestPossibleTotal * 1.02);
      const maxBudget = maxBudgetRaw;

      const buildKey = gamingPref 
        ? `${usage.name}-${budget.name}-${performance.name}-${gamingPref.name}`
        : `${usage.name}-${budget.name}-${performance.name}`;

      if (cheapestPossibleTotal > maxBudgetRaw) {
        logger.warn(`⚠️  Skipping build ${buildKey}: cheapest possible total ₱${cheapestPossibleTotal.toFixed(0)} exceeds max budget ₱${maxBudgetRaw}`);
        return null;
      }

      // Select components based on parameters
      const components = await this.selectComponents(
        usage,
        budget,
        performance,
        gamingPref,
        newProductIds,
        targetBudget,
        { minBudget, maxBudget, cheapestPossibleTotal }
      );

      if (!components) {
        logger.warn(`⚠️  Insufficient components for build: ${buildKey}`);
        return null;
      }

      const missing = requiredCategories.filter(cat => !components[cat]);
      if (missing.length) {
        logger.warn(`⚠️  Skipping build ${buildKey} due to missing: ${missing.join(', ')}`);
        return null;
      }

      // Calculate total price
      const totalPrice = Object.values(components)
        .filter(c => c && c.price)
        .reduce((sum, c) => sum + Number.parseFloat(c.price), 0);

      const balanced = await this.rebalanceWithinBudget(components, minBudget, maxBudget, newProductIds);

      if (balanced.total > maxBudget || balanced.total < minBudget) {
        logger.warn(`⚠️  Skipping build ${buildKey}: total ₱${balanced.total.toFixed(0)} outside ${minBudget}-${maxBudget}`);
        return null;
      }

      const usesNew = this.buildUsesNewProduct(balanced.components, newProductIds);
      let finalKey = buildKey;

      if (existingKeys.has(buildKey)) {
        if (!usesNew) {
          return null; // keep existing build, no new parts involved
        }
        finalKey = this.makeUniqueKey(buildKey, existingKeys);
      }
      existingKeys.add(finalKey);

      // Calculate scores
      const scores = this.calculateScores(balanced.components, budget, performance);

      // Return build data without inserting (batch insert later)
      return {
        buildKey: finalKey,
        usageType: usage.name,
        budgetRange: budget.name,
        performancePreference: performance.name,
        gamingPreference: gamingPref?.name || null,
        targetBudget: targetBudget,
        totalPrice: balanced.total,
        cpuId: balanced.components.cpu?.id || null,
        gpuId: balanced.components.gpu?.id || null,
        motherboardId: balanced.components.motherboard?.id || null,
        ramId: balanced.components.ram?.id || null,
        storageId: balanced.components.storage?.id || null,
        psuId: balanced.components.psu?.id || null,
        caseId: balanced.components.case?.id || null,
        coolingId: balanced.components.cooling?.id || null,
        aiReasoning: this.generateAIReasoning(usage, budget, performance, gamingPref, balanced.components),
        compatibilityScore: scores.compatibility,
        performanceScore: scores.performance,
        valueScore: scores.value,
        isActive: true,
        validationStatus: 'valid'
      };
    } catch (error) {
      logger.error('Error in generateSingleBuild', { error: error.message });
      throw error;
    }
  }

  /**
   * Batch insert all builds at once for maximum speed
   */
  static async batchInsertBuilds(builds) {
    const insertStartTime = Date.now();
    try {
      logger.info(`🚀 Batch inserting ${builds.length} builds into database...`);
      
      const values = [];
      const placeholders = [];
      
      builds.forEach((build, index) => {
        const baseIndex = index * 20;
        placeholders.push(
          `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, ` +
          `$${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, ` +
          `$${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15}, ` +
          `$${baseIndex + 16}, $${baseIndex + 17}, $${baseIndex + 18}, $${baseIndex + 19}, $${baseIndex + 20})`
        );
        
        values.push(
          build.buildKey,
          build.usageType,
          build.budgetRange,
          build.performancePreference,
          build.gamingPreference,
          build.targetBudget,
          build.cpuId,
          build.gpuId,
          build.motherboardId,
          build.ramId,
          build.storageId,
          build.psuId,
          build.caseId,
          build.coolingId,
          build.totalPrice,
          build.aiReasoning,
          build.compatibilityScore,
          build.performanceScore,
          build.valueScore,
          build.validationStatus
        );
      });
      
      const insertQuery = `
        INSERT INTO pc_customized_ai_reference_builds (
          build_key, usage_type, budget_range, performance_preference, gaming_preference,
          target_budget, cpu_id, gpu_id, motherboard_id, ram_id, storage_id, psu_id, case_id, cooling_id,
          total_price, ai_reasoning, compatibility_score, performance_score, value_score, validation_status
        ) VALUES ${placeholders.join(', ')}
      `;
      
      await query(insertQuery, values);
      const insertDuration = ((Date.now() - insertStartTime) / 1000).toFixed(2);
      logger.info(`✅ Database batch insert completed: ${builds.length} builds in ${insertDuration}s (${(insertDuration / builds.length * 1000).toFixed(0)}ms per build)`);
    } catch (error) {
      const insertDuration = ((Date.now() - insertStartTime) / 1000).toFixed(2);
      logger.error('❌ Batch insert FAILED', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        buildsAttempted: builds.length,
        failedAfter: `${insertDuration}s`,
        hint: error.hint
      });
      throw error;
    }
  }

  /**
   * Select appropriate components based on parameters
   */
  static async selectComponents(usage, budget, performance, gamingPref, newProductIds = new Set(), targetBudgetInput, budgetLimits = {}) {
    try {
      const targetBudget = Number.isFinite(targetBudgetInput) && targetBudgetInput > 0
        ? targetBudgetInput
        : Number(budget.representative_budget || budget.max_budget || budget.min_budget);
      const minBudget = Number.isFinite(budgetLimits.minBudget) ? budgetLimits.minBudget : Number(budget.min_budget);
      const maxBudget = Number.isFinite(budgetLimits.maxBudget) ? budgetLimits.maxBudget : Number(budget.max_budget);
      const perfWeight = Number.parseFloat(performance.performance_weight);
      const budgetWeight = Number.parseFloat(performance.budget_weight);

      if (!targetBudget || targetBudget <= 0) {
        logger.warn('⚠️  Skipping build due to missing target budget', { budget });
        return null;
      }

      // SMART BUDGET ALLOCATION STRATEGY
      // Priority: CPU > Motherboard > RAM > Storage > GPU > PSU > Case > Cooling
      // Trade off less critical components to fit all components within strict budget
      
      let cpuBudgetRatio = 0.28;          // KEY COMPONENT - Higher priority
      let motherboardBudgetRatio = 0.18;  // KEY COMPONENT - Higher priority
      let ramBudgetRatio = 0.12;          // KEY COMPONENT - Higher priority
      let storageBudgetRatio = 0.12;      // KEY COMPONENT - Higher priority
      let gpuBudgetRatio = 0.20;          // Variable based on usage
      let psuBudgetRatio = 0.05;          // TRADE-OFF component
      let caseBudgetRatio = 0.03;         // TRADE-OFF component
      let coolingBudgetRatio = 0.02;      // TRADE-OFF component

      // Adjust ratios based on usage type (while maintaining strict budget)
      if (usage.name === 'gaming') {
        // Gaming: Prioritize GPU, reduce case/cooling
        gpuBudgetRatio = 0.32;
        cpuBudgetRatio = 0.24;
        caseBudgetRatio = 0.02;
        coolingBudgetRatio = 0.02;
      } else if (usage.name === 'video-editing' || usage.name === 'content-creation') {
        // Content Creation: Boost CPU, RAM, reduce GPU slightly
        cpuBudgetRatio = 0.30;
        ramBudgetRatio = 0.16;
        gpuBudgetRatio = 0.18;
        caseBudgetRatio = 0.02;
      } else if (usage.name === 'programming') {
        // Programming: More CPU, RAM, Storage, less GPU
        cpuBudgetRatio = 0.30;
        ramBudgetRatio = 0.14;
        storageBudgetRatio = 0.14;
        gpuBudgetRatio = 0.12;
        caseBudgetRatio = 0.03;
      } else if (usage.name === 'work' || usage.name === 'general-use') {
        // General: Balanced, reduce GPU
        gpuBudgetRatio = 0.16;
        ramBudgetRatio = 0.14;
        cpuBudgetRatio = 0.26;
      }

      // Adjust for performance preference (fine-tune within budget)
      if (performance.name === 'performance') {
        // Performance: Boost CPU/GPU, sacrifice case/cooling
        const boost = 0.03;
        cpuBudgetRatio += boost;
        gpuBudgetRatio += boost;
        caseBudgetRatio = Math.max(0.01, caseBudgetRatio - boost);
        coolingBudgetRatio = Math.max(0.01, coolingBudgetRatio - boost);
      } else if (performance.name === 'budget') {
        // Budget: Reduce expensive components, boost affordable ones
        const shift = 0.04;
        cpuBudgetRatio -= shift;
        gpuBudgetRatio -= shift;
        ramBudgetRatio += shift;
        storageBudgetRatio += shift;
      }

      // CRITICAL: Ensure ratios sum to 1.0 (strict budget adherence)
      const totalRatio = cpuBudgetRatio + gpuBudgetRatio + motherboardBudgetRatio + 
                        ramBudgetRatio + storageBudgetRatio + psuBudgetRatio + 
                        caseBudgetRatio + coolingBudgetRatio;
      
      if (Math.abs(totalRatio - 1.0) > 0.01) {
        // Normalize to ensure strict budget
        const normalizeFactor = 1.0 / totalRatio;
        cpuBudgetRatio *= normalizeFactor;
        gpuBudgetRatio *= normalizeFactor;
        motherboardBudgetRatio *= normalizeFactor;
        ramBudgetRatio *= normalizeFactor;
        storageBudgetRatio *= normalizeFactor;
        psuBudgetRatio *= normalizeFactor;
        caseBudgetRatio *= normalizeFactor;
        coolingBudgetRatio *= normalizeFactor;
      }

      // Calculate target prices for each component
      const componentBudgets = {
        cpu: targetBudget * cpuBudgetRatio,
        gpu: targetBudget * gpuBudgetRatio,
        motherboard: targetBudget * motherboardBudgetRatio,
        ram: targetBudget * ramBudgetRatio,
        storage: targetBudget * storageBudgetRatio,
        psu: targetBudget * psuBudgetRatio,
        case: targetBudget * caseBudgetRatio,
        cooling: targetBudget * coolingBudgetRatio
      };

      // Component budgets calculated (logging disabled for performance)

      // Select components using ROUND-ROBIN with strict budget adherence and wide fallbacks
      const components = {};

      // CPU (REQUIRED)
      components.cpu = await this.selectComponentWithFallback('CPU', componentBudgets.cpu, perfWeight, newProductIds);
      
      // Cooling (REQUIRED)
      components.cooling = await this.selectComponentWithFallback('Cooling', componentBudgets.cooling, perfWeight, newProductIds);
      
      // Motherboard (REQUIRED)
      components.motherboard = await this.selectComponentWithFallback('Motherboard', componentBudgets.motherboard, perfWeight, newProductIds);
      
      // RAM (REQUIRED)
      components.ram = await this.selectComponentWithFallback('RAM', componentBudgets.ram, perfWeight, newProductIds);
      
      // Storage (REQUIRED)
      components.storage = await this.selectComponentWithFallback('Storage', componentBudgets.storage, perfWeight, newProductIds);
      
      // GPU (REQUIRED for all builds to keep full component coverage)
      components.gpu = await this.selectComponentWithFallback('GPU', componentBudgets.gpu, perfWeight, newProductIds);
      
      // Case (REQUIRED)
      components.case = await this.selectComponentWithFallback('Case', componentBudgets.case, perfWeight, newProductIds);
      
      // PSU (REQUIRED)
      components.psu = await this.selectComponentWithFallback('PSU', componentBudgets.psu, perfWeight, newProductIds);

      // CRITICAL VALIDATION: Ensure ALL required components are present
      const requiredComponents = ['cpu', 'cooling', 'motherboard', 'ram', 'storage', 'case', 'psu', 'gpu'];
      const missingComponents = requiredComponents.filter(cat => !components[cat]);
      
      if (missingComponents.length > 0) {
        logger.error(`❌ Build missing required components: ${missingComponents.join(', ')}`);
        throw new Error(`Cannot generate build - missing: ${missingComponents.join(', ')}`);
      }
      
      // Gaming builds MUST have GPU
      if (usage.name === 'gaming' && !components.gpu) {
        logger.error('❌ Gaming build missing GPU');
        throw new Error('Cannot generate gaming build without GPU');
      }

      // Components selected successfully
      return components;
    } catch (error) {
      logger.error('Error selecting components', { error: error.message });
      throw error;
    }
  }

  /**
   * Select the best component with BUDGET FILTERING + ROUND-ROBIN
   * Strategy: Filter by price range, then pick least-used product
   * This ensures BOTH budget adherence AND equal distribution
   */
  static async selectBestComponent(category, targetPrice, performanceWeight, newProductIds = new Set()) {
    try {
      const normalize = rows => rows.map(r => ({
        ...r,
        price: Number.parseFloat(r.price),
        isNew: newProductIds.has(Number(r.id))
      }));

      // TIER 1: Strict range ±40% (preferred for budget adherence)
      let minPrice = targetPrice * 0.6;
      let maxPrice = targetPrice * 1.4;

      let result = await query(`
        SELECT id, name, price, brand, specifications, performance_index
        FROM pc_parts
        WHERE category = $1
        AND price BETWEEN $2 AND $3
        ORDER BY id ASC
      `, [category, minPrice, maxPrice]);

      if (result.rows.length > 0) {
        // Use round-robin among budget-valid products
        return this.selectLeastUsedProduct(normalize(result.rows), newProductIds);
      }

      // TIER 2: Wider range ±100% (fallback for flexibility)
      minPrice = targetPrice * 0.3;
      maxPrice = targetPrice * 2.0;

      result = await query(`
        SELECT id, name, price, brand, specifications, performance_index
        FROM pc_parts
        WHERE category = $1
        AND price BETWEEN $2 AND $3
        ORDER BY id ASC
      `, [category, minPrice, maxPrice]);

      if (result.rows.length > 0) {
        logger.warn(`⚠️  ${category}: Using wider range (±100%) for target ₱${targetPrice.toFixed(0)}`);
        return this.selectLeastUsedProduct(normalize(result.rows), newProductIds);
      }

      // TIER 3: ANY product in category (last resort - ignores budget)
      result = await query(`
        SELECT id, name, price, brand, specifications, performance_index
        FROM pc_parts
        WHERE category = $1
        ORDER BY id ASC
      `, [category]);

      if (result.rows.length > 0) {
        logger.warn(`⚠️  ${category}: Using ANY product (no budget match) for target ₱${targetPrice.toFixed(0)}`);
        return this.selectLeastUsedProduct(normalize(result.rows), newProductIds);
      }

      logger.error(`❌ No products found in category: ${category}`);
      return null;
    } catch (error) {
      logger.error('Error selecting component', { category, error: error.message });
      return null;
    }
  }

  /**
   * Select component with strict budget filters and fall back to wide search if needed
   */
  static async selectComponentWithFallback(category, targetPrice, performanceWeight, newProductIds = new Set()) {
    const primary = await this.selectBestComponent(category, targetPrice, performanceWeight, newProductIds);
    if (primary) return primary;
    return this.selectWithWideFallback(category, targetPrice, newProductIds);
  }

  /**
   * ROUND-ROBIN SELECTION: Select least-used product for equal distribution
   */
  static selectLeastUsedProduct(products, newProductIds = new Set()) {
    if (!products || products.length === 0) return null;

    // Sort by usage count (least used first), then by ID for consistency
    const sortedProducts = [...products].sort((a, b) => {
      const isNewA = newProductIds.has(a.id) ? 1 : 0;
      const isNewB = newProductIds.has(b.id) ? 1 : 0;
      if (isNewA !== isNewB) {
        return isNewB - isNewA; // prefer new parts
      }

      const usageA = productUsageCount[a.id] || 0;
      const usageB = productUsageCount[b.id] || 0;
      
      if (usageA !== usageB) {
        return usageA - usageB; // Least used first
      }

      const priceA = Number.parseFloat(a.price) || 0;
      const priceB = Number.parseFloat(b.price) || 0;
      if (priceA !== priceB) {
        return priceA - priceB; // Favor cheaper when usage/new are equal
      }

      return a.id - b.id; // Consistent ordering
    });

    // Select least-used product
    const selectedProduct = sortedProducts[0];
    
    if (selectedProduct) {
      // Track usage for next round
      productUsageCount[selectedProduct.id] = (productUsageCount[selectedProduct.id] || 0) + 1;
    }

    return selectedProduct;
  }

  /**
   * CRITICAL FALLBACK: Select component with extremely wide price range
   * REMOVED FILTERS: No is_active or kiosk_visible restrictions
   * This GUARANTEES finding a component for required categories
   */
  static async selectWithWideFallback(category, targetPrice, newProductIds = new Set()) {
    try {
      const normalize = rows => rows.map(r => ({
        ...r,
        price: Number.parseFloat(r.price),
        isNew: newProductIds.has(Number(r.id))
      }));

      // Try 1: Any product within 3x the target price
      let result = await query(`
        SELECT id, name, price, brand, specifications, performance_index
        FROM pc_parts
        WHERE category = $1
        AND price <= $2
        ORDER BY ABS(price - $3) ASC
      `, [category, targetPrice * 3, targetPrice]);

      if (result.rows.length > 0) {
        // Use round-robin selection for equal distribution
        return this.selectLeastUsedProduct(normalize(result.rows), newProductIds);
      }

      // Try 2: ANY product in the category (no price limit, no filters)
      result = await query(`
        SELECT id, name, price, brand, specifications, performance_index
        FROM pc_parts
        WHERE category = $1
        ORDER BY price ASC
      `, [category]);

      if (result.rows.length > 0) {
        // Use round-robin selection for equal distribution
        logger.warn(`⚠️  Using ANY ${category} product with round-robin`);
        return this.selectLeastUsedProduct(normalize(result.rows), newProductIds);
      }

      // Absolutely no products found - this should never happen
      logger.error(`❌ CRITICAL: No products found in category ${category} at all!`);
      return null;
    } catch (error) {
      logger.error('Error in selectWithWideFallback', { category, error: error.message });
      return null;
    }
  }

  /**
   * Calculate compatibility, performance, and value scores
   */
  static calculateScores(components, budget, performance) {
    // Simple scoring logic (can be enhanced with actual compatibility checks)
    const compatibility = 0.95;  // Assume high compatibility
    
    // Performance score based on how close we are to target budget
    const totalPrice = Object.values(components)
      .filter(c => c && c.price)
      .reduce((sum, c) => sum + Number.parseFloat(c.price), 0);
    
    const targetBudget = Number.parseFloat(budget.representative_budget);
    const budgetUtilization = totalPrice / targetBudget;
    
    // Performance score: higher if we're closer to budget without exceeding
    const performanceScore = Math.min(budgetUtilization, 1.0);
    
    // Value score: better if we get more for less money
    const valueScore = budgetUtilization <= 1.0 
      ? 1.0 - Math.abs(1.0 - budgetUtilization)
      : Math.max(0, 1.0 - (budgetUtilization - 1.0));

    return {
      compatibility: compatibility,
      performance: performanceScore,
      value: valueScore
    };
  }

  /**
   * Generate AI reasoning text for the build
   */
  static generateAIReasoning(usage, budget, performance, gamingPref, components) {
    const usageName = usage.display_name;
    const budgetName = budget.display_name;
    const perfName = performance.display_name;

    let reasoning = `This build is optimized for ${usageName} within ${budgetName}. `;
    reasoning += `With a ${perfName} approach, we've selected components that `;
    
    if (performance.name === 'performance') {
      reasoning += 'maximize performance for your budget. ';
    } else if (performance.name === 'budget') {
      reasoning += 'provide excellent value while staying cost-effective. ';
    } else {
      reasoning += 'balance performance and cost for optimal value. ';
    }

    if (usage.name === 'gaming') {
      reasoning += 'The GPU is prioritized for smooth gaming performance. ';
    } else if (usage.name === 'video-editing' || usage.name === 'content-creation') {
      reasoning += 'The CPU and RAM are prioritized for content creation workflows. ';
    }

    return reasoning;
  }

  static buildUsesNewProduct(components, newProductIds = new Set()) {
    return Object.values(components || {}).some(part => part?.id && newProductIds.has(Number(part.id)));
  }

  static makeUniqueKey(baseKey, existingKeys) {
    if (!existingKeys.has(baseKey)) return baseKey;
    let counter = 2;
    let candidate = `${baseKey}-v${counter}`;
    while (existingKeys.has(candidate)) {
      counter += 1;
      candidate = `${baseKey}-v${counter}`;
    }
    return candidate;
  }

  static async getCategoryProducts(category) {
    const cacheKey = category.toLowerCase();
    if (!this.categoryProductCache) this.categoryProductCache = {};
    if (this.categoryProductCache[cacheKey]) return this.categoryProductCache[cacheKey];

    const normalizedCategory = CATEGORY_DB_NAMES[cacheKey] || category;

    const result = await query(`
      SELECT id, name, price, brand, specifications, performance_index, category, image_url
      FROM pc_parts
      WHERE category = $1 AND price > 0 AND is_active = true
      ORDER BY price ASC
    `, [normalizedCategory]);

    this.categoryProductCache[cacheKey] = result.rows.map(r => ({
      ...r,
      price: Number.parseFloat(r.price)
    }));
    return this.categoryProductCache[cacheKey];
  }

  static buildComponentFromProduct(product, reasoning, newProductIds = new Set()) {
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      specifications: product.specifications,
      image_url: product.image_url,
      reasoning,
      isNew: newProductIds.has(Number(product.id))
    };
  }

  static async calculateCheapestPossibleTotal(categories = []) {
    const missingCategories = [];
    let total = 0;

    for (const category of categories) {
      const products = await this.getCategoryProducts(category);
      if (!products || products.length === 0) {
        missingCategories.push(category);
        continue;
      }

      const cheapest = products[0];
      total += Number.parseFloat(cheapest.price) || 0;
    }

    return { total, missingCategories };
  }

  static async rebalanceWithinBudget(components, minBudget, maxBudget, newProductIds = new Set()) {
    let currentComponents = { ...components };
    const sumTotal = comps => Object.values(comps)
      .filter(Boolean)
      .reduce((sum, comp) => sum + (Number.parseFloat(comp.price) || 0), 0);

    let total = sumTotal(currentComponents);
    const clampIterations = 20;
    let iter = 0;

    // Phase 1: Aggressively reduce when way over budget
    while (total > maxBudget * 1.05 && iter < 10) {
      const [category] = Object.entries(currentComponents)
        .filter(([, comp]) => comp)
        .sort((a, b) => (Number.parseFloat(b[1].price) || 0) - (Number.parseFloat(a[1].price) || 0))[0] || [];
      if (!category) break;

      const options = (await this.getCategoryProducts(category))
        .filter(p => p.id !== currentComponents[category].id)
        .sort((a, b) => (Number.parseFloat(a.price) || 0) - (Number.parseFloat(b.price) || 0));

      const maxAllowed = maxBudget - (total - Number.parseFloat(currentComponents[category].price));
      const cheaper = options.find(p => Number.parseFloat(p.price) < Math.min(Number.parseFloat(currentComponents[category].price), maxAllowed));
      if (!cheaper) break;

      currentComponents[category] = this.buildComponentFromProduct(cheaper, currentComponents[category].reasoning, newProductIds);
      total = sumTotal(currentComponents);
      iter++;
    }

    // Phase 2: Fine-tune to max budget
    iter = 0;
    while (total > maxBudget && iter < clampIterations) {
      const [category] = Object.entries(currentComponents)
        .filter(([, comp]) => comp)
        .sort((a, b) => (Number.parseFloat(b[1].price) || 0) - (Number.parseFloat(a[1].price) || 0))[0] || [];
      if (!category) break;

      const options = (await this.getCategoryProducts(category))
        .filter(p => p.id !== currentComponents[category].id)
        .sort((a, b) => (Number.parseFloat(a.price) || 0) - (Number.parseFloat(b.price) || 0));

      const cheaper = options.find(p => Number.parseFloat(p.price) < Number.parseFloat(currentComponents[category].price));
      if (!cheaper) break;

      currentComponents[category] = this.buildComponentFromProduct(cheaper, currentComponents[category].reasoning, newProductIds);
      total = sumTotal(currentComponents);
      iter++;
    }

    iter = 0;
    // Phase 3: Boost when below min
    while (total < minBudget && iter < clampIterations) {
      const [category] = Object.entries(currentComponents)
        .filter(([, comp]) => comp)
        .sort((a, b) => (Number.parseFloat(a[1].price) || 0) - (Number.parseFloat(b[1].price) || 0))[0] || [];
      if (!category) break;

      const options = (await this.getCategoryProducts(category))
        .filter(p => p.id !== currentComponents[category].id && Number.parseFloat(p.price) <= maxBudget * 0.3)
        .sort((a, b) => (Number.parseFloat(a.price) || 0) - (Number.parseFloat(b.price) || 0));

      const needed = minBudget - total;
      const pricier = options.find(p => {
        const priceDiff = Number.parseFloat(p.price) - Number.parseFloat(currentComponents[category].price);
        return priceDiff > 0 && priceDiff <= needed * 1.5 && (total - Number.parseFloat(currentComponents[category].price) + Number.parseFloat(p.price)) <= maxBudget;
      });
      if (!pricier) break;

      currentComponents[category] = this.buildComponentFromProduct(pricier, currentComponents[category].reasoning, newProductIds);
      total = sumTotal(currentComponents);
      iter++;
    }

    return { components: currentComponents, total };
  }
}

module.exports = PCCustomizedAIBuildGenerator;

