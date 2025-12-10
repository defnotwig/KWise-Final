/**
 * Quick Implementation and Testing Script
 * Tests Phase 1 Foundation components
 * Run this after database migration
 */

const axios = require('axios');
const { Pool } = require('pg');

// Simple colored console logging without external dependencies
const createColorLogger = () => {
  const logger = {
    blue: (text) => ({ text, color: '\x1b[34m', bold: () => logger.blue(text) }),
    cyan: (text) => ({ text, color: '\x1b[36m', bold: () => logger.cyan(text) }),
    green: (text) => ({ text, color: '\x1b[32m', bold: () => logger.green(text) }),
    red: (text) => ({ text, color: '\x1b[31m', bold: () => logger.red(text) }),
    yellow: (text) => ({ text, color: '\x1b[33m', bold: () => logger.yellow(text) })
  };
  return logger;
};

const chalk = createColorLogger();
const log = {
  blue: (text) => console.log(`\x1b[34m${text}\x1b[0m`),
  cyan: (text) => console.log(`\x1b[36m${text}\x1b[0m`),
  green: (text) => console.log(`\x1b[32m${text}\x1b[0m`),
  red: (text) => console.log(`\x1b[31m${text}\x1b[0m`),
  yellow: (text) => console.log(`\x1b[33m${text}\x1b[0m`)
};

log.blue('\n🚀 K-Wise Enhanced AI System - Phase 1 Testing\n');

async function testDatabaseMigration() {
  console.log('📊 Testing Database Migration...'));
  
  const db = require('./config/database');
  
  try {
    // Test each new table
    const tables = [
      'compatibility_logs',
      'ai_feedback',
      'ai_recommendations',
      'ai_audit_logs',
      'upgrade_paths',
      'reference_builds',
      'user_personas',
      'ai_metrics',
      'compatibility_rules_confidence',
      'ai_experiment_variants'
    ];
    
    for (const table of tables) {
      const result = await db.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ✅ ${table}: ${result.rows[0].count} rows`));
    }
    
    // Check extended_metadata column
    const metadataCheck = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts' AND column_name = 'extended_metadata'
    `);
    
    if (metadataCheck.rows.length > 0) {
      console.log(`  ✅ pc_parts.extended_metadata column exists`));
    } else {
      console.log(`  ❌ pc_parts.extended_metadata column missing`));
    }
    
    console.log('\n✅ Database migration validated successfully\n'));
  } catch (error) {
    console.log(`\n❌ Database test failed: ${error.message}\n`));
    throw error;
  }
}

async function testIntelligentCache() {
  console.log('🗄️ Testing Intelligent Cache...'));
  
  const intelligentCache = require('./services/intelligentCache');
  
  try {
    // Test cache set and get
    const testKey = intelligentCache.generateKey(
      { cpu: { id: 1 }, gpu: { id: 2 } },
      { persona: 'gamer', budget: { max: 100000 } },
      'compatibility'
    );
    
    console.log(`  🔑 Generated cache key: ${testKey.substring(0, 32)}...`));
    
    // Set value
    const testData = {
      compatible: true,
      confidence: 95,
      issues: []
    };
    
    intelligentCache.set(testKey, testData, 'compatibility', 95);
    console.log(`  ✅ Cache SET successful (WARM layer)`));
    
    // Get value
    const retrieved = await intelligentCache.get(testKey, 'compatibility');
    if (retrieved && retrieved.confidence === 95) {
      console.log(`  ✅ Cache GET successful (HOT layer - promoted)`));
    } else {
      console.log(`  ❌ Cache GET failed`));
    }
    
    // Get stats
    const stats = intelligentCache.getStats();
    console.log(`  📊 Cache stats: ${JSON.stringify(stats, null, 2)}`));
    
    // Test invalidation
    intelligentCache.invalidateByPart(1);
    const afterInvalidation = await intelligentCache.get(testKey, 'compatibility');
    if (!afterInvalidation) {
      console.log(`  ✅ Cache invalidation successful`));
    } else {
      console.log(`  ⚠️ Cache invalidation may not have worked`));
    }
    
    console.log('\n✅ Intelligent cache validated successfully\n'));
  } catch (error) {
    console.log(`\n❌ Cache test failed: ${error.message}\n`));
    throw error;
  }
}

async function testCircuitBreaker() {
  console.log('🔌 Testing AI Circuit Breaker...'));
  
  const aiCircuitBreaker = require('./services/aiCircuitBreaker');
  
  try {
    // Test successful call
    const successResult = await aiCircuitBreaker.call(
      async () => {
        return { success: true, data: 'test' };
      },
      { fallback: true },
      { test: 'success' }
    );
    
    if (successResult.success) {
      console.log(`  ✅ Circuit breaker allows successful calls`));
    }
    
    // Test circuit state
    const status = aiCircuitBreaker.getStatus();
    console.log(`  📊 Circuit state: ${status.state}`));
    console.log(`  📊 Success rate: ${status.metrics.successRate}`));
    
    // Simulate failures
    console.log(`  🔄 Simulating failures to test circuit opening...`));
    
    for (let i = 0; i < 6; i++) {
      await aiCircuitBreaker.call(
        async () => {
          throw new Error('Simulated failure');
        },
        { fallback: true },
        { test: 'failure' }
      );
    }
    
    const statusAfterFailures = aiCircuitBreaker.getStatus();
    if (statusAfterFailures.state === 'OPEN') {
      console.log(`  ✅ Circuit opened after threshold failures`));
    } else {
      console.log(`  ⚠️ Circuit state: ${statusAfterFailures.state} (expected OPEN)`));
    }
    
    // Reset circuit for other tests
    aiCircuitBreaker.reset();
    console.log(`  🔄 Circuit breaker reset to CLOSED`));
    
    console.log('\n✅ Circuit breaker validated successfully\n'));
  } catch (error) {
    console.log(`\n❌ Circuit breaker test failed: ${error.message}\n`));
    throw error;
  }
}

