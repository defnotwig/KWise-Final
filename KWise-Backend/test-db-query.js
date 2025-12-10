const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'humbleludwig13',
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB'
});

async function testQuery() {
  try {
    console.log('📊 Querying ALL categories for NULL/empty data...\n');
    
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        category, 
        description,
        specifications
      FROM pc_parts 
      WHERE (description IS NULL OR description = '')
         OR (specifications IS NULL OR specifications::text = '{}')
      ORDER BY category, id
      LIMIT 20
    `);

    console.log(`Found ${result.rows.length} products with NULL/empty data:\n`);
    
    result.rows.forEach((product, idx) => {
      console.log(`\n========== PRODUCT ${idx + 1} ==========`);
      console.log(`ID: ${product.id}`);
      console.log(`Name: ${product.name}`);
      console.log(`Category: ${product.category}`);
      console.log(`Description:`, product.description || '❌ NULL/EMPTY');
      console.log(`Specifications (type):`, typeof product.specifications);
      const specsStr = JSON.stringify(product.specifications);
      console.log(`Specifications (value):`, specsStr === '{}' ? '❌ EMPTY OBJECT' : specsStr);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testQuery();
