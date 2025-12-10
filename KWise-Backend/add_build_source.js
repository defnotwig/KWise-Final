const { query } = require('./config/db');

async function addBuildSource() {
  try {
    console.log('🔧 Adding buildSource to Pre-Built specifications...\n');
    
    // Get all Pre-Built products
    const products = await query(`
      SELECT id, name, tier, specifications
      FROM pc_parts
      WHERE category = 'Pre-Built'
      ORDER BY id
    `);
    
    console.log(`Found ${products.rows.length} Pre-Built products\n`);
    
    for (const product of products.rows) {
      const specs = product.specifications || {};
      
      // Add buildSource if missing
      if (!specs.buildSource) {
        specs.buildSource = 'preset';
        
        await query(`
          UPDATE pc_parts
          SET specifications = $1
          WHERE id = $2
        `, [JSON.stringify(specs), product.id]);
        
        console.log(`✅ Added buildSource='preset' to ${product.name}`);
      } else {
        console.log(`ℹ️  ${product.name} already has buildSource: ${specs.buildSource}`);
      }
    }
    
    console.log('\n✅ All Pre-Built products now have buildSource');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit();
  }
}

addBuildSource();
