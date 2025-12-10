const { connectDB, query, closePool } = require('./config/db');

(async () => {
    try {
        await connectDB();
        console.log('🔄 Running presence_status migration...');
        
        // Add presence_status column
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS presence_status VARCHAR(20) DEFAULT 'offline'
        `);
        
        // Add index for better performance
        await query(`
            CREATE INDEX IF NOT EXISTS idx_users_presence_status 
            ON users(presence_status)
        `);
        
        // Update existing users to have offline status
        await query(`
            UPDATE users 
            SET presence_status = 'offline' 
            WHERE presence_status IS NULL
        `);
        
        console.log('✅ Migration completed successfully');
        console.log('📊 Checking migration results...');
        
        // Verify the migration
        const result = await query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'presence_status'
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ presence_status column exists:', result.rows[0]);
        } else {
            console.log('❌ presence_status column not found');
        }
        
        await closePool();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
})();
