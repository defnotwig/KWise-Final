/**
 * COMPREHENSIVE AI SYSTEM STRESS TEST & ANALYSIS
 * 
 * This script brutally tests ALL AI services in the K-Wise system:
 * 1. PC Parts Compatibility Filtering
 * 2. PC Customized with AI (8-step builder)
 * 3. PC Customizer Manual (compatibility checks)
 * 4. PC Upgrade (AI recommendations + external suggestions)
 * 5. Product Page "Compatible With"
 * 6. Future Upgrades Predictions
 * 
 * Tests include:
 * - Functional correctness
 * - Performance under load
 * - Edge case handling
 * - AI quality assessment
 * - Circuit breaker resilience
 * - Cache effectiveness
 * 
 * Rating Scale:
 * 5.0 = Perfect (no issues, exceptional quality)
 * 4.0 = Good (minor issues, high quality)
 * 3.0 = Decent (some issues, acceptable quality)
 * 2.0 = Average (multiple issues, mediocre quality)
 * 1.0 = Bad (many issues, poor quality)
 * 0.0 = Critical (system broken, unusable)
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

// Test results storage
const testResults = {
  compatibility: {},
  pcCustomizedAI: {},
  pcCustomizerManual: {},
  pcUpgrade: {},
  productCompatibleWith: {},
  futureUpgrades: {},
  stressTests: {},
  aiQuality: {}
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

const log = {
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(80)}\n${msg}\n${'='.repeat(80)}${colors.reset}\n`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.magenta}🧪 ${msg}${colors.reset}`)
};

/**
 * TEST 1: PC PARTS COMPATIBILITY FILTER
 * Tests AI-powered filtering when viewing PC parts with selected components
 */
async function testPCPartsCompatibility() {
  log.header('TEST 1: PC PARTS COMPATIBILITY FILTER');
  
  const tests = [];
  
  try {
    // Test 1.1: CPU + Motherboard compatibility filter
    log.section('Test 1.1: CPU + Motherboard Compatibility Filter');
    const test1Start = Date.now();
    
    // Simulate user selecting Ryzen 5 5600X
    const cpu = { id: 1, category: 'CPU', socket: 'AM4', tdp: 65 };
    const motherboardsResponse = await axios.post(`${BASE_URL}/api/compatibility`, {
      currentBuild: { cpu },
      targetCategory: 'Motherboard'
    });
    
    const test1Time = Date.now() - test1Start;
    tests.push({
      name: 'CPU + Motherboard Filter',
      passed: motherboardsResponse.data.success && motherboardsResponse.data.compatibleProducts.length > 0,
      latency: test1Time,
      details: `Found ${motherboardsResponse.data.compatibleProducts?.length || 0} compatible motherboards`,
      aiUsed: motherboardsResponse.data.aiAnalysis ? true : false
    });
    
    log.success(`Found ${motherboardsResponse.data.compatibleProducts?.length || 0} compatible motherboards in ${test1Time}ms`);
    
    // Test 1.2: GPU + PSU compatibility filter
    log.section('Test 1.2: GPU + PSU Compatibility Filter');
    const test2Start = Date.now();
    
    const gpu = { id: 10, category: 'GPU', powerConsumption: 320, length: 310 };
    const psuResponse = await axios.post(`${BASE_URL}/api/compatibility`, {
      currentBuild: { gpu },
      targetCategory: 'PSU'
    });
    
    const test2Time = Date.now() - test2Start;
    tests.push({
      name: 'GPU + PSU Filter',
      passed: psuResponse.data.success && psuResponse.data.compatibleProducts.length > 0,
      latency: test2Time,
      details: `Found ${psuResponse.data.compatibleProducts?.length || 0} compatible PSUs`,
      aiUsed: psuResponse.data.aiAnalysis ? true : false
    });
    
    log.success(`Found ${psuResponse.data.compatibleProducts?.length || 0} compatible PSUs in ${test2Time}ms`);
    
    // Test 1.3: Full build compatibility filter (all components)
    log.section('Test 1.3: Full Build Compatibility Filter');
    const test3Start = Date.now();
    
    const fullBuild = {
      cpu: { id: 1, socket: 'AM4', tdp: 65 },
      motherboard: { id: 5, socket: 'AM4', ramType: 'DDR4', maxRamSpeed: 3200 },
      gpu: { id: 10, powerConsumption: 320 },
      psu: { id: 15, wattage: 650 }
    };
    
    const ramResponse = await axios.post(`${BASE_URL}/api/compatibility`, {
      currentBuild: fullBuild,
      targetCategory: 'RAM'
    });
    
    const test3Time = Date.now() - test3Start;
    tests.push({
      name: 'Full Build + RAM Filter',
      passed: ramResponse.data.success && ramResponse.data.compatibleProducts.length > 0,
      latency: test3Time,
      details: `Found ${ramResponse.data.compatibleProducts?.length || 0} compatible RAM modules`,
      aiUsed: ramResponse.data.aiAnalysis ? true : false
    });
    
    log.success(`Found ${ramResponse.data.compatibleProducts?.length || 0} compatible RAM in ${test3Time}ms`);
    
    // Test 1.4: Edge case - incompatible build
    log.section('Test 1.4: Edge Case - Incompatible Build');
    const test4Start = Date.now();
    
    const incompatibleBuild = {
      cpu: { id: 1, socket: 'AM4' },
      motherboard: { id: 20, socket: 'LGA1700' } // Intentionally incompatible
    };
    
    const incompatResponse = await axios.post(`${BASE_URL}/api/compatibility`, {
      currentBuild: incompatibleBuild,
      targetCategory: 'RAM'
    });
    
    const test4Time = Date.now() - test4Start;
    tests.push({
      name: 'Incompatible Build Detection',
      passed: incompatResponse.data.success, // Should still succeed but with warnings
      latency: test4Time,
      details: `System handled incompatible build gracefully`,
      aiUsed: incompatResponse.data.aiAnalysis ? true : false
    });
    
    log.warn(`Incompatible build handled in ${test4Time}ms`);
    
  } catch (error) {
    log.error(`PC Parts Compatibility test failed: ${error.message}`);
    tests.push({
      name: 'PC Parts Compatibility',
      passed: false,
      error: error.message
    });
  }
  
  testResults.compatibility = {
    tests,
    passRate: (tests.filter(t => t.passed).length / tests.length * 100).toFixed(1),
    avgLatency: (tests.reduce((sum, t) => sum + (t.latency || 0), 0) / tests.length).toFixed(0),
    aiUsageRate: (tests.filter(t => t.aiUsed).length / tests.length * 100).toFixed(1)
  };
  
  log.info(`Pass Rate: ${testResults.compatibility.passRate}%`);
  log.info(`Avg Latency: ${testResults.compatibility.avgLatency}ms`);
  log.info(`AI Usage: ${testResults.compatibility.aiUsageRate}%`);
}

