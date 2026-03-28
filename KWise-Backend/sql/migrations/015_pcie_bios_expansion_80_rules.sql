-- =============================================
-- MIGRATION 015: PCIe & BIOS EXPANSION (80 RULES)
-- =============================================
-- Purpose: Expand PCIe and BIOS categories (currently weakest)
-- Current: PCIe (25), BIOS (39) - Total: 669 rules
-- Target: Add 80 rules focused on PCIe lanes, versions, BIOS features
-- Date: November 8, 2025
-- =============================================

BEGIN;

INSERT INTO compatibility_rules (rule_name, rule_category, component_a_category, component_b_category, rule_type, rule_expression, severity, error_message, warning_message, solution_message, priority, enabled) VALUES

-- =============================================
-- PCIe VERSION & LANE RULES (40 rules)
-- =============================================

-- PCIe 5.0 Support Rules
('pcie5_gpu_z790_support', 'pcie', 'GPU', 'Motherboard', 'requires', $${"pcie_version": 5.0, "chipset": "Z790"}$$::jsonb, 'info', NULL, 'Z790 supports PCIe 5.0 x16 for GPU', 'Use first PCIe slot for full bandwidth', 75, true),
('pcie5_nvme_z790_support', 'pcie', 'Storage', 'Motherboard', 'requires', $${"pcie_version": 5.0, "chipset": "Z790", "storage_type": "NVMe"}$$::jsonb, 'info', NULL, 'Z790 supports PCIe 5.0 NVMe SSD', 'Gen5 SSDs very fast but expensive', 70, true),
('pcie5_gpu_x670e_support', 'pcie', 'GPU', 'Motherboard', 'requires', $${"pcie_version": 5.0, "chipset": "X670E"}$$::jsonb, 'info', NULL, 'X670E supports PCIe 5.0 x16 for GPU', 'AMD platform PCIe 5.0 ready', 75, true),
('pcie5_nvme_x670e_support', 'pcie', 'Storage', 'Motherboard', 'requires', $${"pcie_version": 5.0, "chipset": "X670E", "storage_type": "NVMe"}$$::jsonb, 'info', NULL, 'X670E supports PCIe 5.0 NVMe SSD', 'Premium AMD platform feature', 70, true),
('pcie5_bandwidth_128gbps', 'pcie', 'GPU', 'Motherboard', 'requires', $${"pcie_version": 5.0, "lanes": 16}$$::jsonb, 'info', NULL, 'PCIe 5.0 x16 provides 128GB/s bandwidth', 'Future-proof for next-gen GPUs', 72, true),

-- PCIe 4.0 Support Rules  
('pcie4_gpu_b760_support', 'pcie', 'GPU', 'Motherboard', 'requires', $${"pcie_version": 4.0, "chipset": "B760"}$$::jsonb, 'info', NULL, 'B760 supports PCIe 4.0 x16 for GPU', 'Sufficient for current GPUs', 70, true),
('pcie4_nvme_b760_support', 'pcie', 'Storage', 'Motherboard', 'requires', $${"pcie_version": 4.0, "chipset": "B760", "storage_type": "NVMe"}$$::jsonb, 'info', NULL, 'B760 supports PCIe 4.0 NVMe SSD', 'Gen4 NVMe excellent value', 68, true),
('pcie4_gpu_b650_support', 'pcie', 'GPU', 'Motherboard', 'requires', $${"pcie_version": 4.0, "chipset": "B650"}$$::jsonb, 'info', NULL, 'B650 supports PCIe 4.0 x16 for GPU', 'AMD mainstream PCIe 4.0', 70, true),
('pcie4_nvme_b650_support', 'pcie', 'Storage', 'Motherboard', 'requires', $${"pcie_version": 4.0, "chipset": "B650", "storage_type": "NVMe"}$$::jsonb, 'info', NULL, 'B650 supports PCIe 4.0 NVMe SSD', 'Good balance of speed and cost', 68, true),
('pcie4_bandwidth_64gbps', 'pcie', 'GPU', 'Motherboard', 'requires', $${"pcie_version": 4.0, "lanes": 16}$$::jsonb, 'info', NULL, 'PCIe 4.0 x16 provides 64GB/s bandwidth', 'Plenty for RTX 4090 and below', 70, true),

-- PCIe 3.0 Limitations
('pcie3_gpu_h610_limit', 'pcie', 'GPU', 'Motherboard', 'requires', $${"pcie_version": 3.0, "chipset": "H610"}$$::jsonb, 'warning', NULL, 'H610 limited to PCIe 3.0 for GPU', 'May bottleneck high-end GPUs slightly', 65, true),
('pcie3_nvme_h610_limit', 'pcie', 'Storage', 'Motherboard', 'requires', $${"pcie_version": 3.0, "chipset": "H610", "storage_type": "NVMe"}$$::jsonb, 'info', NULL, 'H610 supports PCIe 3.0 NVMe SSD', 'Gen3 still fast for most uses', 62, true),
('pcie3_bandwidth_32gbps', 'pcie', 'GPU', 'Motherboard', 'requires', $${"pcie_version": 3.0, "lanes": 16}$$::jsonb, 'warning', NULL, 'PCIe 3.0 x16 provides 32GB/s bandwidth', 'Adequate for mid-range GPUs', 65, true),
('pcie3_high_end_gpu_warning', 'pcie', 'GPU', 'Motherboard', 'requires', $${"pcie_version": 3.0, "gpu_tier": "flagship"}$$::jsonb, 'warning', NULL, 'PCIe 3.0 may limit RTX 4080/4090 performance by 5-10%', 'Upgrade to PCIe 4.0+ platform recommended', 75, true),

-- PCIe Lane Distribution
('pcie_lanes_z790_total', 'pcie', 'Motherboard', 'System', 'provides', $${"chipset": "Z790", "total_pcie_lanes": 28}$$::jsonb, 'info', NULL, 'Z790 provides 28 PCIe lanes from chipset', 'Plus 16+4 from CPU', 68, true),
('pcie_lanes_b760_total', 'pcie', 'Motherboard', 'System', 'provides', $${"chipset": "B760", "total_pcie_lanes": 14}$$::jsonb, 'info', NULL, 'B760 provides 14 PCIe lanes from chipset', 'Fewer expansion slots available', 65, true),
('pcie_lanes_x670e_total', 'pcie', 'Motherboard', 'System', 'provides', $${"chipset": "X670E", "total_pcie_lanes": 24}$$::jsonb, 'info', NULL, 'X670E provides 24 PCIe lanes from chipset', 'Plus 24 from CPU', 70, true),
('pcie_lanes_b650_total', 'pcie', 'Motherboard', 'System', 'provides', $${"chipset": "B650", "total_pcie_lanes": 12}$$::jsonb, 'info', NULL, 'B650 provides 12 PCIe lanes from chipset', 'Limited expansion options', 65, true),

-- Multi-GPU PCIe Requirements
('pcie_dual_gpu_x16_x16', 'pcie', 'GPU', 'Motherboard', 'requires', $${"gpu_count": 2, "slot_config": "x16_x16"}$$::jsonb, 'warning', NULL, 'Dual GPU setup benefits from x16/x16 configuration', 'Requires HEDT/high-end platform', 80, true),
('pcie_dual_gpu_x16_x8', 'pcie', 'GPU', 'Motherboard', 'requires', $${"gpu_count": 2, "slot_config": "x16_x8"}$$::jsonb, 'info', NULL, 'Dual GPU can run x16/x8 with minimal loss', 'Common configuration on mainstream boards', 72, true),
('pcie_dual_gpu_x8_x8', 'pcie', 'GPU', 'Motherboard', 'requires', $${"gpu_count": 2, "slot_config": "x8_x8"}$$::jsonb, 'warning', NULL, 'Dual GPU x8/x8 may limit high-end cards', 'Check GPU scaling benchmarks', 70, true),

