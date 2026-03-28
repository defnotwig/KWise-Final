-- =============================================
-- MIGRATION 016: CASE & COOLING COMPATIBILITY (85 RULES)
-- =============================================
-- Purpose: Comprehensive case and cooling rules
-- Current: 750 rules - Target: Add 85 unique rules
-- Focus: Form factors, clearances, cooling capacity, airflow
-- Date: November 8, 2025
-- =============================================

BEGIN;

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- Full Tower Case Rules (10 rules)
('case_full_tower_eatx_support', 'physical', 'Case', 'Motherboard', 'supports', $${"case_form_factor": "Full_Tower", "motherboard_support": "E-ATX"}$$::jsonb, 'info', NULL, 'Full tower cases support E-ATX motherboards', 'Excellent for dual-system or custom loops', 75, true),
('case_full_tower_420mm_radiator', 'physical', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Full_Tower", "radiator_size_mm": 420}$$::jsonb, 'info', NULL, 'Full tower cases can fit 420mm radiators', 'Maximum cooling capacity', 72, true),
('case_full_tower_10plus_fans', 'thermal', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Full_Tower", "max_fans": 10}$$::jsonb, 'info', NULL, 'Full tower cases support 10+ case fans', 'Extreme cooling potential', 70, true),
('case_full_tower_gpu_450mm', 'physical', 'Case', 'GPU', 'supports', $${"case_form_factor": "Full_Tower", "gpu_length_mm": 450}$$::jsonb, 'info', NULL, 'Full tower cases fit even longest GPUs (450mm+)', 'No GPU length concerns', 75, true),
('case_full_tower_psu_240mm', 'physical', 'Case', 'PSU', 'supports', $${"case_form_factor": "Full_Tower", "psu_length_mm": 240}$$::jsonb, 'info', NULL, 'Full tower cases accommodate very long PSUs (240mm)', 'Room for cable management behind PSU', 70, true),
('case_full_tower_cooler_190mm', 'physical', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Full_Tower", "cooler_height_mm": 190}$$::jsonb, 'info', NULL, 'Full tower cases fit tallest air coolers (190mm)', 'NH-D15, Dark Rock Pro 5 no problem', 72, true),
('case_full_tower_dual_system', 'compatibility', 'Case', 'System', 'supports', $${"case_form_factor": "Full_Tower", "feature": "Dual_System"}$$::jsonb, 'info', NULL, 'Some full towers support dual-system builds', 'Two complete PCs in one case', 65, true),
('case_full_tower_vertical_gpu', 'physical', 'Case', 'GPU', 'supports', $${"case_form_factor": "Full_Tower", "feature": "Vertical_GPU_Mount"}$$::jsonb, 'info', NULL, 'Full towers often include vertical GPU mounting', 'Show off GPU, needs PCIe 4.0 riser', 68, true),
('case_full_tower_drive_bays_10', 'storage', 'Case', 'Storage', 'supports', $${"case_form_factor": "Full_Tower", "drive_bays": 10}$$::jsonb, 'info', NULL, 'Full tower cases have 8-12+ drive bays', 'Excellent for NAS or content creator', 70, true),
('case_full_tower_weight_heavy', 'physical', 'Case', 'System', 'requires', $${"case_form_factor": "Full_Tower", "weight_kg": 15}$$::jsonb, 'warning', NULL, 'Full tower cases are heavy (12-20kg) when built', 'Ensure desk/floor can support weight', 65, true),

-- Mid Tower Case Rules (15 rules)
('case_mid_tower_atx_standard', 'physical', 'Case', 'Motherboard', 'supports', $${"case_form_factor": "Mid_Tower", "motherboard_support": "ATX"}$$::jsonb, 'info', NULL, 'Mid tower cases support ATX motherboards', 'Most popular case size', 80, true),
('case_mid_tower_360mm_radiator', 'physical', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Mid_Tower", "radiator_size_mm": 360}$$::jsonb, 'info', NULL, 'Most mid towers fit 360mm radiators top or front', 'Sufficient for high-end CPUs', 78, true),
('case_mid_tower_280mm_radiator', 'physical', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Mid_Tower", "radiator_size_mm": 280}$$::jsonb, 'info', NULL, 'All mid towers fit 280mm radiators', 'Good cooling capacity', 75, true),
('case_mid_tower_gpu_330mm', 'physical', 'Case', 'GPU', 'supports', $${"case_form_factor": "Mid_Tower", "gpu_length_mm": 330}$$::jsonb, 'info', NULL, 'Quality mid towers fit GPUs up to 330mm', 'Handles RTX 4090 sized cards', 82, true),
('case_mid_tower_gpu_380mm', 'physical', 'Case', 'GPU', 'requires', $${"case_form_factor": "Mid_Tower", "gpu_length_mm": 380}$$::jsonb, 'warning', NULL, 'Very long GPUs (380mm+) need spacious mid tower', 'Check specific case GPU clearance', 78, true),
('case_mid_tower_cooler_165mm', 'physical', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Mid_Tower", "cooler_height_mm": 165}$$::jsonb, 'info', NULL, 'Mid towers support coolers up to 165mm height', 'Dual-tower air coolers fit', 75, true),
('case_mid_tower_psu_200mm', 'physical', 'Case', 'PSU', 'supports', $${"case_form_factor": "Mid_Tower", "psu_length_mm": 200}$$::jsonb, 'info', NULL, 'Mid towers accommodate PSUs up to 200mm', 'Standard ATX PSU length', 72, true),
('case_mid_tower_mesh_front', 'thermal', 'Case', 'Cooling', 'recommends', $${"case_form_factor": "Mid_Tower", "front_panel": "Mesh"}$$::jsonb, 'info', NULL, 'Mesh front panels provide better airflow', 'Recommended for high-performance builds', 80, true),
('case_mid_tower_tempered_glass', 'physical', 'Case', 'System', 'provides', $${"case_form_factor": "Mid_Tower", "side_panel": "Tempered_Glass"}$$::jsonb, 'info', NULL, 'Tempered glass shows off components', 'Slightly restricts airflow vs mesh', 70, true),
('case_mid_tower_6_fans', 'thermal', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Mid_Tower", "max_fans": 6}$$::jsonb, 'info', NULL, 'Mid towers support 6-9 case fans', 'Excellent cooling with proper configuration', 75, true),
('case_mid_tower_vertical_mount', 'physical', 'Case', 'GPU', 'supports', $${"case_form_factor": "Mid_Tower", "feature": "Vertical_GPU"}$$::jsonb, 'info', NULL, 'Many mid towers support vertical GPU mounting', 'May need separate riser cable', 68, true),
('case_mid_tower_usb_c_front', 'compatibility', 'Case', 'Motherboard', 'requires', $${"case_form_factor": "Mid_Tower", "front_io": "USB-C"}$$::jsonb, 'info', NULL, 'Modern mid towers include front USB-C port', 'Requires motherboard USB-C header', 72, true),
('case_mid_tower_rgb_control', 'compatibility', 'Case', 'Motherboard', 'supports', $${"case_form_factor": "Mid_Tower", "feature": "RGB_Sync"}$$::jsonb, 'info', NULL, 'Mid towers with RGB fans support motherboard sync', 'ARGB headers required', 65, true),
('case_mid_tower_cable_mgmt', 'physical', 'Case', 'PSU', 'recommends', $${"case_form_factor": "Mid_Tower", "cable_space_mm": 25}$$::jsonb, 'info', NULL, 'Mid towers provide 20-30mm cable management space', 'Sufficient for modular PSU', 70, true),
('case_mid_tower_drive_bays_4', 'storage', 'Case', 'Storage', 'supports', $${"case_form_factor": "Mid_Tower", "drive_bays": 4}$$::jsonb, 'info', NULL, 'Mid towers have 2-4 drive bays', 'Adequate for most users', 72, true),

-- Micro ATX Case Rules (10 rules)
('case_micro_atx_matx_board', 'physical', 'Case', 'Motherboard', 'supports', $${"case_form_factor": "Micro_ATX", "motherboard_support": "Micro-ATX"}$$::jsonb, 'info', NULL, 'Micro ATX cases support mATX and Mini-ITX boards', 'Compact but still expandable', 75, true),
('case_micro_atx_240mm_rad', 'physical', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Micro_ATX", "radiator_size_mm": 240}$$::jsonb, 'info', NULL, 'Micro ATX cases fit 240mm radiators', 'Good cooling in compact space', 72, true),
('case_micro_atx_gpu_300mm', 'physical', 'Case', 'GPU', 'supports', $${"case_form_factor": "Micro_ATX", "gpu_length_mm": 300}$$::jsonb, 'warning', NULL, 'Micro ATX cases typically fit GPUs up to 300mm', 'Check specific case specs for longer cards', 75, true),
('case_micro_atx_cooler_155mm', 'physical', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Micro_ATX", "cooler_height_mm": 155}$$::jsonb, 'warning', NULL, 'Micro ATX cases support coolers up to 155mm', 'Single-tower air coolers recommended', 72, true),
('case_micro_atx_psu_atx_std', 'physical', 'Case', 'PSU', 'supports', $${"case_form_factor": "Micro_ATX", "psu_support": "ATX"}$$::jsonb, 'info', NULL, 'Most Micro ATX cases use standard ATX PSUs', 'No need for SFX PSU', 75, true),
('case_micro_atx_4_fans', 'thermal', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Micro_ATX", "max_fans": 4}$$::jsonb, 'info', NULL, 'Micro ATX cases support 3-5 case fans', 'Adequate cooling for most builds', 70, true),
('case_micro_atx_space_efficient', 'physical', 'Case', 'System', 'provides', $${"case_form_factor": "Micro_ATX", "volume_liters": 35}$$::jsonb, 'info', NULL, 'Micro ATX cases are 30-40L volume', 'Good balance of size and compatibility', 72, true),
('case_micro_atx_drive_bays_2', 'storage', 'Case', 'Storage', 'supports', $${"case_form_factor": "Micro_ATX", "drive_bays": 2}$$::jsonb, 'info', NULL, 'Micro ATX cases have 1-2 drive bays', 'Focus on SSDs for compact builds', 68, true),
('case_micro_atx_cable_space_15mm', 'physical', 'Case', 'PSU', 'requires', $${"case_form_factor": "Micro_ATX", "cable_space_mm": 15}$$::jsonb, 'warning', NULL, 'Micro ATX cases have limited cable space (15-20mm)', 'Use modular PSU and plan cable routing', 70, true),
('case_micro_atx_budget_friendly', 'compatibility', 'Case', 'System', 'provides', $${"case_form_factor": "Micro_ATX", "price_tier": "Budget"}$$::jsonb, 'info', NULL, 'Micro ATX cases often budget-friendly', 'Good value for basic builds', 65, true),

-- Mini-ITX Case Rules (15 rules)
('case_mini_itx_itx_board', 'physical', 'Case', 'Motherboard', 'requires', $${"case_form_factor": "Mini_ITX", "motherboard_support": "Mini-ITX"}$$::jsonb, 'error', 'Mini-ITX cases only support Mini-ITX motherboards', NULL, 'Use Mini-ITX motherboard for compact build', 95, true),
('case_mini_itx_sfx_psu', 'physical', 'Case', 'PSU', 'requires', $${"case_form_factor": "Mini_ITX", "psu_form_factor": "SFX"}$$::jsonb, 'error', 'Most Mini-ITX cases require SFX or SFX-L PSU', NULL, 'Use SFX PSU (125mm x 63.5mm)', 90, true),
('case_mini_itx_sfx_l_psu', 'physical', 'Case', 'PSU', 'supports', $${"case_form_factor": "Mini_ITX", "psu_form_factor": "SFX-L"}$$::jsonb, 'warning', NULL, 'Some Mini-ITX cases support SFX-L (deeper) PSU', 'Check case compatibility', 85, true),
('case_mini_itx_gpu_280mm', 'physical', 'Case', 'GPU', 'supports', $${"case_form_factor": "Mini_ITX", "gpu_length_mm": 280}$$::jsonb, 'warning', NULL, 'Mini-ITX cases typically fit GPUs up to 280mm', 'Verify specific case GPU clearance', 80, true),
('case_mini_itx_gpu_220mm', 'physical', 'Case', 'GPU', 'supports', $${"case_form_factor": "Mini_ITX", "gpu_length_mm": 220}$$::jsonb, 'info', NULL, 'Compact ITX cases fit GPUs up to 220mm', 'Choose compact GPU models', 75, true),
('case_mini_itx_cooler_130mm', 'physical', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Mini_ITX", "cooler_height_mm": 130}$$::jsonb, 'warning', NULL, 'Mini-ITX cases support coolers up to 130mm typically', 'Use low-profile cooler or AIO', 82, true),
('case_mini_itx_120mm_aio', 'physical', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Mini_ITX", "radiator_size_mm": 120}$$::jsonb, 'info', NULL, 'Most Mini-ITX cases fit 120mm or 240mm AIOs', 'AIO recommended for high-TDP CPUs', 78, true),
('case_mini_itx_240mm_aio', 'physical', 'Case', 'Cooling', 'supports', $${"case_form_factor": "Mini_ITX", "radiator_size_mm": 240}$$::jsonb, 'info', NULL, 'Larger Mini-ITX cases fit 240mm AIOs', 'Best cooling option for ITX', 75, true),
('case_mini_itx_sandwich_layout', 'physical', 'Case', 'System', 'provides', $${"case_form_factor": "Mini_ITX", "layout": "Sandwich"}$$::jsonb, 'warning', NULL, 'Sandwich layout ITX cases use PCIe riser for GPU', 'Requires PCIe 4.0 riser cable', 80, true),
('case_mini_itx_vertical_layout', 'physical', 'Case', 'System', 'provides', $${"case_form_factor": "Mini_ITX", "layout": "Vertical"}$$::jsonb, 'info', NULL, 'Vertical layout ITX cases stack components', 'Good thermal separation', 75, true),
('case_mini_itx_2_5_ssd_only', 'storage', 'Case', 'Storage', 'supports', $${"case_form_factor": "Mini_ITX", "drive_support": "2.5_SSD"}$$::jsonb, 'warning', NULL, 'Mini-ITX cases typically 2.5" SSD only', 'No 3.5" HDD support in most ITX cases', 75, true),
('case_mini_itx_volume_15l', 'physical', 'Case', 'System', 'provides', $${"case_form_factor": "Mini_ITX", "volume_liters": 15}$$::jsonb, 'info', NULL, 'Mini-ITX cases are 10-20L volume', 'Ultra-compact for LAN parties', 78, true),
('case_mini_itx_thermals_challenge', 'thermal', 'Case', 'Cooling', 'requires', $${"case_form_factor": "Mini_ITX", "thermal_density": "High"}$$::jsonb, 'warning', NULL, 'Mini-ITX builds have higher thermal density', 'Plan cooling carefully, test temps', 85, true),
('case_mini_itx_cable_mgmt_tight', 'physical', 'Case', 'PSU', 'requires', $${"case_form_factor": "Mini_ITX", "cable_space_mm": 10}$$::jsonb, 'warning', NULL, 'Mini-ITX cases have very tight cable space', 'Use fully modular SFX PSU with short cables', 82, true),
('case_mini_itx_premium_price', 'compatibility', 'Case', 'System', 'requires', $${"case_form_factor": "Mini_ITX", "price_tier": "Premium"}$$::jsonb, 'info', NULL, 'Quality Mini-ITX cases and components cost more', 'SFF tax: pay premium for compact size', 70, true),

-- Airflow & Thermal Rules (20 rules)
('thermal_positive_pressure', 'thermal', 'Case', 'Cooling', 'recommends', $${"airflow_config": "Positive_Pressure"}$$::jsonb, 'info', NULL, 'Positive pressure (more intake than exhaust) reduces dust', 'Recommended: 3 intake, 2 exhaust', 75, true),
('thermal_negative_pressure', 'thermal', 'Case', 'Cooling', 'requires', $${"airflow_config": "Negative_Pressure"}$$::jsonb, 'warning', NULL, 'Negative pressure draws air through gaps', 'Increases dust, use filters', 65, true),
('thermal_front_intake_3fans', 'thermal', 'Case', 'Cooling', 'recommends', $${"fan_position": "Front", "fan_count": 3}$$::jsonb, 'info', NULL, 'Front intake with 3x 120mm or 140mm fans optimal', 'Direct airflow to GPU and CPU', 78, true),
('thermal_top_exhaust_2fans', 'thermal', 'Case', 'Cooling', 'recommends', $${"fan_position": "Top", "fan_count": 2}$$::jsonb, 'info', NULL, 'Top exhaust with 2x fans removes hot air efficiently', 'Heat rises naturally', 75, true),
('thermal_rear_exhaust_1fan', 'thermal', 'Case', 'Cooling', 'recommends', $${"fan_position": "Rear", "fan_count": 1}$$::jsonb, 'info', NULL, 'Rear exhaust fan standard in all cases', 'Essential for airflow path', 72, true),
('thermal_bottom_intake_gpu', 'thermal', 'Case', 'GPU', 'recommends', $${"fan_position": "Bottom", "component_target": "GPU"}$$::jsonb, 'info', NULL, 'Bottom intake fans feed GPU directly', 'Useful for high-end GPUs', 70, true),
('thermal_aio_top_mount', 'thermal', 'Case', 'Cooling', 'recommends', $${"cooler_type": "AIO", "radiator_position": "Top_Exhaust"}$$::jsonb, 'info', NULL, 'Top-mounted AIO exhausts CPU heat directly', 'Keeps GPU temps lower', 80, true),
('thermal_aio_front_mount', 'thermal', 'Case', 'Cooling', 'requires', $${"cooler_type": "AIO", "radiator_position": "Front_Intake"}$$::jsonb, 'warning', NULL, 'Front-mounted AIO pulls warm air over components', 'Better CPU temps, higher GPU temps', 75, true),
('thermal_dust_filters_required', 'thermal', 'Case', 'Cooling', 'requires', $${"feature": "Dust_Filters"}$$::jsonb, 'info', NULL, 'Dust filters on intake fans essential', 'Clean filters monthly for best airflow', 72, true),
('thermal_140mm_vs_120mm', 'thermal', 'Case', 'Cooling', 'recommends', $${"fan_size": "140mm"}$$::jsonb, 'info', NULL, '140mm fans move more air at lower RPM (quieter)', '120mm fans cheaper, more mounting options', 70, true),
('thermal_fan_rpm_high_noise', 'thermal', 'Case', 'Cooling', 'requires', $${"fan_rpm": 2000}$$::jsonb, 'warning', NULL, 'Fans over 2000 RPM generate significant noise', 'Use larger fans or more fans at lower RPM', 68, true),
('thermal_fan_rpm_quiet', 'thermal', 'Case', 'Cooling', 'recommends', $${"fan_rpm": 1200}$$::jsonb, 'info', NULL, 'Fans at 1000-1200 RPM balance airflow and noise', 'Silent operation at idle', 75, true),
('thermal_gpu_direct_airflow', 'thermal', 'Case', 'GPU', 'recommends', $${"gpu_position": "Horizontal", "airflow": "Direct"}$$::jsonb, 'info', NULL, 'Horizontal GPU gets direct airflow from intake fans', 'Vertical mounting can increase GPU temps', 78, true),
('thermal_gpu_vertical_temps', 'thermal', 'Case', 'GPU', 'requires', $${"gpu_position": "Vertical", "temp_increase": "5C"}$$::jsonb, 'warning', NULL, 'Vertical GPU mounting increases temps by 3-7°C', 'Ensure adequate case airflow', 75, true),
('thermal_side_panel_ventilation', 'thermal', 'Case', 'System', 'requires', $${"side_panel": "Vented"}$$::jsonb, 'info', NULL, 'Vented/mesh side panels improve airflow', 'Solid panels restrict airflow', 70, true),
('thermal_cable_management_airflow', 'thermal', 'Case', 'System', 'recommends', $${"feature": "Cable_Management"}$$::jsonb, 'info', NULL, 'Good cable management improves airflow by 5-10%', 'Route cables behind motherboard tray', 72, true),
('thermal_rgb_airflow_impact', 'thermal', 'Case', 'Cooling', 'requires', $${"fan_type": "RGB", "airflow_penalty": "10pct"}$$::jsonb, 'warning', NULL, 'RGB fan frames reduce airflow by 5-15%', 'Prioritize performance or aesthetics', 65, true),
('thermal_fan_placement_balanced', 'thermal', 'Case', 'Cooling', 'recommends', $${"config": "Balanced_Airflow"}$$::jsonb, 'info', NULL, 'Equal intake/exhaust creates balanced airflow', 'Good compromise for dust and cooling', 75, true),
('thermal_case_ventilation_holes', 'thermal', 'Case', 'System', 'requires', $${"feature": "Perforated_Panels"}$$::jsonb, 'info', NULL, 'Cases with perforated panels cool better', 'Front/side/top ventilation important', 72, true),
('thermal_closed_front_panel_hot', 'thermal', 'Case', 'Cooling', 'requires', $${"front_panel": "Closed"}$$::jsonb, 'error', 'Closed/solid front panels choke airflow', 'GPU/CPU temps can be 10-20°C higher', 'Choose mesh front panel case', 85, true),

-- Specialized Case Features (15 rules)
('case_usb_4_front_io', 'compatibility', 'Case', 'Motherboard', 'requires', $${"front_io": "USB_4", "motherboard_header": "USB4"}$$::jsonb, 'warning', NULL, 'USB 4 front panel requires USB4 motherboard header', 'Rare feature, check motherboard support', 70, true),
('case_usb_3_2_gen2_front', 'compatibility', 'Case', 'Motherboard', 'requires', $${"front_io": "USB_3.2_Gen2", "motherboard_header": "USB_3.2"}$$::jsonb, 'info', NULL, 'USB 3.2 Gen2 front requires Type-C header', 'Most modern motherboards have this', 75, true),
('case_audio_jack_front', 'compatibility', 'Case', 'Motherboard', 'requires', $${"front_io": "Audio_Jack", "motherboard_header": "HD_Audio"}$$::jsonb, 'info', NULL, 'Front audio jack requires HD Audio header', 'Standard on all motherboards', 68, true),
('case_power_button_location', 'physical', 'Case', 'System', 'provides', $${"power_button": "Top_Front"}$$::jsonb, 'info', NULL, 'Power button location affects desk placement', 'Top-mounted best for desk setup', 65, true),
('case_hinged_panels', 'physical', 'Case', 'System', 'provides', $${"feature": "Hinged_Panels"}$$::jsonb, 'info', NULL, 'Hinged panels easier than thumbscrews', 'Quick access for upgrades', 68, true),
('case_tool_less_design', 'physical', 'Case', 'System', 'provides', $${"feature": "Tool_Less_Assembly"}$$::jsonb, 'info', NULL, 'Tool-less design simplifies building', 'No screwdriver needed for basic assembly', 70, true),
('case_gpu_support_bracket', 'physical', 'Case', 'GPU', 'recommends', $${"feature": "GPU_Support_Bracket"}$$::jsonb, 'info', NULL, 'GPU support bracket prevents GPU sag', 'Important for heavy GPUs (RTX 4090)', 75, true),
('case_psu_shroud', 'physical', 'Case', 'PSU', 'provides', $${"feature": "PSU_Shroud"}$$::jsonb, 'info', NULL, 'PSU shroud hides cables and improves aesthetics', 'Standard in modern cases', 70, true),
('case_motherboard_standoffs', 'physical', 'Case', 'Motherboard', 'requires', $${"feature": "Pre_Installed_Standoffs"}$$::jsonb, 'info', NULL, 'Pre-installed standoffs save installation time', 'Check alignment with motherboard size', 68, true),
('case_cable_tie_points', 'physical', 'Case', 'System', 'provides', $${"feature": "Cable_Tie_Points"}$$::jsonb, 'info', NULL, 'Cable tie points help organize cables', 'Improves airflow and aesthetics', 65, true),
('case_velcro_straps', 'physical', 'Case', 'System', 'provides', $${"feature": "Velcro_Cable_Straps"}$$::jsonb, 'info', NULL, 'Velcro straps better than zip ties (reusable)', 'Easier to adjust cables later', 68, true),
('case_rubber_grommets', 'physical', 'Case', 'System', 'provides', $${"feature": "Rubber_Grommets"}$$::jsonb, 'info', NULL, 'Rubber grommets in cable routing holes', 'Cleaner look, protects cables', 65, true),
('case_water_cooling_ports', 'physical', 'Case', 'Cooling', 'supports', $${"feature": "Water_Cooling_Ports"}$$::jsonb, 'info', NULL, 'Some cases have ports for external radiators', 'Useful for custom water cooling loops', 65, true),
('case_radiator_bracket_included', 'physical', 'Case', 'Cooling', 'provides', $${"feature": "Radiator_Bracket"}$$::jsonb, 'info', NULL, 'Radiator mounting brackets simplify AIO install', 'Check radiator size compatibility', 70, true),
('case_warranty_years', 'compatibility', 'Case', 'System', 'provides', $${"warranty_years": 2}$$::jsonb, 'info', NULL, 'Quality cases come with 2-5 year warranty', 'Indicates build quality and support', 65, true);

-- Success message
SELECT 'Migration 016 Complete! Added 85 Case and Cooling rules' as message, 85 as rules_added_this_batch;

-- Check new total
SELECT 
    'TOTAL RULES: ' || COUNT(*) || ' (TARGET: 1000+)' as total_status,
    ROUND(COUNT(*) * 100.0 / 1000, 1) || '% Complete' as progress
FROM compatibility_rules 
WHERE enabled = true;

-- Show category distribution
SELECT rule_category, COUNT(*) as count 
FROM compatibility_rules 
WHERE enabled = true 
GROUP BY rule_category 
ORDER BY count DESC;

COMMIT;