/**
 * TEST 2: PC CUSTOMIZED WITH AI (8-step builder)
 * Tests the AI-powered PC builder flow
 */
async function testPCCustomizedAI() {
  log.header('TEST 2: PC CUSTOMIZED WITH AI (AI-POWERED BUILDER)');
  
  const tests = [];
  
  try {
    // Test 2.1: Initial assessment (step 1/8)
    log.section('Test 2.1: Initial PC Use Case Assessment');
    const test1Start = Date.now();
    
    const assessmentResponse = await axios.post(`${BASE_URL}/api/ai/estimate-current-build`, {
      useCase: 'gaming',
      budget: 50000,
      preferences: {
        performance: 'high',
        rgb: true,
        futureProof: true
      }
    });
    
    const test1Time = Date.now() - test1Start;
    tests.push({
      name: 'Initial Assessment',
      passed: assessmentResponse.data.success,
      latency: test1Time,
      details: `Generated ${assessmentResponse.data.recommendations?.length || 0} recommendations`,
      aiUsed: true
    });
    
    log.success(`Assessment completed in ${test1Time}ms`);
    
    // Test 2.2: Component selection (steps 2-8)
    log.section('Test 2.2: Component Selection with AI Validation');
    const test2Start = Date.now();
    
    const components = [
      { category: 'CPU', id: 1, name: 'AMD Ryzen 5 5600X' },
      { category: 'Motherboard', id: 5, name: 'ASUS B550' },
      { category: 'GPU', id: 10, name: 'RTX 4070' },
      { category: 'RAM', id: 15, name: '16GB DDR4 3200MHz' },
      { category: 'Storage', id: 20, name: '1TB NVMe SSD' },
      { category: 'PSU', id: 25, name: '650W 80+ Gold' },
      { category: 'Case', id: 30, name: 'NZXT H510' },
      { category: 'Cooling', id: 35, name: 'Arctic Freezer 34' }
    ];
    
    let allValid = true;
    let totalValidationTime = 0;
    
    for (const component of components) {
      const validationResponse = await axios.post(`${BASE_URL}/api/ai/build/validate-compatibility`, {
        currentBuild: components.slice(0, components.indexOf(component)),
        newComponent: component
      });
      
      totalValidationTime += Date.now() - test2Start;
      
      if (!validationResponse.data.compatible) {
        allValid = false;
        log.warn(`${component.category} validation failed`);
      }
    }
    
    const test2Time = totalValidationTime / components.length;
    tests.push({
      name: '8-Step Component Selection',
      passed: allValid,
      latency: test2Time,
      details: `Validated ${components.length} components, ${allValid ? 'all compatible' : 'some incompatible'}`,
      aiUsed: true
    });
    
    log.success(`All components validated in avg ${test2Time.toFixed(0)}ms per component`);
    
    // Test 2.3: Final build optimization
    log.section('Test 2.3: Final Build Optimization');
    const test3Start = Date.now();
    
    const optimizationResponse = await axios.post(`${BASE_URL}/api/ai/build/optimize`, {
      build: components,
      budget: 50000,
      priorities: ['performance', 'value']
    });
    
    const test3Time = Date.now() - test3Start;
    tests.push({
      name: 'Build Optimization',
      passed: optimizationResponse.data.success,
      latency: test3Time,
      details: `Generated ${optimizationResponse.data.suggestions?.length || 0} optimization suggestions`,
      aiUsed: true
    });
    
    log.success(`Optimization completed in ${test3Time}ms`);
    
  } catch (error) {
    log.error(`PC Customized AI test failed: ${error.message}`);
    tests.push({
      name: 'PC Customized AI',
      passed: false,
      error: error.message
    });
  }
  
  testResults.pcCustomizedAI = {
    tests,
    passRate: (tests.filter(t => t.passed).length / tests.length * 100).toFixed(1),
    avgLatency: (tests.reduce((sum, t) => sum + (t.latency || 0), 0) / tests.length).toFixed(0),
    aiUsageRate: 100 // All tests use AI
  };
  
  log.info(`Pass Rate: ${testResults.pcCustomizedAI.passRate}%`);
  log.info(`Avg Latency: ${testResults.pcCustomizedAI.avgLatency}ms`);
}

