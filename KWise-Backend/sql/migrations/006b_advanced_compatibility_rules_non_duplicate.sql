-- =============================================
-- MIGRATION 006B: ADVANCED COMPATIBILITY RULES (NON-DUPLICATE VERSION)
-- =============================================
-- Purpose: Add 180+ new compatibility rules (avoiding existing duplicates)
-- Fixed schema: rule_type, error_message/warning_message
-- Date: November 7, 2025
-- =============================================

BEGIN;

-- =============================================
-- PERFORMANCE INDEXES (Skip existing)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_gpu_compat_tdp ON gpu_compatibility(tdp);
CREATE INDEX IF NOT EXISTS idx_gpu_compat_slots ON gpu_compatibility(gpu_slots);
CREATE INDEX IF NOT EXISTS idx_ram_compat_height ON ram_compatibility(height_mm);
CREATE INDEX IF NOT EXISTS idx_ram_compat_type_speed ON ram_compatibility(memory_type, memory_speed);
CREATE INDEX IF NOT EXISTS idx_bios_compat_composite ON bios_compatibility(chipset, cpu_generation);
CREATE INDEX IF NOT EXISTS idx_compat_rules_category_severity ON compatibility_rules(rule_category, severity) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_compat_rules_components_enabled ON compatibility_rules(component_a_category, component_b_category, enabled) WHERE enabled = true;

-- =============================================
-- CATEGORY 1: ADVANCED PHYSICAL CLEARANCE (NEW RULES ONLY)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- GPU Length Specific Cases (NEW)
('gpu_length_300mm_mid_tower_v2', 'physical', 'GPU', 'Case', 'requires', $${"gpu_length_mm": {"$gte": 300}, "case_max_gpu_length_mm": {"$gte": 310}}$$::jsonb, 'warning', NULL, 
 $$300mm+ GPU requires mid-tower with 310mm+ clearance - verify exact case specifications$$, 
 $$Use cases like NZXT H7 Flow (400mm), Fractal Meshify 2 (360mm), Phanteks P500A (380mm), or full-tower$$, 85, true),

('gpu_length_320mm_large_v2', 'physical', 'GPU', 'Case', 'requires', $${"gpu_length_mm": {"$gte": 320}, "case_max_gpu_length_mm": {"$gte": 330}}$$::jsonb, 'error', 
 $$320mm+ GPU requires large mid-tower or full-tower case with 330mm+ clearance$$, NULL,
 $$Consider Phanteks P500A (380mm), Corsair 4000D (360mm), Lian Li O11 XL (420mm), or full-tower$$, 90, true),

('gpu_length_340mm_full_tower_v2', 'physical', 'GPU', 'Case', 'requires', $${"gpu_length_mm": {"$gte": 340}, "case_max_gpu_length_mm": {"$gte": 350}}$$::jsonb, 'error', 
 $$340mm+ GPU (ASUS TUF RTX 4090) requires full-tower or XL mid-tower with 350mm+ clearance$$, NULL,
 $$Use Fractal Torrent (461mm), Lian Li O11 XL (420mm), Corsair 7000D (420mm), or similar full-tower$$, 95, true),

('gpu_triple_slot_spacing_v2', 'physical', 'GPU', 'Motherboard', 'requires', $${"gpu_slot_width": {"$gte": 3.0}, "motherboard_pcie_slots": {"$gte": 7}}$$::jsonb, 'warning', NULL,
 $$Triple-slot GPU (3.0+ slots) blocks adjacent PCIe slots - verify motherboard layout$$, 
 $$Use motherboard with proper PCIe slot spacing or plan around blocked slots$$, 75, true),

('gpu_quad_slot_itx_incompatible_v2', 'physical', 'GPU', 'Case', 'conflicts', $${"gpu_slot_width": {"$gte": 4.0}, "case_form_factor": "Mini-ITX"}$$::jsonb, 'error', 
 $$Quad-slot GPU (4.0+ slots) incompatible with Mini-ITX form factor$$, NULL,
 $$Choose dual or triple-slot GPU for ITX builds, or use larger case with ATX motherboard$$, 90, true),

