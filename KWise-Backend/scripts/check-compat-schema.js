#!/usr/bin/env node

require('dotenv').config();
const { query } = require('../config/db');

async function checkSchema() {
  try {
    console.log('📊 Checking compatibility_rules table schema...\n');
    
    // Get all columns in compatibility_rules table
    const result = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'compatibility_rules'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in compatibility_rules table:');
    console.log('=====================================');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n📊 Sample data:');
    const sampleData = await query('SELECT * FROM compatibility_rules LIMIT 3');
    console.log(JSON.stringify(sampleData.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
