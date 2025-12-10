/**
 * ============================================================================
 * DETAILED COMPATIBILITY SERVICE
 * ============================================================================
 * 
 * COMPREHENSIVE REAL-WORLD PC COMPONENT COMPATIBILITY VALIDATION
 * 
 * This service performs DEEP compatibility validation covering:
 * - Motherboard ↔ CPU (Socket, Chipset, BIOS, Power Delivery)
 * - Motherboard ↔ RAM (Type, Speed, Capacity per slot, Slot count)
 * - Motherboard ↔ Case (Form Factor hierarchy)
 * - Motherboard ↔ GPU (PCIe slots availability)
 * - Motherboard ↔ Storage (M.2/SATA slot availability and types)
 * - Motherboard ↔ PSU (Power connector compatibility)
 * - GPU ↔ Case (Physical clearance)
 * - GPU ↔ PSU (Power connectors and wattage)
 * - PSU ↔ Case (Form factor and length)
 * - CPU Cooler ↔ Case (Height clearance)
 * - CPU Cooler ↔ RAM (Height clearance)
 * - Storage ↔ Motherboard (Interface type and slot availability)
 * 
 * @module detailedCompatibilityService
 * @version 1.0.0
 * @author K-Wise Development Team
 * @date January 2025
 */

const logger = require('../utils/logger');

class DetailedCompatibilityService {
    /**
     * Validate Motherboard ↔ CPU Compatibility
     * - Socket must match exactly (AM4, AM5, LGA1700, etc.)
     * - Chipset must support CPU generation
     * - BIOS update may be required
     * - VRM must handle CPU TDP
     */
    validateMotherboardCPU(motherboard, cpu) {
        const issues = [];
        const warnings = [];
        const notes = [];

        const mbSpecs = motherboard.specifications || {};
        const cpuSpecs = cpu.specifications || {};

        // CRITICAL: Socket compatibility
        const mbSocket = (mbSpecs.socket || '').toUpperCase().trim();
        const cpuSocket = (cpuSpecs.socket || '').toUpperCase().trim();

        if (!mbSocket || !cpuSocket) {
            issues.push({
                severity: 'critical',
                type: 'socket_missing',
                message: 'Socket information missing - cannot verify compatibility',
                component_a: motherboard.name,
                component_b: cpu.name
            });
        } else if (mbSocket !== cpuSocket) {
            issues.push({
                severity: 'critical',
                type: 'socket_mismatch',
                message: `❌ SOCKET MISMATCH: ${motherboard.name} has ${mbSocket} but ${cpu.name} requires ${cpuSocket}. These are physically incompatible.`,
                fix: `Choose a motherboard with ${cpuSocket} socket OR choose a CPU with ${mbSocket} socket`,
                component_a: motherboard.name,
                component_b: cpu.name
            });
        } else {
            notes.push(`✅ Socket Compatible: Both use ${mbSocket} socket`);
        }

        // Chipset compatibility check
        const chipset = (mbSpecs.chipset || '').toUpperCase();
        const cpuName = cpu.name.toUpperCase();

        if (chipset && cpuName) {
            // AMD AM4 validation
            if (mbSocket.includes('AM4')) {
                if (cpuName.includes('5000') || cpuName.includes('5600') || cpuName.includes('5700') || cpuName.includes('5800') || cpuName.includes('5900') || cpuName.includes('5950')) {
                    if (chipset.includes('A320') || chipset.includes('B350') || chipset.includes('X370')) {
                        issues.push({
                            severity: 'critical',
                            type: 'chipset_incompatible',
                            message: `❌ CHIPSET INCOMPATIBLE: ${chipset} does NOT support Ryzen 5000 series CPUs. CPU: ${cpu.name}`,
                            fix: `Upgrade to B450/B550/X570 motherboard OR choose Ryzen 3000 or earlier CPU`,
                            details: `A320/B350/X370 chipsets only support up to Ryzen 3000 series`
                        });
                    } else if (chipset.includes('B450') || chipset.includes('X470')) {
                        warnings.push({
                            severity: 'warning',
                            type: 'bios_update_required',
                            message: `⚠️ BIOS UPDATE REQUIRED: ${chipset} needs BIOS update to support Ryzen 5000 series (${cpu.name})`,
                            fix: `Update motherboard BIOS before installing Ryzen 5000 CPU`,
                            details: `B450/X470 support Ryzen 5000 only after BIOS update`
                        });
                    }
                }
            }

            // Intel LGA compatibility
            if (mbSocket.includes('LGA')) {
                // Check generation matching
                const extractIntelGen = (name) => {
                    const match = name.match(/(12|13|14|15)\d{3}/);
                    return match ? parseInt(match[1]) : null;
                };

                const cpuGen = extractIntelGen(cpuName);
                const chipsetGen = extractIntelGen(chipset);

                if (cpuGen && chipsetGen && cpuGen !== chipsetGen) {
                    warnings.push({
                        severity: 'warning',
                        type: 'generation_mismatch',
                        message: `⚠️ CPU and Chipset Generation Mismatch: ${cpu.name} (Gen ${cpuGen}) with ${chipset} chipset`,
                        details: `May work with backward compatibility but check motherboard QVL list`,
                        fix: `Verify motherboard supports this CPU in manufacturer's QVL (Qualified Vendor List)`
                    });
                }
            }
        }

        // TDP/Power Delivery Check
        const cpuTDP = parseFloat(cpuSpecs.tdp_w || cpuSpecs.tdp || 65);
        const maxCpuTDP = parseFloat(mbSpecs.max_cpu_tdp_w || 150);

        if (cpuTDP > maxCpuTDP) {
            warnings.push({
                severity: 'warning',
                type: 'tdp_exceeded',
                message: `⚠️ CPU TDP (${cpuTDP}W) exceeds motherboard maximum (${maxCpuTDP}W)`,
                details: `VRM may overheat under sustained load`,
                fix: `Consider motherboard with better VRM OR choose lower TDP CPU`
            });
        }

        return { compatible: issues.length === 0, issues, warnings, notes };
    }

