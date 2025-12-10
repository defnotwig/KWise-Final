const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

async function analyzeActualCoolers() {
  try {
    const res = await pool.query(`
      SELECT name, 
             COALESCE(specifications->>'Height', specifications->>'height', specifications->>'Cooler Height', 'MISSING') as height
      FROM pc_parts 
      WHERE category = 'Cooling' 
        AND stock > 0 
        AND (name LIKE '%COOLER%' OR name LIKE '%AIO%' OR name LIKE '%GAMMAX%' OR name LIKE '%WRAITH%')
      ORDER BY name 
      LIMIT 30
    `);
    
    console.log('🌡️ ACTUAL CPU COOLERS (not fans):');
    res.rows.forEach(r => {
      const icon = r.height !== 'MISSING' ? '✅' : '❌';
      console.log(`  ${icon} ${r.name}: ${r.height}`);
    });
    
    const missing = res.rows.filter(r => r.height === 'MISSING');
    const total = res.rows.length;
    const pct = ((total - missing.length) / total * 100).toFixed(1);
    
    console.log(`\n📊 Summary: ${total - missing.length}/${total} coolers have height specs (${pct}%)`);
    console.log(`❌ Missing: ${missing.length} coolers need height added\n`);
    
    if (missing.length > 0) {
      console.log('Missing coolers:');
      missing.forEach(r => console.log(`  - ${r.name}`));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeActualCoolers();
