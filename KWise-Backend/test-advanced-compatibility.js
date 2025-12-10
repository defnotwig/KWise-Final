/**
 * Comprehensive Test Suite for Advanced Compatibility Service
 * Tests all 4 critical features:
 * 1. Power Budget Calculator
 * 2. Physical Clearance Validation
 * 3. Pairwise Component Checking
 * 4. Bottleneck Detection
 */

const axios = require('axios');

// Use port 5000 (main server) - change to 5001 if testing on alternate port
const API_BASE = 'http://localhost:5000/api/compatibility/advanced';

// Test build configuration
const testBuild = {
    cpu: {
        id: 1,
        name: 'Intel Core i5-12400F',
        category: 'CPU',
        specifications: {
            socket: 'LGA1700',
            tdp: 65,
            peak_power: 117,
            performance_tier: 'mid-tier',
            max_memory_speed: 3200,
            cores: 6,
            threads: 12
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
            memory_type: 'DDR4',
            max_memory_speed: 4800,
            memory_slots: 4,
            max_memory: 128,
            pcie_slots: 2,
            m2_slots: 2,
            sata_ports: 4
        }
    },
    gpu: {
        id: 3,
        name: 'MSI RTX 3060 Ti GAMING X 8GB',
        category: 'GPU',
        specifications: {
            tdp: 200,
            peak_power: 270,
            length: 327,
            width: 140,
            height: 56,
            slots: 2.5,
            performance_tier: 'mid-tier',
            pcie_interface: 'PCIe 4.0 x16',
            power_connectors: ['8-pin'],
            recommended_psu: 600
        }
    },
    psu: {
        id: 4,
        name: 'Corsair RM650x 650W 80+ Gold',
        category: 'PSU',
        specifications: {
            wattage: 650,
            efficiency: '80+ Gold',
            form_factor: 'ATX',
            length: 160,
            modular: 'Full',
            pcie_8pin: 2,
            pcie_6pin: 0,
            cpu_8pin: 1,
            sata: 6,
            molex: 3,
            rail_12v_amps: 54
        }
    },
    case: {
        id: 5,
        name: 'NZXT H510 Flow',
        category: 'Case',
        specifications: {
            form_factor: 'ATX',
            max_gpu_length: 381,
            max_cooler_height: 165,
            max_psu_length: 180,
            drive_bays_2_5: 2,
            drive_bays_3_5: 2,
            expansion_slots: 7,
            front_usb_3_0: 2,
            front_usb_c: 1
        }
    },
    cooler: {
        id: 6,
        name: 'be quiet! Dark Rock 4',
        category: 'Cooling',
        specifications: {
            height: 159,
            width: 136,
            depth: 146,
            socket: 'LGA1700',
            sockets_supported: ['LGA1700', 'LGA1200', 'AM4', 'AM5'],
            tdp: 200,
            fan_size: 135,
            ram_clearance: 40
        }
    },
    ram: {
        id: 7,
        name: 'Corsair Vengeance DDR4 16GB (2x8GB) 3200MHz',
        category: 'RAM',
        specifications: {
            type: 'DDR4',
            speed: 3200,
            capacity: 16,
            sticks: 2,
            height: 51,
            voltage: 1.35,
            cas_latency: 16
        }
    },
    storage: {
        id: 8,
        name: 'Samsung 970 EVO Plus 1TB NVMe',
        category: 'Storage',
        specifications: {
            interface: 'NVMe',
            form_factor: 'M.2',
            capacity: 1024,
            read_speed: 3500,
            write_speed: 3300
        }
    }
};

// Problematic build (for bottleneck testing)
const bottleneckBuild = {
    cpu: {
        name: 'Intel Core i3-10100',
        specifications: {
            performance_tier: 'entry',
            cores: 4,
            threads: 8
        }
    },
    gpu: {
        name: 'RTX 4080',
        specifications: {
            performance_tier: 'elite',
            tdp: 320
        }
    }
};

