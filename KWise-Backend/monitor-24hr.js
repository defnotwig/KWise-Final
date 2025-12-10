/**
 * 24-Hour AI System Monitoring Script
 * Tracks performance metrics, cache efficiency, and system health
 * Generates detailed reports with trend analysis
 * 
 * Usage: node monitor-24hr.js [duration_hours]
 * Example: node monitor-24hr.js 24  (default: 24 hours)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  BASE_URL: 'http://localhost:5000',
  CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  DURATION_HOURS: parseInt(process.argv[2]) || 24,
  OUTPUT_DIR: './monitoring-reports',
  LOG_FILE: 'monitoring-24hr.json',
  REPORT_FILE: 'monitoring-24hr-report.md'
};

// Metrics storage
const metrics = {
  startTime: null,
  endTime: null,
  checks: [],
  summary: {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    avgResponseTime: 0,
    avgCacheHitRate: 0,
    totalAIRequests: 0,
    totalErrors: 0,
    peakMemoryUsage: 0
  },
  alerts: []
};

/**
 * Fetch AI system metrics from backend
 */
async function fetchMetrics() {
  try {
    const [healthRes, cacheRes, aiLogsRes] = await Promise.all([
      axios.get(`${CONFIG.BASE_URL}/api/health`, { timeout: 10000 }),
      axios.get(`${CONFIG.BASE_URL}/api/cache/stats`, { timeout: 10000 }),
      axios.get(`${CONFIG.BASE_URL}/api/ai/metrics/recent?limit=100`, { timeout: 10000 })
    ]);

    return {
      timestamp: new Date().toISOString(),
      health: healthRes.data,
      cache: cacheRes.data,
      aiLogs: aiLogsRes.data,
      success: true
    };
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      success: false
    };
  }
}

/**
 * Test actual AI endpoints for response time
 */
