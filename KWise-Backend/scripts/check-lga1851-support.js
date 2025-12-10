/**
 * Check LGA1851 Support in Database
 * This script analyzes what sockets are available for CPUs, motherboards, and coolers
 */

const db = require('../config/db');

async function checkLGA1851Support() {
    console.log('====================================');
    console.log('  LGA1851 Support Analysis');
    console.log('====================================\n');

    try {
        // Check CPU sockets
        const cpus = await db.query(`
            SELECT 
                specifications->>'socket' as socket,
                COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'CPU'
            GROUP BY specifications->>'socket'
            ORDER BY specifications->>'socket'
        `);
        
        console.log('=== CPU Sockets in Database ===');
        cpus.rows.forEach(r => {
            const hasLGA1851 = r.socket === 'LGA1851';
            console.log(`  ${hasLGA1851 ? '✅' : '  '} ${r.socket}: ${r.count} CPUs`);
        });

        // Check if any LGA1851 CPUs exist
        const lga1851CPUs = await db.query(`
            SELECT name, specifications->>'socket' as socket
            FROM pc_parts 
            WHERE category = 'CPU' 
            AND specifications->>'socket' = 'LGA1851'
        `);
        
        console.log(`\n=== LGA1851 CPUs (${lga1851CPUs.rows.length} found) ===`);
        lga1851CPUs.rows.forEach(r => console.log(`  - ${r.name}`));

        // Check motherboard sockets
        const mbs = await db.query(`
            SELECT 
                specifications->>'socket' as socket,
                COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Motherboard'
            GROUP BY specifications->>'socket'
            ORDER BY specifications->>'socket'
        `);
        
        console.log('\n=== Motherboard Sockets in Database ===');
        mbs.rows.forEach(r => {
            const hasLGA1851 = r.socket === 'LGA1851';
            console.log(`  ${hasLGA1851 ? '✅' : '❌'} ${r.socket}: ${r.count} motherboards`);
        });

        // Check if any LGA1851 motherboards exist
        const lga1851MBs = await db.query(`
            SELECT name, specifications->>'socket' as socket
            FROM pc_parts 
            WHERE category = 'Motherboard' 
            AND specifications->>'socket' = 'LGA1851'
        `);
        
        console.log(`\n=== LGA1851 Motherboards (${lga1851MBs.rows.length} found) ===`);
        if (lga1851MBs.rows.length === 0) {
            console.log('  ❌ NO LGA1851 MOTHERBOARDS IN DATABASE!');
        } else {
            lga1851MBs.rows.forEach(r => console.log(`  - ${r.name}`));
        }

        // Check cooler socket support
        const coolersWithLGA1851 = await db.query(`
            SELECT COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Cooling' 
            AND specifications->'compatible_sockets' @> '"LGA1851"'::jsonb
        `);

        const coolersWithLGA1700 = await db.query(`
            SELECT COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Cooling' 
            AND specifications->'compatible_sockets' @> '"LGA1700"'::jsonb
        `);

        const totalCoolers = await db.query(`
            SELECT COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Cooling'
        `);

        console.log('\n=== Cooler Socket Support ===');
        console.log(`  Total coolers: ${totalCoolers.rows[0].count}`);
        console.log(`  Support LGA1700: ${coolersWithLGA1700.rows[0].count}`);
        console.log(`  Support LGA1851: ${coolersWithLGA1851.rows[0].count} ${coolersWithLGA1851.rows[0].count == 0 ? '❌ NONE!' : '✅'}`);

        // Sample coolers with their sockets
        const sampleCoolers = await db.query(`
            SELECT name, specifications->'compatible_sockets' as sockets
            FROM pc_parts 
            WHERE category = 'Cooling' 
            LIMIT 5
        `);

        console.log('\n=== Sample Cooler Socket Arrays ===');
        sampleCoolers.rows.forEach(r => {
            console.log(`  ${r.name}:`);
            console.log(`    ${JSON.stringify(r.sockets)}`);
        });

        console.log('\n====================================');
        console.log('  SUMMARY');
        console.log('====================================');
        
        const issues = [];
        if (lga1851CPUs.rows.length > 0 && lga1851MBs.rows.length === 0) {
            issues.push('❌ LGA1851 CPUs exist but NO motherboards support LGA1851');
        }
        if (lga1851CPUs.rows.length > 0 && coolersWithLGA1851.rows[0].count == 0) {
            issues.push('❌ LGA1851 CPUs exist but NO coolers support LGA1851');
        }
        
        if (issues.length === 0) {
            console.log('✅ All socket support appears complete');
        } else {
            issues.forEach(i => console.log(i));
        }

        console.log('\n');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkLGA1851Support();
