/**
 * K-Wise System Diagnostic and Auto-Fix Script
 * Comprehensive system health check and automatic issue resolution
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

console.log('🔍 K-WISE SYSTEM DIAGNOSTIC TOOL\n');
console.log('=' .repeat(60));

const diagnostics = {
  databaseConnection: false,
  backendServices: [],
  frontendBuild: false,
  routes: [],
  errors: [],
  warnings: [],
  fixes: []
};

// Check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Check database configuration
async function checkDatabase() {
  console.log('\n📊 [1/8] Checking Database Configuration...');
  
  try {
    const dbPath = path.join(__dirname, 'config', 'db.js');
    if (!fileExists(dbPath)) {
      diagnostics.errors.push('Database config file (config/db.js) not found');
      return false;
    }
    
    // Check if database module can be loaded
    try {
      const db = require('./config/db');
      console.log('   ✅ Database config file exists and is loadable');
      
      // Test connection
      await db.connectDB();
      console.log('   ✅ Database connection successful');
      diagnostics.databaseConnection = true;
      await db.closePool();
      return true;
    } catch (error) {
      diagnostics.errors.push(`Database connection failed: ${error.message}`);
      console.log(`   ❌ Database connection failed: ${error.message}`);
      return false;
    }
  } catch (error) {
    diagnostics.errors.push(`Database check failed: ${error.message}`);
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

// Check all service files
async function checkServices() {
  console.log('\n🔧 [2/8] Checking Backend Services...');
  
  const servicesDir = path.join(__dirname, 'services');
  
  if (!fileExists(servicesDir)) {
    diagnostics.errors.push('Services directory not found');
    return;
  }
  
  const services = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
  
  for (const service of services) {
    const servicePath = path.join(servicesDir, service);
    const content = fs.readFileSync(servicePath, 'utf8');
    
    // Check for incorrect database imports
    if (content.includes("require('../config/database')")) {
      diagnostics.errors.push(`${service}: Uses wrong database import path`);
      console.log(`   ❌ ${service}: Incorrect database import (../config/database)`);
      
      // Auto-fix
      const fixed = content.replace(/require\('\.\.\/config\/database'\)/g, "require('../config/db')");
      fs.writeFileSync(servicePath, fixed, 'utf8');
      diagnostics.fixes.push(`Fixed database import in ${service}`);
      console.log(`   🔧 FIXED: Updated to ../config/db`);
    } else if (content.includes("require('../config/db')")) {
      console.log(`   ✅ ${service}: Correct database import`);
      diagnostics.backendServices.push(service);
    } else {
      console.log(`   ℹ️  ${service}: No database import (OK)`);
      diagnostics.backendServices.push(service);
    }
  }
}

// Check route files
async function checkRoutes() {
  console.log('\n🛣️  [3/8] Checking API Routes...');
  
  const routesDir = path.join(__dirname, 'routes');
  
  if (!fileExists(routesDir)) {
    diagnostics.errors.push('Routes directory not found');
    return;
  }
  
  const routes = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  for (const route of routes) {
    try {
      const routePath = path.join(routesDir, route);
      require(routePath);
      console.log(`   ✅ ${route}: Loadable`);
      diagnostics.routes.push(route);
    } catch (error) {
      diagnostics.errors.push(`${route}: ${error.message}`);
      console.log(`   ❌ ${route}: ${error.message}`);
    }
  }
}

// Check for stale processes
async function checkProcesses() {
  console.log('\n🔍 [4/8] Checking for Node.js Processes...');
  
  try {
    const { stdout } = await execPromise('tasklist | findstr node.exe');
    const processes = stdout.trim().split('\n');
    
    if (processes.length > 0 && processes[0] !== '') {
      console.log(`   ⚠️  Found ${processes.length} Node.js process(es):`);
      processes.forEach(proc => {
        console.log(`      ${proc.trim()}`);
      });
      diagnostics.warnings.push(`${processes.length} Node.js process(es) running - may need manual cleanup`);
    } else {
      console.log('   ✅ No Node.js processes found');
    }
  } catch (error) {
    console.log('   ✅ No Node.js processes found');
  }
}

// Check environment variables
async function checkEnvironment() {
  console.log('\n🌍 [5/8] Checking Environment Configuration...');
  
  const envPath = path.join(__dirname, '.env');
  
  if (!fileExists(envPath)) {
    diagnostics.errors.push('.env file not found');
    console.log('   ❌ .env file not found');
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'DB_HOST',
    'DB_PORT', 
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'PORT'
  ];
  
  const missing = [];
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName)) {
      missing.push(varName);
    }
  });
  
  if (missing.length > 0) {
    diagnostics.warnings.push(`Missing environment variables: ${missing.join(', ')}`);
    console.log(`   ⚠️  Missing variables: ${missing.join(', ')}`);
  } else {
    console.log('   ✅ All required environment variables present');
  }
}

// Check critical dependencies
async function checkDependencies() {
  console.log('\n📦 [6/8] Checking Dependencies...');
  
  const packagePath = path.join(__dirname, 'package.json');
  
  if (!fileExists(packagePath)) {
    diagnostics.errors.push('package.json not found');
    return;
  }
  
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const criticalDeps = ['express', 'pg', 'dotenv', 'cors', 'axios'];
  
  const missing = criticalDeps.filter(dep => !pkg.dependencies[dep]);
  
  if (missing.length > 0) {
    diagnostics.errors.push(`Missing critical dependencies: ${missing.join(', ')}`);
    console.log(`   ❌ Missing: ${missing.join(', ')}`);
  } else {
    console.log('   ✅ All critical dependencies present');
  }
  
  // Check if node_modules exists
  if (!fileExists(path.join(__dirname, 'node_modules'))) {
    diagnostics.warnings.push('node_modules not found - run npm install');
    console.log('   ⚠️  node_modules not found');
  }
}

// Check server file
async function checkServerFile() {
  console.log('\n🚀 [7/8] Checking Server Configuration...');
  
  const serverPath = path.join(__dirname, 'server.js');
  
  if (!fileExists(serverPath)) {
    diagnostics.errors.push('server.js not found');
    console.log('   ❌ server.js not found');
    return;
  }
  
  console.log('   ✅ server.js exists');
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // Check for common issues
  if (!content.includes('require') && !content.includes('import')) {
    diagnostics.errors.push('server.js appears to be empty or malformed');
    console.log('   ❌ server.js appears empty');
  }
}

// Generate report
async function generateReport() {
  console.log('\n📋 [8/8] Generating Diagnostic Report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      databaseConnection: diagnostics.databaseConnection,
      servicesChecked: diagnostics.backendServices.length,
      routesLoaded: diagnostics.routes.length,
      errorsFound: diagnostics.errors.length,
      warningsFound: diagnostics.warnings.length,
      fixesApplied: diagnostics.fixes.length
    },
    details: diagnostics
  };
  
  const reportPath = path.join(__dirname, 'diagnostic-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`\n   ✅ Report saved to: diagnostic-report.json`);
  
  return report;
}

// Print summary
function printSummary(report) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n🔍 System Status:`);
  console.log(`   Database Connection: ${report.summary.databaseConnection ? '✅ Connected' : '❌ Failed'}`);
  console.log(`   Services Checked: ${report.summary.servicesChecked}`);
  console.log(`   Routes Loaded: ${report.summary.routesLoaded}`);
  
  console.log(`\n🛠️  Issues:`);
  console.log(`   Errors: ${report.summary.errorsFound}`);
  console.log(`   Warnings: ${report.summary.warningsFound}`);
  console.log(`   Auto-Fixes Applied: ${report.summary.fixesApplied}`);
  
  if (report.details.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    report.details.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
  }
  
  if (report.details.warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    report.details.warnings.forEach((warn, i) => {
      console.log(`   ${i + 1}. ${warn}`);
    });
  }
  
  if (report.details.fixes.length > 0) {
    console.log(`\n🔧 Auto-Fixes Applied:`);
    report.details.fixes.forEach((fix, i) => {
      console.log(`   ${i + 1}. ${fix}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (report.summary.errorsFound === 0 && report.summary.warningsFound === 0) {
    console.log('✅ ALL CHECKS PASSED - System is healthy!');
  } else if (report.summary.errorsFound > 0) {
    console.log('❌ CRITICAL ERRORS FOUND - Please review and fix');
  } else {
    console.log('⚠️  WARNINGS FOUND - System functional but improvements recommended');
  }
  
  console.log('='.repeat(60) + '\n');
}

// Main execution
async function runDiagnostics() {
  try {
    await checkDatabase();
    await checkServices();
    await checkRoutes();
    await checkProcesses();
    await checkEnvironment();
    await checkDependencies();
    await checkServerFile();
    
    const report = await generateReport();
    printSummary(report);
    
    process.exit(report.summary.errorsFound > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Diagnostic tool crashed:', error);
    process.exit(1);
  }
}

// Run it!
runDiagnostics();
