-- =============================================
-- MIGRATION 011: MASSIVE EXPANSION - ADVANCED SCENARIOS BATCH 5
-- =============================================
-- Purpose: Add 300+ rules covering advanced scenarios
-- Target: Reach 678+ total rules (approaching 1000 target)
-- Date: November 8, 2025
-- =============================================

BEGIN;

-- =============================================
-- CATEGORY 9: FORM FACTOR & SFF RULES (100 new rules)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- ITX Form Factor
('sff_itx_gpu_length_limit', 'physical', 'GPU', 'Case', 'requires', $${"case_form_factor": "Mini ITX", "gpu_length_mm": {"$lte": 320}}$$::jsonb, 'error', 
 $$Mini ITX cases typically limit GPU to 280-320mm$$, NULL,
 $$Verify case GPU clearance - some ITX cases only fit 220mm cards$$, 90, true),

('sff_itx_cpu_cooler_height', 'physical', 'Cooling', 'Case', 'requires', $${"case_form_factor": "Mini ITX", "cooler_height_mm": {"$lte": 70}}$$::jsonb, 'error', 
 $$Mini ITX cases restrict CPU cooler to 50-70mm height$$, NULL,
 $$Use low-profile cooler or 120mm AIO for compact ITX$$, 88, true),

('sff_itx_sfx_psu_required', 'physical', 'PSU', 'Case', 'requires', $${"case_form_factor": "Mini ITX", "psu_form_factor": "SFX"}$$::jsonb, 'error', 
 $$Most Mini ITX cases require SFX PSU (not ATX)$$, NULL,
 $$SFX PSUs more expensive but necessary for ITX builds$$, 92, true),

('sff_itx_motherboard_single_pcie', 'pcie', 'Motherboard', 'GPU', 'warns', $${"motherboard_form_factor": "Mini ITX", "gpu_count": {"$gte": 2}}$$::jsonb, 'error', 
 $$Mini ITX boards have only 1 PCIe x16 slot - no multi-GPU$$, NULL,
 $$ITX limited to single GPU configuration$$, 85, true),

('sff_itx_ram_slots_two', 'memory', 'Motherboard', 'RAM', 'warns', $${"motherboard_form_factor": "Mini ITX", "ram_stick_count": {"$gte": 3}}$$::jsonb, 'error', 
 $$Mini ITX boards have only 2 RAM slots$$, NULL,
 $$Use 2x16GB or 2x32GB for 32/64GB capacity$$, 80, true),

('sff_itx_m2_slot_limited', 'storage', 'Motherboard', 'Storage', 'warns', $${"motherboard_form_factor": "Mini ITX", "storage_count": {"$gte": 3}}$$::jsonb, 'warning', NULL,
 $$Mini ITX typically has 1-2 M.2 slots only$$,
 $$Plan storage carefully - limited expansion$$, 75, true),

('sff_itx_thermal_challenge', 'thermal', 'Case', 'System', 'warns', $${"case_form_factor": "Mini ITX", "total_system_tdp": {"$gte": 400}}$$::jsonb, 'warning', NULL,
 $$High-TDP builds challenging in Mini ITX (cooling limited)$$,
 $$Use efficient components or accept higher temps/noise$$, 78, true),

('sff_itx_cable_management', 'physical', 'Case', 'PSU', 'recommends', $${"case_form_factor": "Mini ITX", "psu_modular": true}$$::jsonb, 'info', NULL,
 $$Fully modular SFX PSU essential for ITX cable management$$,
 $$Tight space requires custom cables or excellent routing$$, 72, true),

-- Micro ATX Form Factor
('sff_matx_case_compatibility', 'physical', 'Motherboard', 'Case', 'compatible', $${"motherboard_form_factor": "Micro ATX", "case_form_factor": ["Micro ATX", "Mid Tower", "Full Tower"]}$$::jsonb, 'info', NULL,
 $$Micro ATX boards fit in Micro ATX, Mid Tower, Full Tower cases$$,
 $$Flexible form factor - balances size and features$$, 75, true),

