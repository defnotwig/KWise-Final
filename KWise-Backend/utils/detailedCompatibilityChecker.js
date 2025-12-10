/**
 * Detailed Compatibility Checker
 * Performs comprehensive hardware compatibility validation using detailed specifications
 * 
 * This module checks:
 * - Motherboard compatibility (socket, RAM type, slots, power connectors)
 * - PSU compatibility (power connectors, wattage, form factor)
 * - GPU compatibility (power connectors, length, slot requirements)
 * - Case compatibility (clearances for GPU, CPU cooler, motherboard form factor)
 * - RAM compatibility (slots available, type, speed)
 * - Storage compatibility (available SATA/M.2 slots)
 * - CPU Cooler compatibility (socket, TDP, height clearance)
 */

const logger = require('./logger');

class DetailedCompatibilityChecker {
    /**
     * Check if a product is compatible with the current build
     * @param {Object} product - The product to check
     * @param {Object} currentBuild - The current build components
     * @returns {Object} - Compatibility result with detailed issues
     */
    static checkCompatibility(product, currentBuild) {
        const result = {
            compatible: true,
            score: 100,
            issues: [],
            warnings: [],
            info: []
        };

        if (!product || !product.category) {
            return result;
        }

        const category = product.category.toLowerCase();

        // Route to specific compatibility checker based on category
        switch (category) {
            case 'cpu':
                this._checkCPUCompatibility(product, currentBuild, result);
                break;
            case 'motherboard':
                this._checkMotherboardCompatibility(product, currentBuild, result);
                break;
            case 'cooling':
                this._checkCoolingCompatibility(product, currentBuild, result);
                break;
            case 'ram':
            case 'memory':
                this._checkRAMCompatibility(product, currentBuild, result);
                break;
            case 'storage':
                this._checkStorageCompatibility(product, currentBuild, result);
                break;
            case 'gpu':
                this._checkGPUCompatibility(product, currentBuild, result);
                break;
            case 'case':
                this._checkCaseCompatibility(product, currentBuild, result);
                break;
            case 'psu':
                this._checkPSUCompatibility(product, currentBuild, result);
                break;
        }

        // Calculate final compatibility score
        result.score = this._calculateScore(result);
        result.compatible = result.score >= 70 && result.issues.filter(i => i.severity === 'critical').length === 0;

        return result;
    }

    /**
     * Check CPU compatibility
     */
    static _checkCPUCompatibility(cpu, build, result) {
        const cpuSpecs = cpu.specifications || {};
        const motherboard = build.motherboard;

        if (motherboard) {
            const mbSpecs = motherboard.specifications || {};

            // Socket compatibility (CRITICAL)
            if (cpuSpecs.socket && mbSpecs.socket) {
                if (cpuSpecs.socket !== mbSpecs.socket) {
                    result.issues.push({
                        severity: 'critical',
                        category: 'socket',
                        message: `Socket mismatch: CPU requires ${cpuSpecs.socket}, motherboard has ${mbSpecs.socket}`,
                        solution: `Select a motherboard with ${cpuSpecs.socket} socket or a CPU compatible with ${mbSpecs.socket}`
                    });
                } else {
                    result.info.push({
                        category: 'socket',
                        message: `✓ Socket compatible: ${cpuSpecs.socket}`
                    });
                }
            }

            // RAM type compatibility
            if (cpuSpecs.memory_type && mbSpecs.memory_type) {
                if (cpuSpecs.memory_type !== mbSpecs.memory_type) {
                    result.warnings.push({
                        severity: 'warning',
                        category: 'memory',
                        message: `RAM type mismatch: CPU supports ${cpuSpecs.memory_type}, motherboard supports ${mbSpecs.memory_type}`,
                        solution: 'Verify motherboard and CPU memory type compatibility'
                    });
                }
            }

            // TDP check with motherboard VRM
            if (cpuSpecs.tdp && mbSpecs.max_tdp) {
                if (parseInt(cpuSpecs.tdp) > parseInt(mbSpecs.max_tdp)) {
                    result.warnings.push({
                        severity: 'warning',
                        category: 'power',
                        message: `CPU TDP (${cpuSpecs.tdp}W) exceeds motherboard max TDP (${mbSpecs.max_tdp}W)`,
                        solution: 'Consider a motherboard with better VRM or a lower TDP CPU'
                    });
                }
            }
        }
    }

