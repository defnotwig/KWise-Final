const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkEliteBuildC() {
    try {
        console.log('🔍 Checking Elite Build C (ID: 12022) specifications...\n');
        
        const result = await pool.query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE id = 12022
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ Elite Build C not found!');
            return;
        }
        
        const item = result.rows[0];
        console.log('📦 Item:', item.name);
        console.log('📁 Category:', item.category);
        console.log('\n📋 Specifications:');
        console.log(JSON.stringify(item.specifications, null, 2));
        
        if (item.specifications && item.specifications.components) {
            console.log('\n🔧 Components breakdown:');
            console.log(`Total components: ${item.specifications.components.length}`);
            item.specifications.components.forEach((comp, index) => {
                console.log(`  ${index + 1}. ${comp.name}: ${comp.value}`);
            });
        }
        
        if (item.specifications && item.specifications.componentLinks) {
            console.log('\n🔗 Component Links:');
            item.specifications.componentLinks.forEach((link, index) => {
                console.log(`  ${index + 1}. ${link.componentType}: ${link.componentName} (ID: ${link.linkedStockIds?.[0] || 'none'})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkEliteBuildC();
