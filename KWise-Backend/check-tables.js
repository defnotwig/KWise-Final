const db = require('./config/db');

async function checkTables() {
    try {
        const result = await db.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename
        `);
        
        console.log('\n📋 ALL TABLES IN DATABASE:\n');
        result.rows.forEach((row, idx) => {
            console.log(`${idx + 1}. ${row.tablename}`);
        });
        
        console.log(`\nTotal: ${result.rows.length} tables`);
        
        // Check for compatibility tables
        const compatTables = result.rows.filter(r => r.tablename.includes('compatibility'));
        console.log(`\nCompatibility tables: ${compatTables.length}`);
        compatTables.forEach(t => console.log(`  - ${t.tablename}`));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkTables();
