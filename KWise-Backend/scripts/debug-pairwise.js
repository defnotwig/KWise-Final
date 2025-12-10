/**
 * Debug Pairwise Check
 */

const advancedCompatibilityService = require('../services/advancedCompatibilityService');

const balancedBuild = {
    cpu: {
        id: 1,
        name: 'Intel Core i5-12400F',
        category: 'CPU',
        specifications: {
            socket: 'LGA1700',
            tdp: 65,
            performance_tier: 'mid-tier',
            max_memory_speed: 3200,
            memory_type: 'DDR4'
        }
    },
    motherboard: {
        id: 2,
        name: 'ASUS Prime B660M-A',
        category: 'Motherboard',
        specifications: {
            socket: 'LGA1700',
            chipset: 'B660',
            form_factor: 'Micro-ATX',
            supported_form_factors: ['Micro-ATX', 'ATX']
        }
    },
    case: {
        id: 5,
        name: 'NZXT H510 Flow',
        category: 'Case',
        specifications: {
            max_gpu_length: 381,
            max_cooler_height: 165,
            max_psu_length: 180,
            form_factor: 'ATX',
            supported_form_factors: ['ATX', 'Micro-ATX', 'Mini-ITX']
        }
    },
    ram: {
        id: 7,
        name: 'Corsair Vengeance DDR4 16GB (2x8GB) 3200MHz',
        category: 'RAM',
        specifications: {
            type: 'DDR4',
            memory_type: 'DDR4',
            speed: 3200,
            height: 35
        }
    }
};

async function debugPairwise() {
    const result = await advancedCompatibilityService.analyzePairwiseCompatibility(balancedBuild);
    
    console.log('Pairwise Result:', JSON.stringify(result, null, 2));
}

debugPairwise().catch(console.error);
