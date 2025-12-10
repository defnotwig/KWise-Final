const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

const COMPONENT_ORDER = ['CPU', 'Motherboard', 'GPU', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling'];

async function migratePreBuiltComponents() {
    try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🔧 PRE-BUILT COMPONENT STRUCTURE MIGRATION');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Fetch all Pre-Built items
        const result = await pool.query(`
            SELECT id, name, specifications 
            FROM pc_parts 
            WHERE category = 'Pre-Built' 
            AND is_active = true
            ORDER BY id
        `);

        console.log(`Found ${result.rows.length} Pre-Built items to migrate\n`);

        let migratedCount = 0;
        let errorCount = 0;

        for (const item of result.rows) {
            try {
                console.log(`\n📦 Processing: ${item.name} (ID: ${item.id})`);
                
                const specs = item.specifications;
                const existingComponents = specs.components || [];
                const existingLinks = specs.componentLinks || [];

                console.log(`   Current: ${existingComponents.length} components`);

                // Create maps of existing data
                const componentMap = {};
                const linkMap = {};

                existingComponents.forEach(comp => {
                    componentMap[comp.name] = comp.value;
                });

                existingLinks.forEach(link => {
                    linkMap[link.componentType] = link;
                });

                // Build new complete structure with all 8 slots
                const newComponents = [];
                const newLinks = [];

                COMPONENT_ORDER.forEach(type => {
                    // Check if component exists in old data
                    const value = componentMap[type] || '';
                    const link = linkMap[type];

                    newComponents.push({
                        name: type,
                        value: value
                    });

                    newLinks.push({
                        componentType: type,
                        componentName: value,
                        linkedStockIds: link?.linkedStockIds || [],
                        hasMatch: link?.hasMatch || false
                    });
                });

                // Update specifications
                const updatedSpecs = {
                    ...specs,
                    components: newComponents,
                    componentLinks: newLinks,
                    totalComponents: newComponents.filter(c => c.value && c.value.trim()).length,
                    matchedComponents: newLinks.filter(l => l.hasMatch).length
                };

                console.log(`   Updated: ${newComponents.length} components (${updatedSpecs.totalComponents} filled)`);

                // Empty slots info
                const emptySlots = newComponents.filter(c => !c.value || !c.value.trim()).map(c => c.name);
                if (emptySlots.length > 0) {
                    console.log(`   Empty slots: ${emptySlots.join(', ')}`);
                }

                // Update database
                await pool.query(`
                    UPDATE pc_parts 
                    SET specifications = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                `, [JSON.stringify(updatedSpecs), item.id]);

                console.log(`   ✅ Migration successful`);
                migratedCount++;

            } catch (error) {
                console.error(`   ❌ Error migrating ${item.name}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('MIGRATION SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`Total items: ${result.rows.length}`);
        console.log(`Successfully migrated: ${migratedCount}`);
        console.log(`Errors: ${errorCount}`);

        if (migratedCount === result.rows.length) {
            console.log('\n🎉 ALL ITEMS MIGRATED SUCCESSFULLY!');
            console.log('✅ All Pre-Built items now have 8-component structure');
            console.log('✅ Empty slots preserved for future editing');
            console.log('✅ Frontend will filter empty components for display');
        } else {
            console.log(`\n⚠️ ${errorCount} items failed to migrate`);
        }

        console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migratePreBuiltComponents();
