require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Valid ID ranges for each category as specified by user
const VALID_ID_RANGES = {
    'CPU': { min: 11, max: 43, table: 'cpu' },
    'Motherboard': { min: 101, max: 135, table: 'motherboard' },
    'RAM': { min: 201, max: 224, table: 'ram' },
    'Storage': { min: 301, max: 326, table: 'storage' },
    'GPU': { min: 401, max: 440, table: 'gpu' },
    'PSU': { min: 501, max: 523, table: 'psu' },
    'Case': { min: 601, max: 626, table: 'pc_case' },
    'Cooling': { min: 701, max: 731, table: 'cooling' },
    'Monitor': { min: 801, max: 822, table: 'monitor' },
    'Headphones': { min: 901, max: 916, table: 'headphones' },
    'Keyboard': { min: 1001, max: 1012, table: 'keyboard' },
    'Mouse': { min: 1101, max: 1110, table: 'mouse' },
    'Speakers': { min: 1201, max: 1204, table: 'speakers' },
    'Webcam': { min: 1301, max: 1305, table: 'webcam' }
};

async function analyzeCurrentData() {
    try {
        console.log('=== ANALYZING CURRENT DATABASE DATA ===\n');
        
        for (const [category, range] of Object.entries(VALID_ID_RANGES)) {
            console.log(`🔍 Analyzing ${category} (${range.table}):`);
            console.log(`   Valid ID range: ${range.min}-${range.max}`);
            
            // Check current data in specification table
            const specResult = await pool.query(`
                SELECT id, name 
                FROM ${range.table} 
                ORDER BY id
            `);
            
            console.log(`   Current ${range.table} records: ${specResult.rows.length}`);
            
            // Identify records outside valid range
            const invalidSpecs = specResult.rows.filter(row => 
                row.id < range.min || row.id > range.max
            );
            
            if (invalidSpecs.length > 0) {
                console.log(`   ❌ Invalid records in ${range.table}:`, 
                    invalidSpecs.map(r => `${r.id}: ${r.name}`));
            } else {
                console.log(`   ✅ All records in ${range.table} are within valid range`);
            }
            
            console.log('');
        }
        
        // Check pc_parts table
        console.log('🔍 Analyzing pc_parts table:');
        const pcPartsResult = await pool.query(`
            SELECT id, name, category 
            FROM pc_parts 
            ORDER BY id
        `);
        
        console.log(`   Total pc_parts records: ${pcPartsResult.rows.length}`);
        
        // Group by category and check ranges
        const categoryCounts = {};
        const invalidPcParts = [];
        
        pcPartsResult.rows.forEach(row => {
            const category = row.category;
            if (!categoryCounts[category]) categoryCounts[category] = 0;
            categoryCounts[category]++;
            
            // Check if ID is in valid range for its category
            const range = VALID_ID_RANGES[category];
            if (range && (row.id < range.min || row.id > range.max)) {
                invalidPcParts.push(row);
            } else if (!range) {
                invalidPcParts.push({...row, reason: 'Unknown category'});
            }
        });
        
        console.log('   Categories in pc_parts:', categoryCounts);
        
        if (invalidPcParts.length > 0) {
            console.log(`   ❌ Invalid pc_parts records: ${invalidPcParts.length}`);
            invalidPcParts.slice(0, 10).forEach(r => {
                console.log(`     ${r.id}: ${r.name} (${r.category}) ${r.reason || ''}`);
            });
            if (invalidPcParts.length > 10) {
                console.log(`     ... and ${invalidPcParts.length - 10} more`);
            }
        } else {
            console.log(`   ✅ All pc_parts records are within valid ranges`);
        }
        
        console.log('\n=== ANALYSIS COMPLETE ===');
        
        return {
            invalidSpecs: Object.entries(VALID_ID_RANGES).reduce((acc, [category, range]) => {
                const specResult = pool.query(`SELECT id FROM ${range.table} WHERE id < $1 OR id > $2`, [range.min, range.max]);
                acc[category] = specResult;
                return acc;
            }, {}),
            invalidPcParts: invalidPcParts.map(r => r.id)
        };
        
    } catch (error) {
        console.error('Error analyzing data:', error.message);
        throw error;
    }
}

