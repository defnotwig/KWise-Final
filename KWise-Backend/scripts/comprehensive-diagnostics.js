#!/usr/bin/env node

/**
 * K-WISE COMPREHENSIVE DIAGNOSTICS TOOL
 * Analyzes entire system for errors, performance issues, and misconfigurations
 * 
 * Created: November 9, 2025
 * Purpose: Root cause analysis for achieving 5.0/5.0 rating
 */

require('dotenv').config();
const { query } = require('../config/db');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const issues = [];
const warnings = [];
const successes = [];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    success: `${colors.green}✅`,
    info: `${colors.blue}ℹ️`,
    section: `${colors.cyan}${colors.bright}📋`
  }[type] || '•';
  
  console.log(`${prefix} ${message}${colors.reset}`);
}

function section(title) {
  console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(80)}`);
  console.log(`${title.toUpperCase()}`);
  console.log(`${'='.repeat(80)}${colors.reset}\n`);
}

/**
 * Test 1: Database Connection and Schema Integrity
 */
async function testDatabaseIntegrity() {
  section('DATABASE INTEGRITY CHECK');
  
  try {
    // Test basic connection
    await query('SELECT NOW()');
    log('Database connection successful', 'success');
    successes.push('Database connection OK');
    
    // Check required tables exist
    const requiredTables = [
      'users', 'pc_parts', 'orders', 'compatibility_rules',
      'settings', 'audit_logs', 'order_queue'
    ];
    
    for (const table of requiredTables) {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        log(`Table '${table}' exists`, 'success');
      } else {
        log(`Table '${table}' is MISSING`, 'error');
        issues.push(`Missing required table: ${table}`);
      }
    }
    
    // Check compatibility rules count
    const rulesResult = await query('SELECT COUNT(*) FROM compatibility_rules');
    const rulesCount = parseInt(rulesResult.rows[0].count);
    log(`Compatibility Rules: ${rulesCount}`, rulesCount >= 2500 ? 'success' : 'warning');
    
    if (rulesCount < 2500) {
      warnings.push(`Only ${rulesCount} compatibility rules (expected 2,513+)`);
    }
    
    // Check for orphaned data
    const orphanedParts = await query(`
      SELECT COUNT(*) 
      FROM pc_parts 
      WHERE category_id NOT IN (SELECT id FROM categories)
    `);
    
    if (parseInt(orphanedParts.rows[0].count) > 0) {
      log(`Found ${orphanedParts.rows[0].count} orphaned PC parts`, 'warning');
      warnings.push(`Orphaned PC parts without valid category`);
    }
    
  } catch (error) {
    log(`Database integrity check failed: ${error.message}`, 'error');
    issues.push(`Database error: ${error.message}`);
  }
}

/**
 * Test 2: API Endpoints Availability
 */
async function testAPIEndpoints() {
  section('API ENDPOINTS VERIFICATION');
  
  const endpoints = [
    { path: '/api/auth/login', method: 'POST' },
    { path: '/api/pc-parts', method: 'GET' },
    { path: '/api/compatibility/check', method: 'POST' },
    { path: '/api/ai/analyze-build', method: 'POST' },
    { path: '/api/cache/stats', method: 'GET' },
    { path: '/api/system/metrics', method: 'GET' },
    { path: '/api/rules', method: 'GET' }
  ];
  
  // Note: This would require the server to be running
  log('API endpoint verification requires running server', 'info');
  log('Check server logs for mounted routes', 'info');
}

/**
 * Test 3: File System Structure
 */
async function testFileSystemStructure() {
  section('FILE SYSTEM STRUCTURE CHECK');
  
  const requiredBackendFiles = [
    'server.js',
    'config/db.js',
    'routes/auths.js',
    'routes/stock.js',
    'routes/orders.js',
    'routes/ruleBuilderRoutes.js',
    'routes/cacheRoutes.js',
    'routes/systemMetricsRoutes.js',
    'services/ruleEngine.js',
    'services/intelligentCache.js',
    'middleware/auth.js',
    'models/User.js',
    'models/Settings.js'
  ];
  
  const backendRoot = path.join(__dirname, '..');
  
  for (const file of requiredBackendFiles) {
    const filePath = path.join(backendRoot, file);
    try {
      await fs.access(filePath);
      log(`✓ ${file}`, 'success');
    } catch (error) {
      log(`✗ ${file} MISSING`, 'error');
      issues.push(`Missing file: ${file}`);
    }
  }
  
  // Check for duplicate files
  const duplicatePatterns = [
    '-enhanced', '-working', '-final', '-backup', '-test', '-old'
  ];
  
  log('\nChecking for duplicate files...', 'info');
  
  async function findDuplicates(dir, pattern) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (duplicatePatterns.some(p => file.includes(p))) {
          log(`Potential duplicate: ${path.join(dir, file)}`, 'warning');
          warnings.push(`Duplicate file found: ${file}`);
        }
      }
    } catch (error) {
      // Directory not accessible
    }
  }
  
  await findDuplicates(path.join(backendRoot, 'routes'));
  await findDuplicates(path.join(backendRoot, 'services'));
  await findDuplicates(path.join(backendRoot, 'controllers'));
}

/**
 * Test 4: Environment Configuration
 */
async function testEnvironmentConfig() {
  section('ENVIRONMENT CONFIGURATION CHECK');
  
  const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'PORT'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log(`✓ ${envVar} is set`, 'success');
    } else {
      log(`✗ ${envVar} is MISSING`, 'error');
      issues.push(`Missing environment variable: ${envVar}`);
    }
  }
  
  // Check optional but recommended variables
  const optionalVars = ['REDIS_URL', 'OLLAMA_BASE_URL', 'NODE_ENV'];
  
  for (const envVar of optionalVars) {
    if (process.env[envVar]) {
      log(`✓ ${envVar} is set (optional)`, 'success');
    } else {
      log(`○ ${envVar} is not set (optional)`, 'warning');
    }
  }
}

/**
 * Test 5: Data Consistency
 */
async function testDataConsistency() {
  section('DATA CONSISTENCY CHECK');
  
  try {
    // Check for users without roles
    const usersWithoutRoles = await query(`
      SELECT COUNT(*) 
      FROM users 
      WHERE role IS NULL OR role = ''
    `);
    
    if (parseInt(usersWithoutRoles.rows[0].count) > 0) {
      log(`Found ${usersWithoutRoles.rows[0].count} users without roles`, 'error');
      issues.push('Users exist without assigned roles');
    } else {
      log('All users have assigned roles', 'success');
    }
    
    // Check for orders without valid status
    const invalidOrders = await query(`
      SELECT COUNT(*) 
      FROM orders 
      WHERE status NOT IN ('pending', 'processing', 'completed', 'cancelled')
    `);
    
    if (parseInt(invalidOrders.rows[0].count) > 0) {
      log(`Found ${invalidOrders.rows[0].count} orders with invalid status`, 'error');
      issues.push('Orders with invalid status values');
    }
    
    // Check for PC parts without prices
    const partsNoPrices = await query(`
      SELECT COUNT(*) 
      FROM pc_parts 
      WHERE price IS NULL OR price <= 0
    `);
    
    if (parseInt(partsNoPrices.rows[0].count) > 0) {
      log(`Found ${partsNoPrices.rows[0].count} PC parts without valid prices`, 'warning');
      warnings.push('PC parts exist without valid pricing');
    }
    
    // Check compatibility rules validity (using correct column names)
    const invalidRules = await query(`
      SELECT COUNT(*) 
      FROM compatibility_rules 
      WHERE component_a_category IS NULL 
         OR rule_type IS NULL
    `);
    
    if (parseInt(invalidRules.rows[0].count) > 0) {
      log(`Found ${invalidRules.rows[0].count} invalid compatibility rules`, 'error');
      issues.push('Compatibility rules with missing required fields');
    }
    
  } catch (error) {
    log(`Data consistency check failed: ${error.message}`, 'error');
    issues.push(`Data consistency error: ${error.message}`);
  }
}

/**
 * Test 6: Performance Metrics
 */
async function testPerformanceMetrics() {
  section('PERFORMANCE METRICS CHECK');
  
  try {
    // Test query performance
    const start = Date.now();
    await query('SELECT COUNT(*) FROM pc_parts');
    const queryTime = Date.now() - start;
    
    if (queryTime < 50) {
      log(`Query performance: ${queryTime}ms (excellent)`, 'success');
    } else if (queryTime < 200) {
      log(`Query performance: ${queryTime}ms (good)`, 'success');
    } else {
      log(`Query performance: ${queryTime}ms (needs optimization)`, 'warning');
      warnings.push('Query performance could be improved');
    }
    
    // Check database indexes
    const indexResult = await query(`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    log(`Found ${indexResult.rows.length} database indexes`, 'info');
    
    // Check for missing indexes on frequently queried columns
    const missingIndexes = [];
    
    // Check pc_parts category_id index
    const categoryIndex = indexResult.rows.find(r => 
      r.tablename === 'pc_parts' && r.indexname.includes('category')
    );
    
    if (!categoryIndex) {
      missingIndexes.push('pc_parts(category_id)');
    }
    
    if (missingIndexes.length > 0) {
      log(`Recommended indexes missing: ${missingIndexes.join(', ')}`, 'warning');
      warnings.push(`Consider adding indexes: ${missingIndexes.join(', ')}`);
    }
    
  } catch (error) {
    log(`Performance metrics check failed: ${error.message}`, 'error');
  }
}

