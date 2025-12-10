/**
 * ============================================================================
 * POPULATE COMPATIBILITY MATRIX - Pre-compute 20,000+ Component Pairs
 * ============================================================================
 * 
 * Purpose: Generate pre-computed compatibility scores for common component pairs
 * Target: 20,000+ pairs for < 50ms lookups
 * 
 * Pre-computed Pairs:
 * - CPU ↔ Motherboard (100 × 100 = 10,000 pairs)
 * - GPU ↔ PSU (50 × 50 = 2,500 pairs)
 * - Cooler ↔ CPU (50 × 100 = 5,000 pairs)
 * - Storage ↔ Motherboard (50 × 50 = 2,500 pairs)
 * 
 * Features:
 * - Batch processing (100 pairs at a time)
 * - Progress tracking
 * - Error handling
 * - Duplicate prevention (ON CONFLICT DO UPDATE)
 * - Execution time tracking
 * 
 * Usage:
 *   node scripts/populate-compatibility-matrix.js
 * 
 * Author: GitHub Copilot
 * Created: 2025-11-13
 * ============================================================================
 */

const db = require('../config/db');
const logger = require('../utils/logger');
const advancedCompatibilityService = require('../services/advancedCompatibilityService');

class CompatibilityMatrixPopulator {
    constructor() {
        this.batchSize = 10; // Process 10 pairs at a time (advancedCompatibilityService is heavy)
        this.totalPairs = 0;
        this.processedPairs = 0;
        this.successfulPairs = 0;
        this.failedPairs = 0;
        this.startTime = null;
    }

    /**
     * Get top N products by category
     */
    async getTopProducts(category, limit) {
        try {
            const result = await db.query(`
                SELECT 
                    id,
                    name,
                    brand,
                    category,
                    tier,
                    price,
                    specifications
                FROM pc_parts
                WHERE category = $1
                  AND is_active = true
                ORDER BY 
                    CASE tier
                        WHEN 'elite' THEN 1
                        WHEN 'high-tier' THEN 2
                        WHEN 'mid-tier' THEN 3
                        WHEN 'entry' THEN 4
                        ELSE 5
                    END,
                    price DESC,
                    name ASC
                LIMIT $2
            `, [category, limit]);

            logger.info(`✅ Found ${result.rows.length} ${category} products`);
            return result.rows;

        } catch (error) {
            logger.error(`❌ Error fetching ${category} products:`, error.message);
            return [];
        }
    }

    /**
     * Generate component pairs for compatibility matrix
     */
    generatePairs(componentsA, componentsB, pairType) {
        const pairs = [];
        
        for (const compA of componentsA) {
            for (const compB of componentsB) {
                // Skip self-pairing (same component ID)
                if (compA.id === compB.id) continue;
                
                // Create ordered pair (smaller ID first for consistency)
                const [productA, productB] = compA.id < compB.id 
                    ? [compA, compB] 
                    : [compB, compA];
                
                pairs.push({
                    productA,
                    productB,
                    pairType,
                    categoryA: productA.category,
                    categoryB: productB.category
                });
            }
        }
        
        return pairs;
    }

    /**
     * Process a single batch of pairs
     */
    async processBatch(pairs, batchNumber, totalBatches) {
        logger.info(`\n📦 Processing Batch ${batchNumber}/${totalBatches} (${pairs.length} pairs)...`);
        
        const batchStartTime = Date.now();
        let batchSuccess = 0;
        let batchFailed = 0;

        for (const pair of pairs) {
            try {
                // Build components object for advancedCompatibilityService
                const components = {
                    [pair.categoryA]: pair.productA,
                    [pair.categoryB]: pair.productB
                };

                // Run full 6-layer compatibility analysis
                const result = await advancedCompatibilityService.analyzeFullBuild(components);

                // Extract key metrics
                const compatibilityScore = result.compatibility_score || 0;
                const compatible = result.compatible || false;
                const criticalIssues = JSON.stringify(result.critical_issues || []);
                const warnings = JSON.stringify(result.warnings || []);
                const recommendations = JSON.stringify(result.recommendations || []);
                const layers = JSON.stringify(result.layers || {});

                // Insert or update compatibility matrix
                await db.query(`
                    INSERT INTO compatibility_matrix (
                        product_a_id,
                        product_b_id,
                        compatibility_score,
                        compatible,
                        critical_issues,
                        warnings,
                        recommendations,
                        layers,
                        pair_type,
                        last_updated,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                    ON CONFLICT (product_a_id, product_b_id) 
                    DO UPDATE SET
                        compatibility_score = $3,
                        compatible = $4,
                        critical_issues = $5,
                        warnings = $6,
                        recommendations = $7,
                        layers = $8,
                        pair_type = $9,
                        last_updated = NOW()
                `, [
                    pair.productA.id,
                    pair.productB.id,
                    compatibilityScore,
                    compatible,
                    criticalIssues,
                    warnings,
                    recommendations,
                    layers,
                    pair.pairType
                ]);

                batchSuccess++;
                this.successfulPairs++;

                // Log every 10 successful pairs
                if (batchSuccess % 10 === 0) {
                    logger.info(`   ✅ ${batchSuccess}/${pairs.length} pairs processed...`);
                }

            } catch (error) {
                logger.error(`   ❌ Failed to process pair ${pair.productA.id} ↔ ${pair.productB.id}:`, error.message);
                batchFailed++;
                this.failedPairs++;
            }

            this.processedPairs++;
        }

        const batchDuration = Date.now() - batchStartTime;
        const avgTimePerPair = (batchDuration / pairs.length).toFixed(2);
        
        logger.info(`✅ Batch ${batchNumber} complete in ${batchDuration}ms (${avgTimePerPair}ms/pair)`);
        logger.info(`   Success: ${batchSuccess}, Failed: ${batchFailed}`);
        
        // Progress bar
        const progress = ((this.processedPairs / this.totalPairs) * 100).toFixed(1);
        const eta = this.calculateETA();
        logger.info(`📊 Overall Progress: ${this.processedPairs}/${this.totalPairs} (${progress}%) - ETA: ${eta}`);
    }

    /**
     * Calculate estimated time to completion
     */
    calculateETA() {
        const elapsed = Date.now() - this.startTime;
        const avgTimePerPair = elapsed / this.processedPairs;
        const remainingPairs = this.totalPairs - this.processedPairs;
        const etaMs = avgTimePerPair * remainingPairs;
        
        const minutes = Math.floor(etaMs / 60000);
        const seconds = Math.floor((etaMs % 60000) / 1000);
        
        return `${minutes}m ${seconds}s`;
    }

    /**
     * Split array into batches
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Main population function
     */
    async populate() {
        this.startTime = Date.now();

        logger.info('========================================');
        logger.info('🚀 COMPATIBILITY MATRIX POPULATION');
        logger.info('========================================\n');

        try {
            // Fetch top products by category
            logger.info('📊 Fetching top products...\n');
            
            const [cpus, motherboards, gpus, psus, coolers, storage] = await Promise.all([
                this.getTopProducts('CPU', 100),
                this.getTopProducts('Motherboard', 100),
                this.getTopProducts('GPU', 50),
                this.getTopProducts('PSU', 50),
                this.getTopProducts('Cooling', 50),
                this.getTopProducts('Storage', 50)
            ]);

            if (cpus.length === 0) {
                logger.error('❌ No CPUs found in database. Aborting.');
                return;
            }

            // Generate all component pairs
            logger.info('\n📋 Generating component pairs...\n');
            
            const cpuMoboPairs = this.generatePairs(cpus, motherboards, 'CPU-Motherboard');
            const gpuPsuPairs = this.generatePairs(gpus, psus, 'GPU-PSU');
            const coolerCpuPairs = this.generatePairs(coolers, cpus, 'Cooler-CPU');
            const storageMoboPairs = this.generatePairs(storage, motherboards, 'Storage-Motherboard');

            logger.info(`✅ CPU ↔ Motherboard: ${cpuMoboPairs.length} pairs`);
            logger.info(`✅ GPU ↔ PSU: ${gpuPsuPairs.length} pairs`);
            logger.info(`✅ Cooler ↔ CPU: ${coolerCpuPairs.length} pairs`);
            logger.info(`✅ Storage ↔ Motherboard: ${storageMoboPairs.length} pairs`);

            // Combine all pairs
            const allPairs = [
                ...cpuMoboPairs,
                ...gpuPsuPairs,
                ...coolerCpuPairs,
                ...storageMoboPairs
            ];

            this.totalPairs = allPairs.length;

            logger.info(`\n🎯 Total Pairs to Process: ${this.totalPairs}`);
            logger.info(`📦 Batch Size: ${this.batchSize} pairs per batch\n`);

            // Split into batches
            const batches = this.chunkArray(allPairs, this.batchSize);
            logger.info(`📦 Total Batches: ${batches.length}\n`);

            // Process each batch sequentially
            for (let i = 0; i < batches.length; i++) {
                await this.processBatch(batches[i], i + 1, batches.length);
            }

            // Final summary
            const totalDuration = Date.now() - this.startTime;
            const minutes = Math.floor(totalDuration / 60000);
            const seconds = Math.floor((totalDuration % 60000) / 1000);

            logger.info('\n========================================');
            logger.info('✅ COMPATIBILITY MATRIX POPULATION COMPLETE');
            logger.info('========================================\n');
            logger.info(`📊 Summary:`);
            logger.info(`   Total Pairs: ${this.totalPairs}`);
            logger.info(`   Successful: ${this.successfulPairs} ✅`);
            logger.info(`   Failed: ${this.failedPairs} ❌`);
            logger.info(`   Success Rate: ${((this.successfulPairs / this.totalPairs) * 100).toFixed(1)}%`);
            logger.info(`   Total Duration: ${minutes}m ${seconds}s`);
            logger.info(`   Avg Time/Pair: ${(totalDuration / this.totalPairs).toFixed(2)}ms\n`);

            // Verify matrix size
            const countResult = await db.query('SELECT COUNT(*) as count FROM compatibility_matrix');
            logger.info(`✅ Compatibility Matrix Size: ${countResult.rows[0].count} pairs\n`);

        } catch (error) {
            logger.error('❌ Fatal error during population:', error);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const populator = new CompatibilityMatrixPopulator();
    
    populator.populate()
        .then(() => {
            logger.info('✅ Script completed successfully');
            process.exit(0);
        })
        .catch(error => {
            logger.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = CompatibilityMatrixPopulator;
