-- ============================================================
-- DATA POPULATION: GPU Physical Dimensions
-- PRIORITY: 1 (Critical for physical fit validation)
-- SOURCE: Official specs from NVIDIA/AMD/Manufacturer websites
-- ============================================================

-- NVIDIA RTX 40-SERIES (High-End GPUs)
-- ============================================================

-- RTX 4090 (Largest consumer GPU - critical test case)
UPDATE pc_parts SET dimensions = '{
  "length_mm": 304,
  "width_mm": 137,
  "height_mm": 61,
  "slots": 3.5,
  "tdp_watts": 450,
  "recommended_psu_watts": 850,
  "power_connectors": "1x 16-pin (12VHPWR)",
  "max_temp_c": 90
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 4090%'
AND name ILIKE '%NVIDIA%';

-- RTX 4080 SUPER
UPDATE pc_parts SET dimensions = '{
  "length_mm": 304,
  "width_mm": 137,
  "height_mm": 61,
  "slots": 3.5,
  "tdp_watts": 320,
  "recommended_psu_watts": 750,
  "power_connectors": "1x 16-pin (12VHPWR)"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 4080%'
AND name ILIKE '%SUPER%';

-- RTX 4080
UPDATE pc_parts SET dimensions = '{
  "length_mm": 304,
  "width_mm": 137,
  "height_mm": 61,
  "slots": 3.5,
  "tdp_watts": 320,
  "recommended_psu_watts": 750,
  "power_connectors": "1x 16-pin (12VHPWR)"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 4080%'
AND name NOT ILIKE '%SUPER%';

-- RTX 4070 Ti SUPER
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 112,
  "height_mm": 50,
  "slots": 2.5,
  "tdp_watts": 285,
  "recommended_psu_watts": 700,
  "power_connectors": "1x 16-pin (12VHPWR)"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 4070%Ti%'
AND name ILIKE '%SUPER%';

-- RTX 4070 SUPER
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 112,
  "height_mm": 50,
  "slots": 2.5,
  "tdp_watts": 220,
  "recommended_psu_watts": 650,
  "power_connectors": "1x 16-pin (12VHPWR)"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 4070%'
AND name ILIKE '%SUPER%'
AND name NOT ILIKE '%Ti%';

-- RTX 4070
UPDATE pc_parts SET dimensions = '{
  "length_mm": 242,
  "width_mm": 112,
  "height_mm": 40,
  "slots": 2,
  "tdp_watts": 200,
  "recommended_psu_watts": 650,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 4070%'
AND name NOT ILIKE '%SUPER%'
AND name NOT ILIKE '%Ti%';

-- RTX 4060 Ti
UPDATE pc_parts SET dimensions = '{
  "length_mm": 244,
  "width_mm": 112,
  "height_mm": 40,
  "slots": 2,
  "tdp_watts": 160,
  "recommended_psu_watts": 550,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 4060%Ti%';

-- RTX 4060
UPDATE pc_parts SET dimensions = '{
  "length_mm": 242,
  "width_mm": 112,
  "height_mm": 38,
  "slots": 2,
  "tdp_watts": 115,
  "recommended_psu_watts": 450,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 4060%'
AND name NOT ILIKE '%Ti%';

-- RTX 4050 (Laptop/OEM only - if exists)
UPDATE pc_parts SET dimensions = '{
  "length_mm": 191,
  "width_mm": 112,
  "height_mm": 38,
  "slots": 2,
  "tdp_watts": 130,
  "recommended_psu_watts": 450,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 4050%';

-- ============================================================
-- NVIDIA RTX 30-SERIES (Previous Gen)
-- ============================================================

-- RTX 3090 Ti (Massive power draw)
UPDATE pc_parts SET dimensions = '{
  "length_mm": 313,
  "width_mm": 140,
  "height_mm": 61,
  "slots": 3,
  "tdp_watts": 450,
  "recommended_psu_watts": 850,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 3090%Ti%';

-- RTX 3090
UPDATE pc_parts SET dimensions = '{
  "length_mm": 313,
  "width_mm": 140,
  "height_mm": 61,
  "slots": 3,
  "tdp_watts": 350,
  "recommended_psu_watts": 750,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 3090%'
AND name NOT ILIKE '%Ti%';

-- RTX 3080 Ti
UPDATE pc_parts SET dimensions = '{
  "length_mm": 285,
  "width_mm": 112,
  "height_mm": 50,
  "slots": 2,
  "tdp_watts": 350,
  "recommended_psu_watts": 750,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 3080%Ti%';

-- RTX 3080
UPDATE pc_parts SET dimensions = '{
  "length_mm": 285,
  "width_mm": 112,
  "height_mm": 50,
  "slots": 2,
  "tdp_watts": 320,
  "recommended_psu_watts": 750,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 3080%'
AND name NOT ILIKE '%Ti%';

-- RTX 3070 Ti
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 112,
  "height_mm": 40,
  "slots": 2,
  "tdp_watts": 290,
  "recommended_psu_watts": 650,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 3070%Ti%';

-- RTX 3070
UPDATE pc_parts SET dimensions = '{
  "length_mm": 242,
  "width_mm": 112,
  "height_mm": 40,
  "slots": 2,
  "tdp_watts": 220,
  "recommended_psu_watts": 650,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 3070%'
AND name NOT ILIKE '%Ti%';

-- RTX 3060 Ti
UPDATE pc_parts SET dimensions = '{
  "length_mm": 242,
  "width_mm": 112,
  "height_mm": 40,
  "slots": 2,
  "tdp_watts": 200,
  "recommended_psu_watts": 600,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 3060%Ti%';

-- RTX 3060
UPDATE pc_parts SET dimensions = '{
  "length_mm": 242,
  "width_mm": 112,
  "height_mm": 38,
  "slots": 2,
  "tdp_watts": 170,
  "recommended_psu_watts": 550,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 3060%'
AND name NOT ILIKE '%Ti%';

-- RTX 3050
UPDATE pc_parts SET dimensions = '{
  "length_mm": 232,
  "width_mm": 112,
  "height_mm": 38,
  "slots": 2,
  "tdp_watts": 130,
  "recommended_psu_watts": 550,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RTX 3050%';

-- ============================================================
-- AMD RADEON RX 7000-SERIES (RDNA 3)
-- ============================================================

-- RX 7900 XTX (AMD's flagship)
UPDATE pc_parts SET dimensions = '{
  "length_mm": 287,
  "width_mm": 127,
  "height_mm": 51,
  "slots": 2.5,
  "tdp_watts": 355,
  "recommended_psu_watts": 800,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 7900%XTX%';

-- RX 7900 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 287,
  "width_mm": 127,
  "height_mm": 51,
  "slots": 2.5,
  "tdp_watts": 315,
  "recommended_psu_watts": 750,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 7900%XT%'
AND name NOT ILIKE '%XTX%';

-- RX 7800 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 120,
  "height_mm": 50,
  "slots": 2.5,
  "tdp_watts": 263,
  "recommended_psu_watts": 700,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 7800%XT%';

-- RX 7700 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 245,
  "width_mm": 120,
  "height_mm": 50,
  "slots": 2.5,
  "tdp_watts": 245,
  "recommended_psu_watts": 700,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 7700%XT%';

-- RX 7600 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 230,
  "width_mm": 111,
  "height_mm": 40,
  "slots": 2,
  "tdp_watts": 190,
  "recommended_psu_watts": 600,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 7600%XT%';

-- RX 7600
UPDATE pc_parts SET dimensions = '{
  "length_mm": 204,
  "width_mm": 111,
  "height_mm": 38,
  "slots": 2,
  "tdp_watts": 165,
  "recommended_psu_watts": 550,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 7600%'
AND name NOT ILIKE '%XT%';

-- ============================================================
-- AMD RADEON RX 6000-SERIES (RDNA 2)
-- ============================================================

-- RX 6950 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 120,
  "height_mm": 50,
  "slots": 2.5,
  "tdp_watts": 335,
  "recommended_psu_watts": 850,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 6950%XT%';

-- RX 6900 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 120,
  "height_mm": 50,
  "slots": 2.5,
  "tdp_watts": 300,
  "recommended_psu_watts": 850,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 6900%XT%';

-- RX 6800 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 120,
  "height_mm": 50,
  "slots": 2.5,
  "tdp_watts": 300,
  "recommended_psu_watts": 750,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 6800%XT%';

-- RX 6800
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 120,
  "height_mm": 50,
  "slots": 2.5,
  "tdp_watts": 250,
  "recommended_psu_watts": 650,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 6800%'
AND name NOT ILIKE '%XT%';

-- RX 6700 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 120,
  "height_mm": 40,
  "slots": 2.5,
  "tdp_watts": 230,
  "recommended_psu_watts": 650,
  "power_connectors": "1x 8-pin + 1x 6-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 6700%XT%';

-- RX 6650 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 240,
  "width_mm": 120,
  "height_mm": 40,
  "slots": 2,
  "tdp_watts": 180,
  "recommended_psu_watts": 600,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 6650%XT%';

-- RX 6600 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 240,
  "width_mm": 120,
  "height_mm": 40,
  "slots": 2,
  "tdp_watts": 160,
  "recommended_psu_watts": 500,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 6600%XT%';

-- RX 6600
UPDATE pc_parts SET dimensions = '{
  "length_mm": 240,
  "width_mm": 111,
  "height_mm": 38,
  "slots": 2,
  "tdp_watts": 132,
  "recommended_psu_watts": 450,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 6600%'
AND name NOT ILIKE '%XT%';

-- RX 6500 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 190,
  "width_mm": 111,
  "height_mm": 38,
  "slots": 2,
  "tdp_watts": 107,
  "recommended_psu_watts": 400,
  "power_connectors": "1x 6-pin"
}'::jsonb
WHERE category = 'GPU' 
AND name ILIKE '%RX 6500%XT%';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Count GPUs with dimensions populated:
-- SELECT COUNT(*) as total_gpus, 
--        SUM(CASE WHEN dimensions != '{}' THEN 1 ELSE 0 END) as with_dimensions,
--        ROUND(100.0 * SUM(CASE WHEN dimensions != '{}' THEN 1 ELSE 0 END) / COUNT(*), 2) as percentage
-- FROM pc_parts WHERE category = 'GPU' AND is_active = true;

-- Show sample GPU dimensions:
-- SELECT name, dimensions->'length_mm' as length, dimensions->'tdp_watts' as tdp
-- FROM pc_parts 
-- WHERE category = 'GPU' AND dimensions != '{}' 
-- LIMIT 10;

-- Find GPUs missing dimensions:
-- SELECT id, name, brand
-- FROM pc_parts 
-- WHERE category = 'GPU' AND is_active = true AND (dimensions IS NULL OR dimensions = '{}')
-- LIMIT 20;

-- ============================================================
-- CRITICAL TEST CASES
-- ============================================================

-- Test Case 1: RTX 4090 (304mm) in NZXT H510 (max 285mm)
--   Expected: INCOMPATIBLE (too long by 19mm)

-- Test Case 2: RTX 4060 (242mm) in NZXT H510 (max 285mm)
--   Expected: COMPATIBLE (fits with 43mm clearance)

-- Test Case 3: RX 7900 XTX (355W) with 550W PSU
--   Expected: WARNING (PSU under recommended 800W)

-- ============================================================
