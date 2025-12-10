require('dotenv').config();
const { pool, query } = require('./config/db');

(async () => {
  try {
    console.log('🔧 Fixing remaining 3 motherboards...\n');
    
    const missing = [
      { name: 'ASUS ROG MAXIMUS Z890 HERO', sata: 6, chipset: 'Z890' },
      { name: 'Gigabyte H810M K', sata: 4, chipset: 'H810' },
      { name: 'MSI MAG B860 TOMAHAWK WIFI', sata: 4, chipset: 'B860' }
    ];
    
    for (const mb of missing) {
      const result = await query(
        `UPDATE pc_parts 
         SET specifications = specifications || $1::jsonb
         WHERE name = $2 AND category = 'Motherboard'
         RETURNING name`,
        [JSON.stringify({ 'SATA Ports': mb.sata.toString() }), mb.name]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ ${mb.name} → ${mb.sata} SATA ports (${mb.chipset})`);
      } else {
        console.log(`⚠️  ${mb.name} - not found in database`);
      }
    }
    
    console.log('\n✅ All missing SATA values fixed');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
