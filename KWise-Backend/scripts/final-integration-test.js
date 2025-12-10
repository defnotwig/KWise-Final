const { query } = require('../config/db');
const axios = require('axios');

async function finalIntegrationTest() {
    try {
        console.log('═'.repeat(80));
        console.log('   FINAL INTEGRATION TEST - PRE-BUILT SYSTEM');
        console.log('═'.repeat(80));
        console.log('\n');
        
        let allTestsPassed = true;
        let testResults = [];
        
        // ============================================================
        // TEST 1: Database Structure Validation
        // ============================================================
        console.log('TEST 1: Database Structure Validation');
        console.log('─'.repeat(80));
        
        const allPreBuilt = await query(`
            SELECT id, name, image_url, specifications
            FROM pc_parts
            WHERE category = 'Pre-Built'
            ORDER BY id
        `);
        
        const invalidItems = allPreBuilt.rows.filter(item => {
            const specs = item.specifications;
            return !(
                Array.isArray(specs?.components) &&
                Array.isArray(specs?.componentLinks) &&
                typeof specs?.buildType === 'string' &&
                Array.isArray(specs?.purposes)
            );
        });
        
        if (invalidItems.length === 0) {
            console.log(`✅ PASS: All ${allPreBuilt.rows.length} Pre-Built items have valid specifications`);
            testResults.push({ test: 'Database Structure', status: 'PASS' });
        } else {
            console.log(`❌ FAIL: ${invalidItems.length} items have invalid specifications`);
            invalidItems.forEach(item => console.log(`  - ${item.name} (ID: ${item.id})`));
            testResults.push({ test: 'Database Structure', status: 'FAIL' });
            allTestsPassed = false;
        }
        console.log('\n');
        
        // ============================================================
        // TEST 2: Elite Build A Specific Check
        // ============================================================
        console.log('TEST 2: Elite Build A Corruption Check');
        console.log('─'.repeat(80));
        
        const eliteBuildA = await query('SELECT * FROM pc_parts WHERE id = 12020');
        const specs = eliteBuildA.rows[0]?.specifications;
        
        const eliteBuildAValid = 
            specs?.buildType === 'Elite' &&
            Array.isArray(specs?.components) &&
            specs.components.length === 8 &&
            specs.components.every(c => c.name && c.value);
        
        if (eliteBuildAValid) {
            console.log('✅ PASS: Elite Build A has correct specifications');
            console.log(`  Build Type: ${specs.buildType}`);
            console.log(`  Components: ${specs.components.length} items`);
            testResults.push({ test: 'Elite Build A Fix', status: 'PASS' });
        } else {
            console.log('❌ FAIL: Elite Build A still has issues');
            testResults.push({ test: 'Elite Build A Fix', status: 'FAIL' });
            allTestsPassed = false;
        }
        console.log('\n');
        
        // ============================================================
        // TEST 3: Component Structure Format
        // ============================================================
        console.log('TEST 3: Component Structure Format (name/value)');
        console.log('─'.repeat(80));
        
        const componentStructureIssues = allPreBuilt.rows.filter(item => {
            const specs = item.specifications;
            if (!Array.isArray(specs?.components)) return true;
            
            return !specs.components.every(comp => 
                comp.hasOwnProperty('name') && 
                comp.hasOwnProperty('value') &&
                typeof comp.name === 'string' &&
                typeof comp.value === 'string'
            );
        });
        
        if (componentStructureIssues.length === 0) {
            console.log('✅ PASS: All components use correct {name, value} structure');
            testResults.push({ test: 'Component Structure', status: 'PASS' });
        } else {
            console.log(`❌ FAIL: ${componentStructureIssues.length} items have incorrect component structure`);
            componentStructureIssues.forEach(item => console.log(`  - ${item.name}`));
            testResults.push({ test: 'Component Structure', status: 'FAIL' });
            allTestsPassed = false;
        }
        console.log('\n');
        
        // ============================================================
        // TEST 4: Image Files Existence
        // ============================================================
        console.log('TEST 4: Image Files Existence');
        console.log('─'.repeat(80));
        
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(__dirname, '..', 'uploads', 'prebuilt');
        
        const missingImages = allPreBuilt.rows.filter(item => {
            if (!item.image_url) return true;
            const filename = item.image_url.replace('/uploads/prebuilt/', '');
            const filepath = path.join(uploadDir, filename);
            return !fs.existsSync(filepath);
        });
        
        if (missingImages.length === 0) {
            console.log(`✅ PASS: All ${allPreBuilt.rows.length} image files exist`);
            testResults.push({ test: 'Image Files', status: 'PASS' });
        } else {
            console.log(`❌ FAIL: ${missingImages.length} image files missing`);
            missingImages.forEach(item => console.log(`  - ${item.name}`));
            testResults.push({ test: 'Image Files', status: 'FAIL' });
            allTestsPassed = false;
        }
        console.log('\n');
        
        // ============================================================
        // TEST 5: Kiosk API Response
        // ============================================================
        console.log('TEST 5: Kiosk API Response');
        console.log('─'.repeat(80));
        
        try {
            const response = await axios.get('http://localhost:5000/api/kiosk/prebuilt');
            
            if (response.data.success && response.data.count === 13) {
                // Check all products have required fields
                const invalidProducts = response.data.data.filter(p => 
                    !p.id || !p.name || !p.tier || !p.image || 
                    !Array.isArray(p.components) || !Array.isArray(p.purposes)
                );
                
                if (invalidProducts.length === 0) {
                    console.log('✅ PASS: Kiosk API returns 13 valid products');
                    console.log(`  Sample: ${response.data.data[0].name} (${response.data.data[0].tier})`);
                    testResults.push({ test: 'Kiosk API', status: 'PASS' });
                } else {
                    console.log(`❌ FAIL: ${invalidProducts.length} products have missing fields`);
                    testResults.push({ test: 'Kiosk API', status: 'FAIL' });
                    allTestsPassed = false;
                }
            } else {
                console.log('❌ FAIL: API response invalid or incorrect count');
                testResults.push({ test: 'Kiosk API', status: 'FAIL' });
                allTestsPassed = false;
            }
        } catch (error) {
            console.log('❌ FAIL: API request failed:', error.message);
            testResults.push({ test: 'Kiosk API', status: 'FAIL' });
            allTestsPassed = false;
        }
        console.log('\n');
        
        // ============================================================
        // TEST 6: Monitor Availability
        // ============================================================
        console.log('TEST 6: Monitor Availability for Addons');
        console.log('─'.repeat(80));
        
        const monitorResult = await query(`
            SELECT COUNT(*) as count
            FROM pc_parts
            WHERE category = 'Monitor' AND is_active = true AND kiosk_visible = true
        `);
        
        const monitorCount = parseInt(monitorResult.rows[0].count);
        
        if (monitorCount >= 28) {
            console.log(`✅ PASS: ${monitorCount} monitors available (required: 28)`);
            testResults.push({ test: 'Monitor Availability', status: 'PASS' });
        } else {
            console.log(`❌ FAIL: Only ${monitorCount} monitors available (required: 28)`);
            testResults.push({ test: 'Monitor Availability', status: 'FAIL' });
            allTestsPassed = false;
        }
        console.log('\n');
        
        // ============================================================
        // TEST 7: Tier Distribution
        // ============================================================
        console.log('TEST 7: Tier Distribution');
        console.log('─'.repeat(80));
        
        const tierCounts = {
            'Starter': 0,
            'Mid Tier': 0,
            'High Tier': 0,
            'Elite': 0
        };
        
        allPreBuilt.rows.forEach(item => {
            const tier = item.specifications?.buildType;
            if (tierCounts.hasOwnProperty(tier)) {
                tierCounts[tier]++;
            }
        });
        
        const allTiersPresent = Object.values(tierCounts).every(count => count > 0);
        
        if (allTiersPresent) {
            console.log('✅ PASS: All tiers represented');
            Object.entries(tierCounts).forEach(([tier, count]) => {
                console.log(`  ${tier}: ${count} items`);
            });
            testResults.push({ test: 'Tier Distribution', status: 'PASS' });
        } else {
            console.log('❌ FAIL: Missing tiers');
            Object.entries(tierCounts).forEach(([tier, count]) => {
                console.log(`  ${tier}: ${count} items`);
            });
            testResults.push({ test: 'Tier Distribution', status: 'FAIL' });
            allTestsPassed = false;
        }
        console.log('\n');
        
        // ============================================================
        // FINAL SUMMARY
        // ============================================================
        console.log('═'.repeat(80));
        console.log('   FINAL INTEGRATION TEST SUMMARY');
        console.log('═'.repeat(80));
        console.log('\n');
        
        console.log('Test Results:');
        console.log('─'.repeat(80));
        testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${result.test}: ${result.status}`);
        });
        console.log('\n');
        
        const passCount = testResults.filter(r => r.status === 'PASS').length;
        const failCount = testResults.filter(r => r.status === 'FAIL').length;
        
        console.log(`Total Tests: ${testResults.length}`);
        console.log(`Passed: ${passCount}`);
        console.log(`Failed: ${failCount}`);
        console.log('\n');
        
        if (allTestsPassed) {
            console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
            console.log('║                                                                           ║');
            console.log('║   🎉  ALL TESTS PASSED! PRE-BUILT SYSTEM FULLY FUNCTIONAL!  🎉          ║');
            console.log('║                                                                           ║');
            console.log('║   ✅ Database: All items valid                                           ║');
            console.log('║   ✅ Elite Build A: Fixed and validated                                 ║');
            console.log('║   ✅ Components: Correct structure                                       ║');
            console.log('║   ✅ Images: All files exist                                             ║');
            console.log('║   ✅ API: Responding correctly                                           ║');
            console.log('║   ✅ Monitors: 28 available                                              ║');
            console.log('║   ✅ Tiers: All represented                                              ║');
            console.log('║                                                                           ║');
            console.log('║   🚀 SYSTEM STATUS: PRODUCTION READY                                     ║');
            console.log('║                                                                           ║');
            console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
        } else {
            console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
            console.log('║                                                                           ║');
            console.log('║   ⚠️  SOME TESTS FAILED - SYSTEM REQUIRES ATTENTION  ⚠️                 ║');
            console.log('║                                                                           ║');
            console.log('║   Please review failed tests above and address issues.                   ║');
            console.log('║                                                                           ║');
            console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
        }
        console.log('\n');
        console.log('═'.repeat(80));
        
        process.exit(allTestsPassed ? 0 : 1);
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR during integration test:', error);
        process.exit(1);
    }
}

finalIntegrationTest();
