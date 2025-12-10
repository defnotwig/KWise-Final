/**
 * Test script to identify undefined route handlers
 */

const fs = require('fs');
const path = require('path');

// Test all route files for undefined handlers
const routeFiles = [
  './routes/adminFeedback.js',
  './routes/feedback.js',
  './routes/pcUpgrade.js',
  './routes/prebuilt.js',
  './routes/orders.js',
  './routes/queue.js',
  './ai/routes/aiRoutes.js'
];

console.log('🔍 Testing route handlers for undefined methods...\n');

routeFiles.forEach(routeFile => {
  try {
    console.log(`\n📄 Testing ${routeFile}...`);
    const routes = require(routeFile);
    console.log(`  ✅ ${routeFile} loaded successfully`);
  } catch (error) {
    console.error(`  ❌ ${routeFile} FAILED:`, error.message);
    console.error(`     Stack:`, error.stack);
  }
});

// Test specific controllers
console.log('\n\n🎯 Testing Controllers...\n');

try {
  console.log('Testing adminFeedbackController...');
  const adminFeedbackController = require('./controllers/adminFeedbackController');
  const methods = ['submitCorrection', 'getPendingSuggestions', 'getFeedbackStats', 'getMonthlyStats', 'assignSuggestion', 'approveSuggestion'];
  methods.forEach(method => {
    if (typeof adminFeedbackController[method] !== 'function') {
      console.error(`  ❌ ${method} is NOT a function! Type: ${typeof adminFeedbackController[method]}`);
    } else {
      console.log(`  ✅ ${method} exists`);
    }
  });
} catch (error) {
  console.error('  ❌ adminFeedbackController failed:', error.message);
}

try {
  console.log('\nTesting aiController...');
  const aiController = require('./ai/controllers/aiController');
  const methods = ['validateBuildComprehensive', 'getHotPicks', 'getValueForMoney'];
  methods.forEach(method => {
    if (typeof aiController[method] !== 'function') {
      console.error(`  ❌ ${method} is NOT a function! Type: ${typeof aiController[method]}`);
    } else {
      console.log(`  ✅ ${method} exists`);
    }
  });
} catch (error) {
  console.error('  ❌ aiController failed:', error.message);
}

console.log('\n✅ Test complete!');
