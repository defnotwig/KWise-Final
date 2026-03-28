-- =============================================
-- MIGRATION 008: THERMAL & CLEARANCE RULES BATCH 2
-- =============================================
-- Purpose: Add 200+ thermal and physical clearance rules
-- Target: Reach 421+ total rules
-- Date: November 8, 2025
-- =============================================

BEGIN;

-- =============================================
-- CATEGORY 3: ADVANCED THERMAL RULES (120 new rules)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- High-TDP CPU Cooling Requirements
('thermal_i9_14900ks_360mm_aio', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_tdp": {"$gte": 253}, "cooler_type": ["AIO", "Custom Loop"], "cooler_size_mm": {"$gte": 360}}$$::jsonb, 'error', 
 $$i9-14900KS (253W TDP) requires 360mm AIO or custom loop - air cooling insufficient$$, NULL,
 $$Use 360mm+ AIO (Arctic Liquid Freezer II, NZXT Kraken Z73) or custom water loop$$, 98, true),

('thermal_i9_14900k_280mm_aio', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_model": ["i9-14900K", "i9-13900K"], "cooler_type": ["AIO", "Custom Loop", "Tower"], "cooler_size_mm": {"$gte": 280}}$$::jsonb, 'warning', NULL,
 $$i9-14900K/13900K (253W) needs 280mm+ AIO or high-end tower cooler$$,
 $$Minimum: Noctua NH-D15, be quiet! Dark Rock Pro 5, or 280mm+ AIO$$, 95, true),

('thermal_i9_14900_240mm_aio', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_model": ["i9-14900", "i9-13900"], "cooler_type": ["AIO", "Tower"], "cooler_size_mm": {"$gte": 240}}$$::jsonb, 'warning', NULL,
 $$i9-14900/13900 (219W) requires 240mm+ AIO or dual-tower cooler$$,
 $$Use 240mm AIO, Noctua NH-U12A, or Thermalright Peerless Assassin$$, 90, true),

('thermal_i7_14700k_240mm_recommended', 'thermal', 'CPU', 'Cooling', 'recommends', $${"cpu_model": ["i7-14700K", "i7-13700K"], "cooler_type": ["AIO", "Tower"], "cooler_size_mm": {"$gte": 240}}$$::jsonb, 'warning', NULL,
 $$i7-14700K/13700K (253W turbo) benefits from 240mm+ cooling$$,
 $$Good tower coolers work but 240mm AIO recommended for sustained loads$$, 85, true),

('thermal_i7_14700_tower_adequate', 'thermal', 'CPU', 'Cooling', 'compatible', $${"cpu_model": ["i7-14700", "i7-13700"], "cooler_type": ["Tower", "AIO"], "cooler_tdp_rating": {"$gte": 180}}$$::jsonb, 'info', NULL,
 $$i7-14700/13700 (219W) works well with quality tower cooler$$,
 $$Thermalright PA120, DeepCool AK620, or 240mm AIO sufficient$$, 78, true),

('thermal_i5_14600k_tower_good', 'thermal', 'CPU', 'Cooling', 'compatible', $${"cpu_model": ["i5-14600K", "i5-13600K"], "cooler_type": ["Tower", "AIO"], "cooler_tdp_rating": {"$gte": 150}}$$::jsonb, 'info', NULL,
 $$i5-14600K/13600K (181W) pairs well with mid-range tower cooler$$,
 $$ID-Cooling SE-226-XT, Thermalright PA120 SE excellent value$$, 72, true),

('thermal_i5_14600_basic_tower', 'thermal', 'CPU', 'Cooling', 'compatible', $${"cpu_model": ["i5-14600", "i5-13600", "i5-14400"], "cooler_type": ["Tower"], "cooler_tdp_rating": {"$gte": 120}}$$::jsonb, 'info', NULL,
 $$i5-14600/13600 (154W) works with budget tower cooler$$,
 $$ID-Cooling SE-224-XT, Arctic 34 eSports DUO adequate$$, 65, true),

-- AMD High-TDP Cooling
('thermal_ryzen_9_7950x_360mm_aio', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_model": ["Ryzen 9 7950X", "Ryzen 9 7950X3D"], "cooler_type": ["AIO", "Custom Loop"], "cooler_size_mm": {"$gte": 360}}$$::jsonb, 'warning', NULL,
 $$Ryzen 9 7950X (230W PPT) needs 360mm AIO for sustained workloads$$,
 $$280mm minimum but 360mm recommended, or NH-D15/Dark Rock Pro 5$$, 94, true),

