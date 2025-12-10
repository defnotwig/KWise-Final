const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

// Extract products from PC-Parts.js
function extractPCPartsProducts(content) {
  const products = [];
  
  try {
    // Find the menuItems array
    const menuItemsMatch = content.match(/export const menuItems = \[([\s\S]*)\];/);
    if (!menuItemsMatch) return products;
    
    // Split by products arrays
    const productSections = content.split('products: [');
    
    for (let i = 1; i < productSections.length; i++) {
      const section = productSections[i];
      const endIndex = section.indexOf(']');
      if (endIndex === -1) continue;
      
      const productsString = section.substring(0, endIndex);
      
      // Extract individual products using regex
      const productMatches = productsString.match(/{[^}]*name:\s*"([^"]+)"[^}]*price:\s*"([^"]+)"[^}]*details:\s*"([^"]*)"[^}]*specifications:\s*"([^"]*)"[^}]*}/g);
      
      if (productMatches) {
        productMatches.forEach(match => {
          const nameMatch = match.match(/name:\s*"([^"]+)"/);
          const priceMatch = match.match(/price:\s*"([^"]+)"/);
          const detailsMatch = match.match(/details:\s*"([^"]*)"/);
          const specsMatch = match.match(/specifications:\s*"([^"]*)"/);
          
          if (nameMatch) {
            products.push({
              name: nameMatch[1],
              price: priceMatch ? priceMatch[1] : null,
              details: detailsMatch ? detailsMatch[1] : null,
              specifications: specsMatch ? specsMatch[1] : null,
              source: 'PC-Parts.js'
            });
          }
        });
      }
    }
  } catch (error) {
    console.error('Error parsing PC-Parts.js:', error.message);
  }
  
  return products;
}

// Extract products from ProductList.js
function extractProductListItems(content) {
  const products = [];
  
  try {
    // Find the pcProducts array
    const pcProductsMatch = content.match(/const pcProducts = \[([\s\S]*?)\];/);
    if (!pcProductsMatch) return products;
    
    const pcProductsString = pcProductsMatch[1];
    
    // Extract each product object
    const productMatches = pcProductsString.match(/{[\s\S]*?name:\s*"([^"]+)"[\s\S]*?price:\s*(\d+)[\s\S]*?category:\s*"([^"]+)"[\s\S]*?components:\s*\[[\s\S]*?\][\s\S]*?}/g);
    
    if (productMatches) {
      productMatches.forEach(match => {
        const nameMatch = match.match(/name:\s*"([^"]+)"/);
        const priceMatch = match.match(/price:\s*(\d+)/);
        const categoryMatch = match.match(/category:\s*"([^"]+)"/);
        
        // Extract components
        const componentsMatch = match.match(/components:\s*\[([\s\S]*?)\]/);
        let components = [];
        if (componentsMatch) {
          const componentsString = componentsMatch[1];
          const componentMatches = componentsString.match(/{\s*name:\s*"([^"]+)",\s*value:\s*"([^"]+)"\s*}/g);
          if (componentMatches) {
            components = componentMatches.map(comp => {
              const nameMatch = comp.match(/name:\s*"([^"]+)"/);
              const valueMatch = comp.match(/value:\s*"([^"]+)"/);
              return {
                type: nameMatch ? nameMatch[1] : '',
                value: valueMatch ? valueMatch[1] : ''
              };
            });
          }
        }
        
        if (nameMatch) {
          products.push({
            name: nameMatch[1],
            price: priceMatch ? priceMatch[1] : null,
            category: categoryMatch ? categoryMatch[1] : null,
            components: components,
            source: 'ProductList.js'
          });
        }
      });
    }
  } catch (error) {
    console.error('Error parsing ProductList.js:', error.message);
  }
  
  return products;
}

// Extract products from PCCustomized.js
function extractCustomizedProducts(content) {
  const products = [];
  
  try {
    // Look for customProducts array
    const customProductsMatch = content.match(/const customProducts = \[([\s\S]*?)\];/);
    if (!customProductsMatch) return products;
    
    const customProductsString = customProductsMatch[1];
    
    // Extract each product
    const productMatches = customProductsString.match(/{[\s\S]*?name:\s*"([^"]+)"[\s\S]*?price:\s*(\d+)[\s\S]*?category:\s*"([^"]+)"[\s\S]*?specs:\s*{[\s\S]*?}[\s\S]*?}/g);
    
    if (productMatches) {
      productMatches.forEach(match => {
        const nameMatch = match.match(/name:\s*"([^"]+)"/);
        const priceMatch = match.match(/price:\s*(\d+)/);
        const categoryMatch = match.match(/category:\s*"([^"]+)"/);
        
        // Extract specs
        const specsMatch = match.match(/specs:\s*({[\s\S]*?})/);
        let specs = {};
        if (specsMatch) {
          try {
            // Simple spec extraction
            const specsString = specsMatch[1];
            const specLines = specsString.split(',');
            specLines.forEach(line => {
              const keyValueMatch = line.match(/(\w+):\s*"([^"]+)"/);
              if (keyValueMatch) {
                specs[keyValueMatch[1]] = keyValueMatch[2];
              }
            });
          } catch (e) {
            // Ignore spec parsing errors
          }
        }
        
        if (nameMatch) {
          products.push({
            name: nameMatch[1],
            price: priceMatch ? priceMatch[1] : null,
            category: categoryMatch ? categoryMatch[1] : null,
            specifications: specs,
            source: 'PCCustomized.js'
          });
        }
      });
    }
  } catch (error) {
    console.error('Error parsing PCCustomized.js:', error.message);
  }
  
  return products;
}

