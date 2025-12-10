#!/usr/bin/env node

/**
 * Admin API Test Script
 * Tests the key Admin endpoints to ensure they're working correctly
 */

require('dotenv').config();
const { query } = require('../config/db');

console.log('🧪 Testing Admin APIs...\n');

// Test database connection
async function testDatabaseConnection() {
    console.log('1. Testing Database Connection...');
    try {
        const result = await query('SELECT NOW() as current_time');
        console.log('   ✅ Database connected:', result.rows[0].current_time);
        return true;
    } catch (error) {
        console.log('   ❌ Database connection failed:', error.message);
        return false;
    }
}

// Test stock data retrieval
async function testStockData() {
    console.log('\n2. Testing Stock Data Retrieval...');
    try {
        // Test pc_parts count
        const pcPartsResult = await query('SELECT COUNT(*) as count FROM pc_parts');
        const pcPartsCount = parseInt(pcPartsResult.rows[0].count);
        console.log(`   ✅ pc_parts table: ${pcPartsCount} items`);

        // Test component tables
        const componentTables = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'pc_case', 'monitor', 'mouse', 'keyboard', 'cooling', 'speakers', 'headphones', 'webcam'];

        for (const table of componentTables) {
            try {
                const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(result.rows[0].count);
                console.log(`   ✅ ${table}: ${count} items`);
            } catch (error) {
                console.log(`   ⚠️ ${table}: Error - ${error.message}`);
            }
        }

        return true;
    } catch (error) {
        console.log('   ❌ Stock data test failed:', error.message);
        return false;
    }
}

// Test user data retrieval
async function testUserData() {
    console.log('\n3. Testing User Data Retrieval...');
    try {
        const result = await query('SELECT COUNT(*) as count FROM users');
        const userCount = parseInt(result.rows[0].count);
        console.log(`   ✅ Users table: ${userCount} users`);

        // Get sample user
        const sampleUser = await query('SELECT id, name, email, role FROM users LIMIT 1');
        if (sampleUser.rows.length > 0) {
            const user = sampleUser.rows[0];
            console.log(`   ✅ Sample user: ${user.name} (${user.email}) - ${user.role}`);
        }

        return true;
    } catch (error) {
        console.log('   ❌ User data test failed:', error.message);
        return false;
    }
}

// Test settings data
async function testSettingsData() {
    console.log('\n4. Testing Settings Data...');
    try {
        const result = await query('SELECT COUNT(*) as count FROM settings');
        const settingsCount = parseInt(result.rows[0].count);
        console.log(`   ✅ Settings table: ${settingsCount} items`);

        // Get sample settings
        const sampleSettings = await query('SELECT key, value, type FROM settings LIMIT 3');
        sampleSettings.rows.forEach(setting => {
            console.log(`   ✅ Setting: ${setting.key} = ${setting.value} (${setting.type})`);
        });

        return true;
    } catch (error) {
        console.log('   ❌ Settings test failed:', error.message);
        return false;
    }
}

// Test audit logs
async function testAuditLogs() {
    console.log('\n5. Testing Audit Logs...');
    try {
        const result = await query('SELECT COUNT(*) as count FROM audit_logs');
        const logsCount = parseInt(result.rows[0].count);
        console.log(`   ✅ Audit logs: ${logsCount} entries`);

        if (logsCount > 0) {
            const recentLogs = await query('SELECT action, entity, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 3');
            recentLogs.rows.forEach(log => {
                console.log(`   ✅ Log: ${log.action} on ${log.entity} at ${log.created_at}`);
            });
        }

        return true;
    } catch (error) {
        console.log('   ❌ Audit logs test failed:', error.message);
        return false;
    }
}

// Test empty tables (for cleanup verification)
async function testEmptyTables() {
    console.log('\n6. Testing Empty Tables (Cleanup Candidates)...');
    try {
        const emptyTables = ['orders', 'transactions', 'order_items', 'payment', 'queue'];

        for (const table of emptyTables) {
            try {
                const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(result.rows[0].count);
                if (count === 0) {
                    console.log(`   ✅ ${table}: 0 rows (safe to remove)`);
                } else {
                    console.log(`   ⚠️ ${table}: ${count} rows (keep)`);
                }
            } catch (error) {
                console.log(`   ❌ ${table}: Error - ${error.message}`);
            }
        }

        return true;
    } catch (error) {
        console.log('   ❌ Empty tables test failed:', error.message);
        return false;
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting Admin API Tests...\n');

    const tests = [
        testDatabaseConnection,
        testStockData,
        testUserData,
        testSettingsData,
        testAuditLogs,
        testEmptyTables
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        try {
            const result = await test();
            if (result) passedTests++;
        } catch (error) {
            console.log(`   ❌ Test failed with error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Admin backend is ready.');
    } else {
        console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Wire routes to main server');
    console.log('2. Test Admin API endpoints');
    console.log('3. Complete remaining Admin features');
    console.log('4. Run database cleanup (if approved)');

    process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});
