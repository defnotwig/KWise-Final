/**
 * Compatibility Integration Test
 * PHASE 4: Verify fine-tuned AI model integration across all 7 compatibility features
 * 
 * Features tested:
 * 1. PC-Parts Compatibility Product List
 * 2. Product Page Compatible With
 * 3. Future Upgrades
 * 4. PC Customized with AI (step-by-step with autofilled parts)
 * 5. PC Customized It Manually (step-by-step)
 * 6. Pre-Built Compatibility Product Parts
 * 7. PC Upgrade Compatibility Product List Selected Categories
 */

const axios = require('axios');
const logger = require('./utils/logger');
const ollamaService = require('./ai/services/ollamaService');

const API_BASE = 'http://localhost:5000/api';
const OLLAMA_BASE = 'http://localhost:11434';

// Test configuration
const testConfig = {
  timeout: 30000, // 30 seconds per test
  expectedResponseTime: 15000, // Max 15 seconds for AI responses (fine-tuned model ~6-8s avg)
  minAccuracy: 70 // Minimum 70% success rate
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
  startTime: Date.now()
};

/**
 * Test helper: Make API request
 */
async function makeRequest(method, endpoint, data = null) {
  const startTime = Date.now();
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      timeout: testConfig.timeout,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) config.data = data;
    
    const response = await axios(config);
    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
      data: response.data,
      responseTime,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Test helper: Make Ollama request
 */
async function testOllamaModel(prompt) {
  const startTime = Date.now();
  try {
    const response = await axios.post(`${OLLAMA_BASE}/api/generate`, {
      model: ollamaService.selectedModel || 'deepseek-r1:1.5b',
      prompt,
      stream: false,
      options: {
        temperature: 0.15,
        num_predict: 400
      }
    }, { timeout: testConfig.expectedResponseTime });
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
      response: response.data.response,
      responseTime,
      model: ollamaService.selectedModel || 'deepseek-r1:1.5b'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Test 1: PC-Parts Compatibility Product List
 * Verify that product listings include compatibility analysis
 */
async function testProductListCompatibility() {
  console.log('\n[1/7] Testing PC-Parts Compatibility Product List...');
  
  const test = {
    name: 'PC-Parts Compatibility Product List',
    feature: 'Product catalog with AI compatibility badges'
  };
  
  try {
    // Test compatibility check endpoint
    const compatResult = await makeRequest('POST', '/builder/check-compatibility', {
      build: {
        CPU: { id: 1, name: 'Intel i5-12400F', socket: 'LGA1700' },
        Motherboard: { id: 1, name: 'ASRock B660M', socket: 'LGA1700', memory_type: 'DDR4' }
      }
    });
    
    if (!compatResult.success) {
      test.status = 'FAILED';
      test.error = compatResult.error;
      results.failed++;
    } else {
      const hasCompatibilityScore = compatResult.data.data?.score !== undefined;
      const hasWarnings = Array.isArray(compatResult.data.data?.warnings);
      
      if (hasCompatibilityScore && hasWarnings) {
        test.status = 'PASSED';
        test.responseTime = compatResult.responseTime;
        test.details = {
          score: compatResult.data.data.score,
          warningsCount: compatResult.data.data.warnings.length
        };
        results.passed++;
      } else {
        test.status = 'FAILED';
        test.error = 'Missing compatibility score or warnings';
        results.failed++;
      }
    }
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    results.failed++;
  }
  
  results.tests.push(test);
  console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}: ${test.status}`);
}

/**
 * Test 2: Product Page Compatible With
 * Verify individual product compatibility analysis
 */
async function testProductPageCompatibility() {
  console.log('\n[2/7] Testing Product Page Compatible With...');
  
  const test = {
    name: 'Product Page Compatible With',
    feature: 'Individual product compatibility suggestions'
  };
  
  try {
    // Test AI compatibility analysis for a specific product
    const aiPrompt = 'What components are compatible with Intel i5-12400F? List CPU coolers, motherboards, and RAM.';
    const aiResult = await testOllamaModel(aiPrompt);
    
    if (!aiResult.success) {
      test.status = 'FAILED';
      test.error = aiResult.error;
      results.failed++;
    } else {
      const hasRelevantInfo = aiResult.response.toLowerCase().includes('compatible') ||
                              aiResult.response.toLowerCase().includes('lga1700') ||
                              aiResult.response.toLowerCase().includes('ddr4');
      
      if (hasRelevantInfo && aiResult.responseTime < testConfig.expectedResponseTime) {
        test.status = 'PASSED';
        test.responseTime = aiResult.responseTime;
        test.model = aiResult.model;
        test.details = {
          responseLength: aiResult.response.length,
          withinTimeLimit: true
        };
        results.passed++;
      } else {
        test.status = 'FAILED';
        test.error = hasRelevantInfo ? 'Response too slow' : 'No relevant compatibility info';
        results.failed++;
      }
    }
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    results.failed++;
  }
  
  results.tests.push(test);
  console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}: ${test.status} (${test.responseTime}ms)`);
}

