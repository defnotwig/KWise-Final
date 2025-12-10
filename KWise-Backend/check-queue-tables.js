const { query } = require('./config/db');

async function checkQueueTables() {
    try {
        console.log('🔍 Checking queue-related tables...');
        
        // Check for queue tables
        const tableResult = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE '%queue%' OR table_name LIKE '%counter%')
            ORDER BY table_name
        `);
        
        console.log('\n📋 Found tables:');
        if (tableResult.rows.length === 0) {
            console.log('❌ No queue-related tables found!');
        } else {
            tableResult.rows.forEach(row => {
                console.log(`✅ ${row.table_name}`);
            });
        }

        // Check if orders table has queue columns
        console.log('\n🔍 Checking orders table columns...');
        const columnResult = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            AND table_schema = 'public'
            AND column_name LIKE '%queue%'
            ORDER BY column_name
        `);
        
        console.log('\n📋 Queue-related columns in orders table:');
        if (columnResult.rows.length === 0) {
            console.log('❌ No queue columns found in orders table!');
        } else {
            columnResult.rows.forEach(row => {
                console.log(`✅ ${row.column_name}`);
            });
        }

        // Test order ID generation functions
        console.log('\n🔍 Testing ID generation functions...');
        try {
            const orderIdResult = await query('SELECT generate_formatted_order_id() as order_id');
            console.log('✅ Order ID generation:', orderIdResult.rows[0].order_id);
        } catch (err) {
            console.log('❌ Order ID function error:', err.message);
        }

        try {
            const transactionIdResult = await query('SELECT generate_formatted_transaction_id() as transaction_id');
            console.log('✅ Transaction ID generation:', transactionIdResult.rows[0].transaction_id);
        } catch (err) {
            console.log('❌ Transaction ID function error:', err.message);
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    }
    
    process.exit(0);
}

checkQueueTables();