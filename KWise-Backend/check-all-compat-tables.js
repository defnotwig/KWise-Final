const db = require('./config/db');

async function checkAllCompatTables() {
    try {
        const tables = [
            'cpu_compatibility',
            'gpu_compatibility',
            'psu_compatibility',
            'motherboard_compatibility',
            'ram_compatibility',
            'storage_compatibility',
            'case_compatibility',
            'cooling_compatibility'
        ];
        
        console.log('\n📊 CHECKING ALL COMPATIBILITY TABLES:\n');
        
        for (const table of tables) {
            try {
                const count = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
                const hasData = parseInt(count.rows[0].count) > 0;
                console.log(`${hasData ? '📦' : '📭'} ${table.padEnd(30)} - ${count.rows[0].count} records`);
                
                if (hasData) {
                    const sample = await db.query(`SELECT * FROM ${table} LIMIT 1`);
                    console.log('   Sample:', JSON.stringify(sample.rows[0], null, 2));
                }
            } catch (err) {
                console.log(`❌ ${table.padEnd(30)} - Error: ${err.message}`);
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAllCompatTables();
