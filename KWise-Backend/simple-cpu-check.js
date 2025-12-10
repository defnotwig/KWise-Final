/**
 * Simple CPU Product Check
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

async function checkCPUs() {
  try {
    console.log('\n🔍 Checking CPU Products...\n');
    
    // Check total CPU count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM pc_parts 
      WHERE category = 'CPU'
    `);
    
    console.log(`Total CPU Products: ${countResult.rows[0].total}`);
    
    if (countResult.rows[0].total === '0') {
      console.log('\n❌ NO CPU PRODUCTS FOUND!\n');
      
      // Check what categories exist
      const categoriesResult = await pool.query(`
        SELECT DISTINCT category, COUNT(*) as count
        FROM pc_parts
        GROUP BY category
        ORDER BY count DESC
      `);
      
      console.log('Available categories:');
      categoriesResult.rows.forEach(row => {
        console.log(`  - ${row.category}: ${row.count} products`);
      });
      
    } else {
      // Show some CPUs
      const cpusResult = await pool.query(`
        SELECT name, price, category
        FROM pc_parts
        WHERE category = 'CPU'
        ORDER BY price ASC
        LIMIT 10
      `);
      
      console.log('\n✅ Sample CPU Products:\n');
      cpusResult.rows.forEach((cpu, i) => {
        console.log(`${i + 1}. ${cpu.name} - ₱${parseFloat(cpu.price).toLocaleString()}`);
      });
      
      // Check price range for our test product
      const targetPrice = 4403.7;
      const minPrice = targetPrice * 0.8;
      const maxPrice = targetPrice * 1.2;
      
      const rangeResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM pc_parts
        WHERE category = 'CPU' 
          AND price BETWEEN $1 AND $2
      `, [minPrice, maxPrice]);
      
      console.log(`\n📊 CPUs in ₱${minPrice.toLocaleString()} - ₱${maxPrice.toLocaleString()}: ${rangeResult.rows[0].total}`);
      console.log('\n✅ Future Upgrade should work!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCPUs();
