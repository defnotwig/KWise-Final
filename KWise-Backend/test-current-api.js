/**
 * Test Current Compatibility API Response
 * Check if socket issues are still appearing in warnings
 */

const axios = require('axios');

async function testCompatibility() {
    try {
        console.log('🧪 Testing Compatibility API...\n');
        
        // Test build with known incompatibilities
        const components = {
            cpu: {
                id: 20001,
                name: 'AMD RYZEN 3 3200G (BOXED)',
                category: 'Processor',
                specifications: { socket: 'AM4', tdp_w: 65 }
            },
            motherboard: {
                id: 11018,
                name: 'AORUS B650 ELITE AX ICE',
                category: 'Motherboard',
                specifications: { socket: 'AM5', form_factor: 'ATX', ram_slots: 4, chipset: 'B650' }
            },
            ram: {
                id: 18027,
                name: '16GB ADATA DDR4 3200 LAPTOP MEMORY',
                category: 'RAM',
                specifications: { type: 'DDR4', capacity_gb: 16, speed_mhz: 3200 }
            },
            case: {
                id: 14027,
                name: 'POWERLOGIC SLIM (Black)',
                category: 'Case',
                specifications: { form_factor: 'Micro-ATX,Mini-ITX', max_gpu_length_mm: 250, max_cooler_height_mm: 120 }
            },
            gpu: {
                id: 19021,
                name: '12GB INTEL ARC B580 ASROCK CHALLENGER *(DUALFAN)',
                category: 'GPU',
                specifications: { length_mm: 285, tdp_w: 160, slot_width: 2 }
            },
            cooling: {
                id: 17007,
                name: 'AMD WRAITH PRISM RYZEN COOLER',
                category: 'Cooling',
                specifications: { height_mm: 93, compatible_sockets: ['AM4'] }
            },
            storage: {
                id: 16014,
                name: '1TB ADATA LEGEND 710',
                category: 'Storage',
                specifications: { capacity_gb: 1000, interface: 'M.2 NVMe' }
            }
        };
        
        const response = await axios.post('http://localhost:5000/api/compatibility/advanced/full-build', {
            components
        });
        
        const data = response.data;
        
        console.log('📊 API RESPONSE ANALYSIS\n');
        console.log(`Compatible: ${data.compatible}`);
        console.log(`Score: ${data.compatibility_score}/100\n`);
        
        console.log(`🔴 CRITICAL ISSUES: ${data.critical_issues?.length || 0}`);
        data.critical_issues?.forEach((issue, idx) => {
            console.log(`   ${idx + 1}. ${issue.message}`);
            console.log(`      Severity: ${issue.severity}`);
            console.log(`      Type: ${issue.type || 'NONE'}`);
            if (issue.rule) console.log(`      Rule: ${issue.rule}`);
        });
        
        console.log(`\n⚠️  WARNINGS: ${data.warnings?.length || 0}`);
        data.warnings?.forEach((warning, idx) => {
            console.log(`   ${idx + 1}. ${warning.message}`);
            console.log(`      Severity: ${warning.severity}`);
            if (warning.rule) console.log(`      Rule: ${warning.rule}`);
        });
        
        console.log(`\n✅ COMPATIBLE NOTES: ${data.compatible_notes?.length || 0}`);
        if (data.compatible_notes?.length > 10) {
            console.log(`   (Showing first 10 of ${data.compatible_notes.length})`);
            data.compatible_notes.slice(0, 10).forEach((note, idx) => {
                console.log(`   ${idx + 1}. ${note.message || note}`);
            });
        } else {
            data.compatible_notes?.forEach((note, idx) => {
                console.log(`   ${idx + 1}. ${note.message || note}`);
            });
        }
        
        // Check for duplicate socket issues
        console.log(`\n🔍 SOCKET ISSUE CHECK:`);
        const socketInCritical = data.critical_issues?.filter(i => 
            (i.message || '').toLowerCase().includes('socket')
        ) || [];
        const socketInWarnings = data.warnings?.filter(w => 
            (w.message || '').toLowerCase().includes('socket')
        ) || [];
        
        console.log(`   Socket issues in Critical: ${socketInCritical.length}`);
        console.log(`   Socket issues in Warnings: ${socketInWarnings.length} ${socketInWarnings.length > 0 ? '❌ BUG!' : '✅'}`);
        
        if (socketInWarnings.length > 0) {
            console.log(`\n❌ SOCKET ISSUES STILL IN WARNINGS:`);
            socketInWarnings.forEach((w, idx) => {
                console.log(`   ${idx + 1}. ${w.message}`);
                console.log(`      Rule: ${w.rule}`);
                console.log(`      Severity: ${w.severity}`);
            });
        }
        
        process.exit(socketInWarnings.length > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

testCompatibility();
