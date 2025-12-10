const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function analyzeDatabase() {
  try {
    console.log('🔍 ANALYZING DATABASE FOR PC UPGRADE REFERENCE BUILDS\n');
    
    // 1. Get all categories and their counts
    const categoriesResult = await pool.query(`
      SELECT category, COUNT(*) as count, 
             AVG(price) as avg_price,
             MIN(price) as min_price,
             MAX(price) as max_price
      FROM pc_parts 
      WHERE is_active = true AND kiosk_visible = true
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log('📊 AVAILABLE PRODUCT CATEGORIES:');
    categoriesResult.rows.forEach(row => {
      console.log(`\n  ${row.category}:`);
      console.log(`    Products: ${row.count}`);
      console.log(`    Price Range: ₱${parseFloat(row.min_price).toLocaleString()} - ₱${parseFloat(row.max_price).toLocaleString()}`);
      console.log(`    Average: ₱${parseFloat(row.avg_price).toLocaleString()}`);
    });
    
    // 2. Get sample products from each category
    console.log('\n\n🎯 SAMPLE PRODUCTS BY CATEGORY:');
    for (const cat of categoriesResult.rows) {
      const samples = await pool.query(`
        SELECT id, name, brand, price 
        FROM pc_parts 
        WHERE category = $1 AND is_active = true AND kiosk_visible = true
        ORDER BY price ASC
        LIMIT 5
      `, [cat.category]);
      
      console.log(`\n  ${cat.category} (Budget Options):`);
      samples.rows.forEach(p => {
        console.log(`    • ${p.brand} ${p.name.substring(0, 50)} - ₱${parseFloat(p.price).toLocaleString()}`);
      });
    }
    
    // 3. Check brands
    const brandsResult = await pool.query(`
      SELECT category, ARRAY_AGG(DISTINCT brand) as brands
      FROM pc_parts 
      WHERE is_active = true AND kiosk_visible = true AND brand IS NOT NULL
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log('\n\n🏷️ AVAILABLE BRANDS BY CATEGORY:');
    brandsResult.rows.forEach(row => {
      console.log(`\n  ${row.category}:`);
      console.log(`    ${row.brands.slice(0, 10).join(', ')}${row.brands.length > 10 ? '...' : ''}`);
    });
    
    await pool.end();
    console.log('\n\n✅ Database analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

analyzeDatabase();
