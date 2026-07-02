#!/usr/bin/env node

/**
 * Consolidated Test Data Generator
 * Replaces all phase-specific test data generation scripts
 * Usage: node scripts/test-data/generate-test-data.js --type=logs|users|orders [--count=50]
 */

const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

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

async function generateTestLogs(count = 50) {
    console.log(`📝 Generating ${count} test log entries...`);
    
    const actions = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'];
    const entities = ['USER', 'ORDER', 'PRODUCT', 'SETTING', 'REPORT'];
    const severities = ['info', 'warning', 'error', 'success'];
    
    for (let i = 0; i < count; i++) {
        const action = faker.helpers.arrayElement(actions);
        const entity = faker.helpers.arrayElement(entities);
        const severity = faker.helpers.arrayElement(severities);
        
        await pool.query(`
            INSERT INTO audit_logs (
                user_id, action, entity, entity_id, description, 
                severity, ip_address, user_agent, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            faker.number.int({ min: 1, max: 10 }), // user_id
            action,
            entity,
            faker.number.int({ min: 1, max: 100 }), // entity_id
            `${action} ${entity.toLowerCase()} - ${faker.lorem.sentence()}`,
            severity,
            faker.internet.ip(),
            faker.internet.userAgent(),
            faker.date.recent({ days: 30 })
        ]);
        
        if (i % 10 === 0) {
            console.log(`  Generated ${i + 1}/${count} log entries...`);
        }
    }
    
    console.log(`✅ Generated ${count} test log entries successfully!`);
}

async function generateTestUsers(count = 10) {
    console.log(`👥 Generating ${count} test users...`);
    
    const roles = ['admin', 'user', 'developer'];
    
    for (let i = 0; i < count; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName });
        const role = faker.helpers.arrayElement(roles);
        
        try {
            await pool.query(`
                INSERT INTO users (
                    name, email, password, role, email_verified, 
                    is_active, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                `${firstName} ${lastName}`,
                email,
                '$2b$12$defaulthashfortesting', // Default test hash
                role,
                faker.datatype.boolean(),
                true,
                faker.date.recent({ days: 60 }),
                faker.date.recent({ days: 30 })
            ]);
        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                console.log(`  Skipped duplicate email: ${email}`);
            } else {
                throw error;
            }
        }
        
        if (i % 5 === 0) {
            console.log(`  Generated ${i + 1}/${count} test users...`);
        }
    }
    
    console.log(`✅ Generated test users successfully!`);
}

async function generateTestOrders(count = 25) {
    console.log(`🛒 Generating ${count} test orders...`);
    
    const statuses = ['pending', 'processing', 'completed', 'cancelled'];
    const paymentMethods = ['cash', 'credit_card', 'bank_transfer', 'gcash'];
    
    for (let i = 0; i < count; i++) {
        const status = faker.helpers.arrayElement(statuses);
        const paymentMethod = faker.helpers.arrayElement(paymentMethods);
        
        await pool.query(`
            INSERT INTO orders (
                order_number, customer_name, customer_email, total_amount,
                payment_method, payment_status, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            `ORD-${faker.string.alphanumeric(8).toUpperCase()}`,
            faker.person.fullName(),
            faker.internet.email(),
            faker.number.float({ min: 100, max: 50000, fractionDigits: 2 }),
            paymentMethod,
            status === 'completed' ? 'paid' : 'pending',
            status,
            faker.date.recent({ days: 90 }),
            faker.date.recent({ days: 30 })
        ]);
        
        if (i % 5 === 0) {
            console.log(`  Generated ${i + 1}/${count} test orders...`);
        }
    }
    
    console.log(`✅ Generated ${count} test orders successfully!`);
}

async function main() {
    const args = parseArgs();
    const count = Number.parseInt(args.count, 10) || 50;
    
    if (!args.type) {
        console.log(`
Usage: node scripts/test-data/generate-test-data.js --type=TYPE [--count=COUNT]

Types:
  logs    - Generate audit log entries (default: 50)
  users   - Generate test users (default: 10) 
  orders  - Generate test orders (default: 25)
  all     - Generate all types of test data

Examples:
  node scripts/test-data/generate-test-data.js --type=logs --count=100
  node scripts/test-data/generate-test-data.js --type=users --count=20
  node scripts/test-data/generate-test-data.js --type=all
        `);
        process.exit(1);
    }

    try {
        console.log('🚀 Starting test data generation...\n');
        
        switch (args.type) {
            case 'logs':
                await generateTestLogs(count);
                break;
            case 'users':
                await generateTestUsers(count);
                break;
            case 'orders':
                await generateTestOrders(count);
                break;
            case 'all':
                await generateTestUsers(10);
                await generateTestOrders(25);
                await generateTestLogs(50);
                break;
            default:
                console.error('❌ Invalid type. Use: logs, users, orders, or all');
                process.exit(1);
        }
        
        console.log('\n🎉 Test data generation completed successfully!');
    } catch (error) {
        console.error('💥 Test data generation failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = { generateTestLogs, generateTestUsers, generateTestOrders };
