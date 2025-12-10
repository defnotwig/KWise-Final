const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function createCategoryTables() {
    try {
        console.log('🔌 Connecting to database...');
        
        // CPU Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cpu (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                launched DATE,
                socket VARCHAR(50),
                series VARCHAR(50),
                base_clock DECIMAL(5,2),
                turbo_clock DECIMAL(5,2),
                cores INT,
                threads INT,
                integrated_gpu BOOLEAN,
                max_ram INT,
                lithography INT,
                tdp INT,
                max_supported_ram INT,
                multithreading_supported BOOLEAN,
                overall_score DECIMAL(5,2),
                benchmark_score DECIMAL(10,2),
                single_thread_score DECIMAL(10,2),
                multi_thread_score DECIMAL(10,2), 
                fps_ultra DECIMAL(5,2),
                fps_high DECIMAL(5,2),
                fps_medium DECIMAL(5,2),
                fps_low DECIMAL(5,2),
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ CPU table created');

        // Motherboard Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS motherboard (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                socket VARCHAR(50),
                chipset VARCHAR(50),
                memory_type VARCHAR(50),
                max_ram INT,
                ram_slots INT,
                m2_slots INT,
                ethernet_ports INT,
                wireless_networking BOOLEAN,
                integrated_gpu_support BOOLEAN,
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Motherboard table created');

        // RAM Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ram (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                memory_type VARCHAR(50),
                configuration VARCHAR(50),
                speed INT,
                voltage DECIMAL(5,2),
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ RAM table created');

        // Storage Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS storage (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                capacity VARCHAR(50),
                storage_type VARCHAR(50),
                interface VARCHAR(50),
                nvme_support BOOLEAN,
                cache VARCHAR(50),
                m2_type VARCHAR(50),
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Storage table created');

        // GPU Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS gpu (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                launched DATE,
                memory_type VARCHAR(50),
                memory_capacity INT,
                core_clock DECIMAL(7,2),
                boost_clock DECIMAL(7,2),
                effective_clock DECIMAL(7,2),
                interface VARCHAR(50),
                frame_sync VARCHAR(50),    
                length INT,
                tdp INT,
                pcie_8pin INT,
                ports_display INT,
                ports_hdmi INT,
                fans VARCHAR(20),             
                overall_score DECIMAL(7,2),
                benchmark_score DECIMAL(10,2),
                two_d_benchmark DECIMAL(10,2),
                fps_ultra DECIMAL(7,2),
                fps_high DECIMAL(7,2),
                fps_medium DECIMAL(7,2),
                fps_low DECIMAL(7,2),
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ GPU table created');

        // PSU Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS psu (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                form_factor VARCHAR(50),
                efficiency_rating VARCHAR(50),
                wattage INT,
                length INT,
                modular BOOLEAN,
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ PSU table created');

        // PC Case Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pc_case (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50),
                color VARCHAR(50),
                fans_included INT,
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ PC Case table created');

        // Cooling Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cooling (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                max_rpm INT,
                max_noise DECIMAL(5,2),
                height INT,
                water_cooled BOOLEAN,
                fanless BOOLEAN,
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Cooling table created');

        // Monitor Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS monitor (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                screen_size VARCHAR(50),
                resolution VARCHAR(50),
                refresh_rate INT,
                response_time DECIMAL(5,2),
                panel_type VARCHAR(50),
                aspect_ratio VARCHAR(50),
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Monitor table created');

        // Headphones Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS headphones (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(50),
                frequency VARCHAR(50),
                microphone BOOLEAN,
                wireless BOOLEAN,
                enclosure VARCHAR(50),
                color VARCHAR(50),
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Headphones table created');

        // Keyboard Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS keyboard (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                style VARCHAR(50),
                switch_type VARCHAR(50),
                backlit BOOLEAN,
                tenkeyless BOOLEAN,
                connection_type VARCHAR(50),
                color VARCHAR(50),
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Keyboard table created');

        // Mouse Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mouse (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                tracking_method VARCHAR(50),
                connection_type VARCHAR(50),
                dpi INT,
                hand_orientation VARCHAR(50),
                color VARCHAR(50),
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Mouse table created');

        // Speakers Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS speakers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                configuration VARCHAR(50),
                total_wattage INT,
                frequency_response VARCHAR(50),
                color VARCHAR(50),
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Speakers table created');

        // Webcam Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS webcam (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                resolution VARCHAR(50),
                connection VARCHAR(50),
                focus_type VARCHAR(50),
                operating_system VARCHAR(50),
                fov_angle INT,
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Webcam table created');

        console.log('🎉 All category tables created successfully!');
        
        // Verify tables were created
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 
                'pc_case', 'cooling', 'monitor', 'headphones', 'keyboard', 
                'mouse', 'speakers', 'webcam'
            )
            ORDER BY table_name;
        `);
        
        console.log('🗃️  Created tables:', tableCheck.rows.map(row => row.table_name));
        
    } catch (error) {
        console.error('❌ Table creation failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

createCategoryTables();