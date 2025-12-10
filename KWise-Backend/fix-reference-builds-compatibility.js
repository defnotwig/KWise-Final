/**
 * ============================================================================
 * FIX REFERENCE BUILDS COMPATIBILITY ISSUES
 * ============================================================================
 * 
 * This script fixes the 98 reference builds with CPU/Motherboard socket mismatches
 * by replacing incompatible motherboards with compatible ones.
 * 
 * ROOT CAUSE: pcCustomizedAIBuildGenerator was selecting motherboards without
 * validating CPU socket compatibility.
 * 
 * SOLUTION:
 * 1. Find all builds with socket mismatches
 * 2. For each mismatch, find a compatible motherboard
 * 3. Update the build with the compatible motherboard
 * 4. Verify all builds are now compatible
 * 
 * Author: K-Wise Development Team
 * Date: December 10, 2025
 */

const { query } = require('./config/db');
const logger = require('./utils/logger');

class ReferenceBuildsCompatibilityFixer {
  
  /**
   * Main execution function
   */
  static async fix() {
    try {
      logger.info('🔧 Starting Reference Builds Compatibility Fix...');
      
      // Step 1: Find all socket mismatches
      const mismatches = await this.findSocketMismatches();
      logger.info(`❌ Found ${mismatches.length} builds with socket mismatches`);
      
      if (mismatches.length === 0) {
        logger.info('✅ No mismatches found! All builds are compatible.');
        return { success: true, fixed: 0 };
      }
      
      // Step 2: Fix each mismatch
      let fixed = 0;
      let failed = 0;
      const failures = [];
      
      for (const mismatch of mismatches) {
        try {
          await this.fixBuild(mismatch);
          fixed++;
          logger.info(`✅ Fixed build ${mismatch.build_key} (${fixed}/${mismatches.length})`);
        } catch (error) {
          failed++;
          failures.push({ build_key: mismatch.build_key, error: error.message });
          logger.error(`❌ Failed to fix ${mismatch.build_key}:`, error.message);
        }
      }
      
      // Step 3: Verify all builds are now compatible
      const remainingMismatches = await this.findSocketMismatches();
      
      logger.info('');
      logger.info('📊 FIX SUMMARY:');
      logger.info(`  ✅ Fixed: ${fixed}`);
      logger.info(`  ❌ Failed: ${failed}`);
      logger.info(`  ⚠️  Remaining mismatches: ${remainingMismatches.length}`);
      
      if (remainingMismatches.length > 0) {
        logger.warn('⚠️  Some builds still have mismatches. Manual intervention required.');
        logger.warn('Remaining mismatches:', remainingMismatches.map(m => m.build_key));
      }
      
      if (failures.length > 0) {
        logger.error('❌ Failed builds:', failures);
      }
      
      return {
        success: remainingMismatches.length === 0,
        fixed,
        failed,
        failures,
        remainingMismatches: remainingMismatches.length
      };
      
    } catch (error) {
      logger.error('💥 Fatal error during fix:', error);
      throw error;
    }
  }
  
  /**
   * Find all builds with CPU/Motherboard socket mismatches
   */
  static async findSocketMismatches() {
    const result = await query(`
      SELECT 
        b.id,
        b.build_key,
        b.cpu_id,
        b.motherboard_id,
        cpu.name as cpu_name,
        cpu.specifications->>'socket' as cpu_socket,
        mb.name as mb_name,
        mb.specifications->>'socket' as mb_socket
      FROM pc_customized_ai_reference_builds b
      JOIN pc_parts cpu ON b.cpu_id = cpu.id
      JOIN pc_parts mb ON b.motherboard_id = mb.id
      WHERE cpu.specifications->>'socket' != mb.specifications->>'socket'
        AND b.is_active = true
      ORDER BY b.id
    `);
    
    return result.rows;
  }
  
