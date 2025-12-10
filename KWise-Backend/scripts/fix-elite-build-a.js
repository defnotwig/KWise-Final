const { query } = require('../config/db');

async function fixEliteBuildA() {
    try {
        console.log('=== FIXING ELITE BUILD A CORRUPTED SPECIFICATIONS ===\n');
        
        // Elite Build A has corrupted specifications where objects were stringified
        // We need to reconstruct proper specifications
        
        const eliteBuildAId = 12020;
        
        // Get current item
        const current = await query('SELECT * FROM pc_parts WHERE id = $1', [eliteBuildAId]);
        console.log('Current Elite Build A data:');
        console.log('Name:', current.rows[0].name);
        console.log('Specifications:', current.rows[0].specifications);
        console.log('\n');
        
        // Build proper specifications
        const properSpecifications = {
            purposes: ["Gaming", "Multimedia"],
            buildType: "Elite",
            imageFile: "HighMidTierBuildA.webp",
            components: [
                { name: "CPU", value: "RYZEN 9 7900X" },
                { name: "Motherboard", value: "GIGABYTE B650M AORUS ELITE AX ICE" },
                { name: "GPU", value: "12GB RTX4070 GALAX SG 1CLICK OC" },
                { name: "RAM", value: "32GB T-FORCE DELTA DDR5 6000 *(16GBX2)" },
                { name: "Storage", value: "2TB TEAMGROUP MP33 PRO SSD NVME" },
                { name: "Power Supply", value: "850W CORSAIR CX850 80+ BRONZE" },
                { name: "Case", value: "COOLMAN SPECTRA *6 FANS" },
                { name: "Cooling", value: "DARKFLASH NEBULA AIO 360" }
            ],
            componentLinks: [
                {
                    componentType: "CPU",
                    componentName: "RYZEN 9 7900X",
                    linkedStockIds: [],
                    hasMatch: false
                },
                {
                    componentType: "Motherboard",
                    componentName: "GIGABYTE B650M AORUS ELITE AX ICE",
                    linkedStockIds: [],
                    hasMatch: false
                },
                {
                    componentType: "GPU",
                    componentName: "12GB RTX4070 GALAX SG 1CLICK OC",
                    linkedStockIds: [],
                    hasMatch: false
                },
                {
                    componentType: "RAM",
                    componentName: "32GB T-FORCE DELTA DDR5 6000 *(16GBX2)",
                    linkedStockIds: [],
                    hasMatch: false
                },
                {
                    componentType: "Storage",
                    componentName: "2TB TEAMGROUP MP33 PRO SSD NVME",
                    linkedStockIds: [],
                    hasMatch: false
                },
                {
                    componentType: "Power Supply",
                    componentName: "850W CORSAIR CX850 80+ BRONZE",
                    linkedStockIds: [],
                    hasMatch: false
                },
                {
                    componentType: "Case",
                    componentName: "COOLMAN SPECTRA *6 FANS",
                    linkedStockIds: [],
                    hasMatch: false
                },
                {
                    componentType: "Cooling",
                    componentName: "DARKFLASH NEBULA AIO 360",
                    linkedStockIds: [],
                    hasMatch: false
                }
            ],
            totalComponents: 8,
            matchedComponents: 0
        };
        
        console.log('New proper specifications:');
        console.log(JSON.stringify(properSpecifications, null, 2));
        console.log('\n');
        
        // Update the database
        const updateResult = await query(`
            UPDATE pc_parts 
            SET specifications = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [properSpecifications, eliteBuildAId]);
        
        console.log('✅ Updated Elite Build A successfully!');
        console.log('New specifications:', updateResult.rows[0].specifications);
        console.log('\n');
        
        // Verify all Pre-Built items now have proper specifications
        const allPreBuilt = await query(`
            SELECT id, name, specifications
            FROM pc_parts
            WHERE category = 'Pre-Built'
            ORDER BY id
        `);
        
        console.log('=== VERIFICATION: ALL PRE-BUILT ITEMS ===\n');
        allPreBuilt.rows.forEach(item => {
            const specs = item.specifications;
            const isValid = specs && 
                            Array.isArray(specs.components) && 
                            Array.isArray(specs.componentLinks) &&
                            typeof specs.buildType === 'string';
            
            console.log(`ID ${item.id}: ${item.name}`);
            console.log(`  Build Type: ${specs?.buildType || 'MISSING'}`);
            console.log(`  Components: ${Array.isArray(specs?.components) ? specs.components.length : 'INVALID'}`);
            console.log(`  Component Links: ${Array.isArray(specs?.componentLinks) ? specs.componentLinks.length : 'INVALID'}`);
            console.log(`  Status: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
            console.log('');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing Elite Build A:', error);
        process.exit(1);
    }
}

fixEliteBuildA();
