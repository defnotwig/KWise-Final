const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function verifyCompatibility() {
  try {
    // Check how many products now have compatibility data
    const countResult = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN compatible_sockets != '[]'::jsonb THEN 1 END) as with_sockets
      FROM cooling
    `);
    
    console.log('\n=== COMPATIBILITY DATA SUMMARY ===');
    console.log(`Total cooling products: ${countResult.rows[0].total}`);
    console.log(`Products with socket data: ${countResult.rows[0].with_sockets}`);
    
    // Show sample products with their sockets
    const samples = await pool.query(`
      SELECT id, name, compatible_sockets, water_cooled, price
      FROM cooling
      ORDER BY name
      LIMIT 15
    `);
    
    console.log('\n=== SAMPLE COOLING PRODUCTS WITH SOCKETS ===\n');
    samples.rows.forEach(row => {
      const sockets = Array.isArray(row.compatible_sockets) 
        ? row.compatible_sockets.join(', ') 
        : 'None';
      console.log(`${row.id}: ${row.name}`);
      console.log(`   Sockets: [${sockets}]`);
      console.log(`   Type: ${row.water_cooled ? 'Water' : 'Air'} | Price: ₱${row.price}\n`);
    });
    
    // Check AM4 compatibility
    const am4Compatible = await pool.query(`
      SELECT COUNT(*) as count
      FROM cooling
      WHERE compatible_sockets @> '["AM4"]'::jsonb
    `);
    
    console.log(`\n✅ Products compatible with AM4: ${am4Compatible.rows[0].count}`);
    
    // Check AM5 compatibility
    const am5Compatible = await pool.query(`
      SELECT COUNT(*) as count
      FROM cooling
      WHERE compatible_sockets @> '["AM5"]'::jsonb
    `);
    
    console.log(`✅ Products compatible with AM5: ${am5Compatible.rows[0].count}`);
    
    // Check LGA1700 compatibility
    const lga1700Compatible = await pool.query(`
      SELECT COUNT(*) as count
      FROM cooling
      WHERE compatible_sockets @> '["LGA1700"]'::jsonb
    `);
    
    console.log(`✅ Products compatible with LGA1700: ${lga1700Compatible.rows[0].count}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

verifyCompatibility();
