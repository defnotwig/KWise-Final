const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

// Get database configuration
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'KWiseDB',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

function classifyTable(tableName) {
    const name = tableName.toLowerCase();

    if (name.includes('ai') || name.includes('ollama') || name.includes('rag') || name.includes('embedding') || name.includes('ml_')) {
        return 'legacy-ai-rag-ml';
    }

    if (name.includes('compatibility') || name.includes('product_spec') || name.includes('rule')) {
        return 'compatibility-spec';
    }

    if (name.includes('order') || name.includes('queue') || name.includes('payment') || name.includes('transaction')) {
        return 'transactional';
    }

    if (name.includes('user') || name.includes('auth') || name.includes('session') || name.includes('token')) {
        return 'identity-access';
    }

    if (name.includes('log') || name.includes('audit') || name.includes('metric') || name.includes('event')) {
        return 'audit-observability';
    }

    if (name.includes('backup') || name.includes('old') || name.includes('temp')) {
        return 'backup-or-temp';
    }

    return 'active-or-unknown';
}

async function runDatabaseInventory() {
    console.log('🔍 Running Database Inventory...\n');
    
    try {
        const results = [];
        
        // 1. List all tables
        console.log('📋 Fetching table list...');
        const tablesResult = await pool.query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        results.push('# Database Inventory Report');
        results.push(`Generated: ${new Date().toISOString()}\n`);
        
        results.push('## Tables Overview');
        results.push('| Table Name | Class | Type | Columns | Rows | Size |');
        results.push('|------------|-------|------|---------|------|------|');
        
        // 2. Get detailed info for each table
        for (const table of tablesResult.rows) {
            const tableName = table.table_name;
            
            try {
                // Get column count
                const colResult = await pool.query(`
                    SELECT COUNT(*) as col_count 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = 'public';
                `, [tableName]);
                
                // Get row count
                const rowResult = await pool.query(`SELECT COUNT(*) as row_count FROM "${tableName}";`);
                
                // Get table size
                const sizeResult = await pool.query(`
                    SELECT pg_size_pretty(pg_total_relation_size($1)) as size;
                `, [tableName]);
                
                const cols = colResult.rows[0].col_count;
                const rows = rowResult.rows[0].row_count;
                const size = sizeResult.rows[0].size;
                
                results.push(`| ${tableName} | ${classifyTable(tableName)} | ${table.table_type} | ${cols} | ${rows} | ${size} |`);
                
                console.log(`✓ ${tableName}: ${rows} rows, ${cols} columns`);
                
            } catch (error) {
                console.log(`✗ Error scanning ${tableName}: ${error.message}`);
                results.push(`| ${tableName} | ${classifyTable(tableName)} | ${table.table_type} | ERROR | ERROR | ERROR |`);
            }
        }
        
        // 3. Find empty tables
        results.push('\n## Empty Tables');
        const emptyTables = [];

        for (const table of tablesResult.rows) {
            try {
                const result = await pool.query(`SELECT COUNT(*) as count FROM "${table.table_name}";`);
                if (Number.parseInt(result.rows[0].count, 10) === 0) {
                    emptyTables.push(table);
                }
            } catch {
                // Ignore tables that cannot be counted; they are already marked in the overview.
            }
        }
        
        if (emptyTables.length > 0) {
            results.push('Empty tables found:');
            emptyTables.forEach(table => {
                results.push(`- ${table.table_name}`);
            });
        } else {
            results.push('No empty tables found.');
        }
        
        // 4. Foreign key relationships
        results.push('\n## Foreign Key Relationships');
        const fkResult = await pool.query(`
            SELECT 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
            ORDER BY tc.table_name;
        `);
        
        if (fkResult.rows.length > 0) {
            results.push('| Table | Column | References Table | References Column |');
            results.push('|-------|--------|------------------|-------------------|');
            fkResult.rows.forEach(row => {
                results.push(`| ${row.table_name} | ${row.column_name} | ${row.foreign_table_name} | ${row.foreign_column_name} |`);
            });
        } else {
            results.push('No foreign key relationships found.');
        }
        
        // 5. Database size and stats
        results.push('\n## Database Statistics');
        const dbStatsResult = await pool.query(`
            SELECT 
                pg_size_pretty(pg_database_size(current_database())) as db_size,
                count(*) as total_tables
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);
        
        results.push(`- **Total Database Size:** ${dbStatsResult.rows[0].db_size}`);
        results.push(`- **Total Tables:** ${dbStatsResult.rows[0].total_tables}`);
        
        // Write results to file
        const outputPath = path.join(__dirname, '../docs/db-scan.md');
        fs.writeFileSync(outputPath, results.join('\n'));
        
        console.log(`\n✅ Database inventory complete!`);
        console.log(`📄 Report saved to: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Database inventory failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    runDatabaseInventory().catch(console.error);
}

module.exports = { runDatabaseInventory };