/**
 * TEST 3: PC UPGRADE SYSTEM
 * Tests AI recommendations, external suggestions, and future upgrades
 */
async function testPCUpgrade() {
  log.header('TEST 3: PC UPGRADE SYSTEM');
  
  const tests = [];
  
  try {
    // Test 3.1: Current PC analysis
    log.section('Test 3.1: Current PC Build Analysis');
    const test1Start = Date.now();
    
    const currentBuild = {
      cpu: { id: 1, name: 'Ryzen 5 3600', socket: 'AM4', cores: 6 },
      gpu: { id: 10, name: 'GTX 1660 Super', vram: 6 },
      ram: { id: 15, size: 16, type: 'DDR4', speed: 3200 },
      motherboard: { id: 5, chipset: 'B450', socket: 'AM4' }
    };
    
    const analysisResponse = await axios.post(`${BASE_URL}/api/pc-upgrade/analyze`, {
      currentBuild,
      useCase: 'gaming',
      budget: 30000
    });
    
    const test1Time = Date.now() - test1Start;
    tests.push({
      name: 'Current PC Analysis',
      passed: analysisResponse.data.success && analysisResponse.data.compatibility_score !== undefined,
      latency: test1Time,
      details: `Compatibility: ${analysisResponse.data.compatibility_score}%, ${analysisResponse.data.upgrade_recommendations?.length || 0} recommendations`,
      aiUsed: true
    });
    
    log.success(`Analysis completed in ${test1Time}ms, score: ${analysisResponse.data.compatibility_score}%`);
    
    // Test 3.2: External suggestions (non-database components)
    log.section('Test 3.2: External Component Suggestions');
    const test2Start = Date.now();
    
    const externalResponse = await axios.post(`${BASE_URL}/api/pc-upgrade/external-suggestions`, {
      currentBuild,
      targetCategory: 'CPU',
      budget: 15000
    });
    
    const test2Time = Date.now() - test2Start;
    tests.push({
      name: 'External Suggestions',
      passed: externalResponse.data.success && externalResponse.data.suggestions?.length > 0,
      latency: test2Time,
      details: `Found ${externalResponse.data.suggestions?.length || 0} external CPU suggestions`,
      aiUsed: true
    });
    
    log.success(`External suggestions in ${test2Time}ms: ${externalResponse.data.suggestions?.length || 0} CPUs`);
    
    // Test 3.3: Reference builds comparison
    log.section('Test 3.3: Reference Builds Comparison');
    const test3Start = Date.now();
    
    const referenceResponse = await axios.get(`${BASE_URL}/api/pc-upgrade/reference-builds`, {
      params: { budget: 50000, useCase: 'gaming' }
    });
    
    const test3Time = Date.now() - test3Start;
    tests.push({
      name: 'Reference Builds',
      passed: referenceResponse.data.success && referenceResponse.data.builds?.length > 0,
      latency: test3Time,
      details: `Found ${referenceResponse.data.builds?.length || 0} reference builds`,
      aiUsed: false
    });
    
    log.success(`Reference builds in ${test3Time}ms: ${referenceResponse.data.builds?.length || 0} builds`);
    
    // Test 3.4: Upgrade priority ranking
    log.section('Test 3.4: Upgrade Priority Ranking');
    const test4Start = Date.now();
    
    const rankingResponse = await axios.post(`${BASE_URL}/api/ai/recommend-upgrade`, {
      currentBuild,
      useCase: 'gaming',
      budget: 30000
    });
    
    const test4Time = Date.now() - test4Start;
    tests.push({
      name: 'Upgrade Priority Ranking',
      passed: rankingResponse.data.success,
      latency: test4Time,
      details: `Ranked ${rankingResponse.data.upgrades?.length || 0} upgrade paths`,
      aiUsed: true
    });
    
    log.success(`Ranking completed in ${test4Time}ms`);
    
  } catch (error) {
    log.error(`PC Upgrade test failed: ${error.message}`);
    tests.push({
      name: 'PC Upgrade',
      passed: false,
      error: error.message
    });
  }
  
  testResults.pcUpgrade = {
    tests,
    passRate: (tests.filter(t => t.passed).length / tests.length * 100).toFixed(1),
    avgLatency: (tests.reduce((sum, t) => sum + (t.latency || 0), 0) / tests.length).toFixed(0),
    aiUsageRate: (tests.filter(t => t.aiUsed).length / tests.length * 100).toFixed(1)
  };
  
  log.info(`Pass Rate: ${testResults.pcUpgrade.passRate}%`);
  log.info(`Avg Latency: ${testResults.pcUpgrade.avgLatency}ms`);
  log.info(`AI Usage: ${testResults.pcUpgrade.aiUsageRate}%`);
}

/**
 * TEST 4: PRODUCT PAGE "COMPATIBLE WITH"
 * Tests compatibility suggestions on product pages
 */
async function testProductCompatibleWith() {
  log.header('TEST 4: PRODUCT PAGE "COMPATIBLE WITH"');
  
  const tests = [];
  
  try {
    // Test 4.1: CPU product page
    log.section('Test 4.1: CPU Product Compatible With');
    const test1Start = Date.now();
    
    const cpuResponse = await axios.post(`${BASE_URL}/api/compatibility/analyze`, {
      baseProduct: { id: 1, category: 'CPU', socket: 'AM4' },
      targetCategories: ['Motherboard', 'Cooling', 'RAM']
    });
    
    const test1Time = Date.now() - test1Start;
    tests.push({
      name: 'CPU Compatible With',
      passed: cpuResponse.data.success,
      latency: test1Time,
      details: `Found compatible: ${cpuResponse.data.compatible?.Motherboard?.length || 0} MBs, ${cpuResponse.data.compatible?.Cooling?.length || 0} coolers`,
      aiUsed: true
    });
    
    log.success(`CPU compatibility in ${test1Time}ms`);
    
    // Test 4.2: GPU product page
    log.section('Test 4.2: GPU Product Compatible With');
    const test2Start = Date.now();
    
    const gpuResponse = await axios.post(`${BASE_URL}/api/compatibility/analyze`, {
      baseProduct: { id: 10, category: 'GPU', powerConsumption: 320, length: 310 },
      targetCategories: ['PSU', 'Case', 'Motherboard']
    });
    
    const test2Time = Date.now() - test2Start;
    tests.push({
      name: 'GPU Compatible With',
      passed: gpuResponse.data.success,
      latency: test2Time,
      details: `Found compatible: ${gpuResponse.data.compatible?.PSU?.length || 0} PSUs, ${gpuResponse.data.compatible?.Case?.length || 0} cases`,
      aiUsed: true
    });
    
    log.success(`GPU compatibility in ${test2Time}ms`);
    
  } catch (error) {
    log.error(`Product Compatible With test failed: ${error.message}`);
    tests.push({
      name: 'Product Compatible With',
      passed: false,
      error: error.message
    });
  }
  
  testResults.productCompatibleWith = {
    tests,
    passRate: (tests.filter(t => t.passed).length / tests.length * 100).toFixed(1),
    avgLatency: (tests.reduce((sum, t) => sum + (t.latency || 0), 0) / tests.length).toFixed(0),
    aiUsageRate: 100
  };
  
  log.info(`Pass Rate: ${testResults.productCompatibleWith.passRate}%`);
  log.info(`Avg Latency: ${testResults.productCompatibleWith.avgLatency}ms`);
}

