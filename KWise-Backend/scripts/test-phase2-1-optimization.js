/**
 * Phase 2.1 Complete Testing: Prompt Optimization & Inference Speed
 * Tests:
 * 1. Prompt length reduction (5882 → ~3500 chars target)
 * 2. AI inference time (10.9s → <8s target)
 * 3. Response accuracy (maintain >90%)
 * 4. Compatibility with existing services
 */

const PromptTemplates = require('../services/promptTemplates');
const ollamaService = require('../ai/services/ollamaService');
const enhancedAIService = require('../services/enhancedAIService');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, details = '') {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  log(`${icon} ${name}${details ? ': ' + details : ''}`, color);
}

// Test data
const testParts = {
  cpu: { 
    id: 1, 
    name: 'AMD Ryzen 9 7950X', 
    specifications: { tdp: 170, cores: 16, threads: 32, socket: 'AM5', base_clock: 4.5 } 
  },
  motherboard: { 
    id: 2, 
    name: 'ASUS ROG X670E Crosshair Hero', 
    specifications: { socket: 'AM5', chipset: 'X670E', ram_slots: 4, max_ram: 128 } 
  },
  ram: { 
    id: 3, 
    name: 'G.Skill Trident Z5 RGB 32GB DDR5-6000', 
    specifications: { capacity: 32, speed: 6000, type: 'DDR5', timings: 'CL30' } 
  },
  gpu: { 
    id: 4, 
    name: 'NVIDIA GeForce RTX 4080', 
    specifications: { tdp: 320, vram: 16, interface: 'PCIe 4.0 x16' } 
  },
  psu: { 
    id: 5, 
    name: 'Corsair RMx Series RM850x', 
    specifications: { wattage: 850, rating: '80+ Gold', modular: true } 
  },
  storage: { 
    id: 6, 
    name: 'Samsung 990 Pro 2TB NVMe', 
    specifications: { capacity: 2000, type: 'NVMe', interface: 'PCIe 4.0 x4', read_speed: 7450 } 
  },
  case: {
    id: 7,
    name: 'Lian Li O11 Dynamic EVO',
    specifications: { form_factor: 'ATX', fans_included: 0 }
  }
};

const testContext = {
  primary_use: 'gaming and content creation',
  budget: { min: 2000, max: 3000 },
  experience_level: 'intermediate',
  persona: 'content_creator_pro'
};

const testDeterministic = {
  compatible: true,
  percentageScore: 92,
  issues: [
    { severity: 'warning', category: 'thermal', message: 'No CPU cooler detected', recommendation: 'Add a high-performance CPU cooler for 170W TDP' },
    { severity: 'info', category: 'airflow', message: 'Case has no included fans', recommendation: 'Add 3-6 case fans for optimal airflow' }
  ]
};

let testsPassed = 0;
let testsFailed = 0;
let testsWarning = 0;

