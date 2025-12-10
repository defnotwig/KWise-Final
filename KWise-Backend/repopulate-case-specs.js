const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function repopulateCaseSpecifications() {
    try {
        console.log('🔄 RE-POPULATING CASE SPECIFICATIONS\n');

        // Get all Case items from pc_parts
        const caseItems = await pool.query(`
            SELECT id, name, specifications 
            FROM pc_parts 
            WHERE category = 'Case'
        `);

        console.log(`Found ${caseItems.rows.length} Case items to update`);

        // Get corresponding data from pc_case table
        const caseData = await pool.query(`
            SELECT * FROM pc_case ORDER BY id
        `);

        console.log(`Found ${caseData.rows.length} items in pc_case table`);

        let updatedCount = 0;

        for (const item of caseItems.rows) {
            // Try to find matching case data
            const matchingCase = caseData.rows.find(c => {
                const itemName = item.name.toLowerCase().trim();
                const caseName = c.name.toLowerCase().trim();
                
                // Direct match
                if (itemName === caseName) return true;
                
                // Partial match (remove common words)
                const itemWords = itemName.replace(/\b(case|pc|computer|gaming|mid|tower)\b/g, '').trim();
                const caseWords = caseName.replace(/\b(case|pc|computer|gaming|mid|tower)\b/g, '').trim();
                
                return itemWords && caseWords && (
                    itemWords.includes(caseWords) || 
                    caseWords.includes(itemWords) ||
                    itemName.includes(caseWords) ||
                    caseName.includes(itemWords)
                );
            });

            if (matchingCase) {
                // Map the pc_case fields to our new specification schema
                const newSpecs = {
                    category: matchingCase.category || 'Mid Tower',
                    color: matchingCase.color || 'Black',
                    fans_included: matchingCase.fans_included || 0,
                    case_category: matchingCase.case_category || 'Gaming',
                    max_gpu_length: matchingCase.max_gpu_length || '300mm',
                    max_cpu_cooler_height: matchingCase.max_cpu_cooler_height || '160mm',
                    tempered_glass: Boolean(matchingCase.tempered_glass)
                };

                // Update the pc_parts item
                await pool.query(`
                    UPDATE pc_parts 
                    SET specifications = $1 
                    WHERE id = $2
                `, [JSON.stringify(newSpecs), item.id]);

                console.log(`✅ Updated: ${item.name} (${Object.keys(newSpecs).length} specs)`);
                updatedCount++;
            } else {
                console.log(`⚠️  No match found for: ${item.name}`);
            }
        }

        await pool.end();
        console.log(`\n🎯 Case specification repopulation complete!`);
        console.log(`✅ Updated: ${updatedCount} items`);
        console.log(`⚠️  Skipped: ${caseItems.rows.length - updatedCount} items`);
        
    } catch (error) {
        console.error('❌ Error repopulating Case specifications:', error);
        await pool.end();
    }
}

repopulateCaseSpecifications();