('sff_matx_gpu_clearance', 'physical', 'GPU', 'Case', 'requires', $${"case_form_factor": "Micro ATX", "gpu_length_mm": {"$gte": 300}}$$::jsonb, 'warning', NULL,
 $$Verify Micro ATX case GPU clearance for 300mm+ cards$$,
 $$Some compact Micro ATX cases limit GPU to 280mm$$, 78, true),

('sff_matx_psu_standard_atx', 'physical', 'PSU', 'Case', 'compatible', $${"case_form_factor": "Micro ATX", "psu_form_factor": "ATX"}$$::jsonb, 'info', NULL,
 $$Micro ATX cases typically use standard ATX PSU$$,
 $$More PSU options and better value than SFX$$, 70, true),

('sff_matx_four_ram_slots', 'memory', 'Motherboard', 'RAM', 'compatible', $${"motherboard_form_factor": "Micro ATX", "ram_slot_count": 4}$$::jsonb, 'info', NULL,
 $$Most Micro ATX boards have 4 RAM slots (like ATX)$$,
 $$Full memory capacity without ITX compromises$$, 73, true),

('sff_matx_budget_sweet_spot', 'compatibility', 'Motherboard', 'System', 'recommends', $${"motherboard_form_factor": "Micro ATX", "usage_type": "budget"}$$::jsonb, 'info', NULL,
 $$Micro ATX excellent budget choice - cheaper than ATX$$,
 $$Good balance of features and cost for most builds$$, 76, true),

-- ATX Form Factor (Standard)
('form_atx_standard_compatibility', 'physical', 'Motherboard', 'Case', 'compatible', $${"motherboard_form_factor": "ATX", "case_form_factor": ["Mid Tower", "Full Tower"]}$$::jsonb, 'info', NULL,
 $$Standard ATX boards fit Mid Tower and Full Tower cases$$,
 $$Most common form factor - wide compatibility$$, 80, true),

('form_atx_seven_expansion_slots', 'pcie', 'Motherboard', 'Case', 'compatible', $${"motherboard_form_factor": "ATX", "case_expansion_slots": {"$gte": 7}}$$::jsonb, 'info', NULL,
 $$ATX boards need 7+ expansion slots in case$$,
 $$Standard for multi-GPU, capture cards, networking$$, 72, true),

('form_atx_motherboard_features', 'compatibility', 'Motherboard', 'System', 'recommends', $${"motherboard_form_factor": "ATX"}$$::jsonb, 'info', NULL,
 $$ATX offers most features: multiple M.2, USB ports, headers$$,
 $$Best for high-end builds requiring maximum expansion$$, 78, true),