async function testAIEndpoints() {
  const testCases = [
    {
      name: 'Compatibility Check',
      endpoint: '/api/ai/compatibility',
      data: {
        productId: 1,
        selectedParts: { CPU: 1, GPU: 2 }
      }
    },
    {
      name: 'Upgrade Recommendation',
      endpoint: '/api/ai/recommend-upgrade',
      data: {
        currentBuild: {
          CPU: { id: 1, name: 'AMD RYZEN 5 5600G' },
          GPU: { id: 2, name: '8GB RTX4060 MSI VENTUS' }
        },
        userBudget: 20000,
        usage: 'gaming'
      }
    }
  ];

  const results = [];
  
  for (const test of testCases) {
    const startTime = Date.now();
    try {
      await axios.post(`${CONFIG.BASE_URL}${test.endpoint}`, test.data, {
        timeout: 30000
      });
      results.push({
        name: test.name,
        responseTime: Date.now() - startTime,
        success: true
      });
    } catch (error) {
      results.push({
        name: test.name,
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Analyze metrics and generate alerts
 */
function analyzeMetrics(currentMetrics) {
  const alerts = [];

  // Check cache hit rate
  if (currentMetrics.cache?.hitRate < 50) {
    alerts.push({
      severity: 'WARNING',
      message: `Low cache hit rate: ${currentMetrics.cache.hitRate}%`,
      timestamp: currentMetrics.timestamp
    });
  }

  // Check response times
  const slowEndpoints = currentMetrics.aiTests?.filter(t => t.responseTime > 5000);
  if (slowEndpoints && slowEndpoints.length > 0) {
    alerts.push({
      severity: 'WARNING',
      message: `Slow AI endpoints detected: ${slowEndpoints.map(e => e.name).join(', ')}`,
      timestamp: currentMetrics.timestamp
    });
  }

  // Check memory usage
  if (currentMetrics.health?.memoryUsage?.heapUsed > 500 * 1024 * 1024) {
    alerts.push({
      severity: 'INFO',
      message: `High memory usage: ${Math.round(currentMetrics.health.memoryUsage.heapUsed / 1024 / 1024)}MB`,
      timestamp: currentMetrics.timestamp
    });
  }

  return alerts;
}

/**
 * Perform single monitoring check
 */
async function performCheck() {
  console.log(`\n⏰ ${new Date().toLocaleString()} - Performing system check...`);

  try {
    // Fetch system metrics
    const systemMetrics = await fetchMetrics();
    
    // Test AI endpoints
    console.log('   🧪 Testing AI endpoints...');
    const aiTests = await testAIEndpoints();
    
    // Combine metrics
    const checkData = {
      ...systemMetrics,
      aiTests
    };

    // Analyze for alerts
    const newAlerts = analyzeMetrics(checkData);
    
    // Store results
    metrics.checks.push(checkData);
    metrics.alerts.push(...newAlerts);
    metrics.summary.totalChecks++;

    if (checkData.success) {
      metrics.summary.successfulChecks++;
      console.log('   ✅ System check passed');
      
      // Display key metrics
      if (checkData.cache) {
        console.log(`   📊 Cache Hit Rate: ${checkData.cache.hitRate || 0}%`);
      }
      if (aiTests.length > 0) {
        const avgTime = aiTests.reduce((sum, t) => sum + t.responseTime, 0) / aiTests.length;
        console.log(`   ⚡ Avg Response Time: ${Math.round(avgTime)}ms`);
      }
    } else {
      metrics.summary.failedChecks++;
      console.log('   ❌ System check failed:', checkData.error);
    }

    // Display alerts
    if (newAlerts.length > 0) {
      console.log('\n   🚨 New Alerts:');
      newAlerts.forEach(alert => {
        const icon = alert.severity === 'WARNING' ? '⚠️' : 'ℹ️';
        console.log(`      ${icon} ${alert.message}`);
      });
    }

    // Save progress
    saveProgress();

  } catch (error) {
    console.error('   ❌ Error during check:', error.message);
    metrics.summary.failedChecks++;
  }
}

/**
 * Save monitoring data to file
 */
function saveProgress() {
  const outputPath = path.join(CONFIG.OUTPUT_DIR, CONFIG.LOG_FILE);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  // Write JSON data
  fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
}

/**
 * Generate markdown report
 */
function generateReport() {
  console.log('\n📝 Generating comprehensive report...');

  // Calculate summary statistics
  const totalChecks = metrics.checks.length;
  const successfulChecks = metrics.checks.filter(c => c.success).length;
  const failedChecks = totalChecks - successfulChecks;

  // Cache statistics
  const cacheStats = metrics.checks
    .filter(c => c.cache && c.cache.hitRate !== undefined)
    .map(c => c.cache.hitRate);
  const avgCacheHitRate = cacheStats.length > 0
    ? cacheStats.reduce((sum, rate) => sum + rate, 0) / cacheStats.length
    : 0;

  // Response time statistics
  const allResponseTimes = metrics.checks
    .flatMap(c => c.aiTests || [])
    .filter(t => t.success)
    .map(t => t.responseTime);
  const avgResponseTime = allResponseTimes.length > 0
    ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length
    : 0;
  const minResponseTime = allResponseTimes.length > 0 ? Math.min(...allResponseTimes) : 0;
  const maxResponseTime = allResponseTimes.length > 0 ? Math.max(...allResponseTimes) : 0;

  // Alert statistics
  const criticalAlerts = metrics.alerts.filter(a => a.severity === 'CRITICAL').length;
  const warningAlerts = metrics.alerts.filter(a => a.severity === 'WARNING').length;
  const infoAlerts = metrics.alerts.filter(a => a.severity === 'INFO').length;

  // Duration
  const duration = (new Date(metrics.endTime) - new Date(metrics.startTime)) / 1000 / 60 / 60;

  // Generate markdown
  const report = `# 🔍 24-Hour AI System Monitoring Report

**Monitoring Period**: ${new Date(metrics.startTime).toLocaleString()} - ${new Date(metrics.endTime).toLocaleString()}
**Duration**: ${duration.toFixed(2)} hours
**Generated**: ${new Date().toLocaleString()}

---

## 📊 Executive Summary

### System Health
- **Total Checks**: ${totalChecks}
- **Successful**: ${successfulChecks} (${((successfulChecks / totalChecks) * 100).toFixed(1)}%)
- **Failed**: ${failedChecks} (${((failedChecks / totalChecks) * 100).toFixed(1)}%)
- **Uptime**: ${((successfulChecks / totalChecks) * 100).toFixed(2)}%

### Performance Metrics
- **Average Response Time**: ${Math.round(avgResponseTime)}ms
- **Min Response Time**: ${Math.round(minResponseTime)}ms
- **Max Response Time**: ${Math.round(maxResponseTime)}ms
- **Average Cache Hit Rate**: ${avgCacheHitRate.toFixed(1)}%

### Alert Summary
- 🔴 **Critical**: ${criticalAlerts}
- 🟡 **Warnings**: ${warningAlerts}
- 🔵 **Info**: ${infoAlerts}

---

## 📈 Performance Trends

### Response Time Over Time
\`\`\`
${generateResponseTimeChart(metrics.checks)}
\`\`\`

### Cache Hit Rate Over Time
\`\`\`
${generateCacheChart(metrics.checks)}
\`\`\`

---

## 🎯 Detailed Analysis

### Response Time Breakdown

| Endpoint | Avg (ms) | Min (ms) | Max (ms) | Success Rate |
|----------|----------|----------|----------|--------------|
${generateEndpointTable(metrics.checks)}

### Cache Performance

| Metric | Value |
|--------|-------|
| Average Hit Rate | ${avgCacheHitRate.toFixed(1)}% |
| Best Hit Rate | ${Math.max(...cacheStats, 0).toFixed(1)}% |
| Worst Hit Rate | ${Math.min(...cacheStats, 100).toFixed(1)}% |
| Total Entries | ${getLatestCacheEntries(metrics.checks)} |

---

## 🚨 Alerts and Issues

${metrics.alerts.length > 0 ? generateAlertsSection(metrics.alerts) : '✅ No alerts generated during monitoring period.'}

---

## 💡 Recommendations

${generateRecommendations(avgCacheHitRate, avgResponseTime, failedChecks, totalChecks)}

---

## 📋 Raw Data

Full monitoring data saved to: \`${path.join(CONFIG.OUTPUT_DIR, CONFIG.LOG_FILE)}\`

---

**Report End**
`;

  // Save report
  const reportPath = path.join(CONFIG.OUTPUT_DIR, CONFIG.REPORT_FILE);
  fs.writeFileSync(reportPath, report);
  
  console.log(`✅ Report saved to: ${reportPath}`);
  console.log(`📄 JSON data saved to: ${path.join(CONFIG.OUTPUT_DIR, CONFIG.LOG_FILE)}`);

  return reportPath;
}

/**
 * Helper: Generate response time ASCII chart
 */
function generateResponseTimeChart(checks) {
  const successfulChecks = checks.filter(c => c.success && c.aiTests);
  if (successfulChecks.length === 0) return 'No data available';

  const data = successfulChecks.map(c => {
    const avgTime = c.aiTests.reduce((sum, t) => sum + t.responseTime, 0) / c.aiTests.length;
    return Math.round(avgTime);
  });

  const maxTime = Math.max(...data);
  const scale = 50 / maxTime; // Scale to 50 chars max

  return data.map((time, i) => {
    const bars = Math.round(time * scale);
    const bar = '█'.repeat(bars);
    const label = `Check ${i + 1}`.padEnd(10);
    return `${label} ${bar} ${time}ms`;
  }).join('\n');
}

/**
 * Helper: Generate cache hit rate chart
 */
function generateCacheChart(checks) {
  const cacheChecks = checks.filter(c => c.cache && c.cache.hitRate !== undefined);
  if (cacheChecks.length === 0) return 'No cache data available';

  return cacheChecks.map((c, i) => {
    const rate = c.cache.hitRate;
    const bars = Math.round(rate / 2); // Scale to 50 chars (100% = 50 bars)
    const bar = '█'.repeat(bars);
    const label = `Check ${i + 1}`.padEnd(10);
    return `${label} ${bar} ${rate.toFixed(1)}%`;
  }).join('\n');
}

/**
 * Helper: Generate endpoint performance table
 */
function generateEndpointTable(checks) {
  const endpoints = new Map();

  checks.forEach(c => {
    if (!c.aiTests) return;
    
    c.aiTests.forEach(test => {
      if (!endpoints.has(test.name)) {
        endpoints.set(test.name, { times: [], successes: 0, total: 0 });
      }
      const data = endpoints.get(test.name);
      data.total++;
      if (test.success) {
        data.times.push(test.responseTime);
        data.successes++;
      }
    });
  });

  const rows = [];
  endpoints.forEach((data, name) => {
    const avg = data.times.length > 0 
      ? Math.round(data.times.reduce((sum, t) => sum + t, 0) / data.times.length)
      : 0;
    const min = data.times.length > 0 ? Math.min(...data.times) : 0;
    const max = data.times.length > 0 ? Math.max(...data.times) : 0;
    const successRate = ((data.successes / data.total) * 100).toFixed(1);
    
    rows.push(`| ${name} | ${avg} | ${min} | ${max} | ${successRate}% |`);
  });

  return rows.length > 0 ? rows.join('\n') : '| No data | - | - | - | - |';
}

/**
 * Helper: Get latest cache entries count
 */
function getLatestCacheEntries(checks) {
  const cacheChecks = checks.filter(c => c.cache && c.cache.totalEntries !== undefined);
  if (cacheChecks.length === 0) return 'N/A';
  return cacheChecks[cacheChecks.length - 1].cache.totalEntries;
}

/**
 * Helper: Generate alerts section
 */
function generateAlertsSection(alerts) {
  const grouped = {
    CRITICAL: alerts.filter(a => a.severity === 'CRITICAL'),
    WARNING: alerts.filter(a => a.severity === 'WARNING'),
    INFO: alerts.filter(a => a.severity === 'INFO')
  };

  let section = '';

  if (grouped.CRITICAL.length > 0) {
    section += '### 🔴 Critical Alerts\n\n';
    grouped.CRITICAL.forEach(alert => {
      section += `- **${new Date(alert.timestamp).toLocaleString()}**: ${alert.message}\n`;
    });
    section += '\n';
  }

  if (grouped.WARNING.length > 0) {
    section += '### 🟡 Warnings\n\n';
    grouped.WARNING.forEach(alert => {
      section += `- **${new Date(alert.timestamp).toLocaleString()}**: ${alert.message}\n`;
    });
    section += '\n';
  }

  if (grouped.INFO.length > 0) {
    section += '### 🔵 Information\n\n';
    grouped.INFO.forEach(alert => {
      section += `- **${new Date(alert.timestamp).toLocaleString()}**: ${alert.message}\n`;
    });
  }

  return section;
}

/**
 * Helper: Generate recommendations
 */
function generateRecommendations(cacheHitRate, avgResponseTime, failedChecks, totalChecks) {
  const recommendations = [];

  // Cache recommendations
  if (cacheHitRate < 60) {
    recommendations.push('- ⚠️ **Cache Optimization Needed**: Hit rate is below 60%. Consider pre-warming more popular product combinations.');
  } else if (cacheHitRate >= 60 && cacheHitRate < 75) {
    recommendations.push('- ✅ **Cache Performance Good**: Hit rate is acceptable but can be improved to 75%+ with better pre-warming strategies.');
  } else {
    recommendations.push('- 🌟 **Cache Performance Excellent**: Hit rate is optimal (75%+). Continue current caching strategy.');
  }

  // Response time recommendations
  if (avgResponseTime > 1000) {
    recommendations.push('- ⚠️ **Response Time High**: Average response time exceeds 1 second. Investigate slow endpoints and optimize queries.');
  } else if (avgResponseTime > 500) {
    recommendations.push('- ℹ️ **Response Time Moderate**: Response times are acceptable but could be improved with query optimization.');
  } else {
    recommendations.push('- 🌟 **Response Time Excellent**: Average response time under 500ms. Performance is optimal.');
  }

  // Reliability recommendations
  const uptime = ((totalChecks - failedChecks) / totalChecks) * 100;
  if (uptime < 95) {
    recommendations.push('- 🔴 **Reliability Concern**: System uptime is below 95%. Investigate causes of failures and implement better error handling.');
  } else if (uptime < 99) {
    recommendations.push('- ✅ **Reliability Good**: System uptime is acceptable but aim for 99%+ for production.');
  } else {
    recommendations.push('- 🌟 **Reliability Excellent**: System uptime is optimal (99%+). Maintain current stability measures.');
  }

  return recommendations.join('\n');
}

/**
 * Main monitoring loop
 */
async function startMonitoring() {
  console.log('🔍 24-Hour AI System Monitoring Started');
  console.log('========================================');
  console.log(`Duration: ${CONFIG.DURATION_HOURS} hours`);
  console.log(`Check Interval: ${CONFIG.CHECK_INTERVAL / 1000 / 60} minutes`);
  console.log(`Output Directory: ${CONFIG.OUTPUT_DIR}`);
  console.log('========================================\n');

  metrics.startTime = new Date().toISOString();

  const totalChecks = Math.floor((CONFIG.DURATION_HOURS * 60 * 60 * 1000) / CONFIG.CHECK_INTERVAL);
  let checkCount = 0;

  // Initial check
  await performCheck();
  checkCount++;

  // Schedule periodic checks
  const interval = setInterval(async () => {
    await performCheck();
    checkCount++;

    // Progress indicator
    const progress = (checkCount / totalChecks) * 100;
    console.log(`\n📊 Progress: ${progress.toFixed(1)}% (${checkCount}/${totalChecks} checks)`);

    // Stop after duration
    if (checkCount >= totalChecks) {
      clearInterval(interval);
      finishMonitoring();
    }
  }, CONFIG.CHECK_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⏸️  Monitoring interrupted by user');
    clearInterval(interval);
    finishMonitoring();
    process.exit(0);
  });
}

/**
 * Finish monitoring and generate report
 */
function finishMonitoring() {
  metrics.endTime = new Date().toISOString();
  
  console.log('\n========================================');
  console.log('✅ Monitoring Complete!');
  console.log('========================================');
  console.log(`Total Checks: ${metrics.summary.totalChecks}`);
  console.log(`Successful: ${metrics.summary.successfulChecks}`);
  console.log(`Failed: ${metrics.summary.failedChecks}`);
  console.log(`Alerts Generated: ${metrics.alerts.length}`);
  
  // Generate final report
  const reportPath = generateReport();
  
  console.log('\n📄 Report generated successfully!');
  console.log(`View report: ${reportPath}`);
  console.log('\nThank you for using K-Wise AI Monitoring! 🚀');
}

// Start monitoring
startMonitoring().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
