// Check RAM components missing memory_type specification
require('dotenv').config();
const { query } = require('./config/db');

async function checkMissingMemoryType() {
  try {
    console.log('🔍 Checking RAM components with missing memory_type...\n');
    
    const result = await query(`
      SELECT 
        id,
        name,
        specifications->>'memory_type' as memory_type,
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
    
    console.log(`📊 RAM components missing memory_type: ${result.rows.length}\n`);
    
    if (result.rows.length > 0) {
      console.log('❌ Components with missing memory_type:');
      result.rows.forEach((ram, index) => {
        console.log(`\n${index + 1}. ID: ${ram.id}`);
        console.log(`   Name: ${ram.name}`);
        console.log(`   Memory Type: ${ram.memory_type || 'MISSING'}`);
        
        // Try to infer memory type from name
        let inferredType = null;
        const name = ram.name.toUpperCase();
        if (name.includes('DDR5')) {
          inferredType = 'DDR5';
        } else if (name.includes('DDR4')) {
          inferredType = 'DDR4';
        } else if (name.includes('DDR3')) {
          inferredType = 'DDR3';
        }
        
        if (inferredType) {
          console.log(`   💡 Can infer from name: ${inferredType}`);
        } else {
          console.log(`   ⚠️ Cannot infer memory type from name`);
        }
      });
    } else {
      console.log('✅ All RAM components have memory_type specified!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

checkMissingMemoryType();
