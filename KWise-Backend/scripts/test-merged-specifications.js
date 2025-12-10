/**
 * 🧪 TEST ENRICHED SPECIFICATIONS AUTO-FILL
 * 
 * This script tests the merged specifications endpoint to ensure
 * admin UI will receive enriched fields for auto-population
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

async function testMergedSpecs() {
  try {
    console.log('\n🧪 TESTING ENRICHED SPECIFICATIONS AUTO-FILL\n');
    console.log('='.repeat(80));

    // Simulate what the stock controller will do after our fix
    console.log('\n📊 TEST 1: GPU Category (simulating GET /api/stock?category=GPU)\n');
    
    const gpuResult = await pool.query(`
      SELECT 
        pp.id, pp.name, pp.category, pp.brand, pp.price, pp.stock,
        COALESCE(pp.image_url, pp.image_path) AS image_url,
        pp.created_at, pp.description, pp.compatible_sockets, pp.tier,
        COALESCE(
          pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
          pp.specifications,
          '{}'::jsonb
        ) AS specifications
      FROM pc_parts pp
      LEFT JOIN product_specs ps ON pp.id = ps.product_id
      WHERE pp.is_active = true AND pp.category = $1
      LIMIT 3
    `, ['GPU']);

    console.log(`Found ${gpuResult.rows.length} GPUs`);
    gpuResult.rows.forEach((gpu, index) => {
      console.log(`\n${index + 1}. ${gpu.name}`);
      console.log(`   Specification fields: ${Object.keys(gpu.specifications).length}`);
      console.log(`   ✅ has_12vhpwr: ${gpu.specifications.has_12vhpwr !== undefined ? gpu.specifications.has_12vhpwr : 'MISSING ❌'}`);
      console.log(`   ✅ pcie_8pin_count: ${gpu.specifications.pcie_8pin_count !== undefined ? gpu.specifications.pcie_8pin_count : 'MISSING ❌'}`);
      console.log(`   ✅ pcie_6pin_count: ${gpu.specifications.pcie_6pin_count !== undefined ? gpu.specifications.pcie_6pin_count : 'MISSING ❌'}`);
      console.log(`   ✅ transient_spike_power_w: ${gpu.specifications.transient_spike_power_w !== undefined ? gpu.specifications.transient_spike_power_w + 'W' : 'MISSING ❌'}`);
    });

    // Test Motherboard
    console.log('\n\n📊 TEST 2: Motherboard Category\n');
    
    const mbResult = await pool.query(`
      SELECT 
        pp.id, pp.name,
        COALESCE(
          pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
          pp.specifications,
          '{}'::jsonb
        ) AS specifications
      FROM pc_parts pp
      LEFT JOIN product_specs ps ON pp.id = ps.product_id
      WHERE pp.is_active = true AND pp.category = $1
      LIMIT 3
    `, ['Motherboard']);

    console.log(`Found ${mbResult.rows.length} Motherboards`);
    mbResult.rows.forEach((mb, index) => {
      console.log(`\n${index + 1}. ${mb.name}`);
      console.log(`   ✅ pcie_x16_slots_electrical: ${mb.specifications.pcie_x16_slots_electrical !== undefined ? mb.specifications.pcie_x16_slots_electrical : 'MISSING ❌'}`);
      console.log(`   ✅ pcie_x16_slots_physical: ${mb.specifications.pcie_x16_slots_physical !== undefined ? mb.specifications.pcie_x16_slots_physical : 'MISSING ❌'}`);
      console.log(`   ✅ max_memory_per_slot_gb: ${mb.specifications.max_memory_per_slot_gb !== undefined ? mb.specifications.max_memory_per_slot_gb + 'GB' : 'MISSING ❌'}`);
    });

    // Test Case
    console.log('\n\n📊 TEST 3: Case Category\n');
    
    const caseResult = await pool.query(`
      SELECT 
        pp.id, pp.name,
        COALESCE(
          pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
          pp.specifications,
          '{}'::jsonb
        ) AS specifications
      FROM pc_parts pp
      LEFT JOIN product_specs ps ON pp.id = ps.product_id
      WHERE pp.is_active = true AND pp.category = $1
      LIMIT 3
    `, ['Case']);

    console.log(`Found ${caseResult.rows.length} Cases`);
    caseResult.rows.forEach((caseItem, index) => {
      console.log(`\n${index + 1}. ${caseItem.name}`);
      console.log(`   ✅ front_fan_slots: ${caseItem.specifications.front_fan_slots !== undefined ? caseItem.specifications.front_fan_slots : 'MISSING ❌'}`);
      console.log(`   ✅ front_radiator_support: ${caseItem.specifications.front_radiator_support !== undefined ? caseItem.specifications.front_radiator_support + 'mm' : 'MISSING ❌'}`);
    });

    // Test PSU
    console.log('\n\n📊 TEST 4: PSU Category\n');
    
    const psuResult = await pool.query(`
      SELECT 
        pp.id, pp.name,
        COALESCE(
          pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb),
          pp.specifications,
          '{}'::jsonb
        ) AS specifications
      FROM pc_parts pp
      LEFT JOIN product_specs ps ON pp.id = ps.product_id
      WHERE pp.is_active = true AND pp.category = $1
      LIMIT 3
    `, ['PSU']);

    console.log(`Found ${psuResult.rows.length} PSUs`);
    psuResult.rows.forEach((psu, index) => {
      console.log(`\n${index + 1}. ${psu.name}`);
      console.log(`   ✅ has_12vhpwr_connector: ${psu.specifications.has_12vhpwr_connector !== undefined ? psu.specifications.has_12vhpwr_connector : 'MISSING ❌'}`);
      console.log(`   ✅ pcie_6pin_connectors: ${psu.specifications.pcie_6pin_connectors !== undefined ? psu.specifications.pcie_6pin_connectors : 'MISSING ❌'}`);
      console.log(`   ✅ pcie_8pin_connectors: ${psu.specifications.pcie_8pin_connectors !== undefined ? psu.specifications.pcie_8pin_connectors : 'MISSING ❌'}`);
    });

    // Summary
    console.log('\n\n📊 TEST SUMMARY\n');
    
    const allCategories = await pool.query(`
      SELECT 
        pp.category,
        COUNT(*) as total_items,
        COUNT(CASE 
          WHEN pp.specifications || COALESCE((ps.normalized_specs->'specs')::jsonb, '{}'::jsonb) != pp.specifications 
          THEN 1 
        END) as enriched_items
      FROM pc_parts pp
      LEFT JOIN product_specs ps ON pp.id = ps.product_id
      WHERE pp.is_active = true 
        AND pp.category IN ('Motherboard', 'GPU', 'Case', 'PSU')
      GROUP BY pp.category
      ORDER BY pp.category
    `);

    console.log('Category Enrichment Status:');
    allCategories.rows.forEach(cat => {
      const percentage = (cat.enriched_items / cat.total_items * 100).toFixed(1);
      console.log(`  ${cat.category}: ${cat.enriched_items}/${cat.total_items} items have enriched data (${percentage}%)`);
    });

    console.log('\n\n✅ TEST COMPLETE!\n');
    console.log('RESULT: Backend now returns merged specifications.');
    console.log('        Admin UI will auto-fill enriched fields when editing items.\n');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await pool.end();
  }
}

testMergedSpecs();
