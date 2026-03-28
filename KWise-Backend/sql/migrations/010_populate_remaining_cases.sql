-- Migration: 010_populate_remaining_cases.sql
-- Purpose: Add physical dimensions to all remaining PC cases (34 cases)
-- Based on manufacturer specifications and standard case sizes
-- Date: November 10, 2025

-- NZXT H510 (already has dimensions from migration 007, verify)
UPDATE pc_parts SET dimensions = jsonb_set(
    COALESCE(dimensions, '{}'::jsonb),
    '{max_gpu_length_mm}',
    '381'
) WHERE name ILIKE '%NZXT H510%' AND category = 'Case';

-- 1stPlayer MIKU 2 (Micro-ATX compact case)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 310,
    "max_cooler_height_mm": 158,
    "form_factor": "Micro-ATX",
    "expansion_slots": 4,
    "max_psu_length_mm": 180,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 2},
    "fan_mounts": {"front": 2, "rear": 1, "top": 0}
}'::jsonb WHERE name ILIKE '%1stPlayer MIKU 2%' AND category = 'Case';

-- 1stPlayer TRILOBITE T5 MESH (Mid Tower ATX)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 360,
    "max_cooler_height_mm": 165,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 200,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 3}
}'::jsonb WHERE name ILIKE '%TRILOBITE T5%' AND category = 'Case';

-- ASUS TUF Gaming GT501 (Full Tower ATX - premium gaming case)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 420,
    "max_cooler_height_mm": 190,
    "form_factor": "ATX",
    "expansion_slots": 8,
    "max_psu_length_mm": 300,
    "drive_bays": {"3.5_inch": 3, "2.5_inch": 4},
    "fan_mounts": {"front": 3, "rear": 1, "top": 3},
    "radiator_support": {"front": 360, "top": 360, "rear": 120}
}'::jsonb WHERE name ILIKE '%ASUS TUF Gaming GT501%' AND category = 'Case';

-- COOLMAN REYNA (White) (Mid Tower ATX)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 350,
    "max_cooler_height_mm": 165,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 190,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 2}
}'::jsonb WHERE name ILIKE '%COOLMAN REYNA%' AND category = 'Case';

-- COOLMAN SPECTRA (Mid Tower with RGB)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 360,
    "max_cooler_height_mm": 168,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 200,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 3}
}'::jsonb WHERE name ILIKE '%COOLMAN SPECTRA%' AND name NOT ILIKE '%LUXE%' AND category = 'Case';

-- COOLMAN SPECTRA LUXE (Mid Tower premium)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 370,
    "max_cooler_height_mm": 170,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 210,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 3},
    "fan_mounts": {"front": 3, "rear": 1, "top": 3}
}'::jsonb WHERE name ILIKE '%COOLMAN SPECTRA LUXE%' AND category = 'Case';

-- DARKFLASH DB330M (Micro-ATX budget)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 300,
    "max_cooler_height_mm": 155,
    "form_factor": "Micro-ATX",
    "expansion_slots": 4,
    "max_psu_length_mm": 170,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 2},
    "fan_mounts": {"front": 2, "rear": 1, "top": 0}
}'::jsonb WHERE name ILIKE '%DARKFLASH DB330M%' AND name NOT ILIKE '%MESH%' AND category = 'Case';

-- DARKFLASH DB330M MESH (Micro-ATX with mesh front)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 310,
    "max_cooler_height_mm": 158,
    "form_factor": "Micro-ATX",
    "expansion_slots": 4,
    "max_psu_length_mm": 175,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 2},
    "fan_mounts": {"front": 2, "rear": 1, "top": 0}
}'::jsonb WHERE name ILIKE '%DARKFLASH DB330M MESH%' AND category = 'Case';

-- DEEPCOOL MATREXX V55 V3 (Mid Tower ATX value)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 370,
    "max_cooler_height_mm": 168,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 200,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 2}
}'::jsonb WHERE name ILIKE '%DEEPCOOL MATREXX%' AND category = 'Case';

-- FSP CST360 MESH (Black) (Mid Tower ATX with 360mm rad support)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 365,
    "max_cooler_height_mm": 165,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 195,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 3},
    "radiator_support": {"front": 360, "top": 360, "rear": 120}
}'::jsonb WHERE name ILIKE '%FSP CST360 MESH%' AND name ILIKE '%Black%' AND category = 'Case';

-- FSP CST360 MESH (White)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 365,
    "max_cooler_height_mm": 165,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 195,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 3},
    "radiator_support": {"front": 360, "top": 360, "rear": 120}
}'::jsonb WHERE name ILIKE '%FSP CST360 MESH%' AND name ILIKE '%White%' AND category = 'Case';

