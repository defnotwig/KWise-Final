const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'KWiseDB',
  password: process.env.DB_PASSWORD || 'humbleludwig13',
  port: process.env.DB_PORT || 5432,
});

// Extract products from JavaScript file content
function extractProductsFromJS(content, filename) {
  const products = [];
  
  try {
    // Remove imports and non-data code, focus on data arrays
    const lines = content.split('\n');
    let inDataSection = false;
    let braceLevel = 0;
    let currentProduct = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('/*')) continue;
      
      // Look for product arrays or object definitions
      if (line.includes('products:') || line.includes('pcProducts') || line.includes('customProducts')) {
        inDataSection = true;
        continue;
      }
      
      if (inDataSection) {
        // Track brace levels
        braceLevel += (line.match(/{/g) || []).length;
        braceLevel -= (line.match(/}/g) || []).length;
        
        // Extract product data
        if (line.includes('name:') && line.includes('"')) {
          const nameMatch = line.match(/name:\s*["']([^"']+)["']/);
          if (nameMatch) {
            currentProduct = {
              name: nameMatch[1],
              source: filename,
              price: null,
              specifications: {},
              details: null,
              category: null,
              brand: null
            };
          }
        }
        
        if (currentProduct) {
          // Extract price
          if (line.includes('price:')) {
            const priceMatch = line.match(/price:\s*["']?([^"',}]+)["']?/);
            if (priceMatch) {
              currentProduct.price = priceMatch[1].replace(/[^\d.,]/g, '');
            }
          }
          
          // Extract specifications
          if (line.includes('specifications:')) {
            const specsMatch = line.match(/specifications:\s*["']([^"']+)["']/);
            if (specsMatch) {
              currentProduct.specifications.raw = specsMatch[1];
              // Parse specifications into structured data
              parseSpecifications(currentProduct, specsMatch[1]);
            }
          }
          
          // Extract details
          if (line.includes('details:')) {
            const detailsMatch = line.match(/details:\s*["']([^"']+)["']/);
            if (detailsMatch) {
              currentProduct.details = detailsMatch[1];
            }
          }
          
          // Extract category from component sections
          if (line.includes('name: "CPU"') || filename.includes('PC-Parts') && inDataSection) {
            if (line.includes('Central Processing Unit')) currentProduct.category = 'cpu';
            else if (line.includes('CPU Cooler')) currentProduct.category = 'cooling';
            else if (line.includes('Motherboard')) currentProduct.category = 'motherboard';
            else if (line.includes('Graphics Card')) currentProduct.category = 'gpu';
            else if (line.includes('Memory')) currentProduct.category = 'ram';
            else if (line.includes('Storage')) currentProduct.category = 'storage';
            else if (line.includes('Power Supply')) currentProduct.category = 'psu';
            else if (line.includes('Case')) currentProduct.category = 'case';
          }
          
          // End of product object
          if (line.includes('},') || (line.includes('}') && braceLevel <= 1)) {
            if (currentProduct.name) {
              products.push(currentProduct);
            }
            currentProduct = null;
          }
        }
        
        // End of data section
        if (braceLevel <= 0 && inDataSection) {
          inDataSection = false;
        }
      }
    }
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error.message);
  }
  
  return products;
}

// Parse specifications string into structured data
function parseSpecifications(product, specsString) {
  const specs = {};
  
  // Common patterns in specifications
  const patterns = {
    cores: /(\d+)\s*cores?/i,
    threads: /(\d+)\s*threads?/i,
    baseFreq: /(\d+\.?\d*)\s*ghz\s*base/i,
    boostFreq: /(\d+\.?\d*)\s*ghz\s*boost/i,
    memory: /(\d+)\s*gb/i,
    socket: /(am[45]|lga\s*\d+)/i,
    tdp: /(\d+)w\s*tdp/i,
    cache: /(\d+)mb/i,
    speed: /(\d+)\s*mhz/i,
    capacity: /(\d+)\s*(gb|tb)/i,
    interface: /(nvme|sata|m\.2)/i,
    efficiency: /80\+\s*(bronze|silver|gold|platinum|titanium)/i,
    wattage: /(\d+)w/i
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = specsString.match(pattern);
    if (match) {
      specs[key] = match[1] || match[0];
    }
  }
  
  // Extract brand information
  const brands = ['amd', 'intel', 'nvidia', 'radeon', 'geforce', 'ryzen', 'core', 'gigabyte', 'asus', 'msi', 'asrock', 'corsair', 'seasonic', 'evga', 'cooler master', 'deepcool', 'noctua'];
  for (const brand of brands) {
    if (specsString.toLowerCase().includes(brand)) {
      product.brand = brand;
      break;
    }
  }
  
  product.specifications.parsed = specs;
}

