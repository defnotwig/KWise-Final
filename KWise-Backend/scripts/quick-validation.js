/**
 * 🎯 QUICK VALIDATION - Test Merged Specifications via HTTP
 * 
 * PURPOSE: Verify enriched fields are returned by API endpoints
 * 
 * TESTS:
 * 1. Backend health check
 * 2. GPU specifications (check for has_12vhpwr, pcie_8pin_count)
 * 3. Motherboard specifications (check for pcie_x16_slots)
 * 4. Case specifications (check for front_fan_slots)
 * 5. PSU specifications (check for has_12vhpwr_connector)
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Test configuration
const TESTS = [
  {
    name: 'Backend Health Check',
    endpoint: '/api/health',
    validate: (data) => {
      if (data.status === 'success' || data.status === 'OK') {
        return { pass: true, message: 'Backend is running' };
      }
      return { pass: false, message: 'Backend returned unexpected status' };
    }
  },
  {
    name: 'GPU - Enriched Fields via HTTP',
    endpoint: '/api/stock?category=GPU&limit=1',
    validate: (data) => {
      if (!data.success || !data.data || data.data.length === 0) {
        return { pass: false, message: 'No GPU data returned' };
      }
      
      const gpu = data.data[0];
      const specs = gpu.specifications || {};
      
      const hasEnrichedFields = 
        specs.hasOwnProperty('has_12vhpwr') &&
        specs.hasOwnProperty('pcie_8pin_count') &&
        specs.hasOwnProperty('pcie_6pin_count') &&
        specs.hasOwnProperty('transient_spike_power_w');
      
      if (hasEnrichedFields) {
        return {
          pass: true,
          message: `GPU enriched ✅ (${gpu.name})`,
          details: {
            has_12vhpwr: specs.has_12vhpwr,
            pcie_8pin_count: specs.pcie_8pin_count,
            pcie_6pin_count: specs.pcie_6pin_count,
            transient_spike_power_w: specs.transient_spike_power_w
          }
        };
      }
      
      return {
        pass: false,
        message: `Missing enriched fields on ${gpu.name}`,
        details: {
          has_has_12vhpwr: specs.hasOwnProperty('has_12vhpwr'),
          has_pcie_8pin_count: specs.hasOwnProperty('pcie_8pin_count'),
          has_pcie_6pin_count: specs.hasOwnProperty('pcie_6pin_count'),
          has_transient_spike_power_w: specs.hasOwnProperty('transient_spike_power_w')
        }
      };
    }
  },
  {
    name: 'Motherboard - Enriched Fields via HTTP',
    endpoint: '/api/stock?category=Motherboard&limit=1',
    validate: (data) => {
      if (!data.success || !data.data || data.data.length === 0) {
        return { pass: false, message: 'No Motherboard data returned' };
      }
      
      const mb = data.data[0];
      const specs = mb.specifications || {};
      
      const hasEnrichedFields = 
        specs.hasOwnProperty('pcie_x16_slots_electrical') &&
        specs.hasOwnProperty('pcie_x16_slots_physical') &&
        specs.hasOwnProperty('max_memory_per_slot_gb');
      
      if (hasEnrichedFields) {
        return {
          pass: true,
          message: `Motherboard enriched ✅ (${mb.name})`,
          details: {
            pcie_x16_slots_electrical: specs.pcie_x16_slots_electrical,
            pcie_x16_slots_physical: specs.pcie_x16_slots_physical,
            max_memory_per_slot_gb: specs.max_memory_per_slot_gb
          }
        };
      }
      
      return {
        pass: false,
        message: `Missing enriched fields on ${mb.name}`,
        details: {
          has_pcie_x16_slots_electrical: specs.hasOwnProperty('pcie_x16_slots_electrical'),
          has_pcie_x16_slots_physical: specs.hasOwnProperty('pcie_x16_slots_physical'),
          has_max_memory_per_slot_gb: specs.hasOwnProperty('max_memory_per_slot_gb')
        }
      };
    }
  },
  {
    name: 'Case - Enriched Fields via HTTP',
    endpoint: '/api/stock?category=Case&limit=1',
    validate: (data) => {
      if (!data.success || !data.data || data.data.length === 0) {
        return { pass: false, message: 'No Case data returned' };
      }
      
      const caseItem = data.data[0];
      const specs = caseItem.specifications || {};
      
      const hasEnrichedFields = 
        specs.hasOwnProperty('front_fan_slots') &&
        specs.hasOwnProperty('front_radiator_support');
      
      if (hasEnrichedFields) {
        return {
          pass: true,
          message: `Case enriched ✅ (${caseItem.name})`,
          details: {
            front_fan_slots: specs.front_fan_slots,
            front_radiator_support: specs.front_radiator_support
          }
        };
      }
      
      return {
        pass: false,
        message: `Missing enriched fields on ${caseItem.name}`,
        details: {
          has_front_fan_slots: specs.hasOwnProperty('front_fan_slots'),
          has_front_radiator_support: specs.hasOwnProperty('front_radiator_support')
        }
      };
    }
  },
  {
    name: 'PSU - Enriched Fields via HTTP',
    endpoint: '/api/stock?category=PSU&limit=1',
    validate: (data) => {
      if (!data.success || !data.data || data.data.length === 0) {
        return { pass: false, message: 'No PSU data returned' };
      }
      
      const psu = data.data[0];
      const specs = psu.specifications || {};
      
      const hasEnrichedFields = 
        specs.hasOwnProperty('has_12vhpwr_connector') &&
        specs.hasOwnProperty('pcie_6pin_connectors') &&
        specs.hasOwnProperty('pcie_8pin_connectors');
      
      if (hasEnrichedFields) {
        return {
          pass: true,
          message: `PSU enriched ✅ (${psu.name})`,
          details: {
            has_12vhpwr_connector: specs.has_12vhpwr_connector,
            pcie_6pin_connectors: specs.pcie_6pin_connectors,
            pcie_8pin_connectors: specs.pcie_8pin_connectors
          }
        };
      }
      
      return {
        pass: false,
        message: `Missing enriched fields on ${psu.name}`,
        details: {
          has_has_12vhpwr_connector: specs.hasOwnProperty('has_12vhpwr_connector'),
          has_pcie_6pin_connectors: specs.hasOwnProperty('pcie_6pin_connectors'),
          has_pcie_8pin_connectors: specs.hasOwnProperty('pcie_8pin_connectors')
        }
      };
    }
  }
];

/**
 * Make HTTP GET request
 */
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = BASE_URL + endpoint;
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Run a single test
 */
