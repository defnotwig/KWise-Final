const db = require('./config/db');

async function checkActiveUsers() {
    try {
        console.log('🔍 Checking recently active users (last 5 minutes)...\n');
        
        const result = await db.query(`
            SELECT id, name, email, last_active_at, is_online, online_status 
            FROM users 
            WHERE last_active_at >= NOW() - INTERVAL '5 minutes' 
              AND is_active = true 
            ORDER BY last_active_at DESC
        `);
        
        console.log(`Found ${result.rows.length} recently active users:`);
        result.rows.forEach(user => {
            console.log(`- ${user.name} (${user.email})`);
            console.log(`  Last active: ${user.last_active_at}`);
            console.log(`  Online: ${user.is_online}, Status: ${user.online_status}\n`);
        });

        console.log('🔍 Checking ALL users with their status...\n');
        
        const allUsers = await db.query(`
            SELECT id, name, email, last_active_at, is_online, online_status 
            FROM users 
            WHERE is_active = true 
            ORDER BY last_active_at DESC NULLS LAST
        `);
        
        console.log(`Found ${allUsers.rows.length} total active users:`);
        allUsers.rows.forEach(user => {
            const isRecentlyActive = user.last_active_at && 
                new Date(user.last_active_at) >= new Date(Date.now() - 5 * 60 * 1000);
            console.log(`- ${user.name} (${user.email}) - ${isRecentlyActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
            console.log(`  Last active: ${user.last_active_at || 'Never'}`);
            console.log(`  Online: ${user.is_online}, Status: ${user.online_status}\n`);
        });
        
    } catch (error) {
        console.error('❌ Error checking active users:', error);
    } finally {
        process.exit();
    }
}

checkActiveUsers();
