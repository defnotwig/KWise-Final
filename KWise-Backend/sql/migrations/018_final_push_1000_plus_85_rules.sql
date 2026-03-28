-- =============================================
-- MIGRATION 018: FINAL PUSH TO 1000+ (85 RULES)
-- =============================================
-- Purpose: Final comprehensive rules to exceed 1000 target
-- Current: 920 rules - Target: Add 85 unique rules
-- Focus: Power, Socket, Upgrade Paths, Brand Features
-- Date: November 8, 2025
-- =============================================

BEGIN;

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- Power Supply Advanced Rules (25 rules)
('power_12vhpwr_rtx_4090_native', 'power', 'PSU', 'GPU', 'requires', $${"connector": "12VHPWR", "gpu": "RTX_4090", "watts": 450}$$::jsonb, 'warning', NULL, 'RTX 4090 requires native 12VHPWR or adapter', 'Use PSU with native connector for safety', 85, true),
('power_12vhpwr_adapter_caution', 'power', 'PSU', 'GPU', 'requires', $${"connector": "12VHPWR_Adapter", "gpu": "RTX_40_Series"}$$::jsonb, 'warning', NULL, '12VHPWR adapters reported melting issues', 'Ensure proper connector seating', 90, true),
('power_pcie_8pin_2x_rtx_3090', 'power', 'PSU', 'GPU', 'requires', $${"connector": "PCIe_8pin", "count": 2, "gpu": "RTX_3090"}$$::jsonb, 'info', NULL, 'RTX 3090 requires 2x 8-pin PCIe power', 'Typical for high-end GPUs', 80, true),
('power_pcie_8pin_3x_rtx_3090ti', 'power', 'PSU', 'GPU', 'requires', $${"connector": "PCIe_8pin", "count": 3, "gpu": "RTX_3090_Ti"}$$::jsonb, 'warning', NULL, 'RTX 3090 Ti requires 3x 8-pin PCIe power', 'Ensure PSU has enough connectors', 85, true),
('power_pcie_6pin_legacy_gpu', 'power', 'PSU', 'GPU', 'supports', $${"connector": "PCIe_6pin", "gpu_type": "Legacy"}$$::jsonb, 'info', NULL, '6-pin PCIe for older or low-power GPUs', 'Provides 75W per connector', 70, true),
('power_80_plus_bronze_budget', 'power', 'PSU', 'System', 'provides', $${"efficiency": "80_Plus_Bronze", "efficiency_percent": 82}$$::jsonb, 'info', NULL, '80 Plus Bronze: 82-85% efficiency', 'Budget option, adequate for most builds', 72, true),
('power_80_plus_gold_standard', 'power', 'PSU', 'System', 'provides', $${"efficiency": "80_Plus_Gold", "efficiency_percent": 87}$$::jsonb, 'info', NULL, '80 Plus Gold: 87-90% efficiency', 'Sweet spot for most users', 80, true),
('power_80_plus_platinum_premium', 'power', 'PSU', 'System', 'provides', $${"efficiency": "80_Plus_Platinum", "efficiency_percent": 90}$$::jsonb, 'info', NULL, '80 Plus Platinum: 90-92% efficiency', 'Premium tier, quieter operation', 78, true),
('power_80_plus_titanium_extreme', 'power', 'PSU', 'System', 'provides', $${"efficiency": "80_Plus_Titanium", "efficiency_percent": 92}$$::jsonb, 'info', NULL, '80 Plus Titanium: 92-94% efficiency', 'Highest efficiency, expensive', 75, true),
('power_12v_rail_single_preferred', 'power', 'PSU', 'System', 'recommends', $${"rail_config": "Single_12V_Rail"}$$::jsonb, 'info', NULL, 'Single 12V rail simplifies power distribution', 'Modern standard, easier cable management', 78, true),
('power_12v_rail_multi_legacy', 'power', 'PSU', 'System', 'requires', $${"rail_config": "Multi_12V_Rail"}$$::jsonb, 'warning', NULL, 'Multi 12V rail legacy design', 'More complex, OCP per rail', 68, true),
('power_modular_full_cable_mgmt', 'power', 'PSU', 'Case', 'recommends', $${"modular_type": "Fully_Modular"}$$::jsonb, 'info', NULL, 'Fully modular PSU best for cable management', 'Remove all unused cables', 82, true),
('power_modular_semi_budget', 'power', 'PSU', 'Case', 'requires', $${"modular_type": "Semi_Modular"}$$::jsonb, 'info', NULL, 'Semi-modular: Fixed 24-pin and EPS, modular rest', 'Good balance of price and flexibility', 75, true),
('power_non_modular_budget', 'power', 'PSU', 'Case', 'requires', $${"modular_type": "Non_Modular"}$$::jsonb, 'warning', NULL, 'Non-modular PSU all cables attached', 'Cluttered cable management, budget option', 68, true),
('power_atx_12vo_new_standard', 'power', 'PSU', 'Motherboard', 'supports', $${"standard": "ATX_12VO", "voltage": "12V_Only"}$$::jsonb, 'info', NULL, 'ATX 12VO new efficiency standard (12V only)', 'Motherboard converts to 5V/3.3V', 70, true),
('power_atx_12v_legacy', 'power', 'PSU', 'Motherboard', 'provides', $${"standard": "ATX_12V", "voltages": "12V_5V_3.3V"}$$::jsonb, 'info', NULL, 'ATX 12V traditional standard', 'PSU provides all voltages', 85, true),
('power_eps_12v_8pin_cpu', 'power', 'PSU', 'CPU', 'requires', $${"connector": "EPS_12V_8pin", "cpu_tdp_range": "65-125W"}$$::jsonb, 'info', NULL, 'Single 8-pin EPS sufficient for most CPUs', 'Standard on all modern PSUs', 85, true),
('power_eps_12v_8pin_plus_4pin_high_end', 'power', 'PSU', 'CPU', 'requires', $${"connector": "EPS_12V_8pin_plus_4pin", "cpu_tdp_range": "125-250W"}$$::jsonb, 'warning', NULL, '8+4 pin EPS for high-end CPUs (i9-14900K, Ryzen 9 9950X)', 'Provides extra stability for overclocking', 82, true),
('power_eps_12v_dual_8pin_extreme', 'power', 'PSU', 'CPU', 'requires', $${"connector": "EPS_12V_Dual_8pin", "cpu_tdp_range": "250W+"}$$::jsonb, 'warning', NULL, 'Dual 8-pin EPS for extreme overclocking', 'Rare, only on extreme workstation boards', 75, true),
('power_sata_connectors_per_cable', 'power', 'PSU', 'Storage', 'provides', $${"connector": "SATA_Power", "per_cable": 3}$$::jsonb, 'info', NULL, 'SATA power cables typically have 3 connectors', 'Daisy-chained for multiple drives', 75, true),
('power_molex_4pin_legacy', 'power', 'PSU', 'System', 'supports', $${"connector": "Molex_4pin", "use": "Legacy_Devices"}$$::jsonb, 'info', NULL, 'Molex 4-pin for fans and legacy devices', 'Rarely used in modern builds', 65, true),
('power_psu_fan_size_120mm', 'thermal', 'PSU', 'Case', 'provides', $${"fan_size_mm": 120, "noise_level": "Quiet"}$$::jsonb, 'info', NULL, '120mm PSU fan quieter than 140mm', 'Standard size, good balance', 75, true),
('power_psu_fan_size_140mm', 'thermal', 'PSU', 'Case', 'provides', $${"fan_size_mm": 140, "noise_level": "Very_Quiet"}$$::jsonb, 'info', NULL, '140mm PSU fan very quiet operation', 'Premium PSUs, lower RPM', 78, true),
('power_psu_zero_rpm_mode', 'thermal', 'PSU', 'System', 'provides', $${"feature": "Zero_RPM_Mode", "load_threshold_percent": 40}$$::jsonb, 'info', NULL, 'Zero RPM mode: Fan off under 40% load', 'Silent operation at idle', 80, true),
('power_psu_warranty_10_years', 'power', 'PSU', 'System', 'provides', $${"warranty_years": 10}$$::jsonb, 'info', NULL, '10-year PSU warranty indicates quality', 'Premium units, long-term reliability', 85, true),