    /**
     * Check Motherboard compatibility
     */
    static _checkMotherboardCompatibility(motherboard, build, result) {
        const mbSpecs = motherboard.specifications || {};
        const cpu = build.cpu;
        const ram = build.ram;
        const caseComponent = build.case;

        // CPU compatibility
        if (cpu) {
            const cpuSpecs = cpu.specifications || {};

            // Socket check
            if (mbSpecs.socket && cpuSpecs.socket && mbSpecs.socket !== cpuSpecs.socket) {
                result.issues.push({
                    severity: 'critical',
                    category: 'socket',
                    message: `Socket mismatch: Motherboard has ${mbSpecs.socket}, CPU requires ${cpuSpecs.socket}`,
                    solution: 'Select compatible CPU and motherboard socket types'
                });
            }

            // Memory type check
            if (mbSpecs.memory_type && cpuSpecs.memory_type && mbSpecs.memory_type !== cpuSpecs.memory_type) {
                result.warnings.push({
                    severity: 'warning',
                    category: 'memory',
                    message: `Memory type mismatch: Motherboard supports ${mbSpecs.memory_type}, CPU supports ${cpuSpecs.memory_type}`
                });
            }
        }

        // RAM compatibility
        if (ram) {
            const ramSpecs = ram.specifications || {};

            // Memory type check
            if (mbSpecs.memory_type && ramSpecs.memory_type && mbSpecs.memory_type !== ramSpecs.memory_type) {
                result.issues.push({
                    severity: 'critical',
                    category: 'memory',
                    message: `RAM type incompatible: Motherboard supports ${mbSpecs.memory_type}, RAM is ${ramSpecs.memory_type}`,
                    solution: `Select ${mbSpecs.memory_type} RAM modules`
                });
            }

            // RAM slots check
            const ramSticksNeeded = parseInt(ramSpecs.sticks_count) || 1;
            const ramSlotsAvailable = parseInt(mbSpecs.ram_slots) || 4;

            if (ramSticksNeeded > ramSlotsAvailable) {
                result.issues.push({
                    severity: 'critical',
                    category: 'slots',
                    message: `Insufficient RAM slots: Need ${ramSticksNeeded} slots, motherboard has ${ramSlotsAvailable}`,
                    solution: 'Select motherboard with more RAM slots or change RAM configuration'
                });
            } else if (ramSticksNeeded < ramSlotsAvailable) {
                result.info.push({
                    category: 'slots',
                    message: `✓ ${ramSlotsAvailable - ramSticksNeeded} RAM slots available for future expansion`
                });
            }

            // Max capacity check
            const ramCapacity = parseInt(ramSpecs.total_capacity_gb) || 0;
            const mbMaxRam = parseInt(mbSpecs.max_ram) || 128;

            if (ramCapacity > mbMaxRam) {
                result.warnings.push({
                    severity: 'warning',
                    category: 'capacity',
                    message: `RAM capacity (${ramCapacity}GB) exceeds motherboard max (${mbMaxRam}GB)`,
                    solution: 'Reduce RAM capacity or select motherboard with higher capacity support'
                });
            }
        }

        // Case form factor compatibility
        if (caseComponent) {
            const caseSpecs = caseComponent.specifications || {};
            const mbFormFactor = mbSpecs.form_factor;
            const supportedFormFactors = caseSpecs.motherboard_support || caseSpecs.supported_form_factors || [];

            if (mbFormFactor && Array.isArray(supportedFormFactors)) {
                const formFactorSupported = supportedFormFactors.some(ff => 
                    ff.toLowerCase() === mbFormFactor.toLowerCase() ||
                    ff.toLowerCase().includes(mbFormFactor.toLowerCase()) ||
                    mbFormFactor.toLowerCase().includes(ff.toLowerCase())
                );

                if (!formFactorSupported) {
                    result.issues.push({
                        severity: 'critical',
                        category: 'form_factor',
                        message: `Form factor incompatible: Motherboard is ${mbFormFactor}, case supports ${supportedFormFactors.join(', ')}`,
                        solution: 'Select case that supports ' + mbFormFactor
                    });
                }
            }
        }
    }

