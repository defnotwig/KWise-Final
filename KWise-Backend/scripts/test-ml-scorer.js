#!/usr/bin/env node

/**
 * Test Machine Learning Compatibility Scorer
 * Validates ML implementation and performance
 */

require('dotenv').config();
const mlScorer = require('../ml/MLCompatibilityScorer');

async function testMLScorer() {
  console.log('🤖 Testing Machine Learning Compatibility Scorer\n');
  console.log('='.repeat(80));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function pass(test) {
    console.log(`✅ ${test}`);
    results.passed++;
    results.tests.push({ name: test, status: 'PASS' });
  }

  function fail(test, error) {
    console.log(`❌ ${test}: ${error}`);
    results.failed++;
    results.tests.push({ name: test, status: 'FAIL', error });
  }

  try {
    // Test 1: Initialization
    console.log('\n📊 Test 1: ML Scorer Initialization');
    console.log('-'.repeat(80));
    
    await mlScorer.initialize();
    const stats = mlScorer.getStats();
    
    if (stats.initialized) {
      pass('ML scorer initialized successfully');
      console.log(`   Total patterns: ${stats.totalPatterns}`);
      console.log(`   Total categories: ${stats.totalCategories}`);
    } else {
      fail('ML scorer initialization', 'Failed to initialize');
    }

    // Test 2: Single Prediction
    console.log('\n🔮 Test 2: Single Component Prediction');
    console.log('-'.repeat(80));
    
    const componentA = {
      id: 1,
      name: 'Intel Core i5-12400F',
      category: 'CPU'
    };
    
    const componentB = {
      id: 2,
      name: 'ASUS ROG STRIX B660-A',
      category: 'Motherboard'
    };
    
    const prediction = await mlScorer.predict(componentA, componentB);
    
    if (prediction && typeof prediction.score === 'number') {
      pass('Single prediction successful');
      console.log(`   Score: ${prediction.score}%`);
      console.log(`   Confidence: ${prediction.confidence}%`);
      console.log(`   Level: ${prediction.level}`);
      console.log(`   Reason: ${prediction.reason}`);
      console.log(`   Method: ${prediction.method}`);
      
      if (prediction.patterns) {
        console.log(`   Rules analyzed: ${prediction.patterns.totalRules}`);
      }
    } else {
      fail('Single prediction', 'Invalid prediction result');
    }

    // Test 3: Score Range Validation
    console.log('\n📏 Test 3: Score Range Validation');
    console.log('-'.repeat(80));
    
    if (prediction.score >= 0 && prediction.score <= 100) {
      pass('Score within valid range (0-100)');
    } else {
      fail('Score range validation', `Score ${prediction.score} out of range`);
    }
    
    if (prediction.confidence >= 0 && prediction.confidence <= 100) {
      pass('Confidence within valid range (0-100)');
    } else {
      fail('Confidence range validation', `Confidence ${prediction.confidence} out of range`);
    }

    // Test 4: Different Category Pairs
    console.log('\n🔄 Test 4: Multiple Category Pairs');
    console.log('-'.repeat(80));
    
    const testPairs = [
      { a: { id: 1, category: 'CPU', name: 'CPU' }, b: { id: 2, category: 'RAM', name: 'RAM' } },
      { a: { id: 3, category: 'GPU', name: 'GPU' }, b: { id: 4, category: 'PSU', name: 'PSU' } },
      { a: { id: 5, category: 'Storage', name: 'SSD' }, b: { id: 6, category: 'Motherboard', name: 'MB' } }
    ];
    
    let validPredictions = 0;
    for (const pair of testPairs) {
      const pred = await mlScorer.predict(pair.a, pair.b);
      if (pred && typeof pred.score === 'number') {
        validPredictions++;
        console.log(`   ${pair.a.category} + ${pair.b.category}: ${pred.score}% (${pred.level})`);
      }
    }
    
    if (validPredictions === testPairs.length) {
      pass('Multiple category pair predictions');
    } else {
      fail('Multiple category pairs', `Only ${validPredictions}/${testPairs.length} successful`);
    }

    // Test 5: Cache Functionality
    console.log('\n💾 Test 5: Prediction Cache');
    console.log('-'.repeat(80));
    
    const statsBeforeCache = mlScorer.getStats();
    
    // Make same prediction again
    await mlScorer.predict(componentA, componentB);
    await mlScorer.predict(componentA, componentB);
    
    const statsAfterCache = mlScorer.getStats();
    
    if (statsAfterCache.cacheHits > statsBeforeCache.cacheHits) {
      pass('Cache functionality working');
      console.log(`   Cache hits: ${statsAfterCache.cacheHits}`);
      console.log(`   Cache hit rate: ${statsAfterCache.cacheHitRate}`);
    } else {
      fail('Cache functionality', 'No cache hits detected');
    }

    // Test 6: Performance
    console.log('\n⚡ Test 6: Performance Test');
    console.log('-'.repeat(80));
    
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await mlScorer.predict(componentA, componentB);
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    
    console.log(`   ${iterations} predictions in ${endTime - startTime}ms`);
    console.log(`   Average time: ${avgTime.toFixed(2)}ms per prediction`);
    
    if (avgTime < 50) {
      pass('Performance test (avg < 50ms)');
    } else {
      fail('Performance test', `Average time ${avgTime.toFixed(2)}ms exceeds 50ms`);
    }

    // Test 7: Statistics
    console.log('\n📈 Test 7: Statistics Tracking');
    console.log('-'.repeat(80));
    
    const finalStats = mlScorer.getStats();
    
    console.log(`   Initialized: ${finalStats.initialized}`);
    console.log(`   Total patterns: ${finalStats.totalPatterns}`);
    console.log(`   Total categories: ${finalStats.totalCategories}`);
    console.log(`   Predictions: ${finalStats.predictions}`);
    console.log(`   Average confidence: ${finalStats.averageConfidence}%`);
    console.log(`   Cache size: ${finalStats.cacheSize}`);
    console.log(`   Cache hits: ${finalStats.cacheHits}`);
    console.log(`   Cache hit rate: ${finalStats.cacheHitRate}`);
    
    if (finalStats.predictions > 0) {
      pass('Statistics tracking functional');
    } else {
      fail('Statistics tracking', 'No predictions tracked');
    }

    // Test 8: Edge Cases
    console.log('\n🔬 Test 8: Edge Cases');
    console.log('-'.repeat(80));
    
    // Same category prediction
    const sameCategory = await mlScorer.predict(
      { id: 1, category: 'CPU', name: 'CPU1' },
      { id: 2, category: 'CPU', name: 'CPU2' }
    );
    
    if (sameCategory && typeof sameCategory.score === 'number') {
      pass('Same category prediction handled');
      console.log(`   CPU + CPU: ${sameCategory.score}%`);
    } else {
      fail('Same category prediction', 'Failed to handle');
    }

  } catch (error) {
    fail('Test execution', error.message);
    console.error('\nError details:', error);
  }

  // Final Report
  console.log('\n' + '='.repeat(80));
  console.log('📋 ML SCORER TEST RESULTS');
  console.log('='.repeat(80));

  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  console.log(`\n✅ Passed: ${results.passed}/${total} (${passRate}%)`);
  console.log(`❌ Failed: ${results.failed}/${total}`);

  console.log('\n📊 Test Summary:');
  results.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`  ${index + 1}. ${icon} ${test.name}`);
    if (test.error) {
      console.log(`     Error: ${test.error}`);
    }
  });

  // Health Assessment
  console.log('\n🏥 ML Scorer Health:');
  if (passRate >= 90) {
    console.log('  ✅ EXCELLENT - ML scorer fully operational');
  } else if (passRate >= 75) {
    console.log('  ⚠️  GOOD - ML scorer working with minor issues');
  } else if (passRate >= 50) {
    console.log('  ⚠️  FAIR - ML scorer needs attention');
  } else {
    console.log('  ❌ CRITICAL - ML scorer has major issues');
  }

  console.log('\n' + '='.repeat(80));

  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
console.log('⏳ Initializing ML scorer...\n');
testMLScorer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