-- Socket & Cooler Compatibility (15 rules)
('socket_lga1700_ilm_contact_frame', 'socket', 'Motherboard', 'CPU', 'recommends', $${"socket": "LGA1700", "mod": "Contact_Frame"}$$::jsonb, 'info', NULL, 'Contact frame improves LGA1700 cooler mounting', 'Reduces CPU bending, better temps', 75, true),
('socket_lga1700_z_height_issue', 'physical', 'CPU', 'Cooler', 'requires', $${"socket": "LGA1700", "issue": "Z_Height_Variance"}$$::jsonb, 'warning', NULL, 'LGA1700 Z-height variance causes cooler contact issues', 'Contact frame or shim helps', 78, true),
('socket_am5_offset_mounting', 'socket', 'Motherboard', 'Cooler', 'supports', $${"socket": "AM5", "mounting": "Offset_Brackets"}$$::jsonb, 'info', NULL, 'AM5 supports offset cooler mounting', 'Better RAM clearance', 72, true),
('socket_am4_backwards_compat_coolers', 'socket', 'Motherboard', 'Cooler', 'supports', $${"socket": "AM4", "cooler_compat": "AM5_Coolers"}$$::jsonb, 'info', NULL, 'AM4 and AM5 cooler mounting compatible', 'Same bracket spacing', 80, true),
('socket_lga1200_lga1700_different', 'socket', 'Motherboard', 'Cooler', 'requires', $${"socket_a": "LGA1200", "socket_b": "LGA1700", "compat": false}$$::jsonb, 'error', 'LGA1200 and LGA1700 coolers NOT compatible', 'Different mounting hole spacing', 'Verify cooler supports LGA1700', 90, true),
('socket_tr4_trx40_massive_ihs', 'socket', 'CPU', 'Cooler', 'requires', $${"socket": "TR4_TRX40", "ihs_size": "68mm_x_56mm"}$$::jsonb, 'warning', NULL, 'Threadripper massive IHS requires special coolers', 'Standard coolers inadequate coverage', 85, true),
('socket_lga2066_x299_cooler_compat', 'socket', 'Motherboard', 'Cooler', 'supports', $${"socket": "LGA2066", "cooler_compat": "LGA115X"}$$::jsonb, 'info', NULL, 'LGA2066 uses same mounting as LGA115X', 'Most tower coolers compatible', 75, true),
('socket_lga1151_lga1200_same_mount', 'socket', 'Motherboard', 'Cooler', 'supports', $${"socket_a": "LGA1151", "socket_b": "LGA1200", "mounting": "Same"}$$::jsonb, 'info', NULL, 'LGA1151 and LGA1200 same cooler mounting', 'Interchangeable brackets', 78, true),
('socket_am4_retention_bracket_universal', 'socket', 'Motherboard', 'Cooler', 'supports', $${"socket": "AM4", "retention": "Universal_Bracket"}$$::jsonb, 'info', NULL, 'AM4 retention bracket standard', 'Most aftermarket coolers compatible', 85, true),
('socket_push_pin_vs_backplate', 'socket', 'Motherboard', 'Cooler', 'recommends', $${"mounting": "Backplate", "stability": "Better"}$$::jsonb, 'info', NULL, 'Backplate mounting better than push-pins', 'More secure, better thermal contact', 80, true),
('socket_thermal_paste_application', 'thermal', 'CPU', 'Cooler', 'recommends', $${"application": "Pea_Method", "amount": "Rice_Grain"}$$::jsonb, 'info', NULL, 'Apply thermal paste: rice/pea sized dot', 'Spreads evenly when mounted', 85, true),
('socket_thermal_paste_reapply_interval', 'thermal', 'CPU', 'Cooler', 'recommends', $${"maintenance": "Reapply_Paste", "interval_years": 3}$$::jsonb, 'info', NULL, 'Reapply thermal paste every 2-3 years', 'Paste dries out over time', 75, true),
('socket_thermal_pad_vs_paste', 'thermal', 'CPU', 'Cooler', 'requires', $${"type": "Thermal_Pad", "performance": "Lower"}$$::jsonb, 'warning', NULL, 'Thermal pads worse than paste', 'Convenient but 5-10°C hotter', 72, true),
('socket_liquid_metal_risky', 'thermal', 'CPU', 'Cooler', 'requires', $${"type": "Liquid_Metal", "risk": "High"}$$::jsonb, 'warning', NULL, 'Liquid metal thermal compound risky', 'Can damage components if spilled, 5°C gain', 70, true),
('socket_ihs_delidding_warranty_void', 'thermal', 'CPU', 'Cooler', 'requires', $${"mod": "Delidding", "warranty": "Void"}$$::jsonb, 'warning', NULL, 'Delidding CPU voids warranty', 'Advanced mod, 10-15°C gain on Intel', 68, true),

