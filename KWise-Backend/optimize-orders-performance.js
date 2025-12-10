const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function optimizeOrdersPerformance() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Starting orders table performance optimization...');
        
        // Read and execute the optimization script
        const fs = require('fs');
        const path = require('path');
        const sqlFile = path.join(__dirname, 'sql', 'optimize-orders-performance.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            if (statement.trim()) {
                console.log('Executing:', statement.trim().substring(0, 50) + '...');
                await client.query(statement);
            }
        }
        
        console.log('✅ Orders table performance optimization completed successfully!');
        console.log('📊 Transaction history queries should now be much faster.');
        
    } catch (error) {
        console.error('❌ Error optimizing orders table:', error.message);
        console.error('Full error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the optimization
optimizeOrdersPerformance().catch(console.error);
