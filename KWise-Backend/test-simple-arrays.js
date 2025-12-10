/**
 * ✅ SIMPLIFIED ARRAY TEST
 * Verifies backend accepts arrays for RAM/Storage
 * Uses existing component IDs from database
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const API_URL = 'http://localhost:5000/api/compatibility/advanced/full-build';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function fetchSampleComponents() {
  try {
    console.log('\n📦 Fetching sample components from database...\n');

    // Get one of each category
    const cpu = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'CPU'  LIMIT 1");
    const motherboard = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'Motherboard'  LIMIT 1");
    const ram = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'RAM'  LIMIT 2");
    const storage = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'Storage'  LIMIT 2");
    const gpu = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'GPU'  LIMIT 1");
    const pcCase = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'Case'  LIMIT 1");
    const psu = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'PSU'  LIMIT 1");
    const cooling = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'Cooling'  LIMIT 1");

    if (!cpu.rows[0] || !motherboard.rows[0] || !ram.rows[0] || !storage.rows[0] || !gpu.rows[0] || !pcCase.rows[0] || !psu.rows[0] || !cooling.rows[0]) {
      throw new Error('Missing required components in database');
    }

    return {
      cpu: cpu.rows[0],
      motherboard: motherboard.rows[0],
      ram: ram.rows.slice(0, 2), // Use 2 RAM kits if available, else duplicate
      storage: storage.rows.slice(0, 2), // Use 2 storage drives if available
      gpu: gpu.rows[0],
      case: pcCase.rows[0],
      psu: psu.rows[0],
      cooling: cooling.rows[0]
    };
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }
}

async function testArraysAccepted(components) {
  try {
    console.log('\n🧪 TEST 1: Verify backend accepts arrays for RAM/Storage\n');

    // Ensure we have 2 RAM kits (duplicate if needed)
    const ramKits = components.ram.length === 2 ? components.ram : [components.ram[0], components.ram[0]];
    const storageDevices = components.storage.length === 2 ? components.storage : [components.storage[0], components.storage[0]];

    const buildData = {
      components: {
        cpu: {
          id: components.cpu.id,
          name: components.cpu.name,
          category: 'CPU'
        },
        motherboard: {
          id: components.motherboard.id,
          name: components.motherboard.name,
          category: 'Motherboard'
        },
        // ✅ CRITICAL TEST: Send arrays for RAM/Storage
        ram: ramKits.map(kit => ({
          id: kit.id,
          name: kit.name,
          category: 'RAM'
        })),
        storage: storageDevices.map(drive => ({
          id: drive.id,
          name: drive.name,
          category: 'Storage'
        })),
        gpu: {
          id: components.gpu.id,
          name: components.gpu.name,
          category: 'GPU'
        },
        case: {
          id: components.case.id,
          name: components.case.name,
          category: 'Case'
        },
        psu: {
          id: components.psu.id,
          name: components.psu.name,
          category: 'PSU'
        },
        cooling: {
          id: components.cooling.id,
          name: components.cooling.name,
          category: 'Cooling'
        }
      }
    };

    console.log('📋 Test Build:');
    console.log(`   CPU: ${components.cpu.name}`);
    console.log(`   Motherboard: ${components.motherboard.name}`);
    console.log(`   RAM: ${ramKits.length} kits`);
    ramKits.forEach((kit, i) => console.log(`      [${i+1}] ${kit.name}`));
    console.log(`   Storage: ${storageDevices.length} drives`);
    storageDevices.forEach((drive, i) => console.log(`      [${i+1}] ${drive.name}`));
    console.log(`   GPU: ${components.gpu.name}`);
    console.log(`   Case: ${components.case.name}`);
    console.log(`   PSU: ${components.psu.name}`);
    console.log(`   Cooling: ${components.cooling.name}\n`);

    const response = await axios.post(API_URL, buildData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ API RESPONSE SUCCESS\n');
    console.log('📊 Status:', response.status);

    if (response.status === 200 || response.status === 201) {
      console.log('\n🎉 TEST 1 PASSED: Backend accepts arrays for RAM/Storage!');
      console.log('✅ Schema fix is working correctly\n');

      // Show issues summary
      const { compatible, issues = [] } = response.data;
      console.log(`📊 Overall Compatible: ${compatible ? 'YES' : 'NO'}`);
      console.log(`📊 Total Issues: ${issues.length}`);

      if (issues.length > 0) {
        const critical = issues.filter(i => i.severity === 'critical').length;
        const warnings = issues.filter(i => i.severity === 'warning').length;
        const info = issues.filter(i => i.severity === 'info').length;
        console.log(`   - CRITICAL: ${critical}`);
        console.log(`   - WARNINGS: ${warnings}`);
        console.log(`   - INFO: ${info}`);
      }

      return true;
    }

    return false;

  } catch (error) {
    if (error.response) {
      console.error('\n❌ TEST 1 FAILED\n');
      console.error('📛 HTTP Status:', error.response.status);
      console.error('📛 Error Data:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 400 && error.response.data.errors && error.response.data.errors.includes('must be object')) {
        console.error('\n❌ SCHEMA FIX NOT WORKING: Backend still rejecting arrays!');
      }
    } else {
      console.error('\n❌ TEST 1 FAILED:', error.message);
    }
    return false;
  }
}

async function run() {
  const components = await fetchSampleComponents();
  const test1Passed = await testArraysAccepted(components);

  await pool.end();

  console.log('\n📊 FINAL TEST RESULTS:');
  console.log(`   Test 1 (Arrays Accepted): ${test1Passed ? '✅ PASSED' : '❌ FAILED'}`);

  process.exit(test1Passed ? 0 : 1);
}

run();
