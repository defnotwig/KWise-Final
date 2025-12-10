const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

async function fixPrebuiltImages() {
  try {
    console.log('🔧 Fixing PreBuilt PC image URLs...\n');
    
    // Check current image URLs
    const checkResult = await pool.query(`
      SELECT id, name, image_url 
      FROM prebuilt_pcs 
      WHERE category = 'Starter'
      ORDER BY id
    `);
    
    console.log('📋 Current Image URLs:');
    console.table(checkResult.rows);
    
    // Update image URLs to use /uploads/prebuilt/ path
    const updates = [
      { id: 1, image_url: '/uploads/prebuilt/StarterBuildA.webp' },
      { id: 2, image_url: '/uploads/prebuilt/StarterBuildB.webp' },
      { id: 3, image_url: '/uploads/prebuilt/StarterBuildC.webp' }
    ];
    
    console.log('\n🔄 Updating image URLs...');
    
    for (const update of updates) {
      await pool.query(`
        UPDATE prebuilt_pcs 
        SET image_url = $1
        WHERE id = $2
      `, [update.image_url, update.id]);
      console.log(`✅ Updated ID ${update.id}: ${update.image_url}`);
    }
    
    // Verify updates
    const verifyResult = await pool.query(`
      SELECT id, name, image_url 
      FROM prebuilt_pcs 
      WHERE category = 'Starter'
      ORDER BY id
    `);
    
    console.log('\n📋 Updated Image URLs:');
    console.table(verifyResult.rows);
    
    console.log('\n✅ PreBuilt image URLs fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing image URLs:', error.message);
  } finally {
    await pool.end();
  }
}

fixPrebuiltImages();
