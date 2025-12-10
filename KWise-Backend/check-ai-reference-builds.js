// Check all AI reference builds for socket compatibility
require('dotenv').config();
const { query } = require('./config/db');

async function checkReferenceBuilds() {
  try {
    console.log('🔍 Checking PC Customize-AI Reference Builds...\n');
    
    // Get all reference builds
    const builds = await query(`
      SELECT 
        id,
        build_key,
        cpu_id,
        motherboard_id,
        ram_id,
        storage_id,
        gpu_id,
        psu_id,
        case_id,
        cooling_id
      FROM pc_customized_ai_reference_builds
      ORDER BY id
    `);
    
    console.log(`📊 Total Reference Builds: ${builds.rows.length}\n`);
    
    let compatibleCount = 0;
    let incompatibleCount = 0;
    const issues = [];
    
    for (const build of builds.rows) {
      // Get CPU socket
      const cpu = await query('SELECT id, name, specifications FROM pc_parts WHERE id = $1', [build.cpu_id]);
      const cpuSocket = cpu.rows[0]?.specifications?.socket;
      const cpuName = cpu.rows[0]?.name;
      
      // Get Motherboard socket
      const mb = await query('SELECT id, name, specifications FROM pc_parts WHERE id = $1', [build.motherboard_id]);
      const mbSocket = mb.rows[0]?.specifications?.socket;
      const mbName = mb.rows[0]?.name;
      const mbMemoryType = mb.rows[0]?.specifications?.memory_type;
      
      // Get RAM memory type
      const ram = await query('SELECT id, name, specifications FROM pc_parts WHERE id = $1', [build.ram_id]);
      const ramMemoryType = ram.rows[0]?.specifications?.memory_type;
      const ramName = ram.rows[0]?.name;
      
      // Check socket compatibility
      const socketMatch = cpuSocket === mbSocket;
      const memoryMatch = mbMemoryType === ramMemoryType;
      
      if (socketMatch && memoryMatch) {
        compatibleCount++;
      } else {
        incompatibleCount++;
        issues.push({
          buildKey: build.build_key,
          cpuId: build.cpu_id,
          cpuName,
          cpuSocket,
          mbId: build.motherboard_id,
          mbName,
          mbSocket,
          mbMemoryType,
          ramId: build.ram_id,
          ramName,
          ramMemoryType,
          socketMatch,
          memoryMatch
        });
      }
    }
    
    console.log('📊 Compatibility Summary:');
    console.log(`   ✅ Compatible Builds: ${compatibleCount}`);
    console.log(`   ❌ Incompatible Builds: ${incompatibleCount}\n`);
    
    if (issues.length > 0) {
      console.log('❌ INCOMPATIBLE BUILDS FOUND:\n');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. Build Key: ${issue.buildKey}`);
        console.log(`   CPU: ${issue.cpuName} (${issue.cpuSocket})`);
        console.log(`   Motherboard: ${issue.mbName} (${issue.mbSocket})`);
        if (!issue.socketMatch) {
          console.log(`   ⚠️ Socket Mismatch: ${issue.cpuSocket} ≠ ${issue.mbSocket}`);
        }
        if (!issue.memoryMatch) {
          console.log(`   RAM: ${issue.ramName} (${issue.ramMemoryType})`);
          console.log(`   ⚠️ Memory Mismatch: ${issue.mbMemoryType} ≠ ${issue.ramMemoryType}`);
        }
        console.log('');
      });
    } else {
      console.log('✅ ALL REFERENCE BUILDS ARE COMPATIBLE!\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkReferenceBuilds();
