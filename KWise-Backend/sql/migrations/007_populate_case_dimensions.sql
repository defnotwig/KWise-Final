-- ============================================================
-- DATA POPULATION: PC Case Physical Dimensions
-- PRIORITY: 1 (Critical for GPU/Cooler clearance validation)
-- SOURCE: Official specs from manufacturer websites
-- ============================================================

-- NZXT CASES (Popular Philippine Market)
-- ============================================================

-- NZXT H510 (Most popular mid-tower - critical baseline)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 381,
  "max_cooler_height_mm": 165,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 2,
  "drive_bays_25": 4,
  "expansion_slots": 7,
  "radiator_support": "280mm front, 120mm rear",
  "dimensions_mm": {"length": 428, "width": 210, "height": 460}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%H510%'
AND name ILIKE '%NZXT%';

-- NZXT H7 Flow (High airflow, spacious)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 420,
  "max_cooler_height_mm": 185,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 4,
  "drive_bays_25": 6,
  "expansion_slots": 8,
  "radiator_support": "360mm front/top, 140mm rear",
  "dimensions_mm": {"length": 505, "width": 230, "height": 494}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%H7%'
AND name ILIKE '%NZXT%';

-- NZXT H9 Flow (E-ATX support, massive clearance)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 435,
  "max_cooler_height_mm": 190,
  "form_factor": "E-ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 4,
  "drive_bays_25": 8,
  "expansion_slots": 9,
  "radiator_support": "420mm front/top, 140mm rear",
  "dimensions_mm": {"length": 516, "width": 230, "height": 505}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%H9%'
AND name ILIKE '%NZXT%';

-- NZXT H210 (Mini-ITX compact)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 325,
  "max_cooler_height_mm": 165,
  "form_factor": "Mini-ITX",
  "psu_form_factor": "ATX, SFX",
  "drive_bays_35": 1,
  "drive_bays_25": 2,
  "expansion_slots": 3,
  "radiator_support": "240mm front, 120mm rear",
  "dimensions_mm": {"length": 349, "width": 210, "height": 372}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%H210%'
AND name ILIKE '%NZXT%';

-- ============================================================
-- CORSAIR CASES
-- ============================================================

-- Corsair 4000D Airflow (Budget king)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 360,
  "max_cooler_height_mm": 170,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 2,
  "drive_bays_25": 2,
  "expansion_slots": 7,
  "radiator_support": "360mm front, 240mm top",
  "dimensions_mm": {"length": 466, "width": 230, "height": 453}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%4000D%'
AND name ILIKE '%Corsair%';

-- Corsair 5000D Airflow (Spacious mid-tower)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 420,
  "max_cooler_height_mm": 170,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 4,
  "drive_bays_25": 4,
  "expansion_slots": 8,
  "radiator_support": "360mm front/top, 120mm rear",
  "dimensions_mm": {"length": 520, "width": 245, "height": 497}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%5000D%'
AND name ILIKE '%Corsair%';

-- Corsair 7000D Airflow (Full-tower beast)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 480,
  "max_cooler_height_mm": 190,
  "form_factor": "E-ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 6,
  "drive_bays_25": 6,
  "expansion_slots": 10,
  "radiator_support": "420mm front/top, 140mm rear",
  "dimensions_mm": {"length": 560, "width": 245, "height": 546}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%7000D%'
AND name ILIKE '%Corsair%';

-- Corsair Crystal 680X RGB (Dual chamber)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 370,
  "max_cooler_height_mm": 180,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 3,
  "drive_bays_25": 4,
  "expansion_slots": 8,
  "radiator_support": "360mm front, 280mm top",
  "dimensions_mm": {"length": 563, "width": 287, "height": 602}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%680X%'
AND name ILIKE '%Corsair%';

-- ============================================================
-- LIAN LI CASES (Popular for builds)
-- ============================================================

-- Lian Li O11 Dynamic (Iconic case)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 420,
  "max_cooler_height_mm": 155,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 0,
  "drive_bays_25": 6,
  "expansion_slots": 8,
  "radiator_support": "360mm side/top/bottom",
  "dimensions_mm": {"length": 445, "width": 272, "height": 446}
}'::jsonb
WHERE category ILIKE '%case%'
AND (name ILIKE '%O11%' OR name ILIKE '%O-11%')
AND name ILIKE '%Lian Li%';

-- Lian Li Lancool II Mesh (High airflow)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 384,
  "max_cooler_height_mm": 176,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 2,
  "drive_bays_25": 6,
  "expansion_slots": 7,
  "radiator_support": "360mm front/top",
  "dimensions_mm": {"length": 494, "width": 229, "height": 478}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%Lancool%II%'
AND name ILIKE '%Lian Li%';

-- Lian Li Lancool III (Latest gen)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 400,
  "max_cooler_height_mm": 176,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 2,
  "drive_bays_25": 6,
  "expansion_slots": 8,
  "radiator_support": "420mm front, 360mm top",
  "dimensions_mm": {"length": 508, "width": 245, "height": 489}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%Lancool%III%'
AND name ILIKE '%Lian Li%';

-- ============================================================
-- FRACTAL DESIGN CASES
-- ============================================================

-- Fractal Meshify 2 (Cable management king)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 491,
  "max_cooler_height_mm": 185,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 3,
  "drive_bays_25": 4,
  "expansion_slots": 9,
  "radiator_support": "420mm front/top",
  "dimensions_mm": {"length": 542, "width": 240, "height": 474}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%Meshify%2%'
AND name ILIKE '%Fractal%';

