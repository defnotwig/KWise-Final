require('dotenv').config();

// Frontend auto-population simulation based on StockDetail.js logic
function simulateAutopopulationExtraction(apiResponse, fieldDefs) {
    console.log('🔄 Simulating frontend auto-population extraction...\n');
    
    let specifications = {};
    
    if (apiResponse.specifications && typeof apiResponse.specifications === 'object') {
        // Extract from nested specifications object (current API structure)
        const specsObj = apiResponse.specifications;
        const baseFields = ['id', 'name', 'category', 'brand', 'price', 'stock', 'image_url', 'created_at', 'description', 'updated_at'];
        
        Object.keys(specsObj).forEach(key => {
            if (!baseFields.includes(key) && specsObj[key] !== null && specsObj[key] !== undefined) {
                specifications[key] = specsObj[key];
                console.log(`📝 Extracted spec: ${key} = '${specsObj[key]}' (${typeof specsObj[key]})`);
            }
        });
    }
    
    console.log('\n🔧 Form field population simulation:');
    
    fieldDefs.forEach(field => {
        const dbValue = specifications[field.name];
        
        if (dbValue !== undefined && dbValue !== null) {
            if (field.type === 'number') {
                const numValue = Number(dbValue);
                if (isNaN(numValue) || (typeof dbValue === 'string' && !/^\d*\.?\d*$/.test(dbValue.trim()))) {
                    console.log(`❌ FORM FIELD ISSUE: Field '${field.name}' (type=${field.type}) rejects value '${dbValue}' (${typeof dbValue})`);
                } else {
                    console.log(`✅ Field '${field.name}' would show: '${dbValue}'`);
                }
            } else if (field.type === 'checkbox') {
                console.log(`✅ Field '${field.name}' would show: ${dbValue ? 'checked' : 'unchecked'}`);
            } else {
                console.log(`✅ Field '${field.name}' would show: '${dbValue}'`);
            }
        } else {
            console.log(`⚪ Field '${field.name}' would show: empty (no database value)`);
        }
    });
    
    return specifications;
}

// Test data from API responses
const testData = {
    'RAM': {
        item: {
            id: 2292,
            name: '16GB ADATA DDR4 3200 LAPTOP MEMORY',
            category: 'RAM',
            specifications: {
                id: 222,
                name: '16GB ADATA DDR4 3200 LAPTOP MEMORY',
                memory_type: 'DDR4',
                configuration: '1x16GB',
                speed: 3200,
                voltage: '1.20',
                price: '2395.00',
                created_at: '2025-09-13T20:36:54.663Z',
                updated_at: '2025-09-13T20:36:54.663Z',
                cas_latency: 'CL16',
                total_capacity: '16GB'
            }
        },
        fields: [
            { name: 'memory_type', label: 'Memory Type', type: 'text', required: true },
            { name: 'configuration', label: 'Configuration', type: 'text', required: false },
            { name: 'speed', label: 'Speed (MHz)', type: 'number', required: true },
            { name: 'voltage', label: 'Voltage (V)', type: 'number', step: 0.01, required: false },
            { name: 'cas_latency', label: 'CAS Latency', type: 'text', required: false },
            { name: 'total_capacity', label: 'Total Capacity (GB)', type: 'text', required: true }
        ]
    },
    'CPU': {
        item: {
            id: 105,
            name: 'AMD RYZEN 3 3200G',
            category: 'CPU',
            specifications: {
                id: 35,
                name: 'AMD RYZEN 3 3200G',
                launched: '2023-12-31T16:00:00.000Z',
                socket: 'AM4',
                series: 'Ryzen 3',
                base_clock: '3.60',
                turbo_clock: '3.90',
                cores: 4,
                threads: 4,
                integrated_gpu: true,
                max_ram: 64,
                lithography: 14,
                tdp: 65
            }
        },
        fields: [
            { name: 'socket', label: 'Socket', type: 'text', required: true },
            { name: 'series', label: 'Series', type: 'text', required: false },
            { name: 'base_clock', label: 'Base Clock (GHz)', type: 'number', step: 0.1, required: false },
            { name: 'turbo_clock', label: 'Turbo Clock (GHz)', type: 'number', step: 0.1, required: false },
            { name: 'cores', label: 'Cores', type: 'number', required: true },
            { name: 'threads', label: 'Threads', type: 'number', required: true },
            { name: 'integrated_gpu', label: 'Integrated GPU', type: 'checkbox', required: false },
            { name: 'lithography', label: 'Lithography (nm)', type: 'number', required: false },
            { name: 'tdp', label: 'TDP (Watts)', type: 'number', required: false }
        ]
    },
    'GPU': {
        item: {
            id: 4494,
            name: '12GB ARC B580 ASROCK CHALLENGER *(DUALFAN)',
            category: 'GPU',
            specifications: {
                id: 424,
                name: '12GB ARC B580 ASROCK CHALLENGER *(DUALFAN)',
                launched: '2023-07-10T16:00:00.000Z',
                memory_type: 'GDDR6',
                memory_capacity: 12,
                core_clock: '2310.00',
                boost_clock: '2535.00',
                effective_clock: '19000.00',
                interface: 'PCIe 4.0',
                frame_sync: 'FreeSync',
                length: 285,
                tdp: 160,
                pcie_8pin: 1
            }
        },
        fields: [
            { name: 'memory_type', label: 'Memory Type', type: 'text', required: false },
            { name: 'memory_capacity', label: 'Memory (GB)', type: 'number', required: true },
            { name: 'core_clock', label: 'Core Clock (MHz)', type: 'number', required: false },
            { name: 'boost_clock', label: 'Boost Clock (MHz)', type: 'number', required: false },
            { name: 'interface', label: 'Interface', type: 'text', required: false },
            { name: 'length', label: 'Length (mm)', type: 'number', required: false },
            { name: 'tdp', label: 'TDP (Watts)', type: 'number', required: false },
            { name: 'pcie_8pin', label: '8-pin PCIe Connectors', type: 'number', required: false }
        ]
    }
};

console.log('=== FRONTEND AUTO-POPULATION SIMULATION ===\n');

Object.entries(testData).forEach(([category, data]) => {
    console.log(`🔍 Testing ${category} Category:`);
    console.log('=' + '='.repeat(50));
    simulateAutopopulationExtraction(data.item, data.fields);
    console.log('\n' + '='.repeat(60) + '\n');
});

console.log('=== SIMULATION COMPLETE ===');