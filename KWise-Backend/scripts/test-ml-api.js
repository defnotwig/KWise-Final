#!/usr/bin/env node

/**
 * Test ML API Endpoints
 * Verifies ML routes are accessible via HTTP
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testMLAPI() {
  console.log('🤖 Testing ML API Endpoints\n');
  console.log('='.repeat(80));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function pass(test, details = '') {
    console.log(`✅ ${test}`);
    if (details) console.log(`   ${details}`);
    results.passed++;
    results.tests.push({ name: test, status: 'PASS' });
  }

  function fail(test, error) {
    console.log(`❌ ${test}: ${error}`);
    results.failed++;
    results.tests.push({ name: test, status: 'FAIL', error });
  }

  // Wait for server
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Test 1: ML Stats Endpoint
    console.log('\n📊 Test 1: GET /api/ml/stats');
    console.log('-'.repeat(80));
    
    const stats = await makeRequest('/api/ml/stats');
    if (stats.status === 200 && stats.data && stats.data.success) {
      pass('ML stats endpoint accessible');
      console.log(`   Initialized: ${stats.data.data.initialized}`);
      console.log(`   Total patterns: ${stats.data.data.totalPatterns}`);
      console.log(`   Total predictions: ${stats.data.data.predictions}`);
    } else {
      fail('ML stats endpoint', `Status ${stats.status}`);
    }

    // Test 2: ML Prediction Endpoint
    console.log('\n🔮 Test 2: POST /api/ml/predict');
    console.log('-'.repeat(80));
    
    const predictionData = {
      componentA: {
        id: 1,
        name: 'Intel Core i7-12700K',
        category: 'CPU'
      },
      componentB: {
        id: 2,
        name: 'ASUS ROG STRIX Z690-E',
        category: 'Motherboard'
      }
    };
    
    const prediction = await makeRequest('/api/ml/predict', 'POST', predictionData);
    if (prediction.status === 200 && prediction.data && prediction.data.success) {
      pass('ML prediction endpoint accessible');
      console.log(`   Score: ${prediction.data.data.score}%`);
      console.log(`   Confidence: ${prediction.data.data.confidence}%`);
      console.log(`   Level: ${prediction.data.data.level}`);
      console.log(`   Reason: ${prediction.data.data.reason}`);
    } else {
      fail('ML prediction endpoint', `Status ${prediction.status}`);
    }

    // Test 3: ML Batch Prediction Endpoint
    console.log('\n📦 Test 3: POST /api/ml/batch-predict');
    console.log('-'.repeat(80));
    
    const batchData = {
      pairs: [
        {
          componentA: { id: 1, category: 'CPU', name: 'CPU' },
          componentB: { id: 2, category: 'Motherboard', name: 'MB' }
        },
        {
          componentA: { id: 3, category: 'GPU', name: 'GPU' },
          componentB: { id: 4, category: 'PSU', name: 'PSU' }
        }
      ]
    };
    
    const batchPrediction = await makeRequest('/api/ml/batch-predict', 'POST', batchData);
    if (batchPrediction.status === 200 && batchPrediction.data && batchPrediction.data.success) {
      pass('ML batch prediction endpoint accessible');
      console.log(`   Predictions received: ${batchPrediction.data.data.predictions.length}`);
      console.log(`   Processing time: ${batchPrediction.data.data.processingTime}`);
    } else {
      fail('ML batch prediction endpoint', `Status ${batchPrediction.status}`);
    }

    // Test 4: ML Cache Clear Endpoint
    console.log('\n🗑️  Test 4: POST /api/ml/clear-cache');
    console.log('-'.repeat(80));
    
    const clearCache = await makeRequest('/api/ml/clear-cache', 'POST');
    if (clearCache.status === 200 && clearCache.data && clearCache.data.success) {
      pass('ML clear cache endpoint accessible');
      console.log(`   Cache cleared successfully`);
    } else {
      fail('ML clear cache endpoint', `Status ${clearCache.status}`);
    }

    // Test 5: ML Reinitialize Endpoint
    console.log('\n🔄 Test 5: POST /api/ml/reinitialize');
    console.log('-'.repeat(80));
    
    const reinit = await makeRequest('/api/ml/reinitialize', 'POST');
    if (reinit.status === 200 && reinit.data && reinit.data.success) {
      pass('ML reinitialize endpoint accessible');
      console.log(`   ML scorer reinitialized`);
    } else {
      fail('ML reinitialize endpoint', `Status ${reinit.status}`);
    }

  } catch (error) {
    fail('Test execution', error.message);
    console.error('\nError details:', error);
  }

  // Final Report
  console.log('\n' + '='.repeat(80));
  console.log('📋 ML API TEST RESULTS');
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
  console.log('\n🏥 ML API Health:');
  if (passRate >= 90) {
    console.log('  ✅ EXCELLENT - All ML API endpoints operational');
  } else if (passRate >= 75) {
    console.log('  ⚠️  GOOD - ML API working with minor issues');
  } else if (passRate >= 50) {
    console.log('  ⚠️  FAIR - ML API needs attention');
  } else {
    console.log('  ❌ CRITICAL - ML API has major issues');
  }

  console.log('\n' + '='.repeat(80));

  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
console.log('⏳ Waiting for server to be ready...\n');
testMLAPI().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
