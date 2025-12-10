/**
 * Check AI Metrics Table Schema
 * Diagnose column mismatch causing database error
 */

const db = require('../config/db');

async function checkSchema() {
  try {
    console.log('🔍 Checking ai_metrics table schema...\n');
    
    // Get table schema
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'ai_metrics' AND table_schema = 'public' 
      ORDER BY ordinal_position
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ ERROR: ai_metrics table does not exist!\n');
      console.log('Need to run migration: 001-enhanced-ai-schema.sql\n');
      process.exit(1);
    }
    
    console.log('✅ ai_metrics table exists\n');
    console.log('Table Schema:');
    console.log('─'.repeat(80));
    result.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('─'.repeat(80));
    console.log(`\nTotal columns: ${result.rows.length}\n`);
    
    // Check what the code is trying to insert
    console.log('📝 Code is trying to INSERT these columns:');
    console.log('─'.repeat(80));
    const insertColumns = [
      'scenario',
      'success',
      'source',
      'latency_ms',
      'confidence',
      'prompt_tokens',
      'circuit_state',
      'error_type',
      'created_at'
    ];
    
    insertColumns.forEach(col => {
      const exists = result.rows.find(r => r.column_name === col);
      if (exists) {
        console.log(`✅ ${col.padEnd(25)} - EXISTS (${exists.data_type})`);
      } else {
        console.log(`❌ ${col.padEnd(25)} - MISSING!`);
      }
    });
    console.log('─'.repeat(80));
    
    await db.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkSchema();
