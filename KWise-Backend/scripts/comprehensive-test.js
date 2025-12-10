const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const TOKEN = process.env.TEST_TOKEN || ''; // Get from env or empty for public endpoints

async function comprehensiveTest() {
    console.log('\n═══════════════════════════════════════════════');
    console.log('   COMPREHENSIVE SYSTEM TEST');
    console.log('═══════════════════════════════════════════════\n');
    
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };
    
    const test = (name, passed, message) => {
        results.tests.push({ name, passed, message });
        if (passed) {
            console.log(`✅ ${name}`);
            if (message) console.log(`   ${message}`);
            results.passed++;
        } else {
            console.log(`❌ ${name}`);
            if (message) console.log(`   ${message}`);
            results.failed++;
        }
    };
    
    try {
        // TEST 1: Fetch Pre-Built Products
        console.log('\n📦 TEST 1: Pre-Built Products API\n');
        const prebuiltRes = await axios.get(`${API_BASE}/kiosk/prebuilt`);
        test(
            'Fetch Pre-Built Products',
            prebuiltRes.data.success && prebuiltRes.data.data.length === 13,
            `Found ${prebuiltRes.data.data.length} Pre-Built products (expected 13)`
        );
        
        // Check first Pre-Built has image
        const firstPrebuilt = prebuiltRes.data.data[0];
        test(
            'Pre-Built has image URL',
            firstPrebuilt.image && firstPrebuilt.image.includes('/uploads/prebuilt/'),
            `Image: ${firstPrebuilt.image}`
        );
        
        // TEST 2: Fetch Monitors
        console.log('\n🖥️  TEST 2: Monitor Products API\n');
        const monitorRes = await axios.get(`${API_BASE}/stock?category=Monitor`);
        test(
            'Fetch Monitor Products',
            monitorRes.data.success && monitorRes.data.data.length === 28,
            `Found ${monitorRes.data.data.length} monitors (expected 28)`
        );
        
        // TEST 3: Component Search (requires auth)
        console.log('\n🔍 TEST 3: Component Search API\n');
        if (TOKEN) {
            try {
                const cpuRes = await axios.get(`${API_BASE}/stock/items/CPU`, {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                });
                test(
                    'Component Search - CPU',
                    cpuRes.data.success && cpuRes.data.items.length > 0,
                    `Found ${cpuRes.data.items.length} CPU items`
                );
            } catch (err) {
                test('Component Search - CPU', false, `Error: ${err.message}`);
            }
        } else {
            test('Component Search - CPU', false, 'Skipped (no auth token)');
        }
        
        // TEST 4: Image File Existence
        console.log('\n🖼️  TEST 4: Image Files\n');
        const fs = require('fs');
        const path = require('path');
        
        const prebuiltImagePath = path.join(__dirname, '../uploads/prebuilt/StarterBuildA.webp');
        test(
            'Pre-Built Image Exists',
            fs.existsSync(prebuiltImagePath),
            `Path: ${prebuiltImagePath}`
        );
        
        const monitorImagePath = path.join(__dirname, '../public/assets/parts/monitor/20-nvision-led-monitor-60hz-1758473646019.webp');
        test(
            'Monitor Image Exists',
            fs.existsSync(monitorImagePath),
            `Path: ${monitorImagePath}`
        );
        
        // TEST 5: Database Counts
        console.log('\n💾 TEST 5: Database Verification\n');
        const db = require('../config/db');
        
        const prebuiltCount = await db.query('SELECT COUNT(*) FROM pc_parts WHERE category = \'Pre-Built\'');
        test(
            'Pre-Built Count in DB',
            prebuiltCount.rows[0].count === '13',
            `Count: ${prebuiltCount.rows[0].count}`
        );
        
        const monitorCount = await db.query('SELECT COUNT(*) FROM pc_parts WHERE category = \'Monitor\'');
        test(
            'Monitor Count in DB',
            monitorCount.rows[0].count === '28',
            `Count: ${monitorCount.rows[0].count}`
        );
        
        const cpuCount = await db.query('SELECT COUNT(*) FROM pc_parts WHERE category = \'CPU\' AND is_active = true');
        test(
            'Active CPU Items in DB',
            parseInt(cpuCount.rows[0].count) > 0,
            `Count: ${cpuCount.rows[0].count}`
        );
        
    } catch (error) {
        test('System Test', false, `Fatal error: ${error.message}`);
    }
    
    // SUMMARY
    console.log('\n═══════════════════════════════════════════════');
    console.log('   TEST SUMMARY');
    console.log('═══════════════════════════════════════════════\n');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total:  ${results.passed + results.failed}`);
    console.log(`🎯 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%\n`);
    
    if (results.failed === 0) {
        console.log('🎉 ALL TESTS PASSED! System is ready.\n');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Review above for details.\n');
        process.exit(1);
    }
}

// Only run if backend server is running
comprehensiveTest().catch(err => {
    console.error('❌ Test suite failed:', err.message);
    console.log('\n⚠️  Make sure backend server is running on http://localhost:5000\n');
    process.exit(1);
});
