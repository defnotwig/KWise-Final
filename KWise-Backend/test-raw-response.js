const axios = require('axios');
const fs = require('fs');

const testBuild = {
    cpu: { id: 20001, name: 'AMD Ryzen 3 3200G', category: 'CPU' },
    motherboard: { id: 11018, name: 'AORUS B650 ELITE AX ICE', category: 'Motherboard' },
    ram: { id: 16004, name: '16GB DDR4 3200', category: 'RAM' },
    case: { id: 12016, name: 'POWERLOGIC SLIM', category: 'Case' },
    gpu: { id: 18053, name: 'INTEL ARC B580', category: 'GPU' },
    cooling: { id: 14003, name: 'AMD WRAITH PRISM', category: 'Cooling' },
    storage: { id: 17007, name: '1TB ADATA LEGEND 710', category: 'Storage' }
};

async function testRawResponse() {
    try {
        console.log('\n🔍 Sending API request...\n');
        const response = await axios.post('http://localhost:5000/api/compatibility/advanced/full-build', {
            components: testBuild
        });
        
        const { all_issues, all_warnings } = response.data.data;
        
        // Save full response to file
        fs.writeFileSync('test-response.json', JSON.stringify(response.data.data, null, 2));
        console.log('✅ Full response saved to test-response.json\n');
        
        // Extract socket issues from CRITICAL
        const socketInCritical = all_issues.filter(i => {
            const msg = (i.message || '').toLowerCase();
            return msg.includes('socket') && (msg.includes('mismatch') || msg.includes('incompatible'));
        });
        
        // Extract socket issues from WARNINGS  
        const socketInWarnings = all_warnings.filter(w => {
            const msg = (w.message || '').toLowerCase();
            return msg.includes('socket') && (msg.includes('mismatch') || msg.includes('incompatible'));
        });
        
        console.log('🔴 SOCKET ISSUES IN CRITICAL:');
        socketInCritical.forEach((issue, idx) => {
            console.log(`\n   ${idx + 1}. Message: "${issue.message}"`);
            console.log(`      Severity: ${issue.severity || 'NONE'}`);
            console.log(`      Type: ${issue.type || 'NONE'}`);
            console.log(`      Category: ${issue.category || 'NONE'}`);
        });
        
        console.log('\n\n⚠️  SOCKET ISSUES IN WARNINGS:');
        socketInWarnings.forEach((warning, idx) => {
            console.log(`\n   ${idx + 1}. Message: "${warning.message}"`);
            console.log(`      Severity: ${warning.severity || 'NONE'}`);
            console.log(`      Type: ${warning.type || 'NONE'}`);
            console.log(`      Category: ${warning.category || 'NONE'}`);
            console.log(`      Warning (key): ${warning.warning || 'NONE'}`);
        });
        
        console.log(`\n\n📊 SUMMARY:`);
        console.log(`   Total Critical Issues: ${all_issues.length}`);
        console.log(`   Total Warnings: ${all_warnings.length}`);
        console.log(`   Socket in Critical: ${socketInCritical.length}`);
        console.log(`   Socket in Warnings: ${socketInWarnings.length}`);
        
        if (socketInWarnings.length > 0) {
            console.log(`\n❌ FAIL: Found ${socketInWarnings.length} socket issue(s) in warnings!`);
            process.exit(1);
        } else {
            console.log(`\n✅ PASS: No socket issues in warnings!`);
            process.exit(0);
        }
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

testRawResponse();
