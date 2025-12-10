const db = require('./config/db');
const logger = require('./utils/logger');

/**
 * Add tier classification to CPU and GPU components
 * Tier classification is critical for bottleneck detection
 */

const CPU_TIERS = {
    // Entry level (tier: 1)
    'i3': 1, 'ryzen 3': 1, 'pentium': 1, 'celeron': 1, 'athlon': 1,
    
    // Mid-tier (tier: 2)
    'i5': 2, 'ryzen 5': 2, 'i7-10': 2, 'i7-11': 2,
    
    // High-tier (tier: 3)
    'i7-12': 3, 'i7-13': 3, 'i7-14': 3, 'ryzen 7': 3, 'i9-10': 3, 'i9-11': 3,
    
    // Elite (tier: 4)
    'i9-12': 4, 'i9-13': 4, 'i9-14': 4, 'i9-15': 4, 'ryzen 9': 4, 'threadripper': 4
};

const GPU_TIERS = {
    // Entry level (tier: 1)
    'gt 1030': 1, 'gtx 1630': 1, 'gtx 1650': 1, 'rx 6400': 1, 'rx 6500': 1,
    
    // Mid-tier (tier: 2)
    'gtx 1660': 2, 'rtx 3050': 2, 'rtx 4050': 2, 'rx 6600': 2, 'rx 6650': 2, 'rx 7600': 2,
    
    // High-tier (tier: 3)
    'rtx 3060': 3, 'rtx 3070': 3, 'rtx 4060': 3, 'rtx 4070': 3, 'rx 6700': 3, 'rx 6750': 3, 'rx 7700': 3, 'rx 7800': 3,
    
    // Elite (tier: 4)
    'rtx 3080': 4, 'rtx 3090': 4, 'rtx 4080': 4, 'rtx 4090': 4, 'rx 6800': 4, 'rx 6900': 4, 'rx 6950': 4, 'rx 7900': 4
};

const TIER_NAMES = {
    1: 'entry',
    2: 'mid-tier',
    3: 'high-tier',
    4: 'elite'
};

async function addTierClassification() {
    try {
        logger.info('🎯 Starting tier classification for CPU and GPU components...');
        
        // Get all CPUs
        const cpuResult = await db.query(`
            SELECT id, name, specifications
            FROM pc_parts
            WHERE category = 'CPU' AND is_active = true
        `);
        
        logger.info(`Found ${cpuResult.rows.length} CPUs to classify`);
        
        let cpuUpdated = 0;
        for (const cpu of cpuResult.rows) {
            const name = cpu.name.toLowerCase();
            let tier = 1; // Default to entry
            
            // Check CPU tier based on name patterns
            for (const [pattern, tierValue] of Object.entries(CPU_TIERS)) {
                if (name.includes(pattern.toLowerCase())) {
                    tier = tierValue;
                    break;
                }
            }
            
            // Update CPU with tier
            const specs = cpu.specifications || {};
            specs.tier = TIER_NAMES[tier];
            
            await db.query(`
                UPDATE pc_parts
                SET specifications = $1
                WHERE id = $2
            `, [JSON.stringify(specs), cpu.id]);
            
            cpuUpdated++;
            logger.info(`  ✅ CPU #${cpu.id} "${cpu.name}" → Tier: ${TIER_NAMES[tier]}`);
        }
        
        // Get all GPUs
        const gpuResult = await db.query(`
            SELECT id, name, specifications
            FROM pc_parts
            WHERE category = 'GPU' AND is_active = true
        `);
        
        logger.info(`Found ${gpuResult.rows.length} GPUs to classify`);
        
        let gpuUpdated = 0;
        for (const gpu of gpuResult.rows) {
            const name = gpu.name.toLowerCase();
            let tier = 1; // Default to entry
            
            // Check GPU tier based on name patterns
            for (const [pattern, tierValue] of Object.entries(GPU_TIERS)) {
                if (name.includes(pattern.toLowerCase())) {
                    tier = tierValue;
                    break;
                }
            }
            
            // Update GPU with tier
            const specs = gpu.specifications || {};
            specs.tier = TIER_NAMES[tier];
            
            await db.query(`
                UPDATE pc_parts
                SET specifications = $1
                WHERE id = $2
            `, [JSON.stringify(specs), gpu.id]);
            
            gpuUpdated++;
            logger.info(`  ✅ GPU #${gpu.id} "${gpu.name}" → Tier: ${TIER_NAMES[tier]}`);
        }
        
        logger.info('');
        logger.info('═══════════════════════════════════════');
        logger.info('  ✅ TIER CLASSIFICATION COMPLETE');
        logger.info('═══════════════════════════════════════');
        logger.info(`  CPUs updated: ${cpuUpdated}/${cpuResult.rows.length}`);
        logger.info(`  GPUs updated: ${gpuUpdated}/${gpuResult.rows.length}`);
        logger.info('═══════════════════════════════════════');
        
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error adding tier classification:', error);
        process.exit(1);
    }
}

// Run the script
addTierClassification();
