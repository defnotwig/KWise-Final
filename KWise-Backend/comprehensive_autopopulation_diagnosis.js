require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Field definitions from stockController.js (as they should be after our fixes)
const fieldDefinitions = {
    'RAM': [
        { name: 'memory_type', label: 'Memory Type', type: 'text', required: false },
        { name: 'cas_latency', label: 'CAS Latency', type: 'text', required: false },
        { name: 'total_capacity', label: 'Total Capacity', type: 'text', required: false },
        { name: 'speed', label: 'Speed (MHz)', type: 'number', required: false },
        { name: 'voltage', label: 'Voltage (V)', type: 'number', step: 0.01, required: false },
        { name: 'form_factor', label: 'Form Factor', type: 'text', required: false }
    ],
    'PSU': [
        { name: 'wattage', label: 'Wattage (W)', type: 'number', required: true },
        { name: 'efficiency_rating', label: 'Efficiency Rating', type: 'text', required: false },
        { name: 'modular', label: 'Modular', type: 'checkbox', required: false },
        { name: 'form_factor', label: 'Form Factor', type: 'text', required: false },
        { name: 'pcie_connectors', label: 'PCIe Connectors', type: 'text', required: false },
        { name: 'sata_connectors', label: 'SATA Connectors', type: 'text', required: false }
    ],
    'CPU': [
        { name: 'socket', label: 'Socket', type: 'text', required: false },
        { name: 'cores', label: 'Cores', type: 'number', required: false },
        { name: 'threads', label: 'Threads', type: 'number', required: false },
        { name: 'base_clock', label: 'Base Clock (GHz)', type: 'number', step: 0.1, required: false },
        { name: 'boost_clock', label: 'Boost Clock (GHz)', type: 'number', step: 0.1, required: false },
        { name: 'tdp', label: 'TDP (W)', type: 'number', required: false }
    ],
    'GPU': [
        { name: 'chipset', label: 'Chipset', type: 'text', required: false },
        { name: 'memory', label: 'Memory (GB)', type: 'number', required: false },
        { name: 'memory_type', label: 'Memory Type', type: 'text', required: false },
        { name: 'core_clock', label: 'Core Clock (MHz)', type: 'number', required: false },
        { name: 'boost_clock', label: 'Boost Clock (MHz)', type: 'number', required: false },
        { name: 'length', label: 'Length (mm)', type: 'number', required: false }
    ]
};

async function comprehensiveAutoPopulationTest() {
    try {
        console.log('=== COMPREHENSIVE AUTO-POPULATION DIAGNOSIS ===\n');

        // Test each category
        for (const [categoryName, fields] of Object.entries(fieldDefinitions)) {
            console.log(`🔍 Testing ${categoryName} Category:`);
            console.log('=' + '='.repeat(50));
            
            // Get table name for database query
            let tableName = categoryName.toLowerCase();
            if (categoryName === 'PSU') tableName = 'psu';
            else if (categoryName === 'CPU') tableName = 'cpu';
            else if (categoryName === 'GPU') tableName = 'gpu';
            else if (categoryName === 'RAM') tableName = 'ram';
            
            try {
                // First, check what columns exist in the database table
                const columnQuery = `
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `;
                const columnResult = await pool.query(columnQuery, [tableName]);
                
                console.log(`📊 Database table '${tableName}' columns:`, 
                    columnResult.rows.map(row => `${row.column_name} (${row.data_type})`).join(', '));
                
                // Get sample data from the table
                const sampleQuery = `SELECT * FROM ${tableName} LIMIT 1`;
                const sampleResult = await pool.query(sampleQuery);
                
                if (sampleResult.rows.length > 0) {
                    const sampleData = sampleResult.rows[0];
                    console.log('📋 Sample database record:', sampleData);
                    
                    // Test field mapping
                    console.log('\n🔧 Field Mapping Analysis:');
                    fields.forEach(field => {
                        const dbValue = sampleData[field.name];
                        const hasDbColumn = columnResult.rows.some(col => col.column_name === field.name);
                        
                        if (!hasDbColumn) {
                            console.log(`❌ MISSING COLUMN: Field '${field.name}' not found in database table '${tableName}'`);
                        } else if (dbValue === null || dbValue === undefined) {
                            console.log(`⚪ EMPTY: Field '${field.name}' exists but is null/undefined`);
                        } else {
                            // Check type compatibility
                            if (field.type === 'number') {
                                const numValue = Number(dbValue);
                                if (isNaN(numValue) || (typeof dbValue === 'string' && !/^\d*\.?\d*$/.test(dbValue.trim()))) {
                                    console.log(`❌ TYPE MISMATCH: Field '${field.name}' expects number but has '${dbValue}' (${typeof dbValue})`);
                                } else {
                                    console.log(`✅ COMPATIBLE: Field '${field.name}' = '${dbValue}' (number compatible)`);
                                }
                            } else {
                                console.log(`✅ COMPATIBLE: Field '${field.name}' = '${dbValue}' (${field.type} type)`);
                            }
                        }
                    });
                } else {
                    console.log(`⚠️ No sample data found in table '${tableName}'`);
                }
                
            } catch (tableError) {
                console.log(`❌ ERROR accessing table '${tableName}':`, tableError.message);
            }
            
            console.log('\n' + '='.repeat(60) + '\n');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error in diagnosis:', error.message);
        process.exit(1);
    }
}

comprehensiveAutoPopulationTest();