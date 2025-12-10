/**
 * K-Wise Queue Cleanup Script
 * Automatically fixes common queue management issues
 */

const { query } = require('./config/db');
const logger = require('./utils/logger');

async function cleanupQueueIssues() {
    console.log('\n🧹 K-WISE QUEUE CLEANUP SCRIPT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    let totalFixed = 0;

    try {
        // Cleanup 1: Release completed/cancelled orders from queue_management
        console.log('CLEANUP 1: Releasing Completed/Cancelled Orders');
        console.log('-'.repeat(60));
        
        const releaseResult = await query(`
            UPDATE queue_management qm
            SET 
                status = 'available',
                order_id = NULL,
                completed_at = NOW(),
                updated_at = NOW()
            FROM orders o
            WHERE qm.order_id = o.id
            AND o.status IN ('completed', 'cancelled')
            AND qm.status != 'available'
            RETURNING qm.queue_number, o.order_id_formatted, o.status
        `);
        
        if (releaseResult.rows.length > 0) {
            console.log(`✅ Released ${releaseResult.rows.length} queue numbers:`);
            console.table(releaseResult.rows);
            totalFixed += releaseResult.rows.length;
        } else {
            console.log('✅ No queues need releasing');
        }

        // Cleanup 2: Synchronize status and queue_status fields
        console.log('\nCLEANUP 2: Synchronizing Status Fields');
        console.log('-'.repeat(60));
        
        // Map order status to valid queue_status:
        // status: pending -> queue_status: waiting or assigned (keep existing)
        // status: processing -> queue_status: processing
        // status: completed -> queue_status: completed
        // status: cancelled -> queue_status: cancelled
        
        const syncResult = await query(`
            UPDATE orders
            SET queue_status = 
                CASE 
                    WHEN status = 'processing' THEN 'processing'
                    WHEN status = 'completed' THEN 'completed'
                    WHEN status = 'cancelled' THEN 'cancelled'
                    WHEN status = 'pending' AND queue_status NOT IN ('waiting', 'assigned', 'processing', 'ready') THEN 'waiting'
                    ELSE queue_status
                END,
                updated_at = NOW()
            WHERE (
                (status = 'processing' AND queue_status != 'processing') OR
                (status = 'completed' AND queue_status != 'completed') OR
                (status = 'cancelled' AND queue_status != 'cancelled') OR
                (status = 'pending' AND queue_status NOT IN ('waiting', 'assigned', 'processing', 'ready'))
            )
            RETURNING id, order_id_formatted, status, queue_status
        `);
        
        if (syncResult.rows.length > 0) {
            console.log(`✅ Synchronized ${syncResult.rows.length} orders:`);
            console.table(syncResult.rows.slice(0, 10)); // Show first 10 only
            totalFixed += syncResult.rows.length;
        } else {
            console.log('✅ All statuses already synchronized');
        }

        // Cleanup 3: Fix orphaned queue_management entries
        console.log('\nCLEANUP 3: Cleaning Orphaned Queue Entries');
        console.log('-'.repeat(60));
        
        const orphanResult = await query(`
            UPDATE queue_management qm
            SET 
                status = 'available',
                order_id = NULL,
                updated_at = NOW()
            WHERE qm.order_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM orders o 
                WHERE o.id = qm.order_id
            )
            RETURNING queue_number
        `);
        
        if (orphanResult.rows.length > 0) {
            console.log(`✅ Cleaned ${orphanResult.rows.length} orphaned entries`);
            totalFixed += orphanResult.rows.length;
        } else {
            console.log('✅ No orphaned entries found');
        }

        // Cleanup 4: Remove orders without items (if very old)
        console.log('\nCLEANUP 4: Checking Orders Without Items');
        console.log('-'.repeat(60));
        
        const orphanOrders = await query(`
            SELECT 
                o.id,
                o.order_id_formatted,
                o.created_at
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'pending'
            AND o.created_at < NOW() - INTERVAL '1 hour'
            GROUP BY o.id
            HAVING COUNT(oi.id) = 0
        `);
        
        if (orphanOrders.rows.length > 0) {
            console.log(`⚠️  WARNING: Found ${orphanOrders.rows.length} orders without items (older than 1 hour)`);
            console.log('These should be investigated manually');
            console.table(orphanOrders.rows);
        } else {
            console.log('✅ No old orders without items');
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('CLEANUP SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Issues Fixed: ${totalFixed}`);
        
        if (totalFixed > 0) {
            console.log('\n✅ Queue management cleaned successfully!');
            console.log('\nRECOMMENDATIONS:');
            console.log('1. Restart admin frontend (Ctrl+F5)');
            console.log('2. Clear browser localStorage');
            console.log('3. Test Complete/Cancel operations');
        } else {
            console.log('\n✅ No issues found - system is healthy!');
        }
        
        console.log('\n' + '='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ CLEANUP FAILED:', error.message);
        logger.error('Cleanup script error:', error);
        throw error;
    }
}

// Run cleanup
if (require.main === module) {
    cleanupQueueIssues()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { cleanupQueueIssues };
