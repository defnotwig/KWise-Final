// Fix Existing Notifications Data and Constraint
const { query } = require('./config/db');

async function fixNotificationsData() {
    try {
        console.log('🔧 Fixing existing notifications data...');
        
        // 1. Check what invalid types exist
        const invalidTypes = await query(`
            SELECT DISTINCT type, COUNT(*) as count 
            FROM notifications 
            WHERE type NOT IN ('order', 'user', 'stock', 'system', 'payment', 'inventory', 'alert', 'maintenance', 'security', 'message')
            GROUP BY type;
        `);
        
        console.log('📊 Invalid notification types found:', invalidTypes.rows);
        
        // 2. Fix invalid types by mapping them to valid ones
        for (const row of invalidTypes.rows) {
            let newType = 'system'; // default fallback
            
            // Map invalid types to valid ones
            switch (row.type) {
                case 'profile_update':
                case 'profile':
                    newType = 'user';
                    break;
                case 'message_notification':
                case 'chat':
                    newType = 'message';
                    break;
                case 'product':
                case 'inventory_update':
                    newType = 'inventory';
                    break;
                case 'order_update':
                case 'transaction':
                    newType = 'order';
                    break;
                default:
                    newType = 'system';
            }
            
            console.log(`🔄 Updating ${row.count} notifications from '${row.type}' to '${newType}'`);
            await query(`
                UPDATE notifications 
                SET type = $1 
                WHERE type = $2
            `, [newType, row.type]);
        }
        
        // 3. Now add the constraint
        console.log('📝 Dropping old constraint...');
        await query(`
            ALTER TABLE notifications 
            DROP CONSTRAINT IF EXISTS notifications_type_check;
        `);
        
        await query(`
            ALTER TABLE notifications 
            DROP CONSTRAINT IF EXISTS valid_notification_type;
        `);
        
        console.log('📝 Adding new constraint...');
        await query(`
            ALTER TABLE notifications 
            ADD CONSTRAINT valid_notification_type 
            CHECK (type IN ('order', 'user', 'stock', 'system', 'payment', 'inventory', 'alert', 'maintenance', 'security', 'message'));
        `);
        
        console.log('✅ Notifications constraint updated successfully');
        
        // 4. Verify the fix
        const typeCheck = await query(`
            SELECT type, COUNT(*) as count 
            FROM notifications 
            GROUP BY type 
            ORDER BY count DESC;
        `);
        
        console.log('📊 Final notification types:', typeCheck.rows);
        
        console.log('🎉 Notifications data fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    fixNotificationsData()
        .then(() => {
            console.log('✅ Fix script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fix script failed:', error);
            process.exit(1);
        });
}

module.exports = { fixNotificationsData };