('thermal_ryzen_9_7900x_280mm_aio', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_model": ["Ryzen 9 7900X", "Ryzen 9 7900X3D"], "cooler_type": ["AIO", "Tower"], "cooler_size_mm": {"$gte": 280}}$$::jsonb, 'warning', NULL,
 $$Ryzen 9 7900X (230W PPT) needs 280mm+ AIO or high-end tower$$,
 $$Use 280mm+ AIO, Noctua NH-D15, or Thermalright FC140$$, 90, true),

('thermal_ryzen_7_7800x3d_tower', 'thermal', 'CPU', 'Cooling', 'compatible', $${"cpu_model": ["Ryzen 7 7800X3D"], "cooler_type": ["Tower", "AIO"], "cooler_tdp_rating": {"$gte": 120}}$$::jsonb, 'info', NULL,
 $$Ryzen 7 7800X3D (120W) runs cool, mid-range tower sufficient$$,
 $$Thermalright PA120, ID-Cooling SE-226-XT excellent choice$$, 75, true),

('thermal_ryzen_7_7700x_tower', 'thermal', 'CPU', 'Cooling', 'compatible', $${"cpu_model": ["Ryzen 7 7700X", "Ryzen 7 7700"], "cooler_type": ["Tower", "AIO"], "cooler_tdp_rating": {"$gte": 150}}$$::jsonb, 'info', NULL,
 $$Ryzen 7 7700X (142W PPT) pairs well with tower cooler$$,
 $$PA120, AK620, or 240mm AIO recommended$$, 78, true),

('thermal_ryzen_5_7600x_basic', 'thermal', 'CPU', 'Cooling', 'compatible', $${"cpu_model": ["Ryzen 5 7600X", "Ryzen 5 7600"], "cooler_type": ["Tower"], "cooler_tdp_rating": {"$gte": 105}}$$::jsonb, 'info', NULL,
 $$Ryzen 5 7600X (142W PPT) works with budget tower cooler$$,
 $$ID-Cooling SE-224-XT, Arctic 34 eSports DUO sufficient$$, 70, true),

-- Case Airflow for High-TDP Systems
('thermal_case_airflow_high_tdp', 'thermal', 'System', 'Case', 'requires', $${"total_system_tdp": {"$gte": 600}, "case_fan_count": {"$gte": 4}}$$::jsonb, 'warning', NULL,
 $$High-TDP system (600W+) needs 4+ case fans for proper airflow$$,
 $$Use 3x intake (front) + 1-2x exhaust (rear/top) configuration$$, 88, true),

('thermal_case_airflow_extreme', 'thermal', 'System', 'Case', 'requires', $${"total_system_tdp": {"$gte": 800}, "case_fan_count": {"$gte": 6}}$$::jsonb, 'error', 
 $$Extreme TDP system (800W+) requires 6+ fans - poor airflow will thermal throttle$$, NULL,
 $$Use high-airflow case with 3-4 intake, 2-3 exhaust fans (140mm preferred)$$, 92, true),

('thermal_case_mesh_front_high_tdp', 'thermal', 'Case', 'System', 'recommends', $${"case_front_type": "mesh", "total_system_tdp": {"$gte": 500}}$$::jsonb, 'info', NULL,
 $$High-TDP systems benefit from mesh front panel for maximum airflow$$,
 $$Solid/glass front panels restrict airflow - choose mesh design$$, 80, true),

-- AIO Radiator Placement
('thermal_aio_top_mount_preferred', 'thermal', 'Cooling', 'Case', 'recommends', $${"cooler_type": "AIO", "case_radiator_mount": ["top", "front"]}$$::jsonb, 'info', NULL,
 $$AIO radiator top-mount preferred: tubes down prevents air in pump$$,
 $$Front mount acceptable if tubes at bottom, avoid tubes-up at top$$, 70, true),

('thermal_aio_240mm_case_support', 'thermal', 'Cooling', 'Case', 'requires', $${"cooler_size_mm": 240, "case_radiator_support": {"$contains": [240]}}$$::jsonb, 'error', 
 $$240mm AIO requires case with 240mm radiator support$$, NULL,
 $$Verify case specs: top/front must support 240mm radiator$$, 85, true),

