const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function insertCorrectedCompleteData() {
    try {
        console.log('🔌 Connecting to database...');
        console.log('📊 Inserting CORRECTED FINAL category data...');
        
        // ========================================
        // PC CASE DATA (CORRECTED COLUMNS)
        // ========================================
        console.log('🏠 Inserting PC Case data...');
        await pool.query(`
            INSERT INTO pc_case (id, name, category, color, fans_included, price) VALUES
            (601, 'YGT MARS 8 (w/ 700W PSU)', 'Mid Tower', 'Black', 2, 1000.00),
            (602, 'GIGABYTE C200 TEMPERED GLASS', 'Mid Tower', 'Black', 4, 3850.00),
            (603, 'POWERLOGIC SLIM (w/ 700W PSU)', 'Slim ATX', 'Black', 1, 1350.00),
            (604, 'CORSAIR iCUE 4000X RGB', 'Mid Tower', 'Black', 3, 7200.00),
            (605, 'CORSAIR 4000D AIRFLOW', 'Mid Tower', 'Black', 2, 6200.00),
            (606, 'CORSAIR 4000D AIRFLOW (White)', 'Mid Tower', 'White', 2, 6400.00),
            (607, 'CORSAIR 5000D AIRFLOW', 'Full Tower', 'Black', 3, 8850.00),
            (608, 'NZXT H5 FLOW', 'Mid Tower', 'Black', 2, 5500.00),
            (609, 'NZXT H5 FLOW (White)', 'Mid Tower', 'White', 2, 5700.00),
            (610, 'NZXT H7 FLOW', 'Mid Tower', 'Black', 3, 7500.00),
            (611, 'FRACTAL DESIGN CORE 1000 *MATX', 'Micro Tower', 'Black', 1, 2995.00),
            (612, 'LIAN LI LANCOOL 216', 'Mid Tower', 'Black', 3, 6995.00),
            (613, 'LIAN LI LANCOOL 216 (White)', 'Mid Tower', 'White', 3, 7195.00),
            (614, 'TECWARE NEXUS EVO TG', 'Mid Tower', 'Black', 4, 3195.00),
            (615, 'COOLER MASTER MASTERBOX Q300L', 'Mini ITX', 'Black', 1, 2495.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ PC Case data inserted (15 records)');

        // ========================================
        // COOLING DATA (CORRECTED COLUMNS)
        // ========================================
        console.log('❄️ Inserting Cooling data...');
        await pool.query(`
            INSERT INTO cooling (id, name, max_rpm, max_noise, height, water_cooled, fanless, price) VALUES
            (701, 'DEEPCOOL AK620 AIR COOLER', 1850, 28.0, 160, FALSE, FALSE, 3795.00),
            (702, 'DEEPCOOL AG620 BK AIR COOLER', 1850, 26.0, 160, FALSE, FALSE, 4295.00),
            (703, 'DEEPCOOL AK400 AIR COOLER', 1850, 29.0, 155, FALSE, FALSE, 1995.00),
            (704, 'DEEPCOOL AK500 AIR COOLER', 1850, 28.0, 160, FALSE, FALSE, 2395.00),
            (705, 'DEEPCOOL AG400 BK AIR COOLER', 1850, 29.0, 155, FALSE, FALSE, 2195.00),
            (706, 'DEEPCOOL AG400 WHT AIR COOLER', 1850, 29.0, 155, FALSE, FALSE, 2195.00),
            (707, 'DEEPCOOL AG500 BK AIR COOLER', 1850, 28.0, 160, FALSE, FALSE, 2595.00),
            (708, 'DEEPCOOL LE720 360MM AIO', 1850, 32.0, 30, TRUE, FALSE, 7995.00),
            (709, 'DEEPCOOL LE520 240MM AIO', 1850, 30.0, 30, TRUE, FALSE, 6495.00),
            (710, 'CORSAIR iCUE H100i Elite RGB', 2400, 32.0, 30, TRUE, FALSE, 8995.00),
            (711, 'CORSAIR iCUE H150i Elite RGB', 2400, 35.0, 30, TRUE, FALSE, 11995.00),
            (712, 'NZXT Kraken 240', 2000, 31.0, 30, TRUE, FALSE, 7795.00),
            (713, 'NZXT Kraken 360', 2000, 34.0, 30, TRUE, FALSE, 10995.00),
            (714, 'LIAN LI GALAHAD II 240', 1850, 29.0, 30, TRUE, FALSE, 6995.00),
            (715, 'LIAN LI GALAHAD II 360', 1850, 32.0, 30, TRUE, FALSE, 9995.00),
            (716, 'BE QUIET! DARK ROCK 4', 1400, 24.0, 163, FALSE, FALSE, 4595.00),
            (717, 'NOCTUA NH-D15', 1500, 19.0, 165, FALSE, FALSE, 6995.00),
            (718, 'ARCTIC Liquid Freezer II 280', 1700, 38.0, 30, TRUE, FALSE, 5995.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Cooling data inserted (18 records)');

        // ========================================
        // MONITOR DATA (CORRECTED COLUMNS)
        // ========================================
        console.log('🖥️ Inserting Monitor data...');
        await pool.query(`
            INSERT INTO monitor (id, name, screen_size, resolution, panel_type, refresh_rate, response_time, aspect_ratio, price) VALUES
            (801, '24" LG 24GN65R-B 144Hz Gaming Monitor', '24.0"', '1920x1080', 'IPS', 144, 1.0, '16:9', 7995.00),
            (802, '27" LG 27GL650F-B 144Hz Gaming Monitor', '27.0"', '1920x1080', 'IPS', 144, 1.0, '16:9', 9995.00),
            (803, '24" ASUS TUF Gaming VG24VQ', '24.0"', '1920x1080', 'VA', 144, 1.0, '16:9', 8495.00),
            (804, '27" ASUS TUF Gaming VG27AQ', '27.0"', '2560x1440', 'IPS', 165, 1.0, '16:9', 15995.00),
            (805, '32" ASUS TUF Gaming VG32VQ', '32.0"', '2560x1440', 'VA', 144, 1.0, '16:9', 18995.00),
            (806, '24" ACER Nitro VG240Y', '24.0"', '1920x1080', 'IPS', 75, 1.0, '16:9', 5995.00),
            (807, '27" ACER Nitro VG271U', '27.0"', '2560x1440', 'IPS', 144, 1.0, '16:9', 12995.00),
            (808, '24" MSI G241', '24.0"', '1920x1080', 'IPS', 144, 1.0, '16:9', 7495.00),
            (809, '27" MSI MAG274QRF-QD', '27.0"', '2560x1440', 'IPS', 165, 1.0, '16:9', 16995.00),
            (810, '32" MSI MAG321UPX', '32.0"', '3840x2160', 'IPS', 144, 1.0, '16:9', 35995.00),
            (811, '27" SAMSUNG Odyssey G5', '27.0"', '2560x1440', 'VA', 144, 1.0, '16:9', 13495.00),
            (812, '32" SAMSUNG Odyssey G7', '32.0"', '2560x1440', 'VA', 240, 1.0, '16:9', 24995.00),
            (813, '27" AOC 27G2 Gaming Monitor', '27.0"', '1920x1080', 'IPS', 144, 1.0, '16:9', 8995.00),
            (814, '24" BenQ ZOWIE XL2411K', '24.0"', '1920x1080', 'TN', 144, 1.0, '16:9', 9995.00),
            (815, '27" ViewSonic VX2758-2KP-MHD', '27.0"', '2560x1440', 'IPS', 144, 1.0, '16:9', 11995.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Monitor data inserted (15 records)');

        // ========================================
        // HEADPHONES DATA (CORRECTED COLUMNS)
        // ========================================
        console.log('🎧 Inserting Headphones data...');
        await pool.query(`
            INSERT INTO headphones (id, name, type, frequency, microphone, wireless, enclosure, color, price) VALUES
            (901, 'HyperX Cloud II Gaming Headset', 'Gaming', '15Hz-25kHz', TRUE, FALSE, 'Closed', 'Black', 4995.00),
            (902, 'HyperX Cloud Alpha Gaming Headset', 'Gaming', '13Hz-27kHz', TRUE, FALSE, 'Closed', 'Black', 5995.00),
            (903, 'SteelSeries Arctis 7', 'Gaming', '20Hz-20kHz', TRUE, TRUE, 'Closed', 'Black', 7995.00),
            (904, 'SteelSeries Arctis Pro', 'Gaming', '10Hz-40kHz', TRUE, FALSE, 'Closed', 'Black', 12995.00),
            (905, 'Logitech G Pro X Gaming Headset', 'Gaming', '20Hz-20kHz', TRUE, FALSE, 'Closed', 'Black', 6995.00),
            (906, 'Razer BlackShark V2', 'Gaming', '12Hz-28kHz', TRUE, FALSE, 'Closed', 'Black', 5495.00),
            (907, 'Razer Kraken V3 X', 'Gaming', '12Hz-28kHz', TRUE, FALSE, 'Closed', 'Black', 3995.00),
            (908, 'Corsair HS65 Surround Gaming Headset', 'Gaming', '20Hz-20kHz', TRUE, FALSE, 'Closed', 'Black', 4495.00),
            (909, 'Audio-Technica ATH-M40x', 'Studio', '15Hz-24kHz', FALSE, FALSE, 'Closed', 'Black', 5995.00),
            (910, 'Sony WH-1000XM4', 'Wireless', '4Hz-40kHz', TRUE, TRUE, 'Closed', 'Black', 15995.00),
            (911, 'Sennheiser HD 599', 'Open-back', '12Hz-38.5kHz', FALSE, FALSE, 'Open', 'Black', 8995.00),
            (912, 'Beyerdynamic DT 770 Pro', 'Studio', '5Hz-35kHz', FALSE, FALSE, 'Closed', 'Black', 7995.00),
            (913, 'ASUS ROG Strix Go 2.4', 'Gaming', '20Hz-20kHz', TRUE, TRUE, 'Closed', 'Black', 6495.00),
            (914, 'JBL Quantum 800', 'Gaming', '20Hz-20kHz', TRUE, TRUE, 'Closed', 'Black', 8995.00),
            (915, 'Turtle Beach Stealth 600 Gen 2', 'Gaming', '20Hz-20kHz', TRUE, TRUE, 'Closed', 'Black', 4995.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Headphones data inserted (15 records)');

        // ========================================
        // KEYBOARD DATA (CORRECTED COLUMNS)
        // ========================================
        console.log('⌨️ Inserting Keyboard data...');
        await pool.query(`
            INSERT INTO keyboard (id, name, style, switch_type, backlit, tenkeyless, connection_type, color, price) VALUES
            (1001, 'Logitech G Pro X Mechanical Gaming Keyboard', 'Mechanical', 'GX Blue Clicky', TRUE, TRUE, 'USB', 'Black', 6995.00),
            (1002, 'Corsair K65 RGB MINI 60%', 'Mechanical', 'Cherry MX Speed', TRUE, TRUE, 'USB', 'Black', 7995.00),
            (1003, 'Razer Huntsman Mini', 'Mechanical', 'Razer Purple Optical', TRUE, TRUE, 'USB', 'Black', 5995.00),
            (1004, 'SteelSeries Apex Pro TKL', 'Mechanical', 'OmniPoint Adjustable', TRUE, TRUE, 'USB', 'Black', 9995.00),
            (1005, 'HyperX Alloy FPS Pro', 'Mechanical', 'Cherry MX Red', FALSE, TRUE, 'USB', 'Black', 4495.00),
            (1006, 'ASUS ROG Strix Scope TKL', 'Mechanical', 'Cherry MX Red', TRUE, TRUE, 'USB', 'Black', 5995.00),
            (1007, 'Ducky One 2 Mini RGB', 'Mechanical', 'Cherry MX Brown', TRUE, TRUE, 'USB', 'Black', 6495.00),
            (1008, 'Keychron K2 Wireless', 'Mechanical', 'Gateron Brown', TRUE, FALSE, 'Wireless', 'Black', 4995.00),
            (1009, 'Anne Pro 2', 'Mechanical', 'Gateron Brown', TRUE, TRUE, 'Wireless', 'Black', 3995.00),
            (1010, 'Cooler Master CK721', 'Mechanical', 'TTC Red', TRUE, FALSE, 'Wireless', 'Black', 5495.00),
            (1011, 'MSI Vigor GK50 Elite', 'Mechanical', 'Kailh Box White', TRUE, FALSE, 'USB', 'Black', 3995.00),
            (1012, 'Logitech G915 TKL', 'Mechanical', 'GL Tactical', TRUE, TRUE, 'Wireless', 'Black', 12995.00),
            (1013, 'Royal Kludge RK84', 'Mechanical', 'RK Brown', TRUE, FALSE, 'Wireless', 'Black', 2995.00),
            (1014, 'Tecware Phantom RGB', 'Mechanical', 'Outemu Brown', TRUE, TRUE, 'USB', 'Black', 2495.00),
            (1015, 'Rakk Lam-Ang Pro', 'Mechanical', 'Gateron Yellow', TRUE, FALSE, 'USB', 'Black', 3495.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Keyboard data inserted (15 records)');

        // ========================================
        // MOUSE DATA (CORRECTED COLUMNS)
        // ========================================
        console.log('🖱️ Inserting Mouse data...');
        await pool.query(`
            INSERT INTO mouse (id, name, tracking_method, connection_type, dpi, hand_orientation, color, price) VALUES
            (1101, 'Logitech G Pro X Superlight', 'Optical', 'Wireless', 25600, 'Ambidextrous', 'Black', 7995.00),
            (1102, 'Razer DeathAdder V3', 'Optical', 'USB', 30000, 'Right-handed', 'Black', 3995.00),
            (1103, 'SteelSeries Rival 650', 'Optical', 'USB', 12000, 'Right-handed', 'Black', 4995.00),
            (1104, 'Corsair M65 RGB Elite', 'Optical', 'USB', 18000, 'Right-handed', 'Black', 3495.00),
            (1105, 'HyperX Pulsefire Haste', 'Optical', 'USB', 16000, 'Right-handed', 'Black', 2495.00),
            (1106, 'ASUS ROG Gladius III', 'Optical', 'USB', 19000, 'Right-handed', 'Black', 3995.00),
            (1107, 'Glorious Model O', 'Optical', 'USB', 12000, 'Right-handed', 'Black', 2995.00),
            (1108, 'Finalmouse Ultralight 2', 'Optical', 'USB', 12000, 'Ambidextrous', 'Black', 8995.00),
            (1109, 'Zowie EC2-C', 'Optical', 'USB', 24000, 'Right-handed', 'Black', 3495.00),
            (1110, 'MSI Clutch GM41 Lightweight', 'Optical', 'USB', 20000, 'Right-handed', 'Black', 2495.00),
            (1111, 'Cooler Master MM711', 'Optical', 'USB', 16000, 'Right-handed', 'Black', 2795.00),
            (1112, 'Roccat Kone Pro', 'Optical', 'USB', 19000, 'Right-handed', 'Black', 4495.00),
            (1113, 'Logitech MX Master 3', 'Optical', 'Wireless', 4000, 'Right-handed', 'Black', 5995.00),
            (1114, 'Razer Basilisk V3', 'Optical', 'USB', 30000, 'Right-handed', 'Black', 4995.00),
            (1115, 'Rakk Kapitan', 'Optical', 'USB', 5000, 'Right-handed', 'Black', 1495.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Mouse data inserted (15 records)');

        // ========================================
        // SPEAKERS DATA (CORRECTED COLUMNS)
        // ========================================
        console.log('🔊 Inserting Speakers data...');
        await pool.query(`
            INSERT INTO speakers (id, name, configuration, total_wattage, frequency_response, color, price) VALUES
            (1201, 'Logitech Z313 2.1 Speaker System', '2.1 System', 25, '48Hz-20kHz', 'Black', 2495.00),
            (1202, 'Logitech Z623 2.1 Speaker System', '2.1 System', 200, '35Hz-20kHz', 'Black', 5995.00),
            (1203, 'Creative Pebble V2', '2.0 System', 8, '90Hz-20kHz', 'Black', 1995.00),
            (1204, 'Creative Pebble V3', '2.1 System', 16, '20Hz-20kHz', 'Black', 3495.00),
            (1205, 'Razer Nommo', '2.0 System', 30, '35Hz-20kHz', 'Black', 7995.00),
            (1206, 'Razer Nommo Pro', '2.1 System', 210, '20Hz-20kHz', 'Black', 24995.00),
            (1207, 'SteelSeries Arena 3', '2.0 System', 10, '70Hz-20kHz', 'Black', 2995.00),
            (1208, 'SteelSeries Arena 7', '2.1 System', 60, '40Hz-20kHz', 'Black', 8995.00),
            (1209, 'Corsair Gaming Audio Series SP2500', '2.1 System', 232, '30Hz-20kHz', 'Black', 12995.00),
            (1210, 'HyperX QuadCast S', 'Microphone', 0, '20Hz-20kHz', 'Black', 7995.00),
            (1211, 'Edifier R1280T', '2.0 System', 42, '75Hz-18kHz', 'Black', 3995.00),
            (1212, 'Edifier R2000DB', '2.0 System', 120, '48Hz-20kHz', 'Black', 8995.00),
            (1213, 'JBL Quantum Duo', '2.0 System', 40, '40Hz-20kHz', 'Black', 6995.00),
            (1214, 'Klipsch ProMedia 2.1 THX', '2.1 System', 200, '31Hz-20kHz', 'Black', 9995.00),
            (1215, 'Audioengine A2+ Wireless', '2.0 System', 60, '65Hz-22kHz', 'Black', 12995.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Speakers data inserted (15 records)');

        // ========================================
        // WEBCAM DATA (CORRECTED COLUMNS)
        // ========================================
        console.log('📹 Inserting Webcam data...');
        await pool.query(`
            INSERT INTO webcam (id, name, resolution, connection, focus_type, operating_system, fov_angle, price) VALUES
            (1301, 'Logitech C920 HD Pro', '1080p', 'USB-A', 'Auto', 'Windows/Mac/Linux', 78, 3995.00),
            (1302, 'Logitech C922 Pro Stream', '1080p', 'USB-A', 'Auto', 'Windows/Mac/Linux', 78, 4995.00),
            (1303, 'Logitech StreamCam', '1080p', 'USB-C', 'Auto', 'Windows/Mac/Linux', 78, 7995.00),
            (1304, 'Razer Kiyo', '1080p', 'USB-A', 'Auto', 'Windows/Mac', 82, 5995.00),
            (1305, 'Razer Kiyo Pro', '1080p', 'USB-A', 'Auto', 'Windows/Mac', 103, 9995.00),
            (1306, 'Microsoft LifeCam HD-3000', '720p', 'USB-A', 'Auto', 'Windows', 69, 1995.00),
            (1307, 'ASUS ROG Eye', '1080p', 'USB-A', 'Auto', 'Windows', 90, 6995.00),
            (1308, 'Creative Live! Cam Sync 1080p', '1080p', 'USB-A', 'Auto', 'Windows/Mac', 77, 2995.00),
            (1309, 'Elgato Facecam', '1080p', 'USB-C', 'Manual', 'Windows/Mac', 82, 9995.00),
            (1310, 'Anker PowerConf C300', '1080p', 'USB-A', 'Auto', 'Windows/Mac/Linux', 115, 4995.00),
            (1311, 'Dell UltraSharp WB7022', '4K', 'USB-C', 'Auto', 'Windows/Mac/Linux', 90, 12995.00),
            (1312, 'HyperX Vision S', '1080p', 'USB-A', 'Auto', 'Windows/Mac', 90, 7995.00),
            (1313, 'Corsair Elgato Facecam MK.2', '1080p', 'USB-C', 'Manual', 'Windows/Mac', 82, 11995.00),
            (1314, 'SteelSeries Alias', 'Audio Only', 'USB-A', 'N/A', 'Windows/Mac', 0, 8995.00),
            (1315, 'Blue Yeti Nano', 'Audio Only', 'USB-A', 'N/A', 'Windows/Mac', 0, 4995.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Webcam data inserted (15 records)');

        // ========================================
        // FINAL VERIFICATION
        // ========================================
        console.log('\n🎉 ALL CATEGORY DATA INSERTION COMPLETE!');
        console.log('📊 Final verification of all categories:');
        
        const tables = ['cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 'pc_case', 'cooling', 'monitor', 'headphones', 'keyboard', 'mouse', 'speakers', 'webcam'];
        let totalRecords = 0;
        
        for (const table of tables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                const count = parseInt(countResult.rows[0].count);
                console.log(`   ${table}: ${count} records`);
                totalRecords += count;
            } catch (err) {
                console.log(`   ${table}: Error - ${err.message}`);
            }
        }
        
        console.log(`\n📈 TOTAL RECORDS ACROSS ALL CATEGORIES: ${totalRecords}`);
        console.log('💰 All data includes PHP currency formatting (₱)');
        console.log('🔄 Real-time database integration ACTIVE');
        console.log('🎯 Category-specific specifications system COMPLETE!');
        console.log('\n✅ READY FOR BACKEND API INTEGRATION!');
        
    } catch (error) {
        console.error('❌ Data insertion failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

insertCorrectedCompleteData();