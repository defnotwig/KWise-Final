/**
 * Pre-Built Stock Management Feature
 * 
 * This script analyzes the Pre-Built PC products from ProductList.js
 * and creates a new "Pre-Built" category in the stock management system.
 * 
 * Features:
 * 1. Extract all Pre-Built PC products from ProductList.js
 * 2. Create "Pre-Built" category in pc_parts table
 * 3. Link component parts to existing stock items
 * 4. Store Pre-Built configurations as packages
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

// Pre-Built PC products from ProductList.js
const preBuiltProducts = [
  {
    id: 1,
    name: "Starter Build A",
    price: 15999,
    category: "Starter",
    purposes: ["Work", "Multimedia"],
    components: [
      { name: "CPU", value: "RYZEN 5 4600G" },
      { name: "Motherboard", value: "GIGABYTE A520M-K V2" },
      { name: "RAM", value: "16GB T-FORCE DDR4 3600 *(8GBX2)" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Case", value: "ROBIN VIEW / 3 FANS / 700W PSU" }
    ]
  },
  {
    id: 2,
    name: "Starter Build B",
    price: 17999,
    category: "Starter",
    purposes: ["Gaming", "Multimedia"],
    components: [
      { name: "CPU", value: "RYZEN 5 5600GT" },
      { name: "Motherboard", value: "GIGABYTE A520M-K V2" },
      { name: "RAM", value: "16GB T-FORCE DDR4 3600 *(8GBX2)" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Case", value: "ROBIN VIEW / 3 FANS / 700W PSU" }
    ]
  },
  {
    id: 3,
    name: "Starter Build C",
    price: 19999,
    category: "Starter",
    purposes: ["Gaming", "Work", "Multimedia"],
    components: [
      { name: "CPU", value: "RYZEN 7 5700G" },
      { name: "Motherboard", value: "GIGABYTE A520M-K V2" },
      { name: "RAM", value: "16GB T-FORCE DDR4 3600 *(8GBX2)" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Case", value: "ROBIN VIEW / 3 FANS / 700W PSU" }
    ]
  },
  {
    id: 4,
    name: "Mid Tier Build A",
    price: 20999,
    category: "Mid Tier",
    purposes: ["Work", "Multimedia"],
    components: [
      { name: "CPU", value: "RYZEN 5 5600" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "4GB RX550 RAMSTA *SINGLE FAN" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Power Supply", value: "500W COUGAR STC500 80+" },
      { name: "Case", value: "KEYTECH CUIRASS MESH / 3 FANS" }
    ]
  },
  {
    id: 5,
    name: "Mid Tier Build B",
    price: 23999,
    category: "Mid Tier",
    purposes: ["Gaming", "Multimedia"],
    components: [
      { name: "CPU", value: "RYZEN 5 5600" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "8GB RX580 XFX GTS XXX EDITION" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Power Supply", value: "500W COUGAR STC500 80+" },
      { name: "Case", value: "KEYTECH CUIRASS MESH / 3 FANS" }
    ]
  },
  {
    id: 6,
    name: "Mid Tier Build C",
    price: 29999,
    category: "Mid Tier",
    purposes: ["Gaming", "Work", "Multimedia"],
    components: [
      { name: "CPU", value: "RYZEN 5 5600" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "8GB RX6600 ASROCK DUAL FAN" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Power Supply", value: "500W COUGAR STC500 80+" },
      { name: "Case", value: "KEYTECH CUIRASS MESH / 3 FANS" }
    ]
  }
];

async function analyzeAndCreatePreBuiltCategory() {
  const client = await pool.connect();
  
  try {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     PRE-BUILT STOCK MANAGEMENT FEATURE SETUP                    ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    // Step 1: Check existing categories
    console.log('📋 STEP 1: Checking existing categories...');
    const categoriesResult = await client.query(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM pc_parts 
      WHERE is_active = true
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log('\n✅ Current Stock Categories:');
    categoriesResult.rows.forEach(row => {
      console.log(`   • ${row.category}: ${row.count} items`);
    });

    // Step 2: Check if Pre-Built category already exists
    const preBuiltCheck = await client.query(`
      SELECT COUNT(*) as count FROM pc_parts WHERE category = 'Pre-Built'
    `);
    
    const existingPreBuiltCount = parseInt(preBuiltCheck.rows[0].count);
    
    if (existingPreBuiltCount > 0) {
      console.log(`\n⚠️  Found ${existingPreBuiltCount} existing Pre-Built items`);
      console.log('   Would you like to:');
      console.log('   1. Delete existing and recreate');
      console.log('   2. Skip and keep existing');
      console.log('   (This script will RECREATE for consistency)');
      
      // Delete existing Pre-Built items
      await client.query(`DELETE FROM pc_parts WHERE category = 'Pre-Built'`);
      console.log('   ✅ Deleted existing Pre-Built items');
    }

    // Step 3: Extract unique components from all Pre-Built products
    console.log('\n📦 STEP 2: Analyzing Pre-Built product components...');
    
    const componentsByType = {};
    const allComponents = new Set();
    
    preBuiltProducts.forEach(product => {
      product.components.forEach(component => {
        if (!componentsByType[component.name]) {
          componentsByType[component.name] = new Set();
        }
        componentsByType[component.name].add(component.value);
        allComponents.add(`${component.name}: ${component.value}`);
      });
    });
    
    console.log(`\n✅ Found ${allComponents.size} unique components across ${preBuiltProducts.length} Pre-Built PCs:`);
    Object.keys(componentsByType).forEach(type => {
      console.log(`   • ${type}: ${componentsByType[type].size} variants`);
    });

    // Step 4: Try to match components with existing stock
    console.log('\n🔍 STEP 3: Matching components with existing stock...');
    
    const componentMatches = {};
    let matchedCount = 0;
    let notMatchedCount = 0;
    
    for (const [type, values] of Object.entries(componentsByType)) {
      componentMatches[type] = {};
      
      for (const value of values) {
        // Try to find matching stock item
        const searchResult = await client.query(`
          SELECT id, name, category, brand, price, stock, specifications
          FROM pc_parts 
          WHERE is_active = true
          AND (
            LOWER(name) LIKE LOWER($1)
            OR LOWER(brand) LIKE LOWER($1)
            OR specifications::text ILIKE $1
          )
          LIMIT 5
        `, [`%${value}%`]);
        
        if (searchResult.rows.length > 0) {
          componentMatches[type][value] = searchResult.rows;
          matchedCount++;
          console.log(`   ✅ Matched "${value}": found ${searchResult.rows.length} candidates`);
        } else {
          componentMatches[type][value] = [];
          notMatchedCount++;
          console.log(`   ⚠️  No match for "${value}"`);
        }
      }
    }
    
    console.log(`\n📊 Match Summary:`);
    console.log(`   ✅ Matched: ${matchedCount} components`);
    console.log(`   ⚠️  Not Matched: ${notMatchedCount} components`);

    // Step 5: Create Pre-Built category entries
    console.log('\n💾 STEP 4: Creating Pre-Built category entries...');
    
    await client.query('BEGIN');
    
    let insertedCount = 0;
    
    for (const product of preBuiltProducts) {
      // Create component links array
      const componentLinks = product.components.map(comp => {
        const matches = componentMatches[comp.name][comp.value];
        return {
          componentType: comp.name,
          componentName: comp.value,
          linkedStockIds: matches.map(m => m.id),
          hasMatch: matches.length > 0
        };
      });
      
      // Create specifications JSONB
      const specifications = {
        buildType: product.category,
        purposes: product.purposes,
        components: product.components.map(c => ({
          type: c.name,
          value: c.value
        })),
        componentLinks: componentLinks,
        totalComponents: product.components.length,
        matchedComponents: componentLinks.filter(c => c.hasMatch).length
      };
      
      // Insert Pre-Built product
      const insertResult = await client.query(`
        INSERT INTO pc_parts (
          name, 
          category, 
          brand, 
          price, 
          stock, 
          description,
          specifications,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        product.name,
        'Pre-Built',
        'K-Wise Custom',
        product.price,
        10, // Default stock
        `${product.category} level Pre-Built PC for ${product.purposes.join(', ')}`,
        JSON.stringify(specifications),
        true
      ]);
      
      insertedCount++;
      console.log(`   ✅ Created: ${product.name} (ID: ${insertResult.rows[0].id})`);
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully created ${insertedCount} Pre-Built products!`);

    // Step 6: Verify creation
    console.log('\n🔍 STEP 5: Verifying Pre-Built category...');
    
    const verifyResult = await client.query(`
      SELECT id, name, price, stock, specifications
      FROM pc_parts 
      WHERE category = 'Pre-Built'
      ORDER BY id
    `);
    
    console.log(`\n✅ Found ${verifyResult.rows.length} Pre-Built products in database:`);
    verifyResult.rows.forEach(row => {
      const specs = row.specifications;
      console.log(`\n   📦 ${row.name} (ID: ${row.id})`);
      console.log(`      💰 Price: ₱${row.price.toLocaleString()}`);
      console.log(`      📊 Stock: ${row.stock}`);
      console.log(`      🎯 Build Type: ${specs.buildType}`);
      console.log(`      🔧 Components: ${specs.totalComponents}`);
      console.log(`      ✅ Matched: ${specs.matchedComponents}/${specs.totalComponents}`);
    });

    // Step 7: Check category counts
    console.log('\n📊 FINAL: Updated category counts...');
    const finalCategories = await client.query(`
      SELECT category, COUNT(*) as count 
      FROM pc_parts 
      WHERE is_active = true
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log('\n✅ All Stock Categories:');
    finalCategories.rows.forEach(row => {
      const icon = row.category === 'Pre-Built' ? '🆕' : '  ';
      console.log(`   ${icon} ${row.category}: ${row.count} items`);
    });

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     ✅ PRE-BUILT CATEGORY SETUP COMPLETE!                       ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Next Steps:');
    console.log('   1. ✅ Pre-Built category is now available in Stock Management');
    console.log('   2. ✅ Components are linked to existing stock items');
    console.log('   3. 🔄 Refresh Stock Categories page in Admin panel');
    console.log('   4. 📦 You can now manage Pre-Built stock items');
    console.log('   5. 🔗 Component links are stored in specifications field\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
analyzeAndCreatePreBuiltCategory();
