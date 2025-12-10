// ⚡ Map Part IDs for Remaining Pre-Built Products
// This script helps find matching part_ids for the 12 remaining Pre-Built products

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function findMatchingPart(componentName, category) {
  try {
    // First try exact match
    let query = `
      SELECT id, part_name, price, stock, specifications 
      FROM pc_parts 
      WHERE category = $1 
        AND part_name ILIKE '%' || $2 || '%'
        AND status = 'Active'
        AND stock > 0
      ORDER BY 
        similarity(part_name, $2) DESC,
        price ASC
      LIMIT 5
    `;
    
    const result = await pool.query(query, [category, componentName]);
    
    if (result.rows.length > 0) {
      return result.rows;
    }
    
    // If no match, try fuzzy search
    query = `
      SELECT id, part_name, price, stock, specifications,
             similarity(part_name, $2) as sim_score
      FROM pc_parts 
      WHERE category = $1 
        AND status = 'Active'
        AND stock > 0
        AND similarity(part_name, $2) > 0.3
      ORDER BY sim_score DESC, price ASC
      LIMIT 5
    `;
    
    const fuzzyResult = await pool.query(query, [category, componentName]);
    return fuzzyResult.rows;
    
  } catch (error) {
    console.error(`Error finding match for ${componentName}:`, error.message);
    return [];
  }
}

async function analyzePreBuiltProduct(productId, productName) {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📦 Analyzing: ${productName} (ID: ${productId})`);
    console.log('='.repeat(80));
    
    const query = `
      SELECT id, part_name, price, specifications
      FROM pc_parts 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [productId]);
    
    if (result.rows.length === 0) {
      console.log('❌ Product not found');
      return;
    }
    
    const product = result.rows[0];
    const components = product.specifications?.components || [];
    
    if (components.length === 0) {
      console.log('⚠️  No components found');
      return;
    }
    
    console.log(`\nFound ${components.length} components\n`);
    
    const suggestions = {};
    
    for (const comp of components) {
      const hasPartId = comp.part_id && comp.part_id !== null;
      const hasValue = comp.value && comp.value.trim() !== '';
      
      console.log(`\n📌 ${comp.name}: ${comp.value || '(empty)'}`);
      console.log(`   Current part_id: ${comp.part_id || '(missing)'}`);
      
      if (!hasPartId && hasValue) {
        // Need to find matching part
        console.log(`   🔍 Searching for matches...`);
        
        const matches = await findMatchingPart(comp.value, comp.name);
        
        if (matches.length > 0) {
          console.log(`   ✅ Found ${matches.length} potential matches:`);
          
          suggestions[comp.name] = matches.map((match, idx) => {
            const score = match.sim_score ? ` (similarity: ${(match.sim_score * 100).toFixed(0)}%)` : '';
            console.log(`      ${idx + 1}. ID ${match.id} | ${match.part_name} | ₱${match.price} | Stock: ${match.stock}${score}`);
            
            return {
              id: match.id,
              name: match.part_name,
              price: match.price,
              stock: match.stock
            };
          });
          
          // Highlight best match
          console.log(`   ⭐ Best match: ID ${matches[0].id} - ${matches[0].part_name}`);
        } else {
          console.log(`   ❌ No matches found - manual mapping required`);
          suggestions[comp.name] = [];
        }
      } else if (hasPartId) {
        console.log(`   ✅ Already has part_id`);
      } else {
        console.log(`   ⚪ Empty component (optional)`);
      }
    }
    
    return { product, components, suggestions };
    
  } catch (error) {
    console.error('Error analyzing product:', error.message);
  }
}

