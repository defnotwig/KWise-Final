/**
 * Verify PC Upgrade Reference Builds Compatibility
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function verifyUpgradeBuilds() {
  console.log('🔍 Verifying PC Upgrade Reference Builds Compatibility...\n');
  
  try {
    // Test 1: Overall compatibility stats
    console.log('📊 PC UPGRADE BUILDS COMPATIBILITY CHECK');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_builds,
        SUM(CASE WHEN cpu_socket = mb_socket THEN 1 ELSE 0 END) as compatible_sockets,
        SUM(CASE WHEN cpu_socket != mb_socket THEN 1 ELSE 0 END) as incompatible_sockets
      FROM (
        SELECT 
          c.specifications->>'socket' as cpu_socket,
          m.specifications->>'socket' as mb_socket
        FROM pc_upgrade_reference_builds b
        JOIN pc_parts c ON b.cpu_id = c.id
        JOIN pc_parts m ON b.motherboard_id = m.id
      ) AS build_sockets
    `);
    
    const { total_builds, compatible_sockets, incompatible_sockets } = stats.rows[0];
    console.log(`   Total Builds: ${total_builds}`);
    console.log(`   ✅ Compatible: ${compatible_sockets}`);
    console.log(`   ❌ Incompatible: ${incompatible_sockets}\n`);
    
    if (incompatible_sockets > 0) {
      console.log('⚠️ INCOMPATIBLE BUILDS FOUND:\n');
      const incompatible = await pool.query(`
        SELECT 
          b.upgrade_tier,
          b.usage_type,
          b.current_budget,
          c.name as cpu_name,
          c.specifications->>'socket' as cpu_socket,
          m.name as mb_name,
          m.specifications->>'socket' as mb_socket
        FROM pc_upgrade_reference_builds b
        JOIN pc_parts c ON b.cpu_id = c.id
        JOIN pc_parts m ON b.motherboard_id = m.id
        WHERE c.specifications->>'socket' != m.specifications->>'socket'
      `);
      
      incompatible.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.upgrade_tier} - ${row.usage_type} (Budget: ${row.current_budget})`);
        console.log(`   CPU: ${row.cpu_name} (${row.cpu_socket})`);
        console.log(`   MB:  ${row.mb_name} (${row.mb_socket})`);
        console.log('');
      });
    } else {
      console.log('🎉 SUCCESS: All PC Upgrade reference builds are compatible!\n');
    }
    
    // Test 2: Sample verification
    console.log('🎲 RANDOM SAMPLE (5 builds):');
    const sample = await pool.query(`
      SELECT 
        b.upgrade_tier,
        b.usage_type,
        c.specifications->>'socket' as cpu_socket,
        m.specifications->>'socket' as mb_socket,
        CASE 
          WHEN c.specifications->>'socket' = m.specifications->>'socket' THEN '✅'
          ELSE '❌'
        END as match
      FROM pc_upgrade_reference_builds b
      JOIN pc_parts c ON b.cpu_id = c.id
      JOIN pc_parts m ON b.motherboard_id = m.id
      ORDER BY RANDOM()
      LIMIT 5
    `);
    
    sample.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.match} ${row.upgrade_tier} - ${row.usage_type}`);
      console.log(`      CPU: ${row.cpu_socket} | MB: ${row.mb_socket}`);
    });
    
    console.log('\n✅ Verification Complete!\n');
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await pool.end();
  }
}

verifyUpgradeBuilds();
