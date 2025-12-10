/**
 * Metadata Enrichment Service
 * 
 * Automatically infers missing product specifications from product names
 * This improves compatibility analysis accuracy by filling in gaps
 * 
 * Fixes identified issues:
 * - Missing CPU socket information
 * - Missing PSU wattage specifications
 * - Missing RAM speed information
 * - Inconsistent motherboard chipset data
 */

const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Infer CPU socket from product name
 * @param {string} cpuName - CPU product name
 * @returns {string} Socket type or 'unknown'
 */
function inferCPUSocket(cpuName) {
  const name = cpuName.toLowerCase();
  
  // Intel LGA1851 (15th gen - Arrow Lake)
  if (name.includes('15900') || name.includes('15700') || name.includes('15600')) {
    return 'LGA1851';
  }
  
  // Intel LGA1700 (12th-14th gen - Alder Lake, Raptor Lake)
  if (name.includes('14900') || name.includes('14700') || name.includes('14600') || name.includes('14400')) {
    return 'LGA1700';
  }
  if (name.includes('13900') || name.includes('13700') || name.includes('13600') || name.includes('13400')) {
    return 'LGA1700';
  }
  if (name.includes('12900') || name.includes('12700') || name.includes('12600') || name.includes('12400')) {
    return 'LGA1700';
  }
  
  // Intel LGA1200 (10th-11th gen - Comet Lake, Rocket Lake)
  if (name.includes('11900') || name.includes('11700') || name.includes('11600') || name.includes('11400')) {
    return 'LGA1200';
  }
  if (name.includes('10900') || name.includes('10700') || name.includes('10600') || name.includes('10400')) {
    return 'LGA1200';
  }
  
  // Intel LGA1151 (6th-9th gen)
  if (name.includes('9900') || name.includes('9700') || name.includes('9600') || name.includes('9400')) {
    return 'LGA1151';
  }
  if (name.includes('8700') || name.includes('8600') || name.includes('8400') || name.includes('8100')) {
    return 'LGA1151';
  }
  
  // AMD AM5 (Ryzen 7000 & 9000 series - Zen 4 & Zen 5)
  if (name.includes('9950') || name.includes('9900') || name.includes('9800') || name.includes('9700') || name.includes('9600')) {
    return 'AM5';
  }
  if (name.includes('7950') || name.includes('7900') || name.includes('7800') || name.includes('7700') || name.includes('7600')) {
    return 'AM5';
  }
  
  // AMD AM4 (Ryzen 1000-5000 series - Zen to Zen 3)
  if (name.includes('5950') || name.includes('5900') || name.includes('5800') || name.includes('5700') || name.includes('5600')) {
    return 'AM4';
  }
  if (name.includes('3950') || name.includes('3900') || name.includes('3800') || name.includes('3700') || name.includes('3600')) {
    return 'AM4';
  }
  if (name.includes('2700') || name.includes('2600') || name.includes('2400')) {
    return 'AM4';
  }
  if (name.includes('1800') || name.includes('1700') || name.includes('1600') || name.includes('1400')) {
    return 'AM4';
  }
  
  return 'unknown';
}

/**
 * Infer motherboard chipset from product name
 * @param {string} motherboardName - Motherboard product name
 * @returns {string} Chipset or 'unknown'
 */
function inferMotherboardChipset(motherboardName) {
  const name = motherboardName.toUpperCase();
  
  // Intel chipsets
  if (name.includes('Z890')) return 'Z890';
  if (name.includes('B860')) return 'B860';
  if (name.includes('H810')) return 'H810';
  
  if (name.includes('Z790')) return 'Z790';
  if (name.includes('B760')) return 'B760';
  if (name.includes('H770')) return 'H770';
  if (name.includes('H710')) return 'H710';
  
  if (name.includes('Z690')) return 'Z690';
  if (name.includes('B660')) return 'B660';
  if (name.includes('H670')) return 'H670';
  if (name.includes('H610')) return 'H610';
  
  if (name.includes('Z590')) return 'Z590';
  if (name.includes('B560')) return 'B560';
  if (name.includes('H570')) return 'H570';
  if (name.includes('H510')) return 'H510';
  
  // AMD chipsets
  if (name.includes('X870')) return 'X870';
  if (name.includes('B850')) return 'B850';
  
  if (name.includes('X670')) return 'X670';
  if (name.includes('B650')) return 'B650';
  if (name.includes('A620')) return 'A620';
  
  if (name.includes('X570')) return 'X570';
  if (name.includes('B550')) return 'B550';
  if (name.includes('A520')) return 'A520';
  
  if (name.includes('X470')) return 'X470';
  if (name.includes('B450')) return 'B450';
  if (name.includes('A320')) return 'A320';
  
  return 'unknown';
}

