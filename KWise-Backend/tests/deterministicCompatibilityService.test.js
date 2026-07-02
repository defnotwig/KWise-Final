const { DeterministicCompatibilityService } = require('../services/deterministicCompatibilityService');

describe('DeterministicCompatibilityService', () => {
    let service;

    beforeEach(() => {
        service = new DeterministicCompatibilityService();
    });

    test('fails Intel CPU against AM5 motherboard', () => {
        const result = service.analyzePair(
            {
                id: 1,
                name: 'Intel Core i5-13400F',
                category: 'CPU',
                specifications: { socket: 'LGA1700', tdp: '65W' }
            },
            {
                id: 2,
                name: 'B650 AM5 Motherboard',
                category: 'Motherboard',
                specifications: { socket: 'AM5', chipset: 'B650', memory_type: 'DDR5' }
            }
        );

        expect(result.compatible).toBe(false);
        expect(result.score).toBe(0);
        expect(result.verdict).toBe('fail');
        expect(result.problems.some((problem) => problem.rule === 'socket_match')).toBe(true);
    });

    test('fails DDR4 memory against DDR5 motherboard', () => {
        const result = service.analyzePair(
            {
                id: 3,
                name: '16GB DDR4-3200 Memory',
                category: 'RAM',
                specifications: { type: 'DDR4', capacity: '16GB', speed: '3200MHz' }
            },
            {
                id: 4,
                name: 'B760 DDR5 Motherboard',
                category: 'Motherboard',
                specifications: { socket: 'LGA1700', chipset: 'B760', memory_type: 'DDR5', memory_slots: 4 }
            }
        );

        expect(result.compatible).toBe(false);
        expect(result.score).toBe(0);
        expect(result.problems.some((problem) => problem.rule === 'ram_type')).toBe(true);
    });

    test('fails 120mm AIO for high-TDP CPU', () => {
        const result = service.analyzePair(
            {
                id: 5,
                name: 'Intel Core i7-13700K',
                category: 'CPU',
                specifications: { socket: 'LGA1700', tdp: '253W' }
            },
            {
                id: 6,
                name: '120mm AIO Liquid Cooler LGA1700',
                category: 'Cooling',
                specifications: { socket_support: ['LGA1700'], radiator: '120mm' }
            }
        );

        expect(result.compatible).toBe(false);
        expect(result.score).toBe(0);
        expect(result.problems.some((problem) => problem.rule === 'cooler_tdp')).toBe(true);
    });

    test('fails low-watt PSU with insufficient GPU cables', () => {
        const result = service.analyzePair(
            {
                id: 7,
                name: 'RTX 4080 Graphics Card',
                category: 'GPU',
                specifications: { tdp: '320W', power_connectors: '2 x 8-pin', length: '320mm' }
            },
            {
                id: 8,
                name: '450W Bronze PSU',
                category: 'PSU',
                specifications: { wattage: '450W', pcie_connectors: '1 x 8-pin' }
            }
        );

        expect(result.compatible).toBe(false);
        expect(result.score).toBe(0);
        expect(result.problems.some((problem) => problem.rule === 'gpu_power_connectors')).toBe(true);
    });

    test('penalizes H610 motherboard with high-power i7-13700K', () => {
        const result = service.analyzePair(
            {
                id: 9,
                name: 'Intel Core i7-13700K',
                category: 'CPU',
                specifications: { socket: 'LGA1700', tdp: '253W' }
            },
            {
                id: 10,
                name: 'H610 LGA1700 Motherboard',
                category: 'Motherboard',
                specifications: { socket: 'LGA1700', chipset: 'H610', memory_type: 'DDR4' }
            }
        );

        expect(result.compatible).toBe(true);
        expect(result.verdict).toBe('warning');
        expect(result.score).toBeLessThanOrEqual(75);
        expect(result.warnings.some((warning) => warning.rule === 'chipset_vrm_headroom')).toBe(true);
    });

    test('missing required specs produce manual checks instead of guesses', () => {
        const result = service.analyzePair(
            { id: 11, name: 'Unknown CPU', category: 'CPU', specifications: {} },
            { id: 12, name: 'Unknown Motherboard', category: 'Motherboard', specifications: {} }
        );

        expect(result.compatible).toBe(true);
        expect(result.verdict).toBe('manual_check');
        expect(result.status).toBe('manual_check');
        expect(result.aiEnabled).toBe(false);
        expect(result.engine).toBe('deterministic');
        expect(result.manualChecks.some((check) => check.rule === 'socket_match')).toBe(true);
        expect(result.missingSpecs.some((check) => check.rule === 'socket_match')).toBe(true);
    });

    test('fails RAM kit when stick count exceeds motherboard slots', () => {
        const result = service.analyzePair(
            {
                id: 13,
                name: '64GB DDR5 Memory Kit',
                category: 'RAM',
                specifications: { type: 'DDR5', capacity: '4x16GB', speed: '5600MHz' }
            },
            {
                id: 14,
                name: 'Mini ITX DDR5 Motherboard',
                category: 'Motherboard',
                specifications: { socket: 'AM5', memory_type: 'DDR5', memory_slots: 2, max_memory: '96GB' }
            }
        );

        expect(result.compatible).toBe(false);
        expect(result.score).toBe(0);
        expect(result.problems.some((problem) => problem.rule === 'ram_stick_count')).toBe(true);
    });

    test('fails RAM capacity above motherboard maximum', () => {
        const result = service.analyzePair(
            {
                id: 15,
                name: '128GB DDR4 Memory Kit',
                category: 'RAM',
                specifications: { type: 'DDR4', capacity: '4x32GB' }
            },
            {
                id: 16,
                name: 'DDR4 Motherboard',
                category: 'Motherboard',
                specifications: { socket: 'LGA1700', memory_type: 'DDR4', memory_slots: 4, max_memory: '64GB' }
            }
        );

        expect(result.compatible).toBe(false);
        expect(result.problems.some((problem) => problem.rule === 'ram_capacity')).toBe(true);
    });

    test('warns when tall RAM exceeds air cooler clearance', () => {
        const result = service.analyzePair(
            {
                id: 17,
                name: 'Tall RGB DDR5 Memory',
                category: 'RAM',
                specifications: { type: 'DDR5', capacity: '2x16GB', ram_height: '48mm' }
            },
            {
                id: 18,
                name: 'Dual Tower Air Cooler LGA1700',
                category: 'Cooling',
                specifications: { socket_support: 'LGA1700 AM5', ram_clearance: '36mm', height: '155mm', tdp_rating: '220W' }
            }
        );

        expect(result.compatible).toBe(true);
        expect(result.verdict).toBe('warning');
        expect(result.warnings.some((warning) => warning.rule === 'ram_cooler_clearance')).toBe(true);
    });

    test('fails SATA drive when case has no matching drive bays', () => {
        const result = service.analyzePair(
            {
                id: 19,
                name: '2.5 SATA SSD',
                category: 'Storage',
                specifications: { interface: 'SATA', form_factor: '2.5' }
            },
            {
                id: 20,
                name: 'M.2 Only Compact Case',
                category: 'Case',
                specifications: { '2.5 bays': 0, '3.5 bays': 1, motherboard_support: 'Mini ITX' }
            }
        );

        expect(result.compatible).toBe(false);
        expect(result.problems.some((problem) => problem.rule === 'drive_bays')).toBe(true);
    });

    test('batch analysis keeps hard-incompatible candidates at score zero', () => {
        const results = service.analyzeBatch(
            [
                {
                    id: 21,
                    name: 'Intel Core i5-13400F',
                    category: 'CPU',
                    specifications: { socket: 'LGA1700', tdp: '65W' }
                }
            ],
            [
                {
                    id: 22,
                    name: 'B760 LGA1700 Motherboard',
                    category: 'Motherboard',
                    specifications: { socket: 'LGA1700', chipset: 'B760', memory_type: 'DDR5' }
                },
                {
                    id: 23,
                    name: 'B650 AM5 Motherboard',
                    category: 'Motherboard',
                    specifications: { socket: 'AM5', chipset: 'B650', memory_type: 'DDR5' }
                }
            ]
        );

        expect(results).toHaveLength(2);
        expect(results[0].id).toBe(22);
        expect(results[0].compatible).toBe(true);
        expect(results[1]).toMatchObject({
            id: 23,
            compatible: false,
            compatibility_score: 0,
            verdict: 'fail'
        });
    });

    test('fails thick GPU when case has too few expansion slots', () => {
        const result = service.analyzePair(
            {
                id: 24,
                name: 'Triple Slot RTX 4090',
                category: 'GPU',
                specifications: { length_mm: 330, slots_required: 4 }
            },
            {
                id: 25,
                name: 'Compact Case',
                category: 'Case',
                specifications: { max_gpu_length_mm: 360, expansion_slots: 3, supported_form_factors: 'Micro ATX Mini ITX' }
            }
        );

        expect(result.compatible).toBe(false);
        expect(result.problems.some((problem) => problem.rule === 'gpu_slot_width')).toBe(true);
    });

    test('fails PSU form factor when case lists incompatible PSU support', () => {
        const result = service.analyzePair(
            {
                id: 26,
                name: 'ATX 750W PSU',
                category: 'PSU',
                specifications: { wattage: '750W', form_factor: 'ATX', pcie_connectors: '4 x 8-pin' }
            },
            {
                id: 27,
                name: 'Small Form Factor Case',
                category: 'Case',
                specifications: { psu_support: 'SFX, SFX-L', supported_form_factors: 'Mini ITX' }
            }
        );

        expect(result.compatible).toBe(false);
        expect(result.problems.some((problem) => problem.rule === 'psu_form_factor')).toBe(true);
    });
});