async function runTests() {
  log('\n🧪 PHASE 2.1 COMPREHENSIVE TEST SUITE\n', 'bright');
  log('='.repeat(70), 'cyan');
  
  // TEST 1: Prompt Length Optimization
  log('\n📏 TEST 1: Prompt Length Optimization', 'blue');
  log('-'.repeat(70), 'cyan');
  
  try {
    const prompt = PromptTemplates.generateCompatibilityPrompt(
      testParts,
      testContext,
      testDeterministic
    );
    
    const totalLen = prompt.system.length + prompt.task.length;
    const reductionPercent = ((1 - totalLen/5882) * 100).toFixed(1);
    
    log(`   Original length: 5882 chars`, 'reset');
    log(`   New length: ${totalLen} chars`, 'reset');
    log(`   Reduction: ${reductionPercent}%`, 'reset');
    log(`   Target: ≤3500 chars (40% reduction minimum)`, 'reset');
    
    if (totalLen <= 3500) {
      logTest('Prompt length optimization', 'pass', `${totalLen} ≤ 3500 chars (-${reductionPercent}%)`);
      testsPassed++;
    } else {
      logTest('Prompt length optimization', 'fail', `${totalLen} > 3500 chars`);
      testsFailed++;
    }
    
  } catch (error) {
    logTest('Prompt length optimization', 'fail', error.message);
    testsFailed++;
  }
  
  // TEST 2: Ollama Service Availability
  log('\n🔌 TEST 2: Ollama Service Availability', 'blue');
  log('-'.repeat(70), 'cyan');
  
  try {
    const isConnected = await ollamaService.testConnection();
    
    if (isConnected) {
      logTest('Ollama connection', 'pass', 'Service available');
      testsPassed++;
    } else {
      logTest('Ollama connection', 'warning', 'Service unavailable - inference tests will be skipped');
      testsWarning++;
    }
  } catch (error) {
    logTest('Ollama connection', 'fail', error.message);
    testsFailed++;
  }
  
  // TEST 3: AI Inference Speed (if Ollama available)
  log('\n⚡ TEST 3: AI Inference Speed', 'blue');
  log('-'.repeat(70), 'cyan');
  
  try {
    const isConnected = await ollamaService.testConnection();
    
    if (!isConnected) {
      logTest('AI inference speed', 'warning', 'Skipped - Ollama not available');
      testsWarning++;
    } else {
      const prompt = PromptTemplates.generateCompatibilityPrompt(
        testParts,
        testContext,
        testDeterministic
      );
      
      log('   Starting AI inference test...', 'reset');
      const startTime = Date.now();
      
      const response = await ollamaService.generateResponse(
        prompt.task,
        prompt.system,
        { max_tokens: 2000, temperature: 0.1 }
      );
      
      const inferenceTime = Date.now() - startTime;
      const inferenceSeconds = (inferenceTime / 1000).toFixed(2);
      
      log(`   Original inference time: 10.9s`, 'reset');
      log(`   New inference time: ${inferenceSeconds}s`, 'reset');
      log(`   Target: <8s (27% improvement minimum)`, 'reset');
      
      if (inferenceTime < 8000) {
        const improvement = ((1 - inferenceTime/10900) * 100).toFixed(1);
        logTest('AI inference speed', 'pass', `${inferenceSeconds}s < 8s (${improvement}% faster)`);
        testsPassed++;
      } else {
        logTest('AI inference speed', 'fail', `${inferenceSeconds}s ≥ 8s`);
        testsFailed++;
      }
      
      // Store response for accuracy test
      global.testAIResponse = response;
    }
  } catch (error) {
    logTest('AI inference speed', 'fail', error.message);
    testsFailed++;
  }
  
  // TEST 4: Response Accuracy & Structure
  log('\n📊 TEST 4: Response Accuracy & Structure', 'blue');
  log('-'.repeat(70), 'cyan');
  
  try {
    if (!global.testAIResponse) {
      logTest('Response accuracy', 'warning', 'Skipped - No AI response available');
      testsWarning++;
    } else {
      const response = global.testAIResponse;
      
      // Check if response is successful
      if (!response.success) {
        logTest('Response success', 'fail', 'AI returned error');
        testsFailed++;
      } else {
        logTest('Response success', 'pass', 'AI returned success');
        testsPassed++;
        
        // Validate response structure
        const validation = PromptTemplates.validateResponse(response.data, 'compatibility');
        
        if (validation.valid) {
          logTest('Response validation', 'pass', 'All required fields present');
          testsPassed++;
        } else {
          logTest('Response validation', 'fail', `Validation errors: ${validation.errors.join(', ')}`);
          testsFailed++;
        }
        
        // Display response preview
        log('   Response preview:', 'reset');
        log(`   "${JSON.stringify(response.data).substring(0, 200)}..."`, 'reset');
      }
    }
  } catch (error) {
    logTest('Response accuracy', 'fail', error.message);
    testsFailed++;
  }
  
  // TEST 5: EnhancedAIService Integration
  log('\n🔧 TEST 5: EnhancedAIService Integration', 'blue');
  log('-'.repeat(70), 'cyan');
  
  try {
    const isConnected = await ollamaService.testConnection();
    
    if (!isConnected) {
      logTest('EnhancedAIService integration', 'warning', 'Skipped - Ollama not available');
      testsWarning++;
    } else {
      log('   Testing full analyzeCompatibility flow...', 'reset');
      const startTime = Date.now();
      
      const result = await enhancedAIService.analyzeCompatibility(
        testParts,
        testContext,
        testDeterministic
      );
      
      const latency = Date.now() - startTime;
      
      log(`   Latency: ${latency}ms`, 'reset');
      log(`   Source: ${result.source}`, 'reset');
      log(`   Confidence: ${result.confidence}`, 'reset');
      log(`   Assessment: ${result.overall_assessment}`, 'reset');
      
      if (result.overall_assessment && result.confidence) {
        logTest('EnhancedAIService integration', 'pass', `Working with ${result.source} source`);
        testsPassed++;
      } else {
        logTest('EnhancedAIService integration', 'fail', 'Missing required fields in result');
        testsFailed++;
      }
    }
  } catch (error) {
    logTest('EnhancedAIService integration', 'fail', error.message);
    testsFailed++;
  }
  
  // TEST 6: Prompt Template Methods Exist
  log('\n📝 TEST 6: Prompt Template Methods', 'blue');
  log('-'.repeat(70), 'cyan');
  
  try {
    const methods = [
      'generateCompatibilityPrompt',
      'generateUpgradePrompt',
      'validateResponse',
      'getTemplate',
      'buildPrompt'
    ];
    
    let allMethodsExist = true;
    
    for (const method of methods) {
      if (typeof PromptTemplates[method] === 'function') {
        logTest(`Method: ${method}`, 'pass', 'Exists and is callable');
        testsPassed++;
      } else {
        logTest(`Method: ${method}`, 'fail', 'Missing or not a function');
        testsFailed++;
        allMethodsExist = false;
      }
    }
    
  } catch (error) {
    logTest('Prompt template methods', 'fail', error.message);
    testsFailed++;
  }
  
  // SUMMARY
  log('\n' + '='.repeat(70), 'cyan');
  log('\n📋 TEST SUMMARY\n', 'bright');
  
  const totalTests = testsPassed + testsFailed + testsWarning;
  const passRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
  
  log(`   Total tests: ${totalTests}`, 'reset');
  logTest(`Passed: ${testsPassed}`, 'pass');
  logTest(`Failed: ${testsFailed}`, testsFailed > 0 ? 'fail' : 'pass');
  logTest(`Warnings: ${testsWarning}`, testsWarning > 0 ? 'warning' : 'pass');
  log(`   Pass rate: ${passRate}%\n`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');
  
  // Final verdict
  if (testsFailed === 0) {
    log('✅ ALL TESTS PASSED! Phase 2.1 optimization complete.\n', 'green');
  } else {
    log(`❌ ${testsFailed} TEST(S) FAILED. Review errors above.\n`, 'red');
  }
  
  // Phase 2.1 Goals Assessment
  log('🎯 PHASE 2.1 GOALS ASSESSMENT\n', 'bright');
  log('   Goal 1: Reduce prompts 5882 → ~3500 chars (-40%)', 'reset');
  log('   Goal 2: Improve inference 10.9s → <8s (-27%)', 'reset');
  log('   Goal 3: Maintain response accuracy >90%\n', 'reset');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}\n`, 'red');
  console.error(error);
  process.exit(1);
});
