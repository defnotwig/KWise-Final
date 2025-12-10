const { query } = require('./config/db');

async function fixAuditLogsSequence() {
    try {
        console.log('🔧 Fixing audit_logs sequence...\n');
        
        // Get current max ID
        const maxResult = await query('SELECT MAX(id) as max_id FROM audit_logs');
        const maxId = maxResult.rows[0].max_id || 0;
        console.log(`📊 Current max ID: ${maxId}`);

        // Reset sequence to max ID + 1
        const nextVal = maxId + 1;
        await query(`SELECT setval('audit_logs_id_seq', $1, false)`, [nextVal]);
        console.log(`✅ Sequence reset to: ${nextVal}`);

        // Verify the fix
        const verifyResult = await query("SELECT last_value FROM audit_logs_id_seq");
        console.log(`🔍 Verified sequence value: ${verifyResult.rows[0].last_value}`);

        // Test insert
        console.log('\n🧪 Testing insert...');
        const testResult = await query(`
            INSERT INTO audit_logs (user_id, action, entity, description) 
            VALUES (1, 'TEST', 'test_entity', 'Sequence fix verification') 
            RETURNING id
        `);
        console.log(`✅ Test record inserted with ID: ${testResult.rows[0].id}`);

        // Clean up test record
        await query('DELETE FROM audit_logs WHERE action = $1', ['TEST']);
        console.log('🧹 Test record cleaned up');

        console.log('\n✅ Audit logs sequence fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

fixAuditLogsSequence();
