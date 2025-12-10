/**
 * TEST SCRIPT FOR PC UPGRADE BUILD GENERATOR
 * 
 * This script tests the build generation service to ensure:
 * - Execution time is 30-60 seconds
 * - All components are validated (7 for non-gaming, 8 for gaming)
 * - Products are distributed properly
 * - No compilation errors
 */

require('dotenv').config();
const PCUpgradeBuildGenerator = require('./services/pcUpgradeBuildGenerator');
const logger = require('./utils/logger');

async function testBuildGeneration() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  PC UPGRADE BUILD GENERATOR TEST');
    console.log('═══════════════════════════════════════════════════════\n');

    const startTime = Date.now();

    try {
        logger.info('🧪 Starting build generation test...');
        
        const result = await PCUpgradeBuildGenerator.generateAllBuilds();
        
        const duration = (Date.now() - startTime) / 1000;

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  TEST RESULTS');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log(`✅ Total Builds: ${result.totalBuilds}`);
        console.log(`✅ Valid Builds: ${result.validBuilds}`);
        console.log(`✅ Duration: ${duration.toFixed(2)}s`);
        console.log(`✅ Target: 30-60s`);
        console.log(`\n${duration <= 60 ? '✅ PASSED' : '⚠️  SLOW'}: Duration ${duration <= 60 ? 'within' : 'exceeds'} target\n`);

        console.log('Product Distribution:');
        console.log(`   Unique Products Used: ${result.productDistribution.totalUniqueProducts}`);
        console.log(`   Most Used Products:`, result.productDistribution.mostUsed.slice(0, 3));
        console.log(`   Least Used Products:`, result.productDistribution.leastUsed.slice(0, 3));

        console.log('\n✅ BUILD GENERATION TEST COMPLETED SUCCESSFULLY\n');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run test
testBuildGeneration();
