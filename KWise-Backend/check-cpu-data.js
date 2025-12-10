const db = require('./config/db');

async function checkCPUData() {
    try {
        const result = await db.query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE category = 'CPU' 
            LIMIT 5
        `);
        
        console.log('\n📊 SAMPLE CPU DATA:\n');
        result.rows.forEach(cpu => {
            console.log(`ID: ${cpu.id} | ${cpu.name}`);
            console.log('Specifications:');
            console.log(JSON.stringify(cpu.specifications, null, 2));
            console.log('\n' + '='.repeat(80) + '\n');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkCPUData();
