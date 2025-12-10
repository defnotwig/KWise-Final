/**
 * Quick verification script to test AI build compatibility after fixes
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function verifyBuilds() {
  console.log('🔍 Verifying AI Reference Builds Compatibility...\n');
  
  try {
    // Test 1: Check a specific gaming build
    console.log('📌 TEST 1: Gaming Build (51000-75000 Balanced AAA Games)');
    const gamingBuild = await pool.query(`
      SELECT 
        b.build_key,
        b.cpu_id,
        b.motherboard_id,
        b.ram_id,
        c.name as cpu_name,
        c.specifications->>'socket' as cpu_socket,
        m.name as mb_name,
        m.specifications->>'socket' as mb_socket,
        m.specifications->>'chipset' as mb_chipset,
        m.specifications->>'memoryType' as mb_memory,
        m.specifications->>'memory_type' as mb_memory_alt,
        r.name as ram_name,
        r.specifications->>'type' as ram_type,
        r.specifications->>'memory_type' as ram_type_alt
      FROM pc_customized_ai_reference_builds b
      JOIN pc_parts c ON b.cpu_id = c.id
      JOIN pc_parts m ON b.motherboard_id = m.id
      JOIN pc_parts r ON b.ram_id = r.id
      WHERE b.build_key = 'gaming-51000-75000-balanced-aaa-games'
      LIMIT 1
    `);
    
    if (gamingBuild.rows.length > 0) {
      const build = gamingBuild.rows[0];
      console.log(`   CPU ID: ${build.cpu_id} - ${build.cpu_name} (${build.cpu_socket})`);
      console.log(`   MB ID:  ${build.motherboard_id} - ${build.mb_name}`);
      console.log(`          Socket: ${build.mb_socket}, Chipset: ${build.mb_chipset}`);
      console.log(`          Memory: ${build.mb_memory || build.mb_memory_alt || 'null'}`);
      console.log(`   RAM ID: ${build.ram_id} - ${build.ram_name}`);
      console.log(`          Type: ${build.ram_type || build.ram_type_alt}`);
      
      const socketMatch = build.cpu_socket === build.mb_socket;
      const memoryMatch = (build.mb_memory || build.mb_memory_alt) === (build.ram_type || build.ram_type_alt);
      
      console.log(`   ✅ Socket Match: ${socketMatch ? 'YES' : 'NO'}`);
      console.log(`   ✅ Memory Match: ${memoryMatch ? 'YES' : 'NO'}\n`);
    }
    
    // Test 2: Overall compatibility stats
    console.log('📊 TEST 2: Overall Compatibility Statistics');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_builds,
        SUM(CASE WHEN cpu_socket = mb_socket THEN 1 ELSE 0 END) as compatible_sockets,
        SUM(CASE WHEN cpu_socket != mb_socket THEN 1 ELSE 0 END) as incompatible_sockets
      FROM (
        SELECT 
          c.specifications->>'socket' as cpu_socket,
          m.specifications->>'socket' as mb_socket
        FROM pc_customized_ai_reference_builds b
        JOIN pc_parts c ON b.cpu_id = c.id
        JOIN pc_parts m ON b.motherboard_id = m.id
      ) AS build_sockets
    `);
    
    const { total_builds, compatible_sockets, incompatible_sockets } = stats.rows[0];
    console.log(`   Total Builds: ${total_builds}`);
    console.log(`   ✅ Compatible: ${compatible_sockets}`);
    console.log(`   ❌ Incompatible: ${incompatible_sockets}\n`);
    
    // Test 3: Sample 5 random builds
    console.log('🎲 TEST 3: Random Sample (5 builds)');
    const sample = await pool.query(`
      SELECT 
        b.build_key,
        c.specifications->>'socket' as cpu_socket,
        m.specifications->>'socket' as mb_socket,
        CASE 
          WHEN c.specifications->>'socket' = m.specifications->>'socket' THEN '✅'
          ELSE '❌'
        END as match
      FROM pc_customized_ai_reference_builds b
      JOIN pc_parts c ON b.cpu_id = c.id
      JOIN pc_parts m ON b.motherboard_id = m.id
      ORDER BY RANDOM()
      LIMIT 5
    `);
    
    sample.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.match} ${row.build_key}`);
      console.log(`      CPU: ${row.cpu_socket} | MB: ${row.mb_socket}`);
    });
    
    console.log('\n✅ Verification Complete!\n');
    
    if (incompatible_sockets === '0') {
      console.log('🎉 SUCCESS: All reference builds are now compatible!');
    } else {
      console.log(`⚠️ WARNING: ${incompatible_sockets} builds still have socket mismatches.`);
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await pool.end();
  }
}

verifyBuilds();