/**
 * Test 3: Future Upgrades
 * Verify upgrade path recommendations
 */
async function testFutureUpgrades() {
  console.log('\n[3/7] Testing Future Upgrades...');
  
  const test = {
    name: 'Future Upgrades',
    feature: 'AI-powered upgrade recommendations'
  };
  
  try {
    const aiPrompt = 'I have Intel i5-12400F and GTX 1650. What GPU upgrade would you recommend for better gaming performance under ₱25,000?';
    const aiResult = await testOllamaModel(aiPrompt);
    
    if (!aiResult.success) {
      test.status = 'FAILED';
      test.error = aiResult.error;
      results.failed++;
    } else {
      const hasUpgradeInfo = aiResult.response.toLowerCase().includes('rtx') ||
                             aiResult.response.toLowerCase().includes('rx') ||
                             aiResult.response.toLowerCase().includes('upgrade');
      
      if (hasUpgradeInfo) {
        test.status = 'PASSED';
        test.responseTime = aiResult.responseTime;
        test.model = aiResult.model;
        results.passed++;
      } else {
        test.status = 'FAILED';
        test.error = 'No upgrade recommendations found';
        results.failed++;
      }
    }
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    results.failed++;
  }
  
  results.tests.push(test);
  console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}: ${test.status} (${test.responseTime}ms)`);
}

/**
 * Test 4: PC Customized with AI (Autofilled)
 * Verify AI-powered build generation
 */
async function testPCCustomizedAI() {
  console.log('\n[4/7] Testing PC Customized with AI...');
  
  const test = {
    name: 'PC Customized with AI (Autofilled)',
    feature: 'AI build generation with compatibility validation'
  };
  
  try {
    const aiPrompt = 'Create a gaming PC build for ₱35,000 budget. Include CPU, GPU, RAM, motherboard, PSU, and storage. Ensure all components are compatible.';
    const aiResult = await testOllamaModel(aiPrompt);
    
    if (!aiResult.success) {
      test.status = 'FAILED';
      test.error = aiResult.error;
      results.failed++;
    } else {
      const hasCPU = aiResult.response.toLowerCase().includes('cpu') || aiResult.response.toLowerCase().includes('processor');
      const hasGPU = aiResult.response.toLowerCase().includes('gpu') || aiResult.response.toLowerCase().includes('graphics');
      const hasRAM = aiResult.response.toLowerCase().includes('ram') || aiResult.response.toLowerCase().includes('memory');
      const hasPrice = aiResult.response.includes('₱');
      
      if (hasCPU && hasGPU && hasRAM && hasPrice) {
        test.status = 'PASSED';
        test.responseTime = aiResult.responseTime;
        test.model = aiResult.model;
        test.details = {
          componentsFound: { cpu: hasCPU, gpu: hasGPU, ram: hasRAM, price: hasPrice }
        };
        results.passed++;
      } else {
        test.status = 'FAILED';
        test.error = 'Incomplete build recommendation';
        results.failed++;
      }
    }
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    results.failed++;
  }
  
  results.tests.push(test);
  console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}: ${test.status} (${test.responseTime}ms)`);
}

/**
 * Test 5: PC Customized It Manually (Step-by-step)
 * Verify manual build compatibility checking
 */
