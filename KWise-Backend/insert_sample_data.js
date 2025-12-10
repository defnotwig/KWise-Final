const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function insertSampleData() {
    try {
        console.log('🔌 Connecting to database...');
        
        // Insert CPU Sample Data
        await pool.query(`
            INSERT INTO cpu (
                id, name, launched, socket, series, base_clock, turbo_clock, cores, threads, 
                integrated_gpu, max_ram, lithography, tdp, max_supported_ram, 
                multithreading_supported, overall_score, benchmark_score, 
                single_thread_score, multi_thread_score, fps_ultra, fps_high, 
                fps_medium, fps_low, price
            ) VALUES 
            (11, 'AMD RYZEN 5 8400F', '2024-02-10', 'AM5', 'Ryzen 5', 3.7, 4.8, 6, 12, 
             FALSE, 128, 5, 65, 128, TRUE, 115.2, 11800, 2900, 10200, 130.4, 160.5, 
             190.6, 225.7, 8495.00),
            (12, 'AMD RYZEN 5 7600', '2023-01-15', 'AM5', 'Ryzen 5', 3.8, 5.1, 6, 12, 
             TRUE, 128, 5, 65, 128, TRUE, 118.6, 12100, 3000, 10500, 135.2, 165.8, 
             195.3, 230.4, 10495.00),
            (13, 'Intel Core i5 12400F', '2022-01-04', 'LGA1700', 'Core i5', 2.5, 4.4, 6, 12, 
             FALSE, 128, 10, 65, 128, TRUE, 95.3, 9800, 2300, 8500, 105.2, 125.8, 
             155.3, 185.7, 7480.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ CPU sample data inserted');

        // Insert Motherboard Sample Data
        await pool.query(`
            INSERT INTO motherboard (
                id, name, socket, chipset, memory_type, max_ram, ram_slots, m2_slots, 
                ethernet_ports, wireless_networking, integrated_gpu_support, price
            ) VALUES 
            (101,'RAMSTA B450M-P', 'AM4', 'B450', 'DDR4', 128, 2, 1, 1, FALSE, TRUE, 2999.00),
            (102,'GIGABYTE A520M-K V2', 'AM4', 'A520', 'DDR4', 128, 2, 1, 1, FALSE, TRUE, 3499.00),
            (103,'ASROCK A620M-HDV/M.2', 'AM5', 'A620', 'DDR5', 128, 2, 2, 1, FALSE, TRUE, 5995.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Motherboard sample data inserted');

        // Insert RAM Sample Data  
        await pool.query(`
            INSERT INTO ram (id, name, memory_type, configuration, speed, voltage, price) VALUES
            (201, '8GB Team Elite Plus DDR4 3200Mhz', 'DDR4', '1x8GB', 3200, 1.20, 1199.00),
            (202, '16GB Team Elite Plus DDR4 3200Mhz', 'DDR4', '1x16GB', 3200, 1.20, 2199.00),
            (203, '16GB Kingston Fury Beast', 'DDR4', '1x16GB', 3200, 1.35, 2399.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ RAM sample data inserted');

        // Insert GPU Sample Data
        await pool.query(`
            INSERT INTO gpu (
                id, name, launched, memory_type, memory_capacity, core_clock, boost_clock, 
                effective_clock, interface, frame_sync, length, tdp, pcie_8pin, ports_display, 
                ports_hdmi, fans, overall_score, benchmark_score, two_d_benchmark, 
                fps_ultra, fps_high, fps_medium, fps_low, price
            ) VALUES
            (401, '4GB RX550 RAMSTA *SINGLE FAN', '2017-04-20', 'GDDR5', 4, 1100.00, 1183.00, 7000.00, 'PCIe 3.0', 'FreeSync', 170, 50, 0, 1, 1, 'Single Fan', 45.5, 2000.00, 950.00, 30.5, 40.8, 55.2, 70.6, 4995.00),
            (402, 'RX6600 GIGABYTE EAGLE', '2021-10-13', 'GDDR6', 8, 2044.00, 2491.00, 14000.00, 'PCIe 4.0', 'FreeSync', 282, 132, 1, 3, 1, 'Tri Fan', 68.0, 5700.00, 2100.00, 75.6, 95.2, 115.3, 130.9, 13995.00),
            (403, 'RTX4060 GIGABYTE EAGLE', '2023-06-29', 'GDDR6', 8, 1830.00, 2460.00, 17000.00, 'PCIe 4.0', 'G-Sync', 280, 115, 1, 3, 1, 'Tri Fan', 75.5, 6200.00, 2200.00, 95.6, 120.2, 140.3, 160.7, 19995.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ GPU sample data inserted');

        // Insert Storage Sample Data
        await pool.query(`
            INSERT INTO storage (id, name, capacity, storage_type, interface, nvme_support, cache, m2_type, price) VALUES
            (301, '256GB T-FORCE VULCAN Z', '256GB', 'SSD', 'SATA', FALSE, 'Unknown', NULL, 1499.00),
            (302, '500GB WESTERN DIGITAL GREEN', '500GB', 'NVMe SSD', 'PCIe Gen3', TRUE, 'Unknown', 'M.2 2280', 2695.00),
            (303, '1TB WESTERN DIGITAL BLUE', '1TB', 'NVMe SSD', 'PCIe Gen4', TRUE, 'Unknown', 'M.2 2280', 4799.00)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Storage sample data inserted');

        // Check data counts
        const tables = ['cpu', 'motherboard', 'ram', 'storage', 'gpu'];
        
        for (const table of tables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`📈 ${table}: ${countResult.rows[0].count} records`);
            } catch (err) {
                console.log(`⚠️  ${table}: Error - ${err.message}`);
            }
        }

        console.log('🎉 Sample data insertion completed successfully!');
        
    } catch (error) {
        console.error('❌ Sample data insertion failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

insertSampleData();