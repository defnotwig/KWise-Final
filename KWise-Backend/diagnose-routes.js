/**
 * K-Wise Route Diagnostics Script - COMPREHENSIVE VERSION
 * Validates all routes and controllers before server startup
 * Run: node diagnose-routes.js
 * 
 * ✅ UPDATED: Enhanced error detection with detailed validation
 * ✅ Tests all controllers, routes, middleware, and dependencies
 */

console.log('='.repeat(70));
console.log('🔍 K-WISE COMPREHENSIVE ROUTE DIAGNOSTICS');
console.log('='.repeat(70));
console.log();

let hasErrors = false;
let hasWarnings = false;

// ==========================================
// Test 1: Core Dependencies
// ==========================================
console.log('📦 Test 1: Core Dependencies');
console.log('-'.repeat(70));

try {
    const express = require('express');
    console.log('  ✅ express');
} catch (error) {
    console.log('  ❌ express - CRITICAL:', error.message);
    hasErrors = true;
}

try {
    const rateLimit = require('express-rate-limit');
    console.log('  ✅ express-rate-limit');
} catch (error) {
    console.log('  ❌ express-rate-limit:', error.message);
    console.log('     💡 Fix: npm install express-rate-limit');
    hasErrors = true;
}

try {
    const cors = require('cors');
    console.log('  ✅ cors');
} catch (error) {
    console.log('  ❌ cors:', error.message);
    hasErrors = true;
}

console.log();

// ==========================================
// Test 2: Database & Logger
// ==========================================
console.log('🔧 Test 2: Infrastructure');
console.log('-'.repeat(70));

try {
    const db = require('./config/db');
    console.log('  ✅ Database config');
    console.log('     📊 Exports:', Object.keys(db).join(', '));
} catch (error) {
    console.log('  ⚠️  Database config:', error.message);
    hasWarnings = true;
}

try {
    const logger = require('./utils/logger');
    console.log('  ✅ Logger');
    const methods = ['info', 'error', 'warn', 'debug'].filter(m => typeof logger[m] === 'function');
    console.log('     📝 Methods:', methods.join(', '));
} catch (error) {
    console.log('  ⚠️  Logger:', error.message);
    hasWarnings = true;
}

console.log();

// ==========================================
// Test 3: Auth Middleware
// ==========================================
console.log('🔐 Test 3: Authentication Middleware');
console.log('-'.repeat(70));

try {
    const auth = require('./middleware/auth');
    console.log('  ✅ Auth middleware loaded');
    console.log('     📦 Exports:', Object.keys(auth).join(', '));
    
    if (typeof auth.protect !== 'function') {
        console.log('  ❌ auth.protect is NOT a function!');
        hasErrors = true;
    } else {
        console.log('  ✅ auth.protect is a function');
    }
    
    if (typeof auth.restrictTo !== 'function') {
        console.log('  ❌ auth.restrictTo is NOT a function!');
        hasErrors = true;
    } else {
        console.log('  ✅ auth.restrictTo is a function');
    }
} catch (error) {
    console.log('  ❌ Auth middleware FAILED:', error.message);
    hasErrors = true;
}

console.log();

// ==========================================
// Test 4: AI Controller
// ==========================================
console.log('🤖 Test 4: AI Controller');
console.log('-'.repeat(70));

try {
    const aiController = require('./ai/controllers/aiController');
    console.log('  ✅ AI controller loaded');
    console.log('     📦 Type:', typeof aiController);
    console.log('     📦 Constructor:', aiController?.constructor?.name);
    
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(aiController))
        .filter(m => m !== 'constructor');
    
    console.log('     📦 Methods:', methods.length);
    
    // Validate required methods
    const requiredMethods = [
        'getHealthStatus', 'estimateCurrentBuild', 'recommendUpgrade',
        'analyzeCompatibility', 'validateBuildCompatibility',
        'getHotPicks', 'compareProducts'
    ];
    
    const missingMethods = requiredMethods.filter(m => typeof aiController[m] !== 'function');
    
    if (missingMethods.length > 0) {
        console.log('  ❌ Missing methods:', missingMethods.join(', '));
        hasErrors = true;
    } else {
        console.log('  ✅ All required methods present');
    }
    
} catch (error) {
    console.log('  ❌ AI controller FAILED:', error.message);
    console.log('     Stack:', error.stack.split('\n').slice(0, 3).join('\n     '));
    hasErrors = true;
}

console.log();

// ==========================================
// Test 5: AI Routes
// ==========================================
console.log('🛣️  Test 5: AI Routes');
console.log('-'.repeat(70));

try {
    const aiRoutes = require('./ai/routes/aiRoutes');
    console.log('  ✅ AI routes loaded successfully');
    console.log('     📦 Type:', typeof aiRoutes);
} catch (error) {
    console.log('  ❌ AI routes FAILED - THIS IS THE PROBLEM! ☝️');
    console.log('     Error:', error.message);
    console.log('     Stack:', error.stack.split('\n').slice(0, 5).join('\n     '));
    hasErrors = true;
}

console.log();

// ==========================================
// Test 6: Standard Routes
// ==========================================
console.log('🛣️  Test 6: Standard Routes');
console.log('-'.repeat(70));

const routeFiles = [
    { name: 'Auth', path: './routes/auths' },
    { name: 'Users', path: './routes/users' },
    { name: 'Stock', path: './routes/stock' },
    { name: 'Orders', path: './routes/orders' },
    { name: 'Settings', path: './routes/settings' },
    { name: 'Dashboard', path: './routes/dashboard' },
    { name: 'Logs', path: './routes/logs' },
    { name: 'Dev Tools', path: './routes/dev' }
];

routeFiles.forEach(({ name, path }) => {
    try {
        require(path);
        console.log(`  ✅ ${name} routes`);
    } catch (error) {
        console.log(`  ❌ ${name} routes:`, error.message);
        hasErrors = true;
    }
});

console.log();

// ==========================================
// Final Summary
// ==========================================
console.log('='.repeat(70));
console.log('📊 DIAGNOSTIC SUMMARY');
console.log('='.repeat(70));

if (hasErrors) {
    console.log('❌ DIAGNOSTICS FAILED - Critical errors found above');
    console.log();
    console.log('� Next Steps:');
    console.log('   1. Fix the errors marked with ❌');
    console.log('   2. Re-run: node diagnose-routes.js');
    console.log('   3. Once passing, run: npm start');
    console.log();
    process.exit(1);
} else if (hasWarnings) {
    console.log('⚠️  DIAGNOSTICS PASSED with warnings');
    console.log('   All critical components loaded successfully');
    console.log('   Warnings can be safely ignored for now');
    console.log();
    console.log('🚀 Next Steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Test health: curl http://localhost:5000/api/health');
    console.log('   3. Test AI: curl http://localhost:5000/api/ai/health');
    console.log();
    process.exit(0);
} else {
    console.log('✅ ALL DIAGNOSTICS PASSED - Perfect!');
    console.log();
    console.log('🚀 Server is ready to start!');
    console.log();
    console.log('Next Steps:');
    console.log('   1. Start server: npm start');
    console.log('   2. Test health: curl http://localhost:5000/api/health');
    console.log('   3. Test AI health: curl http://localhost:5000/api/ai/health');
    console.log('   4. Frontend: npm start (in K-Wise folder)');
    console.log();
    process.exit(0);
}