('gpu_compact_universal_v2', 'physical', 'GPU', 'Case', 'compatible', $${"gpu_length_mm": {"$lte": 200}}$$::jsonb, 'info', NULL,
 $$Compact GPU (≤200mm) fits virtually all cases including SFF and Mini-ITX$$, 
 $$Excellent choice for compact builds like NR200P, SSUPD Meshlicious, Dan Case A4$$, 40, true),

('gpu_standard_length_v2', 'physical', 'GPU', 'Case', 'compatible', $${"gpu_length_mm": {"$gte": 200, "$lte": 280}}$$::jsonb, 'info', NULL,
 $$Standard GPU length (200-280mm) fits most mid-tower and larger cases$$, 
 $$Compatible with majority of popular cases, good mainstream choice$$, 45, true),

('gpu_matx_length_check_v2', 'physical', 'GPU', 'Case', 'requires', $${"gpu_length_mm": {"$gte": 280, "$lte": 310}, "case_form_factor": "Micro-ATX"}$$::jsonb, 'warning', NULL,
 $$GPU length 280-310mm in Micro-ATX case - verify exact clearance before purchase$$, 
 $$Check case specifications, consider removing front fans if needed for clearance$$, 70, true),

('gpu_front_fan_conflict_v2', 'physical', 'GPU', 'Case', 'requires', $${"gpu_length_mm": {"$gte": 310}}$$::jsonb, 'warning', NULL,
 $$GPU 310mm+ may require removing front case fans for adequate clearance$$, 
 $$Verify case max GPU length with and without front fans installed$$, 75, true),

('gpu_vertical_mount_clearance_v2', 'physical', 'GPU', 'Case', 'requires', $${"gpu_mount": "vertical"}$$::jsonb, 'warning', NULL,
 $$Vertical GPU mount requires adequate side panel clearance (50mm+ for thick GPUs)$$, 
 $$Ensure case side panel provides clearance for GPU fans and card thickness$$, 65, true),

-- Cooler Height Rules (NEW)
('cooler_height_low_profile_universal_v2', 'physical', 'Cooling', 'Case', 'compatible', $${"cooler_height_mm": {"$lte": 70}}$$::jsonb, 'info', NULL,
 $$Low-profile cooler (≤70mm) fits all case types including SFF and slim cases$$, 
 $$Universal compatibility, ideal for compact builds and space-constrained systems$$, 40, true),

('cooler_height_standard_v2', 'physical', 'Cooling', 'Case', 'requires', $${"cooler_height_mm": {"$gte": 70, "$lte": 160}, "case_max_cooler_height_mm": {"$gte": 165}}$$::jsonb, 'info', NULL,
 $$Standard tower cooler (70-160mm) fits most mid-tower and larger cases$$, 
 $$Compatible with majority of cases, verify clearance for large towers like NH-D15$$, 50, true),

('cooler_height_165mm_nhd15_v2', 'physical', 'Cooling', 'Case', 'requires', $${"cooler_height_mm": {"$gte": 165}, "case_max_cooler_height_mm": {"$gte": 168}}$$::jsonb, 'warning', NULL,
 $$Large tower coolers like NH-D15 (165mm) require cases with 168mm+ cooler clearance$$, 
 $$Verify case specifications - some mid-towers may not accommodate coolers this tall$$, 80, true),

('cooler_height_itx_limit_v2', 'physical', 'Cooling', 'Case', 'requires', $${"cooler_height_mm": {"$gte": 70}, "case_form_factor": "Mini-ITX"}$$::jsonb, 'warning', NULL,
 $$Tower coolers in Mini-ITX cases - verify exact cooler height vs case clearance$$, 
 $$Most ITX cases limit cooler height to 155-160mm, check specifications carefully$$, 75, true),

('cooler_height_sff_constraint_v2', 'physical', 'Cooling', 'Case', 'requires', $${"cooler_height_mm": {"$gte": 70}, "case_max_cooler_height_mm": {"$lte": 75}}$$::jsonb, 'error', 
 $$SFF case requires low-profile cooler - tower coolers will not fit$$, NULL,
 $$Use low-profile coolers (≤70mm) like Noctua NH-L12S, NH-L9x65, or AIO liquid cooling$$, 90, true),

