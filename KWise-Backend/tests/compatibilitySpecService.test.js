const { buildCanonicalSpecs } = require('../services/compatibilitySpecService');

describe('compatibilitySpecService', () => {
    test('canonicalizes case clearance aliases for admin-created products', () => {
        const result = buildCanonicalSpecs({
            id: 1,
            name: 'Airflow ATX Case',
            category: 'Case',
            specifications: {
                max_gpu_length_mm: '360mm',
                max_cooler_height_mm: '165mm',
                supported_form_factors: 'ATX, Micro ATX, Mini ITX'
            }
        });

        expect(result.specs.max_gpu_length_mm).toBe(360);
        expect(result.specs.max_cooler_height_mm).toBe(165);
        expect(result.specs.supported_form_factors).toContain('ATX');
        expect(result.missingSpecs).toHaveLength(0);
    });

    test('canonicalizes mixed motherboard key casing from admin forms', () => {
        const result = buildCanonicalSpecs({
            id: 2,
            name: 'B760 DDR5 Motherboard',
            category: 'Motherboard',
            specifications: {
                Socket: 'LGA1700',
                'M2 Slots': 2,
                'Ram Slots': 4,
                'SATA Ports': 4,
                'Memory Type': 'DDR5',
                'Form Factor': 'Micro ATX'
            }
        });

        expect(result.specs.socket).toBe('LGA1700');
        expect(result.specs.m2_slots).toBe(2);
        expect(result.specs.memory_slots).toBe(4);
        expect(result.specs.sata_ports).toBe(4);
        expect(result.specs.memory_type).toBe('DDR5');
        expect(result.specs.form_factor).toBe('Micro-ATX');
        expect(result.missingSpecs).toHaveLength(0);
    });

    test('reports missing critical compatibility specs without guessing', () => {
        const result = buildCanonicalSpecs({
            id: 3,
            name: 'Unknown Graphics Card',
            category: 'GPU',
            specifications: {
                power_connector_required: '1 x 8-pin'
            }
        });

        expect(result.specs.power_connectors).toMatchObject({ eightPin: 1 });
        expect(result.missingSpecs).toEqual(expect.arrayContaining(['length_mm', 'tdp_w']));
        expect(result.warnings).toHaveLength(2);
    });
});
