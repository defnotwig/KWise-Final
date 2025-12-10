const bcrypt = require('bcrypt');
const db = require('./config/db');

async function updateTestPassword() {
    try {
        const hash = bcrypt.hashSync('testpass123', 12);
        await db.query('UPDATE users SET password = $1 WHERE email = $2', [hash, 'test@pcwise.com']);
        console.log('✅ Password updated for test@pcwise.com to: testpass123');
    } catch (error) {
        console.error('❌ Error updating password:', error);
    } finally {
        process.exit();
    }
}

updateTestPassword();
