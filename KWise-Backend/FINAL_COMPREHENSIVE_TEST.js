/**
 * FINAL COMPREHENSIVE SYSTEM TEST
 * Validates all critical functionality before deployment
 * 
 * Tests:
 * 1. Backend health and database connectivity
 * 2. All API endpoints respond correctly
 * 3. Cache system operational
 * 4. AI service availability
 * 5. Performance metrics within targets
 * 6. Zero critical errors
 */

const axios = require('axios');
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const BASE_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function log(type, message) {
  const icons = {
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
    info: 'ℹ️'
  };
  
  const color = {
    pass: colors.green,
    fail: colors.red,
    warn: colors.yellow,
    info: colors.blue
  }[type] || colors.reset;
  
  console.log(`${color}${icons[type]} ${message}${colors.reset}`);
}

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    const start = Date.now();
    const response = await axios.get(url, { timeout: 10000 });
    const duration = Date.now() - start;
    
    if (response.status === expectedStatus) {
      log('pass', `${name}: ${duration}ms`);
      results.passed++;
      results.tests.push({ name, status: 'PASS', duration });
      return { success: true, data: response.data, duration };
    } else {
      log('fail', `${name}: Expected ${expectedStatus}, got ${response.status}`);
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: `Status ${response.status}` });
      return { success: false };
    }
  } catch (error) {
    log('fail', `${name}: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    return { success: false, error: error.message };
  }
}

async function testPostEndpoint(name, url, data, expectedStatus = 200) {
  try {
    const start = Date.now();
    const response = await axios.post(url, data, { timeout: 15000 });
    const duration = Date.now() - start;
    
    if (response.status === expectedStatus && response.data.success) {
      log('pass', `${name}: ${duration}ms`);
      results.passed++;
      results.tests.push({ name, status: 'PASS', duration });
      return { success: true, data: response.data, duration };
    } else {
      log('fail', `${name}: ${response.data.message || 'Failed'}`);
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: response.data.message });
      return { success: false };
    }
  } catch (error) {
    log('fail', `${name}: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🔥 FINAL COMPREHENSIVE SYSTEM TEST${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  // PHASE 1: Core Infrastructure
  console.log(`\n${colors.yellow}PHASE 1: Core Infrastructure${colors.reset}`);
  console.log(`${colors.yellow}${'─'.repeat(60)}${colors.reset}\n`);
  
  const health = await testEndpoint('Backend Health', `${BASE_URL}/api/health`);
  if (!health.success) {
    log('fail', 'Backend is not running! Cannot proceed with tests.');
    process.exit(1);
  }
  
  await testEndpoint('Database Connection', `${BASE_URL}/api/health`);
  
  // Test frontend
  try {
    const frontendRes = await axios.get(FRONTEND_URL, { timeout: 5000 });
    if (frontendRes.status === 200) {
      log('pass', 'Frontend is running');
      results.passed++;
    } else {
      log('warn', 'Frontend returned non-200 status');
      results.warnings++;
    }
  } catch (error) {
    log('warn', 'Frontend may not be running on port 3000');
    results.warnings++;
  }
  
  // PHASE 2: API Endpoints
  console.log(`\n${colors.yellow}PHASE 2: Critical API Endpoints${colors.reset}`);
  console.log(`${colors.yellow}${'─'.repeat(60)}${colors.reset}\n`);
  
  await testEndpoint('Cache Stats', `${BASE_URL}/api/cache/stats`);
  await testEndpoint('Cache Metrics', `${BASE_URL}/api/cache/metrics`);
  
  // PHASE 3: AI Services
  console.log(`\n${colors.yellow}PHASE 3: AI Services${colors.reset}`);
  console.log(`${colors.yellow}${'─'.repeat(60)}${colors.reset}\n`);
  
  // Test compatibility analysis
  const compatTest = await testPostEndpoint(
    'Compatibility Analysis',
    `${BASE_URL}/api/ai/compatibility/analyze`,
    {
      selectedParts: {
        CPU: { id: 1, name: 'AMD RYZEN 7 9800X3D', category: 'CPU' }
      },
      candidateProduct: { id: 100, name: 'MSI B650 GAMING PLUS WIFI', category: 'Motherboard' }
    }
  );
  
  if (compatTest.success && compatTest.duration > 5000) {
    log('warn', `Compatibility analysis slow: ${compatTest.duration}ms (target: <1000ms)`);
    results.warnings++;
  }
  
  // Test upgrade recommendations (fast check)
  const upgradeTest = await testPostEndpoint(
    'Upgrade Recommendations',
    `${BASE_URL}/api/ai/upgrade/recommend`,
    {
      currentBuild: {
        CPU: { name: 'AMD RYZEN 7 9800X3D' },
        GPU: { name: '8GB RTX4060 MSI VENTUS' }
      },
      userBudget: 50000,
      usage: 'gaming'
    }
  );
  
  if (upgradeTest.success && upgradeTest.duration < 100) {
    log('pass', `Fast upgrade response: ${upgradeTest.duration}ms (target achieved!)`);
  } else if (upgradeTest.success && upgradeTest.duration > 3000) {
    log('warn', `Upgrade recommendations slow: ${upgradeTest.duration}ms`);
    results.warnings++;
  }
  
  // PHASE 4: Performance Validation
  console.log(`\n${colors.yellow}PHASE 4: Performance Validation${colors.reset}`);
  console.log(`${colors.yellow}${'─'.repeat(60)}${colors.reset}\n`);
  
  const cacheStats = await testEndpoint('Cache Statistics', `${BASE_URL}/api/cache/stats`);
  if (cacheStats.success && cacheStats.data.data) {
    const hitRate = parseFloat(cacheStats.data.data.hitRate) || 0;
    const totalEntries = parseInt(cacheStats.data.data.totalEntries) || 0;
    
    if (hitRate >= 60) {
      log('pass', `Cache hit rate: ${hitRate.toFixed(1)}% (target: ≥60%) ✅`);
    } else if (hitRate >= 40) {
      log('warn', `Cache hit rate: ${hitRate.toFixed(1)}% (target: ≥60%)`);
      results.warnings++;
    } else {
      log('fail', `Cache hit rate too low: ${hitRate.toFixed(1)}%`);
      results.failed++;
    }
    
    log('info', `Cache entries: ${totalEntries}`);
  }
  
  // PHASE 5: Response Time Benchmark
  console.log(`\n${colors.yellow}PHASE 5: Response Time Benchmark${colors.reset}`);
  console.log(`${colors.yellow}${'─'.repeat(60)}${colors.reset}\n`);
  
  const responseTimes = [];
  const BENCHMARK_REQUESTS = 10;
  
  log('info', `Running ${BENCHMARK_REQUESTS} benchmark requests...`);
  
  for (let i = 0; i < BENCHMARK_REQUESTS; i++) {
    const start = Date.now();
    try {
      await axios.post(`${BASE_URL}/api/ai/compatibility/analyze`, {
        selectedParts: {
          CPU: { id: 1, name: 'Test CPU', category: 'CPU' }
        },
        candidateProduct: { id: 100, name: 'Test Product', category: 'Motherboard' }
      }, { timeout: 10000 });
      const duration = Date.now() - start;
      responseTimes.push(duration);
      process.stdout.write('.');
    } catch (error) {
      process.stdout.write('x');
    }
  }
  console.log('');
  
  if (responseTimes.length > 0) {
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minTime = Math.min(...responseTimes);
    const maxTime = Math.max(...responseTimes);
    
    log('info', `Average response time: ${avgTime.toFixed(0)}ms`);
    log('info', `Min: ${minTime}ms, Max: ${maxTime}ms`);
    
    if (avgTime < 200) {
      log('pass', `Performance excellent: <200ms average ✅`);
      results.passed++;
    } else if (avgTime < 500) {
      log('pass', `Performance good: <500ms average`);
      results.passed++;
    } else if (avgTime < 1000) {
      log('warn', `Performance acceptable: <1000ms average`);
      results.warnings++;
    } else {
      log('fail', `Performance poor: ${avgTime.toFixed(0)}ms average`);
      results.failed++;
    }
  }
  
  // FINAL SUMMARY
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}📊 FINAL RESULTS${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  const total = results.passed + results.failed + results.warnings;
  const successRate = ((results.passed / total) * 100).toFixed(1);
  
  log('pass', `Passed: ${results.passed}/${total}`);
  if (results.failed > 0) {
    log('fail', `Failed: ${results.failed}/${total}`);
  }
  if (results.warnings > 0) {
    log('warn', `Warnings: ${results.warnings}/${total}`);
  }
  
  console.log(`\n${colors.blue}Success Rate: ${successRate}%${colors.reset}\n`);
  
  // Overall assessment
  if (results.failed === 0 && results.warnings === 0) {
    log('pass', '🎉 ALL TESTS PASSED! System ready for production.');
    console.log(`\n${colors.green}✅ DEPLOYMENT READY${colors.reset}\n`);
  } else if (results.failed === 0 && results.warnings <= 3) {
    log('warn', '⚠️ Minor issues detected but system is functional');
    console.log(`\n${colors.yellow}✅ DEPLOYMENT READY WITH MINOR NOTES${colors.reset}\n`);
  } else if (results.failed <= 2) {
    log('warn', '⚠️ Some issues need attention before production');
    console.log(`\n${colors.yellow}⚠️ REVIEW REQUIRED${colors.reset}\n`);
  } else {
    log('fail', '❌ Critical issues found. Do not deploy!');
    console.log(`\n${colors.red}❌ NOT READY FOR DEPLOYMENT${colors.reset}\n`);
  }
  
  // Save results
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
      successRate: `${successRate}%`
    },
    tests: results.tests,
    recommendation: results.failed === 0 && results.warnings <= 3 ? 'DEPLOY' : 'REVIEW'
  };
  
  const fs = require('fs');
  fs.writeFileSync('FINAL_TEST_REPORT.json', JSON.stringify(report, null, 2));
  log('info', 'Report saved to FINAL_TEST_REPORT.json');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
