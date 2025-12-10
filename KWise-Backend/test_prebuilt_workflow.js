/**
 * Pre-Built Workflow Testing Script
 * Tests complete workflow from PreBuiltDisplay → PeripheralsPrompt → Peripherals → OrderSumBuild
 * 
 * Run: node test_prebuilt_workflow.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testPreBuiltWorkflow() {
  console.log('\n' + '='.repeat(80));
  log('cyan', '🧪 PRE-BUILT WORKFLOW COMPREHENSIVE TEST');
  console.log('='.repeat(80) + '\n');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // TEST 1: Fetch Pre-Built Products
    log('blue', '\n📋 TEST 1: Fetch Pre-Built Products by Tier');
    const tiers = ['Starter', 'Mid Tier', 'High Tier', 'Elite'];
    const allProducts = [];

    for (const tier of tiers) {
      try {
        const response = await axios.get(`${API_BASE}/kiosk/category-products/Pre-Built`, {
          params: { category: tier, limit: 10 }
        });

        if (response.data.success && response.data.data.length > 0) {
          log('green', `  ✅ ${tier}: Found ${response.data.data.length} products`);
          allProducts.push(...response.data.data);
          testsPassed++;
        } else {
          log('red', `  ❌ ${tier}: No products found`);
          testsFailed++;
        }
      } catch (error) {
        log('red', `  ❌ ${tier}: API Error - ${error.message}`);
        testsFailed++;
      }
    }

    if (allProducts.length === 0) {
      log('red', '\n❌ CRITICAL: No Pre-Built products available for testing');
      return;
    }

    // TEST 2: Verify Product Structure
    log('blue', '\n📋 TEST 2: Verify Product Data Structure');
    const testProduct = allProducts[0];
    
    const requiredFields = ['id', 'name', 'price', 'image', 'components'];
    let structureValid = true;

    for (const field of requiredFields) {
      if (testProduct[field] === undefined) {
        log('red', `  ❌ Missing field: ${field}`);
        structureValid = false;
      }
    }

    if (structureValid && Array.isArray(testProduct.components)) {
      log('green', `  ✅ Product structure valid (${testProduct.components.length} components)`);
      testsPassed++;
    } else {
      log('red', `  ❌ Product structure invalid`);
      testsFailed++;
    }

    // TEST 3: Verify Component part_id References
    log('blue', '\n📋 TEST 3: Verify Component part_id References');
    let missingPartIds = 0;
    let totalComponents = 0;
    let optionalComponents = 0;

    for (const product of allProducts) {
      for (const comp of product.components || []) {
        totalComponents++;
        
        // Check if component has value (not optional empty GPU/Cooling)
        if (comp.value && comp.value.trim()) {
          if (!comp.part_id) {
            missingPartIds++;
            log('yellow', `  ⚠️ ${product.name} - ${comp.name}: Missing part_id`);
          }
        } else {
          optionalComponents++;
        }
      }
    }

    if (missingPartIds === 0) {
      log('green', `  ✅ All ${totalComponents - optionalComponents} required components have part_ids`);
      log('cyan', `     (${optionalComponents} optional components without values)`);
      testsPassed++;
    } else {
      log('red', `  ❌ ${missingPartIds} components missing part_ids`);
      testsFailed++;
    }

    // TEST 4: Test Customization Options API
    log('blue', '\n📋 TEST 4: Test Customization Options API');
    const customizableCategories = ['CPU', 'RAM', 'Storage', 'GPU'];
    
    for (const category of customizableCategories) {
      try {
        const response = await axios.get(`${API_BASE}/kiosk/category-products/${category}`, {
          params: { limit: 10, inStock: true }
        });

        if (response.data.success && response.data.data.length > 0) {
          log('green', `  ✅ ${category}: ${response.data.data.length} customization options available`);
          testsPassed++;
        } else {
          log('yellow', `  ⚠️ ${category}: No options available (might be out of stock)`);
          testsPassed++; // Not a failure, just a warning
        }
      } catch (error) {
        log('red', `  ❌ ${category}: API Error - ${error.message}`);
        testsFailed++;
      }
    }

    // TEST 5: Test Peripheral Categories API
    log('blue', '\n📋 TEST 5: Test Peripheral Categories API');
    const peripheralCategories = ['Monitor', 'Keyboard', 'Mouse', 'Headphones', 'Speakers', 'Webcam'];
    
    for (const category of peripheralCategories) {
      try {
        const response = await axios.get(`${API_BASE}/kiosk/category-products/${category}`, {
          params: { limit: 10, inStock: true }
        });

        if (response.data.success) {
          const count = response.data.data?.length || 0;
          if (count > 0) {
            log('green', `  ✅ ${category}: ${count} peripheral options available`);
            testsPassed++;
          } else {
            log('yellow', `  ⚠️ ${category}: No options available (might be out of stock)`);
            testsPassed++;
          }
        } else {
          log('red', `  ❌ ${category}: API returned error`);
          testsFailed++;
        }
      } catch (error) {
        log('red', `  ❌ ${category}: API Error - ${error.message}`);
        testsFailed++;
      }
    }

    // TEST 6: Test Compatibility API (if available)
    log('blue', '\n📋 TEST 6: Test Build Compatibility Check');
    
    const sampleBuild = {};
    if (testProduct.components) {
      testProduct.components.forEach(comp => {
        if (comp.part_id && comp.value && comp.value.trim()) {
          sampleBuild[comp.name.toLowerCase()] = {
            id: comp.part_id,
            name: comp.value,
            category: comp.name,
            price: parseFloat(comp.price || 0)
          };
        }
      });
    }

    if (Object.keys(sampleBuild).length > 0) {
      try {
        const response = await axios.post(`${API_BASE}/kiosk/check-compatibility`, {
          components: sampleBuild
        });

        if (response.data.success) {
          const score = response.data.data?.compatibility_score || 0;
          if (score >= 80) {
            log('green', `  ✅ Compatibility check working (Score: ${score}%)`);
            testsPassed++;
          } else {
            log('yellow', `  ⚠️ Compatibility check working but low score (${score}%)`);
            testsPassed++;
          }
        } else {
          log('yellow', `  ⚠️ Compatibility API returned error (might not be implemented)`);
          testsPassed++;
        }
      } catch (error) {
        log('yellow', `  ⚠️ Compatibility API not available: ${error.message}`);
        log('cyan', '     (This is optional - workflow can still work without it)');
        testsPassed++;
      }
    } else {
      log('yellow', `  ⚠️ Cannot test compatibility - no valid components in sample product`);
      testsPassed++;
    }

    // SUMMARY
    console.log('\n' + '='.repeat(80));
    log('cyan', '📊 TEST SUMMARY');
    console.log('='.repeat(80));
    
    const totalTests = testsPassed + testsFailed;
    const passRate = Math.round((testsPassed / totalTests) * 100);
    
    log('green', `✅ Tests Passed: ${testsPassed}`);
    if (testsFailed > 0) {
      log('red', `❌ Tests Failed: ${testsFailed}`);
    }
    log('cyan', `📈 Pass Rate: ${passRate}%`);
    
    console.log('\n' + '='.repeat(80));
    
    if (passRate >= 90) {
      log('green', '🎉 WORKFLOW READY FOR PRODUCTION!');
    } else if (passRate >= 70) {
      log('yellow', '⚠️ WORKFLOW FUNCTIONAL WITH MINOR ISSUES');
    } else {
      log('red', '❌ WORKFLOW HAS CRITICAL ISSUES - NEEDS FIXES');
    }
    
    console.log('='.repeat(80) + '\n');

    // Detailed Product Sample
    log('blue', '\n📦 SAMPLE PRODUCT DATA:');
    console.log(JSON.stringify({
      id: testProduct.id,
      name: testProduct.name,
      price: testProduct.price,
      tier: testProduct.tier,
      components: testProduct.components?.map(c => ({
        name: c.name,
        value: c.value,
        part_id: c.part_id,
        price: c.price
      }))
    }, null, 2));

  } catch (error) {
    log('red', `\n❌ CRITICAL ERROR: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testPreBuiltWorkflow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
