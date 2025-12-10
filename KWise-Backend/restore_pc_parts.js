// Database restoration script to populate pc_parts table from category tables
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function restorePcParts() {
    console.log('🔄 RESTORING PC_PARTS TABLE FROM CATEGORY TABLES');
    console.log('==============================================\n');
    
    try {
        // Category mappings with their ID ranges
        const categories = [
            { name: 'CPU', table: 'cpu', range: [11, 43] },
            { name: 'Motherboard', table: 'motherboard', range: [101, 135] },
            { name: 'RAM', table: 'ram', range: [201, 223] },
            { name: 'Storage', table: 'storage', range: [301, 326] },
            { name: 'GPU', table: 'gpu', range: [401, 440] },
            { name: 'PSU', table: 'psu', range: [501, 523] },
            { name: 'Case', table: 'pc_case', range: [601, 626] },
            { name: 'Cooling', table: 'cooling', range: [701, 731] },
            { name: 'Monitor', table: 'monitor', range: [801, 822] },
            { name: 'Headphones', table: 'headphones', range: [901, 916] },
            { name: 'Keyboard', table: 'keyboard', range: [1001, 1012] },
            { name: 'Mouse', table: 'mouse', range: [1101, 1110] },
            { name: 'Speakers', table: 'speakers', range: [1201, 1204] },
            { name: 'Webcam', table: 'webcam', range: [1301, 1305] }
        ];
        
        let totalInserted = 0;
        
        for (const category of categories) {
            console.log(`📥 Processing ${category.name} from ${category.table} table...`);
            
            // Check if the table exists and has data
            try {
                const checkResult = await pool.query(`SELECT COUNT(*) FROM ${category.table}`);
                const count = parseInt(checkResult.rows[0].count);
                
                if (count === 0) {
                    console.log(`   ⚠️ No data found in ${category.table} table`);
                    continue;
                }
                
                // Get sample record to understand table structure
                const sampleResult = await pool.query(`SELECT * FROM ${category.table} LIMIT 1`);
                const columns = Object.keys(sampleResult.rows[0]);
                console.log(`   📋 Available columns: ${columns.join(', ')}`);
                
                // Determine which columns to use for pc_parts
                const baseColumns = ['id', 'name'];
                let priceColumn = null;
                let stockColumn = null;
                let brandColumn = null;
                let imageColumn = null;
                
                // Look for common column names
                if (columns.includes('price')) priceColumn = 'price';
                if (columns.includes('stock_quantity')) stockColumn = 'stock_quantity';
                else if (columns.includes('stock')) stockColumn = 'stock';
                if (columns.includes('brand')) brandColumn = 'brand';
                if (columns.includes('image')) imageColumn = 'image';
                else if (columns.includes('image_url')) imageColumn = 'image_url';
                
                // Build the query to insert into pc_parts
                let selectClause = 'id, name';
                let valuesList = '$1, $2';
                let paramCount = 2;
                
                if (priceColumn) {
                    selectClause += `, ${priceColumn}`;
                    valuesList += `, $${++paramCount}`;
                }
                if (stockColumn) {
                    selectClause += `, ${stockColumn}`;
                    valuesList += `, $${++paramCount}`;
                }
                if (brandColumn) {
                    selectClause += `, ${brandColumn}`;
                    valuesList += `, $${++paramCount}`;
                }
                if (imageColumn) {
                    selectClause += `, ${imageColumn}`;
                    valuesList += `, $${++paramCount}`;
                }
                
                // Get all records from category table
                const categoryData = await pool.query(`SELECT ${selectClause} FROM ${category.table} ORDER BY id`);
                
                for (const row of categoryData.rows) {
                    const insertParams = [
                        row.id, 
                        row.name,
                        category.name.toLowerCase()
                    ];
                    
                    if (priceColumn && row[priceColumn] !== undefined) {
                        insertParams.push(row[priceColumn]);
                    }
                    if (stockColumn && row[stockColumn] !== undefined) {
                        insertParams.push(row[stockColumn]);
                    }
                    if (brandColumn && row[brandColumn] !== undefined) {
                        insertParams.push(row[brandColumn]);
                    }
                    if (imageColumn && row[imageColumn] !== undefined) {
                        insertParams.push(row[imageColumn]);
                    }
                    
                    // Build INSERT query dynamically
                    let insertColumns = 'id, name, category';
                    let insertValues = '$1, $2, $3';
                    let insertParamCount = 3;
                    
                    if (priceColumn && row[priceColumn] !== undefined) {
                        insertColumns += ', price';
                        insertValues += `, $${++insertParamCount}`;
                    }
                    if (stockColumn && row[stockColumn] !== undefined) {
                        insertColumns += ', stock';
                        insertValues += `, $${++insertParamCount}`;
                    }
                    if (brandColumn && row[brandColumn] !== undefined) {
                        insertColumns += ', brand';
                        insertValues += `, $${++insertParamCount}`;
                    }
                    if (imageColumn && row[imageColumn] !== undefined) {
                        insertColumns += ', image';
                        insertValues += `, $${++insertParamCount}`;
                    }
                    
                    const insertQuery = `
                        INSERT INTO pc_parts (${insertColumns})
                        VALUES (${insertValues})
                        ON CONFLICT (id) DO NOTHING
                    `;
                    
                    await pool.query(insertQuery, insertParams);
                    totalInserted++;
                }
                
                console.log(`   ✅ Inserted ${categoryData.rows.length} records from ${category.name}`);
                
            } catch (error) {
                console.log(`   ❌ Error processing ${category.name}: ${error.message}`);
            }
        }
        
        console.log(`\n🎉 RESTORATION COMPLETE!`);
        console.log(`📊 Total records inserted into pc_parts: ${totalInserted}`);
        
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
        
    } catch (error) {
        console.error('❌ Restoration failed:', error);
    } finally {
        await pool.end();
    }
}

restorePcParts();