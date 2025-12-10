const { query } = require('./config/db');
const path = require('path');
const fs = require('fs');

async function fixPreBuiltData() {
  try {
    console.log('🔧 Starting Pre-Built Data Fix...\n');
    
    // 1. Check current data
    console.log('📊 Current Pre-Built products in pc_parts:\n');
    const current = await query(`
      SELECT id, name, tier, category, image_url, specifications
      FROM pc_parts 
      WHERE category = 'Pre-Built'
      ORDER BY 
        CASE tier
          WHEN 'Entry' THEN 1
          WHEN 'Starter' THEN 1
          WHEN 'Mid Tier' THEN 2
          WHEN 'High Tier' THEN 3
          WHEN 'Elite' THEN 4
          ELSE 5
        END,
        id
    `);
    
    current.rows.forEach(row => {
      console.log(`  [${row.id}] ${row.tier} - ${row.name}`);
      console.log(`       Image: ${row.image_url || 'NONE'}`);
      console.log(`       Specs: ${row.specifications ? 'EXISTS' : 'NULL'}\n`);
    });
    
    // 2. Fix tier names: Entry → Starter
    console.log('\n🔧 Fixing tier names (Entry → Starter)...\n');
    const tierFix = await query(`
      UPDATE pc_parts
      SET tier = 'Starter'
      WHERE category = 'Pre-Built' AND tier = 'Entry'
      RETURNING id, name, tier
    `);
    
    if (tierFix.rows.length > 0) {
      console.log(`✅ Updated ${tierFix.rows.length} products to Starter tier:`);
      tierFix.rows.forEach(row => {
        console.log(`  - ${row.name} (ID: ${row.id})`);
      });
    } else {
      console.log('ℹ️  No Entry tier products found (might already be fixed)');
    }
    
    // 3. Fix image URLs (change /uploads/prebuilt/ to /assets/)
    console.log('\n\n🖼️  Fixing image URLs...\n');
    const imageFix = await query(`
      UPDATE pc_parts
      SET image_url = REPLACE(image_url, '/uploads/prebuilt/', '/assets/')
      WHERE category = 'Pre-Built' AND image_url LIKE '/uploads/prebuilt/%'
      RETURNING id, name, image_url
    `);
    
    if (imageFix.rows.length > 0) {
      console.log(`✅ Fixed ${imageFix.rows.length} image URLs:`);
      imageFix.rows.forEach(row => {
        console.log(`  - ${row.name}: ${row.image_url}`);
      });
    } else {
      console.log('ℹ️  No /uploads/prebuilt/ URLs found (might already be fixed)');
    }
    
    // 4. Add components to specifications if missing
    console.log('\n\n🔧 Checking specifications for component data...\n');
    
    const needsComponents = await query(`
      SELECT id, name, tier, specifications
      FROM pc_parts
      WHERE category = 'Pre-Built'
      ORDER BY id
    `);
    
    for (const build of needsComponents.rows) {
      const specs = build.specifications || {};
      
      if (!specs.components || !Array.isArray(specs.components) || specs.components.length === 0) {
        console.log(`⚠️  ${build.name} has no components, adding default structure...`);
        
        // Add default component structure based on tier
        const defaultComponents = {
          'Starter': [
            { name: 'Case', value: 'KEYTECH ROBIN VIEW TEMPERED GLASS BLACK' },
            { name: 'CPU', value: 'AMD Ryzen 3 4600G (TTP) W/ AMD COOLER' },
            { name: 'Motherboard', value: 'GIGABYTE A520M-K V2' },
            { name: 'RAM', value: '8GB T-FORCE DELTA RGB DDR4 3200MHz *BLACK' },
            { name: 'Storage', value: '512GB TEAMGROUP MP33 PRO SSD NVME' },
            { name: 'PSU', value: '700W VGT KY-700 AC 110V ~ 230V 50 ~ 60Hz' }
          ],
          'Mid Tier': [
            { name: 'Case', value: 'KEYTECH ELITE ASS MESH / 4 FANS' },
            { name: 'CPU', value: 'AMD Ryzen 5 4600G (TTP) W/ AMD COOLER' },
            { name: 'Motherboard', value: 'GIGABYTE A520M-K V2' },
            { name: 'RAM', value: '16GB T-FORCE DELTA RGB DDR4 3200MHz *BLACK (2x8GB)' },
            { name: 'Storage', value: '512GB TEAMGROUP MP33 PRO SSD NVME' },
            { name: 'PSU', value: '700W VGT KY-700 AC 110V ~ 230V 50 ~ 60Hz' },
            { name: 'GPU', value: 'Optional' }
          ],
          'High Tier': [
            { name: 'Case', value: 'DARKFLASH MESH CASE / 4 FANS' },
            { name: 'CPU', value: 'AMD Ryzen 7 5700G (TTP) W/ AMD COOLER' },
            { name: 'Cooling', value: 'DEEPCOOL AK620 CPU COOLER' },
            { name: 'Motherboard', value: 'MSI B550M PRO-VDH WIFI' },
            { name: 'RAM', value: '16GB T-FORCE DELTA RGB DDR4 3600MHz (2x8GB)' },
            { name: 'Storage', value: '1TB TEAMGROUP MP44 SSD NVME' },
            { name: 'PSU', value: '850W COOLER MASTER MWE 850 V2 80+ BRONZE' },
            { name: 'GPU', value: 'Optional' }
          ],
          'Elite': [
            { name: 'Case', value: 'COOLMAN SPECTRA V4 / FANS' },
            { name: 'CPU', value: 'AMD Ryzen 9 5900X' },
            { name: 'Cooling', value: 'DARKFLASH NEBULA AIO 240' },
            { name: 'Motherboard', value: 'MSI X570 GAMING PLUS' },
            { name: 'RAM', value: '32GB T-FORCE DELTA RGB DDR4 3600MHz (2x16GB)' },
            { name: 'Storage', value: '2TB TEAMGROUP MP44 SSD NVME' },
            { name: 'PSU', value: '850W COOLER MASTER MWE 850 V2 80+ GOLD' },
            { name: 'GPU', value: 'Optional' }
          ]
        };
        
        const components = defaultComponents[build.tier] || defaultComponents['Starter'];
        
        const newSpecs = {
          ...specs,
          components: components,
          buildType: build.tier,
          componentCount: components.length
        };
        
        await query(`
          UPDATE pc_parts
          SET specifications = $1
          WHERE id = $2
        `, [JSON.stringify(newSpecs), build.id]);
        
        console.log(`✅ Added ${components.length} components to ${build.name}`);
        components.forEach(c => console.log(`     - ${c.name}: ${c.value}`));
      } else {
        console.log(`✅ ${build.name} already has ${specs.components.length} components`);
      }
    }
    
    // 5. Check image files existence
    console.log('\n\n🔍 Verifying image files exist...\n');
    const finalCheck = await query(`
      SELECT id, name, tier, image_url
      FROM pc_parts
      WHERE category = 'Pre-Built'
      ORDER BY 
        CASE tier
          WHEN 'Starter' THEN 1
          WHEN 'Mid Tier' THEN 2
          WHEN 'High Tier' THEN 3
          WHEN 'Elite' THEN 4
          ELSE 5
        END,
        id
    `);
    
    console.log('📋 Final Pre-Built products:\n');
    finalCheck.rows.forEach(row => {
      const imagePath = row.image_url ? row.image_url.replace('/assets/', '') : null;
      const fullPath = imagePath ? path.join(__dirname, 'assets', imagePath) : null;
      const exists = fullPath ? fs.existsSync(fullPath) : false;
      
      console.log(`${exists ? '✅' : '❌'} [${row.id}] ${row.tier} - ${row.name}`);
      console.log(`   Image: ${row.image_url || 'NO IMAGE'} ${exists ? '' : '(FILE MISSING)'}`);
    });
    
    console.log('\n\n✅ Pre-Built data fix completed!');
    console.log('\n📝 Summary:');
    console.log(`   - Updated tier names from Entry to Starter`);
    console.log(`   - Fixed image URLs to use /assets/ path`);
    console.log(`   - Added default components to specifications`);
    console.log(`   - Verified image file existence\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit();
  }
}

fixPreBuiltData();