-- NVMe Slot Priority
('pcie_nvme_m2_1_priority', 'pcie', 'Storage', 'Motherboard', 'recommends', $${"storage_type": "NVMe", "slot": "M.2_1"}$$::jsonb, 'info', NULL, 'Use M.2_1 slot for primary NVMe (fastest)', 'Direct CPU connection on most boards', 75, true),
('pcie_nvme_m2_2_speed', 'pcie', 'Storage', 'Motherboard', 'recommends', $${"storage_type": "NVMe", "slot": "M.2_2"}$$::jsonb, 'info', NULL, 'M.2_2 slot may be PCIe 4.0 or chipset-connected', 'Check motherboard manual for specs', 68, true),
('pcie_nvme_m2_3_shared_lanes', 'pcie', 'Storage', 'Motherboard', 'requires', $${"storage_type": "NVMe", "slot": "M.2_3"}$$::jsonb, 'warning', NULL, 'M.2_3 may share lanes with SATA or PCIe slots', 'Verify compatibility in manual', 70, true),
('pcie_nvme_m2_4_limitation', 'pcie', 'Storage', 'Motherboard', 'requires', $${"storage_type": "NVMe", "slot": "M.2_4"}$$::jsonb, 'warning', NULL, 'M.2_4 often PCIe 3.0 x2 only (slower)', 'Use for secondary storage', 65, true),

-- PCIe Bifurcation
('pcie_bifurcation_z790', 'pcie', 'Motherboard', 'System', 'supports', $${"chipset": "Z790", "feature": "bifurcation"}$$::jsonb, 'info', NULL, 'Z790 supports PCIe bifurcation', 'Allows splitting x16 slot into multiple devices', 68, true),
('pcie_bifurcation_x670e', 'pcie', 'Motherboard', 'System', 'supports', $${"chipset": "X670E", "feature": "bifurcation"}$$::jsonb, 'info', NULL, 'X670E supports PCIe bifurcation', 'Useful for multi-NVMe adapters', 68, true),
('pcie_bifurcation_raid_card', 'pcie', 'Storage', 'Motherboard', 'requires', $${"device_type": "raid_card", "feature": "bifurcation"}$$::jsonb, 'warning', NULL, 'PCIe RAID cards may require bifurcation support', 'Enable in BIOS if needed', 72, true),

-- PCIe Riser Cables
('pcie_riser_gen4_requirement', 'pcie', 'GPU', 'Case', 'requires', $${"riser_type": "PCIe_4.0", "gpu_pcie": 4.0}$$::jsonb, 'error', 'PCIe 4.0 GPU with PCIe 3.0 riser will downclock', NULL, 'Use PCIe 4.0 rated riser cable', 85, true),
('pcie_riser_length_signal', 'pcie', 'GPU', 'Case', 'requires', $${"riser_length_cm": 30}$$::jsonb, 'warning', NULL, 'Long PCIe risers (30cm+) may cause signal issues', 'Use shielded, high-quality risers', 75, true),
('pcie_riser_itx_case', 'pcie', 'GPU', 'Case', 'requires', $${"case_form_factor": "ITX", "riser_required": true}$$::jsonb, 'info', NULL, 'ITX cases often require PCIe riser for GPU', 'Check riser version compatibility', 70, true),

-- DirectStorage Requirements
('pcie_directstorage_nvme', 'pcie', 'Storage', 'GPU', 'recommends', $${"feature": "DirectStorage", "storage_type": "NVMe"}$$::jsonb, 'info', NULL, 'DirectStorage requires NVMe SSD for optimal performance', 'PCIe 4.0+ recommended for best results', 72, true),
('pcie_directstorage_gpu_support', 'pcie', 'GPU', 'Storage', 'requires', $${"feature": "DirectStorage", "gpu_dx": "12_2"}$$::jsonb, 'info', NULL, 'DirectStorage requires DirectX 12 Ultimate GPU', 'RTX 20 series or newer, RX 6000+', 68, true),

-- Thunderbolt/USB4 PCIe
('pcie_thunderbolt4_z790', 'pcie', 'Motherboard', 'System', 'supports', $${"chipset": "Z790", "feature": "Thunderbolt_4"}$$::jsonb, 'info', NULL, 'Z790 supports Thunderbolt 4 (optional)', 'Uses PCIe lanes from chipset', 65, true),
('pcie_usb4_x670e', 'pcie', 'Motherboard', 'System', 'supports', $${"chipset": "X670E", "feature": "USB4"}$$::jsonb, 'info', NULL, 'X670E supports USB4 (optional)', 'Uses PCIe lanes from chipset', 65, true),

-- PCIe Power Delivery
('pcie_slot_power_75w', 'pcie', 'GPU', 'Motherboard', 'provides', $${"slot_power_watts": 75}$$::jsonb, 'info', NULL, 'PCIe x16 slot provides up to 75W', 'Low-power GPUs can run without cables', 65, true),
('pcie_slot_power_insufficient', 'pcie', 'GPU', 'Motherboard', 'requires', $${"gpu_tdp": 150, "slot_power_watts": 75}$$::jsonb, 'error', 'GPU over 75W TDP requires PCIe power cables', NULL, 'Connect 6-pin or 8-pin cables from PSU', 90, true),

-- =============================================
-- BIOS FEATURES & REQUIREMENTS (40 rules)
-- =============================================

-- Resizable BAR (ReBAR) - Enhanced
('bios_rebar_rtx_40_series_boost', 'bios', 'GPU', 'Motherboard', 'requires', $${"feature": "Resizable_BAR", "gpu_series": "RTX_40"}$$::jsonb, 'info', NULL, 'Enable Resizable BAR for RTX 40 series performance', 'Up to 10% boost in some games', 75, true),
('bios_rebar_rtx_30_series_boost', 'bios', 'GPU', 'Motherboard', 'requires', $${"feature": "Resizable_BAR", "gpu_series": "RTX_30"}$$::jsonb, 'info', NULL, 'Enable Resizable BAR for RTX 30 series performance', 'Around 5% average boost', 72, true),
('bios_sam_rx_7000_series', 'bios', 'GPU', 'Motherboard', 'requires', $${"feature": "Smart_Access_Memory", "gpu_series": "RX_7000"}$$::jsonb, 'info', NULL, 'Enable SAM for RX 7000 series on AM5 platform', 'Requires Ryzen 7000+ CPU', 75, true),
('bios_sam_rx_6000_series', 'bios', 'GPU', 'Motherboard', 'requires', $${"feature": "Smart_Access_Memory", "gpu_series": "RX_6000"}$$::jsonb, 'info', NULL, 'Enable SAM for RX 6000 series on AM4/AM5', 'Requires Ryzen 5000+ CPU', 72, true),
('bios_rebar_intel_arc_mandatory', 'bios', 'GPU', 'Motherboard', 'requires', $${"feature": "Resizable_BAR", "gpu_brand": "Intel_Arc"}$$::jsonb, 'error', 'Intel Arc GPUs REQUIRE Resizable BAR enabled', 'Performance drops 30-50% without it', 'MUST enable ReBAR in BIOS', 95, true),
('bios_above_4g_decode_prereq', 'bios', 'Motherboard', 'System', 'requires', $${"feature": "Above_4G_Memory_Decode"}$$::jsonb, 'warning', NULL, 'Enable Above 4G Decoding before Resizable BAR', 'Prerequisite for ReBAR functionality', 80, true),

