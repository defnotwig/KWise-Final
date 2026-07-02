/**
 * ============================================================================
 * COMPATIBILITY FIELD ENRICHMENT SCRIPT
 * ============================================================================
 * 
 * This script populates missing compatibility fields in product_specs table
 * to support the enhanced compatibility validation system.
 * 
 * Enhanced Fields Added:
 * - Motherboards: pcie_x16_slots_electrical, pcie_x16_slots_physical, max_memory_per_slot_gb
 * - GPUs: has_12vhpwr, pcie_6pin_count, pcie_8pin_count, transient_spike_power_w
 * - Cases: front_fan_slots, front_radiator_support
 * - PSUs: has_12vhpwr_connector, pcie_6pin_connectors, pcie_8pin_connectors
 * 
 * Usage: node scripts/enrich-compatibility-fields.js [--dry-run]
 * ============================================================================
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'humbleludwig13'
});

const isDryRun = process.argv.includes('--dry-run');

// Motherboard chipset data for PCIe slot differentiation
const motherboardEnrichmentRules = {
  // Intel Z-series (high-end) - Full electrical x16 support for multi-GPU
  'Z790': { electrical: 2, physical: 3, maxMemPerSlot: 48 },
  'Z690': { electrical: 2, physical: 3, maxMemPerSlot: 48 },
  'Z590': { electrical: 2, physical: 3, maxMemPerSlot: 32 },
  'Z490': { electrical: 1, physical: 2, maxMemPerSlot: 32 },
  
  // Intel B-series (mid-range) - Limited electrical x16
  'B760': { electrical: 1, physical: 2, maxMemPerSlot: 32 },
  'B660': { electrical: 1, physical: 2, maxMemPerSlot: 32 },
  'B550': { electrical: 1, physical: 2, maxMemPerSlot: 32 },
  
  // AMD X-series (high-end) - Full electrical x16 support
  'X670E': { electrical: 2, physical: 3, maxMemPerSlot: 48 },
  'X670': { electrical: 2, physical: 3, maxMemPerSlot: 48 },
  'X570': { electrical: 2, physical: 3, maxMemPerSlot: 32 },
  'X470': { electrical: 1, physical: 2, maxMemPerSlot: 32 },
  
  // AMD B-series (mid-range) - Limited electrical x16
  'B650E': { electrical: 1, physical: 2, maxMemPerSlot: 32 },
  'B650': { electrical: 1, physical: 2, maxMemPerSlot: 32 },
  'B550': { electrical: 1, physical: 2, maxMemPerSlot: 32 },
  'B450': { electrical: 1, physical: 2, maxMemPerSlot: 16 }
};

// GPU power connector patterns
const gpuPowerPatterns = {
  'RTX 4090': { has_12vhpwr: true, pcie_8pin: 0, pcie_6pin: 0, transient_spike: 600 },
  'RTX 4080': { has_12vhpwr: true, pcie_8pin: 0, pcie_6pin: 0, transient_spike: 400 },
  'RTX 4070 Ti': { has_12vhpwr: true, pcie_8pin: 0, pcie_6pin: 0, transient_spike: 350 },
  'RTX 4070': { has_12vhpwr: true, pcie_8pin: 0, pcie_6pin: 0, transient_spike: 300 },
  'RTX 3090': { has_12vhpwr: false, pcie_8pin: 2, pcie_6pin: 0, transient_spike: 450 },
  'RTX 3080': { has_12vhpwr: false, pcie_8pin: 2, pcie_6pin: 0, transient_spike: 400 },
  'RTX 3070': { has_12vhpwr: false, pcie_8pin: 1, pcie_6pin: 1, transient_spike: 290 },
  'RTX 3060': { has_12vhpwr: false, pcie_8pin: 1, pcie_6pin: 0, transient_spike: 220 },
  'RX 7900 XTX': { has_12vhpwr: false, pcie_8pin: 2, pcie_6pin: 0, transient_spike: 420 },
  'RX 7900 XT': { has_12vhpwr: false, pcie_8pin: 2, pcie_6pin: 0, transient_spike: 380 },
  'RX 6900 XT': { has_12vhpwr: false, pcie_8pin: 2, pcie_6pin: 0, transient_spike: 350 },
  'RX 6800': { has_12vhpwr: false, pcie_8pin: 2, pcie_6pin: 0, transient_spike: 300 }
};

async function enrichMotherboards() {
  console.log('\n📋 Enriching Motherboard Compatibility Fields...\n');
  
  try {
    // Get all motherboards from product_specs
    const result = await pool.query(`
      SELECT ps.product_id, ps.normalized_specs, pp.name
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'Motherboard'
      AND ps.normalized_specs IS NOT NULL
    `);
    
    console.log(`Found ${result.rows.length} motherboards to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const row of result.rows) {
      const { product_id, normalized_specs, name } = row;
      const specs = normalized_specs.specs || {};
      const chipset = specs.chipset || '';
      
      // Check if already has enhanced fields
      if (specs.pcie_x16_slots_electrical !== undefined) {
        skipped++;
        continue;
      }
      
      // Find matching chipset pattern
      let enrichmentData = null;
      for (const [pattern, data] of Object.entries(motherboardEnrichmentRules)) {
        if (chipset.includes(pattern)) {
          enrichmentData = data;
          break;
        }
      }
      
      // Fallback: Use generic defaults based on existing pcie_x16_slots
      if (!enrichmentData) {
        const existingSlots = Number.parseInt(specs.pcie_x16_slots || specs.pcie_slots || 1, 10);
        enrichmentData = {
          electrical: Math.min(existingSlots, 1), // Assume only 1 true x16 for unknown chipsets
          physical: existingSlots,
          maxMemPerSlot: 32 // Default 32GB per slot
        };
      }
      
      // Update normalized_specs with enhanced fields
      const updatedSpecs = {
        ...normalized_specs,
        specs: {
          ...specs,
          pcie_x16_slots_electrical: enrichmentData.electrical,
          pcie_x16_slots_physical: enrichmentData.physical,
          pcie_x16_slots: enrichmentData.physical, // Keep compatibility with old field
          max_memory_per_slot_gb: enrichmentData.maxMemPerSlot
        }
      };
      
      if (!isDryRun) {
        await pool.query(
          `UPDATE product_specs 
           SET normalized_specs = $1, updated_at = NOW() 
           WHERE product_id = $2`,
          [JSON.stringify(updatedSpecs), product_id]
        );
      }
      
      console.log(`  ✅ ${name}`);
      console.log(`     Chipset: ${chipset}`);
      console.log(`     Electrical x16: ${enrichmentData.electrical}, Physical x16: ${enrichmentData.physical}`);
      console.log(`     Max Memory/Slot: ${enrichmentData.maxMemPerSlot}GB`);
      
      updated++;
    }
    
    console.log(`\n✅ Motherboards: ${updated} updated, ${skipped} skipped (already enriched)`);
    
  } catch (error) {
    console.error('❌ Error enriching motherboards:', error.message);
    throw error;
  }
}

async function enrichGPUs() {
  console.log('\n🎮 Enriching GPU Compatibility Fields...\n');
  
  try {
    const result = await pool.query(`
      SELECT ps.product_id, ps.normalized_specs, pp.name
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'GPU'
      AND ps.normalized_specs IS NOT NULL
    `);
    
    console.log(`Found ${result.rows.length} GPUs to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const row of result.rows) {
      const { product_id, normalized_specs, name } = row;
      const specs = normalized_specs.specs || {};
      
      // Check if already has enhanced fields
      if (specs.has_12vhpwr !== undefined) {
        skipped++;
        continue;
      }
      
      // Find matching GPU pattern
      let powerData = null;
      for (const [pattern, data] of Object.entries(gpuPowerPatterns)) {
        if (name.includes(pattern)) {
          powerData = data;
          break;
        }
      }
      
      // Fallback: Estimate based on TDP
      if (!powerData) {
        const tdp = Number.parseInt(specs.tdp || specs.power_consumption || 150, 10);
        powerData = {
          has_12vhpwr: false,
          pcie_8pin: tdp > 225 ? 2 : tdp > 150 ? 1 : 0,
          pcie_6pin: tdp > 150 && tdp <= 225 ? 1 : 0,
          transient_spike: Math.round(tdp * 1.3) // 30% transient spike estimate
        };
      }
      
      // Update normalized_specs
      const updatedSpecs = {
        ...normalized_specs,
        specs: {
          ...specs,
          has_12vhpwr: powerData.has_12vhpwr,
          pcie_6pin_count: powerData.pcie_6pin,
          pcie_8pin_count: powerData.pcie_8pin,
          transient_spike_power_w: powerData.transient_spike
        }
      };
      
      if (!isDryRun) {
        await pool.query(
          `UPDATE product_specs 
           SET normalized_specs = $1, updated_at = NOW() 
           WHERE product_id = $2`,
          [JSON.stringify(updatedSpecs), product_id]
        );
      }
      
      console.log(`  ✅ ${name}`);
      console.log(`     12VHPWR: ${powerData.has_12vhpwr}, 8-pin: ${powerData.pcie_8pin}, 6-pin: ${powerData.pcie_6pin}`);
      console.log(`     Transient Spike: ${powerData.transient_spike}W`);
      
      updated++;
    }
    
    console.log(`\n✅ GPUs: ${updated} updated, ${skipped} skipped`);
    
  } catch (error) {
    console.error('❌ Error enriching GPUs:', error.message);
    throw error;
  }
}

async function enrichCases() {
  console.log('\n🗄️ Enriching Case Compatibility Fields...\n');
  
  try {
    const result = await pool.query(`
      SELECT ps.product_id, ps.normalized_specs, pp.name
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'Case'
      AND ps.normalized_specs IS NOT NULL
    `);
    
    console.log(`Found ${result.rows.length} cases to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const row of result.rows) {
      const { product_id, normalized_specs, name } = row;
      const specs = normalized_specs.specs || {};
      
      // Check if already has enhanced fields
      if (specs.front_fan_slots !== undefined) {
        skipped++;
        continue;
      }
      
      // Estimate front fans based on case size and form factor
      const formFactor = (specs.form_factor || specs.motherboard_form_factor || '').toLowerCase();
      let frontFans = 2; // Default
      let frontRadiator = 240; // Default 240mm
      
      if (formFactor.includes('full tower') || formFactor.includes('super tower')) {
        frontFans = 3;
        frontRadiator = 360;
      } else if (formFactor.includes('mid tower')) {
        frontFans = 2;
        frontRadiator = 280;
      } else if (formFactor.includes('mini') || formFactor.includes('itx')) {
        frontFans = 1;
        frontRadiator = 120;
      }
      
      // Update specs
      const updatedSpecs = {
        ...normalized_specs,
        specs: {
          ...specs,
          front_fan_slots: frontFans,
          front_radiator_support: frontRadiator
        }
      };
      
      if (!isDryRun) {
        await pool.query(
          `UPDATE product_specs 
           SET normalized_specs = $1, updated_at = NOW() 
           WHERE product_id = $2`,
          [JSON.stringify(updatedSpecs), product_id]
        );
      }
      
      console.log(`  ✅ ${name}`);
      console.log(`     Front Fans: ${frontFans}, Max Radiator: ${frontRadiator}mm`);
      
      updated++;
    }
    
    console.log(`\n✅ Cases: ${updated} updated, ${skipped} skipped`);
    
  } catch (error) {
    console.error('❌ Error enriching cases:', error.message);
    throw error;
  }
}

async function enrichPSUs() {
  console.log('\n⚡ Enriching PSU Compatibility Fields...\n');
  
  try {
    const result = await pool.query(`
      SELECT ps.product_id, ps.normalized_specs, pp.name
      FROM product_specs ps
      JOIN pc_parts pp ON ps.product_id = pp.id
      WHERE pp.category = 'PSU'
      AND ps.normalized_specs IS NOT NULL
    `);
    
    console.log(`Found ${result.rows.length} PSUs to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const row of result.rows) {
      const { product_id, normalized_specs, name } = row;
      const specs = normalized_specs.specs || {};
      
      // Check if already has enhanced fields
      if (specs.has_12vhpwr_connector !== undefined) {
        skipped++;
        continue;
      }
      
      // Estimate connectors based on wattage
      const wattage = Number.parseInt(specs.wattage || specs.power || 650, 10);
      
      let has12vhpwr = false;
      let pcie8pin = 2;
      let pcie6pin = 2;
      
      // ATX 3.0 PSUs (850W+) typically have 12VHPWR
      if (wattage >= 850 && (name.includes('ATX 3.0') || name.includes('PCIe 5.0'))) {
        has12vhpwr = true;
        pcie8pin = 3;
        pcie6pin = 2;
      } else if (wattage >= 1000) {
        pcie8pin = 4;
        pcie6pin = 2;
      } else if (wattage >= 750) {
        pcie8pin = 3;
        pcie6pin = 2;
      } else if (wattage >= 550) {
        pcie8pin = 2;
        pcie6pin = 2;
      } else {
        pcie8pin = 1;
        pcie6pin = 1;
      }
      
      // Update specs
      const updatedSpecs = {
        ...normalized_specs,
        specs: {
          ...specs,
          has_12vhpwr_connector: has12vhpwr,
          pcie_6pin_connectors: pcie6pin,
          pcie_8pin_connectors: pcie8pin
        }
      };
      
      if (!isDryRun) {
        await pool.query(
          `UPDATE product_specs 
           SET normalized_specs = $1, updated_at = NOW() 
           WHERE product_id = $2`,
          [JSON.stringify(updatedSpecs), product_id]
        );
      }
      
      console.log(`  ✅ ${name}`);
      console.log(`     ${wattage}W - 12VHPWR: ${has12vhpwr}, 8-pin: ${pcie8pin}, 6-pin: ${pcie6pin}`);
      
      updated++;
    }
    
    console.log(`\n✅ PSUs: ${updated} updated, ${skipped} skipped`);
    
  } catch (error) {
    console.error('❌ Error enriching PSUs:', error.message);
    throw error;
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('  COMPATIBILITY FIELD ENRICHMENT SCRIPT');
  console.log('='.repeat(80));
  
  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No database changes will be made\n');
  }
  
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Run enrichment for each category
    await enrichMotherboards();
    await enrichGPUs();
    await enrichCases();
    await enrichPSUs();
    
    console.log('\n' + '='.repeat(80));
    console.log('  ✅ ENRICHMENT COMPLETE');
    console.log('='.repeat(80));
    
    if (isDryRun) {
      console.log('\n💡 To apply changes, run without --dry-run flag');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();
