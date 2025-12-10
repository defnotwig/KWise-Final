const { query } = require('./config/db');

async function checkAuditLogs() {
    try {
        console.log('🔍 Checking audit_logs table structure...\n');
        
        // Check column structure
        const columns = await query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'audit_logs' 
            ORDER BY ordinal_position
        `);
        console.log('📋 Audit Logs Columns:');
        console.table(columns.rows);

        // Check current max ID and sequence
        const stats = await query(`
            SELECT 
                MAX(id) as max_id, 
                COUNT(*) as total_records,
                (SELECT last_value FROM audit_logs_id_seq) as sequence_value
            FROM audit_logs
        `);
        console.log('\n📊 Current Statistics:');
        console.table(stats.rows);

        // Check recent records
        const recent = await query(`
            SELECT id, user_id, action, entity, created_at 
            FROM audit_logs 
            ORDER BY id DESC 
            LIMIT 10
        `);
        console.log('\n📝 Recent Audit Logs:');
        console.table(recent.rows);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAuditLogs();
