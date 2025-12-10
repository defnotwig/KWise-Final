const { query } = require('../config/db');

(async () => {
  try {
    console.log('🔍 Checking Price Tier Compliance...\n');

    const result = await query(`
      SELECT 
        b.build_key,
        b.usage_type,
        b.budget_range,
        b.total_price,
        br.min_budget,
        br.max_budget,
        CASE 
          WHEN b.total_price < br.min_budget THEN 'BELOW'
          WHEN b.total_price > br.max_budget THEN 'ABOVE'
          ELSE 'OK'
        END as compliance
      FROM pc_customized_ai_reference_builds b
      JOIN pc_customized_budget_ranges br ON b.budget_range = br.name
      WHERE b.is_active = true
      ORDER BY compliance DESC, b.budget_range, b.build_key
    `);

    const builds = result.rows;
    const violations = builds.filter(b => b.compliance !== 'OK');
    const compliant = builds.filter(b => b.compliance === 'OK');

    console.log(`📊 Total Builds: ${builds.length}`);
    console.log(`✅ Compliant: ${compliant.length}`);
    console.log(`❌ Out of Range: ${violations.length}\n`);

    if (violations.length > 0) {
      console.log('⚠️  VIOLATIONS:');
      violations.forEach(v => {
        console.log(`  ${v.build_key}`);
        console.log(`    Budget Tier: ₱${v.min_budget} - ₱${v.max_budget}`);
        console.log(`    Actual: ₱${v.total_price} (${v.compliance})`);
        console.log('');
      });
    } else {
      console.log('✅ All builds are within their price tiers!');
    }

    // Check component coverage
    console.log('\n🔧 Checking Component Coverage...\n');
    const coverage = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(cpu_id) as has_cpu,
        COUNT(gpu_id) as has_gpu,
        COUNT(motherboard_id) as has_motherboard,
        COUNT(ram_id) as has_ram,
        COUNT(storage_id) as has_storage,
        COUNT(psu_id) as has_psu,
        COUNT(case_id) as has_case,
        COUNT(cooling_id) as has_cooling
      FROM pc_customized_ai_reference_builds
      WHERE is_active = true
    `);

    const c = coverage.rows[0];
    console.log(`Total Builds: ${c.total}`);
    console.log(`CPU: ${c.has_cpu}/${c.total}`);
    console.log(`GPU: ${c.has_gpu}/${c.total}`);
    console.log(`Motherboard: ${c.has_motherboard}/${c.total}`);
    console.log(`RAM: ${c.has_ram}/${c.total}`);
    console.log(`Storage: ${c.has_storage}/${c.total}`);
    console.log(`PSU: ${c.has_psu}/${c.total}`);
    console.log(`Case: ${c.has_case}/${c.total}`);
    console.log(`Cooling: ${c.has_cooling}/${c.total}`);

    const allComplete = Object.entries(c).filter(([k, v]) => k !== 'total').every(([k, v]) => Number(v) === Number(c.total));
    console.log(allComplete ? '\n✅ All builds have all 8 required components!' : '\n⚠️  Some builds are missing components!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
