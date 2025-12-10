const http = require('http');

const testData = {
    components: {
        cpu: {
            id: 100,
            name: 'AMD Ryzen 3 3200G',
            category: 'CPU',
            specifications: {
                socket: 'AM4',
                tdp: 65,
                cores: 4,
                threads: 4,
                brand: 'AMD'
            }
        },
        motherboard: {
            id: 200,
            name: 'AORUS B650 ELITE AX ICE',
            category: 'Motherboard',
            specifications: {
                socket: 'AM5',
                form_factor: 'ATX',
                memory_type: 'DDR5',
                chipset: 'B650',
                'Ram Slots': '4',
                'M2 Slots': '2',
                'SATA Ports': '6',
                pcie_slots: 4,
                brand: 'AMD'
            }
        },
        ram: {
            id: 300,
            name: '16GB DDR4 3200',
            category: 'RAM',
            specifications: {
                type: 'DDR4',
                memory_type: 'DDR4',
                speed: 3200,
                capacity: 16,
                modules: 1
            }
        },
        case: {
            id: 400,
            name: 'POWERLOGIC SLIM',
            category: 'Case',
            specifications: {
                max_gpu_length_mm: 250,
                max_cooler_height_mm: 120,
                form_factor: 'Micro-ATX/Mini-ITX',
                supported_form_factors: ['Micro-ATX', 'Mini-ITX']
            }
        },
        gpu: {
            id: 500,
            name: 'INTEL ARC B580',
            category: 'GPU',
            specifications: {
                length_mm: 285,
                power: 160,
                memory_capacity: 12,
                slots: 2,
                interface: 'PCIe 4.0'
            }
        },
        cooling: {
            id: 600,
            name: 'AMD WRAITH PRISM',
            category: 'Cooling',
            specifications: {
                height_mm: 93,
                socket: 'AM4',
                type: 'Air Cooler',
                max_tdp: 95
            }
        },
        storage: {
            id: 700,
            name: '1TB ADATA LEGEND 710',
            category: 'Storage',
            specifications: {
                type: 'NVMe SSD',
                interface: 'M.2 NVMe',
                capacity: 1000,
                form_factor: 'M.2 2280'
            }
        }
    }
};

