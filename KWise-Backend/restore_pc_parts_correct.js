const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function restorePcPartsCorrect() {
    console.log('🔄 RESTORING PC_PARTS TABLE (CORRECT CATEGORIES)');
    console.log('==============================================\n');
    
    try {
        // Category mappings with EXACT names from constraint
        const categories = [
            { name: 'CPU', table: 'cpu', allowedCategory: 'CPU' },
            { name: 'Motherboard', table: 'motherboard', allowedCategory: 'Motherboard' },
            { name: 'RAM', table: 'ram', allowedCategory: 'RAM' },
            { name: 'Storage', table: 'storage', allowedCategory: 'Storage' },
            { name: 'GPU', table: 'gpu', allowedCategory: 'GPU' },
            { name: 'PSU', table: 'psu', allowedCategory: 'PSU' },
            { name: 'Case', table: 'pc_case', allowedCategory: 'Case' },
            { name: 'Cooling', table: 'cooling', allowedCategory: 'Cooling' },
            { name: 'Monitor', table: 'monitor', allowedCategory: 'Monitor' },
            { name: 'Headphones', table: 'headphones', allowedCategory: 'Headphones' },
            { name: 'Keyboard', table: 'keyboard', allowedCategory: 'Keyboard' },
            { name: 'Mouse', table: 'mouse', allowedCategory: 'Mouse' },
            { name: 'Speakers', table: 'speakers', allowedCategory: 'Speakers' },
            { name: 'Webcam', table: 'webcam', allowedCategory: 'Webcam' }
        ];
        
        let totalInserted = 0;
        
        for (const category of categories) {
            console.log(`📥 Processing ${category.name} from ${category.table} table...`);
            
            try {
                // Check if the table exists and has data
                const checkResult = await pool.query(`SELECT COUNT(*) FROM ${category.table}`);
                const count = parseInt(checkResult.rows[0].count);
                
                if (count === 0) {
                    console.log(`   ⚠️ No data found in ${category.table} table`);
                    continue;
                }
                
                // Get all records from category table
                const categoryData = await pool.query(`SELECT id, name, price FROM ${category.table} ORDER BY id`);
                
                for (const row of categoryData.rows) {
                    // Extract brand from name (first word is usually the brand)
                    const nameParts = row.name.split(' ');
                    const brand = nameParts[0] || 'Unknown';
                    
                    // Use price from table or default to 0
                    const price = row.price || 0;
                    
                    // Default stock to 10 for demo purposes
                    const stock = 10;
                    
                    const insertQuery = `
                        INSERT INTO pc_parts (id, name, category, brand, price, stock, created_at, is_active)
                        VALUES ($1, $2, $3, $4, $5, $6, NOW(), true)
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            category = EXCLUDED.category,
                            brand = EXCLUDED.brand,
                            price = EXCLUDED.price,
                            stock = EXCLUDED.stock,
                            updated_at = NOW()
                    `;
                    
                    await pool.query(insertQuery, [
                        row.id,
                        row.name,
                        category.allowedCategory,  // Use the exact allowed category name
                        brand,
                        price,
                        stock
                    ]);
                    
                    totalInserted++;
                }
                
                console.log(`   ✅ Inserted ${categoryData.rows.length} records from ${category.name}`);
                
            } catch (error) {
                console.log(`   ❌ Error processing ${category.name}: ${error.message}`);
            }
        }
        
        console.log(`\n🎉 RESTORATION COMPLETE!`);
        console.log(`📊 Total records processed: ${totalInserted}`);
        
        // Verify the result
        const finalCount = await pool.query('SELECT COUNT(*) FROM pc_parts');
        console.log(`✅ Final pc_parts table count: ${finalCount.rows[0].count}`);
        
        // Show sample by category
        const categoryCount = await pool.query(`
            SELECT category, COUNT(*) as count 
            FROM pc_parts 
            GROUP BY category 
            ORDER BY category
        `);
        
        console.log('\n📋 Records by category:');
        categoryCount.rows.forEach(row => {
            console.log(`   ${row.category}: ${row.count} items`);
        });
        
        // Show sample records
        console.log('\n🔍 Sample records:');
        const sampleRecords = await pool.query(`
            SELECT id, name, category, brand, price 
            FROM pc_parts 
            ORDER BY category, id 
            LIMIT 10
        `);
        
        sampleRecords.rows.forEach(row => {
            console.log(`   ID ${row.id}: ${row.name} (${row.category}) - ${row.brand} - $${row.price}`);
        });
        
    } catch (error) {
        console.error('❌ Restoration failed:', error);
    } finally {
        await pool.end();
    }
}

restorePcPartsCorrect();