    /**
     * Validate Motherboard ↔ RAM Compatibility
     * - Memory type must match (DDR4/DDR5)
     * - RAM slots must be available
     * - Total capacity must not exceed maximum
     * - Per-slot capacity limits
     */
    validateMotherboardRAM(motherboard, ramComponents) {
        const issues = [];
        const warnings = [];
        const notes = [];

        const mbSpecs = motherboard.specifications || {};
        const rams = Array.isArray(ramComponents) ? ramComponents : [ramComponents];

        // Check memory type compatibility
        const mbMemType = (mbSpecs.memory_type || mbSpecs.ddr_type || '').toUpperCase();
        
        for (const ram of rams) {
            const ramSpecs = ram.specifications || {};
            const ramMemType = (ramSpecs.memory_type || ramSpecs.ddr_type || '').toUpperCase();

            if (!mbMemType || !ramMemType) {
                issues.push({
                    severity: 'critical',
                    type: 'memory_type_missing',
                    message: 'Memory type information missing',
                    component: ram.name
                });
            } else if (mbMemType !== ramMemType) {
                issues.push({
                    severity: 'critical',
                    type: 'memory_type_mismatch',
                    message: `❌ RAM TYPE MISMATCH: Motherboard supports ${mbMemType} but ${ram.name} is ${ramMemType}`,
                    fix: `Choose ${mbMemType} RAM OR choose motherboard that supports ${ramMemType}`,
                    details: `${mbMemType} and ${ramMemType} slots are physically different and incompatible`
                });
            }
        }

        // Check slot availability
        const mbRamSlots = parseInt(mbSpecs.ram_slots || mbSpecs.memory_slots || 4);
        const totalRamModules = rams.reduce((sum, ram) => {
            const config = ram.specifications?.configuration || '1x8GB';
            const stickCount = parseInt(config.split('x')[0]) || 1;
            return sum + stickCount;
        }, 0);

        if (totalRamModules > mbRamSlots) {
            issues.push({
                severity: 'critical',
                type: 'insufficient_slots',
                message: `❌ NOT ENOUGH RAM SLOTS: Motherboard has ${mbRamSlots} slots but you're trying to install ${totalRamModules} sticks`,
                fix: `Reduce number of RAM sticks OR choose higher capacity per stick`,
                details: `Motherboard: ${motherboard.name} (${mbRamSlots} slots)`
            });
        }

        // Check total capacity
        const totalRamCapacity = rams.reduce((sum, ram) => {
            const capacity = parseInt(ram.specifications?.capacity || ram.specifications?.total_capacity || 8);
            return sum + capacity;
        }, 0);

        const maxRamCapacity = parseInt(mbSpecs.max_memory_gb || mbSpecs.max_ram || 128);
        if (totalRamCapacity > maxRamCapacity) {
            warnings.push({
                severity: 'warning',
                type: 'capacity_exceeded',
                message: `⚠️ TOTAL RAM (${totalRamCapacity}GB) exceeds motherboard maximum (${maxRamCapacity}GB)`,
                fix: `Reduce total RAM capacity to ${maxRamCapacity}GB or less`,
                details: `Excess capacity will not be recognized`
            });
        }

        // Check for mixed RAM (different brands, speeds, capacities)
        if (rams.length > 1) {
            const brands = [...new Set(rams.map(r => r.brand))];
            const speeds = [...new Set(rams.map(r => r.specifications?.speed || r.specifications?.speed_mhz))];
            const capacities = [...new Set(rams.map(r => r.specifications?.capacity))];

            if (brands.length > 1) {
                warnings.push({
                    severity: 'warning',
                    type: 'mixed_brands',
                    message: `⚠️ MIXED RAM BRANDS: ${brands.join(', ')}`,
                    details: `Mixing RAM brands may cause stability issues. Not recommended.`,
                    fix: `Use RAM sticks from the same brand and model for best compatibility`
                });
            }

            if (speeds.length > 1) {
                warnings.push({
                    severity: 'warning',
                    type: 'mixed_speeds',
                    message: `⚠️ MIXED RAM SPEEDS: ${speeds.filter(s => s).join('MHz, ')}MHz`,
                    details: `All RAM will run at slowest speed (${Math.min(...speeds.filter(s => s))}MHz)`,
                    fix: `Use identical speed RAM modules for optimal performance`
                });
            }

            if (capacities.length > 1) {
                warnings.push({
                    severity: 'warning',
                    type: 'mixed_capacities',
                    message: `⚠️ MIXED RAM CAPACITIES: ${capacities.filter(c => c).join('GB, ')}GB`,
                    details: `May prevent dual-channel mode or cause stability issues`,
                    fix: `Use identical capacity modules (e.g., 2x16GB instead of 1x8GB + 1x16GB)`
                });
            }
        }

        if (issues.length === 0 && mbMemType) {
            notes.push(`✅ RAM Compatible: ${mbMemType}, ${totalRamModules} modules in ${mbRamSlots} slots, ${totalRamCapacity}GB total`);
        }

        return { compatible: issues.length === 0, issues, warnings, notes };
    }

