const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function verifyPreBuiltData() {
  try {
    console.log('\n🔍 COMPREHENSIVE PRE-BUILT DATA VERIFICATION\n');
    console.log('='.repeat(70));
    
    // 1. Check total Pre-Built products
    const totalResult = await pool.query(`
      SELECT COUNT(*) as total FROM pc_parts WHERE category = 'Pre-Built'
    `);
    console.log(`\n✅ Total Pre-Built Products: ${totalResult.rows[0].total}`);
    
    // 2. Check by tier
    const tierResult = await pool.query(`
      SELECT tier, COUNT(*) as count
      FROM pc_parts
      WHERE category = 'Pre-Built'
      GROUP BY tier
      ORDER BY tier
    `);
    console.log('\n📊 Products by Tier:');
    tierResult.rows.forEach(row => {
      console.log(`   ${row.tier.padEnd(15)}: ${row.count} products`);
    });
    
    // 3. Check components for each product
    const componentsResult = await pool.query(`
      SELECT id, name, tier, 
             jsonb_array_length(specifications->'components') as component_count
      FROM pc_parts
      WHERE category = 'Pre-Built'
      ORDER BY tier, name
    `);
    console.log('\n🔧 Component Counts:');
    componentsResult.rows.forEach(row => {
      const status = row.component_count === 8 ? '✅' : '❌';
      console.log(`   ${status} ${row.name.padEnd(22)}: ${row.component_count} components`);
    });
    
    // 4. Check image URLs
    const imageResult = await pool.query(`
      SELECT name, image_url
      FROM pc_parts
      WHERE category = 'Pre-Built'
      ORDER BY tier, name
    `);
    console.log('\n🖼️  Image URLs:');
    imageResult.rows.forEach(row => {
      const status = row.image_url && row.image_url.startsWith('/assets/') ? '✅' : '❌';
      console.log(`   ${status} ${row.name.padEnd(22)}: ${row.image_url}`);
    });
    
    // 5. Check buildSource
    const buildSourceResult = await pool.query(`
      SELECT name, specifications->>'buildSource' as build_source
      FROM pc_parts
      WHERE category = 'Pre-Built'
      ORDER BY tier, name
    `);
    console.log('\n🏗️  Build Source:');
    buildSourceResult.rows.forEach(row => {
      const status = row.build_source === 'preset' ? '✅' : '❌';
      console.log(`   ${status} ${row.name.padEnd(22)}: ${row.build_source || 'NULL'}`);
    });
    
    // 6. Check kiosk visibility
    const visibilityResult = await pool.query(`
      SELECT tier, COUNT(*) as visible_count
      FROM pc_parts
      WHERE category = 'Pre-Built' AND kiosk_visible = true AND is_active = true
      GROUP BY tier
      ORDER BY tier
    `);
    console.log('\n👁️  Kiosk Visible & Active:');
    visibilityResult.rows.forEach(row => {
      console.log(`   ✅ ${row.tier.padEnd(15)}: ${row.visible_count} products`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Verification Complete!\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyPreBuiltData();
