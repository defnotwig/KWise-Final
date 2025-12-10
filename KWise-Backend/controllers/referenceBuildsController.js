/**
 * REFERENCE BUILDS CONTROLLER
 * 
 * Manages the 72 reference PC builds used for PC upgrade estimation:
 * - Fetch all builds for admin display
 * - Detect new products not yet in builds
 * - Regenerate builds with updated parameters
 * - Manually edit specific builds
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

class ReferenceBuildsController {
  
  /**
   * Get all reference builds (72 total)
   */
  static async getAllBuilds(req, res) {
    try {
      const buildsPath = path.join(__dirname, '../ai/utils/referenceBuilds.js');
      
      // Read the file
      const fileContent = await fs.readFile(buildsPath, 'utf8');
      
      // Extract the builds object from the module
      // This is safer than require() which caches
      const builds = require('../ai/utils/referenceBuilds');
      
      // Get metadata
      
      const metadataResult = await query(`
        SELECT * FROM pc_upgrade_reference_builds_metadata
        ORDER BY generated_at DESC
        LIMIT 1
      `);

      const metadata = metadataResult.rows[0] || {
        total_builds: Object.keys(builds).length,
        generated_at: null,
        generated_by: null,
        status: 'unknown'
      };

      logger.info('Fetched all reference builds', { 
        count: Object.keys(builds).length,
        metadata: metadata.generated_at 
      });
      
      res.json({
        success: true,
        data: {
          builds: builds,
          metadata: metadata,
          totalBuilds: Object.keys(builds).length
        }
      });
    } catch (error) {
      logger.error('Error fetching reference builds', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reference builds',
        error: error.message
      });
    }
  }

  /**
   * Get active/enabled reference builds only
   * Returns builds that are marked as active and ready for use
   */
  static async getActiveBuilds(req, res) {
    try {
      const builds = require('../ai/utils/referenceBuilds');
      
      // Filter only active builds (all builds are active by default unless marked otherwise)
      const activeBuilds = {};
      Object.entries(builds).forEach(([key, build]) => {
        // Include build if it's not explicitly disabled
        if (build.enabled !== false && build.active !== false) {
          activeBuilds[key] = build;
        }
      });

      logger.info('Fetched active reference builds', { 
        totalBuilds: Object.keys(builds).length,
        activeBuilds: Object.keys(activeBuilds).length
      });
      
      res.json({
        success: true,
        data: activeBuilds,
        count: Object.keys(activeBuilds).length,
        totalBuilds: Object.keys(builds).length
      });
    } catch (error) {
      logger.error('Error fetching active reference builds', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active reference builds',
        error: error.message
      });
    }
  }

  /**
   * Get new products not yet in reference builds
   * Returns only products that exist in database but NOT used in any reference build
   */
  static async getNewProducts(req, res) {
    try {
      // Load reference builds to get all product IDs currently in use
      const referenceBuilds = require('../ai/utils/referenceBuilds');
      
      // Extract all product IDs from reference builds
      const productIdsInBuilds = new Set();
      Object.values(referenceBuilds).forEach(build => {
        if (build.components) {
          Object.values(build.components).forEach(component => {
            if (component.productId) {
              productIdsInBuilds.add(component.productId);
            }
          });
        }
      });

      logger.info('Product IDs in reference builds', { 
        count: productIdsInBuilds.size,
        ids: Array.from(productIdsInBuilds).slice(0, 10)
      });

      // Get metadata for last generation time
      const metadataResult = await query(`
        SELECT generated_at, total_builds FROM pc_upgrade_reference_builds_metadata
        ORDER BY generated_at DESC NULLS LAST
        LIMIT 1
      `);

      const lastGenerated = metadataResult.rows[0]?.generated_at;
      const totalBuilds = metadataResult.rows[0]?.total_builds || 0;

      // Get ALL active products in relevant categories
      const allProductsResult = await query(`
        SELECT 
          id as product_id,
          name,
          category,
          brand as subcategory,
          price,
          stock,
          created_at
        FROM pc_parts
        WHERE is_active = true
        AND category IN ('GPU', 'CPU', 'RAM', 'Storage', 'Motherboard', 'PSU', 'Case', 'Cooling')
        ORDER BY created_at DESC, category, name
      `);

      const allProducts = allProductsResult.rows;

      // Separate products into: used in builds vs not used in builds
      const productsInBuilds = [];
      const productsNotInBuilds = [];

      allProducts.forEach(product => {
        if (productIdsInBuilds.has(product.product_id)) {
          productsInBuilds.push(product);
        } else {
          productsNotInBuilds.push(product);
        }
      });

      // Group new products by category
      const groupedNewProducts = {};
      const categoryStats = {};

      allProducts.forEach(product => {
        const category = product.category || 'Unknown';
        
        // Initialize category stats
        if (!categoryStats[category]) {
          categoryStats[category] = {
            total: 0,
            usedInBuilds: 0,
            notUsedInBuilds: 0
          };
        }
        categoryStats[category].total++;

        if (productIdsInBuilds.has(product.product_id)) {
          categoryStats[category].usedInBuilds++;
        } else {
          categoryStats[category].notUsedInBuilds++;
          
          // Add to grouped new products
          if (!groupedNewProducts[category]) {
            groupedNewProducts[category] = [];
          }
          groupedNewProducts[category].push(product);
        }
      });

      logger.info('Product analysis complete', { 
        totalProducts: allProducts.length,
        usedInBuilds: productsInBuilds.length,
        notUsedInBuilds: productsNotInBuilds.length,
        categories: Object.keys(categoryStats)
      });
      
      res.json({
        success: true,
        data: {
          // New products NOT in builds (this is what gets displayed)
          newProducts: productsNotInBuilds,
          groupedByCategory: groupedNewProducts,
          totalNewProducts: productsNotInBuilds.length,
          
          // Statistics for display
          statistics: {
            totalProductsInDatabase: allProducts.length,
            totalProductsUsedInBuilds: productsInBuilds.length,
            totalProductsNotInBuilds: productsNotInBuilds.length,
            totalBuilds: totalBuilds,
            productIdsInBuilds: productIdsInBuilds.size,
            byCategory: categoryStats
          },
          
          // Metadata
          lastGenerated: lastGenerated,
          hasNewProducts: productsNotInBuilds.length > 0
        }
      });
    } catch (error) {
      logger.error('Error fetching new products', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch new products',
        error: error.message
      });
    }
  }

  /**
   * Regenerate reference builds using current parameters
   */
  static async regenerateBuilds(req, res) {
    try {
      
      const userId = req.user?.user_id || null;

      // Get current parameters to verify they exist
      const [usageTypes, yearRanges, budgetRanges] = await Promise.all([
        query('SELECT COUNT(*) as count FROM pc_upgrade_usage_types WHERE is_active = true'),
        query('SELECT COUNT(*) as count FROM pc_upgrade_year_ranges WHERE is_active = true'),
        query('SELECT COUNT(*) as count FROM pc_upgrade_budget_ranges WHERE is_active = true')
      ]);

      const usageCount = parseInt(usageTypes.rows[0].count);
      const yearCount = parseInt(yearRanges.rows[0].count);
      const budgetCount = parseInt(budgetRanges.rows[0].count);
      const expectedBuilds = usageCount * yearCount * budgetCount;

      logger.info('Starting reference builds regeneration', {
        usageTypes: usageCount,
        yearRanges: yearCount,
        budgetRanges: budgetCount,
        expectedBuilds: expectedBuilds,
        initiatedBy: userId
      });

      // Update metadata - mark as in-progress (create table if doesn't exist)
      try {
        // First ensure table exists
        await query(`
          CREATE TABLE IF NOT EXISTS pc_upgrade_reference_builds_metadata (
            id SERIAL PRIMARY KEY,
            total_builds INTEGER DEFAULT 0,
            generated_by INTEGER REFERENCES users(user_id),
            status VARCHAR(50) DEFAULT 'pending',
            file_path TEXT DEFAULT 'ai/utils/referenceBuilds.js',
            generated_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        
        // Insert new row for this regeneration
        await query(`
          INSERT INTO pc_upgrade_reference_builds_metadata 
          (total_builds, generated_by, status, file_path)
          VALUES ($1, $2, $3, $4)
        `, [0, userId, 'in_progress', 'ai/utils/referenceBuilds.js']);
        logger.info('✅ Metadata table ready: in_progress');
      } catch (metaError) {
        logger.warn('⚠️  Metadata tracking unavailable:', metaError.message);
        // Continue anyway - metadata is optional
      }

      // Import the generator service
      const PCUpgradeBuildGenerator = require('../services/pcUpgradeBuildGenerator');
      
      // Run generation in background (optimized for 30-60 second execution)
      setTimeout(async () => {
        try {
          logger.info('🔧 PC Upgrade: Starting build generation service...');
          const result = await PCUpgradeBuildGenerator.generateAllBuilds();
          logger.info('🎉 PC Upgrade: Generation service completed successfully');
          
          logger.info('✅ Reference builds regeneration completed', {
            totalBuilds: result.totalBuilds,
            validBuilds: result.validBuilds,
            duration: result.duration
          });

          // Update metadata - mark as success (use UPSERT to handle missing rows)
          try {
            const updateResult = await query(`
              UPDATE pc_upgrade_reference_builds_metadata 
              SET status = $1, total_builds = $2, generated_at = NOW()
              WHERE id = (SELECT MAX(id) FROM pc_upgrade_reference_builds_metadata)
              RETURNING id
            `, ['success', result.totalBuilds]);
            
            // If no row was updated, insert a new one
            if (updateResult.rows.length === 0) {
              await query(`
                INSERT INTO pc_upgrade_reference_builds_metadata 
                (total_builds, generated_by, status, file_path)
                VALUES ($1, $2, $3, $4)
              `, [result.totalBuilds, userId, 'success', 'ai/utils/referenceBuilds.js']);
              logger.info('✅ Metadata created with success status');
            } else {
              logger.info('✅ Metadata updated to success');
            }
          } catch (metaError) {
            logger.warn('⚠️  Could not update metadata:', metaError.message);
          }

          // Clear new products tracking
          await query(`
            UPDATE pc_upgrade_new_products 
            SET status = 'processed'
            WHERE status = 'pending'
          `);
        } catch (error) {
          logger.error('❌ PC Upgrade regeneration FAILED', { 
            error: error.message,
            code: error.code,
            stack: error.stack,
            name: error.name,
            details: error.toString()
          });
          console.error('🔥 FULL ERROR DETAILS:', error);

          // Update metadata - mark as failed (use UPSERT)
          try {
            const updateResult = await query(`
              UPDATE pc_upgrade_reference_builds_metadata 
              SET status = $1, total_builds = $2
              WHERE id = (SELECT MAX(id) FROM pc_upgrade_reference_builds_metadata)
              RETURNING id
            `, ['failed', 0]);
            
            if (updateResult.rows.length === 0) {
              await query(`
                INSERT INTO pc_upgrade_reference_builds_metadata 
                (total_builds, generated_by, status, file_path)
                VALUES ($1, $2, $3, $4)
              `, [0, userId, 'failed', 'ai/utils/referenceBuilds.js']);
            }
          } catch (metaError) {
            logger.warn('⚠️  Could not update failed status:', metaError.message);
          }
        }
      }, 100);

      // Return immediately (async process)
      res.json({
        success: true,
        message: 'Build regeneration started',
        data: {
          expectedBuilds: expectedBuilds,
          parameters: {
            usageTypes: usageCount,
            yearRanges: yearCount,
            budgetRanges: budgetCount
          },
          status: 'in_progress'
        }
      });

    } catch (error) {
      logger.error('Error starting build regeneration', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to start build regeneration',
        error: error.message
      });
    }
  }

  /**
   * Get build regeneration status
   */
  static async getRegenerationStatus(req, res) {
    try {
      // Try to query metadata table, handle if it doesn't exist
      let result;
      try {
        result = await query(`
          SELECT * FROM pc_upgrade_reference_builds_metadata
          ORDER BY generated_at DESC NULLS LAST, id DESC
          LIMIT 1
        `);
      } catch (metaError) {
        // Table doesn't exist yet (expected on first load)
        result = { rows: [] };
      }

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            status: 'idle',
            message: 'No regeneration in progress'
          }
        });
      }

      const metadata = result.rows[0];

      res.json({
        success: true,
        data: {
          status: metadata.status || 'unknown',
          totalBuilds: metadata.total_builds,
          generatedAt: metadata.generated_at,
          generatedBy: metadata.generated_by,
          filePath: metadata.file_path
        }
      });

    } catch (error) {
      logger.error('Error fetching regeneration status', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch regeneration status',
        error: error.message
      });
    }
  }

  /**
   * Edit a specific reference build
   */
  static async editBuild(req, res) {
    try {
      const { buildKey } = req.params;
      const { buildData } = req.body;
      const userId = req.user?.user_id || null;

      if (!buildKey || !buildData) {
        return res.status(400).json({
          success: false,
          message: 'Build key and build data are required'
        });
      }

      // Validate build structure
      const requiredFields = ['usage', 'yearRange', 'budgetRange', 'components'];
      const missingFields = requiredFields.filter(field => !buildData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      // Load current builds
      const buildsPath = path.join(__dirname, '../ai/utils/referenceBuilds.js');
      const builds = require('../ai/utils/referenceBuilds');

      // Check if build exists
      if (!builds[buildKey]) {
        return res.status(404).json({
          success: false,
          message: `Build '${buildKey}' not found`
        });
      }

      // Update build
      builds[buildKey] = buildData;

      // Write back to file
      const fileContent = `/**
 * REFERENCE PC BUILDS FOR UPGRADE ESTIMATION
 * 
 * Auto-generated from database using rebuild-reference-builds-from-db.js
 * Last Updated: ${new Date().toISOString()}
 * Total Builds: ${Object.keys(builds).length}
 * 
 * DO NOT EDIT MANUALLY - Use admin interface to regenerate
 */

const REFERENCE_BUILDS = ${JSON.stringify(builds, null, 2)};

module.exports = REFERENCE_BUILDS;
`;

      await fs.writeFile(buildsPath, fileContent, 'utf8');

      // Clear require cache to reload module
      delete require.cache[require.resolve('../ai/utils/referenceBuilds')];

      logger.info('Reference build edited', { 
        buildKey, 
        editedBy: userId 
      });

      res.json({
        success: true,
        message: 'Build updated successfully',
        data: {
          buildKey: buildKey,
          updatedBuild: buildData
        }
      });

    } catch (error) {
      logger.error('Error editing build', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to edit build',
        error: error.message
      });
    }
  }

  /**
   * Get build statistics
   */
  static async getBuildStatistics(req, res) {
    try {
      const builds = require('../ai/utils/referenceBuilds');
      

      // Calculate statistics
      const stats = {
        totalBuilds: Object.keys(builds).length,
        byUsage: {},
        byYearRange: {},
        byBudgetRange: {},
        averagePriceByUsage: {},
        componentsUsed: new Set()
      };

      Object.values(builds).forEach(build => {
        // Count by usage
        stats.byUsage[build.usage] = (stats.byUsage[build.usage] || 0) + 1;
        
        // Count by year range
        stats.byYearRange[build.yearRange] = (stats.byYearRange[build.yearRange] || 0) + 1;
        
        // Count by budget range
        stats.byBudgetRange[build.budgetRange] = (stats.byBudgetRange[build.budgetRange] || 0) + 1;

        // Calculate average price
        if (!stats.averagePriceByUsage[build.usage]) {
          stats.averagePriceByUsage[build.usage] = [];
        }
        
        const totalPrice = Object.values(build.components || {})
          .reduce((sum, comp) => sum + parseFloat(comp.price || 0), 0);
        
        stats.averagePriceByUsage[build.usage].push(totalPrice);

        // Track components used
        Object.keys(build.components || {}).forEach(comp => {
          stats.componentsUsed.add(comp);
        });
      });

      // Calculate averages
      Object.keys(stats.averagePriceByUsage).forEach(usage => {
        const prices = stats.averagePriceByUsage[usage];
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        stats.averagePriceByUsage[usage] = Math.round(avg);
      });

      stats.componentsUsed = Array.from(stats.componentsUsed);

      // Get parameter counts from database
      const [usageTypes, yearRanges, budgetRanges] = await Promise.all([
        query('SELECT COUNT(*) as count FROM pc_upgrade_usage_types WHERE is_active = true'),
        query('SELECT COUNT(*) as count FROM pc_upgrade_year_ranges WHERE is_active = true'),
        query('SELECT COUNT(*) as count FROM pc_upgrade_budget_ranges WHERE is_active = true')
      ]);

      stats.expectedBuilds = 
        parseInt(usageTypes.rows[0].count) * 
        parseInt(yearRanges.rows[0].count) * 
        parseInt(budgetRanges.rows[0].count);

      stats.isComplete = stats.totalBuilds === stats.expectedBuilds;

      logger.info('Generated build statistics', { totalBuilds: stats.totalBuilds });

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error generating build statistics', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to generate build statistics',
        error: error.message
      });
    }
  }

  /**
   * Get parameters summary for dynamic validation
   * Returns active counts and expected builds calculation
   */
  static async getParameters(req, res) {
    try {
      // Fetch active counts from parameter tables
      const [usageTypes, yearRanges, budgetRanges] = await Promise.all([
        query('SELECT COUNT(*) as count FROM pc_upgrade_usage_types WHERE is_active = true'),
        query('SELECT COUNT(*) as count FROM pc_upgrade_year_ranges WHERE is_active = true'),
        query('SELECT COUNT(*) as count FROM pc_upgrade_budget_ranges WHERE is_active = true')
      ]);

      const counts = {
        usageTypes: parseInt(usageTypes.rows[0].count),
        yearRanges: parseInt(yearRanges.rows[0].count),
        budgetRanges: parseInt(budgetRanges.rows[0].count)
      };

      // Calculate expected builds
      const expectedBuilds = counts.usageTypes * counts.yearRanges * counts.budgetRanges;

      // Create formula string
      const formula = `${counts.usageTypes} × ${counts.yearRanges} × ${counts.budgetRanges} = ${expectedBuilds}`;

      logger.info('Fetched parameters', { 
        counts, 
        expectedBuilds, 
        formula 
      });

      res.json({
        success: true,
        data: {
          ...counts,
          expectedBuilds,
          formula
        }
      });

    } catch (error) {
      logger.error('Error fetching parameters', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch parameters',
        error: error.message
      });
    }
  }
}

module.exports = ReferenceBuildsController;
