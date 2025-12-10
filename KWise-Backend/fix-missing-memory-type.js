// Fix RAM components with missing memory_type by inferring from name
require('dotenv').config();
const { query } = require('./config/db');

async function fixMissingMemoryType() {
  try {
    console.log('🔧 Fixing RAM components with missing memory_type...\n');
    
    const missingRAM = await query(`
      SELECT 
        id,
        name,
        specifications
      FROM pc_parts
      WHERE 
        category = 'RAM'
        AND (
          specifications->>'memory_type' IS NULL
          OR specifications->>'memory_type' = ''
        )
      ORDER BY id
    `);
    
    console.log(`📊 Found ${missingRAM.rows.length} RAM components to fix\n`);
    
    for (const ram of missingRAM.rows) {
      const name = ram.name.toUpperCase();
      let memoryType = null;
      
      if (name.includes('DDR5')) {
        memoryType = 'DDR5';
      } else if (name.includes('DDR4')) {
        memoryType = 'DDR4';
      } else if (name.includes('DDR3')) {
        memoryType = 'DDR3';
      }
      
      if (memoryType) {
        console.log(`Fixing ID ${ram.id}: ${ram.name}`);
        console.log(`  Setting memory_type: ${memoryType}`);
        
        // Update specifications JSON to add memory_type
        await query(`
          UPDATE pc_parts
          SET 
            specifications = specifications || '{"memory_type": "${memoryType}"}'::jsonb,
            updated_at = NOW()
          WHERE id = $1
        `, [ram.id]);
        
        console.log(`  ✅ Fixed!\n`);
      } else {
        console.log(`⚠️ Could not infer memory type for ID ${ram.id}: ${ram.name}\n`);
      }
    }
    
    console.log('✅ All RAM components have been fixed!');
    
    // Verify
    const verification = await query(`
      SELECT COUNT(*) as count
      FROM pc_parts
      WHERE 
        category = 'RAM'
        AND (
          specifications->>'memory_type' IS NULL
          OR specifications->>'memory_type' = ''
        )
    `);
    
    const remaining = verification.rows[0].count;
    console.log(`\n📊 Remaining RAM with missing memory_type: ${remaining}`);
    
    if (remaining === 0) {
      console.log('✅✅✅ ALL RAM COMPONENTS NOW HAVE memory_type! ✅✅✅');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixMissingMemoryType();
