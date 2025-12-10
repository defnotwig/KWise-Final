const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost', 
    database: 'KWiseDB',
    password: 'humbleludwig13',
    port: 5432,
});

async function checkSchema() {
    try {
        console.log('🔍 Checking birth_date column schema...\n');
        
        const result = await pool.query(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'birth_date'"
        );
        
        if (result.rows.length > 0) {
            console.log('📊 Birth date column schema:');
            console.log('- Column name:', result.rows[0].column_name);
            console.log('- Data type:', result.rows[0].data_type);
            console.log('- Is nullable:', result.rows[0].is_nullable);
        } else {
            console.log('❌ birth_date column not found');
        }
        
        // Also check current timezone settings
        console.log('\n🌍 Database timezone settings:');
        const timezoneResult = await pool.query('SHOW timezone');
        console.log('- Database timezone:', timezoneResult.rows[0].TimeZone);
        
        // Test different date insertion methods
        console.log('\n🧪 Testing different date storage methods:');
        
        // Method 1: Direct string
        console.log('\n1. Direct string insertion:');
        await pool.query("UPDATE users SET birth_date = '2003-12-26' WHERE id = 2");
        let result1 = await pool.query('SELECT birth_date FROM users WHERE id = 2');
        console.log('   Result:', result1.rows[0].birth_date);
        
        // Method 2: With timezone
        console.log('\n2. With local timezone:');
        await pool.query("UPDATE users SET birth_date = '2003-12-26'::date WHERE id = 2");
        let result2 = await pool.query('SELECT birth_date FROM users WHERE id = 2');
        console.log('   Result:', result2.rows[0].birth_date);
        
        // Method 3: Format to local date for display
        console.log('\n3. Formatting for HTML input:');
        const dateObj = result2.rows[0].birth_date;
        const utcDate = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000));
        const formatted = utcDate.toISOString().split('T')[0];
        console.log('   Original date:', dateObj);
        console.log('   UTC adjusted:', utcDate);
        console.log('   Formatted:', formatted);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkSchema();
