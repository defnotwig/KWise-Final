const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'KWiseDB',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

// Extract brand from product name
function extractBrand(name) {
    const brandPatterns = [
        { pattern: /^AMD\s+/i, brand: 'AMD' },
        { pattern: /^Intel\s+/i, brand: 'Intel' },
        { pattern: /^NVIDIA\s+/i, brand: 'NVIDIA' },
        { pattern: /^GIGABYTE\s+/i, brand: 'GIGABYTE' },
        { pattern: /^ASUS\s+/i, brand: 'ASUS' },
        { pattern: /^MSI\s+/i, brand: 'MSI' },
        { pattern: /^ASROCK\s+/i, brand: 'ASROCK' },
        { pattern: /^CORSAIR\s+/i, brand: 'CORSAIR' },
        { pattern: /^RAMSTA\s+/i, brand: 'RAMSTA' },
        { pattern: /^AORUS\s+/i, brand: 'AORUS' },
        { pattern: /^T-FORCE\s+/i, brand: 'T-Force' },
        { pattern: /^WESTERN DIGITAL\s+/i, brand: 'Western Digital' },
        { pattern: /^SAMSUNG\s+/i, brand: 'SAMSUNG' },
        { pattern: /^DEEPCOOL\s+/i, brand: 'DEEPCOOL' },
        { pattern: /^REDRAGON\s+/i, brand: 'REDRAGON' },
        { pattern: /^Logitech\s+/i, brand: 'Logitech' },
        { pattern: /^Razer\s+/i, brand: 'Razer' },
        { pattern: /^HyperX\s+/i, brand: 'HyperX' },
        { pattern: /^Ryzen\s+/i, brand: 'AMD' },
    ];
    
    for (const { pattern, brand } of brandPatterns) {
        if (pattern.test(name)) {
            return brand;
        }
    }
    
    // Try to extract from the beginning of the name
    const words = name.split(' ');
    if (words.length > 0) {
        const firstWord = words[0].toUpperCase();
        if (firstWord.length > 2 && !/^\d/.test(firstWord)) {
            return firstWord;
        }
    }
    
    return 'Unknown';
}

// Category mapping for different table names
const categoryMapping = {
    'cpu': 'CPU',
    'gpu': 'GPU',
    'motherboard': 'Motherboard',
    'ram': 'RAM',
    'storage': 'Storage',
    'psu': 'PSU',
    'pc_case': 'Case',
    'cooling': 'Cooling',
    'monitors': 'Monitor',
    'headphones': 'Headphones',
    'keyboard': 'Keyboard',
    'mouse': 'Mouse',
    'speakers': 'Speakers',
    'webcams': 'Webcam'
};