// Parse specifications string into structured data
function parseSpecifications(specsString) {
  if (!specsString) return {};
  
  const specs = {};
  
  // Common patterns
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
    wattage: /(\d+)w(?!\s*tdp)/i
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = specsString.match(pattern);
    if (match) {
      specs[key] = match[1] || match[0];
    }
  }
  
  return specs;
}

// Calculate specification similarity
function calculateSpecSimilarity(kioskSpecs, dbSpecs) {
  if (!kioskSpecs || !dbSpecs) return 0;
  
  const kioskKeys = Object.keys(kioskSpecs);
  const dbKeys = Object.keys(dbSpecs);
  
  if (kioskKeys.length === 0 && dbKeys.length === 0) return 1;
  if (kioskKeys.length === 0 || dbKeys.length === 0) return 0;
  
  let matches = 0;
  let total = 0;
  
  const allKeys = new Set([...kioskKeys, ...dbKeys]);
  
  for (const key of allKeys) {
    total++;
    
    if (kioskSpecs[key] && dbSpecs[key]) {
      const val1 = String(kioskSpecs[key]).toLowerCase();
      const val2 = String(dbSpecs[key]).toLowerCase();
      
      if (val1 === val2) {
        matches++;
      } else if (isNumeric(val1) && isNumeric(val2)) {
        const num1 = parseFloat(val1);
        const num2 = parseFloat(val2);
        const diff = Math.abs(num1 - num2) / Math.max(num1, num2);
        if (diff <= 0.1) matches++; // 10% tolerance
      }
    }
  }
  
  return total > 0 ? matches / total : 0;
}

// Calculate name similarity
function calculateNameSimilarity(name1, name2) {
  const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  if (n1 === n2) return 1;
  
  // Check if one name contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;
  
  // Check word overlap
  const words1 = n1.split(' ');
  const words2 = n2.split(' ');
  
  const commonWords = words1.filter(word => words2.includes(word) && word.length > 2);
  const totalUniqueWords = new Set([...words1, ...words2]).size;
  
  return totalUniqueWords > 0 ? (commonWords.length * 2) / totalUniqueWords : 0;
}

function isNumeric(str) {
  return !isNaN(parseFloat(str)) && isFinite(str);
}

// Find matches between kiosk and database products
function findMatches(kioskProducts, dbProducts) {
  const matches = [];
  const unmatchedKiosk = [];
  
  for (const kioskProduct of kioskProducts) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const dbProduct of dbProducts) {
      const nameSimilarity = calculateNameSimilarity(kioskProduct.name, dbProduct.name);
      
      // Parse specifications
      const kioskSpecs = kioskProduct.specifications ? 
        (typeof kioskProduct.specifications === 'string' ? 
         parseSpecifications(kioskProduct.specifications) : 
         kioskProduct.specifications) : {};
      
      const dbSpecs = dbProduct.specifications || {};
      
      const specSimilarity = calculateSpecSimilarity(kioskSpecs, dbSpecs);
      
      // Combined score (weight specs more heavily)
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
    
    const MATCH_THRESHOLD = 0.4; // 40% similarity threshold
    
    if (bestMatch && bestMatch.combinedScore >= MATCH_THRESHOLD) {
      matches.push({
        kioskProduct,
        ...bestMatch
      });
    } else {
      unmatchedKiosk.push({
        kioskProduct,
        bestMatch
      });
    }
  }
  
  return { matches, unmatchedKiosk };
}

