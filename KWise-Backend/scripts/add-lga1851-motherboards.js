/**
 * Add LGA1851 Motherboard to Database
 * Intel Core Ultra 5 245KF requires Z890 or B860 chipset motherboard
 */

const db = require('../config/db');

async function addLGA1851Motherboard() {
    console.log('====================================');
    console.log('  Adding LGA1851 Motherboard');
    console.log('====================================\n');

    try {
        // First, let's check existing motherboard structure
        const sampleMB = await db.query(`
            SELECT id, name, category, price, specifications, image_url, brand
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            LIMIT 1
        `);
        
        if (sampleMB.rows.length > 0) {
            console.log('Sample existing motherboard structure:');
            console.log(JSON.stringify(sampleMB.rows[0], null, 2));
        }

        // Create LGA1851 motherboard - Z890 chipset for Intel Core Ultra 200 series
        const z890Motherboard = {
            name: 'ASUS ROG MAXIMUS Z890 HERO',
            category: 'Motherboard',
            brand: 'ASUS',
            price: 32999.00, // PHP price
            specifications: {
                socket: 'LGA1851',
                chipset: 'Z890',
                form_factor: 'ATX',
                memory_type: 'DDR5',
                memory_slots: 4,
                max_memory: '256GB',
                memory_speed: 'Up to 8600MHz',
                pcie_slots: '2x PCIe 5.0 x16, 1x PCIe 4.0 x16',
                m2_slots: 5,
                sata_ports: 4,
                usb_ports: '1x USB-C 40Gbps, 2x USB 3.2 Gen 2x2, 8x USB 3.2 Gen 2',
                network: '2.5G Ethernet + Wi-Fi 7',
                audio: 'ROG SupremeFX 7.1 Surround',
                features: ['DDR5 Support', 'PCIe 5.0', 'Thunderbolt 4', 'AI Overclocking', 'BIOS Flashback'],
                dimensions: '305mm x 244mm',
                rgb: true
            },
            image_url: 'https://example.com/z890-hero.jpg'
        };

        // Check if this motherboard already exists
        const existing = await db.query(`
            SELECT id FROM pc_parts 
            WHERE name = $1 AND category = 'Motherboard'
        `, [z890Motherboard.name]);

        if (existing.rows.length > 0) {
            console.log(`\n⚠️ Motherboard "${z890Motherboard.name}" already exists with ID: ${existing.rows[0].id}`);
            console.log('Updating socket to LGA1851...');
            
            await db.query(`
                UPDATE pc_parts 
                SET specifications = jsonb_set(specifications, '{socket}', '"LGA1851"'::jsonb)
                WHERE id = $1
            `, [existing.rows[0].id]);
            
            console.log('✅ Updated successfully');
        } else {
            console.log(`\nInserting new motherboard: ${z890Motherboard.name}`);
            
            const result = await db.query(`
                INSERT INTO pc_parts (name, category, brand, price, specifications, image_url, stock, tier, is_active, kiosk_visible, performance_index, value_score, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `, [
                z890Motherboard.name,
                z890Motherboard.category,
                z890Motherboard.brand,
                z890Motherboard.price,
                JSON.stringify(z890Motherboard.specifications),
                z890Motherboard.image_url,
                20, // stock
                'High Tier', // tier
                true, // is_active
                true, // kiosk_visible
                90, // performance_index
                85, // value_score
                'Intel Z890 chipset motherboard for Core Ultra 200 series (LGA1851). Features DDR5, PCIe 5.0, and AI overclocking.'
            ]);
            
            console.log(`✅ Inserted with ID: ${result.rows[0].id}`);
        }

        // Also add a mid-range B860 option
        const b860Motherboard = {
            name: 'MSI MAG B860 TOMAHAWK WIFI',
            category: 'Motherboard',
            brand: 'MSI',
            price: 14999.00,
            specifications: {
                socket: 'LGA1851',
                chipset: 'B860',
                form_factor: 'ATX',
                memory_type: 'DDR5',
                memory_slots: 4,
                max_memory: '192GB',
                memory_speed: 'Up to 7800MHz',
                pcie_slots: '1x PCIe 5.0 x16, 1x PCIe 4.0 x16',
                m2_slots: 3,
                sata_ports: 4,
                usb_ports: '1x USB-C 3.2 Gen 2x2, 6x USB 3.2 Gen 2, 4x USB 2.0',
                network: '2.5G Ethernet + Wi-Fi 6E',
                audio: 'Realtek ALC897',
                features: ['DDR5 Support', 'PCIe 5.0', 'BIOS Flashback'],
                dimensions: '305mm x 244mm',
                rgb: true
            },
            image_url: 'https://example.com/b860-tomahawk.jpg'
        };

        const existingB860 = await db.query(`
            SELECT id FROM pc_parts 
            WHERE name = $1 AND category = 'Motherboard'
        `, [b860Motherboard.name]);

        if (existingB860.rows.length > 0) {
            console.log(`\n⚠️ Motherboard "${b860Motherboard.name}" already exists`);
        } else {
            console.log(`\nInserting new motherboard: ${b860Motherboard.name}`);
            
            const result = await db.query(`
                INSERT INTO pc_parts (name, category, brand, price, specifications, image_url, stock, tier, is_active, kiosk_visible, performance_index, value_score, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `, [
                b860Motherboard.name,
                b860Motherboard.category,
                b860Motherboard.brand,
                b860Motherboard.price,
                JSON.stringify(b860Motherboard.specifications),
                b860Motherboard.image_url,
                25, // stock
                'Mid Tier', // tier
                true, // is_active
                true, // kiosk_visible
                75, // performance_index
                80, // value_score
                'Intel B860 chipset motherboard for Core Ultra 200 series (LGA1851). Features DDR5 and Wi-Fi 6E.'
            ]);
            
            console.log(`✅ Inserted with ID: ${result.rows[0].id}`);
        }

        // Also add a budget H810 option
        const h810Motherboard = {
            name: 'Gigabyte H810M K',
            category: 'Motherboard',
            brand: 'Gigabyte',
            price: 7999.00,
            specifications: {
                socket: 'LGA1851',
                chipset: 'H810',
                form_factor: 'Micro-ATX',
                memory_type: 'DDR5',
                memory_slots: 2,
                max_memory: '96GB',
                memory_speed: 'Up to 5600MHz',
                pcie_slots: '1x PCIe 4.0 x16',
                m2_slots: 1,
                sata_ports: 4,
                usb_ports: '4x USB 3.2 Gen 1, 4x USB 2.0',
                network: '1G Ethernet',
                audio: 'Realtek ALC897',
                features: ['DDR5 Support'],
                dimensions: '244mm x 201mm',
                rgb: false
            },
            image_url: 'https://example.com/h810m-k.jpg'
        };

        const existingH810 = await db.query(`
            SELECT id FROM pc_parts 
            WHERE name = $1 AND category = 'Motherboard'
        `, [h810Motherboard.name]);

        if (existingH810.rows.length > 0) {
            console.log(`\n⚠️ Motherboard "${h810Motherboard.name}" already exists`);
        } else {
            console.log(`\nInserting new motherboard: ${h810Motherboard.name}`);
            
            const result = await db.query(`
                INSERT INTO pc_parts (name, category, brand, price, specifications, image_url, stock, tier, is_active, kiosk_visible, performance_index, value_score, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `, [
                h810Motherboard.name,
                h810Motherboard.category,
                h810Motherboard.brand,
                h810Motherboard.price,
                JSON.stringify(h810Motherboard.specifications),
                h810Motherboard.image_url,
                30, // stock
                'Budget Tier', // tier
                true, // is_active
                true, // kiosk_visible
                60, // performance_index
                85, // value_score
                'Intel H810 chipset motherboard for Core Ultra 200 series (LGA1851). Budget-friendly DDR5 option.'
            ]);
            
            console.log(`✅ Inserted with ID: ${result.rows[0].id}`);
        }

        // Verify LGA1851 motherboards now exist
        const verifyLGA1851 = await db.query(`
            SELECT name, specifications->>'socket' as socket, specifications->>'chipset' as chipset
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            AND specifications->>'socket' = 'LGA1851'
        `);

        console.log('\n====================================');
        console.log('  VERIFICATION');
        console.log('====================================');
        console.log(`\nLGA1851 Motherboards in database: ${verifyLGA1851.rows.length}`);
        verifyLGA1851.rows.forEach(r => {
            console.log(`  ✅ ${r.name} (${r.chipset})`);
        });

        console.log('\n✅ LGA1851 motherboard setup complete!');
        console.log('\nNow Intel Core ULTRA 5 245KF can build a complete PC.\n');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

addLGA1851Motherboard();
