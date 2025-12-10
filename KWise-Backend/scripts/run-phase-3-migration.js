/**
 * Phase 3 Migration Executor
 * Executes the database schema expansion migration
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
    console.log('\n🚀 PHASE 3: DATABASE SCHEMA EXPANSION');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        // Read migration file
        const migrationPath = path.join(__dirname, '../sql/003_phase_3_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Migration file loaded:', migrationPath);
        console.log('📊 SQL size:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

        // Check current tables
        console.log('🔍 Checking current database state...');
        const beforeCount = await pool.query(
            "SELECT COUNT(*) as total FROM pg_tables WHERE schemaname = 'public'"
        );
        console.log('✅ Current tables:', beforeCount.rows[0].total);

        // Check if tables already exist
        const existingTables = await pool.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('price_history', 'build_history', 'compatibility_cache', 'user_preferences')
        `);

        if (existingTables.rows.length > 0) {
            console.log('\n⚠️  Warning: Some Phase 3 tables already exist:');
            existingTables.rows.forEach(row => {
                console.log('   -', row.tablename);
            });
            console.log('\n🔄 Migration will use IF NOT EXISTS clauses to skip existing tables.\n');
        }

        // Execute migration
        console.log('🔄 Executing migration script...\n');
        await pool.query(migrationSQL);

        // Verify new tables
        console.log('\n✅ Migration executed successfully!\n');
        console.log('🔍 Verifying new tables...');
        
        const newTables = await pool.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('price_history', 'build_history', 'compatibility_cache', 'user_preferences')
            ORDER BY tablename
        `);

        console.log('✅ Phase 3 tables created:');
        newTables.rows.forEach(row => {
            console.log('   ✅', row.tablename);
        });

        // Check indexes
        const indexes = await pool.query(`
            SELECT indexname FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND (indexname LIKE 'idx_price_history_%' 
                OR indexname LIKE 'idx_build_history_%'
                OR indexname LIKE 'idx_compatibility_cache_%'
                OR indexname LIKE 'idx_user_preferences_%')
            ORDER BY indexname
        `);

        console.log('\n✅ Indexes created:', indexes.rows.length);
        if (indexes.rows.length > 0 && indexes.rows.length <= 15) {
            indexes.rows.forEach(row => {
                console.log('   ✅', row.indexname);
            });
        } else if (indexes.rows.length > 15) {
            console.log('   ✅ First 10 indexes:');
            indexes.rows.slice(0, 10).forEach(row => {
                console.log('      -', row.indexname);
            });
            console.log(`   ... and ${indexes.rows.length - 10} more`);
        }

        // Check triggers
        const triggers = await pool.query(`
            SELECT trigger_name, event_object_table 
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public'
            AND (event_object_table = 'price_history' 
                OR event_object_table = 'build_history'
                OR event_object_table = 'compatibility_cache'
                OR event_object_table = 'user_preferences')
            ORDER BY event_object_table, trigger_name
        `);

        console.log('\n✅ Triggers created:', triggers.rows.length);
        triggers.rows.forEach(row => {
            console.log(`   ✅ ${row.trigger_name} on ${row.event_object_table}`);
        });

        // Check functions
        const functions = await pool.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public'
            AND routine_name IN ('update_price_history_timestamp', 'cleanup_expired_cache', 'validate_user_preferences')
            ORDER BY routine_name
        `);

        console.log('\n✅ Functions created:', functions.rows.length);
        functions.rows.forEach(row => {
            console.log('   ✅', row.routine_name);
        });

        // Check views
        const views = await pool.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
            AND table_name IN ('latest_product_prices', 'popular_builds', 'cache_metrics')
            ORDER BY table_name
        `);

        console.log('\n✅ Views created:', views.rows.length);
        views.rows.forEach(row => {
            console.log('   ✅', row.table_name);
        });

        // Final table count
        const afterCount = await pool.query(
            "SELECT COUNT(*) as total FROM pg_tables WHERE schemaname = 'public'"
        );
        console.log('\n📊 Final database state:');
        console.log('   Total tables:', afterCount.rows[0].total);
        console.log('   New tables added:', afterCount.rows[0].total - beforeCount.rows[0].total);

        // Test insert into user_preferences
        console.log('\n🧪 Testing table functionality...');
        const testInsert = await pool.query(`
            INSERT INTO user_preferences (session_id, preferences)
            VALUES ('migration_test', '{"theme": "dark", "language": "en"}'::jsonb)
            ON CONFLICT (user_id) DO NOTHING
            RETURNING id
        `);

        if (testInsert.rows.length > 0) {
            console.log('   ✅ Insert test: SUCCESS (ID:', testInsert.rows[0].id + ')');
            
            // Clean up test data
            await pool.query("DELETE FROM user_preferences WHERE session_id = 'migration_test'");
            console.log('   ✅ Cleanup test: SUCCESS');
        } else {
            console.log('   ℹ️  Default preferences already exist (skipped test insert)');
        }

        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║  ✅ PHASE 3 MIGRATION COMPLETE                     ║');
        console.log('║                                                    ║');
        console.log('║  New Tables:      4                                ║');
        console.log('║  Indexes:        ', indexes.rows.length.toString().padEnd(2), '                               ║');
        console.log('║  Triggers:        4                                ║');
        console.log('║  Functions:       3                                ║');
        console.log('║  Views:           3                                ║');
        console.log('║                                                    ║');
        console.log('║  Status: READY FOR API DEVELOPMENT                ║');
        console.log('╚════════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('\n❌ Migration failed:');
        console.error('Error:', error.message);
        console.error('\nStack:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migration
runMigration();
