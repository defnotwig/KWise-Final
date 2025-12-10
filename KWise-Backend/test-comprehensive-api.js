const http = require('http');

const BASE_URL = 'localhost';
const PORT = 5000;

async function makeRequest(method, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_URL,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function runAPITests() {
    console.log('\n🧪 K-WISE API ENDPOINT COMPREHENSIVE TEST\n');
    console.log('=' .repeat(70));
    
    let passedTests = 0;
    let failedTests = 0;
    
    async function testEndpoint(name, method, path, expectedStatus = 200) {
        try {
            const response = await makeRequest(method, path);
            
            if (response.status === expectedStatus) {
                console.log(`✅ ${name}`);
                const preview = typeof response.data === 'string' 
                    ? response.data.substring(0, 100)
                    : JSON.stringify(response.data).substring(0, 100);
                console.log(`   Status: ${response.status} | Data: ${preview}...`);
                passedTests++;
                return true;
            } else {
                console.log(`❌ ${name}`);
                console.log(`   Expected: ${expectedStatus} | Got: ${response.status}`);
                console.log(`   Response: ${JSON.stringify(response.data).substring(0, 150)}...`);
                failedTests++;
                return false;
            }
        } catch (error) {
            console.log(`❌ ${name} - ERROR: ${error.message}`);
            failedTests++;
            return false;
        }
    }
    
    console.log('\n📡 Testing Core Endpoints...\n');
    
    // Test 1: Health Check
    await testEndpoint('Test 1: Health Check', 'GET', '/api/health');
    
    // Test 2: Compatibility Status
    await testEndpoint('Test 2: Compatibility Service Status', 'GET', '/api/compatibility/status');
    
    // Test 3: Get Stock Categories
    await testEndpoint('Test 3: Get All Categories', 'GET', '/api/stock/categories');
    
    // Test 4: Get All Stock Items
    await testEndpoint('Test 4: Get All Stock Items (Public)', 'GET', '/api/stock');
    
    // Test 5: Get Stock Stats
    await testEndpoint('Test 5: Get Stock Stats', 'GET', '/api/stock/stats');
    
    // Test 6: Get Brands
    await testEndpoint('Test 6: Get All Brands', 'GET', '/api/stock/brands');
    
    // Test 7: Get Price Range (requires category parameter)
    await testEndpoint('Test 7: Get Price Range (CPU)', 'GET', '/api/stock/price-range?category=CPU');
    
    // Test 8: Search Stock (with query parameter)
    await testEndpoint('Test 8: Search Stock (query=Intel)', 'GET', '/api/stock/search?q=Intel');
    
    // Test 9: Get CPU Spec Fields
    await testEndpoint('Test 9: Get CPU Spec Fields', 'GET', '/api/stock/meta/CPU');
    
    // Test 10: Low Stock Items
    await testEndpoint('Test 10: Get Low Stock Items', 'GET', '/api/stock/low-stock');
    
    console.log('\n' + '='.repeat(70));
    console.log(`\n📊 TEST RESULTS:`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
    
    if (failedTests === 0) {
        console.log('\n🎉 ALL API TESTS PASSED!\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Review the results above.\n');
        process.exit(1);
    }
}

runAPITests();