-- Fractal Torrent (Airflow beast)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 461,
  "max_cooler_height_mm": 188,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 2,
  "drive_bays_25": 4,
  "expansion_slots": 9,
  "radiator_support": "420mm front, 360mm top/bottom",
  "dimensions_mm": {"length": 544, "width": 242, "height": 530}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%Torrent%'
AND name ILIKE '%Fractal%';

-- Fractal Define 7 (Silent operation)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 491,
  "max_cooler_height_mm": 185,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 6,
  "drive_bays_25": 4,
  "expansion_slots": 9,
  "radiator_support": "420mm front/top",
  "dimensions_mm": {"length": 547, "width": 240, "height": 475}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%Define%7%'
AND name ILIKE '%Fractal%';

-- ============================================================
-- COOLER MASTER CASES
-- ============================================================

-- Cooler Master MasterBox TD500 Mesh (Budget mesh)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 410,
  "max_cooler_height_mm": 165,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 2,
  "drive_bays_25": 2,
  "expansion_slots": 7,
  "radiator_support": "360mm front, 240mm top",
  "dimensions_mm": {"length": 493, "width": 217, "height": 469}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%TD500%'
AND name ILIKE '%Cooler Master%';

-- Cooler Master H500 ARGB (Front 200mm fans)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 412,
  "max_cooler_height_mm": 167,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 2,
  "drive_bays_25": 4,
  "expansion_slots": 8,
  "radiator_support": "360mm front, 240mm top",
  "dimensions_mm": {"length": 544, "width": 242, "height": 515}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%H500%'
AND name ILIKE '%Cooler Master%';

-- ============================================================
-- PHANTEKS CASES
-- ============================================================

-- Phanteks Eclipse P500A (Airflow champion)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 435,
  "max_cooler_height_mm": 190,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 2,
  "drive_bays_25": 4,
  "expansion_slots": 9,
  "radiator_support": "420mm front/top",
  "dimensions_mm": {"length": 550, "width": 253, "height": 510}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%P500A%'
AND name ILIKE '%Phanteks%';

-- Phanteks Eclipse P400A (Budget mesh)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 420,
  "max_cooler_height_mm": 160,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 2,
  "drive_bays_25": 3,
  "expansion_slots": 7,
  "radiator_support": "360mm front, 240mm top",
  "dimensions_mm": {"length": 500, "width": 240, "height": 480}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%P400A%'
AND name ILIKE '%Phanteks%';

-- ============================================================
-- BE QUIET! CASES
-- ============================================================

-- be quiet! Pure Base 500DX (Silent + airflow)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 369,
  "max_cooler_height_mm": 190,
  "form_factor": "ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 3,
  "drive_bays_25": 5,
  "expansion_slots": 7,
  "radiator_support": "360mm front, 280mm top",
  "dimensions_mm": {"length": 513, "width": 232, "height": 475}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%Pure Base 500DX%'
AND name ILIKE '%be quiet%';

-- be quiet! Dark Base 700 (Premium silent)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 432,
  "max_cooler_height_mm": 190,
  "form_factor": "E-ATX",
  "psu_form_factor": "ATX",
  "drive_bays_35": 5,
  "drive_bays_25": 6,
  "expansion_slots": 9,
  "radiator_support": "420mm front/top",
  "dimensions_mm": {"length": 580, "width": 243, "height": 546}
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%Dark Base 700%'
AND name ILIKE '%be quiet%';

-- ============================================================
-- SILVERSTONE CASES (SFF specialists)
-- ============================================================

-- Silverstone SG13 (Mini-ITX ultra-compact)
UPDATE pc_parts SET dimensions = '{
  "max_gpu_length_mm": 267,
  "max_cooler_height_mm": 61,
  "form_factor": "Mini-ITX",
  "psu_form_factor": "ATX, SFX",
  "drive_bays_35": 0,
  "drive_bays_25": 2,
  "expansion_slots": 2,
  "radiator_support": "120mm",
  "dimensions_mm": {"length": 222, "width": 181, "height": 285},
  "note": "WARNING: Very tight clearances - verify all dimensions"
}'::jsonb
WHERE category ILIKE '%case%'
AND name ILIKE '%SG13%'
AND name ILIKE '%Silverstone%';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Count cases with dimensions:
-- SELECT COUNT(*) as total_cases,
--        SUM(CASE WHEN dimensions != '{}' THEN 1 ELSE 0 END) as with_dimensions
-- FROM pc_parts WHERE category ILIKE '%case%' AND is_active = true;

-- Show sample case dimensions:
-- SELECT name, 
--        dimensions->'max_gpu_length_mm' as max_gpu,
--        dimensions->'max_cooler_height_mm' as max_cooler,
--        dimensions->'form_factor' as form_factor
-- FROM pc_parts 
-- WHERE category ILIKE '%case%' AND dimensions != '{}';

-- Find critical clearance test cases:
-- SELECT name, dimensions->'max_gpu_length_mm' as max_gpu_mm
-- FROM pc_parts 
-- WHERE category ILIKE '%case%' 
-- AND dimensions->'max_gpu_length_mm' IS NOT NULL
-- ORDER BY (dimensions->>'max_gpu_length_mm')::int ASC
-- LIMIT 10;

-- ============================================================
-- CRITICAL TEST CASES
-- ============================================================

-- Test Case 1: RTX 4090 (304mm) in NZXT H510 (max 381mm)
--   Expected: COMPATIBLE (fits with 77mm clearance)

-- Test Case 2: RTX 4090 (304mm) in SG13 (max 267mm)
--   Expected: INCOMPATIBLE (too long by 37mm)

-- Test Case 3: Large tower cooler (190mm) in NZXT H510 (max 165mm)
--   Expected: INCOMPATIBLE (too tall by 25mm)

-- ============================================================