  /**
   * Fix a single build by finding and updating to a compatible motherboard
   */
  static async fixBuild(mismatch) {
    const { id, build_key, cpu_id, cpu_socket, motherboard_id } = mismatch;
    
    // Get current build details
    const buildResult = await query(`
      SELECT * FROM pc_customized_ai_reference_builds WHERE id = $1
    `, [id]);
    
    const build = buildResult.rows[0];
    
    // Find a compatible motherboard
    const compatibleMB = await this.findCompatibleMotherboard(
      cpu_socket,
      build.motherboard_id, // current motherboard to exclude
      build.target_budget || 50000,
      build.performance_preference || 'balanced'
    );
    
    if (!compatibleMB) {
      throw new Error(`No compatible motherboard found for socket ${cpu_socket}`);
    }
    
    logger.info(`  🔄 ${build_key}: Replacing MB ${motherboard_id} (${mismatch.mb_socket}) → ${compatibleMB.id} (${compatibleMB.socket})`);
    
    // Update the build
    await query(`
      UPDATE pc_customized_ai_reference_builds
      SET motherboard_id = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [compatibleMB.id, id]);
    
    // Verify fix
    const verifyResult = await query(`
      SELECT 
        cpu.specifications->>'socket' as cpu_socket,
        mb.specifications->>'socket' as mb_socket
      FROM pc_customized_ai_reference_builds b
      JOIN pc_parts cpu ON b.cpu_id = cpu.id
      JOIN pc_parts mb ON b.motherboard_id = mb.id
      WHERE b.id = $1
    `, [id]);
    
    const verify = verifyResult.rows[0];
    if (verify.cpu_socket !== verify.mb_socket) {
      throw new Error(`Fix failed - sockets still mismatch: ${verify.cpu_socket} vs ${verify.mb_socket}`);
    }
    
    return true;
  }
  
  /**
   * Find a compatible motherboard for the given CPU socket
   */
  static async findCompatibleMotherboard(socket, excludeId, budget, performancePreference) {
    // Determine price range based on budget and performance preference
    let minPrice, maxPrice;
    
    if (performancePreference === 'budget') {
      minPrice = budget * 0.05; // 5% of budget
      maxPrice = budget * 0.12; // 12% of budget
    } else if (performancePreference === 'performance') {
      minPrice = budget * 0.08;
      maxPrice = budget * 0.18;
    } else { // balanced
      minPrice = budget * 0.06;
      maxPrice = budget * 0.15;
    }
    
    const result = await query(`
      SELECT 
        id,
        name,
        price,
        specifications->>'socket' as socket,
        specifications->>'memory_type' as memory_type,
        specifications->>'form_factor' as form_factor
      FROM pc_parts
      WHERE category = 'Motherboard'
        AND is_active = true
        AND specifications->>'socket' = $1
        AND id != $2
        AND price BETWEEN $3 AND $4
      ORDER BY price ASC
      LIMIT 1
    `, [socket, excludeId, minPrice, maxPrice]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Fallback: Try without price constraints
    const fallbackResult = await query(`
      SELECT 
        id,
        name,
        price,
        specifications->>'socket' as socket,
        specifications->>'memory_type' as memory_type,
        specifications->>'form_factor' as form_factor
      FROM pc_parts
      WHERE category = 'Motherboard'
        AND is_active = true
        AND specifications->>'socket' = $1
        AND id != $2
      ORDER BY price ASC
      LIMIT 1
    `, [socket, excludeId]);
    
    return fallbackResult.rows[0] || null;
  }
  
  /**
   * Verify all reference builds are compatible
   */
  static async verifyAllBuilds() {
    logger.info('🔍 Verifying all reference builds...');
    
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN cpu.specifications->>'socket' = mb.specifications->>'socket' THEN 1 ELSE 0 END) as compatible,
        SUM(CASE WHEN cpu.specifications->>'socket' != mb.specifications->>'socket' THEN 1 ELSE 0 END) as incompatible
      FROM pc_customized_ai_reference_builds b
      JOIN pc_parts cpu ON b.cpu_id = cpu.id
      JOIN pc_parts mb ON b.motherboard_id = mb.id
      WHERE b.is_active = true
    `);
    
    const stats = result.rows[0];
    
    logger.info('');
    logger.info('📊 VERIFICATION RESULTS:');
    logger.info(`  Total builds: ${stats.total}`);
    logger.info(`  ✅ Compatible: ${stats.compatible}`);
    logger.info(`  ❌ Incompatible: ${stats.incompatible}`);
    
    return {
      total: parseInt(stats.total),
      compatible: parseInt(stats.compatible),
      incompatible: parseInt(stats.incompatible)
    };
  }
}

// Run the fix if executed directly
if (require.main === module) {
  (async () => {
    try {
      const result = await ReferenceBuildsCompatibilityFixer.fix();
      
      // Verify all builds
      await ReferenceBuildsCompatibilityFixer.verifyAllBuilds();
      
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      logger.error('💥 Script failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = ReferenceBuildsCompatibilityFixer;
