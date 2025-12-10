/**
 * Fix LGA1851 Support - Add motherboard and update coolers
 * Intel Core Ultra 200 series (Arrow Lake) uses LGA1851 socket
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function fixLGA1851Support() {
    const client = await pool.connect();
    
    try {
        console.log('=== LGA1851 COMPATIBILITY FIX ===\n');
        
        // 1. Check current LGA1851 motherboard count
        const mbCheck = await client.query(`
            SELECT COUNT(*) as total FROM pc_parts 
            WHERE category = 'Motherboard' AND specifications->>'socket' = 'LGA1851'
        `);
        console.log(`Current LGA1851 motherboards: ${mbCheck.rows[0].total}`);
        
        // 2. Check LGA1851 CPU count
        const cpuCheck = await client.query(`
            SELECT id, name, specifications->>'socket' as socket 
            FROM pc_parts 
            WHERE category = 'CPU' AND specifications->>'socket' = 'LGA1851'
        `);
        console.log(`LGA1851 CPUs: ${cpuCheck.rows.length}`);
        cpuCheck.rows.forEach(cpu => console.log(`   - ${cpu.name}`));
        
        // 3. Check how many coolers support LGA1851
        const coolerCheck = await client.query(`
            SELECT COUNT(*) as total FROM pc_parts 
            WHERE category = 'Cooling' 
            AND specifications->'compatible_sockets' ? 'LGA1851'
        `);
        console.log(`\nCoolers with LGA1851 support: ${coolerCheck.rows[0].total}`);
        
        // 4. Add LGA1851 to all coolers that have universal brackets (support LGA1700)
        console.log('\n=== UPDATING COOLERS TO SUPPORT LGA1851 ===');
        
        const updateCoolers = await client.query(`
            UPDATE pc_parts 
            SET specifications = jsonb_set(
                specifications,
                '{compatible_sockets}',
                (
                    SELECT jsonb_agg(DISTINCT socket)
                    FROM (
                        SELECT jsonb_array_elements_text(specifications->'compatible_sockets') as socket
                        UNION
                        SELECT 'LGA1851'
                    ) sockets
                )
            )
            WHERE category = 'Cooling'
            AND specifications->'compatible_sockets' ? 'LGA1700'
            AND NOT (specifications->'compatible_sockets' ? 'LGA1851')
            RETURNING id, name
        `);
        console.log(`✅ Updated ${updateCoolers.rowCount} coolers to support LGA1851`);
        
        // 5. Check if we need to add an LGA1851 motherboard
        if (mbCheck.rows[0].total === '0') {
            console.log('\n=== ADDING LGA1851 MOTHERBOARD ===');
            
            // Get next ID
            const maxId = await client.query(`SELECT MAX(id) as max_id FROM pc_parts`);
            const nextId = (maxId.rows[0].max_id || 0) + 1;
            
            // Add ASUS ROG MAXIMUS Z890 HERO (LGA1851 motherboard)
            const insertMB = await client.query(`
                INSERT INTO pc_parts (
                    id, name, category, brand, price, stock, status,
                    specifications, dimensions, description, image_url
                ) VALUES (
                    $1,
                    'ASUS ROG MAXIMUS Z890 HERO',
                    'Motherboard',
                    'ASUS',
                    42999,
                    5,
                    'active',
                    $2::jsonb,
                    '{}'::jsonb,
                    'High-end Z890 motherboard for Intel Core Ultra 200 series processors. Features DDR5 support, PCIe 5.0, and advanced power delivery.',
                    '/assets/parts/motherboard/asus-rog-maximus-z890-hero.webp'
                )
                ON CONFLICT (id) DO NOTHING
                RETURNING id, name
            `, [
                nextId,
                JSON.stringify({
                    socket: "LGA1851",
                    chipset: "Z890",
                    form_factor: "ATX",
                    memory_type: "DDR5",
                    max_ram: 192,
                    ram_slots: 4,
                    m2_slots: 5,
                    sata_ports: 4,
                    pcie_slots: 3,
                    wireless_networking: true,
                    ethernet_ports: 2,
                    integrated_gpu_support: true,
                    power_connector_pins: { main: 24, eps: 8 }
                })
            ]);
            
            if (insertMB.rows.length > 0) {
                console.log(`✅ Added motherboard: ${insertMB.rows[0].name} (ID: ${insertMB.rows[0].id})`);
            }
            
            // Also add a more affordable B860 motherboard
            const nextId2 = nextId + 1;
            const insertMB2 = await client.query(`
                INSERT INTO pc_parts (
                    id, name, category, brand, price, stock, status,
                    specifications, dimensions, description, image_url
                ) VALUES (
                    $1,
                    'MSI MAG B860 TOMAHAWK WIFI',
                    'Motherboard',
                    'MSI',
                    12999,
                    10,
                    'active',
                    $2::jsonb,
                    '{}'::jsonb,
                    'Mid-range B860 motherboard for Intel Core Ultra 200 series. DDR5 support with WiFi 7.',
                    '/assets/parts/motherboard/msi-mag-b860-tomahawk-wifi.webp'
                )
                ON CONFLICT (id) DO NOTHING
                RETURNING id, name
            `, [
                nextId2,
                JSON.stringify({
                    socket: "LGA1851",
                    chipset: "B860",
                    form_factor: "ATX",
                    memory_type: "DDR5",
                    max_ram: 128,
                    ram_slots: 4,
                    m2_slots: 3,
                    sata_ports: 4,
                    pcie_slots: 2,
                    wireless_networking: true,
                    ethernet_ports: 1,
                    integrated_gpu_support: true,
                    power_connector_pins: { main: 24, eps: 8 }
                })
            ]);
            
            if (insertMB2.rows.length > 0) {
                console.log(`✅ Added motherboard: ${insertMB2.rows[0].name} (ID: ${insertMB2.rows[0].id})`);
            }
        }
        
        // 6. Verification
        console.log('\n=== VERIFICATION ===');
        
        const verifyMB = await client.query(`
            SELECT COUNT(*) as total FROM pc_parts 
            WHERE category = 'Motherboard' AND specifications->>'socket' = 'LGA1851'
        `);
        console.log(`LGA1851 motherboards: ${verifyMB.rows[0].total}`);
        
        const verifyCooler = await client.query(`
            SELECT COUNT(*) as total FROM pc_parts 
            WHERE category = 'Cooling' 
            AND specifications->'compatible_sockets' ? 'LGA1851'
        `);
        console.log(`Coolers supporting LGA1851: ${verifyCooler.rows[0].total}`);
        
        // Sample coolers
        const sampleCoolers = await client.query(`
            SELECT name, specifications->'compatible_sockets' as sockets
            FROM pc_parts 
            WHERE category = 'Cooling' 
            AND specifications->'compatible_sockets' ? 'LGA1851'
            LIMIT 5
        `);
        console.log('\nSample coolers with LGA1851:');
        sampleCoolers.rows.forEach(c => {
            console.log(`   ${c.name}: ${JSON.stringify(c.sockets)}`);
        });
        
        console.log('\n✅ LGA1851 SUPPORT FIX COMPLETE!');
        
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixLGA1851Support();