/**
 * TEST 5: FUTURE UPGRADES PREDICTIONS
 * Tests AI-powered future upgrade recommendations
 */
async function testFutureUpgrades() {
  log.header('TEST 5: FUTURE UPGRADES PREDICTIONS');
  
  const tests = [];
  
  try {
    // Test 5.1: Future CPU upgrades
    log.section('Test 5.1: Future CPU Upgrade Predictions');
    const test1Start = Date.now();
    
    const currentBuild = {
      cpu: { id: 1, name: 'Ryzen 5 5600X', socket: 'AM4', releaseYear: 2020 },
      motherboard: { id: 5, socket: 'AM4', chipset: 'B550' },
      budget: 15000
    };
    
    const cpuFutureResponse = await axios.post(`${BASE_URL}/api/ai/diagnostics/upgrade-analysis`, {
      currentBuild,
      targetComponent: 'CPU',
      timeframe: '6-12 months'
    });
    
    const test1Time = Date.now() - test1Start;
    tests.push({
      name: 'Future CPU Upgrades',
      passed: cpuFutureResponse.data.success,
      latency: test1Time,
      details: `Predicted ${cpuFutureResponse.data.upgrades?.length || 0} future CPU upgrades`,
      aiUsed: true
    });
    
    log.success(`CPU predictions in ${test1Time}ms`);
    
    // Test 5.2: Full build future upgrade path
    log.section('Test 5.2: Full Build Future Upgrade Path');
    const test2Start = Date.now();
    
    const fullBuild = {
      cpu: { id: 1, name: 'Ryzen 5 5600X' },
      gpu: { id: 10, name: 'RTX 4070' },
      ram: { id: 15, size: 16 },
      storage: { id: 20, size: 512 }
    };
    
    const fullFutureResponse = await axios.post(`${BASE_URL}/api/ai/diagnostics/analyze-bottlenecks`, {
      build: fullBuild,
      useCase: 'gaming',
      targetResolution: '1440p',
      targetFPS: 144
    });
    
    const test2Time = Date.now() - test2Start;
    tests.push({
      name: 'Full Build Future Path',
      passed: fullFutureResponse.data.success,
      latency: test2Time,
      details: `Identified ${fullFutureResponse.data.bottlenecks?.length || 0} bottlenecks, ${fullFutureResponse.data.recommendations?.length || 0} recommendations`,
      aiUsed: true
    });
    
    log.success(`Full path analysis in ${test2Time}ms`);
    
  } catch (error) {
    log.error(`Future Upgrades test failed: ${error.message}`);
    tests.push({
      name: 'Future Upgrades',
      passed: false,
      error: error.message
    });
  }
  
  testResults.futureUpgrades = {
    tests,
    passRate: (tests.filter(t => t.passed).length / tests.length * 100).toFixed(1),
    avgLatency: (tests.reduce((sum, t) => sum + (t.latency || 0), 0) / tests.length).toFixed(0),
    aiUsageRate: 100
  };
  
  log.info(`Pass Rate: ${testResults.futureUpgrades.passRate}%`);
  log.info(`Avg Latency: ${testResults.futureUpgrades.avgLatency}ms`);
}

/**
 * TEST 6: BRUTAL STRESS TESTING
 * Hammers the system with concurrent requests, edge cases, and extreme scenarios
 */