-- XMP/EXPO Memory Profiles - Enhanced
('bios_xmp3_ddr5_intel_z790', 'bios', 'RAM', 'Motherboard', 'requires', $${"feature": "XMP_3.0", "chipset": "Z790", "ram_type": "DDR5"}$$::jsonb, 'info', NULL, 'Enable XMP 3.0 for DDR5 rated speeds on Z790', 'Automatic frequency and timing application', 75, true),
('bios_xmp3_ddr5_intel_b760', 'bios', 'RAM', 'Motherboard', 'requires', $${"feature": "XMP_3.0", "chipset": "B760", "ram_type": "DDR5"}$$::jsonb, 'info', NULL, 'Enable XMP 3.0 for DDR5 on B760 boards', 'Budget boards support XMP too', 72, true),
('bios_xmp2_ddr4_intel_z690', 'bios', 'RAM', 'Motherboard', 'requires', $${"feature": "XMP_2.0", "chipset": "Z690", "ram_type": "DDR4"}$$::jsonb, 'info', NULL, 'Enable XMP 2.0 for DDR4 rated speeds on older boards', 'Z690 DDR4 variant use XMP 2.0', 70, true),
('bios_expo_ddr5_amd_x670e', 'bios', 'RAM', 'Motherboard', 'requires', $${"feature": "EXPO", "chipset": "X670E", "ram_type": "DDR5"}$$::jsonb, 'info', NULL, 'Enable EXPO for AMD-optimized DDR5 speeds on X670E', 'Better than XMP for AM5', 75, true),
('bios_expo_ddr5_amd_b650', 'bios', 'RAM', 'Motherboard', 'requires', $${"feature": "EXPO", "chipset": "B650", "ram_type": "DDR5"}$$::jsonb, 'info', NULL, 'Enable EXPO for DDR5 on B650 boards', 'Budget AM5 boards support EXPO', 72, true),
('bios_expo_xmp_compatibility', 'bios', 'RAM', 'Motherboard', 'requires', $${"feature": "EXPO_with_XMP_Fallback"}$$::jsonb, 'info', NULL, 'EXPO kits include XMP profiles for Intel compatibility', 'Works on both AMD and Intel platforms', 70, true),
('bios_memory_manual_oc_advanced', 'bios', 'RAM', 'Motherboard', 'recommends', $${"feature": "Manual_Memory_Tuning"}$$::jsonb, 'info', NULL, 'Manual memory tuning exceeds XMP/EXPO speeds', 'Requires knowledge, testing, stability checks', 65, true),

-- CPU Power Management
('bios_pbo_amd_ryzen', 'bios', 'CPU', 'Motherboard', 'recommends', $${"feature": "PBO", "platform": "AMD"}$$::jsonb, 'info', NULL, 'Enable PBO (Precision Boost Overdrive) for better CPU performance', 'X/B series chipsets support PBO', 72, true),
('bios_pbo2_curve_optimizer', 'bios', 'CPU', 'Motherboard', 'recommends', $${"feature": "Curve_Optimizer", "platform": "AMD"}$$::jsonb, 'info', NULL, 'Curve Optimizer reduces voltage for better temps/efficiency', 'Per-core tuning available', 68, true),
('bios_tvb_intel_14th_gen', 'bios', 'CPU', 'Motherboard', 'recommends', $${"feature": "TVB", "platform": "Intel"}$$::jsonb, 'info', NULL, 'Thermal Velocity Boost increases clocks when temps allow', 'Automatic on K-series CPUs', 70, true),
('bios_mce_intel_multicore', 'bios', 'CPU', 'Motherboard', 'requires', $${"feature": "MCE", "platform": "Intel"}$$::jsonb, 'warning', NULL, 'Multi-Core Enhancement (MCE) increases power/heat', 'May violate Intel spec, improves performance', 65, true),