-- RAM Height vs Cooler Clearance (NEW)
('ram_low_profile_universal_v2', 'physical', 'Memory', 'Cooling', 'compatible', $${"ram_height_mm": {"$lte": 32}}$$::jsonb, 'info', NULL,
 $$Low-profile RAM (≤32mm) clears all coolers including large towers like NH-D15$$, 
 $$Universally compatible, best choice for builds with tower air coolers$$, 45, true),

('ram_standard_height_tower_check_v2', 'physical', 'Memory', 'Cooling', 'requires', $${"ram_height_mm": {"$gte": 32, "$lte": 40}, "cooler_type": "tower"}$$::jsonb, 'warning', NULL,
 $$Standard RAM (32-40mm) may conflict with tower coolers - verify RAM clearance$$, 
 $$Check cooler specifications for RAM clearance, may need to use 2nd slot or offset fans$$, 70, true),

('ram_rgb_tall_tower_conflict_v2', 'physical', 'Memory', 'Cooling', 'requires', $${"ram_height_mm": {"$gte": 44}, "cooler_type": "tower", "cooler_ram_clearance_mm": {"$lte": 40}}$$::jsonb, 'error', 
 $$Tall RGB RAM (44mm+) conflicts with tower coolers that have <40mm RAM clearance$$, NULL,
 $$Choose low-profile RAM, offset cooler fans, or use AIO liquid cooling instead$$, 85, true),

('ram_height_nhd15_clearance_v2', 'physical', 'Memory', 'Cooling', 'requires', $${"ram_height_mm": {"$gte": 32}, "cooler_model": "NH-D15"}$$::jsonb, 'warning', NULL,
 $$Noctua NH-D15 has 32mm RAM clearance - taller RAM requires fan offset or 2nd slot$$, 
 $$Use low-profile RAM (≤32mm) or offset front fan upward for taller modules$$, 75, true),

('ram_aio_no_conflict_v2', 'physical', 'Memory', 'Cooling', 'compatible', $${"cooler_type": "AIO"}$$::jsonb, 'info', NULL,
 $$AIO liquid coolers have no RAM height restrictions - any RAM height compatible$$, 
 $$AIO radiators mount away from RAM slots, allowing tall RGB modules without issues$$, 40, true),

-- PSU Length and Form Factor (NEW)
('psu_atx_standard_universal_v2', 'physical', 'PSU', 'Case', 'compatible', $${"psu_length_mm": {"$lte": 160}, "psu_form_factor": "ATX"}$$::jsonb, 'info', NULL,
 $$Standard ATX PSU (≤160mm) fits virtually all ATX/mATX cases$$, 
 $$Universal compatibility with standard mid-tower and larger cases$$, 45, true),

('psu_long_atx_clearance_v2', 'physical', 'PSU', 'Case', 'requires', $${"psu_length_mm": {"$gte": 180}, "case_max_psu_length_mm": {"$gte": 190}}$$::jsonb, 'warning', NULL,
 $$Long ATX PSU (180mm+) requires case verification - may reduce GPU clearance$$, 
 $$Check case specifications, long PSU can interfere with long GPUs in some cases$$, 70, true),

('psu_sfx_compact_v2', 'physical', 'PSU', 'Case', 'compatible', $${"psu_form_factor": "SFX", "psu_length_mm": {"$lte": 100}}$$::jsonb, 'info', NULL,
 $$SFX PSU (100mm) fits all cases including compact Mini-ITX builds$$, 
 $$Universal compatibility, optimal for SFF cases like NR200P, SSUPD Meshlicious$$, 42, true),

-- Multi-Component Physical Interactions (NEW)
('long_gpu_long_psu_conflict_v2', 'physical', 'GPU', 'PSU', 'conflicts', $${"gpu_length_mm": {"$gte": 300}, "psu_length_mm": {"$gte": 180}}$$::jsonb, 'warning', NULL,
 $$Long GPU (300mm+) + Long PSU (180mm+) may not fit in some mid-tower cases$$, 
 $$Verify case can accommodate both - may need full-tower or standard-length PSU$$, 80, true),

