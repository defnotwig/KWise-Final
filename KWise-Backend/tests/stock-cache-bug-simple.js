/**
 * SIMPLE REPRODUCTION TEST: Stock Update Cache Invalidation Bug
 * 
 * This script demonstrates the cache invalidation bug fix.
 * Now uses the actual db.js query function which includes the fix.
 * 
 * ROOT CAUSE WAS:
 * - db.js lines 95-98: UPDATE queries bypassed queryCache.query()
 * - Only pool.query() was called directly, which didn't trigger invalidateOnWrite()
 * - Cache entries persisted until TTL expired (5 minutes = 300,000ms)
 * 
 * FIX APPLIED:
 * - db.js now calls queryCache.invalidateOnWrite() after every write operation
 * - This invalidates cached entries matching the updated tables
 */

const { query: dbQuery } = require('../config/db');
const { Pool } = require('pg');

async function testCacheInvalidationBug() {
    console.log('\n🧪 STOCK CACHE INVALIDATION BUG - VERIFICATION TEST');
    console.log('═'.repeat(70));
    
    // Create direct pool for verification queries
    const verifyPool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'KWiseDB',
        password: process.env.DB_PASSWORD || 'humbleludwig13',
        port: process.env.DB_PORT || 5432
    });
    
    try {
        // Find an existing part
        console.log('\n📋 Finding a PC part to test with...');
        const findResult = await verifyPool.query('SELECT id, name, stock FROM pc_parts LIMIT 1');
        
        if (findResult.rows.length === 0) {
            console.log('❌ No PC parts found in database. Please add some data first.');
            await verifyPool.end();
            return;
        }
        
        const testPart = findResult.rows[0];
        const testId = testPart.id;
        const originalStock = testPart.stock;
        const newStock = originalStock + 100;
        
        console.log(`✅ Testing with Part #${testId}: "${testPart.name}"`);
        console.log(`   Original stock: ${originalStock}`);
        console.log(`   Will update to: ${newStock}`);
        
        // STEP 1: Prime the cache with a SELECT query (using db.js query)
        console.log('\n🔍 STEP 1: Prime cache with SELECT query');
        const primeResult = await dbQuery('SELECT id, name, stock FROM pc_parts WHERE id = $1', [testId]);
        console.log(`✅ Cache primed: stock = ${primeResult.rows[0].stock}`);
        
        // STEP 2: Update stock using db.js query (which includes the FIX)
        console.log('\n✏️ STEP 2: Update stock via db.js query() (includes cache invalidation FIX)');
        await dbQuery('UPDATE pc_parts SET stock = $1 WHERE id = $2', [newStock, testId]);
        console.log(`✅ Database updated: stock = ${newStock}`);
        console.log(`   ⚡ Cache should have been invalidated automatically`);
        
        // STEP 3: Query via db.js query (should get FRESH data from DB, not stale cache)
        console.log('\n📦 STEP 3: Query via db.js query() (should return updated value)');
        const cachedResult = await dbQuery('SELECT id, name, stock FROM pc_parts WHERE id = $1', [testId]);
        const cachedStock = cachedResult.rows[0].stock;
        console.log(`📦 Result: stock = ${cachedStock}`);
        
        // STEP 4: Query database directly to double-check
        console.log('\n🔎 STEP 4: Query database directly (verify DB has new value)');
        const directResult = await verifyPool.query('SELECT id, name, stock FROM pc_parts WHERE id = $1', [testId]);
        const directStock = directResult.rows[0].stock;
        console.log(`✅ Direct DB result: stock = ${directStock}`);
        
        // VERIFICATION
        console.log('\n' + '═'.repeat(70));
        console.log('🔬 VERIFICATION RESULTS:');
        console.log(`   Database value:     ${directStock} ${directStock === newStock ? '✅' : '❌'}`);
        console.log(`   Cached value:       ${cachedStock} ${cachedStock === newStock ? '✅' : '❌'}`);
        console.log(`   Expected (updated): ${newStock}`);
        
        // Restore original value
        console.log('\n🔄 Restoring original stock value...');
        await verifyPool.query('UPDATE pc_parts SET stock = $1 WHERE id = $2', [originalStock, testId]);
        console.log(`✅ Restored to: ${originalStock}`);
        
        // Result
        if (directStock === newStock && cachedStock === newStock) {
            console.log('\n✅ BUG FIXED!');
            console.log('   Both database and cache return the updated value!');
            console.log('   Cache invalidation is working correctly.');
            await verifyPool.end();
            return true;
        } else if (directStock === newStock && cachedStock === originalStock) {
            console.log('\n❌ BUG STILL EXISTS!');
            console.log('   Database has new value, but cache still returns old value!');
            console.log('   Cache invalidation is NOT working.');
            await verifyPool.end();
            return false;
        } else {
            console.log('\n⚠️ UNEXPECTED STATE!');
            console.log(`   DB: ${directStock}, Cache: ${cachedStock}`);
            await verifyPool.end();
            return null;
        }
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        await verifyPool.end();
        throw error;
    }
}

// Run test
require('dotenv').config();
testCacheInvalidationBug()
    .then((result) => {
        console.log('\n' + '═'.repeat(70));
        console.log(result === true ? '✨ BUG FIXED - CACHE INVALIDATION WORKS!' : result === false ? '🐛 BUG STILL EXISTS' : '❓ UNCLEAR');
        process.exit(result === true ? 0 : 1);
    })
    .catch((err) => {
        console.error('\n💥 Test execution failed:', err);
        process.exit(1);
    });