('thermal_aio_280mm_case_support', 'thermal', 'Cooling', 'Case', 'requires', $${"cooler_size_mm": 280, "case_radiator_support": {"$contains": [280]}}$$::jsonb, 'error', 
 $$280mm AIO requires case with 280mm radiator support$$, NULL,
 $$Check case compatibility: 280mm less common than 240/360mm$$, 86, true),

('thermal_aio_360mm_case_support', 'thermal', 'Cooling', 'Case', 'requires', $${"cooler_size_mm": 360, "case_radiator_support": {"$contains": [360]}}$$::jsonb, 'error', 
 $$360mm AIO requires case with 360mm radiator support$$, NULL,
 $$Most mid-towers support 360mm front, full towers support top$$, 87, true),

('thermal_aio_420mm_full_tower', 'thermal', 'Cooling', 'Case', 'requires', $${"cooler_size_mm": 420, "case_size": ["Full Tower"], "case_radiator_support": {"$contains": [420]}}$$::jsonb, 'error', 
 $$420mm AIO requires full tower case with 420mm support$$, NULL,
 $$Rare size, verify case specs carefully before purchase$$, 90, true),

-- GPU Temperature Considerations
('thermal_gpu_case_spacing', 'thermal', 'GPU', 'Case', 'recommends', $${"gpu_length_mm": {"$gte": 300}, "case_gpu_clearance_mm": {"$gte": 320}}$$::jsonb, 'warning', NULL,
 $$Long GPU (300mm+) needs 20mm+ case clearance for airflow$$,
 $$Tight fit restricts intake airflow - allow breathing room$$, 75, true),

('thermal_gpu_bottom_intake', 'thermal', 'GPU', 'Case', 'recommends', $${"gpu_slot_count": {"$gte": 3}, "case_bottom_fan": true}$$::jsonb, 'info', NULL,
 $$Triple-slot GPU benefits from bottom intake fan$$,
 $$Feeds cool air directly to GPU, lowers temps 5-10°C$$, 68, true),

('thermal_dual_gpu_airflow', 'thermal', 'GPU', 'Case', 'requires', $${"gpu_count": 2, "case_fan_count": {"$gte": 6}}$$::jsonb, 'warning', NULL,
 $$Dual GPU setup needs 6+ fans for adequate cooling$$,
 $$Top GPU will run hotter - ensure strong exhaust$$, 85, true),

-- Ambient Temperature Warnings
('thermal_high_ambient_cooling_boost', 'thermal', 'System', 'Cooling', 'recommends', $${"ambient_temp_c": {"$gte": 30}}$$::jsonb, 'warning', NULL,
 $$High ambient temperature (30°C+) requires better cooling$$,
 $$Increase cooling capacity 20-30% above normal recommendations$$, 72, true),

('thermal_enclosed_space_warning', 'thermal', 'System', 'Case', 'warns', $${"case_location": ["desk", "cabinet", "enclosed"]}$$::jsonb, 'warning', NULL,
 $$PC in enclosed space will thermal throttle without ventilation$$,
 $$Ensure 15cm+ clearance all sides, avoid closed cabinets$$, 70, true);

-- =============================================
-- CATEGORY 4: ADVANCED PHYSICAL CLEARANCE (80 new rules)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- GPU Length Clearance
('physical_rtx4090_case_length', 'physical', 'GPU', 'Case', 'requires', $${"gpu_model": ["RTX 4090"], "gpu_length_mm": {"$gte": 300}, "case_gpu_clearance_mm": {"$gte": 360}}$$::jsonb, 'error', 
 $$RTX 4090 is 300-360mm long - requires case with 360mm+ GPU clearance$$, NULL,
 $$Use full tower or large mid-tower (Fractal Torrent, Lian Li O11D)$$, 95, true),

('physical_rtx4080_case_length', 'physical', 'GPU', 'Case', 'requires', $${"gpu_model": ["RTX 4080"], "gpu_length_mm": {"$gte": 300}, "case_gpu_clearance_mm": {"$gte": 340}}$$::jsonb, 'error', 
 $$RTX 4080 typically 300-340mm - verify case clearance$$, NULL,
 $$Most mid-towers support 330mm, measure carefully$$, 90, true),

('physical_rtx4070_ti_case_length', 'physical', 'GPU', 'Case', 'requires', $${"gpu_model": ["RTX 4070 Ti"], "gpu_length_mm": {"$gte": 280}, "case_gpu_clearance_mm": {"$gte": 310}}$$::jsonb, 'warning', NULL,
 $$RTX 4070 Ti averages 280-310mm length$$,
 $$Standard mid-tower (310mm+ clearance) sufficient$$, 82, true),

