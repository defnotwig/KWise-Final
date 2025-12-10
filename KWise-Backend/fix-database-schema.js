/**
 * Database Schema Fix for Messages and Notifications
 * Ensures all tables have the correct structure for the admin functionality
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'humbleludwig13',
    database: process.env.DB_NAME || 'KWiseDB'
});

async function fixDatabaseSchema() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Starting database schema fixes...');
        
        // 1. Check and create messages table
        console.log('📧 Checking messages table...');
        
        const messagesTableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'messages'
            );
        `);
        
        if (!messagesTableCheck.rows[0].exists) {
            console.log('📧 Creating messages table...');
            await client.query(`
                CREATE TABLE messages (
                    id SERIAL PRIMARY KEY,
                    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT false,
                    is_deleted BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    read_at TIMESTAMP WITH TIME ZONE,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                CREATE INDEX idx_messages_from_user ON messages(from_user_id);
                CREATE INDEX idx_messages_to_user ON messages(to_user_id);
                CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
                CREATE INDEX idx_messages_conversation ON messages(from_user_id, to_user_id, created_at DESC);
            `);
            console.log('✅ Messages table created successfully');
        } else {
            console.log('✅ Messages table already exists');
            
            // Check if all required columns exist
            const columnsCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'messages' AND table_schema = 'public'
            `);
            
            const existingColumns = columnsCheck.rows.map(row => row.column_name);
            const requiredColumns = ['id', 'from_user_id', 'to_user_id', 'content', 'is_read', 'is_deleted', 'created_at', 'read_at', 'updated_at'];
            
            for (const column of requiredColumns) {
                if (!existingColumns.includes(column)) {
                    console.log(`📧 Adding missing column: ${column}`);
                    
                    switch (column) {
                        case 'is_read':
                            await client.query('ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT false');
                            break;
                        case 'is_deleted':
                            await client.query('ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN DEFAULT false');
                            break;
                        case 'read_at':
                            await client.query('ALTER TABLE messages ADD COLUMN read_at TIMESTAMP WITH TIME ZONE');
                            break;
                        case 'updated_at':
                            await client.query('ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
                            break;
                    }
                }
            }
        }
        
        // 2. Check and create notifications table
        console.log('🔔 Checking notifications table...');
        
        const notificationsTableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'notifications'
            );
        `);
        
        if (!notificationsTableCheck.rows[0].exists) {
            console.log('🔔 Creating notifications table...');
            await client.query(`
                CREATE TABLE notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    type VARCHAR(50) DEFAULT 'info',
                    is_read BOOLEAN DEFAULT false,
                    action_url VARCHAR(500),
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    read_at TIMESTAMP WITH TIME ZONE,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                CREATE INDEX idx_notifications_user_id ON notifications(user_id);
                CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
                CREATE INDEX idx_notifications_is_read ON notifications(is_read);
                CREATE INDEX idx_notifications_type ON notifications(type);
            `);
            console.log('✅ Notifications table created successfully');
        } else {
            console.log('✅ Notifications table already exists');
        }
        
        // 3. Ensure users table has required columns for profiles
        console.log('👤 Checking users table columns...');
        
        const userColumnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
        `);
        
        const existingUserColumns = userColumnsCheck.rows.map(row => row.column_name);
        const requiredUserColumns = ['profile_image', 'is_online', 'online_status', 'presence_status', 'last_active_at', 'last_admin_access'];
        
        for (const column of requiredUserColumns) {
            if (!existingUserColumns.includes(column)) {
                console.log(`👤 Adding missing column to users: ${column}`);
                
                switch (column) {
                    case 'profile_image':
                        await client.query('ALTER TABLE users ADD COLUMN profile_image VARCHAR(255)');
                        break;
                    case 'is_online':
                        await client.query('ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT false');
                        break;
                    case 'online_status':
                        await client.query("ALTER TABLE users ADD COLUMN online_status VARCHAR(20) DEFAULT 'offline'");
                        break;
                    case 'presence_status':
                        await client.query("ALTER TABLE users ADD COLUMN presence_status VARCHAR(20) DEFAULT 'offline'");
                        break;
                    case 'last_active_at':
                        await client.query('ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
                        break;
                    case 'last_admin_access':
                        await client.query('ALTER TABLE users ADD COLUMN last_admin_access TIMESTAMP WITH TIME ZONE');
                        break;
                }
            }
        }
        
        // 4. Create indexes if they don't exist
        console.log('📊 Creating performance indexes...');
        
        const indexQueries = [
            'CREATE INDEX IF NOT EXISTS idx_users_presence_status ON users(presence_status)',
            'CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(last_active_at DESC)',
            'CREATE INDEX IF NOT EXISTS idx_users_online_status ON users(online_status)',
            'CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online)',
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)'
        ];
        
        for (const indexQuery of indexQueries) {
            try {
                await client.query(indexQuery);
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.warn(`Warning creating index: ${error.message}`);
                }
            }
        }
        
        console.log('✅ All database schema fixes completed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing database schema:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the fix
fixDatabaseSchema()
    .then(() => {
        console.log('🎉 Database schema fix completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Database schema fix failed:', error);
        process.exit(1);
    });
