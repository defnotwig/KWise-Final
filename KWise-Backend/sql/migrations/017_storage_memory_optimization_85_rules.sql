-- =============================================
-- MIGRATION 017: STORAGE & MEMORY OPTIMIZATION (85 RULES)
-- =============================================
-- Purpose: Comprehensive storage and memory rules
-- Current: 835 rules - Target: Add 85 unique rules
-- Focus: NVMe, SATA, RAM speeds, capacity, optimization
-- Date: November 8, 2025
-- =============================================

BEGIN;

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- NVMe Storage Rules (25 rules)
('storage_nvme_pcie5_14000mbs', 'storage', 'Storage', 'Motherboard', 'provides', $${"storage_type": "NVMe", "pcie_gen": 5.0, "read_speed_mbps": 14000}$$::jsonb, 'info', NULL, 'PCIe 5.0 NVMe SSDs reach 14,000 MB/s reads', 'Requires Gen5 M.2 slot and heatsink', 78, true),
('storage_nvme_pcie5_expensive', 'storage', 'Storage', 'System', 'requires', $${"storage_type": "NVMe", "pcie_gen": 5.0, "price_premium": "High"}$$::jsonb, 'warning', NULL, 'PCIe 5.0 NVMe SSDs very expensive ($$/GB)', 'Gen4 NVMe excellent value, minimal real-world difference', 72, true),
('storage_nvme_pcie4_7400mbs', 'storage', 'Storage', 'Motherboard', 'provides', $${"storage_type": "NVMe", "pcie_gen": 4.0, "read_speed_mbps": 7400}$$::jsonb, 'info', NULL, 'PCIe 4.0 NVMe SSDs reach 7,000-7,400 MB/s', 'Sweet spot for performance and price', 82, true),
('storage_nvme_pcie4_dram_cache', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "NVMe", "pcie_gen": 4.0, "dram_cache": true}$$::jsonb, 'info', NULL, 'PCIe 4.0 NVMe with DRAM cache better for heavy workloads', 'Improves sustained write performance', 75, true),
('storage_nvme_pcie4_dram_less', 'storage', 'Storage', 'System', 'requires', $${"storage_type": "NVMe", "pcie_gen": 4.0, "dram_cache": false}$$::jsonb, 'warning', NULL, 'DRAM-less PCIe 4.0 NVMe uses HMB (Host Memory Buffer)', 'Good for gaming, less ideal for heavy writes', 70, true),
('storage_nvme_pcie3_3500mbs', 'storage', 'Storage', 'Motherboard', 'provides', $${"storage_type": "NVMe", "pcie_gen": 3.0, "read_speed_mbps": 3500}$$::jsonb, 'info', NULL, 'PCIe 3.0 NVMe SSDs reach 3,000-3,500 MB/s', 'Still excellent for gaming and general use', 75, true),
('storage_nvme_tlc_vs_qlc', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "NVMe", "nand_type": "TLC"}$$::jsonb, 'info', NULL, 'TLC NAND better endurance than QLC', 'TLC: ~600TBW per 1TB, QLC: ~360TBW', 78, true),
('storage_nvme_qlc_budget', 'storage', 'Storage', 'System', 'requires', $${"storage_type": "NVMe", "nand_type": "QLC"}$$::jsonb, 'warning', NULL, 'QLC NAND offers lower cost per GB', 'Slower sustained writes, lower endurance', 68, true),
('storage_nvme_slc_cache_size', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "NVMe", "slc_cache_gb": 50}$$::jsonb, 'info', NULL, 'Larger SLC cache (50GB+) better for large file transfers', 'Cache size varies by drive capacity', 72, true),
('storage_nvme_directstorage_win11', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "NVMe", "feature": "DirectStorage"}$$::jsonb, 'info', NULL, 'DirectStorage in Windows 11 benefits from fast NVMe', 'Reduces game load times significantly', 75, true),
('storage_nvme_capacity_1tb_min', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "NVMe", "capacity_gb": 1000}$$::jsonb, 'info', NULL, '1TB NVMe minimum for modern gaming PC', 'Games can be 100-150GB+ each', 80, true),
('storage_nvme_capacity_2tb_sweet', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "NVMe", "capacity_gb": 2000}$$::jsonb, 'info', NULL, '2TB NVMe sweet spot for price per GB', 'Best value, room for OS + games', 85, true),
('storage_nvme_capacity_4tb_premium', 'storage', 'Storage', 'System', 'requires', $${"storage_type": "NVMe", "capacity_gb": 4000}$$::jsonb, 'warning', NULL, '4TB NVMe SSDs expensive but convenient', 'Single drive solution for large libraries', 75, true),
('storage_nvme_heatsink_gen4', 'thermal', 'Storage', 'Motherboard', 'recommends', $${"storage_type": "NVMe", "pcie_gen": 4.0, "heatsink": true}$$::jsonb, 'warning', NULL, 'PCIe 4.0 NVMe benefits from heatsink', 'Prevents thermal throttling under load', 78, true),
('storage_nvme_heatsink_gen5_required', 'thermal', 'Storage', 'Motherboard', 'requires', $${"storage_type": "NVMe", "pcie_gen": 5.0, "heatsink": true}$$::jsonb, 'error', 'PCIe 5.0 NVMe REQUIRES substantial heatsink', 'Runs extremely hot (80-90°C), will throttle', 'Use motherboard M.2 heatsink or aftermarket', 90, true),
('storage_nvme_m2_2230_form', 'physical', 'Storage', 'Motherboard', 'supports', $${"storage_type": "NVMe", "form_factor": "M.2_2230"}$$::jsonb, 'info', NULL, 'M.2 2230 (30mm) used in handheld PCs', 'Limited capacity options', 65, true),
('storage_nvme_m2_2242_form', 'physical', 'Storage', 'Motherboard', 'supports', $${"storage_type": "NVMe", "form_factor": "M.2_2242"}$$::jsonb, 'info', NULL, 'M.2 2242 (42mm) used in some laptops', 'Uncommon in desktop builds', 65, true),
('storage_nvme_m2_2260_form', 'physical', 'Storage', 'Motherboard', 'supports', $${"storage_type": "NVMe", "form_factor": "M.2_2260"}$$::jsonb, 'info', NULL, 'M.2 2260 (60mm) rare form factor', 'Check motherboard support', 65, true),
('storage_nvme_m2_2280_standard', 'physical', 'Storage', 'Motherboard', 'supports', $${"storage_type": "NVMe", "form_factor": "M.2_2280"}$$::jsonb, 'info', NULL, 'M.2 2280 (80mm) standard desktop form factor', 'Universal compatibility', 85, true),
('storage_nvme_m2_22110_long', 'physical', 'Storage', 'Motherboard', 'supports', $${"storage_type": "NVMe", "form_factor": "M.2_22110"}$$::jsonb, 'warning', NULL, 'M.2 22110 (110mm) very long, limited support', 'Check motherboard M.2 slot size', 70, true),
('storage_nvme_endurance_tbw', 'storage', 'Storage', 'System', 'provides', $${"storage_type": "NVMe", "endurance_tbw": 600}$$::jsonb, 'info', NULL, 'NVMe endurance measured in TBW (Terabytes Written)', '600TBW typical for 1TB drive', 72, true),
('storage_nvme_warranty_5_years', 'storage', 'Storage', 'System', 'provides', $${"storage_type": "NVMe", "warranty_years": 5}$$::jsonb, 'info', NULL, 'Premium NVMe SSDs have 5-year warranty', 'Indicates quality and manufacturer confidence', 75, true),
('storage_nvme_raid_0_speed', 'storage', 'Storage', 'Motherboard', 'recommends', $${"storage_type": "NVMe", "raid_level": 0}$$::jsonb, 'warning', NULL, 'RAID 0 NVMe doubles speed but no redundancy', 'Lose all data if one drive fails', 70, true),
('storage_nvme_raid_1_safety', 'storage', 'Storage', 'Motherboard', 'recommends', $${"storage_type": "NVMe", "raid_level": 1}$$::jsonb, 'info', NULL, 'RAID 1 NVMe mirrors data for redundancy', 'Half capacity, full data protection', 75, true),
('storage_nvme_no_raid_recommended', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "NVMe", "raid": false}$$::jsonb, 'info', NULL, 'Single fast NVMe sufficient for most users', 'RAID adds complexity with minimal benefit', 78, true),

-- SATA Storage Rules (15 rules)
('storage_sata_ssd_560mbs', 'storage', 'Storage', 'Motherboard', 'provides', $${"storage_type": "SATA_SSD", "read_speed_mbps": 560}$$::jsonb, 'info', NULL, 'SATA SSD maxes at 560 MB/s (SATA III limit)', 'Still much faster than HDD', 75, true),
('storage_sata_ssd_budget_option', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "SATA_SSD", "use_case": "Budget"}$$::jsonb, 'info', NULL, 'SATA SSD good budget option for secondary storage', 'Use NVMe for OS, SATA for game library', 72, true),
('storage_sata_ssd_2_5_form', 'physical', 'Storage', 'Case', 'requires', $${"storage_type": "SATA_SSD", "form_factor": "2.5_inch"}$$::jsonb, 'info', NULL, 'SATA SSDs use 2.5" form factor', 'Requires 2.5" drive bay or bracket', 75, true),
('storage_sata_m2_form', 'physical', 'Storage', 'Motherboard', 'supports', $${"storage_type": "SATA_M.2", "form_factor": "M.2_2280"}$$::jsonb, 'warning', NULL, 'M.2 SATA SSDs exist but slower than NVMe', 'Check M.2 slot supports SATA (not just NVMe)', 70, true),
('storage_sata_hdd_7200rpm', 'storage', 'Storage', 'System', 'provides', $${"storage_type": "HDD", "rpm": 7200}$$::jsonb, 'info', NULL, '7200 RPM HDDs faster than 5400 RPM', 'Still slow compared to any SSD', 68, true),
('storage_sata_hdd_5400rpm', 'storage', 'Storage', 'System', 'requires', $${"storage_type": "HDD", "rpm": 5400}$$::jsonb, 'warning', NULL, '5400 RPM HDDs slower but quieter', 'Only for cold storage or backups', 62, true),
('storage_sata_hdd_capacity_cheap', 'storage', 'Storage', 'System', 'provides', $${"storage_type": "HDD", "capacity_tb": 4}$$::jsonb, 'info', NULL, 'HDDs best for bulk storage ($/TB)', '4TB+ HDDs cheapest per gigabyte', 72, true),
('storage_sata_hdd_smr_warning', 'storage', 'Storage', 'System', 'requires', $${"storage_type": "HDD", "technology": "SMR"}$$::jsonb, 'warning', NULL, 'SMR HDDs terrible for random writes', 'Avoid for NAS or databases, OK for archival', 75, true),
('storage_sata_hdd_cmr_preferred', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "HDD", "technology": "CMR"}$$::jsonb, 'info', NULL, 'CMR (PMR) HDDs better performance than SMR', 'Preferred for all use cases', 78, true),
('storage_sata_port_count_6', 'storage', 'Motherboard', 'Storage', 'provides', $${"sata_ports": 6}$$::jsonb, 'info', NULL, 'Motherboards typically have 4-6 SATA ports', 'Sufficient for most builds', 75, true),
('storage_sata_cable_right_angle', 'physical', 'Storage', 'Case', 'recommends', $${"sata_cable": "Right_Angle"}$$::jsonb, 'info', NULL, 'Right-angle SATA cables save space', 'Better for cable management', 68, true),
('storage_sata_power_cable', 'power', 'Storage', 'PSU', 'requires', $${"storage_type": "SATA", "power_connector": "SATA_Power"}$$::jsonb, 'info', NULL, 'SATA drives use SATA power connectors', 'PSUs include multiple SATA power cables', 75, true),
('storage_sata_molex_adapter', 'power', 'Storage', 'PSU', 'requires', $${"adapter": "Molex_to_SATA"}$$::jsonb, 'error', 'Molex to SATA adapters are fire hazards', 'Low quality adapters cause fires', 'Use PSU native SATA power cables only', 95, true),
('storage_sata_hot_swap', 'storage', 'Storage', 'Case', 'supports', $${"feature": "Hot_Swap_Bays"}$$::jsonb, 'info', NULL, 'Hot-swap bays allow drive replacement without shutdown', 'Useful for NAS or server builds', 70, true),
('storage_sata_3_vs_2', 'storage', 'Storage', 'Motherboard', 'requires', $${"sata_version": "SATA_III"}$$::jsonb, 'info', NULL, 'SATA III (6 Gb/s) standard on modern motherboards', 'Backward compatible with SATA II', 75, true),

-- RAM Speed & Timing Rules (25 rules with unique names)
('memory_ddr5_6000_cl30_amd_optimized', 'memory', 'RAM', 'CPU', 'recommends', $${"ram_type": "DDR5", "speed_mhz": 6000, "cas_latency": 30, "platform": "AMD"}$$::jsonb, 'info', NULL, 'DDR5-6000 CL30 sweet spot for AMD Ryzen 9000/7000', 'Best balance of speed, latency, and price', 85, true),
('memory_ddr5_5600_intel_jedec', 'memory', 'RAM', 'CPU', 'recommends', $${"ram_type": "DDR5", "speed_mhz": 5600, "platform": "Intel"}$$::jsonb, 'info', NULL, 'DDR5-5600 official Intel 14th/13th Gen support', 'Solid baseline, can go higher with XMP', 78, true),
('memory_ddr5_7200_enthusiast', 'memory', 'RAM', 'CPU', 'requires', $${"ram_type": "DDR5", "speed_mhz": 7200}$$::jsonb, 'warning', NULL, 'DDR5-7200+ requires good motherboard and IMC', 'Diminishing returns above 6400', 75, true),
('memory_ddr5_8000_world_record', 'memory', 'RAM', 'CPU', 'requires', $${"ram_type": "DDR5", "speed_mhz": 8000}$$::jsonb, 'warning', NULL, 'DDR5-8000 extreme overclocking territory', 'Marginal real-world gains, stability concerns', 70, true),
('memory_ddr5_cl30_latency_sweet', 'memory', 'RAM', 'System', 'recommends', $${"ram_type": "DDR5", "cas_latency": 30}$$::jsonb, 'info', NULL, 'CL30 common for DDR5-6000 kits', 'Good balance of speed and latency', 80, true),
('memory_ddr5_cl32_value_tier', 'memory', 'RAM', 'System', 'requires', $${"ram_type": "DDR5", "cas_latency": 32}$$::jsonb, 'info', NULL, 'CL32 acceptable for budget DDR5 kits', 'Slightly slower but more affordable', 72, true),
('memory_ddr5_cl36_avoid_slow', 'memory', 'RAM', 'System', 'requires', $${"ram_type": "DDR5", "cas_latency": 36}$$::jsonb, 'warning', NULL, 'CL36+ considered slow for DDR5', 'Prioritize lower latency (CL30-32)', 68, true),
('memory_ddr4_3600_cl16_ryzen', 'memory', 'RAM', 'CPU', 'recommends', $${"ram_type": "DDR4", "speed_mhz": 3600, "cas_latency": 16, "platform": "AMD"}$$::jsonb, 'info', NULL, 'DDR4-3600 CL16 sweet spot for Ryzen 5000', 'Best for AM4 platform', 78, true),
('memory_ddr4_3200_intel_jedec', 'memory', 'RAM', 'CPU', 'recommends', $${"ram_type": "DDR4", "speed_mhz": 3200, "platform": "Intel"}$$::jsonb, 'info', NULL, 'DDR4-3200 official Intel support on DDR4 boards', 'Solid baseline performance', 75, true),
('memory_ddr4_cl16_premium_tier', 'memory', 'RAM', 'System', 'recommends', $${"ram_type": "DDR4", "cas_latency": 16}$$::jsonb, 'info', NULL, 'CL16 optimal latency for DDR4-3600', 'Premium kits, excellent performance', 80, true),
('memory_ddr4_cl18_mainstream', 'memory', 'RAM', 'System', 'requires', $${"ram_type": "DDR4", "cas_latency": 18}$$::jsonb, 'info', NULL, 'CL18 acceptable for budget DDR4 kits', 'Slightly slower but affordable', 72, true),
('memory_dual_rank_2x16gb_faster', 'memory', 'RAM', 'CPU', 'recommends', $${"rank_config": "Dual_Rank", "capacity_per_stick_gb": 16, "sticks": 2}$$::jsonb, 'info', NULL, 'Dual-rank RAM (2x16GB) faster than single-rank', '5-10% better performance in some workloads', 75, true),
('memory_single_rank_2x8gb_budget', 'memory', 'RAM', 'System', 'requires', $${"rank_config": "Single_Rank", "capacity_per_stick_gb": 8, "sticks": 2}$$::jsonb, 'info', NULL, 'Single-rank RAM (2x8GB) cheaper than dual-rank', 'Good for budget builds', 70, true),
('memory_quad_rank_4_sticks_limit', 'memory', 'RAM', 'CPU', 'requires', $${"rank_config": "Quad_Rank", "sticks": 4}$$::jsonb, 'warning', NULL, 'Quad-rank config (4 sticks) harder to overclock', 'May limit max speed on some platforms', 72, true),
('memory_capacity_16gb_baseline', 'memory', 'RAM', 'System', 'recommends', $${"capacity_gb": 16, "year": 2025}$$::jsonb, 'info', NULL, '16GB RAM minimum for modern gaming', '2x8GB dual-channel configuration', 85, true),
('memory_capacity_32gb_2025_standard', 'memory', 'RAM', 'System', 'recommends', $${"capacity_gb": 32, "year": 2025}$$::jsonb, 'info', NULL, '32GB RAM ideal for gaming + multitasking', '2x16GB sweet spot for most users', 88, true),
('memory_capacity_64gb_content_pro', 'memory', 'RAM', 'System', 'recommends', $${"capacity_gb": 64, "use_case": "Content_Creation_Pro"}$$::jsonb, 'info', NULL, '64GB RAM benefits video editing and 3D rendering', '4x16GB or 2x32GB', 80, true),
('memory_capacity_128gb_extreme_workstation', 'memory', 'RAM', 'System', 'requires', $${"capacity_gb": 128, "use_case": "Extreme_Workstation"}$$::jsonb, 'warning', NULL, '128GB RAM for extreme workstation workloads', 'Very expensive, niche use cases', 75, true),
('memory_rgb_aesthetic_tradeoff', 'memory', 'RAM', 'System', 'requires', $${"feature": "RGB_Lighting", "cost_increase": true}$$::jsonb, 'info', NULL, 'RGB RAM adds cost without performance gain', 'Choose based on aesthetics preference', 65, true),
('memory_heatspreader_ddr5_6400', 'thermal', 'RAM', 'System', 'recommends', $${"feature": "Heatspreader", "ram_speed_mhz": 6400}$$::jsonb, 'info', NULL, 'RAM heatspreaders useful for high-speed kits', 'Helps with DDR5 6400+', 72, true),
('memory_ecc_server_workstation', 'memory', 'RAM', 'CPU', 'requires', $${"feature": "ECC", "platform": "Server_Workstation"}$$::jsonb, 'info', NULL, 'ECC RAM detects and corrects memory errors', 'Required for servers, optional for workstations', 75, true),
('memory_non_ecc_gaming_consumer', 'memory', 'RAM', 'CPU', 'provides', $${"feature": "Non_ECC", "platform": "Consumer_Gaming"}$$::jsonb, 'info', NULL, 'Non-ECC RAM standard for consumer platforms', 'Cheaper than ECC, sufficient for gaming', 78, true),
('memory_xmp3_intel_ddr5_profiles', 'memory', 'RAM', 'Motherboard', 'supports', $${"feature": "XMP_3.0", "platform": "Intel", "ram_type": "DDR5"}$$::jsonb, 'info', NULL, 'XMP 3.0 profiles simplify DDR5 overclocking', 'Multiple profiles for flexibility', 75, true),
('memory_expo_amd_am5_profiles', 'memory', 'RAM', 'Motherboard', 'supports', $${"feature": "EXPO", "platform": "AMD_AM5"}$$::jsonb, 'info', NULL, 'EXPO profiles optimized for AMD platforms', 'Better compatibility than XMP on AM5', 78, true),
('memory_jedec_fallback_standard', 'memory', 'RAM', 'System', 'provides', $${"feature": "JEDEC_Standard", "ddr5_speed_mhz": 4800, "ddr4_speed_mhz": 3200}$$::jsonb, 'info', NULL, 'JEDEC standard speeds work without XMP/EXPO', 'DDR5-4800 or DDR4-3200 fallback', 72, true),

-- Storage & Memory Optimization (20 rules with unique names)
('storage_trim_ssd_auto_enable', 'storage', 'Storage', 'System', 'recommends', $${"drive_role": "Boot_Drive", "optimization": "TRIM_Enabled"}$$::jsonb, 'info', NULL, 'Enable TRIM for SSD boot drive health', 'Windows enables automatically for SSDs', 75, true),
('storage_pagefile_ssd_placement', 'storage', 'Storage', 'System', 'recommends', $${"drive_role": "Pagefile", "storage_type": "SSD"}$$::jsonb, 'info', NULL, 'Place Windows pagefile on SSD, not HDD', 'Improves system responsiveness', 78, true),
('storage_temp_directory_ssd', 'storage', 'Storage', 'System', 'recommends', $${"drive_role": "Temp_Files", "storage_type": "SSD"}$$::jsonb, 'info', NULL, 'Keep temp files on SSD for faster access', 'Move large downloads to HDD', 70, true),
('storage_game_install_nvme_primary', 'storage', 'Storage', 'System', 'recommends', $${"drive_role": "Game_Library_Primary", "storage_type": "NVMe"}$$::jsonb, 'info', NULL, 'Install frequently played games on NVMe', 'Faster load times than SATA', 80, true),
('storage_game_install_sata_secondary', 'storage', 'Storage', 'System', 'requires', $${"drive_role": "Game_Library_Secondary", "storage_type": "SATA_SSD"}$$::jsonb, 'info', NULL, 'SATA SSD adequate for less-played games', 'Good value for large game libraries', 72, true),
('storage_media_archive_hdd', 'storage', 'Storage', 'System', 'recommends', $${"drive_role": "Media_Archive", "storage_type": "HDD"}$$::jsonb, 'info', NULL, 'Store videos/photos on HDD for cost savings', 'Speed not critical for media files', 75, true),
('storage_backup_3_2_1_rule', 'storage', 'Storage', 'System', 'recommends', $${"backup_strategy": "3_Copies_2_Media_1_Offsite"}$$::jsonb, 'info', NULL, '3-2-1 backup: 3 copies, 2 media types, 1 offsite', 'Essential for data protection', 82, true),
('storage_partition_os_data_separate', 'storage', 'Storage', 'System', 'recommends', $${"partitions": "OS_Data_Separated"}$$::jsonb, 'info', NULL, 'Separate OS and data partitions', 'Easier OS reinstall without losing files', 75, true),
('storage_defrag_hdd_monthly', 'storage', 'Storage', 'System', 'requires', $${"maintenance": "Defrag_HDD_Only", "storage_type": "HDD"}$$::jsonb, 'warning', NULL, 'Defragment HDDs monthly, never SSDs', 'SSDs use TRIM, defrag causes wear', 80, true),
('storage_ssd_free_space_20_percent', 'storage', 'Storage', 'System', 'recommends', $${"optimization": "Overprovisioning", "free_space_percent": 20}$$::jsonb, 'info', NULL, 'Leave 10-20% SSD space free for performance', 'Improves write speeds and longevity', 75, true),
('memory_pagefile_auto_managed', 'memory', 'RAM', 'System', 'recommends', $${"virtual_memory": "System_Managed"}$$::jsonb, 'info', NULL, 'Let Windows manage virtual memory automatically', 'Manual sizing rarely needed', 72, true),
('memory_pagefile_disable_32gb_plus', 'memory', 'RAM', 'System', 'requires', $${"virtual_memory": "Disabled", "ram_gb_minimum": 32}$$::jsonb, 'warning', NULL, 'Disable pagefile only with 32GB+ RAM', 'Some apps require pagefile regardless', 70, true),
('memory_ramdisk_volatile_storage', 'memory', 'RAM', 'System', 'provides', $${"feature": "RAM_Disk_Volatile"}$$::jsonb, 'info', NULL, 'RAM disks extremely fast but volatile', 'Lose data on power loss, niche use', 68, true),
('memory_usage_monitoring_task_mgr', 'memory', 'RAM', 'System', 'recommends', $${"monitoring": "Windows_Task_Manager"}$$::jsonb, 'info', NULL, 'Monitor RAM usage in Task Manager', 'Identify memory leaks or heavy apps', 70, true),
('memory_startup_programs_optimize', 'memory', 'RAM', 'System', 'recommends', $${"optimization": "Disable_Unnecessary_Startup"}$$::jsonb, 'info', NULL, 'Disable unnecessary startup programs', 'Reduces RAM usage and boot time', 75, true),
('storage_ssd_firmware_check_updates', 'storage', 'Storage', 'System', 'recommends', $${"maintenance": "Firmware_Updates"}$$::jsonb, 'info', NULL, 'Update SSD firmware for bug fixes', 'Check manufacturer website periodically', 72, true),
('storage_smart_health_monitoring', 'storage', 'Storage', 'System', 'recommends', $${"monitoring": "SMART_Health_Data"}$$::jsonb, 'info', NULL, 'Monitor SMART data for drive health', 'Predict drive failures before they happen', 78, true),
('storage_ssd_secure_erase_factory', 'storage', 'Storage', 'System', 'provides', $${"feature": "Secure_Erase_ATA"}$$::jsonb, 'info', NULL, 'Secure erase resets SSD to factory state', 'Better than format for selling/reusing', 70, true),
('memory_dual_channel_performance_critical', 'memory', 'RAM', 'Motherboard', 'requires', $${"channel_config": "Dual_Channel_Required"}$$::jsonb, 'error', 'Single RAM stick loses 30-50% performance', NULL, 'Always use 2 or 4 sticks for dual-channel', 95, true),
('memory_dimm_slot_a2_b2_priority', 'memory', 'RAM', 'Motherboard', 'recommends', $${"slot_config": "A2_B2_Optimal", "sticks": 2}$$::jsonb, 'info', NULL, 'Use slots A2 and B2 for 2-stick config', 'Check motherboard manual for optimal slots', 85, true);

-- Success message
SELECT 'Migration 017 Complete! Added 85 Storage and Memory rules' as message, 85 as rules_added_this_batch;

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
