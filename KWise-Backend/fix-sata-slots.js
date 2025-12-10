/**
 * SATA Slots Verification and Fix Script
 * 
 * This script:
 * 1. Queries all motherboards from the database
 * 2. Shows current SATA port values (both field names)
 * 3. Provides option to update with real-world values
 * 
 * Usage: node fix-sata-slots.js
 */

require('dotenv').config();
const { pool, query } = require('./config/db');
const logger = require('./utils/logger');

/**
 * Real-world SATA port counts for common motherboards
 * Source: Manufacturer specifications
 */
const REAL_WORLD_SATA_PORTS = {
  // Intel Z790 Chipset (13th/14th Gen)
  'ASUS ROG MAXIMUS Z790 HERO': 6,
  'MSI MPG Z790 CARBON WIFI': 6,
  'GIGABYTE Z790 AORUS MASTER': 6,
  'ASRock Z790 Taichi': 8,
  
  // Intel Z690 Chipset (12th Gen)
  'ASUS ROG STRIX Z690-E GAMING WIFI': 6,
  'MSI MPG Z690 EDGE WIFI DDR4': 6,
  'GIGABYTE Z690 AORUS ELITE': 6,
  
  // Intel B760 Chipset
  'ASUS TUF Gaming B760M-PLUS WIFI D4': 4,
  'MSI MAG B760M MORTAR WIFI': 4,
  'GIGABYTE B760M DS3H': 4,
  
  // Intel B660 Chipset
  'ASUS PRIME B660M-A WIFI D4': 4,
  'MSI PRO B660M-A WIFI DDR4': 4,
  
  // AMD X670E Chipset (AM5 - Ryzen 7000)
  'ASUS ROG CROSSHAIR X670E HERO': 8,
  'MSI MPG X670E CARBON WIFI': 8,
  'GIGABYTE X670E AORUS MASTER': 8,
  'ASRock X670E Taichi': 8,
  
  // AMD B650 Chipset (AM5)
  'ASUS TUF Gaming B650-PLUS WIFI': 4,
  'MSI MAG B650 TOMAHAWK WIFI': 4,
  'GIGABYTE B650 AORUS ELITE AX': 4,
  'ASRock B650M PG Riptide': 4,
  
  // AMD X570 Chipset (AM4 - Ryzen 5000/3000)
  'ASUS ROG CROSSHAIR VIII HERO': 8,
  'MSI MEG X570 GODLIKE': 8,
  'GIGABYTE X570 AORUS MASTER': 6,
  'ASRock X570 Taichi': 8,
  
  // AMD B550 Chipset (AM4)
  'ASUS ROG STRIX B550-F GAMING WIFI': 6,
  'MSI MAG B550 TOMAHAWK': 6,
  'GIGABYTE B550 AORUS ELITE': 6,
  'ASRock B550 Steel Legend': 6,
  
  // Budget/Entry-level boards
  'ASUS PRIME H510M-A': 4,
  'MSI H610M PRO DDR4': 4,
  'GIGABYTE H610M H DDR4': 4,
  'ASRock A520M-HDV': 4,
  
  // Common defaults by chipset
  'Z790': 6,
  'Z690': 6,
  'B760': 4,
  'B660': 4,
  'H610': 4,
  'X670E': 8,
  'X670': 6,
  'B650E': 4,
  'B650': 4,
  'X570': 8,
  'B550': 6,
  'A520': 4
};

/**
 * Detect chipset from motherboard name
 */
function detectChipset(name) {
  const chipsets = ['Z790', 'Z690', 'B760', 'B660', 'H610', 'X670E', 'X670', 'B650E', 'B650', 'X570', 'B550', 'A520'];
  
  for (const chipset of chipsets) {
    if (name.toUpperCase().includes(chipset)) {
      return chipset;
    }
  }
  
  return null;
}

/**
 * Get real-world SATA port count for a motherboard
 */
