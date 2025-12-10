#!/usr/bin/env node

/**
 * Consolidated User Creation Utility
 * Replaces all phase-specific user creation scripts
 * Usage: node scripts/utilities/create-user.js --email=test@example.com --name="Test User" --role=admin
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

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
            const [key, value] = arg.substring(2).split('=');
            args[key] = value;
        }
    });
    return args;
}

async function createUser(email, name, role = 'admin', password = 'TempPass123') {
    console.log('👤 Creating user:', { email, name, role });
    
    try {
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            console.log('⚠️  User already exists:', email);
            return existingUser.rows[0];
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Create user
        const result = await pool.query(`
            INSERT INTO users (name, email, password, role, email_verified, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())
            RETURNING id, name, email, role, created_at
        `, [name, email, hashedPassword, role]);

        console.log('✅ User created successfully:', result.rows[0]);
        return result.rows[0];

    } catch (error) {
        console.error('❌ Error creating user:', error.message);
        throw error;
    }
}

async function main() {
    const args = parseArgs();
    
    if (!args.email || !args.name) {
        console.log(`
Usage: node scripts/utilities/create-user.js --email=EMAIL --name=NAME [--role=ROLE] [--password=PASS]

Examples:
  node scripts/utilities/create-user.js --email=admin@kwise.com --name="Admin User" --role=superadmin
  node scripts/utilities/create-user.js --email=test@kwise.com --name="Test User" --role=admin
        `);
        process.exit(1);
    }

    try {
        await createUser(args.email, args.name, args.role, args.password);
        console.log('🎉 User creation completed successfully!');
    } catch (error) {
        console.error('💥 User creation failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = { createUser };
