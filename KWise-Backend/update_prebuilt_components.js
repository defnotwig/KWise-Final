const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Component mappings for Starter Build A
const STARTER_BUILD_A_COMPONENTS = [
  { name: 'CPU', value: 'AMD Ryzen 5 4600G (TTP) W/ AMD COOLER', part_id: 29, price: 5495 },
  { name: 'Motherboard', value: 'GIGABYTE A520M-K V2', part_id: 102, price: 3499 },
  { name: 'GPU', value: '', part_id: null, price: 0 },
  { name: 'RAM', value: '16GB T-FORCE DELTA RGB TUF (2x8GB) 3600MHz *BLACK', part_id: 205, price: 2995 },
  { name: 'Storage', value: '512GB TEAMGROUP MP33 PRO', part_id: 310, price: 2699 },
  { name: 'PSU', value: '750W YGT KY-750', part_id: 518, price: 800 },
  { name: 'Case', value: 'KEYTECH ROBIN VIEW', part_id: 604, price: 1480 },
  { name: 'Cooling', value: '', part_id: null, price: 0 }
];

async function updatePreBuiltComponents() {
  try {
    console.log('\n🔧 Updating Pre-Built Component Part IDs...\n');
    console.log('=' * 70);
    
    // Update Starter Build A
    console.log('\n📦 Updating Starter Build A...');
    
    const starterResult = await pool.query(`
      SELECT id, name, specifications
      FROM pc_parts
      WHERE category = 'Pre-Built' AND name = 'Starter Build A'
    `);
    
    if (starterResult.rows.length === 0) {
      console.log('❌ Starter Build A not found!');
      return;
    }
    
    const product = starterResult.rows[0];
    const specs = product.specifications || {};
    
    // Update components with part_id and prices
    specs.components = STARTER_BUILD_A_COMPONENTS.map(comp => ({
      name: comp.name,
      value: comp.value,
      part_id: comp.part_id,
      part_price: comp.price,
      price: comp.price
    }));
    
    await pool.query(`
      UPDATE pc_parts
      SET specifications = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(specs), product.id]);
    
    console.log('✅ Updated Starter Build A with part_id references');
    console.log(`   Components updated: ${specs.components.length}`);
    specs.components.forEach(comp => {
      if (comp.part_id) {
        console.log(`   ✅ ${comp.name}: ID ${comp.part_id} | ₱${comp.price}`);
      } else {
        console.log(`   ⚪ ${comp.name}: (optional - no part_id)`);
      }
    });
    
    // Note: For other builds (B, C, Mid Tier, High Tier, Elite), we'll need similar mappings
    // Let's at least update them with the structure (keeping existing values but adding null part_ids)
    console.log('\n📦 Updating other Pre-Built products with proper structure...');
    
    const otherBuilds = await pool.query(`
      SELECT id, name, specifications
      FROM pc_parts
      WHERE category = 'Pre-Built' AND name != 'Starter Build A'
      ORDER BY tier, name
    `);
    
    for (const build of otherBuilds.rows) {
      const buildSpecs = build.specifications || {};
      
      if (buildSpecs.components && Array.isArray(buildSpecs.components)) {
        // Ensure each component has the required fields
        buildSpecs.components = buildSpecs.components.map(comp => ({
          name: comp.name || '',
          value: comp.value || '',
          part_id: comp.part_id || null,
          part_price: comp.part_price || comp.price || 0,
          price: comp.price || 0
        }));
        
        await pool.query(`
          UPDATE pc_parts
          SET specifications = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(buildSpecs), build.id]);
        
        console.log(`   ✅ ${build.name}: Updated structure`);
      }
    }
    
    console.log('\n' + '=' * 70);
    console.log('✅ All Pre-Built products updated!');
    console.log('\n📝 Note: Only Starter Build A has accurate part_id mappings.');
    console.log('   Other builds have the correct structure but need manual part_id mapping.');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

updatePreBuiltComponents();