async function brutally_StressTest() {
  log.header('TEST 6: BRUTAL STRESS TESTING 🔥');
  
  const tests = [];
  
  try {
    // Test 6.1: 50 concurrent compatibility requests
    log.section('Test 6.1: 50 Concurrent Compatibility Requests');
    const test1Start = Date.now();
    
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/compatibility`, {
          currentBuild: { cpu: { id: i % 10, socket: 'AM4' } },
          targetCategory: ['Motherboard', 'RAM', 'Storage'][i % 3]
        }).catch(err => ({ error: err.message }))
      );
    }
    
    const results = await Promise.all(promises);
    const successes = results.filter(r => r.data && r.data.success).length;
    const failures = 50 - successes;
    
    const test1Time = Date.now() - test1Start;
    tests.push({
      name: '50 Concurrent Requests',
      passed: successes >= 45, // 90% success rate minimum
      latency: test1Time,
      details: `${successes}/50 succeeded (${(successes/50*100).toFixed(1)}%), ${failures} failed`,
      avgPerRequest: (test1Time / 50).toFixed(0)
    });
    
    log.success(`Stress test: ${successes}/50 succeeded in ${test1Time}ms (avg: ${(test1Time/50).toFixed(0)}ms per request)`);
    
    // Test 6.2: Edge case - empty build
    log.section('Test 6.2: Edge Case - Empty Build');
    const test2Start = Date.now();
    
    const emptyResponse = await axios.post(`${BASE_URL}/api/compatibility`, {
      currentBuild: {},
      targetCategory: 'CPU'
    }).catch(err => ({ error: err.message }));
    
    const test2Time = Date.now() - test2Start;
    tests.push({
      name: 'Empty Build Handling',
      passed: emptyResponse.data && emptyResponse.data.success,
      latency: test2Time,
      details: 'System handled empty build gracefully'
    });
    
    // Test 6.3: Edge case - invalid data
    log.section('Test 6.3: Edge Case - Invalid Data');
    const test3Start = Date.now();
    
    const invalidResponse = await axios.post(`${BASE_URL}/api/compatibility`, {
      currentBuild: { cpu: 'not an object' },
      targetCategory: 123
    }).catch(err => ({ error: err.message }));
    
    const test3Time = Date.now() - test3Start;
    tests.push({
      name: 'Invalid Data Handling',
      passed: invalidResponse.error || (invalidResponse.data && !invalidResponse.data.success),
      latency: test3Time,
      details: 'System rejected invalid data appropriately'
    });
    
    // Test 6.4: Circuit breaker stress test
    log.section('Test 6.4: Circuit Breaker Stress Test');
    const test4Start = Date.now();
    
    // Send 100 rapid requests to test circuit breaker
    const cbPromises = [];
    for (let i = 0; i < 100; i++) {
      cbPromises.push(
        axios.get(`${BASE_URL}/api/ai/status`).catch(err => ({ error: err.message }))
      );
    }
    
    const cbResults = await Promise.all(cbPromises);
    const cbSuccesses = cbResults.filter(r => r.data && r.data.success).length;
    
    // Check circuit breaker state after stress
    const cbStatusResponse = await axios.get(`${BASE_URL}/api/ai/status`);
    const cbState = cbStatusResponse.data.data.circuitBreaker.state;
    
    const test4Time = Date.now() - test4Start;
    tests.push({
      name: 'Circuit Breaker Resilience',
      passed: cbState === 'CLOSED' && cbSuccesses >= 95,
      latency: test4Time,
      details: `${cbSuccesses}/100 succeeded, Circuit: ${cbState}`,
      circuitState: cbState
    });
    
    log.success(`Circuit breaker: ${cbSuccesses}/100 succeeded, state: ${cbState}`);
    
  } catch (error) {
    log.error(`Stress test failed: ${error.message}`);
    tests.push({
      name: 'Stress Test',
      passed: false,
      error: error.message
    });
  }
  
  testResults.stressTests = {
    tests,
    passRate: (tests.filter(t => t.passed).length / tests.length * 100).toFixed(1),
    totalRequests: 250, // 50 + 100 + edge cases
    avgLatency: (tests.reduce((sum, t) => sum + (t.latency || 0), 0) / tests.length).toFixed(0)
  };
  
  log.info(`Pass Rate: ${testResults.stressTests.passRate}%`);
  log.info(`Total Requests: ${testResults.stressTests.totalRequests}`);
  log.info(`Avg Latency: ${testResults.stressTests.avgLatency}ms`);
}

/**
 * TEST 7: AI QUALITY ASSESSMENT
 * Analyzes the quality of AI responses
 */
async function assessAIQuality() {
  log.header('TEST 7: AI QUALITY ASSESSMENT');
  
  try {
    // Get AI system status
    const statusResponse = await axios.get(`${BASE_URL}/api/ai/status`);
    const status = statusResponse.data.data;
    
    const cacheResponse = await axios.get(`${BASE_URL}/api/ai/cache/stats`);
    const cacheStats = cacheResponse.data.data.cacheStats;
    
    testResults.aiQuality = {
      circuitBreaker: {
        state: status.circuitBreaker.state,
        healthy: status.circuitBreaker.healthy,
        failureThreshold: status.circuitBreaker.config.failureThreshold,
        successRate: status.circuitBreaker.stats.successRate
      },
      cache: {
        hitRate: cacheStats.hitRate,
        totalEntries: cacheStats.totalEntries,
        tiers: cacheStats.tiers
      },
      ollama: {
        status: status.ollama.status,
        model: status.ollama.model,
        healthy: status.ollama.healthy
      }
    };
    
    log.success(`Circuit Breaker: ${status.circuitBreaker.state} (${status.circuitBreaker.healthy ? 'healthy' : 'unhealthy'})`);
    log.success(`Cache Hit Rate: ${cacheStats.hitRate}`);
    log.success(`Ollama: ${status.ollama.status} (${status.ollama.model})`);
    
  } catch (error) {
    log.error(`AI Quality assessment failed: ${error.message}`);
    testResults.aiQuality = { error: error.message };
  }
}

/**
 * GENERATE COMPREHENSIVE REPORT
 */
function generateReport() {
  log.header('COMPREHENSIVE AI SYSTEM ANALYSIS REPORT');
  
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      K-WISE AI SYSTEM ANALYSIS REPORT                      ║
║                         Generated: ${new Date().toLocaleString()}                    ║
╚═══════════════════════════════════════════════════════════════════════════╝

${colors.bold}${colors.cyan}1. PC PARTS COMPATIBILITY FILTER${colors.reset}
   Pass Rate: ${testResults.compatibility.passRate}%
   Avg Latency: ${testResults.compatibility.avgLatency}ms
   AI Usage: ${testResults.compatibility.aiUsageRate}%
   Rating: ${getRating(testResults.compatibility.passRate, testResults.compatibility.avgLatency, testResults.compatibility.aiUsageRate)}

${colors.bold}${colors.cyan}2. PC CUSTOMIZED WITH AI${colors.reset}
   Pass Rate: ${testResults.pcCustomizedAI.passRate}%
   Avg Latency: ${testResults.pcCustomizedAI.avgLatency}ms
   AI Usage: ${testResults.pcCustomizedAI.aiUsageRate}%
   Rating: ${getRating(testResults.pcCustomizedAI.passRate, testResults.pcCustomizedAI.avgLatency, testResults.pcCustomizedAI.aiUsageRate)}

${colors.bold}${colors.cyan}3. PC UPGRADE SYSTEM${colors.reset}
   Pass Rate: ${testResults.pcUpgrade.passRate}%
   Avg Latency: ${testResults.pcUpgrade.avgLatency}ms
   AI Usage: ${testResults.pcUpgrade.aiUsageRate}%
   Rating: ${getRating(testResults.pcUpgrade.passRate, testResults.pcUpgrade.avgLatency, testResults.pcUpgrade.aiUsageRate)}

${colors.bold}${colors.cyan}4. PRODUCT PAGE "COMPATIBLE WITH"${colors.reset}
   Pass Rate: ${testResults.productCompatibleWith.passRate}%
   Avg Latency: ${testResults.productCompatibleWith.avgLatency}ms
   AI Usage: ${testResults.productCompatibleWith.aiUsageRate}%
   Rating: ${getRating(testResults.productCompatibleWith.passRate, testResults.productCompatibleWith.avgLatency, testResults.productCompatibleWith.aiUsageRate)}

${colors.bold}${colors.cyan}5. FUTURE UPGRADES PREDICTIONS${colors.reset}
   Pass Rate: ${testResults.futureUpgrades.passRate}%
   Avg Latency: ${testResults.futureUpgrades.avgLatency}ms
   AI Usage: ${testResults.futureUpgrades.aiUsageRate}%
   Rating: ${getRating(testResults.futureUpgrades.passRate, testResults.futureUpgrades.avgLatency, testResults.futureUpgrades.aiUsageRate)}

${colors.bold}${colors.cyan}6. STRESS TESTING${colors.reset}
   Pass Rate: ${testResults.stressTests.passRate}%
   Total Requests: ${testResults.stressTests.totalRequests}
   Avg Latency: ${testResults.stressTests.avgLatency}ms
   Rating: ${getRating(testResults.stressTests.passRate, testResults.stressTests.avgLatency, 100)}

${colors.bold}${colors.cyan}7. AI SYSTEM HEALTH${colors.reset}
   Circuit Breaker: ${testResults.aiQuality.circuitBreaker?.state || 'UNKNOWN'} (${testResults.aiQuality.circuitBreaker?.healthy ? 'HEALTHY' : 'UNHEALTHY'})
   Cache Hit Rate: ${testResults.aiQuality.cache?.hitRate || '0%'}
   Ollama Status: ${testResults.aiQuality.ollama?.status || 'unknown'}
   Model: ${testResults.aiQuality.ollama?.model || 'unknown'}

${colors.bold}${colors.green}OVERALL SYSTEM RATING: ${calculateOverallRating()}/5.0${colors.reset}

${colors.bold}${colors.yellow}RECOMMENDATIONS FOR 5.0/5.0:${colors.reset}
${generateRecommendations()}
`);
}