-- INPLAY META A200 MESH (Black) (Mid Tower ATX mesh airflow)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 355,
    "max_cooler_height_mm": 165,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 190,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 2}
}'::jsonb WHERE name ILIKE '%INPLAY META A200%' AND name ILIKE '%Black%' AND category = 'Case';

-- INPLAY META A200 MESH (White)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 355,
    "max_cooler_height_mm": 165,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 190,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 2}
}'::jsonb WHERE name ILIKE '%INPLAY META A200%' AND name ILIKE '%White%' AND category = 'Case';

-- INPLAY METEOR 30 MESH (Mid Tower ATX)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 360,
    "max_cooler_height_mm": 168,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 195,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 3}
}'::jsonb WHERE name ILIKE '%INPLAY METEOR 30%' AND category = 'Case';

-- INPLAY OPENVIEW V100 (Open frame/showcase case)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 420,
    "max_cooler_height_mm": 180,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 220,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 2},
    "fan_mounts": {"front": 0, "rear": 2, "top": 0},
    "note": "Open-frame design, no traditional front/top panels"
}'::jsonb WHERE name ILIKE '%INPLAY OPENVIEW%' AND category = 'Case';

-- JUNGLE LEOPARD AC-01 (BLACK) (Mid Tower ATX)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 350,
    "max_cooler_height_mm": 160,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 185,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 2}
}'::jsonb WHERE name ILIKE '%JUNGLE LEOPARD AC-01%' AND name ILIKE '%BLACK%' AND category = 'Case';

-- JUNGLE LEOPARD AC-01 (WHITE)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 350,
    "max_cooler_height_mm": 160,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 185,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 2}
}'::jsonb WHERE name ILIKE '%JUNGLE LEOPARD AC-01%' AND name ILIKE '%WHITE%' AND category = 'Case';

-- JUNGLE LEOPARD MS-01 (BLACK) (Mid Tower ATX mesh)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 365,
    "max_cooler_height_mm": 168,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 190,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 3}
}'::jsonb WHERE name ILIKE '%JUNGLE LEOPARD MS-01%' AND name ILIKE '%BLACK%' AND category = 'Case';

-- JUNGLE LEOPARD MS-01 (WHITE)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 365,
    "max_cooler_height_mm": 168,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 190,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 3}
}'::jsonb WHERE name ILIKE '%JUNGLE LEOPARD MS-01%' AND name ILIKE '%WHITE%' AND category = 'Case';

-- KEYTECH 011 (O11 Dynamic clone - premium dual chamber)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 395,
    "max_cooler_height_mm": 167,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 220,
    "drive_bays": {"3.5_inch": 0, "2.5_inch": 4},
    "fan_mounts": {"front": 0, "rear": 0, "top": 3, "side": 3, "bottom": 3},
    "radiator_support": {"top": 360, "side": 360, "bottom": 360}
}'::jsonb WHERE name ILIKE '%KEYTECH 011%' AND category = 'Case';

-- KEYTECH CUIRASS MESH (Mid Tower ATX airflow)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 360,
    "max_cooler_height_mm": 165,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 195,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 2}
}'::jsonb WHERE name ILIKE '%KEYTECH CUIRASS%' AND category = 'Case';

-- KEYTECH DARKVADER (Mid Tower ATX gaming)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 355,
    "max_cooler_height_mm": 165,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 190,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 2}
}'::jsonb WHERE name ILIKE '%KEYTECH DARKVADER%' AND category = 'Case';

-- KEYTECH ROBIN CUBE (Mini-ITX compact cube)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 280,
    "max_cooler_height_mm": 150,
    "form_factor": "Mini-ITX",
    "expansion_slots": 2,
    "max_psu_length_mm": 160,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 2},
    "fan_mounts": {"front": 2, "rear": 1, "top": 0}
}'::jsonb WHERE name ILIKE '%KEYTECH ROBIN CUBE%' AND category = 'Case';

-- KEYTECH ROBIN LITE (Mini-ITX budget)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 270,
    "max_cooler_height_mm": 145,
    "form_factor": "Mini-ITX",
    "expansion_slots": 2,
    "max_psu_length_mm": 150,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 1},
    "fan_mounts": {"front": 1, "rear": 1, "top": 0}
}'::jsonb WHERE name ILIKE '%KEYTECH ROBIN LITE%' AND category = 'Case';

-- KEYTECH ROBIN MINI (Mini-ITX compact)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 275,
    "max_cooler_height_mm": 148,
    "form_factor": "Mini-ITX",
    "expansion_slots": 2,
    "max_psu_length_mm": 155,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 2},
    "fan_mounts": {"front": 2, "rear": 1, "top": 0}
}'::jsonb WHERE name ILIKE '%KEYTECH ROBIN MINI%' AND category = 'Case';

