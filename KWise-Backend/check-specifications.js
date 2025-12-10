/**
 * Check Specifications - Debug script to verify specifications in database
 */

const db = require('./config/db');

async function checkSpecifications() {
    try {
        console.log('🔍 Checking CPU specifications in database...');
        
        // Check CPU specifications
        const cpuResult = await db.query(`
            SELECT id, name, specifications, category
            FROM pc_parts 
            WHERE category = $1 AND is_active = true 
            ORDER BY name LIMIT 5
        `, ['CPU']);
        
        console.log('\n📋 CPU Specifications Sample:');
        cpuResult.rows.forEach(row => {
            console.log(`ID: ${row.id}`);
            console.log(`Name: ${row.name}`);
            console.log(`Category: ${row.category}`);
            console.log(`Specifications: ${row.specifications}`);
            console.log(`Type: ${typeof row.specifications}`);
            console.log('---');
        });

        // Check if specifications are JSON or string
        console.log('\n🔬 Analyzing specifications format...');
        const sampleSpecs = cpuResult.rows[0]?.specifications;
        if (sampleSpecs) {
            console.log('Raw specifications:', sampleSpecs);
            if (typeof sampleSpecs === 'string') {
                try {
                    const parsed = JSON.parse(sampleSpecs);
                    console.log('✅ Specifications are valid JSON:', parsed);
                } catch (e) {
                    console.log('⚠️ Specifications are plain text string');
                }
            } else if (typeof sampleSpecs === 'object') {
                console.log('✅ Specifications are already an object:', sampleSpecs);
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking specifications:', error);
        process.exit(1);
    }
}

checkSpecifications();