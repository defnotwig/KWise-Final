const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function fixTableStructures() {
    try {
        console.log('🔌 Connecting to database...');
        
        // Check and fix CPU table structure
        console.log('🔧 Checking CPU table structure...');
        const cpuColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cpu' 
            ORDER BY ordinal_position
        `);
        
        console.log('CPU columns:', cpuColumns.rows.map(row => row.column_name));
        
        // Add missing price column if it doesn't exist
        const hasPrice = cpuColumns.rows.some(row => row.column_name === 'price');
        if (!hasPrice) {
            console.log('➕ Adding price column to CPU table...');
            await pool.query('ALTER TABLE cpu ADD COLUMN price DECIMAL(10,2)');
            console.log('✅ Price column added to CPU table');
        }
        
        // Fix other tables as needed
        const tables = ['motherboard', 'ram', 'storage', 'gpu', 'psu', 'pc_case', 'cooling', 'monitors', 'headphones', 'keyboard', 'mouse', 'speakers', 'webcams'];
        
        for (const tableName of tables) {
            try {
                const columns = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [tableName]);
                
                const hasPrice = columns.rows.some(row => row.column_name === 'price');
                if (!hasPrice) {
                    console.log(`➕ Adding price column to ${tableName} table...`);
                    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN price DECIMAL(10,2)`);
                    console.log(`✅ Price column added to ${tableName} table`);
                }
                
                console.log(`${tableName} columns:`, columns.rows.map(row => row.column_name));
                
            } catch (err) {
                console.log(`⚠️  Error checking ${tableName}:`, err.message);
            }
        }
        
        console.log('🎉 Table structure fixes completed!');
        
    } catch (error) {
        console.error('❌ Structure fix failed:', error.message);
    } finally {
        await pool.end();
    }
}

fixTableStructures();