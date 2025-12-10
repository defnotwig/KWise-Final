/**
 * Comprehensive Test for Advanced Compatibility Service
 * Tests power budget, physical clearance, pairwise checking, bottleneck detection
 */

const advancedCompatibilityService = require('../services/advancedCompatibilityService');

console.log('🧪 Starting Advanced Compatibility Service Tests...\n');

// Test Build 1: Balanced Gaming Build (Should pass all checks)
const balancedBuild = {
    cpu: {
        id: 1,
        name: 'Intel Core i5-12400F',
        category: 'CPU',
        specifications: {
            socket: 'LGA1700',
            tdp: 65,
            performance_tier: 'mid-tier',
            max_memory_speed: 3200,
            memory_type: 'DDR4'
        }
    },
    motherboard: {
        id: 2,
        name: 'ASUS Prime B660M-A',
        category: 'Motherboard',
        specifications: {
            socket: 'LGA1700',
            chipset: 'B660',
            form_factor: 'Micro-ATX',
            supported_form_factors: ['Micro-ATX', 'ATX']
        }
    },
    gpu: {
        id: 3,
        name: 'MSI RTX 3060 Ti GAMING X 8GB',
        category: 'GPU',
        specifications: {
            tdp: 200,
            length: 327,
            slots: 2.5,
            performance_tier: 'mid-tier'
        }
    },
    psu: {
        id: 4,
        name: 'Corsair RM650x 650W 80+ Gold',
        category: 'PSU',
        specifications: {
            wattage: 650,
            efficiency: '80+ Gold',
            pcie_8pin: 2,
            length: 140
        }
    },
    case: {
        id: 5,
        name: 'NZXT H510 Flow',
        category: 'Case',
        specifications: {
            max_gpu_length: 381,
            max_cooler_height: 165,
            max_psu_length: 180,
            form_factor: 'ATX',
            supported_form_factors: ['ATX', 'Micro-ATX', 'Mini-ITX']
        }
    },
    cooler: {
        id: 6,
        name: 'be quiet! Dark Rock 4',
        category: 'Cooling',
        specifications: {
            height: 159,
            socket: 'LGA1700',
            tdp: 200,
            ram_clearance: 40
        }
    },
    ram: {
        id: 7,
        name: 'Corsair Vengeance DDR4 16GB (2x8GB) 3200MHz',
        category: 'RAM',
        specifications: {
            type: 'DDR4',
            memory_type: 'DDR4',
            speed: 3200,
            height: 35
        }
    }
};

// Test Build 2: Problematic Build (Should fail multiple checks)
const problematicBuild = {
    cpu: {
        id: 10,
        name: 'Intel Core i3-10100',
        category: 'CPU',
        specifications: {
            socket: 'LGA1200',
            tdp: 65,
            performance_tier: 'entry',
            max_memory_speed: 2666
        }
    },
    motherboard: {
        id: 11,
        name: 'MSI H410M-A',
        category: 'Motherboard',
        specifications: {
            socket: 'LGA1200',
            chipset: 'H410',
            form_factor: 'Micro-ATX'
        }
    },
    gpu: {
        id: 12,
        name: 'RTX 4090 Founders Edition',
        category: 'GPU',
        specifications: {
            tdp: 450,
            length: 304,
            slots: 3,
            performance_tier: 'elite'
        }
    },
    psu: {
        id: 13,
        name: 'Generic 450W 80+ White',
        category: 'PSU',
        specifications: {
            wattage: 450,
            efficiency: 'Standard',
            pcie_8pin: 1
        }
    },
    case: {
        id: 14,
        name: 'Small mATX Case',
        category: 'Case',
        specifications: {
            max_gpu_length: 280,
            max_cooler_height: 140,
            max_psu_length: 160,
            form_factor: 'Micro-ATX'
        }
    },
    cooler: {
        id: 15,
        name: 'Tower Cooler 160mm',
        category: 'Cooling',
        specifications: {
            height: 160,
            socket: 'LGA1200',
            tdp: 180
        }
    },
    ram: {
        id: 16,
        name: 'RGB RAM 3600MHz',
        category: 'RAM',
        specifications: {
            type: 'DDR4',
            speed: 3600,
            height: 45
        }
    }
};