    /**
     * Check CPU Cooler compatibility
     */
    static _checkCoolingCompatibility(cooler, build, result) {
        const coolerSpecs = cooler.specifications || {};
        const cpu = build.cpu;
        const caseComponent = build.case;

        // Socket compatibility with CPU
        if (cpu) {
            const cpuSpecs = cpu.specifications || {};
            const coolerSockets = coolerSpecs.compatible_sockets || [];

            if (cpuSpecs.socket && coolerSockets.length > 0) {
                const socketSupported = coolerSockets.includes(cpuSpecs.socket);
                
                if (!socketSupported) {
                    result.issues.push({
                        severity: 'critical',
                        category: 'socket',
                        message: `Cooler not compatible with CPU socket: CPU has ${cpuSpecs.socket}, cooler supports ${coolerSockets.join(', ')}`,
                        solution: 'Select cooler compatible with ' + cpuSpecs.socket
                    });
                }
            }

            // TDP rating check
            const cpuTDP = parseInt(cpuSpecs.tdp) || 65;
            const coolerTDP = parseInt(coolerSpecs.tdp_rating) || 120;

            if (cpuTDP > coolerTDP) {
                result.warnings.push({
                    severity: 'warning',
                    category: 'cooling',
                    message: `Cooler TDP rating (${coolerTDP}W) may be insufficient for CPU (${cpuTDP}W)`,
                    solution: 'Consider higher TDP rated cooler for adequate cooling'
                });
            }
        }

        // Height clearance with case
        if (caseComponent) {
            const caseSpecs = caseComponent.specifications || {};
            const coolerHeight = parseInt(coolerSpecs.height_mm) || parseInt(coolerSpecs.height) || 155;
            const maxCoolerHeight = parseInt(caseSpecs.max_cpu_cooler_height_mm) || parseInt(caseSpecs.max_cooler_height_mm) || 165;

            if (coolerHeight > maxCoolerHeight) {
                result.issues.push({
                    severity: 'critical',
                    category: 'clearance',
                    message: `Cooler too tall: Cooler height is ${coolerHeight}mm, case max is ${maxCoolerHeight}mm`,
                    solution: 'Select lower profile cooler or larger case'
                });
            } else {
                const clearance = maxCoolerHeight - coolerHeight;
                result.info.push({
                    category: 'clearance',
                    message: `✓ ${clearance}mm cooler height clearance available`
                });
            }
        }
    }

    /**
     * Check RAM compatibility
     */
    static _checkRAMCompatibility(ram, build, result) {
        const ramSpecs = ram.specifications || {};
        const motherboard = build.motherboard;
        const cpu = build.cpu;

        if (motherboard) {
            const mbSpecs = motherboard.specifications || {};

            // Memory type check (CRITICAL)
            const ramType = ramSpecs.memory_type || ramSpecs.type;
            const mbType = mbSpecs.memory_type;

            if (ramType && mbType && ramType !== mbType) {
                result.issues.push({
                    severity: 'critical',
                    category: 'memory_type',
                    message: `RAM type incompatible: RAM is ${ramType}, motherboard supports ${mbType}`,
                    solution: `Select ${mbType} RAM modules`
                });
            }

            // Slots check
            const sticksNeeded = parseInt(ramSpecs.sticks_count) || 1;
            const slotsAvailable = parseInt(mbSpecs.ram_slots) || 4;

            if (sticksNeeded > slotsAvailable) {
                result.issues.push({
                    severity: 'critical',
                    category: 'slots',
                    message: `Insufficient slots: Need ${sticksNeeded} RAM slots, motherboard has ${slotsAvailable}`,
                    solution: 'Change RAM configuration or select motherboard with more slots'
                });
            }

            // Speed compatibility
            const ramSpeed = parseInt(ramSpecs.speed) || 0;
            const mbMaxSpeed = parseInt(mbSpecs.max_memory_speed) || 9999;

            if (ramSpeed > mbMaxSpeed) {
                result.warnings.push({
                    severity: 'info',
                    category: 'speed',
                    message: `RAM speed (${ramSpeed}MHz) exceeds motherboard max (${mbMaxSpeed}MHz). RAM will run at ${mbMaxSpeed}MHz`,
                    solution: 'No action required - RAM will be downclocked automatically'
                });
            }

            // Capacity check
            const ramCapacity = parseInt(ramSpecs.total_capacity_gb) || 0;
            const mbMaxCapacity = parseInt(mbSpecs.max_ram) || 128;

            if (ramCapacity > mbMaxCapacity) {
                result.issues.push({
                    severity: 'critical',
                    category: 'capacity',
                    message: `RAM capacity (${ramCapacity}GB) exceeds motherboard maximum (${mbMaxCapacity}GB)`,
                    solution: 'Reduce RAM capacity or select motherboard with higher capacity support'
                });
            }
        }

        // CPU compatibility check
        if (cpu) {
            const cpuSpecs = cpu.specifications || {};
            const ramType = ramSpecs.memory_type || ramSpecs.type;
            const cpuMemoryType = cpuSpecs.memory_type;

            if (ramType && cpuMemoryType && ramType !== cpuMemoryType) {
                result.warnings.push({
                    severity: 'warning',
                    category: 'memory_type',
                    message: `RAM type (${ramType}) differs from CPU supported type (${cpuMemoryType})`,
                    solution: 'Verify CPU supports this RAM type'
                });
            }
        }
    }

