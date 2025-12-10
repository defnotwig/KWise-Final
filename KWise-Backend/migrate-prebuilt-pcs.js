/**
 * =====================================================================
 * PREBUILT PC SYSTEM - COMPREHENSIVE FIX & DATABASE MIGRATION
 * =====================================================================
 * 
 * ROOT CAUSES IDENTIFIED:
 * 1. Static data in ProductList.js (18 prebuilt PCs hardcoded)
 * 2. No dynamic API integration for prebuilt PCs
 * 3. Existing prebuilt_pcs table has wrong structure/data
 * 4. No link between prebuilt components and actual stock
 * 
 * SOLUTION:
 * 1. Migrate 18 static prebuilt PCs to database with proper structure
 * 2. Link each component to actual pc_parts stock
 * 3. Create API endpoints for dynamic serving
 * 4. Update frontend to use API instead of static data
 * 5. Admin can manage prebuilt PCs through stock system
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'humbleludwig13'
});

// Static prebuilt PCs from ProductList.js with purposes
const PREBUILT_PCS = [
  {
    name: "Starter Build A",
    price: 15999,
    category: "Starter",
    purposes: ["Work", "Multimedia"],
    image_url: "/assets/StarterBuildA.webp",
    components: [
      { type: "CPU", name: "RYZEN 5 4600G" },
      { type: "Motherboard", name: "GIGABYTE A520M-K V2" },
      { type: "RAM", name: "16GB T-FORCE DDR4 3600 *(8GBX2)" },
      { type: "Storage", name: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { type: "Case", name: "ROBIN VIEW / 3 FANS / 700W PSU" },
    ],
    addons: [
      { name: "20' NVISION LED MONITOR", price: 2500 },
      { name: "22' ACER IPS FRAMELESS MONITOR 100HZ", price: 4300 },
      { name: "24.5' ACER FRAMELESS IPS MONITOR 120HZ", price: 5500 }
    ]
  },
  {
    name: "Starter Build B",
    price: 17999,
    category: "Starter",
    purposes: ["Gaming", "Multimedia"],
    image_url: "/assets/StarterBuildB.webp",
    components: [
      { type: "CPU", name: "RYZEN 5 5600GT" },
      { type: "Motherboard", name: "GIGABYTE A520M-K V2" },
      { type: "RAM", name: "16GB T-FORCE DDR4 3600 *(8GBX2)" },
      { type: "Storage", name: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { type: "Case", name: "ROBIN VIEW / 3 FANS / 700W PSU" },
    ],
    addons: [
      { name: "20' NVISION LED MONITOR", price: 2500 },
      { name: "22' ACER IPS FRAMELESS MONITOR 100HZ", price: 4300 },
      { name: "24.5' ACER FRAMELESS IPS MONITOR 120HZ", price: 5500 }
    ]
  },
  {
    name: "Starter Build C",
    price: 19999,
    category: "Starter",
    purposes: ["Gaming", "Work", "Multimedia"],
    image_url: "/assets/StarterBuildC.webp",
    components: [
      { type: "CPU", name: "RYZEN 7 5700G" },
      { type: "Motherboard", name: "GIGABYTE A520M-K V2" },
      { type: "RAM", name: "16GB T-FORCE DDR4 3600 *(8GBX2)" },
      { type: "Storage", name: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { type: "Case", name: "ROBIN VIEW / 3 FANS / 700W PSU" },
    ],
    addons: [
      { name: "20' NVISION LED MONITOR", price: 2500 },
      { name: "22' ACER IPS FRAMELESS MONITOR 100HZ", price: 4300 },
      { name: "24.5' ACER FRAMELESS IPS MONITOR 120HZ", price: 5500 }
    ]
  },
  {
    name: "Mid Tier Build A",
    price: 20999,
    category: "Mid Tier",
    purposes: ["Work", "Multimedia"],
    image_url: "/assets/MidEntryBuildA.webp",
    components: [
      { type: "CPU", name: "RYZEN 5 5600" },
      { type: "Motherboard", name: "GIGABYTE B450M-K" },
      { type: "GPU", name: "4GB RX550 RAMSTA *SINGLE FAN" },
      { type: "RAM", name: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { type: "Storage", name: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { type: "PSU", name: "500W COUGAR STC500 80+" },
      { type: "Case", name: "KEYTECH CUIRASS MESH / 3 FANS" },
    ],
    addons: [
      { name: "22' ACER IPS FRAMELESS MONITOR 100HZ", price: 4300 },
      { name: "24.5' ACER FRAMELESS IPS MONITOR 120HZ", price: 5500 },
      { name: "HKC 24' FRAMELESS MONITOR 180HZ", price: 6000 },
    ]
  },
  {
    name: "Mid Tier Build B",
    price: 23999,
    category: "Mid Tier",
    purposes: ["Gaming", "Multimedia"],
    image_url: "/assets/MidEntryBuildB.webp",
    components: [
      { type: "CPU", name: "RYZEN 5 5600" },
      { type: "Motherboard", name: "GIGABYTE B450M-K" },
      { type: "GPU", name: "8GB RX580 XFX GTS XXX EDITION" },
      { type: "RAM", name: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { type: "Storage", name: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { type: "PSU", name: "500W COUGAR STC500 80+" },
      { type: "Case", name: "KEYTECH CUIRASS MESH / 3 FANS" },
    ],
    addons: [
      { name: "22' ACER IPS FRAMELESS MONITOR 100HZ", price: 4300 },
      { name: "24.5' ACER FRAMELESS IPS MONITOR 120HZ", price: 5500 },
      { name: "HKC 24' FRAMELESS MONITOR 180HZ", price: 6000 },
    ]
  },
  {
    name: "Mid Tier Build C",
    price: 29999,
    category: "Mid Tier",
    purposes: ["Gaming", "Work", "Multimedia"],
    image_url: "/assets/MidEntryBuildC.webp",
    components: [
      { type: "CPU", name: "RYZEN 5 5600" },
      { type: "Motherboard", name: "GIGABYTE B450M-K" },
      { type: "GPU", name: "8GB RX6600 ASROCK DUAL FAN" },
      { type: "RAM", name: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { type: "Storage", name: "512GB TEAMGROUP MP33 PRO SSD NVME" },
      { type: "PSU", name: "500W COUGAR STC500 80+" },
      { type: "Case", name: "KEYTECH CUIRASS MESH / 3 FANS" },
    ],
    addons: [
      { name: "22' ACER IPS FRAMELESS MONITOR 100HZ", price: 4300 },
      { name: "24.5' ACER FRAMELESS IPS MONITOR 120HZ", price: 5500 },
      { name: "HKC 24' FRAMELESS MONITOR 180HZ", price: 6000 },
    ]
  },
  {
    name: "High Tier Build A",
    price: 35999,
    category: "High Tier",
    purposes: ["Gaming", "Work"],
    image_url: "/assets/MidTierBuildA.webp",
    components: [
      { type: "CPU", name: "RYZEN 5 5600" },
      { type: "Motherboard", name: "GIGABYTE B450M-K" },
      { type: "GPU", name: "8GB RTX4060 GALAX 1CLICK OC DUAL FAN" },
      { type: "RAM", name: "16GB T-FORCE DARK-ZA DDR4 3600" },
      { type: "Storage", name: "512GB TEAMGROUP MP33 PRO NVME" },
      { type: "PSU", name: "550W GIGABYTE P550SS 80+ SILVER" },
      { type: "Case", name: "DARKFLASH MESH CASE *3 FANS" },
    ],
    addons: [
      { name: "24.5' ACER FRAMELESS IPS MONITOR 120HZ", price: 5500 },
      { name: "HKC 24' FRAMELESS MONITOR 180HZ", price: 6000 },
      { name: "24' ACER NITRO FRMLESS IPS MONITOR 200HZ", price: 8500 },
    ]
  },
  {
    name: "High Tier Build B",
    price: 39999,
    category: "High Tier",
    purposes: ["Work", "Multimedia"],
    image_url: "/assets/MidTierBuildB.webp",
    components: [
      { type: "CPU", name: "RYZEN 7 5700X" },
      { type: "Motherboard", name: "GIGABYTE B450M-K" },
      { type: "GPU", name: "8GB RTX4060 GALAX 1CLICK OC DUAL FAN" },
      { type: "RAM", name: "16GB T-FORCE DARK-ZA DDR4 3600 *(8GBX2)" },
      { type: "Storage", name: "1TB ADATA LEGEND NVME" },
      { type: "PSU", name: "550W GIGABYTE P550SS 80+ SILVER" },
      { type: "Case", name: "DARKFLASH MESH CASE *3 FANS" },
      { type: "Cooling", name: "DEEPCOOL AK400 CPU COOLER" },
    ],
    addons: [
      { name: "24.5' ACER FRAMELESS IPS MONITOR 120HZ", price: 5500 },
      { name: "HKC 24' FRAMELESS MONITOR 180HZ", price: 6000 },
      { name: "24' ACER NITRO FRMLESS IPS MONITOR 200HZ", price: 8500 },
    ]
  },
  {
    name: "High Tier Build C",
    price: 46999,
    category: "High Tier",
    purposes: ["Gaming", "Multimedia"],
    image_url: "/assets/MidTierBuildC.webp",
    components: [
      { type: "CPU", name: "RYZEN 7 5700X" },
      { type: "Motherboard", name: "GIGABYTE B450M-K" },
      { type: "GPU", name: "16GB RX7600XT GIGABYTE GAMING" },
      { type: "RAM", name: "16GB T-FORCE DARK-ZA DDR4 3600 *(8GBX2)" },
      { type: "Storage", name: "1TB ADATA LEGEND NVME" },
      { type: "PSU", name: "650W CORSAIR CX650 80+ BRONZE" },
      { type: "Case", name: "DARKFLASH MESH CASE *3 FANS" },
      { type: "Cooling", name: "DEEPCOOL AK400 CPU COOLER" },
    ],
    addons: [
      { name: "24.5' ACER FRAMELESS IPS MONITOR 120HZ", price: 5500 },
      { name: "HKC 24' FRAMELESS MONITOR 180HZ", price: 6000 },
      { name: "24' ACER NITRO FRMLESS IPS MONITOR 200HZ", price: 8500 },
    ]
  },
  {
    name: "High Tier Build D",
    price: 47999,
    category: "High Tier",
    purposes: ["Gaming", "Work", "Multimedia"],
    image_url: "/assets/MidTierBuildD.webp",
    components: [
      { type: "CPU", name: "RYZEN 7 5700X" },
      { type: "Motherboard", name: "GIGABYTE B450M-K" },
      { type: "GPU", name: "8GB RTX4060TI GIGABYTE EAGLE" },
      { type: "RAM", name: "16GB T-FORCE DARK-ZA DDR4 3600 *(8GBX2)" },
      { type: "Storage", name: "1TB ADATA LEGEND NVME" },
      { type: "PSU", name: "650W CORSAIR CX650 80+ BRONZE" },
      { type: "Case", name: "DARKFLASH MESH CASE *3 FANS" },
      { type: "Cooling", name: "DEEPCOOL AK400 CPU COOLER" },
    ],
    addons: [
      { name: "24.5' ACER FRAMELESS IPS MONITOR 120HZ", price: 5500 },
      { name: "HKC 24' FRAMELESS MONITOR 180HZ", price: 6000 },
      { name: "24' ACER NITRO FRMLESS IPS MONITOR 200HZ", price: 8500 },
    ]
  },
  {
    name: "Elite Build A",
    price: 57999,
    category: "Elite",
    purposes: ["Gaming", "Multimedia"],
    image_url: "/assets/HighMidTierBuildA.webp",
    components: [
      { type: "CPU", name: "RYZEN 7 5700X" },
      { type: "Motherboard", name: "GIGABYTE B450M-K" },
      { type: "GPU", name: "8GB RTX4060TI GIGABYTE EAGLE" },
      { type: "RAM", name: "16GB T-FORCE DARK-ZA DDR4 3600 *(8GBX2)" },
      { type: "Storage", name: "1TB ADATA LEGEND NVME" },
      { type: "PSU", name: "650W CORSAIR CX650 80+ BRONZE" },
      { type: "Case", name: "DARKFLASH MESH CASE *3 FANS" },
      { type: "Cooling", name: "DEEPCOOL AK620 CPU COOLER" },
    ],
    addons: [
      { name: "HKC 24' FRAMELESS MONITOR 180HZ", price: 6000 },
      { name: "24' ACER NITRO FRMLESS IPS MONITOR 200HZ", price: 8500 },
      { name: "34' HKC ULTRA WIDE FRMLESS 165HZ 2K RESO", price: 14500 },
    ]
  },
  {
    name: "Elite Build B",
    price: 63999,
    category: "Elite",
    purposes: ["Gaming", "Work", "Multimedia"],
    image_url: "/assets/HighMidTierBuildB.webp",
    components: [
      { type: "CPU", name: "RYZEN 7 8700F" },
      { type: "Motherboard", name: "GIGABYTE B650M GAMING WIFI" },
      { type: "GPU", name: "8GB RTX4060TI GIGABYTE TRI FAN" },
      { type: "RAM", name: "32GB T-FORCE DELTA DDR5 6000 *(16GBX2)" },
      { type: "Storage", name: "1TB ADATA LEGEND NVME" },
      { type: "PSU", name: "750W CORSAIR CX750 80+ BRONZE" },
      { type: "Case", name: "COOLMAN SPECTRA *6 FANS" },
      { type: "Cooling", name: "DARKFLASH NEBULA AIO 240" },
    ],
    addons: [
      { name: "HKC 24' FRAMELESS MONITOR 180HZ", price: 6000 },
      { name: "24' ACER NITRO FRMLESS IPS MONITOR 200HZ", price: 8500 },
      { name: "34' HKC ULTRA WIDE FRMLESS 165HZ 2K RESO", price: 14500 },
    ]
  },
  {
    name: "Elite Build C",
    price: 80999,
    category: "Elite",
    purposes: ["Gaming", "Work", "Multimedia"],
    image_url: "/assets/HighMidTierBuildC.webp",
    components: [
      { type: "CPU", name: "RYZEN 7 8700F" },
      { type: "Motherboard", name: "GIGABYTE B650M GAMING WIFI" },
      { type: "GPU", name: "8GB RTX4060TI GIGABYTE TRI FAN" },
      { type: "RAM", name: "32GB T-FORCE DELTA DDR5 6000 *(16GBX2)" },
      { type: "Storage", name: "1TB ADATA LEGEND NVME" },
      { type: "PSU", name: "750W CORSAIR CX750 80+ BRONZE" },
      { type: "Case", name: "COOLMAN SPECTRA *6 FANS" },
      { type: "Cooling", name: "DARKFLASH NEBULA AIO 240" },
    ],
    addons: [
      { name: "HKC 24' FRAMELESS MONITOR 180HZ", price: 6000 },
      { name: "24' ACER NITRO FRMLESS IPS MONITOR 200HZ", price: 8500 },
      { name: "34' HKC ULTRA WIDE FRMLESS 165HZ 2K RESO", price: 14500 },
    ]
  },
];

async function migratePrebuiltPCs() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting Prebuilt PC Migration...\n');
    
    // Step 1: Clear existing prebuilt data
    console.log('📦 Step 1: Clearing existing prebuilt data...');
    await client.query('DELETE FROM prebuilt_components');
    await client.query('DELETE FROM prebuilt_pcs');
    await client.query('ALTER SEQUENCE prebuilt_pcs_id_seq RESTART WITH 1');
    console.log('✅ Existing data cleared\n');
    
    // Step 2: Add missing columns to prebuilt_pcs if needed
    console.log('📦 Step 2: Updating prebuilt_pcs table structure...');
    
    // Add purposes column (array of text)
    await client.query(`
      ALTER TABLE prebuilt_pcs 
      ADD COLUMN IF NOT EXISTS purposes TEXT[]
    `);
    
    // Add addons column (JSONB array)
    await client.query(`
      ALTER TABLE prebuilt_pcs 
      ADD COLUMN IF NOT EXISTS addons JSONB
    `);
    
    // Make pc_part_id nullable (allow components without stock match)
    await client.query(`
      ALTER TABLE prebuilt_components 
      ALTER COLUMN pc_part_id DROP NOT NULL
    `);
    
    console.log('✅ Table structure updated\n');
    
    // Step 3: Insert prebuilt PCs
    console.log('📦 Step 3: Inserting prebuilt PCs...');
    
    let insertedCount = 0;
    
    for (const pc of PREBUILT_PCS) {
      const result = await client.query(`
        INSERT INTO prebuilt_pcs (
          name, category, total_price, description,
          image_url, is_featured, is_available,
          stock_quantity, build_time_hours, warranty_months,
          display_order, purposes, addons
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [
        pc.name,
        pc.category,
        pc.price,
        `${pc.category} level prebuilt PC for ${pc.purposes.join(', ')}`,
        pc.image_url,
        true, // is_featured
        true, // is_available
        10, // stock_quantity
        4, // build_time_hours
        12, // warranty_months
        insertedCount + 1, // display_order
        pc.purposes, // purposes array
        JSON.stringify(pc.addons) // addons JSONB
      ]);
      
      const prebuiltId = result.rows[0].id;
      
      // Insert components
      for (const component of pc.components) {
        // Try to find matching part in stock
        const stockPart = await client.query(`
          SELECT id FROM pc_parts 
          WHERE UPPER(name) LIKE UPPER($1) 
          AND category = $2
          AND kiosk_visible = true
          LIMIT 1
        `, [`%${component.name.split(' ').slice(0, 3).join('%')}%`, component.type]);
        
        const partId = stockPart.rows.length > 0 ? stockPart.rows[0].id : null;
        
        await client.query(`
          INSERT INTO prebuilt_components (
            prebuilt_pc_id, pc_part_id, component_role, 
            quantity, is_optional
          )
          VALUES ($1, $2, $3, $4, $5)
        `, [
          prebuiltId,
          partId, // Will be null if not found in stock
          `${component.type}: ${component.name}`,
          1, // quantity
          false // is_optional
        ]);
      }
      
      insertedCount++;
      console.log(`   ✅ ${pc.name} (${pc.purposes.join(', ')})`);
    }
    
    console.log(`\n✅ Inserted ${insertedCount} prebuilt PCs\n`);
    
    // Step 4: Verify migration
    console.log('📦 Step 4: Verifying migration...');
    
    const countResult = await client.query('SELECT COUNT(*) as count FROM prebuilt_pcs');
    const componentsResult = await client.query('SELECT COUNT(*) as count FROM prebuilt_components');
    const linkedResult = await client.query('SELECT COUNT(*) as count FROM prebuilt_components WHERE pc_part_id IS NOT NULL');
    
    console.log(`   Total PreBuilt PCs: ${countResult.rows[0].count}`);
    console.log(`   Total Components: ${componentsResult.rows[0].count}`);
    console.log(`   Linked to Stock: ${linkedResult.rows[0].count}\n`);
    
    // Step 5: Show sample data
    console.log('📦 Step 5: Sample data:');
    const sample = await client.query(`
      SELECT id, name, category, total_price, purposes
      FROM prebuilt_pcs
      ORDER BY display_order
      LIMIT 5
    `);
    
    console.table(sample.rows);
    
    await client.query('COMMIT');
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migratePrebuiltPCs().catch(console.error);
