/**
 * ✅ DRIVE BAY WARNING TEST
 * Verifies SATA drives show WARNING (not CRITICAL) when case has missing drive bay specs
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

async function fetchTargetComponents() {
  try {
    console.log('\n📦 Fetching target components for drive bay test...\n');

    // Get KEYTECH ROBIN MINI case (the one with missing drive bay specs)
    const caseQuery = await pool.query("SELECT id, name FROM pc_parts WHERE name LIKE '%KEYTECH ROBIN MINI%' AND category = 'Case' LIMIT 1");
    
    if (!caseQuery.rows[0]) {
      throw new Error('KEYTECH ROBIN MINI case not found in database');
    }

    console.log(`✅ Found case: ${caseQuery.rows[0].name} (ID: ${caseQuery.rows[0].id})`);

    // Get a SATA drive (requires 2.5" bay)
    const sataQuery = await pool.query("SELECT id, name, specifications FROM pc_parts WHERE category = 'Storage' AND specifications->>'interface' ILIKE '%SATA%' LIMIT 1");
    
    if (!sataQuery.rows[0]) {
      throw new Error('SATA storage drive not found in database');
    }

    console.log(`✅ Found SATA drive: ${sataQuery.rows[0].name} (ID: ${sataQuery.rows[0].id})`);
    console.log(`   Interface: ${sataQuery.rows[0].specifications.interface}`);
    console.log(`   Form Factor: ${sataQuery.rows[0].specifications.form_factor || 'N/A'}\n`);

    // Get generic components for the rest
    const cpu = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'CPU' LIMIT 1");
    const motherboard = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'Motherboard' LIMIT 1");
    const ram = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'RAM' LIMIT 1");
    const gpu = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'GPU' LIMIT 1");
    const psu = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'PSU' LIMIT 1");
    const cooling = await pool.query("SELECT id, name FROM pc_parts WHERE category = 'Cooling' LIMIT 1");

    return {
      cpu: cpu.rows[0],
      motherboard: motherboard.rows[0],
      ram: ram.rows[0],
      sataDrive: sataQuery.rows[0],
      gpu: gpu.rows[0],
      case: caseQuery.rows[0],
      psu: psu.rows[0],
      cooling: cooling.rows[0]
    };
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }
}

async function testDriveBayWarning(components) {
  try {
    console.log('🧪 TEST 2: Verify SATA drive shows WARNING (not CRITICAL) with missing case specs\n');

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
        ram: {
          id: components.ram.id,
          name: components.ram.name,
          category: 'RAM'
        },
        // ✅ CRITICAL TEST: SATA drive with case that has no drive bay specs
        storage: {
          id: components.sataDrive.id,
          name: components.sataDrive.name,
          category: 'Storage'
        },
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
    console.log(`   SATA Drive: ${components.sataDrive.name}`);
    console.log(`   Case: ${components.case.name} (missing drive bay specs)`);
    console.log(`   Expected: WARNING severity (not CRITICAL)\n`);

    const response = await axios.post(API_URL, buildData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ API RESPONSE SUCCESS\n');

    // ✅ FIX: Response structure is { success, data: { ...analysisResult, all_issues, all_warnings } }
    const analysisData = response.data.data || response.data;
    const { compatible, overall_compatible } = analysisData;
    const allIssues = analysisData.all_issues || [];
    const allWarnings = analysisData.all_warnings || [];
    const allProblems = [...allIssues, ...allWarnings];

    console.log(`📊 Overall Compatible: ${compatible || overall_compatible ? 'YES' : 'NO'}`);
    console.log(`📊 Total Critical Issues: ${allIssues.length}`);
    console.log(`📊 Total Warnings: ${allWarnings.length}`);
    console.log(`📊 Total Problems: ${allProblems.length}\n`);

    if (allProblems.length > 0) {
      console.log('📋 ISSUES & WARNINGS FOUND:\n');
      
      allProblems.forEach((issue, i) => {
        console.log(`[${i+1}] ${issue.severity?.toUpperCase() || 'UNKNOWN'}:`);
        console.log(`    Message: ${issue.message || issue.issue}`);
        console.log(`    Component1: ${issue.component1 || 'N/A'}`);
        console.log(`    Component2: ${issue.component2 || 'N/A'}\n`);
      });

      // ✅ VERIFICATION: Find drive bay related issue
      const driveBayIssue = allProblems.find(i => {
        const msg = (i.message || i.issue || '').toLowerCase();
        return msg.includes('drive bay') || msg.includes('sata') || msg.includes('2.5');
      });

      if (driveBayIssue) {
        console.log('🎯 DRIVE BAY ISSUE FOUND:');
        console.log(`   Message: ${driveBayIssue.message || driveBayIssue.issue}`);
        console.log(`   Severity: ${driveBayIssue.severity}`);
        
        if (driveBayIssue.severity === 'warning') {
          console.log('\n✅ TEST 2 PASSED: Missing case specs return WARNING (not CRITICAL)');
          console.log('✅ Drive bay fix is working correctly\n');
          return true;
        } else if (driveBayIssue.severity === 'critical') {
          console.log('\n❌ TEST 2 FAILED: Still showing CRITICAL instead of WARNING');
          console.log('❌ Drive bay fix not working\n');
          return false;
        }
      } else {
        console.log('\n⚠️  No drive bay issue found');
        console.log('   This may indicate the compatibility logic bypassed the check entirely');
        console.log('   Or the case actually has drive bay specs in the database\n');
        return null; // Inconclusive
      }
    } else {
      console.log('\n⚠️  No compatibility issues found');
      console.log('   Build may be fully compatible, or compatibility checks not running\n');
      return null; // Inconclusive
    }

    return false;

  } catch (error) {
    if (error.response) {
      console.error('\n❌ TEST 2 FAILED\n');
      console.error('📛 HTTP Status:', error.response.status);
      console.error('📛 Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('\n❌ TEST 2 FAILED:', error.message);
    }
    return false;
  }
}

async function run() {
  const components = await fetchTargetComponents();
  const test2Result = await testDriveBayWarning(components);

  await pool.end();

  console.log('\n📊 FINAL TEST RESULTS:');
  console.log(`   Test 2 (Drive Bay WARNING): ${test2Result === true ? '✅ PASSED' : test2Result === false ? '❌ FAILED' : '⚠️  INCONCLUSIVE'}`);

  process.exit(test2Result === true ? 0 : 1);
}

run();