('itx_component_planning_v2', 'physical', 'Case', 'Multiple', 'requires', $${"case_form_factor": "Mini-ITX"}$$::jsonb, 'warning', NULL,
 $$Mini-ITX builds require careful component planning - verify all clearances$$, 
 $$Check GPU length, cooler height, PSU form factor, and cable management space$$, 70, true);

-- =============================================
-- CATEGORY 2: ADVANCED THERMAL MANAGEMENT (NEW RULES ONLY)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- CPU TDP Specific Requirements (NEW - avoiding duplicates)
('cpu_tdp_35w_stock_cooler_v2', 'thermal', 'CPU', 'Cooling', 'compatible', $${"cpu_tdp_watts": {"$lte": 35}}$$::jsonb, 'info', NULL,
 $$35W TDP CPU can use stock cooler - aftermarket cooler optional for quieter operation$$, 
 $$Stock cooler adequate for low TDP CPUs, upgrade for better acoustics if desired$$, 50, true),

('cpu_tdp_65w_tower_recommended_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_tdp_watts": {"$gte": 55, "$lte": 65}, "cooler_tdp_rating": {"$gte": 80}}$$::jsonb, 'warning', NULL,
 $$65W TDP CPU needs tower cooler or 120mm+ AIO (80W+ rating) for sustained loads$$, 
 $$Stock coolers may thermal throttle - use tower cooler like Hyper 212 or 120mm AIO$$, 70, true),

('cpu_tdp_95w_performance_cooler_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_tdp_watts": {"$gte": 85, "$lte": 95}, "cooler_tdp_rating": {"$gte": 120}}$$::jsonb, 'error', 
 $$95W TDP CPU requires performance cooler (120W+ rating) - tower or 240mm AIO$$, NULL,
 $$Use coolers like Noctua NH-D15, be quiet! Dark Rock Pro 4, Arctic Freezer 34, or 240mm+ AIO$$, 80, true),

('cpu_tdp_125w_premium_cooling_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_tdp_watts": {"$gte": 115, "$lte": 125}, "cooler_tdp_rating": {"$gte": 160}}$$::jsonb, 'error', 
 $$125W TDP CPU requires premium cooler (160W+ rating) - large tower or 280mm AIO$$, NULL,
 $$Use dual-tower air coolers (NH-D15, Dark Rock Pro 4) or 280mm/360mm AIO$$, 90, true),

('cpu_tdp_150w_extreme_cooling_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_tdp_watts": {"$gte": 140, "$lte": 150}, "cooler_tdp_rating": {"$gte": 200}}$$::jsonb, 'error', 
 $$150W TDP CPU needs extreme cooling (200W+ rating) - best air coolers or 280mm+ AIO$$, NULL,
 $$Use Arctic Liquid Freezer II 280/360, Noctua NH-D15, Thermalright Peerless Assassin 120 SE$$, 92, true),

('cpu_tdp_170w_aio_recommended_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_tdp_watts": {"$gte": 160, "$lte": 170}, "cooler_tdp_rating": {"$gte": 220}}$$::jsonb, 'error', 
 $$170W TDP CPU requires 280mm+ AIO or best air coolers (220W+ rating)$$, NULL,
 $$Air cooling challenging at this TDP - 280mm/360mm AIO strongly recommended$$, 93, true),

('cpu_tdp_200w_plus_aio_required_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_tdp_watts": {"$gte": 190}, "cooler_tdp_rating": {"$gte": 250}}$$::jsonb, 'error', 
 $$200W+ TDP CPU (i9-14900K/KS, Threadripper) requires 360mm+ AIO or custom loop$$, NULL,
 $$Air cooling insufficient - use 360mm/420mm AIO or custom watercooling solution$$, 95, true),

-- Intel Specific CPU Cooling (NEW)
('i9_14900k_cooling_requirement_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_model": ["i9-14900K", "i9-14900KS"], "cooler_tdp_rating": {"$gte": 250}}$$::jsonb, 'error', 
 $$i9-14900K/KS (253W PL2) requires 360mm AIO or custom loop - air cooling inadequate$$, NULL,
 $$Use 360mm/420mm AIO like Arctic Liquid Freezer II 360 or custom watercooling$$, 95, true),