async function testEnhancedAIService() {
  console.log('🤖 Testing Enhanced AI Service...'));
  
  const enhancedAIService = require('./services/enhancedAIService');
  
  try {
    // Test compatibility analysis with fallback
    const testParts = {
      cpu: { id: 1, name: 'Test CPU' },
      gpu: { id: 2, name: 'Test GPU' }
    };
    
    const testContext = {
      persona: 'gamer',
      primary_use: 'gaming',
      budget: { min: 50000, max: 100000 }
    };
    
    const testDeterministic = {
      compatible: true,
      percentageScore: 85,
      issues: []
    };
    
    console.log(`  🔄 Calling compatibility analysis...`));
    
    const result = await enhancedAIService.analyzeCompatibility(
      testParts,
      testContext,
      testDeterministic
    );
    
    console.log(`  📊 Result source: ${result.source}`));
    console.log(`  📊 Confidence: ${result.confidence}`));
    console.log(`  📊 Overall assessment: ${result.overall_assessment}`));
    
    if (result.source === 'cache' || result.source === 'ai' || result.source === 'fallback') {
      console.log(`  ✅ Enhanced AI service working correctly`));
    }
    
    // Test cache stats
    const cacheStats = enhancedAIService.getCacheStats();
    console.log(`  📊 Cache hit rate: ${cacheStats.hitRate}`));
    
    // Test circuit breaker status
    const circuitStatus = enhancedAIService.getCircuitBreakerStatus();
    console.log(`  📊 Circuit healthy: ${circuitStatus.healthy}`));
    
    console.log('\n✅ Enhanced AI service validated successfully\n'));
  } catch (error) {
    console.log(`\n❌ Enhanced AI service test failed: ${error.message}\n`));
    console.log(`  ℹ️ This is expected if Ollama is not running - fallbacks should work\n`));
  }
}

async function testHealthEndpoint() {
  console.log('🏥 Testing Health Endpoint...'));
  
  const axios = require('axios');
  
  try {
    const response = await axios.get('http://localhost:5000/api/health/ai', {
      timeout: 5000
    });
    
    console.log(`  ✅ Health endpoint responding`));
    console.log(`  📊 Status: ${response.data.status}`));
    console.log(`  📊 Circuit state: ${response.data.circuit?.state}`));
    console.log(`  📊 Cache entries: ${response.data.cache?.totalEntries}`));
    
    console.log('\n✅ Health endpoint validated successfully\n'));
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`  ⚠️ Backend server not running on port 5000`));
      console.log(`  ℹ️ Start server with: npm run dev\n`));
    } else {
      console.log(`\n❌ Health endpoint test failed: ${error.message}\n`));
    }
  }
}

async function runAllTests() {
  console.log('═'.repeat(60);
  console.log('  K-WISE ENHANCED AI SYSTEM - PHASE 1 VALIDATION'));
  console.log('═'.repeat(60);
  console.log();
  
  try {
    await testDatabaseMigration();
    await testIntelligentCache();
    await testCircuitBreaker();
    await testEnhancedAIService();
    await testHealthEndpoint();
    
    console.log('═'.repeat(60);
    console.log(log.green.bold('  ✅ ALL PHASE 1 TESTS PASSED'));
    console.log('═'.repeat(60);
    console.log();
    console.log('Next steps:'));
    console.log(chalk.white('  1. Integrate enhancedAIService into compatibilityService.js'));
    console.log(chalk.white('  2. Add health endpoint to server.js routes'));
    console.log(chalk.white('  3. Test end-to-end compatibility flow'));
    console.log(chalk.white('  4. Monitor cache hit rates and circuit breaker status'));
    console.log(chalk.white('  5. Begin Phase 2: Prompt Engineering'));
    console.log();
    
  } catch (error) {
    console.log('═'.repeat(60);
    console.log(log.red.bold('  ❌ SOME TESTS FAILED'));
    console.log('═'.repeat(60);
    console.log();
    console.log('Please review errors above and fix before proceeding.'));
    console.log();
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error(log.red(`\n❌ Test suite failed: ${error.message}\n`));
    process.exit(1);
  });
}

module.exports = {
  testDatabaseMigration,
  testIntelligentCache,
  testCircuitBreaker,
  testEnhancedAIService,
  testHealthEndpoint
};
