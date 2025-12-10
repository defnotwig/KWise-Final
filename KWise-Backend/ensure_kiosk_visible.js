const { query } = require('./config/db');

async function ensureKioskVisible() {
  try {
    console.log('🔧 Ensuring Pre-Built products are kiosk_visible...\n');
    
    const result = await query(`
      UPDATE pc_parts
      SET kiosk_visible = true
      WHERE category = 'Pre-Built' AND (kiosk_visible = false OR kiosk_visible IS NULL)
      RETURNING id, name, tier
    `);
    
    if (result.rows.length > 0) {
      console.log(`✅ Set kiosk_visible=true for ${result.rows.length} Pre-Built products:`);
      result.rows.forEach(row => {
        console.log(`  - ${row.tier} - ${row.name} (ID: ${row.id})`);
      });
    } else {
      console.log('ℹ️  All Pre-Built products are already kiosk_visible');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

ensureKioskVisible();