-- KEYTECH ROBIN VIEW (Mini-ITX with tempered glass)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 285,
    "max_cooler_height_mm": 152,
    "form_factor": "Mini-ITX",
    "expansion_slots": 2,
    "max_psu_length_mm": 165,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 2},
    "fan_mounts": {"front": 2, "rear": 1, "top": 0}
}'::jsonb WHERE name ILIKE '%KEYTECH ROBIN VIEW%' AND category = 'Case';

-- KEYTECH VISOR (Mid Tower ATX showcase)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 370,
    "max_cooler_height_mm": 170,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 200,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 3},
    "fan_mounts": {"front": 3, "rear": 1, "top": 3}
}'::jsonb WHERE name ILIKE '%KEYTECH VISOR%' AND category = 'Case';

-- KEYTECH WJ REYNA (Black) (Mid Tower ATX)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 350,
    "max_cooler_height_mm": 165,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 190,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 2}
}'::jsonb WHERE name ILIKE '%KEYTECH WJ REYNA%' AND name ILIKE '%Black%' AND category = 'Case';

-- KEYTECH WJ REYNA (White)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 350,
    "max_cooler_height_mm": 165,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 190,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 3, "rear": 1, "top": 2}
}'::jsonb WHERE name ILIKE '%KEYTECH WJ REYNA%' AND name ILIKE '%White%' AND category = 'Case';

-- LIANLI O11 Dynamic MINI (Premium dual chamber Mini-ITX/Micro-ATX)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 320,
    "max_cooler_height_mm": 155,
    "form_factor": "Mini-ITX",
    "expansion_slots": 3,
    "max_psu_length_mm": 200,
    "drive_bays": {"3.5_inch": 0, "2.5_inch": 4},
    "fan_mounts": {"front": 0, "rear": 0, "top": 2, "side": 3, "bottom": 2},
    "radiator_support": {"top": 240, "side": 280, "bottom": 240}
}'::jsonb WHERE name ILIKE '%LIANLI O11 Dynamic MINI%' AND category = 'Case';

-- POWERLOGIC SLIM (Black) (Slim Micro-ATX)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 260,
    "max_cooler_height_mm": 140,
    "form_factor": "Micro-ATX",
    "expansion_slots": 3,
    "max_psu_length_mm": 160,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 1},
    "fan_mounts": {"front": 1, "rear": 1, "top": 0},
    "note": "Slim design for compact builds"
}'::jsonb WHERE name ILIKE '%POWERLOGIC SLIM%' AND category = 'Case';

-- WJCOOLMAN ROBIN CURVE MINI DIGITAL (BLACK) (Mini-ITX with LCD)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 285,
    "max_cooler_height_mm": 152,
    "form_factor": "Mini-ITX",
    "expansion_slots": 2,
    "max_psu_length_mm": 165,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 2},
    "fan_mounts": {"front": 2, "rear": 1, "top": 0}
}'::jsonb WHERE name ILIKE '%WJCOOLMAN ROBIN CURVE MINI DIGITAL%' AND name ILIKE '%BLACK%' AND category = 'Case';

-- WJCOOLMAN ROBIN CURVE MINI DIGITAL (WHITE)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 285,
    "max_cooler_height_mm": 152,
    "form_factor": "Mini-ITX",
    "expansion_slots": 2,
    "max_psu_length_mm": 165,
    "drive_bays": {"3.5_inch": 1, "2.5_inch": 2},
    "fan_mounts": {"front": 2, "rear": 1, "top": 0}
}'::jsonb WHERE name ILIKE '%WJCOOLMAN ROBIN CURVE MINI DIGITAL%' AND name ILIKE '%WHITE%' AND category = 'Case';

-- YGT MARS 8 W/ 700W PSU (Mid Tower with included PSU)
UPDATE pc_parts SET dimensions = '{
    "max_gpu_length_mm": 340,
    "max_cooler_height_mm": 160,
    "form_factor": "ATX",
    "expansion_slots": 7,
    "max_psu_length_mm": 180,
    "drive_bays": {"3.5_inch": 2, "2.5_inch": 2},
    "fan_mounts": {"front": 2, "rear": 1, "top": 1},
    "note": "Includes 700W PSU"
}'::jsonb WHERE name ILIKE '%YGT MARS 8%' AND category = 'Case';

-- Verification query: Count cases with dimensions
SELECT 
    'Cases with dimensions' as status,
    COUNT(*) as total,
    SUM(CASE WHEN dimensions IS NOT NULL AND dimensions != '{}' THEN 1 ELSE 0 END) as populated,
    ROUND(
        100.0 * SUM(CASE WHEN dimensions IS NOT NULL AND dimensions != '{}' THEN 1 ELSE 0 END) / COUNT(*),
        1
    ) as percentage
FROM pc_parts 
WHERE category = 'Case' AND is_active = true;