async function importSQLData(options = {}) {
    const { dryRun = false, force = false } = options;
    
    console.log(`🔄 Starting SQL data import (${dryRun ? 'DRY RUN' : 'LIVE'})...\n`);
    
    const conflicts = [];
    const imported = {
        pc_parts: 0,
        cpu_specs: 0,
        gpu_specs: 0,
        motherboard_specs: 0,
        ram_specs: 0,
        storage_specs: 0,
        psu_specs: 0,
        case_specs: 0,
        cooling_specs: 0,
        monitor_specs: 0,
        headphones_specs: 0,
        keyboard_specs: 0,
        mouse_specs: 0,
        speakers_specs: 0,
        webcam_specs: 0
    };
    
    try {
        if (!dryRun) {
            await pool.query('BEGIN');
        }
        
        // CPU Data Import
        console.log('📊 Importing CPU data...');
        const cpuData = [
            { id: 11, name: 'AMD RYZEN 5 8400F', launched: '2024-02-10', socket: 'AM5', series: 'Ryzen 5', base_clock: 3.7, turbo_clock: 4.8, cores: 6, threads: 12, integrated_gpu: false, max_ram: 128, lithography: 5, tdp: 65, price: 8495.00 },
            { id: 12, name: 'AMD RYZEN 5 7600', launched: '2023-01-15', socket: 'AM5', series: 'Ryzen 5', base_clock: 3.8, turbo_clock: 5.1, cores: 6, threads: 12, integrated_gpu: true, max_ram: 128, lithography: 5, tdp: 65, price: 10495.00 },
            { id: 13, name: 'AMD RYZEN 7 8700F', launched: '2024-02-15', socket: 'AM5', series: 'Ryzen 7', base_clock: 3.6, turbo_clock: 5.0, cores: 8, threads: 16, integrated_gpu: false, max_ram: 128, lithography: 5, tdp: 65, price: 11495.00 },
            { id: 20, name: 'Intel Core i5 12400F', launched: '2022-01-04', socket: 'LGA1700', series: 'Core i5', base_clock: 2.5, turbo_clock: 4.4, cores: 6, threads: 12, integrated_gpu: false, max_ram: 128, lithography: 10, tdp: 65, price: 7480.00 },
            { id: 21, name: 'Intel Core i5 12400', launched: '2022-01-04', socket: 'LGA1700', series: 'Core i5', base_clock: 2.5, turbo_clock: 4.4, cores: 6, threads: 12, integrated_gpu: true, max_ram: 128, lithography: 10, tdp: 65, price: 8995.00 }
        ];
        
        for (const cpu of cpuData) {
            const brand = extractBrand(cpu.name);
            
            if (!dryRun) {
                // Insert into pc_parts
                await pool.query(`
                    INSERT INTO pc_parts (id, name, category, brand, price, stock)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (id) DO UPDATE SET 
                        name = EXCLUDED.name,
                        brand = EXCLUDED.brand,
                        price = EXCLUDED.price,
                        updated_at = now()
                `, [cpu.id, cpu.name, 'CPU', brand, cpu.price, 100]);
                
                // Insert into cpu_specs
                await pool.query(`
                    INSERT INTO cpu_specs (
                        part_id, launched, socket, series, base_clock, turbo_clock, 
                        cores, threads, integrated_gpu, max_ram, lithography, tdp
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (part_id) DO UPDATE SET
                        launched = EXCLUDED.launched,
                        socket = EXCLUDED.socket,
                        series = EXCLUDED.series,
                        base_clock = EXCLUDED.base_clock,
                        turbo_clock = EXCLUDED.turbo_clock,
                        cores = EXCLUDED.cores,
                        threads = EXCLUDED.threads,
                        integrated_gpu = EXCLUDED.integrated_gpu,
                        max_ram = EXCLUDED.max_ram,
                        lithography = EXCLUDED.lithography,
                        tdp = EXCLUDED.tdp,
                        updated_at = now()
                `, [
                    cpu.id, cpu.launched, cpu.socket, cpu.series, cpu.base_clock, 
                    cpu.turbo_clock, cpu.cores, cpu.threads, cpu.integrated_gpu, 
                    cpu.max_ram, cpu.lithography, cpu.tdp
                ]);
            }
            
            imported.pc_parts++;
            imported.cpu_specs++;
            console.log(`   ✓ Imported CPU: ${cpu.name}`);
        }
        
        // GPU Data Import
        console.log('🎮 Importing GPU data...');
        const gpuData = [
            { id: 401, name: '4GB RX550 RAMSTA *SINGLE FAN', launched: '2017-04-20', memory_type: 'GDDR5', memory_capacity: 4, core_clock: 1100.00, boost_clock: 1183.00, interface: 'PCIe 3.0', tdp: 50, price: 4995.00 },
            { id: 402, name: '8GB RX580 XFX GTS XXX Edition *(DUALFAN)', launched: '2017-04-18', memory_type: 'GDDR5', memory_capacity: 8, core_clock: 1366.00, boost_clock: 1380.00, interface: 'PCIe 3.0', tdp: 185, price: 6995.00 },
            { id: 409, name: 'RTX4060 GALAX 1-Click OC 2X', launched: '2023-06-29', memory_type: 'GDDR6', memory_capacity: 8, core_clock: 1830.00, boost_clock: 2460.00, interface: 'PCIe 4.0', tdp: 115, price: 17795.00 }
        ];
        
        for (const gpu of gpuData) {
            const brand = extractBrand(gpu.name);
            
            if (!dryRun) {
                // Insert into pc_parts
                await pool.query(`
                    INSERT INTO pc_parts (id, name, category, brand, price, stock)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (id) DO UPDATE SET 
                        name = EXCLUDED.name,
                        brand = EXCLUDED.brand,
                        price = EXCLUDED.price,
                        updated_at = now()
                `, [gpu.id, gpu.name, 'GPU', brand, gpu.price, 100]);
                
                // Insert into gpu_specs
                await pool.query(`
                    INSERT INTO gpu_specs (
                        part_id, launched, memory_type, memory_capacity, 
                        core_clock, boost_clock, interface, tdp
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (part_id) DO UPDATE SET
                        launched = EXCLUDED.launched,
                        memory_type = EXCLUDED.memory_type,
                        memory_capacity = EXCLUDED.memory_capacity,
                        core_clock = EXCLUDED.core_clock,
                        boost_clock = EXCLUDED.boost_clock,
                        interface = EXCLUDED.interface,
                        tdp = EXCLUDED.tdp,
                        updated_at = now()
                `, [
                    gpu.id, gpu.launched, gpu.memory_type, gpu.memory_capacity,
                    gpu.core_clock, gpu.boost_clock, gpu.interface, gpu.tdp
                ]);
            }
            
            imported.pc_parts++;
            imported.gpu_specs++;
            console.log(`   ✓ Imported GPU: ${gpu.name}`);
        }
        
        // Motherboard Data Import
        console.log('🔌 Importing Motherboard data...');
        const motherboardData = [
            { id: 101, name: 'RAMSTA B450M-P', socket: 'AM4', chipset: 'B450', memory_type: 'DDR4', max_ram: 128, ram_slots: 2, m2_slots: 1, ethernet_ports: 1, wireless_networking: false, integrated_gpu_support: true, price: 2999.00 },
            { id: 102, name: 'GIGABYTE A520M-K V2', socket: 'AM4', chipset: 'A520', memory_type: 'DDR4', max_ram: 128, ram_slots: 2, m2_slots: 1, ethernet_ports: 1, wireless_networking: false, integrated_gpu_support: true, price: 3499.00 }
        ];
        
        for (const motherboard of motherboardData) {
            const brand = extractBrand(motherboard.name);
            
            if (!dryRun) {
                // Insert into pc_parts
                await pool.query(`
                    INSERT INTO pc_parts (id, name, category, brand, price, stock)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (id) DO UPDATE SET 
                        name = EXCLUDED.name,
                        brand = EXCLUDED.brand,
                        price = EXCLUDED.price,
                        updated_at = now()
                `, [motherboard.id, motherboard.name, 'Motherboard', brand, motherboard.price, 100]);
                
                // Insert into motherboard_specs
                await pool.query(`
                    INSERT INTO motherboard_specs (
                        part_id, socket, chipset, memory_type, max_ram, ram_slots, 
                        m2_slots, ethernet_ports, wireless_networking, integrated_gpu_support
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (part_id) DO UPDATE SET
                        socket = EXCLUDED.socket,
                        chipset = EXCLUDED.chipset,
                        memory_type = EXCLUDED.memory_type,
                        max_ram = EXCLUDED.max_ram,
                        ram_slots = EXCLUDED.ram_slots,
                        m2_slots = EXCLUDED.m2_slots,
                        ethernet_ports = EXCLUDED.ethernet_ports,
                        wireless_networking = EXCLUDED.wireless_networking,
                        integrated_gpu_support = EXCLUDED.integrated_gpu_support,
                        updated_at = now()
                `, [
                    motherboard.id, motherboard.socket, motherboard.chipset, motherboard.memory_type,
                    motherboard.max_ram, motherboard.ram_slots, motherboard.m2_slots, 
                    motherboard.ethernet_ports, motherboard.wireless_networking, motherboard.integrated_gpu_support
                ]);
            }
            
            imported.pc_parts++;
            imported.motherboard_specs++;
            console.log(`   ✓ Imported Motherboard: ${motherboard.name}`);
        }
        
        if (!dryRun) {
            await pool.query('COMMIT');
            console.log('\n✅ Transaction committed successfully!');
        } else {
            console.log('\n🔍 DRY RUN completed - no data was actually imported');
        }
        
        // Print summary
        console.log('\n📊 Import Summary:');
        Object.entries(imported).forEach(([table, count]) => {
            if (count > 0) {
                console.log(`   ${table}: ${count} records`);
            }
        });
        
        if (conflicts.length > 0) {
            console.log(`\n⚠️  ${conflicts.length} conflicts detected - check logs/import-conflicts.log`);
            
            // Write conflicts to log file
            const logsDir = path.join(__dirname, '../logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            fs.writeFileSync(
                path.join(logsDir, 'import-conflicts.log'),
                conflicts.join('\n')
            );
        }
        
    } catch (error) {
        if (!dryRun) {
            await pool.query('ROLLBACK');
            console.log('\n🔄 Transaction rolled back due to error');
        }
        console.error('\n❌ Import failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const force = args.includes('--force');
    
    if (dryRun) {
        console.log('🔍 Running in DRY RUN mode - no data will be modified\n');
    }
    
    importSQLData({ dryRun, force }).catch(console.error);
}

module.exports = { importSQLData };