async function runTests() {
    let totalTests = 0;
    let passedTests = 0;

    console.log('='.repeat(80));
    console.log('TEST 1: Balanced Gaming Build Analysis');
    console.log('='.repeat(80));

    try {
        // Test 1.1: Power Budget
        console.log('\n🔋 Test 1.1: Power Budget Analysis');
        totalTests++;
        const powerResult1 = await advancedCompatibilityService.analyzePowerBudget(balancedBuild);
        console.log('Status:', powerResult1.status);
        console.log('Severity:', powerResult1.severity);
        console.log('Message:', powerResult1.message);
        console.log('Peak Power:', powerResult1.analysis?.total_power?.peak + 'W');
        console.log('PSU Load:', powerResult1.analysis?.load_at_peak + '%');
        
        if (powerResult1.compatible && powerResult1.severity !== 'critical') {
            console.log('✅ PASS: Power budget analysis successful');
            passedTests++;
        } else {
            console.log('❌ FAIL: Unexpected power budget result');
        }

        // Test 1.2: Physical Clearance
        console.log('\n📏 Test 1.2: Physical Clearance Analysis');
        totalTests++;
        const clearanceResult1 = await advancedCompatibilityService.analyzePhysicalClearances(balancedBuild);
        console.log('Status:', clearanceResult1.status);
        console.log('Compatible:', clearanceResult1.compatible);
        console.log('Critical Issues:', clearanceResult1.critical_issues?.length || 0);
        console.log('Warnings:', clearanceResult1.warnings?.length || 0);
        
        if (clearanceResult1.compatible) {
            console.log('✅ PASS: All components fit physically');
            passedTests++;
        } else {
            console.log('❌ FAIL: Clearance issues detected');
        }

        // Test 1.3: Pairwise Compatibility
        console.log('\n🔗 Test 1.3: Pairwise Component Checking');
        totalTests++;
        const pairwiseResult1 = await advancedCompatibilityService.analyzePairwiseCompatibility(balancedBuild);
        console.log('Status:', pairwiseResult1.status);
        console.log('Pairs Checked:', pairwiseResult1.summary?.total_pairs_checked || 0);
        console.log('Compatible Pairs:', pairwiseResult1.summary?.compatible_pairs || 0);
        console.log('Critical Issues:', pairwiseResult1.critical_issues?.length || 0);
        
        if (pairwiseResult1.compatible) {
            console.log('✅ PASS: All component pairs compatible');
            passedTests++;
        } else {
            console.log('❌ FAIL: Pairwise incompatibilities detected');
        }

        // Test 1.4: Bottleneck Detection
        console.log('\n🎯 Test 1.4: Bottleneck Detection');
        totalTests++;
        const bottleneckResult1 = await advancedCompatibilityService.analyzeBottlenecks(balancedBuild);
        console.log('Balanced:', bottleneckResult1.balanced);
        console.log('Status:', bottleneckResult1.status);
        console.log('Bottlenecks:', bottleneckResult1.bottlenecks?.length || 0);
        
        if (bottleneckResult1.balanced || bottleneckResult1.bottlenecks?.length === 0) {
            console.log('✅ PASS: No major bottlenecks detected');
            passedTests++;
        } else {
            console.log('❌ FAIL: Unexpected bottlenecks in balanced build');
        }

        // Test 1.5: Full Build Analysis
        console.log('\n🔍 Test 1.5: Full Build Analysis (All Layers)');
        totalTests++;
        const fullResult1 = await advancedCompatibilityService.analyzeFullBuild(balancedBuild);
        console.log('Overall Status:', fullResult1.overall_status);
        console.log('Overall Severity:', fullResult1.overall_severity);
        console.log('Compatible:', fullResult1.compatible);
        console.log('Critical Issues:', fullResult1.summary?.total_critical_issues || 0);
        console.log('Warnings:', fullResult1.summary?.total_warnings || 0);
        
        if (fullResult1.compatible) {
            console.log('✅ PASS: Full build analysis successful');
            passedTests++;
        } else {
            console.log('❌ FAIL: Full build analysis failed');
        }

    } catch (error) {
        console.error('❌ Error in Test 1:', error.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: Problematic Build Analysis (Should Detect Issues)');
    console.log('='.repeat(80));

    try {
        // Test 2.1: Power Budget (should fail - insufficient PSU)
        console.log('\n🔋 Test 2.1: Power Budget Analysis (Expect Failure)');
        totalTests++;
        const powerResult2 = await advancedCompatibilityService.analyzePowerBudget(problematicBuild);
        console.log('Status:', powerResult2.status);
        console.log('Severity:', powerResult2.severity);
        console.log('Message:', powerResult2.message);
        
        if (powerResult2.severity === 'critical' || !powerResult2.compatible) {
            console.log('✅ PASS: Correctly detected insufficient PSU');
            passedTests++;
        } else {
            console.log('❌ FAIL: Should have detected PSU issue');
        }

        // Test 2.2: Physical Clearance (should fail - GPU too long)
        console.log('\n📏 Test 2.2: Physical Clearance Analysis (Expect Failure)');
        totalTests++;
        const clearanceResult2 = await advancedCompatibilityService.analyzePhysicalClearances(problematicBuild);
        console.log('Status:', clearanceResult2.status);
        console.log('Critical Issues:', clearanceResult2.critical_issues?.length || 0);
        
        if (clearanceResult2.critical_issues && clearanceResult2.critical_issues.length > 0) {
            console.log('✅ PASS: Correctly detected clearance issues');
            passedTests++;
        } else {
            console.log('❌ FAIL: Should have detected clearance issues');
        }

        // Test 2.3: Bottleneck Detection (should detect CPU bottleneck)
        console.log('\n🎯 Test 2.3: Bottleneck Detection (Expect CPU Bottleneck)');
        totalTests++;
        const bottleneckResult2 = await advancedCompatibilityService.analyzeBottlenecks(problematicBuild);
        console.log('Balanced:', bottleneckResult2.balanced);
        console.log('Bottlenecks:', bottleneckResult2.bottlenecks?.length || 0);
        
        if (bottleneckResult2.bottlenecks && bottleneckResult2.bottlenecks.length > 0) {
            console.log('Bottleneck Type:', bottleneckResult2.bottlenecks[0].bottleneck);
            console.log('✅ PASS: Correctly detected CPU bottleneck');
            passedTests++;
        } else {
            console.log('❌ FAIL: Should have detected CPU bottleneck');
        }

        // Test 2.4: Full Build Analysis (should fail with multiple issues)
        console.log('\n🔍 Test 2.4: Full Build Analysis (Expect Multiple Issues)');
        totalTests++;
        const fullResult2 = await advancedCompatibilityService.analyzeFullBuild(problematicBuild);
        console.log('Overall Status:', fullResult2.overall_status);
        console.log('Critical Issues:', fullResult2.summary?.total_critical_issues || 0);
        console.log('Warnings:', fullResult2.summary?.total_warnings || 0);
        
        if (!fullResult2.compatible && fullResult2.summary.total_critical_issues > 0) {
            console.log('✅ PASS: Correctly identified build as incompatible');
            passedTests++;
        } else {
            console.log('❌ FAIL: Should have flagged build as incompatible');
        }

    } catch (error) {
        console.error('❌ Error in Test 2:', error.message);
    }

    // Test Summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests === totalTests) {
        console.log('\n🎉 ALL TESTS PASSED! Advanced Compatibility Service is working perfectly!');
        process.exit(0);
    } else {
        console.log('\n⚠️ Some tests failed. Review the output above.');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