// Calculate specification similarity between two products
function calculateSpecificationSimilarity(kioskProduct, dbProduct) {
  const kioskSpecs = kioskProduct.specifications?.parsed || {};
  const dbSpecs = parseDBSpecifications(dbProduct.specifications);
  
  let matchingSpecs = 0;
  let totalSpecs = 0;
  let significantMatches = 0;
  
  // Define significant specification fields
  const significantFields = ['cores', 'memory', 'capacity', 'socket', 'wattage', 'baseFreq'];
  
  // Compare each specification
  const allKeys = new Set([...Object.keys(kioskSpecs), ...Object.keys(dbSpecs)]);
  
  for (const key of allKeys) {
    totalSpecs++;
    
    if (kioskSpecs[key] && dbSpecs[key]) {
      const kioskValue = String(kioskSpecs[key]).toLowerCase();
      const dbValue = String(dbSpecs[key]).toLowerCase();
      
      // Exact match
      if (kioskValue === dbValue) {
        matchingSpecs++;
        if (significantFields.includes(key)) significantMatches++;
      }
      // Fuzzy match for numeric values
      else if (isNumeric(kioskValue) && isNumeric(dbValue)) {
        const kioskNum = parseFloat(kioskValue);
        const dbNum = parseFloat(dbValue);
        const diff = Math.abs(kioskNum - dbNum) / Math.max(kioskNum, dbNum);
        
        if (diff <= 0.1) { // Within 10% tolerance
          matchingSpecs++;
          if (significantFields.includes(key)) significantMatches++;
        }
      }
    }
  }
  
  // Calculate similarity score
  const specSimilarity = totalSpecs > 0 ? (matchingSpecs / totalSpecs) : 0;
  const significantSimilarity = significantFields.length > 0 ? (significantMatches / significantFields.filter(f => kioskSpecs[f] || dbSpecs[f]).length) : 0;
  
  // Weight significant specs more heavily
  return (specSimilarity * 0.4) + (significantSimilarity * 0.6);
}

// Parse database specifications (JSONB format)
function parseDBSpecifications(dbSpecs) {
  if (!dbSpecs || typeof dbSpecs !== 'object') return {};
  
  const parsed = {};
  
  // Map common database fields to our standard format
  const fieldMapping = {
    cores: ['cores', 'core_count'],
    threads: ['threads', 'thread_count'],
    baseFreq: ['base_clock', 'base_frequency', 'base_speed'],
    boostFreq: ['boost_clock', 'boost_frequency', 'max_speed'],
    memory: ['memory_size', 'capacity_gb', 'size'],
    socket: ['socket', 'socket_type'],
    tdp: ['tdp', 'power_consumption'],
    cache: ['cache_size', 'l3_cache'],
    speed: ['memory_speed', 'frequency'],
    capacity: ['capacity', 'storage_capacity'],
    interface: ['interface_type', 'connector_type'],
    wattage: ['wattage', 'power_rating']
  };
  
  for (const [standardField, dbFields] of Object.entries(fieldMapping)) {
    for (const dbField of dbFields) {
      if (dbSpecs[dbField] !== undefined) {
        parsed[standardField] = dbSpecs[dbField];
        break;
      }
    }
  }
  
  return parsed;
}

// Check if a string represents a number
function isNumeric(str) {
  return !isNaN(parseFloat(str)) && isFinite(str);
}