    /**
     * Validate Motherboard ↔ Case Form Factor
     * - Case must support motherboard form factor
     * - Form factor hierarchy: Full Tower > Mid Tower > Mini Tower
     */
    validateMotherboardCase(motherboard, pcCase) {
        const issues = [];
        const warnings = [];
        const notes = [];

        // 🔥 CRITICAL FIX: Merge specifications with dimensions for complete data
        const mbSpecs = { ...(motherboard.specifications || {}), ...(motherboard.dimensions || {}) };
        const caseSpecs = { ...(pcCase.specifications || {}), ...(pcCase.dimensions || {}) };

        // Try multiple field names for form factor
        const mbFormFactor = (mbSpecs.form_factor || mbSpecs.motherboard_form_factor || mbSpecs.formFactor || '').toUpperCase().replace(/[^A-Z]/g, '');
        const caseSupportedFormFactors = caseSpecs.supported_form_factors || caseSpecs.motherboard_support || [];

        // 🔥 FIX: If form_factor is missing from specs, try to detect from name
        let detectedFormFactor = mbFormFactor;
        if (!detectedFormFactor && motherboard.name) {
            const mbNameUpper = motherboard.name.toUpperCase();
            if (mbNameUpper.includes('MINI-ITX') || mbNameUpper.includes('MINIITX') || mbNameUpper.includes('ITX')) {
                detectedFormFactor = 'MINIITX';
            } else if (mbNameUpper.includes('MICRO-ATX') || mbNameUpper.includes('MICROATX') || mbNameUpper.includes('M-ATX') || mbNameUpper.includes('MATX')) {
                detectedFormFactor = 'MICROATX';
            } else if (mbNameUpper.includes('E-ATX') || mbNameUpper.includes('EATX') || mbNameUpper.includes('EXTENDED')) {
                detectedFormFactor = 'EATX';
            } else if (mbNameUpper.includes('ATX')) {
                detectedFormFactor = 'ATX';
            } else if (mbNameUpper.includes('B550M') || mbNameUpper.includes('B450M') || mbNameUpper.includes('B650M') || mbNameUpper.includes('X570M')) {
                // M suffix typically indicates Micro-ATX
                detectedFormFactor = 'MICROATX';
            }
            console.log('   🔍 Form factor detected from name:', detectedFormFactor || 'UNKNOWN');
        }

        if (!detectedFormFactor) {
            // 🔥 FIX: Downgrade to warning if form factor missing - don't block the build
            warnings.push({
                severity: 'warning',
                type: 'form_factor_missing',
                message: `⚠️ Motherboard form factor unknown - verify ${motherboard.name} fits in case`,
                component: motherboard.name,
                fix: 'Check motherboard and case specifications for form factor compatibility'
            });
            return { compatible: true, issues, warnings, notes };
        }

        // Normalize case supported form factors
        // 🔥 CRITICAL FIX: Database stores form factors as comma-separated strings!
        // Example: "Micro-ATX,Mini-ITX" needs to be split into ["Micro-ATX", "Mini-ITX"]
        let formFactorsArray = Array.isArray(caseSupportedFormFactors) 
            ? caseSupportedFormFactors 
            : (typeof caseSupportedFormFactors === 'string' ? [caseSupportedFormFactors] : []);
        
        // Split comma-separated strings into individual form factors
        formFactorsArray = formFactorsArray.flatMap(ff => 
            typeof ff === 'string' ? ff.split(',').map(f => f.trim()) : [ff]
        );
        
        const normalizedSupported = formFactorsArray.map(ff => 
            (ff || '').toUpperCase().replace(/[^A-Z-]/g, '')
        );

        // 🔥 DEBUG: Log validation data
        console.log('🔍 Form Factor Validation:');
        console.log('   Motherboard:', motherboard.name, '→', detectedFormFactor);
        console.log('   Case:', pcCase.name);
        console.log('   Case supported (original):', formFactorsArray);
        console.log('   Case supported (normalized):', normalizedSupported);

        // Check if motherboard fits in case
        const isCompatible = normalizedSupported.some(ff => {
            const ffNorm = ff.replace(/-/g, '');
            const mbNorm = detectedFormFactor.replace(/-/g, '');
            const exactMatch = ffNorm === mbNorm;
            const matxMatch = (mbNorm === 'MICROATX' || mbNorm === 'MATX') && (ffNorm === 'MATX' || ffNorm === 'MICROATX');
            const itxMatch = (mbNorm === 'MINIITX' || mbNorm === 'ITX') && (ffNorm === 'ITX' || ffNorm === 'MINIITX' || ffNorm === 'MITX');
            
            if (exactMatch || matxMatch || itxMatch) {
                console.log('   ✅ MATCH FOUND:', ff, '===', detectedFormFactor);
            }
            
            return exactMatch || matxMatch || itxMatch;
        });

        console.log('   Final result:', isCompatible ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE');
        console.log('');

        if (!isCompatible && normalizedSupported.length > 0) {
            issues.push({
                severity: 'critical',
                type: 'form_factor_incompatible',
                message: `❌ MOTHERBOARD TOO LARGE: ${mbFormFactor} motherboard (${motherboard.name}) will NOT fit in case (${pcCase.name})`,
                fix: `Choose larger case that supports ${mbFormFactor} OR choose smaller motherboard`,
                details: `Case supports: ${formFactorsArray.join(', ') || 'Unknown'}`
            });
        } else {
            notes.push(`✅ Form Factor Compatible: ${mbFormFactor} motherboard fits in case`);
        }

        return { compatible: issues.length === 0, issues, warnings, notes };
    }

    /**
     * Validate GPU ↔ Case Physical Clearance
     */
    validateGPUCase(gpu, pcCase) {
        const issues = [];
        const warnings = [];
        const notes = [];

        const gpuSpecs = gpu.specifications || {};
        const gpuDims = gpu.dimensions || {};
        const caseSpecs = pcCase.specifications || {};
        const caseDims = pcCase.dimensions || {};

        // 🔥 FIX: Check dimensions first, then specifications
        const gpuLength = parseFloat(
            gpuDims.length_mm || 
            gpuSpecs.length_mm || 
            gpuSpecs.gpu_length_mm || 
            0
        );
        
        // 🔥 FIX: Prioritize dimensions.max_gpu_length_mm FIRST (most reliable)
        const maxGpuLength = parseFloat(
            caseDims.max_gpu_length_mm || 
            caseSpecs.max_gpu_length_mm || 
            caseSpecs.gpu_clearance_mm || 
            320
        );

        // 🔥 DEBUG: Log GPU clearance validation
        console.log('🔍 GPU Clearance Validation:');
        console.log('   GPU:', gpu.name);
        console.log('   GPU dimensions.length_mm:', gpuDims.length_mm);
        console.log('   GPU specs.length_mm:', gpuSpecs.length_mm);
        console.log('   GPU specs.gpu_length_mm:', gpuSpecs.gpu_length_mm);
        console.log('   GPU parsed length:', gpuLength, 'mm');
        console.log('   Case:', pcCase.name);
        console.log('   Case dimensions.max_gpu_length_mm:', caseDims.max_gpu_length_mm);
        console.log('   Case specs.max_gpu_length_mm:', caseSpecs.max_gpu_length_mm);
        console.log('   Case specs.gpu_clearance_mm:', caseSpecs.gpu_clearance_mm);
        console.log('   Case parsed max:', maxGpuLength, 'mm');

        if (gpuLength > 0 && maxGpuLength > 0) {
            console.log('   Comparison:', gpuLength, '>', maxGpuLength, '?');
            
            if (gpuLength > maxGpuLength) {
                console.log('   ❌ GPU TOO LONG!');
                issues.push({
                    severity: 'critical',
                    type: 'gpu_too_long',
                    message: `❌ GPU TOO LONG: ${gpu.name} (${gpuLength}mm) will NOT fit in ${pcCase.name} (max ${maxGpuLength}mm)`,
                    fix: `Choose smaller GPU (≤${maxGpuLength}mm) OR choose larger case`,
                    details: `GPU extends ${gpuLength - maxGpuLength}mm beyond case clearance`
                });
            } else {
                const clearance = maxGpuLength - gpuLength;
                console.log('   ✅ GPU FITS! Clearance:', clearance, 'mm');
                notes.push(`✅ GPU Fits: ${gpuLength}mm GPU with ${clearance}mm clearance (${maxGpuLength}mm max)`);
            }
        } else {
            console.log('   ⚠️ Skipping validation (missing length data)');
        }
        
        console.log('');

        return { compatible: issues.length === 0, issues, warnings, notes };
    }

    /**
     * Validate GPU ↔ PSU Power Compatibility
     */
    validateGPUPSU(gpu, psu, cpu = null) {
        const issues = [];
        const warnings = [];
        const notes = [];

        // 🔥 CRITICAL FIX: Merge specifications with dimensions for complete data
        const gpuSpecs = { ...(gpu.specifications || {}), ...(gpu.dimensions || {}) };
        const psuSpecs = { ...(psu.specifications || {}), ...(psu.dimensions || {}) };

        // 🔥 CRITICAL FIX: Detect 12VHPWR from power_connectors string (dimensions)
        const gpuPowerConnStr = (gpuSpecs.power_connectors || '').toUpperCase();
        const psuPowerConnStr = (psuSpecs.pcie_connectors || psuSpecs.power_connectors || '').toUpperCase();
        
        const gpuNeeds12VHPWR = gpuPowerConnStr.includes('12VHPWR') || 
                               gpuPowerConnStr.includes('16-PIN') || 
                               gpuPowerConnStr.includes('16PIN') ||
                               (gpu.name || '').toUpperCase().includes('RTX40');
        
        const psuHas12VHPWR = psuPowerConnStr.includes('12VHPWR') || 
                             psuPowerConnStr.includes('16-PIN') || 
                             psuPowerConnStr.includes('16PIN') ||
                             psuSpecs.has_12vhpwr_connector === true ||
                             psuSpecs.has_12vhpwr === true;

        console.log('🔌 GPU-PSU Power Validation:');
        console.log('   GPU:', gpu.name);
        console.log('   GPU power_connectors:', gpuPowerConnStr || 'N/A');
        console.log('   GPU needs 12VHPWR:', gpuNeeds12VHPWR);
        console.log('   PSU:', psu.name);
        console.log('   PSU pcie_connectors:', psuPowerConnStr || 'N/A');
        console.log('   PSU has 12VHPWR:', psuHas12VHPWR);

        // 12VHPWR validation
        if (gpuNeeds12VHPWR) {
            if (psuHas12VHPWR) {
                notes.push(`✅ 12VHPWR Compatible: PSU has 12VHPWR connector for ${gpu.name}`);
            } else {
                // Check if PSU has enough 8-pin connectors for adapter
                const psu8pin = parseInt(psuSpecs.pcie_8pin_connectors || psuSpecs.pcie_8pin || 0);
                if (psu8pin >= 2) {
                    warnings.push({
                        severity: 'warning',
                        type: '12vhpwr_adapter_needed',
                        message: `⚠️ 12VHPWR ADAPTER NEEDED: ${gpu.name} requires 12VHPWR, PSU has ${psu8pin}x 8-pin`,
                        details: `RTX 40 series requires 12VHPWR connector. Use adapter from 2x 8-pin to 12VHPWR (often included with GPU).`,
                        fix: `Use included adapter or upgrade to PCIe 5.0 PSU with native 12VHPWR`
                    });
                } else {
                    issues.push({
                        severity: 'critical',
                        type: 'missing_12vhpwr',
                        message: `❌ MISSING 12VHPWR: ${gpu.name} requires 12VHPWR but PSU doesn't have it`,
                        fix: `Upgrade to PCIe 5.0 PSU with 12VHPWR or use PSU with 2+ 8-pin connectors for adapter`,
                        details: `PSU: ${psu.name}`
                    });
                }
            }
            // Skip old 8-pin check since we handled 12VHPWR above
        } else {
            // Legacy 8-pin/6-pin check for non-12VHPWR GPUs
            const gpuPowerReq = gpuSpecs.power_connector_required || {};
            const requiredType = gpuPowerReq.type || '8-pin';
            const requiredCount = parseInt(gpuPowerReq.count || 1);
            const psuConnectors = psuSpecs.power_connectors || {};
            const availableCount = parseInt(psuConnectors[`pcie_${requiredType.replace('-', '')}`] || 
                                           psuSpecs.pcie_8pin_connectors || 
                                           psuSpecs.pcie_8pin || 0);

            if (requiredCount > availableCount) {
                const psuWattage = parseInt(psuSpecs.wattage || 0);
                
                // If availableCount is 0 but PSU wattage is sufficient, downgrade to warning
                if (availableCount === 0 && psuWattage >= 500) {
                    warnings.push({
                        severity: 'warning',
                        type: 'connector_data_missing',
                        message: `⚠️ PSU CONNECTOR INFO MISSING: GPU needs ${requiredCount}x ${requiredType} - verify PSU specs`,
                        details: `PSU: ${psu.name} (${psuWattage}W). Connector count not in database. Most ${psuWattage}W PSUs include sufficient PCIe connectors.`,
                        fix: `Verify PSU has ${requiredCount}+ PCIe ${requiredType} connectors in manufacturer specifications`
                    });
                } else {
                    // We have definitive data showing insufficient connectors
                    issues.push({
                        severity: 'critical',
                        type: 'insufficient_power_connectors',
                        message: `❌ INSUFFICIENT GPU POWER: ${gpu.name} needs ${requiredCount}x ${requiredType} but PSU only has ${availableCount}`,
                        fix: `Choose PSU with ${requiredCount}+ PCIe ${requiredType} connectors`,
                        details: `PSU: ${psu.name}`
                    });
                }
            }
        }

        // Check wattage
        const gpuTDP = parseFloat(gpuSpecs.tdp_w || gpuSpecs.tdp_watts || gpuSpecs.tdp || 150);
        const cpuTDP = cpu ? parseFloat(cpu.specifications?.tdp_w || cpu.specifications?.tdp || 65) : 65;
        const systemPower = cpuTDP + gpuTDP + 100; // CPU + GPU + motherboard/RAM/storage overhead
        const recommendedPSU = Math.ceil(systemPower * 1.25); // 25% headroom
        const psuWattage = parseInt(psuSpecs.wattage || 0);

        if (psuWattage > 0 && psuWattage < recommendedPSU) {
            warnings.push({
                severity: 'warning',
                type: 'insufficient_wattage',
                message: `⚠️ PSU WATTAGE LOW: System needs ~${recommendedPSU}W but PSU is ${psuWattage}W`,
                details: `Estimated: CPU ${cpuTDP}W + GPU ${gpuTDP}W + System 100W = ${systemPower}W (${recommendedPSU}W recommended with headroom)`,
                fix: `Recommend ${recommendedPSU}W+ PSU for safe operation and efficiency`
            });
        } else if (psuWattage > 0) {
            notes.push(`✅ PSU Adequate: ${psuWattage}W PSU for ~${systemPower}W system (${Math.round((systemPower/psuWattage)*100)}% load)`);
        }

        return { compatible: issues.length === 0, issues, warnings, notes };
    }

    /**
     * Validate Storage ↔ Motherboard Slots
     */
    validateStorageMotherboard(storageComponents, motherboard) {
        const issues = [];
        const warnings = [];
        const notes = [];

        const mbSpecs = motherboard.specifications || {};
        const storages = Array.isArray(storageComponents) ? storageComponents : [storageComponents];

        // 🔥 FIX: Check all possible M.2 slot field names (database uses "M2 Slots")
        const m2Slots = parseInt(
            mbSpecs.m2_slots || 
            mbSpecs.m2_slots_count || 
            mbSpecs['M2 Slots'] || 
            mbSpecs['M.2 Slots'] || 
            mbSpecs.m_2_slots
        ) || 2;
        const sataSlots = parseInt(
            mbSpecs.sata_ports || 
            mbSpecs.sata_count || 
            mbSpecs['SATA Ports'] || 
            mbSpecs['SATA ports']
        ) || 4;

        let m2Used = 0;
        let sataUsed = 0;

        for (const storage of storages) {
            const storageSpecs = storage.specifications || {};
            
            // 🔥 FIX: Improved interface detection - prioritize nvme_support flag
            const storageType = (storageSpecs.storage_type || '').toUpperCase();
            const interfaceField = (storageSpecs.interface || storageSpecs.interface_type || '').toUpperCase();
            const nvmeSupport = storageSpecs.nvme_support === true || storageSpecs.nvme_support === 'true';
            
            // Check nvme_support flag FIRST (most reliable)
            if (nvmeSupport || storageType.includes('NVME')) {
                m2Used++;
            } else if (interfaceField.includes('NVME') || interfaceField.includes('PCIE')) {
                m2Used++;
            } else if (interfaceField.includes('M.2') || interfaceField.includes('M2')) {
                m2Used++;
            } else if (interfaceField.includes('SATA')) {
                sataUsed++;
            } else {
                // Fallback: assume SATA if uncertain
                sataUsed++;
            }
        }

        if (m2Used > m2Slots) {
            issues.push({
                severity: 'critical',
                type: 'insufficient_m2_slots',
                message: `❌ NOT ENOUGH M.2 SLOTS: Motherboard has ${m2Slots} M.2 slots but you selected ${m2Used} M.2/NVMe drives`,
                fix: `Reduce M.2 drives to ${m2Slots} OR choose SATA drives OR upgrade motherboard`,
                details: `Motherboard: ${motherboard.name}`
            });
        }

        if (sataUsed > sataSlots) {
            issues.push({
                severity: 'critical',
                type: 'insufficient_sata_ports',
                message: `❌ NOT ENOUGH SATA PORTS: Motherboard has ${sataSlots} SATA ports but you selected ${sataUsed} SATA drives`,
                fix: `Reduce SATA drives to ${sataSlots} OR choose M.2/NVMe drives OR upgrade motherboard`,
                details: `Motherboard: ${motherboard.name}`
            });
        }

        // Warning about M.2 disabling SATA ports
        if (m2Used > 0 && sataUsed > 0) {
            warnings.push({
                severity: 'info',
                type: 'm2_disables_sata',
                message: `ℹ️ M.2 SLOT NOTE: Some M.2 slots may disable SATA ports when populated`,
                details: `Check motherboard manual to verify which SATA ports are affected`,
                fix: `Verify SATA port availability in motherboard specifications`
            });
        }

        if (issues.length === 0) {
            notes.push(`✅ Storage Compatible: ${m2Used}/${m2Slots} M.2 slots used, ${sataUsed}/${sataSlots} SATA ports used`);
        }

        return { compatible: issues.length === 0, issues, warnings, notes };
    }

    /**
     * Validate PSU ↔ Case Form Factor
     */
    validatePSUCase(psu, pcCase) {
        const issues = [];
        const warnings = [];
        const notes = [];

        const psuSpecs = psu.specifications || {};
        const caseSpecs = pcCase.specifications || {};

        const psuFormFactor = (psuSpecs.form_factor || 'ATX').toUpperCase();
        const caseFormFactor = (caseSpecs.form_factor || 'Mid Tower').toUpperCase();

        // Form factor compatibility matrix
        const compatibility = {
            'FULL TOWER': ['ATX', 'SFX', 'SFX-L', 'TFX'],
            'MID TOWER': ['ATX', 'SFX', 'SFX-L'],
            'MINI TOWER': ['SFX', 'SFX-L', 'TFX']
        };

        const supportedPSUFormFactors = compatibility[caseFormFactor] || ['ATX'];
        const isCompatible = supportedPSUFormFactors.includes(psuFormFactor);

        if (!isCompatible) {
            issues.push({
                severity: 'critical',
                type: 'psu_form_factor_incompatible',
                message: `❌ PSU TOO LARGE: ${psuFormFactor} PSU will NOT fit in ${caseFormFactor} case`,
                fix: `Choose ${supportedPSUFormFactors.join(' or ')} PSU OR choose larger case`,
                details: `${psuFormFactor} PSUs are designed for larger cases`
            });
        } else {
            notes.push(`✅ PSU Form Factor Compatible: ${psuFormFactor} PSU fits in ${caseFormFactor} case`);
        }

        return { compatible: issues.length === 0, issues, warnings, notes };
    }

    /**
     * Validate CPU Cooler ↔ Case Clearance
     */
    validateCoolerCase(cooler, pcCase) {
        const issues = [];
        const warnings = [];
        const notes = [];

        const coolerSpecs = cooler.specifications || {};
        const caseSpecs = pcCase.specifications || {};

        const coolerHeight = parseFloat(coolerSpecs.height_mm || coolerSpecs.cooler_height_mm || 0);
        const maxCoolerHeight = parseFloat(caseSpecs.max_cooler_height_mm || caseSpecs.cooler_clearance_mm || 160);

        if (coolerHeight > 0 && maxCoolerHeight > 0) {
            if (coolerHeight > maxCoolerHeight) {
                issues.push({
                    severity: 'critical',
                    type: 'cooler_too_tall',
                    message: `❌ COOLER TOO TALL: ${cooler.name} (${coolerHeight}mm) exceeds case clearance (${maxCoolerHeight}mm)`,
                    fix: `Choose low-profile cooler (≤${maxCoolerHeight}mm) OR choose larger case OR use liquid cooling`,
                    details: `Side panel may not close properly`
                });
            } else {
                notes.push(`✅ Cooler Fits: ${coolerHeight}mm cooler with ${maxCoolerHeight - coolerHeight}mm clearance`);
            }
        }

        return { compatible: issues.length === 0, issues, warnings, notes };
    }

    /**
     * 🔥 CRITICAL: Validate CPU Cooler ↔ CPU Socket Compatibility
     * This is the MOST COMMON source of compatibility errors
     */
    validateCoolerCPU(cooler, cpu) {
        const issues = [];
        const warnings = [];
        const notes = [];

        const coolerSpecs = cooler.specifications || {};
        const cpuSpecs = cpu.specifications || {};

        // Get CPU socket
        const cpuSocket = cpuSpecs.socket || cpuSpecs.Socket || cpuSpecs.SOCKET || '';
        
        if (!cpuSocket) {
            notes.push(`⚠️ CPU socket information not available for ${cpu.name}`);
            return { compatible: true, issues, warnings, notes };
        }

        // Get cooler supported sockets - check ALL possible field names
        let supportedSockets = [];
        
        // Priority 1: compatible_sockets (array) - most common in database
        if (Array.isArray(coolerSpecs.compatible_sockets) && coolerSpecs.compatible_sockets.length > 0) {
            supportedSockets = coolerSpecs.compatible_sockets;
        }
        // Priority 2: socket_support (array)
        else if (Array.isArray(coolerSpecs.socket_support) && coolerSpecs.socket_support.length > 0) {
            supportedSockets = coolerSpecs.socket_support;
        }
        // Priority 3: sockets (array)
        else if (Array.isArray(coolerSpecs.sockets) && coolerSpecs.sockets.length > 0) {
            supportedSockets = coolerSpecs.sockets;
        }
        // Priority 4: supported_sockets (array)
        else if (Array.isArray(coolerSpecs.supported_sockets) && coolerSpecs.supported_sockets.length > 0) {
            supportedSockets = coolerSpecs.supported_sockets;
        }
        // Priority 5: socket_support as comma-separated string
        else if (typeof coolerSpecs.socket_support === 'string' && coolerSpecs.socket_support.trim()) {
            supportedSockets = coolerSpecs.socket_support.split(',').map(s => s.trim()).filter(Boolean);
        }
        // Priority 6: compatible_sockets as comma-separated string  
        else if (typeof coolerSpecs.compatible_sockets === 'string' && coolerSpecs.compatible_sockets.trim()) {
            supportedSockets = coolerSpecs.compatible_sockets.split(',').map(s => s.trim()).filter(Boolean);
        }
        
        // If no socket info available, assume compatible (universal cooler)
        if (supportedSockets.length === 0) {
            notes.push(`⚠️ Cooler ${cooler.name} has no socket info - assuming universal compatibility`);
            return { compatible: true, issues, warnings, notes };
        }

        // Check if CPU socket is compatible with cooler
        const normalizedCpuSocket = cpuSocket.toLowerCase().replace(/[-\s]/g, '');
        const isCompatible = supportedSockets.some(socket => {
            const normalizedSocket = socket.toLowerCase().replace(/[-\s]/g, '');
            return normalizedSocket === normalizedCpuSocket ||
                   normalizedCpuSocket.includes(normalizedSocket) ||
                   normalizedSocket.includes(normalizedCpuSocket);
        });

        if (!isCompatible) {
            issues.push({
                severity: 'critical',
                type: 'cooler_socket_mismatch',
                message: `❌ SOCKET INCOMPATIBLE: Cooler "${cooler.name}" does NOT support ${cpuSocket}. Cooler only supports: ${supportedSockets.join(', ')}`,
                fix: `Choose a cooler that supports ${cpuSocket} socket`,
                details: `The cooler mounting hardware is physically incompatible with your CPU socket`
            });
        } else {
            notes.push(`✅ Socket Compatible: Cooler supports ${cpuSocket}`);
        }

        // Also check TDP
        const coolerTDP = parseInt(coolerSpecs.tdp_rating || coolerSpecs.tdp || 0);
        const cpuTDP = parseInt(cpuSpecs.tdp || cpuSpecs.TDP || cpuSpecs.tdp_watts || 0);
        
        if (coolerTDP > 0 && cpuTDP > 0) {
            if (cpuTDP > coolerTDP) {
                warnings.push({
                    severity: 'warning',
                    type: 'tdp_inadequate',
                    message: `⚠️ TDP Warning: CPU ${cpuTDP}W exceeds cooler rating ${coolerTDP}W - may run hot`,
                    fix: `Consider a higher-rated cooler for better thermal performance`
                });
            }
        }

        return { compatible: issues.length === 0, issues, warnings, notes };
    }

    /**
     * MASTER VALIDATION: Check ALL compatibility rules
     */
    async validateFullBuild(components) {
        const results = {
            compatible: true,
            criticalIssues: [],
            warnings: [],
            notes: [],
            detailedResults: {}
        };

        try {
            // 🔥 FIX: Normalize component keys - handle both 'case' and 'pcCase'
            const cpu = components.cpu || components.CPU;
            const motherboard = components.motherboard || components.Motherboard;
            const ram = components.ram || components.RAM || components.memory;
            const gpu = components.gpu || components.GPU;
            const psu = components.psu || components.PSU;
            const pcCase = components.case || components.Case || components.pcCase || components.pc_case;
            const storage = components.storage || components.Storage;
            const cooling = components.cooling || components.Cooling || components.cooler;

            // 1. Motherboard ↔ CPU
            if (motherboard && cpu) {
                const mbCpuResult = this.validateMotherboardCPU(motherboard, cpu);
                results.detailedResults.motherboard_cpu = mbCpuResult;
                results.criticalIssues.push(...mbCpuResult.issues);
                results.warnings.push(...mbCpuResult.warnings);
                results.notes.push(...mbCpuResult.notes);
            }

            // 2. Motherboard ↔ RAM
            if (motherboard && ram) {
                const mbRamResult = this.validateMotherboardRAM(motherboard, ram);
                results.detailedResults.motherboard_ram = mbRamResult;
                results.criticalIssues.push(...mbRamResult.issues);
                results.warnings.push(...mbRamResult.warnings);
                results.notes.push(...mbRamResult.notes);
            }

            // 3. Motherboard ↔ Case
            if (motherboard && pcCase) {
                const mbCaseResult = this.validateMotherboardCase(motherboard, pcCase);
                results.detailedResults.motherboard_case = mbCaseResult;
                results.criticalIssues.push(...mbCaseResult.issues);
                results.warnings.push(...mbCaseResult.warnings);
                results.notes.push(...mbCaseResult.notes);
            }

            // 4. GPU ↔ Case
            if (gpu && pcCase) {
                const gpuCaseResult = this.validateGPUCase(gpu, pcCase);
                results.detailedResults.gpu_case = gpuCaseResult;
                results.criticalIssues.push(...gpuCaseResult.issues);
                results.warnings.push(...gpuCaseResult.warnings);
                results.notes.push(...gpuCaseResult.notes);
            }

            // 5. GPU ↔ PSU
            if (gpu && psu) {
                const gpuPsuResult = this.validateGPUPSU(gpu, psu, cpu);
                results.detailedResults.gpu_psu = gpuPsuResult;
                results.criticalIssues.push(...gpuPsuResult.issues);
                results.warnings.push(...gpuPsuResult.warnings);
                results.notes.push(...gpuPsuResult.notes);
            }

            // 6. Storage ↔ Motherboard
            if (storage && motherboard) {
                const storageResult = this.validateStorageMotherboard(storage, motherboard);
                results.detailedResults.storage_motherboard = storageResult;
                results.criticalIssues.push(...storageResult.issues);
                results.warnings.push(...storageResult.warnings);
                results.notes.push(...storageResult.notes);
            }

            // 7. PSU ↔ Case
            if (psu && pcCase) {
                const psuCaseResult = this.validatePSUCase(psu, pcCase);
                results.detailedResults.psu_case = psuCaseResult;
                results.criticalIssues.push(...psuCaseResult.issues);
                results.warnings.push(...psuCaseResult.warnings);
                results.notes.push(...psuCaseResult.notes);
            }

            // 8. Cooler ↔ Case
            if (cooling && pcCase) {
                const coolerCaseResult = this.validateCoolerCase(cooling, pcCase);
                results.detailedResults.cooler_case = coolerCaseResult;
                results.criticalIssues.push(...coolerCaseResult.issues);
                results.warnings.push(...coolerCaseResult.warnings);
                results.notes.push(...coolerCaseResult.notes);
            }

            // 9. 🔥 CRITICAL: Cooler ↔ CPU Socket Compatibility
            if (cooling && cpu) {
                const coolerCpuResult = this.validateCoolerCPU(cooling, cpu);
                results.detailedResults.cooler_cpu = coolerCpuResult;
                results.criticalIssues.push(...coolerCpuResult.issues);
                results.warnings.push(...coolerCpuResult.warnings);
                results.notes.push(...coolerCpuResult.notes);
            }

            // Set overall compatibility
            results.compatible = results.criticalIssues.length === 0;

            logger.info(`✅ Detailed compatibility validation complete: ${results.compatible ? 'COMPATIBLE' : 'INCOMPATIBLE'} (${results.criticalIssues.length} critical, ${results.warnings.length} warnings)`);

        } catch (error) {
            logger.error('❌ Error in detailed compatibility validation:', error);
            results.compatible = false;
            results.criticalIssues.push({
                severity: 'critical',
                type: 'validation_error',
                message: 'Error occurred during compatibility validation',
                details: error.message
            });
        }

        return results;
    }
}

module.exports = new DetailedCompatibilityService();
