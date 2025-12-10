#!/usr/bin/env node

/**
 * Consolidated Database Migration Runner
 * Replaces all scattered migration files
 * Usage: node scripts/migrations/run-migrations.js [--up] [--down] [--version=N]
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

// Migration definitions
const migrations = [
    {
        version: 1,
        name: 'Initial schema setup',
        up: `
            -- Users table with all required columns
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'admin',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMPTZ,
                profile_image VARCHAR(255),
                reference_email VARCHAR(255),
                email_verified BOOLEAN DEFAULT false,
                password_reset_token VARCHAR(255),
                password_reset_expires TIMESTAMPTZ,
                failed_login_attempts INTEGER DEFAULT 0,
                account_locked_until TIMESTAMPTZ
            );
        `,
        down: 'DROP TABLE IF EXISTS users CASCADE;'
    },
    {
        version: 2,
        name: 'PC Parts inventory',
        up: `
            CREATE TABLE IF NOT EXISTS pc_parts (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                category VARCHAR(100) NOT NULL,
                brand VARCHAR(100),
                model VARCHAR(100),
                price DECIMAL(10,2) NOT NULL,
                stock_quantity INTEGER DEFAULT 0,
                description TEXT,
                specifications JSONB,
                image_path VARCHAR(500),
                images TEXT[],
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `,
        down: 'DROP TABLE IF EXISTS pc_parts CASCADE;'
    },
    {
        version: 3,
        name: 'Orders system',
        up: `
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(100) NOT NULL,
                customer_email VARCHAR(100),
                customer_phone VARCHAR(20),
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                payment_status VARCHAR(20) DEFAULT 'pending',
                assisted_by INTEGER REFERENCES users(id),
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                pc_part_id INTEGER NOT NULL REFERENCES pc_parts(id),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `,
        down: `
            DROP TABLE IF EXISTS order_items CASCADE;
            DROP TABLE IF EXISTS orders CASCADE;
        `
    },
    {
        version: 4,
        name: 'Audit logging system',
        up: `
            CREATE TABLE IF NOT EXISTS audit_logs (
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
            );
        `,
        down: 'DROP TABLE IF EXISTS audit_logs CASCADE;'
    },
    {
        version: 5,
        name: 'System settings and password resets',
        up: `
            CREATE TABLE IF NOT EXISTS system_settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(100) UNIQUE NOT NULL,
                value TEXT NOT NULL,
                type VARCHAR(20) DEFAULT 'string',
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS password_resets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                reset_code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                attempts INTEGER DEFAULT 0,
                ip_address INET,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `,
        down: `
            DROP TABLE IF EXISTS password_resets CASCADE;
            DROP TABLE IF EXISTS system_settings CASCADE;
        `
    },
    {
        version: 6,
        name: 'Database indexes for performance',
        up: `
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, last_active_at);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_pc_parts_category ON pc_parts(category);
            CREATE INDEX IF NOT EXISTS idx_pc_parts_active ON pc_parts(is_active);
            CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
            CREATE INDEX IF NOT EXISTS idx_order_items_part ON order_items(pc_part_id);
        `,
        down: `
            DROP INDEX IF EXISTS idx_users_email;
            DROP INDEX IF EXISTS idx_users_active;
            DROP INDEX IF EXISTS idx_orders_status;
            DROP INDEX IF EXISTS idx_orders_created;
            DROP INDEX IF EXISTS idx_audit_logs_user;
            DROP INDEX IF EXISTS idx_audit_logs_created;
            DROP INDEX IF EXISTS idx_pc_parts_category;
            DROP INDEX IF EXISTS idx_pc_parts_active;
            DROP INDEX IF EXISTS idx_order_items_order;
            DROP INDEX IF EXISTS idx_order_items_part;
        `
    }
];

// Create migrations table to track versions
async function createMigrationsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// Get current migration version
async function getCurrentVersion() {
    try {
        const result = await pool.query('SELECT MAX(version) as version FROM schema_migrations');
        return result.rows[0].version || 0;
    } catch (error) {
        return 0;
    }
}

// Run migrations up to target version
async function migrateUp(targetVersion = null) {
    await createMigrationsTable();
    const currentVersion = await getCurrentVersion();
    const target = targetVersion || Math.max(...migrations.map(m => m.version));
    
    console.log(`📈 Migrating from version ${currentVersion} to ${target}...`);
    
    for (const migration of migrations) {
        if (migration.version > currentVersion && migration.version <= target) {
            console.log(`  🔄 Running migration ${migration.version}: ${migration.name}`);
            
            try {
                await pool.query('BEGIN');
                await pool.query(migration.up);
                await pool.query(`
                    INSERT INTO schema_migrations (version, name) 
                    VALUES ($1, $2)
                `, [migration.version, migration.name]);
                await pool.query('COMMIT');
                
                console.log(`  ✅ Migration ${migration.version} completed`);
            } catch (error) {
                await pool.query('ROLLBACK');
                console.error(`  💥 Migration ${migration.version} failed:`, error.message);
                throw error;
            }
        }
    }
    
    console.log('🎉 All migrations completed successfully!');
}

// Run migrations down to target version
async function migrateDown(targetVersion) {
    await createMigrationsTable();
    const currentVersion = await getCurrentVersion();
    
    console.log(`📉 Rolling back from version ${currentVersion} to ${targetVersion}...`);
    
    // Sort migrations in reverse order for rollback
    const reversedMigrations = [...migrations].sort((a, b) => b.version - a.version);
    
    for (const migration of reversedMigrations) {
        if (migration.version > targetVersion && migration.version <= currentVersion) {
            console.log(`  🔄 Rolling back migration ${migration.version}: ${migration.name}`);
            
            try {
                await pool.query('BEGIN');
                await pool.query(migration.down);
                await pool.query('DELETE FROM schema_migrations WHERE version = $1', [migration.version]);
                await pool.query('COMMIT');
                
                console.log(`  ✅ Rollback ${migration.version} completed`);
            } catch (error) {
                await pool.query('ROLLBACK');
                console.error(`  💥 Rollback ${migration.version} failed:`, error.message);
                throw error;
            }
        }
    }
    
    console.log('🎉 Rollback completed successfully!');
}

// Show migration status
async function showStatus() {
    await createMigrationsTable();
    const currentVersion = await getCurrentVersion();
    
    console.log('📊 Migration Status:');
    console.log(`  Current version: ${currentVersion}`);
    console.log(`  Available migrations: ${Math.max(...migrations.map(m => m.version))}`);
    console.log('');
    
    const executedResult = await pool.query('SELECT * FROM schema_migrations ORDER BY version');
    const executed = new Set(executedResult.rows.map(r => r.version));
    
    for (const migration of migrations) {
        const status = executed.has(migration.version) ? '✅' : '⏳';
        console.log(`  ${status} Version ${migration.version}: ${migration.name}`);
    }
}

// Parse command line arguments
function parseArgs() {
    const args = { action: 'status' };
    
    process.argv.slice(2).forEach(arg => {
        if (arg === '--up') args.action = 'up';
        else if (arg === '--down') args.action = 'down';
        else if (arg === '--status') args.action = 'status';
        else if (arg.startsWith('--version=')) {
            args.version = parseInt(arg.split('=')[1]);
        }
    });
    
    return args;
}

async function main() {
    const args = parseArgs();
    
    console.log('🏗️  K-Wise Database Migration Runner\n');
    
    try {
        switch (args.action) {
            case 'up':
                await migrateUp(args.version);
                break;
            case 'down':
                if (!args.version) {
                    console.error('💥 Down migration requires --version=N parameter');
                    process.exit(1);
                }
                await migrateDown(args.version);
                break;
            case 'status':
            default:
                await showStatus();
                break;
        }
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = { migrateUp, migrateDown, showStatus };