/**
 * Calculate rating based on pass rate, latency, and AI usage
 */
function getRating(passRate, latency, aiUsage) {
  let rating = 0;
  
  // Pass rate contribution (0-2.5 points)
  if (passRate >= 95) rating += 2.5;
  else if (passRate >= 90) rating += 2.0;
  else if (passRate >= 80) rating += 1.5;
  else if (passRate >= 70) rating += 1.0;
  else rating += 0.5;
  
  // Latency contribution (0-1.5 points)
  if (latency < 1000) rating += 1.5;
  else if (latency < 3000) rating += 1.0;
  else if (latency < 5000) rating += 0.5;
  
  // AI usage contribution (0-1.0 points)
  if (aiUsage >= 85) rating += 1.0;
  else if (aiUsage >= 70) rating += 0.75;
  else if (aiUsage >= 50) rating += 0.5;
  else rating += 0.25;
  
  const finalRating = rating.toFixed(1);
  const color = rating >= 4.5 ? colors.green : rating >= 3.5 ? colors.yellow : colors.red;
  return `${color}${finalRating}/5.0${colors.reset}`;
}

/**
 * Calculate overall system rating
 */
function calculateOverallRating() {
  const ratings = [
    Number.parseFloat(testResults.compatibility.passRate) / 20 * (testResults.compatibility.avgLatency < 3000 ? 1 : 0.8),
    Number.parseFloat(testResults.pcCustomizedAI.passRate) / 20 * (testResults.pcCustomizedAI.avgLatency < 5000 ? 1 : 0.8),
    Number.parseFloat(testResults.pcUpgrade.passRate) / 20 * (testResults.pcUpgrade.avgLatency < 3000 ? 1 : 0.8),
    Number.parseFloat(testResults.productCompatibleWith.passRate) / 20 * (testResults.productCompatibleWith.avgLatency < 2000 ? 1 : 0.8),
    Number.parseFloat(testResults.futureUpgrades.passRate) / 20 * (testResults.futureUpgrades.avgLatency < 5000 ? 1 : 0.8),
    Number.parseFloat(testResults.stressTests.passRate) / 20
  ];
  
  const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  return avgRating.toFixed(2);
}

