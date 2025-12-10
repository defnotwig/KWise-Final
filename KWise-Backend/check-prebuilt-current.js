const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

async function checkPreBuiltProducts() {
  try {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  CHECKING CURRENT PRE-BUILT PRODUCTS IN DATABASE');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const result = await pool.query(`
      SELECT id, name, price, category, stock, brand, image_url, images, 
             description, specifications
      FROM pc_parts 
      WHERE category = 'Pre-Built' 
      ORDER BY id
    `);

    console.log(`✅ Found ${result.rows.length} Pre-Built products:\n`);

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id} | ${row.name} | ₱${row.price.toLocaleString()} | Stock: ${row.stock}`);
      console.log(`   Brand: ${row.brand}`);
      console.log(`   Image URL: ${row.image_url || 'NO IMAGE'}`);
      console.log(`   Images Array: ${row.images ? row.images.length + ' images' : 'NO IMAGES'}`);
      console.log(`   Description: ${row.description?.substring(0, 50)}...`);
      if (row.specifications) {
        const specs = row.specifications;
        console.log(`   Components: ${specs.totalComponents || 'N/A'}`);
        console.log(`   Matched: ${specs.matchedComponents || 'N/A'}/${specs.totalComponents || 'N/A'}`);
      }
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`  TOTAL PRE-BUILT PRODUCTS: ${result.rows.length} (Expected: 13)`);
    console.log('═══════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPreBuiltProducts();
