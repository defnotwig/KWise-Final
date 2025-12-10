/**
 * Database Performance Analysis Tool
 * Analyzes PostgreSQL performance, identifies slow queries, and recommends optimizations
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

async function analyzeDatabase() {
    console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║         DATABASE PERFORMANCE ANALYSIS - Phase 3.2          ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    try {
        // 1. Check PostgreSQL version and configuration
        await checkPostgreSQLConfig();

        // 2. Analyze cache hit ratio
        await analyzeCacheHitRatio();

        // 3. Identify slow queries
        await analyzeSlowQueries();

        // 4. Check index usage
        await analyzeIndexUsage();

        // 5. Analyze table sizes and bloat
        await analyzeTableSizes();

        // 6. Check for missing indexes
        await identifyMissingIndexes();

        // 7. Analyze query performance
        await testQueryPerformance();

        // 8. Generate recommendations
        await generateRecommendations();

        console.log(`\n${colors.green}${colors.bright}✅ Database analysis complete!${colors.reset}\n`);
        
    } catch (error) {
        console.error(`${colors.red}Error during analysis:${colors.reset}`, error);
    } finally {
        await pool.end();
    }
}

async function checkPostgreSQLConfig() {
    console.log(`${colors.bright}1. PostgreSQL Configuration${colors.reset}`);
    console.log('─'.repeat(70));

    const configChecks = [
        'version()',
        'shared_buffers',
        'effective_cache_size',
        'random_page_cost',
        'work_mem',
        'maintenance_work_mem',
        'max_connections',
        'checkpoint_completion_target',
        'wal_buffers'
    ];

    for (const setting of configChecks) {
        try {
            let query;
            if (setting === 'version()') {
                query = 'SELECT version()';
            } else {
                query = `SHOW ${setting}`;
            }
            
            const result = await pool.query(query);
            const value = result.rows[0][setting === 'version()' ? 'version' : setting];
            
            console.log(`  ${colors.cyan}${setting.padEnd(30)}${colors.reset} ${value}`);
        } catch (error) {
            console.log(`  ${colors.yellow}${setting.padEnd(30)}${colors.reset} ${colors.red}Not available${colors.reset}`);
        }
    }
    console.log();
}

async function analyzeCacheHitRatio() {
    console.log(`${colors.bright}2. Cache Hit Ratio Analysis${colors.reset}`);
    console.log('─'.repeat(70));

    const query = `
        SELECT 
            sum(heap_blks_read) as heap_read,
            sum(heap_blks_hit) as heap_hit,
            CASE 
                WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
                ELSE (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100)::numeric(5,2)
            END as cache_hit_ratio
        FROM pg_statio_user_tables;
    `;

    const result = await pool.query(query);
    const ratio = parseFloat(result.rows[0].cache_hit_ratio);
    const heapRead = parseInt(result.rows[0].heap_read);
    const heapHit = parseInt(result.rows[0].heap_hit);

    let status = colors.green;
    let recommendation = 'Excellent! Cache performance is optimal.';
    
    if (ratio < 90) {
        status = colors.red;
        recommendation = 'CRITICAL: Cache hit ratio too low. Increase shared_buffers.';
    } else if (ratio < 95) {
        status = colors.yellow;
        recommendation = 'WARNING: Cache hit ratio could be improved.';
    }

    console.log(`  ${colors.cyan}Heap Blocks Read:${colors.reset}     ${heapRead.toLocaleString()}`);
    console.log(`  ${colors.cyan}Heap Blocks Hit:${colors.reset}      ${heapHit.toLocaleString()}`);
    console.log(`  ${status}Cache Hit Ratio:${colors.reset}      ${ratio}%`);
    console.log(`  ${colors.magenta}Recommendation:${colors.reset}       ${recommendation}`);
    console.log();
}

async function analyzeSlowQueries() {
    console.log(`${colors.bright}3. Slow Query Analysis${colors.reset}`);
    console.log('─'.repeat(70));

    // Check if pg_stat_statements extension exists
    const extCheck = await pool.query(`
        SELECT EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
        ) as has_extension;
    `);

    if (!extCheck.rows[0].has_extension) {
        console.log(`  ${colors.yellow}⚠ pg_stat_statements extension not installed${colors.reset}`);
        console.log(`  ${colors.cyan}To enable: CREATE EXTENSION pg_stat_statements;${colors.reset}`);
        console.log();
        return;
    }

    const query = `
        SELECT 
            substring(query, 1, 100) as query_snippet,
            calls,
            total_exec_time::numeric(10,2) as total_time_ms,
            mean_exec_time::numeric(10,2) as mean_time_ms,
            max_exec_time::numeric(10,2) as max_time_ms
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT 10;
    `;

    try {
        const result = await pool.query(query);
        
        if (result.rows.length === 0) {
            console.log(`  ${colors.green}✅ No slow queries found${colors.reset}`);
        } else {
            console.log(`  ${colors.yellow}Top 10 Slowest Queries:${colors.reset}\n`);
            result.rows.forEach((row, idx) => {
                const color = row.mean_time_ms > 100 ? colors.red : row.mean_time_ms > 50 ? colors.yellow : colors.green;
                console.log(`  ${idx + 1}. ${color}${row.mean_time_ms}ms avg${colors.reset} (${row.calls} calls)`);
                console.log(`     ${row.query_snippet}...`);
            });
        }
    } catch (error) {
        console.log(`  ${colors.yellow}Unable to query pg_stat_statements${colors.reset}`);
    }
    console.log();
}

async function analyzeIndexUsage() {
    console.log(`${colors.bright}4. Index Usage Analysis${colors.reset}`);
    console.log('─'.repeat(70));

    const query = `
        SELECT 
            schemaname,
            relname as tablename,
            indexrelname as indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
        LIMIT 15;
    `;

    const result = await pool.query(query);
    
    console.log(`  ${colors.cyan}Top 15 Most Used Indexes:${colors.reset}\n`);
    result.rows.forEach((row, idx) => {
        const scanColor = row.idx_scan > 10000 ? colors.green : row.idx_scan > 1000 ? colors.yellow : colors.red;
        console.log(`  ${idx + 1}. ${row.indexname.padEnd(50)} ${scanColor}${row.idx_scan.toLocaleString()} scans${colors.reset} (${row.index_size})`);
    });

    // Find unused indexes
    const unusedQuery = `
        SELECT 
            schemaname,
            relname as tablename,
            indexrelname as indexname,
            idx_scan,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes
        WHERE idx_scan < 100
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 10;
    `;

    const unusedResult = await pool.query(unusedQuery);
    
    if (unusedResult.rows.length > 0) {
        console.log(`\n  ${colors.yellow}⚠ Potentially Unused Indexes (< 100 scans):${colors.reset}\n`);
        unusedResult.rows.forEach((row, idx) => {
            console.log(`  ${idx + 1}. ${row.indexname.padEnd(50)} ${colors.red}${row.idx_scan} scans${colors.reset} (${row.index_size})`);
        });
    }
    console.log();
}

async function analyzeTableSizes() {
    console.log(`${colors.bright}5. Table Size Analysis${colors.reset}`);
    console.log('─'.repeat(70));

    const query = `
        SELECT 
            schemaname,
            relname as tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size,
            pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) AS table_size,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - pg_relation_size(schemaname||'.'||relname)) AS indexes_size,
            pg_total_relation_size(schemaname||'.'||relname) as size_bytes
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY size_bytes DESC
        LIMIT 10;
    `;

    const result = await pool.query(query);
    
    console.log(`  ${colors.cyan}Largest Tables:${colors.reset}\n`);
    result.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row.tablename.padEnd(30)} ${colors.green}${row.total_size.padEnd(12)}${colors.reset} (Table: ${row.table_size}, Indexes: ${row.indexes_size})`);
    });
    console.log();
}

async function identifyMissingIndexes() {
    console.log(`${colors.bright}6. Missing Index Analysis${colors.reset}`);
    console.log('─'.repeat(70));

    // Check for sequential scans on large tables
    const query = `
        SELECT 
            schemaname,
            relname as tablename,
            seq_scan,
            seq_tup_read,
            idx_scan,
            CASE 
                WHEN seq_scan + idx_scan = 0 THEN 0
                ELSE (seq_scan::float / (seq_scan + idx_scan) * 100)::numeric(5,2)
            END as seq_scan_percent,
            pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) AS table_size
        FROM pg_stat_user_tables
        WHERE seq_scan > 100
        ORDER BY seq_scan DESC
        LIMIT 10;
    `;

    const result = await pool.query(query);
    
    if (result.rows.length > 0) {
        console.log(`  ${colors.yellow}⚠ Tables with High Sequential Scans (may need indexes):${colors.reset}\n`);
        result.rows.forEach((row, idx) => {
            const color = row.seq_scan_percent > 50 ? colors.red : colors.yellow;
            console.log(`  ${idx + 1}. ${row.tablename.padEnd(30)} ${color}${row.seq_scan.toLocaleString()} seq scans${colors.reset} (${row.seq_scan_percent}% sequential, ${row.table_size})`);
        });
    } else {
        console.log(`  ${colors.green}✅ No tables with excessive sequential scans${colors.reset}`);
    }
    console.log();
}

async function testQueryPerformance() {
    console.log(`${colors.bright}7. Real-World Query Performance Tests${colors.reset}`);
    console.log('─'.repeat(70));

    const tests = [
        {
            name: 'Active Products Query',
            query: `SELECT COUNT(*) FROM pc_parts WHERE is_active = true`,
            target: 30
        },
        {
            name: 'Recent Orders Query',
            query: `SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'`,
            target: 10
        },
        {
            name: 'Compatibility Rules Query',
            query: `SELECT COUNT(*) FROM compatibility_rules`,
            target: 5
        },
        {
            name: 'AI Audit Logs (Last 7 Days)',
            query: `SELECT COUNT(*) FROM ai_audit_logs WHERE created_at >= NOW() - INTERVAL '7 days'`,
            target: 20
        },
        {
            name: 'Product with Specs JOIN',
            query: `
                SELECT COUNT(*) 
                FROM pc_parts p 
                LEFT JOIN product_specs ps ON p.id = ps.product_id 
                WHERE p.is_active = true
            `,
            target: 50
        },
        {
            name: 'Complex Category Query',
            query: `
                SELECT category, COUNT(*) as count, AVG(price) as avg_price
                FROM pc_parts 
                WHERE is_active = true 
                GROUP BY category
            `,
            target: 25
        },
        {
            name: 'User Activity Check',
            query: `SELECT COUNT(*) FROM users WHERE last_active >= NOW() - INTERVAL '24 hours'`,
            target: 10
        }
    ];

    let totalTime = 0;
    let passedTests = 0;

    for (const test of tests) {
        const start = Date.now();
        try {
            await pool.query(test.query);
            const duration = Date.now() - start;
            totalTime += duration;

            const status = duration <= test.target ? colors.green : duration <= test.target * 2 ? colors.yellow : colors.red;
            const icon = duration <= test.target ? '✅' : duration <= test.target * 2 ? '⚠' : '❌';
            
            if (duration <= test.target) passedTests++;

            console.log(`  ${icon} ${test.name.padEnd(40)} ${status}${duration}ms${colors.reset} (target: ${test.target}ms)`);
        } catch (error) {
            console.log(`  ❌ ${test.name.padEnd(40)} ${colors.red}ERROR${colors.reset}`);
        }
    }

    const avgTime = (totalTime / tests.length).toFixed(2);
    const successRate = ((passedTests / tests.length) * 100).toFixed(0);

    console.log(`\n  ${colors.cyan}Summary:${colors.reset}`);
    console.log(`  Average query time: ${avgTime}ms`);
    console.log(`  Tests passed: ${passedTests}/${tests.length} (${successRate}%)`);
    console.log();
}

async function generateRecommendations() {
    console.log(`${colors.bright}8. Optimization Recommendations${colors.reset}`);
    console.log('─'.repeat(70));

    const recommendations = [];

    // Check cache hit ratio
    const cacheQuery = `
        SELECT 
            CASE 
                WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
                ELSE (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100)::numeric(5,2)
            END as cache_hit_ratio
        FROM pg_statio_user_tables;
    `;
    const cacheResult = await pool.query(cacheQuery);
    const cacheRatio = parseFloat(cacheResult.rows[0].cache_hit_ratio);

    if (cacheRatio < 95) {
        recommendations.push({
            priority: 'HIGH',
            category: 'Memory',
            recommendation: `Increase shared_buffers - Current cache hit ratio: ${cacheRatio}%`,
            action: 'Apply postgresql-hyperv.conf (8GB shared_buffers)'
        });
    }

    // Check for missing indexes on price_history (if table exists)
    try {
        const priceHistoryCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'price_history'
            ) as exists;
        `);

        if (!priceHistoryCheck.rows[0].exists) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Schema',
                recommendation: 'Create price_history table for Phase 3.2',
                action: 'Run price tracking schema migration'
            });
        }
    } catch (error) {
        // Table doesn't exist yet
    }

    // Check for WebSocket notification table
    try {
        const notificationCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'notifications'
            ) as exists;
        `);

        if (!notificationCheck.rows[0].exists) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Schema',
                recommendation: 'Create notifications table for real-time updates',
                action: 'Run notification schema migration'
            });
        }
    } catch (error) {
        // Table doesn't exist yet
    }

    // Check ai_audit_logs size (large table optimization)
    const aiLogsSize = await pool.query(`
        SELECT pg_size_pretty(pg_total_relation_size('ai_audit_logs')) as size,
            pg_total_relation_size('ai_audit_logs') as size_bytes
        FROM pg_tables WHERE tablename = 'ai_audit_logs';
    `);

    if (aiLogsSize.rows.length > 0 && aiLogsSize.rows[0].size_bytes > 100 * 1024 * 1024) {
        recommendations.push({
            priority: 'MEDIUM',
            category: 'Maintenance',
            recommendation: `ai_audit_logs is large (${aiLogsSize.rows[0].size}) - consider archiving old data`,
            action: 'Archive logs older than 90 days'
        });
    }

    // Display recommendations
    if (recommendations.length === 0) {
        console.log(`  ${colors.green}✅ No critical optimizations needed!${colors.reset}`);
    } else {
        recommendations.forEach((rec, idx) => {
            const priorityColor = rec.priority === 'HIGH' ? colors.red : rec.priority === 'MEDIUM' ? colors.yellow : colors.cyan;
            console.log(`  ${idx + 1}. ${priorityColor}[${rec.priority}]${colors.reset} ${colors.magenta}${rec.category}${colors.reset}`);
            console.log(`     ${rec.recommendation}`);
            console.log(`     ${colors.cyan}Action:${colors.reset} ${rec.action}`);
            console.log();
        });
    }
}

// Run analysis
analyzeDatabase().catch(console.error);