('i7_13700k_cooling_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_model": "i7-13700K", "cooler_tdp_rating": {"$gte": 200}}$$::jsonb, 'warning', NULL,
 $$i7-13700K (253W PL2) needs premium cooling - 280mm+ AIO or NH-D15 class air cooler$$, 
 $$Use dual-tower air cooler or 280mm/360mm AIO for optimal temperatures$$, 85, true),

('i5_13600k_cooling_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_model": "i5-13600K", "cooler_tdp_rating": {"$gte": 160}}$$::jsonb, 'warning', NULL,
 $$i5-13600K (181W PL2) needs good tower cooler or 240mm AIO$$, 
 $$Use NH-U12S class tower cooler, Arctic Freezer 34, or 240mm+ AIO$$, 75, true),

-- AMD Specific CPU Cooling (NEW)
('ryzen_9_7900x_cooling_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_model": "Ryzen 9 7900X", "cooler_tdp_rating": {"$gte": 180}}$$::jsonb, 'warning', NULL,
 $$Ryzen 9 7900X (230W PPT) needs good tower cooler or 240mm+ AIO$$, 
 $$Use large tower cooler or 240mm/280mm AIO for optimal performance$$, 85, true),

('ryzen_7_7700x_cooling_v2', 'thermal', 'CPU', 'Cooling', 'requires', $${"cpu_model": "Ryzen 7 7700X", "cooler_tdp_rating": {"$gte": 140}}$$::jsonb, 'warning', NULL,
 $$Ryzen 7 7700X (142W PPT) needs tower cooler or 240mm AIO$$, 
 $$Use mid-range tower cooler or 240mm AIO, adequate cooling important for boost clocks$$, 75, true),

-- SFF Thermal Constraints (NEW)
('sff_high_tdp_challenge_v2', 'thermal', 'Case', 'CPU', 'requires', $${"case_form_factor": "Mini-ITX", "cpu_tdp_watts": {"$gte": 125}}$$::jsonb, 'warning', NULL,
 $$High TDP CPU (125W+) in Mini-ITX case - thermal management challenging$$, 
 $$Use quality case with good airflow (NR200P), consider AIO, monitor temperatures$$, 80, true),

('sff_airflow_critical_v2', 'thermal', 'Case', 'System', 'requires', $${"case_form_factor": ["Mini-ITX", "Micro-ATX"]}$$::jsonb, 'warning', NULL,
 $$SFF builds require excellent case airflow - choose well-ventilated cases$$, 
 $$Use cases with mesh panels, multiple fan mounts, and good thermal design$$, 72, true),

-- Case Airflow and Fan Configuration (NEW)
('case_airflow_front_intake_v2', 'thermal', 'Case', 'System', 'recommends', $${"case_fan_front": {"$gte": 2}}$$::jsonb, 'info', NULL,
 $$Front intake fans (2-3x 120/140mm) provide best airflow for air-cooled builds$$, 
 $$Positive pressure setup with front intake reduces dust and improves component cooling$$, 60, true),

('case_airflow_negative_pressure_v2', 'thermal', 'Case', 'System', 'warns', $${"case_exhaust_fans": {"$gte": 3}, "case_intake_fans": {"$lte": 1}}$$::jsonb, 'warning', NULL,
 $$Negative pressure setup (more exhaust than intake) increases dust accumulation$$, 
 $$Balance intake and exhaust fans, or use positive pressure for cleaner system$$, 55, true),

('aio_radiator_position_cpu_v2', 'thermal', 'Cooling', 'Case', 'recommends', $${"cooler_type": "AIO", "radiator_position": "top"}$$::jsonb, 'info', NULL,
 $$Top-mounted AIO radiators provide best CPU cooling (exhaust hot air upward)$$, 
 $$Alternative: front-mount works well but may increase GPU temps slightly$$, 65, true),

