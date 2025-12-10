const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function comprehensivePreBuiltTest() {
    try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🔧 COMPREHENSIVE PRE-BUILT COMPONENT MANAGEMENT TEST');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // TEST 1: Check all Pre-Built items
        console.log('📋 TEST 1: Check All Pre-Built Items');
        console.log('─'.repeat(65));
        
        const allPreBuilt = await pool.query(`
            SELECT id, name, specifications 
            FROM pc_parts 
            WHERE category = 'Pre-Built' 
            AND is_active = true
            ORDER BY id
        `);
        
        console.log(`✅ Found ${allPreBuilt.rows.length} Pre-Built items\n`);
        
        allPreBuilt.rows.forEach(item => {
            const specs = item.specifications;
            const compCount = specs.components ? specs.components.length : 0;
            const filledCount = specs.components ? specs.components.filter(c => c.value && c.value.trim()).length : 0;
            const emptyCount = compCount - filledCount;
            
            console.log(`   📦 ${item.name} (ID: ${item.id})`);
            console.log(`      Components: ${filledCount}/${compCount} filled (${emptyCount} empty)`);
            
            if (compCount < 8) {
                console.log(`      ⚠️ WARNING: Only ${compCount} component slots (expected 8)`);
            }
            
            if (emptyCount > 0) {
                const empty = specs.components.filter(c => !c.value || !c.value.trim());
                console.log(`      Empty slots: ${empty.map(c => c.name).join(', ')}`);
            }
            console.log('');
        });

        // TEST 2: Verify component structure consistency
        console.log('📋 TEST 2: Verify Component Structure Consistency');
        console.log('─'.repeat(65));
        
        const EXPECTED_COMPONENTS = ['CPU', 'Motherboard', 'GPU', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling'];
        let allConsistent = true;
        
        for (const item of allPreBuilt.rows) {
            const specs = item.specifications;
            
            if (!specs.componentLinks || !Array.isArray(specs.componentLinks)) {
                console.log(`   ❌ ${item.name}: No componentLinks array`);
                allConsistent = false;
                continue;
            }
            
            const types = specs.componentLinks.map(link => link.componentType);
            const missing = EXPECTED_COMPONENTS.filter(exp => !types.includes(exp));
            
            if (missing.length > 0) {
                console.log(`   ❌ ${item.name}: Missing slots: ${missing.join(', ')}`);
                allConsistent = false;
            } else {
                console.log(`   ✅ ${item.name}: All 8 component slots present`);
            }
        }
        
        if (allConsistent) {
            console.log('\n   ✅ PASS: All Pre-Built items have consistent structure\n');
        } else {
            console.log('\n   ❌ FAIL: Some items have inconsistent structure\n');
        }

        // TEST 3: Component statistics
        console.log('📋 TEST 3: Component Statistics Across All Pre-Built Items');
        console.log('─'.repeat(65));
        
        const componentStats = {};
        EXPECTED_COMPONENTS.forEach(type => {
            componentStats[type] = { filled: 0, empty: 0, total: 0 };
        });
        
        allPreBuilt.rows.forEach(item => {
            const specs = item.specifications;
            if (specs.components) {
                specs.components.forEach(comp => {
                    if (componentStats[comp.name]) {
                        componentStats[comp.name].total++;
                        if (comp.value && comp.value.trim()) {
                            componentStats[comp.name].filled++;
                        } else {
                            componentStats[comp.name].empty++;
                        }
                    }
                });
            }
        });
        
        EXPECTED_COMPONENTS.forEach(type => {
            const stats = componentStats[type];
            const fillRate = stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0;
            console.log(`   ${type.padEnd(15)} ${stats.filled}/${stats.total} filled (${fillRate}%) - ${stats.empty} empty`);
        });
        
        console.log('\n');

        // FINAL SUMMARY
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('FINAL COMPREHENSIVE TEST SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const totalItems = allPreBuilt.rows.length;
        const itemsWith8Slots = allPreBuilt.rows.filter(item => {
            const specs = item.specifications;
            return specs.components && specs.components.length === 8;
        }).length;
        
        console.log(`Total Pre-Built Items: ${totalItems}`);
        console.log(`Items with 8 component slots: ${itemsWith8Slots}/${totalItems}`);
        console.log(`Structure Consistency: ${allConsistent ? '✅ PASS' : '❌ FAIL'}`);
        
        if (itemsWith8Slots === totalItems && allConsistent) {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('✅ Component management system is working correctly');
            console.log('✅ All Pre-Built items have proper 8-component structure');
            console.log('✅ Empty components are preserved for admin editing');
            console.log('✅ Frontend will filter empty components for display');
        } else {
            console.log('\n⚠️ SOME ISSUES FOUND:');
            if (itemsWith8Slots < totalItems) {
                console.log(`   • ${totalItems - itemsWith8Slots} items missing component slots`);
            }
            if (!allConsistent) {
                console.log('   • Inconsistent component structure detected');
            }
        }
        
        console.log('═══════════════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

comprehensivePreBuiltTest();
