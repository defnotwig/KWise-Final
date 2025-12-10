const { query } = require('../config/db');

(async () => {
  try {
    const params = await Promise.all([
      query('SELECT COUNT(*) as c FROM pc_customized_usage_types WHERE is_active=true'),
      query('SELECT COUNT(*) as c FROM pc_customized_budget_ranges WHERE is_active=true'),
      query('SELECT COUNT(*) as c FROM pc_customized_performance_preferences WHERE is_active=true'),
      query('SELECT COUNT(*) as c FROM pc_customized_gaming_preferences WHERE is_active=true'),
      query("SELECT name FROM pc_customized_usage_types WHERE is_active=true AND name='gaming'"),
      query('SELECT COUNT(*) as c FROM pc_customized_ai_reference_builds WHERE is_active=true')
    ]);

    const usage = Number(params[0].rows[0].c);
    const budget = Number(params[1].rows[0].c);
    const perf = Number(params[2].rows[0].c);
    const gaming = Number(params[3].rows[0].c);
    const hasGaming = params[4].rows.length > 0;
    const actual = Number(params[5].rows[0].c);

    console.log('📊 Parameter Counts:');
    console.log('  Usage Types:', usage);
    console.log('  Budget Ranges:', budget);
    console.log('  Performance Prefs:', perf);
    console.log('  Gaming Prefs:', gaming);
    console.log('  Has Gaming Usage:', hasGaming);
    console.log('\n📈 Build Counts:');
    console.log('  Actual Builds:', actual);

    let expected;
    if (hasGaming && gaming > 0) {
      const gamingBuilds = 1 * budget * perf * gaming;
      const nonGamingBuilds = (usage - 1) * budget * perf;
      expected = gamingBuilds + nonGamingBuilds;
      console.log(`  Expected: ${expected} (Gaming: ${gamingBuilds} + Non-Gaming: ${nonGamingBuilds})`);
    } else {
      expected = usage * budget * perf;
      console.log(`  Expected: ${expected}`);
    }

    console.log('\n🎯 Result:', actual >= expected ? '✅ COMPLETE' : '⚠️  INCOMPLETE');
    console.log(`  Difference: ${actual > expected ? '+' : ''}${actual - expected}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