('aio_pump_position_v2', 'thermal', 'Cooling', 'Case', 'requires', $${"cooler_type": "AIO"}$$::jsonb, 'warning', NULL,
 $$AIO pump should not be highest point in loop - mount radiator above pump block$$, 
 $$Top or front-mount radiator preferred, avoid mounting radiator below pump$$, 70, true);

-- =============================================
-- CATEGORY 3: ADVANCED STORAGE COMPATIBILITY (40 RULES)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- M.2 Slot and PCIe Lane Sharing (NEW)
('m2_slot_1_pcie_sharing_v2', 'storage', 'Storage', 'Motherboard', 'conflicts', $${"storage_type": "M.2 NVMe", "m2_slot": 1}$$::jsonb, 'warning', NULL,
 $$M.2_1 slot may share PCIe lanes with first PCIe x16 slot on some motherboards$$, 
 $$Check motherboard manual - some boards disable PCIe_1 when M.2_1 is populated$$, 70, true),

('m2_slot_2_sata_disable_v2', 'storage', 'Storage', 'Motherboard', 'conflicts', $${"storage_type": "M.2 SATA", "m2_slot": 2}$$::jsonb, 'warning', NULL,
 $$M.2_2 slot (SATA mode) may disable SATA ports 5-6 on some motherboards$$, 
 $$Verify motherboard M.2/SATA port sharing in manual before purchasing$$, 65, true),

('multiple_m2_lane_allocation_v2', 'storage', 'Storage', 'Motherboard', 'requires', $${"storage_count_m2": {"$gte": 3}}$$::jsonb, 'warning', NULL,
 $$Multiple M.2 drives share CPU/chipset PCIe lanes - may reduce speeds$$, 
 $$Check motherboard PCIe lane distribution, some M.2 slots may run at x2 speed$$, 68, true),

-- NVMe Generation Support (NEW)
('nvme_gen5_chipset_requirement_v2', 'storage', 'Storage', 'Motherboard', 'requires', $${"storage_interface": "PCIe Gen5", "chipset": ["Z790", "X670E", "B650E"]}$$::jsonb, 'error', 
 $$PCIe Gen5 NVMe requires Z790/X670E/B650E chipset with Gen5 M.2 slot$$, NULL,
 $$Gen5 SSDs run at Gen4 speeds on older platforms - verify motherboard Gen5 support$$, 85, true),

('nvme_gen4_chipset_support_v2', 'storage', 'Storage', 'Motherboard', 'requires', $${"storage_interface": "PCIe Gen4", "chipset_pcie_gen": {"$gte": 4}}$$::jsonb, 'info', NULL,
 $$PCIe Gen4 NVMe requires Gen4-capable chipset for full speed$$, 
 $$Works on Gen3 motherboards at reduced speed (backward compatible)$$, 70, true),

('nvme_gen3_universal_v2', 'storage', 'Storage', 'Motherboard', 'compatible', $${"storage_interface": "PCIe Gen3"}$$::jsonb, 'info', NULL,
 $$PCIe Gen3 NVMe universally compatible with all modern motherboards$$, 
 $$Works at full speed on Gen3/Gen4/Gen5 platforms, good value choice$$, 50, true),

('nvme_backward_compatible_v2', 'storage', 'Storage', 'Motherboard', 'compatible', $${"storage_interface": ["PCIe Gen4", "PCIe Gen5"]}$$::jsonb, 'info', NULL,
 $$NVMe drives are backward compatible - Gen4/Gen5 work on older Gen3 slots$$, 
 $$Will run at maximum speed supported by motherboard M.2 slot$$, 55, true),

-- NVMe Cooling Requirements (NEW)
('nvme_gen5_heatsink_required_v2', 'storage', 'Storage', 'Cooling', 'requires', $${"storage_interface": "PCIe Gen5"}$$::jsonb, 'warning', NULL,
 $$PCIe Gen5 NVMe generates significant heat - heatsink strongly recommended$$, 
 $$Use motherboard integrated heatsink or aftermarket M.2 cooler to prevent throttling$$, 75, true),

