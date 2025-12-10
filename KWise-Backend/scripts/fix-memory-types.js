/**
 * Check and fix memory_type on motherboards that are missing it
 * This is critical for DDR filtering to work correctly
 */
const db = require('../config/db');

async function fixMemoryTypes() {
    console.log('====================================');
    console.log('  Memory Type Check & Fix');
    console.log('====================================\n');

    try {
        // Check motherboards missing memory_type
        const missingMemType = await db.query(`
            SELECT id, name, specifications->>'socket' as socket, specifications->>'memory_type' as mem_type, specifications
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            AND (specifications->>'memory_type' IS NULL OR specifications->>'memory_type' = '')
        `);
        
        console.log(`Motherboards missing memory_type: ${missingMemType.rows.length}\n`);
        
        for (const mb of missingMemType.rows) {
            const name = mb.name.toUpperCase();
            const socket = mb.socket || '';
            let memType = null;
            
            // LGA1851 = DDR5 only
            if (socket === 'LGA1851') {
                memType = 'DDR5';
            }
            // AM5 = DDR5 only
            else if (socket === 'AM5') {
                memType = 'DDR5';
            }
            // LGA1700 - check for D4 suffix (DDR4) or default to DDR5
            else if (socket === 'LGA1700') {
                if (name.includes('D4') || name.includes('DDR4')) {
                    memType = 'DDR4';
                } else {
                    memType = 'DDR5';
                }
            }
            // AM4 = DDR4
            else if (socket === 'AM4') {
                memType = 'DDR4';
            }
            // LGA1200/LGA1151 = DDR4
            else if (socket === 'LGA1200' || socket === 'LGA1151') {
                memType = 'DDR4';
            }
            
            if (memType) {
                console.log(`${mb.name} (${socket}) -> ${memType}`);
                
                await db.query(`
                    UPDATE pc_parts 
                    SET specifications = jsonb_set(COALESCE(specifications, '{}'::jsonb), '{memory_type}', $1::jsonb)
                    WHERE id = $2
                `, [JSON.stringify(memType), mb.id]);
            } else {
                console.log(`⚠️ Could not determine memory_type for: ${mb.name} (${socket})`);
            }
        }
        
        // Verify
        const remaining = await db.query(`
            SELECT COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            AND (specifications->>'memory_type' IS NULL OR specifications->>'memory_type' = '')
        `);
        
        console.log(`\n✅ Fixed! Remaining without memory_type: ${remaining.rows[0].count}`);
        
        // Show LGA1851 motherboards status
        const lga1851 = await db.query(`
            SELECT name, specifications->>'socket' as socket, specifications->>'memory_type' as mem_type
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            AND specifications->>'socket' = 'LGA1851'
        `);
        
        console.log('\n=== LGA1851 Motherboards Status ===');
        lga1851.rows.forEach(r => {
            console.log(`  ✅ ${r.name} - Socket: ${r.socket}, Memory: ${r.mem_type}`);
        });
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

fixMemoryTypes();
