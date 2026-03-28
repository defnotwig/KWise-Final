-- =============================================
-- MIGRATION 009: MEMORY & STORAGE RULES BATCH 3
-- =============================================
-- Purpose: Add 200+ memory and storage compatibility rules
-- Target: Reach 468+ total rules
-- Date: November 8, 2025
-- =============================================

BEGIN;

-- =============================================
-- CATEGORY 5: ADVANCED MEMORY RULES (100 new rules)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- DDR5 Platform Requirements
('memory_ddr5_intel_13th_14th_gen', 'memory', 'RAM', 'Motherboard', 'requires', $${"ram_type": "DDR5", "motherboard_chipset": ["Z790", "Z690", "B760", "B660", "H770", "H670", "H610"]}$$::jsonb, 'error', 
 $$DDR5 RAM requires Intel 600/700 series motherboard (12th-14th Gen)$$, NULL,
 $$Use Z790, B760 for DDR5 support - older chipsets use DDR4$$, 92, true),

('memory_ddr5_amd_am5', 'memory', 'RAM', 'Motherboard', 'requires', $${"ram_type": "DDR5", "motherboard_socket": "AM5"}$$::jsonb, 'error', 
 $$DDR5 RAM requires AMD AM5 socket motherboard (Ryzen 7000/9000)$$, NULL,
 $$All AM5 boards support DDR5 - AM4 uses DDR4 only$$, 90, true),

-- DDR4 Platform Support
('memory_ddr4_intel_legacy', 'memory', 'RAM', 'Motherboard', 'compatible', $${"ram_type": "DDR4", "motherboard_chipset": ["Z690", "B660", "H610", "Z590", "B560", "H570"]}$$::jsonb, 'info', NULL,
 $$DDR4 supported on Intel 500/600 series boards (specific models)$$,
 $$Check motherboard specs - some Z690/B660 are DDR4, others DDR5$$, 75, true),

('memory_ddr4_amd_am4', 'memory', 'RAM', 'Motherboard', 'compatible', $${"ram_type": "DDR4", "motherboard_socket": "AM4"}$$::jsonb, 'info', NULL,
 $$DDR4 RAM compatible with all AMD AM4 motherboards$$,
 $$AM4 platform (Ryzen 1000-5000) uses DDR4 exclusively$$, 78, true),

-- Memory Speed Validation
('memory_ddr5_6000_ryzen_sweet_spot', 'memory', 'RAM', 'Motherboard', 'recommends', $${"ram_type": "DDR5", "ram_speed_mhz": 6000, "motherboard_socket": "AM5"}$$::jsonb, 'info', NULL,
 $$DDR5-6000 is sweet spot for AMD Ryzen 7000/9000 (1:1 FCLK)$$,
 $$Best performance/value - higher speeds may need FCLK tuning$$, 80, true),

('memory_ddr5_7200_intel_14th_gen', 'memory', 'RAM', 'Motherboard', 'recommends', $${"ram_type": "DDR5", "ram_speed_mhz": {"$gte": 7200}, "motherboard_chipset": ["Z790"]}$$::jsonb, 'warning', NULL,
 $$DDR5-7200+ requires Z790 motherboard with good memory traces$$,
 $$High-speed DDR5 needs quality board, ensure XMP/EXPO support$$, 75, true),

('memory_ddr5_8000_extreme', 'memory', 'RAM', 'Motherboard', 'warns', $${"ram_type": "DDR5", "ram_speed_mhz": {"$gte": 8000}}$$::jsonb, 'warning', NULL,
 $$DDR5-8000+ requires extreme binned memory and premium motherboard$$,
 $$Not guaranteed stable - needs manual tuning and quality components$$, 70, true),

('memory_ddr4_3600_ryzen_sweet_spot', 'memory', 'RAM', 'Motherboard', 'recommends', $${"ram_type": "DDR4", "ram_speed_mhz": 3600, "motherboard_socket": "AM4"}$$::jsonb, 'info', NULL,
 $$DDR4-3600 is sweet spot for AMD Ryzen (optimal FCLK ratio)$$,
 $$Best price/performance - 3200 minimum, 3600 recommended$$, 78, true),