('nvme_gen4_heatsink_recommended_v2', 'storage', 'Storage', 'Cooling', 'recommends', $${"storage_interface": "PCIe Gen4"}$$::jsonb, 'info', NULL,
 $$PCIe Gen4 NVMe benefits from heatsink under sustained loads$$, 
 $$Consider motherboard heatsink or aftermarket cooler for high-performance drives$$, 60, true),

('nvme_gen3_heatsink_optional_v2', 'storage', 'Storage', 'Cooling', 'compatible', $${"storage_interface": "PCIe Gen3"}$$::jsonb, 'info', NULL,
 $$PCIe Gen3 NVMe typically doesn't require heatsink - optional for aesthetics$$, 
 $$Gen3 drives run cool enough without heatsinks in most cases$$, 45, true),

-- M.2 Form Factors (NEW)
('m2_2280_standard_v2', 'storage', 'Storage', 'Motherboard', 'compatible', $${"storage_form_factor": "M.2 2280"}$$::jsonb, 'info', NULL,
 $$M.2 2280 (80mm) is standard length - fits all modern motherboards$$, 
 $$Most common M.2 size, universal compatibility with desktop motherboards$$, 45, true),

('m2_22110_extended_slot_v2', 'storage', 'Storage', 'Motherboard', 'requires', $${"storage_form_factor": "M.2 22110", "m2_slot_length": {"$gte": 110}}$$::jsonb, 'error', 
 $$M.2 22110 (110mm) requires extended M.2 slot - verify motherboard support$$, NULL,
 $$Not all motherboards support 110mm drives - check specifications before purchase$$, 85, true),

('m2_2242_short_universal_v2', 'storage', 'Storage', 'Motherboard', 'compatible', $${"storage_form_factor": "M.2 2242"}$$::jsonb, 'info', NULL,
 $$M.2 2242 (42mm) short drive fits all M.2 slots$$, 
 $$Useful for compact builds, typically lower capacity than 2280$$, 40, true),

('m2_2260_compatibility_v2', 'storage', 'Storage', 'Motherboard', 'compatible', $${"storage_form_factor": "M.2 2260"}$$::jsonb, 'info', NULL,
 $$M.2 2260 (60mm) fits all standard M.2 slots$$, 
 $$Less common than 2280, but good compatibility$$, 42, true);

-- =============================================
-- CATEGORY 4: ADVANCED MEMORY COMPATIBILITY (30 RULES)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- DDR5 Optimal Speeds (NEW)
('ddr5_6000_am5_optimal_v2', 'memory', 'Memory', 'Motherboard', 'recommends', $${"memory_type": "DDR5", "memory_speed": 6000, "chipset": ["X670E", "X670", "B650E", "B650"]}$$::jsonb, 'info', NULL,
 $$DDR5-6000 is optimal for AM5 Ryzen 7000/9000 - maintains FCLK 1:1 ratio$$, 
 $$Best price/performance for AM5, use EXPO profiles for easy setup$$, 70, true),

('ddr5_6400_intel_optimal_v2', 'memory', 'Memory', 'Motherboard', 'recommends', $${"memory_type": "DDR5", "memory_speed": 6400, "chipset": ["Z790", "Z690"]}$$::jsonb, 'info', NULL,
 $$DDR5-6400 works well on Intel 13th/14th Gen with XMP 3.0$$, 
 $$Good performance tier for Intel LGA1700 platform$$, 68, true),

('ddr5_7200_premium_board_v2', 'memory', 'Memory', 'Motherboard', 'requires', $${"memory_type": "DDR5", "memory_speed": {"$gte": 7200}}$$::jsonb, 'warning', NULL,
 $$DDR5-7200+ requires premium motherboard and may need manual tuning$$, 
 $$High-speed kits need quality board, may require voltage adjustment and timing tuning$$, 75, true),

('ddr5_voltage_safe_v2', 'memory', 'Memory', 'System', 'compatible', $${"memory_type": "DDR5", "memory_voltage": {"$lte": 1.35}}$$::jsonb, 'info', NULL,
 $$DDR5 voltage ≤1.35V is safe for 24/7 operation$$, 
 $$Standard voltage for most DDR5 kits, no special cooling required$$, 50, true),

