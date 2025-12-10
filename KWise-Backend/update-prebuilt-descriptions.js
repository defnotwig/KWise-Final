/**
 * Update Pre-Built Product Descriptions
 * Removes component lists from descriptions to keep them concise
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function updateDescriptions() {
    try {
        console.log('🔍 Checking current Pre-Built descriptions...\n');

        // Check current descriptions
        const before = await pool.query(`
            SELECT id, name, LEFT(description, 150) as short_desc 
            FROM pc_parts 
            WHERE category = 'Pre-Built' 
            ORDER BY id
        `);

        console.log('📋 BEFORE UPDATE:');
        console.log('─'.repeat(80));
        before.rows.forEach(row => {
            console.log(`ID ${row.id}: ${row.short_desc}...`);
        });

        console.log('\n🔧 Updating descriptions (removing component lists)...\n');

        // Update descriptions - remove everything after ". Components:"
        const updateResult = await pool.query(`
            UPDATE pc_parts
            SET description = SPLIT_PART(description, '. Components:', 1) || '.'
            WHERE category = 'Pre-Built' 
              AND description LIKE '%. Components:%'
        `);

        console.log(`✅ Updated ${updateResult.rowCount} product descriptions`);

        // Check updated descriptions
        const after = await pool.query(`
            SELECT id, name, description 
            FROM pc_parts 
            WHERE category = 'Pre-Built' 
            ORDER BY id
        `);

        console.log('\n📋 AFTER UPDATE:');
        console.log('─'.repeat(80));
        after.rows.forEach(row => {
            console.log(`ID ${row.id}: ${row.description}`);
        });

        console.log('\n✅ Description cleanup complete!');
        console.log(`   - All descriptions are now concise and component-free`);
        console.log(`   - Format: "[Tier] level Pre-Built PC for [purposes]."`);

    } catch (error) {
        console.error('❌ Error updating descriptions:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

updateDescriptions()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
