const { query } = require('../config/db');

(async () => {
  const r = await query(`
    SELECT name, min_budget, max_budget, representative_budget 
    FROM pc_customized_budget_ranges 
    WHERE is_active = true 
    ORDER BY sort_order
  `);
  
  console.log('💰 Budget Range Configuration:\n');
  r.rows.forEach(b => {
    console.log(`${b.name}:`);
    console.log(`  Min: ₱${b.min_budget || 'NULL'}`);
    console.log(`  Max: ₱${b.max_budget || 'NULL (unlimited)'}`);
    console.log(`  Representative: ₱${b.representative_budget || 'NULL'}`);
    console.log('');
  });
  
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