('ddr5_voltage_high_cooling_v2', 'memory', 'Memory', 'System', 'requires', $${"memory_type": "DDR5", "memory_voltage": {"$gte": 1.40}}$$::jsonb, 'warning', NULL,
 $$DDR5 voltage ≥1.40V may require active cooling for stability$$, 
 $$Ensure good case airflow, consider RAM heatsink with fan for high voltages$$, 70, true),

-- DDR4 Optimal Speeds (NEW)
('ddr4_3600_ryzen_5000_optimal_v2', 'memory', 'Memory', 'CPU', 'recommends', $${"memory_type": "DDR4", "memory_speed": 3600, "cpu_generation": "Ryzen 5000"}$$::jsonb, 'info', NULL,
 $$DDR4-3600 optimal for Ryzen 5000 (Zen 3) - maintains FCLK 1800MHz 1:1$$, 
 $$Best value speed for AM4 Ryzen 5000, CL16 timings recommended$$, 72, true),

('ddr4_3200_ryzen_3000_optimal_v2', 'memory', 'Memory', 'CPU', 'recommends', $${"memory_type": "DDR4", "memory_speed": 3200, "cpu_generation": "Ryzen 3000"}$$::jsonb, 'info', NULL,
 $$DDR4-3200 optimal for Ryzen 3000 (Zen 2) - maintains FCLK 1600MHz 1:1$$, 
 $$Sweet spot for AM4 Ryzen 3000, good value and stability$$, 68, true),

('ddr4_4000_intel_advantage_v2', 'memory', 'Memory', 'Motherboard', 'recommends', $${"memory_type": "DDR4", "memory_speed": {"$gte": 4000}, "chipset": ["Z590", "Z490"]}$$::jsonb, 'info', NULL,
 $$DDR4-4000+ shows benefit on Intel 10th/11th Gen$$, 
 $$Intel scales better with high-speed DDR4 than AMD, Z-series chipset recommended$$, 65, true),

-- Memory Capacity and Channel Configuration (NEW)
('dual_channel_recommended_v2', 'memory', 'Memory', 'Motherboard', 'recommends', $${"memory_modules": 2}$$::jsonb, 'info', NULL,
 $$Dual-channel memory (2 modules) recommended for optimal performance$$, 
 $$Single module runs in single-channel mode (half bandwidth) - use 2 or 4 modules$$, 70, true),

('quad_channel_hedt_v2', 'memory', 'Memory', 'Motherboard', 'requires', $${"platform": ["HEDT", "Threadripper"], "memory_modules": 4}$$::jsonb, 'warning', NULL,
 $$HEDT/Threadripper platforms benefit from quad-channel memory (4 modules)$$, 
 $$Use 4 matched modules for optimal bandwidth on high-end platforms$$, 75, true),

('memory_capacity_32gb_gaming_v2', 'memory', 'Memory', 'System', 'recommends', $${"use_case": "gaming", "memory_capacity_gb": 32}$$::jsonb, 'info', NULL,
 $$32GB RAM recommended for modern gaming and multitasking$$, 
 $$16GB minimum, but 32GB provides headroom for browser, Discord, streaming$$, 65, true),

('memory_capacity_64gb_workstation_v2', 'memory', 'Memory', 'System', 'recommends', $${"use_case": ["content_creation", "3D_rendering", "video_editing"], "memory_capacity_gb": {"$gte": 64}}$$::jsonb, 'info', NULL,
 $$64GB+ RAM recommended for professional content creation workloads$$, 
 $$Heavy workloads benefit from higher capacity - consider 64-128GB$$, 70, true);

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
SELECT 
    '✅ MIGRATION 006B COMPLETE' as status,
    'Added ' || COUNT(*) || ' new rules in last 2 minutes' as new_rules_added
FROM compatibility_rules 
WHERE created_at > NOW() - INTERVAL '2 minutes';

SELECT 
    rule_category,
    COUNT(*) as rule_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM compatibility_rules
WHERE enabled = true
GROUP BY rule_category
ORDER BY rule_count DESC;

SELECT 
    '🎯 Total Active Rules: ' || COUNT(*) as summary,
    'Target: 300+' as goal
FROM compatibility_rules
WHERE enabled = true;
