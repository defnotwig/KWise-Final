/**
 * COMPREHENSIVE DATABASE COMPATIBILITY AUDIT
 * 
 * This script checks EVERY CPU socket has:
 * 1. Compatible motherboards
 * 2. Compatible coolers
 * 3. Compatible RAM
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function auditCompatibility() {
    try {
        console.log('='.repeat(70));
        console.log('🔍 COMPREHENSIVE DATABASE COMPATIBILITY AUDIT');
        console.log('='.repeat(70));

        // Get all unique CPU sockets
        const cpuSockets = await pool.query(`
            SELECT 
                specifications->>'socket' as socket,
                COUNT(*) as cpu_count,
                array_agg(name ORDER BY name) as cpu_names
            FROM pc_parts 
            WHERE category = 'CPU'
            GROUP BY specifications->>'socket'
            ORDER BY specifications->>'socket'
        `);

        console.log('\n📊 CPU SOCKET ANALYSIS:');
        console.log('-'.repeat(70));
        
        const issues = [];
        
        for (const socketRow of cpuSockets.rows) {
            const socket = socketRow.socket;
            const cpuCount = socketRow.cpu_count;
            const cpuNames = socketRow.cpu_names.slice(0, 3); // First 3 names
            
            console.log(`\n🔹 SOCKET: ${socket}`);
            console.log(`   CPUs: ${cpuCount} (${cpuNames.join(', ')}${cpuCount > 3 ? '...' : ''})`);
            
            // Check motherboards for this socket
            const mbResult = await pool.query(`
                SELECT COUNT(*) as count
                FROM pc_parts 
                WHERE category = 'Motherboard'
                AND specifications->>'socket' = $1
            `, [socket]);
            const mbCount = parseInt(mbResult.rows[0].count);
            
            if (mbCount === 0) {
                console.log(`   ❌ MOTHERBOARDS: 0 (CRITICAL - Cannot build PC with this CPU!)`);
                issues.push({ socket, type: 'motherboard', count: 0 });
            } else {
                console.log(`   ✅ MOTHERBOARDS: ${mbCount}`);
            }
            
            // Check coolers for this socket
            const coolerResult = await pool.query(`
                SELECT COUNT(*) as count
                FROM pc_parts 
                WHERE category = 'Cooling'
                AND specifications->'compatible_sockets' ? $1
            `, [socket]);
            const coolerCount = parseInt(coolerResult.rows[0].count);
            
            if (coolerCount === 0) {
                console.log(`   ❌ COOLERS: 0 (CRITICAL - No cooling options!)`);
                issues.push({ socket, type: 'cooler', count: 0 });
            } else {
                console.log(`   ✅ COOLERS: ${coolerCount}`);
            }
        }

        // Check RAM compatibility (DDR4 vs DDR5 vs motherboards)
        console.log('\n' + '='.repeat(70));
        console.log('📊 RAM TYPE ANALYSIS:');
        console.log('-'.repeat(70));
        
        // Get motherboard RAM types
        const mbRamTypes = await pool.query(`
            SELECT 
                specifications->>'memory_type' as memory_type,
                specifications->>'socket' as socket,
                COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Motherboard'
            GROUP BY specifications->>'memory_type', specifications->>'socket'
            ORDER BY socket, memory_type
        `);
        
        console.log('\nMotherboard RAM Support by Socket:');
        for (const row of mbRamTypes.rows) {
            console.log(`   ${row.socket || 'Unknown'}: ${row.memory_type || 'Unknown'} (${row.count} motherboards)`);
        }
        
        // Get RAM types available
        const ramTypes = await pool.query(`
            SELECT 
                specifications->>'memory_type' as memory_type,
                COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'RAM'
            GROUP BY specifications->>'memory_type'
        `);
        
        console.log('\nRAM Types in Stock:');
        for (const row of ramTypes.rows) {
            console.log(`   ${row.memory_type}: ${row.count} products`);
        }

        // Summary of issues
        console.log('\n' + '='.repeat(70));
        console.log('📋 COMPATIBILITY ISSUES SUMMARY:');
        console.log('='.repeat(70));
        
        if (issues.length === 0) {
            console.log('\n✅ All CPU sockets have compatible motherboards and coolers!');
        } else {
            console.log(`\n❌ Found ${issues.length} critical compatibility issues:\n`);
            for (const issue of issues) {
                console.log(`   • ${issue.socket}: Missing ${issue.type}s`);
            }
            
            console.log('\n🔧 RECOMMENDATIONS:');
            console.log('   1. Add LGA1851 motherboards (Z890, B860, H870 chipsets)');
            console.log('   2. OR remove Intel Core Ultra CPUs from stock until motherboards are added');
            console.log('   3. Ensure all sockets have at least 1 motherboard and cooler');
        }

        console.log('\n' + '='.repeat(70));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

auditCompatibility();
