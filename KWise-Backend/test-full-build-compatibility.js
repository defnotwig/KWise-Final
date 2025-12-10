/**
 * ✅ COMPREHENSIVE BUILD COMPATIBILITY TEST
 * Tests both fixes applied:
 * 1. Backend accepts RAM/Storage arrays (buildSchemas.js fix)
 * 2. Missing drive bay specs return WARNING not CRITICAL (advancedCompatibilityService.js fix)
 * 
 * User's Exact Build:
 * - CPU: AMD RYZEN 3 3200G
 * - Motherboard: ASROCK B550M PRO SE
 * - RAM: 2x 16GB T-Force DarkZa Kit
 * - Storage: 1TB Samsung 990 Pro M.2 + 250GB WD SATA
 * - GPU: 12GB RTX4070 IGAME
 * - Case: KEYTECH ROBIN MINI (missing drive bay specs)
 * - PSU: FSP Hydro M PRO 600W
 * - Cooling: AMD WRAITH PRISM
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5000/api/compatibility/advanced/full-build';

// User's exact build configuration
const buildData = {
  components: {
    cpu: {
      id: null, // Will fetch from database
      name: "AMD RYZEN 3 3200G",
      category: "cpu"
    },
    motherboard: {
      id: null,
      name: "ASROCK B550M PRO SE",
      category: "motherboard"
    },
    // ✅ TEST FIX #1: Arrays for multi-component slots
    ram: [
      {
        id: null,
        name: "16GB T-FORCE DARKZA KIT (8GBX2) DDR4 4000MHZ",
        category: "ram"
      },
      {
        id: null,
        name: "16GB T-FORCE DARKZA KIT (8GBX2) DDR4 4000MHZ",
        category: "ram"
      }
    ],
    // ✅ TEST FIX #2: SATA drive should show WARNING (not CRITICAL) due to missing case specs
    storage: [
      {
        id: null,
        name: "1TB SAMSUNG 990 PRO M.2 NVME GEN 4",
        category: "storage"
      },
      {
        id: null,
        name: "250GB WESTERN DIGITAL *GEN3",
        category: "storage"
      }
    ],
    gpu: {
      id: null,
      name: "12GB RTX4070 IGAME ADVANCED OC",
      category: "gpu"
    },
    case: {
      id: null,
      name: "KEYTECH ROBIN MINI",
      category: "case"
    },
    psu: {
      id: null,
      name: "FSP HYDRO M PRO 600W 80+ BRONZE",
      category: "psu"
    },
    cooling: {
      id: null,
      name: "AMD WRAITH PRISM",
      category: "cooling"
    }
  }
};

async function fetchComponentIds() {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('\n📦 Fetching component IDs from database...\n');

    // Fetch CPU
    const cpuResult = await pool.query(
      "SELECT id FROM pc_parts WHERE name ILIKE $1 AND category = 'cpu' LIMIT 1",
      [buildData.components.cpu.name]
    );
    if (cpuResult.rows[0]) {
      buildData.components.cpu.id = cpuResult.rows[0].id;
      console.log(`✅ CPU: ${buildData.components.cpu.name} (ID: ${buildData.components.cpu.id})`);
    }

    // Fetch Motherboard
    const moboResult = await pool.query(
      "SELECT id FROM pc_parts WHERE name ILIKE $1 AND category = 'motherboard' LIMIT 1",
      [buildData.components.motherboard.name]
    );
    if (moboResult.rows[0]) {
      buildData.components.motherboard.id = moboResult.rows[0].id;
      console.log(`✅ Motherboard: ${buildData.components.motherboard.name} (ID: ${buildData.components.motherboard.id})`);
    }

    // Fetch RAM (both kits)
    const ramResult = await pool.query(
      "SELECT id FROM pc_parts WHERE name ILIKE $1 AND category = 'ram' LIMIT 1",
      [buildData.components.ram[0].name]
    );
    if (ramResult.rows[0]) {
      buildData.components.ram[0].id = ramResult.rows[0].id;
      buildData.components.ram[1].id = ramResult.rows[0].id; // Same RAM kit
      console.log(`✅ RAM Kit 1: ${buildData.components.ram[0].name} (ID: ${buildData.components.ram[0].id})`);
      console.log(`✅ RAM Kit 2: ${buildData.components.ram[1].name} (ID: ${buildData.components.ram[1].id})`);
    }

    // Fetch Storage (M.2 + SATA)
    const m2Result = await pool.query(
      "SELECT id FROM pc_parts WHERE name ILIKE $1 AND category = 'storage' LIMIT 1",
      [buildData.components.storage[0].name]
    );
    if (m2Result.rows[0]) {
      buildData.components.storage[0].id = m2Result.rows[0].id;
      console.log(`✅ M.2 Storage: ${buildData.components.storage[0].name} (ID: ${buildData.components.storage[0].id})`);
    }

    const sataResult = await pool.query(
      "SELECT id FROM pc_parts WHERE name ILIKE $1 AND category = 'storage' LIMIT 1",
      [buildData.components.storage[1].name]
    );
    if (sataResult.rows[0]) {
      buildData.components.storage[1].id = sataResult.rows[0].id;
      console.log(`✅ SATA Storage: ${buildData.components.storage[1].name} (ID: ${buildData.components.storage[1].id})`);
    }

    // Fetch GPU
    const gpuResult = await pool.query(
      "SELECT id FROM pc_parts WHERE name ILIKE $1 AND category = 'gpu' LIMIT 1",
      [buildData.components.gpu.name]
    );
    if (gpuResult.rows[0]) {
      buildData.components.gpu.id = gpuResult.rows[0].id;
      console.log(`✅ GPU: ${buildData.components.gpu.name} (ID: ${buildData.components.gpu.id})`);
    }

    // Fetch Case
    const caseResult = await pool.query(
      "SELECT id FROM pc_parts WHERE name ILIKE $1 AND category = 'case' LIMIT 1",
      [buildData.components.case.name]
    );
    if (caseResult.rows[0]) {
      buildData.components.case.id = caseResult.rows[0].id;
      console.log(`✅ Case: ${buildData.components.case.name} (ID: ${buildData.components.case.id})`);
    }

    // Fetch PSU
    const psuResult = await pool.query(
      "SELECT id FROM pc_parts WHERE name ILIKE $1 AND category = 'psu' LIMIT 1",
      [buildData.components.psu.name]
    );
    if (psuResult.rows[0]) {
      buildData.components.psu.id = psuResult.rows[0].id;
      console.log(`✅ PSU: ${buildData.components.psu.name} (ID: ${buildData.components.psu.id})`);
    }

    // Fetch Cooling
    const coolingResult = await pool.query(
      "SELECT id FROM pc_parts WHERE name ILIKE $1 AND category = 'cooling' LIMIT 1",
      [buildData.components.cooling.name]
    );
    if (coolingResult.rows[0]) {
      buildData.components.cooling.id = coolingResult.rows[0].id;
      console.log(`✅ Cooling: ${buildData.components.cooling.name} (ID: ${buildData.components.cooling.id})`);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }
}

async function testBuildCompatibility() {
  try {
    console.log('\n🧪 TESTING BUILD COMPATIBILITY...\n');
    console.log('📋 Request Payload:');
    console.log(JSON.stringify(buildData, null, 2));

    const response = await axios.post(API_URL, buildData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('\n✅ API RESPONSE SUCCESS\n');
    console.log('📊 Status:', response.status);
    console.log('📦 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Analyze results
    const { compatible, issues = [], summary } = response.data;

    console.log('\n📈 COMPATIBILITY ANALYSIS:\n');
    console.log(`Overall Compatible: ${compatible ? '✅ YES' : '❌ NO'}`);
    console.log(`Total Issues Found: ${issues.length}`);

    if (issues.length > 0) {
      console.log('\n📋 ISSUES BREAKDOWN:\n');
      
      const critical = issues.filter(i => i.severity === 'critical');
      const warnings = issues.filter(i => i.severity === 'warning');
      const info = issues.filter(i => i.severity === 'info');

      console.log(`❌ CRITICAL: ${critical.length}`);
      critical.forEach(issue => {
        console.log(`   - ${issue.message || issue.issue}`);
      });

      console.log(`\n⚠️  WARNINGS: ${warnings.length}`);
      warnings.forEach(issue => {
        console.log(`   - ${issue.message || issue.issue}`);
      });

      console.log(`\nℹ️  INFO: ${info.length}`);
      info.forEach(issue => {
        console.log(`   - ${issue.message || issue.issue}`);
      });

      // ✅ VERIFICATION: SATA drive should be WARNING (not CRITICAL)
      const sataBayIssue = issues.find(i => 
        (i.message || i.issue || '').toLowerCase().includes('250gb') ||
        (i.message || i.issue || '').toLowerCase().includes('western digital') ||
        (i.message || i.issue || '').toLowerCase().includes('drive bay')
      );

      if (sataBayIssue) {
        console.log('\n🎯 SATA DRIVE BAY CHECK:');
        console.log(`   Message: ${sataBayIssue.message || sataBayIssue.issue}`);
        console.log(`   Severity: ${sataBayIssue.severity}`);
        
        if (sataBayIssue.severity === 'warning') {
          console.log('   ✅ FIX VERIFIED: Missing case specs return WARNING (not CRITICAL)');
        } else if (sataBayIssue.severity === 'critical') {
          console.log('   ❌ FIX FAILED: Still showing CRITICAL instead of WARNING');
        }
      } else {
        console.log('\n⚠️  No SATA drive bay issue found (may be fully compatible or different error)');
      }
    }

    // Check summary
    if (summary) {
      console.log('\n📊 COMPATIBILITY SUMMARY:');
      console.log(JSON.stringify(summary, null, 2));
    }

    console.log('\n✅ TEST COMPLETED SUCCESSFULLY');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ API REQUEST FAILED\n');
    
    if (error.response) {
      console.error('📛 HTTP Status:', error.response.status);
      console.error('📛 Error Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 400) {
        console.error('\n❌ 400 BAD REQUEST: Schema validation failed (array fix not working)');
      }
    } else if (error.request) {
      console.error('📛 No response from server');
      console.error('📛 Request:', error.request);
    } else {
      console.error('📛 Error:', error.message);
    }

    console.error('\n❌ TEST FAILED');
    process.exit(1);
  }
}

async function run() {
  await fetchComponentIds();
  await testBuildCompatibility();
}

run();
