const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function checkStarterBuildA() {
  try {
    console.log('\n🔍 Checking Starter Build A Components...\n');
    
    const result = await pool.query(`
      SELECT id, name, specifications
      FROM pc_parts
      WHERE category = 'Pre-Built' AND name = 'Starter Build A'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Starter Build A not found!');
      return;
    }
    
    const product = result.rows[0];
    const specs = product.specifications;
    
    console.log(`Product: ${product.name} (ID: ${product.id})`);
    console.log(`\nComponents in database (${specs.components?.length || 0}):`);
    
    if (specs.components && Array.isArray(specs.components)) {
      specs.components.forEach((comp, idx) => {
        console.log(`\n${idx + 1}. ${comp.name}:`);
        console.log(`   Value: ${comp.value || '(empty)'}`);
        console.log(`   Part ID: ${comp.part_id || '(missing)'}`);
        console.log(`   Price: ${comp.price || 0}`);
      });
      
      // Check which components exist
      const componentNames = specs.components.map(c => c.name.toUpperCase());
      console.log(`\n📋 Component Summary:`);
      console.log(`   CPU: ${componentNames.includes('CPU') ? '✅' : '❌'}`);
      console.log(`   Motherboard: ${componentNames.includes('MOTHERBOARD') ? '✅' : '❌'}`);
      console.log(`   RAM: ${componentNames.includes('RAM') ? '✅' : '❌'}`);
      console.log(`   Storage: ${componentNames.includes('STORAGE') ? '✅' : '❌'}`);
      console.log(`   GPU: ${componentNames.includes('GPU') ? '✅' : '❌'}`);
      console.log(`   PSU: ${componentNames.includes('PSU') ? '✅' : '❌'}`);
      console.log(`   Case: ${componentNames.includes('CASE') ? '✅' : '❌'}`);
      console.log(`   Cooling: ${componentNames.includes('COOLING') ? '✅' : '❌'}`);
      
      // Check for GPU specifically
      const gpuComp = specs.components.find(c => c.name.toUpperCase() === 'GPU');
      if (gpuComp) {
        console.log(`\n🎮 GPU Component Details:`);
        console.log(`   Value: "${gpuComp.value}"`);
        console.log(`   Is Empty: ${!gpuComp.value || gpuComp.value.trim() === ''}`);
        console.log(`   Should Show "Add GPU" button: ${!gpuComp.value || gpuComp.value.trim() === '' ? 'YES' : 'NO'}`);
      } else {
        console.log(`\n🎮 GPU Component: NOT IN DATABASE`);
        console.log(`   Should Show "Add GPU" button: YES`);
      }
    } else {
      console.log('❌ No components array found in specifications!');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStarterBuildA();
