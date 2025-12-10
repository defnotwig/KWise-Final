const db = require('./config/db');

(async () => {
    try {
        console.log('🔍 Checking CPU-Motherboard rules...\n');
        
        // First, check what columns exist
        const columnsResult = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'compatibility_rules'
            ORDER BY ordinal_position
        `);
        
        console.log('Available columns:', columnsResult.rows.map(r => r.column_name).join(', '));
        console.log('');
        
        const result = await db.query(`
            SELECT 
                id,
                rule_name,
                component_a_category,
                component_b_category,
                rule_expression
            FROM compatibility_rules 
            WHERE component_a_category = 'CPU' 
              AND component_b_category = 'Motherboard'
              AND enabled = true 
            LIMIT 5
        `);
        
        console.log(`Found ${result.rows.length} rules\n`);
        
        result.rows.forEach((rule, idx) => {
            console.log(`${idx + 1}. ${rule.rule_name} (ID: ${rule.id})`);
            console.log(`   Expression:`, JSON.stringify(rule.rule_expression, null, 2));
            console.log('');
        });
        
        // Now check what a real CPU looks like
        console.log('\n🔍 Checking real CPU specifications...\n');
        
        const cpuResult = await db.query(`
            SELECT id, name, category, specifications
            FROM pc_parts
            WHERE category = 'CPU'
            LIMIT 1
        `);
        
        if (cpuResult.rows.length > 0) {
            const cpu = cpuResult.rows[0];
            console.log(`CPU: ${cpu.name} (ID: ${cpu.id})`);
            console.log(`Specifications:`, JSON.stringify(cpu.specifications, null, 2));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