// Calculate name similarity using edit distance
function calculateNameSimilarity(name1, name2) {
  const str1 = name1.toLowerCase().replace(/[^\w\s]/g, '');
  const str2 = name2.toLowerCase().replace(/[^\w\s]/g, '');
  
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - (matrix[len1][len2] / maxLen);
}

// Find best matches for kiosk products in database
function findBestMatches(kioskProducts, dbProducts) {
  const matches = [];
  const unmatchedKiosk = [];
  
  for (const kioskProduct of kioskProducts) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const dbProduct of dbProducts) {
      // Calculate combined similarity score
      const nameSimilarity = calculateNameSimilarity(kioskProduct.name, dbProduct.name);
      const specSimilarity = calculateSpecificationSimilarity(kioskProduct, dbProduct);
      
      // Weight specifications more heavily than name
      const combinedScore = (nameSimilarity * 0.3) + (specSimilarity * 0.7);
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestMatch = {
          dbProduct,
          nameSimilarity,
          specSimilarity,
          combinedScore
        };
      }
    }
    
    // Threshold for considering a match (can be adjusted)
    const MATCH_THRESHOLD = 0.5; // 50% similarity
    
    if (bestMatch && bestMatch.combinedScore >= MATCH_THRESHOLD) {
      matches.push({
        kioskProduct,
        ...bestMatch,
        isMatch: true
      });
    } else {
      unmatchedKiosk.push({
        kioskProduct,
        bestMatch,
        isMatch: false
      });
    }
  }
  
  return { matches, unmatchedKiosk };
}

