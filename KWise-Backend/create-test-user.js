require('dotenv').config();
const { query } = require('./config/db');
const bcrypt = require('bcrypt');

async function createTestUser() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Check if test user exists
        const existingUser = await query("SELECT id FROM users WHERE email = 'test@admin.com'");
        
        if (existingUser.rows.length > 0) {
            // Update existing user
            await query("UPDATE users SET password = $1 WHERE email = 'test@admin.com'", [hashedPassword]);
            console.log('✅ Updated test@admin.com password to admin123');
        } else {
            // Create new test user
            await query(`
                INSERT INTO users (email, password, role, first_name, last_name, status, created_at, updated_at)
                VALUES ($1, $2, 'admin', 'Test', 'Admin', 'active', NOW(), NOW())
            `, ['test@admin.com', hashedPassword]);
            console.log('✅ Created test@admin.com with password admin123');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createTestUser();