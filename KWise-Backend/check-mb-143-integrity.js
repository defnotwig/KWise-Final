const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function checkDataIntegrity() {
  console.log('🔍 Checking Data Integrity for Motherboard ID 143...\n');
  
  try {
    // 1. Check motherboard in database
    console.log('1️⃣ MOTHERBOARD DATA IN DATABASE:');
    const mb = await pool.query('SELECT id, name, specifications FROM pc_parts WHERE id = 143');
    console.log(`   ID: ${mb.rows[0].id}`);
    console.log(`   Name: ${mb.rows[0].name}`);
    console.log(`   Socket: ${mb.rows[0].specifications.socket}`);
    console.log(`   Chipset: ${mb.rows[0].specifications.chipset}`);
    console.log(`   Memory: ${mb.rows[0].specifications.memory_type}\n`);
    
    // 2. Check which AI builds use this motherboard
    console.log('2️⃣ AI BUILDS USING THIS MOTHERBOARD:');
    const builds = await pool.query(`
      SELECT build_key, cpu_id, motherboard_id, ram_id
      FROM pc_customized_ai_reference_builds
      WHERE motherboard_id = 143
      LIMIT 3
    `);
    
    for (const build of builds.rows) {
      console.log(`\n   Build: ${build.build_key}`);
      
      // Get CPU socket
      const cpu = await pool.query('SELECT id, name, specifications->\'socket\' as socket FROM pc_parts WHERE id = $1', [build.cpu_id]);
      console.log(`   CPU ${cpu.rows[0].id}: ${cpu.rows[0].name} (${cpu.rows[0].socket})`);
      
      // Get RAM type
      const ram = await pool.query('SELECT id, name, specifications->\'memory_type\' as type FROM pc_parts WHERE id = $1', [build.ram_id]);
      console.log(`   RAM ${ram.rows[0].id}: ${ram.rows[0].name} (${ram.rows[0].type})`);
      
      // Check compatibility
      const cpuSocket = cpu.rows[0].socket;
      const mbSocket = mb.rows[0].specifications.socket;
      const ramType = ram.rows[0].type;
      const mbMemory = mb.rows[0].specifications.memory_type;
      
      const socketMatch = cpuSocket === mbSocket;
      const memoryMatch = ramType === mbMemory;
      
      console.log(`   ${socketMatch ? '✅' : '❌'} Socket: CPU ${cpuSocket} vs MB ${mbSocket}`);
      console.log(`   ${memoryMatch ? '✅' : '❌'} Memory: RAM ${ramType} vs MB ${mbMemory}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDataIntegrity();
