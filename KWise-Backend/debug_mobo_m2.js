const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

pool.query(`
    SELECT category, COUNT(*) as count 
    FROM pc_parts 
    GROUP BY category 
    ORDER BY category
`).then(result => {
    console.log('\n📊 PC PARTS BY CATEGORY:\n');
    result.rows.forEach(row => {
        console.log(`  ${row.category}: ${row.count} items`);
    });
    console.log('\n');
    return pool.query(`
        SELECT id, name, category, specifications 
        FROM pc_parts 
        WHERE name LIKE '%B760M%' OR name LIKE '%ASUS PRIME%'
        LIMIT 10
    `);
}).then(result => {
    console.log(`\n🔍 SEARCH FOR ASUS/B760M BOARDS:\n`);
    if (result.rows.length > 0) {
        result.rows.forEach(item => {
            console.log(`  [${item.category}] ${item.name}`);
        });
    } else {
        console.log('  ❌ No matches found');
    }
    pool.end();
}).catch(error => {
    console.error('❌ Error:', error);
    pool.end();
});

