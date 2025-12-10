/**
 * FIX LGA1851 COOLER SUPPORT
 * 
 * ROOT CAUSE: Intel Core Ultra 200 series (Arrow Lake) CPUs use LGA1851 socket
 * but NO coolers in the database support LGA1851.
 * 
 * Most modern coolers with universal brackets DO support LGA1851.
 * LGA1851 is the same mounting hole pattern as LGA1700 (Intel 12th-14th Gen).
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function fixLGA1851CoolerSupport() {
    try {
        console.log('='.repeat(60));
        console.log('🔧 FIX LGA1851 COOLER SUPPORT');
        console.log('='.repeat(60));
        
        // 1. First, check all CPU sockets in database
        console.log('\n📊 CPU SOCKET DISTRIBUTION:');
        const cpuSockets = await pool.query(`
            SELECT specifications->>'socket' as socket, COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'CPU'
            GROUP BY specifications->>'socket'
            ORDER BY specifications->>'socket'
        `);
        cpuSockets.rows.forEach(row => {
            console.log(`   ${row.socket}: ${row.count} CPUs`);
        });

        // 2. Check motherboard sockets
        console.log('\n📊 MOTHERBOARD SOCKET DISTRIBUTION:');
        const mbSockets = await pool.query(`
            SELECT specifications->>'socket' as socket, COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Motherboard'
            GROUP BY specifications->>'socket'
            ORDER BY specifications->>'socket'
        `);
        mbSockets.rows.forEach(row => {
            console.log(`   ${row.socket || 'NULL'}: ${row.count} motherboards`);
        });

        // 3. Check current cooler socket support
        console.log('\n📊 CURRENT COOLER LGA1851 SUPPORT:');
        const lga1851Coolers = await pool.query(`
            SELECT COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Cooling'
            AND specifications->'compatible_sockets' ? 'LGA1851'
        `);
        console.log(`   Coolers with LGA1851 support: ${lga1851Coolers.rows[0].count}`);

        // 4. Check which coolers have LGA1700 (same mounting as LGA1851)
        const lga1700Coolers = await pool.query(`
            SELECT id, name, specifications->'compatible_sockets' as sockets
            FROM pc_parts 
            WHERE category = 'Cooling'
            AND specifications->'compatible_sockets' ? 'LGA1700'
        `);
        console.log(`   Coolers with LGA1700 support (can add LGA1851): ${lga1700Coolers.rows.length}`);

        // 5. Add LGA1851 to all coolers that support LGA1700
        // (LGA1851 uses the same mounting pattern as LGA1700)
        console.log('\n🔧 ADDING LGA1851 SUPPORT TO COOLERS WITH LGA1700...');
        
        let updatedCount = 0;
        for (const cooler of lga1700Coolers.rows) {
            const currentSockets = cooler.sockets || [];
            if (!currentSockets.includes('LGA1851')) {
                const newSockets = [...currentSockets, 'LGA1851'];
                
                await pool.query(`
                    UPDATE pc_parts 
                    SET specifications = jsonb_set(
                        specifications,
                        '{compatible_sockets}',
                        $1::jsonb
                    )
                    WHERE id = $2
                `, [JSON.stringify(newSockets), cooler.id]);
                
                updatedCount++;
                console.log(`   ✅ Updated: ${cooler.name}`);
            }
        }

        // 6. Also check Intel stock coolers that might need LGA1851
        console.log('\n🔧 CHECKING INTEL STOCK COOLERS...');
        const intelCoolers = await pool.query(`
            SELECT id, name, specifications->'compatible_sockets' as sockets
            FROM pc_parts 
            WHERE category = 'Cooling'
            AND name ILIKE '%intel%'
        `);
        
        for (const cooler of intelCoolers.rows) {
            const currentSockets = cooler.sockets || [];
            if (!currentSockets.includes('LGA1851')) {
                // Add LGA1851 to Intel coolers
                const newSockets = [...new Set([...currentSockets, 'LGA1851'])];
                
                await pool.query(`
                    UPDATE pc_parts 
                    SET specifications = jsonb_set(
                        specifications,
                        '{compatible_sockets}',
                        $1::jsonb
                    )
                    WHERE id = $2
                `, [JSON.stringify(newSockets), cooler.id]);
                
                console.log(`   ✅ Updated Intel cooler: ${cooler.name}`);
                console.log(`      Sockets: ${JSON.stringify(newSockets)}`);
            }
        }

        // 7. VERIFICATION
        console.log('\n' + '='.repeat(60));
        console.log('📊 VERIFICATION');
        console.log('='.repeat(60));
        
        const verifyLga1851 = await pool.query(`
            SELECT COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Cooling'
            AND specifications->'compatible_sockets' ? 'LGA1851'
        `);
        console.log(`\n✅ COOLERS NOW SUPPORTING LGA1851: ${verifyLga1851.rows[0].count}`);
        
        // Show sample
        const sampleCoolers = await pool.query(`
            SELECT name, specifications->'compatible_sockets' as sockets
            FROM pc_parts 
            WHERE category = 'Cooling'
            AND specifications->'compatible_sockets' ? 'LGA1851'
            LIMIT 5
        `);
        console.log('\nSample of coolers with LGA1851 support:');
        sampleCoolers.rows.forEach(c => {
            console.log(`   ${c.name}: ${JSON.stringify(c.sockets)}`);
        });

        // 8. Check for LGA1851 motherboards
        console.log('\n📊 CHECKING LGA1851 MOTHERBOARDS:');
        const lga1851MBs = await pool.query(`
            SELECT id, name, specifications->>'socket' as socket
            FROM pc_parts 
            WHERE category = 'Motherboard'
            AND specifications->>'socket' = 'LGA1851'
        `);
        console.log(`   LGA1851 motherboards in database: ${lga1851MBs.rows.length}`);
        
        if (lga1851MBs.rows.length === 0) {
            console.log('\n⚠️  WARNING: No LGA1851 motherboards in database!');
            console.log('   Intel Core Ultra 200 CPUs (LGA1851) need matching motherboards!');
            console.log('   You may need to add Z890/B860/H870 motherboards to support these CPUs.');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ LGA1851 COOLER FIX COMPLETE!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

fixLGA1851CoolerSupport();
