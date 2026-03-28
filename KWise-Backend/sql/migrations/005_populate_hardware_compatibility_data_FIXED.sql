-- =============================================
-- MIGRATION 005: POPULATE HARDWARE COMPATIBILITY DATA (FIXED)
-- =============================================
-- Purpose: Populate hardware compatibility tables with real-world component data
-- Fixed to match actual database schemas verified on November 7, 2025
-- =============================================

BEGIN;

-- =============================================
-- 1. GPU COMPATIBILITY DATA (28 GPUs)
-- =============================================
-- Schema: gpu_length_mm, gpu_slots, gpu_power_connectors (JSONB), min_psu_wattage, 
--         tdp, pcie_requirement, requires_12vhpwr, case_clearance_required, notes

INSERT INTO gpu_compatibility (
    gpu_length_mm, gpu_slots, gpu_power_connectors, min_psu_wattage, tdp, 
    pcie_requirement, requires_12vhpwr, case_clearance_required, notes
) VALUES
-- NVIDIA RTX 40 Series
(304, 3.0, '["12VHPWR"]'::jsonb, 850, 450, 'PCIe 4.0 x16', true, 310, 'RTX 4090 FE - Flagship GPU, requires excellent cooling and case clearance'),
(336, 3.5, '["12VHPWR"]'::jsonb, 850, 450, 'PCIe 4.0 x16', true, 345, 'RTX 4090 MSI Gaming X Trio - Very large card, check case compatibility'),
(348, 3.65, '["12VHPWR"]'::jsonb, 850, 450, 'PCIe 4.0 x16', true, 355, 'RTX 4090 ASUS TUF - Longest RTX 4090, full-tower recommended'),
(304, 2.5, '["12VHPWR"]'::jsonb, 750, 320, 'PCIe 4.0 x16', true, 310, 'RTX 4080 FE - High performance, manageable size'),
(342, 3.0, '["12VHPWR"]'::jsonb, 750, 320, 'PCIe 4.0 x16', true, 350, 'RTX 4080 Gigabyte Gaming OC - Large card, verify case clearance'),
(267, 2.5, '["12VHPWR"]'::jsonb, 700, 285, 'PCIe 4.0 x16', true, 275, 'RTX 4070 Ti FE - Good balance of size and performance'),
(267, 2.5, '["8-pin PCIe"]'::jsonb, 650, 200, 'PCIe 4.0 x16', false, 275, 'RTX 4070 ASUS Dual - Mid-range, fits most cases'),
(244, 2.0, '["8-pin PCIe"]'::jsonb, 550, 160, 'PCIe 4.0 x16', false, 250, 'RTX 4060 Ti FE - Compact, excellent for mATX/ITX'),
(199, 2.0, '["8-pin PCIe"]'::jsonb, 550, 115, 'PCIe 4.0 x16', false, 210, 'RTX 4060 MSI Ventus - Very compact, ITX friendly'),

-- NVIDIA RTX 30 Series
(313, 3.0, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 750, 350, 'PCIe 4.0 x16', false, 320, 'RTX 3090 FE - Previous flagship, still very powerful'),
(285, 2.0, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 750, 320, 'PCIe 4.0 x16', false, 295, 'RTX 3080 FE - Excellent performance, compact design'),
(242, 2.0, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 650, 220, 'PCIe 4.0 x16', false, 250, 'RTX 3070 FE - Mid-range workhorse'),
(242, 2.0, '["8-pin PCIe"]'::jsonb, 600, 200, 'PCIe 4.0 x16', false, 250, 'RTX 3060 Ti FE - Great value, compact size'),

-- AMD RX 7000 Series
(287, 2.5, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 850, 355, 'PCIe 4.0 x16', false, 295, 'RX 7900 XTX Reference - AMD flagship, high TDP'),
(310, 3.0, '["8-pin PCIe", "8-pin PCIe", "8-pin PCIe"]'::jsonb, 850, 355, 'PCIe 4.0 x16', false, 320, 'RX 7900 XTX Sapphire Nitro+ - Premium cooling, large size'),
(276, 2.5, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 800, 315, 'PCIe 4.0 x16', false, 285, 'RX 7900 XT Reference - High performance AMD'),
(267, 2.5, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 700, 263, 'PCIe 4.0 x16', false, 275, 'RX 7800 XT Reference - Mid-range AMD performer'),
(246, 2.0, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 700, 245, 'PCIe 4.0 x16', false, 255, 'RX 7700 XT Reference - Good balance'),
(204, 2.0, '["8-pin PCIe"]'::jsonb, 550, 165, 'PCIe 4.0 x16', false, 215, 'RX 7600 Reference - Budget friendly, compact'),

