const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function recreateTablesWithProperStructure() {
    try {
        console.log('🔌 Connecting to database...');
        
        // Drop existing tables to recreate with proper structure
        console.log('🗑️ Dropping existing category tables...');
        const tables = ['cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 'pc_case', 'cooling', 'monitor', 'headphones', 'keyboard', 'mouse', 'speakers', 'webcam'];
        
        for (const table of tables) {
            try {
                await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
                console.log(`   Dropped ${table}`);
            } catch (err) {
                console.log(`   ${table} didn't exist or error: ${err.message}`);
            }
        }
        
        console.log('🏗️ Creating tables with complete structure...');
        
        // Recreate CPU table with ALL columns
        await pool.query(`
            CREATE TABLE cpu (
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

        // Recreate Motherboard table
        await pool.query(`
            CREATE TABLE motherboard (
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
            CREATE TABLE ram (
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
            CREATE TABLE storage (
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
            CREATE TABLE gpu (
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

        // Continue with other tables...
        const otherTablesSQL = [
            {
                name: 'psu',
                sql: `
                    CREATE TABLE psu (
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
                `
            },
            {
                name: 'pc_case',
                sql: `
                    CREATE TABLE pc_case (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        category VARCHAR(50),
                        color VARCHAR(50),
                        fans_included INT,
                        price DECIMAL(10,2),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `
            },
            {
                name: 'cooling',
                sql: `
                    CREATE TABLE cooling (
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
                `
            },
            {
                name: 'monitor',
                sql: `
                    CREATE TABLE monitor (
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
                `
            },
            {
                name: 'headphones',
                sql: `
                    CREATE TABLE headphones (
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
                `
            },
            {
                name: 'keyboard',
                sql: `
                    CREATE TABLE keyboard (
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
                `
            },
            {
                name: 'mouse',
                sql: `
                    CREATE TABLE mouse (
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
                `
            },
            {
                name: 'speakers',
                sql: `
                    CREATE TABLE speakers (
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
                `
            },
            {
                name: 'webcam',
                sql: `
                    CREATE TABLE webcam (
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
                `
            }
        ];

        for (const table of otherTablesSQL) {
            await pool.query(table.sql);
            console.log(`✅ ${table.name} table created`);
        }

        console.log('🎉 All tables recreated with proper structure!');
        
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
        
        console.log('🗃️  Tables ready:', tableCheck.rows.map(row => row.table_name));
        
    } catch (error) {
        console.error('❌ Table recreation failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

recreateTablesWithProperStructure();