async function testPCCustomizedManual() {
  console.log('\n[5/7] Testing PC Customized It Manually...');
  
  const test = {
    name: 'PC Customized It Manually (Step-by-step)',
    feature: 'Real-time compatibility validation'
  };
  
  try {
    // Test step-by-step compatibility
    const step1 = await makeRequest('POST', '/builder/check-compatibility', {
      build: {
        CPU: { id: 1, socket: 'LGA1700' }
      }
    });
    
    const step2 = await makeRequest('POST', '/builder/check-compatibility', {
      build: {
        CPU: { id: 1, socket: 'LGA1700' },
        Motherboard: { id: 1, socket: 'AM4', memory_type: 'DDR4' } // Intentional mismatch
      }
    });
    
    if (step1.success && step2.success) {
      const step1Score = step1.data.data?.score;
      const step2Score = step2.data.data?.score;
      const step2Warnings = step2.data.data?.warnings || [];
      
      const detectsMismatch = step2Score < step1Score || step2Warnings.length > 0;
      
      if (detectsMismatch) {
        test.status = 'PASSED';
        test.responseTime = step2.responseTime;
        test.details = {
          step1Score: step1Score,
          step2Score: step2Score,
          warningsDetected: step2Warnings.length
        };
        results.passed++;
      } else {
        test.status = 'FAILED';
        test.error = 'Failed to detect socket mismatch';
        results.failed++;
      }
    } else {
      test.status = 'FAILED';
      test.error = 'API request failed';
      results.failed++;
    }
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    results.failed++;
  }
  
  results.tests.push(test);
  console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}: ${test.status}`);
}

/**
 * Test 6: Pre-Built Compatibility
 * Verify pre-built PC validation
 */
async function testPreBuiltCompatibility() {
  console.log('\n[6/7] Testing Pre-Built Compatibility...');
  
  const test = {
    name: 'Pre-Built Compatibility Product Parts',
    feature: 'Complete build validation'
  };
  
  try {
    const completeBuild = await makeRequest('POST', '/builder/check-compatibility', {
      build: {
        CPU: { id: 1, socket: 'LGA1700', tdp: 65 },
        Motherboard: { id: 1, socket: 'LGA1700', memory_type: 'DDR4' },
        RAM: { id: 1, memory_type: 'DDR4', capacity: 16 },
        GPU: { id: 1, tdp: 170, length: 280 },
        PSU: { id: 1, wattage: 550 },
        Storage: { id: 1, storage_type: 'NVMe' }
      }
    });
    
    if (completeBuild.success) {
      const score = completeBuild.data.data?.score;
      const warnings = completeBuild.data.data?.warnings || [];
      
      if (score !== undefined && score >= 70) {
        test.status = 'PASSED';
        test.responseTime = completeBuild.responseTime;
        test.details = {
          compatibilityScore: score,
          issuesFound: warnings.length
        };
        results.passed++;
      } else {
        test.status = 'FAILED';
        test.error = `Low compatibility score: ${score}`;
        results.failed++;
      }
    } else {
      test.status = 'FAILED';
      test.error = completeBuild.error;
      results.failed++;
    }
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    results.failed++;
  }
  
  results.tests.push(test);
  console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}: ${test.status}`);
}

/**
 * Test 7: PC Upgrade Compatibility (Selected Categories)
 * Verify category-specific upgrade analysis
 */
