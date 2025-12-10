/**
 * Fix motherboards with null socket
 */
const db = require('../config/db');

async function fixNullSockets() {
    try {
        const nullMBs = await db.query(`
            SELECT id, name, specifications
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            AND (specifications->>'socket' IS NULL OR specifications->>'socket' = '')
        `);
        
        console.log(`=== Motherboards with NULL socket: ${nullMBs.rows.length} ===\n`);
        
        for (const mb of nullMBs.rows) {
            console.log(`\n${mb.name}:`);
            console.log('  Specifications:', JSON.stringify(mb.specifications, null, 2));
            
            // Try to detect socket from name or chipset
            const name = mb.name.toUpperCase();
            const chipset = (mb.specifications?.chipset || '').toUpperCase();
            
            let detectedSocket = null;
            
            // Check name first (more reliable)
            // AM5 chipsets
            if (name.includes('X670') || name.includes('B650') || name.includes('A620')) {
                detectedSocket = 'AM5';
            }
            // AM4 chipsets
            else if (name.includes('X570') || name.includes('X470') || name.includes('X370') ||
                     name.includes('B550') || name.includes('B450') || name.includes('B350') ||
                     name.includes('A520') || name.includes('A320')) {
                detectedSocket = 'AM4';
            }
            // LGA1700 chipsets
            else if (name.includes('Z790') || name.includes('Z690') ||
                     name.includes('B760') || name.includes('B660') ||
                     name.includes('H770') || name.includes('H670') || name.includes('H610')) {
                detectedSocket = 'LGA1700';
            }
            // LGA1200 chipsets
            else if (name.includes('Z590') || name.includes('Z490') ||
                     name.includes('B560') || name.includes('B460') ||
                     name.includes('H570') || name.includes('H510') || name.includes('H470') || name.includes('H410')) {
                detectedSocket = 'LGA1200';
            }
            // LGA1151 chipsets
            else if (name.includes('Z390') || name.includes('Z370') || name.includes('Z270') || name.includes('Z170') ||
                     name.includes('B365') || name.includes('B360') || name.includes('B250') || name.includes('B150') ||
                     name.includes('H370') || name.includes('H310') || name.includes('H270') || name.includes('H170') || name.includes('H110')) {
                detectedSocket = 'LGA1151';
            }
            // LGA1851 chipsets
            else if (name.includes('Z890') || name.includes('B860') || name.includes('H810')) {
                detectedSocket = 'LGA1851';
            }
            // Fall back to chipset field
            else if (chipset.includes('X670') || chipset.includes('B650') || chipset.includes('A620')) {
                detectedSocket = 'AM5';
            }
            else if (chipset.includes('X570') || chipset.includes('X470') || chipset.includes('X370') ||
                     chipset.includes('B550') || chipset.includes('B450') || chipset.includes('B350') ||
                     chipset.includes('A520') || chipset.includes('A320')) {
                detectedSocket = 'AM4';
            }
            else if (chipset.includes('Z790') || chipset.includes('Z690') ||
                     chipset.includes('B760') || chipset.includes('B660') ||
                     chipset.includes('H770') || chipset.includes('H670') || chipset.includes('H610')) {
                detectedSocket = 'LGA1700';
            }
            else if (chipset.includes('Z590') || chipset.includes('Z490') ||
                     chipset.includes('B560') || chipset.includes('B460') ||
                     chipset.includes('H570') || chipset.includes('H510') || chipset.includes('H470') || chipset.includes('H410')) {
                detectedSocket = 'LGA1200';
            }
            else if (chipset.includes('Z390') || chipset.includes('Z370') || chipset.includes('Z270') || chipset.includes('Z170') ||
                     chipset.includes('B365') || chipset.includes('B360') || chipset.includes('B250') || chipset.includes('B150') ||
                     chipset.includes('H370') || chipset.includes('H310') || chipset.includes('H270') || chipset.includes('H170') || chipset.includes('H110')) {
                detectedSocket = 'LGA1151';
            }
            else if (chipset.includes('Z890') || chipset.includes('B860') || chipset.includes('H810')) {
                detectedSocket = 'LGA1851';
            }
            
            if (detectedSocket) {
                console.log(`  -> Detected socket: ${detectedSocket} (from chipset: ${chipset})`);
                
                await db.query(`
                    UPDATE pc_parts 
                    SET specifications = jsonb_set(COALESCE(specifications, '{}'::jsonb), '{socket}', $1::jsonb)
                    WHERE id = $2
                `, [JSON.stringify(detectedSocket), mb.id]);
                
                console.log('  ✅ Fixed!');
            } else {
                console.log(`  -> Could not detect socket from chipset: ${chipset || 'none'}`);
            }
        }
        
        // Verify
        const remaining = await db.query(`
            SELECT COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            AND (specifications->>'socket' IS NULL OR specifications->>'socket' = '')
        `);
        
        console.log(`\n=== After fix: ${remaining.rows[0].count} motherboards still have null socket ===`);
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

fixNullSockets();
