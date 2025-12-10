const db = require('./config/db');
const logger = require('./utils/logger');

async function updateDatabaseSchema() {
    try {
        console.log('🔍 Checking database schema for admin activity tracking...\n');

        // Check if last_admin_access column exists
        const columnCheck = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
              AND column_name = 'last_admin_access'
        `);

        if (columnCheck.rows.length === 0) {
            console.log('❌ last_admin_access column not found');
            console.log('🔧 Adding last_admin_access column to users table...');

            await db.query(`
                ALTER TABLE users 
                ADD COLUMN last_admin_access TIMESTAMP WITH TIME ZONE DEFAULT NULL
            `);

            // Add index for better performance
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_users_last_admin_access 
                ON users(last_admin_access) 
                WHERE last_admin_access IS NOT NULL
            `);

            console.log('✅ last_admin_access column added successfully');
        } else {
            console.log('✅ last_admin_access column already exists');
        }

        // Check current user table structure
        console.log('\n🔍 Current users table structure:');
        const tableStructure = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);

        tableStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // Test the admin activity tracking functionality
        console.log('\n🧪 Testing admin activity tracking queries...');

        // Test query for active admin users
        const activeAdmins = await db.query(`
            SELECT 
                id, name, email, role, 
                last_active_at, last_admin_access, 
                online_status, is_online
            FROM users 
            WHERE 
                is_active = true 
                AND last_active_at >= NOW() - INTERVAL '5 minutes'
                AND (
                    online_status = 'active_admin' 
                    OR last_admin_access >= NOW() - INTERVAL '10 minutes'
                )
            ORDER BY last_admin_access DESC NULLS LAST, last_active_at DESC
        `);

        console.log(`✅ Active admin users query successful: ${activeAdmins.rows.length} results`);

        // Test updating admin presence
        if (activeAdmins.rows.length > 0) {
            const testUserId = activeAdmins.rows[0].id;
            console.log(`🧪 Testing admin presence update for user ID: ${testUserId}`);

            await db.query(`
                UPDATE users 
                SET 
                    last_active_at = NOW(),
                    last_admin_access = NOW(),
                    is_online = true,
                    online_status = 'active_admin',
                    updated_at = NOW()
                WHERE id = $1 AND is_active = true
            `, [testUserId]);

            console.log('✅ Admin presence update test successful');
        }

        console.log('\n🎉 Database schema update complete!');
        console.log('✅ Admin activity tracking is ready to use');

    } catch (error) {
        console.error('❌ Database schema update failed:', error);
        logger.error('Database schema update error:', error);
    } finally {
        process.exit();
    }
}

updateDatabaseSchema();
