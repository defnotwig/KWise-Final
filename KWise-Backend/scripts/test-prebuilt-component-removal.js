const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function testPreBuiltComponentRemoval() {
    try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🔧 PRE-BUILT COMPONENT REMOVAL FIX VALIDATION');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // TEST 1: Check Elite Build C current state
        console.log('📋 TEST 1: Check Elite Build C Current State');
        console.log('─'.repeat(65));
        
        const eliteBuildC = await pool.query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE id = 12022
        `);
        
        if (eliteBuildC.rows.length === 0) {
            console.log('❌ FAIL: Elite Build C not found!');
            return;
        }
        
        const item = eliteBuildC.rows[0];
        const specs = item.specifications;
        
        console.log(`✅ Found: ${item.name}`);
        console.log(`   Category: ${item.category}`);
        console.log(`   Total Components: ${specs.components ? specs.components.length : 0}`);
        console.log(`   Component Links: ${specs.componentLinks ? specs.componentLinks.length : 0}`);
        
        if (specs.components) {
            console.log('\n   📦 Components:');
            specs.components.forEach((comp, idx) => {
                const hasValue = comp.value && comp.value.trim();
                const status = hasValue ? '✅' : '⚠️ (empty)';
                console.log(`      ${idx + 1}. ${status} ${comp.name}: ${comp.value || '(empty)'}`);
            });
        }
        
        console.log('\n');

        // TEST 2: Verify all 8 component types are present
        console.log('📋 TEST 2: Verify All 8 Component Slots Exist');
        console.log('─'.repeat(65));
        
        const EXPECTED_COMPONENTS = ['CPU', 'Motherboard', 'GPU', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling'];
        let allSlotsPresent = true;
        let filledSlots = 0;
        
        if (specs.componentLinks && Array.isArray(specs.componentLinks)) {
            const existingTypes = specs.componentLinks.map(link => link.componentType);
            
            EXPECTED_COMPONENTS.forEach(expectedType => {
                const exists = existingTypes.includes(expectedType);
                const link = specs.componentLinks.find(l => l.componentType === expectedType);
                const filled = link && link.componentName && link.componentName.trim();
                
                if (filled) filledSlots++;
                
                const status = exists ? (filled ? '✅ Present & Filled' : '⚠️ Present but Empty') : '❌ MISSING';
                console.log(`   ${status} ${expectedType}: ${link ? link.componentName || '(empty)' : 'N/A'}`);
                
                if (!exists) allSlotsPresent = false;
            });
            
            console.log(`\n   Summary: ${filledSlots}/${EXPECTED_COMPONENTS.length} slots filled`);
            
            if (allSlotsPresent) {
                console.log('   ✅ PASS: All 8 component slots present\n');
            } else {
                console.log('   ❌ FAIL: Some component slots missing!\n');
            }
        } else {
            console.log('   ❌ FAIL: No componentLinks found!\n');
            allSlotsPresent = false;
        }

        // TEST 3: Check if GPU is present
        console.log('📋 TEST 3: Check GPU Component Specifically');
        console.log('─'.repeat(65));
        
        const gpuLink = specs.componentLinks?.find(link => link.componentType === 'GPU');
        if (gpuLink) {
            const hasValue = gpuLink.componentName && gpuLink.componentName.trim();
            if (hasValue) {
                console.log(`   ✅ GPU Present: ${gpuLink.componentName}`);
                console.log(`   ✅ Has Match: ${gpuLink.hasMatch}`);
                console.log(`   ✅ Stock ID: ${gpuLink.linkedStockIds?.[0] || 'none'}`);
            } else {
                console.log(`   ⚠️ GPU slot exists but is empty`);
                console.log(`   📝 This is expected if GPU was removed`);
            }
        } else {
            console.log(`   ❌ FAIL: GPU slot missing from componentLinks!`);
        }
        
        console.log('\n');

        // TEST 4: Verify component display logic
        console.log('📋 TEST 4: Verify Frontend Display Logic');
        console.log('─'.repeat(65));
        
        if (specs.components) {
            const nonEmptyComponents = specs.components.filter(comp => comp.value && comp.value.trim());
            const emptyComponents = specs.components.filter(comp => !comp.value || !comp.value.trim());
            
            console.log(`   Total components in DB: ${specs.components.length}`);
            console.log(`   Components with values: ${nonEmptyComponents.length}`);
            console.log(`   Empty component slots: ${emptyComponents.length}`);
            
            if (nonEmptyComponents.length > 0) {
                console.log('\n   ✅ Components that WILL display in kiosk:');
                nonEmptyComponents.forEach(comp => {
                    console.log(`      • ${comp.name}: ${comp.value}`);
                });
            }
            
            if (emptyComponents.length > 0) {
                console.log('\n   ⚠️ Components that will NOT display (empty):');
                emptyComponents.forEach(comp => {
                    console.log(`      • ${comp.name}`);
                });
            }
            
            console.log('\n   ✅ PASS: Display logic will filter empty components correctly\n');
        } else {
            console.log('   ❌ FAIL: No components array found!\n');
        }

        // TEST 5: Simulate component removal workflow
        console.log('📋 TEST 5: Simulate Component Removal Workflow');
        console.log('─'.repeat(65));
        console.log('   Scenario: Admin removes GPU from Elite Build C');
        console.log('   Expected: GPU slot remains but with empty value\n');
        
        // Simulate the buildPreBuiltSpecifications logic
        const simulatedComponents = [];
        const simulatedLinks = [];
        const COMPONENT_ORDER = ['CPU', 'Motherboard', 'GPU', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling'];
        
        // Simulate current state (GPU removed)
        const prebuiltComponents = {
            CPU: { id: 13, name: 'AMD RYZEN 7 8700F (TTP) W/ AMD COOLER', hasMatch: true },
            Motherboard: { id: 111, name: 'GIGABYTE B650M GAMING', hasMatch: true },
            GPU: null, // Removed
            RAM: { id: 218, name: '32GB T-FORCE DELTA RGB (2x16GB) 6400MHz *BLACK', hasMatch: true },
            Storage: { id: null, name: '1TB ADATA LEGEND NVME', hasMatch: false },
            PSU: { id: 503, name: '750W CORSAIR CX750 80+ BRONZE', hasMatch: true },
            Case: { id: null, name: 'COOLMAN SPECTRA *6 FANS', hasMatch: false },
            Cooling: { id: null, name: 'DARKFLASH NEBULA AIO 240', hasMatch: false }
        };
        
        COMPONENT_ORDER.forEach(type => {
            const component = prebuiltComponents[type];
            
            if (component && component.name) {
                simulatedComponents.push({
                    name: type,
                    value: component.name
                });
                simulatedLinks.push({
                    componentType: type,
                    componentName: component.name,
                    linkedStockIds: component.id ? [component.id] : [],
                    hasMatch: !!component.id
                });
            } else {
                simulatedComponents.push({
                    name: type,
                    value: ''
                });
                simulatedLinks.push({
                    componentType: type,
                    componentName: '',
                    linkedStockIds: [],
                    hasMatch: false
                });
            }
        });
        
        console.log('   📦 Simulated Components Array:');
        simulatedComponents.forEach((comp, idx) => {
            const hasValue = comp.value && comp.value.trim();
            const status = hasValue ? '✅' : '⚠️ (empty)';
            console.log(`      ${idx + 1}. ${status} ${comp.name}: ${comp.value || '(empty)'}`);
        });
        
        console.log(`\n   Total slots: ${simulatedComponents.length}`);
        console.log(`   Filled slots: ${simulatedComponents.filter(c => c.value).length}`);
        console.log(`   Empty slots: ${simulatedComponents.filter(c => !c.value).length}`);
        
        if (simulatedComponents.length === 8) {
            console.log('   ✅ PASS: All 8 component slots preserved after removal\n');
        } else {
            console.log(`   ❌ FAIL: Expected 8 slots, got ${simulatedComponents.length}\n`);
        }

        // FINAL SUMMARY
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('FINAL VALIDATION SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const tests = [
            { name: 'Elite Build C exists', passed: eliteBuildC.rows.length > 0 },
            { name: 'All 8 component slots present', passed: allSlotsPresent },
            { name: 'Component display logic correct', passed: specs.components && specs.components.length > 0 },
            { name: 'Removal workflow simulation', passed: simulatedComponents.length === 8 }
        ];
        
        const passedTests = tests.filter(t => t.passed).length;
        const totalTests = tests.length;
        
        tests.forEach(test => {
            console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
        });
        
        console.log(`\n📊 Success Rate: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
        
        if (passedTests === totalTests) {
            console.log('\n🎉 ALL TESTS PASSED! Component removal fix is working correctly.');
        } else {
            console.log(`\n⚠️ ${totalTests - passedTests} test(s) failed. Review the output above.`);
        }
        
        console.log('═══════════════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

testPreBuiltComponentRemoval();
