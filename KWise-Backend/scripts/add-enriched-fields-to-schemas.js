/**
 * ⚡ ADD ENRICHED FIELDS TO SPECIFICATION_SCHEMAS TABLE ⚡
 * 
 * This script adds the missing enriched compatibility fields to the
 * specification_schemas table so they appear in the admin stock UI.
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: process.env.DB_PASSWORD || 'humbleludwig13'
});

async function addEnrichedFieldsToSchemas() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n⚡ Adding enriched fields to specification_schemas...\n');
    
    // =================================================================
    // MOTHERBOARD FIELDS
    // =================================================================
    console.log('🔧 Adding Motherboard enriched fields...\n');
    
    const motherboardFields = [
      {
        field_name: 'pcie_x16_slots_electrical',
        field_type: 'number',
        is_required: false,
        default_value: null,
        description: 'Number of PCIe x16 slots with full electrical lanes (for multi-GPU)'
      },
      {
        field_name: 'pcie_x16_slots_physical',
        field_type: 'number',
        is_required: false,
        default_value: null,
        description: 'Total number of physical PCIe x16 slots'
      },
      {
        field_name: 'max_memory_per_slot_gb',
        field_type: 'number',
        is_required: false,
        default_value: null,
        description: 'Maximum RAM capacity per slot in GB'
      }
    ];
    
    for (const field of motherboardFields) {
      // Check if exists
      const checkResult = await client.query(
        'SELECT 1 FROM specification_schemas WHERE category = $1 AND field_name = $2',
        ['Motherboard', field.field_name]
      );
      
      if (checkResult.rows.length > 0) {
        console.log(`  ⚠️  ${field.field_name} already exists, skipping`);
      } else {
        await client.query(`
          INSERT INTO specification_schemas (category, field_name, field_type, is_required, default_value)
          VALUES ($1, $2, $3, $4, $5)
        `, ['Motherboard', field.field_name, field.field_type, field.is_required, field.default_value]);
        
        console.log(`  ✅ Added ${field.field_name} (${field.field_type})`);
        console.log(`     ${field.description}`);
      }
    }
    
    // =================================================================
    // GPU FIELDS
    // =================================================================
    console.log('\n🎮 Adding GPU enriched fields...\n');
    
    const gpuFields = [
      {
        field_name: 'has_12vhpwr',
        field_type: 'boolean',
        is_required: false,
        default_value: 'false',
        description: 'Whether GPU uses 12VHPWR connector (RTX 40/50 series)'
      },
      {
        field_name: 'transient_spike_power_w',
        field_type: 'number',
        is_required: false,
        default_value: null,
        description: 'Maximum transient power spike in watts (TDP × 1.3)'
      },
      {
        field_name: 'pcie_8pin_count',
        field_type: 'number',
        is_required: false,
        default_value: '0',
        description: 'Number of 8-pin PCIe power connectors required'
      },
      {
        field_name: 'pcie_6pin_count',
        field_type: 'number',
        is_required: false,
        default_value: '0',
        description: 'Number of 6-pin PCIe power connectors required'
      }
    ];
    
    for (const field of gpuFields) {
      const checkResult = await client.query(
        'SELECT 1 FROM specification_schemas WHERE category = $1 AND field_name = $2',
        ['GPU', field.field_name]
      );
      
      if (checkResult.rows.length > 0) {
        console.log(`  ⚠️  ${field.field_name} already exists, skipping`);
      } else {
        await client.query(`
          INSERT INTO specification_schemas (category, field_name, field_type, is_required, default_value)
          VALUES ($1, $2, $3, $4, $5)
        `, ['GPU', field.field_name, field.field_type, field.is_required, field.default_value]);
        
        console.log(`  ✅ Added ${field.field_name} (${field.field_type})`);
        console.log(`     ${field.description}`);
      }
    }
    
    // =================================================================
    // CASE FIELDS
    // =================================================================
    console.log('\n🗄️  Adding Case enriched fields...\n');
    
    const caseFields = [
      {
        field_name: 'front_fan_slots',
        field_type: 'number',
        is_required: false,
        default_value: null,
        description: 'Number of front-mounted fan slots (affects GPU clearance)'
      },
      {
        field_name: 'front_radiator_support',
        field_type: 'number',
        is_required: false,
        default_value: null,
        description: 'Maximum front radiator size in mm (240, 280, 360)'
      }
    ];
    
    for (const field of caseFields) {
      const checkResult = await client.query(
        'SELECT 1 FROM specification_schemas WHERE category = $1 AND field_name = $2',
        ['Case', field.field_name]
      );
      
      if (checkResult.rows.length > 0) {
        console.log(`  ⚠️  ${field.field_name} already exists, skipping`);
      } else {
        await client.query(`
          INSERT INTO specification_schemas (category, field_name, field_type, is_required, default_value)
          VALUES ($1, $2, $3, $4, $5)
        `, ['Case', field.field_name, field.field_type, field.is_required, field.default_value]);
        
        console.log(`  ✅ Added ${field.field_name} (${field.field_type})`);
        console.log(`     ${field.description}`);
      }
    }
    
    // =================================================================
    // PSU FIELDS
    // =================================================================
    console.log('\n⚡ Adding PSU enriched fields...\n');
    
    const psuFields = [
      {
        field_name: 'has_12vhpwr_connector',
        field_type: 'boolean',
        is_required: false,
        default_value: 'false',
        description: 'Whether PSU has native 12VHPWR connector (ATX 3.0)'
      },
      {
        field_name: 'pcie_6pin_connectors',
        field_type: 'number',
        is_required: false,
        default_value: null,
        description: 'Number of 6-pin PCIe power connectors'
      },
      {
        field_name: 'pcie_8pin_connectors',
        field_type: 'number',
        is_required: false,
        default_value: null,
        description: 'Number of 8-pin PCIe power connectors'
      }
    ];
    
    for (const field of psuFields) {
      const checkResult = await client.query(
        'SELECT 1 FROM specification_schemas WHERE category = $1 AND field_name = $2',
        ['PSU', field.field_name]
      );
      
      if (checkResult.rows.length > 0) {
        console.log(`  ⚠️  ${field.field_name} already exists, skipping`);
      } else {
        await client.query(`
          INSERT INTO specification_schemas (category, field_name, field_type, is_required, default_value)
          VALUES ($1, $2, $3, $4, $5)
        `, ['PSU', field.field_name, field.field_type, field.is_required, field.default_value]);
        
        console.log(`  ✅ Added ${field.field_name} (${field.field_type})`);
        console.log(`     ${field.description}`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Successfully added all enriched fields to specification_schemas!\n');
    
    // Verify the additions
    console.log('📊 Verification:\n');
    
    const verifyResult = await client.query(`
      SELECT category, COUNT(*) as field_count
      FROM specification_schemas
      WHERE category IN ('Motherboard', 'GPU', 'Case', 'PSU')
      GROUP BY category
      ORDER BY category
    `);
    
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.field_count} fields`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error adding enriched fields:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addEnrichedFieldsToSchemas();
