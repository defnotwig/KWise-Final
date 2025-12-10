const { query } = require('./config/db');

(async () => {
  try {
    console.log('🔍 Checking available stock categories...');
    
    const result = await query(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM pc_parts 
      WHERE is_active = true 
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log('\n📦 Available stock categories:');
    result.rows.forEach(row => {
      console.log(`- ${row.category}: ${row.count} items`);
    });
    
    console.log('\n🔥 Checking Cooling category products:');
    const coolingResult = await query(`
      SELECT name, brand, price, specifications 
      FROM pc_parts 
      WHERE category = 'Cooling' AND is_active = true 
      ORDER BY price DESC 
      LIMIT 10
    `);
    
    console.log('Top Cooling products in stock:');
    coolingResult.rows.forEach(row => {
      console.log(`- ${row.name} - ${row.brand} - ₱${row.price}`);
    });
    
    console.log('\n🎮 Checking GPU category (for high-end upgrades):');
    const gpuResult = await query(`
      SELECT name, brand, price 
      FROM pc_parts 
      WHERE category = 'GPU' AND is_active = true 
      ORDER BY price DESC 
      LIMIT 5
    `);
    
    console.log('Top GPUs in stock:');
    gpuResult.rows.forEach(row => {
      console.log(`- ${row.name} - ${row.brand} - ₱${row.price}`);
    });
    
    console.log('\n✅ Database analysis complete');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
    process.exit(1);
  }
})();