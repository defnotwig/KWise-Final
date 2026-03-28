-- =====================================================
-- MIGRATION 020: ADD MISSING COMPATIBILITY SPECIFICATIONS
-- =====================================================
-- This migration populates the product_specs table with ALL missing
-- specifications required for comprehensive compatibility validation
-- 
-- Missing specifications identified:
-- 1. Motherboard: PCIe_x16_slots, SATA_ports, M.2_slot_count, power_connector_pins, max_memory_per_slot_gb
-- 2. PSU: power_connectors_6pin, power_connectors_8pin, power_connectors_12vhpwr, form_factor
-- 3. GPU: length_mm, height_mm (slot count), power_connector_type, power_connector_count
-- 4. Case: max_gpu_length_mm, max_cpu_cooler_height_mm, motherboard_form_factors, psu_form_factors, drive_bays_35, drive_bays_25
-- 5. CPU Cooler: height_mm, cooler_type (air/aio), radiator_size_mm
-- 6. RAM: module_height_mm (for cooler clearance)
-- 7. Storage: form_factor, interface_type
-- =====================================================

-- =====================================================
-- SECTION 1: MOTHERBOARD SPECIFICATIONS
-- =====================================================

-- AORUS ELITE B550M AX (Socket AM4, B550 Chipset, DDR4, Micro-ATX)
INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'pcie_x16_slots',
    '2',
    2,
    'slots'
FROM pc_parts WHERE name = 'AORUS ELITE B550M AX' AND category = 'Motherboard'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'sata_ports',
    '4',
    4,
    'ports'
FROM pc_parts WHERE name = 'AORUS ELITE B550M AX' AND category = 'Motherboard'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'm2_slots',
    '2',
    2,
    'slots'
FROM pc_parts WHERE name = 'AORUS ELITE B550M AX' AND category = 'Motherboard'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'atx_power_connector',
    '24-pin',
    24,
    'pins'
FROM pc_parts WHERE name = 'AORUS ELITE B550M AX' AND category = 'Motherboard'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'cpu_power_connector',
    '8-pin',
    8,
    'pins'
FROM pc_parts WHERE name = 'AORUS ELITE B550M AX' AND category = 'Motherboard'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'max_memory_per_slot_gb',
    '32',
    32,
    'GB'
FROM pc_parts WHERE name = 'AORUS ELITE B550M AX' AND category = 'Motherboard'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'form_factor',
    'Micro-ATX',
    NULL,
    NULL
FROM pc_parts WHERE name = 'AORUS ELITE B550M AX' AND category = 'Motherboard'
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 2: GPU SPECIFICATIONS
-- =====================================================

-- 12GB ARC B580 ASROCK CHALLENGER *(DUALFAN) - Length: 285mm
INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'gpu_length_mm',
    '285',
    285,
    'mm'
FROM pc_parts WHERE name ILIKE '%ARC B580 ASROCK CHALLENGER%' AND category = 'GPU'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'length_mm',
    '285',
    285,
    'mm'
FROM pc_parts WHERE name ILIKE '%ARC B580 ASROCK CHALLENGER%' AND category = 'GPU'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'slot_height',
    '2',
    2,
    'slots'
FROM pc_parts WHERE name ILIKE '%ARC B580 ASROCK CHALLENGER%' AND category = 'GPU'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'power_connector_type',
    '8-pin',
    8,
    'pins'
FROM pc_parts WHERE name ILIKE '%ARC B580 ASROCK CHALLENGER%' AND category = 'GPU'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'power_connector_count',
    '1',
    1,
    'connectors'
FROM pc_parts WHERE name ILIKE '%ARC B580 ASROCK CHALLENGER%' AND category = 'GPU'
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 3: CASE SPECIFICATIONS (CRITICAL FIX)
-- =====================================================

-- POWERLOGIC SLIM - CRITICAL FIX: Max GPU length is 250mm NOT 260mm
-- This case is SLIM design and has narrow clearance
DELETE FROM product_specs 
WHERE product_id IN (SELECT id FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case')
AND spec_key IN ('case_max_gpu_length_mm', 'gpu_clearance_mm', 'max_gpu_length_mm');

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'case_max_gpu_length_mm',
    '250',
    250,
    'mm'
FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'gpu_clearance_mm',
    '250',
    250,
    'mm'
FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'max_gpu_length_mm',
    '250',
    250,
    'mm'
FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'max_cpu_cooler_height_mm',
    '140',
    140,
    'mm'
FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'max_cooler_height_mm',
    '140',
    140,
    'mm'
FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'motherboard_form_factor',
    'Micro-ATX',
    NULL,
    NULL
FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'form_factor',
    'Micro-ATX',
    NULL,
    NULL
FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'psu_form_factor',
    'ATX',
    NULL,
    NULL
FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'drive_bays_35_inch',
    '1',
    1,
    'bays'
FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'drive_bays_25_inch',
    '1',
    1,
    'bays'
FROM pc_parts WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case'
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 4: PSU SPECIFICATIONS
-- =====================================================

-- 1000w FSP VITA 80+ GOLD ATX3.1 GEN5.1 *FULL MODULAR
INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'power_connector_6pin',
    '0',
    0,
    'connectors'
FROM pc_parts WHERE name ILIKE '%1000w FSP VITA%' AND category = 'PSU'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'power_connector_8pin',
    '4',
    4,
    'connectors'
FROM pc_parts WHERE name ILIKE '%1000w FSP VITA%' AND category = 'PSU'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'power_connector_12vhpwr',
    '1',
    1,
    'connectors'
FROM pc_parts WHERE name ILIKE '%1000w FSP VITA%' AND category = 'PSU'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'form_factor',
    'ATX',
    NULL,
    NULL
FROM pc_parts WHERE name ILIKE '%1000w FSP VITA%' AND category = 'PSU'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'psu_length_mm',
    '160',
    160,
    'mm'
FROM pc_parts WHERE name ILIKE '%1000w FSP VITA%' AND category = 'PSU'
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 5: CPU COOLER SPECIFICATIONS
-- =====================================================

-- DEEPCOOL AK400 BLACK (Air Cooler)
INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'cooler_height_mm',
    '155',
    155,
    'mm'
FROM pc_parts WHERE name ILIKE '%DEEPCOOL AK400 BLACK%' AND category = 'Cooling'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'height_mm',
    '155',
    155,
    'mm'
FROM pc_parts WHERE name ILIKE '%DEEPCOOL AK400 BLACK%' AND category = 'Cooling'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'cooler_type',
    'Air',
    NULL,
    NULL
FROM pc_parts WHERE name ILIKE '%DEEPCOOL AK400 BLACK%' AND category = 'Cooling'
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 6: RAM SPECIFICATIONS
-- =====================================================

-- 16GB T-Force DarkZa Kit (2x8GB) 3600MHz (DDR4)
INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'module_height_mm',
    '42',
    42,
    'mm'
FROM pc_parts WHERE name ILIKE '%16GB T-Force DarkZa%' AND category = 'RAM'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'configuration',
    '2x8GB',
    2,
    'modules'
FROM pc_parts WHERE name ILIKE '%16GB T-Force DarkZa%' AND category = 'RAM'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'capacity_per_module_gb',
    '8',
    8,
    'GB'
FROM pc_parts WHERE name ILIKE '%16GB T-Force DarkZa%' AND category = 'RAM'
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 7: STORAGE SPECIFICATIONS
-- =====================================================

-- 1TB WESTERN DIGITAL BLACK (NVMe M.2 SSD)
INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'form_factor',
    'M.2 2280',
    NULL,
    NULL
FROM pc_parts WHERE name ILIKE '%1TB WESTERN DIGITAL BLACK%' AND category = 'Storage'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'interface_type',
    'NVMe',
    NULL,
    NULL
FROM pc_parts WHERE name ILIKE '%1TB WESTERN DIGITAL BLACK%' AND category = 'Storage'
ON CONFLICT DO NOTHING;

INSERT INTO product_specs (product_id, spec_key, spec_value, spec_value_num, spec_unit)
SELECT 
    id,
    'storage_interface',
    'PCIe Gen4',
    NULL,
    NULL
FROM pc_parts WHERE name ILIKE '%1TB WESTERN DIGITAL BLACK%' AND category = 'Storage'
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count specs added per category
SELECT 
    p.category,
    COUNT(DISTINCT ps.spec_key) as unique_specs,
    COUNT(*) as total_spec_entries
FROM product_specs ps
JOIN pc_parts p ON ps.product_id = p.id
WHERE p.name IN (
    'AORUS ELITE B550M AX',
    '12GB ARC B580 ASROCK CHALLENGER *(DUALFAN)',
    'POWERLOGIC SLIM',
    '1000w FSP VITA 80+ GOLD ATX3.1 GEN5.1 *FULL MODULAR',
    'DEEPCOOL AK400 BLACK',
    '16GB T-Force DarkZa Kit (2x8GB) 3600MHz',
    '1TB WESTERN DIGITAL BLACK'
)
GROUP BY p.category
ORDER BY p.category;

-- Show all specs for the critical components
SELECT 
    p.name,
    p.category,
    ps.spec_key,
    ps.spec_value,
    ps.spec_value_num,
    ps.spec_unit
FROM product_specs ps
JOIN pc_parts p ON ps.product_id = p.id
WHERE p.name IN (
    'POWERLOGIC SLIM',
    '12GB ARC B580 ASROCK CHALLENGER *(DUALFAN)'
)
ORDER BY p.name, ps.spec_key;

-- Validate GPU clearance critical fix
SELECT 
    p.name as case_name,
    ps.spec_key,
    ps.spec_value,
    ps.spec_value_num as clearance_mm
FROM product_specs ps
JOIN pc_parts p ON ps.product_id = p.id
WHERE p.category = 'Case'
AND p.name ILIKE '%POWERLOGIC SLIM%'
AND ps.spec_key IN ('case_max_gpu_length_mm', 'gpu_clearance_mm', 'max_gpu_length_mm');
