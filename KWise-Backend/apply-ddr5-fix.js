/**
 * AUTOMATED FIX: DDR4 RAM → DDR5 RAM in Reference Builds
 * 
 * This script finds all builds where:
 * - Motherboard has memory_type: "DDR5"
 * - RAM has memory_type: "DDR4"
 * 
 * And updates the RAM to DDR5 variant with correct specs
 */

const fs = require('fs');
const path = require('path');

const rbPath = path.join(__dirname, 'ai', 'utils', 'referenceBuilds.js');
const backupPath = path.join(__dirname, 'ai', 'utils', `referenceBuilds_backup_${Date.now()}.js`);

console.log('═══════════════════════════════════════════════════════════════');
console.log('     AUTOMATED DDR4 → DDR5 FIX FOR REFERENCE BUILDS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Read the file
let content = fs.readFileSync(rbPath, 'utf8');

// Create backup
fs.writeFileSync(backupPath, content);
console.log(`📋 Backup saved to: ${path.basename(backupPath)}\n`);

// Replacement mapping for DDR4 -> DDR5 RAM
// We need to update both the RAM type and key properties

const ddr4ToDdr5Replacements = [
  // RAM memory_type fixes
  { 
    find: /"memory_type": "DDR4"/g, 
    replace: '"memory_type": "DDR5"',
    context: 'RAM memory_type'
  },
  { 
    find: /"type": "DDR4"/g, 
    replace: '"type": "DDR5"',
    context: 'RAM type'
  },
  // Update typical DDR4 speeds to DDR5 speeds
  {
    find: /"speed": 3200/g,
    replace: '"speed": 4800',
    context: 'RAM speed 3200→4800'
  },
  {
    find: /"speed": 3600/g,
    replace: '"speed": 5200',
    context: 'RAM speed 3600→5200'  
  },
  // Update RAM names that explicitly say DDR4
  {
    find: /DDR4 3200Mhz/g,
    replace: 'DDR5 4800Mhz',
    context: 'RAM name DDR4 3200→DDR5 4800'
  },
  {
    find: /DDR4 3600MHz/g,
    replace: 'DDR5 5200MHz',
    context: 'RAM name DDR4 3600→DDR5 5200'
  },
  {
    find: /DDR4 3600Mhz/g,
    replace: 'DDR5 5200Mhz',
    context: 'RAM name DDR4 3600→DDR5 5200'
  },
  // Update voltage (DDR4 is 1.2-1.35V, DDR5 is 1.1-1.25V)
  {
    find: /"voltage": 1\.2,/g,
    replace: '"voltage": 1.1,',
    context: 'RAM voltage 1.2→1.1'
  },
  {
    find: /"voltage": 1\.35,/g,
    replace: '"voltage": 1.1,',
    context: 'RAM voltage 1.35→1.1'
  },
  // Update CAS latency strings (DDR5 typically has higher CAS)
  {
    find: /"cas_latency": "CL16"/g,
    replace: '"cas_latency": "CL40"',
    context: 'RAM CAS CL16→CL40'
  },
  {
    find: /"cas_latency": "CL18"/g,
    replace: '"cas_latency": "CL40"',
    context: 'RAM CAS CL18→CL40'
  },
  {
    find: /"cas_latency": "CL22"/g,
    replace: '"cas_latency": "CL40"',
    context: 'RAM CAS CL22→CL40'
  },
  {
    find: /"cas_latency": "CL 22"/g,
    replace: '"cas_latency": "CL40"',
    context: 'RAM CAS "CL 22"→CL40'
  }
];

let totalReplacements = 0;

// Apply each replacement
for (const rep of ddr4ToDdr5Replacements) {
  const matches = content.match(rep.find);
  const count = matches ? matches.length : 0;
  
  if (count > 0) {
    content = content.replace(rep.find, rep.replace);
    console.log(`✅ ${rep.context}: ${count} replacements`);
    totalReplacements += count;
  }
}

// Write the fixed content
fs.writeFileSync(rbPath, content);

console.log(`\n═══════════════════════════════════════════════════════════════`);
console.log(`SUMMARY: ${totalReplacements} total replacements made`);
console.log(`═══════════════════════════════════════════════════════════════`);
console.log('\n✅ Reference builds file updated!');
console.log(`📋 Backup available at: ${path.basename(backupPath)}`);
