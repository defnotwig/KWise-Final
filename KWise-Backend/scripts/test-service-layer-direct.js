/**
 * K-WISE PRIORITY 3: SIMPLIFIED SERVICE LAYER TEST
 * Tests the real-world data service directly (bypassing API authentication)
 * This will help identify if issues are with services or just auth
 */

const { Pool } = require('pg');
require('dotenv').config();
const realWorldDataService = require('../services/realWorldDataService');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'KWiseDB',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'humbleludwig13'
};

const pool = new Pool(DB_CONFIG);

async function testServices() {
    console.log('🧪 Testing Real-World Data Services (Direct)...\n');
    
    let passed = 0;
    let failed = 0;

    try {
        // Get real component IDs and user ID
        const cpuResult = await pool.query('SELECT id FROM pc_parts WHERE category = $1 LIMIT 1', ['CPU']);
        const userResult = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
        
        const componentId = cpuResult.rows[0].id;
        const userId = userResult.rows[0].id;

        console.log(`✅ Using Component ID: ${componentId}, User ID: ${userId}\n`);

        // Test 1: Submit feedback
        try {
            const result = await realWorldDataService.submitUserFeedback({
                user_id: userId,
                component_id: componentId,
                issue_type: 'general',
                severity: 'minor',
                title: 'Test feedback',
                description: 'Test description',
                rating: 5,
                build_context: { cpu: componentId }
            });

            if (result.success) {
                console.log('✅ PASS: Submit feedback');
                passed++;
            } else {
                console.log('❌ FAIL: Submit feedback');
                failed++;
            }
        } catch (error) {
            console.log('❌ FAIL: Submit feedback -', error.message);
            failed++;
        }

        // Test 2: Get component feedback
        try {
            const result = await realWorldDataService.getComponentFeedback(componentId, 10);
            if (Array.isArray(result)) {
                console.log(`✅ PASS: Get component feedback (${result.length} items)`);
                passed++;
            } else {
                console.log('❌ FAIL: Get component feedback');
                failed++;
            }
        } catch (error) {
            console.log('❌ FAIL: Get component feedback -', error.message);
            failed++;
        }

        // Test 3: Check known issues
        try {
            const result = await realWorldDataService.checkKnownIssues([componentId]);
            if (Array.isArray(result)) {
                console.log(`✅ PASS: Check known issues (${result.length} issues)`);
                passed++;
            } else {
                console.log('❌ FAIL: Check known issues');
                failed++;
            }
        } catch (error) {
            console.log('❌ FAIL: Check known issues -', error.message);
            failed++;
        }

        // Test 4: Get real-world compatibility confidence
        try {
            const result = await realWorldDataService.getRealWorldCompatibilityConfidence([componentId]);
            if (result && typeof result.confidence === 'number') {
                console.log(`✅ PASS: Compatibility confidence (${result.confidence}%)`);
                passed++;
            } else {
                console.log('❌ FAIL: Compatibility confidence');
                failed++;
            }
        } catch (error) {
            console.log('❌ FAIL: Compatibility confidence -', error.message);
            failed++;
        }

        // Test 5: Health check
        try {
            const result = realWorldDataService.getHealthStatus();
            if (result.status === 'operational') {
                console.log('✅ PASS: Service health check');
                passed++;
            } else {
                console.log('❌ FAIL: Service health check');
                failed++;
            }
        } catch (error) {
            console.log('❌ FAIL: Service health check -', error.message);
            failed++;
        }

        console.log('\n' + '='.repeat(60));
        console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
        console.log(`   Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
        console.log('='.repeat(60));

        await pool.end();
        process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('❌ Test suite failed:', error);
        await pool.end();
        process.exit(1);
    }
}

testServices();
