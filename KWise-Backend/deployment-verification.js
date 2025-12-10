/**
 * K-Wise Deployment Verification Script
 * Comprehensive system validation before production deployment
 * 
 * Usage: node deployment-verification.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Results storage
const results = {
  controllers: { passed: 0, failed: 0, warnings: 0, details: [] },
  routes: { passed: 0, failed: 0, warnings: 0, details: [] },
  database: { passed: 0, failed: 0, warnings: 0, details: [] },
  environment: { passed: 0, failed: 0, warnings: 0, details: [] },
  security: { passed: 0, failed: 0, warnings: 0, details: [] },
  overall: { score: 0, status: 'PENDING' }
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  log(`  ${title}`, 'bright');
  console.log('='.repeat(70) + '\n');
}

function pass(message) {
  log(`✅ ${message}`, 'green');
}

function fail(message) {
  log(`❌ ${message}`, 'red');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Validation functions

/**
 * 1. Validate AI Controller Methods
 */
async function validateControllers() {
  section('1. AI CONTROLLER VALIDATION');
  
  const controllerPath = path.join(__dirname, 'ai', 'controllers', 'aiController.js');
  
  if (!fs.existsSync(controllerPath)) {
    fail('aiController.js not found');
    results.controllers.failed++;
    results.controllers.details.push({ test: 'File Existence', status: 'FAIL' });
    return;
  }
  
  pass('aiController.js found');
  results.controllers.passed++;
  
  const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
  
  // Required methods from aiRoutes.js
  const requiredMethods = [
    'getHealthStatus', 'getSystemStatus', 'getCacheStatistics',
    'estimateCurrentBuild', 'recommendUpgrade', 'recommendCleaningTier',
    'getHotPicks', 'getValueForMoney', 'analyzeMarketTrends',
    'analyzeCompatibility', 'findCompatibleComponents',
    'optimizeBuild', 'validateBuildCompatibility', 'validateBuildComprehensive',
    'recommendPreBuilds', 'optimizeForBudget',
    'performPCCheckup', 'analyzeUpgradeOptions',
    'recommendServices', 'analyzeBottlenecks',
    'compareProducts', 'generateTrainingDataset',
    'getAIMetrics', 'getTopUpgradePaths', 'getPopularComponents'
  ];
  
  info(`Checking ${requiredMethods.length} required methods...`);
  
  let methodsFound = 0;
  const missingMethods = [];
  
  for (const method of requiredMethods) {
    const regex = new RegExp(`async\\s+${method}\\s*\\(`, 'g');
    if (regex.test(controllerContent)) {
      methodsFound++;
      results.controllers.details.push({ test: method, status: 'PASS' });
    } else {
      missingMethods.push(method);
      results.controllers.failed++;
      results.controllers.details.push({ test: method, status: 'FAIL' });
    }
  }
  
  if (missingMethods.length === 0) {
    pass(`All ${requiredMethods.length} controller methods implemented`);
    results.controllers.passed += requiredMethods.length;
  } else {
    fail(`Missing ${missingMethods.length} methods: ${missingMethods.join(', ')}`);
  }
  
  // Check for deprecated methods
  if (controllerContent.includes('aiBottleneckAnalysisDeprecated')) {
    warn('Deprecated method found: aiBottleneckAnalysisDeprecated (not used in production)');
    results.controllers.warnings++;
  }
}

/**
 * 2. Validate AI Routes
 */
