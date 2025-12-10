const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testKioskAPI() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TESTING KIOSK PRE-BUILT API');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const tests = [
        {
            name: 'All Pre-Built Products',
            url: `${API_BASE_URL}/kiosk/prebuilt`,
            params: {}
        },
        {
            name: 'Elite Tier Only',
            url: `${API_BASE_URL}/kiosk/prebuilt`,
            params: { category: 'Elite' }
        },
        {
            name: 'Elite Tier + Gaming Purpose',
            url: `${API_BASE_URL}/kiosk/prebuilt`,
            params: { category: 'Elite', purposes: 'gaming' }
        },
        {
            name: 'Elite Tier + Multimedia Purpose',
            url: `${API_BASE_URL}/kiosk/prebuilt`,
            params: { category: 'Elite', purposes: 'multimedia' }
        },
        {
            name: 'Elite Tier + Gaming + Work + Multimedia',
            url: `${API_BASE_URL}/kiosk/prebuilt`,
            params: { category: 'Elite', purposes: 'gaming,work,multimedia' }
        },
        {
            name: 'High Tier + Multimedia',
            url: `${API_BASE_URL}/kiosk/prebuilt`,
            params: { category: 'High Tier', purposes: 'multimedia' }
        },
        {
            name: 'Starter Tier',
            url: `${API_BASE_URL}/kiosk/prebuilt`,
            params: { category: 'Starter' }
        }
    ];

    let passedTests = 0;
    let failedTests = 0;

    for (const test of tests) {
        try {
            console.log(`\n${'─'.repeat(60)}`);
            console.log(`🧪 TEST: ${test.name}`);
            console.log(`   URL: ${test.url}`);
            console.log(`   Params:`, test.params);

            const response = await axios.get(test.url, { params: test.params });

            if (response.status === 200 && response.data.success) {
                console.log(`   ✅ PASS - Status: ${response.status}`);
                console.log(`   📊 Found ${response.data.count} products`);
                
                if (response.data.data && response.data.data.length > 0) {
                    console.log(`   📦 Sample product:`);
                    const sample = response.data.data[0];
                    console.log(`      - ID: ${sample.id}`);
                    console.log(`      - Name: ${sample.name}`);
                    console.log(`      - Tier: ${sample.tier}`);
                    console.log(`      - Purposes: ${JSON.stringify(sample.purposes)}`);
                    console.log(`      - Components: ${sample.components?.length || 0} items`);
                    console.log(`      - Image: ${sample.image}`);
                }

                passedTests++;
            } else {
                console.log(`   ❌ FAIL - Unexpected response format`);
                console.log(`   Response:`, response.data);
                failedTests++;
            }

        } catch (error) {
            console.log(`   ❌ FAIL - ${error.response?.status || 'Network Error'}`);
            console.log(`   Error: ${error.message}`);
            if (error.response?.data) {
                console.log(`   Response:`, error.response.data);
            }
            failedTests++;
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📊 Total: ${tests.length}`);
    
    if (failedTests === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Kiosk API is working correctly!');
    } else {
        console.log(`\n⚠️  ${failedTests} test(s) failed. Please check backend logs.`);
    }
    console.log('═══════════════════════════════════════════════════════════════\n');
}

// Check if backend is running
async function checkBackend() {
    try {
        await axios.get(`${API_BASE_URL}/health`);
        return true;
    } catch (error) {
        console.log('❌ Backend is not running! Please start the backend server first.');
        console.log('   Run: cd KWise-Backend && npm start\n');
        return false;
    }
}

(async () => {
    const isBackendRunning = await checkBackend();
    if (isBackendRunning) {
        await testKioskAPI();
    }
})();
