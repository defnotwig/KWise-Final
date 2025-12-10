const axios = require('axios');

// Test build with AM4 CPU + AM5 motherboard (socket mismatch)
const testBuild = {
    cpu: { id: 20001, name: 'AMD Ryzen 3 3200G', category: 'CPU' },
    motherboard: { id: 11018, name: 'AORUS B650 ELITE AX ICE', category: 'Motherboard' },
    ram: { id: 16004, name: '16GB DDR4 3200', category: 'RAM' },
    case: { id: 12016, name: 'POWERLOGIC SLIM', category: 'Case' },
    gpu: { id: 18053, name: 'INTEL ARC B580', category: 'GPU' },
    cooling: { id: 14003, name: 'AMD WRAITH PRISM', category: 'Cooling' },
    storage: [{ id: 17007, name: '1TB ADATA LEGEND 710', category: 'Storage' }]
};

async function testSeveritySeparation() {
    console.log('\n🔍 SEVERITY SEPARATION DEBUG TEST\n');
    console.log('=' .repeat(80));
    
    try {
        const response = await axios.post('http://localhost:5000/api/compatibility/advanced/full-build', {
            build: testBuild
        });
        
        const { all_issues, all_warnings } = response.data.data;
        
        console.log('\n📊 API RESPONSE ANALYSIS:\n');
        
        // Analyze Critical Issues
        console.log(`✅ CRITICAL ISSUES (${all_issues.length}):`);
        all_issues.forEach((issue, idx) => {
            const msg = issue.message || '';
            const severity = issue.severity || 'NONE';
            const isSocket = msg.toLowerCase().includes('socket') && 
                           (msg.toLowerCase().includes('mismatch') || msg.toLowerCase().includes('incompatible'));
            
            console.log(`   ${idx + 1}. [${severity}] ${isSocket ? '🔴 SOCKET' : '📍'} ${msg.substring(0, 60)}...`);
        });
        
        // Analyze Warnings
        console.log(`\n⚠️  WARNINGS (${all_warnings.length}):`);
        all_warnings.forEach((warning, idx) => {
            const msg = warning.message || '';
            const severity = warning.severity || 'NONE';
            const isSocket = msg.toLowerCase().includes('socket') && 
                           (msg.toLowerCase().includes('mismatch') || msg.toLowerCase().includes('incompatible'));
            
            console.log(`   ${idx + 1}. [${severity}] ${isSocket ? '🚨 SOCKET!!!' : '⚠️ '} ${msg.substring(0, 60)}...`);
        });
        
        // Count socket issues
        const socketInCritical = all_issues.filter(i => {
            const msg = (i.message || '').toLowerCase();
            return msg.includes('socket') && (msg.includes('mismatch') || msg.includes('incompatible'));
        }).length;
        
        const socketInWarnings = all_warnings.filter(w => {
            const msg = (w.message || '').toLowerCase();
            return msg.includes('socket') && (msg.includes('mismatch') || msg.includes('incompatible'));
        }).length;
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 SOCKET ISSUE DISTRIBUTION:\n');
        console.log(`   Socket issues in CRITICAL: ${socketInCritical}`);
        console.log(`   Socket issues in WARNINGS: ${socketInWarnings}`);
        console.log('\n' + '='.repeat(80));
        console.log('🎯 TEST RESULT:\n');
        
        if (socketInWarnings === 0 && socketInCritical > 0) {
            console.log('   ✅ PASS: All socket issues in Critical, none in Warnings');
            console.log('   ✅ Severity separation working correctly!\n');
            process.exit(0);
        } else if (socketInWarnings > 0) {
            console.log(`   ❌ FAIL: Found ${socketInWarnings} socket issue(s) in Warnings (should be 0)`);
            console.log('   ❌ Severity separation NOT working correctly!\n');
            
            // Show which specific warning has socket issue
            console.log('🔍 SOCKET ISSUES IN WARNINGS (DETAILED):\n');
            all_warnings.forEach((warning, idx) => {
                const msg = (warning.message || '').toLowerCase();
                if (msg.includes('socket') && (msg.includes('mismatch') || msg.includes('incompatible'))) {
                    console.log(`   Warning #${idx + 1}:`);
                    console.log(`      Message: ${warning.message}`);
                    console.log(`      Severity: ${warning.severity || 'NONE'}`);
                    console.log(`      Category: ${warning.category || 'NONE'}`);
                    console.log(`      Details: ${warning.details || 'NONE'}`);
                    console.log('');
                }
            });
            
            process.exit(1);
        } else {
            console.log('   ⚠️  WARNING: No socket issues found in either section');
            console.log('   This test build should have socket incompatibility!\n');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ TEST ERROR:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    }
}

testSeveritySeparation();
