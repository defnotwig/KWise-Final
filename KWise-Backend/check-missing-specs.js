const db = require('./config/db');

(async () => {
    try {
        await db.connectDB();
        
        console.log('🔍 Checking for missing specifications...\n');
        
        // Check Cooling specifications
        const coolingResult = await db.query(`
            SELECT id, name, 
                   specifications->>'height_mm' as height_mm,
                   specifications->>'height' as height,
                   specifications->>'socket' as socket,
                   specifications->>'supported_sockets' as supported_sockets
            FROM pc_parts 
            WHERE category = 'Cooling'
            AND (
                (specifications->>'height_mm') IS NULL 
                AND (specifications->>'height') IS NULL
            )
            LIMIT 5
        `);
        
        console.log('❌ Cooling items missing height specifications:');
        console.log(`   Found: ${coolingResult.rows.length} items`);
        coolingResult.rows.forEach(row => {
            console.log(`   - ID ${row.id}: ${row.name}`);
        });
        
        // Check GPU specifications
        const gpuResult = await db.query(`
            SELECT id, name,
                   specifications->>'length_mm' as length_mm,
                   specifications->>'Length' as Length,
                   specifications->>'power' as power,
                   specifications->>'tdp' as tdp
            FROM pc_parts 
            WHERE category = 'GPU'
            AND (
                (specifications->>'length_mm') IS NULL 
                AND (specifications->>'Length') IS NULL
            )
            LIMIT 5
        `);
        
        console.log('\n❌ GPU items missing length specifications:');
        console.log(`   Found: ${gpuResult.rows.length} items`);
        gpuResult.rows.forEach(row => {
            console.log(`   - ID ${row.id}: ${row.name}`);
        });
        
        // Check Case specifications
        const caseResult = await db.query(`
            SELECT id, name,
                   specifications->>'max_gpu_length_mm' as max_gpu_length_mm,
                   specifications->>'max_cooler_height_mm' as max_cooler_height_mm,
                   specifications->>'form_factor' as form_factor
            FROM pc_parts 
            WHERE category = 'Case'
            AND (
                (specifications->>'max_gpu_length_mm') IS NULL 
                OR (specifications->>'max_cooler_height_mm') IS NULL
            )
            LIMIT 5
        `);
        
        console.log('\n❌ Case items missing clearance specifications:');
        console.log(`   Found: ${caseResult.rows.length} items`);
        caseResult.rows.forEach(row => {
            console.log(`   - ID ${row.id}: ${row.name}`);
            console.log(`     GPU clearance: ${row.max_gpu_length_mm || 'MISSING'}`);
            console.log(`     Cooler clearance: ${row.max_cooler_height_mm || 'MISSING'}`);
        });
        
        // Check Motherboard specifications
        const mbResult = await db.query(`
            SELECT id, name,
                   specifications->>'M2 Slots' as m2_slots,
                   specifications->>'SATA Ports' as sata_ports,
                   specifications->>'Ram Slots' as ram_slots,
                   specifications->>'pcie_slots' as pcie_slots
            FROM pc_parts 
            WHERE category = 'Motherboard'
            LIMIT 5
        `);
        
        console.log('\n✅ Motherboard specifications (sample):');
        mbResult.rows.forEach(row => {
            console.log(`   - ${row.name}`);
            console.log(`     M.2 Slots: ${row.m2_slots || 'MISSING'}`);
            console.log(`     SATA Ports: ${row.sata_ports || 'MISSING'}`);
            console.log(`     RAM Slots: ${row.ram_slots || 'MISSING'}`);
            console.log(`     PCIe Slots: ${row.pcie_slots || 'MISSING'}`);
        });
        
        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
        process.exit(1);
    }
})();
