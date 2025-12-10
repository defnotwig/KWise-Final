const { query } = require('./config/db');

(async () => {
    try {
        await query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'self-order'");
        console.log('✅ service_type column added');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();