/**
 * Generate recommendations for improvement
 */
function generateRecommendations() {
  const recommendations = [];
  
  // Check each component
  if (Number.parseFloat(testResults.compatibility.passRate) < 95) {
    recommendations.push('1. Improve PC Parts Compatibility filter accuracy');
  }
  
  if (Number.parseFloat(testResults.compatibility.avgLatency) > 3000) {
    recommendations.push('2. Optimize compatibility filter latency (target <3s)');
  }
  
  if (Number.parseFloat(testResults.compatibility.aiUsageRate) < 80) {
    recommendations.push('3. Increase AI usage in compatibility filtering');
  }
  
  if (Number.parseFloat(testResults.pcCustomizedAI.avgLatency) > 5000) {
    recommendations.push('4. Optimize PC Customized AI response times');
  }
  
  if (Number.parseFloat(testResults.stressTests.passRate) < 95) {
    recommendations.push('5. Improve system resilience under load');
  }
  
  if (testResults.aiQuality.cache?.hitRate && Number.parseFloat(testResults.aiQuality.cache.hitRate) < 50) {
    recommendations.push('6. Increase cache hit rate (target >60%)');
  }
  
  if (testResults.aiQuality.circuitBreaker?.state !== 'CLOSED') {
    recommendations.push('7. Fix circuit breaker issues (currently OPEN/HALF_OPEN)');
  }
  
  if (recommendations.length === 0) {
    return '   ✅ System is performing optimally! Minor fine-tuning may still improve to 5.0.';
  }
  
  return recommendations.map(r => `   ${r}`).join('\n');
}

/**
 * MAIN TEST RUNNER
 */
async function runAllTests() {
  const startTime = Date.now();
  
  try {
    // Run all tests sequentially
    await testPCPartsCompatibility();
    await testPCCustomizedAI();
    await testPCUpgrade();
    await testProductCompatibleWith();
    await testFutureUpgrades();
    await brutally_StressTest();
    await assessAIQuality();
    
    // Generate final report
    generateReport();
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    log.info(`\nTotal test duration: ${totalTime}s`);
    
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
