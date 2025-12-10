const { Pool } = require('pg');
require('dotenv').config();

// Database configuration - matching project settings
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'humbleludwig13',
    port: process.env.DB_PORT || 5432,
});

/**
 * Insert all category-specific data into pc_parts table
 * This script extracts data from the 14 category tables and inserts it into pc_parts
 * with proper category mapping and brand extraction
 */

// Category table mappings
const CATEGORY_MAPPINGS = {
    'cpu': { category: 'CPU', brandExtractor: (name) => name.includes('AMD') ? 'AMD' : name.includes('Intel') ? 'Intel' : 'Unknown' },
    'motherboard': { category: 'Motherboard', brandExtractor: (name) => {
        if (name.includes('ASUS')) return 'ASUS';
        if (name.includes('MSI')) return 'MSI';
        if (name.includes('GIGABYTE')) return 'GIGABYTE';
        if (name.includes('ASRock')) return 'ASRock';
        return 'Unknown';
    }},
    'ram': { category: 'RAM', brandExtractor: (name) => {
        if (name.includes('Corsair')) return 'Corsair';
        if (name.includes('G.Skill')) return 'G.Skill';
        if (name.includes('Kingston')) return 'Kingston';
        if (name.includes('Crucial')) return 'Crucial';
        return 'Unknown';
    }},
    'storage': { category: 'Storage', brandExtractor: (name) => {
        if (name.includes('Samsung')) return 'Samsung';
        if (name.includes('Western Digital') || name.includes('WD')) return 'Western Digital';
        if (name.includes('Seagate')) return 'Seagate';
        if (name.includes('Crucial')) return 'Crucial';
        if (name.includes('Kingston')) return 'Kingston';
        return 'Unknown';
    }},
    'gpu': { category: 'GPU', brandExtractor: (name) => {
        if (name.includes('NVIDIA') || name.includes('GeForce') || name.includes('RTX') || name.includes('GTX')) return 'NVIDIA';
        if (name.includes('AMD') || name.includes('Radeon') || name.includes('RX')) return 'AMD';
        return 'Unknown';
    }},
    'psu': { category: 'PSU', brandExtractor: (name) => {
        if (name.includes('Corsair')) return 'Corsair';
        if (name.includes('EVGA')) return 'EVGA';
        if (name.includes('Seasonic')) return 'Seasonic';
        if (name.includes('Thermaltake')) return 'Thermaltake';
        return 'Unknown';
    }},
    'pc_case': { category: 'Case', brandExtractor: (name) => {
        if (name.includes('Corsair')) return 'Corsair';
        if (name.includes('NZXT')) return 'NZXT';
        if (name.includes('Fractal Design')) return 'Fractal Design';
        if (name.includes('Cooler Master')) return 'Cooler Master';
        return 'Unknown';
    }},
    'cooling': { category: 'Cooling', brandExtractor: (name) => {
        if (name.includes('Noctua')) return 'Noctua';
        if (name.includes('Corsair')) return 'Corsair';
        if (name.includes('Cooler Master')) return 'Cooler Master';
        if (name.includes('be quiet!')) return 'be quiet!';
        return 'Unknown';
    }},
    'monitors': { category: 'Monitor', brandExtractor: (name) => {
        if (name.includes('ASUS')) return 'ASUS';
        if (name.includes('Dell')) return 'Dell';
        if (name.includes('LG')) return 'LG';
        if (name.includes('Samsung')) return 'Samsung';
        if (name.includes('Acer')) return 'Acer';
        return 'Unknown';
    }},
    'headphones': { category: 'Headphones', brandExtractor: (name) => {
        if (name.includes('SteelSeries')) return 'SteelSeries';
        if (name.includes('Logitech')) return 'Logitech';
        if (name.includes('HyperX')) return 'HyperX';
        if (name.includes('Corsair')) return 'Corsair';
        if (name.includes('Audio-Technica')) return 'Audio-Technica';
        return 'Unknown';
    }},
    'keyboard': { category: 'Keyboard', brandExtractor: (name) => {
        if (name.includes('Corsair')) return 'Corsair';
        if (name.includes('Logitech')) return 'Logitech';
        if (name.includes('Razer')) return 'Razer';
        if (name.includes('SteelSeries')) return 'SteelSeries';
        return 'Unknown';
    }},
    'mouse': { category: 'Mouse', brandExtractor: (name) => {
        if (name.includes('Logitech')) return 'Logitech';
        if (name.includes('Razer')) return 'Razer';
        if (name.includes('SteelSeries')) return 'SteelSeries';
        if (name.includes('Corsair')) return 'Corsair';
        return 'Unknown';
    }},
    'speakers': { category: 'Speakers', brandExtractor: (name) => {
        if (name.includes('Logitech')) return 'Logitech';
        if (name.includes('Creative')) return 'Creative';
        if (name.includes('Razer')) return 'Razer';
        return 'Unknown';
    }},
    'webcams': { category: 'Webcam', brandExtractor: (name) => {
        if (name.includes('Logitech')) return 'Logitech';
        if (name.includes('Razer')) return 'Razer';
        if (name.includes('Microsoft')) return 'Microsoft';
        return 'Unknown';
    }}
};