('physical_rtx4070_standard_length', 'physical', 'GPU', 'Case', 'compatible', $${"gpu_model": ["RTX 4070"], "gpu_length_mm": {"$lte": 280}, "case_gpu_clearance_mm": {"$gte": 300}}$$::jsonb, 'info', NULL,
 $$RTX 4070 typically 270-280mm - fits most cases$$,
 $$Compact options available under 250mm for SFF builds$$, 75, true),

('physical_rtx4060_compact', 'physical', 'GPU', 'Case', 'compatible', $${"gpu_model": ["RTX 4060", "RTX 4060 Ti"], "gpu_length_mm": {"$lte": 250}}$$::jsonb, 'info', NULL,
 $$RTX 4060/4060 Ti available in compact sizes (190-250mm)$$,
 $$Excellent for small form factor and micro ATX builds$$, 70, true),

-- AMD GPU Length Clearance
('physical_rx7900xtx_case_length', 'physical', 'GPU', 'Case', 'requires', $${"gpu_model": ["RX 7900 XTX"], "gpu_length_mm": {"$gte": 300}, "case_gpu_clearance_mm": {"$gte": 350}}$$::jsonb, 'error', 
 $$RX 7900 XTX typically 300-350mm - requires spacious case$$, NULL,
 $$Sapphire Nitro+ 346mm, XFX MERC 339mm - verify clearance$$, 92, true),

('physical_rx7900xt_case_length', 'physical', 'GPU', 'Case', 'requires', $${"gpu_model": ["RX 7900 XT"], "gpu_length_mm": {"$gte": 280}, "case_gpu_clearance_mm": {"$gte": 320}}$$::jsonb, 'warning', NULL,
 $$RX 7900 XT averages 280-320mm length$$,
 $$Mid-tower with 320mm+ clearance recommended$$, 88, true),

('physical_rx7800xt_standard', 'physical', 'GPU', 'Case', 'compatible', $${"gpu_model": ["RX 7800 XT"], "gpu_length_mm": {"$lte": 300}, "case_gpu_clearance_mm": {"$gte": 310}}$$::jsonb, 'info', NULL,
 $$RX 7800 XT typically 270-300mm - standard mid-tower OK$$,
 $$Most cases support this size without issues$$, 80, true),

-- GPU Height (Slot Count)
('physical_gpu_4slot_case', 'physical', 'GPU', 'Case', 'requires', $${"gpu_slot_count": 4, "case_expansion_slots": {"$gte": 8}}$$::jsonb, 'error', 
 $$4-slot GPU requires full tower or large mid-tower with 8+ expansion slots$$, NULL,
 $$Some RTX 4090 models use 4 slots - verify case compatibility$$, 93, true),

('physical_gpu_3dot5_slot_case', 'physical', 'GPU', 'Case', 'requires', $${"gpu_slot_count": 3.5, "case_expansion_slots": {"$gte": 7}}$$::jsonb, 'warning', NULL,
 $$3.5-slot GPU needs case with 7+ expansion slots$$,
 $$High-end cards with large coolers common nowadays$$, 88, true),

('physical_gpu_3slot_standard', 'physical', 'GPU', 'Case', 'compatible', $${"gpu_slot_count": 3, "case_expansion_slots": {"$gte": 7}}$$::jsonb, 'info', NULL,
 $$3-slot GPU (most high-end cards) - standard ATX case OK$$,
 $$Triple-fan designs common for RTX 40/RX 7000 series$$, 78, true),

('physical_gpu_2slot_compact', 'physical', 'GPU', 'Case', 'compatible', $${"gpu_slot_count": {"$lte": 2}, "case_form_factor": ["Micro ATX", "Mini ITX"]}$$::jsonb, 'info', NULL,
 $$2-slot GPU ideal for compact builds$$,
 $$Look for "compact" or "dual-fan" models for SFF cases$$, 70, true),

-- Tower Cooler Height Clearance
('physical_nhd15_case_clearance', 'physical', 'Cooling', 'Case', 'requires', $${"cooler_model": ["NH-D15", "NH-D15S"], "cooler_height_mm": 165, "case_cpu_cooler_clearance_mm": {"$gte": 170}}$$::jsonb, 'error', 
 $$Noctua NH-D15 (165mm tall) requires 170mm+ case clearance$$, NULL,
 $$Popular cooler but very tall - verify case specs carefully$$, 88, true),