    /**
     * Check Storage compatibility
     */
    static _checkStorageCompatibility(storage, build, result) {
        const storageSpecs = storage.specifications || {};
        const motherboard = build.motherboard;

        if (motherboard) {
            const mbSpecs = motherboard.specifications || {};
            const storageInterface = storageSpecs.interface || storageSpecs.bus_type;

            // Check M.2 slot availability
            if (storageInterface && storageInterface.toLowerCase().includes('m.2')) {
                const m2Slots = parseInt(mbSpecs.m2_slots) || parseInt(mbSpecs['M2 Slots']) || 0;
                
                if (m2Slots === 0) {
                    result.issues.push({
                        severity: 'critical',
                        category: 'slots',
                        message: 'No M.2 slots available on motherboard for M.2 storage',
                        solution: 'Select motherboard with M.2 slots or use SATA storage'
                    });
                } else {
                    result.info.push({
                        category: 'slots',
                        message: `✓ ${m2Slots} M.2 slot(s) available`
                    });
                }
            }

            // Check SATA port availability
            if (storageInterface && storageInterface.toLowerCase().includes('sata') && !storageInterface.toLowerCase().includes('m.2')) {
                const sataPorts = parseInt(mbSpecs.sata_ports) || parseInt(mbSpecs['SATA Ports']) || 0;
                
                if (sataPorts === 0) {
                    result.warnings.push({
                        severity: 'warning',
                        category: 'ports',
                        message: 'No SATA ports available on motherboard',
                        solution: 'Verify motherboard has SATA ports or use M.2 storage'
                    });
                }
            }
        }
    }

