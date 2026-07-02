#!/usr/bin/env node

/**
 * K-Wise Database Setup Script
 * 
 * Creates the KWiseDB database, imports the full schema, and seeds
 * the product catalog with all PC parts, components, users, and settings.
 * 
 * Usage:
 *   node scripts/setup/setup-database.js           # Full setup (schema + seed)
 *   node scripts/setup/setup-database.js --schema   # Schema only (no data)
 *   node scripts/setup/setup-database.js --seed     # Seed data only (schema must exist)
 *   node scripts/setup/setup-database.js --reset    # Drop and recreate everything
 *   node scripts/setup/setup-database.js --verify   # Verify database is set up correctly
 */

const { Pool, Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'humbleludwig13',
    database: process.env.DB_NAME || 'KWiseDB'
};

const SETUP_DIR = __dirname;
const SCHEMA_FILE = path.join(SETUP_DIR, 'schema.sql');
const SEED_FILE = path.join(SETUP_DIR, 'seed-data.sql');

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

function log(emoji, msg) {
    console.log(`${emoji}  ${msg}`);
}

// ─── Step 1: Ensure the KWiseDB database exists ───
async function ensureDatabaseExists() {
    log('🔍', 'Checking if database exists...');
    
    const client = new Client({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: 'postgres' // connect to default DB to check/create
    });
    
    try {
        await client.connect();
        const result = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [DB_CONFIG.database]
        );
        
        if (result.rows.length === 0) {
            log('🏗️', `Creating database "${DB_CONFIG.database}"...`);
            await client.query(`CREATE DATABASE "${DB_CONFIG.database}"`);
            log('✅', `Database "${DB_CONFIG.database}" created.`);
            return true; // newly created
        } else {
            log('✅', `Database "${DB_CONFIG.database}" already exists.`);
            return false; // already existed
        }
    } finally {
        await client.end();
    }
}

// ─── Step 2: Check if schema is already populated ───
async function isSchemaPopulated(pool) {
    try {
        const result = await pool.query(`
            SELECT count(*) AS cnt FROM pg_tables WHERE schemaname = 'public'
        `);
        return Number.parseInt(result.rows[0].cnt, 10) > 5;
    } catch {
        return false;
    }
}

// ─── Step 3: Import schema via psql ───
async function importSchema() {
    log('📐', 'Importing database schema...');
    
    if (!fs.existsSync(SCHEMA_FILE)) {
        throw new Error(`Schema file not found: ${SCHEMA_FILE}\nRun this script from the KWise-Backend directory.`);
    }
    
    const env = {
        ...process.env,
        PGPASSWORD: DB_CONFIG.password
    };
    
    try {
        execSync(
            `psql -U "${DB_CONFIG.user}" -h "${DB_CONFIG.host}" -p ${DB_CONFIG.port} -d "${DB_CONFIG.database}" -f "${SCHEMA_FILE}" --quiet --no-psqlrc`,
            { env, stdio: 'pipe', timeout: 120000 }
        );
        log('✅', 'Schema imported successfully.');
    } catch (err) {
        // psql may return non-zero for warnings (e.g., "already exists")
        const stderr = err.stderr ? err.stderr.toString() : '';
        const hasRealError = stderr.split('\n').some(line => 
            line.includes('ERROR') && !line.includes('already exists')
        );
        if (hasRealError) {
            throw new Error(`Schema import failed:\n${stderr}`);
        }
        log('⚠️', 'Schema imported with warnings (objects may already exist).');
    }
}

// ─── Step 4: Seed data via psql ───
async function seedData() {
    log('🌱', 'Seeding product catalog and reference data...');
    
    if (!fs.existsSync(SEED_FILE)) {
        throw new Error(`Seed file not found: ${SEED_FILE}\nRun this script from the KWise-Backend directory.`);
    }
    
    const env = {
        ...process.env,
        PGPASSWORD: DB_CONFIG.password
    };
    
    try {
        execSync(
            `psql -U "${DB_CONFIG.user}" -h "${DB_CONFIG.host}" -p ${DB_CONFIG.port} -d "${DB_CONFIG.database}" -f "${SEED_FILE}" --quiet --no-psqlrc`,
            { env, stdio: 'pipe', timeout: 120000 }
        );
        log('✅', 'Seed data imported successfully.');
    } catch (err) {
        const stderr = err.stderr ? err.stderr.toString() : '';
        const hasRealError = stderr.split('\n').some(line => 
            line.includes('ERROR') && !line.includes('duplicate key') && !line.includes('already exists')
        );
        if (hasRealError) {
            throw new Error(`Seed import failed:\n${stderr}`);
        }
        log('⚠️', 'Seed data imported with warnings (some rows may already exist).');
    }
}

