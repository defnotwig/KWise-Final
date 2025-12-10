const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function analyzeDatabaseStructure() {
  try {
    console.log('\n=== ANALYZING DATABASE FOR GUIDED PC BUILDER ===\n');

    // Check CPU table structure
    console.log('📋 CPU TABLE STRUCTURE:');
    const cpuColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cpu' 
      ORDER BY ordinal_position
    `);
    cpuColumns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    
    const cpuSample = await pool.query('SELECT * FROM cpu LIMIT 1');
    console.log('\nSample CPU data:', JSON.stringify(cpuSample.rows[0], null, 2));

    // Check Motherboard table
    console.log('\n\n📋 MOTHERBOARD TABLE STRUCTURE:');
    const moboColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'motherboard' 
      ORDER BY ordinal_position
    `);
    moboColumns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    
    const moboSample = await pool.query('SELECT * FROM motherboard LIMIT 1');
    console.log('\nSample Motherboard data:', JSON.stringify(moboSample.rows[0], null, 2));

    // Check RAM table
    console.log('\n\n📋 RAM TABLE STRUCTURE:');
    const ramColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ram' 
      ORDER BY ordinal_position
    `);
    ramColumns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    
    const ramSample = await pool.query('SELECT * FROM ram LIMIT 1');
    console.log('\nSample RAM data:', JSON.stringify(ramSample.rows[0], null, 2));

    // Check GPU table
    console.log('\n\n📋 GPU TABLE STRUCTURE:');
    const gpuColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gpu' 
      ORDER BY ordinal_position
    `);
    gpuColumns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    
    const gpuSample = await pool.query('SELECT * FROM gpu LIMIT 1');
    console.log('\nSample GPU data:', JSON.stringify(gpuSample.rows[0], null, 2));

    // Check PSU table
    console.log('\n\n📋 PSU TABLE STRUCTURE:');
    const psuColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'psu' 
      ORDER BY ordinal_position
    `);
    psuColumns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    
    const psuSample = await pool.query('SELECT * FROM psu LIMIT 1');
    console.log('\nSample PSU data:', JSON.stringify(psuSample.rows[0], null, 2));

    // Check Case table
    console.log('\n\n📋 CASE TABLE STRUCTURE:');
    const caseColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pc_case' 
      ORDER BY ordinal_position
    `);
    caseColumns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    
    const caseSample = await pool.query('SELECT * FROM pc_case LIMIT 1');
    console.log('\nSample Case data:', JSON.stringify(caseSample.rows[0], null, 2));

    // Check Storage table
    console.log('\n\n📋 STORAGE TABLE STRUCTURE:');
    const storageColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'storage' 
      ORDER BY ordinal_position
    `);
    storageColumns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    
    const storageSample = await pool.query('SELECT * FROM storage LIMIT 1');
    console.log('\nSample Storage data:', JSON.stringify(storageSample.rows[0], null, 2));

    // Check PC_PARTS table for compatibility
    console.log('\n\n📋 PC_PARTS TABLE (Unified):');
    const pcPartsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts' 
      ORDER BY ordinal_position
    `);
    pcPartsColumns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

    // Check category counts
    console.log('\n\n📊 CATEGORY COUNTS:');
    const categories = ['CPU', 'Motherboard', 'RAM', 'GPU', 'PSU', 'Case', 'Storage', 'Cooling'];
    for (const cat of categories) {
      const count = await pool.query(
        'SELECT COUNT(*) FROM pc_parts WHERE category = $1 AND is_active = true',
        [cat]
      );
      console.log(`  ${cat}: ${count.rows[0].count} products`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

analyzeDatabaseStructure();
