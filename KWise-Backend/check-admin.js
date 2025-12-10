require('dotenv').config();
const { query } = require('./config/db');

async function checkAdminUsers() {
    try {
        const result = await query("SELECT email, role FROM users WHERE role = 'superadmin' OR role = 'admin' LIMIT 3");
        console.log('Admin users:');
        result.rows.forEach(user => {
            console.log(`Email: ${user.email} | Role: ${user.role}`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkAdminUsers();