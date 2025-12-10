const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

// Expected fields by category from user requirements
const EXPECTED_FIELDS = {
    'Case': [
        'category', 'color', 'fans_included', 'case_category', 
        'max_gpu_length', 'max_cpu_cooler_height', 'tempered_glass'
    ],
    'Cooling': [
        'max_rpm', 'max_noise', 'height', 'water_cooled', 'fanless'
    ],
    'CPU': [
        'launched', 'socket', 'series', 'base_clock', 'turbo_clock', 
        'cores', 'threads', 'integrated_gpu', 'max_ram', 'lithography', 
        'tdp', 'max_supported_ram', 'multithreading_supported'
    ],
    'GPU': [
        'launched', 'memory_type', 'memory_capacity', 'core_clock', 
        'boost_clock', 'effective_clock', 'interface', 'frame_sync', 
        'length', 'tdp', 'pcie_8pin', 'ports_hdmi', 'fans'
    ],
    'Headphones': [
        'type', 'frequency', 'microphone', 'wireless', 'enclosure', 'color'
    ],
    'Keyboard': [
        'style', 'switch_type', 'backlit', 'tenkeyless', 
        'connection_type', 'color', 'polling_rate'
    ],
    'Monitor': [
        'screen_size', 'resolution', 'refresh_rate', 'response_time', 
        'panel_type', 'aspect_ratio', 'curved', 'vesa_mount'
    ],
    'Motherboard': [
        'socket', 'chipset', 'memory_type', 'max_ram', 'ram_slots', 
        'm2_slots', 'ethernet_ports', 'wireless_networking', 'integrated_gpu_support'
    ],
    'Mouse': [
        'tracking_method', 'connection_type', 'dpi', 'hand_orientation', 
        'color', 'programmable_buttons', 'polling_rate'
    ],
    'PSU': [
        'form_factor', 'efficiency_rating', 'wattage', 'length', 
        'modular', 'pcie_connectors', 'sata_connectors'
    ],
    'RAM': [
        'memory_type', 'configuration', 'speed', 'voltage', 
        'cas_latency', 'total_capacity'
    ],
    'Speakers': [
        'configuration', 'total_wattage', 'frequency_response', 'color'
    ],
    'Storage': [
        'capacity', 'storage_type', 'interface', 'nvme_support', 
        'cache', 'm2_type', 'read_speed', 'write_speed', 'form_factor'
    ],
    'Webcam': [
        'resolution', 'connection', 'focus_type', 'operating_system', 
        'fov_angle', 'frame_rate', 'microphone_builtin'
    ]
};

async function validateSpecificationSchemas() {
    try {
        console.log('🔍 SPECIFICATION SCHEMAS VALIDATION\n');

        for (const [category, expectedFields] of Object.entries(EXPECTED_FIELDS)) {
            console.log(`📊 ${category.toUpperCase()}`);
            console.log('─'.repeat(40));

            // Get current fields from database
            const currentFields = await pool.query(`
                SELECT field_name, field_type 
                FROM specification_schemas 
                WHERE category = $1 
                ORDER BY field_name
            `, [category]);

            const dbFields = currentFields.rows.map(r => r.field_name);
            
            console.log(`Expected: ${expectedFields.length} fields`);
            console.log(`Database: ${dbFields.length} fields`);

            // Check missing fields
            const missing = expectedFields.filter(field => !dbFields.includes(field));
            if (missing.length > 0) {
                console.log(`❌ Missing: ${missing.join(', ')}`);
            }

            // Check extra fields
            const extra = dbFields.filter(field => !expectedFields.includes(field));
            if (extra.length > 0) {
                console.log(`➕ Extra: ${extra.join(', ')}`);
            }

            if (missing.length === 0 && extra.length === 0) {
                console.log('✅ Perfect match!');
            }

            console.log('');
        }

        await pool.end();
        console.log('🎯 Schema validation complete!');
        
    } catch (error) {
        console.error('❌ Error during schema validation:', error);
        await pool.end();
    }
}

validateSpecificationSchemas();