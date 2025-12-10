/**
 * Check DDR5 RAM availability for LGA1851 builds
 */
const db = require('../config/db');

async function checkDDR5() {
    try {
        const rams = await db.query(`
            SELECT 
                name, 
                specifications->>'type' as type, 
                specifications->>'memory_type' as memory_type,
                specifications
            FROM pc_parts 
            WHERE category = 'RAM'
        `);
        
        console.log('=== RAM Memory Types ===');
        const ddr5 = [];
        const ddr4 = [];
        
        rams.rows.forEach(r => {
            const memType = r.type || r.memory_type || '';
            if (memType.toLowerCase().includes('ddr5') || r.name.toLowerCase().includes('ddr5')) {
                ddr5.push(r.name);
            } else {
                ddr4.push(r.name);
            }
        });
        
        console.log(`DDR5 RAM: ${ddr5.length} products`);
        ddr5.forEach(n => console.log(`  ✅ ${n}`));
        
        console.log(`\nDDR4 RAM: ${ddr4.length} products`);
        // Just show first 5
        ddr4.slice(0, 5).forEach(n => console.log(`  - ${n}`));
        if (ddr4.length > 5) console.log(`  ... and ${ddr4.length - 5} more`);
        
        if (ddr5.length === 0) {
            console.log('\n❌ WARNING: No DDR5 RAM found! LGA1851 builds require DDR5!');
        } else {
            console.log('\n✅ DDR5 RAM available for LGA1851 builds');
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

checkDDR5();