// Clearance problem build
const clearanceProblem = {
    gpu: {
        name: 'Gigabyte RTX 4090 GAMING OC',
        specifications: {
            length: 357,
            height: 75,
            slots: 3.5
        }
    },
    case: {
        name: 'Small ITX Case',
        specifications: {
            max_gpu_length: 330,
            expansion_slots: 2
        }
    },
    cooler: {
        name: 'Noctua NH-D15',
        specifications: {
            height: 165
        }
    },
    case_cooler: {
        specifications: {
            max_cooler_height: 160
        }
    },
    ram: {
        specifications: {
            height: 54
        }
    },
    cooler_ram: {
        specifications: {
            ram_clearance: 32
        }
    }
};

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${name}`);
    if (details) console.log(`   ${details}`);
    
    results.tests.push({ name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
}

async function testPowerBudget() {
    console.log('\n🔋 ===== TESTING POWER BUDGET CALCULATOR =====\n');
    
    try {
        const response = await axios.post(`${API_BASE}/power`, {
            components: testBuild
        });

        const data = response.data.data;
        
        // Test 1: Response structure
        logTest(
            'Power budget returns complete data structure',
            data.analysis && data.breakdown && data.status,
            `Total peak: ${data.analysis?.total_power?.peak}W, PSU: ${data.status}`
        );

        // Test 2: Power calculations are realistic
        const peakPower = data.analysis?.total_power?.peak || 0;
        logTest(
            'Peak power calculation is realistic (300-500W for this build)',
            peakPower >= 300 && peakPower <= 500,
            `Calculated: ${peakPower}W`
        );

        // Test 3: PSU validation
        logTest(
            'PSU adequacy check works',
            data.compatible !== undefined && data.status !== undefined,
            `PSU adequate: ${data.compatible}, Status: ${data.status}`
        );

        // Test 4: Efficiency check
        logTest(
            'Efficiency analysis present',
            data.analysis?.efficiency_optimal !== undefined,
            `Load percentage: ${data.analysis?.load_at_peak?.toFixed(1)}%`
        );

        // Test 5: Connector validation
        logTest(
            'Power connector validation works',
            data.analysis?.connector_check !== undefined,
            `GPU connectors: ${data.analysis?.connector_check?.valid ? 'OK' : 'FAIL'}`
        );

        console.log('\nPower Budget Details:');
        console.log('- Idle:', data.analysis?.total_power?.idle, 'W');
        console.log('- Typical:', data.analysis?.total_power?.typical, 'W');
        console.log('- Peak:', data.analysis?.total_power?.peak, 'W');
        console.log('- PSU Wattage:', data.analysis?.psu_wattage, 'W');
        console.log('- Load at Peak:', data.analysis?.load_at_peak?.toFixed(1), '%');
        console.log('- Recommended:', data.analysis?.recommended_wattage, 'W');

    } catch (error) {
        logTest('Power budget API call', false, error.message);
    }
}

async function testPhysicalClearances() {
    console.log('\n📏 ===== TESTING PHYSICAL CLEARANCE VALIDATION =====\n');
    
    try {
        // Test 1: Good clearances
        const response1 = await axios.post(`${API_BASE}/clearance`, {
            components: testBuild
        });

        const data1 = response1.data.data;
        
        logTest(
            'Clearance validation returns complete checks',
            data1.checks && data1.compatible !== undefined && data1.summary,
            `GPU: ${data1.checks?.gpu_length ? 'OK' : 'N/A'}, Cooler: ${data1.checks?.cooler_height ? 'OK' : 'N/A'}`
        );

        logTest(
            'Good build passes all clearance checks',
            data1.compatible === true && data1.summary?.critical_issues === 0,
            `Critical issues: ${data1.summary?.critical_issues}, Warnings: ${data1.summary?.warnings}`
        );

        // Test 2: Problematic clearances
        const response2 = await axios.post(`${API_BASE}/clearance`, {
            components: {
                gpu: clearanceProblem.gpu,
                case: clearanceProblem.case
            }
        });

        const data2 = response2.data.data;
        
        logTest(
            'Detects GPU clearance problems',
            data2.compatible === false || data2.critical_issues?.length > 0,
            `GPU 357mm > Case 330mm = ${data2.compatible === false ? 'DETECTED' : 'MISSED'}`
        );

        // Test 3: Cooler height check
        const response3 = await axios.post(`${API_BASE}/clearance`, {
            components: {
                cooler: clearanceProblem.cooler,
                case: { specifications: clearanceProblem.case_cooler.specifications }
            }
        });

        const data3 = response3.data.data;
        
        logTest(
            'Detects cooler height problems',
            data3.compatible === false || data3.critical_issues?.length > 0,
            `Cooler 165mm > Case 160mm = ${data3.compatible === false ? 'DETECTED' : 'MISSED'}`
        );

        console.log('\nClearance Check Results:');
        console.log('- GPU Length:', data1.checks?.gpu_length?.clearance || 'N/A', 'mm');
        console.log('- Cooler Height:', data1.checks?.cooler_height?.clearance || 'N/A', 'mm');
        console.log('- RAM Clearance:', data1.checks?.ram_clearance?.clearance || 'N/A', 'mm');

    } catch (error) {
        logTest('Physical clearance API call', false, error.message);
    }
}

async function testPairwiseChecking() {
    console.log('\n🔗 ===== TESTING PAIRWISE COMPONENT CHECKING =====\n');
    
    try {
        const response = await axios.post(`${API_BASE}/pairwise`, {
            components: testBuild
        });

        const data = response.data.data;
        
        // Test 1: Pairwise checks structure
        logTest(
            'Pairwise analysis returns component pairs',
            data.pairs && Array.isArray(data.pairs),
            `Found ${data.pairs?.length || 0} component pairs`
        );

        // Test 2: CPU-Motherboard check
        const cpuMobo = data.pairs?.find(p => 
            p.pair && p.pair.includes('cpu') && p.pair.includes('motherboard')
        );
        
        logTest(
            'CPU-Motherboard socket compatibility checked',
            cpuMobo !== undefined && cpuMobo.checks?.socket !== undefined,
            `Socket match: ${cpuMobo?.checks?.socket?.compatible ? 'PASS' : 'FAIL'}`
        );

        // Test 3: GPU-PSU check
        const gpuPsu = data.pairs?.find(p => 
            p.pair && p.pair.includes('gpu') && p.pair.includes('psu')
        );
        
        logTest(
            'GPU-PSU wattage compatibility checked',
            gpuPsu !== undefined && gpuPsu.checks?.wattage !== undefined,
            `Wattage adequate: ${gpuPsu?.checks?.wattage?.compatible ? 'PASS' : 'N/A'}`
        );

        // Test 4: Overall compatibility
        logTest(
            'Overall pairwise compatibility status',
            data.compatible !== undefined && data.status !== undefined,
            `Status: ${data.status || 'N/A'}`
        );

        // Test 5: Critical issues detection
        const hasCritical = data.critical_issues && data.critical_issues.length > 0;
        
        logTest(
            'Critical issue detection works',
            hasCritical === false, // Should be no critical issues in good build
            `Critical issues found: ${hasCritical ? 'YES (unexpected!)' : 'NO (correct!)'}`
        );

        console.log('\nPairwise Check Summary:');
        console.log('- Total Pairs Checked:', data.summary?.total_pairs_checked || 0);
        console.log('- Compatible:', data.summary?.compatible_pairs || 0);
        console.log('- Warnings:', data.summary?.warnings || 0);
        console.log('- Critical Issues:', data.summary?.critical_issues || 0);

    } catch (error) {
        logTest('Pairwise checking API call', false, error.message);
    }
}

async function testBottleneckDetection() {
    console.log('\n⚠️  ===== TESTING BOTTLENECK DETECTION =====\n');
    
    try {
        // Test 1: Balanced build (no bottleneck)
        const response1 = await axios.post(`${API_BASE}/bottleneck`, {
            components: testBuild
        });

        const data1 = response1.data.data;
        
        logTest(
            'Balanced build shows no bottleneck',
            data1.balanced === true,
            `Status: ${data1.balanced ? 'Balanced' : 'Bottleneck detected'}`
        );

        // Test 2: Severe bottleneck build
        const response2 = await axios.post(`${API_BASE}/bottleneck`, {
            components: bottleneckBuild
        });

        const data2 = response2.data.data;
        
        logTest(
            'Detects CPU bottleneck (i3 + RTX 4080)',
            data2.balanced === false && data2.bottlenecks && data2.bottlenecks.length > 0,
            `Bottleneck: ${data2.bottlenecks?.length > 0 ? data2.bottlenecks[0].bottleneck : 'None detected'}`
        );

        logTest(
            'Provides performance loss estimate',
            data2.bottlenecks && data2.bottlenecks.length > 0 && data2.bottlenecks[0].impact,
            `Loss: ${data2.bottlenecks?.[0]?.impact || 'N/A'}, Severity: ${data2.bottlenecks?.[0]?.severity || 'N/A'}`
        );

        logTest(
            'Provides upgrade recommendations',
            data2.bottlenecks && data2.bottlenecks.length > 0 && data2.bottlenecks[0].recommendation,
            `Recommendation: ${data2.bottlenecks?.[0]?.recommendation || 'N/A'}`
        );

        console.log('\nBottleneck Analysis:');
        console.log('Balanced Build:');
        console.log('- CPU Tier:', testBuild.cpu.specifications.performance_tier);
        console.log('- GPU Tier:', testBuild.gpu.specifications.performance_tier);
        console.log('- Balanced:', data1.balanced);
        
        console.log('\nBottleneck Build:');
        console.log('- CPU Tier:', bottleneckBuild.cpu.specifications.performance_tier);
        console.log('- GPU Tier:', bottleneckBuild.gpu.specifications.performance_tier);
        console.log('- Bottleneck:', data2.bottlenecks?.[0]?.bottleneck);
        console.log('- Performance Loss:', data2.bottlenecks?.[0]?.impact);

    } catch (error) {
        logTest('Bottleneck detection API call', false, error.message);
    }
}

async function testFullBuildAnalysis() {
    console.log('\n🔍 ===== TESTING FULL BUILD COMPREHENSIVE ANALYSIS =====\n');
    
    try {
        const response = await axios.post(`${API_BASE}/full`, {
            components: testBuild
        });

        const data = response.data.data;
        
        // Test 1: Complete analysis structure
        logTest(
            'Full analysis includes all 4 layers',
            data.layers && data.layers.power && data.layers.clearance && data.layers.pairwise && data.layers.bottleneck,
            'All layers present'
        );

        // Test 2: Overall status
        logTest(
            'Provides overall compatibility status',
            data.overall_status !== undefined,
            `Status: ${data.overall_status}`
        );

        // Test 3: Summary
        logTest(
            'Provides comprehensive summary',
            data.summary && data.summary.total_critical_issues !== undefined,
            `Critical: ${data.summary?.total_critical_issues}, Warnings: ${data.summary?.total_warnings}`
        );

        // Test 4: Build score
        logTest(
            'Calculates build compatibility score',
            data.compatibility_score !== undefined,
            `Score: ${data.compatibility_score}/100`
        );

        console.log('\nFull Build Analysis Summary:');
        console.log('- Overall Status:', data.overall_status);
        console.log('- Compatibility Score:', data.compatibility_score, '/100');
        console.log('- Critical Issues:', data.summary?.total_critical_issues);
        console.log('- Warnings:', data.summary?.total_warnings);
        console.log('- Info Messages:', data.summary?.info_messages);
        console.log('\nLayer Results:');
        console.log('- Power Analysis:', data.power?.psuAnalysis?.status);
        console.log('- Clearance Checks:', data.clearance?.summary?.all_clear ? 'PASS' : 'ISSUES');
        console.log('- Pairwise Compatibility:', data.pairwise?.overall_status);
        console.log('- Bottleneck Status:', data.bottleneck?.balanced ? 'Balanced' : data.bottleneck?.bottleneck);

    } catch (error) {
        logTest('Full build analysis API call', false, error.message);
    }
}

async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ADVANCED COMPATIBILITY SERVICE - COMPREHENSIVE TEST SUITE    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        await testPowerBudget();
        await testPhysicalClearances();
        await testPairwiseChecking();
        await testBottleneckDetection();
        await testFullBuildAnalysis();

        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║                      TEST RESULTS SUMMARY                      ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`✅ PASSED: ${results.passed}/${results.passed + results.failed}`);
        console.log(`❌ FAILED: ${results.failed}/${results.passed + results.failed}`);
        console.log(`📊 SUCCESS RATE: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
        console.log('');

        if (results.failed === 0) {
            console.log('🎉 ALL TESTS PASSED! Advanced Compatibility Service is FULLY OPERATIONAL!');
        } else {
            console.log('⚠️  SOME TESTS FAILED. Review the details above.');
            console.log('\nFailed Tests:');
            results.tests.filter(t => !t.passed).forEach(t => {
                console.log(`  - ${t.name}: ${t.details}`);
            });
        }

        console.log('');
        process.exit(results.failed === 0 ? 0 : 1);

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        process.exit(1);
    }
}

// Run tests
runAllTests();