/**
 * Infer motherboard socket from chipset
 * @param {string} chipset - Motherboard chipset
 * @returns {string} Socket type
 */
function inferMotherboardSocket(chipset) {
  // Intel sockets
  if (['Z890', 'B860', 'H810'].includes(chipset)) return 'LGA1851';
  if (['Z790', 'Z690', 'B760', 'B660', 'H770', 'H670', 'H710', 'H610'].includes(chipset)) return 'LGA1700';
  if (['Z590', 'B560', 'H570', 'H510'].includes(chipset)) return 'LGA1200';
  
  // AMD sockets
  if (['X870', 'B850', 'X670', 'B650', 'A620'].includes(chipset)) return 'AM5';
  if (['X570', 'B550', 'A520', 'X470', 'B450', 'A320'].includes(chipset)) return 'AM4';
  
  return 'unknown';
}

/**
 * Infer PSU wattage from product name
 * @param {string} psuName - PSU product name
 * @returns {number|null} Wattage in watts
 */
function inferPSUWattage(psuName) {
  // Match patterns like: "650w", "650W", "650 watts", "650-watt"
  const patterns = [
    /(\d+)w\b/i,           // 650w, 650W
    /(\d+)\s*watts?/i,     // 650 watts, 650watt
    /(\d+)\s*-?\s*w\b/i    // 650-w, 650 w
  ];
  
  for (const pattern of patterns) {
    const match = psuName.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
}

/**
 * Infer PSU efficiency rating from product name
 * @param {string} psuName - PSU product name
 * @returns {string} Efficiency rating
 */
function inferPSUEfficiency(psuName) {
  const name = psuName.toUpperCase();
  
  if (name.includes('80+ TITANIUM') || name.includes('80PLUS TITANIUM')) return '80+ Titanium';
  if (name.includes('80+ PLATINUM') || name.includes('80PLUS PLATINUM')) return '80+ Platinum';
  if (name.includes('80+ GOLD') || name.includes('80PLUS GOLD')) return '80+ Gold';
  if (name.includes('80+ SILVER') || name.includes('80PLUS SILVER')) return '80+ Silver';
  if (name.includes('80+ BRONZE') || name.includes('80PLUS BRONZE')) return '80+ Bronze';
  if (name.includes('80+') || name.includes('80PLUS')) return '80+';
  
  return 'unknown';
}

/**
 * Infer RAM speed from product name
 * @param {string} ramName - RAM product name
 * @returns {number|null} Speed in MHz
 */
function inferRAMSpeed(ramName) {
  // Match patterns like: "3200MHz", "3200 MHz", "DDR4-3200", "3200Mhz"
  const patterns = [
    /(\d+)\s*mhz/i,                    // 3200MHz, 3200 MHz
    /ddr[45]-?(\d+)/i,                 // DDR4-3200, DDR5-6000
    /(\d{4,5})\s*(?:speed|frequency)/i // 3200 speed
  ];
  
  for (const pattern of patterns) {
    const match = ramName.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
}

/**
 * Infer RAM type from product name
 * @param {string} ramName - RAM product name
 * @returns {string} RAM type (DDR4 or DDR5)
 */
function inferRAMType(ramName) {
  const name = ramName.toUpperCase();
  
  if (name.includes('DDR5')) return 'DDR5';
  if (name.includes('DDR4')) return 'DDR4';
  if (name.includes('DDR3')) return 'DDR3';
  
  // Infer from speed (rough heuristic)
  const speed = inferRAMSpeed(ramName);
  if (speed) {
    if (speed >= 4800) return 'DDR5'; // DDR5 typically 4800+ MHz
    if (speed >= 2133) return 'DDR4'; // DDR4 typically 2133-4000 MHz
  }
  
  return 'unknown';
}

/**
 * Infer RAM capacity from product name
 * @param {string} ramName - RAM product name
 * @returns {number|null} Capacity in GB
 */
function inferRAMCapacity(ramName) {
  // Match patterns like: "16GB", "16 GB", "2x8GB"
  const patterns = [
    /(\d+)\s*x\s*(\d+)\s*gb/i,  // 2x8GB
    /(\d+)\s*gb/i               // 16GB
  ];
  
  for (const pattern of patterns) {
    const match = ramName.match(pattern);
    if (match) {
      if (match[2]) {
        // 2x8GB format
        return parseInt(match[1]) * parseInt(match[2]);
      } else {
        // 16GB format
        return parseInt(match[1]);
      }
    }
  }
  
  return null;
}

/**
 * Infer storage capacity from product name
 * @param {string} storageName - Storage product name
 * @returns {number|null} Capacity in GB
 */
function inferStorageCapacity(storageName) {
  // Match patterns like: "1TB", "512GB", "2 TB"
  const tbMatch = storageName.match(/(\d+)\s*tb/i);
  if (tbMatch) {
    return parseInt(tbMatch[1]) * 1000; // Convert TB to GB
  }
  
  const gbMatch = storageName.match(/(\d+)\s*gb/i);
  if (gbMatch) {
    return parseInt(gbMatch[1]);
  }
  
  return null;
}

/**
 * Infer storage type from product name
 * @param {string} storageName - Storage product name
 * @returns {string} Storage type
 */
function inferStorageType(storageName) {
  const name = storageName.toUpperCase();
  
  if (name.includes('NVME') || name.includes('M.2')) return 'NVMe SSD';
  if (name.includes('SSD')) return 'SATA SSD';
  if (name.includes('HDD') || name.includes('HARD DRIVE')) return 'HDD';
  
  return 'unknown';
}

/**
 * Enrich a single product with inferred metadata
 * @param {Object} product - Product object
 * @returns {Object} Enriched product
 */
function enrichProduct(product) {
  const enriched = { ...product };
  let specs = product.specifications ? JSON.parse(JSON.stringify(product.specifications)) : {};
  let enrichmentCount = 0;
  
  switch (product.category) {
    case 'CPU':
      if (!specs.socket || specs.socket === 'unknown') {
        const socket = inferCPUSocket(product.name);
        if (socket !== 'unknown') {
          specs.socket = socket;
          enrichmentCount++;
        }
      }
      break;
      
    case 'Motherboard':
      if (!specs.chipset || specs.chipset === 'unknown') {
        const chipset = inferMotherboardChipset(product.name);
        if (chipset !== 'unknown') {
          specs.chipset = chipset;
          enrichmentCount++;
          
          // Also infer socket from chipset
          if (!specs.socket || specs.socket === 'unknown') {
            const socket = inferMotherboardSocket(chipset);
            if (socket !== 'unknown') {
              specs.socket = socket;
              enrichmentCount++;
            }
          }
        }
      }
      break;
      
    case 'PSU':
      if (!specs.wattage) {
        const wattage = inferPSUWattage(product.name);
        if (wattage) {
          specs.wattage = wattage;
          enrichmentCount++;
        }
      }
      if (!specs.efficiency || specs.efficiency === 'unknown') {
        const efficiency = inferPSUEfficiency(product.name);
        if (efficiency !== 'unknown') {
          specs.efficiency = efficiency;
          enrichmentCount++;
        }
      }
      break;
      
    case 'RAM':
      if (!specs.speed) {
        const speed = inferRAMSpeed(product.name);
        if (speed) {
          specs.speed = speed;
          enrichmentCount++;
        }
      }
      if (!specs.type || specs.type === 'unknown') {
        const type = inferRAMType(product.name);
        if (type !== 'unknown') {
          specs.type = type;
          enrichmentCount++;
        }
      }
      if (!specs.capacity) {
        const capacity = inferRAMCapacity(product.name);
        if (capacity) {
          specs.capacity = capacity;
          enrichmentCount++;
        }
      }
      break;
      
    case 'Storage':
      if (!specs.capacity) {
        const capacity = inferStorageCapacity(product.name);
        if (capacity) {
          specs.capacity = capacity;
          enrichmentCount++;
        }
      }
      if (!specs.type || specs.type === 'unknown') {
        const type = inferStorageType(product.name);
        if (type !== 'unknown') {
          specs.type = type;
          enrichmentCount++;
        }
      }
      break;
  }
  
  if (enrichmentCount > 0) {
    enriched.specifications = specs;
    enriched.enrichmentCount = enrichmentCount;
  }
  
  return enriched;
}

/**
 * Batch enrich all products in database
 * @returns {Promise<Object>} Enrichment statistics
 */
async function enrichAllProducts() {
  console.log('🔄 Starting product metadata enrichment...\n');
  
  try {
    // Get all active products
    const result = await db.query(`
      SELECT id, name, category, specifications, price
      FROM pc_parts
      WHERE is_active = true
      ORDER BY category, name
    `);
    
    const products = result.rows;
    console.log(`📦 Found ${products.length} active products\n`);
    
    const stats = {
      total: products.length,
      enriched: 0,
      byCategory: {},
      fieldsEnriched: 0
    };
    
    // Initialize category counters
    const categories = ['CPU', 'Motherboard', 'PSU', 'RAM', 'Storage', 'GPU', 'Cooling', 'Case'];
    categories.forEach(cat => {
      stats.byCategory[cat] = { total: 0, enriched: 0, fields: 0 };
    });
    
    // Process each product
    for (const product of products) {
      const category = product.category;
      if (stats.byCategory[category]) {
        stats.byCategory[category].total++;
      }
      
      const enrichedProduct = enrichProduct(product);
      
      if (enrichedProduct.enrichmentCount > 0) {
        // Update database
        const specsJson = typeof enrichedProduct.specifications === 'string' 
          ? enrichedProduct.specifications 
          : JSON.stringify(enrichedProduct.specifications);
        
        await db.query(
          'UPDATE pc_parts SET specifications = $1 WHERE id = $2',
          [specsJson, product.id]
        );
        
        stats.enriched++;
        stats.fieldsEnriched += enrichedProduct.enrichmentCount;
        
        if (stats.byCategory[category]) {
          stats.byCategory[category].enriched++;
          stats.byCategory[category].fields += enrichedProduct.enrichmentCount;
        }
        
        console.log(`✅ [${category}] ${product.name.substring(0, 50)} - ${enrichedProduct.enrichmentCount} fields enriched`);
      }
    }
    
    console.log('\n📊 Enrichment Statistics:');
    console.log(`   Total Products: ${stats.total}`);
    console.log(`   Products Enriched: ${stats.enriched}`);
    console.log(`   Total Fields Added: ${stats.fieldsEnriched}`);
    console.log(`   Enrichment Rate: ${((stats.enriched / stats.total) * 100).toFixed(1)}%\n`);
    
    console.log('📊 By Category:');
    Object.keys(stats.byCategory).forEach(cat => {
      const catStats = stats.byCategory[cat];
      if (catStats.total > 0) {
        console.log(`   ${cat}: ${catStats.enriched}/${catStats.total} (${catStats.fields} fields)`);
      }
    });
    
    return stats;
    
  } catch (error) {
    logger.error('Metadata enrichment failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  enrichProduct,
  enrichAllProducts,
  inferCPUSocket,
  inferMotherboardChipset,
  inferMotherboardSocket,
  inferPSUWattage,
  inferPSUEfficiency,
  inferRAMSpeed,
  inferRAMType,
  inferRAMCapacity,
  inferStorageCapacity,
  inferStorageType
};
