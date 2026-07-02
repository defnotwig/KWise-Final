const axios = require('axios');
const path = require('node:path');
const fs = require('node:fs');

const BASE_URL = 'http://localhost:5000/api';

async function runComprehensiveTests() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔧 COMPREHENSIVE KIOSK & ADMIN FIXES VALIDATION');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    let passedTests = 0;
    let failedTests = 0;
    const failedDetails = [];
    
    // ============================================
    // ISSUE 1: Power Supply Search in Pre-Built Components
    // ============================================
    console.log('📋 TEST 1: Power Supply Search (Issue #1)');
    console.log('   Testing: /api/stock/items/Power Supply\n');
    
    try {
        const response = await axios.get(`${BASE_URL}/stock/items/Power Supply`, {
            headers: {
                'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
            }
        });
        
        if (response.data.success && response.data.items && response.data.items.length > 0) {
            console.log(`   ✅ PASS: Found ${response.data.items.length} Power Supply items`);
            console.log(`   📝 Mapped category: "${response.data.originalCategory}" -> "${response.data.category}"`);
            console.log(`   Sample items:`);
            response.data.items.slice(0, 3).forEach(item => {
                console.log(`      • ${item.name} (${item.brand}) - ₱${item.price}`);
            });
            passedTests++;
        } else {
            throw new Error('No Power Supply items found');
        }
    } catch (error) {
        console.log(`   ❌ FAIL: ${error.message}`);
        failedTests++;
        failedDetails.push({ test: 'Power Supply Search', error: error.message });
    }
    
    console.log('');
    
    // ============================================
    // TEST 2: PSU Search (Database Category Name)
    // ============================================
    console.log('📋 TEST 2: PSU Search (Database Category)');
    console.log('   Testing: /api/stock/items/PSU\n');
    
    try {
        const response = await axios.get(`${BASE_URL}/stock/items/PSU`, {
            headers: {
                'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
            }
        });
        
        if (response.data.success && response.data.items && response.data.items.length > 0) {
            console.log(`   ✅ PASS: Found ${response.data.items.length} PSU items`);
            console.log(`   Category: "${response.data.category}"`);
            passedTests++;
        } else {
            throw new Error('No PSU items found');
        }
    } catch (error) {
        console.log(`   ❌ FAIL: ${error.message}`);
        failedTests++;
        failedDetails.push({ test: 'PSU Search', error: error.message });
    }
    
    console.log('');
    
    // ============================================
    // ISSUE 2: Pre-Built Images Not Showing
    // ============================================
    console.log('📋 TEST 3: Pre-Built Product Images (Issue #2)');
    console.log('   Testing: /api/kiosk/prebuilt?category=Elite\n');
    
    try {
        const response = await axios.get(`${BASE_URL}/kiosk/prebuilt?category=Elite`);
        
        if (response.data.success && response.data.data && response.data.data.length > 0) {
            console.log(`   ✅ PASS: Found ${response.data.data.length} Elite Pre-Built products`);
            
            // Check image paths
            let validImages = 0;
            let invalidImages = 0;
            
            console.log(`   🖼️ Image Path Analysis:`);
            response.data.data.forEach(product => {
                const hasValidImage = product.image && product.image.startsWith('/uploads/prebuilt/');
                if (hasValidImage) {
                    validImages++;
                    console.log(`      ✅ ${product.name}: ${product.image}`);
                } else {
                    invalidImages++;
                    console.log(`      ❌ ${product.name}: ${product.image || 'NO IMAGE'}`);
                }
            });
            
            if (invalidImages > 0) {
                throw new Error(`${invalidImages} products have invalid image paths`);
            }
            
            passedTests++;
        } else {
            throw new Error('No Elite Pre-Built products found');
        }
    } catch (error) {
        console.log(`   ❌ FAIL: ${error.message}`);
        failedTests++;
        failedDetails.push({ test: 'Pre-Built Images', error: error.message });
    }
    
    console.log('');
    
    // ============================================
    // TEST 4: Image File Existence
    // ============================================
    console.log('📋 TEST 4: Pre-Built Image Files Exist');
    console.log('   Checking: /uploads/prebuilt/ directory\n');
    
    try {
        const uploadsPath = path.join(__dirname, '..', 'uploads', 'prebuilt');
        
        if (!fs.existsSync(uploadsPath)) {
            throw new Error(`Directory not found: ${uploadsPath}`);
        }
        
        const files = fs.readdirSync(uploadsPath).filter(f => f.endsWith('.webp'));
        
        if (files.length === 0) {
            throw new Error('No .webp files found in uploads/prebuilt/');
        }
        
        console.log(`   ✅ PASS: Found ${files.length} image files`);
        console.log(`   Sample files:`);
        files.slice(0, 5).forEach(file => {
            console.log(`      • ${file}`);
        });
        
        passedTests++;
    } catch (error) {
        console.log(`   ❌ FAIL: ${error.message}`);
        failedTests++;
        failedDetails.push({ test: 'Image Files', error: error.message });
    }
    
    console.log('');
    
    // ============================================
    // TEST 5: All Tier Categories
    // ============================================
    console.log('📋 TEST 5: All Pre-Built Tier Categories');
    console.log('   Testing: Starter, Mid Tier, High Tier, Elite\n');
    
    const tiers = ['Starter', 'Mid Tier', 'High Tier', 'Elite'];
    let tiersPassed = 0;
    
    for (const tier of tiers) {
        try {
            const response = await axios.get(`${BASE_URL}/kiosk/prebuilt?category=${encodeURIComponent(tier)}`);
            
            if (response.data.success && response.data.data.length > 0) {
                console.log(`   ✅ ${tier}: ${response.data.data.length} products`);
                tiersPassed++;
            } else {
                console.log(`   ❌ ${tier}: No products found`);
            }
        } catch (error) {
            console.log(`   ❌ ${tier}: ${error.message}`);
        }
    }
    
    if (tiersPassed === tiers.length) {
        passedTests++;
    } else {
        failedTests++;
        failedDetails.push({ test: 'All Tier Categories', error: `Only ${tiersPassed}/${tiers.length} tiers loaded` });
    }
    
    console.log('');
    
    // ============================================
    // TEST 6: Pre-Built with Purposes Filter
    // ============================================
    console.log('📋 TEST 6: Pre-Built Purpose Filtering');
    console.log('   Testing: Elite + Multimedia purpose\n');
    
    try {
        const response = await axios.get(`${BASE_URL}/kiosk/prebuilt?category=Elite&purposes=multimedia`);
        
        if (response.data.success && response.data.data.length > 0) {
            console.log(`   ✅ PASS: Found ${response.data.data.length} Elite products with Multimedia purpose`);
            response.data.data.forEach(product => {
                console.log(`      • ${product.name} - Purposes: ${product.purposes.join(', ')}`);
            });
            passedTests++;
        } else {
            throw new Error('No Elite products found with Multimedia purpose');
        }
    } catch (error) {
        console.log(`   ❌ FAIL: ${error.message}`);
        failedTests++;
        failedDetails.push({ test: 'Purpose Filtering', error: error.message });
    }
    
    console.log('');
    
    // ============================================
    // SUMMARY
    // ============================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('FINAL VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ Passed: ${passedTests}/6`);
    console.log(`❌ Failed: ${failedTests}/6`);
    console.log(`📊 Success Rate: ${Math.round((passedTests / 6) * 100)}%`);
    console.log('');
    
    if (failedTests > 0) {
        console.log('❌ Failed Tests Details:');
        failedDetails.forEach(({ test, error }) => {
            console.log(`   • ${test}: ${error}`);
        });
        console.log('');
    }
    
    if (passedTests === 6) {
        console.log('🎉 ALL TESTS PASSED! Both issues are completely resolved!');
        console.log('');
        console.log('✅ Issue 1: Power Supply search now works correctly');
        console.log('✅ Issue 2: Pre-Built images display properly');
    } else {
        console.log('⚠️  Some tests failed. Please review the errors above.');
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    process.exit(failedTests > 0 ? 1 : 0);
}

runComprehensiveTests().catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
});
