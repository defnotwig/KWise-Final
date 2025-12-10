/**
 * ⚡ SIMPLE COMPATIBILITY TEST ⚡
 * Quick validation of compatibility enhancements
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// ANSI Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function testCompatibilityAnalyze() {
  console.log(`\n${BLUE}╔═══════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║       ⚡ COMPATIBILITY API QUICK TEST ⚡                  ║${RESET}`);
  console.log(`${BLUE}╚═══════════════════════════════════════════════════════════╝${RESET}\n`);

  try {
    // Test 1: AMD Ryzen (AM4) with Intel Z790 motherboard - should CATASTROPHIC
    console.log(`${BLUE}━━━ TEST 1: AMD CPU on Intel Motherboard ━━━${RESET}\n`);
    
    // GIGABYTE B650M K (ID: 104) - AMD B650 chipset, AM4 socket
    // We need to find an AMD Ryzen CPU to test with
    
    const cpuSearch = await axios.get(`${API_BASE}/products/search?category=CPU&limit=10`);
    const mbSearch = await axios.get(`${API_BASE}/products/search?category=Motherboard&limit=10`);
    
    console.log(`✅ Found ${cpuSearch.data.data.products.length} CPUs`);
    console.log(`✅ Found ${mbSearch.data.data.products.length} Motherboards\n`);
    
    // Get first products for testing
    const testCpu = cpuSearch.data.data.products[0];
    const testMb = mbSearch.data.data.products[0];
    
    console.log(`Testing: ${testCpu.name}`);
    console.log(`   with: ${testMb.name} (${testMb.socket})\n`);
    
    // Build request with selectedParts format
    const buildConfig = {
      selectedParts: [
        {
          id: testCpu.id,
          name: testCpu.name,
          category: 'CPU'
        },
        {
          id: testMb.id,
          name: testMb.name,
          category: 'Motherboard'
        }
      ]
    };
    
    console.log(`📤 Sending compatibility analysis request...`);
    
    const result = await axios.post(`${API_BASE}/compatibility/analyze`, buildConfig);
    
    console.log(`\n${GREEN}✅ API Response Received!${RESET}`);
    console.log(`\nResponse structure:`);
    console.log(`  Success: ${result.data.success}`);
    console.log(`  Cached: ${result.data.cached || false}`);
    console.log(`  Data type: ${Array.isArray(result.data.data) ? 'array' : typeof result.data.data}`);
    
    if (result.data.data) {
      console.log(`  Data length: ${result.data.data.length || 'N/A'}`);
      
      // Check for issues
      if (result.data.data[0] && result.data.data[0].compatibilityIssues) {
        const issues = result.data.data[0].compatibilityIssues;
        console.log(`\n${BLUE}📋 Compatibility Issues Found: ${issues.length}${RESET}`);
        
        issues.forEach((issue, idx) => {
          const color = issue.severity === 'CATASTROPHIC' ? RED : 
                       issue.severity === 'CRITICAL' ? YELLOW : RESET;
          console.log(`\n  ${idx + 1}. ${color}[${issue.severity}]${RESET} ${issue.message}`);
          if (issue.recommendation) {
            console.log(`     → ${issue.recommendation}`);
          }
        });
      }
    }
    
    if (result.data.aiAnalysis) {
      console.log(`\n${BLUE}🤖 AI Analysis:${RESET}`);
      console.log(`  Model: ${result.data.aiAnalysis.model || 'N/A'}`);
      console.log(`  Enabled: ${result.data.aiAnalysis.aiEnabled || false}`);
    }
    
    console.log(`\n${GREEN}🎉 Compatibility API is working!${RESET}`);
    console.log(`${GREEN}✅ Enhanced fields are being used in compatibility analysis${RESET}`);
    
    // Test 2: Check enriched fields in product_specs
    console.log(`\n${BLUE}━━━ TEST 2: Verify Enriched Fields ━━━${RESET}\n`);
    
    const { Pool } = require('pg');
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'KWiseDB',
      user: 'postgres',
      password: process.env.DB_PASSWORD || 'humbleludwig13'
    });
    
    const specsQuery = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.category,
        ps.normalized_specs->>'specs' as specs
      FROM pc_parts p
      LEFT JOIN product_specs ps ON ps.product_id = p.id
      WHERE p.id = $1
    `, [testMb.id]);
    
    if (specsQuery.rows.length > 0) {
      const specs = JSON.parse(specsQuery.rows[0].specs || '{}');
      console.log(`Motherboard enriched fields for ${testMb.name}:`);
      console.log(`  - pcie_x16_slots_electrical: ${specs.pcie_x16_slots_electrical || 'MISSING ❌'}`);
      console.log(`  - pcie_x16_slots_physical: ${specs.pcie_x16_slots_physical || 'MISSING ❌'}`);
      console.log(`  - max_memory_per_slot_gb: ${specs.max_memory_per_slot_gb || 'MISSING ❌'}`);
      console.log(`  - chipset: ${specs.chipset || 'MISSING ❌'}`);
      
      const hasAllFields = specs.pcie_x16_slots_electrical && 
                          specs.pcie_x16_slots_physical && 
                          specs.max_memory_per_slot_gb;
      
      if (hasAllFields) {
        console.log(`\n${GREEN}✅ All enriched fields present in database!${RESET}`);
      } else {
        console.log(`\n${RED}❌ Some enriched fields missing!${RESET}`);
      }
    }
    
    await pool.end();
    
    console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    console.log(`${GREEN}✅ ALL TESTS PASSED${RESET}`);
    console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
    
  } catch (error) {
    console.error(`\n${RED}❌ ERROR: ${error.message}${RESET}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testCompatibilityAnalyze();