function getRealSataCount(name) {
  // Try exact match first
  if (REAL_WORLD_SATA_PORTS[name]) {
    return {
      count: REAL_WORLD_SATA_PORTS[name],
      source: 'exact_match',
      confidence: 'high'
    };
  }
  
  // Try chipset detection
  const chipset = detectChipset(name);
  if (chipset && REAL_WORLD_SATA_PORTS[chipset]) {
    return {
      count: REAL_WORLD_SATA_PORTS[chipset],
      source: `chipset_${chipset}`,
      confidence: 'medium'
    };
  }
  
  // Default fallback - most modern boards have at least 4 SATA ports
  return {
    count: 4,
    source: 'default_fallback',
    confidence: 'low'
  };
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('=' .repeat(80));
    console.log('🔍 SATA SLOTS VERIFICATION AND FIX SCRIPT');
    console.log('='.repeat(80));
    console.log('');
    
    // Query all motherboards
    console.log('📊 Querying all motherboards from database...\n');
    
    const result = await query(`
      SELECT 
        id,
        name,
        category,
        specifications->>'sata_ports' as sata_ports_lower,
        specifications->>'SATA Ports' as sata_ports_upper,
        specifications
      FROM pc_parts
      WHERE category = 'Motherboard'
        AND is_active = true
      ORDER BY name
    `);
    
    console.log(`✅ Found ${result.rows.length} motherboards\n`);
    console.log('='.repeat(80));
    
    const issues = [];
    const correct = [];
    const needsUpdate = [];
    
    // Analyze each motherboard
    for (const mb of result.rows) {
      const lowerValue = mb.sata_ports_lower;
      const upperValue = mb.sata_ports_upper;
      const realWorld = getRealSataCount(mb.name);
      
      const currentValue = parseInt(lowerValue || upperValue || 0);
      const hasValue = !!(lowerValue || upperValue);
      const isCorrect = currentValue === realWorld.count;
      
      const status = {
        id: mb.id,
        name: mb.name,
        currentLower: lowerValue,
        currentUpper: upperValue,
        currentParsed: currentValue,
        expectedSata: realWorld.count,
        source: realWorld.source,
        confidence: realWorld.confidence,
        hasValue,
        isCorrect,
        hasDualFields: !!(lowerValue && upperValue),
        needsUpdate: !isCorrect || !hasValue
      };
      
      if (!hasValue) {
        issues.push(status);
        console.log(`❌ MISSING: ${mb.name}`);
        console.log(`   Current: NO SATA VALUE`);
        console.log(`   Expected: ${realWorld.count} SATA ports (${realWorld.source})`);
        console.log('');
      } else if (!isCorrect) {
        issues.push(status);
        console.log(`⚠️  INCORRECT: ${mb.name}`);
        console.log(`   Current: ${currentValue} (lower: "${lowerValue}", upper: "${upperValue}")`);
        console.log(`   Expected: ${realWorld.count} SATA ports (${realWorld.source})`);
        console.log('');
      } else if (status.hasDualFields) {
        needsUpdate.push(status);
        console.log(`⚡ DUAL FIELDS: ${mb.name}`);
        console.log(`   Has both "sata_ports" (${lowerValue}) and "SATA Ports" (${upperValue})`);
        console.log(`   Value is correct (${currentValue}), but should consolidate to one field`);
        console.log('');
      } else {
        correct.push(status);
      }
      
      if (status.needsUpdate) {
        needsUpdate.push(status);
      }
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Correct: ${correct.length}`);
    console.log(`⚠️  Missing or Incorrect: ${issues.length}`);
    console.log(`⚡ Need Field Consolidation: ${needsUpdate.filter(n => n.hasDualFields).length}`);
    console.log(`📝 Total Updates Needed: ${needsUpdate.length}`);
    console.log('');
    
    if (needsUpdate.length > 0) {
      console.log('='.repeat(80));
      console.log('🔧 GENERATING UPDATE SCRIPT');
      console.log('='.repeat(80));
      console.log('');
      console.log('-- SQL to fix all SATA port values');
      console.log('-- Standardizes to "SATA Ports" field (uppercase) for consistency');
      console.log('-- Run this in PostgreSQL:');
      console.log('');
      
      for (const item of needsUpdate) {
        const specs = result.rows.find(r => r.id === item.id).specifications;
        
        // Create updated specifications with correct SATA value
        // Remove old field names and use standardized "SATA Ports"
        const updatedSpecs = { ...specs };
        delete updatedSpecs.sata_ports;
        delete updatedSpecs.sata_slots;
        delete updatedSpecs['sata ports'];
        updatedSpecs['SATA Ports'] = item.expectedSata.toString();
        
        console.log(`-- ${item.name}: ${item.currentParsed} → ${item.expectedSata} (${item.source})`);
        console.log(`UPDATE pc_parts SET specifications = '${JSON.stringify(updatedSpecs)}'::jsonb WHERE id = ${item.id};`);
        console.log('');
      }
      
      console.log('='.repeat(80));
      console.log('');
      
      // Execute updates automatically
      console.log('🔄 APPLYING FIXES TO DATABASE...');
      console.log('');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const item of needsUpdate) {
        try {
          const specs = result.rows.find(r => r.id === item.id).specifications;
          const updatedSpecs = { ...specs };
          delete updatedSpecs.sata_ports;
          delete updatedSpecs.sata_slots;
          delete updatedSpecs['sata ports'];
          updatedSpecs['SATA Ports'] = item.expectedSata.toString();
          
          await query(
            `UPDATE pc_parts SET specifications = $1::jsonb WHERE id = $2`,
            [JSON.stringify(updatedSpecs), item.id]
          );
          
          console.log(`✅ Updated: ${item.name} → ${item.expectedSata} SATA ports`);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to update ${item.name}:`, error.message);
          errorCount++;
        }
      }
      
      console.log('');
      console.log('='.repeat(80));
      console.log('✅ UPDATE COMPLETE');
      console.log('='.repeat(80));
      console.log(`✅ Successfully updated: ${successCount}`);
      console.log(`❌ Failed: ${errorCount}`);
      console.log('');
    } else {
      console.log('✅ All motherboards have correct SATA port values!');
      console.log('');
    }
    
    // Verification
    console.log('='.repeat(80));
    console.log('🔍 POST-UPDATE VERIFICATION');
    console.log('='.repeat(80));
    console.log('');
    
    const verifyResult = await query(`
      SELECT 
        name,
        specifications->>'SATA Ports' as sata_ports
      FROM pc_parts
      WHERE category = 'Motherboard'
        AND is_active = true
      ORDER BY name
    `);
    
    let verifyPass = 0;
    let verifyFail = 0;
    
    for (const mb of verifyResult.rows) {
      const realWorld = getRealSataCount(mb.name);
      const currentValue = parseInt(mb.sata_ports || 0);
      
      if (currentValue === realWorld.count) {
        console.log(`✅ ${mb.name}: ${currentValue} SATA ports`);
        verifyPass++;
      } else {
        console.log(`❌ ${mb.name}: ${currentValue} (expected ${realWorld.count})`);
        verifyFail++;
      }
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log(`✅ Verification Passed: ${verifyPass}`);
    console.log(`❌ Verification Failed: ${verifyFail}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
    logger.error('SATA slots fix failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { getRealSataCount, detectChipset, REAL_WORLD_SATA_PORTS };