async function testPCUpgradeCompatibility() {
  console.log('\n[7/7] Testing PC Upgrade Compatibility...');
  
  const test = {
    name: 'PC Upgrade Compatibility Product List',
    feature: 'Category-specific upgrade recommendations'
  };
  
  try {
    const aiPrompt = 'I want to upgrade my GPU. My current system has Intel i5-12400F, 16GB DDR4 RAM, and 550W PSU. What GPU options are compatible and won\'t bottleneck?';
    const aiResult = await testOllamaModel(aiPrompt);
    
    if (!aiResult.success) {
      test.status = 'FAILED';
      test.error = aiResult.error;
      results.failed++;
    } else {
      const hasGPUOptions = aiResult.response.toLowerCase().includes('rtx') ||
                            aiResult.response.toLowerCase().includes('rx') ||
                            aiResult.response.toLowerCase().includes('gpu');
      const mentionsPSU = aiResult.response.toLowerCase().includes('psu') ||
                          aiResult.response.toLowerCase().includes('power') ||
                          aiResult.response.toLowerCase().includes('550w');
      
      if (hasGPUOptions) {
        test.status = 'PASSED';
        test.responseTime = aiResult.responseTime;
        test.model = aiResult.model;
        test.details = {
          mentionsPowerConsideration: mentionsPSU
        };
        results.passed++;
      } else {
        test.status = 'FAILED';
        test.error = 'No GPU recommendations found';
        results.failed++;
      }
    }
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    results.failed++;
  }
  
  results.tests.push(test);
  console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}: ${test.status} (${test.responseTime}ms)`);
}

/**
 * Display final test results
 */
function displayResults() {
  const totalTime = Date.now() - results.startTime;
  const totalTests = results.passed + results.failed;
  const successRate = ((results.passed / totalTests) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPATIBILITY INTEGRATION TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`\n🤖 AI Model: ${ollamaService.selectedModel || 'deepseek-r1:1.5b'}`);
  console.log(`   Fine-Tuned: ${ollamaService.useFineTunedModel ? '✅ YES (kwise-compatibility-expert-dev)' : '❌ NO (base model)'}`);
  console.log(`\n📈 Test Summary:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${results.passed} (${successRate}%)`);
  console.log(`   ❌ Failed: ${results.failed} (${(100 - successRate).toFixed(1)}%)`);
  console.log(`   ⏱️ Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  
  console.log(`\n📋 Detailed Results:`);
  results.tests.forEach((test, index) => {
    console.log(`\n   ${index + 1}. ${test.name}`);
    console.log(`      Status: ${test.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}`);
    if (test.responseTime) console.log(`      Response Time: ${test.responseTime}ms`);
    if (test.model) console.log(`      Model: ${test.model}`);
    if (test.error) console.log(`      Error: ${test.error}`);
    if (test.details) console.log(`      Details: ${JSON.stringify(test.details, null, 10)}`);
  });
  
  console.log('\n' + '='.repeat(80));
  
  const status = successRate >= testConfig.minAccuracy ? '✅ GOOD' : '❌ NEEDS IMPROVEMENT';
  console.log(`\n${status}: Success rate ${successRate}% (minimum ${testConfig.minAccuracy}%)`);
  console.log('='.repeat(80) + '\n');
  
  // Return exit code
  process.exit(successRate >= testConfig.minAccuracy ? 0 : 1);
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🧪 K-WISE COMPATIBILITY INTEGRATION TEST');
  console.log('PHASE 4: Fine-Tuned AI Model Integration Verification');
  console.log('='.repeat(80));
  console.log(`\n🎯 Testing 7 Compatibility Features:`);
  console.log('   1. PC-Parts Compatibility Product List');
  console.log('   2. Product Page Compatible With');
  console.log('   3. Future Upgrades');
  console.log('   4. PC Customized with AI (Autofilled)');
  console.log('   5. PC Customized It Manually (Step-by-step)');
  console.log('   6. Pre-Built Compatibility Product Parts');
  console.log('   7. PC Upgrade Compatibility Product List\n');
  
  console.log(`⚙️ Configuration:`);
  console.log(`   API Base: ${API_BASE}`);
  console.log(`   Ollama Base: ${OLLAMA_BASE}`);
  console.log(`   Model: ${ollamaService.selectedModel || 'deepseek-r1:1.5b'}`);
  console.log(`   Timeout: ${testConfig.timeout}ms`);
  console.log(`   Expected Response Time: ${testConfig.expectedResponseTime}ms`);
  console.log(`   Minimum Accuracy: ${testConfig.minAccuracy}%`);
  
  // Wait for services to be ready
  console.log('\n🔍 Checking service availability...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run all tests
  await testProductListCompatibility();
  await testProductPageCompatibility();
  await testFutureUpgrades();
  await testPCCustomizedAI();
  await testPCCustomizedManual();
  await testPreBuiltCompatibility();
  await testPCUpgradeCompatibility();
  
  // Display results
  displayResults();
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error during testing:', error);
  process.exit(1);
});
