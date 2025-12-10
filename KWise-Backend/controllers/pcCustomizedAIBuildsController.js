/**
 * PC CUSTOMIZED AI REFERENCE BUILDS CONTROLLER
 * 
 * Manages reference PC builds for "PC Customized with AI" feature:
 * - Fetch all AI customization builds
 * - Manage parameters (usage, budget, performance, gaming preferences)
 * - Generate builds based on AI assessment parameters
 * - Monitor new products not yet in builds
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

class PCCustomizedAIBuildsController {
  
  /**
   * Get all PC Customized AI reference builds
   */
  static async getAllBuilds(req, res) {
    try {
      const result = await query(`
        SELECT 
          id, build_key, usage_type, budget_range, performance_preference,
          gaming_preference, target_budget, total_price,
          cpu_id, gpu_id, motherboard_id, ram_id, storage_id, psu_id, case_id, cooling_id,
          ai_reasoning, compatibility_score, performance_score, value_score,
          is_active, generated_at, validation_status
        FROM pc_customized_ai_reference_builds
        WHERE is_active = true
        ORDER BY usage_type, budget_range, performance_preference
      `);

      // Convert to array format with key property for frontend compatibility
      const builds = result.rows.map(row => ({
        key: row.build_key,
        build_key: row.build_key,
        id: row.id,
        usage: row.usage_type,
        budgetRange: row.budget_range,
        performance: row.performance_preference,
        gamingPreference: row.gaming_preference,
        targetBudget: parseFloat(row.target_budget),
        totalPrice: parseFloat(row.total_price),
        cpu_id: row.cpu_id,
        gpu_id: row.gpu_id,
        motherboard_id: row.motherboard_id,
        ram_id: row.ram_id,
        storage_id: row.storage_id,
        psu_id: row.psu_id,
        case_id: row.case_id,
        cooling_id: row.cooling_id,
        components: {
          cpu: row.cpu_id,
          gpu: row.gpu_id,
          motherboard: row.motherboard_id,
          ram: row.ram_id,
          storage: row.storage_id,
          psu: row.psu_id,
          case: row.case_id,
          cooling: row.cooling_id
        },
        aiReasoning: row.ai_reasoning,
        scores: {
          compatibility: parseFloat(row.compatibility_score),
          performance: parseFloat(row.performance_score),
          value: parseFloat(row.value_score)
        },
        generatedAt: row.generated_at,
        validationStatus: row.validation_status
      }));

      logger.info('Fetched PC Customized AI reference builds', { count: builds.length });
      
      res.json({
        success: true,
        data: {
          builds: builds, // Array format with key property
          totalBuilds: builds.length,
          generatedAt: result.rows[0]?.generated_at || null
        }
      });
    } catch (error) {
      logger.error('Error fetching PC Customized AI builds', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch builds',
        error: error.message
      });
    }
  }

  /**
   * Get statistics about PC Customized AI builds
   */
  static async getStatistics(req, res) {
    try {
      // Get parameter counts
      const paramsResult = await query(`
        SELECT 
          (SELECT COUNT(*) FROM pc_customized_usage_types WHERE is_active = true) as usage_types,
          (SELECT COUNT(*) FROM pc_customized_budget_ranges WHERE is_active = true) as budget_ranges,
          (SELECT COUNT(*) FROM pc_customized_performance_preferences WHERE is_active = true) as performance_prefs,
          (SELECT COUNT(*) FROM pc_customized_gaming_preferences WHERE is_active = true) as gaming_prefs
      `);

      const params = paramsResult.rows[0];
      
      // Check if gaming usage type exists
      const gamingUsageResult = await query(`
        SELECT COUNT(*) as count FROM pc_customized_usage_types 
        WHERE name = 'gaming' AND is_active = true
      `);
      const hasGamingUsage = parseInt(gamingUsageResult.rows[0].count) > 0;
      
      // Calculate expected builds correctly
      let expectedBuilds;
      const usageCount = parseInt(params.usage_types);
      const budgetCount = parseInt(params.budget_ranges);
      const perfCount = parseInt(params.performance_prefs);
      const gamingPrefCount = parseInt(params.gaming_prefs);
      
      if (hasGamingUsage && gamingPrefCount > 0) {
        // Gaming usage gets multiplied by gaming preferences
        // Non-gaming usages get normal multiplication
        const gamingBuilds = 1 * budgetCount * perfCount * gamingPrefCount;
        const nonGamingBuilds = (usageCount - 1) * budgetCount * perfCount;
        expectedBuilds = gamingBuilds + nonGamingBuilds;
      } else {
        // No gaming preferences, simple multiplication
        expectedBuilds = usageCount * budgetCount * perfCount;
      }

      // Get actual build count
      const buildCountResult = await query(`
        SELECT COUNT(*) as count FROM pc_customized_ai_reference_builds WHERE is_active = true
      `);
      
      const actualBuilds = parseInt(buildCountResult.rows[0].count);

      res.json({
        success: true,
        data: {
          totalBuilds: actualBuilds,
          expectedBuilds: expectedBuilds,
          isComplete: actualBuilds >= expectedBuilds,
          parameters: {
            usageTypes: parseInt(params.usage_types),
            budgetRanges: parseInt(params.budget_ranges),
            performancePrefs: parseInt(params.performance_prefs),
            gamingPrefs: parseInt(params.gaming_prefs)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching statistics', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: error.message
      });
    }
  }

  /**
   * Get new products not yet in PC Customized AI builds
   */
  static async getNewProducts(req, res) {
    try {
      // Get all product IDs used in builds
      const usedProductsResult = await query(`
        SELECT DISTINCT 
          cpu_id, gpu_id, motherboard_id, ram_id, storage_id, psu_id, case_id, cooling_id
        FROM pc_customized_ai_reference_builds
        WHERE is_active = true
      `);

      const usedProductIds = new Set();
      usedProductsResult.rows.forEach(row => {
        Object.values(row).forEach(id => {
          if (id) usedProductIds.add(id);
        });
      });

      // Get all active products
      const allProductsResult = await query(`
        SELECT id, name, category, price
        FROM pc_parts
        WHERE is_active = true
        AND category IN ('CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling')
        ORDER BY category, name
      `);

      const allProducts = allProductsResult.rows;
      const newProducts = allProducts.filter(p => !usedProductIds.has(p.id));

      logger.info('New products not in PC Customized AI builds', {
        totalProducts: allProducts.length,
        usedProducts: usedProductIds.size,
        newProducts: newProducts.length
      });

      res.json({
        success: true,
        data: {
          newProducts: newProducts,
          hasNewProducts: newProducts.length > 0,
          statistics: {
            totalProductsInDatabase: allProducts.length,
            totalProductsUsedInBuilds: usedProductIds.size,
            totalProductsNotInBuilds: newProducts.length
          }
        }
      });
    } catch (error) {
      logger.error('Error getting new products', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get new products',
        error: error.message
      });
    }
  }

  /**
   * Get regeneration status
   */
  static async getStatus(req, res) {
    try {
      // Try to check metadata table for actual status
      let metadataResult;
      try {
        metadataResult = await query(`
          SELECT * FROM pc_customized_ai_builds_metadata
          ORDER BY generated_at DESC NULLS LAST, id DESC
          LIMIT 1
        `);
      } catch (metaError) {
        // Table doesn't exist yet, fall back to counting (expected on first load)
        metadataResult = { rows: [] };
      }

      if (metadataResult.rows.length === 0) {
        // Fall back to counting builds
        const countResult = await query(`
          SELECT COUNT(*) as count, MAX(generated_at) as last_generated
          FROM pc_customized_ai_reference_builds
          WHERE is_active = true
        `);
        
        return res.json({
          success: true,
          data: {
            status: 'idle',
            totalBuilds: parseInt(countResult.rows[0].count),
            lastGenerated: countResult.rows[0].last_generated
          }
        });
      }

      const metadata = metadataResult.rows[0];
      res.json({
        success: true,
        data: {
          status: metadata.status || 'unknown',
          totalBuilds: metadata.total_builds,
          lastGenerated: metadata.generated_at
        }
      });
    } catch (error) {
      logger.error('Error getting status', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get status',
        error: error.message
      });
    }
  }

  /**
   * Regenerate all PC Customized AI builds
   */
  static async regenerateBuilds(req, res) {
    try {
      logger.info('Starting PC Customized AI builds regeneration...');
      const userId = req.user?.user_id || null;
      
      // Create metadata table and insert in_progress status
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS pc_customized_ai_builds_metadata (
            id SERIAL PRIMARY KEY,
            total_builds INTEGER DEFAULT 0,
            generated_by INTEGER,
            status VARCHAR(50) DEFAULT 'pending',
            generated_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        
        await query(`
          INSERT INTO pc_customized_ai_builds_metadata 
          (total_builds, generated_by, status)
          VALUES ($1, $2, $3)
        `, [0, userId, 'in_progress']);
        logger.info('✅ PC Customized AI metadata: in_progress');
      } catch (metaError) {
        logger.warn('⚠️  Metadata tracking unavailable:', metaError.message);
        logger.warn('   Error code:', metaError.code);
        logger.warn('   Error name:', metaError.name);
        logger.warn('   Full error object:', JSON.stringify(metaError, null, 2));
        console.error('🔥 Raw CREATE TABLE error:', metaError);
      }
      
      // Import the generator service
      const PCCustomizedAIBuildGenerator = require('../services/pcCustomizedAIBuildGenerator');
      
      // Run generation in background
      setTimeout(async () => {
        const startTime = Date.now();
        try {
          logger.info('🔧 PC Customized AI: Starting batch generation service...');
          const result = await PCCustomizedAIBuildGenerator.generateAllBuilds();
          const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
          logger.info(`✅ PC Customized AI: Completed in ${totalDuration}s TOTAL`);
          
          // Extract total builds count from result object and validate
          const totalBuilds = Number(result?.totalBuildsGenerated ?? result ?? 0);
          const generationErrors = Array.isArray(result?.errors) ? result.errors : [];

          if (!Number.isFinite(totalBuilds) || totalBuilds < 0 || generationErrors.length > 0) {
            const errorMsg = generationErrors.map(e => e.error || e).join('; ') || 'Unknown generation error';
            throw new Error(`Generation returned errors or invalid totalBuilds (${totalBuilds}): ${errorMsg}`);
          }
          
          // Update metadata to success
          try {
            const updateResult = await query(`
              UPDATE pc_customized_ai_builds_metadata 
              SET status = $1, total_builds = $2, generated_at = NOW()
              WHERE id = (SELECT MAX(id) FROM pc_customized_ai_builds_metadata)
              RETURNING id
            `, ['success', totalBuilds]);
            
            if (updateResult.rows.length === 0) {
              await query(`
                INSERT INTO pc_customized_ai_builds_metadata 
                (total_builds, generated_by, status)
                VALUES ($1, $2, $3)
              `, [totalBuilds, userId, 'success']);
              logger.info('✅ Metadata created with success status');
            } else {
              logger.info('✅ Metadata updated to success');
            }
          } catch (metaError) {
            logger.warn('⚠️  Could not update metadata:', metaError.message);
            logger.warn('   Error code:', metaError.code);
            logger.warn('   Full error:', metaError);
          }
        } catch (error) {
          const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
          logger.error('❌ PC Customized AI regeneration FAILED', {
            error: error.message,
            code: error.code,
            stack: error.stack,
            failedAfter: `${totalDuration}s`
          });
          console.error('🔥 FULL ERROR DETAILS:', error);
          
          // Update metadata to failed
          try {
            const updateResult = await query(`
              UPDATE pc_customized_ai_builds_metadata 
              SET status = $1, total_builds = $2
              WHERE id = (SELECT MAX(id) FROM pc_customized_ai_builds_metadata)
              RETURNING id
            `, ['failed', 0]);
            
            if (updateResult.rows.length === 0) {
              await query(`
                INSERT INTO pc_customized_ai_builds_metadata 
                (total_builds, generated_by, status)
                VALUES ($1, $2, $3)
              `, [0, userId, 'failed']);
            }
          } catch (metaError) {
            logger.warn('⚠️  Could not update failed status:', metaError.message);
          }
        }
      }, 100);

      res.json({
        success: true,
        message: 'Build regeneration started',
        data: {
          status: 'in_progress',
          startedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error starting regeneration', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to start regeneration',
        error: error.message
      });
    }
  }
}

module.exports = PCCustomizedAIBuildsController;

