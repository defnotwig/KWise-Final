const { query } = require('./config/db');

async function debugPreBuilt() {
  try {
    console.log('🔍 Querying Starter Build A from database...\n');
    
    // First, check what columns exist
    const columns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Available columns in pc_parts table:\n');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Query Starter Build A with only known columns
    const result = await query(`
      SELECT *
      FROM pc_parts 
      WHERE category = 'Pre-Built' AND tier = 'Starter'
      ORDER BY id 
      LIMIT 1
    `);
    
    console.log('\n\n✅ Found', result.rows.length, 'Starter builds\n');
    
    if (result.rows.length > 0) {
      const build = result.rows[0];
      console.log('📦 Starter Build A Data:\n');
      console.log(JSON.stringify(build, null, 2));
    }
    
    // Query all tier builds to check images
    console.log('\n\n🔍 Checking all tier builds for image paths...\n');
    const allBuilds = await query(`
      SELECT id, name, tier, category, image_url
      FROM pc_parts 
      WHERE category = 'Pre-Built'
      ORDER BY 
        CASE tier
          WHEN 'Starter' THEN 1
          WHEN 'Mid Tier' THEN 2
          WHEN 'High Tier' THEN 3
          WHEN 'Elite' THEN 4
          ELSE 5
        END,
        id
    `);
    
    console.log('📊 All Pre-Built products:\n');
    allBuilds.rows.forEach(build => {
      console.log(`[ID ${build.id}] ${build.tier} - ${build.name}: ${build.image_url || 'NO IMAGE'}`);
    });
    
    // Check if images exist in filesystem
    console.log('\n\n🔍 Checking if image files exist...\n');
    const fs = require('fs');
    const path = require('path');
    
    allBuilds.rows.forEach(build => {
      if (build.image_url) {
        // Remove /assets/ prefix and check if file exists
        const imagePath = build.image_url.replace('/assets/', '');
        const fullPath = path.join(__dirname, 'assets', imagePath);
        const exists = fs.existsSync(fullPath);
        console.log(`${exists ? '✅' : '❌'} ${build.name}: ${imagePath} ${exists ? 'EXISTS' : 'NOT FOUND'}`);
        if (!exists) {
          console.log(`     Full path checked: ${fullPath}`);
        }
      } else {
        console.log(`⚠️  ${build.name}: No image_url in database`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit();
  }
}

debugPreBuilt();
