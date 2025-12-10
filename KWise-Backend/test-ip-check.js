const { query } = require('./config/db');

async function checkIP() {
    try {
        const result = await query(`
            SELECT * FROM ip_access_control 
            WHERE ip_address = $1
        `, ['192.168.100.106']);
        
        console.log('Database results:');
        console.log(JSON.stringify(result.rows, null, 2));
        
        if (result.rows.length > 0) {
            const ip = result.rows[0];
            console.log('\n✅ IP FOUND IN DATABASE:');
            console.log(`   Status: ${ip.status}`);
            console.log(`   Device: ${ip.device_name}`);
            console.log(`   Blocked: ${ip.status === 'blocked'}`);
        } else {
            console.log('\n❌ IP NOT FOUND IN DATABASE');
            console.log('   This IP is not in ip_access_control table');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkIP();
