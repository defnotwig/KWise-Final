/**
 * Brand Detection Utility
 * Single source of truth for extracting brand names from product data
 * Used across PC Customizer, order flows, and admin panels
 */

/**
 * Extract brand from product name or brand field
 * @param {Object} product - Product object with name and/or brand field
 * @param {string} categoryKey - Category key for category-specific detection
 * @returns {string} Detected brand name or empty string
 */
export function detectProductBrand(product, categoryKey = '') {
  // Priority 1: Use explicit brand field if available (try all variations)
  const brandField = 
    product?.brand || 
    product?.Brand || 
    product?.item_brand || 
    product?.product_brand || 
    product?.manufacturer || 
    product?.maker ||
    (product?.specifications && product.specifications.brand) ||
    (product?.specifications && product.specifications.manufacturer) ||
    (product?.info && product.info.brand);

  if (brandField && typeof brandField === 'string' && brandField.trim()) {
    return brandField.trim();
  }

  // Priority 2: Extract from product name
  const name = (product?.name || '').toUpperCase();
  if (!name) return '';

  const catLower = categoryKey.toLowerCase();

  // Category-specific brand detection
  if (catLower === 'cpu' || catLower === 'processor') {
    if (name.includes('RYZEN') || name.includes('AMD')) return 'AMD';
    if (name.includes('INTEL') || name.includes('CORE')) return 'Intel';
  }

  if (catLower === 'ram' || catLower === 'memory') {
    if (name.includes('G.SKILL') || name.includes('GSKILL')) return 'G.Skill';
    if (name.includes('CORSAIR')) return 'Corsair';
    if (name.includes('KINGSTON')) return 'Kingston';
    if (name.includes('CRUCIAL')) return 'Crucial';
    if (name.includes('TEAMGROUP') || name.includes('TEAM GROUP')) return 'TeamGroup';
  }

  if (catLower === 'motherboard' || catLower === 'mobo') {
    if (name.includes('ASUS') || name.includes('ROG') || name.includes('TUF')) return 'ASUS';
    if (name.includes('MSI')) return 'MSI';
    if (name.includes('GIGABYTE') || name.includes('AORUS')) return 'Gigabyte';
    if (name.includes('ASROCK')) return 'ASRock';
    if (name.includes('BIOSTAR')) return 'Biostar';
  }

  if (catLower === 'gpu' || catLower === 'graphics') {
    if (name.includes('ASUS') || name.includes('ROG') || name.includes('TUF')) return 'ASUS';
    if (name.includes('MSI')) return 'MSI';
    if (name.includes('GIGABYTE') || name.includes('AORUS')) return 'Gigabyte';
    if (name.includes('ZOTAC')) return 'Zotac';
    if (name.includes('EVGA')) return 'EVGA';
    if (name.includes('SAPPHIRE')) return 'Sapphire';
    if (name.includes('XFX')) return 'XFX';
    if (name.includes('POWERCOLOR')) return 'PowerColor';
    if (name.includes('PALIT')) return 'Palit';
    if (name.includes('GALAX')) return 'Galax';
    if (name.includes('COLORFUL')) return 'Colorful';
  }

  if (catLower === 'storage' || catLower === 'ssd' || catLower === 'hdd') {
    if (name.includes('SAMSUNG')) return 'Samsung';
    if (name.includes('WD') || name.includes('WESTERN DIGITAL')) return 'Western Digital';
    if (name.includes('SEAGATE')) return 'Seagate';
    if (name.includes('CRUCIAL')) return 'Crucial';
    if (name.includes('KINGSTON')) return 'Kingston';
    if (name.includes('SANDISK')) return 'SanDisk';
    if (name.includes('ADATA')) return 'ADATA';
  }

  if (catLower === 'psu' || catLower === 'power') {
    if (name.includes('CORSAIR')) return 'Corsair';
    if (name.includes('EVGA')) return 'EVGA';
    if (name.includes('SEASONIC')) return 'Seasonic';
    if (name.includes('COOLER MASTER') || name.includes('COOLERMASTER')) return 'Cooler Master';
    if (name.includes('THERMALTAKE')) return 'Thermaltake';
    if (name.includes('SILVERSTONE')) return 'SilverStone';
    if (name.includes('BE QUIET') || name.includes('BEQUIET')) return 'be quiet!';
    if (name.includes('ANTEC')) return 'Antec';
  }

  if (catLower === 'case' || catLower === 'chassis') {
    if (name.includes('NZXT')) return 'NZXT';
    if (name.includes('CORSAIR')) return 'Corsair';
    if (name.includes('COOLER MASTER') || name.includes('COOLERMASTER')) return 'Cooler Master';
    if (name.includes('FRACTAL')) return 'Fractal Design';
    if (name.includes('LIAN LI') || name.includes('LIANLI')) return 'Lian Li';
    if (name.includes('PHANTEKS')) return 'Phanteks';
    if (name.includes('THERMALTAKE')) return 'Thermaltake';
    if (name.includes('SILVERSTONE')) return 'SilverStone';
    if (name.includes('BE QUIET') || name.includes('BEQUIET')) return 'be quiet!';
  }

  if (catLower === 'cooling' || catLower === 'cpu-cooler' || catLower === 'cooler' || catLower === 'cpucooler') {
    if (name.includes('NOCTUA')) return 'Noctua';
    if (name.includes('COOLER MASTER') || name.includes('COOLERMASTER')) return 'Cooler Master';
    if (name.includes('DEEPCOOL') || name.includes('DEEP COOL')) return 'DeepCool';
    if (name.includes('CORSAIR')) return 'Corsair';
    if (name.includes('BE QUIET') || name.includes('BEQUIET')) return 'be quiet!';
    if (name.includes('ARCTIC')) return 'ARCTIC';
    if (name.includes('THERMALRIGHT')) return 'Thermalright';
    if (name.includes('DARKFLASH')) return 'DARKFLASH';
    if (name.includes('INPLAY')) return 'INPLAY';
    if (name.includes('JUNGLE LEOPARD')) return 'JUNGLE LEOPARD';
    if (name.includes('KEYTECH')) return 'KEYTECH';
    if (name.includes('RUIX')) return 'RUIX';
    if (name.includes('YGT')) return 'YGT';
    if (name.includes('AMD')) return 'AMD'; // AMD stock coolers
    if (name.includes('INTEL')) return 'INTEL'; // Intel stock coolers
    if (name.includes('NZXT')) return 'NZXT';
    if (name.includes('THERMALTAKE')) return 'Thermaltake';
    if (name.includes('ID-COOLING') || name.includes('IDCOOLING')) return 'ID-COOLING';
  }

  // Generic brand detection (fallback for all categories)
  const brandPatterns = [
    { pattern: /ASUS/i, brand: 'ASUS' },
    { pattern: /MSI/i, brand: 'MSI' },
    { pattern: /GIGABYTE|AORUS/i, brand: 'Gigabyte' },
    { pattern: /ASROCK/i, brand: 'ASRock' },
    { pattern: /SAMSUNG/i, brand: 'Samsung' },
    { pattern: /CORSAIR/i, brand: 'Corsair' },
    { pattern: /KINGSTON/i, brand: 'Kingston' },
    { pattern: /G\.SKILL|GSKILL/i, brand: 'G.Skill' },
    { pattern: /CRUCIAL/i, brand: 'Crucial' },
    { pattern: /WESTERN DIGITAL|WD(?![A-Z])/i, brand: 'Western Digital' },
    { pattern: /SEAGATE/i, brand: 'Seagate' },
    { pattern: /NOCTUA/i, brand: 'Noctua' },
    { pattern: /DEEPCOOL|DEEP COOL/i, brand: 'DeepCool' },
    { pattern: /BE QUIET|BEQUIET/i, brand: 'be quiet!' },
    { pattern: /COOLER MASTER|COOLERMASTER/i, brand: 'Cooler Master' },
    { pattern: /THERMALTAKE/i, brand: 'Thermaltake' },
    { pattern: /NZXT/i, brand: 'NZXT' },
    { pattern: /LIAN LI|LIANLI/i, brand: 'Lian Li' },
    { pattern: /FRACTAL/i, brand: 'Fractal Design' },
    { pattern: /PHANTEKS/i, brand: 'Phanteks' },
    { pattern: /EVGA/i, brand: 'EVGA' },
    { pattern: /ZOTAC/i, brand: 'Zotac' },
    { pattern: /SAPPHIRE/i, brand: 'Sapphire' },
    { pattern: /XFX/i, brand: 'XFX' },
    { pattern: /POWERCOLOR/i, brand: 'PowerColor' },
    { pattern: /PALIT/i, brand: 'Palit' },
    { pattern: /GALAX/i, brand: 'Galax' },
    { pattern: /COLORFUL/i, brand: 'Colorful' },
    { pattern: /SEASONIC/i, brand: 'Seasonic' },
    { pattern: /SILVERSTONE/i, brand: 'SilverStone' },
    { pattern: /ANTEC/i, brand: 'Antec' },
    { pattern: /ARCTIC/i, brand: 'Arctic' },
    { pattern: /ID-COOLING|IDCOOLING/i, brand: 'ID-COOLING' },
    { pattern: /TEAMGROUP|TEAM GROUP/i, brand: 'TeamGroup' },
    { pattern: /ADATA/i, brand: 'ADATA' },
    { pattern: /SANDISK/i, brand: 'SanDisk' },
    { pattern: /BIOSTAR/i, brand: 'Biostar' }
  ];

  for (const { pattern, brand } of brandPatterns) {
    if (pattern.test(name)) {
      return brand;
    }
  }

  // If no brand detected, return empty string
  return '';
}

/**
 * Extract brands from array of products
 * @param {Array} products - Array of product objects
 * @param {string} categoryKey - Category key for category-specific detection
 * @returns {Array} Sorted array of unique brand names
 */
export function extractBrandsFromProducts(products, categoryKey = '') {
  if (!Array.isArray(products)) return [];

  const brandSet = new Set();

  products.forEach(product => {
    const brand = detectProductBrand(product, categoryKey);
    if (brand) {
      brandSet.add(brand);
    }
  });

  return Array.from(brandSet).sort();
}

/**
 * Count products by brand
 * @param {Array} products - Array of product objects
 * @param {string} categoryKey - Category key for category-specific detection
 * @returns {Object} Object with brand names as keys and counts as values
 */
export function countProductsByBrand(products, categoryKey = '') {
  if (!Array.isArray(products)) return {};

  const brandCounts = {};

  products.forEach(product => {
    const brand = detectProductBrand(product, categoryKey);
    if (brand) {
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    }
  });

  return brandCounts;
}

const brandDetectionService = {
  detectProductBrand,
  extractBrandsFromProducts,
  countProductsByBrand
};

export default brandDetectionService;