-- AMD RX 6000 Series
(267, 2.5, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 850, 335, 'PCIe 4.0 x16', false, 275, 'RX 6950 XT Reference - Previous AMD flagship'),
(267, 2.5, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 850, 300, 'PCIe 4.0 x16', false, 275, 'RX 6900 XT Reference - High-end RDNA2'),
(267, 2.5, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 750, 300, 'PCIe 4.0 x16', false, 275, 'RX 6800 XT Reference - Excellent performer'),
(267, 2.5, '["8-pin PCIe", "8-pin PCIe"]'::jsonb, 650, 230, 'PCIe 4.0 x16', false, 275, 'RX 6700 XT Reference - Mid-range RDNA2'),

-- Budget/Compact GPUs
(190, 1.5, '["6-pin PCIe"]'::jsonb, 450, 130, 'PCIe 4.0 x16', false, 200, 'RTX 3050 - Budget 1080p gaming'),
(168, 1.5, '["6-pin PCIe"]'::jsonb, 450, 107, 'PCIe 4.0 x16', false, 180, 'RX 6600 - Compact budget option'),
(191, 2.0, '["8-pin PCIe"]'::jsonb, 500, 132, 'PCIe 4.0 x16', false, 200, 'RX 6600 XT - Better budget option'),
(182, 1.5, '[]'::jsonb, 300, 75, 'PCIe 4.0 x16', false, 190, 'GTX 1650 - Entry level, no power connector');

-- =============================================
-- 2. CASE COMPATIBILITY DATA (25 Cases)
-- =============================================
-- Schema: form_factor, max_gpu_length_mm, max_gpu_length_no_front_fan_mm, 
--         max_cpu_cooler_height_mm, max_psu_length_mm, motherboard_support (JSONB),
--         radiator_support (JSONB), drive_bays (JSONB), fan_mounts (JSONB), clearance_notes

INSERT INTO case_compatibility (
    form_factor, max_gpu_length_mm, max_gpu_length_no_front_fan_mm, 
    max_cpu_cooler_height_mm, max_psu_length_mm, motherboard_support, 
    radiator_support, drive_bays, fan_mounts, clearance_notes
) VALUES
-- Full Tower Cases
('Full Tower', 461, 461, 188, 250, '["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"]'::jsonb, 
'{"front": ["360mm", "420mm"], "top": ["360mm", "420mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 6, "2.5inch": 4}'::jsonb, '{"front": 3, "top": 3, "rear": 1}'::jsonb,
'Fractal Torrent - Excellent airflow, massive GPU clearance'),

('Full Tower', 420, 420, 170, 225, '["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["360mm"], "top": ["360mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 6, "2.5inch": 2}'::jsonb, '{"front": 3, "top": 3, "rear": 1}'::jsonb,
'Corsair 7000D Airflow - Premium full tower with excellent cable management'),

('Full Tower', 420, 400, 167, 225, '["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["360mm"], "top": ["360mm"], "side": ["360mm"]}'::jsonb,
'{"3.5inch": 4, "2.5inch": 6}'::jsonb, '{"front": 3, "top": 3, "bottom": 3, "rear": 1}'::jsonb,
'Lian Li O11 Dynamic XL - Excellent for watercooling, triple radiator support'),

-- Mid Tower Cases
('Mid Tower', 400, 380, 185, 200, '["ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["360mm"], "top": ["280mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 3, "2.5inch": 3}'::jsonb, '{"front": 3, "top": 2, "rear": 1}'::jsonb,
'NZXT H7 Flow - Modern mid-tower with excellent airflow'),

('Mid Tower', 360, 315, 169, 250, '["ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["360mm"], "top": ["240mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 6, "2.5inch": 4}'::jsonb, '{"front": 3, "top": 2, "rear": 1}'::jsonb,
'Fractal Meshify 2 - Compact mid-tower, excellent for air cooling'),

('Mid Tower', 380, 360, 170, 220, '["ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["360mm"], "top": ["360mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 2, "2.5inch": 4}'::jsonb, '{"front": 3, "top": 3, "rear": 1}'::jsonb,
'Phanteks Eclipse P500A - High airflow, spacious interior'),

('Mid Tower', 360, 360, 165, 200, '["ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["280mm"], "top": ["240mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 2, "2.5inch": 3}'::jsonb, '{"front": 2, "top": 2, "rear": 1}'::jsonb,
'be quiet! Pure Base 500DX - Silent operation focus'),

('Mid Tower', 400, 380, 165, 180, '["ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["360mm"], "top": ["240mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 4, "2.5inch": 2}'::jsonb, '{"front": 3, "top": 2, "rear": 1}'::jsonb,
'Cooler Master H500 ARGB - Large GPU support in mid-tower'),

-- Compact/Micro-ATX Cases
('Micro-ATX', 315, 315, 163, 160, '["Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["240mm"], "top": ["240mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 2, "2.5inch": 3}'::jsonb, '{"front": 2, "top": 2, "rear": 1}'::jsonb,
'Fractal Design Pop Mini - Compact mATX, good GPU clearance'),

