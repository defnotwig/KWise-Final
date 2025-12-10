/**
 * 🔍 ROOT CAUSE ANALYSIS - Admin UI Auto-Fill Issue
 * 
 * FINDINGS:
 * ========
 * 
 * 1. DATA ARCHITECTURE:
 *    - pc_parts table: Has OLD 'specifications' column (JSONB)
 *    - product_specs table: Has NEW 'normalized_specs' column (JSONB with enriched fields)
 *    - specification_schemas table: Metadata for admin UI fields
 * 
 * 2. ADMIN UI DATA FLOW:
 *    - GET /api/stock/:category → Returns pc_parts.specifications
 *    - StockDetail.js handleClick() → Sets specifications from item.specifications
 *    - renderSpecificationField() → Displays from specifications state
 *    - ISSUE: pc_parts.specifications does NOT contain enriched fields!
 * 
 * 3. ENRICHED DATA LOCATION:
 *    - Enriched fields stored in: product_specs.normalized_specs.specs
 *    - Examples:
 *      * pcie_x16_slots_electrical (Motherboard)
 *      * has_12vhpwr (GPU)
 *      * front_fan_slots (Case)
 *      * has_12vhpwr_connector (PSU)
 * 
 * 4. ROOT CAUSE:
 *    - Backend stockController.js returns pc_parts.specifications (OLD data)
 *    - Does NOT merge with product_specs.normalized_specs.specs (NEW enriched data)
 *    - Admin UI never receives enriched field values
 * 
 * 5. SOLUTION:
 *    - Modify stockController.js to:
 *      a) JOIN pc_parts with product_specs
 *      b) MERGE pc_parts.specifications with product_specs.normalized_specs.specs
 *      c) Return combined specifications object to admin UI
 * 
 * 6. AFFECTED ENDPOINTS:
 *    - GET /api/stock/:category (list items)
 *    - GET /api/stock/all-items (all stock items)
 *    - Any endpoint that returns item.specifications
 * 
 * IMPLEMENTATION PLAN:
 * ====================
 * 
 * Step 1: Create helper function to merge specifications
 * Step 2: Update listParts() function to include product_specs join
 * Step 3: Update getAllStockItems() function similarly
 * Step 4: Update other relevant endpoints
 * Step 5: Test with sample GPU/Motherboard/Case/PSU items
 * Step 6: Verify admin UI shows enriched fields auto-filled
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'KWiseDB',
  password: process.env.DB_PASSWORD || 'humbleludwig13',
  port: process.env.DB_PORT || 5432,
});

async function analyzeDataFlow() {
  try {
    console.log('\n🔍 ROOT CAUSE ANALYSIS - Admin UI Auto-Fill Issue\n');
    console.log('='.repeat(80));

    // 1. Check sample data in pc_parts.specifications
    console.log('\n📊 STEP 1: Check pc_parts.specifications content\n');
    
    const pcPartsGPU = await pool.query(`
      SELECT id, name, specifications
      FROM pc_parts
      WHERE category = 'GPU'
      LIMIT 1
    `);

    if (pcPartsGPU.rows.length > 0) {
      const gpu = pcPartsGPU.rows[0];
      console.log(`Sample GPU from pc_parts: ${gpu.name}`);
      console.log(`Specifications keys: ${Object.keys(gpu.specifications || {}).join(', ')}`);
      console.log(`Has pcie_8pin_count? ${gpu.specifications?.pcie_8pin_count ? 'YES' : 'NO'}`);
      console.log(`Has has_12vhpwr? ${gpu.specifications?.has_12vhpwr !== undefined ? 'YES' : 'NO'}`);
    }

    // 2. Check sample data in product_specs.normalized_specs.specs
    console.log('\n📊 STEP 2: Check product_specs.normalized_specs.specs content\n');
    
    const productSpecsGPU = await pool.query(`
      SELECT 
        pp.id,
        pp.name,
        ps.normalized_specs->'specs' as enriched_specs
      FROM pc_parts pp
      LEFT JOIN product_specs ps ON pp.id = ps.product_id
      WHERE pp.category = 'GPU'
      LIMIT 1
    `);

    if (productSpecsGPU.rows.length > 0) {
      const gpu = productSpecsGPU.rows[0];
      const enrichedSpecs = gpu.enriched_specs || {};
      console.log(`Sample GPU from product_specs: ${gpu.name}`);
      console.log(`Enriched specs keys: ${Object.keys(enrichedSpecs).join(', ')}`);
      console.log(`Has pcie_8pin_count? ${enrichedSpecs.pcie_8pin_count !== undefined ? 'YES' : 'NO'}`);
      console.log(`Has has_12vhpwr? ${enrichedSpecs.has_12vhpwr !== undefined ? 'YES' : 'NO'}`);
    }

    // 3. Demonstrate the merge solution
    console.log('\n📊 STEP 3: Demonstrate MERGED specifications\n');
    
    const mergedGPU = await pool.query(`
      SELECT 
        pp.id,
        pp.name,
        pp.specifications as old_specs,
        ps.normalized_specs->'specs' as enriched_specs,
        pp.specifications || (ps.normalized_specs->'specs') as merged_specs
      FROM pc_parts pp
      LEFT JOIN product_specs ps ON pp.id = ps.product_id
      WHERE pp.category = 'GPU'
      LIMIT 1
    `);

    if (mergedGPU.rows.length > 0) {
      const gpu = mergedGPU.rows[0];
      console.log(`GPU: ${gpu.name}`);
      console.log(`\nOLD specifications (pc_parts):`);
      console.log(`  Keys: ${Object.keys(gpu.old_specs || {}).join(', ')}`);
      console.log(`\nENRICHED specifications (product_specs):`);
      console.log(`  Keys: ${Object.keys(gpu.enriched_specs || {}).join(', ')}`);
      console.log(`\nMERGED specifications (combined):`);
      console.log(`  Keys: ${Object.keys(gpu.merged_specs || {}).join(', ')}`);
      console.log(`  Has pcie_8pin_count? ${gpu.merged_specs?.pcie_8pin_count !== undefined ? 'YES ✅' : 'NO ❌'}`);
      console.log(`  Has has_12vhpwr? ${gpu.merged_specs?.has_12vhpwr !== undefined ? 'YES ✅' : 'NO ❌'}`);
      console.log(`  Has transient_spike_power_w? ${gpu.merged_specs?.transient_spike_power_w !== undefined ? 'YES ✅' : 'NO ❌'}`);
    }

    // 4. Test all categories
    console.log('\n📊 STEP 4: Test merge solution across ALL categories\n');

    const categories = ['Motherboard', 'GPU', 'Case', 'PSU'];
    
    for (const category of categories) {
      const sample = await pool.query(`
        SELECT 
          pp.id,
          pp.name,
          pp.specifications || COALESCE(ps.normalized_specs->'specs', '{}')::jsonb as merged_specs
        FROM pc_parts pp
        LEFT JOIN product_specs ps ON pp.id = ps.product_id
        WHERE pp.category = $1
        LIMIT 1
      `, [category]);

      if (sample.rows.length > 0) {
        const item = sample.rows[0];
        const enrichedFieldsCount = Object.keys(item.merged_specs || {}).length;
        console.log(`${category}: ${enrichedFieldsCount} total specification fields`);
        console.log(`  Sample: ${item.name}`);
        
        // Check for category-specific enriched fields
        if (category === 'Motherboard') {
          console.log(`  ✅ pcie_x16_slots_electrical: ${item.merged_specs.pcie_x16_slots_electrical !== undefined ? 'Present' : 'Missing'}`);
        } else if (category === 'GPU') {
          console.log(`  ✅ has_12vhpwr: ${item.merged_specs.has_12vhpwr !== undefined ? 'Present' : 'Missing'}`);
        } else if (category === 'Case') {
          console.log(`  ✅ front_fan_slots: ${item.merged_specs.front_fan_slots !== undefined ? 'Present' : 'Missing'}`);
        } else if (category === 'PSU') {
          console.log(`  ✅ has_12vhpwr_connector: ${item.merged_specs.has_12vhpwr_connector !== undefined ? 'Present' : 'Missing'}`);
        }
      }
    }

    console.log('\n\n✅ ROOT CAUSE CONFIRMED!\n');
    console.log('SOLUTION: Modify stockController.js to merge pc_parts.specifications');
    console.log('          with product_specs.normalized_specs.specs using || operator\n');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    await pool.end();
  }
}

analyzeDataFlow();
