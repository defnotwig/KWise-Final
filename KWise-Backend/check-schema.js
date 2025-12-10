const db = require('./config/db');

async function checkSchema() {
  try {
    const schema = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts' 
      AND table_schema = 'public' 
      ORDER BY ordinal_position
    `);
    
    console.log('pc_parts schema:');
    console.log(JSON.stringify(schema.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
