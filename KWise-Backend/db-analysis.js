const db = require('./config/db');
const connectDB = db.connectDB;
const query = db.query;

(async () => {
    try {
        await connectDB();
        console.log('✅ Database connected');
        
        // Get table list
        const tables = await query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema='public' 
            ORDER BY table_name;
        `);
        console.log('📋 Tables:', tables.rows.map(r => r.table_name).join(', '));
        
        // Get table sizes and row counts
        const criticalTables = ['users', 'pc_parts', 'orders', 'audit_logs', 'password_resets'];
        const tableStats = {};
        
        for (const table of criticalTables) {
            try {
                const rowCount = await query(`SELECT COUNT(*) as count FROM "${table}"`);
                const size = await query(`SELECT pg_total_relation_size('"${table}"') as size_bytes`);
                tableStats[table] = {
                    rows: parseInt(rowCount.rows[0].count),
                    size: parseInt(size.rows[0].size_bytes)
                };
                console.log(`📊 ${table}: ${rowCount.rows[0].count} rows, ${size.rows[0].size_bytes} bytes`);
            } catch (e) {
                console.log(`❌ ${table}: Table not found or error - ${e.message}`);
                tableStats[table] = { error: e.message };
            }
        }
        
        // Get schema information for critical tables
        console.log('\n📋 Schema Information:');
        for (const table of ['users', 'pc_parts']) {
            try {
                const schema = await query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = '${table}' AND table_schema = 'public'
                    ORDER BY ordinal_position;
                `);
                console.log(`\n🏗️ ${table} schema:`);
                schema.rows.forEach(col => {
                    console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
                });
            } catch (e) {
                console.log(`❌ ${table} schema error: ${e.message}`);
            }
        }
        
        // Sample data from critical tables
        console.log('\n📄 Sample Data:');
        for (const table of criticalTables) {
            try {
                const sample = await query(`SELECT * FROM "${table}" ORDER BY id DESC LIMIT 3`);
                console.log(`\n📋 ${table} sample (last 3 rows):`);
                if (sample.rows.length > 0) {
                    console.log('Columns:', Object.keys(sample.rows[0]).join(', '));
                    sample.rows.forEach((row, i) => {
                        console.log(`  Row ${i + 1}: ${Object.values(row).slice(0, 5).join(' | ')}`);
                    });
                } else {
                    console.log('  No data found');
                }
            } catch (e) {
                console.log(`❌ ${table} sample error: ${e.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        process.exit();
    }
})();
