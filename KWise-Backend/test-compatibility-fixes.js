const axios = require('axios');

// Test cart data (same as user's screenshots)
const testCart = {
    cpu: {
        id: 1,
        name: 'AMD RYZEN 3 3200G (BOXED)',
        category: 'CPU',
        specifications: {
            socket: 'AM4',
            tdp: 65,
            tdp_w: 65
        }
    },
    motherboard: {
        id: 2,
        name: 'AORUS B650 ELITE AX ICE',
        category: 'Motherboard',
        specifications: {
            socket: 'AM5',
            chipset: 'B650',
            form_factor: 'ATX',
            memory_type: 'DDR5',
            memory_slots: 4,
            ram_slots: 4,
            max_memory: 128,
            max_memory_gb: 128,
            m2_slots: 2,
            sata_ports: 6,
            pcie_slots: 4,
            pcie_x16_slots: 1
        }
    },
    ram: {
        id: 3,
        name: '16GB ADATA DDR4 3200 LAPTOP MEMORY',
        category: 'RAM',
        specifications: {
            type: 'DDR4',
            memory_type: 'DDR4',
            speed: 3200,
            capacity: 16,
            capacity_gb: 16,
            modules: 1
        }
    },
    gpu: {
        id: 4,
        name: '12GB INTEL ARC B580 ASROCK CHALLENGER *(DUALFAN)',
        category: 'GPU',
        specifications: {
            length_mm: 285,
            Length: '285mm',
            length: 285,
            tdp: 160,
            power_w: 160,
            pcie_8pin: 1,
            power_connector_required: { type: '8-pin', count: 1 },
            slot_width: 2,
            slots: 2,
            interface: 'PCIe 4.0 x16',
            memory_capacity: 12
        }
    },
    case: {
        id: 5,
        name: 'POWERLOGIC SLIM (Black)',
        category: 'Case',
        specifications: {
            form_factor: 'Mini Tower',
            supported_form_factors: ['Micro-ATX', 'Mini-ITX'],
            max_gpu_length_mm: 250,
            'Max Gpu Length': '250mm',
            max_cooler_height_mm: 120,
            'Max Cpu Cooler Height': '120mm',
            case_type: 'Mini Tower'
        }
    },
    cooling: {
        id: 6,
        name: 'AMD WRAITH PRISM RYZEN COOLER',
        category: 'Cooling',
        specifications: {
            height: 93,
            height_mm: 93,
            max_rpm: 2800,
            type: 'Air Cooler',
            socket: 'AM4'
        }
    },
    storage: {
        id: 7,
        name: '512GB ADATA LEGEND 710',
        category: 'Storage',
        specifications: {
            type: 'M.2 NVMe',
            interface: 'PCIe 4.0 x4',
            capacity: 512,
            capacity_gb: 512,
            form_factor: '2.5" M.2 2280'
        }
    }
};

async function testCompatibilityAPI() {
    console.log('🧪 TESTING COMPATIBILITY API ENHANCEMENTS\n');
    console.log('=' .repeat(80));
    
    try {
        const response = await axios.post('http://localhost:5000/api/compatibility/advanced/full-build', {
            components: testCart
        });
        
        const data = response.data.data;
        
        console.log('\n✅ API Response Received\n');
        console.log('=' .repeat(80));
        
        // Test 1: Deduplication
        console.log('\n📊 TEST 1: DEDUPLICATION');
        console.log('-'.repeat(80));
        console.log(`Critical Issues: ${data.all_issues.length}`);
        console.log(`Warnings: ${data.all_warnings.length}`);
        
        // Check for socket mismatch duplicates
        const socketIssues = data.all_issues.filter(i => 
            (i.message || '').toLowerCase().includes('socket')
        );
        console.log(`\nSocket mismatch issues found: ${socketIssues.length} (should be 1, was 4)`);
        if (socketIssues.length === 1) {
            console.log('✅ PASS: Socket mismatch deduplicated correctly');
        } else {
            console.log('❌ FAIL: Socket mismatch still has duplicates');
            socketIssues.forEach((issue, idx) => {
                console.log(`  ${idx + 1}. ${issue.message}`);
            });
        }
        
        // Check for no cooler duplicates
        const coolerIssues = data.all_issues.filter(i => 
            (i.message || '').toLowerCase().includes('no cpu cooler')
        );
        console.log(`\nNo CPU cooler issues found: ${coolerIssues.length} (should be 0, was 2)`);
        if (coolerIssues.length === 0) {
            console.log('✅ PASS: No CPU cooler duplicates removed');
        } else {
            console.log('❌ FAIL: No CPU cooler still has duplicates');
        }
        
        // Test 2: Optimization Warnings Filtered
        console.log('\n\n📊 TEST 2: OPTIMIZATION WARNINGS FILTERING');
        console.log('-'.repeat(80));
        const optimizationWarnings = data.all_warnings.filter(w => {
            const msg = (w.message || w.warning || '').toLowerCase();
            return msg.includes('m.2 slot') || 
                   msg.includes('extra storage') || 
                   msg.includes('supports newer') ||
                   msg.includes('pcie generation');
        });
        console.log(`Optimization warnings in warnings section: ${optimizationWarnings.length} (should be 0)`);
        if (optimizationWarnings.length === 0) {
            console.log('✅ PASS: Optimization warnings filtered from warnings section');
        } else {
            console.log('❌ FAIL: Optimization warnings still in warnings');
            optimizationWarnings.forEach((w, idx) => {
                console.log(`  ${idx + 1}. ${w.message || w.warning}`);
            });
        }
        
        // Test 3: Cooler Height Compatibility
        console.log('\n\n📊 TEST 3: COOLER HEIGHT COMPATIBILITY');
        console.log('-'.repeat(80));
        const coolerHeightWarnings = data.all_warnings.filter(w => {
            const msg = (w.message || w.warning || '').toLowerCase();
            return msg.includes('cooler') && msg.includes('height') && msg.includes('exceed');
        });
        console.log(`Cooler height warnings: ${coolerHeightWarnings.length} (should be 0 - 93mm fits in 120mm)`);
        if (coolerHeightWarnings.length === 0) {
            console.log('✅ PASS: Cooler height correctly identified as compatible');
        } else {
            console.log('❌ FAIL: Cooler height incorrectly showing as warning');
            coolerHeightWarnings.forEach((w, idx) => {
                console.log(`  ${idx + 1}. ${w.message || w.warning}`);
            });
        }
        
        // Test 4: Compatible Notes
        console.log('\n\n📊 TEST 4: COMPATIBLE NOTES ENHANCEMENT');
        console.log('-'.repeat(80));
        console.log(`Compatible notes count: ${data.compatible_notes.length} (should be 18+)`);
        
        if (data.compatible_notes.length >= 18) {
            console.log('✅ PASS: Sufficient compatible notes generated');
        } else {
            console.log('⚠️  WARNING: Expected 18+ compatible notes');
        }
        
        console.log('\nCompatible notes breakdown:');
        const categories = {};
        data.compatible_notes.forEach(note => {
            const cat = note.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        Object.entries(categories).forEach(([cat, count]) => {
            console.log(`  - ${cat}: ${count}`);
        });
        
        // Check for specific notes that should exist
        const notesToCheck = [
            { keyword: 'm.2', description: 'M.2 slots specification' },
            { keyword: 'sata port', description: 'SATA ports specification' },
            { keyword: 'ram slot', description: 'RAM slots specification' },
            { keyword: 'pcie', description: 'PCIe expansion slots' },
            { keyword: 'cooler height', description: 'Cooler height with clearance' },
            { keyword: 'gpu length', description: 'GPU length with clearance' },
            { keyword: 'gpu power', description: 'GPU power consumption' },
            { keyword: 'chipset', description: 'Motherboard chipset' }
        ];
        
        console.log('\nRequired specifications found:');
        notesToCheck.forEach(check => {
            const found = data.compatible_notes.some(note => 
                (note.message || '').toLowerCase().includes(check.keyword)
            );
            console.log(`  ${found ? '✅' : '❌'} ${check.description}`);
        });
        
        // Test 5: Display Sample Output
        console.log('\n\n📊 TEST 5: SAMPLE OUTPUT');
        console.log('-'.repeat(80));
        
        console.log('\n🔴 CRITICAL ISSUES (First 3):');
        data.all_issues.slice(0, 3).forEach((issue, idx) => {
            console.log(`${idx + 1}. ${issue.message || issue.issue}`);
            if (issue.details) console.log(`   Details: ${issue.details}`);
        });
        
        console.log('\n🟡 WARNINGS (First 3):');
        data.all_warnings.slice(0, 3).forEach((warn, idx) => {
            console.log(`${idx + 1}. ${warn.message || warn.warning}`);
        });
        
        console.log('\n🟢 COMPATIBLE NOTES (First 10):');
        data.compatible_notes.slice(0, 10).forEach((note, idx) => {
            console.log(`${idx + 1}. ${note.message}`);
            if (note.details) console.log(`   ${note.details}`);
        });
        
        // Summary
        console.log('\n\n' + '='.repeat(80));
        console.log('📊 FINAL SUMMARY');
        console.log('='.repeat(80));
        console.log(`✅ Compatible Notes: ${data.compatible_notes.length}`);
        console.log(`❌ Critical Issues: ${data.all_issues.length}`);
        console.log(`⚠️  Warnings: ${data.all_warnings.length}`);
        console.log(`📊 Compatibility Score: ${data.compatibility_score}/100`);
        console.log(`🎯 Overall Compatible: ${data.overall_compatible ? 'NO' : 'YES (expected NO due to socket mismatch)'}`);
        
        console.log('\n✅ ALL TESTS COMPLETED\n');
        
    } catch (error) {
        console.error('❌ ERROR:', error.response?.data || error.message);
        process.exit(1);
    }
}

testCompatibilityAPI();
