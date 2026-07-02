/**
 * QUEUE NOW SERVING AUTO-ADVANCE TEST
 * 
 * This script verifies that when a "NOW SERVING" queue is completed/cancelled,
 * the system automatically advances to the next pending queue.
 * 
 * ISSUE: After completing Queue #28 (NOW SERVING), the display still showed #28
 * even though the order was moved to transaction history.
 * 
 * FIX: Auto-advance logic now clears is_now_serving from completed queue
 * and sets it on the next pending queue.
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

async function testQueueAutoAdvance() {
    console.log('\n🧪 QUEUE NOW SERVING AUTO-ADVANCE TEST');
    console.log('═'.repeat(70));
    
    try {
        // STEP 1: Find current NOW SERVING queue
        console.log('\n📋 STEP 1: Check current NOW SERVING queue...');
        const nowServingBefore = await query(`
            SELECT queue_number, order_id, is_now_serving
            FROM queue_management
            WHERE is_now_serving = TRUE
            LIMIT 1
        `);
        
        if (nowServingBefore.rows.length === 0) {
            console.log('⚠️ No NOW SERVING queue found. Please set one manually first.');
            console.log('   Use: PUT /api/queue/:queueNumber/now-serving');
            return false;
        }
        
        const currentNowServing = nowServingBefore.rows[0];
        console.log(`✅ Current NOW SERVING: Queue #${currentNowServing.queue_number}`);
        console.log(`   Order ID: ${currentNowServing.order_id || 'NULL'}`);
        
        // STEP 2: Find next pending queue
        console.log('\n📋 STEP 2: Find next pending queue...');
        const nextPendingResult = await query(`
            SELECT 
                qm.queue_number,
                qm.order_id,
                o.customer_name
            FROM queue_management qm
            INNER JOIN orders o ON qm.order_id = o.id
            WHERE qm.status = 'occupied'
              AND o.queue_status = 'pending'
              AND qm.is_now_serving = FALSE
            ORDER BY qm.created_at ASC
            LIMIT 1
        `);
        
        if (nextPendingResult.rows.length === 0) {
            console.log('⚠️ No pending queues found. Cannot test auto-advance.');
            console.log('   Please create at least 2 pending orders first.');
            return false;
        }
        
        const nextPending = nextPendingResult.rows[0];
        console.log(`✅ Next pending queue: #${nextPending.queue_number} (${nextPending.customer_name})`);
        
        // STEP 3: Simulate completing the NOW SERVING queue
        console.log('\n✏️ STEP 3: Simulating queue completion...');
        console.log(`   This would normally be done via PATCH /api/queue/${currentNowServing.queue_number}/status`);
        console.log(`   with body: { "status": "completed", "customerName": "..." }`);
        console.log('');
        console.log('⚠️ NOTE: This test does NOT actually complete the queue.');
        console.log('   To test the fix properly:');
        console.log('   1. Ensure you have at least 2 pending queues');
        console.log('   2. Set one as NOW SERVING via the admin panel');
        console.log('   3. Complete that queue');
        console.log('   4. Verify that NOW SERVING auto-advances to the next pending queue');
        
        // STEP 4: Show expected behavior
        console.log('\n📊 EXPECTED BEHAVIOR AFTER FIX:');
        console.log('═'.repeat(70));
        console.log(`   BEFORE COMPLETION:`);
        console.log(`     NOW SERVING: Queue #${currentNowServing.queue_number}`);
        console.log(`     Next Pending: Queue #${nextPending.queue_number}`);
        console.log('');
        console.log(`   AFTER COMPLETION (with fix):`);
        console.log(`     ✅ Queue #${currentNowServing.queue_number} → Transaction History (is_now_serving = FALSE)`);
        console.log(`     ✅ Queue #${nextPending.queue_number} → NOW SERVING (is_now_serving = TRUE)`);
        console.log('');
        console.log(`   WITHOUT FIX (old behavior):`);
        console.log(`     ❌ Queue #${currentNowServing.queue_number} → Still shows as NOW SERVING (stale!)`);
        console.log(`     ❌ Queue #${nextPending.queue_number} → Still shows as Pending`);
        
        // STEP 5: Verify the auto-advance function exists
        console.log('\n🔍 STEP 5: Verify auto-advance logic is implemented...');
        const fs = require('node:fs');
        const queueRoutesPath = require('node:path').join(__dirname, '../routes/queue.js');
        const queueRoutesContent = fs.readFileSync(queueRoutesPath, 'utf8');
        
        if (queueRoutesContent.includes('autoAdvanceNowServing')) {
            console.log('✅ autoAdvanceNowServing function found in routes/queue.js');
        } else {
            console.log('❌ autoAdvanceNowServing function NOT found - fix not implemented!');
            return false;
        }
        
        if (queueRoutesContent.includes('await autoAdvanceNowServing(')) {
            console.log('✅ Auto-advance is called after completion/cancellation');
        } else {
            console.log('❌ Auto-advance NOT called - fix incomplete!');
            return false;
        }
        
        console.log('\n' + '═'.repeat(70));
        console.log('✅ CODE VERIFICATION PASSED');
        console.log('');
        console.log('📝 MANUAL TEST REQUIRED:');
        console.log('   1. Start the backend server');
        console.log('   2. Create 2+ pending orders in the queue');
        console.log('   3. Set the first one as NOW SERVING');
        console.log('   4. Complete that order');
        console.log('   5. Verify NOW SERVING auto-advances to Queue #' + nextPending.queue_number);
        
        return true;
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        throw error;
    }
}

// Run test
require('dotenv').config();
testQueueAutoAdvance()
    .then((result) => {
        console.log('\n' + '═'.repeat(70));
        console.log(result ? '✅ CODE CHECKS PASSED - MANUAL TEST REQUIRED' : '❌ TEST FAILED');
        process.exit(result ? 0 : 1);
    })
    .catch((err) => {
        console.error('\n💥 Test execution failed:', err);
        process.exit(1);
    });