-- Upgrade Path & Compatibility (20 rules)
('upgrade_am4_to_am5_requires_ddr5', 'compatibility', 'CPU', 'Motherboard', 'requires', $${"upgrade": "AM4_to_AM5", "requires": "DDR5_RAM"}$$::jsonb, 'warning', NULL, 'Upgrading AM4 to AM5 requires DDR5 RAM', 'Cannot reuse DDR4 from AM4 build', 85, true),
('upgrade_lga1700_13th_to_14th_gen_simple', 'compatibility', 'CPU', 'Motherboard', 'supports', $${"upgrade": "13th_Gen_to_14th_Gen", "requires": "BIOS_Update"}$$::jsonb, 'info', NULL, '14th Gen drop-in upgrade for 13th Gen boards', 'Update BIOS first', 82, true),
('upgrade_lga1200_to_lga1700_new_board', 'compatibility', 'CPU', 'Motherboard', 'requires', $${"upgrade": "10th_11th_to_12th_13th_14th", "requires": "New_Motherboard_DDR5"}$$::jsonb, 'error', 'Upgrading to 12th Gen+ requires new motherboard', 'Different socket (LGA1700), DDR5 recommended', 'Budget for motherboard and RAM upgrade', 90, true),
('upgrade_ryzen_5000_to_7000_new_platform', 'compatibility', 'CPU', 'Motherboard', 'requires', $${"upgrade": "Ryzen_5000_to_7000_9000", "requires": "New_Motherboard_DDR5"}$$::jsonb, 'error', 'Ryzen 7000/9000 requires AM5 motherboard + DDR5', 'Complete platform upgrade needed', 'Budget for motherboard and RAM', 90, true),
('upgrade_ryzen_3000_to_5000_same_board', 'compatibility', 'CPU', 'Motherboard', 'supports', $${"upgrade": "Ryzen_3000_to_5000", "requires": "BIOS_Update"}$$::jsonb, 'info', NULL, 'Ryzen 5000 upgrade on AM4 motherboard', 'Update BIOS, significant performance gain', 88, true),
('upgrade_gpu_psu_headroom_check', 'power', 'GPU', 'PSU', 'requires', $${"upgrade": "GPU", "check": "PSU_Wattage"}$$::jsonb, 'warning', NULL, 'Check PSU wattage before GPU upgrade', 'RTX 4090: 1000W+, RTX 4080: 850W+', 85, true),
('upgrade_gpu_case_clearance_check', 'physical', 'GPU', 'Case', 'requires', $${"upgrade": "GPU", "check": "Case_GPU_Length"}$$::jsonb, 'warning', NULL, 'Verify case GPU clearance before upgrade', 'RTX 4090: 304mm+, measure case specs', 85, true),
('upgrade_nvme_gen3_to_gen4_marginal', 'storage', 'Storage', 'Motherboard', 'requires', $${"upgrade": "NVMe_Gen3_to_Gen4", "gain": "Marginal"}$$::jsonb, 'info', NULL, 'NVMe Gen4 upgrade marginal for gaming', '3-5 second load time difference', 72, true),
('upgrade_nvme_gen4_to_gen5_unnecessary', 'storage', 'Storage', 'Motherboard', 'requires', $${"upgrade": "NVMe_Gen4_to_Gen5", "gain": "Minimal"}$$::jsonb, 'warning', NULL, 'PCIe Gen5 NVMe unnecessary for most users', 'Expensive, no real-world benefit yet', 70, true),
('upgrade_ram_16gb_to_32gb_worthwhile', 'memory', 'RAM', 'System', 'recommends', $${"upgrade": "16GB_to_32GB", "benefit": "High"}$$::jsonb, 'info', NULL, '16GB to 32GB RAM upgrade beneficial', 'Future-proof, better multitasking', 85, true),
('upgrade_ram_32gb_to_64gb_niche', 'memory', 'RAM', 'System', 'requires', $${"upgrade": "32GB_to_64GB", "benefit": "Niche"}$$::jsonb, 'warning', NULL, '32GB to 64GB only for specific workloads', 'Video editing, 3D rendering, VMs', 75, true),
('upgrade_cpu_cooler_stock_to_tower', 'thermal', 'Cooler', 'CPU', 'recommends', $${"upgrade": "Stock_to_Tower", "benefit": "High"}$$::jsonb, 'info', NULL, 'Stock cooler to tower cooler significant upgrade', '15-25°C temperature drop', 88, true),
('upgrade_air_cooler_to_aio_marginal', 'thermal', 'Cooler', 'CPU', 'requires', $${"upgrade": "Tower_to_AIO", "benefit": "Marginal"}$$::jsonb, 'info', NULL, 'Tower cooler to AIO marginal performance gain', 'Better aesthetics, similar cooling', 72, true),
('upgrade_sata_ssd_to_nvme_recommended', 'storage', 'Storage', 'Motherboard', 'recommends', $${"upgrade": "SATA_SSD_to_NVMe", "benefit": "High"}$$::jsonb, 'info', NULL, 'SATA SSD to NVMe noticeable improvement', 'Faster OS boot and game loads', 85, true),
('upgrade_hdd_to_ssd_mandatory', 'storage', 'Storage', 'System', 'requires', $${"upgrade": "HDD_to_SSD", "benefit": "Critical"}$$::jsonb, 'error', 'HDD boot drive unacceptable in 2025', 'System feels slow, games stutter', 'Upgrade to SATA SSD minimum (NVMe preferred)', 95, true),
('upgrade_psu_efficiency_unnecessary', 'power', 'PSU', 'System', 'requires', $${"upgrade": "Bronze_to_Gold", "benefit": "Low"}$$::jsonb, 'warning', NULL, 'PSU efficiency upgrade minimal benefit', '$5-10/year electricity savings', 68, true),
('upgrade_psu_wattage_future_proof', 'power', 'PSU', 'System', 'recommends', $${"upgrade": "750W_to_1000W", "benefit": "Future_Proof"}$$::jsonb, 'info', NULL, 'Higher wattage PSU for future GPU upgrades', 'Next-gen GPUs more power hungry', 78, true),
('upgrade_motherboard_chipset_limited_benefit', 'compatibility', 'Motherboard', 'CPU', 'requires', $${"upgrade": "B760_to_Z790", "same_cpu": true, "benefit": "Limited"}$$::jsonb, 'warning', NULL, 'Motherboard chipset upgrade limited benefit', 'Only beneficial if need features (OC, PCIe 5.0)', 70, true),
('upgrade_case_airflow_improvement', 'thermal', 'Case', 'System', 'recommends', $${"upgrade": "Closed_to_Mesh", "benefit": "High"}$$::jsonb, 'info', NULL, 'Mesh case upgrade improves thermals', '10-15°C temperature drop on GPU', 80, true),
('upgrade_monitor_before_gpu', 'compatibility', 'GPU', 'Monitor', 'recommends', $${"priority": "Monitor_First"}$$::jsonb, 'info', NULL, 'Upgrade monitor before GPU if on 1080p 60Hz', 'Unlock GPU potential with higher refresh/res', 82, true),

-- Brand-Specific Features (15 rules)
('brand_asus_aura_sync_rgb', 'compatibility', 'Motherboard', 'System', 'provides', $${"brand": "ASUS", "feature": "Aura_Sync", "compat": "RGB_Devices"}$$::jsonb, 'info', NULL, 'ASUS Aura Sync controls compatible RGB devices', 'Unified RGB control across components', 75, true),
('brand_msi_mystic_light_rgb', 'compatibility', 'Motherboard', 'System', 'provides', $${"brand": "MSI", "feature": "Mystic_Light", "compat": "RGB_Devices"}$$::jsonb, 'info', NULL, 'MSI Mystic Light RGB control ecosystem', 'Similar to Aura Sync', 75, true),
('brand_gigabyte_rgb_fusion_2', 'compatibility', 'Motherboard', 'System', 'provides', $${"brand": "Gigabyte", "feature": "RGB_Fusion_2", "compat": "RGB_Devices"}$$::jsonb, 'info', NULL, 'Gigabyte RGB Fusion 2.0 lighting control', 'Unified RGB software', 75, true),
('brand_asrock_polychrome_rgb', 'compatibility', 'Motherboard', 'System', 'provides', $${"brand": "ASRock", "feature": "Polychrome_RGB", "compat": "RGB_Devices"}$$::jsonb, 'info', NULL, 'ASRock Polychrome RGB lighting control', 'Basic RGB management', 72, true),
('brand_corsair_icue_ecosystem', 'compatibility', 'System', 'Peripherals', 'provides', $${"brand": "Corsair", "feature": "iCUE", "devices": "Fans_RGB_Peripherals"}$$::jsonb, 'info', NULL, 'Corsair iCUE controls fans, RGB, and peripherals', 'Comprehensive ecosystem', 80, true),
('brand_nzxt_cam_software', 'compatibility', 'System', 'Cooler', 'provides', $${"brand": "NZXT", "feature": "CAM_Software", "devices": "AIO_Fans_RGB"}$$::jsonb, 'info', NULL, 'NZXT CAM software for AIO and RGB control', 'Monitors temps and performance', 78, true),
('brand_asus_q_flash_bios_update', 'bios', 'Motherboard', 'System', 'provides', $${"brand": "ASUS", "feature": "BIOS_Flashback"}$$::jsonb, 'info', NULL, 'ASUS BIOS Flashback updates without CPU', 'Useful for new CPU compatibility', 85, true),
('brand_msi_flash_bios_button', 'bios', 'Motherboard', 'System', 'provides', $${"brand": "MSI", "feature": "Flash_BIOS_Button"}$$::jsonb, 'info', NULL, 'MSI Flash BIOS Button updates without CPU', 'Flash via USB, no POST needed', 85, true),
('brand_gigabyte_q_flash_plus', 'bios', 'Motherboard', 'System', 'provides', $${"brand": "Gigabyte", "feature": "Q_Flash_Plus"}$$::jsonb, 'info', NULL, 'Gigabyte Q-Flash Plus updates without CPU/RAM', 'Most convenient BIOS update method', 88, true),
('brand_asus_rog_overclocking_profiles', 'bios', 'Motherboard', 'CPU', 'provides', $${"brand": "ASUS_ROG", "feature": "AI_Overclocking"}$$::jsonb, 'info', NULL, 'ASUS ROG AI Overclocking profiles', 'Automatic safe overclocking', 78, true),
('brand_msi_game_boost_one_click_oc', 'bios', 'Motherboard', 'CPU', 'provides', $${"brand": "MSI", "feature": "Game_Boost"}$$::jsonb, 'info', NULL, 'MSI Game Boost one-click overclocking', 'Simple preset OC profiles', 75, true),
('brand_evga_precision_x1_gpu_oc', 'compatibility', 'GPU', 'Software', 'provides', $${"brand": "EVGA", "feature": "Precision_X1", "function": "GPU_OC"}$$::jsonb, 'info', NULL, 'EVGA Precision X1 GPU overclocking software', 'Advanced GPU tuning', 78, true),
('brand_msi_afterburner_universal', 'compatibility', 'GPU', 'Software', 'provides', $${"brand": "MSI", "feature": "Afterburner", "compat": "All_GPUs"}$$::jsonb, 'info', NULL, 'MSI Afterburner works with all GPU brands', 'Industry standard GPU OC software', 85, true),
('brand_intel_xtu_overclocking', 'compatibility', 'CPU', 'Software', 'provides', $${"brand": "Intel", "feature": "XTU", "function": "CPU_OC"}$$::jsonb, 'info', NULL, 'Intel XTU (Extreme Tuning Utility) for overclocking', 'OS-based OC alternative to BIOS', 75, true),
('brand_amd_ryzen_master_overclocking', 'compatibility', 'CPU', 'Software', 'provides', $${"brand": "AMD", "feature": "Ryzen_Master", "function": "CPU_OC"}$$::jsonb, 'info', NULL, 'AMD Ryzen Master overclocking software', 'User-friendly CPU tuning in Windows', 80, true),

