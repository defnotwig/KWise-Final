#!/usr/bin/env node

/**
 * Run Critical Schema Fixes
 * Applies the fix-critical-schema-issues.sql migration
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

async function runMigration() {
  console.log('🔧 Running Critical Schema Fixes...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', 'fix-critical-schema-issues.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Read migration file:', sqlPath);
    console.log('📊 Executing SQL migration...\n');
    
    // Execute the migration
    const result = await query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Verification Results:');
    
    // Run verification queries
    const categoriesCount = await query('SELECT COUNT(*) FROM categories');
    console.log(`  ✓ Categories table: ${categoriesCount.rows[0].count} rows`);
    
    const queueCount = await query('SELECT COUNT(*) FROM order_queue');
    console.log(`  ✓ Order queue table: ${queueCount.rows[0].count} rows`);
    
    const rulesCount = await query('SELECT COUNT(*) FROM compatibility_rules');
    console.log(`  ✓ Compatibility rules: ${rulesCount.rows[0].count} rows`);
    
    // Check for orphaned parts
    const orphanedCheck = await query(`
      SELECT COUNT(*) 
      FROM pc_parts 
      WHERE category_id IS NOT NULL 
        AND category_id NOT IN (SELECT id FROM categories)
    `);
    console.log(`  ✓ Orphaned PC parts: ${orphanedCheck.rows[0].count}`);
    
    // Verify schema columns
    const schemaCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'compatibility_rules' 
        AND column_name IN ('category1', 'category2', 'field', 'operator')
      ORDER BY column_name
    `);
    console.log(`  ✓ Compatibility rules columns: ${schemaCheck.rows.map(r => r.column_name).join(', ')}`);
    
    console.log('\n🎉 All critical schema issues have been fixed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

runMigration();
