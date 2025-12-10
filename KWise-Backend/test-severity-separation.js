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
                threads: 4
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
                'Ram Slots': 4,
                'M2 Slots': 2,
                'SATA Ports': 6,
                pcie_slots: 4
            }
        },
        ram: {
            id: 300,
            name: '16GB DDR4 3200',
            category: 'RAM',
            specifications: {
                memory_type: 'DDR4',
                speed: 3200,
                capacity: 16
            }
        },
        case: {
            id: 400,
            name: 'POWERLOGIC SLIM',
            category: 'Case',
            specifications: {
                max_gpu_length_mm: 250,
                max_cooler_height_mm: 120,
                form_factor: 'Micro-ATX/Mini-ITX'
            }
        },
        gpu: {
            id: 500,
            name: 'INTEL ARC B580',
            category: 'GPU',
            specifications: {
                length_mm: 285,
                power: 160,
                memory_capacity: 12
            }
        },
        cooling: {
            id: 600,
            name: 'AMD WRAITH PRISM',
            category: 'Cooling',
            specifications: {
                height_mm: 93,
                socket: 'AM4'
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

console.log('🧪 Testing severity-based separation fix...\n');
console.log('Expected: Socket mismatch (AM4 vs AM5) should appear ONLY in Critical Issues, NOT in Warnings\n');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            
            console.log('='.repeat(60));
            console.log('📊 RESULTS:');
            console.log('='.repeat(60));
            
            console.log(`\n✅ CRITICAL ISSUES (${result.all_issues?.length || 0}):`);
            (result.all_issues || []).forEach((issue, idx) => {
                const msg = issue.message || '';
                const isSocket = msg.toLowerCase().includes('socket');
                console.log(`   ${idx + 1}. ${isSocket ? '🔴 ' : ''}${msg}`);
            });
            
            console.log(`\n⚠️  WARNINGS (${result.all_warnings?.length || 0}):`);
            (result.all_warnings || []).forEach((warning, idx) => {
                const msg = warning.message || '';
                const isSocket = msg.toLowerCase().includes('socket');
                console.log(`   ${idx + 1}. ${isSocket ? '🚨 WRONG! ' : ''}${msg}`);
            });
            
            console.log(`\n✅ COMPATIBLE NOTES (${result.compatible_notes?.length || 0})`);
            
            // Verify fix
            const socketInCritical = (result.all_issues || []).filter(i => 
                (i.message || '').toLowerCase().includes('socket')
            ).length;
            
            const socketInWarnings = (result.all_warnings || []).filter(w => 
                (w.message || '').toLowerCase().includes('socket')
            ).length;
            
            console.log('\n' + '='.repeat(60));
            console.log('🔍 VERIFICATION:');
            console.log('='.repeat(60));
            console.log(`Socket issues in Critical: ${socketInCritical}`);
            console.log(`Socket issues in Warnings: ${socketInWarnings}`);
            
            if (socketInWarnings > 0) {
                console.log('\n❌ FAIL: Socket mismatch still appearing in Warnings!');
                process.exit(1);
            } else if (socketInCritical > 0) {
                console.log('\n✅ PASS: Socket mismatch appears only in Critical Issues!');
                process.exit(0);
            } else {
                console.log('\n⚠️  WARNING: No socket issues detected at all');
                process.exit(2);
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
    process.exit(1);
});

req.write(postData);
req.end();
