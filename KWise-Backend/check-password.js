require('dotenv').config();
const { query } = require('./config/db');
const bcrypt = require('bcrypt');

async function checkPassword() {
    try {
        const result = await query("SELECT email, password FROM users WHERE email = 'ludwig@kwise.com'");
        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log(`User: ${user.email}`);
            
            // Test common passwords
            const testPasswords = ['admin123', 'password', 'humbleludwig13', 'admin', '123456'];
            
            for (const testPass of testPasswords) {
                const isMatch = await bcrypt.compare(testPass, user.password);
                if (isMatch) {
                    console.log(`✅ Correct password: ${testPass}`);
                    break;
                }
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkPassword();