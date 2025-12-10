#!/usr/bin/env node
/**
 * SYNC VERIFICATION SCRIPT
 * Verifies that the kiosk to database sync completed successfully
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

console.log('🔍 SYNC VERIFICATION');
console.log('====================');

async function verifySync() {
    try {
        // 1. Check total item count
        const countQuery = 'SELECT COUNT(*) as total FROM pc_parts WHERE is_active = true';
        const countResult = await pool.query(countQuery);
        const totalItems = parseInt(countResult.rows[0].total);
        
        console.log(`📊 Total active items in database: ${totalItems}`);
        
        // 2. Check items created today (from sync)
        const todayQuery = `
            SELECT COUNT(*) as today_count 
            FROM pc_parts 
            WHERE DATE(created_at) = CURRENT_DATE 
            AND is_active = true
        `;
        const todayResult = await pool.query(todayQuery);
        const todayCount = parseInt(todayResult.rows[0].today_count);
        
        console.log(`➕ Items created today: ${todayCount}`);
        
        // 3. Check items updated today
        const updatedQuery = `
            SELECT COUNT(*) as updated_count 
            FROM pc_parts 
            WHERE DATE(updated_at) = CURRENT_DATE 
            AND DATE(created_at) != CURRENT_DATE
            AND is_active = true
        `;
        const updatedResult = await pool.query(updatedQuery);
        const updatedCount = parseInt(updatedResult.rows[0].updated_count);
        
        console.log(`✏️  Items updated today: ${updatedCount}`);
        
        // 4. Check specifications coverage
        const specsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(specifications) as with_specs,
                COUNT(*) - COUNT(specifications) as without_specs
            FROM pc_parts 
            WHERE is_active = true
        `;
        const specsResult = await pool.query(specsQuery);
        const specsStats = specsResult.rows[0];
        
        console.log(`\n🔧 SPECIFICATIONS COVERAGE:`);
        console.log(`   Total items: ${specsStats.total}`);
        console.log(`   With specifications: ${specsStats.with_specs}`);
        console.log(`   Without specifications: ${specsStats.without_specs}`);
        console.log(`   Coverage: ${((specsStats.with_specs / specsStats.total) * 100).toFixed(1)}%`);
        
        // 5. Check category distribution
        const categoryQuery = `
            SELECT 
                category,
                COUNT(*) as item_count,
                AVG(price::numeric) as avg_price
            FROM pc_parts 
            WHERE is_active = true
            GROUP BY category 
            ORDER BY item_count DESC
        `;
        const categoryResult = await pool.query(categoryQuery);
        
        console.log(`\n📈 CATEGORY DISTRIBUTION:`);
        console.log('┌─────────────────┬─────────────┬─────────────────┐');
        console.log('│ Category        │ Item Count  │ Avg Price       │');
        console.log('├─────────────────┼─────────────┼─────────────────┤');
        
        categoryResult.rows.forEach(row => {
            const category = row.category.padEnd(15);
            const count = row.item_count.toString().padEnd(11);
            const avgPrice = (parseFloat(row.avg_price) || 0).toFixed(2).padEnd(15);
            console.log(`│ ${category} │ ${count} │ ${avgPrice} │`);
        });
        console.log('└─────────────────┴─────────────┴─────────────────┘');
        
        // 6. Sample synced items
        const sampleQuery = `
            SELECT id, name, category, price, specifications
            FROM pc_parts 
            WHERE DATE(created_at) = CURRENT_DATE
            AND is_active = true
            LIMIT 5
        `;
        const sampleResult = await pool.query(sampleQuery);
        
        if (sampleResult.rows.length > 0) {
            console.log(`\n🔬 SAMPLE SYNCED ITEMS:`);
            sampleResult.rows.forEach((item, index) => {
                console.log(`\n   ${index + 1}. ID: ${item.id}`);
                console.log(`      Name: ${item.name}`);
                console.log(`      Category: ${item.category}`);
                console.log(`      Price: PHP ${item.price}`);
                if (item.specifications) {
                    const specKeys = Object.keys(item.specifications);
                    console.log(`      Specifications: ${specKeys.length} attributes`);
                    console.log(`      Sample specs: ${JSON.stringify(item.specifications).slice(0, 100)}...`);
                }
            });
        }
        
        // 7. Verify specific kiosk items exist
        const kioskItemsToCheck = [
            "AMD RYZEN 5 3400G (AM4) (TTP) W/ AMD COOLER",
            "AMD RYZEN 5 5500 (AM4) (TTP) W/ AMD COOLER",
            "AMD RYZEN 5 5600 (AM4) (TTP) W/ AMD COOLER"
        ];
        
        console.log(`\n✅ KIOSK ITEM VERIFICATION:`);
        for (const itemName of kioskItemsToCheck) {
            const checkQuery = `
                SELECT id, name, price, specifications IS NOT NULL as has_specs
                FROM pc_parts 
                WHERE name = $1 AND is_active = true
            `;
            const checkResult = await pool.query(checkQuery, [itemName]);
            
            if (checkResult.rows.length > 0) {
                const item = checkResult.rows[0];
                console.log(`   ✅ ${itemName}`);
                console.log(`      ID: ${item.id}, Price: ${item.price}, Has Specs: ${item.has_specs}`);
            } else {
                console.log(`   ❌ ${itemName} - NOT FOUND`);
            }
        }
        
        // 8. Final summary
        console.log(`\n📋 VERIFICATION SUMMARY:`);
        console.log(`├── Sync created ${todayCount} new items`);
        console.log(`├── Sync updated ${updatedCount} existing items`);
        console.log(`├── Total items now: ${totalItems}`);
        console.log(`├── Specifications coverage: ${((specsStats.with_specs / specsStats.total) * 100).toFixed(1)}%`);
        console.log(`└── Categories covered: ${categoryResult.rows.length}`);
        
        if (todayCount > 0 || updatedCount > 0) {
            console.log(`\n✅ SYNC VERIFICATION: PASSED`);
            console.log(`   The kiosk to database sync completed successfully!`);
        } else {
            console.log(`\n⚠️  SYNC VERIFICATION: NO CHANGES DETECTED`);
            console.log(`   Either sync didn't run or no new data was found.`);
        }
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    } finally {
        await pool.end();
    }
}

// Run verification
verifySync();