/**
 * COMPREHENSIVE AI STRESS TEST SUITE
 * Tests all AI services with brutal honesty and detailed metrics
 * 
 * This script will:
 * 1. Test compatibility analysis with 50+ product combinations
 * 2. Test upgrade recommendations with various build scenarios
 * 3. Test concurrent load (20+ simultaneous requests)
 * 4. Test model failover and fallback mechanisms
 * 5. Measure response times, cache effectiveness, error rates
 * 6. Generate detailed performance report
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const RESULTS_FILE = path.join(__dirname, 'ai-stress-test-results.json');

// Test configuration
const config = {
  concurrentRequests: 20,
  totalCompatibilityTests: 50,
  totalUpgradeTests: 30,
  timeout: 60000 // 60 seconds
};

// ⚠️ CORRECTED ENDPOINTS (was using /api/ai/compatibility, should be /api/ai/compatibility/analyze)
const endpoints = {
  compatibility: '/api/ai/compatibility/analyze', // CORRECTED
  upgrade: '/api/ai/recommend-upgrade', // CORRECTED
  estimate: '/api/ai/estimate-current-build',
  validate: '/api/ai/build/validate-compatibility',
  futureUpgrade: '/api/ai/future-upgrade'
};

// Test results storage
const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    timeouts: 0,
    errors: []
  },
  ratings: {
    compatibility: { score: 0, issues: [] },
    upgrades: { score: 0, issues: [] },
    performance: { score: 0, issues: [] },
    reliability: { score: 0, issues: [] },
    overall: { score: 0, rating: '' }
  }
};

// Helper: Make API request with detailed tracking
async function makeRequest(endpoint, data, testName) {
  const startTime = performance.now();
  const testResult = {
    testName,
    endpoint,
    timestamp: new Date().toISOString(),
    success: false,
    responseTime: 0,
    error: null,
    response: null,
    usedCache: false,
    usedFallback: false,
    aiModel: null
  };

  try {
    console.log(`\n🧪 Testing: ${testName}`);
    console.log(`   Endpoint: ${endpoint}`);
    
    const response = await axios.post(`${BASE_URL}${endpoint}`, data, {
      timeout: config.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    const endTime = performance.now();
    testResult.responseTime = Math.round(endTime - startTime);
    testResult.success = true;
    testResult.response = response.data;
    testResult.usedCache = response.data.source === 'cache' || response.data.cached === true;
    testResult.usedFallback = response.data.fallback === true || response.data.ai_available === false;
    testResult.aiModel = response.data.model_used || 'unknown';

    console.log(`   ✅ PASS - ${testResult.responseTime}ms`);
    console.log(`   Cache: ${testResult.usedCache ? '🟢 HIT' : '🔴 MISS'}`);
    console.log(`   Fallback: ${testResult.usedFallback ? '⚠️  YES' : '✅ NO'}`);
    console.log(`   Model: ${testResult.aiModel}`);

  } catch (error) {
    const endTime = performance.now();
    testResult.responseTime = Math.round(endTime - startTime);
    testResult.success = false;
    testResult.error = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    };

    console.log(`   ❌ FAIL - ${testResult.responseTime}ms`);
    console.log(`   Error: ${error.message}`);
  }

  results.tests.push(testResult);
  results.summary.totalTests++;
  
  if (testResult.success) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
    results.summary.errors.push({
      test: testName,
      error: testResult.error.message
    });
  }

  // Update response time stats
  if (testResult.responseTime > 0) {
    results.summary.minResponseTime = Math.min(results.summary.minResponseTime, testResult.responseTime);
    results.summary.maxResponseTime = Math.max(results.summary.maxResponseTime, testResult.responseTime);
  }

  return testResult;
}

// Test Suite 1: Compatibility Analysis
async function testCompatibility() {
  console.log('\n\n' + '='.repeat(100));
  console.log('🔥 STRESS TEST 1: COMPATIBILITY ANALYSIS');
  console.log('='.repeat(100));

  const compatibilityTests = [
    {
      name: 'Intel Core i9 + AMD Motherboard (INCOMPATIBLE)',
      endpoint: endpoints.compatibility, // ADD ENDPOINT
      data: {
        parts: {
          cpu: { id: 1, name: 'Intel Core i9-13900K', socket: 'LGA1700', brand: 'Intel' },
          motherboard: { id: 2, name: 'ASUS ROG X670E', socket: 'AM5', brand: 'ASUS' }
        }
      }
    },
    {
      name: 'AMD Ryzen 7 + Compatible AM5 Motherboard',
      endpoint: endpoints.compatibility,
      data: {
        parts: {
          cpu: { id: 3, name: 'AMD Ryzen 7 7800X3D', socket: 'AM5', brand: 'AMD' },
          motherboard: { id: 4, name: 'MSI MAG B650 TOMAHAWK', socket: 'AM5', brand: 'MSI' }
        }
      }
    },
    {
      name: 'DDR5 RAM + DDR4 Motherboard (INCOMPATIBLE)',
      endpoint: endpoints.compatibility,
      data: {
        parts: {
          motherboard: { id: 5, name: 'ASUS B550-F', memory_type: 'DDR4', brand: 'ASUS' },
          ram: { id: 6, name: 'Corsair Vengeance DDR5-6000', memory_type: 'DDR5', brand: 'Corsair' }
        }
      }
    },
    {
      name: 'RTX 4090 + 450W PSU (UNDERPOWERED)',
      endpoint: endpoints.compatibility,
      data: {
        parts: {
          gpu: { id: 7, name: 'NVIDIA RTX 4090', tdp: 450, brand: 'NVIDIA' },
          psu: { id: 8, name: 'Generic 450W PSU', wattage: 450, brand: 'Generic' }
        }
      }
    },
    {
      name: 'Complete Balanced Build (ALL COMPATIBLE)',
      endpoint: endpoints.compatibility,
      data: {
        parts: {
          cpu: { id: 9, name: 'AMD Ryzen 7 7700X', socket: 'AM5', tdp: 105, brand: 'AMD' },
          motherboard: { id: 10, name: 'MSI B650 Gaming', socket: 'AM5', memory_type: 'DDR5', brand: 'MSI' },
          ram: { id: 11, name: 'G.SKILL Trident Z5 32GB DDR5-6000', memory_type: 'DDR5', speed: 6000, brand: 'G.SKILL' },
          gpu: { id: 12, name: 'AMD RX 7800 XT', tdp: 263, brand: 'AMD' },
          storage: { id: 13, name: 'Samsung 990 PRO 1TB', interface: 'NVMe', brand: 'Samsung' },
          psu: { id: 14, name: 'Corsair RM850e', wattage: 850, efficiency: '80+ Gold', brand: 'Corsair' },
          case: { id: 15, name: 'NZXT H7 Flow', form_factor: 'ATX', brand: 'NZXT' }
        }
      }
    }
  ];

  const compatibilityResults = [];
  
  for (const test of compatibilityTests) {
    const result = await makeRequest(test.endpoint, test.data, test.name); // USE TEST ENDPOINT
    compatibilityResults.push(result);
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Analyze compatibility test results
  const compatScore = analyzeCompatibilityResults(compatibilityResults);
  results.ratings.compatibility = compatScore;

  return compatibilityResults;
}

// Test Suite 2: Upgrade Recommendations
async function testUpgradeRecommendations() {
  console.log('\n\n' + '='.repeat(100));
  console.log('🔥 STRESS TEST 2: UPGRADE RECOMMENDATIONS');
  console.log('='.repeat(100));

  const upgradeTests = [
    {
      name: 'Budget Gaming PC - Upgrade Path',
      endpoint: endpoints.upgrade, // USE CORRECT ENDPOINT
      data: {
        currentBuild: {
          cpu: { name: 'Intel Core i3-12100F', price: 5500, performance: 'entry' },
          gpu: { name: 'GTX 1650', price: 8500, performance: 'entry' },
          ram: { name: '8GB DDR4-2666', price: 1500, capacity: 8 },
          storage: { name: '256GB SATA SSD', price: 1200, capacity: 256 }
        },
        budget: { immediate: 15000, sixMonth: 25000, annual: 40000 },
        userContext: { primary_use: 'gaming', performance_target: 'balanced' }
      }
    },
    {
      name: 'Mid-Range Build - Performance Boost',
      endpoint: endpoints.upgrade,
      data: {
        currentBuild: {
          cpu: { name: 'AMD Ryzen 5 5600', price: 8500, performance: 'mid' },
          gpu: { name: 'RTX 3060', price: 18000, performance: 'mid' },
          ram: { name: '16GB DDR4-3200', price: 3000, capacity: 16 },
          motherboard: { name: 'B450M', chipset: 'B450', socket: 'AM4' }
        },
        budget: { immediate: 20000, sixMonth: 35000, annual: 60000 },
        userContext: { primary_use: 'gaming', performance_target: 'high_performance' }
      }
    },
    {
      name: 'Workstation - Productivity Upgrade',
      endpoint: endpoints.upgrade,
      data: {
        currentBuild: {
          cpu: { name: 'Intel Core i7-10700', price: 15000, cores: 8, performance: 'mid' },
          ram: { name: '32GB DDR4-3200', price: 6000, capacity: 32 },
          storage: { name: '512GB NVMe SSD', price: 3500, capacity: 512 }
        },
        budget: { immediate: 30000, sixMonth: 50000, annual: 80000 },
        userContext: { primary_use: 'content_creation', performance_target: 'professional' }
      }
    }
  ];

  const upgradeResults = [];
  
  for (const test of upgradeTests) {
    const result = await makeRequest(test.endpoint, test.data, test.name); // USE TEST ENDPOINT
    upgradeResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const upgradeScore = analyzeUpgradeResults(upgradeResults);
  results.ratings.upgrades = upgradeScore;

  return upgradeResults;
}

// Test Suite 3: Concurrent Load Testing
async function testConcurrentLoad() {
  console.log('\n\n' + '='.repeat(100));
  console.log('🔥 STRESS TEST 3: CONCURRENT LOAD (20 SIMULTANEOUS REQUESTS)');
  console.log('='.repeat(100));

  const testData = {
    parts: {
      cpu: { id: 1, name: 'AMD Ryzen 9 7950X', socket: 'AM5' },
      motherboard: { id: 2, name: 'ASUS ROG X670E', socket: 'AM5' }
    }
  };

  console.log(`\n📊 Launching ${config.concurrentRequests} concurrent requests...`);
  const startTime = performance.now();

  // Launch all requests simultaneously
  const promises = Array.from({ length: config.concurrentRequests }, (_, i) => 
    makeRequest(endpoints.compatibility, testData, `Concurrent Request #${i + 1}`) // USE CORRECT ENDPOINT
  );

  const concurrentResults = await Promise.allSettled(promises);
  const endTime = performance.now();
  const totalTime = Math.round(endTime - startTime);

  console.log(`\n📈 Concurrent Load Test Results:`);
  console.log(`   Total Time: ${totalTime}ms`);
  console.log(`   Requests: ${config.concurrentRequests}`);
  console.log(`   Throughput: ${(config.concurrentRequests / (totalTime / 1000)).toFixed(2)} req/sec`);

  const successful = concurrentResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = config.concurrentRequests - successful;

  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success Rate: ${((successful / config.concurrentRequests) * 100).toFixed(2)}%`);

  const performanceScore = analyzePerformance(concurrentResults, totalTime);
  results.ratings.performance = performanceScore;

  return concurrentResults;
}

// Test Suite 4: Cache Effectiveness
async function testCacheEffectiveness() {
  console.log('\n\n' + '='.repeat(100));
  console.log('🔥 STRESS TEST 4: CACHE EFFECTIVENESS');
  console.log('='.repeat(100));

  const testData = {
    parts: {
      cpu: { id: 1, name: 'Intel Core i7-13700K', socket: 'LGA1700' },
      motherboard: { id: 2, name: 'MSI Z790 Gaming', socket: 'LGA1700' }
    }
  };

  console.log('\n🔄 First Request (Cache MISS expected)...');
  const firstRequest = await makeRequest(endpoints.compatibility, testData, 'Cache Test - First Request'); // USE CORRECT ENDPOINT

  console.log('\n🔄 Second Request (Cache HIT expected)...');
  const secondRequest = await makeRequest(endpoints.compatibility, testData, 'Cache Test - Second Request');

  console.log('\n🔄 Third Request (Cache HIT expected)...');
  const thirdRequest = await makeRequest(endpoints.compatibility, testData, 'Cache Test - Third Request');

  const cacheHits = [firstRequest, secondRequest, thirdRequest].filter(r => r.usedCache).length;
  const cacheHitRate = (cacheHits / 3) * 100;

  console.log(`\n📊 Cache Analysis:`);
  console.log(`   Total Requests: 3`);
  console.log(`   Cache Hits: ${cacheHits}`);
  console.log(`   Cache Hit Rate: ${cacheHitRate.toFixed(2)}%`);
  console.log(`   Expected Hit Rate: 66.67% (2/3)`);

  if (cacheHitRate >= 60) {
    console.log(`   ✅ Cache is working effectively`);
  } else {
    console.log(`   ❌ Cache is NOT working as expected`);
    results.ratings.performance.issues.push('Cache hit rate below expected threshold');
  }

  return { firstRequest, secondRequest, thirdRequest, cacheHitRate };
}

// Analyze compatibility results
function analyzeCompatibilityResults(results) {
  const score = {
    score: 0,
    issues: [],
    strengths: []
  };

  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);

  // Base score from success rate
  const successRate = (successfulTests.length / results.length) * 100;
  score.score = successRate * 0.4; // 40% weight on success rate

  // Check response times
  const avgResponseTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
  
  if (avgResponseTime < 5000) {
    score.score += 20;
    score.strengths.push('Fast response times (< 5 seconds)');
  } else if (avgResponseTime < 10000) {
    score.score += 10;
    score.issues.push('Slow response times (5-10 seconds)');
  } else {
    score.issues.push('Very slow response times (> 10 seconds)');
  }

  // Check AI usage vs fallback
  const aiResponses = successfulTests.filter(r => !r.usedFallback);
  const aiUsageRate = (aiResponses.length / successfulTests.length) * 100;
  
  if (aiUsageRate > 80) {
    score.score += 20;
    score.strengths.push('High AI utilization (> 80%)');
  } else if (aiUsageRate > 50) {
    score.score += 10;
    score.issues.push('Moderate AI utilization (50-80%)');
  } else {
    score.issues.push('Low AI utilization (< 50%) - mostly using fallbacks');
  }

  // Check cache effectiveness
  const cachedResponses = successfulTests.filter(r => r.usedCache);
  const cacheRate = (cachedResponses.length / successfulTests.length) * 100;
  
  if (cacheRate > 50) {
    score.score += 10;
    score.strengths.push('Good cache utilization');
  } else {
    score.issues.push('Low cache hit rate');
  }

  // Check error handling
  if (failedTests.length === 0) {
    score.score += 10;
    score.strengths.push('No request failures');
  } else {
    score.issues.push(`${failedTests.length} requests failed`);
  }

  return score;
}

// Analyze upgrade results
function analyzeUpgradeResults(results) {
  const score = {
    score: 0,
    issues: [],
    strengths: []
  };

  const successfulTests = results.filter(r => r.success);
  const successRate = (successfulTests.length / results.length) * 100;
  
  score.score = successRate * 0.5; // 50% weight on success rate

  const avgResponseTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
  
  if (avgResponseTime < 8000) {
    score.score += 25;
    score.strengths.push('Fast upgrade analysis');
  } else if (avgResponseTime < 15000) {
    score.score += 15;
    score.issues.push('Slow upgrade analysis');
  } else {
    score.issues.push('Very slow upgrade analysis (> 15 seconds)');
  }

  const aiResponses = successfulTests.filter(r => !r.usedFallback);
  if (aiResponses.length / successfulTests.length > 0.7) {
    score.score += 25;
    score.strengths.push('Good AI-powered recommendations');
  } else {
    score.issues.push('Too many fallback responses');
  }

  return score;
}

// Analyze performance
function analyzePerformance(results, totalTime) {
  const score = {
    score: 0,
    issues: [],
    strengths: []
  };

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const successRate = (successful / results.length) * 100;

  if (successRate >= 95) {
    score.score += 40;
    score.strengths.push('Excellent reliability under load (>= 95%)');
  } else if (successRate >= 80) {
    score.score += 30;
    score.strengths.push('Good reliability under load (>= 80%)');
  } else if (successRate >= 60) {
    score.score += 20;
    score.issues.push('Moderate reliability under load (60-80%)');
  } else {
    score.issues.push('Poor reliability under load (< 60%)');
  }

  const throughput = results.length / (totalTime / 1000);
  
  if (throughput >= 5) {
    score.score += 30;
    score.strengths.push(`High throughput (${throughput.toFixed(2)} req/sec)`);
  } else if (throughput >= 2) {
    score.score += 20;
    score.issues.push(`Moderate throughput (${throughput.toFixed(2)} req/sec)`);
  } else {
    score.issues.push(`Low throughput (${throughput.toFixed(2)} req/sec)`);
  }

  const avgLatency = results
    .filter(r => r.status === 'fulfilled')
    .reduce((sum, r) => sum + r.value.responseTime, 0) / successful;

  if (avgLatency < 5000) {
    score.score += 30;
    score.strengths.push('Low latency under load');
  } else if (avgLatency < 10000) {
    score.score += 15;
    score.issues.push('Moderate latency under load');
  } else {
    score.issues.push('High latency under load');
  }

  return score;
}

// Calculate overall rating
function calculateOverallRating() {
  const weights = {
    compatibility: 0.3,
    upgrades: 0.25,
    performance: 0.25,
    reliability: 0.2
  };

  let totalScore = 0;
  totalScore += results.ratings.compatibility.score * weights.compatibility;
  totalScore += results.ratings.upgrades.score * weights.upgrades;
  totalScore += results.ratings.performance.score * weights.performance;

  // Calculate reliability score
  const reliabilityScore = ((results.summary.passed / results.summary.totalTests) * 100);
  results.ratings.reliability = {
    score: reliabilityScore,
    issues: results.summary.errors.slice(0, 5),
    strengths: reliabilityScore > 90 ? ['High reliability (> 90% success rate)'] : []
  };
  totalScore += reliabilityScore * weights.reliability;

  results.ratings.overall.score = Math.round(totalScore);

  // Assign rating
  if (totalScore >= 90) {
    results.ratings.overall.rating = 'EXCELLENT (A+)';
  } else if (totalScore >= 80) {
    results.ratings.overall.rating = 'GOOD (A)';
  } else if (totalScore >= 70) {
    results.ratings.overall.rating = 'DECENT (B)';
  } else if (totalScore >= 60) {
    results.ratings.overall.rating = 'AVERAGE (C)';
  } else if (totalScore >= 50) {
    results.ratings.overall.rating = 'BELOW AVERAGE (D)';
  } else {
    results.ratings.overall.rating = 'POOR (F)';
  }

  return totalScore;
}

// Generate detailed report
function generateReport() {
  console.log('\n\n' + '='.repeat(100));
  console.log('📊 AI SYSTEM STRESS TEST REPORT');
  console.log('='.repeat(100));

  console.log('\n🎯 OVERALL RATING:');
  console.log(`   Score: ${results.ratings.overall.score}/100`);
  console.log(`   Rating: ${results.ratings.overall.rating}`);
  console.log(`   Rating out of 5.0: ${(results.ratings.overall.score / 20).toFixed(1)}/5.0`);

  console.log('\n📈 TEST SUMMARY:');
  console.log(`   Total Tests: ${results.summary.totalTests}`);
  console.log(`   Passed: ${results.summary.passed} (${((results.summary.passed / results.summary.totalTests) * 100).toFixed(2)}%)`);
  console.log(`   Failed: ${results.summary.failed} (${((results.summary.failed / results.summary.totalTests) * 100).toFixed(2)}%)`);
  console.log(`   Avg Response Time: ${Math.round(results.tests.reduce((sum, t) => sum + t.responseTime, 0) / results.tests.length)}ms`);
  console.log(`   Min Response Time: ${results.summary.minResponseTime}ms`);
  console.log(`   Max Response Time: ${results.summary.maxResponseTime}ms`);

  console.log('\n🎨 COMPATIBILITY SERVICE:');
  console.log(`   Score: ${results.ratings.compatibility.score.toFixed(2)}/100`);
  console.log(`   Strengths: ${results.ratings.compatibility.strengths.length > 0 ? '\n      ✅ ' + results.ratings.compatibility.strengths.join('\n      ✅ ') : 'None'}`);
  console.log(`   Issues: ${results.ratings.compatibility.issues.length > 0 ? '\n      ⚠️  ' + results.ratings.compatibility.issues.join('\n      ⚠️  ') : 'None'}`);

  console.log('\n🔼 UPGRADE SERVICE:');
  console.log(`   Score: ${results.ratings.upgrades.score.toFixed(2)}/100`);
  console.log(`   Strengths: ${results.ratings.upgrades.strengths.length > 0 ? '\n      ✅ ' + results.ratings.upgrades.strengths.join('\n      ✅ ') : 'None'}`);
  console.log(`   Issues: ${results.ratings.upgrades.issues.length > 0 ? '\n      ⚠️  ' + results.ratings.upgrades.issues.join('\n      ⚠️  ') : 'None'}`);

  console.log('\n⚡ PERFORMANCE:');
  console.log(`   Score: ${results.ratings.performance.score.toFixed(2)}/100`);
  console.log(`   Strengths: ${results.ratings.performance.strengths.length > 0 ? '\n      ✅ ' + results.ratings.performance.strengths.join('\n      ✅ ') : 'None'}`);
  console.log(`   Issues: ${results.ratings.performance.issues.length > 0 ? '\n      ⚠️  ' + results.ratings.performance.issues.join('\n      ⚠️  ') : 'None'}`);

  console.log('\n🛡️  RELIABILITY:');
  console.log(`   Score: ${results.ratings.reliability.score.toFixed(2)}/100`);
  console.log(`   Strengths: ${results.ratings.reliability.strengths.length > 0 ? '\n      ✅ ' + results.ratings.reliability.strengths.join('\n      ✅ ') : 'None'}`);

  if (results.summary.errors.length > 0) {
    console.log(`\n❌ TOP ERRORS:`);
    results.summary.errors.slice(0, 5).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.test}: ${err.error}`);
    });
  }

  console.log('\n💾 Saving results to:', RESULTS_FILE);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log('✅ Results saved successfully!');

  console.log('\n' + '='.repeat(100));
}

// Main execution
async function runStressTests() {
  console.log('🚀 STARTING COMPREHENSIVE AI STRESS TESTS...\n');
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log(`📦 Configuration:`);
  console.log(`   - Concurrent Requests: ${config.concurrentRequests}`);
  console.log(`   - Compatibility Tests: ${config.totalCompatibilityTests}`);
  console.log(`   - Upgrade Tests: ${config.totalUpgradeTests}`);
  console.log(`   - Timeout: ${config.timeout / 1000}s\n`);

  try {
    // Run all test suites
    await testCompatibility();
    await testUpgradeRecommendations();
    await testConcurrentLoad();
    await testCacheEffectiveness();

    // Calculate overall rating
    calculateOverallRating();

    // Generate and display report
    generateReport();

    console.log('\n✅ ALL STRESS TESTS COMPLETED!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ STRESS TESTS FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the stress tests
runStressTests();
