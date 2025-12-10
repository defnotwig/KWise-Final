const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

// ALL 13 Pre-Built products from ProductList.js
const preBuiltProducts = [
  {
    id: 1,
    name: "Starter Build A",
    price: 15999,
    category: "Starter",
    purposes: ["Work", "Multimedia"],
    image: "StarterBuildA.webp",
    components: [
      { name: "CPU", value: "RYZEN 5 4600G" },
      { name: "Motherboard", value: "GIGABYTE A520M-K V2" },
      { name: "RAM", value: "16GB T-FORCE DDR4 3600 *(8GBX2)" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Case", value: "ROBIN VIEW / 3 FANS / 700W PSU" },
    ]
  },
  {
    id: 2,
    name: "Starter Build B",
    price: 17999,
    category: "Starter",
    purposes: ["Gaming", "Multimedia"],
    image: "StarterBuildB.webp",
    components: [
      { name: "CPU", value: "RYZEN 5 5600GT" },
      { name: "Motherboard", value: "GIGABYTE A520M-K V2" },
      { name: "RAM", value: "16GB T-FORCE DDR4 3600 *(8GBX2)" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Case", value: "ROBIN VIEW / 3 FANS / 700W PSU" },
    ]
  },
  {
    id: 3,
    name: "Starter Build C",
    price: 19999,
    category: "Starter",
    purposes: ["Gaming", "Work", "Multimedia"],
    image: "StarterBuildC.webp",
    components: [
      { name: "CPU", value: "RYZEN 7 5700G" },
      { name: "Motherboard", value: "GIGABYTE A520M-K V2" },
      { name: "RAM", value: "16GB T-FORCE DDR4 3600 *(8GBX2)" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Case", value: "ROBIN VIEW / 3 FANS / 700W PSU" },
    ]
  },
  {
    id: 4,
    name: "Mid Tier Build A",
    price: 20999,
    category: "Mid Tier",
    purposes: ["Work", "Multimedia"],
    image: "MidEntryBuildA.webp",
    components: [
      { name: "CPU", value: "RYZEN 5 5600" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "4GB RX550 RAMSTA *SINGLE FAN" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Power Supply", value: "500W COUGAR STC500 80+" },
      { name: "Case", value: "KEYTECH CUIRASS MESH / 3 FANS" },
    ]
  },
  {
    id: 5,
    name: "Mid Tier Build B",
    price: 23999,
    category: "Mid Tier",
    purposes: ["Gaming", "Multimedia"],
    image: "MidEntryBuildB.webp",
    components: [
      { name: "CPU", value: "RYZEN 5 5600" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "8GB RX580 XFX GTS XXX EDITION" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Power Supply", value: "500W COUGAR STC500 80+" },
      { name: "Case", value: "KEYTECH CUIRASS MESH / 3 FANS" },
    ]
  },
  {
    id: 6,
    name: "Mid Tier Build C",
    price: 29999,
    category: "Mid Tier",
    purposes: ["Gaming", "Work", "Multimedia"],
    image: "MidEntryBuildC.webp",
    components: [
      { name: "CPU", value: "RYZEN 5 5600" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "8GB RX6600 ASROCK DUAL FAN" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { name: "Power Supply", value: "500W COUGAR STC500 80+" },
      { name: "Case", value: "KEYTECH CUIRASS MESH / 3 FANS" },
    ]
  },
  {
    id: 7,
    name: "High Tier Build A",
    price: 35999,
    category: "High Tier",
    purposes: ["Gaming", "Work"],
    image: "MidTierBuildA.webp",
    components: [
      { name: "CPU", value: "RYZEN 5 5600" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "8GB RTX4060 GALAX 1CLICK OC DUAL FAN" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { name: "Storage", value: "512GB TEAMGROUP MP33 PRO NVME" },
      { name: "Power Supply", value: "550W GIGABYTE P550SS 80+ SILVER" },
      { name: "Case", value: "DARKFLASH MESH CASE *3 FANS" },
    ]
  },
  {
    id: 8,
    name: "High Tier Build B",
    price: 39999,
    category: "High Tier",
    purposes: ["Work", "Multimedia"],
    image: "MidTierBuildB.webp",
    components: [
      { name: "CPU", value: "RYZEN 7 5700X" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "8GB RTX4060 GALAX 1CLICK OC DUAL FAN" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600 *(8GBX2)" },
      { name: "Storage", value: "1TB ADATA LEGEND NVME" },
      { name: "Power Supply", value: "550W GIGABYTE P550SS 80+ SILVER" },
      { name: "Case", value: "DARKFLASH MESH CASE *3 FANS" },
      { name: "Cooling", value: "DEEPCOOL AK400 CPU COOLER" },
    ]
  },
  {
    id: 9,
    name: "High Tier Build C",
    price: 46999,
    category: "High Tier",
    purposes: ["Gaming", "Multimedia"],
    image: "MidTierBuildC.webp",
    components: [
      { name: "CPU", value: "RYZEN 7 5700X" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "16GB RX7600XT GIGABYTE GAMING" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600 *(8GBX2)" },
      { name: "Storage", value: "1TB ADATA LEGEND NVME" },
      { name: "Power Supply", value: "650W CORSAIR CX650 80+ BRONZE" },
      { name: "Case", value: "DARKFLASH MESH CASE *3 FANS" },
      { name: "Cooling", value: "DEEPCOOL AK400 CPU COOLER" },
    ]
  },
  {
    id: 10,
    name: "High Tier Build D",
    price: 47999,
    category: "High Tier",
    purposes: ["Gaming", "Work", "Multimedia"],
    image: "MidTierBuildD.webp",
    components: [
      { name: "CPU", value: "RYZEN 7 5700X" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "8GB RTX4060TI GIGABYTE EAGLE" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600 *(8GBX2)" },
      { name: "Storage", value: "1TB ADATA LEGEND NVME" },
      { name: "Power Supply", value: "650W CORSAIR CX650 80+ BRONZE" },
      { name: "Case", value: "DARKFLASH MESH CASE *3 FANS" },
      { name: "Cooling", value: "DEEPCOOL AK400 CPU COOLER" },
    ]
  },
  {
    id: 11,
    name: "Elite Build A",
    price: 57999,
    category: "Elite",
    purposes: ["Gaming", "Multimedia"],
    image: "HighMidTierBuildA.webp",
    components: [
      { name: "CPU", value: "RYZEN 7 5700X" },
      { name: "Motherboard", value: "GIGABYTE B450M-K" },
      { name: "GPU", value: "8GB RTX4060TI GIGABYTE EAGLE" },
      { name: "RAM", value: "16GB T-FORCE DARK-ZA DDR4 3600 *(8GBX2)" },
      { name: "Storage", value: "1TB ADATA LEGEND NVME" },
      { name: "Power Supply", value: "650W CORSAIR CX650 80+ BRONZE" },
      { name: "Case", value: "DARKFLASH MESH CASE *3 FANS" },
      { name: "Cooling", value: "DEEPCOOL AK620 CPU COOLER" },
    ]
  },
  {
    id: 12,
    name: "Elite Build B",
    price: 63999,
    category: "Elite",
    purposes: ["Gaming", "Work", "Multimedia"],
    image: "HighMidTierBuildB.webp",
    components: [
      { name: "CPU", value: "RYZEN 7 8700F" },
      { name: "Motherboard", value: "GIGABYTE B650M GAMING WIFI" },
      { name: "GPU", value: "8GB RTX4060TI GIGABYTE TRI FAN" },
      { name: "RAM", value: "32GB T-FORCE DELTA DDR5 6000 *(16GBX2)" },
      { name: "Storage", value: "1TB ADATA LEGEND NVME" },
      { name: "Power Supply", value: "750W CORSAIR CX750 80+ BRONZE" },
      { name: "Case", value: "COOLMAN SPECTRA *6 FANS" },
      { name: "Cooling", value: "DARKFLASH NEBULA AIO 240" },
    ]
  },
  {
    id: 13,
    name: "Elite Build C",
    price: 80999,
    category: "Elite",
    purposes: ["Gaming", "Work", "Multimedia"],
    image: "HighMidTierBuildC.webp",
    components: [
      { name: "CPU", value: "RYZEN 7 8700F" },
      { name: "Motherboard", value: "GIGABYTE B650M GAMING WIFI" },
      { name: "GPU", value: "8GB RTX4060TI GIGABYTE TRI FAN" },
      { name: "RAM", value: "32GB T-FORCE DELTA DDR5 6000 *(16GBX2)" },
      { name: "Storage", value: "1TB ADATA LEGEND NVME" },
      { name: "Power Supply", value: "750W CORSAIR CX750 80+ BRONZE" },
      { name: "Case", value: "COOLMAN SPECTRA *6 FANS" },
      { name: "Cooling", value: "DARKFLASH NEBULA AIO 240" },
    ]
  },
];

// Helper function to search for component in stock
async function searchComponentInStock(componentType, componentValue) {
  const searchTerm = `%${componentValue}%`;
  
  const result = await pool.query(`
    SELECT id, name, brand, category, stock, price
    FROM pc_parts
    WHERE is_active = true
      AND (
        LOWER(name) LIKE LOWER($1)
        OR LOWER(brand) LIKE LOWER($1)
        OR specifications::text ILIKE $1
      )
    ORDER BY 
      CASE 
        WHEN LOWER(name) LIKE LOWER($1) THEN 1
        WHEN LOWER(brand) LIKE LOWER($1) THEN 2
        ELSE 3
      END
    LIMIT 5
  `, [searchTerm]);

  return result.rows;
}

// Calculate minimum stock from all components
async function calculateMinimumStock(components) {
  let minStock = null;
  
  for (const component of components) {
    const matches = await searchComponentInStock(component.name, component.value);
    
    if (matches.length > 0) {
      const stockValue = matches[0].stock;
      if (minStock === null || stockValue < minStock) {
        minStock = stockValue;
      }
    }
  }
  
  // If no components matched, default to 0
  return minStock !== null ? minStock : 0;
}

async function setupCompletePreBuiltCategory() {
  const client = await pool.connect();
  
  try {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('     COMPLETE PRE-BUILT CATEGORY SETUP - ALL 13 PRODUCTS');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    await client.query('BEGIN');

    // Step 1: Delete existing Pre-Built products
    console.log('📋 STEP 1: Cleaning existing Pre-Built products...');
    const deleteResult = await client.query(`
      DELETE FROM pc_parts WHERE category = 'Pre-Built'
    `);
    console.log(`✅ Deleted ${deleteResult.rowCount} existing Pre-Built products\n`);

    // Step 2: Process each Pre-Built product
    console.log('📦 STEP 2: Creating all 13 Pre-Built products...\n');
    
    let createdCount = 0;
    const startId = 12010;  // Start after existing IDs

    for (let i = 0; i < preBuiltProducts.length; i++) {
      const product = preBuiltProducts[i];
      const dbId = startId + i;
      
      console.log(`   Processing ${i + 1}/13: ${product.name}...`);
      
      // Extract unique components by type
      const componentsByType = {};
      product.components.forEach(comp => {
        if (!componentsByType[comp.name]) {
          componentsByType[comp.name] = [];
        }
        if (!componentsByType[comp.name].includes(comp.value)) {
          componentsByType[comp.name].push(comp.value);
        }
      });

      // Search for matching components in stock
      console.log(`      🔍 Matching ${product.components.length} components...`);
      const componentLinks = [];
      let matchedCount = 0;

      for (const component of product.components) {
        const matches = await searchComponentInStock(component.name, component.value);
        
        const link = {
          componentType: component.name,
          componentName: component.value,
          linkedStockIds: matches.map(m => m.id),
          hasMatch: matches.length > 0,
          matchDetails: matches.map(m => ({
            id: m.id,
            name: m.name,
            brand: m.brand,
            category: m.category,
            stock: m.stock,
            price: parseFloat(m.price)
          }))
        };

        componentLinks.push(link);
        
        if (matches.length > 0) {
          matchedCount++;
        }
      }

      // Calculate minimum stock based on component availability
      const minimumStock = await calculateMinimumStock(product.components);
      
      console.log(`      ✅ Matched ${matchedCount}/${product.components.length} components`);
      console.log(`      📊 Calculated stock: ${minimumStock}`);

      // Build specifications JSONB
      const specifications = {
        buildType: product.category,
        purposes: product.purposes,
        components: product.components,
        componentLinks: componentLinks,
        totalComponents: product.components.length,
        matchedComponents: matchedCount,
        minimumStock: minimumStock,
        imageFile: product.image
      };

      // Build description
      const description = `${product.category} level Pre-Built PC for ${product.purposes.join(', ')}. ` +
        `Components: ${product.components.map(c => c.value).join(', ')}`;

      // Insert into database
      const insertResult = await client.query(`
        INSERT INTO pc_parts (
          id, name, category, brand, price, stock, description, 
          specifications, is_active, image_url, 
          kiosk_visible, kiosk_featured, tier
        ) VALUES (
          $1, $2, 'Pre-Built', 'K-Wise Custom', $3, $4, $5, 
          $6, true, $7,
          true, false, $8
        )
        RETURNING id, name, price, stock
      `, [
        dbId,
        product.name,
        product.price,
        minimumStock,  // Dynamic stock based on components
        description,
        JSON.stringify(specifications),
        `/uploads/prebuilt/${product.image}`,  // Image path
        product.category
      ]);

      console.log(`      ✅ Created: ${insertResult.rows[0].name} (ID: ${insertResult.rows[0].id}, Stock: ${insertResult.rows[0].stock})\n`);
      createdCount++;
    }

    await client.query('COMMIT');
    
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`     ✅ SUCCESS! Created ${createdCount}/13 Pre-Built products`);
    console.log('═══════════════════════════════════════════════════════════════════\n');

    // Step 3: Verify results
    console.log('🔍 STEP 3: Verifying Pre-Built category...');
    const verifyResult = await pool.query(`
      SELECT id, name, price, stock, tier, image_url,
             specifications->>'totalComponents' as total_components,
             specifications->>'matchedComponents' as matched_components,
             specifications->>'minimumStock' as min_stock
      FROM pc_parts 
      WHERE category = 'Pre-Built'
      ORDER BY id
    `);

    console.log(`✅ Found ${verifyResult.rows.length} Pre-Built products in database:\n`);
    verifyResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.name} (ID: ${row.id})`);
      console.log(`      Price: ₱${parseFloat(row.price).toLocaleString()}`);
      console.log(`      Stock: ${row.stock} (based on component availability)`);
      console.log(`      Tier: ${row.tier}`);
      console.log(`      Components: ${row.matched_components}/${row.total_components} matched`);
      console.log(`      Image: ${row.image_url || 'NO IMAGE'}`);
      console.log('');
    });

    // Step 4: Show category counts
    console.log('📊 STEP 4: Updated category counts...');
    const categoryResult = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM pc_parts
      WHERE is_active = true
      GROUP BY category
      ORDER BY category
    `);

    console.log('✅ All Stock Categories:');
    categoryResult.rows.forEach(row => {
      const icon = row.category === 'Pre-Built' ? '🆕' : '   ';
      console.log(`   ${icon} ${row.category}: ${row.count} items`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('     ✅ COMPLETE PRE-BUILT SETUP FINISHED!');
    console.log('═══════════════════════════════════════════════════════════════════');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    client.release();
  }
}

// Run the setup
setupCompletePreBuiltCategory()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    pool.end();
    process.exit(1);
  });
