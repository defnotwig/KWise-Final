const db = require('./config/db');

async function checkExistingStructure() {
    try {
        // Check existing cpu_compatibility structure
        const columns = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'cpu_compatibility'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 EXISTING CPU_COMPATIBILITY TABLE STRUCTURE:\n');
        console.table(columns.rows);
        
        // Check if it has any data
        const count = await db.query(`SELECT COUNT(*) as count FROM cpu_compatibility`);
        console.log(`\n📈 Records in cpu_compatibility: ${count.rows[0].count}`);
        
        // Sample data
        if (parseInt(count.rows[0].count) > 0) {
            const sample = await db.query(`SELECT * FROM cpu_compatibility LIMIT 3`);
            console.log('\n🔍 SAMPLE DATA:');
            console.log(JSON.stringify(sample.rows, null, 2));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkExistingStructure();