('Micro-ATX', 280, 280, 155, 160, '["Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["240mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 2, "2.5inch": 2}'::jsonb, '{"front": 2, "rear": 1}'::jsonb,
'Cooler Master MasterBox Q300L - Budget mATX option'),

('Micro-ATX', 350, 350, 160, 170, '["Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["280mm"], "top": ["240mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 3, "2.5inch": 2}'::jsonb, '{"front": 2, "top": 2, "rear": 1}'::jsonb,
'Lian Li LANCOOL 205M - Great airflow in compact size'),

-- Mini-ITX Cases
('Mini-ITX', 330, 330, 155, 180, '["Mini-ITX"]'::jsonb,
'{"bottom": ["240mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 0, "2.5inch": 3}'::jsonb, '{"bottom": 2, "rear": 1}'::jsonb,
'Cooler Master NR200P - Popular ITX case, 240mm AIO support'),

('Mini-ITX', 334, 334, 73, 130, '["Mini-ITX"]'::jsonb,
'{"side": ["240mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 0, "2.5inch": 2}'::jsonb, '{"side": 2, "rear": 1}'::jsonb,
'SSUPD Meshlicious - Vertical layout, low-profile cooler required'),

('Mini-ITX', 322, 322, 70, 150, '["Mini-ITX"]'::jsonb,
'{"side": ["240mm"]}'::jsonb,
'{"3.5inch": 0, "2.5inch": 2}'::jsonb, '{"side": 2}'::jsonb,
'Lian Li A4-H2O - Ultra-compact, AIO recommended'),

('Mini-ITX', 280, 280, 145, 140, '["Mini-ITX"]'::jsonb,
'{"rear": ["120mm"]}'::jsonb,
'{"3.5inch": 1, "2.5inch": 2}'::jsonb, '{"front": 2, "rear": 1}'::jsonb,
'Fractal Design Node 304 - Cube design, good storage'),

('Mini-ITX', 310, 310, 160, 160, '["Mini-ITX"]'::jsonb,
'{"bottom": ["240mm"], "rear": ["92mm"]}'::jsonb,
'{"3.5inch": 0, "2.5inch": 2}'::jsonb, '{"bottom": 2, "rear": 1}'::jsonb,
'Silverstone SG13 - Ultra compact, challenging build'),

-- Specialized Cases
('Mid Tower', 380, 380, 176, 200, '["ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["360mm"], "top": ["360mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 2, "2.5inch": 4}'::jsonb, '{"front": 3, "top": 3, "rear": 1}'::jsonb,
'Corsair 4000D Airflow - Best seller, excellent value'),

('Mid Tower', 360, 360, 170, 180, '["ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["360mm"], "top": ["280mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 4, "2.5inch": 2}'::jsonb, '{"front": 3, "top": 2, "rear": 1}'::jsonb,
'Lian Li LANCOOL II Mesh - Premium mid-tower'),

('Full Tower', 480, 480, 190, 220, '["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["420mm"], "top": ["420mm"], "rear": ["140mm"]}'::jsonb,
'{"3.5inch": 8, "2.5inch": 4}'::jsonb, '{"front": 3, "top": 3, "rear": 1}'::jsonb,
'Phanteks Enthoo Pro 2 - Massive storage capacity'),

('Mid Tower', 395, 370, 167, 200, '["ATX", "Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["360mm"], "top": ["360mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 2, "2.5inch": 3}'::jsonb, '{"front": 3, "top": 3, "rear": 1}'::jsonb,
'NZXT H710i - RGB smart device included'),

('Micro-ATX', 330, 330, 159, 175, '["Micro-ATX", "Mini-ITX"]'::jsonb,
'{"front": ["240mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 2, "2.5inch": 3}'::jsonb, '{"front": 2, "rear": 1}'::jsonb,
'Silverstone FARA R1 - Budget mATX with good clearance'),

('Mini-ITX', 295, 295, 160, 150, '["Mini-ITX"]'::jsonb,
'{"bottom": ["240mm"], "rear": ["120mm"]}'::jsonb,
'{"3.5inch": 0, "2.5inch": 2}'::jsonb, '{"bottom": 2, "rear": 1}'::jsonb,
'Dan Case A4-SFX - Premium ultra-compact'),

('Mini-ITX', 280, 280, 130, 140, '["Mini-ITX"]'::jsonb,
'{"rear": ["92mm"]}'::jsonb,
'{"3.5inch": 0, "2.5inch": 1}'::jsonb, '{"rear": 1, "side": 2}'::jsonb,
'Louqe Ghost S1 - Minimalist sandwich layout'),

