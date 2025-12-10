/**
 * 🔍 Quick Database Check - Verify CPU Products Exist
 * 
 * This script checks if the database has CPU products in the price range
 * that Future Upgrade would query for "AMD RYZEN 3 3200G (BOXED)"
 */

require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkCPUProducts() {
  console.log('\n🔍 CHECKING CPU PRODUCTS IN DATABASE\n');
  console.log('=' .repeat(70));
  
  try {
    // Test product info
    const testProduct = {
      name: 'AMD RYZEN 3 3200G (BOXED)',
      price: 3145.5,
      targetPrice: 3145.5 * 1.4, // 40% upgrade
    };
    
    console.log('\n📦 TEST PRODUCT:');
    console.log(`   Name: ${testProduct.name}`);
    console.log(`   Current Price: ₱${testProduct.price.toLocaleString()}`);
    console.log(`   Target Upgrade Price: ₱${testProduct.targetPrice.toLocaleString()}`);
    
    // Calculate price ranges
    const ranges = [
      { min: testProduct.targetPrice * 0.8, max: testProduct.targetPrice * 1.2, label: 'Attempt 1 (±20%)' },
      { min: testProduct.targetPrice * 0.6, max: testProduct.targetPrice * 1.5, label: 'Attempt 2 (±40-50%)' },
      { min: testProduct.targetPrice * 0.4, max: testProduct.targetPrice * 2.0, label: 'Attempt 3 (±60-100%)' }
    ];
    
    console.log('\n' + '='.repeat(70));
    console.log('\n🎯 QUERY SIMULATION:\n');
    
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      
      console.log(`\n${range.label}:`);
      console.log(`   Price Range: ₱${range.min.toLocaleString()} - ₱${range.max.toLocaleString()}`);
      
      const query = `
        SELECT 
          id,
          name,
          category,
          price,
          status,
          specifications
        FROM pc_parts
        WHERE 
          category = 'CPU'
          AND price BETWEEN $1 AND $2
          AND status = 'active'
        ORDER BY price ASC
        LIMIT 10
      `;
      
      const result = await pool.query(query, [range.min, range.max]);
      
      if (result.rows.length > 0) {
        console.log(`   ✅ Found ${result.rows.length} products:`);
        result.rows.forEach((product, index) => {
          console.log(`      ${index + 1}. ${product.name} - ₱${parseFloat(product.price).toLocaleString()}`);
        });
      } else {
        console.log(`   ⚠️ No products found in this range`);
      }
    }
    
    // Check all CPU products
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 ALL CPU PRODUCTS IN DATABASE:\n');
    
    const allCPUsQuery = `
      SELECT 
        category,
        COUNT(*) as total,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price
      FROM pc_parts
      WHERE category = 'CPU' AND status = 'active'
      GROUP BY category
    `;
    
    const allCPUs = await pool.query(allCPUsQuery);
    
    if (allCPUs.rows.length > 0) {
      const stats = allCPUs.rows[0];
      console.log(`   Total CPUs: ${stats.total}`);
      console.log(`   Price Range: ₱${parseFloat(stats.min_price).toLocaleString()} - ₱${parseFloat(stats.max_price).toLocaleString()}`);
      console.log(`   Average Price: ₱${parseFloat(stats.avg_price).toLocaleString()}`);
    } else {
      console.log('   ❌ No CPU products found in database!');
    }
    
    // Check category variations
    console.log('\n' + '='.repeat(70));
    console.log('\n🔍 CHECKING CATEGORY VARIATIONS:\n');
    
    const categoryCheck = await pool.query(`
      SELECT DISTINCT category 
      FROM pc_parts 
      WHERE LOWER(category) LIKE '%cpu%' 
         OR LOWER(category) LIKE '%processor%'
         OR LOWER(name) LIKE '%ryzen%'
         OR LOWER(name) LIKE '%intel%'
    `);
    
    console.log('   Categories found:');
    categoryCheck.rows.forEach(row => {
      console.log(`      - "${row.category}"`);
    });
    
    // Check if the exact product exists
    console.log('\n' + '='.repeat(70));
    console.log('\n🔎 CHECKING IF TEST PRODUCT EXISTS:\n');
    
    const productCheck = await pool.query(
      `SELECT * FROM pc_parts WHERE LOWER(name) LIKE LOWER($1) LIMIT 5`,
      ['%ryzen%3200%']
    );
    
    if (productCheck.rows.length > 0) {
      console.log('   ✅ Similar products found:');
      productCheck.rows.forEach(product => {
        console.log(`      - ${product.name} (${product.category}) - ₱${parseFloat(product.price).toLocaleString()}`);
      });
    } else {
      console.log('   ⚠️ No Ryzen 3200 products found');
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 SUMMARY:\n');
    
    const totalProducts = await pool.query(`
      SELECT COUNT(*) as total FROM pc_parts WHERE status = 'active'
    `);
    
    const cpuProducts = await pool.query(`
      SELECT COUNT(*) as total FROM pc_parts WHERE category = 'CPU' AND status = 'active'
    `);
    
    console.log(`   Total Active Products: ${totalProducts.rows[0].total}`);
    console.log(`   Total CPU Products: ${cpuProducts.rows[0].total}`);
    console.log(`   CPU Percentage: ${((cpuProducts.rows[0].total / totalProducts.rows[0].total) * 100).toFixed(1)}%`);
    
    if (cpuProducts.rows[0].total === '0') {
      console.log('\n   ❌ ISSUE: No CPU products in database!');
      console.log('   ⚠️ Future Upgrade will not work without CPU products.');
      console.log('   📝 Add CPU products to database or check category naming.');
    } else {
      console.log('\n   ✅ Database has CPU products - Future Upgrade should work!');
    }
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the check
checkCPUProducts().catch(console.error);
