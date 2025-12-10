/**
 * K-Wise Comprehensive System Test
 * Tests all major API endpoints and functionality
 */

const axios = require('axios');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const BASE_URL = 'http://localhost:5000';
let authToken = null;

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}`)
};

const tests = {
  passed: 0,
  failed: 0,
  skipped: 0,
  results: []
};

async function test(name, fn) {
  try {
    await fn();
    tests.passed++;
    tests.results.push({ name, status: 'PASSED' });
    log.success(`${name}`);
  } catch (error) {
    tests.failed++;
    tests.results.push({ name, status: 'FAILED', error: error.message });
    log.error(`${name}: ${error.message}`);
  }
}

async function skip(name, reason) {
  tests.skipped++;
  tests.results.push({ name, status: 'SKIPPED', reason });
  log.warning(`${name}: ${reason}`);
}

// Authentication Tests
async function testAuth() {
  log.header('🔐 AUTHENTICATION TESTS');

  await test('Server Health Check', async () => {
    const res = await axios.get(`${BASE_URL}/health`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  await test('Login with Admin Credentials', async () => {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@kwise.com',
      password: 'admin123'
    });
    if (!res.data.token) throw new Error('No token received');
    authToken = res.data.token;
  });
}

// Stock/Product Tests
async function testStock() {
  log.header('📦 STOCK & PRODUCT TESTS');

  const headers = { Authorization: `Bearer ${authToken}` };

  await test('Get All Categories', async () => {
    const res = await axios.get(`${BASE_URL}/api/stock/categories`);
    if (!Array.isArray(res.data.data)) throw new Error('Expected array of categories');
  });

  await test('Get CPU Products', async () => {
    const res = await axios.get(`${BASE_URL}/api/stock/category/CPU`);
    if (!Array.isArray(res.data.data)) throw new Error('Expected array of products');
  });

  await test('Search Products', async () => {
    const res = await axios.get(`${BASE_URL}/api/search?q=intel`);
    if (!res.data.success) throw new Error('Search failed');
  });
}

// Analytics Tests
async function testAnalytics() {
  log.header('📊 ANALYTICS TESTS');

  const headers = { Authorization: `Bearer ${authToken}` };

  await test('Get Revenue Trends', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/analytics/revenue-trends?period=daily&limit=30`, { headers });
    if (!res.data.success) throw new Error('Failed to fetch revenue trends');
  });

  await test('Get Top Products', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/analytics/top-products?limit=10`, { headers });
    if (!res.data.success) throw new Error('Failed to fetch top products');
  });

  await test('Get Category Performance', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/analytics/category-performance`, { headers });
    if (!res.data.success) throw new Error('Failed to fetch category performance');
  });

  await test('Get Order Status Distribution', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/analytics/order-status`, { headers });
    if (!res.data.success) throw new Error('Failed to fetch order status');
  });

  await test('Get Customer Insights', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/analytics/customer-insights`, { headers });
    if (!res.data.success) throw new Error('Failed to fetch customer insights');
  });

  await test('Get Order Patterns', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/analytics/order-patterns`, { headers });
    if (!res.data.success) throw new Error('Failed to fetch order patterns');
  });
}

// AI Tests
async function testAI() {
  log.header('🤖 AI INTEGRATION TESTS');

  const headers = { Authorization: `Bearer ${authToken}` };

  await test('AI Smart Search', async () => {
    const res = await axios.post(`${BASE_URL}/api/search/ai-enhanced`, {
      query: 'gaming pc under 50000',
      filters: {},
      userContext: {}
    }, { headers });
    if (!res.data.success) throw new Error('AI search failed');
  });

  await test('AI Business Insights', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/ai-analytics/business-insights`, { headers });
    if (!res.data.success) throw new Error('Failed to generate business insights');
  });

  await test('AI Inventory Predictions', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/ai-analytics/inventory-predictions`, { headers });
    if (!res.data.success) throw new Error('Failed to predict inventory needs');
  });

  await test('AI Customer Behavior', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/ai-analytics/customer-behavior`, { headers });
    if (!res.data.success) throw new Error('Failed to analyze customer behavior');
  });
}

