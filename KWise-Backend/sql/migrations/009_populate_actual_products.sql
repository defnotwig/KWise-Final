-- ============================================================
-- GENERIC DIMENSION POPULATION (Based on Actual Products)
-- Uses approximate dimensions for product categories
-- ============================================================

-- RTX 4060 Series (All variants) - Standard dimensions
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
AND is_active = true
AND (name ILIKE '%RTX 4060%' OR name ILIKE '%RTX4060%')
AND name NOT ILIKE '%Ti%';

-- RTX 4060 Ti Series
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
AND is_active = true
AND (name ILIKE '%RTX 4060%Ti%' OR name ILIKE '%RTX4060%Ti%');

-- RTX 4070 Series
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
AND is_active = true
AND (name ILIKE '%RTX 4070%' OR name ILIKE '%RTX4070%')
AND name NOT ILIKE '%Ti%';

-- RTX 4070 Ti Series
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
AND is_active = true
AND (name ILIKE '%RTX 4070%Ti%' OR name ILIKE '%RTX4070%Ti%');

-- RTX 5070 Series (New gen)
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 112,
  "height_mm": 50,
  "slots": 2.5,
  "tdp_watts": 250,
  "recommended_psu_watts": 650,
  "power_connectors": "1x 16-pin (12VHPWR)"
}'::jsonb
WHERE category = 'GPU' 
AND is_active = true
AND (name ILIKE '%RTX 5070%' OR name ILIKE '%RTX5070%')
AND name NOT ILIKE '%Ti%';

-- RTX 5070 Ti Series
UPDATE pc_parts SET dimensions = '{
  "length_mm": 290,
  "width_mm": 120,
  "height_mm": 55,
  "slots": 3,
  "tdp_watts": 300,
  "recommended_psu_watts": 750,
  "power_connectors": "1x 16-pin (12VHPWR)"
}'::jsonb
WHERE category = 'GPU' 
AND is_active = true
AND (name ILIKE '%RTX 5070%Ti%' OR name ILIKE '%RTX5070%Ti%');

-- RTX 5080 Series
UPDATE pc_parts SET dimensions = '{
  "length_mm": 304,
  "width_mm": 137,
  "height_mm": 61,
  "slots": 3.5,
  "tdp_watts": 360,
  "recommended_psu_watts": 850,
  "power_connectors": "1x 16-pin (12VHPWR)"
}'::jsonb
WHERE category = 'GPU' 
AND is_active = true
AND (name ILIKE '%RTX 5080%' OR name ILIKE '%RTX5080%');

-- AMD RX 7700 XT
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
AND is_active = true
AND (name ILIKE '%RX 7700%XT%' OR name ILIKE '%RX7700%XT%');

-- AMD RX 9060 XT (if exists)
UPDATE pc_parts SET dimensions = '{
  "length_mm": 244,
  "width_mm": 120,
  "height_mm": 45,
  "slots": 2.5,
  "tdp_watts": 170,
  "recommended_psu_watts": 600,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND is_active = true
AND (name ILIKE '%RX 9060%XT%' OR name ILIKE '%RX9060%XT%');

-- AMD RX 9070/9070 XT
UPDATE pc_parts SET dimensions = '{
  "length_mm": 267,
  "width_mm": 120,
  "height_mm": 50,
  "slots": 2.5,
  "tdp_watts": 260,
  "recommended_psu_watts": 700,
  "power_connectors": "2x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND is_active = true
AND (name ILIKE '%RX 9070%' OR name ILIKE '%RX9070%');

-- Intel ARC B580
UPDATE pc_parts SET dimensions = '{
  "length_mm": 240,
  "width_mm": 120,
  "height_mm": 45,
  "slots": 2,
  "tdp_watts": 190,
  "recommended_psu_watts": 600,
  "power_connectors": "1x 8-pin"
}'::jsonb
WHERE category = 'GPU' 
AND is_active = true
AND name ILIKE '%ARC B580%';

-- Budget AMD RX 550
UPDATE pc_parts SET dimensions = '{
  "length_mm": 145,
  "width_mm": 70,
  "height_mm": 35,
  "slots": 1,
  "tdp_watts": 50,
  "recommended_psu_watts": 300,
  "power_connectors": "none"
}'::jsonb
WHERE category = 'GPU' 
AND is_active = true
AND name ILIKE '%RX 550%';

-- ============================================================
-- COOLERS - Actual Products
-- ============================================================

-- DeepCool AK400 (All colors)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 155,
  "width_mm": 123,
  "depth_mm": 96,
  "ram_clearance_mm": 42,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 220,
  "fan_size_mm": 120
}'::jsonb
WHERE category = 'Cooling' 
AND is_active = true
AND name ILIKE '%AK400%';

-- DeepCool AK500
UPDATE pc_parts SET dimensions = '{
  "height_mm": 162,
  "width_mm": 130,
  "depth_mm": 103,
  "ram_clearance_mm": 42,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 220,
  "fan_size_mm": 140
}'::jsonb
WHERE category = 'Cooling' 
AND is_active = true
AND name ILIKE '%AK500%';

-- DeepCool AG500 Digital
UPDATE pc_parts SET dimensions = '{
  "height_mm": 162,
  "width_mm": 130,
  "depth_mm": 103,
  "ram_clearance_mm": 42,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 220,
  "fan_size_mm": 140,
  "note": "Digital display for temps"
}'::jsonb
WHERE category = 'Cooling' 
AND is_active = true
AND name ILIKE '%AG500%';

-- DeepCool GAMMAXX 400 V2
UPDATE pc_parts SET dimensions = '{
  "height_mm": 155,
  "width_mm": 126,
  "depth_mm": 77,
  "ram_clearance_mm": 45,
  "socket_support": ["AM4", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 180,
  "fan_size_mm": 120
}'::jsonb
WHERE category = 'Cooling' 
AND is_active = true
AND name ILIKE '%GAMMAX 400%';

-- AMD Wraith Prism (stock cooler)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 95,
  "width_mm": 95,
  "depth_mm": 71,
  "ram_clearance_mm": 100,
  "socket_support": ["AM4"],
  "tdp_rating": 140,
  "fan_size_mm": 92
}'::jsonb
WHERE category = 'Cooling' 
AND is_active = true
AND name ILIKE '%Wraith Prism%';

-- AMD Wraith Stealth (stock cooler)
UPDATE pc_parts SET dimensions = '{
  "height_mm": 54,
  "width_mm": 95,
  "depth_mm": 71,
  "ram_clearance_mm": 100,
  "socket_support": ["AM4", "AM5"],
  "tdp_rating": 65,
  "fan_size_mm": 92
}'::jsonb
WHERE category = 'Cooling' 
AND is_active = true
AND name ILIKE '%Wraith Stealth%';

-- Darkflash Nebula DN-240 AIO
UPDATE pc_parts SET dimensions = '{
  "radiator_size_mm": 240,
  "radiator_thickness_mm": 27,
  "pump_height_mm": 80,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 225,
  "fan_size_mm": 120
}'::jsonb
WHERE category = 'Cooling' 
AND is_active = true
AND name ILIKE '%DN-240%';

-- Darkflash Nebula DN-360 AIO
UPDATE pc_parts SET dimensions = '{
  "radiator_size_mm": 360,
  "radiator_thickness_mm": 27,
  "pump_height_mm": 80,
  "socket_support": ["AM4", "AM5", "LGA1700", "LGA1200", "LGA115x"],
  "tdp_rating": 300,
  "fan_size_mm": 120
}'::jsonb
WHERE category = 'Cooling' 
AND is_active = true
AND name ILIKE '%DN-360%';

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check GPU dimensions populated:
SELECT 'GPUs' as type, COUNT(*) as total, 
       SUM(CASE WHEN dimensions != '{}' THEN 1 ELSE 0 END) as populated
FROM pc_parts WHERE category = 'GPU' AND is_active = true
UNION ALL
SELECT 'Coolers', COUNT(*), 
       SUM(CASE WHEN dimensions != '{}' THEN 1 ELSE 0 END)
FROM pc_parts WHERE category = 'Cooling' AND is_active = true;
