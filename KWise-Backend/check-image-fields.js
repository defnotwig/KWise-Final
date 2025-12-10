const {Pool} = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

async function checkImageFields() {
  try {
    console.log('🔍 Checking image fields in database...\n');
    
    // Check sample products
    const result = await pool.query(`
      SELECT id, name, category, image_url, image_path, 
             COALESCE(image_url, image_path) as resolved_image
      FROM pc_parts 
      WHERE category IN ('CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'Cooling', 'Case', 'PSU')
        AND is_active = true
      ORDER BY category, id
      LIMIT 16
    `);
    
    console.log('Sample Products:\n');
    console.table(result.rows);
    
    // Check if all active products have images
    const statsResult = await pool.query(`
      SELECT 
        category,
        COUNT(*) as total,
        COUNT(image_url) as has_image_url,
        COUNT(image_path) as has_image_path,
        COUNT(COALESCE(image_url, image_path)) as has_any_image
      FROM pc_parts
      WHERE is_active = true
      GROUP BY category
      ORDER BY category
    `);
    
    console.log('\n\nImage Coverage by Category:\n');
    console.table(statsResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkImageFields();