    /**
     * Check GPU compatibility
     */
    static _checkGPUCompatibility(gpu, build, result) {
        const gpuSpecs = gpu.specifications || {};
        const motherboard = build.motherboard;
        const caseComponent = build.case;
        const psu = build.psu;

        // Check motherboard PCIe slots
        if (motherboard) {
            const mbSpecs = motherboard.specifications || {};
            const pcieSlots = parseInt(mbSpecs.pcie_x16_slots) || parseInt(mbSpecs.pcie_slots) || 1;

            if (pcieSlots === 0) {
                result.issues.push({
                    severity: 'critical',
                    category: 'slots',
                    message: 'No PCIe x16 slots available for GPU',
                    solution: 'Select motherboard with PCIe x16 slot'
                });
            }
        }

        // Check case clearance
        if (caseComponent) {
            const caseSpecs = caseComponent.specifications || {};
            const gpuLength = parseInt(gpuSpecs.length_mm) || parseInt(gpuSpecs.length) || 0;
            const maxGpuLength = parseInt(caseSpecs.max_gpu_length_mm) || parseInt(caseSpecs.max_gpu_length) || 999;

            if (gpuLength > maxGpuLength) {
                result.issues.push({
                    severity: 'critical',
                    category: 'clearance',
                    message: `GPU too long: GPU is ${gpuLength}mm, case max is ${maxGpuLength}mm`,
                    solution: 'Select shorter GPU or larger case'
                });
            } else if (gpuLength > 0) {
                const clearance = maxGpuLength - gpuLength;
                result.info.push({
                    category: 'clearance',
                    message: `✓ ${clearance}mm GPU length clearance available`
                });
            }
        }

        // Check PSU power connectors
        if (psu) {
            const psuSpecs = psu.specifications || {};
            const gpuPowerReq = gpuSpecs.power_connectors_required || {};
            const psuConnectors = psuSpecs.power_connectors || {};

            // 8-pin connectors
            const gpu8PinNeeded = parseInt(gpuPowerReq['8pin']) || 0;
            const psu8PinAvailable = parseInt(psuConnectors.pcie_8pin) || 0;

            if (gpu8PinNeeded > psu8PinAvailable) {
                result.issues.push({
                    severity: 'critical',
                    category: 'power',
                    message: `Insufficient 8-pin PCIe power connectors: GPU needs ${gpu8PinNeeded}, PSU has ${psu8PinAvailable}`,
                    solution: 'Select PSU with more PCIe power connectors'
                });
            }

            // 6-pin connectors
            const gpu6PinNeeded = parseInt(gpuPowerReq['6pin']) || 0;
            const psu6PinAvailable = parseInt(psuConnectors.pcie_6pin) || 0;

            if (gpu6PinNeeded > psu6PinAvailable) {
                result.issues.push({
                    severity: 'critical',
                    category: 'power',
                    message: `Insufficient 6-pin PCIe power connectors: GPU needs ${gpu6PinNeeded}, PSU has ${psu6PinAvailable}`,
                    solution: 'Select PSU with more PCIe power connectors'
                });
            }

            // Wattage check
            const gpuTDP = parseInt(gpuSpecs.tdp) || 0;
            const psuWattage = parseInt(psuSpecs.wattage) || 0;

            if (psuWattage > 0 && gpuTDP > 0) {
                // Estimate system power: GPU + 200W for rest of system
                const estimatedSystemPower = gpuTDP + 200;
                const recommendedPSU = estimatedSystemPower * 1.2; // 20% headroom

                if (psuWattage < recommendedPSU) {
                    result.warnings.push({
                        severity: 'warning',
                        category: 'power',
                        message: `PSU wattage may be insufficient: GPU requires ${gpuTDP}W, recommended PSU is ${Math.ceil(recommendedPSU)}W, current PSU is ${psuWattage}W`,
                        solution: 'Consider higher wattage PSU for stability and efficiency'
                    });
                }
            }
        }
    }

    /**
     * Check Case compatibility
     */
    static _checkCaseCompatibility(caseComponent, build, result) {
        const caseSpecs = caseComponent.specifications || {};
        const motherboard = build.motherboard;
        const gpu = build.gpu;
        const cooler = build.cooling;
        const psu = build.psu;

        // Motherboard form factor check
        if (motherboard) {
            const mbSpecs = motherboard.specifications || {};
            const mbFormFactor = mbSpecs.form_factor;
            const supportedFormFactors = caseSpecs.motherboard_support || caseSpecs.supported_form_factors || [];

            if (mbFormFactor && supportedFormFactors.length > 0) {
                const formFactorSupported = supportedFormFactors.some(ff => 
                    ff.toLowerCase() === mbFormFactor.toLowerCase() ||
                    ff.toLowerCase().includes(mbFormFactor.toLowerCase()) ||
                    mbFormFactor.toLowerCase().includes(ff.toLowerCase())
                );

                if (!formFactorSupported) {
                    result.issues.push({
                        severity: 'critical',
                        category: 'form_factor',
                        message: `Motherboard form factor incompatible: Motherboard is ${mbFormFactor}, case supports ${supportedFormFactors.join(', ')}`,
                        solution: 'Select case that supports ' + mbFormFactor
                    });
                }
            }
        }

        // GPU clearance check
        if (gpu) {
            const gpuSpecs = gpu.specifications || {};
            const gpuLength = parseInt(gpuSpecs.length_mm) || parseInt(gpuSpecs.length) || 0;
            const maxGpuLength = parseInt(caseSpecs.max_gpu_length_mm) || parseInt(caseSpecs.max_gpu_length) || 999;

            if (gpuLength > maxGpuLength) {
                result.issues.push({
                    severity: 'critical',
                    category: 'clearance',
                    message: `GPU will not fit: GPU is ${gpuLength}mm, case max is ${maxGpuLength}mm`,
                    solution: 'Select larger case or shorter GPU'
                });
            }
        }

        // CPU Cooler clearance check
        if (cooler) {
            const coolerSpecs = cooler.specifications || {};
            const coolerHeight = parseInt(coolerSpecs.height_mm) || parseInt(coolerSpecs.height) || 155;
            const maxCoolerHeight = parseInt(caseSpecs.max_cpu_cooler_height_mm) || parseInt(caseSpecs.max_cooler_height_mm) || 165;

            if (coolerHeight > maxCoolerHeight) {
                result.issues.push({
                    severity: 'critical',
                    category: 'clearance',
                    message: `Cooler will not fit: Cooler is ${coolerHeight}mm, case max is ${maxCoolerHeight}mm`,
                    solution: 'Select larger case or lower profile cooler'
                });
            }
        }

        // PSU form factor check
        if (psu) {
            const psuSpecs = psu.specifications || {};
            const psuFormFactor = psuSpecs.form_factor || 'ATX';
            const supportedPSU = caseSpecs.psu_form_factors_supported || ['ATX'];

            if (!supportedPSU.includes(psuFormFactor)) {
                result.warnings.push({
                    severity: 'warning',
                    category: 'form_factor',
                    message: `PSU form factor may not fit: PSU is ${psuFormFactor}, case supports ${supportedPSU.join(', ')}`,
                    solution: 'Verify PSU form factor compatibility'
                });
            }
        }
    }

