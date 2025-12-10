const axios = require('axios');

(async () => {
    const response = await axios.post('http://localhost:5000/api/compatibility/advanced/full-build', {
        components: {
            cpu: {
                id: 1,
                name: 'AMD RYZEN 3 3200G (BOXED)',
                category: 'CPU',
                specifications: { socket: 'AM4', tdp: 65 }
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
                    m2_slots: 2,
                    sata_ports: 6,
                    pcie_slots: 4
                }
            }
        }
    });
    
    console.log('\n🔍 SOCKET MISMATCH ISSUES:\n');
    const socketIssues = response.data.data.all_issues.filter(i => 
        (i.message || '').toLowerCase().includes('socket')
    );
    
    socketIssues.forEach((issue, idx) => {
        console.log(`${idx + 1}. Message: "${issue.message}"`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Type: ${issue.type || 'none'}`);
        console.log(`   Component: ${issue.component || 'none'}`);
        console.log('');
    });
    
    console.log(`Total socket issues: ${socketIssues.length} (should be 1)\n`);
})();