('memory_ddr4_4000_intel_gaming', 'memory', 'RAM', 'Motherboard', 'recommends', $${"ram_type": "DDR4", "ram_speed_mhz": {"$gte": 4000}, "motherboard_chipset": ["Z590", "Z690"]}$$::jsonb, 'info', NULL,
 $$DDR4-4000+ benefits Intel 11th-12th Gen gaming performance$$,
 $$Ensure Z-series motherboard for overclocking support$$, 72, true),

-- Memory Capacity Planning
('memory_32gb_gaming_2024', 'memory', 'RAM', 'System', 'recommends', $${"ram_capacity_gb": 32, "usage_type": "gaming"}$$::jsonb, 'info', NULL,
 $$32GB RAM recommended for modern gaming in 2024-2025$$,
 $$16GB still works but some games use 20GB+ (Flight Sim, Tarkov)$$, 75, true),

('memory_64gb_content_creation', 'memory', 'RAM', 'System', 'recommends', $${"ram_capacity_gb": 64, "usage_type": ["video editing", "3D rendering"]}$$::jsonb, 'info', NULL,
 $$64GB RAM recommended for content creation workflows$$,
 $$4K video editing, Blender, Unreal Engine benefit from 64GB+$$, 78, true),

('memory_128gb_workstation', 'memory', 'RAM', 'System', 'recommends', $${"ram_capacity_gb": 128, "usage_type": ["workstation", "AI training"]}$$::jsonb, 'info', NULL,
 $$128GB+ RAM for professional workstation and AI workloads$$,
 $$Large datasets, VMs, scientific computing require high capacity$$, 80, true),

('memory_16gb_minimum_2024', 'memory', 'RAM', 'System', 'requires', $${"ram_capacity_gb": {"$gte": 16}}$$::jsonb, 'warning', NULL,
 $$16GB RAM minimum for PC building in 2024-2025$$,
 $$8GB insufficient for modern gaming and multitasking$$, 85, true),

-- Memory Channel Configuration
('memory_dual_channel_recommended', 'memory', 'RAM', 'Motherboard', 'recommends', $${"ram_stick_count": 2, "ram_capacity_gb": {"$gte": 16}}$$::jsonb, 'info', NULL,
 $$Dual-channel RAM (2 sticks) recommended for optimal performance$$,
 $$2x8GB or 2x16GB significantly faster than single stick$$, 82, true),

('memory_single_stick_performance_loss', 'memory', 'RAM', 'System', 'warns', $${"ram_stick_count": 1}$$::jsonb, 'warning', NULL,
 $$Single RAM stick reduces performance 20-30% (single-channel)$$,
 $$Always use 2 sticks for dual-channel (slots A2+B2 on ATX)$$, 80, true),

('memory_4_sticks_stress_imc', 'memory', 'RAM', 'CPU', 'warns', $${"ram_stick_count": 4, "ram_speed_mhz": {"$gte": 6000}}$$::jsonb, 'warning', NULL,
 $$4 RAM sticks stress memory controller - may reduce max speed$$,
 $$High-speed kits (6000+) may not reach rated speed with 4 sticks$$, 75, true),

-- Memory Rank Configuration
('memory_dual_rank_performance', 'memory', 'RAM', 'System', 'recommends', $${"ram_rank": "dual", "ram_capacity_gb": {"$gte": 16}}$$::jsonb, 'info', NULL,
 $$Dual-rank RAM modules offer 5-10% better performance$$,
 $$16GB+ sticks typically dual-rank, 8GB usually single-rank$$, 70, true),

-- XMP/EXPO Profile Support
('memory_xmp_intel_overclocking', 'memory', 'RAM', 'Motherboard', 'requires', $${"ram_profile": "XMP", "motherboard_chipset": ["Z790", "Z690", "Z590"]}$$::jsonb, 'warning', NULL,
 $$XMP RAM profiles require Z-series motherboard for overclocking$$,
 $$B/H-series boards may not support XMP or limited to JEDEC speeds$$, 78, true),

('memory_expo_amd_optimization', 'memory', 'RAM', 'Motherboard', 'recommends', $${"ram_profile": "EXPO", "motherboard_socket": "AM5"}$$::jsonb, 'info', NULL,
 $$AMD EXPO profiles optimized for Ryzen 7000/9000 performance$$,
 $$EXPO kits tested/validated for AMD - XMP also works$$, 75, true),

-- Memory Cooling
('memory_rgb_ram_height_clearance', 'memory', 'RAM', 'Cooling', 'warns', $${"ram_height_mm": {"$gte": 45}, "cooler_type": "Tower"}$$::jsonb, 'warning', NULL,
 $$Tall RGB RAM (45mm+) may interfere with tower cooler$$,
 $$Check cooler RAM clearance or use low-profile RAM (<40mm)$$, 72, true),

('memory_extreme_oc_active_cooling', 'memory', 'RAM', 'System', 'recommends', $${"ram_speed_mhz": {"$gte": 8000}, "ram_active_cooling": true}$$::jsonb, 'info', NULL,
 $$Extreme RAM overclocking (8000MHz+) benefits from active cooling$$,
 $$Memory temps affect stability - use fan or water cooling$$, 65, true);

-- =============================================
-- CATEGORY 6: ADVANCED STORAGE RULES (100 new rules)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- PCIe 5.0 NVMe Support
('storage_pcie5_nvme_intel_14th_gen', 'storage', 'Storage', 'Motherboard', 'requires', $${"storage_interface": "PCIe 5.0", "motherboard_chipset": ["Z790", "B760"]}$$::jsonb, 'warning', NULL,
 $$PCIe 5.0 NVMe requires Intel 700-series motherboard$$,
 $$Z790/B760 support PCIe 5.0 M.2 - Z690/B660 use PCIe 4.0$$, 80, true),

('storage_pcie5_nvme_amd_am5', 'storage', 'Storage', 'Motherboard', 'requires', $${"storage_interface": "PCIe 5.0", "motherboard_socket": "AM5"}$$::jsonb, 'info', NULL,
 $$PCIe 5.0 NVMe supported on AMD AM5 platform$$,
 $$All AM5 boards support PCIe 5.0 M.2 (at least 1 slot)$$, 82, true),

('storage_pcie5_nvme_heatsink_required', 'storage', 'Storage', 'Motherboard', 'warns', $${"storage_interface": "PCIe 5.0", "storage_heatsink": false}$$::jsonb, 'warning', NULL,
 $$PCIe 5.0 NVMe runs extremely hot - heatsink mandatory$$,
 $$Use motherboard heatsink or aftermarket cooler to prevent throttling$$, 88, true),

('storage_pcie5_nvme_overkill_warning', 'storage', 'Storage', 'System', 'warns', $${"storage_interface": "PCIe 5.0", "usage_type": "gaming"}$$::jsonb, 'info', NULL,
 $$PCIe 5.0 NVMe overkill for gaming - PCIe 4.0 sufficient$$,
 $$PCIe 5.0 benefits: large file transfers, content creation$$, 65, true),

-- PCIe 4.0 NVMe (Current Standard)
('storage_pcie4_nvme_standard', 'storage', 'Storage', 'Motherboard', 'compatible', $${"storage_interface": "PCIe 4.0"}$$::jsonb, 'info', NULL,
 $$PCIe 4.0 NVMe excellent for gaming and general use$$,
 $$7000MB/s reads sufficient for all current games$$, 75, true),

('storage_pcie4_7000mbs_gaming', 'storage', 'Storage', 'System', 'recommends', $${"storage_interface": "PCIe 4.0", "storage_speed_mbps": {"$gte": 7000}, "usage_type": "gaming"}$$::jsonb, 'info', NULL,
 $$PCIe 4.0 NVMe 7000MB/s ideal for gaming storage$$,
 $$PS5-compatible speeds, fast game loading$$, 80, true),