async function validateRoutes() {
  section('2. AI ROUTES VALIDATION');
  
  const routesPath = path.join(__dirname, 'ai', 'routes', 'aiRoutes.js');
  
  if (!fs.existsSync(routesPath)) {
    fail('aiRoutes.js not found');
    results.routes.failed++;
    return;
  }
  
  pass('aiRoutes.js found');
  results.routes.passed++;
  
  const routesContent = fs.readFileSync(routesPath, 'utf-8');
  
  // Check for consistent binding pattern
  const routeMatches = routesContent.match(/router\.(get|post|put|delete)\(/g) || [];
  const bindMatches = routesContent.match(/\.bind\(aiController\)/g) || [];
  
  info(`Found ${routeMatches.length} route definitions`);
  info(`Found ${bindMatches.length} .bind(aiController) calls`);
  
  if (bindMatches.length >= routeMatches.length - 5) { // Allow some margin for middleware-only routes
    pass('Context binding is consistently applied');
    results.routes.passed++;
  } else {
    warn('Some routes may be missing .bind(aiController)');
    results.routes.warnings++;
  }
  
  // Check for middleware
  const middlewareChecks = [
    { name: 'aiRateLimit', pattern: /const aiRateLimit = rateLimit\(/g },
    { name: 'expensiveAIRateLimit', pattern: /const expensiveAIRateLimit = rateLimit\(/g },
    { name: 'logAIRequest', pattern: /const logAIRequest = \(req, res, next\)/g },
    { name: 'protect', pattern: /const \{ protect/g },
    { name: 'restrictTo', pattern: /restrictTo\(/g }
  ];
  
  info('Checking middleware...');
  
  for (const check of middlewareChecks) {
    if (check.pattern.test(routesContent)) {
      pass(`${check.name} middleware found`);
      results.routes.passed++;
    } else {
      fail(`${check.name} middleware not found`);
      results.routes.failed++;
    }
  }
  
  // Check for error handling
  if (routesContent.includes('router.use((error, req, res, next)')) {
    pass('Global error handler implemented');
    results.routes.passed++;
  } else {
    fail('Global error handler not found');
    results.routes.failed++;
  }
  
  // Check for 404 handler
  if (routesContent.includes("router.use('*'")) {
    pass('404 handler implemented');
    results.routes.passed++;
  } else {
    warn('404 handler not found');
    results.routes.warnings++;
  }
}

/**
 * 3. Validate Database Schema
 */
async function validateDatabase() {
  section('3. DATABASE SCHEMA VALIDATION');
  
  // Load database configuration
  require('dotenv').config();
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'KWiseDB',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });
  
  try {
    info('Connecting to database...');
    await pool.query('SELECT NOW()');
    pass('Database connection successful');
    results.database.passed++;
    
    // Check core tables
    const coreTables = [
      'pc_parts', 'cpu', 'gpu', 'motherboard', 'ram', 'storage', 
      'psu', 'pc_case', 'cooling', 'keyboard', 'mouse', 'monitors', 
      'headphones', 'speakers', 'webcams'
    ];
    
    info(`Checking ${coreTables.length} core tables...`);
    
    for (const tableName of coreTables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      
      if (result.rows[0].exists) {
        pass(`Table '${tableName}' exists`);
        results.database.passed++;
      } else {
        fail(`Table '${tableName}' NOT FOUND`);
        results.database.failed++;
      }
    }
    
    // Check additional tables (optional but recommended)
    const optionalTables = [
      'users', 'orders', 'order_items', 'kiosk_sessions',
      'ai_recommendations', 'ai_logs', 'user_virtual_build', 'audit_logs'
    ];
    
    info('Checking optional tables...');
    
    for (const tableName of optionalTables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      
      if (result.rows[0].exists) {
        pass(`Table '${tableName}' exists`);
        results.database.passed++;
      } else {
        warn(`Table '${tableName}' NOT FOUND (optional but recommended)`);
        results.database.warnings++;
      }
    }
    
    // Check indexes
    info('Checking database indexes...');
    const indexResult = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%';
    `);
    
    if (indexResult.rows.length > 0) {
      pass(`Found ${indexResult.rows.length} custom indexes`);
      results.database.passed++;
      indexResult.rows.forEach(row => {
        info(`  - ${row.indexname} on ${row.tablename}`);
      });
    } else {
      warn('No custom indexes found (performance may be suboptimal)');
      results.database.warnings++;
    }
    
  } catch (error) {
    fail(`Database error: ${error.message}`);
    results.database.failed++;
  } finally {
    await pool.end();
  }
}

/**
 * 4. Validate Environment Variables
 */
async function validateEnvironment() {
  section('4. ENVIRONMENT CONFIGURATION VALIDATION');
  
  require('dotenv').config();
  
  const requiredVars = [
    { name: 'DB_HOST', critical: true },
    { name: 'DB_PORT', critical: true },
    { name: 'DB_NAME', critical: true },
    { name: 'DB_USER', critical: true },
    { name: 'DB_PASSWORD', critical: true },
    { name: 'PORT', critical: true },
    { name: 'NODE_ENV', critical: true },
    { name: 'JWT_SECRET', critical: true },
    { name: 'FRONTEND_URL', critical: false },
    { name: 'OLLAMA_BASE_URL', critical: true },
    { name: 'OLLAMA_MODEL', critical: true },
    { name: 'AI_ENABLED', critical: false },
    { name: 'GMAIL_USER', critical: false },
    { name: 'GMAIL_APP_PASSWORD', critical: false },
    { name: 'REDIS_ENABLED', critical: false }
  ];
  
  info(`Checking ${requiredVars.length} environment variables...`);
  
  for (const { name, critical } of requiredVars) {
    if (process.env[name]) {
      // Mask sensitive values
      const isSensitive = name.includes('PASSWORD') || name.includes('SECRET');
      const displayValue = isSensitive ? '***' : process.env[name];
      pass(`${name} = ${displayValue}`);
      results.environment.passed++;
    } else {
      if (critical) {
        fail(`${name} NOT SET (CRITICAL)`);
        results.environment.failed++;
      } else {
        warn(`${name} NOT SET (optional)`);
        results.environment.warnings++;
      }
    }
  }
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    pass('.env file found');
    results.environment.passed++;
  } else {
    fail('.env file NOT FOUND');
    results.environment.failed++;
  }
}

/**
 * 5. Validate Security Configuration
 */
async function validateSecurity() {
  section('5. SECURITY CONFIGURATION VALIDATION');
  
  require('dotenv').config();
  
  // Check JWT secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length >= 32) {
      pass('JWT_SECRET has adequate length');
      results.security.passed++;
    } else {
      warn('JWT_SECRET is too short (should be 32+ characters)');
      results.security.warnings++;
    }
    
    // Check if it's the default value
    if (jwtSecret.includes('change-in-production') || jwtSecret.includes('default')) {
      fail('JWT_SECRET appears to be default value - MUST ROTATE IN PRODUCTION');
      results.security.failed++;
    } else {
      pass('JWT_SECRET appears to be custom value');
      results.security.passed++;
    }
  }
  
  // Check reset code secret
  const resetSecret = process.env.RESET_CODE_SECRET;
  if (resetSecret) {
    if (resetSecret.includes('change-this-in-production') || resetSecret.includes('default')) {
      fail('RESET_CODE_SECRET appears to be default value - MUST ROTATE IN PRODUCTION');
      results.security.failed++;
    } else {
      pass('RESET_CODE_SECRET appears to be custom value');
      results.security.passed++;
    }
  }
  
  // Check if running in production mode
  if (process.env.NODE_ENV === 'production') {
    info('Running in PRODUCTION mode');
    
    // Additional production checks
    if (process.env.LOAD_TEST_MODE === 'true') {
      warn('LOAD_TEST_MODE is enabled in production - should be disabled');
      results.security.warnings++;
    }
    
    if (process.env.AI_DEBUG === 'true') {
      warn('AI_DEBUG is enabled in production - should be disabled');
      results.security.warnings++;
    }
  } else {
    info(`Running in ${process.env.NODE_ENV || 'DEVELOPMENT'} mode`);
  }
  
  // Check for HTTPS configuration
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith('https://')) {
    pass('FRONTEND_URL uses HTTPS');
    results.security.passed++;
  } else {
    warn('FRONTEND_URL does not use HTTPS (acceptable in development)');
    results.security.warnings++;
  }
  
  // Check rate limiting
  const serverPath = path.join(__dirname, 'server.js');
  if (fs.existsSync(serverPath)) {
    const serverContent = fs.readFileSync(serverPath, 'utf-8');
    if (serverContent.includes('rateLimit')) {
      pass('Rate limiting middleware detected in server.js');
      results.security.passed++;
    } else {
      warn('Rate limiting not detected in server.js');
      results.security.warnings++;
    }
  }
}

/**
 * Generate final report
 */
function generateReport() {
  section('DEPLOYMENT VERIFICATION SUMMARY');
  
  const categories = ['controllers', 'routes', 'database', 'environment', 'security'];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;
  
  console.log('\n' + '┌─────────────────────────┬────────┬────────┬──────────┐');
  console.log('│ Category                │ Passed │ Failed │ Warnings │');
  console.log('├─────────────────────────┼────────┼────────┼──────────┤');
  
  for (const category of categories) {
    const cat = results[category];
    totalPassed += cat.passed;
    totalFailed += cat.failed;
    totalWarnings += cat.warnings;
    
    const passStr = String(cat.passed).padStart(6);
    const failStr = String(cat.failed).padStart(6);
    const warnStr = String(cat.warnings).padStart(8);
    const catStr = category.padEnd(23);
    
    const lineColor = cat.failed > 0 ? 'red' : (cat.warnings > 0 ? 'yellow' : 'green');
    log(`│ ${catStr} │ ${passStr} │ ${failStr} │ ${warnStr} │`, lineColor);
  }
  
  console.log('├─────────────────────────┼────────┼────────┼──────────┤');
  const totalPassStr = String(totalPassed).padStart(6);
  const totalFailStr = String(totalFailed).padStart(6);
  const totalWarnStr = String(totalWarnings).padStart(8);
  log(`│ TOTAL                   │ ${totalPassStr} │ ${totalFailStr} │ ${totalWarnStr} │`, 'bright');
  console.log('└─────────────────────────┴────────┴────────┴──────────┘\n');
  
  // Calculate overall score
  const totalChecks = totalPassed + totalFailed + totalWarnings;
  const score = Math.round(((totalPassed + totalWarnings * 0.5) / totalChecks) * 100);
  results.overall.score = score;
  
  // Determine status
  if (totalFailed === 0 && totalWarnings === 0) {
    results.overall.status = '✅ READY FOR DEPLOYMENT';
    log(`Overall Score: ${score}% - ${results.overall.status}`, 'green');
  } else if (totalFailed === 0) {
    results.overall.status = '⚠️  READY WITH WARNINGS';
    log(`Overall Score: ${score}% - ${results.overall.status}`, 'yellow');
  } else if (totalFailed <= 3) {
    results.overall.status = '⚠️  ALMOST READY (minor fixes needed)';
    log(`Overall Score: ${score}% - ${results.overall.status}`, 'yellow');
  } else {
    results.overall.status = '❌ NOT READY FOR DEPLOYMENT';
    log(`Overall Score: ${score}% - ${results.overall.status}`, 'red');
  }
  
  console.log('\n');
  
  // Recommendations
  if (totalFailed > 0) {
    section('⚠️  REQUIRED ACTIONS');
    info(`${totalFailed} critical issues must be resolved before deployment`);
  }
  
  if (totalWarnings > 0) {
    section('💡 RECOMMENDATIONS');
    info(`${totalWarnings} warnings should be addressed for optimal deployment`);
  }
  
  // Save report to file
  const reportPath = path.join(__dirname, 'deployment-verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  info(`Full report saved to: ${reportPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.clear();
  log('\n🚀 K-WISE DEPLOYMENT VERIFICATION TOOL', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Version: 1.0.0', 'cyan');
  log('Date: ' + new Date().toLocaleString(), 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
  
  try {
    await validateControllers();
    await validateRoutes();
    await validateDatabase();
    await validateEnvironment();
    await validateSecurity();
    
    generateReport();
    
    // Exit with appropriate code
    if (results.overall.status.includes('NOT READY')) {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    fail(`\nFATAL ERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run verification
main();
