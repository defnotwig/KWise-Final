const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function runMigrationInChunks() {
    try {
        console.log('🔌 Connecting to database...');
        
        // First, let's insert some essential CPU data
        await pool.query(`
            INSERT INTO cpu (
                name, socket, series, base_clock, turbo_clock, cores, threads, 
                integrated_gpu, tdp, price
            ) VALUES 
            ('AMD RYZEN 5 8400F', 'AM5', 'Ryzen 5', 3.7, 4.8, 6, 12, FALSE, 65, 8495.00),
            ('AMD RYZEN 5 7600', 'AM5', 'Ryzen 5', 3.8, 5.1, 6, 12, TRUE, 65, 10495.00),
            ('Intel Core i5 12400F', 'LGA1700', 'Core i5', 2.5, 4.4, 6, 12, FALSE, 65, 7480.00),
            ('AMD RYZEN 7 8700F', 'AM5', 'Ryzen 7', 3.6, 5.0, 8, 16, FALSE, 65, 11495.00),
            ('Intel Core i7 14700F', 'LGA1700', 'Core i7', 2.2, 5.3, 12, 20, FALSE, 65, 19495.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ CPU data inserted');

        // Insert Motherboard data
        await pool.query(`
            INSERT INTO motherboard (
                name, socket, chipset, memory_type, max_ram, ram_slots, m2_slots, 
                ethernet_ports, wireless_networking, integrated_gpu_support, price
            ) VALUES 
            ('RAMSTA B450M-P', 'AM4', 'B450', 'DDR4', 128, 2, 1, 1, FALSE, TRUE, 2999.00),
            ('GIGABYTE A520M-K V2', 'AM4', 'A520', 'DDR4', 128, 2, 1, 1, FALSE, TRUE, 3499.00),
            ('GIGABYTE B450M-K', 'AM4', 'B450', 'DDR4', 128, 2, 1, 1, FALSE, TRUE, 3899.00),
            ('ASROCK A620M-HDV/M.2', 'AM5', 'A620', 'DDR5', 128, 2, 2, 1, FALSE, TRUE, 5995.00),
            ('GIGABYTE B650M GAMING', 'AM5', 'B650', 'DDR5', 128, 4, 2, 1, TRUE, TRUE, 7199.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Motherboard data inserted');

        // Insert RAM data  
        await pool.query(`
            INSERT INTO ram (name, memory_type, configuration, speed, voltage, price) VALUES
            ('8GB Team Elite Plus DDR4 3200Mhz', 'DDR4', '1x8GB', 3200, 1.20, 1199.00),
            ('16GB Team Elite Plus DDR4 3200Mhz', 'DDR4', '1x16GB', 3200, 1.20, 2199.00),
            ('16GB Kingston Fury Beast', 'DDR4', '1x16GB', 3200, 1.35, 2399.00),
            ('16GB T-Force DarkZa Kit (2x8GB) 3600MHz', 'DDR4', '2x8GB', 3600, 1.35, 2499.00),
            ('32GB T-Force DarkZa Kit', 'DDR4', '2x16GB', 3600, 1.35, 3900.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ RAM data inserted');

        // Insert Storage data
        await pool.query(`
            INSERT INTO storage (name, capacity, storage_type, interface, nvme_support, m2_type, price) VALUES
            ('256GB T-FORCE VULCAN Z', '256GB', 'SSD', 'SATA', FALSE, NULL, 1499.00),
            ('512GB T-FORCE VULCAN Z', '512GB', 'SSD', 'SATA', FALSE, NULL, 2499.00),
            ('500GB WESTERN DIGITAL GREEN', '500GB', 'NVMe SSD', 'PCIe Gen3', TRUE, 'M.2 2280', 2695.00),
            ('1TB WESTERN DIGITAL BLUE', '1TB', 'NVMe SSD', 'PCIe Gen4', TRUE, 'M.2 2280', 4799.00),
            ('500GB SAMSUNG 980 NVME', '500GB', 'NVMe SSD', 'PCIe Gen3', TRUE, 'M.2 2280', 3795.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Storage data inserted');

        // Insert GPU data
        await pool.query(`
            INSERT INTO gpu (
                name, memory_type, memory_capacity, interface, frame_sync, 
                fans, price
            ) VALUES
            ('4GB RX550 RAMSTA *SINGLE FAN', 'GDDR5', 4, 'PCIe 3.0', 'FreeSync', 'Single Fan', 4995.00),
            ('8GB RX580 XFX GTS XXX Edition *(DUALFAN)', 'GDDR5', 8, 'PCIe 3.0', 'FreeSync', 'Dual Fan', 6995.00),
            ('RX6600 GIGABYTE EAGLE', 'GDDR6', 8, 'PCIe 4.0', 'FreeSync', 'Tri Fan', 13995.00),
            ('RTX4060 GIGABYTE EAGLE', 'GDDR6', 8, 'PCIe 4.0', 'G-Sync', 'Tri Fan', 19995.00),
            ('RX7700XT GIGABYTE GAMING OC', 'GDDR6', 12, 'PCIe 4.0', 'FreeSync', 'Tri Fan', 27995.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ GPU data inserted');

        // Insert PSU data
        await pool.query(`
            INSERT INTO psu (name, form_factor, efficiency_rating, wattage, modular, price)
            VALUES
            ('550w CORSAIR CX550 80+ Bronze', 'ATX', '80+ Bronze', 550, FALSE, 2995.00),
            ('650w CORSAIR CX650 80+ Bronze', 'ATX', '80+ Bronze', 650, FALSE, 3485.00),
            ('750w CORSAIR CX750 80+ Bronze', 'ATX', '80+ Bronze', 750, FALSE, 3985.00),
            ('850w CORSAIR RM850e 80+ GOLD FM', 'ATX', '80+ Gold', 850, TRUE, 8195.00),
            ('FSP Hydro M PRO 600W', 'ATX', '80+ Bronze', 600, TRUE, 3750.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ PSU data inserted');

        // Insert PC Case data
        await pool.query(`
            INSERT INTO pc_case (name, category, color, fans_included, price)
            VALUES
            ('YGT MARS 8', 'Basic/Office', 'Black', 2, 1000.00),
            ('POWERLOGIC SLIM', 'Basic/Office', 'Black', 1, 1350.00),
            ('KEYTECH ROBIN LITE', 'Tempered Glass', 'Black or White', 2, 1480.00),
            ('INPLAY OPENVIEW V100', 'Tempered Glass', 'Black or White', 2, 1499.00),
            ('KEYTECH ROBIN CUBE', 'Dual Chamber', 'Black or White', 3, 1850.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ PC Case data inserted');

        // Insert Cooling data
        await pool.query(`
            INSERT INTO cooling (name, max_rpm, max_noise, water_cooled, fanless, price)
            VALUES
            ('Single Color Fans RGB', 1200, 25.00, FALSE, FALSE, 150.00),
            ('DEEPCOOL XFAN 120M BLACK', 1300, 21.00, FALSE, FALSE, 220.00),
            ('DEEPCOOL AK400 BLACK', 1850, 27.00, FALSE, FALSE, 1499.00),
            ('DEEPCOOL LE520 AIO 240 BLACK', 2550, 31.00, TRUE, FALSE, 3799.00),
            ('DEEPCOOL MYSTIQUE AIO 360 BLACK', 2700, 34.00, TRUE, FALSE, 8995.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Cooling data inserted');

        // Insert Monitor data
        await pool.query(`
            INSERT INTO monitor (name, screen_size, resolution, refresh_rate, response_time, panel_type, aspect_ratio, price)
            VALUES
            ('NVISION LED MONITOR', '20"', 'LED', 60, 5.00, 'LED', '16:9', 2498.00),
            ('NVISION IPS FRAMELESS MONITOR Black', '22"', 'IPS', 100, 4.00, 'IPS', '16:9', 3698.00),
            ('HKC IPS FRAMELESS MONITOR', '24"', 'IPS', 100, 4.00, 'IPS', '16:9', 4598.00),
            ('HKC IPS FRAMELESS MONITOR', '27"', 'IPS', 100, 4.00, 'IPS', '16:9', 5998.00),
            ('VIEWSONIC IPS FRAMELESS MONITOR', '24"', 'IPS', 240, 1.00, 'IPS', '16:9', 7998.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Monitor data inserted');

        // Insert Headphones data
        await pool.query(`
            INSERT INTO headphones (name, type, frequency, microphone, wireless, enclosure, color, price)
            VALUES
            ('HyperX Cloud II', 'Wired', '15Hz - 25kHz', TRUE, FALSE, 'Over-ear', 'Red', 8250.00),
            ('SteelSeries Arctis 7', 'Wireless', '20Hz - 20kHz', TRUE, TRUE, 'Over-ear', 'Black', 9900.00),
            ('Logitech G Pro X', 'Wired', '20Hz - 20kHz', TRUE, FALSE, 'Over-ear', 'Blue', 7150.00),
            ('REDRAGON HYLAS BLACK GAMING HEADSET', 'Wired', '20Hz - 20kHz', TRUE, FALSE, 'Over-ear', 'Black', 850.00),
            ('REDRAGON IRE PRO WIRELESS GAMING HEADSET', 'Wireless', '20Hz - 20kHz', TRUE, TRUE, 'Over-ear', 'Black', 2000.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Headphones data inserted');

        // Insert Keyboard data
        await pool.query(`
            INSERT INTO keyboard (name, style, switch_type, backlit, tenkeyless, connection_type, color, price)
            VALUES
            ('A4TECH KEYBOARD P500', 'Membrane', 'N/A', FALSE, FALSE, 'Wired', 'Black', 550.00),
            ('NEXION KL-100W MECHANICAL BLUE SWITCH', 'Mechanical', 'Blue', TRUE, FALSE, 'Wireless', 'Black', 1000.00),
            ('REDRAGON LAKSHMI MECHANICAL RED SWITCH', 'Mechanical', 'Red', TRUE, FALSE, 'Wired', 'Black', 1250.00),
            ('REDRAGON K617 FIZZ MECHANICAL RED SWITCH', 'Mechanical', 'Red', TRUE, FALSE, 'Wired', 'RGB', 1400.00),
            ('ASUS TUF K3 MECHANICAL BLUE SWITCH', 'Mechanical', 'Blue', TRUE, FALSE, 'Wired', 'RGB', 3000.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Keyboard data inserted');

        // Insert Mouse data
        await pool.query(`
            INSERT INTO mouse (name, tracking_method, connection_type, dpi, hand_orientation, color, price)
            VALUES
            ('A4TECH USB MOUSE', 'Optical', 'USB', 1200, 'Right', 'Black', 220.00),
            ('REDRAGON PHASER USB GAMING MOUSE', 'Optical', 'USB', 3200, 'Right', 'Black', 550.00),
            ('REDRAGON BOMBER USB GAMING MOUSE', 'Optical', 'USB', 4000, 'Right', 'Black', 750.00),
            ('REDRAGON COBRA BLACK USB GAMING MOUSE', 'Optical', 'USB', 3200, 'Right', 'Black', 900.00),
            ('REDRAGON TRIDENT WIRELESS GAMING MOUSE', 'Optical', 'Wireless', 16000, 'Right', 'Black', 1300.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Mouse data inserted');

        // Insert Speakers data
        await pool.query(`
            INSERT INTO speakers (name, configuration, total_wattage, frequency_response, color, price)
            VALUES
            ('NEXION GS356 GAMING SPEAKERS', 'Stereo', 10, '20Hz - 20kHz', 'Black', 250.00),
            ('REDRAGON SPEAKERS CALLIOPE', 'Stereo', 20, '20Hz - 20kHz', 'Black', 750.00),
            ('REDRAGON GAMING SPEAKERS ORPHEUS', 'Stereo', 20, '20Hz - 20kHz', 'Black', 750.00),
            ('REDRAGON STEREO SOUNDBAR DARKNETS', 'Soundbar', 40, '20Hz - 20kHz', 'Black', 1300.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Speakers data inserted');

        // Insert Webcam data
        await pool.query(`
            INSERT INTO webcam (name, resolution, connection, focus_type, operating_system, fov_angle, price)
            VALUES
            ('Logitech C270 HD Webcam', '720p', 'USB', 'Fixed', 'Windows, macOS, Chrome OS', 60, 999.00),
            ('Razer Kiyo Streaming Webcam', '1080p', 'USB', 'Auto', 'Windows, macOS', 81.6, 4180.00),
            ('ASUS Webcam C3', '1080p', 'USB', 'Auto', 'Windows, macOS', 90, 2350.00),
            ('Logitech Brio 4K Webcam', '4K', 'USB', 'Auto', 'Windows, macOS', 90, 6995.00),
            ('Redragon Hitman USB Streaming Webcam (GW800-1)', '1080p', 'USB', 'Auto', 'Windows, macOS', 90, 1595.00)
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Webcam data inserted');

        // Check data counts
        const tables = ['cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 'pc_case', 'cooling', 'monitor', 'headphones', 'keyboard', 'mouse', 'speakers', 'webcam'];
        
        console.log('\n📊 Data Summary:');
        for (const table of tables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`📈 ${table}: ${countResult.rows[0].count} records`);
            } catch (err) {
                console.log(`⚠️  ${table}: Error - ${err.message}`);
            }
        }

        console.log('\n🎉 All sample data inserted successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

runMigrationInChunks();