/**
 * Check Socket Specifications in Database
 */

const { query } = require('./config/db');

async function checkSpecs() {
    try {
        console.log('🔍 Checking component specifications...\n');
        
        // CPU: AMD Ryzen 3 3200G (ID 20001)
        const cpuResult = await query(
            'SELECT id, name, specifications FROM pc_parts WHERE id = 20001'
        );
        
        if (cpuResult.rows[0]) {
            const cpu = cpuResult.rows[0];
            const specs = typeof cpu.specifications === 'string' 
                ? JSON.parse(cpu.specifications) 
                : cpu.specifications;
            
            console.log('CPU (ID 20001):');
            console.log('  Name:', cpu.name);
            console.log('  Socket:', specs.socket || 'MISSING');
            console.log('  Full specs:', JSON.stringify(specs, null, 2));
        }
        
        console.log('\n');
        
        // Motherboard: AORUS B650 ELITE AX ICE (ID 11018)
        const mbResult = await query(
            'SELECT id, name, specifications FROM pc_parts WHERE id = 11018'
        );
        
        if (mbResult.rows[0]) {
            const mb = mbResult.rows[0];
            const specs = typeof mb.specifications === 'string' 
                ? JSON.parse(mb.specifications) 
                : mb.specifications;
            
            console.log('Motherboard (ID 11018):');
            console.log('  Name:', mb.name);
            console.log('  Socket:', specs.socket || 'MISSING');
            console.log('  Full specs:', JSON.stringify(specs, null, 2));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkSpecs();
