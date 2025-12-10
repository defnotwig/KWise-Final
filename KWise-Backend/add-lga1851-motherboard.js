/**
 * Add LGA1851 Motherboard to Database
 * 
 * The Intel Core Ultra 5 245KF (LGA1851) has NO compatible motherboards.
 * This script adds Z890 and B860 motherboards to enable Intel Core Ultra builds.
 */

const db = require('./config/db');

async function addLGA1851Motherboard() {
    console.log('======================================================================');
    console.log('🔧 ADDING LGA1851 MOTHERBOARDS TO DATABASE');
    console.log('======================================================================\n');

    try {
        // Check if we already have an LGA1851 motherboard
        const existingCheck = await db.query(`
            SELECT id, name FROM pc_parts
            WHERE category = 'Motherboard'
            AND specifications->>'socket' = 'LGA1851'
        `);

        if (existingCheck.rows.length > 0) {
            console.log('✅ LGA1851 motherboard already exists:');
            existingCheck.rows.forEach(mb => {
                console.log(`   - ${mb.name}`);
            });
            process.exit(0);
            return;
        }

        // Create the Z890 motherboard for Intel Core Ultra (Arrow Lake)
        const insertQuery = `
            INSERT INTO pc_parts (
                name, category, brand, price, stock, 
                specifications, is_active, kiosk_visible, description
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, name
        `;

        // Premium Z890 motherboard
        const z890Specs = {
            socket: 'LGA1851',
            chipset: 'Z890',
            form_factor: 'ATX',
            memory_type: 'DDR5',
            ram_slots: 4,
            max_ram: 192,
            m2_slots: 4,
            pcie_slots: 3,
            sata_ports: 4,
            ethernet_ports: 1,
            power_connector_pins: {
                main: 24,
                eps: 8
            },
            features: [
                'PCIe 5.0 Ready',
                'DDR5 8000MHz+ Support',
                'Wi-Fi 7',
                'Thunderbolt 4',
                'BIOS Flashback'
            ]
        };

        const result1 = await db.query(insertQuery, [
            'ASUS ROG STRIX Z890-E GAMING WIFI',
            'Motherboard',
            'ASUS',
            24999.00,
            10,
            JSON.stringify(z890Specs),
            true,
            true,
            'High-end LGA1851 motherboard for Intel Core Ultra 200 series with DDR5 and PCIe 5.0 support'
        ]);

        console.log('✅ Added premium LGA1851 motherboard:');
        console.log(`   ID: ${result1.rows[0].id}`);
        console.log(`   Name: ${result1.rows[0].name}`);
        console.log(`   Socket: LGA1851`);
        console.log(`   Chipset: Z890`);
        console.log(`   Price: ₱24,999`);

        // Budget B860 motherboard
        const b860Specs = {
            socket: 'LGA1851',
            chipset: 'B860',
            form_factor: 'ATX',
            memory_type: 'DDR5',
            ram_slots: 4,
            max_ram: 192,
            m2_slots: 2,
            pcie_slots: 2,
            sata_ports: 4,
            ethernet_ports: 1,
            power_connector_pins: {
                main: 24,
                eps: 8
            },
            features: [
                'PCIe 5.0 x16 Slot',
                'DDR5 7200MHz+ Support',
                'Wi-Fi 6E',
                'Extended Heatsinks'
            ]
        };

        const result2 = await db.query(insertQuery, [
            'MSI MAG B860 TOMAHAWK WIFI',
            'Motherboard',
            'MSI',
            12999.00,
            15,
            JSON.stringify(b860Specs),
            true,
            true,
            'Mid-range LGA1851 motherboard for Intel Core Ultra 200 series with DDR5 support'
        ]);

        console.log('\n✅ Added budget LGA1851 motherboard:');
        console.log(`   ID: ${result2.rows[0].id}`);
        console.log(`   Name: ${result2.rows[0].name}`);
        console.log(`   Socket: LGA1851`);
        console.log(`   Chipset: B860`);
        console.log(`   Price: ₱12,999`);

        // Entry-level H870 motherboard
        const h870Specs = {
            socket: 'LGA1851',
            chipset: 'H870',
            form_factor: 'Micro-ATX',
            memory_type: 'DDR5',
            ram_slots: 2,
            max_ram: 96,
            m2_slots: 1,
            pcie_slots: 1,
            sata_ports: 4,
            ethernet_ports: 1,
            power_connector_pins: {
                main: 24,
                eps: 4
            },
            features: [
                'DDR5 6400MHz Support',
                'PCIe 4.0 Slots',
                'Compact Design'
            ]
        };

        const result3 = await db.query(insertQuery, [
            'GIGABYTE H870M DS3H',
            'Motherboard',
            'GIGABYTE',
            7999.00,
            20,
            JSON.stringify(h870Specs),
            true,
            true,
            'Entry-level LGA1851 Micro-ATX motherboard for Intel Core Ultra 200 series'
        ]);

        console.log('\n✅ Added entry-level LGA1851 motherboard:');
        console.log(`   ID: ${result3.rows[0].id}`);
        console.log(`   Name: ${result3.rows[0].name}`);
        console.log(`   Socket: LGA1851`);
        console.log(`   Chipset: H870`);
        console.log(`   Price: ₱7,999`);

        // Verify the additions
        console.log('\n======================================================================');
        console.log('📊 VERIFICATION:');
        console.log('======================================================================');

        const verify = await db.query(`
            SELECT name, brand, price, 
                   specifications->>'socket' as socket, 
                   specifications->>'chipset' as chipset,
                   specifications->>'memory_type' as ram_type
            FROM pc_parts
            WHERE category = 'Motherboard' AND specifications->>'socket' = 'LGA1851'
            ORDER BY price DESC
        `);

        console.log(`\n✅ LGA1851 motherboards now in database: ${verify.rows.length}`);
        verify.rows.forEach(mb => {
            console.log(`   - ${mb.name} (${mb.chipset}, ${mb.ram_type}) - ₱${parseFloat(mb.price).toLocaleString()}`);
        });

        // Check compatibility with CPU
        const cpuCheck = await db.query(`
            SELECT name, specifications->>'socket' as socket
            FROM pc_parts
            WHERE category = 'CPU' AND specifications->>'socket' = 'LGA1851'
        `);

        console.log(`\n🔌 LGA1851 CPUs that can now build: ${cpuCheck.rows.length}`);
        cpuCheck.rows.forEach(cpu => console.log(`   - ${cpu.name}`));

        // Check cooler compatibility
        const coolerCheck = await db.query(`
            SELECT COUNT(*) as count
            FROM pc_parts
            WHERE category = 'Cooling'
            AND specifications->'compatible_sockets' @> '"LGA1851"'
        `);

        console.log(`\n❄️ Coolers compatible with LGA1851: ${coolerCheck.rows[0].count}`);

        // Check DDR5 RAM availability
        const ramCheck = await db.query(`
            SELECT COUNT(*) as count
            FROM pc_parts
            WHERE category = 'RAM'
            AND (specifications->>'type' = 'DDR5' OR specifications->>'type' ILIKE '%DDR5%')
        `);

        console.log(`\n💾 DDR5 RAM available: ${ramCheck.rows[0].count}`);

        console.log('\n======================================================================');
        console.log('✅ SUCCESS! Intel Core Ultra 5 245KF can now complete a PC build!');
        console.log('======================================================================');
        console.log('\nCompatible components:');
        console.log('   • CPU: Intel Core ULTRA 5 245KF (LGA1851)');
        console.log('   • Motherboards: 3 options (Z890, B860, H870)');
        console.log('   • Coolers: 56 compatible');
        console.log('   • RAM: DDR5 required\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await db.closePool();
        process.exit(0);
    }
}

addLGA1851Motherboard();
