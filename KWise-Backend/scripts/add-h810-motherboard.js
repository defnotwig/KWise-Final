/**
 * Add H810 Motherboard with correct tier
 */
const db = require('../config/db');

async function addH810() {
    try {
        const result = await db.query(`
            INSERT INTO pc_parts (name, category, brand, price, specifications, image_url, stock, tier, is_active, kiosk_visible, performance_index, value_score, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `, [
            'Gigabyte H810M K',
            'Motherboard',
            'Gigabyte',
            7999.00,
            JSON.stringify({
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
            }),
            null,
            30, // stock
            'Entry', // tier
            true, // is_active
            true, // kiosk_visible
            60, // performance_index
            85, // value_score
            'Intel H810 chipset motherboard for Core Ultra 200 series (LGA1851). Budget-friendly DDR5 option.'
        ]);
        
        console.log('✅ Inserted Gigabyte H810M K with ID:', result.rows[0].id);
        
        // Verify all LGA1851 motherboards
        const verify = await db.query(`
            SELECT name, specifications->>'socket' as socket, specifications->>'chipset' as chipset, tier, price
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            AND specifications->>'socket' = 'LGA1851'
        `);
        
        console.log('\n=== All LGA1851 Motherboards ===');
        verify.rows.forEach(r => {
            console.log(`  ✅ ${r.name} (${r.chipset}) - ${r.tier} - ₱${r.price}`);
        });
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

addH810();
