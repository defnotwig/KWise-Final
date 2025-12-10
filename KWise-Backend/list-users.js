const { connectDB, query, closePool } = require('./config/db');

(async () => {
    try {
        await connectDB();
        console.log('Connected to database...');
        
        // Check all user accounts with basic details including reset tokens
        const allUsers = await query(`
          SELECT id, name, email, reference_email, role, is_active,
                 password_reset_token, password_reset_expires, reset_attempts, reset_status
          FROM users 
          WHERE is_active = true 
          ORDER BY role, name
        `);
        console.log('\n=== ALL ACTIVE USERS ===');
        allUsers.rows.forEach(user => {
            console.log(`${user.role.toUpperCase()}: ${user.name} (${user.email}) [ID: ${user.id}]`);
            if (user.reference_email) {
                console.log(`  Reference Email: ${user.reference_email}`);
            }
            if (user.password_reset_token) {
                console.log(`  Reset Token: ${user.password_reset_token}`);
                console.log(`  Reset Expires: ${user.password_reset_expires}`);
                console.log(`  Reset Status: ${user.reset_status}`);
                console.log(`  Reset Attempts: ${user.reset_attempts}`);
            }
            console.log('');
        });
        
        await closePool();
    } catch (error) {
        console.error('Error:', error);
    }
})();