// ─── Step 5: Verify the setup ───
async function verifySetup(pool) {
    log('🔎', 'Verifying database setup...');
    
    const checks = [
        { label: 'Tables exist', query: `SELECT count(*) AS cnt FROM pg_tables WHERE schemaname = 'public'`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 50 },
        { label: 'Users seeded', query: `SELECT count(*) AS cnt FROM users`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 0 },
        { label: 'Categories seeded', query: `SELECT count(*) AS cnt FROM categories`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 0 },
        { label: 'PC Parts seeded', query: `SELECT count(*) AS cnt FROM pc_parts`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 100 },
        { label: 'CPUs seeded', query: `SELECT count(*) AS cnt FROM cpu`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 0 },
        { label: 'GPUs seeded', query: `SELECT count(*) AS cnt FROM gpu`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 0 },
        { label: 'Motherboards seeded', query: `SELECT count(*) AS cnt FROM motherboard`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 0 },
        { label: 'Settings seeded', query: `SELECT count(*) AS cnt FROM settings`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 0 },
        { label: 'System settings seeded', query: `SELECT count(*) AS cnt FROM system_settings`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 0 },
        { label: 'Compatibility rules', query: `SELECT count(*) AS cnt FROM compatibility_rules`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 0 },
        { label: 'Prebuilt PCs', query: `SELECT count(*) AS cnt FROM prebuilt_pcs`, expect: (r) => Number.parseInt(r.rows[0].cnt, 10) > 0 },
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const check of checks) {
        try {
            const result = await pool.query(check.query);
            const ok = check.expect(result);
            if (ok) {
                const cnt = result.rows[0].cnt;
                console.log(`   ✅ ${check.label}: ${cnt}`);
                passed++;
            } else {
                const cnt = result.rows[0].cnt;
                console.log(`   ❌ ${check.label}: ${cnt} (expected > 0)`);
                failed++;
            }
        } catch (err) {
            console.log(`   ❌ ${check.label}: ${err.message}`);
            failed++;
        }
    }
    
    console.log('');
    if (failed === 0) {
        log('🎉', `All ${passed} checks passed!`);
    } else {
        log('⚠️', `${passed} passed, ${failed} failed.`);
    }
    
    return failed === 0;
}

// ─── Step 6: Reset (drop all and recreate) ───
async function resetDatabase() {
    log('🔄', 'Resetting database...');
    
    const client = new Client({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: 'postgres'
    });
    
    try {
        await client.connect();
        
        // Terminate existing connections
        await client.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = $1 AND pid <> pg_backend_pid()
        `, [DB_CONFIG.database]);
        
        await client.query(`DROP DATABASE IF EXISTS "${DB_CONFIG.database}"`);
        log('✅', 'Database dropped.');
        
        await client.query(`CREATE DATABASE "${DB_CONFIG.database}"`);
        log('✅', 'Database recreated.');
    } finally {
        await client.end();
    }
}

// ─── Main ───
async function main() {
    const args = parseArgs();
    const schemaOnly = args.schema && !args.seed;
    const seedOnly = args.seed && !args.schema;
    const verifyOnly = args.verify;
    const doReset = args.reset;
    const fullSetup = !schemaOnly && !seedOnly && !verifyOnly;
    
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     K-Wise Database Setup                ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    
    // Check required files exist
    if (!verifyOnly) {
        if (!seedOnly && !fs.existsSync(SCHEMA_FILE)) {
            console.error(`❌ Missing file: ${SCHEMA_FILE}`);
            console.error('   This file contains the database schema and should be in the repository.');
            process.exit(1);
        }
        if (!schemaOnly && !fs.existsSync(SEED_FILE)) {
            console.error(`❌ Missing file: ${SEED_FILE}`);
            console.error('   This file contains the product catalog data and should be in the repository.');
            process.exit(1);
        }
    }
    
    // Check psql is available
    if (!verifyOnly) {
        try {
            execSync('psql --version', { stdio: 'pipe' });
        } catch {
            console.error('❌ psql command not found.');
            console.error('   Please install PostgreSQL and ensure psql is in your PATH.');
            console.error('   Typical path: C:\\Program Files\\PostgreSQL\\17\\bin');
            process.exit(1);
        }
    }
    
    try {
        if (doReset) {
            await resetDatabase();
        }
        
        if (fullSetup || doReset) {
            await ensureDatabaseExists();
            await importSchema();
            await seedData();
        } else if (schemaOnly) {
            await ensureDatabaseExists();
            await importSchema();
        } else if (seedOnly) {
            await seedData();
        }
        
        // Always verify at the end
        const pool = new Pool(DB_CONFIG);
        try {
            const success = await verifySetup(pool);
            if (!success && !verifyOnly) {
                log('💡', 'Some checks failed. Try running with --reset for a clean setup.');
            }
        } finally {
            await pool.end();
        }
        
        if (!verifyOnly) {
            console.log('');
            console.log('╔══════════════════════════════════════════╗');
            console.log('║     Setup Complete!                      ║');
            console.log('╠══════════════════════════════════════════╣');
            console.log('║                                          ║');
            console.log('║  Start backend:                          ║');
            console.log('║    cd KWise-Backend                      ║');
            console.log('║    npm run dev:no-ollama                 ║');
            console.log('║                                          ║');
            console.log('║  Start frontend (separate terminal):     ║');
            console.log('║    cd K-Wise                             ║');
            console.log('║    npm start                             ║');
            console.log('║                                          ║');
            console.log('╚══════════════════════════════════════════╝');
            console.log('');
        }
        
    } catch (error) {
        console.error('');
        console.error(`💥 Setup failed: ${error.message}`);
        console.error('');
        console.error('Common fixes:');
        console.error('  1. Make sure PostgreSQL is running');
        console.error('  2. Check your .env DB_PASSWORD matches your PostgreSQL password');
        console.error('  3. Ensure psql is in your PATH');
        console.error('  4. See COLLABORATOR_SETUP.md for help');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { ensureDatabaseExists, importSchema, seedData, verifySetup };