async function runTest(test) {
  console.log(`\n🔍 TEST: ${test.name}`);
  console.log(`   Endpoint: ${test.endpoint}`);
  
  try {
    const data = await makeRequest(test.endpoint);
    const result = test.validate(data);
    
    if (result.pass) {
      console.log(`   ✅ PASS - ${result.message}`);
      if (result.details) {
        console.log(`   📊 Details:`, JSON.stringify(result.details, null, 2));
      }
      return true;
    } else {
      console.log(`   ❌ FAIL - ${result.message}`);
      if (result.details) {
        console.log(`   📊 Details:`, JSON.stringify(result.details, null, 2));
      }
      return false;
    }
  } catch (err) {
    console.log(`   ❌ ERROR - ${err.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🎯 QUICK VALIDATION - Merged Specifications HTTP Test');
  console.log('======================================================\n');
  
  const results = [];
  
  for (const test of TESTS) {
    const passed = await runTest(test);
    results.push({ name: test.name, passed });
  }
  
  console.log('\n\n📊 SUMMARY');
  console.log('================');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  console.log(`📊 Success Rate: ${successRate}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Merged specifications working correctly.');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED - Backend may need restart or enriched data missing.');
  }
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runAllTests().catch(err => {
  console.error('❌ FATAL ERROR:', err.message);
  process.exit(1);
});