/**
 * Test 7: Security Configuration
 */
async function testSecurityConfig() {
  section('SECURITY CONFIGURATION CHECK');
  
  // Check JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    log('JWT_SECRET is too short (should be 32+ characters)', 'warning');
    warnings.push('JWT secret should be longer for better security');
  } else if (process.env.JWT_SECRET) {
    log('JWT_SECRET has adequate length', 'success');
  }
  
  // Check for default passwords in database
  try {
    const defaultPasswords = await query(`
      SELECT COUNT(*) 
      FROM users 
      WHERE password_hash = crypt('admin123', password_hash)
         OR password_hash = crypt('password', password_hash)
         OR password_hash = crypt('12345678', password_hash)
    `);
    
    if (parseInt(defaultPasswords.rows[0].count) > 0) {
      log(`Found ${defaultPasswords.rows[0].count} users with default passwords!`, 'error');
      issues.push('Users with default/weak passwords detected');
    } else {
      log('No default passwords detected', 'success');
    }
  } catch (error) {
    log('Could not check for default passwords', 'warning');
  }
  
  // Check CORS configuration
  log('CORS configuration should allow only trusted origins', 'info');
  log('Verify CORS settings in server.js', 'info');
}

/**
 * Main diagnostic runner
 */
async function runDiagnostics() {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                   K-WISE COMPREHENSIVE DIAGNOSTIC TOOL                        ║');
  console.log('║                         Root Cause Analysis                                   ║');
  console.log('║                        November 9, 2025                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const startTime = Date.now();
  
  try {
    await testDatabaseIntegrity();
    await testAPIEndpoints();
    await testFileSystemStructure();
    await testEnvironmentConfig();
    await testDataConsistency();
    await testPerformanceMetrics();
    await testSecurityConfig();
    
  } catch (error) {
    log(`Diagnostic suite failed: ${error.message}`, 'error');
    issues.push(`Fatal error: ${error.message}`);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // FINAL REPORT
  section('DIAGNOSTIC SUMMARY REPORT');
  
  console.log(`${colors.bright}Execution Time: ${duration}s${colors.reset}\n`);
  
  console.log(`${colors.green}${colors.bright}✅ SUCCESSES: ${successes.length}${colors.reset}`);
  if (successes.length > 0) {
    successes.forEach(s => console.log(`   ${colors.green}• ${s}${colors.reset}`));
  }
  
  console.log(`\n${colors.yellow}${colors.bright}⚠️  WARNINGS: ${warnings.length}${colors.reset}`);
  if (warnings.length > 0) {
    warnings.forEach(w => console.log(`   ${colors.yellow}• ${w}${colors.reset}`));
  } else {
    console.log(`   ${colors.green}No warnings${colors.reset}`);
  }
  
  console.log(`\n${colors.red}${colors.bright}❌ CRITICAL ISSUES: ${issues.length}${colors.reset}`);
  if (issues.length > 0) {
    issues.forEach(i => console.log(`   ${colors.red}• ${i}${colors.reset}`));
  } else {
    console.log(`   ${colors.green}No critical issues detected!${colors.reset}`);
  }
  
  // Overall health score
  const totalChecks = successes.length + warnings.length + issues.length;
  const healthScore = totalChecks > 0 
    ? ((successes.length / totalChecks) * 100).toFixed(1)
    : 0;
  
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}OVERALL SYSTEM HEALTH: ${healthScore}%${colors.reset}`);
  
  let healthStatus;
  if (healthScore >= 90) healthStatus = `${colors.green}EXCELLENT`;
  else if (healthScore >= 75) healthStatus = `${colors.cyan}GOOD`;
  else if (healthScore >= 60) healthStatus = `${colors.yellow}NEEDS ATTENTION`;
  else healthStatus = `${colors.red}CRITICAL`;
  
  console.log(`${colors.bright}STATUS: ${healthStatus}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  // Recommendations
  if (issues.length > 0 || warnings.length > 0) {
    section('RECOMMENDATIONS');
    
    if (issues.length > 0) {
      console.log(`${colors.red}${colors.bright}HIGH PRIORITY:${colors.reset}`);
      console.log('1. Fix all critical issues before production deployment');
      console.log('2. Run diagnostics again after fixes to verify');
    }
    
    if (warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bright}MEDIUM PRIORITY:${colors.reset}`);
      console.log('1. Address warnings to improve system reliability');
      console.log('2. Implement monitoring for warned areas');
    }
    
    console.log(`\n${colors.cyan}${colors.bright}BEST PRACTICES:${colors.reset}`);
    console.log('1. Run this diagnostic tool before each deployment');
    console.log('2. Set up automated monitoring for production');
    console.log('3. Review database indexes quarterly');
    console.log('4. Update dependencies monthly');
  }
  
  // Exit code based on issues
  if (issues.length > 0) {
    console.log(`\n${colors.red}Exiting with errors (code 1)${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}All diagnostics passed! (code 0)${colors.reset}`);
    process.exit(0);
  }
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error(`${colors.red}Fatal error running diagnostics:${colors.reset}`, error);
  process.exit(1);
});
