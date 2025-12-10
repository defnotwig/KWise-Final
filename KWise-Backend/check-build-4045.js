/**
 * CHECK BUILD ID 4045 INTEGRITY
 * Verify the "gaming-51000-75000-balanced-aaa-games" build has compatible components
 */

const { query } = require('./config/db');

async function checkBuild4045() {
    console.log('\n🔍 Checking Build ID 4045 (gaming-51000-75000-balanced-aaa-games)...\n');
    
    const result = await query(`
        SELECT 
            b.id,
            b.build_key,
            cpu.id as cpu_id,
            cpu.name as cpu_name,
            cpu.specifications->'socket' as cpu_socket,
            mb.id as mb_id,
            mb.name as mb_name,
            mb.specifications->'socket' as mb_socket,
            mb.specifications->'chipset' as mb_chipset,
            mb.specifications->'memory_type' as mb_memory,
            ram.id as ram_id,
            ram.name as ram_name,
            ram.specifications->'memory_type' as ram_memory
        FROM pc_customized_ai_reference_builds b
        JOIN pc_parts cpu ON b.cpu_id = cpu.id
        JOIN pc_parts mb ON b.motherboard_id = mb.id
        JOIN pc_parts ram ON b.ram_id = ram.id
        WHERE b.id = 4045;
    `);
    
    if (result.rows.length === 0) {
        console.log('❌ Build 4045 not found');
        process.exit(1);
    }
    
    const build = result.rows[0];
    console.log('Build Details:');
    console.log('  Build Key:', build.build_key);
    console.log('\nCPU:');
    console.log('  ID:', build.cpu_id);
    console.log('  Name:', build.cpu_name);
    console.log('  Socket:', build.cpu_socket);
    console.log('\nMotherboard:');
    console.log('  ID:', build.mb_id);
    console.log('  Name:', build.mb_name);
    console.log('  Socket:', build.mb_socket);
    console.log('  Chipset:', build.mb_chipset);
    console.log('  Memory Type:', build.mb_memory);
    console.log('\nRAM:');
    console.log('  ID:', build.ram_id);
    console.log('  Name:', build.ram_name);
    console.log('  Memory Type:', build.ram_memory);
    
    // Check compatibility
    console.log('\n✅ Compatibility Checks:');
    
    const cpuSocket = build.cpu_socket.replace(/"/g, '');
    const mbSocket = build.mb_socket.replace(/"/g, '');
    const mbMemory = build.mb_memory.replace(/"/g, '');
    const ramMemory = build.ram_memory.replace(/"/g, '');
    
    if (cpuSocket === mbSocket) {
        console.log('  ✅ CPU Socket (' + cpuSocket + ') matches MB Socket (' + mbSocket + ')');
    } else {
        console.log('  ❌ CPU Socket (' + cpuSocket + ') does NOT match MB Socket (' + mbSocket + ')');
    }
    
    if (mbMemory === ramMemory) {
        console.log('  ✅ MB Memory Type (' + mbMemory + ') matches RAM Memory Type (' + ramMemory + ')');
    } else {
        console.log('  ❌ MB Memory Type (' + mbMemory + ') does NOT match RAM Memory Type (' + ramMemory + ')');
    }
    
    process.exit(0);
}

checkBuild4045().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