    /**
     * Check PSU compatibility
     */
    static _checkPSUCompatibility(psu, build, result) {
        const psuSpecs = psu.specifications || {};
        const gpu = build.gpu;
        const cpu = build.cpu;
        const caseComponent = build.case;

        // Calculate total system power requirement
        let totalPower = 0;
        let componentPower = [];

        if (cpu) {
            const cpuTDP = parseInt(cpu.specifications?.tdp) || 65;
            totalPower += cpuTDP;
            componentPower.push(`CPU: ${cpuTDP}W`);
        }

        if (gpu) {
            const gpuTDP = parseInt(gpu.specifications?.tdp) || 0;
            totalPower += gpuTDP;
            componentPower.push(`GPU: ${gpuTDP}W`);
        }

        // Add overhead for RAM, storage, fans, etc.
        const systemOverhead = 100;
        totalPower += systemOverhead;
        componentPower.push(`System: ${systemOverhead}W`);

        const psuWattage = parseInt(psuSpecs.wattage) || 0;
        const recommendedPSU = Math.ceil(totalPower * 1.2); // 20% headroom

        if (psuWattage < totalPower) {
            result.issues.push({
                severity: 'critical',
                category: 'wattage',
                message: `PSU wattage insufficient: System requires ${totalPower}W, PSU provides ${psuWattage}W`,
                solution: `Select PSU with at least ${recommendedPSU}W (${componentPower.join(' + ')})`
            });
        } else if (psuWattage < recommendedPSU) {
            result.warnings.push({
                severity: 'warning',
                category: 'wattage',
                message: `PSU wattage below recommended: System uses ${totalPower}W, recommended ${recommendedPSU}W with 20% headroom`,
                solution: 'Consider higher wattage PSU for better efficiency and longevity'
            });
        } else {
            result.info.push({
                category: 'wattage',
                message: `✓ Adequate PSU wattage: ${psuWattage}W for ${totalPower}W system (${Math.round((psuWattage - totalPower) / totalPower * 100)}% headroom)`
            });
        }

        // Check power connectors for GPU
        if (gpu) {
            const gpuSpecs = gpu.specifications || {};
            const gpuPowerReq = gpuSpecs.power_connectors_required || {};
            const psuConnectors = psuSpecs.power_connectors || {};

            const gpu8PinNeeded = parseInt(gpuPowerReq['8pin']) || 0;
            const psu8PinAvailable = parseInt(psuConnectors.pcie_8pin) || 0;

            if (gpu8PinNeeded > psu8PinAvailable) {
                result.issues.push({
                    severity: 'critical',
                    category: 'connectors',
                    message: `Insufficient 8-pin PCIe connectors: GPU needs ${gpu8PinNeeded}, PSU has ${psu8PinAvailable}`,
                    solution: 'Select PSU with more PCIe power connectors'
                });
            }

            const gpu6PinNeeded = parseInt(gpuPowerReq['6pin']) || 0;
            const psu6PinAvailable = parseInt(psuConnectors.pcie_6pin) || 0;

            if (gpu6PinNeeded > psu6PinAvailable) {
                result.issues.push({
                    severity: 'critical',
                    category: 'connectors',
                    message: `Insufficient 6-pin PCIe connectors: GPU needs ${gpu6PinNeeded}, PSU has ${psu6PinAvailable}`,
                    solution: 'Select PSU with more PCIe power connectors'
                });
            }
        }

        // Check PSU form factor with case
        if (caseComponent) {
            const caseSpecs = caseComponent.specifications || {};
            const psuFormFactor = psuSpecs.form_factor || 'ATX';
            const supportedPSU = caseSpecs.psu_form_factors_supported || ['ATX'];

            if (!supportedPSU.includes(psuFormFactor)) {
                result.issues.push({
                    severity: 'critical',
                    category: 'form_factor',
                    message: `PSU form factor incompatible: PSU is ${psuFormFactor}, case supports ${supportedPSU.join(', ')}`,
                    solution: 'Select compatible PSU form factor or different case'
                });
            }
        }
    }

