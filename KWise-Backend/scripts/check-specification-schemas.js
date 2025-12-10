/**
 * Check specification_schemas table for enriched fields
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: process.env.DB_PASSWORD || 'humbleludwig13'
});

async function checkSpecSchemas() {
  try {
    console.log('\n🔍 Checking specification_schemas for Motherboard...\n');
    
    const result = await pool.query(`
      SELECT category, field_name, field_type, is_required, default_value
      FROM specification_schemas
      WHERE category = 'Motherboard'
      ORDER BY field_name
    `);
    
    console.log(`Found ${result.rows.length} fields for Motherboard:\n`);
    
    result.rows.forEach(row => {
      console.log(`  - ${row.field_name} (${row.field_type})`);
    });
    
    // Check for enriched fields
    const enrichedFields = [
      'pcie_x16_slots_electrical',
      'pcie_x16_slots_physical',
      'max_memory_per_slot_gb'
    ];
    
    console.log('\n📊 Checking for enriched fields:\n');
    
    enrichedFields.forEach(field => {
      const exists = result.rows.some(row => row.field_name === field);
      console.log(`  ${exists ? '✅' : '❌'} ${field}`);
    });
    
    // Also check GPU fields
    console.log('\n\n🔍 Checking specification_schemas for GPU...\n');
    
    const gpuResult = await pool.query(`
      SELECT category, field_name, field_type, is_required, default_value
      FROM specification_schemas
      WHERE category = 'GPU'
      ORDER BY field_name
    `);
    
    console.log(`Found ${gpuResult.rows.length} fields for GPU:\n`);
    
    gpuResult.rows.forEach(row => {
      console.log(`  - ${row.field_name} (${row.field_type})`);
    });
    
    const gpuEnrichedFields = [
      'has_12vhpwr',
      'transient_spike_power_w',
      'pcie_8pin_count',
      'pcie_6pin_count'
    ];
    
    console.log('\n📊 Checking for enriched GPU fields:\n');
    
    gpuEnrichedFields.forEach(field => {
      const exists = gpuResult.rows.some(row => row.field_name === field);
      console.log(`  ${exists ? '✅' : '❌'} ${field}`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSpecSchemas();
