const { connectDB, query, closePool } = require('./config/db');

(async () => {
    try {
        await connectDB();
        console.log('Connected to database...');
        
        // Check if messages table exists
        const result = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = $2
        `, ['public', 'messages']);
        
        console.log('Messages table exists:', result.rows.length > 0);
        
        if (result.rows.length === 0) {
            console.log('Creating messages table...');
            await query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    sender_id INTEGER REFERENCES users(id),
                    recipient_id INTEGER REFERENCES users(id),
                    content TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            `);
            
            // Create indexes for better performance
            await query(`CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id)`);
            await query(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);
            
            console.log('Messages table created successfully');
        }
        
        await closePool();
    } catch (error) {
        console.error('Error:', error);
    }
})();
