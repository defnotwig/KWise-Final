/**
 * K-Wise Queue Diagnostic Script
 * Identifies root causes of queue management issues
 */

const { query } = require('./config/db');
const logger = require('./utils/logger');

async function diagnoseQueueIssues() {
    console.log('\n🔍 K-WISE QUEUE DIAGNOSTIC REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    try {
        // Test 1: Check for orders without items
        console.log('TEST 1: Orders Without Items');
        console.log('-'.repeat(60));
        const orphanOrders = await query(`
            SELECT 
                o.id,
                o.order_id_formatted,
                o.queue_number,
                o.customer_name,
                o.status,
                o.queue_status,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status NOT IN ('completed', 'cancelled')
            GROUP BY o.id, o.order_id_formatted, o.queue_number, o.customer_name, o.status, o.queue_status
            HAVING COUNT(oi.id) = 0
        `);
        
        if (orphanOrders.rows.length > 0) {
            console.log(`❌ ISSUE FOUND: ${orphanOrders.rows.length} orders without items`);
            console.table(orphanOrders.rows);
        } else {
            console.log('✅ PASS: All active orders have items');
        }

        // Test 2: Check for orders with default customer names
        console.log('\nTEST 2: Orders with Default Customer Names');
        console.log('-'.repeat(60));
        const defaultNames = await query(`
            SELECT 
                id,
                order_id_formatted,
                queue_number,
                customer_name,
                status,
                queue_status,
                created_at
            FROM orders
            WHERE (
                customer_name = 'Customer' 
                OR customer_name LIKE 'Customer %'
                OR customer_name = 'Kiosk Customer'
                OR customer_name IS NULL
            )
            AND status NOT IN ('completed', 'cancelled')
            ORDER BY queue_number
        `);
        
        if (defaultNames.rows.length > 0) {
            console.log(`⚠️  WARNING: ${defaultNames.rows.length} orders with default names`);
            console.table(defaultNames.rows.slice(0, 10));
        } else {
            console.log('✅ PASS: All active orders have custom names');
        }

        // Test 3: Check for status mismatches
        console.log('\nTEST 3: Status Field Mismatches');
        console.log('-'.repeat(60));
        const statusMismatches = await query(`
            SELECT 
                id,
                order_id_formatted,
                queue_number,
                customer_name,
                status as order_status,
                queue_status,
                CASE 
                    WHEN status != queue_status THEN 'MISMATCH'
                    ELSE 'MATCH'
                END as status_check
            FROM orders
            WHERE status NOT IN ('completed', 'cancelled')
            AND status != queue_status
        `);
        
        if (statusMismatches.rows.length > 0) {
            console.log(`❌ ISSUE FOUND: ${statusMismatches.rows.length} orders with status mismatches`);
            console.table(statusMismatches.rows);
        } else {
            console.log('✅ PASS: All order statuses are synchronized');
        }

        // Test 4: Check queue_management table sync
        console.log('\nTEST 4: Queue Management Table Synchronization');
        console.log('-'.repeat(60));
        const queueSync = await query(`
            SELECT 
                qm.queue_number,
                qm.status as queue_mgmt_status,
                qm.order_id,
                o.id as actual_order_id,
                o.order_id_formatted,
                o.status as order_status,
                o.queue_status as order_queue_status,
                CASE 
                    WHEN qm.order_id IS NOT NULL AND o.id IS NULL THEN 'ORDER_MISSING'
                    WHEN qm.order_id IS NULL AND qm.status != 'available' THEN 'STATUS_ERROR'
                    WHEN o.status IN ('completed', 'cancelled') AND qm.status != 'available' THEN 'NOT_RELEASED'
                    ELSE 'OK'
                END as sync_status
            FROM queue_management qm
            LEFT JOIN orders o ON qm.order_id = o.id
            WHERE qm.order_id IS NOT NULL
            OR qm.status != 'available'
            ORDER BY qm.queue_number
        `);
        
        const syncIssues = queueSync.rows.filter(r => r.sync_status !== 'OK');
        if (syncIssues.length > 0) {
            console.log(`❌ ISSUE FOUND: ${syncIssues.length} queue synchronization issues`);
            console.table(syncIssues);
        } else {
            console.log('✅ PASS: Queue management table is synchronized');
        }

        // Test 5: Check for completed/cancelled orders still in active queue
        console.log('\nTEST 5: Completed/Cancelled Orders in Active Queue');
        console.log('-'.repeat(60));
        const staleOrders = await query(`
            SELECT 
                qm.queue_number,
                qm.status as queue_mgmt_status,
                o.id,
                o.order_id_formatted,
                o.status,
                o.queue_status,
                o.completed_at,
                o.cancelled_at
            FROM queue_management qm
            INNER JOIN orders o ON qm.order_id = o.id
            WHERE o.status IN ('completed', 'cancelled')
            AND qm.status != 'available'
        `);
        
        if (staleOrders.rows.length > 0) {
            console.log(`❌ CRITICAL ISSUE: ${staleOrders.rows.length} completed/cancelled orders still in queue`);
            console.table(staleOrders.rows);
        } else {
            console.log('✅ PASS: No stale orders in active queue');
        }

        // Test 6: Check for missing order_items entries
        console.log('\nTEST 6: Database Integrity - Order Items');
        console.log('-'.repeat(60));
        const itemIntegrity = await query(`
            SELECT 
                o.id,
                o.order_id_formatted,
                o.total_amount,
                COUNT(oi.id) as item_count,
                COALESCE(SUM(oi.amount), 0) as calculated_total
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status NOT IN ('completed', 'cancelled')
            GROUP BY o.id, o.order_id_formatted, o.total_amount
            HAVING COUNT(oi.id) = 0 OR ABS(o.total_amount - COALESCE(SUM(oi.amount), 0)) > 1
        `);
        
        if (itemIntegrity.rows.length > 0) {
            console.log(`❌ ISSUE FOUND: ${itemIntegrity.rows.length} orders with item/amount discrepancies`);
            console.table(itemIntegrity.rows);
        } else {
            console.log('✅ PASS: All orders have matching items and amounts');
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('DIAGNOSTIC SUMMARY');
        console.log('='.repeat(60));
        
        const totalIssues = 
            orphanOrders.rows.length +
            statusMismatches.rows.length +
            syncIssues.length +
            staleOrders.rows.length +
            itemIntegrity.rows.length;
        
        if (totalIssues === 0) {
            console.log('✅ ALL TESTS PASSED - No critical issues found');
        } else {
            console.log(`❌ ISSUES FOUND: ${totalIssues} total problems detected`);
            console.log('\nRECOMMENDED ACTIONS:');
            
            if (orphanOrders.rows.length > 0) {
                console.log('1. Delete or add items to orders without items');
            }
            if (staleOrders.rows.length > 0) {
                console.log('2. Run queue cleanup to release completed/cancelled orders');
            }
            if (statusMismatches.rows.length > 0) {
                console.log('3. Synchronize order status and queue_status fields');
            }
            if (syncIssues.length > 0) {
                console.log('4. Fix queue_management table synchronization');
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('END OF DIAGNOSTIC REPORT\n');

    } catch (error) {
        console.error('\n❌ DIAGNOSTIC FAILED:', error.message);
        logger.error('Diagnostic script error:', error);
    }
}

// Run diagnostics
diagnoseQueueIssues()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