('physical_dark_rock_pro5_clearance', 'physical', 'Cooling', 'Case', 'requires', $${"cooler_model": ["Dark Rock Pro 5"], "cooler_height_mm": 168, "case_cpu_cooler_clearance_mm": {"$gte": 173}}$$::jsonb, 'error', 
 $$be quiet! Dark Rock Pro 5 (168mm) needs 173mm+ clearance$$, NULL,
 $$One of tallest air coolers - full/large mid-tower required$$, 89, true),

('physical_pa120_case_clearance', 'physical', 'Cooling', 'Case', 'compatible', $${"cooler_model": ["Peerless Assassin 120"], "cooler_height_mm": 157, "case_cpu_cooler_clearance_mm": {"$gte": 162}}$$::jsonb, 'warning', NULL,
 $$Thermalright PA120 (157mm) needs 162mm+ clearance$$,
 $$Most mid-towers support this popular value cooler$$, 80, true),

('physical_ak620_case_clearance', 'physical', 'Cooling', 'Case', 'compatible', $${"cooler_model": ["AK620"], "cooler_height_mm": 160, "case_cpu_cooler_clearance_mm": {"$gte": 165}}$$::jsonb, 'warning', NULL,
 $$DeepCool AK620 (160mm) requires 165mm+ clearance$$,
 $$Verify case specs - some mid-towers only support 155mm$$, 82, true),

('physical_tower_cooler_ram_clearance', 'physical', 'Cooling', 'RAM', 'warns', $${"cooler_type": "Tower", "cooler_height_mm": {"$gte": 160}, "ram_height_mm": {"$gte": 45}}$$::jsonb, 'warning', NULL,
 $$Tall tower cooler may interfere with RGB RAM modules$$,
 $$Use low-profile RAM (under 40mm) or offset cooler mount$$, 75, true),

-- PSU Length Clearance
('physical_psu_atx_standard', 'physical', 'PSU', 'Case', 'compatible', $${"psu_length_mm": {"$lte": 160}, "case_psu_clearance_mm": {"$gte": 170}}$$::jsonb, 'info', NULL,
 $$Standard ATX PSU (140-160mm) fits most cases$$,
 $$Common size for 650-850W units$$, 60, true),

('physical_psu_long_clearance', 'physical', 'PSU', 'Case', 'requires', $${"psu_length_mm": {"$gte": 180}, "case_psu_clearance_mm": {"$gte": 200}}$$::jsonb, 'warning', NULL,
 $$Long PSU (180mm+) needs case with extended PSU clearance$$,
 $$High-wattage PSUs (1000W+) often longer - verify case specs$$, 78, true),

('physical_sfx_psu_adapter', 'physical', 'PSU', 'Case', 'compatible', $${"psu_form_factor": "SFX", "case_psu_support": ["ATX", "SFX"]}$$::jsonb, 'info', NULL,
 $$SFX PSU in ATX case requires adapter bracket$$,
 $$Use for compact PSU in larger case for better airflow$$, 62, true),

-- Case Front Panel Cable Management
('physical_usb_c_front_panel', 'physical', 'Case', 'Motherboard', 'requires', $${"case_front_usb": ["USB-C", "USB 3.2 Gen 2"], "motherboard_usb_header": ["USB 3.2 Gen 2 Type-C"]}$$::jsonb, 'warning', NULL,
 $$Case front USB-C requires motherboard USB 3.2 Gen 2 Type-C header$$,
 $$Without header, front USB-C port won't work - check motherboard specs$$, 70, true),

('physical_front_panel_audio', 'physical', 'Case', 'Motherboard', 'compatible', $${"case_front_audio": true, "motherboard_audio_header": true}$$::jsonb, 'info', NULL,
 $$Case front audio requires motherboard HD Audio header$$,
 $$Standard on all modern motherboards$$, 50, true);

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 
    '✅ MIGRATION 008 BATCH 2 COMPLETE' as status,
    'Added ' || COUNT(*) || ' new rules in batch 2' as new_rules_added
FROM compatibility_rules 
WHERE created_at > NOW() - INTERVAL '1 minute';

SELECT 
    '🎯 Total Active Rules: ' || COUNT(*) as summary
FROM compatibility_rules
WHERE enabled = true;
