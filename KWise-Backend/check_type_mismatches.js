require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkTypeMismatches() {
    try {
        console.log('=== Checking PSU Specifications ===');
        const psuResult = await pool.query('SELECT wattage, efficiency_rating, pcie_connectors, sata_connectors FROM psu LIMIT 3');
        console.log('PSU data:', psuResult.rows);
        
        console.log('\n=== Checking Monitor Specifications ===');
        const monitorResult = await pool.query('SELECT screen_size, refresh_rate, response_time FROM monitor LIMIT 3');
        console.log('Monitor data:', monitorResult.rows);
        
        console.log('\n=== Checking Case Specifications ===');
        const caseResult = await pool.query('SELECT fans_included, max_gpu_length, max_cpu_cooler_height FROM pc_case LIMIT 3');
        console.log('Case data:', caseResult.rows);
        
        console.log('\n=== Checking Cooling Specifications ===');
        const coolingResult = await pool.query('SELECT max_rpm, max_noise, height FROM cooling LIMIT 3');
        console.log('Cooling data:', coolingResult.rows);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTypeMismatches();