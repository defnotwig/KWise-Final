const { query } = require('../config/db');

async function checkPreBuiltImages() {
    try {
        console.log('=== CHECKING PRE-BUILT IMAGE PATHS ===\n');
        
        // Check Pre-Built items and their image paths
        const result = await query(`
            SELECT id, name, image_url, category, specifications
            FROM pc_parts 
            WHERE category = 'Pre-Built' 
            ORDER BY id
        `);
        
        console.log(`Found ${result.rows.length} Pre-Built items:\n`);
        
        result.rows.forEach(item => {
            console.log(`ID: ${item.id}`);
            console.log(`Name: ${item.name}`);
            console.log(`Image URL: ${item.image_url}`);
            console.log(`Category: ${item.category}`);
            
            // Parse specifications to check components
            let specs = {};
            if (item.specifications) {
                specs = typeof item.specifications === 'string' 
                    ? JSON.parse(item.specifications)
                    : item.specifications;
            }
            
            console.log('Specifications:', JSON.stringify(specs, null, 2));
            console.log('Components:', specs.components || 'None');
            console.log('Component Links:', specs.componentLinks || 'None');
            console.log('---\n');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error checking Pre-Built images:', error);
        process.exit(1);
    }
}

checkPreBuiltImages();
