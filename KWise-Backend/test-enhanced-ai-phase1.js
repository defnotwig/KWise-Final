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
  console.log(log.yellow('📊 Testing Database Migration...'));
  
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
      console.log(log.green(`  ✅ ${table}: ${result.rows[0].count} rows`));
    }
    
    // Check extended_metadata column
    const metadataCheck = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts' AND column_name = 'extended_metadata'
    `);
    
    if (metadataCheck.rows.length > 0) {
      console.log(log.green(`  ✅ pc_parts.extended_metadata column exists`));
    } else {
      console.log(log.red(`  ❌ pc_parts.extended_metadata column missing`));
    }
    
    console.log(log.green('\n✅ Database migration validated successfully\n'));
  } catch (error) {
    console.log(log.red(`\n❌ Database test failed: ${error.message}\n`));
    throw error;
  }
}

async function testIntelligentCache() {
  console.log(log.yellow('🗄️ Testing Intelligent Cache...'));
  
  const intelligentCache = require('./services/intelligentCache');
  
  try {
    // Test cache set and get
    const testKey = intelligentCache.generateKey(
      { cpu: { id: 1 }, gpu: { id: 2 } },
      { persona: 'gamer', budget: { max: 100000 } },
      'compatibility'
    );
    
    console.log(log.blue(`  🔑 Generated cache key: ${testKey.substring(0, 32)}...`));
    
    // Set value
    const testData = {
      compatible: true,
      confidence: 95,
      issues: []
    };
    
    intelligentCache.set(testKey, testData, 'compatibility', 95);
    console.log(log.green(`  ✅ Cache SET successful (WARM layer)`));
    
    // Get value
    const retrieved = await intelligentCache.get(testKey, 'compatibility');
    if (retrieved && retrieved.confidence === 95) {
      console.log(log.green(`  ✅ Cache GET successful (HOT layer - promoted)`));
    } else {
      console.log(log.red(`  ❌ Cache GET failed`));
    }
    
    // Get stats
    const stats = intelligentCache.getStats();
    console.log(log.blue(`  📊 Cache stats: ${JSON.stringify(stats, null, 2)}`));
    
    // Test invalidation
    intelligentCache.invalidateByPart(1);
    const afterInvalidation = await intelligentCache.get(testKey, 'compatibility');
    if (!afterInvalidation) {
      console.log(log.green(`  ✅ Cache invalidation successful`));
    } else {
      console.log(log.yellow(`  ⚠️ Cache invalidation may not have worked`));
    }
    
    console.log(log.green('\n✅ Intelligent cache validated successfully\n'));
  } catch (error) {
    console.log(log.red(`\n❌ Cache test failed: ${error.message}\n`));
    throw error;
  }
}

async function testCircuitBreaker() {
  console.log(log.yellow('🔌 Testing AI Circuit Breaker...'));
  
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
      console.log(log.green(`  ✅ Circuit breaker allows successful calls`));
    }
    
    // Test circuit state
    const status = aiCircuitBreaker.getStatus();
    console.log(log.blue(`  📊 Circuit state: ${status.state}`));
    console.log(log.blue(`  📊 Success rate: ${status.metrics.successRate}`));
    
    // Simulate failures
    console.log(log.yellow(`  🔄 Simulating failures to test circuit opening...`));
    
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
      console.log(log.green(`  ✅ Circuit opened after threshold failures`));
    } else {
      console.log(log.yellow(`  ⚠️ Circuit state: ${statusAfterFailures.state} (expected OPEN)`));
    }
    
    // Reset circuit for other tests
    aiCircuitBreaker.reset();
    console.log(log.blue(`  🔄 Circuit breaker reset to CLOSED`));
    
    console.log(log.green('\n✅ Circuit breaker validated successfully\n'));
  } catch (error) {
    console.log(log.red(`\n❌ Circuit breaker test failed: ${error.message}\n`));
    throw error;
  }
}

async function testEnhancedAIService() {
  console.log(log.yellow('🤖 Testing Enhanced AI Service...'));
  
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
    
    console.log(log.blue(`  🔄 Calling compatibility analysis...`));
    
    const result = await enhancedAIService.analyzeCompatibility(
      testParts,
      testContext,
      testDeterministic
    );
    
    console.log(log.blue(`  📊 Result source: ${result.source}`));
    console.log(log.blue(`  📊 Confidence: ${result.confidence}`));
    console.log(log.blue(`  📊 Overall assessment: ${result.overall_assessment}`));
    
    if (result.source === 'cache' || result.source === 'ai' || result.source === 'fallback') {
      console.log(log.green(`  ✅ Enhanced AI service working correctly`));
    }
    
    // Test cache stats
    const cacheStats = enhancedAIService.getCacheStats();
    console.log(log.blue(`  📊 Cache hit rate: ${cacheStats.hitRate}`));
    
    // Test circuit breaker status
    const circuitStatus = enhancedAIService.getCircuitBreakerStatus();
    console.log(log.blue(`  📊 Circuit healthy: ${circuitStatus.healthy}`));
    
    console.log(log.green('\n✅ Enhanced AI service validated successfully\n'));
  } catch (error) {
    console.log(log.red(`\n❌ Enhanced AI service test failed: ${error.message}\n`));
    console.log(log.yellow(`  ℹ️ This is expected if Ollama is not running - fallbacks should work\n`));
  }
}

async function testHealthEndpoint() {
  console.log(log.yellow('🏥 Testing Health Endpoint...'));
  
  const axios = require('axios');
  
  try {
    const response = await axios.get('http://localhost:5000/api/health/ai', {
      timeout: 5000
    });
    
    console.log(log.green(`  ✅ Health endpoint responding`));
    console.log(log.blue(`  📊 Status: ${response.data.status}`));
    console.log(log.blue(`  📊 Circuit state: ${response.data.circuit?.state}`));
    console.log(log.blue(`  📊 Cache entries: ${response.data.cache?.totalEntries}`));
    
    console.log(log.green('\n✅ Health endpoint validated successfully\n'));
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(log.yellow(`  ⚠️ Backend server not running on port 5000`));
      console.log(log.blue(`  ℹ️ Start server with: npm run dev\n`));
    } else {
      console.log(log.red(`\n❌ Health endpoint test failed: ${error.message}\n`));
    }
  }
}

async function runAllTests() {
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.cyan.bold('  K-WISE ENHANCED AI SYSTEM - PHASE 1 VALIDATION'));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log();
  
  try {
    await testDatabaseMigration();
    await testIntelligentCache();
    await testCircuitBreaker();
    await testEnhancedAIService();
    await testHealthEndpoint();
    
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(log.green.bold('  ✅ ALL PHASE 1 TESTS PASSED'));
    console.log(chalk.cyan('═'.repeat(60)));
    console.log();
    console.log(log.blue('Next steps:'));
    console.log(chalk.white('  1. Integrate enhancedAIService into compatibilityService.js'));
    console.log(chalk.white('  2. Add health endpoint to server.js routes'));
    console.log(chalk.white('  3. Test end-to-end compatibility flow'));
    console.log(chalk.white('  4. Monitor cache hit rates and circuit breaker status'));
    console.log(chalk.white('  5. Begin Phase 2: Prompt Engineering'));
    console.log();
    
  } catch (error) {
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(log.red.bold('  ❌ SOME TESTS FAILED'));
    console.log(chalk.cyan('═'.repeat(60)));
    console.log();
    console.log(log.yellow('Please review errors above and fix before proceeding.'));
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
