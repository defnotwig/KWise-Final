const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function inspectSpecificationData() {
    try {
        console.log('🔍 INSPECTING SPECIFICATION DATA STRUCTURE\n');

        // Check Case item (1stPlayer MIKU 2)
        const caseResult = await pool.query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE name ILIKE '%1stPlayer MIKU 2%'
            LIMIT 1
        `);

        if (caseResult.rows.length > 0) {
            const item = caseResult.rows[0];
            console.log('📦 CASE ITEM ANALYSIS:');
            console.log('─'.repeat(40));
            console.log('Name:', item.name);
            console.log('Category:', item.category);
            console.log('Specifications type:', typeof item.specifications);
            console.log('Specifications value:');
            console.log(JSON.stringify(item.specifications, null, 2));
            console.log('');
        }

        // Check CPU item
        const cpuResult = await pool.query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE category = 'CPU'
            LIMIT 1
        `);

        if (cpuResult.rows.length > 0) {
            const item = cpuResult.rows[0];
            console.log('🖥️ CPU ITEM ANALYSIS:');
            console.log('─'.repeat(40));
            console.log('Name:', item.name);
            console.log('Category:', item.category);
            console.log('Specifications type:', typeof item.specifications);
            console.log('Specifications keys:', Object.keys(item.specifications || {}));
            console.log('Sample specifications:');
            if (item.specifications) {
                const sampleSpecs = Object.entries(item.specifications).slice(0, 5);
                sampleSpecs.forEach(([key, value]) => {
                    console.log(`  ${key}: ${value} (${typeof value})`);
                });
            }
            console.log('');
        }

        // Check how the API returns this data
        console.log('🌐 API DATA STRUCTURE TEST:');
        console.log('─'.repeat(40));
        
        // This simulates how the frontend would receive the data
        const apiSimulation = await pool.query(`
            SELECT id, name, category, brand, price, stock, description, specifications 
            FROM pc_parts 
            WHERE category = 'Case' 
            LIMIT 1
        `);

        if (apiSimulation.rows.length > 0) {
            const apiItem = apiSimulation.rows[0];
            console.log('API item structure:');
            console.log('- id:', typeof apiItem.id, apiItem.id);
            console.log('- name:', typeof apiItem.name, apiItem.name);
            console.log('- specifications:', typeof apiItem.specifications);
            console.log('- specifications is object:', typeof apiItem.specifications === 'object');
            console.log('- specifications JSON string:');
            console.log(JSON.stringify(apiItem.specifications));
        }

        await pool.end();
        console.log('\n🎯 Inspection complete!');
        
    } catch (error) {
        console.error('❌ Error during inspection:', error);
        await pool.end();
    }
}

inspectSpecificationData();