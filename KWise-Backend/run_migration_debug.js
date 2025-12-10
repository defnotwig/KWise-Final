const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function runMigrationInChunks() {
    try {
        console.log('🔌 Connecting to database...');
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'sql', 'category_specifications_migration.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📁 Reading migration file...');
        console.log(`📏 File size: ${sqlContent.length} characters`);
        
        // Split the content by major sections
        const sections = sqlContent.split(/-- =============/);
        
        console.log(`📑 Found ${sections.length} sections`);
        
        // Execute each section separately
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i].trim();
            if (section.length === 0) continue;
            
            console.log(`\n🔧 Processing section ${i + 1}...`);
            try {
                await pool.query(section);
                console.log(`✅ Section ${i + 1} completed successfully`);
            } catch (error) {
                console.error(`❌ Section ${i + 1} failed:`, error.message);
                console.log(`📄 Section content preview:`, section.substring(0, 200) + '...');
                
                // Try to find and fix common issues
                if (error.message.includes('syntax error')) {
                    console.log('🔍 Attempting to identify syntax error...');
                    
                    // Split by statements and test each
                    const statements = section.split(';').filter(stmt => stmt.trim().length > 0);
                    
                    for (let j = 0; j < statements.length; j++) {
                        const statement = statements[j].trim() + ';';
                        if (statement === ';') continue;
                        
                        try {
                            await pool.query(statement);
                            console.log(`  ✅ Statement ${j + 1} OK`);
                        } catch (stmtError) {
                            console.error(`  ❌ Statement ${j + 1} failed:`, stmtError.message);
                            console.log(`  📝 Statement:`, statement.substring(0, 100) + '...');
                            break; // Stop on first error in this section
                        }
                    }
                }
                break; // Stop on first section error
            }
        }
        
        // Verify tables were created
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 
                'pc_case', 'cooling', 'monitors', 'headphones', 'keyboard', 
                'mouse', 'speakers', 'webcams'
            )
            ORDER BY table_name;
        `);
        
        console.log('\n🗃️  Tables found:', tableCheck.rows.map(row => row.table_name));
        
        // Check data counts
        const tables = ['cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 'pc_case', 'cooling', 'monitors', 'headphones', 'keyboard', 'mouse', 'speakers', 'webcams'];
        
        console.log('\n📊 Data counts:');
        for (const table of tables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`  ${table}: ${countResult.rows[0].count} records`);
            } catch (err) {
                console.log(`  ${table}: Table not found or error`);
            }
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

runMigrationInChunks();