async function generateUpdateScript(productId, componentMappings) {
  // componentMappings = { 'CPU': 29, 'RAM': 205, 'Storage': 310, ... }
  
  try {
    const query = `
      SELECT specifications FROM pc_parts WHERE id = $1
    `;
    
    const result = await pool.query(query, [productId]);
    const specifications = result.rows[0].specifications;
    const components = specifications.components || [];
    
    // Update components with part_ids
    const updatedComponents = components.map(comp => {
      const partId = componentMappings[comp.name];
      
      if (partId) {
        return {
          ...comp,
          part_id: partId
        };
      }
      
      return comp;
    });
    
    // Generate UPDATE statement
    const updateQuery = `
      UPDATE pc_parts 
      SET specifications = jsonb_set(
        specifications,
        '{components}',
        $1::jsonb
      )
      WHERE id = $2
      RETURNING id, part_name;
    `;
    
    console.log(`\n📝 Generated UPDATE query for product ID ${productId}:`);
    console.log(updateQuery);
    console.log(`\nComponents JSON:`);
    console.log(JSON.stringify(updatedComponents, null, 2));
    
    // Execute update
    const updateResult = await pool.query(updateQuery, [
      JSON.stringify(updatedComponents),
      productId
    ]);
    
    console.log(`\n✅ Updated: ${updateResult.rows[0].part_name}`);
    
  } catch (error) {
    console.error('Error generating update script:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Pre-Built Part ID Mapper\n');
    
    // Define all Pre-Built products (excluding Starter Build A which is done)
    const products = [
      { id: 12011, name: 'Starter Build B' },
      { id: 12012, name: 'Starter Build C' },
      { id: 12013, name: 'Mid Tier Build A' },
      { id: 12014, name: 'Mid Tier Build B' },
      { id: 12015, name: 'Mid Tier Build C' },
      { id: 12016, name: 'High Tier Build A' },
      { id: 12017, name: 'High Tier Build B' },
      { id: 12018, name: 'High Tier Build C' },
      { id: 12019, name: 'High Tier Build D' },
      { id: 12020, name: 'Elite Build A' },
      { id: 12021, name: 'Elite Build B' },
      { id: 12022, name: 'Elite Build C' }
    ];
    
    // Analyze each product
    const allSuggestions = {};
    
    for (const product of products) {
      const analysis = await analyzePreBuiltProduct(product.id, product.name);
      if (analysis) {
        allSuggestions[product.name] = analysis.suggestions;
      }
      
      // Add delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Print summary
    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('📊 MAPPING SUMMARY');
    console.log('='.repeat(80));
    
    for (const [productName, suggestions] of Object.entries(allSuggestions)) {
      console.log(`\n${productName}:`);
      
      for (const [componentName, matches] of Object.entries(suggestions)) {
        if (matches.length > 0) {
          console.log(`  ${componentName}: ${matches.length} matches found (best: ID ${matches[0].id})`);
        } else {
          console.log(`  ${componentName}: ❌ NO MATCHES - manual mapping required`);
        }
      }
    }
    
    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('🔧 NEXT STEPS');
    console.log('='.repeat(80));
    console.log('\n1. Review the suggested matches above');
    console.log('2. For each product, create a component mapping object:');
    console.log('   Example:');
    console.log('   const STARTER_BUILD_B_MAPPING = {');
    console.log('     "CPU": 35,        // Best match ID');
    console.log('     "Motherboard": 110,');
    console.log('     "RAM": 210,');
    console.log('     // ... etc');
    console.log('   };');
    console.log('\n3. Use generateUpdateScript() to apply mappings:');
    console.log('   await generateUpdateScript(12011, STARTER_BUILD_B_MAPPING);');
    console.log('\n4. Verify updates with API:');
    console.log('   curl http://localhost:5000/api/kiosk/prebuilt?category=Starter');
    console.log('\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
  }
}

// Allow running specific product analysis
if (require.main === module) {
  const productId = process.argv[2];
  const productName = process.argv[3];
  
  if (productId && productName) {
    analyzePreBuiltProduct(parseInt(productId), productName)
      .then(() => pool.end())
      .catch(error => {
        console.error('Error:', error);
        pool.end();
      });
  } else {
    main();
  }
}

module.exports = { 
  analyzePreBuiltProduct, 
  findMatchingPart, 
  generateUpdateScript 
};
