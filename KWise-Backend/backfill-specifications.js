const db = require('./config/db');

(async () => {
    try {
        await db.connectDB();
        
        console.log('🔧 Backfilling missing specifications...\n');
        
        // 1. Fix Cooling fans (these are fans, not coolers, so they don't have height)
        console.log('1️⃣ Updating Cooling fans (fans don\'t need height specs)...');
        const fanUpdate = await db.query(`
            UPDATE pc_parts 
            SET specifications = jsonb_set(
                COALESCE(specifications, '{}'::jsonb),
                '{type}',
                '"fan"'::jsonb
            )
            WHERE category = 'Cooling'
            AND (name ILIKE '%fan%' OR name ILIKE '%rf120%' OR name ILIKE '%xfan%' OR name ILIKE '%arctic%')
            AND (specifications->>'height_mm') IS NULL
            AND (specifications->>'height') IS NULL
        `);
        console.log(`   ✅ Updated ${fanUpdate.rowCount} fan items`);
        
        // 2. Fix Case missing clearances (1stPlayer MIKU 9 - Mid Tower)
        console.log('\n2️⃣ Updating Case clearances...');
        const caseUpdate = await db.query(`
            UPDATE pc_parts 
            SET specifications = specifications || 
                '{"max_gpu_length_mm": 320, "max_cooler_height_mm": 160}'::jsonb
            WHERE category = 'Case'
            AND id = 12002
        `);
        console.log(`   ✅ Updated ${caseUpdate.rowCount} case items`);
        
        // 3. Fix Motherboard slot counts (default values)
        console.log('\n3️⃣ Updating Motherboard slot counts...');
        const mbUpdate = await db.query(`
            UPDATE pc_parts 
            SET specifications = COALESCE(specifications, '{}'::jsonb) || 
                jsonb_build_object(
                    'M2 Slots', COALESCE(specifications->>'M2 Slots', '2'),
                    'SATA Ports', COALESCE(specifications->>'SATA Ports', '4'),
                    'Ram Slots', COALESCE(specifications->>'Ram Slots', '4')
                )
            WHERE category = 'Motherboard'
            AND (
                (specifications->>'M2 Slots') IS NULL
                OR (specifications->>'SATA Ports') IS NULL
                OR (specifications->>'Ram Slots') IS NULL
            )
        `);
        console.log(`   ✅ Updated ${mbUpdate.rowCount} motherboard items`);
        
        // 4. Verify updates
        console.log('\n📊 Verification:');
        
        const verifyCase = await db.query(`
            SELECT name, 
                   specifications->>'max_gpu_length_mm' as gpu_clearance,
                   specifications->>'max_cooler_height_mm' as cooler_clearance
            FROM pc_parts 
            WHERE category = 'Case' AND id = 12002
        `);
        
        if (verifyCase.rows.length > 0) {
            const c = verifyCase.rows[0];
            console.log(`   Case: ${c.name}`);
            console.log(`     GPU clearance: ${c.gpu_clearance}mm`);
            console.log(`     Cooler clearance: ${c.cooler_clearance}mm`);
        }
        
        const verifyMB = await db.query(`
            SELECT COUNT(*) as count
            FROM pc_parts 
            WHERE category = 'Motherboard'
            AND (specifications->>'M2 Slots') IS NOT NULL
            AND (specifications->>'SATA Ports') IS NOT NULL
            AND (specifications->>'Ram Slots') IS NOT NULL
        `);
        
        console.log(`   Motherboards with complete specs: ${verifyMB.rows[0].count}`);
        
        console.log('\n✅ Specification backfill complete!');
        
        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
        process.exit(1);
    }
})();
