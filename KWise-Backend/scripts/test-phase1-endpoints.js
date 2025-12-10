/**
 * COMPREHENSIVE PHASE 1 API ENDPOINT TESTING
 * Tests all Phase 1 fixes to ensure stability
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let passed = 0;
let failed = 0;

function log(color, symbol, message) {
  console.log(`${color}${symbol}${COLORS.reset} ${message}`);
}

function logSuccess(message) {
  passed++;
  log(COLORS.green, '✅', message);
}

function logError(message) {
  failed++;
  log(COLORS.red, '❌', message);
}

function logInfo(message) {
  log(COLORS.cyan, 'ℹ️', message);
}

function logWarning(message) {
  log(COLORS.yellow, '⚠️', message);
}

async function testEndpoint(name, testFn) {
  console.log(`\n${'='.repeat(80)}`);
  log(COLORS.blue, '🧪', `TEST: ${name}`);
  console.log('='.repeat(80));
  
  try {
    await testFn();
  } catch (error) {
    logError(`${name} - ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

async function main() {
  console.log('\n' + '█'.repeat(80));
  log(COLORS.cyan, '🚀', 'PHASE 1 COMPREHENSIVE API ENDPOINT TESTING');
  console.log('█'.repeat(80));
  
  // ============================================================
  // PHASE 1.1: PC UPGRADE REFERENCE BUILDS
  // ============================================================
  
  await testEndpoint('Phase 1.1: Get Reference Builds (All)', async () => {
    const response = await axios.get(`${BASE_URL}/api/pc-upgrade/reference-builds`);
    
    if (response.status === 200) {
      logSuccess('Reference builds endpoint accessible');
    }
    
    const builds = response.data.builds || [];
    logInfo(`Found ${builds.length} reference builds`);
    
    if (builds.length >= 72) {
      logSuccess(`Database populated with ${builds.length} builds (expected 72)`);
    } else {
      logError(`Only ${builds.length} builds found (expected 72)`);
    }
    
    if (response.data.count === builds.length) {
      logSuccess(`Count matches: ${response.data.count}`);
    }
  });
  
  await testEndpoint('Phase 1.1: Get Reference Builds (Filtered)', async () => {
    const response = await axios.get(`${BASE_URL}/api/pc-upgrade/reference-builds`, {
      params: {
        usageType: 'Gaming',
        ageRange: '2016-2020',
        budgetRange: '26000-50000'
      }
    });
    
    if (response.status === 200) {
      logSuccess('Filtered reference builds working');
    }
    
    const builds = response.data.builds || [];
    logInfo(`Filtered builds: ${builds.length}`);
    
    // Verify filtering worked
    const allMatch = builds.every(build => 
      build.usage_type === 'Gaming' &&
      build.age_range === '2016-2020' &&
      build.budget_range === '26000-50000'
    );
    
    if (allMatch) {
      logSuccess('Filters working correctly');
    } else {
      logError('Filter mismatch detected');
    }
    
    // Verify data structure
    if (builds.length > 0) {
      const sample = builds[0];
      if (sample.components && sample.total_price && sample.usage_type) {
        logSuccess('Data structure correct (components, total_price, usage_type)');
      } else {
        logError('Missing required fields in build data');
      }
    }
  });
  
  // ============================================================
  // PHASE 1.2: EXTERNAL SUGGESTIONS
  // ============================================================
  
  await testEndpoint('Phase 1.2: External Suggestions (CPU)', async () => {
    const response = await axios.post(`${BASE_URL}/api/pc-upgrade/external-suggestions`, {
      currentComponent: 'Intel Core i5-10400F',
      category: 'CPU',
      budget: 15000,
      targetPerformance: 'gaming'
    });
    
    if (response.status === 200) {
      logSuccess('External suggestions endpoint working (200 OK)');
    }
    
    const data = response.data;
    
    if (data.success) {
      logSuccess('Response indicates success');
    }
    
    if (data.suggestions && data.suggestions.length === 2) {
      logSuccess(`Received 2 suggestions as expected`);
    } else {
      logError(`Expected 2 suggestions, got ${data.suggestions?.length || 0}`);
    }
    
    // Verify suggestion structure
    if (data.suggestions && data.suggestions[0]) {
      const suggestion = data.suggestions[0];
      const requiredFields = ['name', 'estimatedPrice', 'performanceGain', 'badge'];
      const missingFields = requiredFields.filter(field => !suggestion[field]);
      
      if (missingFields.length === 0) {
        logSuccess('Suggestion structure complete');
      } else {
        logError(`Missing fields: ${missingFields.join(', ')}`);
      }
    }
    
    logInfo(`Response time: ${response.headers['x-response-time'] || 'N/A'}`);
  });
  
  await testEndpoint('Phase 1.2: External Suggestions (GPU)', async () => {
    const response = await axios.post(`${BASE_URL}/api/pc-upgrade/external-suggestions`, {
      currentComponent: 'NVIDIA GTX 1660',
      category: 'GPU',
      budget: 20000
    });
    
    if (response.status === 200 && response.data.success) {
      logSuccess('External suggestions working for GPU category');
    }
    
    if (response.data.suggestions?.length === 2) {
      logSuccess('GPU suggestions returned correctly');
    }
  });
  
  await testEndpoint('Phase 1.2: Available Upgrades', async () => {
    const response = await axios.get(`${BASE_URL}/api/pc-upgrade/available-upgrades`, {
      params: {
        category: 'GPU',
        minPrice: 10000,
        maxPrice: 30000
      }
    });
    
    if (response.status === 200) {
      logSuccess('Available upgrades endpoint working');
    }
    
    const upgrades = response.data.upgrades || [];
    logInfo(`Found ${upgrades.length} available upgrades`);
    
    if (upgrades.length > 0) {
      logSuccess('In-stock upgrades available');
      
      // Verify price filtering
      const allInRange = upgrades.every(upgrade => {
        const price = parseFloat(upgrade.price);
        return price >= 10000 && price <= 30000;
      });
      
      if (allInRange) {
        logSuccess('Price filtering working correctly');
      } else {
        logError('Some products outside price range');
      }
    }
  });
  
  // ============================================================
  // PHASE 1.3: COMPATIBILITY SCORING
  // ============================================================
  
  await testEndpoint('Phase 1.3: Compatibility Analysis', async () => {
    const response = await axios.post(`${BASE_URL}/api/compatibility/analyze`, {
      currentProduct: {
        id: 30, // AMD Ryzen 5 5600GT
        category: 'CPU'
      },
      candidateProducts: [
        { id: 107, category: 'Motherboard' }, // ASROCK B550M (AM4 compatible)
        { id: 443, category: 'GPU' }
      ]
    });
    
    if (response.status === 200) {
      logSuccess('Compatibility analysis endpoint working');
    }
    
    const products = response.data.data || [];
    logInfo(`Analyzed ${products.length} products`);
    
    // Find motherboard and GPU
    const motherboard = products.find(p => p.category === 'Motherboard');
    const gpu = products.find(p => p.category === 'GPU');
    
    if (motherboard) {
      logInfo(`Motherboard score: ${motherboard.compatibility_score}%`);
      
      if (motherboard.compatibility_score > 0) {
        logSuccess('Motherboard compatibility scoring working (score > 0)');
      } else {
        logError('Motherboard score still 0 (should be 70%+ for AM4 match)');
      }
      
      if (motherboard.compatibility_score >= 70) {
        logSuccess(`Motherboard score ${motherboard.compatibility_score}% (excellent, AM4 compatible)`);
      }
    }
    
    if (gpu) {
      logInfo(`GPU score: ${gpu.compatibility_score}%`);
      
      if (gpu.compatibility_score > 0) {
        logSuccess('GPU fallback scoring working (score > 0)');
      } else {
        logError('GPU score is 0 (should have fallback score 60-90%)');
      }
      
      if (gpu.compatibility_score >= 60) {
        logSuccess(`GPU baseline score ${gpu.compatibility_score}% (fallback working)`);
      }
    }
  });
  
  await testEndpoint('Phase 1.3: Compatibility with Missing Specs', async () => {
    const response = await axios.post(`${BASE_URL}/api/compatibility/analyze`, {
      currentProduct: {
        id: 30,
        category: 'CPU'
      },
      candidateProducts: [
        { id: 712, category: 'Cooling' } // ARCTIC F12 (missing socket info)
      ]
    });
    
    if (response.status === 200) {
      logSuccess('Compatibility handles missing specs gracefully');
    }
    
    const cooler = response.data.data?.find(p => p.category === 'Cooling');
    
    if (cooler) {
      logInfo(`Cooler score: ${cooler.compatibility_score}%`);
      
      if (cooler.compatibility_score === 0) {
        logSuccess('Correctly scores 0% for missing critical specs');
      }
      
      if (cooler.deterministic_issues?.length > 0) {
        logSuccess('Issues correctly reported for missing specs');
        logInfo(`Issue: ${cooler.deterministic_issues[0]?.message}`);
      }
    }
  });
  
  // ============================================================
  // HEALTH CHECK
  // ============================================================
  
  await testEndpoint('System Health Check', async () => {
    const response = await axios.get(`${BASE_URL}/api/health`);
    
    if (response.status === 200) {
      logSuccess('Health endpoint accessible');
    }
    
    if (response.data.status === 'ok') {
      logSuccess('System health: OK');
    }
    
    if (response.data.database) {
      logSuccess('Database connection: Healthy');
    }
  });
  
  // ============================================================
  // SUMMARY
  // ============================================================
  
  console.log('\n' + '█'.repeat(80));
  log(COLORS.cyan, '📊', 'TEST SUMMARY');
  console.log('█'.repeat(80));
  
  logSuccess(`Passed: ${passed}`);
  logError(`Failed: ${failed}`);
  
  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`\nPass Rate: ${passRate}%`);
  
  if (failed === 0) {
    log(COLORS.green, '🎉', 'ALL TESTS PASSED! Phase 1 is stable and ready for Phase 2.');
  } else {
    log(COLORS.yellow, '⚠️', `${failed} test(s) failed. Review and fix before proceeding.`);
  }
  
  console.log('\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
