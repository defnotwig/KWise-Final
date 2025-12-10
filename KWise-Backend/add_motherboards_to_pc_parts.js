const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function addMissingMotherboardsToPcParts() {
    console.log('🔄 ADDING MISSING MOTHERBOARDS TO PC_PARTS TABLE');
    console.log('===============================================\n');
    
    try {
        // Check current pc_parts count for motherboards
        console.log('📋 Current motherboard records in pc_parts:');
        const currentPcParts = await pool.query(`
            SELECT COUNT(*) as count 
            FROM pc_parts 
            WHERE category = 'Motherboard'
        `);
        console.log(`   Current motherboard count in pc_parts: ${currentPcParts.rows[0].count}`);
        
        // Get the new motherboard records (126-134)
        console.log('\n📥 Getting new motherboard records (126-134)...');
        const newMotherboards = await pool.query(`
            SELECT id, name, price 
            FROM motherboard 
            WHERE id BETWEEN 126 AND 134 
            ORDER BY id
        `);
        
        console.log(`   Found ${newMotherboards.rows.length} new motherboard records to add`);
        
        let addedCount = 0;
        
        for (const motherboard of newMotherboards.rows) {
            try {
                // Extract brand from name (first word is usually the brand)
                const nameParts = motherboard.name.split(' ');
                const brand = nameParts[0] || 'Unknown';
                
                // Use price from table or default to 0
                const price = motherboard.price || 0;
                
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
                    motherboard.id,
                    motherboard.name,
                    'Motherboard',  // Use the exact allowed category name
                    brand,
                    price,
                    stock
                ]);
                
                console.log(`   ✅ Added to pc_parts - ID ${motherboard.id}: ${motherboard.name} (${brand})`);
                addedCount++;
                
            } catch (error) {
                console.log(`   ❌ Failed to add ID ${motherboard.id}: ${error.message}`);
            }
        }
        
        console.log(`\n🎉 Successfully added ${addedCount} motherboard records to pc_parts!`);
        
        // Verify the additions
        console.log('\n🔍 Verification - Updated pc_parts motherboard records:');
        const updatedPcParts = await pool.query(`
            SELECT id, name, brand, price 
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            ORDER BY id
        `);
        
        console.log(`   Total motherboard records in pc_parts: ${updatedPcParts.rows.length}`);
        
        // Show the newly added ones
        console.log('\n📋 Newly added motherboard records (126-134):');
        const newlyAdded = updatedPcParts.rows.filter(row => row.id >= 126 && row.id <= 134);
        newlyAdded.forEach(row => {
            console.log(`   ID ${row.id}: ${row.name} (${row.brand}) - ₱${row.price}`);
        });
        
        // Check total pc_parts count
        const totalPcParts = await pool.query('SELECT COUNT(*) FROM pc_parts');
        console.log(`\n📊 Total pc_parts records: ${totalPcParts.rows[0].count}`);
        
        // Show updated category breakdown
        console.log('\n📊 Updated category breakdown:');
        const categoryBreakdown = await pool.query(`
            SELECT category, COUNT(*) as count 
            FROM pc_parts 
            GROUP BY category 
            ORDER BY category
        `);
        
        categoryBreakdown.rows.forEach(row => {
            console.log(`   ${row.category}: ${row.count} items`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

addMissingMotherboardsToPcParts();