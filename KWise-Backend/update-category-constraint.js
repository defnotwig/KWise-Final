/**
 * Add Pre-Built category to database constraint
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

async function updateCategoryConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Updating pc_parts category constraint...\n');

    // Check current constraint
    const constraintCheck = await client.query(`
      SELECT con.conname, pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'pc_parts' AND con.contype = 'c'
      AND con.conname LIKE '%category%'
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('📋 Current constraint:');
      console.log(`   Name: ${constraintCheck.rows[0].conname}`);
      console.log(`   Definition: ${constraintCheck.rows[0].definition}\n`);
      
      // Drop the old constraint
      await client.query(`
        ALTER TABLE pc_parts DROP CONSTRAINT IF EXISTS ${constraintCheck.rows[0].conname}
      `);
      console.log('✅ Dropped old category constraint\n');
    }

    // Add new constraint with Pre-Built category
    await client.query(`
      ALTER TABLE pc_parts ADD CONSTRAINT pc_parts_category_check 
      CHECK (category IN (
        'CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 
        'Case', 'Cooling', 'Monitor', 'Keyboard', 'Mouse', 
        'Headphones', 'Speakers', 'Webcam', 'Pre-Built'
      ))
    `);
    
    console.log('✅ Added new constraint with Pre-Built category!\n');
    
    // Verify
    const verifyCheck = await client.query(`
      SELECT con.conname, pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'pc_parts' AND con.contype = 'c'
      AND con.conname LIKE '%category%'
    `);
    
    if (verifyCheck.rows.length > 0) {
      console.log('✅ Verified new constraint:');
      console.log(`   ${verifyCheck.rows[0].definition}\n`);
    }
    
    console.log('✅ Successfully updated database constraint!');
    console.log('   Pre-Built is now a valid category.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateCategoryConstraint();
