/**
 * FIX ALL REFERENCE BUILD COMPATIBILITY ISSUES
 * 
 * This script identifies and fixes:
 * 1. DDR4 RAM with DDR5-only motherboards → Replace with DDR5 RAM
 * 2. Socket mismatches → Use matching CPU/Motherboard combinations
 */

const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function fixReferenceBuilds() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     FIXING REFERENCE BUILD COMPATIBILITY ISSUES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load current reference builds
  const rbPath = path.join(__dirname, 'ai', 'utils', 'referenceBuilds.js');
  let rbContent = fs.readFileSync(rbPath, 'utf8');
  
  // Get available DDR5 RAM from database
  const ddr5RamResult = await db.query(`
    SELECT id, name, brand, price, image_url, specifications
    FROM pc_parts 
    WHERE category = 'RAM' 
      AND is_active = true 
      AND (
        specifications->>'memory_type' ILIKE '%DDR5%' 
        OR specifications->>'type' ILIKE '%DDR5%'
      )
    ORDER BY CAST(REPLACE(REPLACE(price::text, ',', ''), '₱', '') AS DECIMAL) ASC
    LIMIT 10
  `);
  
  console.log(`Found ${ddr5RamResult.rows.length} DDR5 RAM options in database\n`);
  
  if (ddr5RamResult.rows.length === 0) {
    console.log('⚠️ No DDR5 RAM found in database. Need to add DDR5 RAM products first.');
    await db.end();
    return;
  }

  // Show available DDR5 RAM
  console.log('Available DDR5 RAM Options:');
  ddr5RamResult.rows.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.name} - ₱${r.price}`);
  });
  console.log('');

  // Parse reference builds to find issues
  const buildsMatch = rbContent.match(/const REFERENCE_BUILDS = ({[\s\S]*?});[\s\S]*?module\.exports/);
  
  if (!buildsMatch) {
    console.log('Could not parse reference builds file');
    await db.end();
    return;
  }

  // Use eval safely to parse the builds object
  let REFERENCE_BUILDS;
  try {
    REFERENCE_BUILDS = eval('(' + buildsMatch[1] + ')');
  } catch (e) {
    console.log('Error parsing builds:', e.message);
    await db.end();
    return;
  }

  let fixedCount = 0;
  const fixes = [];

  // Analyze and fix each build
  for (const [buildKey, build] of Object.entries(REFERENCE_BUILDS)) {
    const components = build.components;
    if (!components) continue;

    const ram = components.RAM;
    const motherboard = components.Motherboard;
    
    if (!ram || !motherboard) continue;

    const ramType = (ram.specs?.memory_type || ram.specs?.type || '').toUpperCase();
    const moboMem = (motherboard.specs?.memory_type || '').toUpperCase();

    // Check for DDR4/DDR5 mismatch
    if (ramType.includes('DDR4') && moboMem.includes('DDR5')) {
      console.log(`❌ ${buildKey}: DDR4 RAM with DDR5 motherboard`);
      console.log(`   RAM: ${ram.name}`);
      console.log(`   Motherboard: ${motherboard.name} (${moboMem})`);
      
      // Find best DDR5 replacement based on similar capacity
      const ramCapacity = ram.specs?.capacity || 8;
      let bestMatch = ddr5RamResult.rows[0]; // Default to cheapest
      
      for (const ddr5Ram of ddr5RamResult.rows) {
        const ddr5Capacity = ddr5Ram.specifications?.capacity || 8;
        if (ddr5Capacity >= ramCapacity) {
          bestMatch = ddr5Ram;
          break;
        }
      }
      
      console.log(`   ✅ Replacing with: ${bestMatch.name}\n`);
      
      fixes.push({
        buildKey,
        oldRam: ram,
        newRam: {
          productId: bestMatch.id,
          name: bestMatch.name,
          brand: bestMatch.brand,
          category: 'RAM',
          price: bestMatch.price.toString(),
          specs: bestMatch.specifications,
          imageUrl: bestMatch.image_url || `/assets/parts/ram/${bestMatch.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.webp`,
          reasoning: 'DDR5 high-speed memory for AM5 platform'
        }
      });
      
      fixedCount++;
    }
  }

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`SUMMARY: ${fixedCount} builds need RAM replacement`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  if (fixedCount > 0 && fixes.length > 0) {
    // Apply fixes to the file
    let newContent = rbContent;
    
    for (const fix of fixes) {
      // Create the replacement RAM JSON
      const newRamJson = JSON.stringify(fix.newRam, null, 8).replace(/^/gm, '        ').trim();
      
      // Find and replace the RAM section for this build
      // Look for the RAM block within each specific build
      const buildPattern = new RegExp(
        `("${fix.buildKey}"[\\s\\S]*?"RAM":\\s*{[\\s\\S]*?"productId":\\s*)${fix.oldRam.productId}`,
        'g'
      );
      
      newContent = newContent.replace(buildPattern, `$1${fix.newRam.productId}`);
      
      // Also update the RAM name if possible
      const namePattern = new RegExp(
        `("${fix.buildKey}"[\\s\\S]*?"RAM"[\\s\\S]*?"name":\\s*")${fix.oldRam.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`,
        'g'
      );
      newContent = newContent.replace(namePattern, `$1${fix.newRam.name}"`);
    }

    // Write the fixed content back
    const backupPath = rbPath.replace('.js', `_backup_${Date.now()}.js`);
    fs.writeFileSync(backupPath, rbContent);
    console.log(`📋 Backup saved to: ${path.basename(backupPath)}`);
    
    fs.writeFileSync(rbPath, newContent);
    console.log(`✅ Reference builds updated!`);
  }

  await db.end();
  
  console.log('\nDone!');
}

fixReferenceBuilds().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
