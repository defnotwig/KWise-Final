const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function addMissingMotherboards() {
    console.log('🔍 CHECKING MISSING MOTHERBOARD ITEMS');
    console.log('====================================\n');
    
    try {
        // First, check current motherboard records in range 126-134
        console.log('📋 Current motherboard records (126-134):');
        const currentRecords = await pool.query('SELECT id, name FROM motherboard WHERE id BETWEEN 126 AND 134 ORDER BY id');
        
        if (currentRecords.rows.length === 0) {
            console.log('   No records found in range 126-134');
        } else {
            currentRecords.rows.forEach(row => {
                console.log(`   ID ${row.id}: ${row.name}`);
            });
        }
        
        // Check motherboard table structure
        console.log('\n📋 Motherboard table structure:');
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'motherboard' 
            ORDER BY ordinal_position
        `);
        
        structure.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
        // Define missing motherboard records
        const missingMotherboards = [
            {
                id: 126,
                name: 'ASUS PRIME A520M-K',
                socket: 'AM4',
                chipset: 'A520',
                memory_type: 'DDR4',
                max_ram: 128,
                ram_slots: 2,
                m2_slots: 1,
                ethernet_ports: 1,
                wireless_networking: false,
                integrated_gpu_support: true,
                price: 3599.00
            },
            {
                id: 127,
                name: 'MSI B450M PRO MAX II',
                socket: 'AM4',
                chipset: 'B450',
                memory_type: 'DDR4',
                max_ram: 128,
                ram_slots: 2,
                m2_slots: 1,
                ethernet_ports: 1,
                wireless_networking: false,
                integrated_gpu_support: true,
                price: 3799.00
            },
            {
                id: 128,
                name: 'GIGABYTE A520M DS3H',
                socket: 'AM4',
                chipset: 'A520',
                memory_type: 'DDR4',
                max_ram: 128,
                ram_slots: 2,
                m2_slots: 2,
                ethernet_ports: 1,
                wireless_networking: true,
                integrated_gpu_support: true,
                price: 3995.00
            },
            {
                id: 129,
                name: 'ASROCK B550M PRO SE *WHITE',
                socket: 'AM4',
                chipset: 'B550',
                memory_type: 'DDR4',
                max_ram: 128,
                ram_slots: 4,
                m2_slots: 2,
                ethernet_ports: 1,
                wireless_networking: false,
                integrated_gpu_support: true,
                price: 5895.00
            },
            {
                id: 130,
                name: 'GIGABYTE A520I AC *WIFI *Bluetooth *ITX',
                socket: 'AM4',
                chipset: 'A520',
                memory_type: 'DDR4',
                max_ram: 128,
                ram_slots: 2,
                m2_slots: 1,
                ethernet_ports: 1,
                wireless_networking: true,
                integrated_gpu_support: true,
                price: 6995.00
            },
            {
                id: 131,
                name: 'GIGABYTE GA-B650M-D3HP',
                socket: 'AM5',
                chipset: 'B650',
                memory_type: 'DDR5',
                max_ram: 128,
                ram_slots: 4,
                m2_slots: 2,
                ethernet_ports: 1,
                wireless_networking: true,
                integrated_gpu_support: true,
                price: 7695.00
            },
            {
                id: 132,
                name: 'AORUS B650M ELITE AX *WIFI *Bluetooth',
                socket: 'AM5',
                chipset: 'B650',
                memory_type: 'DDR5',
                max_ram: 128,
                ram_slots: 4,
                m2_slots: 2,
                ethernet_ports: 1,
                wireless_networking: true,
                integrated_gpu_support: true,
                price: 11295.00
            },
            {
                id: 133,
                name: 'AORUS B650M ELITE AX ICE *WIFI *Bluetooth *WHITE',
                socket: 'AM5',
                chipset: 'B650',
                memory_type: 'DDR5',
                max_ram: 128,
                ram_slots: 4,
                m2_slots: 2,
                ethernet_ports: 1,
                wireless_networking: true,
                integrated_gpu_support: true,
                price: 11495.00
            },
            {
                id: 134,
                name: 'GIGABYTE B650I-AX *WIFI *Bluetooth',
                socket: 'AM5',
                chipset: 'B650',
                memory_type: 'DDR5',
                max_ram: 128,
                ram_slots: 4,
                m2_slots: 2,
                ethernet_ports: 1,
                wireless_networking: true,
                integrated_gpu_support: true,
                price: 10495.00
            }
        ];
        
        console.log('\n📥 Adding missing motherboard records...');
        let addedCount = 0;
        
        for (const motherboard of missingMotherboards) {
            try {
                const insertQuery = `
                    INSERT INTO motherboard (
                        id, name, socket, chipset, memory_type, max_ram, ram_slots, 
                        m2_slots, ethernet_ports, wireless_networking, integrated_gpu_support, 
                        price, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
                    ) ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        socket = EXCLUDED.socket,
                        chipset = EXCLUDED.chipset,
                        memory_type = EXCLUDED.memory_type,
                        max_ram = EXCLUDED.max_ram,
                        ram_slots = EXCLUDED.ram_slots,
                        m2_slots = EXCLUDED.m2_slots,
                        ethernet_ports = EXCLUDED.ethernet_ports,
                        wireless_networking = EXCLUDED.wireless_networking,
                        integrated_gpu_support = EXCLUDED.integrated_gpu_support,
                        price = EXCLUDED.price,
                        updated_at = NOW()
                `;
                
                await pool.query(insertQuery, [
                    motherboard.id,
                    motherboard.name,
                    motherboard.socket,
                    motherboard.chipset,
                    motherboard.memory_type,
                    motherboard.max_ram,
                    motherboard.ram_slots,
                    motherboard.m2_slots,
                    motherboard.ethernet_ports,
                    motherboard.wireless_networking,
                    motherboard.integrated_gpu_support,
                    motherboard.price
                ]);
                
                console.log(`   ✅ Added ID ${motherboard.id}: ${motherboard.name}`);
                addedCount++;
                
            } catch (error) {
                console.log(`   ❌ Failed to add ID ${motherboard.id}: ${error.message}`);
            }
        }
        
        console.log(`\n🎉 Successfully added ${addedCount} motherboard records!`);
        
        // Verify the additions
        console.log('\n🔍 Verification - Updated motherboard records (126-134):');
        const updatedRecords = await pool.query('SELECT id, name, price FROM motherboard WHERE id BETWEEN 126 AND 134 ORDER BY id');
        
        updatedRecords.rows.forEach(row => {
            console.log(`   ID ${row.id}: ${row.name} - ₱${row.price}`);
        });
        
        // Check total motherboard count
        const totalCount = await pool.query('SELECT COUNT(*) FROM motherboard');
        console.log(`\n📊 Total motherboard records: ${totalCount.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

addMissingMotherboards();