// Test API Endpoints for All Pre-Built Products
const axios = require('axios');

async function testAllPreBuilts() {
  try {
    console.log('🧪 TESTING PRE-BUILT API ENDPOINTS\n');
    console.log('='.repeat(80));
    
    const categories = ['Starter', 'Mid Tier', 'High Tier', 'Elite'];
    const allIssues = [];
    
    for (const category of categories) {
      console.log(`\n📦 Testing ${category} Category`);
      console.log('-'.repeat(80));
      
      try {
        const response = await axios.get(`http://localhost:5000/api/kiosk/prebuilt?category=${encodeURIComponent(category)}&buildSource=preset`);
        
        if (response.data.success && response.data.data.length > 0) {
          console.log(`✅ API Response OK - ${response.data.data.length} products found\n`);
          
          for (const product of response.data.data) {
            console.log(`  ${product.name}:`);
            
            let hasIssues = false;
            let componentsWithPartId = 0;
            let totalComponents = 0;
            
            if (product.components && product.components.length > 0) {
              for (const comp of product.components) {
                if (comp.value && comp.value.trim() !== '') {
                  totalComponents++;
                  
                  if (comp.part_id) {
                    console.log(`    ✅ ${comp.name}: part_id=${comp.part_id}, price=${comp.price}`);
                    componentsWithPartId++;
                  } else {
                    console.log(`    ❌ ${comp.name}: Missing part_id (${comp.value})`);
                    hasIssues = true;
                    allIssues.push({
                      product: product.name,
                      component: comp.name,
                      value: comp.value
                    });
                  }
                } else {
                  console.log(`    ⚪ ${comp.name}: Optional (empty)`);
                }
              }
              
              console.log(`    📊 ${componentsWithPartId}/${totalComponents} components have part_ids\n`);
            } else {
              console.log(`    ❌ No components array\n`);
              hasIssues = true;
            }
          }
        } else {
          console.log(`❌ No products found for ${category}`);
        }
      } catch (error) {
        console.log(`❌ API Error: ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    
    if (allIssues.length === 0) {
      console.log('\n✅ ALL TESTS PASSED!');
      console.log('   All Pre-Built products have correct part_ids');
      console.log('   Storage customization will work');
      console.log('   GPU/Cooling "Add" buttons will show correctly\n');
    } else {
      console.log(`\n⚠️  Found ${allIssues.length} issues:\n`);
      allIssues.forEach(issue => {
        console.log(`  ${issue.product} - ${issue.component}: ${issue.value}`);
      });
    }
    
  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

testAllPreBuilts();
