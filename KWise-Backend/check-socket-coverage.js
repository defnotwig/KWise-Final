const db = require('./config/db');

(async () => {
    try {
        // Check for AM4/AM5 rules
        const am4am5 = await db.query(`
            SELECT COUNT(*) 
            FROM compatibility_rules 
            WHERE rule_expression::text LIKE '%AM4%' 
               OR rule_expression::text LIKE '%AM5%'
        `);
        
        console.log('🔍 Rules with AM4/AM5 socket:', am4am5.rows[0].count);
        
        // Check all unique sockets in rules
        const sockets = await db.query(`
            SELECT DISTINCT 
                rule_expression->>'cpu_socket' as socket
            FROM compatibility_rules
            WHERE rule_expression->>'cpu_socket' IS NOT NULL
            ORDER BY socket
        `);
        
        console.log('\n📋 CPU Sockets in rules:');
        sockets.rows.forEach(row => {
            console.log(`   - ${row.socket}`);
        });
        
        // Check what CPUs exist in pc_parts
        const cpuSockets = await db.query(`
            SELECT DISTINCT 
                specifications->>'socket' as socket,
                COUNT(*) as count
            FROM pc_parts
            WHERE category = 'CPU'
            GROUP BY specifications->>'socket'
            ORDER BY count DESC
        `);
        
        console.log('\n📋 CPU Sockets in pc_parts:');
        cpuSockets.rows.forEach(row => {
            console.log(`   - ${row.socket}: ${row.count} CPUs`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
