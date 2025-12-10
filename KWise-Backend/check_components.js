const { query } = require('./config/db');

async function checkComponents() {
  try {
    const result = await query(`
      SELECT id, name, tier, specifications
      FROM pc_parts
      WHERE category = 'Pre-Built' AND tier = 'Starter'
      ORDER BY id
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const build = result.rows[0];
      console.log('\n📦 Build:', build.name);
      console.log('🏷️  Tier:', build.tier);
      console.log('\n🔧 Components:\n');
      
      if (build.specifications && build.specifications.components) {
        build.specifications.components.forEach((comp, idx) => {
          console.log(`  ${idx + 1}. ${comp.name}: ${comp.value}`);
        });
      } else {
        console.log('  ⚠️  No components found in specifications');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkComponents();