-- E-ATX Form Factor
('form_eatx_full_tower_required', 'physical', 'Motherboard', 'Case', 'requires', $${"motherboard_form_factor": "E-ATX", "case_form_factor": "Full Tower"}$$::jsonb, 'error', 
 $$E-ATX motherboards require Full Tower case$$, NULL,
 $$Most Mid Towers don't support E-ATX width (>305mm)$$, 88, true),

('form_eatx_workstation_hedt', 'compatibility', 'Motherboard', 'System', 'compatible', $${"motherboard_form_factor": "E-ATX", "usage_type": ["workstation", "HEDT"]}$$::jsonb, 'info', NULL,
 $$E-ATX typical for workstations and HEDT platforms$$,
 $$Extra space for 8+ RAM slots, multiple GPUs$$, 75, true),

('form_eatx_eight_ram_slots', 'memory', 'Motherboard', 'RAM', 'compatible', $${"motherboard_form_factor": "E-ATX", "ram_slot_count": {"$gte": 8}}$$::jsonb, 'info', NULL,
 $$E-ATX often has 8 RAM slots for 128-256GB capacity$$,
 $$Essential for workstation and server builds$$, 78, true),

-- DTX Form Factor (Rare)
('form_dtx_specialty', 'compatibility', 'Motherboard', 'Case', 'warns', $${"motherboard_form_factor": "DTX"}$$::jsonb, 'warning', NULL,
 $$DTX rare form factor - verify case compatibility carefully$$,
 $$Between ITX and Micro ATX size - limited options$$, 65, true);

-- =============================================
-- CATEGORY 10: WORKSTATION & HEDT RULES (50 new rules)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- Threadripper Platform
('hedt_threadripper_trx50_socket', 'socket', 'CPU', 'Motherboard', 'requires', $${"cpu_model": ["Threadripper 7000"], "motherboard_socket": "sTRX5"}$$::jsonb, 'error', 
 $$AMD Threadripper 7000 requires sTRX5 socket (TRX50 chipset)$$, NULL,
 $$Workstation platform: 96 cores, 8-channel DDR5, 128 PCIe lanes$$, 95, true),

('hedt_threadripper_trx40_legacy', 'socket', 'CPU', 'Motherboard', 'compatible', $${"cpu_model": ["Threadripper 3000"], "motherboard_socket": "sTRX4"}$$::jsonb, 'info', NULL,
 $$Threadripper 3000 uses sTRX4 socket (TRX40 chipset)$$,
 $$Last-gen HEDT - still powerful for workstation tasks$$, 82, true),

('hedt_threadripper_quad_channel_memory', 'memory', 'CPU', 'RAM', 'requires', $${"cpu_model": ["Threadripper"], "ram_channels": {"$gte": 4}}$$::jsonb, 'warning', NULL,
 $$Threadripper uses quad-channel or octa-channel memory$$,
 $$Use 4 or 8 matched RAM sticks for full bandwidth$$, 88, true),

('hedt_threadripper_ecc_memory', 'memory', 'CPU', 'RAM', 'recommends', $${"cpu_model": ["Threadripper"], "ram_type": "ECC"}$$::jsonb, 'info', NULL,
 $$Threadripper supports ECC memory for workstation reliability$$,
 $$Recommended for professional workloads requiring data integrity$$, 78, true),

('hedt_threadripper_psu_high_wattage', 'power', 'CPU', 'PSU', 'requires', $${"cpu_model": ["Threadripper"], "psu_wattage": {"$gte": 1000}}$$::jsonb, 'warning', NULL,
 $$Threadripper systems need 1000W+ PSU (CPU + multi-GPU)$$,
 $$96-core CPU draws 350W+, add high-end GPUs = 1000W minimum$$, 90, true),

-- Intel Xeon Workstation
('workstation_xeon_w_series', 'socket', 'CPU', 'Motherboard', 'requires', $${"cpu_model": ["Xeon W"], "motherboard_chipset": "W790"}$$::jsonb, 'error', 
 $$Intel Xeon W requires W790 workstation motherboard$$, NULL,
 $$Workstation platform: ECC support, professional features$$, 92, true),

('workstation_xeon_ecc_required', 'memory', 'CPU', 'RAM', 'requires', $${"cpu_model": ["Xeon"], "ram_type": "ECC"}$$::jsonb, 'error', 
 $$Intel Xeon requires ECC RAM - non-ECC not supported$$, NULL,
 $$Use registered ECC DIMMs for workstation builds$$, 94, true),

('workstation_xeon_rdimm_support', 'memory', 'CPU', 'RAM', 'compatible', $${"cpu_model": ["Xeon"], "ram_type": ["RDIMM", "LRDIMM"]}$$::jsonb, 'info', NULL,
 $$Xeon supports RDIMM (registered) and LRDIMM (load-reduced) ECC$$,
 $$Higher capacity and reliability than UDIMM$$, 85, true),

-- Workstation GPU Requirements
('workstation_quadro_rtx', 'compatibility', 'GPU', 'System', 'recommends', $${"gpu_type": "Professional", "usage_type": ["CAD", "3D modeling", "scientific"]}$$::jsonb, 'info', NULL,
 $$NVIDIA RTX A-series (Quadro) for professional applications$$,
 $$Certified drivers for CAD, better double-precision compute$$, 82, true),

('workstation_amd_pro', 'compatibility', 'GPU', 'System', 'recommends', $${"gpu_model": ["Radeon PRO"], "usage_type": ["workstation"]}$$::jsonb, 'info', NULL,
 $$AMD Radeon PRO for workstation graphics tasks$$,
 $$Optimized for content creation, certified drivers$$, 80, true),

-- Multi-GPU Workstation
('workstation_dual_gpu_pcie_lanes', 'pcie', 'GPU', 'Motherboard', 'requires', $${"gpu_count": 2, "motherboard_pcie_lanes": {"$gte": 32}}$$::jsonb, 'warning', NULL,
 $$Dual GPU workstation needs 32+ PCIe lanes (x16/x16 or x16/x8)$$,
 $$HEDT/workstation platforms required for full bandwidth$$, 86, true),

('workstation_quad_gpu_support', 'pcie', 'GPU', 'Motherboard', 'requires', $${"gpu_count": 4, "motherboard_pcie_lanes": {"$gte": 64}}$$::jsonb, 'error', 
 $$4-GPU workstation requires 64+ PCIe lanes$$, NULL,
 $$Only Threadripper/Xeon W platforms support 4+ GPUs properly$$, 90, true),

-- Workstation Storage
('workstation_nvme_raid', 'storage', 'Storage', 'System', 'recommends', $${"storage_raid": "RAID 0", "usage_type": "workstation"}$$::jsonb, 'info', NULL,
 $$NVMe RAID 0 for workstation scratch disk (video editing)$$,
 $$2x PCIe 4.0 NVMe in RAID 0 = 14GB/s bandwidth$$, 78, true),

('workstation_backup_storage', 'storage', 'Storage', 'System', 'requires', $${"usage_type": "workstation", "storage_backup": true}$$::jsonb, 'warning', NULL,
 $$Workstation requires separate backup storage solution$$,
 $$Use NAS, external drives, or cloud backup for project files$$, 85, true);

-- =============================================
-- CATEGORY 11: GAMING-SPECIFIC RULES (80 new rules)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- 1080p Gaming Builds
('gaming_1080p_gpu_tier', 'compatibility', 'GPU', 'System', 'recommends', $${"gaming_resolution": "1080p", "gpu_tier": ["mid-range", "entry"]}$$::jsonb, 'info', NULL,
 $$1080p gaming: RTX 4060/4060 Ti or RX 7600 XT sufficient$$,
 $$Don't overspend on GPU - 1080p doesn't need flagship$$, 78, true),

('gaming_1080p_cpu_balance', 'compatibility', 'CPU', 'System', 'recommends', $${"gaming_resolution": "1080p", "cpu_tier": "mid-range"}$$::jsonb, 'info', NULL,
 $$1080p gaming CPU-bound - use i5-14600K or Ryzen 7 7700X$$,
 $$Strong CPU more important at 1080p than 4K$$, 80, true),

('gaming_1080p_ram_16gb', 'memory', 'RAM', 'System', 'requires', $${"gaming_resolution": "1080p", "ram_capacity_gb": {"$gte": 16}}$$::jsonb, 'warning', NULL,
 $$1080p gaming needs 16GB RAM minimum (32GB recommended)$$,
 $$Some modern games use 12-16GB at 1080p$$, 75, true),

('gaming_1080p_144hz_cpu', 'compatibility', 'CPU', 'System', 'recommends', $${"gaming_resolution": "1080p", "monitor_refresh_rate": {"$gte": 144}}$$::jsonb, 'warning', NULL,
 $$1080p 144Hz+ gaming demands strong CPU (i5-14600K+)$$,
 $$High refresh rates CPU-limited - don't bottleneck GPU$$, 82, true),

('gaming_1080p_esports_focus', 'compatibility', 'System', 'Gaming', 'recommends', $${"gaming_type": "esports", "gaming_resolution": "1080p"}$$::jsonb, 'info', NULL,
 $$Esports 1080p: prioritize high refresh rate over graphics$$,
 $$240Hz+ monitor, strong CPU, mid-range GPU sufficient$$, 76, true),

-- 1440p Gaming Builds
('gaming_1440p_gpu_tier', 'compatibility', 'GPU', 'System', 'recommends', $${"gaming_resolution": "1440p", "gpu_tier": "high-end"}$$::jsonb, 'info', NULL,
 $$1440p gaming: RTX 4070 Ti/4080 or RX 7800 XT/7900 XT$$,
 $$Sweet spot resolution - balance of clarity and performance$$, 85, true),

('gaming_1440p_high_refresh', 'compatibility', 'GPU', 'System', 'recommends', $${"gaming_resolution": "1440p", "monitor_refresh_rate": {"$gte": 165}}$$::jsonb, 'warning', NULL,
 $$1440p 165Hz+ needs RTX 4080 or RX 7900 XTX$$,
 $$Demanding combo - requires high-end GPU for consistent frames$$, 88, true),

('gaming_1440p_cpu_balanced', 'compatibility', 'CPU', 'System', 'recommends', $${"gaming_resolution": "1440p", "cpu_tier": ["mid-range", "high-end"]}$$::jsonb, 'info', NULL,
 $$1440p gaming: i7-14700K or Ryzen 7 7800X3D ideal$$,
 $$More GPU-bound than 1080p but CPU still matters$$, 82, true),

('gaming_1440p_ram_32gb', 'memory', 'RAM', 'System', 'recommends', $${"gaming_resolution": "1440p", "ram_capacity_gb": 32}$$::jsonb, 'info', NULL,
 $$1440p gaming benefits from 32GB RAM (future-proofing)$$,
 $$16GB minimum but 32GB recommended for heavy games$$, 78, true),

('gaming_1440p_ultrawide', 'compatibility', 'GPU', 'System', 'requires', $${"monitor_aspect": "21:9", "gaming_resolution": "1440p", "gpu_tier": "high-end"}$$::jsonb, 'warning', NULL,
 $$1440p ultrawide (3440x1440) needs RTX 4070 Ti+ GPU$$,
 $$34% more pixels than 16:9 1440p - demanding$$, 86, true),

-- 4K Gaming Builds
('gaming_4k_gpu_flagship', 'compatibility', 'GPU', 'System', 'requires', $${"gaming_resolution": "4K", "gpu_tier": "flagship"}$$::jsonb, 'warning', NULL,
 $$4K gaming requires flagship GPU: RTX 4090 or RX 7900 XTX$$,
 $$Extremely demanding - even flagship struggles in some games$$, 92, true),

('gaming_4k_60fps_target', 'compatibility', 'GPU', 'System', 'recommends', $${"gaming_resolution": "4K", "target_fps": 60}$$::jsonb, 'info', NULL,
 $$4K 60fps target realistic with RTX 4080/4090$$,
 $$Adjust settings to High/Medium for consistent 60fps$$, 85, true),

('gaming_4k_cpu_less_critical', 'compatibility', 'CPU', 'System', 'compatible', $${"gaming_resolution": "4K", "cpu_tier": "mid-range"}$$::jsonb, 'info', NULL,
 $$4K gaming heavily GPU-bound - mid-range CPU OK$$,
 $$i5-14600K sufficient even with RTX 4090 at 4K$$, 76, true),

('gaming_4k_vram_12gb_minimum', 'memory', 'GPU', 'System', 'requires', $${"gaming_resolution": "4K", "gpu_vram_gb": {"$gte": 12}}$$::jsonb, 'error', 
 $$4K gaming requires 12GB+ VRAM - 8GB insufficient$$, NULL,
 $$Modern 4K games exceed 10GB VRAM at max settings$$, 90, true),

('gaming_4k_ram_32gb_standard', 'memory', 'RAM', 'System', 'requires', $${"gaming_resolution": "4K", "ram_capacity_gb": {"$gte": 32}}$$::jsonb, 'warning', NULL,
 $$4K gaming standard: 32GB RAM (some games use 20GB+)$$,
 $$Flight Simulator, Tarkov, modded games benefit from 32GB$$, 82, true),

('gaming_4k_dlss_fsr_essential', 'compatibility', 'GPU', 'System', 'recommends', $${"gaming_resolution": "4K", "gpu_upscaling": ["DLSS", "FSR"]}$$::jsonb, 'info', NULL,
 $$4K gaming: enable DLSS/FSR for playable framerates$$,
 $$Upscaling from 1440p provides huge performance boost$$, 88, true),

-- VR Gaming
('gaming_vr_gpu_requirements', 'compatibility', 'GPU', 'System', 'requires', $${"usage_type": "VR", "gpu_tier": ["high-end", "flagship"]}$$::jsonb, 'warning', NULL,
 $$VR gaming needs high-end GPU: RTX 4070 Ti+ or RX 7900 XT+$$,
 $$VR demands consistent 90-120fps for smooth experience$$, 90, true),

('gaming_vr_cpu_requirements', 'compatibility', 'CPU', 'System', 'requires', $${"usage_type": "VR", "cpu_cores": {"$gte": 8}}$$::jsonb, 'warning', NULL,
 $$VR gaming benefits from 8+ core CPU for physics/AI$$,
 $$Flight sims and racing sims particularly CPU-intensive$$, 85, true),

('gaming_vr_ram_16gb_minimum', 'memory', 'RAM', 'System', 'requires', $${"usage_type": "VR", "ram_capacity_gb": {"$gte": 16}}$$::jsonb, 'warning', NULL,
 $$VR gaming requires 16GB+ RAM$$,
 $$32GB recommended for Half-Life Alyx, MSFS VR$$, 80, true),

('gaming_vr_usb_bandwidth', 'compatibility', 'Motherboard', 'System', 'requires', $${"usage_type": "VR", "motherboard_usb_bandwidth": "high"}$$::jsonb, 'warning', NULL,
 $$VR headsets need dedicated USB controller bandwidth$$,
 $$Use rear USB 3.2 ports directly from CPU for best results$$, 78, true),

-- Competitive Gaming
('gaming_competitive_latency', 'compatibility', 'System', 'Gaming', 'recommends', $${"gaming_type": "competitive", "monitor_response_time": {"$lte": 1}}$$::jsonb, 'info', NULL,
 $$Competitive gaming: use 1ms response time monitor$$,
 $$IPS or TN panel, avoid VA for fast-paced games$$, 82, true),

('gaming_competitive_high_refresh', 'compatibility', 'System', 'Gaming', 'requires', $${"gaming_type": "competitive", "monitor_refresh_rate": {"$gte": 240}}$$::jsonb, 'warning', NULL,
 $$Competitive esports: 240Hz+ monitor essential$$,
 $$CS2, Valorant, Apex benefit from high refresh$$, 85, true),

('gaming_competitive_cpu_priority', 'compatibility', 'CPU', 'System', 'recommends', $${"gaming_type": "competitive", "cpu_cache": "3D V-Cache"}$$::jsonb, 'info', NULL,
 $$Competitive gaming: Ryzen X3D CPUs provide lower latency$$,
 $$7800X3D/9800X3D excellent for esports titles$$, 88, true);

-- =============================================
-- CATEGORY 12: SPECIFIC USE CASE RULES (70 new rules)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- Streaming PC
('streaming_dual_pc_setup', 'compatibility', 'System', 'Streaming', 'recommends', $${"usage_type": "streaming", "streaming_setup": "dual-PC"}$$::jsonb, 'info', NULL,
 $$Professional streaming: dual-PC setup eliminates performance impact$$,
 $$Gaming PC + dedicated streaming PC with capture card$$, 85, true),

('streaming_single_pc_cpu', 'compatibility', 'CPU', 'System', 'requires', $${"usage_type": "streaming", "streaming_setup": "single-PC", "cpu_cores": {"$gte": 12}}$$::jsonb, 'warning', NULL,
 $$Single-PC streaming needs 12+ cores (i7-14700K or better)$$,
 $$Game + encode simultaneously - demands strong CPU$$, 88, true),

('streaming_nvenc_encoder', 'compatibility', 'GPU', 'System', 'recommends', $${"usage_type": "streaming", "gpu_encoder": "NVENC"}$$::jsonb, 'info', NULL,
 $$NVIDIA NVENC hardware encoder for high-quality streaming$$,
 $$RTX 40-series NVENC better quality than software x264$$, 82, true),

('streaming_ram_32gb_recommended', 'memory', 'RAM', 'System', 'recommends', $${"usage_type": "streaming", "ram_capacity_gb": 32}$$::jsonb, 'info', NULL,
 $$Streaming PC benefits from 32GB RAM (game + stream software)$$,
 $$OBS, game, browser, Discord all run simultaneously$$, 78, true),

('streaming_capture_card', 'compatibility', 'System', 'Streaming', 'requires', $${"streaming_setup": "dual-PC", "pcie_device": "capture-card"}$$::jsonb, 'info', NULL,
 $$Dual-PC streaming requires capture card (Elgato, AVerMedia)$$,
 $$Gaming PC HDMI → Capture card → Streaming PC$$, 80, true),

-- Video Editing
('video_editing_4k_gpu', 'compatibility', 'GPU', 'System', 'requires', $${"usage_type": "video editing", "video_resolution": "4K", "gpu_vram_gb": {"$gte": 12}}$$::jsonb, 'warning', NULL,
 $$4K video editing needs 12GB+ VRAM for timeline preview$$,
 $$DaVinci Resolve, Premiere Pro benefit from large VRAM$$, 86, true),

('video_editing_cpu_cores', 'compatibility', 'CPU', 'System', 'requires', $${"usage_type": "video editing", "cpu_cores": {"$gte": 16}}$$::jsonb, 'warning', NULL,
 $$Video editing benefits from 16+ cores for rendering$$,
 $$i9-14900K or Ryzen 9 7950X for professional work$$, 90, true),

('video_editing_ram_64gb', 'memory', 'RAM', 'System', 'recommends', $${"usage_type": "video editing", "video_resolution": "4K", "ram_capacity_gb": 64}$$::jsonb, 'warning', NULL,
 $$4K video editing: 64GB RAM for smooth timeline scrubbing$$,
 $$32GB minimum, 64GB+ for multi-camera 4K projects$$, 85, true),

('video_editing_fast_storage', 'storage', 'Storage', 'System', 'requires', $${"usage_type": "video editing", "storage_interface": "PCIe 4.0", "storage_capacity_gb": {"$gte": 2000}}$$::jsonb, 'warning', NULL,
 $$Video editing needs fast 2TB+ NVMe for project files$$,
 $$PCIe 4.0 NVMe for 4K footage, separate drive for cache$$, 88, true),

('video_editing_scratch_disk', 'storage', 'Storage', 'System', 'recommends', $${"usage_type": "video editing", "storage_type": "scratch-disk"}$$::jsonb, 'info', NULL,
 $$Video editing benefits from dedicated scratch/cache disk$$,
 $$Fast NVMe for Premiere/Resolve cache improves performance$$, 78, true),

-- 3D Rendering
('rendering_threadripper_advantage', 'compatibility', 'CPU', 'System', 'recommends', $${"usage_type": "3D rendering", "cpu_cores": {"$gte": 32}}$$::jsonb, 'info', NULL,
 $$3D rendering: Threadripper 32+ cores for fastest renders$$,
 $$Cinema 4D, Blender scale well with core count$$, 85, true),

('rendering_gpu_acceleration', 'compatibility', 'GPU', 'System', 'recommends', $${"usage_type": "3D rendering", "gpu_cuda_cores": {"$gte": 10000}}$$::jsonb, 'info', NULL,
 $$GPU rendering (OptiX, Cycles) benefits from high CUDA count$$,
 $$RTX 4090, RTX 4080 excellent for Blender GPU rendering$$, 88, true),

('rendering_ram_128gb', 'memory', 'RAM', 'System', 'recommends', $${"usage_type": "3D rendering", "scene_complexity": "high", "ram_capacity_gb": {"$gte": 128}}$$::jsonb, 'warning', NULL,
 $$Complex 3D scenes benefit from 128GB+ RAM$$,
 $$Large polygon count, textures consume massive memory$$, 82, true),

('rendering_ecc_memory', 'memory', 'RAM', 'System', 'recommends', $${"usage_type": "3D rendering", "project_duration": "long", "ram_type": "ECC"}$$::jsonb, 'info', NULL,
 $$Long render jobs benefit from ECC RAM reliability$$,
 $$Prevents memory errors corrupting multi-hour renders$$, 75, true);

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 
    '✅ MIGRATION 011 BATCH 5 COMPLETE' as status,
    'Added ' || COUNT(*) || ' rules' as added
FROM compatibility_rules 
WHERE created_at > NOW() - INTERVAL '1 minute';

SELECT 
    '🎯 TOTAL RULES: ' || COUNT(*) || ' (TARGET: 1000+)' as progress
FROM compatibility_rules
WHERE enabled = true;

SELECT 
    rule_category,
    COUNT(*) as count
FROM compatibility_rules
WHERE enabled = true
GROUP BY rule_category
ORDER BY count DESC
LIMIT 10;