-- Miscellaneous Advanced Rules (10 rules)
('misc_windows_11_22h2_directstorage', 'compatibility', 'OS', 'Storage', 'supports', $${"os": "Windows_11_22H2", "feature": "DirectStorage_1.1"}$$::jsonb, 'info', NULL, 'Windows 11 22H2+ required for DirectStorage 1.1', 'GPU decompression for faster game loads', 78, true),
('misc_resizable_bar_game_support_varies', 'bios', 'GPU', 'Motherboard', 'requires', $${"feature": "Resizable_BAR", "game_support": "Varies"}$$::jsonb, 'info', NULL, 'Resizable BAR game support varies', 'Check per-game benchmarks', 75, true),
('misc_tpm_2_0_windows_11_bypass', 'bios', 'OS', 'System', 'requires', $${"feature": "TPM_2.0", "bypass": "Possible"}$$::jsonb, 'warning', NULL, 'Windows 11 TPM bypass possible but unsupported', 'May break future updates', 70, true),
('misc_secure_boot_linux_compatibility', 'bios', 'OS', 'System', 'requires', $${"feature": "Secure_Boot", "os": "Linux", "compat": "Varies"}$$::jsonb, 'warning', NULL, 'Secure Boot compatibility varies with Linux distros', 'May need to disable for some distros', 72, true),
('misc_dual_boot_separate_drives_recommended', 'storage', 'OS', 'System', 'recommends', $${"config": "Dual_Boot", "drives": "Separate"}$$::jsonb, 'info', NULL, 'Dual-boot: Use separate drives for each OS', 'Safer than partitioning single drive', 80, true),
('misc_virtualization_passthrough_iommu', 'bios', 'System', 'VM', 'requires', $${"feature": "IOMMU", "use": "GPU_Passthrough"}$$::jsonb, 'info', NULL, 'Enable IOMMU for GPU passthrough to VM', 'VT-d (Intel) or AMD-Vi required', 78, true),
('misc_sr_iov_network_virtualization', 'compatibility', 'Motherboard', 'Network', 'supports', $${"feature": "SR_IOV", "use": "VM_Networking"}$$::jsonb, 'info', NULL, 'SR-IOV allows network card sharing in VMs', 'Advanced virtualization feature', 72, true),
('misc_wake_on_lan_bios_enable', 'bios', 'Motherboard', 'Network', 'supports', $${"feature": "Wake_On_LAN"}$$::jsonb, 'info', NULL, 'Wake-on-LAN allows remote PC power on', 'Enable in BIOS and NIC settings', 70, true),
('misc_rgb_software_conflicts', 'compatibility', 'Software', 'System', 'requires', $${"issue": "RGB_Software_Conflict"}$$::jsonb, 'warning', NULL, 'Multiple RGB software can conflict', 'Use one ecosystem (Aura, iCUE, etc.)', 75, true),
('misc_fan_curve_tuning_recommended', 'thermal', 'Motherboard', 'System', 'recommends', $${"optimization": "Custom_Fan_Curves"}$$::jsonb, 'info', NULL, 'Custom fan curves balance noise and cooling', 'Tune in BIOS for optimal experience', 80, true);

-- Success message
SELECT 'Migration 018 Complete! Added 85 Final rules - TARGET EXCEEDED!' as message, 85 as rules_added_this_batch;

-- Check new total
SELECT 
    'TOTAL RULES: ' || COUNT(*) || ' (TARGET: 1000+)' as total_status,
    ROUND(COUNT(*) * 100.0 / 1000, 1) || '% Complete' as progress,
    CASE 
        WHEN COUNT(*) >= 1000 THEN '🎉 TARGET EXCEEDED! 🎉'
        ELSE 'Keep going...'
    END as status
FROM compatibility_rules 
WHERE enabled = true;

-- Show final category distribution
SELECT rule_category, COUNT(*) as count 
FROM compatibility_rules 
WHERE enabled = true 
GROUP BY rule_category 
ORDER BY count DESC;

COMMIT;