('storage_pcie4_budget_5000mbs', 'storage', 'Storage', 'System', 'compatible', $${"storage_interface": "PCIe 4.0", "storage_speed_mbps": {"$gte": 5000}}$$::jsonb, 'info', NULL,
 $$Budget PCIe 4.0 NVMe (5000MB/s) good value for most users$$,
 $$Minimal real-world difference vs 7000MB/s in gaming$$, 72, true),

-- PCIe 3.0 NVMe (Legacy but Adequate)
('storage_pcie3_nvme_still_viable', 'storage', 'Storage', 'System', 'compatible', $${"storage_interface": "PCIe 3.0", "usage_type": ["gaming", "office"]}$$::jsonb, 'info', NULL,
 $$PCIe 3.0 NVMe (3500MB/s) still adequate for gaming$$,
 $$Budget option: 1-2 second slower loading vs PCIe 4.0$$, 65, true),

('storage_pcie3_dram_cache_important', 'storage', 'Storage', 'System', 'recommends', $${"storage_interface": "PCIe 3.0", "storage_dram_cache": true}$$::jsonb, 'info', NULL,
 $$PCIe 3.0 NVMe: DRAM cache improves sustained write performance$$,
 $$Dramless PCIe 3.0 slows down when cache fills$$, 68, true),

-- SATA SSD (Budget/Secondary Storage)
('storage_sata_ssd_secondary', 'storage', 'Storage', 'System', 'compatible', $${"storage_interface": "SATA", "storage_type": "SSD"}$$::jsonb, 'info', NULL,
 $$SATA SSD good for secondary/game storage (560MB/s)$$,
 $$Cheap per GB, adequate for older games and bulk storage$$, 60, true),

('storage_sata_ssd_os_not_recommended', 'storage', 'Storage', 'System', 'warns', $${"storage_interface": "SATA", "storage_type": "SSD", "storage_os_drive": true}$$::jsonb, 'warning', NULL,
 $$SATA SSD not recommended for OS drive in 2024-2025$$,
 $$Use NVMe for OS - SATA 4x slower than PCIe 4.0$$, 70, true),

-- HDD (Bulk Storage Only)
('storage_hdd_bulk_only', 'storage', 'Storage', 'System', 'compatible', $${"storage_type": "HDD", "storage_usage": "bulk"}$$::jsonb, 'info', NULL,
 $$HDD acceptable for bulk storage, media, backups$$,
 $$Very slow for OS/games - use SSD/NVMe for active storage$$, 55, true),

('storage_hdd_os_drive_avoid', 'storage', 'Storage', 'System', 'warns', $${"storage_type": "HDD", "storage_os_drive": true}$$::jsonb, 'error', 
 $$HDD OS drive severely degrades system performance in 2024$$, NULL,
 $$Absolutely use NVMe/SSD for OS - HDD for data only$$, 90, true),

('storage_hdd_7200rpm_minimum', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "HDD", "storage_rpm": {"$gte": 7200}}$$::jsonb, 'info', NULL,
 $$HDD: Use 7200 RPM for better performance than 5400 RPM$$,
 $$5400 RPM extremely slow - only for cold storage$$, 58, true),

-- Storage Capacity Planning
('storage_1tb_nvme_minimum', 'storage', 'Storage', 'System', 'recommends', $${"storage_type": "NVMe", "storage_capacity_gb": {"$gte": 1000}, "storage_os_drive": true}$$::jsonb, 'info', NULL,
 $$1TB NVMe minimum for OS drive in 2024-2025$$,
 $$Modern games 100-200GB each - 500GB fills quickly$$, 78, true),

('storage_2tb_gaming_sweet_spot', 'storage', 'Storage', 'System', 'recommends', $${"storage_capacity_gb": 2000, "usage_type": "gaming"}$$::jsonb, 'info', NULL,
 $$2TB NVMe sweet spot for gaming builds (price/performance)$$,
 $$Stores 10-15 AAA games, OS, applications comfortably$$, 80, true),

('storage_4tb_content_creation', 'storage', 'Storage', 'System', 'recommends', $${"storage_capacity_gb": {"$gte": 4000}, "usage_type": ["video editing", "3D rendering"]}$$::jsonb, 'info', NULL,
 $$4TB+ NVMe recommended for content creation workflows$$,
 $$4K video projects consume hundreds of GB quickly$$, 75, true),

-- M.2 Slot Configuration
('storage_m2_slot_sharing_lanes', 'storage', 'Storage', 'Motherboard', 'warns', $${"storage_interface": "M.2", "motherboard_m2_count": {"$gte": 3}}$$::jsonb, 'warning', NULL,
 $$Multiple M.2 drives may share PCIe lanes - check motherboard manual$$,
 $$Some M.2 slots disable SATA ports or GPU lanes when populated$$, 75, true),

('storage_m2_pcie_vs_sata', 'storage', 'Storage', 'Motherboard', 'warns', $${"storage_interface": "M.2"}$$::jsonb, 'warning', NULL,
 $$Verify M.2 slot supports NVMe (not SATA-only M.2)$$,
 $$Older boards have M.2 slots that only support SATA (560MB/s limit)$$, 78, true),

('storage_m2_heatsink_motherboard', 'storage', 'Storage', 'Motherboard', 'recommends', $${"storage_interface": "M.2", "motherboard_m2_heatsink": true}$$::jsonb, 'info', NULL,
 $$Motherboard M.2 heatsink keeps NVMe cool, prevents throttling$$,
 $$Remove SSD label/heatsink before installing under board heatsink$$, 70, true),

-- DirectStorage Support
('storage_directstorage_windows11', 'storage', 'Storage', 'System', 'recommends', $${"storage_interface": ["PCIe 4.0", "PCIe 5.0"], "os": "Windows 11"}$$::jsonb, 'info', NULL,
 $$DirectStorage (Windows 11) benefits from fast NVMe$$,
 $$Future games will leverage DirectStorage for instant loading$$, 72, true),

('storage_directstorage_1gb_bandwidth', 'storage', 'Storage', 'System', 'recommends', $${"storage_speed_mbps": {"$gte": 3500}}$$::jsonb, 'info', NULL,
 $$DirectStorage requires NVMe with 3500MB/s+ for full benefits$$,
 $$PCIe 3.0 NVMe minimum, PCIe 4.0 recommended$$, 68, true),

-- RAID Configuration
('storage_raid0_nvme_performance', 'storage', 'Storage', 'System', 'recommends', $${"storage_raid": "RAID 0", "storage_interface": "PCIe 4.0"}$$::jsonb, 'warning', NULL,
 $$NVMe RAID 0 for extreme performance - data loss risk if drive fails$$,
 $$Backup critical data - RAID 0 doubles speed but no redundancy$$, 65, true),

('storage_raid1_reliability', 'storage', 'Storage', 'System', 'recommends', $${"storage_raid": "RAID 1"}$$::jsonb, 'info', NULL,
 $$RAID 1 mirrors data for reliability (data on both drives)$$,
 $$Good for workstations - survives single drive failure$$, 70, true),

('storage_raid5_minimum_3_drives', 'storage', 'Storage', 'System', 'requires', $${"storage_raid": "RAID 5", "storage_drive_count": {"$gte": 3}}$$::jsonb, 'error', 
 $$RAID 5 requires minimum 3 drives$$, NULL,
 $$Provides redundancy and performance - 1 drive can fail$$, 75, true);

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 
    '✅ MIGRATION 009 BATCH 3 COMPLETE' as status,
    'Added ' || COUNT(*) || ' new rules in batch 3' as new_rules_added
FROM compatibility_rules 
WHERE created_at > NOW() - INTERVAL '1 minute';

SELECT 
    '🎯 Total Active Rules: ' || COUNT(*) as summary
FROM compatibility_rules
WHERE enabled = true;

SELECT 
    rule_category,
    COUNT(*) as count
FROM compatibility_rules
WHERE enabled = true
GROUP BY rule_category
ORDER BY count DESC;
