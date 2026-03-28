-- ============================================================
-- DATA POPULATION: CPU Cooler Physical Dimensions
-- PRIORITY: 1 (Critical for case clearance validation)
-- SOURCE: Official specs from manufacturer websites
-- ============================================================

-- NOCTUA COOLERS (Premium air cooling)
-- ============================================================

-- Noctua NH-D15 (King of air cooling - critical baseline)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 165,
  "width_mm": 150,
  "depth_mm": 161,
  "ram_clearance_mm": 32,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 220,
  "fan_size_mm": 140,
  "weight_grams": 1320,
  "note": "Dual tower, dual 140mm fans"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%NH-D15%'
AND name ILIKE '%Noctua%';

-- Noctua NH-U12S (Single tower, excellent)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 158,
  "width_mm": 125,
  "depth_mm": 95,
  "ram_clearance_mm": 45,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 180,
  "fan_size_mm": 120,
  "weight_grams": 630
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%NH-U12S%'
AND name ILIKE '%Noctua%';

-- Noctua NH-L9i/a (Low-profile SFF)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 37,
  "width_mm": 95,
  "depth_mm": 95,
  "ram_clearance_mm": 100,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 95,
  "fan_size_mm": 92,
  "weight_grams": 420,
  "note": "Low-profile for SFF builds"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND (name ILIKE '%NH-L9i%' OR name ILIKE '%NH-L9a%')
AND name ILIKE '%Noctua%';

-- Noctua NH-C14S (Top-flow low-profile)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 142,
  "width_mm": 140,
  "depth_mm": 115,
  "ram_clearance_mm": 65,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 140,
  "fan_size_mm": 140,
  "weight_grams": 980
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%NH-C14S%'
AND name ILIKE '%Noctua%';

-- ============================================================
-- BE QUIET! COOLERS
-- ============================================================

-- be quiet! Dark Rock Pro 4 (Silent champion)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 163,
  "width_mm": 146,
  "depth_mm": 136,
  "ram_clearance_mm": 40,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 250,
  "fan_size_mm": 120,
  "weight_grams": 1130,
  "note": "Dual tower, 7 heat pipes"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Dark Rock Pro 4%'
AND name ILIKE '%be quiet%';

-- be quiet! Dark Rock 4 (Single tower silent)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 159,
  "width_mm": 136,
  "depth_mm": 96,
  "ram_clearance_mm": 40,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 200,
  "fan_size_mm": 120,
  "weight_grams": 825
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Dark Rock 4%'
AND name NOT ILIKE '%Pro%'
AND name ILIKE '%be quiet%';

-- be quiet! Shadow Rock 3 (Budget silent)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 163,
  "width_mm": 121,
  "depth_mm": 85,
  "ram_clearance_mm": 43,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 190,
  "fan_size_mm": 120,
  "weight_grams": 760
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Shadow Rock 3%'
AND name ILIKE '%be quiet%';

-- be quiet! Pure Rock 2 (Budget value)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 155,
  "width_mm": 121,
  "depth_mm": 87,
  "ram_clearance_mm": 40,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 150,
  "fan_size_mm": 120,
  "weight_grams": 660
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Pure Rock 2%'
AND name ILIKE '%be quiet%';

-- ============================================================
-- ARCTIC COOLERS (Budget king)
-- ============================================================

-- Arctic Freezer 34 eSports DUO (Best budget)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 157,
  "width_mm": 124,
  "depth_mm": 100,
  "ram_clearance_mm": 40,
  "socket_support": ["AM4", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 210,
  "fan_size_mm": 120,
  "weight_grams": 780,
  "note": "Dual 120mm fans"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Freezer 34 eSports DUO%'
AND name ILIKE '%Arctic%';

-- Arctic Freezer 50 (Dual tower budget)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 165,
  "width_mm": 149,
  "depth_mm": 140,
  "ram_clearance_mm": 38,
  "socket_support": ["AM4", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 320,
  "fan_size_mm": 120,
  "weight_grams": 1200,
  "note": "Dual tower, dual 120mm fans"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Freezer 50%'
AND name ILIKE '%Arctic%';

-- ============================================================
-- COOLER MASTER COOLERS
-- ============================================================

-- Cooler Master Hyper 212 (Legendary budget)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 159,
  "width_mm": 123,
  "depth_mm": 83,
  "ram_clearance_mm": 40,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 180,
  "fan_size_mm": 120,
  "weight_grams": 650,
  "note": "Best-selling budget cooler"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Hyper 212%'
AND name ILIKE '%Cooler Master%';

-- Cooler Master MasterAir MA410M (ARGB tower)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 165,
  "width_mm": 129,
  "depth_mm": 104,
  "ram_clearance_mm": 37,
  "socket_support": ["AM4", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 200,
  "fan_size_mm": 120,
  "weight_grams": 820
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%MA410M%'
AND name ILIKE '%Cooler Master%';

-- Cooler Master MasterLiquid ML240L V2 RGB (Budget AIO)
UPDATE pc_parts SET dimensions = '{
  "radiator_size_mm": 240,
  "radiator_thickness_mm": 27,
  "pump_height_mm": 80,
  "tube_length_mm": 400,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 200,
  "fan_size_mm": 120,
  "weight_grams": 1100,
  "note": "240mm AIO liquid cooler"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%ML240L%'
AND name ILIKE '%Cooler Master%';

-- ============================================================
-- DEEPCOOL COOLERS
-- ============================================================

-- DeepCool AK620 (Budget NH-D15 alternative)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 160,
  "width_mm": 129,
  "depth_mm": 138,
  "ram_clearance_mm": 41,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 260,
  "fan_size_mm": 120,
  "weight_grams": 1030,
  "note": "Dual tower, excellent value"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%AK620%'
AND name ILIKE '%DeepCool%';

-- DeepCool AS500 (Single tower budget)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 162,
  "width_mm": 130,
  "depth_mm": 103,
  "ram_clearance_mm": 42,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 220,
  "fan_size_mm": 140,
  "weight_grams": 870
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%AS500%'
AND name ILIKE '%DeepCool%';

-- DeepCool GAMMAXX 400 V2 (Ultra-budget)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 155,
  "width_mm": 126,
  "depth_mm": 77,
  "ram_clearance_mm": 45,
  "socket_support": ["AM4", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 180,
  "fan_size_mm": 120,
  "weight_grams": 580
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%GAMMAXX 400%'
AND name ILIKE '%DeepCool%';

-- ============================================================
-- THERMALRIGHT COOLERS (Value champions)
-- ============================================================

-- Thermalright Peerless Assassin 120 SE (Value king)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 157,
  "width_mm": 127,
  "depth_mm": 138,
  "ram_clearance_mm": 41,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 240,
  "fan_size_mm": 120,
  "weight_grams": 950,
  "note": "Best value dual tower"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Peerless Assassin 120%'
AND name ILIKE '%Thermalright%';

-- Thermalright Frost Commander 140 (Premium value)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 165,
  "width_mm": 140,
  "depth_mm": 152,
  "ram_clearance_mm": 38,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 280,
  "fan_size_mm": 140,
  "weight_grams": 1200,
  "note": "Dual 140mm fans"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Frost Commander 140%'
AND name ILIKE '%Thermalright%';

-- ============================================================
-- SCYTHE COOLERS
-- ============================================================

-- Scythe Fuma 2 (Compact dual tower)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 154,
  "width_mm": 130,
  "depth_mm": 102,
  "ram_clearance_mm": 45,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 250,
  "fan_size_mm": 120,
  "weight_grams": 890,
  "note": "Excellent RAM clearance"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Fuma 2%'
AND name ILIKE '%Scythe%';

-- Scythe Mugen 5 (Single tower value)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 155,
  "width_mm": 129,
  "depth_mm": 103,
  "ram_clearance_mm": 44,
  "socket_support": ["AM4", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 200,
  "fan_size_mm": 120,
  "weight_grams": 730
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Mugen 5%'
AND name ILIKE '%Scythe%';

-- ============================================================
-- CORSAIR COOLERS (AIOs)
-- ============================================================

-- Corsair iCUE H150i Elite Capellix (360mm AIO)
UPDATE pc_parts SET dimensions = '{
  "radiator_size_mm": 360,
  "radiator_thickness_mm": 27,
  "radiator_length_mm": 397,
  "radiator_width_mm": 120,
  "pump_height_mm": 85,
  "tube_length_mm": 450,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 300,
  "fan_size_mm": 120,
  "weight_grams": 1650,
  "note": "360mm AIO liquid cooler, RGB pump"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%H150i Elite%'
AND name ILIKE '%Corsair%';

-- Corsair iCUE H100i RGB Pro XT (240mm AIO)
UPDATE pc_parts SET dimensions = '{
  "radiator_size_mm": 240,
  "radiator_thickness_mm": 27,
  "pump_height_mm": 80,
  "tube_length_mm": 400,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 225,
  "fan_size_mm": 120,
  "weight_grams": 1200,
  "note": "240mm AIO liquid cooler"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%H100i%'
AND name ILIKE '%Corsair%';

-- ============================================================
-- NZXT COOLERS (AIOs)
-- ============================================================

-- NZXT Kraken X63 (280mm AIO)
UPDATE pc_parts SET dimensions = '{
  "radiator_size_mm": 280,
  "radiator_thickness_mm": 30,
  "pump_height_mm": 80,
  "tube_length_mm": 400,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 250,
  "fan_size_mm": 140,
  "weight_grams": 1400,
  "note": "280mm AIO liquid cooler, LCD display"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Kraken X63%'
AND name ILIKE '%NZXT%';

-- NZXT Kraken Z73 (360mm AIO with LCD)
UPDATE pc_parts SET dimensions = '{
  "radiator_size_mm": 360,
  "radiator_thickness_mm": 30,
  "pump_height_mm": 85,
  "tube_length_mm": 400,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 300,
  "fan_size_mm": 120,
  "weight_grams": 1750,
  "note": "360mm AIO, 2.36-inch LCD display"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Kraken Z73%'
AND name ILIKE '%NZXT%';

-- ============================================================
-- STOCK/BUNDLED COOLERS
-- ============================================================

-- AMD Wraith Prism (Ryzen 7/9 stock)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 95,
  "width_mm": 95,
  "depth_mm": 71,
  "ram_clearance_mm": 100,
  "socket_support": ["AM4"],
  "tdp_rating": 140,
  "fan_size_mm": 92,
  "weight_grams": 450,
  "note": "Stock AMD cooler, RGB lighting"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Wraith Prism%'
AND name ILIKE '%AMD%';

-- AMD Wraith Stealth (Ryzen 5 stock)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 54,
  "width_mm": 95,
  "depth_mm": 71,
  "ram_clearance_mm": 100,
  "socket_support": ["AM4", "AM5"],
  "tdp_rating": 65,
  "fan_size_mm": 92,
  "weight_grams": 370,
  "note": "Low-profile stock cooler"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Wraith Stealth%'
AND name ILIKE '%AMD%';

-- Intel Stock Cooler (LGA1700)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 46,
  "width_mm": 95,
  "depth_mm": 95,
  "ram_clearance_mm": 100,
  "socket_support": ["LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 65,
  "fan_size_mm": 92,
  "weight_grams": 300,
  "note": "Basic Intel stock cooler"
}'::jsonb
WHERE category ILIKE '%cooling%'
AND name ILIKE '%Intel%Stock%';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Count coolers with dimensions:
-- SELECT COUNT(*) as total_coolers,
--        SUM(CASE WHEN dimensions != '{}' THEN 1 ELSE 0 END) as with_dimensions
-- FROM pc_parts WHERE category ILIKE '%cooling%' AND is_active = true;

-- Show coolers by height (tallest first):
-- SELECT name, 
--        dimensions->'height_mm' as height,
--        dimensions->'ram_clearance_mm' as ram_clearance,
--        dimensions->'tdp_rating' as tdp
-- FROM pc_parts 
-- WHERE category ILIKE '%cooling%' 
-- AND dimensions->'height_mm' IS NOT NULL
-- ORDER BY (dimensions->>'height_mm')::int DESC;

-- Find coolers that fit in NZXT H510 (max 165mm):
-- SELECT name, dimensions->'height_mm' as height_mm
-- FROM pc_parts 
-- WHERE category ILIKE '%cooling%'
-- AND (dimensions->>'height_mm')::int <= 165
-- ORDER BY (dimensions->>'height_mm')::int DESC;

-- ============================================================
-- CRITICAL TEST CASES
-- ============================================================

-- Test Case 1: NH-D15 (165mm) in NZXT H510 (max 165mm)
--   Expected: COMPATIBLE (exact fit - barely)

-- Test Case 2: Dark Rock Pro 4 (163mm) in NZXT H210 (max 165mm)
--   Expected: COMPATIBLE (2mm clearance)

-- Test Case 3: Frost Commander 140 (165mm) in be quiet! Pure Base 500DX (max 190mm)
--   Expected: COMPATIBLE (25mm clearance)

-- Test Case 4: NH-D15 (165mm) in SG13 (max 61mm)
--   Expected: INCOMPATIBLE (too tall by 104mm)

-- ============================================================
