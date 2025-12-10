/**
 * Phase 2.2: Test DeepSeek R1 7B Model
 * Tests if the 7b model works and compares performance with 1.5b
 */

const axios = require('axios');

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

// Test prompt (optimized from Phase 2.1)
const testPrompt = `Analyze this PC build for nuanced compatibility issues.

PARTS:
CPU: AMD Ryzen 9 7950X
MOTHERBOARD: ASUS ROG X670E
RAM: G.Skill 32GB DDR5-6000
GPU: NVIDIA RTX 4080
PSU: Corsair RMx 850W

BASIC CHECKS: Basic checks passed
USER: gaming and content creation, Budget: $2000-$3000

FOCUS ON:
1. VRM quality for CPU+Mobo
2. Thermal adequacy (cooler + case airflow)
3. Real-world bottlenecks
4. Power delivery stability

OUTPUT (JSON only):
{
  "overall_assessment": "excellent|good|acceptable|problematic",
  "confidence": 0-100,
  "issues": [{"severity":"critical|warning|info","category":"power|thermal|performance","description":"concise issue","recommendation":"fix"}],
  "strengths": ["2-3 notable positives"],
  "reasoning": "2-sentence summary"
}

Analyze now:`;

const systemPrompt = `You are a PC hardware compatibility analyst. Analyze ONLY advanced issues beyond basic checks.

CRITICAL: Respond with valid JSON only. No explanations.`;

async function testModel(modelName, timeout = 30000) {
  log(`\n🧪 Testing ${modelName}`, 'blue');
  log('-'.repeat(70), 'cyan');
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      'http://localhost:11434/api/generate',
      {
        model: modelName,
        prompt: testPrompt,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 2000
        }
      },
      { timeout }
    );
    
    const latency = Date.now() - startTime;
    const latencySeconds = (latency / 1000).toFixed(2);
    
    if (response.data && response.data.response) {
      const responseText = response.data.response.trim();
      const responseLength = responseText.length;
      
      log(`   Latency: ${latencySeconds}s`, 'reset');
      log(`   Response length: ${responseLength} chars`, 'reset');
      log(`   Response preview: "${responseText.substring(0, 150)}..."`, 'reset');
      
      // Try to parse JSON
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.overall_assessment && parsed.confidence) {
            logTest(`${modelName} JSON parsing`, 'pass', 'Valid JSON response');
            logTest(`${modelName} inference speed`, latency < 15000 ? 'pass' : 'warning', `${latencySeconds}s`);
            return {
              success: true,
              model: modelName,
              latency,
              responseLength,
              parsed,
              valid: true
            };
          } else {
            logTest(`${modelName} JSON validation`, 'fail', 'Missing required fields');
            return {
              success: false,
              model: modelName,
              latency,
              error: 'Missing required fields in JSON'
            };
          }
        } else {
          logTest(`${modelName} JSON extraction`, 'fail', 'No JSON found in response');
          return {
            success: false,
            model: modelName,
            latency,
            error: 'No JSON found'
          };
        }
      } catch (parseError) {
        logTest(`${modelName} JSON parsing`, 'fail', parseError.message);
        return {
          success: false,
          model: modelName,
          latency,
          error: `Parse error: ${parseError.message}`
        };
      }
    } else {
      logTest(`${modelName} response`, 'fail', 'Empty response');
      return {
        success: false,
        model: modelName,
        latency,
        error: 'Empty response'
      };
    }
    
  } catch (error) {
    const latency = Date.now() - startTime;
    const latencySeconds = (latency / 1000).toFixed(2);
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      logTest(`${modelName} timeout`, 'fail', `Timeout at ${latencySeconds}s`);
      return {
        success: false,
        model: modelName,
        latency,
        error: `Timeout after ${latencySeconds}s`
      };
    } else {
      logTest(`${modelName} error`, 'fail', error.message);
      return {
        success: false,
        model: modelName,
        latency,
        error: error.message
      };
    }
  }
}

async function runTests() {
  log('\n🚀 PHASE 2.2: DEEPSEEK MODEL TESTING\n', 'bright');
  log('='.repeat(70), 'cyan');
  
  const results = {};
  
  // Test 1: DeepSeek R1 1.5B (current working model)
  log('\n📊 TEST 1: DeepSeek R1 1.5B (Baseline)', 'blue');
  results['1.5b'] = await testModel('deepseek-r1:1.5b', 15000);
  
  // Test 2: DeepSeek R1 7B (target model)
  log('\n📊 TEST 2: DeepSeek R1 7B (Target)', 'blue');
  results['7b'] = await testModel('deepseek-r1:7b', 30000);
  
  // Test 3: DeepSeek R1 8B (alternative)
  log('\n📊 TEST 3: DeepSeek R1 8B (Alternative)', 'blue');
  results['8b'] = await testModel('deepseek-r1:8b', 30000);
  
  // Summary
  log('\n' + '='.repeat(70), 'cyan');
  log('\n📋 MODEL COMPARISON SUMMARY\n', 'bright');
  
  const successfulModels = Object.entries(results).filter(([_, r]) => r.success);
  const failedModels = Object.entries(results).filter(([_, r]) => !r.success);
  
  log('✅ SUCCESSFUL MODELS:', 'green');
  successfulModels.forEach(([model, result]) => {
    const latencySeconds = (result.latency / 1000).toFixed(2);
    log(`   - ${model}: ${latencySeconds}s, ${result.responseLength} chars`, 'reset');
    log(`     Assessment: ${result.parsed?.overall_assessment}, Confidence: ${result.parsed?.confidence}`, 'reset');
  });
  
  if (failedModels.length > 0) {
    log('\n❌ FAILED MODELS:', 'red');
    failedModels.forEach(([model, result]) => {
      const latencySeconds = (result.latency / 1000).toFixed(2);
      log(`   - ${model}: ${result.error} (${latencySeconds}s)`, 'reset');
    });
  }
  
  // Recommendation
  log('\n💡 RECOMMENDATION:', 'yellow');
  
  if (results['7b']?.success) {
    const improvement7b = ((results['1.5b'].latency - results['7b'].latency) / results['1.5b'].latency * 100).toFixed(1);
    log(`   Use deepseek-r1:7b as primary model`, 'green');
    log(`   - Latency: ${(results['7b'].latency / 1000).toFixed(2)}s`, 'reset');
    log(`   - Response quality: Better than 1.5b (larger model)`, 'reset');
    log(`   - Fallback to 1.5b: Enabled`, 'reset');
  } else if (results['8b']?.success) {
    log(`   Use deepseek-r1:8b as primary model`, 'green');
    log(`   - Latency: ${(results['8b'].latency / 1000).toFixed(2)}s`, 'reset');
    log(`   - Fallback to 1.5b: Enabled`, 'reset');
  } else {
    log(`   Keep deepseek-r1:1.5b as primary model`, 'yellow');
    log(`   - 7b and 8b models failed or too slow`, 'reset');
    log(`   - 1.5b is reliable and fast`, 'reset');
  }
  
  log('\n✅ Model testing complete!\n', 'green');
  
  process.exit(failedModels.length === Object.keys(results).length ? 1 : 0);
}

runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}\n`, 'red');
  console.error(error);
  process.exit(1);
});
