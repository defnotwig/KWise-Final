/**
 * Debug script to test WHERE the truncation is happening in getBuildComponents
 */

const { query } = require('./config/db');

async function debugBuildComponentsProcessing() {
    try {
        console.log('🔍 Step-by-step debugging of getBuildComponents processing...');
        
        // Step 1: Raw database query
        const result = await query(`
            SELECT 
                id, name, category, brand, price, stock,
                COALESCE(image_url, image_path) AS image_url,
                specifications, description,
                CASE WHEN stock > 0 THEN true ELSE false END as available
            FROM pc_parts 
            WHERE is_active = true 
            AND kiosk_visible = true
            ORDER BY category, price ASC
        `);
        
        console.log('📊 Step 1 - Raw query result rows:', result.rows.length);
        
        // Step 2: Filter only CPU rows
        const cpuRows = result.rows.filter(row => row.category.toLowerCase() === 'cpu');
        console.log('🖥️  Step 2 - CPU rows after filtering:', cpuRows.length);
        
        // Step 3: Group products by category (like in the actual function)
        const componentsByCategory = {};
        const brandsByCategory = {};

        result.rows.forEach(row => {
            const category = row.category.toLowerCase();

            if (!componentsByCategory[category]) {
                componentsByCategory[category] = [];
                brandsByCategory[category] = new Set();
            }

            const product = {
                id: row.id,
                name: row.name,
                brand: row.brand,
                price: parseFloat(row.price),
                stock: parseInt(row.stock),
                imageUrl: row.image_url,
                specifications: row.specifications,
                description: row.description,
                available: row.available
            };

            componentsByCategory[category].push(product);
            brandsByCategory[category].add(row.brand);
        });
        
        console.log('📦 Step 3 - CPU products after grouping:', componentsByCategory.cpu?.length || 0);
        
        // Step 4: Convert to final structure (like in the actual function)
        const buildComponents = {};
        Object.keys(componentsByCategory).forEach(category => {
            buildComponents[category] = {
                products: componentsByCategory[category],
                brands: Array.from(brandsByCategory[category]).sort()
            };
        });
        
        console.log('✅ Step 4 - Final CPU products:', buildComponents.cpu?.products?.length || 0);
        
        // Step 5: Simulate JSON.stringify (like when sending response)
        const jsonString = JSON.stringify({
            success: true,
            data: buildComponents,
            timestamp: new Date().toISOString()
        });
        
        // Parse it back to check if anything was lost
        const parsedResponse = JSON.parse(jsonString);
        console.log('🔄 Step 5 - JSON serialization CPU count:', parsedResponse.data.cpu?.products?.length || 0);
        
        // Step 6: Check if there's any length limit on the JSON response
        console.log('📏 JSON response size (bytes):', jsonString.length);
        console.log('📏 JSON response size (KB):', (jsonString.length / 1024).toFixed(2));
        
        // Log the actual CPU names to see which ones are missing
        if (buildComponents.cpu) {
            console.log('\n🎯 CPU Products in final result:');
            buildComponents.cpu.products.forEach((cpu, index) => {
                console.log(`   ${index + 1}. ${cpu.name} - ${cpu.brand} - ₱${cpu.price}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Debug processing failed:', error);
    }
}

debugBuildComponentsProcessing();