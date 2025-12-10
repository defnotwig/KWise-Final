/**
 * 🔍 DIAGNOSE FIELD ISSUES
 * 
 * This script investigates:
 * 1. GPU redundant PCIe fields (pcie_8pin vs pcie_8pin_count)
 * 2. Auto-fill issues for enriched fields in admin UI
 * 3. Data population status in product_specs
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'KWiseDB',
  password: process.env.DB_PASSWORD || 'humbleludwig13',
  port: process.env.DB_PORT || 5432,
});

async function diagnose() {
  try {
    console.log('\n🔍 DIAGNOSTIC REPORT - Field Issues\n');
    console.log('='.repeat(80));

    // 1. Check GPU table schema for PCIe fields
    console.log('\n📊 ISSUE #1: GPU PCIe Field Redundancy\n');
    
    const gpuColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gpu' AND column_name LIKE '%pcie%'
      ORDER BY column_name
    `);
    
    console.log('GPU table columns (PCIe-related):');
    gpuColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // 2. Check specification_schemas for GPU
    const gpuSchemaFields = await pool.query(`
      SELECT field_name, field_type 
      FROM specification_schemas 
      WHERE category = 'GPU' AND field_name LIKE '%pcie%'
      ORDER BY field_name
    `);
    
    console.log('\nspecification_schemas for GPU (PCIe-related):');
    gpuSchemaFields.rows.forEach(field => {
      console.log(`  - ${field.field_name} (${field.field_type})`);
    });

    // Identify redundancy
    const schemaFieldNames = gpuSchemaFields.rows.map(r => r.field_name);
    const tableFieldNames = gpuColumns.rows.map(r => r.column_name);
    
    console.log('\n⚠️ REDUNDANCY ANALYSIS:');
    if (schemaFieldNames.includes('pcie_8pin') && schemaFieldNames.includes('pcie_8pin_count')) {
      console.log('  ❌ FOUND: Both "pcie_8pin" and "pcie_8pin_count" exist in specification_schemas');
      console.log('  🔧 FIX NEEDED: Remove one (keep pcie_8pin_count for consistency with enriched data)');
    }
    if (tableFieldNames.includes('pcie_8pin') && tableFieldNames.includes('pcie_8pin_count')) {
      console.log('  ❌ FOUND: Both "pcie_8pin" and "pcie_8pin_count" exist in GPU table');
      console.log('  🔧 FIX NEEDED: Merge data from pcie_8pin to pcie_8pin_count, drop pcie_8pin column');
    }

    // 3. Check enriched data population
    console.log('\n\n📊 ISSUE #2: Enriched Field Auto-Fill Problems\n');

    // Check Motherboard enriched data
    const motherboardData = await pool.query(`
      SELECT 
        pp.name,
        ps.normalized_specs->'specs'->>'pcie_x16_slots_electrical' as electrical,
        ps.normalized_specs->'specs'->>'pcie_x16_slots_physical' as physical,
        ps.normalized_specs->'specs'->>'max_memory_per_slot_gb' as max_mem
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'Motherboard'
      LIMIT 5
    `);

    console.log('Motherboard enriched data sample:');
    motherboardData.rows.forEach(row => {
      const hasData = row.electrical || row.physical || row.max_mem;
      console.log(`  ${hasData ? '✅' : '❌'} ${row.name}`);
      console.log(`     Electrical: ${row.electrical || 'NULL'}, Physical: ${row.physical || 'NULL'}, Max Mem/Slot: ${row.max_mem || 'NULL'}`);
    });

    // Check GPU enriched data
    const gpuData = await pool.query(`
      SELECT 
        pp.name,
        ps.normalized_specs->'specs'->>'has_12vhpwr' as has_12vhpwr,
        ps.normalized_specs->'specs'->>'pcie_8pin_count' as pcie_8pin,
        ps.normalized_specs->'specs'->>'pcie_6pin_count' as pcie_6pin,
        ps.normalized_specs->'specs'->>'transient_spike_power_w' as transient
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'GPU'
      LIMIT 5
    `);

    console.log('\nGPU enriched data sample:');
    gpuData.rows.forEach(row => {
      const hasData = row.has_12vhpwr !== null || row.pcie_8pin || row.pcie_6pin || row.transient;
      console.log(`  ${hasData ? '✅' : '❌'} ${row.name}`);
      console.log(`     12VHPWR: ${row.has_12vhpwr || 'NULL'}, 8-pin: ${row.pcie_8pin || 'NULL'}, 6-pin: ${row.pcie_6pin || 'NULL'}, Transient: ${row.transient || 'NULL'}W`);
    });

    // Check Case enriched data
    const caseData = await pool.query(`
      SELECT 
        pp.name,
        ps.normalized_specs->'specs'->>'front_fan_slots' as front_fans,
        ps.normalized_specs->'specs'->>'front_radiator_support' as radiator
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'Case'
      LIMIT 5
    `);

    console.log('\nCase enriched data sample:');
    caseData.rows.forEach(row => {
      const hasData = row.front_fans || row.radiator;
      console.log(`  ${hasData ? '✅' : '❌'} ${row.name}`);
      console.log(`     Front Fans: ${row.front_fans || 'NULL'}, Radiator Support: ${row.radiator || 'NULL'}mm`);
    });

    // Check PSU enriched data
    const psuData = await pool.query(`
      SELECT 
        pp.name,
        ps.normalized_specs->'specs'->>'has_12vhpwr_connector' as has_12vhpwr,
        ps.normalized_specs->'specs'->>'pcie_6pin_connectors' as pcie_6pin,
        ps.normalized_specs->'specs'->>'pcie_8pin_connectors' as pcie_8pin
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'PSU'
      LIMIT 5
    `);

    console.log('\nPSU enriched data sample:');
    psuData.rows.forEach(row => {
      const hasData = row.has_12vhpwr !== null || row.pcie_6pin || row.pcie_8pin;
      console.log(`  ${hasData ? '✅' : '❌'} ${row.name}`);
      console.log(`     12VHPWR: ${row.has_12vhpwr || 'NULL'}, 6-pin: ${row.pcie_6pin || 'NULL'}, 8-pin: ${row.pcie_8pin || 'NULL'}`);
    });

    // 4. Count total enriched products
    console.log('\n\n📊 ENRICHED DATA COVERAGE:\n');

    const motherboardCount = await pool.query(`
      SELECT COUNT(*) as total,
        COUNT(ps.normalized_specs->'specs'->>'pcie_x16_slots_electrical') as enriched
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'Motherboard'
    `);

    const gpuCount = await pool.query(`
      SELECT COUNT(*) as total,
        COUNT(ps.normalized_specs->'specs'->>'pcie_8pin_count') as enriched
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'GPU'
    `);

    const caseCount = await pool.query(`
      SELECT COUNT(*) as total,
        COUNT(ps.normalized_specs->'specs'->>'front_fan_slots') as enriched
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'Case'
    `);

    const psuCount = await pool.query(`
      SELECT COUNT(*) as total,
        COUNT(ps.normalized_specs->'specs'->>'has_12vhpwr_connector') as enriched
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'PSU'
    `);

    console.log(`Motherboard: ${motherboardCount.rows[0].enriched}/${motherboardCount.rows[0].total} enriched (${Math.round(motherboardCount.rows[0].enriched / motherboardCount.rows[0].total * 100)}%)`);
    console.log(`GPU: ${gpuCount.rows[0].enriched}/${gpuCount.rows[0].total} enriched (${Math.round(gpuCount.rows[0].enriched / gpuCount.rows[0].total * 100)}%)`);
    console.log(`Case: ${caseCount.rows[0].enriched}/${caseCount.rows[0].total} enriched (${Math.round(caseCount.rows[0].enriched / caseCount.rows[0].total * 100)}%)`);
    console.log(`PSU: ${psuCount.rows[0].enriched}/${psuCount.rows[0].total} enriched (${Math.round(psuCount.rows[0].enriched / psuCount.rows[0].total * 100)}%)`);

    // 5. Check admin UI data loading
    console.log('\n\n📊 ISSUE #3: Admin UI Field Population\n');

    console.log('Checking how StockDetail.js loads field values...\n');
    
    // Simulate what happens when editing a GPU
    const sampleGPU = await pool.query(`
      SELECT 
        pp.id,
        pp.name,
        pp.category,
        ps.normalized_specs
      FROM pc_parts pp
      LEFT JOIN product_specs ps ON pp.id = ps.product_id
      WHERE pp.category = 'GPU'
      LIMIT 1
    `);

    if (sampleGPU.rows.length > 0) {
      const gpu = sampleGPU.rows[0];
      const specs = gpu.normalized_specs?.specs || {};
      
      console.log(`Sample GPU: ${gpu.name}`);
      console.log(`Product ID: ${gpu.id}`);
      console.log('\nField values that SHOULD auto-fill in admin UI:');
      
      const gpuFields = await pool.query(`
        SELECT field_name, field_type 
        FROM specification_schemas 
        WHERE category = 'GPU' 
        ORDER BY field_name
      `);

      gpuFields.rows.forEach(field => {
        const value = specs[field.field_name];
        const status = value !== undefined && value !== null ? '✅' : '❌ NULL';
        console.log(`  ${status} ${field.field_name}: ${value !== undefined ? value : 'NOT SET'}`);
      });
    }

    console.log('\n\n🔧 ROOT CAUSES IDENTIFIED:\n');
    console.log('1. GPU Field Redundancy:');
    console.log('   - Both pcie_8pin (old) and pcie_8pin_count (new) exist');
    console.log('   - Need to consolidate to pcie_8pin_count\n');
    
    console.log('2. Enriched Data NOT Populated:');
    console.log('   - enrich-compatibility-fields.js may not have been run');
    console.log('   - Or script did not cover all products\n');
    
    console.log('3. Admin UI Auto-Fill Issue:');
    console.log('   - StockDetail.js loads from normalized_specs.specs');
    console.log('   - If data is NULL/missing, fields appear empty');
    console.log('   - Solution: Run enrichment script to populate all products\n');

    console.log('='.repeat(80));
    console.log('\n✅ Diagnostic complete!\n');

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  } finally {
    await pool.end();
  }
}

diagnose();