const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/compatibility/advanced/full-build',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('🧪 COMPREHENSIVE COMPATIBILITY TEST\n');
console.log('=' .repeat(70));
console.log('Testing:');
console.log('  1. ✅ Severity-based separation (socket mismatch ONLY in Critical)');
console.log('  2. ✅ Grouped compatible notes (reduce 23 lines to ~8 groups)');
console.log('  3. ✅ Exact counts ("2 M.2 slots" not "M.2 slot(s)")');
console.log('  4. ✅ Database specifications backfilled');
console.log('=' .repeat(70));
console.log('\n🔍 Test Build Components:');
console.log('  CPU: AMD Ryzen 3 3200G (AM4)');
console.log('  Motherboard: AORUS B650 (AM5) - ATX - DDR5 - 4 RAM slots - 2 M.2 - 6 SATA');
console.log('  RAM: 16GB DDR4');
console.log('  Case: POWERLOGIC SLIM (Micro-ATX/Mini-ITX) - 250mm GPU - 120mm cooler');
console.log('  GPU: ARC B580 (285mm)');
console.log('  Cooling: AMD WRAITH PRISM (93mm)');
console.log('  Storage: 1TB M.2 NVMe');
console.log('\n⏳ Sending request...\n');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            
            if (!result.success) {
                console.error('❌ API returned error:', result.message);
                console.error('Details:', result.errors);
                process.exit(1);
            }
            
            const compat = result.data;
            
            console.log('=' .repeat(70));
            console.log('📊 TEST RESULTS');
            console.log('=' .repeat(70));
            
            // TEST 1: Severity-based separation
            console.log('\n1️⃣ SEVERITY-BASED SEPARATION TEST');
            console.log('-' .repeat(70));
            
            const criticalIssues = compat.all_issues || [];
            const warnings = compat.all_warnings || [];
            
            console.log(`\n✅ CRITICAL ISSUES (${criticalIssues.length}):`);
            criticalIssues.forEach((issue, idx) => {
                const msg = issue.message || '';
                const isSocket = msg.toLowerCase().includes('socket');
                console.log(`   ${idx + 1}. ${isSocket ? '🔴 ' : ''}${msg.substring(0, 80)}...`);
            });
            
            console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
            warnings.forEach((warning, idx) => {
                const msg = warning.message || '';
                const isSocket = msg.toLowerCase().includes('socket');
                if (isSocket) {
                    console.log(`   ${idx + 1}. 🚨 FAIL: ${msg.substring(0, 80)}...`);
                } else {
                    console.log(`   ${idx + 1}. ${msg.substring(0, 80)}...`);
                }
            });
            
            const socketInCritical = criticalIssues.filter(i => 
                (i.message || '').toLowerCase().includes('socket')
            ).length;
            
            const socketInWarnings = warnings.filter(w => 
                (w.message || '').toLowerCase().includes('socket')
            ).length;
            
            console.log('\n📊 VERIFICATION:');
            console.log(`   Socket issues in Critical: ${socketInCritical}`);
            console.log(`   Socket issues in Warnings: ${socketInWarnings}`);
            
            const severityTestPass = socketInWarnings === 0 && socketInCritical >= 1;
            console.log(`   ${severityTestPass ? '✅ PASS' : '❌ FAIL'}: Severity separation working`);
            
            // TEST 2: Grouped compatible notes
            console.log('\n2️⃣ GROUPED COMPATIBLE NOTES TEST');
            console.log('-' .repeat(70));
            
            const compatNotes = compat.compatible_notes || [];
            const compatNotesRaw = compat.compatible_notes_raw || [];
            
            console.log(`\n📝 Compatible Notes (Grouped): ${compatNotes.length} groups`);
            console.log(`📝 Compatible Notes (Raw): ${compatNotesRaw.length} individual notes`);
            
            compatNotes.forEach((note, idx) => {
                const category = note.category || 'General';
                const count = note.count || 1;
                console.log(`   ${idx + 1}. [${category}] ${count > 1 ? `(${count} items) ` : ''}${note.message.substring(0, 60)}...`);
            });
            
            const groupingTestPass = compatNotes.length < compatNotesRaw.length || compatNotes.length <= 15;
            console.log(`\n   ${groupingTestPass ? '✅ PASS' : '⚠️  INFO'}: Notes grouped successfully (${compatNotes.length} vs ${compatNotesRaw.length} raw)`);
            
            // TEST 3: Exact counts (no "(s)" plural markers)
            console.log('\n3️⃣ EXACT COUNTS TEST');
            console.log('-' .repeat(70));
            
            const allMessages = [
                ...compatNotes.map(n => n.message),
                ...criticalIssues.map(i => i.message),
                ...warnings.map(w => w.message)
            ];
            
            const pluralMarkers = allMessages.filter(msg => 
                msg && (msg.includes('slot(s)') || msg.includes('port(s)') || msg.includes('connector(s)'))
            );
            
            const exactCounts = allMessages.filter(msg => 
                msg && (msg.match(/\d+\s+(M\.2\s+slots?|SATA\s+ports?|RAM\s+slots?|PCIe\s+slots?)/i))
            );
            
            console.log(`\n   Messages with exact counts: ${exactCounts.length}`);
            exactCounts.slice(0, 5).forEach(msg => {
                console.log(`      - ${msg.substring(0, 60)}...`);
            });
            
            console.log(`\n   Messages with plural markers "(s)": ${pluralMarkers.length}`);
            if (pluralMarkers.length > 0) {
                pluralMarkers.forEach(msg => {
                    console.log(`      ❌ ${msg.substring(0, 60)}...`);
                });
            }
            
            const exactCountsPass = pluralMarkers.length === 0 && exactCounts.length > 0;
            console.log(`\n   ${exactCountsPass ? '✅ PASS' : '❌ FAIL'}: Exact counts used, no "(s)" markers`);
            
            // TEST 4: Database specifications
            console.log('\n4️⃣ DATABASE SPECIFICATIONS TEST');
            console.log('-' .repeat(70));
            
            const unknownMessages = allMessages.filter(msg => 
                msg && (msg.toLowerCase().includes('unknown') || msg.toLowerCase().includes('cannot verify') || msg.toLowerCase().includes('not specified'))
            );
            
            console.log(`\n   Messages with "unknown"/"cannot verify": ${unknownMessages.length}`);
            if (unknownMessages.length > 0) {
                unknownMessages.forEach(msg => {
                    console.log(`      ⚠️  ${msg.substring(0, 60)}...`);
                });
            }
            
            const specsTestPass = unknownMessages.length === 0;
            console.log(`\n   ${specsTestPass ? '✅ PASS' : '⚠️  INFO'}: All specifications available`);
            
            // OVERALL RESULT
            console.log('\n' + '=' .repeat(70));
            console.log('🎯 OVERALL TEST RESULTS');
            console.log('=' .repeat(70));
            console.log(`   Severity Separation: ${severityTestPass ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`   Grouped Notes: ${groupingTestPass ? '✅ PASS' : '⚠️  INFO'}`);
            console.log(`   Exact Counts: ${exactCountsPass ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`   Database Specs: ${specsTestPass ? '✅ PASS' : '⚠️  INFO'}`);
            
            const allPass = severityTestPass && groupingTestPass && exactCountsPass;
            
            console.log('\n' + '=' .repeat(70));
            if (allPass) {
                console.log('✅ ALL CORE TESTS PASSED!');
                console.log('=' .repeat(70));
                process.exit(0);
            } else {
                console.log('⚠️  SOME TESTS NEED ATTENTION');
                console.log('=' .repeat(70));
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Error parsing response:', error.message);
            console.error('Raw response:', data.substring(0, 500));
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    console.error('Make sure backend is running on port 5000');
    process.exit(1);
});

req.write(postData);
req.end();
