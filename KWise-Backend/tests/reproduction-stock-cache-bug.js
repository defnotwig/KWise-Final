/**
 * REPRODUCTION TEST: Stock Update Cache Invalidation Bug
 * 
 * This script reproduces the 3-5 minute stock update delay issue.
 * 
 * ISSUE: When updating stock via PATCH /api/stock/:id, the database is updated
 * but the queryCache is not invalidated, causing GET requests to return stale
 * cached data for 5 minutes (CACHE_TTL.stock = 300 seconds).
 * 
 * ROOT CAUSE:
 * - db.js line 95-98: UPDATE queries bypass queryCache.query()
 * - Only pool.query() is called, which doesn't trigger invalidateOnWrite()
 * - Cache entries persist until TTL expires (5 minutes)
 * 
 * EXPECTED: After PATCH, immediate GET returns updated value
 * ACTUAL: GET returns stale cached value for ~5 minutes
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

async function reproduceStockCacheBug() {
    console.log('\n🧪 REPRODUCTION TEST: Stock Update Cache Invalidation Bug');
    console.log('═'.repeat(70));
    
    const testPartId = 123; // Use existing part ID or create one
    const originalStock = 50;
    const updatedStock = 999;
    
    try {
        // STEP 1: Seed database with known value
        console.log('\n📝 STEP 1: Seed database with original stock value');
        await query(
            'UPDATE pc_parts SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [originalStock, testPartId]
        );
        console.log(`✅ Database updated: Part #${testPartId} stock = ${originalStock}`);
        
        // STEP 2: Prime the cache with SELECT query
        console.log('\n🔍 STEP 2: Prime cache with SELECT query');
        const primeResult = await query('SELECT id, stock FROM pc_parts WHERE id = $1', [testPartId]);
        console.log(`✅ Cache primed: ${JSON.stringify(primeResult.rows[0])}`);
        
        // STEP 3: Update stock (simulating PATCH /api/stock/:id)
        console.log('\n✏️ STEP 3: Update stock via UPDATE query (simulating PATCH request)');
        const updateStart = Date.now();
        await query(
            'UPDATE pc_parts SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, stock',
            [updatedStock, testPartId]
        );
        const updateDuration = Date.now() - updateStart;
        console.log(`✅ Database updated: Part #${testPartId} stock = ${updatedStock} (${updateDuration}ms)`);
        
        // STEP 4: Immediately query database directly (bypass cache)
        console.log('\n🔎 STEP 4: Query database directly (verify DB has new value)');
        const { Pool } = require('pg');
        const directPool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'KWiseDB',
            password: process.env.DB_PASSWORD || 'humbleludwig13',
            port: process.env.DB_PORT || 5432
        });
        const directResult = await directPool.query('SELECT id, stock FROM pc_parts WHERE id = $1', [testPartId]);
        console.log(`✅ Direct DB query result: ${JSON.stringify(directResult.rows[0])}`);
        await directPool.end();
        
        // STEP 5: Query via cached query() function (this is what API uses)
        console.log('\n🧩 STEP 5: Query via query() function (this is what GET /api/stock uses)');
        const cachedResult = await query('SELECT id, stock FROM pc_parts WHERE id = $1', [testPartId]);
        console.log(`📦 Cached query result: ${JSON.stringify(cachedResult.rows[0])}`);
        
        // STEP 6: Verify the bug
        console.log('\n🔬 STEP 6: VERIFICATION');
        console.log('═'.repeat(70));
        
        const directStock = directResult.rows[0].stock;
        const cachedStock = cachedResult.rows[0].stock;
        
        console.log(`Database value:     ${directStock}`);
        console.log(`Cached value:       ${cachedStock}`);
        console.log(`Expected (updated): ${updatedStock}`);
        
        if (directStock === updatedStock && cachedStock === originalStock) {
            console.log('\n❌ BUG REPRODUCED! Cache invalidation failed!');
            console.log(`   Database has ${directStock} (correct)`);
            console.log(`   Cache has ${cachedStock} (STALE - should be ${updatedStock})`);
            console.log(`   Users will see old stock value for ~5 minutes`);
            return false;
        } else if (directStock === updatedStock && cachedStock === updatedStock) {
            console.log('\n✅ BUG FIXED! Cache properly invalidated!');
            console.log(`   Both database and cache return ${updatedStock}`);
            return true;
        } else {
            console.log('\n⚠️ UNEXPECTED STATE!');
            console.log(`   Database: ${directStock}, Cache: ${cachedStock}`);
            return null;
        }
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error);
        throw error;
    }
}

// Run test if executed directly
if (require.main === module) {
    reproduceStockCacheBug()
        .then((success) => {
            console.log('\n' + '═'.repeat(70));
            console.log(success === false ? '🐛 BUG CONFIRMED' : success === true ? '✨ BUG FIXED' : '❓ UNCLEAR');
            process.exit(success === true ? 0 : 1);
        })
        .catch((err) => {
            console.error('\n💥 Test execution failed:', err);
            process.exit(1);
        });
}

module.exports = { reproduceStockCacheBug };
