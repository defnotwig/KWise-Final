/**
 * 🔧 FIX REDUNDANT FIELDS
 * 
 * This script fixes the GPU pcie_8pin redundancy by:
 * 1. Removing the old "pcie_8pin" field from specification_schemas for GPU
 * 2. Keeping only "pcie_8pin_count" (the enriched field)
 * 3. Verifying the fix
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

async function fixRedundantFields() {
  try {
    console.log('\n🔧 FIXING REDUNDANT FIELDS\n');
    console.log('='.repeat(80));

    // 1. Check current state
    console.log('\n📊 BEFORE FIX:\n');
    
    const beforeGPU = await pool.query(`
      SELECT field_name, field_type 
      FROM specification_schemas 
      WHERE category = 'GPU' AND field_name LIKE '%pcie%'
      ORDER BY field_name
    `);
    
    console.log('GPU PCIe fields in specification_schemas:');
    beforeGPU.rows.forEach(field => {
      console.log(`  - ${field.field_name} (${field.field_type})`);
    });

    // 2. Remove the old pcie_8pin field (keeping pcie_8pin_count)
    console.log('\n⚡ Removing redundant "pcie_8pin" field...\n');
    
    await pool.query('BEGIN');
    
    const deleteResult = await pool.query(`
      DELETE FROM specification_schemas 
      WHERE category = 'GPU' AND field_name = 'pcie_8pin'
    `);
    
    console.log(`✅ Deleted ${deleteResult.rowCount} redundant field(s)`);
    
    await pool.query('COMMIT');

    // 3. Verify fix
    console.log('\n📊 AFTER FIX:\n');
    
    const afterGPU = await pool.query(`
      SELECT field_name, field_type 
      FROM specification_schemas 
      WHERE category = 'GPU' AND field_name LIKE '%pcie%'
      ORDER BY field_name
    `);
    
    console.log('GPU PCIe fields in specification_schemas:');
    afterGPU.rows.forEach(field => {
      console.log(`  ✅ ${field.field_name} (${field.field_type})`);
    });

    // 4. Verify all GPU fields
    console.log('\n📊 ALL GPU FIELDS IN specification_schemas:\n');
    
    const allGPUFields = await pool.query(`
      SELECT field_name, field_type, is_required 
      FROM specification_schemas 
      WHERE category = 'GPU'
      ORDER BY field_name
    `);
    
    console.log(`Total: ${allGPUFields.rows.length} fields`);
    allGPUFields.rows.forEach(field => {
      const required = field.is_required ? '(required)' : '(optional)';
      console.log(`  - ${field.field_name.padEnd(30)} ${field.field_type.padEnd(10)} ${required}`);
    });

    // 5. Check if any other redundancies exist
    console.log('\n\n🔍 CHECKING FOR OTHER REDUNDANCIES:\n');

    const categories = ['Motherboard', 'Case', 'PSU'];
    
    for (const category of categories) {
      const fields = await pool.query(`
        SELECT field_name 
        FROM specification_schemas 
        WHERE category = $1
        ORDER BY field_name
      `, [category]);
      
      const fieldNames = fields.rows.map(r => r.field_name);
      const duplicates = fieldNames.filter((item, index) => fieldNames.indexOf(item) !== index);
      
      if (duplicates.length > 0) {
        console.log(`❌ ${category}: Found duplicates: ${duplicates.join(', ')}`);
      } else {
        console.log(`✅ ${category}: No duplicate fields (${fieldNames.length} unique fields)`);
      }
    }

    console.log('\n\n✅ REDUNDANT FIELD FIX COMPLETE!\n');
    console.log('='.repeat(80));

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Fix error:', error);
  } finally {
    await pool.end();
  }
}

fixRedundantFields();