('Mini-ITX', 305, 305, 70, 100, '["Mini-ITX"]'::jsonb,
'{"side": ["240mm"]}'::jsonb,
'{"3.5inch": 0, "2.5inch": 1}'::jsonb, '{"side": 2}'::jsonb,
'FormD T1 - Ultra-premium compact, SFX PSU required');

-- =============================================
-- 3. RAM COMPATIBILITY DATA (17 RAM Kits)
-- =============================================
-- Schema: memory_type, memory_speed, chipset_support, max_officially_supported_speed,
--         xmp_profile_stable, height_mm, cas_latency, voltage, notes

INSERT INTO ram_compatibility (
    memory_type, memory_speed, chipset_support, max_officially_supported_speed, 
    xmp_profile_stable, height_mm, cas_latency, voltage, notes
) VALUES
-- DDR5 Memory Kits
('DDR5', 6000, 'Z790/Z690/X670E/X670/B650E/B650', 6000, true, 34, 'CL30', 1.35, 'Corsair Vengeance DDR5 - Standard height, no RGB, excellent compatibility'),
('DDR5', 6400, 'Z790/Z690/X670E/X670/B650E/B650', 6400, true, 44, 'CL32', 1.40, 'Corsair Vengeance RGB DDR5 - RGB lighting, may conflict with large tower coolers'),
('DDR5', 7200, 'Z790/Z690/X670E/X670', 7200, true, 44, 'CL34', 1.40, 'G.Skill Trident Z5 RGB - High performance, RGB, 44mm height'),
('DDR5', 6000, 'Z790/Z690/X670E/X670/B650E/B650', 6000, true, 35, 'CL36', 1.25, 'Kingston Fury Beast DDR5 - Budget friendly, low voltage'),
('DDR5', 6400, 'Z790/Z690/X670E/X670/B650E/B650', 6400, true, 42, 'CL32', 1.35, 'Crucial DDR5 - JEDEC standard, excellent stability'),
('DDR5', 7600, 'Z790/X670E', 7600, true, 46, 'CL36', 1.45, 'G.Skill Trident Z5 Royal - Premium RGB, very tall, high voltage'),
('DDR5', 5600, 'Z790/Z690/X670E/X670/B650E/B650', 5600, true, 32, 'CL28', 1.25, 'TeamGroup T-Force Vulcan - Low profile, 32mm height, no RGB'),

-- DDR4 Memory Kits
('DDR4', 3200, 'Z590/Z490/B560/B460/X570/X470/B550/B450', 3200, true, 31, 'CL16', 1.35, 'Corsair Vengeance LPX - Low profile (31mm), excellent for large coolers'),
('DDR4', 3600, 'Z590/Z490/B560/X570/X470/B550/B450', 3600, true, 44, 'CL18', 1.35, 'G.Skill Trident Z RGB - Premium RGB, 44mm height, popular choice'),
('DDR4', 3200, 'Z590/Z490/B560/B460/X570/X470/B550/B450', 3200, true, 33, 'CL16', 1.35, 'Kingston HyperX Fury - Balanced height, good compatibility'),
('DDR4', 3600, 'Z590/Z490/B560/X570/X470/B550/B450', 3600, true, 42, 'CL16', 1.35, 'Crucial Ballistix RGB - Mid-height RGB, 42mm'),
('DDR4', 4000, 'Z590/Z490/X570/X470', 4000, true, 44, 'CL18', 1.40, 'G.Skill Ripjaws V - High speed, standard height'),
('DDR4', 3200, 'Z590/Z490/B560/B460/X570/X470/B550/B450', 3200, true, 39, 'CL16', 1.35, 'TeamGroup T-Force Delta RGB - Aggressive RGB design, 39mm'),
('DDR4', 3600, 'Z590/Z490/B560/X570/X470/B550/B450', 3600, true, 51, 'CL18', 1.35, 'Corsair Dominator Platinum RGB - Very tall (51mm), premium RGB'),

-- ECC/Server Memory
('DDR5', 4800, 'W790/TRX50', 4800, true, 32, 'CL40', 1.10, 'Kingston Server Premier DDR5 ECC - For workstation platforms'),
('DDR4', 3200, 'X399/TRX40/C621/C622', 3200, true, 31, 'CL22', 1.20, 'Crucial ECC Registered DDR4 - Server/workstation memory'),
('DDR4', 2933, 'X399/TRX40/C621/C622', 2933, true, 31, 'CL21', 1.20, 'Samsung ECC Registered DDR4 - Enterprise grade stability');

COMMIT;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'Hardware compatibility data populated successfully!' as message,
       (SELECT COUNT(*) FROM gpu_compatibility) as gpu_count,
       (SELECT COUNT(*) FROM case_compatibility) as case_count,
       (SELECT COUNT(*) FROM ram_compatibility) as ram_count;
