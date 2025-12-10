const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'humbleludwig13',
    port: process.env.DB_PORT || 5432
});

async function comprehensiveFix() {
    try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('COMPREHENSIVE PRE-BUILT FIX');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // ========== STEP 1: Create Pre-Built Image Folders ==========
        console.log('📁 STEP 1: Creating Pre-Built image folders...\n');

        const folders = [
            path.join(__dirname, '..', 'public', 'assets', 'prebuilt'),
            path.join(__dirname, '..', 'uploads', 'prebuilt')
        ];

        for (const folder of folders) {
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder, { recursive: true });
                console.log(`  ✅ Created: ${folder}`);
            } else {
                console.log(`  ℹ️  Already exists: ${folder}`);
            }
        }

        // Check if images exist in uploads/prebuilt
        const uploadsPrebuiltPath = path.join(__dirname, '..', 'uploads', 'prebuilt');
        const imageFiles = fs.existsSync(uploadsPrebuiltPath) 
            ? fs.readdirSync(uploadsPrebuiltPath).filter(f => f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png'))
            : [];
        
        console.log(`\n  📸 Found ${imageFiles.length} image files in uploads/prebuilt/`);
        imageFiles.forEach(file => console.log(`     - ${file}`));

        // ========== STEP 2: Fix Elite Build A Database Corruption ==========
        console.log('\n\n🔧 STEP 2: Fixing Elite Build A database corruption...\n');

        // Check current state
        const checkResult = await pool.query(`
            SELECT id, name, specifications 
            FROM pc_parts 
            WHERE id = 12020
        `);

        if (checkResult.rows.length === 0) {
            console.log('  ❌ Elite Build A (ID: 12020) not found in database!');
        } else {
            const currentSpecs = checkResult.rows[0].specifications;
            console.log('  📋 Current Elite Build A specifications:');
            console.log(`     - purposes type: ${typeof currentSpecs.purposes} (Array: ${Array.isArray(currentSpecs.purposes)})`);
            console.log(`     - components type: ${typeof currentSpecs.components} (Array: ${Array.isArray(currentSpecs.components)})`);

            const isCorrupted = 
                typeof currentSpecs.purposes === 'string' ||
                typeof currentSpecs.components === 'string';

            if (isCorrupted) {
                console.log('\n  ⚠️  CORRUPTION DETECTED! Applying fix...\n');

                const fixedSpecs = {
                    purposes: ['Gaming', 'Multimedia'],
                    buildType: 'Elite',
                    imageFile: 'HighMidTierBuildA.webp',
                    components: [
                        { name: 'CPU', value: 'RYZEN 9 7900X' },
                        { name: 'Motherboard', value: 'GIGABYTE B650M AORUS ELITE AX ICE' },
                        { name: 'GPU', value: '8GB RTX4060TI ASUS DUAL FAN OC' },
                        { name: 'RAM', value: '32GB T-FORCE DELTA DDR5 6000 *(16GBX2)' },
                        { name: 'Storage', value: '1TB ADATA LEGEND NVME' },
                        { name: 'Power Supply', value: '750W CORSAIR CX750 80+ BRONZE' },
                        { name: 'Case', value: 'COOLMAN SPECTRA *6 FANS' },
                        { name: 'Cooling', value: 'DARKFLASH NEBULA AIO 240' }
                    ],
                    componentLinks: [
                        {
                            componentType: 'CPU',
                            componentName: 'RYZEN 9 7900X',
                            linkedStockIds: [],
                            hasMatch: false
                        },
                        {
                            componentType: 'Motherboard',
                            componentName: 'GIGABYTE B650M AORUS ELITE AX ICE',
                            linkedStockIds: [],
                            hasMatch: false
                        },
                        {
                            componentType: 'GPU',
                            componentName: '8GB RTX4060TI ASUS DUAL FAN OC',
                            linkedStockIds: [],
                            hasMatch: false
                        },
                        {
                            componentType: 'RAM',
                            componentName: '32GB T-FORCE DELTA DDR5 6000 *(16GBX2)',
                            linkedStockIds: [],
                            hasMatch: false
                        },
                        {
                            componentType: 'Storage',
                            componentName: '1TB ADATA LEGEND NVME',
                            linkedStockIds: [],
                            hasMatch: false
                        },
                        {
                            componentType: 'Power Supply',
                            componentName: '750W CORSAIR CX750 80+ BRONZE',
                            linkedStockIds: [503],
                            hasMatch: true
                        },
                        {
                            componentType: 'Case',
                            componentName: 'COOLMAN SPECTRA *6 FANS',
                            linkedStockIds: [],
                            hasMatch: false
                        },
                        {
                            componentType: 'Cooling',
                            componentName: 'DARKFLASH NEBULA AIO 240',
                            linkedStockIds: [],
                            hasMatch: false
                        }
                    ],
                    totalComponents: 8,
                    matchedComponents: 1
                };

                const updateResult = await pool.query(`
                    UPDATE pc_parts 
                    SET specifications = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = 12020
                    RETURNING id, name, specifications
                `, [JSON.stringify(fixedSpecs)]);

                console.log('  ✅ Elite Build A updated successfully!');
                console.log('     New specifications:');
                console.log(`     - purposes: ${JSON.stringify(updateResult.rows[0].specifications.purposes)}`);
                console.log(`     - components count: ${updateResult.rows[0].specifications.components.length}`);
                console.log(`     - First component: ${JSON.stringify(updateResult.rows[0].specifications.components[0])}`);
            } else {
                console.log('  ✅ Elite Build A is already in correct format (no corruption detected)');
            }
        }

        // ========== STEP 3: Verify All Pre-Built Items ==========
        console.log('\n\n✅ STEP 3: Verifying all Pre-Built items...\n');

        const allPreBuiltResult = await pool.query(`
            SELECT id, name, specifications
            FROM pc_parts
            WHERE category = 'Pre-Built'
            ORDER BY id
        `);

        console.log(`  📊 Total Pre-Built items: ${allPreBuiltResult.rows.length}\n`);

        let corruptedCount = 0;
        let validCount = 0;

        allPreBuiltResult.rows.forEach(row => {
            const isValid = 
                Array.isArray(row.specifications?.purposes) &&
                Array.isArray(row.specifications?.components);

            if (isValid) {
                console.log(`  ✅ ${row.name} (ID: ${row.id}) - VALID`);
                validCount++;
            } else {
                console.log(`  ❌ ${row.name} (ID: ${row.id}) - CORRUPTED`);
                console.log(`     - purposes type: ${typeof row.specifications?.purposes}`);
                console.log(`     - components type: ${typeof row.specifications?.components}`);
                corruptedCount++;
            }
        });

        console.log(`\n  📈 Summary:`);
        console.log(`     - Valid items: ${validCount}`);
        console.log(`     - Corrupted items: ${corruptedCount}`);

        // ========== STEP 4: Test Kiosk API Query ==========
        console.log('\n\n🔍 STEP 4: Testing kiosk API query for Elite tier...\n');

        const kioskTestResult = await pool.query(`
            SELECT id, name, specifications->>'buildType' as tier
            FROM pc_parts
            WHERE category = 'Pre-Built' 
                AND is_active = true 
                AND kiosk_visible = true
                AND specifications->>'buildType' = 'Elite'
            ORDER BY price ASC
        `);

        console.log(`  📊 Elite tier products found: ${kioskTestResult.rows.length}`);
        kioskTestResult.rows.forEach(row => {
            console.log(`     - ${row.name} (ID: ${row.id}, Tier: ${row.tier})`);
        });

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ COMPREHENSIVE FIX COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════════════════════════\n');

        if (corruptedCount === 0) {
            console.log('🎉 All Pre-Built items are now in valid format!');
            console.log('🎉 Elite tier should now load without 500 errors!');
        } else {
            console.log(`⚠️  WARNING: ${corruptedCount} items still corrupted. Run this script again or investigate manually.`);
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

comprehensiveFix();
