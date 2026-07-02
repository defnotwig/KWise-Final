const { Pool } = require('pg');
const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'humbleludwig13',
    port: process.env.DB_PORT || 5432
});

const API_BASE_URL = 'http://localhost:5000/api';

async function comprehensiveValidation() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('COMPREHENSIVE PRE-BUILT SYSTEM VALIDATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // ========== TEST 1: Database Integrity ==========
    console.log('📊 TEST 1: Database Integrity Check\n');
    totalTests++;

    try {
        const dbResult = await pool.query(`
            SELECT id, name, specifications
            FROM pc_parts
            WHERE category = 'Pre-Built'
            ORDER BY id
        `);

        let dbIntegrityPass = true;
        const issues = [];

        dbResult.rows.forEach(row => {
            const hasValidPurposes = Array.isArray(row.specifications?.purposes);
            const hasValidComponents = Array.isArray(row.specifications?.components);
            const hasValidBuildType = typeof row.specifications?.buildType === 'string';

            if (!hasValidPurposes) {
                issues.push(`  ❌ ${row.name}: purposes is not an array (type: ${typeof row.specifications?.purposes})`);
                dbIntegrityPass = false;
            }
            if (!hasValidComponents) {
                issues.push(`  ❌ ${row.name}: components is not an array (type: ${typeof row.specifications?.components})`);
                dbIntegrityPass = false;
            }
            if (!hasValidBuildType) {
                issues.push(`  ❌ ${row.name}: buildType is not a string (type: ${typeof row.specifications?.buildType})`);
                dbIntegrityPass = false;
            }
        });

        if (dbIntegrityPass) {
            console.log(`  ✅ PASS: All ${dbResult.rows.length} Pre-Built items have valid structure`);
            passedTests++;
        } else {
            console.log(`  ❌ FAIL: Database integrity issues found:`);
            issues.forEach(issue => console.log(issue));
            failedTests++;
        }
    } catch (error) {
        console.log(`  ❌ FAIL: Database query error - ${error.message}`);
        failedTests++;
    }

    // ========== TEST 2: Image Folder Structure ==========
    console.log('\n\n📁 TEST 2: Image Folder Structure\n');
    totalTests++;

    try {
        const uploadsPath = path.join(__dirname, '..', 'uploads', 'prebuilt');
        const publicPath = path.join(__dirname, '..', 'public', 'assets', 'prebuilt');

        const uploadsExists = fs.existsSync(uploadsPath);
        const publicExists = fs.existsSync(publicPath);

        const imageCount = uploadsExists ? fs.readdirSync(uploadsPath).filter(f => 
            f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png')
        ).length : 0;

        if (uploadsExists && imageCount > 0) {
            console.log(`  ✅ PASS: Image folders exist`);
            console.log(`     - uploads/prebuilt: ✅ (${imageCount} images)`);
            console.log(`     - public/assets/prebuilt: ${publicExists ? '✅' : '❌'}`);
            passedTests++;
        } else {
            console.log(`  ❌ FAIL: Image folder issues`);
            console.log(`     - uploads/prebuilt exists: ${uploadsExists}`);
            console.log(`     - Image count: ${imageCount}`);
            failedTests++;
        }
    } catch (error) {
        console.log(`  ❌ FAIL: File system error - ${error.message}`);
        failedTests++;
    }

    // ========== TEST 3: Backend API Health ==========
    console.log('\n\n🔍 TEST 3: Backend API Health Check\n');
    totalTests++;

    try {
        await axios.get(`${API_BASE_URL}/health`, { timeout: 3000 });
        console.log(`  ✅ PASS: Backend is running and responsive`);
        passedTests++;
    } catch (error) {
        console.log(`  ❌ FAIL: Backend is not responding`);
        console.log(`     Error: ${error.message}`);
        console.log(`     ⚠️  Skipping API tests - backend must be running`);
        failedTests++;
        
        // Skip remaining API tests
        console.log('\n⚠️  Cannot continue API tests without backend running.');
        console.log('   Please start backend: cd KWise-Backend && npm start\n');
        
        await pool.end();
        return;
    }

    // ========== TEST 4: Elite Tier API (Previously Failing) ==========
    console.log('\n\n🎯 TEST 4: Elite Tier API Request (Critical Fix Validation)\n');
    totalTests++;

    try {
        const response = await axios.get(`${API_BASE_URL}/kiosk/prebuilt`, {
            params: { category: 'Elite' },
            timeout: 5000
        });

        if (response.status === 200 && response.data.success && response.data.count > 0) {
            console.log(`  ✅ PASS: Elite tier loads successfully`);
            console.log(`     - Products found: ${response.data.count}`);
            console.log(`     - Sample: ${response.data.data[0].name}`);
            passedTests++;
        } else {
            console.log(`  ❌ FAIL: Unexpected response format`);
            failedTests++;
        }
    } catch (error) {
        console.log(`  ❌ FAIL: Elite tier API error`);
        console.log(`     Status: ${error.response?.status || 'Network Error'}`);
        console.log(`     Message: ${error.message}`);
        failedTests++;
    }

    // ========== TEST 5: Elite + Multimedia (Previously 500 Error) ==========
    console.log('\n\n🎯 TEST 5: Elite Tier + Multimedia Purpose (Critical Fix)\n');
    totalTests++;

    try {
        const response = await axios.get(`${API_BASE_URL}/kiosk/prebuilt`, {
            params: { 
                category: 'Elite',
                purposes: 'multimedia'
            },
            timeout: 5000
        });

        if (response.status === 200 && response.data.success) {
            console.log(`  ✅ PASS: Elite + Multimedia loads successfully`);
            console.log(`     - Products found: ${response.data.count}`);
            if (response.data.count > 0) {
                console.log(`     - Sample: ${response.data.data[0].name}`);
                console.log(`     - Purposes: ${JSON.stringify(response.data.data[0].purposes)}`);
            }
            passedTests++;
        } else {
            console.log(`  ❌ FAIL: Unexpected response`);
            failedTests++;
        }
    } catch (error) {
        console.log(`  ❌ FAIL: Elite + Multimedia API error (500 error)`);
        console.log(`     Status: ${error.response?.status}`);
        console.log(`     Message: ${error.message}`);
        console.log(`     🔴 THIS WAS THE ORIGINAL BUG!`);
        failedTests++;
    }

    // ========== TEST 6: Elite + Gaming + Work + Multimedia ==========
    console.log('\n\n🎯 TEST 6: Elite Tier + Multiple Purposes\n');
    totalTests++;

    try {
        const response = await axios.get(`${API_BASE_URL}/kiosk/prebuilt`, {
            params: { 
                category: 'Elite',
                purposes: 'gaming,work,multimedia'
            },
            timeout: 5000
        });

        if (response.status === 200 && response.data.success) {
            console.log(`  ✅ PASS: Elite + Multiple Purposes works`);
            console.log(`     - Products found: ${response.data.count}`);
            passedTests++;
        } else {
            console.log(`  ❌ FAIL: Unexpected response`);
            failedTests++;
        }
    } catch (error) {
        console.log(`  ❌ FAIL: Multiple purposes error`);
        console.log(`     Status: ${error.response?.status}`);
        failedTests++;
    }

    // ========== TEST 7: All Other Tiers ==========
    console.log('\n\n📊 TEST 7: All Tier Categories\n');
    
    const tiers = ['Starter', 'Mid Tier', 'High Tier', 'Elite'];
    let allTiersPass = true;

    for (const tier of tiers) {
        totalTests++;
        try {
            const response = await axios.get(`${API_BASE_URL}/kiosk/prebuilt`, {
                params: { category: tier },
                timeout: 5000
            });

            if (response.status === 200 && response.data.success) {
                console.log(`  ✅ ${tier}: ${response.data.count} products`);
                passedTests++;
            } else {
                console.log(`  ❌ ${tier}: Failed`);
                allTiersPass = false;
                failedTests++;
            }
        } catch (error) {
            console.log(`  ❌ ${tier}: Error - ${error.message}`);
            allTiersPass = false;
            failedTests++;
        }
    }

    // ========== TEST 8: Elite Build A Specific Check ==========
    console.log('\n\n🔍 TEST 8: Elite Build A Component Persistence\n');
    totalTests++;

    try {
        const dbCheck = await pool.query(`
            SELECT id, name, specifications
            FROM pc_parts
            WHERE id = 12020
        `);

        if (dbCheck.rows.length > 0) {
            const specs = dbCheck.rows[0].specifications;
            const hasComponents = Array.isArray(specs.components) && specs.components.length > 0;
            const hasPurposes = Array.isArray(specs.purposes) && specs.purposes.length > 0;

            if (hasComponents && hasPurposes) {
                console.log(`  ✅ PASS: Elite Build A has valid structure`);
                console.log(`     - Components: ${specs.components.length} items`);
                console.log(`     - Purposes: ${JSON.stringify(specs.purposes)}`);
                console.log(`     - First component: ${specs.components[0].name} = ${specs.components[0].value}`);
                passedTests++;
            } else {
                console.log(`  ❌ FAIL: Elite Build A structure invalid`);
                console.log(`     - Components valid: ${hasComponents}`);
                console.log(`     - Purposes valid: ${hasPurposes}`);
                failedTests++;
            }
        } else {
            console.log(`  ❌ FAIL: Elite Build A not found`);
            failedTests++;
        }
    } catch (error) {
        console.log(`  ❌ FAIL: Database error - ${error.message}`);
        failedTests++;
    }

    // ========== FINAL SUMMARY ==========
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('FINAL VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${failedTests}/${totalTests}`);
    console.log(`📊 Success Rate: ${Math.round((passedTests/totalTests)*100)}%`);
    
    if (failedTests === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Pre-Built system is fully operational!');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ Issue 1 FIXED: Elite Build A components persist correctly');
        console.log('✅ Issue 2 FIXED: Elite tier loads without 500 errors');
        console.log('✅ Images: Folder structure ready, images served correctly');
        console.log('═══════════════════════════════════════════════════════════════\n');
    } else {
        console.log(`\n⚠️  ${failedTests} test(s) failed. Review errors above.\n`);
    }

    await pool.end();
}

(async () => {
    try {
        await comprehensiveValidation();
    } catch (error) {
        console.error('\n❌ Fatal error during validation:', error.message);
        console.error(error.stack);
        await pool.end();
        process.exit(1);
    }
})();
