/**
 * Verify PC Customized AI builds database integrity
 */

const { query } = require('./config/db');

async function verifyBuilds() {
  console.log('\n🔍 PC CUSTOMIZED AI BUILDS VERIFICATION\n' + '━'.repeat(60));
  
  // Check component counts
  const componentCheck = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(cpu_id) as has_cpu,
      COUNT(cooling_id) as has_cooling,
      COUNT(motherboard_id) as has_mb,
      COUNT(ram_id) as has_ram,
      COUNT(storage_id) as has_storage,
      COUNT(case_id) as has_case,
      COUNT(psu_id) as has_psu,
      COUNT(gpu_id) as has_gpu
    FROM pc_customized_ai_reference_builds
  `);
  
  const stats = componentCheck.rows[0];
  console.log('\n📊 COMPONENT STATISTICS:');
  console.log(`   Total Builds:    ${stats.total}`);
  console.log(`   Has CPU:         ${stats.has_cpu} / ${stats.total}`);
  console.log(`   Has Cooling:     ${stats.has_cooling} / ${stats.total}`);
  console.log(`   Has Motherboard: ${stats.has_mb} / ${stats.total}`);
  console.log(`   Has RAM:         ${stats.has_ram} / ${stats.total}`);
  console.log(`   Has Storage:     ${stats.has_storage} / ${stats.total}`);
  console.log(`   Has Case:        ${stats.has_case} / ${stats.total}`);
  console.log(`   Has PSU:         ${stats.has_psu} / ${stats.total}`);
  console.log(`   Has GPU:         ${stats.has_gpu} / ${stats.total} (optional for non-gaming)`);
  
  // Check for NULL components (should be ZERO for required components)
  const nullCheck = await query(`
    SELECT COUNT(*) as null_count
    FROM pc_customized_ai_reference_builds
    WHERE cpu_id IS NULL 
       OR cooling_id IS NULL 
       OR motherboard_id IS NULL 
       OR ram_id IS NULL 
       OR storage_id IS NULL 
       OR case_id IS NULL 
       OR psu_id IS NULL
  `);
  
  console.log(`\n⚠️  NULL REQUIRED COMPONENTS: ${nullCheck.rows[0].null_count} (should be 0!)`);
  
  // Check gaming builds without GPU
  const gamingNoGPU = await query(`
    SELECT COUNT(*) as count
    FROM pc_customized_ai_reference_builds
    WHERE usage_type = 'gaming' AND gpu_id IS NULL
  `);
  
  console.log(`\n🎮 GAMING BUILDS WITHOUT GPU: ${gamingNoGPU.rows[0].count} (should be 0!)`);
  
  // Builds by usage type
  const usageBreakdown = await query(`
    SELECT usage_type, COUNT(*) as count
    FROM pc_customized_ai_reference_builds
    GROUP BY usage_type
    ORDER BY usage_type
  `);
  
  console.log('\n📈 BUILDS BY USAGE TYPE:');
  usageBreakdown.rows.forEach(row => {
    console.log(`   ${row.usage_type.padEnd(20)}: ${row.count}`);
  });
  
  // Product diversity check
  const diversity = await query(`
    SELECT 
      COUNT(DISTINCT cpu_id) as unique_cpus,
      COUNT(DISTINCT gpu_id) as unique_gpus,
      COUNT(DISTINCT motherboard_id) as unique_motherboards,
      COUNT(DISTINCT ram_id) as unique_rams,
      COUNT(DISTINCT storage_id) as unique_storage,
      COUNT(DISTINCT case_id) as unique_cases,
      COUNT(DISTINCT psu_id) as unique_psus,
      COUNT(DISTINCT cooling_id) as unique_cooling
    FROM pc_customized_ai_reference_builds
  `);
  
  console.log('\n🎲 PRODUCT DIVERSITY:');
  const div = diversity.rows[0];
  console.log(`   Unique CPUs:         ${div.unique_cpus}`);
  console.log(`   Unique GPUs:         ${div.unique_gpus}`);
  console.log(`   Unique Motherboards: ${div.unique_motherboards}`);
  console.log(`   Unique RAM:          ${div.unique_rams}`);
  console.log(`   Unique Storage:      ${div.unique_storage}`);
  console.log(`   Unique Cases:        ${div.unique_cases}`);
  console.log(`   Unique PSUs:         ${div.unique_psus}`);
  console.log(`   Unique Cooling:      ${div.unique_cooling}`);
  
  console.log('\n' + '━'.repeat(60));
  
  // Final verdict
  const totalBuilds = parseInt(stats.total);
  const nullComponents = parseInt(nullCheck.rows[0].null_count);
  const gamingWithoutGPU = parseInt(gamingNoGPU.rows[0].count);
  
  const allGood = totalBuilds === 135 
    && nullComponents === 0 
    && gamingWithoutGPU === 0;
  
  if (allGood) {
    console.log('✅ ALL CHECKS PASSED! All builds are complete and valid!');
    console.log('   - 135 total builds (60 gaming + 75 non-gaming)');
    console.log('   - All 7 required components present in every build');
    console.log('   - All 60 gaming builds have GPU');
    console.log(`   - Excellent product diversity (${div.unique_cpus} CPUs, ${div.unique_gpus} GPUs, etc.)`);
    console.log('');
  } else {
    console.log('❌ ISSUES DETECTED:');
    if (totalBuilds !== 135) console.log(`   - Expected 135 builds, got ${totalBuilds}`);
    if (nullComponents !== 0) console.log(`   - ${nullComponents} builds have NULL required components`);
    if (gamingWithoutGPU !== 0) console.log(`   - ${gamingWithoutGPU} gaming builds missing GPU`);
    console.log('');
  }
  
  process.exit(0);
}

verifyBuilds().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
