/**
 * 🔥 BRUTAL K-WISE AI REAL SYSTEM TEST
 * Tests ACTUAL working API endpoints with REAL data
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';
const REPORT_FILE = 'BRUTAL_AI_REAL_TEST_REPORT.md';

// Real test components from database - UPDATED WITH VALID IDS!
// CPU 30: AMD Ryzen 5 5600GT - AM4 socket, 65W TDP
// Motherboard 104: GIGABYTE B450M DS3H V3 - AM4 socket, DDR4 (MATCHES CPU!)
// RAM 201: 8GB Team Elite Plus - DDR4 (MATCHES MOTHERBOARD!)
// PSU 501: 550W Corsair - Should be sufficient for this build
const TEST_BUILD = {
  CPU: { id: 30, name: "AMD Ryzen 5 5600GT", category: "CPU", price: 8500 },
  Motherboard: { id: 104, name: "GIGABYTE B450M DS3H V3", category: "Motherboard", price: 3500 },
  GPU: { id: 401, name: "8GB RTX4060 MSI VENTUS", category: "GPU", price: 18500 },
  RAM: { id: 201, name: "8GB Team Elite Plus DDR4 3200Mhz", category: "RAM", price: 1500 },
  Storage: { id: 301, name: "1TB Kingston NV2 M.2 NVMe", category: "Storage", price: 2800 },
  PSU: { id: 501, name: "550w Corsair CX550 80+ Bronze", category: "PSU", price: 2500 },
  Case: { id: 601, name: "NZXT H510 ELITE", category: "Case", price: 5500 }
};

let results = {
  timestamp: new Date().toISOString(),
  tests: [],
  overall: {
    passed: 0,
    failed: 0,
    rating: 0,
    grade: ''
  }
};

function log(level, test, message) {
  const emoji = { START: '🚀', PASS: '✅', FAIL: '❌', INFO: 'ℹ️' }[level] || '📝';
  console.log(`${new Date().toLocaleTimeString()} ${emoji} [${test}] ${message}`);
}

async function runTest(name, testFn) {
  log('START', name, 'Running test...');
  const start = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - start;
    
    results.tests.push({
      name,
      status: 'PASS',
      duration,
      ...result
    });
    
    results.overall.passed++;
    log('PASS', name, `Completed in ${duration}ms`);
    return true;
  } catch (error) {
    const duration = Date.now() - start;
    
    results.tests.push({
      name,
      status: 'FAIL',
      duration,
      error: error.message
    });
    
    results.overall.failed++;
    log('FAIL', name, `Failed: ${error.message}`);
    return false;
  }
}

// ====================
// TEST 1: COMPATIBILITY CHECK
// ====================
async function testCompatibilityCheck() {
  const response = await axios.post(`${BASE_URL}/api/builder/check-compatibility`, {
    build: TEST_BUILD
  });
  
  const data = response.data.data || response.data; // Handle both response formats
  const score = data.score || 0;
  const warnings = data.warnings?.length || 0;
  const recommendations = data.recommendations?.length || 0;
  
  return {
    score: score >= 80 ? 100 : score >= 60 ? 75 : score >= 40 ? 50 : 25,
    rating: score >= 80 ? 5.0 : score >= 60 ? 4.0 : score >= 40 ? 3.0 : 2.0,
    details: {
      compatibilityScore: score,
      warnings,
      recommendations,
      success: response.data.success
    }
  };
}

// ====================
// TEST 2: FUTURE UPGRADE (IN-STOCK)
// ====================
async function testFutureUpgradeInStock() {
  const response = await axios.post(`${BASE_URL}/api/ai/future-upgrade`, {
    currentBuild: {
      cpu: { id: 10, name: "Intel Core i5-10400F", price: 8000 },
      gpu: { id: 420, name: "GTX 1650 4GB", price: 12000 },
      ram: { id: 210, name: "8GB DDR4-2666", price: 1800 }
    },
    userBudget: 40000,
    usage: 'gaming',
    includeExternalMarket: false
  });
  
  const data = response.data.data || response.data;
  const recommendations = data.recommendations || {};
  const upgradeCount = Object.keys(recommendations).length;
  const hasBottlenecks = !!data.bottlenecks;
  
  let score = 0;
  if (upgradeCount >= 3) score = 100;
  else if (upgradeCount >= 2) score = 75;
  else if (upgradeCount >= 1) score = 50;
  else score = 25;
  
  return {
    score,
    rating: score >= 80 ? 5.0 : score >= 60 ? 4.0 : score >= 40 ? 3.0 : 2.0,
    details: {
      upgradeCount,
      hasBottlenecks,
      mode: data.mode
    }
  };
}

// ====================
// TEST 3: FUTURE UPGRADE (EXTERNAL)
// ====================
async function testFutureUpgradeExternal() {
  const response = await axios.post(`${BASE_URL}/api/ai/future-upgrade-external`, {
    currentBuild: {
      cpu: TEST_BUILD.CPU,
      gpu: TEST_BUILD.GPU,
      ram: TEST_BUILD.RAM
    },
    userBudget: 50000,
    usage: 'gaming',
    includeExternalMarket: true
  }, { timeout: 30000 }); // 30 second timeout for AI generation
  
  const data = response.data.data || response.data;
  const externalSuggestions = data.externalSuggestions?.suggestions?.length || 0;
  const hasMarketData = data.externalSuggestions?.success;
  
  let score = 0;
  if (externalSuggestions >= 3 && hasMarketData) score = 100;
  else if (externalSuggestions >= 2) score = 75;
  else if (externalSuggestions >= 1) score = 50;
  else score = 25;
  
  return {
    score,
    rating: score >= 80 ? 5.0 : score >= 60 ? 4.0 : score >= 40 ? 3.0 : 2.0,
    details: {
      externalSuggestions,
      hasMarketData,
      validated: data.externalSuggestions?.suggestions?.filter(s => s.validated).length || 0
    }
  };
}

// ====================
// TEST 4: STRESS TEST - 5 CONCURRENT REQUESTS
// ====================
async function testConcurrentLoad() {
  const requests = [];
  const startTime = Date.now();
  
  for (let i = 0; i < 5; i++) {
    const req = axios.post(`${BASE_URL}/api/builder/check-compatibility`, {
      build: TEST_BUILD
    });
    requests.push(req);
  }
  
  const responses = await Promise.all(requests);
  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / 5;
  
  const successful = responses.filter(r => r.data.success).length;
  const errorRate = ((5 - successful) / 5) * 100;
  
  let score = 0;
  if (successful === 5 && avgTime < 500) score = 100;
  else if (successful === 5 && avgTime < 1000) score = 85;
  else if (successful === 5) score = 75;
  else if (successful >= 4) score = 60;
  else if (successful >= 3) score = 40;
  else score = 20;
  
  return {
    score,
    rating: score >= 80 ? 5.0 : score >= 60 ? 4.0 : score >= 40 ? 3.0 : 2.0,
    details: {
      successful,
      failed: 5 - successful,
      avgTime: Math.round(avgTime),
      totalTime,
      errorRate: errorRate.toFixed(1) + '%'
    }
  };
}

// ====================
// TEST 5: AI RECOMMEND BUILD
// ====================
async function testAIRecommendBuild() {
  const response = await axios.post(`${BASE_URL}/api/ai/recommend-build`, {
    budget: 50000,
    usage: 'gaming',
    preferences: {
      prioritize_gpu: true
    }
  }, { timeout: 30000 });
  
  const data = response.data;
  const hasRecommendations = !!data.recommended_build;
  const totalPrice = data.total_price || 0;
  const withinBudget = totalPrice <= 50000;
  
  let score = 0;
  if (hasRecommendations && withinBudget && totalPrice > 0) score = 100;
  else if (hasRecommendations && totalPrice > 0) score = 75;
  else if (hasRecommendations) score = 50;
  else score = 25;
  
  return {
    score,
    rating: score >= 80 ? 5.0 : score >= 60 ? 4.0 : score >= 40 ? 3.0 : 2.0,
    details: {
      hasRecommendations,
      totalPrice,
      withinBudget,
      reasoning: !!data.reasoning
    }
  };
}

// ====================
// TEST 6: ESTIMATE MY PC
// ====================
async function testEstimateMyPC() {
  const response = await axios.post(`${BASE_URL}/api/ai/estimate-my-pc`, {
    budget: 30000,
    usage: 'gaming',
    requirements: {
      fps_target: 60,
      resolution: '1080p',
      games: ['Valorant', 'GTA V']
    }
  }, { timeout: 30000 });
  
  const data = response.data;
  const hasEstimate = !!data.estimated_build;
  const hasFPS = !!data.fps_estimates;
  
  let score = 0;
  if (hasEstimate && hasFPS) score = 100;
  else if (hasEstimate) score = 75;
  else score = 25;
  
  return {
    score,
    rating: score >= 80 ? 5.0 : score >= 60 ? 4.0 : score >= 40 ? 3.0 : 2.0,
    details: {
      hasEstimate,
      hasFPS,
      totalPrice: data.total_price || 0
    }
  };
}

// ====================
// GENERATE REPORT
// ====================
function generateReport() {
  const totalTests = results.tests.length;
  const avgScore = results.tests.reduce((sum, t) => sum + (t.score || 0), 0) / totalTests;
  const avgRating = avgScore >= 80 ? 5.0 : avgScore >= 60 ? 4.0 : avgScore >= 40 ? 3.0 : 2.0;
  
  results.overall.rating = avgRating;
  results.overall.grade = avgRating >= 4.5 ? 'EXCELLENT ⭐⭐⭐⭐⭐' :
                          avgRating >= 4.0 ? 'VERY GOOD ⭐⭐⭐⭐' :
                          avgRating >= 3.0 ? 'GOOD ⭐⭐⭐' :
                          avgRating >= 2.0 ? 'BELOW AVERAGE ⭐⭐' : 'BAD ⭐';
  
  const report = `# 🔥 K-WISE AI SYSTEM - REAL BRUTAL STRESS TEST REPORT

**Test Date:** ${new Date(results.timestamp).toLocaleString()}  
**Overall Rating:** **${avgRating}/5.0** (${results.overall.grade})  
**Tests Passed:** ${results.overall.passed}/${totalTests}  
**Tests Failed:** ${results.overall.failed}/${totalTests}  
**Average Score:** ${avgScore.toFixed(1)}/100

---

## 📊 TEST RESULTS

${results.tests.map((test, i) => `
### ${i + 1}. ${test.name}

- **Status:** ${test.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}
- **Duration:** ${test.duration}ms
- **Score:** ${test.score || 0}/100
- **Rating:** ${test.rating || 0}/5.0
${test.error ? `- **Error:** ${test.error}` : ''}
${test.details ? `
**Details:**
${Object.entries(test.details).map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n')}
` : ''}
`).join('\n---\n')}

---

## 🎯 OVERALL ASSESSMENT

**Rating:** ${avgRating}/5.0 (${results.overall.grade})

${avgRating >= 4.5 ? `
🎉 **EXCELLENT!** All AI services performing at production-ready levels.
` : avgRating >= 4.0 ? `
✅ **VERY GOOD!** System is solid, minor optimizations possible.
` : avgRating >= 3.0 ? `
⚠️ **GOOD.** System works well but has room for improvement.
` : avgRating >= 2.0 ? `
❌ **BELOW AVERAGE.** Several issues need attention.
` : `
🚨 **BAD!** Critical problems detected. Immediate fixes required.
`}

---

## 📈 PERFORMANCE SUMMARY

- **Fast Tests (<1s):** ${results.tests.filter(t => t.duration < 1000).length}/${totalTests}
- **Acceptable (1-5s):** ${results.tests.filter(t => t.duration >= 1000 && t.duration < 5000).length}/${totalTests}
- **Slow (>5s):** ${results.tests.filter(t => t.duration >= 5000).length}/${totalTests}
- **Success Rate:** ${((results.overall.passed / totalTests) * 100).toFixed(1)}%

---

**Test Completed:** ${new Date().toLocaleString()}  
**Total Test Duration:** ${Date.now() - new Date(results.timestamp).getTime()}ms

---

*Generated by K-Wise Brutal AI Real System Test*
`;

  fs.writeFileSync(REPORT_FILE, report, 'utf8');
  console.log(`\n✅ Report generated: ${REPORT_FILE}\n`);
}

// ====================
// MAIN EXECUTION
// ====================
async function runAllTests() {
  console.log('\n🔥 ========================================');
  console.log('🔥 K-WISE AI REAL BRUTAL STRESS TEST');
  console.log('🔥 Testing ACTUAL working API endpoints');
  console.log('🔥 ========================================\n');
  
  try {
    // Run all tests
    await runTest('Compatibility Check', testCompatibilityCheck);
    await runTest('Future Upgrade (In-Stock)', testFutureUpgradeInStock);
    await runTest('Future Upgrade (External)', testFutureUpgradeExternal);
    await runTest('Concurrent Load Test', testConcurrentLoad);
    
    // Generate report
    generateReport();
    
    console.log('\n🎉 ========================================');
    console.log(`🎉 OVERALL RATING: ${results.overall.rating}/5.0`);
    console.log(`🎉 ${results.overall.grade}`);
    console.log(`🎉 Passed: ${results.overall.passed}/${results.tests.length}`);
    console.log('🎉 ========================================\n');
    
    process.exit(results.overall.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

runAllTests();
