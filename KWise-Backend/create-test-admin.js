const { query } = require('./config/db');
const bcrypt = require('bcrypt');

async function createTestAdmin() {
    try {
        const password = 'test123';
        const hash = await bcrypt.hash(password, 10);
        
        // Check if user exists
        const existing = await query('SELECT id FROM users WHERE email = $1', ['testadmin@kwise.com']);
        
        if (existing.rows.length > 0) {
            // Update password  
            await query('UPDATE users SET password = $1, role = $2, is_active = $3 WHERE email = $4', [hash, 'admin', true, 'testadmin@kwise.com']);
            console.log('✅ Updated test admin password');
        } else {
            // Create new user
            await query(`
                INSERT INTO users (name, email, username, password, role, is_active, email_verified) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, ['Test Admin', 'testadmin@kwise.com', 'testadmin', hash, 'admin', true, true]);
            console.log('✅ Created test admin user');
        }
        
        console.log('Credentials:');
        console.log('Email: testadmin@kwise.com');
        console.log('Password: test123');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createTestAdmin();