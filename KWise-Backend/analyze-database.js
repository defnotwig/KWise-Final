/**
 * Comprehensive Database Analysis Tool
 * Analyzes schema, indexes, performance bottlenecks, and optimization opportunities
 * Optimized for Hyper-V deployment with 2TB NVMe SSD and RTX 5060
 */

const { query, connectDB, closePool } = require('./config/db');
const logger = require('./utils/logger');

const analyzeDatabase = async () => {
  console.log('\n🔍 ========================================');
  console.log('   K-WISE DATABASE COMPREHENSIVE ANALYSIS');
  console.log('========================================\n');

  try {
    await connectDB();

    // 1. Table Sizes and Row Counts
    console.log('📊 TABLE SIZES & ROW COUNTS');
    console.log('─'.repeat(80));
    
    const tableSizes = await query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = schemaname AND table_name = tablename) AS columns
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
      LIMIT 50;
    `);

    tableSizes.rows.forEach(row => {
      console.log(`   ${row.tablename.padEnd(40)} ${row.size.padStart(12)} (${row.columns} cols)`);
    });

    // Get row counts for major tables
    console.log('\n📈 ROW COUNTS (Major Tables)');
    console.log('─'.repeat(80));
    
    const tables = ['pc_parts', 'orders', 'order_items', 'transactions', 'audit_logs', 
                    'compatibility_rules', 'ai_cache', 'price_history', 'compatibility_cache'];
    
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${table.padEnd(30)} ${count.toLocaleString().padStart(15)} rows`);
      } catch (err) {
        console.log(`   ${table.padEnd(30)} ${'Table not found'.padStart(15)}`);
      }
    }

    // 2. Index Analysis
    console.log('\n\n🔎 INDEX ANALYSIS');
    console.log('─'.repeat(80));
    
    const indexes = await query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 30;
    `);

    console.log('   Top indexes by size:');
    indexes.rows.forEach(row => {
      const usage = row.index_scans > 0 ? `${row.index_scans} scans` : 'UNUSED';
      console.log(`   ${row.indexname.padEnd(50)} ${row.index_size.padStart(10)} ${usage.padStart(15)}`);
    });

    // Find unused indexes
    const unusedIndexes = await query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND idx_scan = 0
        AND indexrelid::regclass::text NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(indexrelid) DESC;
    `);

    if (unusedIndexes.rows.length > 0) {
      console.log('\n   ⚠️  UNUSED INDEXES (Consider removing):');
      unusedIndexes.rows.forEach(row => {
        console.log(`   ${row.tablename}.${row.indexname} (${row.index_size})`);
      });
    } else {
      console.log('\n   ✅ All indexes are being used');
    }

    // 3. Missing Indexes Recommendations
    console.log('\n\n💡 MISSING INDEX RECOMMENDATIONS');
    console.log('─'.repeat(80));
    
    const missingIndexes = await query(`
      SELECT
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats
      WHERE schemaname = 'public'
        AND n_distinct > 100
        AND abs(correlation) < 0.1
        AND attname NOT IN (
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = (schemaname||'.'||tablename)::regclass
        )
      ORDER BY n_distinct DESC
      LIMIT 20;
    `);

    if (missingIndexes.rows.length > 0) {
      console.log('   Columns that might benefit from indexes:');
      missingIndexes.rows.forEach(row => {
        console.log(`   CREATE INDEX idx_${row.tablename}_${row.attname} ON ${row.tablename}(${row.attname});`);
      });
    } else {
      console.log('   ✅ No obvious missing indexes detected');
    }

    // 4. Query Performance Stats
    console.log('\n\n⚡ QUERY PERFORMANCE STATISTICS');
    console.log('─'.repeat(80));
    
    const slowQueries = await query(`
      SELECT
        calls,
        total_exec_time::numeric(10,2) as total_time_ms,
        mean_exec_time::numeric(10,2) as avg_time_ms,
        max_exec_time::numeric(10,2) as max_time_ms,
        stddev_exec_time::numeric(10,2) as stddev_ms,
        rows,
        LEFT(query, 100) as query_snippet
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat%'
        AND query NOT LIKE '%pg_catalog%'
      ORDER BY total_exec_time DESC
      LIMIT 15;
    `);

    if (slowQueries.rows.length > 0) {
      console.log('   Slowest queries by total execution time:');
      slowQueries.rows.forEach((row, idx) => {
        console.log(`\n   ${idx + 1}. ${row.query_snippet}...`);
        console.log(`      Calls: ${row.calls}, Avg: ${row.avg_time_ms}ms, Max: ${row.max_time_ms}ms`);
      });
    } else {
      console.log('   ℹ️  pg_stat_statements extension not enabled');
      console.log('   Enable with: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
    }

    // 5. Table Bloat Analysis
    console.log('\n\n📦 TABLE BLOAT ANALYSIS');
    console.log('─'.repeat(80));
    
    const bloat = await query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        n_dead_tup as dead_tuples,
        n_live_tup as live_tuples,
        ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND n_dead_tup > 1000
      ORDER BY n_dead_tup DESC
      LIMIT 15;
    `);

    if (bloat.rows.length > 0) {
      console.log('   Tables with significant dead tuples (consider VACUUM):');
      bloat.rows.forEach(row => {
        const status = row.dead_ratio > 20 ? '⚠️ ' : '   ';
        console.log(`   ${status}${row.tablename.padEnd(30)} ${row.dead_tuples.toString().padStart(10)} dead (${row.dead_ratio}%)`);
      });
    } else {
      console.log('   ✅ No significant table bloat detected');
    }

    // 6. Foreign Key Constraints
    console.log('\n\n🔗 FOREIGN KEY CONSTRAINTS');
    console.log('─'.repeat(80));
    
    const fkeys = await query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    console.log(`   Total foreign keys: ${fkeys.rows.length}`);
    console.log('   Relationships:');
    fkeys.rows.forEach(row => {
      console.log(`   ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
    });

    // 7. Hyper-V Deployment Optimization Recommendations
    console.log('\n\n🚀 HYPER-V DEPLOYMENT RECOMMENDATIONS');
    console.log('─'.repeat(80));
    
    console.log('\n   Hardware Configuration:');
    console.log('   • RTX 5060: Leverage for AI inference (Ollama/DeepSeek R1)');
    console.log('   • 2TB NVMe SSD: Optimize for sequential reads/writes');
    console.log('   • ZeroTier Network: Ensure secure remote access');
    
    console.log('\n   Database Optimizations:');
    console.log('   1. Enable pg_stat_statements for query monitoring');
    console.log('   2. Configure shared_buffers = 25% of RAM');
    console.log('   3. Set effective_cache_size = 75% of RAM');
    console.log('   4. Enable autovacuum for automatic maintenance');
    console.log('   5. Configure max_connections based on expected concurrent users');
    
    console.log('\n   NVMe SSD Optimizations:');
    console.log('   1. Set random_page_cost = 1.1 (NVMe is fast)');
    console.log('   2. Increase checkpoint_completion_target = 0.9');
    console.log('   3. Set wal_buffers = 16MB for better write performance');
    
    console.log('\n   AI/GPU Optimizations:');
    console.log('   1. Run Ollama service with GPU passthrough');
    console.log('   2. Configure circuit breaker with 45s timeout');
    console.log('   3. Implement response caching for frequent queries');
    
    console.log('\n   ZeroTier Network Security:');
    console.log('   1. Configure JWT authentication with short expiry');
    console.log('   2. Enable rate limiting (1000 req/min for admin)');
    console.log('   3. Use HTTPS with SSL/TLS certificates');
    console.log('   4. Implement IP whitelisting for admin access');

    // 8. Phase 3 Readiness Check
    console.log('\n\n✅ PHASE 3 READINESS CHECK');
    console.log('─'.repeat(80));
    
    const requiredTables = [
      'pc_parts', 'compatibility_rules', 'price_history', 'build_history',
      'compatibility_cache', 'user_preferences', 'ai_cache'
    ];
    
    console.log('   Required tables for Phase 3:');
    for (const table of requiredTables) {
      try {
        const result = await query(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
        console.log(`   ✅ ${table.padEnd(30)} Ready`);
      } catch (err) {
        console.log(`   ❌ ${table.padEnd(30)} MISSING - Needs creation`);
      }
    }

    // 9. Performance Summary
    console.log('\n\n📊 PERFORMANCE SUMMARY');
    console.log('─'.repeat(80));
    
    const cacheHitRatio = await query(`
      SELECT 
        ROUND(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2) AS cache_hit_ratio
      FROM pg_stat_database 
      WHERE datname = current_database();
    `);
    
    const hitRatio = parseFloat(cacheHitRatio.rows[0].cache_hit_ratio) || 0;
    console.log(`   Cache Hit Ratio: ${hitRatio}% ${hitRatio > 95 ? '✅ Excellent' : hitRatio > 90 ? '⚠️ Good' : '❌ Needs Improvement'}`);
    
    const connections = await query(`
      SELECT count(*) as total_connections,
             count(*) FILTER (WHERE state = 'active') as active,
             count(*) FILTER (WHERE state = 'idle') as idle
      FROM pg_stat_activity
      WHERE datname = current_database();
    `);
    
    console.log(`   Active Connections: ${connections.rows[0].active} / ${connections.rows[0].total_connections} total`);
    
    console.log('\n✅ Database analysis complete!\n');
    
  } catch (error) {
    logger.error('❌ Database analysis failed:', error);
    console.error('\n❌ Error:', error.message);
  } finally {
    await closePool();
  }
};

// Run analysis
analyzeDatabase();
