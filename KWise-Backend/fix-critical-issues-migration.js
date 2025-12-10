// Fix Messages and Notifications Migration Script
const { query } = require('./config/db');

async function runMigration() {
    try {
        console.log('🔧 Starting Messages and Notifications Migration...');
        
        // 1. Fix notifications constraint to include 'message' type
        console.log('📝 Updating notifications constraint...');
        await query(`
            ALTER TABLE notifications 
            DROP CONSTRAINT IF EXISTS notifications_type_check;
        `);
        
        await query(`
            ALTER TABLE notifications 
            ADD CONSTRAINT valid_notification_type 
            CHECK (type IN ('order', 'user', 'stock', 'system', 'payment', 'inventory', 'alert', 'maintenance', 'security', 'message'));
        `);
        
        console.log('✅ Notifications constraint updated successfully');
        
        // 2. Verify messages table exists with correct structure
        console.log('📝 Verifying messages table...');
        const messagesTable = await query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'messages' 
            ORDER BY ordinal_position;
        `);
        
        if (messagesTable.rows.length === 0) {
            console.log('❌ Messages table not found, creating...');
            await query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT FALSE,
                    is_deleted BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            
            // Add indexes for performance
            await query(`
                CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
                CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
                CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
                CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(from_user_id, to_user_id);
            `);
            
            console.log('✅ Messages table created successfully');
        } else {
            console.log('✅ Messages table exists with columns:', messagesTable.rows.map(r => r.column_name).join(', '));
        }
        
        // 3. Test the constraint
        console.log('🧪 Testing notifications constraint...');
        try {
            await query(`
                INSERT INTO notifications (user_id, title, message, type, created_by) 
                VALUES (1, 'Test Message', 'Testing message type', 'message', 1)
            `);
            console.log('✅ Message type constraint test passed');
            
            // Clean up test notification
            await query(`DELETE FROM notifications WHERE title = 'Test Message' AND type = 'message'`);
        } catch (error) {
            console.error('❌ Message type constraint test failed:', error.message);
        }
        
        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigration };
