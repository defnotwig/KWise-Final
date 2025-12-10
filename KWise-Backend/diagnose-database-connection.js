#!/usr/bin/env node
/**
 * 🔍 K-Wise Database Connection Diagnostic Tool
 * 
 * This script performs comprehensive database connection diagnostics:
 * 1. Checks environment variables
 * 2. Verifies PostgreSQL module installation
 * 3. Tests database connection with detailed error reporting
 * 4. Checks for required tables (queue_management)
 * 5. Provides actionable fix instructions
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('='.repeat(80));
console.log('🔍 K-WISE DATABASE CONNECTION DIAGNOSTIC TOOL');
console.log('='.repeat(80));
console.log('');

// ==========================================
// STEP 1: Check Environment Variables
// ==========================================
console.log('1️⃣  ENVIRONMENT VARIABLES CHECK');
console.log('-'.repeat(80));

const requiredEnvVars = {
  'DB_HOST': process.env.DB_HOST,
  'DB_PORT': process.env.DB_PORT,
  'DB_NAME': process.env.DB_NAME,
  'DB_USER': process.env.DB_USER,
  'DB_PASSWORD': process.env.DB_PASSWORD
};

let envVarsOk = true;
for (const [key, value] of Object.entries(requiredEnvVars)) {
  const status = value ? '✅' : '❌';
  const display = key === 'DB_PASSWORD' && value ? '***SET***' : (value || '⚠️  NOT SET');
  console.log(`   ${status} ${key}: ${display}`);
  if (!value) envVarsOk = false;
}

console.log('');
if (!envVarsOk) {
  console.error('❌ CRITICAL: Missing required environment variables!');
  console.error('');
  console.error('💡 FIX: Check your .env file in KWise-Backend directory:');
  console.error('   DB_HOST=localhost');
  console.error('   DB_PORT=5432');
  console.error('   DB_NAME=KWiseDB');
  console.error('   DB_USER=postgres');
  console.error('   DB_PASSWORD=your_password_here');
  console.error('');
  process.exit(1);
}

// ==========================================
// STEP 2: Check PostgreSQL Module
// ==========================================
console.log('2️⃣  POSTGRESQL MODULE CHECK');
console.log('-'.repeat(80));

try {
  const pgVersion = require('pg/package.json').version;
  console.log(`   ✅ pg module installed (version ${pgVersion})`);
  console.log('');
} catch (err) {
  console.error('   ❌ pg module NOT installed');
  console.error('');
  console.error('💡 FIX: Install PostgreSQL module:');
  console.error('   npm install pg');
  console.error('');
  process.exit(1);
}

// ==========================================
// STEP 3: Test Database Connection
// ==========================================
console.log('3️⃣  DATABASE CONNECTION TEST');
console.log('-'.repeat(80));

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
  max: 1
};

console.log('   Connection Settings:');
console.log(`      Host: ${dbConfig.host}`);
console.log(`      Port: ${dbConfig.port}`);
console.log(`      Database: ${dbConfig.database}`);
console.log(`      User: ${dbConfig.user}`);
console.log('');

const pool = new Pool(dbConfig);

async function testDatabaseConnection() {
  let client;
  
  try {
    console.log('   ⏳ Attempting to connect to PostgreSQL...');
    
    client = await pool.connect();
    console.log('   ✅ CONNECTION SUCCESSFUL!');
    console.log('');
    
    // Test simple query
    console.log('   ⏳ Testing query execution...');
    const timeResult = await client.query('SELECT NOW() as server_time, version() as version');
    console.log('   ✅ Query executed successfully!');
    console.log(`      Server Time: ${timeResult.rows[0].server_time}`);
    console.log(`      PostgreSQL Version: ${timeResult.rows[0].version.split(',')[0]}`);
    console.log('');
    
    // Check database size
    const sizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size($1)) as size
    `, [dbConfig.database]);
    console.log(`   📊 Database Size: ${sizeResult.rows[0].size}`);
    console.log('');
    
    // Check for queue_management table
    console.log('4️⃣  QUEUE MANAGEMENT TABLE CHECK');
    console.log('-'.repeat(80));
    
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'queue_management'
      ) as exists
    `);
    
    if (tableCheckResult.rows[0].exists) {
      console.log('   ✅ queue_management table exists');
      
      const countResult = await client.query('SELECT COUNT(*) as count FROM queue_management');
      const count = parseInt(countResult.rows[0].count);
      console.log(`   📊 Queue records: ${count} / 99`);
      
      if (count === 0) {
        console.log('   ⚠️  Table exists but has no queue numbers');
        console.log('');
        console.log('💡 FIX: Initialize queue numbers:');
        console.log('   Run this SQL in your database:');
        console.log('');
        console.log('   INSERT INTO queue_management (queue_number)');
        console.log('   SELECT generate_series(1, 99)');
        console.log('   ON CONFLICT (queue_number) DO NOTHING;');
        console.log('');
      } else if (count < 99) {
        console.log(`   ⚠️  Only ${count} queue numbers found (expected 99)`);
      } else {
        console.log('   ✅ All queue numbers initialized');
      }
    } else {
      console.log('   ❌ queue_management table does NOT exist');
      console.log('');
      console.log('💡 FIX: Create the queue_management table:');
      console.log('   Run this SQL in your database:');
      console.log('');
      console.log('   CREATE TABLE queue_management (');
      console.log('     id SERIAL PRIMARY KEY,');
      console.log('     queue_number INTEGER NOT NULL UNIQUE,');
      console.log('     is_active BOOLEAN DEFAULT true,');
      console.log('     last_used TIMESTAMP,');
      console.log('     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      console.log('   );');
      console.log('');
      console.log('   INSERT INTO queue_management (queue_number)');
      console.log('   SELECT generate_series(1, 99);');
      console.log('');
    }
    
    // Check other critical tables
    console.log('');
    console.log('5️⃣  CRITICAL TABLES CHECK');
    console.log('-'.repeat(80));
    
    const criticalTables = ['users', 'pc_parts', 'orders', 'audit_logs'];
    
    for (const tableName of criticalTables) {
      const exists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = $1
        ) as exists
      `, [tableName]);
      
      const status = exists.rows[0].exists ? '✅' : '❌';
      const message = exists.rows[0].exists ? 'exists' : 'MISSING';
      
      console.log(`   ${status} ${tableName}: ${message}`);
      
      if (exists.rows[0].exists) {
        const count = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`      Records: ${count.rows[0].count}`);
      }
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ DIAGNOSTIC COMPLETE - DATABASE CONNECTION WORKING!');
    console.log('='.repeat(80));
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('   1. If queue_management table issues found, run the SQL fixes above');
    console.log('   2. Try starting your server: npm start');
    console.log('   3. Check server logs for any other initialization errors');
    console.log('');
    
    return true;
    
  } catch (err) {
    console.error('   ❌ CONNECTION FAILED!');
    console.error('');
    console.error('   Error Details:');
    console.error(`      Code: ${err.code || 'UNKNOWN'}`);
    console.error(`      Message: ${err.message}`);
    console.error('');
    
    // Provide specific fix instructions based on error code
    switch (err.code) {
      case 'ECONNREFUSED':
        console.error('💡 FIX: PostgreSQL is NOT RUNNING');
        console.error('');
        console.error('   Windows:');
        console.error('      1. Press Win+R, type "services.msc", press Enter');
        console.error('      2. Find "postgresql-x64-15" (or similar)');
        console.error('      3. Right-click → Start');
        console.error('');
        console.error('   OR using PowerShell (as Administrator):');
        console.error('      Start-Service -Name "postgresql-x64-15"');
        console.error('');
        console.error('   Mac/Linux:');
        console.error('      sudo service postgresql start');
        console.error('   OR');
        console.error('      brew services start postgresql');
        console.error('');
        console.error('   Then check if it\'s running:');
        console.error('      netstat -an | findstr 5432  (Windows)');
        console.error('      netstat -an | grep 5432     (Mac/Linux)');
        break;
        
      case '28P01':
        console.error('💡 FIX: WRONG PASSWORD');
        console.error('');
        console.error('   Your DB_PASSWORD in .env is incorrect.');
        console.error('');
        console.error('   To reset PostgreSQL password:');
        console.error('   1. Connect as postgres superuser:');
        console.error('      psql -U postgres');
        console.error('   2. Change password:');
        console.error('      ALTER USER postgres PASSWORD \'new_password\';');
        console.error('   3. Update .env file with new password');
        break;
        
      case '3D000':
        console.error('💡 FIX: DATABASE DOES NOT EXIST');
        console.error('');
        console.error(`   The database "${dbConfig.database}" does not exist.`);
        console.error('');
        console.error('   Create it using:');
        console.error(`      createdb -U postgres ${dbConfig.database}`);
        console.error('');
        console.error('   OR connect to postgres and run:');
        console.error('      psql -U postgres');
        console.error(`      CREATE DATABASE ${dbConfig.database};`);
        break;
        
      case '28000':
        console.error('💡 FIX: INVALID USERNAME');
        console.error('');
        console.error(`   User "${dbConfig.user}" does not exist.`);
        console.error('');
        console.error('   Create user:');
        console.error('      psql -U postgres');
        console.error(`      CREATE USER ${dbConfig.user} WITH PASSWORD 'your_password';`);
        console.error(`      GRANT ALL PRIVILEGES ON DATABASE ${dbConfig.database} TO ${dbConfig.user};`);
        break;
        
      case 'ENOTFOUND':
        console.error('💡 FIX: HOST NOT FOUND');
        console.error('');
        console.error(`   Cannot resolve host "${dbConfig.host}"`);
        console.error('');
        console.error('   Check your DB_HOST in .env:');
        console.error('      - Use "localhost" for local development');
        console.error('      - Use "127.0.0.1" if localhost doesn\'t work');
        break;
        
      default:
        console.error('💡 TROUBLESHOOTING STEPS:');
        console.error('');
        console.error('   1. Verify PostgreSQL is installed:');
        console.error('      psql --version');
        console.error('');
        console.error('   2. Check if PostgreSQL is running:');
        console.error('      Windows: Get-Service -Name postgresql*');
        console.error('      Mac/Linux: sudo service postgresql status');
        console.error('');
        console.error('   3. Try connecting manually:');
        console.error(`      psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database}`);
        console.error('');
        console.error('   4. Check PostgreSQL logs for more details');
    }
    
    console.error('');
    console.error('='.repeat(80));
    console.error('');
    
    return false;
    
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the diagnostic
testDatabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('💥 UNEXPECTED ERROR:', err.message);
    process.exit(1);
  });
