const { query } = require('./config/db');

async function fixDualQueueSchema() {
  console.log('🔧 Fixing Dual Queue System Schema\n');
  
  try {
    // 1. Check if serving_position column exists
    console.log('1️⃣ Checking orders table schema...');
    const schemaCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'orders' 
      AND column_name IN ('serving_position', 'is_now_serving', 'serving_started_at');
    `);
    
    const existingColumns = schemaCheck.rows.map(r => r.column_name);
    console.log('   Existing columns:', existingColumns);
    
    // 2. Add missing columns if needed
    if (!existingColumns.includes('serving_position')) {
      console.log('   Adding serving_position column...');
      await query(`
        ALTER TABLE orders 
        ADD COLUMN serving_position VARCHAR(10) CHECK (serving_position IN ('left', 'right', NULL));
      `);
      console.log('   ✅ serving_position added');
    }
    
    if (!existingColumns.includes('is_now_serving')) {
      console.log('   Adding is_now_serving column...');
      await query(`
        ALTER TABLE orders 
        ADD COLUMN is_now_serving BOOLEAN DEFAULT false;
      `);
      console.log('   ✅ is_now_serving added');
    }
    
    if (!existingColumns.includes('serving_started_at')) {
      console.log('   Adding serving_started_at column...');
      await query(`
        ALTER TABLE orders 
        ADD COLUMN serving_started_at TIMESTAMP;
      `);
      console.log('   ✅ serving_started_at added');
    }
    
    // 3. Create index for performance
    console.log('\n2️⃣ Creating performance indexes...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_serving 
      ON orders(is_now_serving, serving_position) 
      WHERE is_now_serving = true;
    `);
    console.log('   ✅ Index created');
    
    // 4. Check current now serving orders
    console.log('\n3️⃣ Current now serving orders:');
    const nowServing = await query(`
      SELECT 
        id as order_id,
        queue_number,
        customer_name,
        status as order_status,
        serving_position,
        is_now_serving
      FROM orders
      WHERE is_now_serving = true
      ORDER BY serving_position;
    `);
    
    if (nowServing.rows.length > 0) {
      console.table(nowServing.rows);
    } else {
      console.log('   No orders currently being served');
    }
    
    // 5. Verify schema is correct
    console.log('\n4️⃣ Final schema verification:');
    const finalSchema = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'orders'
      AND column_name IN ('serving_position', 'is_now_serving', 'serving_started_at', 'status')
      ORDER BY column_name;
    `);
    console.table(finalSchema.rows);
    
    console.log('\n✅ Schema fix completed successfully!');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Schema fix failed:', err);
    process.exit(1);
  }
}

fixDualQueueSchema();