-- TPM & Secure Boot - Enhanced
('bios_tpm2_windows11_required', 'bios', 'Motherboard', 'System', 'requires', $${"feature": "TPM_2.0", "os": "Windows_11"}$$::jsonb, 'error', 'Windows 11 installation requires TPM 2.0 enabled', NULL, 'Enable TPM/fTPM/PTT in BIOS security settings', 95, true),
('bios_secure_boot_win11_install', 'bios', 'Motherboard', 'System', 'requires', $${"feature": "Secure_Boot", "os": "Windows_11"}$$::jsonb, 'warning', NULL, 'Windows 11 prefers Secure Boot enabled', 'Can bypass with registry edit (not recommended)', 85, true),
('bios_intel_ptt_firmware_tpm', 'bios', 'Motherboard', 'System', 'provides', $${"feature": "Intel_PTT", "tpm_type": "firmware"}$$::jsonb, 'info', NULL, 'Intel PTT provides firmware-based TPM 2.0', 'Enable in Security or Advanced settings', 75, true),
('bios_amd_ftpm_firmware', 'bios', 'Motherboard', 'System', 'provides', $${"feature": "AMD_fTPM", "tpm_type": "firmware"}$$::jsonb, 'info', NULL, 'AMD fTPM provides firmware-based TPM 2.0', 'Enable in Security or Advanced settings', 75, true),
('bios_discrete_tpm_module', 'bios', 'Motherboard', 'System', 'supports', $${"feature": "Discrete_TPM", "tpm_type": "hardware"}$$::jsonb, 'info', NULL, 'Discrete TPM module provides hardware-based security', 'More secure than firmware TPM', 78, true),

-- Virtualization
('bios_vt_x_intel', 'bios', 'CPU', 'Motherboard', 'requires', $${"feature": "VT-x", "platform": "Intel"}$$::jsonb, 'info', NULL, 'Enable Intel VT-x for virtualization (Hyper-V, VMware)', 'Required for virtual machines', 72, true),
('bios_vt_d_intel', 'bios', 'CPU', 'Motherboard', 'requires', $${"feature": "VT-d", "platform": "Intel"}$$::jsonb, 'info', NULL, 'Enable Intel VT-d for device passthrough', 'Useful for GPU passthrough to VMs', 68, true),
('bios_svm_amd', 'bios', 'CPU', 'Motherboard', 'requires', $${"feature": "AMD-V", "platform": "AMD"}$$::jsonb, 'info', NULL, 'Enable AMD-V (SVM) for virtualization', 'Required for virtual machines', 72, true),
('bios_iommu_amd', 'bios', 'CPU', 'Motherboard', 'requires', $${"feature": "IOMMU", "platform": "AMD"}$$::jsonb, 'info', NULL, 'Enable AMD IOMMU for device passthrough', 'Useful for GPU passthrough to VMs', 68, true),

