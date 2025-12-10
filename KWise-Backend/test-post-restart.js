/**
 * 🧪 POST-RESTART IMAGE VERIFICATION TEST
 * 
 * Run this AFTER restarting the backend server to verify
 * that all images are being served correctly via HTTP.
 * 
 * Usage: node test-post-restart.js
 */

const http = require('http');
const { query } = require('./config/database');

const SERVER_URL = 'http://localhost:5000';

// Test image URLs from the error log
const TEST_IMAGES = [
    '/assets/parts/case/1stplayer-miku-2-1763560278968.webp',
    '/assets/parts/case/coolman-reyna-1758308823350.webp',
    '/assets/parts/case/1stplayer-trilobite-t5-mesh-1758312058455.webp',
    '/assets/parts/case/coolman-spectra-1758311110092.webp',
    '/assets/parts/case/asus-tuf-gaming-gt501-1758311655755.webp',
    '/assets/StarterBuildA.webp',
    '/assets/MidTierBuildA.webp',
    '/assets/HighMidTierBuildA.webp'
];

console.log('\n🧪 POST-RESTART IMAGE VERIFICATION TEST');
console.log('='  .repeat(80));
console.log('\nTesting HTTP image serving from:', SERVER_URL);
console.log('='  .repeat(80));

/**
 * Test a single image URL
 */
function testImageUrl(url) {
    return new Promise((resolve) => {
        const fullUrl = `${SERVER_URL}${url}`;
        
        http.get(fullUrl, (res) => {
            const { statusCode, headers } = res;
            
            // Consume response data to free up memory
            res.resume();
            
            resolve({
                url,
                statusCode,
                contentType: headers['content-type'],
                contentLength: headers['content-length'],
                success: statusCode === 200
            });
        }).on('error', (err) => {
            resolve({
                url,
                statusCode: 0,
                error: err.message,
                success: false
            });
        });
    });
}

/**
 * Test database image paths
 */
async function testDatabaseImages() {
    try {
        const result = await query(`
            SELECT id, name, category, image_url
            FROM pc_parts
            WHERE category = 'Case'
            AND image_url IS NOT NULL
            LIMIT 10
        `);
        
        console.log(`\n\n📊 DATABASE IMAGE PATH TEST (10 Case products):`);
        console.log('-'.repeat(80));
        
        const tests = result.rows.map(row => testImageUrl(row.image_url));
        const results = await Promise.all(tests);
        
        results.forEach((result, index) => {
            const row = result.rows?.[index];
            const status = result.success ? '✅' : '❌';
            const code = result.statusCode || 'ERR';
            const size = result.contentLength ? `${(result.contentLength / 1024).toFixed(1)} KB` : 'N/A';
            
            console.log(`${status} [${code}] ${result.url.substring(result.url.lastIndexOf('/') + 1).padEnd(50)} ${size}`);
        });
        
        return results;
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        return [];
    }
}

/**
 * Main test function
 */
async function runTests() {
    console.log('\n\n1️⃣  SPECIFIC IMAGE URL TESTS (from error log):');
    console.log('-'.repeat(80));
    
    const results = [];
    
    for (const url of TEST_IMAGES) {
        const result = await testImageUrl(url);
        results.push(result);
        
        const status = result.success ? '✅' : '❌';
        const code = result.statusCode || 'ERR';
        const size = result.contentLength ? `${(result.contentLength / 1024).toFixed(1)} KB` : 'N/A';
        const filename = url.substring(url.lastIndexOf('/') + 1);
        
        console.log(`${status} [${code}] ${filename.padEnd(50)} ${size}`);
        
        if (!result.success && result.error) {
            console.log(`   ⚠️  Error: ${result.error}`);
        }
    }
    
    // Test database images
    const dbResults = await testDatabaseImages();
    
    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY:');
    console.log('='.repeat(80));
    
    const allResults = [...results, ...dbResults];
    const passed = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => !r.success).length;
    const total = allResults.length;
    
    console.log(`\nTotal tests:     ${total}`);
    console.log(`✅ Passed:       ${passed} (${((passed/total)*100).toFixed(1)}%)`);
    console.log(`❌ Failed:       ${failed} (${((failed/total)*100).toFixed(1)}%)`);
    
    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('\n✅ Image serving is working correctly!');
        console.log('✅ Stock Management should display all images.');
        console.log('✅ No 404 errors should appear in browser console.');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED!');
        console.log('\n❌ Troubleshooting steps:');
        console.log('   1. Verify backend server is running on port 5000');
        console.log('   2. Check backend terminal for errors');
        console.log('   3. Verify files exist: node verify-image-migration.js');
        console.log('   4. Check server.js line 512 has: express.static(path.join(__dirname, "public"))');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Next Steps:');
    console.log('   1. Open browser: http://localhost:3000/admin/stock');
    console.log('   2. Clear cache: Ctrl+Shift+Delete');
    console.log('   3. Navigate to Case category');
    console.log('   4. Verify images display correctly');
    console.log('   5. Check browser console (F12) for errors\n');
    
    process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runTests().catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
});
