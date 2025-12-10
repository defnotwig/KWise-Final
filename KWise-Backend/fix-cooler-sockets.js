const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function fixCoolerSockets() {
    try {
        console.log('\n🔧 FIXING COOLER SOCKET SUPPORT FOR LGA1151...\n');
        
        // 1. Fix "Intel 1st - 11th Gen" cooler - should support older Intel sockets
        const intel1st11th = await pool.query(`
            UPDATE pc_parts 
            SET specifications = jsonb_set(
                specifications, 
                '{compatible_sockets}', 
                '["LGA1151", "LGA1150", "LGA1155", "LGA1200", "LGA1700"]'::jsonb
            )
            WHERE id = 713 AND name LIKE '%Intel 1st - 11th Gen%'
            RETURNING id, name, specifications->'compatible_sockets' as sockets
        `);
        if (intel1st11th.rows.length > 0) {
            console.log('✅ Fixed Intel 1st - 11th Gen cooler:', JSON.stringify(intel1st11th.rows[0].sockets));
        }
        
        // 2. Fix "Intel 12th - 14th Gen" - LGA1700 only (this is correct, no change needed)
        
        // 3. Add LGA1151 support to most tower coolers and AIOs that have LGA1200 support
        // (Most coolers that support LGA1200 also physically support LGA1151 with the same mounting)
        const updateResult = await pool.query(`
            UPDATE pc_parts 
            SET specifications = jsonb_set(
                specifications, 
                '{compatible_sockets}', 
                (
                    SELECT jsonb_agg(socket ORDER BY socket)
                    FROM (
                        SELECT DISTINCT jsonb_array_elements_text(specifications->'compatible_sockets') as socket
                        UNION SELECT 'LGA1151'
                        UNION SELECT 'LGA1150'
                        UNION SELECT 'LGA1155'
                    ) sockets
                )
            )
            WHERE category = 'Cooling'
            AND specifications->'compatible_sockets' @> '["LGA1200"]'::jsonb
            AND NOT specifications->'compatible_sockets' @> '["LGA1151"]'::jsonb
            RETURNING id, name
        `);
        
        console.log(`\n✅ Updated ${updateResult.rows.length} coolers to support LGA1151:\n`);
        updateResult.rows.forEach(row => {
            console.log(`   - ID ${row.id}: ${row.name}`);
        });
        
        // 4. Verify the changes
        const verification = await pool.query(`
            SELECT COUNT(*) as count 
            FROM pc_parts 
            WHERE category = 'Cooling' 
            AND specifications->'compatible_sockets' @> '["LGA1151"]'::jsonb
        `);
        
        console.log(`\n✅ VERIFICATION: ${verification.rows[0].count} coolers now support LGA1151\n`);
        
        // 5. Show sample of updated coolers
        const sample = await pool.query(`
            SELECT name, specifications->'compatible_sockets' as sockets 
            FROM pc_parts 
            WHERE category = 'Cooling' 
            AND specifications->'compatible_sockets' @> '["LGA1151"]'::jsonb
            LIMIT 10
        `);
        
        console.log('Sample of coolers supporting LGA1151:');
        sample.rows.forEach(row => {
            console.log(`   ${row.name}: ${JSON.stringify(row.sockets)}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

fixCoolerSockets();
