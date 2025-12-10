const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

// Define what each category update case currently includes
const currentUpdateFields = {
    'pc_case': ['category', 'color', 'fans_included', 'case_category', 'max_gpu_length', 'max_cpu_cooler_height', 'motherboard_support', 'tempered_glass'],
    'cpu': ['socket', 'series', 'base_clock', 'turbo_clock', 'cores', 'threads', 'integrated_gpu', 'max_ram', 'lithography', 'tdp'],
    'gpu': ['memory_type', 'memory_capacity', 'core_clock', 'boost_clock', 'effective_clock', 'interface', 'frame_sync', 'length', 'tdp', 'pcie_8pin', 'ports_display', 'ports_hdmi', 'fans'],
    'ram': ['memory_type', 'configuration', 'speed', 'voltage', 'cas_latency', 'total_capacity'],
    'storage': ['capacity', 'storage_type', 'interface', 'form_factor', 'read_speed', 'write_speed', 'nvme_support', 'cache', 'm2_type'],
    'motherboard': ['socket', 'chipset', 'form_factor', 'ram_slots', 'max_ram'],
    'psu': ['wattage', 'efficiency', 'modular', 'certification'],
    'cooling': ['max_rpm', 'max_noise', 'height', 'water_cooled', 'fanless']
};

async function checkAllUpdateCases() {
    try {
        console.log('🔍 CHECKING ALL CATEGORY UPDATE CASES\n');

        for (const [tableName, updateFields] of Object.entries(currentUpdateFields)) {
            const categoryName = tableName === 'pc_case' ? 'Case' : 
                               tableName.charAt(0).toUpperCase() + tableName.slice(1);

            console.log(`📊 ${categoryName.toUpperCase()} (${tableName}):`);
            console.log('─'.repeat(40));

            try {
                // Get table columns
                const tableColumns = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [tableName]);

                // Get specification fields
                const specFields = await pool.query(`
                    SELECT field_name 
                    FROM specification_schemas 
                    WHERE category = $1 
                    ORDER BY field_name
                `, [categoryName]);

                if (specFields.rows.length === 0) {
                    console.log('  ⚠️  No specification schema found');
                    console.log('');
                    continue;
                }

                const dbColumns = tableColumns.rows.map(r => r.column_name);
                const specFieldNames = specFields.rows.map(r => r.field_name);

                // Check what's missing from update case
                const missingFromUpdate = specFieldNames.filter(field => 
                    !updateFields.includes(field) && 
                    !['id', 'name', 'created_at', 'updated_at', 'price'].includes(field)
                );

                // Check what's in update case but not in table
                const invalidUpdateFields = updateFields.filter(field => !dbColumns.includes(field));

                if (missingFromUpdate.length > 0) {
                    console.log('  ❌ Missing from UPDATE case:');
                    missingFromUpdate.forEach(field => console.log(`    • ${field}`));
                }

                if (invalidUpdateFields.length > 0) {
                    console.log('  ❌ Invalid fields in UPDATE case:');
                    invalidUpdateFields.forEach(field => console.log(`    • ${field}`));
                }

                if (missingFromUpdate.length === 0 && invalidUpdateFields.length === 0) {
                    console.log('  ✅ UPDATE case is complete and valid');
                }

                console.log('');
            } catch (error) {
                console.log(`  ❌ Error checking ${tableName}: ${error.message}\n`);
            }
        }

        await pool.end();
        console.log('🎯 Analysis complete!');
        
    } catch (error) {
        console.error('❌ Error during analysis:', error);
        await pool.end();
    }
}

checkAllUpdateCases();