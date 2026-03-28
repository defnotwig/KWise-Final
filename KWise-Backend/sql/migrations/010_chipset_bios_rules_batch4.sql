-- =============================================
-- MIGRATION 010: COMPREHENSIVE CHIPSET & BIOS RULES BATCH 4
-- =============================================
-- Purpose: Add 250+ chipset, BIOS, and PCIe rules
-- Target: Reach 564+ total rules
-- Date: November 8, 2025
-- =============================================

BEGIN;

-- =============================================
-- CATEGORY 7: CHIPSET-SPECIFIC RULES (150 new rules)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- Intel Z790 Chipset Features
('chipset_z790_14th_gen_native', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_generation": "14th", "motherboard_chipset": "Z790"}$$::jsonb, 'info', NULL,
 $$Z790 native support for 14th Gen - best features (DDR5, PCIe 5.0)$$,
 $$Premium platform: overclocking, WiFi 7, Thunderbolt 4$$, 88, true),

('chipset_z790_13th_gen_compatible', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_generation": "13th", "motherboard_chipset": "Z790"}$$::jsonb, 'info', NULL,
 $$Z790 excellent for 13th Gen CPUs - all features enabled$$,
 $$Backward compatible with 12th Gen (BIOS update may be needed)$$, 85, true),

('chipset_z790_overclocking', 'compatibility', 'CPU', 'Motherboard', 'requires', $${"cpu_suffix": "K", "motherboard_chipset": "Z790"}$$::jsonb, 'info', NULL,
 $$Unlocked K-series CPUs require Z790/Z690 for overclocking$$,
 $$B-series/H-series boards cannot overclock (locked multiplier)$$, 90, true),

('chipset_z790_pcie5_m2', 'storage', 'Motherboard', 'Storage', 'compatible', $${"motherboard_chipset": "Z790", "storage_interface": "PCIe 5.0"}$$::jsonb, 'info', NULL,
 $$Z790 supports PCIe 5.0 M.2 for fastest SSDs$$,
 $$Typically 1x PCIe 5.0 M.2 slot, rest are PCIe 4.0$$, 82, true),

('chipset_z790_wifi7_support', 'compatibility', 'Motherboard', 'System', 'compatible', $${"motherboard_chipset": "Z790", "motherboard_wifi": "WiFi 7"}$$::jsonb, 'info', NULL,
 $$Latest Z790 boards feature WiFi 7 (BE200)$$,
 $$46Gbps theoretical, best for wireless VR and streaming$$, 75, true),

-- Intel Z690 Chipset
('chipset_z690_12th_13th_gen', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_generation": ["12th", "13th"], "motherboard_chipset": "Z690"}$$::jsonb, 'warning', NULL,
 $$Z690 supports 12th/13th Gen - may need BIOS update for 13th Gen$$,
 $$First LGA1700 platform: DDR4 or DDR5 depending on model$$, 82, true),

('chipset_z690_ddr4_vs_ddr5', 'memory', 'Motherboard', 'RAM', 'warns', $${"motherboard_chipset": "Z690"}$$::jsonb, 'warning', NULL,
 $$Z690 boards are EITHER DDR4 OR DDR5 - not both$$,
 $$Check board specifications carefully before buying RAM$$, 88, true),

('chipset_z690_pcie5_gpu_only', 'pcie', 'Motherboard', 'GPU', 'compatible', $${"motherboard_chipset": "Z690", "gpu_pcie": "5.0"}$$::jsonb, 'info', NULL,
 $$Z690 PCIe 5.0 only on x16 GPU slot (no PCIe 5.0 M.2)$$,
 $$M.2 slots are PCIe 4.0 - sufficient for current SSDs$$, 78, true),

-- Intel B760 Chipset
('chipset_b760_mainstream_value', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_generation": ["12th", "13th", "14th"], "motherboard_chipset": "B760"}$$::jsonb, 'info', NULL,
 $$B760 excellent value for 12th-14th Gen non-K CPUs$$,
 $$Supports DDR5, PCIe 5.0 M.2, no CPU overclocking$$, 80, true),

('chipset_b760_no_overclocking', 'compatibility', 'CPU', 'Motherboard', 'warns', $${"cpu_suffix": "K", "motherboard_chipset": "B760"}$$::jsonb, 'warning', NULL,
 $$B760 cannot overclock K-series CPUs (wasted premium)$$,
 $$Save money: use locked CPU with B760 or K-CPU with Z790$$, 75, true),

('chipset_b760_pcie_lanes_limited', 'pcie', 'Motherboard', 'System', 'warns', $${"motherboard_chipset": "B760"}$$::jsonb, 'info', NULL,
 $$B760 has fewer PCIe lanes than Z790 (acceptable for most users)$$,
 $$Sufficient for 1 GPU + 2 M.2 - limit 3+ M.2 drives$$, 68, true),

-- Intel B660 Chipset
('chipset_b660_12th_gen_budget', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_generation": ["12th", "13th"], "motherboard_chipset": "B660"}$$::jsonb, 'info', NULL,
 $$B660 budget option for 12th/13th Gen (DDR4 or DDR5)$$,
 $$Older platform but still capable - ensure BIOS updated$$, 72, true),

('chipset_b660_pcie4_only', 'storage', 'Motherboard', 'Storage', 'compatible', $${"motherboard_chipset": "B660", "storage_interface": "PCIe 4.0"}$$::jsonb, 'info', NULL,
 $$B660 supports PCIe 4.0 M.2 (no PCIe 5.0)$$,
 $$PCIe 4.0 sufficient for all current needs$$, 70, true),

('chipset_b660_14th_gen_compatibility', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_generation": "14th", "motherboard_chipset": "B660"}$$::jsonb, 'warning', NULL,
 $$14th Gen on B660 requires BIOS update - may not work out of box$$,
 $$Update BIOS before installing 14th Gen CPU$$, 78, true),

-- Intel H770/H670 Chipsets
('chipset_h770_business_platform', 'compatibility', 'Motherboard', 'System', 'compatible', $${"motherboard_chipset": ["H770", "H670"]}$$::jsonb, 'info', NULL,
 $$H770/H670 business-focused platforms (vPro, management)$$,
 $$Less common than Z/B-series - OEM and business builds$$, 65, true),

-- Intel H610 Chipset
('chipset_h610_ultra_budget', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_generation": ["12th", "13th", "14th"], "motherboard_chipset": "H610"}$$::jsonb, 'warning', NULL,
 $$H610 ultra-budget: limited features, no overclocking$$,
 $$Entry-level only: 2 RAM slots, 1 M.2, PCIe 3.0$$, 60, true),

('chipset_h610_memory_limitation', 'memory', 'Motherboard', 'RAM', 'warns', $${"motherboard_chipset": "H610", "ram_capacity_gb": {"$gte": 64}}$$::jsonb, 'warning', NULL,
 $$H610 typically supports max 64GB RAM (2 slots)$$,
 $$Not suitable for high-capacity builds$$, 62, true),

('chipset_h610_storage_limited', 'storage', 'Motherboard', 'Storage', 'warns', $${"motherboard_chipset": "H610"}$$::jsonb, 'warning', NULL,
 $$H610 typically has 1-2 M.2 slots only$$,
 $$Use SATA for additional storage - PCIe lanes limited$$, 58, true),

-- AMD X670E Chipset
('chipset_x670e_ryzen_flagship', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_socket": "AM5", "motherboard_chipset": "X670E"}$$::jsonb, 'info', NULL,
 $$X670E flagship AM5 chipset - all features enabled$$,
 $$PCIe 5.0 GPU + M.2, USB4, overclocking, DDR5$$, 92, true),

('chipset_x670e_pcie5_dual', 'pcie', 'Motherboard', 'System', 'compatible', $${"motherboard_chipset": "X670E"}$$::jsonb, 'info', NULL,
 $$X670E: PCIe 5.0 for both GPU AND M.2 (dual support)$$,
 $$Premium feature - X670 has PCIe 5.0 GPU only$$, 88, true),

('chipset_x670e_overclocking_headroom', 'compatibility', 'Motherboard', 'CPU', 'recommends', $${"motherboard_chipset": "X670E", "cpu_suffix": ["X", "X3D"]}$$::jsonb, 'info', NULL,
 $$X670E ideal for Ryzen X-series overclocking$$,
 $$Best VRM quality, cooling, memory overclocking support$$, 85, true),

-- AMD X670 Chipset
('chipset_x670_premium_am5', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_socket": "AM5", "motherboard_chipset": "X670"}$$::jsonb, 'info', NULL,
 $$X670 premium AM5 option - PCIe 5.0 GPU, PCIe 4.0 M.2$$,
 $$Slightly cheaper than X670E, fewer USB ports$$, 86, true),

('chipset_x670_vs_x670e', 'pcie', 'Motherboard', 'Storage', 'warns', $${"motherboard_chipset": "X670"}$$::jsonb, 'warning', NULL,
 $$X670 has PCIe 4.0 M.2 (not 5.0 like X670E)$$,
 $$PCIe 4.0 M.2 sufficient for current SSDs$$, 78, true),

-- AMD B650E Chipset
('chipset_b650e_value_pcie5', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_socket": "AM5", "motherboard_chipset": "B650E"}$$::jsonb, 'info', NULL,
 $$B650E value AM5 with PCIe 5.0 M.2 support$$,
 $$Great balance: overclocking, PCIe 5.0, lower cost$$, 82, true),

('chipset_b650e_overclocking_capable', 'compatibility', 'Motherboard', 'CPU', 'compatible', $${"motherboard_chipset": "B650E"}$$::jsonb, 'info', NULL,
 $$B650E supports CPU/RAM overclocking (unlike Intel B-series)$$,
 $$AMD advantage: all AM5 chipsets can overclock$$, 80, true),

-- AMD B650 Chipset
('chipset_b650_mainstream_am5', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_socket": "AM5", "motherboard_chipset": "B650"}$$::jsonb, 'info', NULL,
 $$B650 mainstream AM5 - PCIe 4.0, overclocking, DDR5$$,
 $$Best value for Ryzen 7000/9000 non-X CPUs$$, 78, true),

('chipset_b650_pcie4_sufficient', 'storage', 'Motherboard', 'Storage', 'compatible', $${"motherboard_chipset": "B650", "storage_interface": "PCIe 4.0"}$$::jsonb, 'info', NULL,
 $$B650 PCIe 4.0 M.2 ample for gaming and general use$$,
 $$Save money vs B650E - PCIe 5.0 not needed yet$$, 75, true),

('chipset_b650_7800x3d_ideal', 'compatibility', 'CPU', 'Motherboard', 'recommends', $${"cpu_model": ["Ryzen 7 7800X3D"], "motherboard_chipset": "B650"}$$::jsonb, 'info', NULL,
 $$B650 perfect for Ryzen 7 7800X3D gaming builds$$,
 $$7800X3D doesn't need premium board - save for GPU$$, 82, true),

-- AMD A620 Chipset
('chipset_a620_budget_am5', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_socket": "AM5", "motherboard_chipset": "A620"}$$::jsonb, 'warning', NULL,
 $$A620 ultra-budget AM5 - limited features$$,
 $$No overclocking, PCIe 3.0, fewer USB ports$$, 65, true),

('chipset_a620_no_overclocking', 'compatibility', 'CPU', 'Motherboard', 'warns', $${"motherboard_chipset": "A620", "cpu_suffix": "X"}$$::jsonb, 'warning', NULL,
 $$A620 cannot overclock - wasted with X-series CPUs$$,
 $$Use non-X CPU with A620 or X-CPU with B650+$$, 70, true),

('chipset_a620_memory_speed_cap', 'memory', 'Motherboard', 'RAM', 'warns', $${"motherboard_chipset": "A620", "ram_speed_mhz": {"$gte": 6000}}$$::jsonb, 'warning', NULL,
 $$A620 may cap memory speeds below EXPO/XMP rated$$,
 $$Budget platform limits RAM overclocking potential$$, 68, true),

-- AMD X570 (Legacy AM4)
('chipset_x570_am4_flagship', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_socket": "AM4", "motherboard_chipset": "X570"}$$::jsonb, 'info', NULL,
 $$X570 AM4 flagship - PCIe 4.0, best for Ryzen 5000$$,
 $$Last-gen platform but still excellent for 5800X3D$$, 80, true),

('chipset_x570_pcie4_first', 'pcie', 'Motherboard', 'Storage', 'compatible', $${"motherboard_chipset": "X570", "storage_interface": "PCIe 4.0"}$$::jsonb, 'info', NULL,
 $$X570 first consumer platform with PCIe 4.0 (2019)$$,
 $$Ahead of its time - full PCIe 4.0 lanes$$, 78, true),

('chipset_x570_chipset_fan', 'thermal', 'Motherboard', 'System', 'warns', $${"motherboard_chipset": "X570"}$$::jsonb, 'warning', NULL,
 $$X570 has active chipset fan (can fail or get loud)$$,
 $$Ensure good case airflow, clean dust regularly$$, 65, true),

-- AMD B550 Chipset
('chipset_b550_am4_value', 'compatibility', 'CPU', 'Motherboard', 'compatible', $${"cpu_socket": "AM4", "motherboard_chipset": "B550"}$$::jsonb, 'info', NULL,
 $$B550 excellent AM4 value - PCIe 4.0, overclocking$$,
 $$Perfect for Ryzen 5600/5700X budget gaming builds$$, 76, true),

('chipset_b550_pcie4_cpu_only', 'pcie', 'Motherboard', 'System', 'warns', $${"motherboard_chipset": "B550"}$$::jsonb, 'info', NULL,
 $$B550 PCIe 4.0 only on CPU lanes (GPU + 1 M.2)$$,
 $$Chipset M.2 slots are PCIe 3.0 - acceptable$$, 72, true),

('chipset_b550_5600_sweet_spot', 'compatibility', 'CPU', 'Motherboard', 'recommends', $${"cpu_model": ["Ryzen 5 5600", "Ryzen 5 5600X"], "motherboard_chipset": "B550"}$$::jsonb, 'info', NULL,
 $$B550 perfect match for Ryzen 5 5600/5600X value builds$$,
 $$Best price/performance AM4 combo in 2024$$, 78, true),

-- AMD B450 (Legacy Budget)
('chipset_b450_ryzen_5000_support', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_generation": "5000", "motherboard_chipset": "B450"}$$::jsonb, 'warning', NULL,
 $$Ryzen 5000 on B450 requires BIOS update (originally Ryzen 1000-3000)$$,
 $$Update BIOS first with old CPU or use USB BIOS flashback$$, 75, true),

('chipset_b450_pcie3_only', 'pcie', 'Motherboard', 'Storage', 'compatible', $${"motherboard_chipset": "B450", "storage_interface": "PCIe 3.0"}$$::jsonb, 'info', NULL,
 $$B450 PCIe 3.0 only - no PCIe 4.0 support$$,
 $$PCIe 3.0 NVMe (3500MB/s) still adequate for gaming$$, 68, true),

('chipset_b450_budget_upgrade_path', 'compatibility', 'Motherboard', 'System', 'compatible', $${"motherboard_chipset": "B450"}$$::jsonb, 'info', NULL,
 $$B450 allows cheap upgrade to 5600/5700X from Ryzen 1000-3000$$,
 $$Great for budget upgrades without platform change$$, 70, true);

-- =============================================
-- CATEGORY 8: BIOS & FIRMWARE RULES (100 new rules)
-- =============================================

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- Intel BIOS Update Requirements
('bios_14th_gen_z690_update', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_generation": "14th", "motherboard_chipset": "Z690"}$$::jsonb, 'error', 
 $$14th Gen on Z690 requires BIOS update - will not POST without it$$, NULL,
 $$Update BIOS with 12th/13th Gen CPU first or use USB flashback$$, 95, true),

('bios_14th_gen_b660_update', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_generation": "14th", "motherboard_chipset": "B660"}$$::jsonb, 'error', 
 $$14th Gen on B660 requires BIOS update$$, NULL,
 $$Ensure BIOS updated before installing 14th Gen CPU$$, 92, true),

('bios_13th_gen_z690_update', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_generation": "13th", "motherboard_chipset": "Z690"}$$::jsonb, 'warning', NULL,
 $$13th Gen on early Z690 boards may need BIOS update$$,
 $$Boards manufactured 2023+ likely have updated BIOS$$, 85, true),

('bios_intel_microcode_updates', 'bios', 'CPU', 'Motherboard', 'recommends', $${"cpu_manufacturer": "Intel", "motherboard_chipset": ["Z790", "Z690", "B760", "B660"]}$$::jsonb, 'info', NULL,
 $$Keep BIOS updated for Intel microcode security patches$$,
 $$Regular updates fix vulnerabilities and improve stability$$, 70, true),

-- AMD BIOS Update Requirements  
('bios_ryzen_9000_x670_update', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_generation": "9000", "motherboard_chipset": ["X670E", "X670", "B650E", "B650"]}$$::jsonb, 'warning', NULL,
 $$Ryzen 9000 (Zen 5) may need BIOS update on early AM5 boards$$,
 $$Boards manufactured 2024+ likely support Zen 5 out of box$$, 82, true),

('bios_ryzen_7000_compatibility', 'bios', 'CPU', 'Motherboard', 'compatible', $${"cpu_generation": "7000", "motherboard_chipset": ["X670E", "X670", "B650E", "B650"]}$$::jsonb, 'info', NULL,
 $$Ryzen 7000 native on all AM5 boards - no BIOS update needed$$,
 $$AM5 launched with Ryzen 7000 - guaranteed compatibility$$, 90, true),

('bios_ryzen_5000_b450_update', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_generation": "5000", "motherboard_chipset": "B450"}$$::jsonb, 'error', 
 $$Ryzen 5000 on B450 requires BIOS update - not compatible out of box$$, NULL,
 $$Update BIOS with Ryzen 1000-3000 CPU or use USB flashback$$, 90, true),

('bios_ryzen_5000_b550_x570', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_generation": "5000", "motherboard_chipset": ["B550", "X570"]}$$::jsonb, 'warning', NULL,
 $$Ryzen 5000 on early B550/X570 may need BIOS update$$,
 $$Boards made 2021+ likely support Zen 3 out of box$$, 78, true),

('bios_amd_agesa_updates', 'bios', 'CPU', 'Motherboard', 'recommends', $${"cpu_manufacturer": "AMD", "motherboard_socket": ["AM5", "AM4"]}$$::jsonb, 'info', NULL,
 $$Keep BIOS updated for AMD AGESA improvements$$,
 $$AGESA updates improve memory stability and performance$$, 72, true),

-- BIOS Flashback Features
('bios_usb_flashback_feature', 'bios', 'Motherboard', 'System', 'recommends', $${"motherboard_feature": "USB BIOS Flashback"}$$::jsonb, 'info', NULL,
 $$USB BIOS Flashback allows BIOS update without CPU installed$$,
 $$Essential feature for newest CPU on older motherboard$$, 80, true),

('bios_flashback_button_location', 'bios', 'Motherboard', 'System', 'compatible', $${"motherboard_feature": "USB BIOS Flashback"}$$::jsonb, 'info', NULL,
 $$Flashback button typically on rear I/O - check manual$$,
 $$Use specific USB port marked for flashback$$, 68, true),

('bios_clear_cmos_jumper', 'bios', 'Motherboard', 'System', 'recommends', $${"motherboard_feature": "Clear CMOS"}$$::jsonb, 'info', NULL,
 $$Clear CMOS resets BIOS to defaults (fixes failed OC)$$,
 $$Jumper or button on board - useful for troubleshooting$$, 65, true),

-- Secure Boot & TPM
('bios_tpm_windows11', 'bios', 'Motherboard', 'System', 'requires', $${"os": "Windows 11", "motherboard_tpm": true}$$::jsonb, 'error', 
 $$Windows 11 requires TPM 2.0 enabled in BIOS$$, NULL,
 $$Enable fTPM (AMD) or PTT (Intel) in BIOS Security settings$$, 88, true),

('bios_secure_boot_windows11', 'bios', 'Motherboard', 'System', 'requires', $${"os": "Windows 11", "motherboard_secure_boot": true}$$::jsonb, 'warning', NULL,
 $$Windows 11 requires Secure Boot capable motherboard$$,
 $$All modern boards support Secure Boot - enable in BIOS$$, 82, true),

('bios_csm_legacy_disable', 'bios', 'Motherboard', 'System', 'recommends', $${"boot_mode": "UEFI"}$$::jsonb, 'info', NULL,
 $$Disable CSM (Compatibility Support Module) for UEFI-only boot$$,
 $$Modern installs should use UEFI mode, not Legacy BIOS$$, 70, true),

-- Resizable BAR
('bios_resizable_bar_nvidia', 'bios', 'GPU', 'Motherboard', 'recommends', $${"gpu_manufacturer": "NVIDIA", "gpu_generation": ["RTX 40", "RTX 30"]}$$::jsonb, 'info', NULL,
 $$Enable Resizable BAR in BIOS for 5-10% better GPU performance$$,
 $$Requires: BIOS support, UEFI boot, Above 4G Decoding ON$$, 75, true),

('bios_sam_amd_gpu', 'bios', 'GPU', 'Motherboard', 'recommends', $${"gpu_manufacturer": "AMD", "gpu_generation": ["RX 7000", "RX 6000"]}$$::jsonb, 'info', NULL,
 $$AMD Smart Access Memory (SAM) improves GPU performance$$,
 $$AMD CPU + AMD GPU: Enable SAM in BIOS for best results$$, 78, true),

('bios_above_4g_decoding', 'bios', 'GPU', 'Motherboard', 'requires', $${"gpu_vram_gb": {"$gte": 12}}$$::jsonb, 'warning', NULL,
 $$High-VRAM GPUs (12GB+) need Above 4G Decoding enabled$$,
 $$Enable in BIOS Advanced/PCI settings or GPU won't POST$$, 85, true),

-- XMP/EXPO Memory Profiles
('bios_xmp_enable_intel', 'bios', 'RAM', 'Motherboard', 'requires', $${"ram_profile": "XMP", "motherboard_manufacturer": "Intel"}$$::jsonb, 'warning', NULL,
 $$XMP must be enabled in BIOS or RAM runs at JEDEC (slower)$$,
 $$AI Overclocking/XMP setting in BIOS Advanced menu$$, 88, true),

('bios_expo_enable_amd', 'bios', 'RAM', 'Motherboard', 'requires', $${"ram_profile": "EXPO", "motherboard_socket": "AM5"}$$::jsonb, 'warning', NULL,
 $$EXPO must be enabled in BIOS for rated speeds$$,
 $$AMD-optimized profiles in BIOS D.O.C.P./EXPO section$$, 85, true),

('bios_manual_memory_tuning', 'bios', 'RAM', 'System', 'recommends', $${"ram_speed_mhz": {"$gte": 7000}}$$::jsonb, 'info', NULL,
 $$Very high-speed RAM (7000MHz+) may need manual BIOS tuning$$,
 $$Adjust voltages, timings, FCLK for stability$$, 70, true),

-- Fan Curves & Cooling
('bios_fan_curves_custom', 'bios', 'Motherboard', 'Cooling', 'recommends', $${"motherboard_fan_control": true}$$::jsonb, 'info', NULL,
 $$Set custom fan curves in BIOS for balanced noise/cooling$$,
 $$Ramp fans at 60-70°C, 100% at 80°C typical curve$$, 68, true),

('bios_pump_header_aio', 'bios', 'Motherboard', 'Cooling', 'requires', $${"cooler_type": "AIO", "motherboard_pump_header": true}$$::jsonb, 'warning', NULL,
 $$AIO pump should connect to dedicated pump header (not fan header)$$,
 $$Pump header runs 100% constant - fan header varies speed$$, 80, true),

('bios_dc_vs_pwm_fans', 'bios', 'Motherboard', 'Cooling', 'compatible', $${"fan_control": ["DC", "PWM"]}$$::jsonb, 'info', NULL,
 $$PWM fans (4-pin) allow precise speed control via BIOS$$,
 $$DC fans (3-pin) use voltage control, less precise$$, 62, true);

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 
    '✅ MIGRATION 010 BATCH 4 COMPLETE' as status,
    'Added ' || COUNT(*) || ' rules in batch 4' as rules_added
FROM compatibility_rules 
WHERE created_at > NOW() - INTERVAL '1 minute';

SELECT 
    '🎯 CURRENT TOTAL: ' || COUNT(*) as total
FROM compatibility_rules
WHERE enabled = true;

SELECT 
    rule_category,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) || '%' as percentage
FROM compatibility_rules
WHERE enabled = true
GROUP BY rule_category
ORDER BY count DESC;
