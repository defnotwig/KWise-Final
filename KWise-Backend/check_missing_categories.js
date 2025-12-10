require('dotenv').config();
const axios = require('axios');

async function checkMissingCategories() {
    try {
        console.log('=== CHECKING CATEGORIES WITH NO SPECIFICATIONS ===\n');
        
        const categoriesToCheck = ['Headphones', 'Speakers'];
        
        for (const category of categoriesToCheck) {
            console.log(`🔍 Checking ${category}:`);
            console.log('=' + '='.repeat(40));
            
            try {
                const response = await axios.get(`http://localhost:5000/api/stock?category=${category}&limit=2`);
                
                if (response.data.success && response.data.data.length > 0) {
                    console.log(`📋 Found ${response.data.data.length} items in ${category}`);
                    
                    const firstItem = response.data.data[0];
                    console.log(`📄 Testing item: ${firstItem.name} (ID: ${firstItem.id})`);
                    console.log(`🔧 List response has specs:`, !!firstItem.specifications);
                    
                    if (firstItem.specifications) {
                        console.log(`   Spec keys:`, Object.keys(firstItem.specifications));
                    }
                    
                    // Get individual item details
                    const detailResponse = await axios.get(`http://localhost:5000/api/stock/${firstItem.id}`);
                    console.log(`📄 Detail response has specs:`, !!detailResponse.data.data.specifications);
                    
                    if (detailResponse.data.data.specifications) {
                        console.log(`   Detail spec keys:`, Object.keys(detailResponse.data.data.specifications));
                        console.log(`   Sample specs:`, detailResponse.data.data.specifications);
                    } else {
                        console.log(`❌ No specifications found - this explains missing auto-population`);
                    }
                } else {
                    console.log(`⚠️ No items found in ${category}`);
                }
            } catch (error) {
                console.log(`❌ Error checking ${category}:`, error.message);
            }
            
            console.log('');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkMissingCategories();