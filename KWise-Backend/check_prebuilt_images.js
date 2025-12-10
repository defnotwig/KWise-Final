const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function checkPreBuiltImages() {
  try {
    console.log('\n🔍 Checking Pre-Built Products Image URLs...\n');
    
    const result = await pool.query(`
      SELECT id, name, tier, image_url
      FROM pc_parts
      WHERE category = 'Pre-Built'
      ORDER BY tier, name
    `);
    
    console.log(`Found ${result.rows.length} Pre-Built products:\n`);
    
    result.rows.forEach(product => {
      console.log(`${product.tier.padEnd(15)} | ${product.name.padEnd(20)} | ${product.image_url}`);
    });
    
    // Check if image URLs start with /assets/
    const correctUrls = result.rows.filter(p => p.image_url && p.image_url.startsWith('/assets/'));
    const incorrectUrls = result.rows.filter(p => !p.image_url || !p.image_url.startsWith('/assets/'));
    
    console.log(`\n✅ Correct URLs (start with /assets/): ${correctUrls.length}`);
    console.log(`❌ Incorrect URLs: ${incorrectUrls.length}`);
    
    if (incorrectUrls.length > 0) {
      console.log('\n❌ Products with incorrect image URLs:');
      incorrectUrls.forEach(p => {
        console.log(`  - ${p.name}: "${p.image_url}"`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPreBuiltImages();