async function main() {
  try {
    console.log('🔍 ENHANCED KIOSK vs DATABASE SPECIFICATION ANALYSIS');
    console.log('====================================================\n');
    
    // Read and parse kiosk files
    const kioskDir = path.join(__dirname, '..', 'K-Wise', 'src', 'kiosk');
    const allKioskProducts = [];
    
    console.log('📁 Extracting products from kiosk files...\n');
    
    // PC-Parts.js
    const pcPartsPath = path.join(kioskDir, 'PC-Parts.js');
    if (fs.existsSync(pcPartsPath)) {
      const content = fs.readFileSync(pcPartsPath, 'utf8');
      const products = extractPCPartsProducts(content);
      allKioskProducts.push(...products);
      console.log(`   📄 PC-Parts.js: ${products.length} products`);
    }
    
    // ProductList.js
    const productListPath = path.join(kioskDir, 'ProductList.js');
    if (fs.existsSync(productListPath)) {
      const content = fs.readFileSync(productListPath, 'utf8');
      const products = extractProductListItems(content);
      allKioskProducts.push(...products);
      console.log(`   📄 ProductList.js: ${products.length} products`);
    }
    
    // PCCustomized.js
    const customizedPath = path.join(kioskDir, 'PCCustomized.js');
    if (fs.existsSync(customizedPath)) {
      const content = fs.readFileSync(customizedPath, 'utf8');
      const products = extractCustomizedProducts(content);
      allKioskProducts.push(...products);
      console.log(`   📄 PCCustomized.js: ${products.length} products`);
    }
    
    console.log(`\n📊 Total kiosk products: ${allKioskProducts.length}`);
    
    // Get database products
    console.log('\n🗄️  Fetching database inventory...');
    const dbResult = await pool.query('SELECT id, name, category, price, specifications FROM pc_parts ORDER BY name');
    const dbProducts = dbResult.rows;
    console.log(`   Found ${dbProducts.length} products in database`);
    
    // Perform matching analysis
    console.log('\n🔬 Performing specification-based matching...\n');
    const { matches, unmatchedKiosk } = findMatches(allKioskProducts, dbProducts);
    
    // Display results
    console.log('📋 ANALYSIS RESULTS');
    console.log('==================\n');
    
    console.log(`✅ EXISTING ITEMS (Found in Database): ${matches.length}`);
    console.log('─'.repeat(60));
    
    matches.sort((a, b) => b.combinedScore - a.combinedScore);
    
    for (let i = 0; i < Math.min(matches.length, 20); i++) { // Show top 20 matches
      const match = matches[i];
      console.log(`\n${i + 1}. 📦 KIOSK: ${match.kioskProduct.name}`);
      console.log(`   📂 Source: ${match.kioskProduct.source}`);
      console.log(`   💰 Price: ${match.kioskProduct.price || 'N/A'}`);
      console.log(`\n   🗄️  DATABASE: ${match.dbProduct.name}`);
      console.log(`   🏷️  Category: ${match.dbProduct.category}`);
      console.log(`   💰 DB Price: ₱${match.dbProduct.price || 'N/A'}`);
      console.log(`\n   📊 SCORES:`);
      console.log(`   📝 Name: ${(match.nameSimilarity * 100).toFixed(1)}%`);
      console.log(`   🔧 Specs: ${(match.specSimilarity * 100).toFixed(1)}%`);
      console.log(`   🎯 Combined: ${(match.combinedScore * 100).toFixed(1)}%`);
    }
    
    if (matches.length > 20) {
      console.log(`\n   ... and ${matches.length - 20} more matches`);
    }
    
    console.log(`\n\n❌ MISSING ITEMS (Not in Database): ${unmatchedKiosk.length}`);
    console.log('─'.repeat(60));
    
    // Group missing by source
    const missingBySource = {};
    unmatchedKiosk.forEach(item => {
      const source = item.kioskProduct.source;
      if (!missingBySource[source]) missingBySource[source] = [];
      missingBySource[source].push(item);
    });
    
    for (const [source, items] of Object.entries(missingBySource)) {
      console.log(`\n📁 FROM ${source}: ${items.length} missing items`);
      items.slice(0, 10).forEach((item, i) => { // Show first 10 per source
        console.log(`   ${i + 1}. ${item.kioskProduct.name}`);
        console.log(`      💰 Price: ${item.kioskProduct.price || 'N/A'}`);
        if (item.kioskProduct.specifications) {
          const specs = typeof item.kioskProduct.specifications === 'string' ? 
            item.kioskProduct.specifications.substring(0, 100) + '...' : 
            JSON.stringify(item.kioskProduct.specifications).substring(0, 100) + '...';
          console.log(`      🔧 Specs: ${specs}`);
        }
      });
      if (items.length > 10) {
        console.log(`      ... and ${items.length - 10} more items`);
      }
    }
    
    // Summary statistics
    console.log('\n\n📈 SUMMARY STATISTICS');
    console.log('====================');
    console.log(`📊 Total Kiosk Products: ${allKioskProducts.length}`);
    console.log(`🗄️  Total Database Products: ${dbProducts.length}`);
    console.log(`✅ Matched Items: ${matches.length} (${((matches.length / allKioskProducts.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Missing Items: ${unmatchedKiosk.length} (${((unmatchedKiosk.length / allKioskProducts.length) * 100).toFixed(1)}%)`);
    
    // High confidence matches
    const highConfidence = matches.filter(m => m.combinedScore > 0.7);
    console.log(`🎯 High-Confidence Matches (>70%): ${highConfidence.length}`);
    
    // Breakdown by source
    console.log('\n📁 BREAKDOWN BY SOURCE:');
    const sourceStats = {};
    allKioskProducts.forEach(p => {
      sourceStats[p.source] = (sourceStats[p.source] || 0) + 1;
    });
    
    Object.entries(sourceStats).forEach(([source, total]) => {
      const matched = matches.filter(m => m.kioskProduct.source === source).length;
      console.log(`   ${source}: ${total} total (${matched} matched, ${total - matched} missing)`);
    });
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await pool.end();
  }
}

main();