// Builder Tests
async function testBuilder() {
  log.header('🔧 PC BUILDER TESTS');

  const headers = { Authorization: `Bearer ${authToken}` };

  await test('Get Compatible CPUs', async () => {
    const res = await axios.get(`${BASE_URL}/api/builder/components?category=CPU`, { headers });
    if (!Array.isArray(res.data.data)) throw new Error('Expected array of CPUs');
  });

  await test('Check Compatibility', async () => {
    const res = await axios.post(`${BASE_URL}/api/builder/check-compatibility`, {
      cpu: 1,
      motherboard: 2
    }, { headers });
    if (!res.data.hasOwnProperty('compatible')) throw new Error('Expected compatibility result');
  });
}

// Order Tests
async function testOrders() {
  log.header('🛒 ORDER MANAGEMENT TESTS');

  const headers = { Authorization: `Bearer ${authToken}` };

  await test('Get All Orders', async () => {
    const res = await axios.get(`${BASE_URL}/api/orders`, { headers });
    if (!Array.isArray(res.data.data)) throw new Error('Expected array of orders');
  });

  await test('Get Order Queue', async () => {
    const res = await axios.get(`${BASE_URL}/api/queue/current?status=pending`, { headers });
    if (!res.data.success) throw new Error('Failed to fetch order queue');
  });

  await test('Get Order Statistics', async () => {
    const res = await axios.get(`${BASE_URL}/api/orders/stats`, { headers });
    if (!res.data.success) throw new Error('Failed to fetch order stats');
  });
}

// Admin Tests
async function testAdmin() {
  log.header('👥 ADMIN PANEL TESTS');

  const headers = { Authorization: `Bearer ${authToken}` };

  await test('Get Dashboard Stats', async () => {
    const res = await axios.get(`${BASE_URL}/api/admin/dashboard/stats`, { headers });
    if (!res.data.success) throw new Error('Failed to fetch dashboard stats');
  });

  await test('Get Recent Orders', async () => {
    const res = await axios.get(`${BASE_URL}/api/orders/recent?limit=5`, { headers });
    if (!res.data.success) throw new Error('Failed to fetch recent orders');
  });

  await test('Get Audit Logs', async () => {
    const res = await axios.get(`${BASE_URL}/api/logs?page=1&limit=10`, { headers });
    if (!Array.isArray(res.data.data)) throw new Error('Expected array of audit logs');
  });
}

// Generate Report
function generateReport() {
  log.header('📋 TEST SUMMARY REPORT');

  const total = tests.passed + tests.failed + tests.skipped;
  const passRate = total > 0 ? ((tests.passed / total) * 100).toFixed(2) : 0;

  console.log(`\nTotal Tests: ${total}`);
  log.success(`Passed: ${tests.passed}`);
  log.error(`Failed: ${tests.failed}`);
  log.warning(`Skipped: ${tests.skipped}`);
  console.log(`\nPass Rate: ${passRate}%\n`);

  if (tests.failed > 0) {
    log.header('❌ FAILED TESTS');
    tests.results.filter(r => r.status === 'FAILED').forEach(r => {
      console.log(`  - ${r.name}`);
      console.log(`    Error: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');

  if (tests.failed === 0 && tests.passed > 0) {
    log.success('🎉 ALL TESTS PASSED!');
  } else if (tests.failed > 0) {
    log.error('Some tests failed. Please review the errors above.');
  } else {
    log.warning('No tests were run.');
  }

  console.log('');

  // Save detailed report
  const fs = require('fs');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed: tests.passed,
      failed: tests.failed,
      skipped: tests.skipped,
      passRate: `${passRate}%`
    },
    results: tests.results
  };

  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  log.info('Detailed report saved to: test-report.json');
}

// Main execution
async function runTests() {
  console.log('\n🚀 K-WISE COMPREHENSIVE SYSTEM TEST\n');
  console.log('Testing against:', BASE_URL);
  console.log('Started:', new Date().toISOString());
  console.log('');

  try {
    await testAuth();
    await testStock();
    await testAnalytics();
    await testAI();
    await testBuilder();
    await testOrders();
    await testAdmin();
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
  }

  generateReport();
  process.exit(tests.failed > 0 ? 1 : 0);
}

// Run it!
runTests();
