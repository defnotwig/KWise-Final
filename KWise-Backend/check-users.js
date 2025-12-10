// Check database users script
const db = require('./config/db');
const bcrypt = require('bcrypt');

async function checkUsers() {
    try {
        console.log('🔍 Checking users in database...');
        
        // Check all users
        const result = await db.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
        
        if (result.rows.length === 0) {
            console.log('❌ No users found in database!');
            console.log('🔧 Creating default admin user...');
            
            // Create default admin user
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            const createUser = await db.query(
                `INSERT INTO users (name, email, password, role, reference_email) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id, name, email, role`,
                ['Admin User', 'admin@kwise.com', hashedPassword, 'superadmin', 'admin@kwise.com']
            );
            
            console.log('✅ Created default admin user:', createUser.rows[0]);
        } else {
            console.log(`✅ Found ${result.rows.length} users:`);
            result.rows.forEach(user => {
                console.log(`- ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
            });
        }
        
        // Test login with admin credentials
        console.log('\n🧪 Testing admin login...');
        const testUser = await db.query('SELECT * FROM users WHERE email = $1', ['admin@kwise.com']);
        
        if (testUser.rows.length > 0) {
            const user = testUser.rows[0];
            console.log('✅ Admin user found:', {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                hasPassword: !!user.password
            });
            
            // Test password comparison
            const isPasswordValid = await bcrypt.compare('admin123', user.password);
            console.log('🔐 Password test result:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
        } else {
            console.log('❌ Admin user not found!');
        }
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkUsers();
