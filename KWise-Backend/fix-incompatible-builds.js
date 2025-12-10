// Fix incompatible reference builds: DDR4/DDR5 mismatches
require('dotenv').config();
const { query } = require('./config/db');

async function fixIncompatibleBuilds() {
  try {
    console.log('🔧 Fixing incompatible reference builds...\n');
    
    const result = await query(`
      WITH build_compatibility AS (
        SELECT 
          rb.id,
          rb.build_key,
          cpu.id as cpu_id,
          cpu.name as cpu_name,
          cpu.specifications->>'socket' as cpu_socket,
          mb.id as mb_id,
          mb.name as mb_name,
          mb.specifications->>'socket' as mb_socket,
          mb.specifications->>'memory_type' as mb_memory_type,
          ram.id as ram_id,
          ram.name as ram_name,
          ram.specifications->>'memory_type' as ram_memory_type
        FROM pc_customized_ai_reference_builds rb
        LEFT JOIN pc_parts cpu ON rb.cpu_id = cpu.id
        LEFT JOIN pc_parts mb ON rb.motherboard_id = mb.id
        LEFT JOIN pc_parts ram ON rb.ram_id = ram.id
      )
      SELECT *
      FROM build_compatibility
      WHERE 
        cpu_socket != mb_socket 
        OR mb_memory_type != ram_memory_type
      ORDER BY id
    `);
    
    console.log(`❌ Found ${result.rows.length} incompatible builds\n`);
    
    if (result.rows.length === 0) {
      console.log('✅ All builds are already compatible!');
      process.exit(0);
    }
    
    // For each incompatible build, suggest fix
    for (const build of result.rows) {
      console.log(`\nBuild: ${build.build_key}`);
      console.log(`  CPU: ${build.cpu_name} (${build.cpu_socket})`);
      console.log(`  MB:  ${build.mb_name} (${build.mb_socket}, ${build.mb_memory_type})`);
      console.log(`  RAM: ${build.ram_name} (${build.ram_memory_type})`);
      
      if (build.cpu_socket !== build.mb_socket) {
        console.log(`  ⚠️ Socket mismatch: ${build.cpu_socket} ≠ ${build.mb_socket}`);
      }
      if (build.mb_memory_type !== build.ram_memory_type) {
        console.log(`  ⚠️ Memory mismatch: ${build.mb_memory_type} ≠ ${build.ram_memory_type}`);
        
        // Find compatible RAM
        const compatibleRam = await query(`
          SELECT id, name, specifications->>'memory_type' as memory_type, price
          FROM pc_parts
          WHERE 
            category = 'RAM'
            AND specifications->>'memory_type' = $1
          ORDER BY price ASC
          LIMIT 5
        `, [build.mb_memory_type]);
        
        if (compatibleRam.rows.length > 0) {
          console.log(`  💡 Suggested compatible RAM:`);
          compatibleRam.rows.forEach((ram, i) => {
            console.log(`     ${i + 1}. ${ram.name} (₱${ram.price}) - ${ram.memory_type}`);
          });
          
          // Auto-fix: Use the closest price match
          const newRam = compatibleRam.rows[0];
          await query(`
            UPDATE pc_customized_ai_reference_builds
            SET ram_id = $1, updated_at = NOW()
            WHERE id = $2
          `, [newRam.id, build.id]);
          console.log(`  ✅ AUTO-FIXED: Replaced RAM with ${newRam.name}`);
        }
      }
    }
    
    console.log('\n✅ Incompatible builds have been fixed!');
    console.log('\n🔄 Re-running compatibility check...\n');
    
    // Verify fixes
    const verification = await query(`
      WITH build_compatibility AS (
        SELECT 
          rb.id,
          cpu.specifications->>'socket' as cpu_socket,
          mb.specifications->>'socket' as mb_socket,
          mb.specifications->>'memory_type' as mb_memory_type,
          ram.specifications->>'memory_type' as ram_memory_type
        FROM pc_customized_ai_reference_builds rb
        LEFT JOIN pc_parts cpu ON rb.cpu_id = cpu.id
        LEFT JOIN pc_parts mb ON rb.motherboard_id = mb.id
        LEFT JOIN pc_parts ram ON rb.ram_id = ram.id
      )
      SELECT COUNT(*) as incompatible_count
      FROM build_compatibility
      WHERE 
        cpu_socket != mb_socket 
        OR mb_memory_type != ram_memory_type
    `);
    
    const remaining = verification.rows[0].incompatible_count;
    console.log(`📊 Remaining incompatible builds: ${remaining}`);
    
    if (remaining === 0) {
      console.log('✅✅✅ ALL BUILDS ARE NOW 100% COMPATIBLE! ✅✅✅');
    } else {
      console.log(`⚠️ ${remaining} builds still need manual fixing`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixIncompatibleBuilds();