-- BIOS Update Requirements - Enhanced
('bios_update_14th_gen_z690_mandatory', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_gen": "14th_Gen_Intel", "chipset": "Z690"}$$::jsonb, 'error', '14th Gen CPUs require Z690 BIOS update before install', 'System will not POST without compatible BIOS', 'Update BIOS using 12th/13th Gen CPU first', 95, true),
('bios_update_14th_gen_b660_mandatory', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_gen": "14th_Gen_Intel", "chipset": "B660"}$$::jsonb, 'error', '14th Gen CPUs require B660 BIOS update before install', 'System will not POST without compatible BIOS', 'Update BIOS using 12th/13th Gen CPU first', 95, true),
('bios_update_ryzen9000_b650_needed', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_gen": "Ryzen_9000", "chipset": "B650"}$$::jsonb, 'warning', NULL, 'Ryzen 9000 series may need B650 BIOS update', 'Check motherboard box for "Ryzen 9000 Ready" sticker', 85, true),
('bios_update_ryzen9000_x670_needed', 'bios', 'CPU', 'Motherboard', 'requires', $${"cpu_gen": "Ryzen_9000", "chipset": "X670"}$$::jsonb, 'warning', NULL, 'Ryzen 9000 series may need X670 BIOS update', 'Newer boards ship with compatible BIOS', 85, true),
('bios_agesa_amd_memory_compat', 'bios', 'CPU', 'Motherboard', 'recommends', $${"platform": "AMD", "update_component": "AGESA"}$$::jsonb, 'info', NULL, 'Update AGESA for improved DDR5 compatibility', 'AMD releases AGESA updates for memory support', 70, true),
('bios_microcode_intel_security', 'bios', 'CPU', 'Motherboard', 'recommends', $${"platform": "Intel", "update_component": "Microcode"}$$::jsonb, 'info', NULL, 'Update microcode for security patches', 'Intel releases microcode via BIOS updates', 68, true),

-- Fan Control - Enhanced
('bios_fan_curve_cpu_custom', 'bios', 'Cooling', 'Motherboard', 'recommends', $${"fan_type": "CPU_Fan", "feature": "Custom_Fan_Curve"}$$::jsonb, 'info', NULL, 'Configure custom CPU fan curves for noise optimization', 'Balance noise vs cooling performance', 65, true),
('bios_fan_curve_case_custom', 'bios', 'Cooling', 'Motherboard', 'recommends', $${"fan_type": "System_Fan", "feature": "Custom_Fan_Curve"}$$::jsonb, 'info', NULL, 'Set case fan curves based on CPU/GPU temperatures', 'Link to appropriate sensor for response', 65, true),
('bios_aio_pump_header_100pct', 'bios', 'Cooling', 'Motherboard', 'requires', $${"cooling_type": "AIO_Pump", "fan_header": "AIO_Pump"}$$::jsonb, 'warning', NULL, 'Connect AIO pump to dedicated header at 100% DC speed', 'Never use PWM control on pump header', 85, true),
('bios_pwm_vs_dc_fan_control', 'bios', 'Cooling', 'Motherboard', 'requires', $${"fan_control": "PWM_4pin"}$$::jsonb, 'info', NULL, 'PWM fans (4-pin) provide superior speed control vs DC (3-pin)', 'Use 4-pin PWM fans for best control', 68, true),
('bios_fan_stop_low_temp', 'bios', 'Cooling', 'Motherboard', 'recommends', $${"feature": "Fan_Stop_Mode"}$$::jsonb, 'info', NULL, 'Enable fan stop mode for silent operation at low temps', 'Fans spin down below temperature threshold', 62, true),

-- Storage Configuration - Enhanced
('bios_raid_intel_rst_mode', 'bios', 'Storage', 'Motherboard', 'requires', $${"storage_mode": "RAID", "platform": "Intel_RST"}$$::jsonb, 'warning', NULL, 'Enable Intel RST (RAID) mode for RAID arrays', 'Requires Intel RST drivers during Windows install', 75, true),
('bios_ahci_sata_standard', 'bios', 'Storage', 'Motherboard', 'requires', $${"storage_mode": "AHCI", "interface": "SATA"}$$::jsonb, 'info', NULL, 'Use AHCI mode for SATA drives (not legacy IDE)', 'Standard mode for modern Windows installation', 70, true),
('bios_nvme_boot_first_priority', 'bios', 'Storage', 'Motherboard', 'recommends', $${"storage_type": "NVMe", "boot_priority": 1}$$::jsonb, 'info', NULL, 'Set NVMe drive as first boot device priority', 'Significantly faster boot times vs SATA', 72, true),
('bios_secure_boot_uefi_only', 'bios', 'Storage', 'System', 'requires', $${"boot_mode": "UEFI", "feature": "Secure_Boot"}$$::jsonb, 'info', NULL, 'Secure Boot requires UEFI mode (not Legacy/CSM)', 'Disable CSM for Windows 11', 75, true),

-- Power Settings
('bios_c_states_power_saving', 'bios', 'CPU', 'Motherboard', 'recommends', $${"feature": "C-States", "usage": "normal"}$$::jsonb, 'info', NULL, 'Enable C-States for power saving when idle', 'Reduce power consumption and heat', 65, true),
('bios_c_states_disable_oc', 'bios', 'CPU', 'Motherboard', 'requires', $${"feature": "C-States", "usage": "overclocking"}$$::jsonb, 'info', NULL, 'Disable C-States for stable overclocking', 'Prevents voltage fluctuations', 70, true),
('bios_power_limits_intel', 'bios', 'CPU', 'Motherboard', 'requires', $${"feature": "Power_Limits", "platform": "Intel"}$$::jsonb, 'warning', NULL, 'Motherboards may remove Intel power limits', 'Increases performance but also heat/power', 72, true);

-- Success message
SELECT 'Migration 015 Complete! Added 80 PCIe and BIOS rules' as message, 80 as rules_added_this_batch;

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