// Generate random stock between 5 and 25
function generateRandomStock() {
    return Math.floor(Math.random() * 21) + 5; // 5-25
}

// Get default image URL based on category
function getDefaultImageURL(category) {
    const imageMap = {
        'CPU': '/assets/parts/cpu-default.jpg',
        'GPU': '/assets/parts/gpu-default.jpg',
        'Motherboard': '/assets/parts/motherboard-default.jpg',
        'RAM': '/assets/parts/ram-default.jpg',
        'Storage': '/assets/parts/storage-default.jpg',
        'PSU': '/assets/parts/psu-default.jpg',
        'Case': '/assets/parts/case-default.jpg',
        'Cooling': '/assets/parts/cooling-default.jpg',
        'Monitor': '/assets/parts/monitor-default.jpg',
        'Headphones': '/assets/parts/headphones-default.jpg',
        'Keyboard': '/assets/parts/keyboard-default.jpg',
        'Mouse': '/assets/parts/mouse-default.jpg',
        'Speakers': '/assets/parts/speakers-default.jpg',
        'Webcam': '/assets/parts/webcam-default.jpg'
    };
    return imageMap[category] || '/assets/parts/default.jpg';
}

async function insertCategoryDataIntoPCParts() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting integration of category data into pc_parts table...');
        
        // Get the current maximum ID in pc_parts to avoid conflicts
        const maxIdResult = await client.query('SELECT COALESCE(MAX(id), 0) as max_id FROM pc_parts');
        let currentMaxId = maxIdResult.rows[0].max_id;
        console.log(`📊 Current max ID in pc_parts: ${currentMaxId}`);
        
        let totalInserted = 0;
        
        // Process each category table
        for (const [tableName, config] of Object.entries(CATEGORY_MAPPINGS)) {
            try {
                console.log(`\n📦 Processing ${tableName} table...`);
                
                // Get all data from the category table
                const categoryData = await client.query(`SELECT * FROM ${tableName} ORDER BY id`);
                console.log(`   Found ${categoryData.rows.length} records in ${tableName}`);
                
                if (categoryData.rows.length === 0) {
                    console.log(`   ⚠️  No data found in ${tableName}, skipping...`);
                    continue;
                }
                
                // Prepare batch insert for pc_parts
                const insertValues = [];
                const insertParams = [];
                let paramIndex = 1;
                
                for (const row of categoryData.rows) {
                    const brand = config.brandExtractor(row.name);
                    const stock = generateRandomStock();
                    const imageUrl = getDefaultImageURL(config.category);
                    
                    // Use original ID + offset to avoid conflicts
                    const newId = currentMaxId + row.id;
                    
                    insertValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
                    insertParams.push(newId, row.name, config.category, brand, parseFloat(row.price || 0), stock, imageUrl);
                }
                
                if (insertValues.length > 0) {
                    const insertQuery = `
                        INSERT INTO pc_parts (id, name, category, brand, price, stock, image_url)
                        VALUES ${insertValues.join(', ')}
                        ON CONFLICT (id) DO NOTHING
                    `;
                    
                    const result = await client.query(insertQuery, insertParams);
                    const insertedCount = insertValues.length;
                    totalInserted += insertedCount;
                    
                    console.log(`   ✅ Inserted ${insertedCount} records from ${tableName} into pc_parts`);
                    
                    // Update the offset for next category
                    currentMaxId += 1000; // Large offset to prevent ID conflicts between categories
                }
                
            } catch (error) {
                console.error(`   ❌ Error processing ${tableName}:`, error.message);
                continue;
            }
        }
        
        // Update the sequence to ensure new records get proper IDs
        const newSequenceValue = currentMaxId + 1;
        await client.query(`SELECT setval('pc_parts_id_seq', $1, false)`, [newSequenceValue]);
        console.log(`\n🔢 Updated pc_parts_id_seq to ${newSequenceValue}`);
        
        // Get final count
        const finalCountResult = await client.query('SELECT COUNT(*) as total FROM pc_parts');
        const finalCount = finalCountResult.rows[0].total;
        
        console.log(`\n🎉 Integration Complete!`);
        console.log(`   📊 Total records inserted: ${totalInserted}`);
        console.log(`   📊 Total records in pc_parts: ${finalCount}`);
        console.log(`   📊 All category data is now available in the stock system!`);
        
        // Show category breakdown
        console.log(`\n📋 Category Breakdown:`);
        const categoryBreakdown = await client.query(`
            SELECT category, COUNT(*) as count 
            FROM pc_parts 
            GROUP BY category 
            ORDER BY category
        `);
        
        for (const row of categoryBreakdown.rows) {
            console.log(`   ${row.category}: ${row.count} items`);
        }
        
    } catch (error) {
        console.error('❌ Error during integration:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Main execution
async function main() {
    try {
        await insertCategoryDataIntoPCParts();
        console.log('\n✅ Successfully integrated all category data into pc_parts table!');
        console.log('🔗 All data is now accessible through the stock API endpoints');
        process.exit(0);
    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { insertCategoryDataIntoPCParts };