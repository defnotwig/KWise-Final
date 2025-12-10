const PCCustomizedAIBuildGenerator = require('../services/pcCustomizedAIBuildGenerator');

(async () => {
  try {
    console.log('🚀 Starting PC Customized AI build generation...\n');
    const start = Date.now();
    
    const result = await PCCustomizedAIBuildGenerator.generateAllBuilds();
    
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    
    console.log(`\n✅ Completed in ${duration}s`);
    console.log(`📊 Total Builds: ${result.totalBuildsGenerated}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.error || JSON.stringify(err)}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
