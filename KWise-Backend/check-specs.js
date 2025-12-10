const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

async function checkSpecifications() {
  try {
    console.log('🔍 Analyzing component specifications...\n');

    // Check CPU Coolers for height
    const coolers = await pool.query(`
      SELECT id, name, specifications->>'Height' as height, 
             specifications->>'height' as height_lower,
             specifications->>'cooler_height' as cooler_height,
             specifications->>'Cooler Height' as cooler_height_title
      FROM pc_parts 
      WHERE category = 'Cooling' AND stock > 0
      LIMIT 10
    `);
    
    console.log('🌡️ CPU COOLERS (height specs):');
    coolers.rows.forEach(row => {
      const hasHeight = row.height || row.height_lower || row.cooler_height || row.cooler_height_title;
      console.log(`  ${hasHeight ? '✅' : '❌'} ${row.name}: ${hasHeight || 'MISSING'}`);
    });

    // Check Graphics Cards for length
    const gpus = await pool.query(`
      SELECT id, name, specifications->>'Length' as length,
             specifications->>'length' as length_lower,
             specifications->>'gpu_length' as gpu_length,
             specifications->>'Card Length' as card_length
      FROM pc_parts 
      WHERE category = 'GPU' AND stock > 0
      LIMIT 10
    `);
    
    console.log('\n🎮 GRAPHICS CARDS (length specs):');
    gpus.rows.forEach(row => {
      const hasLength = row.length || row.length_lower || row.gpu_length || row.card_length;
      console.log(`  ${hasLength ? '✅' : '❌'} ${row.name}: ${hasLength || 'MISSING'}`);
    });

    // Check PC Cases for max GPU length and cooler height
    const cases = await pool.query(`
      SELECT id, name, 
             specifications->>'Max Gpu Length' as max_gpu,
             specifications->>'max_gpu_length_mm' as max_gpu_mm,
             specifications->>'Max Cpu Cooler Height' as max_cooler,
             specifications->>'max_cooler_height_mm' as max_cooler_mm,
             specifications->>'Max Graphics Card Length' as max_gfx,
             specifications->>'Max CPU Cooler Height' as max_cpu_cooler
      FROM pc_parts 
      WHERE category = 'Case' AND stock > 0
      LIMIT 10
    `);
    
    console.log('\n🖥️ PC CASES (max clearance specs):');
    cases.rows.forEach(row => {
      const hasGPU = row.max_gpu || row.max_gpu_mm || row.max_gfx;
      const hasCooler = row.max_cooler || row.max_cooler_mm || row.max_cpu_cooler;
      console.log(`  ${hasGPU ? '✅' : '❌'} GPU: ${hasGPU || 'MISSING'} | ${hasCooler ? '✅' : '❌'} Cooler: ${hasCooler || 'MISSING'} - ${row.name}`);
    });

    // Check Motherboards for M.2 and SATA
    const motherboards = await pool.query(`
      SELECT id, name,
             specifications->>'M2 Slots' as m2_slots,
             specifications->>'m2_slots' as m2_lower,
             specifications->>'SATA Ports' as sata_ports,
             specifications->>'sata_ports' as sata_lower
      FROM pc_parts 
      WHERE category = 'Motherboard' AND stock > 0
      LIMIT 10
    `);
    
    console.log('\n🔌 MOTHERBOARDS (M.2 & SATA specs):');
    motherboards.rows.forEach(row => {
      const hasM2 = row.m2_slots || row.m2_lower;
      const hasSATA = row.sata_ports || row.sata_lower;
      console.log(`  M.2: ${hasM2 ? '✅ ' + hasM2 : '❌ MISSING'} | SATA: ${hasSATA ? '✅ ' + hasSATA : '❌ MISSING'} - ${row.name}`);
    });

    // Summary counts
    const summary = await pool.query(`
      SELECT 
        category,
        COUNT(*) as total,
        SUM(CASE WHEN specifications IS NULL OR specifications = '{}' THEN 1 ELSE 0 END) as missing_all_specs
      FROM pc_parts
      WHERE category IN ('Cooling', 'GPU', 'Case', 'Motherboard') 
        AND stock > 0
      GROUP BY category
      ORDER BY category
    `);

    console.log('\n📊 SUMMARY:');
    summary.rows.forEach(row => {
      const pct = ((row.total - row.missing_all_specs) / row.total * 100).toFixed(1);
      console.log(`  ${row.category}: ${row.total} total, ${row.missing_all_specs} missing specs (${pct}% have specs)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSpecifications();