async function main() {
  try {
    console.log('🔍 COMPREHENSIVE KIOSK vs DATABASE SPECIFICATION ANALYSIS');
    console.log('=========================================================\n');
    
    // Read kiosk files
    const kioskDir = path.join(__dirname, '..', 'K-Wise', 'src', 'kiosk');
    const kioskFiles = ['PC-Parts.js', 'ProductList.js', 'PCCustomized.js'];
    
    console.log('📁 Scanning kiosk files...');
    
    let allKioskProducts = [];
    
    for (const file of kioskFiles) {
      const filePath = path.join(kioskDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`   📄 Processing ${file}...`);
        const content = fs.readFileSync(filePath, 'utf8');
        const products = extractProductsFromJS(content, file);
        allKioskProducts = allKioskProducts.concat(products);
        console.log(`      Found ${products.length} products`);
      }
    }
    
    console.log(`\n📊 Total kiosk products extracted: ${allKioskProducts.length}`);
    
    // Get database products
    console.log('\n🗄️  Fetching database inventory...');
    const dbResult = await pool.query('SELECT id, name, category, price, specifications FROM pc_parts');
    const dbProducts = dbResult.rows;
    console.log(`   Found ${dbProducts.length} products in database`);
    
    // Perform specification-based matching
    console.log('\n🔬 Performing specification-based analysis...');
    const { matches, unmatchedKiosk } = findBestMatches(allKioskProducts, dbProducts);
    
    // Generate detailed report
    console.log('\n📋 ANALYSIS RESULTS');
    console.log('==================');
    
    console.log(`\n✅ EXISTING ITEMS (Found in Database): ${matches.length}`);
    console.log('─'.repeat(50));
    
    matches.sort((a, b) => b.combinedScore - a.combinedScore);
    
    for (const match of matches) {
      console.log(`\n📦 KIOSK: ${match.kioskProduct.name}`);
      console.log(`   📂 Source: ${match.kioskProduct.source}`);
      console.log(`   💰 Price: ${match.kioskProduct.price || 'N/A'}`);
      console.log(`\n🗄️  DATABASE: ${match.dbProduct.name}`);
      console.log(`   🏷️  Category: ${match.dbProduct.category}`);
      console.log(`   💰 Price: ₱${match.dbProduct.price || 'N/A'}`);
      console.log(`\n📊 SIMILARITY SCORES:`);
      console.log(`   📝 Name Similarity: ${(match.nameSimilarity * 100).toFixed(1)}%`);
      console.log(`   🔧 Spec Similarity: ${(match.specSimilarity * 100).toFixed(1)}%`);
      console.log(`   🎯 Combined Score: ${(match.combinedScore * 100).toFixed(1)}%`);
      
      if (match.kioskProduct.specifications?.raw) {
        console.log(`\n🔧 KIOSK SPECS: ${match.kioskProduct.specifications.raw}`);
      }
      
      if (match.dbProduct.specifications) {
        console.log(`🗄️  DB SPECS: ${JSON.stringify(match.dbProduct.specifications)}`);
      }
      
      console.log('─'.repeat(50));
    }
    
    console.log(`\n❌ MISSING ITEMS (Not in Database): ${unmatchedKiosk.length}`);
    console.log('─'.repeat(50));
    
    // Group by source file
    const missingBySource = {};
    for (const item of unmatchedKiosk) {
      const source = item.kioskProduct.source;
      if (!missingBySource[source]) missingBySource[source] = [];
      missingBySource[source].push(item);
    }
    
    for (const [source, items] of Object.entries(missingBySource)) {
      console.log(`\n📁 FROM ${source}: ${items.length} items`);
      for (const item of items) {
        console.log(`   📦 ${item.kioskProduct.name}`);
        console.log(`      💰 Price: ${item.kioskProduct.price || 'N/A'}`);
        
        if (item.kioskProduct.specifications?.raw) {
          console.log(`      🔧 Specs: ${item.kioskProduct.specifications.raw}`);
        }
        
        if (item.bestMatch) {
          console.log(`      🎯 Best DB match: ${item.bestMatch.dbProduct.name} (${(item.bestMatch.combinedScore * 100).toFixed(1)}% similarity)`);
        }
        console.log('');
      }
    }
    
    // Summary statistics
    console.log('\n📈 SUMMARY STATISTICS');
    console.log('====================');
    console.log(`📊 Total Kiosk Products: ${allKioskProducts.length}`);
    console.log(`🗄️  Total Database Products: ${dbProducts.length}`);
    console.log(`✅ Matched Items: ${matches.length} (${((matches.length / allKioskProducts.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Missing Items: ${unmatchedKiosk.length} (${((unmatchedKiosk.length / allKioskProducts.length) * 100).toFixed(1)}%)`);
    
    // Breakdown by source
    console.log('\n📁 BREAKDOWN BY SOURCE:');
    const sourceStats = {};
    allKioskProducts.forEach(product => {
      sourceStats[product.source] = (sourceStats[product.source] || 0) + 1;
    });
    
    for (const [source, count] of Object.entries(sourceStats)) {
      const sourceMatches = matches.filter(m => m.kioskProduct.source === source).length;
      console.log(`   ${source}: ${count} products (${sourceMatches} matched, ${count - sourceMatches} missing)`);
    }
    
    // High-confidence matches (>75% similarity)
    const highConfidenceMatches = matches.filter(m => m.combinedScore > 0.75);
    console.log(`\n🎯 High-Confidence Matches (>75%): ${highConfidenceMatches.length}`);
    
    // Potential duplicates in kiosk
    console.log('\n🔍 POTENTIAL KIOSK DUPLICATES:');
    const kioskDuplicates = [];
    for (let i = 0; i < allKioskProducts.length; i++) {
      for (let j = i + 1; j < allKioskProducts.length; j++) {
        const similarity = calculateNameSimilarity(allKioskProducts[i].name, allKioskProducts[j].name);
        if (similarity > 0.8) {
          kioskDuplicates.push({
            product1: allKioskProducts[i],
            product2: allKioskProducts[j],
            similarity
          });
        }
      }
    }
    
    if (kioskDuplicates.length > 0) {
      kioskDuplicates.forEach(dup => {
        console.log(`   📦 ${dup.product1.name} (${dup.product1.source})`);
        console.log(`   📦 ${dup.product2.name} (${dup.product2.source})`);
        console.log(`   🎯 Similarity: ${(dup.similarity * 100).toFixed(1)}%\n`);
      });
    } else {
      console.log('   ✅ No potential duplicates found');
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await pool.end();
  }
}

main();