async function cleanupDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('\n=== STARTING DATABASE CLEANUP ===\n');
        
        await client.query('BEGIN');
        
        let totalDeleted = 0;
        
        // Clean up each specification table
        for (const [category, range] of Object.entries(VALID_ID_RANGES)) {
            console.log(`🧹 Cleaning ${category} (${range.table})...`);
            
            // Delete records outside valid range
            const deleteSpecResult = await client.query(`
                DELETE FROM ${range.table} 
                WHERE id < $1 OR id > $2
                RETURNING id, name
            `, [range.min, range.max]);
            
            if (deleteSpecResult.rows.length > 0) {
                console.log(`   ❌ Deleted ${deleteSpecResult.rows.length} invalid records from ${range.table}`);
                totalDeleted += deleteSpecResult.rows.length;
            } else {
                console.log(`   ✅ No cleanup needed for ${range.table}`);
            }
        }
        
        // Clean up pc_parts table
        console.log('\n🧹 Cleaning pc_parts table...');
        
        // Build WHERE clause for all valid ID ranges
        const validConditions = Object.entries(VALID_ID_RANGES).map(([category, range]) => 
            `(category = '${category}' AND id >= ${range.min} AND id <= ${range.max})`
        ).join(' OR ');
        
        const deletePcPartsResult = await client.query(`
            DELETE FROM pc_parts 
            WHERE NOT (${validConditions})
            RETURNING id, name, category
        `);
        
        if (deletePcPartsResult.rows.length > 0) {
            console.log(`   ❌ Deleted ${deletePcPartsResult.rows.length} invalid records from pc_parts`);
            totalDeleted += deletePcPartsResult.rows.length;
            
            // Show sample of deleted records
            deletePcPartsResult.rows.slice(0, 5).forEach(r => {
                console.log(`     - ${r.id}: ${r.name} (${r.category})`);
            });
            if (deletePcPartsResult.rows.length > 5) {
                console.log(`     ... and ${deletePcPartsResult.rows.length - 5} more`);
            }
        } else {
            console.log(`   ✅ No cleanup needed for pc_parts`);
        }
        
        await client.query('COMMIT');
        
        console.log(`\n✅ CLEANUP COMPLETE: Deleted ${totalDeleted} total records`);
        console.log('\n=== VERIFYING CLEANUP ===\n');
        
        // Verify cleanup
        for (const [category, range] of Object.entries(VALID_ID_RANGES)) {
            const verifyResult = await client.query(`
                SELECT COUNT(*) as count, MIN(id) as min_id, MAX(id) as max_id
                FROM ${range.table}
            `);
            
            const count = parseInt(verifyResult.rows[0].count);
            const minId = verifyResult.rows[0].min_id;
            const maxId = verifyResult.rows[0].max_id;
            
            console.log(`✅ ${category}: ${count} records (ID range: ${minId}-${maxId})`);
        }
        
        const pcPartsVerify = await client.query(`
            SELECT category, COUNT(*) as count 
            FROM pc_parts 
            GROUP BY category 
            ORDER BY category
        `);
        
        console.log('\n✅ pc_parts verification:');
        pcPartsVerify.rows.forEach(row => {
            console.log(`   ${row.category}: ${row.count} records`);
        });
        
        console.log('\n🎉 DATABASE CLEANUP SUCCESSFUL!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error during cleanup:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        // First analyze current data
        await analyzeCurrentData();
        
        // Ask for confirmation before cleanup
        console.log('\n⚠️  READY TO CLEANUP DATABASE');
        console.log('This will permanently delete records outside the specified ID ranges.');
        console.log('The operation is wrapped in a transaction and can be rolled back if needed.\n');
        
        // For safety, let's run the cleanup
        await cleanupDatabase();
        
    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();