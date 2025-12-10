/**
 * Route Loading Test Script
 * Identifies which route file has undefined handlers
 */

const express = require('express');
const app = express();

const routes = [
  { name: 'auths', path: './routes/auths' },
  { name: 'users', path: './routes/users' },
  { name: 'stock', path: './routes/stock' },
  { name: 'orders', path: './routes/orders' },
  { name: 'settings', path: './routes/settings' },
  { name: 'dashboard', path: './routes/dashboard' },
  { name: 'logs', path: './routes/logs' },
  { name: 'dev', path: './routes/dev' },
  { name: 'queue', path: './routes/queue' },
  { name: 'health', path: './routes/health' },
  { name: 'audit-logs', path: './routes/audit-logs' },
  { name: 'admin', path: './routes/admin' },
  { name: 'images', path: './routes/images' },
  { name: 'messages', path: './routes/messages' },
  { name: 'notifications', path: './routes/notifications' },
  { name: 'search', path: './routes/search' },
  { name: 'profile', path: './routes/profile' },
  { name: 'builder', path: './routes/builder' },
  { name: 'aiRoutes', path: './ai/routes/aiRoutes' },
  { name: 'pcUpgradeParameters', path: './routes/pcUpgradeParameters' },
  { name: 'pcCustomizedAIBuilds', path: './routes/pcCustomizedAIBuilds' },
  { name: 'referenceBuilds', path: './routes/referenceBuilds' },
  { name: 'aiMetrics', path: './routes/aiMetrics' },
  { name: 'cacheRoutes', path: './routes/cacheRoutes' },
  { name: 'adminFeedback', path: './routes/adminFeedback' },
  { name: 'feedback', path: './routes/feedback' },
  { name: 'priceTracking', path: './routes/priceTracking' },
  { name: 'priceHistory', path: './routes/priceHistory' },
  { name: 'buildHistory', path: './routes/buildHistory' },
  { name: 'compatibilityCache', path: './routes/compatibilityCache' },
  { name: 'userPreferences', path: './routes/userPreferences' },
  { name: 'metrics', path: './routes/metrics' },
  { name: 'systemMetricsRoutes', path: './routes/systemMetricsRoutes' },
  { name: 'ruleBuilderRoutes', path: './routes/ruleBuilderRoutes' },
  { name: 'mlRoutes', path: './ml/routes/mlRoutes' },
  { name: 'trainingRoutes', path: './ai/routes/trainingRoutes' },
  { name: 'promptRoutes', path: './ai/routes/promptRoutes' },
  { name: 'performanceRoutes', path: './ai/routes/performanceRoutes' },
  { name: 'compatibility', path: './routes/compatibility' },
  { name: 'advancedCompatibilityRoutes', path: './routes/advancedCompatibilityRoutes' },
  { name: 'enhancedCompatibility', path: './routes/enhancedCompatibility' },
  { name: 'buildValidation', path: './routes/buildValidation' },
  { name: 'services', path: './routes/services' },
  { name: 'kiosk', path: './routes/kiosk' },
  { name: 'enhanced-kiosk', path: './routes/enhanced-kiosk' },
  { name: 'pcUpgrade', path: './routes/pcUpgrade' },
  { name: 'prebuilt', path: './routes/prebuilt' }
];

async function testRoute(routeInfo) {
  try {
    console.log(`\n🔍 Testing: ${routeInfo.name}`);
    const route = require(routeInfo.path);
    
    // Try to mount it
    const testPath = `/api/test-${routeInfo.name}`;
    app.use(testPath, route);
    
    console.log(`✅ ${routeInfo.name} - OK`);
    return { name: routeInfo.name, status: 'OK' };
  } catch (error) {
    console.error(`❌ ${routeInfo.name} - FAILED`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    return { name: routeInfo.name, status: 'FAILED', error: error.message };
  }
}

async function main() {
  console.log('🚀 Testing all route files for undefined handlers...\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const results = [];
  
  for (const routeInfo of routes) {
    const result = await testRoute(routeInfo);
    results.push(result);
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('\n📊 RESULTS SUMMARY:\n');
  
  const failed = results.filter(r => r.status === 'FAILED');
  const passed = results.filter(r => r.status === 'OK');
  
  console.log(`✅ Passed: ${passed.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);
  
  if (failed.length > 0) {
    console.log('🚨 FAILED ROUTES:');
    failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 All routes loaded successfully!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