    /**
     * Calculate final compatibility score
     */
    static _calculateScore(result) {
        let score = 100;

        // Deduct points for issues
        result.issues.forEach(issue => {
            if (issue.severity === 'critical') {
                score -= 30;
            } else if (issue.severity === 'high') {
                score -= 15;
            }
        });

        // Deduct points for warnings
        result.warnings.forEach(warning => {
            if (warning.severity === 'warning') {
                score -= 10;
            } else {
                score -= 5;
            }
        });

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get available RAM slots for multi-RAM selection
     * @param {Object} motherboard - Motherboard component
     * @param {Array} existingRAM - Array of RAM already selected
     * @returns {Object} - Slots info {total, used, available}
     */
    static getAvailableRAMSlots(motherboard, existingRAM = []) {
        if (!motherboard || !motherboard.specifications) {
            return { total: 4, used: 0, available: 4 };
        }

        const totalSlots = parseInt(motherboard.specifications.ram_slots) || 4;
        let usedSlots = 0;

        existingRAM.forEach(ram => {
            if (ram && ram.specifications) {
                usedSlots += parseInt(ram.specifications.sticks_count) || 1;
            }
        });

        return {
            total: totalSlots,
            used: usedSlots,
            available: Math.max(0, totalSlots - usedSlots)
        };
    }

    /**
     * Get available storage slots for multi-storage selection
     * @param {Object} motherboard - Motherboard component
     * @param {Array} existingStorage - Array of storage already selected
     * @returns {Object} - Slots info {m2: {total, used, available}, sata: {total, used, available}}
     */
    static getAvailableStorageSlots(motherboard, existingStorage = []) {
        if (!motherboard || !motherboard.specifications) {
            return {
                m2: { total: 2, used: 0, available: 2 },
                sata: { total: 6, used: 0, available: 6 }
            };
        }

        const mbSpecs = motherboard.specifications;
        const totalM2 = parseInt(mbSpecs.m2_slots) || parseInt(mbSpecs['M2 Slots']) || 2;
        const totalSATA = parseInt(mbSpecs.sata_ports) || parseInt(mbSpecs['SATA Ports']) || 6;

        let usedM2 = 0;
        let usedSATA = 0;

        existingStorage.forEach(storage => {
            if (storage && storage.specifications) {
                const storageInterface = storage.specifications.interface || storage.specifications.bus_type || '';
                
                if (storageInterface.toLowerCase().includes('m.2')) {
                    usedM2++;
                } else if (storageInterface.toLowerCase().includes('sata')) {
                    usedSATA++;
                }
            }
        });

        return {
            m2: { total: totalM2, used: usedM2, available: Math.max(0, totalM2 - usedM2) },
            sata: { total: totalSATA, used: usedSATA, available: Math.max(0, totalSATA - usedSATA) }
        };
    }
}

module.exports = DetailedCompatibilityChecker;
