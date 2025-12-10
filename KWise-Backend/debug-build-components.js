/**
 * Debug script to test the exact query being used in getBuildComponents
 */

const { query } = require('./config/db');

async function debugBuildComponentsQuery() {
    try {
        console.log('🔍 Testing the exact query from getBuildComponents...');
        
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
        
        console.log('📊 Total rows returned:', result.rows.length);
        
        // Group by category to see what we get
        const byCategory = {};
        result.rows.forEach(row => {
            const category = row.category.toLowerCase();
            if (!byCategory[category]) {
                byCategory[category] = [];
            }
            byCategory[category].push(row);
        });
        
        console.log('\n📦 Products by category:');
        Object.keys(byCategory).forEach(category => {
            console.log(`   - ${category}: ${byCategory[category].length} products`);
        });
        
        console.log('\n🖥️  CPU details:');
        if (byCategory.cpu) {
            byCategory.cpu.forEach((cpu, index) => {
                console.log(`   ${index + 1}. ${cpu.name} - ${cpu.brand} - ₱${cpu.price}`);
            });
        }
        
        console.log('\n🔍 Looking for any potential issues...');
        
        // Check if all categories are lowercase
        const categories = [...new Set(result.rows.map(row => row.category))];
        console.log('📂 Raw categories found:', categories);
        
        // Check for case sensitivity issues
        const cpuRows = result.rows.filter(row => row.category.toLowerCase() === 'cpu');
        console.log(`\n🎯 CPU rows found: ${cpuRows.length}`);
        
        const cpuRowsDirect = result.rows.filter(row => row.category === 'CPU');
        console.log(`🎯 CPU rows (exact case): ${cpuRowsDirect.length}`);
        
    } catch (error) {
        console.error('❌ Debug query failed:', error);
    }
}

debugBuildComponentsQuery();