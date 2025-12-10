#!/usr/bin/env node

/**
 * Consolidated Database Setup Script
 * Replaces all phase-specific setup scripts
 * Usage: node scripts/setup/setup-database.js [--reset] [--seed]
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'KWiseDB',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

// Parse command line arguments
function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            args[key] = true;
        }
    });
    return args;
}

async function createMissingTables() {
    console.log('🏗️  Creating missing tables and columns...');
    
    const migrations = [
        // Ensure users table has all required columns
        `ALTER TABLE users 
         ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255),
         ADD COLUMN IF NOT EXISTS reference_email VARCHAR(255),
         ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
         ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
         ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
         ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ`,
        
        // Ensure orders table has all required columns  
        `ALTER TABLE orders
         ADD COLUMN IF NOT EXISTS assisted_by INTEGER REFERENCES users(id),
         ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
         ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE`,
        
        // Ensure pc_parts table has image support
        `ALTER TABLE pc_parts
         ADD COLUMN IF NOT EXISTS image_path VARCHAR(500),
         ADD COLUMN IF NOT EXISTS images TEXT[]`,
        
        // Create system_settings table if not exists
        `CREATE TABLE IF NOT EXISTS system_settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(100) UNIQUE NOT NULL,
            value TEXT NOT NULL,
            type VARCHAR(20) DEFAULT 'string',
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Create audit_logs table if not exists
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            action VARCHAR(50) NOT NULL,
            entity VARCHAR(50) NOT NULL,
            entity_id INTEGER,
            description TEXT,
            old_values JSONB,
            new_values JSONB,
            severity VARCHAR(20) DEFAULT 'info',
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Create password_resets table if not exists
        `CREATE TABLE IF NOT EXISTS password_resets (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            reset_code VARCHAR(6) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            attempts INTEGER DEFAULT 0,
            ip_address INET,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`
    ];
    
    for (const migration of migrations) {
        try {
            await pool.query(migration);
            console.log('  ✅ Migration executed successfully');
        } catch (error) {
            console.log(`  ⚠️  Migration warning: ${error.message}`);
        }
    }
}

async function createIndexes() {
    console.log('📊 Creating database indexes...');
    
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, last_active_at)',
        'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
        'CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_pc_parts_category ON pc_parts(category)',
        'CREATE INDEX IF NOT EXISTS idx_pc_parts_active ON pc_parts(is_active)'
    ];
    
    for (const index of indexes) {
        try {
            await pool.query(index);
            console.log('  ✅ Index created successfully');
        } catch (error) {
            console.log(`  ⚠️  Index warning: ${error.message}`);
        }
    }
}

async function seedDefaultSettings() {
    console.log('🌱 Seeding default system settings...');
    
    const defaultSettings = [
        ['app_name', 'K-Wise Admin System', 'string', 'Application name'],
        ['theme', 'light', 'string', 'Default theme (light/dark/blue/green)'],
        ['language', 'en', 'string', 'Default language'],
        ['notifications_enabled', 'true', 'boolean', 'Enable notifications'],
        ['server_address', 'localhost', 'string', 'Server address'],
        ['server_port', '5000', 'number', 'Server port'],
        ['database_type', 'PostgreSQL', 'string', 'Database type'],
        ['database_name', 'KWiseDB', 'string', 'Database name'],
        ['encryption_enabled', 'true', 'boolean', 'Enable data encryption'],
        ['backup_frequency', 'daily', 'string', 'Backup frequency setting'],
        ['max_login_attempts', '5', 'number', 'Maximum login attempts'],
        ['session_timeout', '3600', 'number', 'Session timeout in seconds']
    ];
    
    for (const [key, value, type, description] of defaultSettings) {
        try {
            await pool.query(`
                INSERT INTO system_settings (key, value, type, description)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (key) DO NOTHING
            `, [key, value, type, description]);
        } catch (error) {
            console.log(`  ⚠️  Setting warning for ${key}: ${error.message}`);
        }
    }
    
    console.log('  ✅ Default settings seeded successfully');
}

async function resetDatabase() {
    console.log('🔄 Resetting database (clearing data)...');
    
    const resetQueries = [
        'TRUNCATE audit_logs RESTART IDENTITY CASCADE',
        'TRUNCATE password_resets RESTART IDENTITY CASCADE', 
        'DELETE FROM orders WHERE id > 0',
        'DELETE FROM users WHERE email NOT LIKE \'%@kwise.com\'', // Keep system users
        'TRUNCATE system_settings RESTART IDENTITY CASCADE'
    ];
    
    for (const query of resetQueries) {
        try {
            await pool.query(query);
            console.log('  ✅ Table reset successfully');
        } catch (error) {
            console.log(`  ⚠️  Reset warning: ${error.message}`);
        }
    }
}

async function main() {
    const args = parseArgs();
    
    console.log('🚀 Starting database setup...\n');
    
    try {
        if (args.reset) {
            await resetDatabase();
            console.log('');
        }
        
        await createMissingTables();
        console.log('');
        
        await createIndexes();
        console.log('');
        
        if (args.seed || args.reset) {
            await seedDefaultSettings();
            console.log('');
        }
        
        console.log('🎉 Database setup completed successfully!');
        
        if (args.seed) {
            console.log('\n💡 Tip: Run test data generation:');
            console.log('  node scripts/test-data/generate-test-data.js --type=all');
        }
        
    } catch (error) {
        console.error('💥 Database setup failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = { createMissingTables, createIndexes, seedDefaultSettings };
