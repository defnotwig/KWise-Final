#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'KWiseDB';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';

function createBackup() {
    console.log('📦 Creating database backup...');
    
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const backupDir = path.join(__dirname, '../backups');
    const backupFile = path.join(backupDir, `kwise_db_pre_import_${timestamp}.dump`);
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    try {
        // Set environment variables for pg_dump
        const env = {
            ...process.env,
            PGHOST: DB_HOST,
            PGPORT: DB_PORT,
            PGUSER: DB_USER,
            PGPASSWORD: DB_PASSWORD,
            PGDATABASE: DB_NAME
        };
        
        console.log(`🔄 Backing up database ${DB_NAME} to ${backupFile}...`);
        
        // Use pg_dump with custom format
        execSync(`pg_dump -Fc "${DB_NAME}" > "${backupFile}"`, {
            env,
            stdio: 'inherit'
        });
        
        // Check if backup file was created and get its size
        if (fs.existsSync(backupFile)) {
            const stats = fs.statSync(backupFile);
            const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            console.log(`✅ Backup completed successfully!`);
            console.log(`📁 File: ${backupFile}`);
            console.log(`📊 Size: ${fileSizeInMB} MB`);
            
            return backupFile;
        } else {
            throw new Error('Backup file was not created');
        }
        
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        throw error;
    }
}

// Also create a SQL dump for easier inspection
function createSQLBackup() {
    console.log('📄 Creating SQL backup...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const backupDir = path.join(__dirname, '../backups');
    const sqlFile = path.join(backupDir, `kwise_db_pre_import_${timestamp}.sql`);
    
    try {
        const env = {
            ...process.env,
            PGHOST: DB_HOST,
            PGPORT: DB_PORT,
            PGUSER: DB_USER,
            PGPASSWORD: DB_PASSWORD,
            PGDATABASE: DB_NAME
        };
        
        console.log(`🔄 Creating SQL dump to ${sqlFile}...`);
        
        execSync(`pg_dump "${DB_NAME}" > "${sqlFile}"`, {
            env,
            stdio: 'inherit'
        });
        
        if (fs.existsSync(sqlFile)) {
            const stats = fs.statSync(sqlFile);
            const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            console.log(`✅ SQL backup completed!`);
            console.log(`📁 File: ${sqlFile}`);
            console.log(`📊 Size: ${fileSizeInMB} MB`);
            
            return sqlFile;
        }
        
    } catch (error) {
        console.error('❌ SQL backup failed:', error.message);
        console.log('⚠️ Continuing with binary backup only...');
    }
}

function main() {
    try {
        console.log('🚀 Starting database backup process...\n');
        
        const binaryBackup = createBackup();
        console.log('');
        createSQLBackup();
        
        console.log('\n🎉 Backup process completed successfully!');
        console.log('📋 Next steps:');
        console.log('   1. Run database inventory: node scripts/db-inventory.js');
        console.log('   2. Run migrations: node scripts/run-migrations.js');
        console.log('   3. Import data: node scripts/import-sql-file.js');
        
    } catch (error) {
        console.error('\n💥 Backup process failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { createBackup, createSQLBackup };
