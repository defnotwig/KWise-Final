/**
 * Advanced Compatibility Service
 * Implements PCPartPicker-level compatibility checking:
 * - Power Budget Calculator (PSU wattage validation)
 * - Physical Clearance Validation (GPU, Cooler, PSU dimensions)
 * - Pairwise Component Checking (28 component pairs)
 * - Bottleneck Detection (tier-based matching)
 * - 6-Layer Compatibility Analysis
 * - PRIORITY 3: Real-World Data Integration (Known Issues, Successful Builds)
 * 
 * Phase 1 Implementation for K-Wise Philippines
 */

const logger = require('../utils/logger');
const db = require('../config/db');
const physicalClearanceService = require('./physicalClearanceService');
const realWorldDataService = require('./realWorldDataService');
const ruleEngine = require('./ruleEngine'); // 🔥 ENHANCEMENT: Integrate 3,200+ compatibility rules
const compatibilityRules = require('./compatibilityRules'); // 🔥 PHASE 11: Comprehensive 23-rule validation system

class AdvancedCompatibilityService {
    constructor() {
        this.tierRanking = {
            'entry': 1,
            'mid-tier': 2,
            'high-tier': 3,
            'elite': 4,
            'entry-level': 1,
            'budget': 1,
            'mainstream': 2,
            'performance': 3,
            'enthusiast': 4
        };

        // Component power consumption estimates (Watts)
        this.powerEstimates = {
            motherboard: { idle: 15, typical: 25, peak: 35 },
            storage: { idle: 2, typical: 5, peak: 8 },
            perRamStick: { idle: 2, typical: 3, peak: 5 },
            perFan: { idle: 2, typical: 3, peak: 5 }
        };
    }

    /**
     * LAYER 1: POWER BUDGET CALCULATOR
     * Analyzes total system power consumption and PSU adequacy
     * @param {Object} components - Build components
     * @returns {Object} - Power analysis results
     */
    async analyzePowerBudget(components) {
        try {
            logger.info('⚡ [POWER] Starting power budget analysis...');

            // 🔥 FIX #3: Robust PSU detection with 10+ field name variations
            const cpu = components.cpu || components.CPU;
            const gpu = components.gpu || components.GPU;
            
            // Check all possible PSU field names (case-insensitive, variations, etc.)
            let psu = components.psu || components.PSU || components.power_supply || 
                     components.PowerSupply || components.power || components.Power ||
                     components.POWER_SUPPLY || components.powersupply || components.powerSupply;
            
            // If still not found, search in component array by category
            if (!psu && Array.isArray(components.all)) {
                psu = components.all.find(c => 
                    c && (
                        c.category?.toLowerCase() === 'psu' ||
                        c.category?.toLowerCase() === 'power supply' ||
                        c.category?.toLowerCase() === 'power' ||
                        c.type?.toLowerCase() === 'psu'
                    )
                );
            }
            
            const ram = components.ram || components.RAM || components.memory;
            const motherboard = components.motherboard || components.Motherboard;
            const storage = components.storage || components.Storage;

            // 🔥 FIX #3: Downgrade no_psu from critical to warning (allow estimation)
            if (!psu) {
                // Still calculate power requirements even without PSU
                const cpuTdp = this.extractPowerSpec(cpu, 'tdp', 65);
                const gpuTdp = this.extractPowerSpec(gpu, 'tdp', 0);
                const estimatedPeak = Math.ceil((cpuTdp * 1.25 + gpuTdp * 1.35 + 50) * 1.2);
                const recommended = Math.ceil(estimatedPeak / 50) * 50;
                
                return {
                    status: 'no_psu',
                    message: `⚠️ No PSU selected. Estimated power need: ${estimatedPeak}W peak. Recommended: ${recommended}W PSU with 80+ efficiency.`,
                    severity: 'warning', // Changed from 'critical' to 'warning'
                    compatible: true, // Allow the build, just warn
                    recommendations: [
                        `Select a ${recommended}W or higher 80+ certified PSU`,
                        `Ensure PSU has required connectors for your components`,
                        `Consider modular PSU for cleaner cable management`
                    ],
                    estimatedPowerDraw: {
                        peak: estimatedPeak,
                        recommended: recommended
                    }
                };
            }

            // Extract power specifications
            const cpuTdp = this.extractPowerSpec(cpu, 'tdp', 65); // Default 65W
            const cpuPeak = Math.ceil(cpuTdp * 1.25); // CPU can spike 25% above TDP

            const gpuTdp = this.extractPowerSpec(gpu, 'tdp', 0); // Default 0 if no GPU
            const gpuPeak = Math.ceil(gpuTdp * 1.35); // GPU can spike 35% above TDP

            const psuWattage = this.extractPowerSpec(psu, 'wattage', 0);
            const psuEfficiency = this.extractEfficiency(psu);

            // Calculate RAM power (3-5W per stick)
            const ramSticks = this.extractRamSticks(ram);
            const ramPower = {
                idle: ramSticks * this.powerEstimates.perRamStick.idle,
                typical: ramSticks * this.powerEstimates.perRamStick.typical,
                peak: ramSticks * this.powerEstimates.perRamStick.peak
            };

            // Calculate total system power
            const totalPower = {
                idle: cpuTdp * 0.1 + gpuTdp * 0.1 + ramPower.idle + 
                      this.powerEstimates.motherboard.idle + 
                      this.powerEstimates.storage.idle,
                
                typical: cpuTdp * 0.6 + gpuTdp * 0.8 + ramPower.typical + 
                        this.powerEstimates.motherboard.typical + 
                        this.powerEstimates.storage.typical,
                
                peak: cpuPeak + gpuPeak + ramPower.peak + 
                      this.powerEstimates.motherboard.peak + 
                      this.powerEstimates.storage.peak
            };

            // Add 10% overhead for fans, RGB, peripherals
            totalPower.peak = Math.ceil(totalPower.peak * 1.1);
            totalPower.typical = Math.ceil(totalPower.typical * 1.1);

            // Calculate recommended PSU wattage (20% headroom)
            const recommendedWattage = Math.ceil(totalPower.peak * 1.2 / 50) * 50; // Round to nearest 50W
            const minimumWattage = Math.ceil(totalPower.peak * 1.1 / 50) * 50;

            // PSU load analysis
            const loadAtPeak = (totalPower.peak / psuWattage) * 100;
            const loadAtTypical = (totalPower.typical / psuWattage) * 100;
            const efficiencyOptimal = loadAtPeak >= 50 && loadAtPeak <= 80; // 50-80% is optimal

            // Connector validation
            const connectorCheck = await this.validatePowerConnectors(gpu, psu);

            // 12V rail check (GPU needs strong 12V rail)
            const rail12vCheck = await this.validate12vRail(psu, totalPower.peak);

            // Determine status
            let status, severity, message, component1, component2, details;
            
            if (psuWattage < minimumWattage) {
                status = 'insufficient';
                severity = 'critical';
                message = `❌ PSU insufficient! ${psuWattage}W PSU cannot handle ${totalPower.peak}W peak load. Minimum ${minimumWattage}W required.`;
                component1 = psu?.name || 'Unknown PSU';
                component2 = [cpu?.name, gpu?.name].filter(Boolean).join(' + ');
                details = `PSU: ${psu?.name || 'Unknown'} (${psuWattage}W) cannot supply ${totalPower.peak}W peak demand from CPU (${cpuPeak}W) + GPU (${gpuPeak}W) + System (${totalPower.peak - cpuPeak - gpuPeak}W). Minimum required: ${minimumWattage}W`;
            } else if (psuWattage < recommendedWattage) {
                status = 'minimal';
                severity = 'warning';
                message = `⚠️ PSU barely adequate. ${psuWattage}W PSU is minimum for this build. Recommended: ${recommendedWattage}W for headroom.`;
            } else if (!efficiencyOptimal) {
                if (loadAtPeak < 50) {
                    status = 'oversized';
                    severity = 'info';
                    message = `ℹ️ PSU oversized. ${psuWattage}W PSU only ${Math.round(loadAtPeak)}% loaded. Consider ${recommendedWattage}W for better efficiency.`;
                } else {
                    status = 'high_load';
                    severity = 'warning';
                    message = `⚠️ PSU near capacity. ${Math.round(loadAtPeak)}% load at peak. PSU longevity may be reduced.`;
                }
            } else {
                status = 'optimal';
                severity = 'success';
                message = `✅ PSU optimal! ${psuWattage}W PSU operating at ${Math.round(loadAtPeak)}% peak load (50-80% is ideal).`;
            }

            const result = {
                status,
                severity,
                message,
                compatible: severity !== 'critical',
                ...(component1 && { component1 }), // Include component names if PSU insufficient
                ...(component2 && { component2 }),
                ...(details && { details }),
                analysis: {
                    total_power: totalPower,
                    psu_wattage: psuWattage,
                    psu_efficiency: psuEfficiency,
                    load_at_peak: Math.round(loadAtPeak * 10) / 10,
                    load_at_typical: Math.round(loadAtTypical * 10) / 10,
                    efficiency_optimal: efficiencyOptimal,
                    recommended_wattage: recommendedWattage,
                    minimum_wattage: minimumWattage,
                    headroom: psuWattage - totalPower.peak,
                    connector_check: connectorCheck,
                    rail_12v_check: rail12vCheck
                },
                breakdown: {
                    cpu: { tdp: cpuTdp, peak: cpuPeak },
                    gpu: { tdp: gpuTdp, peak: gpuPeak },
                    ram: ramPower,
                    motherboard: this.powerEstimates.motherboard,
                    storage: this.powerEstimates.storage,
                    overhead: Math.ceil(totalPower.peak * 0.1)
                },
                recommendations: this.generatePowerRecommendations(
                    psuWattage, recommendedWattage, loadAtPeak, connectorCheck, rail12vCheck
                )
            };

            logger.info(`⚡ [POWER] Analysis complete: ${status} (${severity})`);
            return result;

        } catch (error) {
            logger.error('❌ [POWER] Power budget analysis failed:', error);
            return {
                status: 'error',
                severity: 'error',
                message: 'Power analysis failed',
                compatible: true, // Don't block on analysis failure
                error: error.message
            };
        }
    }

    /**
     * LAYER 2: PHYSICAL CLEARANCE VALIDATION
     * Checks if components physically fit in case (ENHANCED with real dimension data)
     * @param {Object} components - Build components
     * @returns {Object} - Clearance analysis results
     */
    async analyzePhysicalClearances(components) {
        try {
            logger.info('📏 [CLEARANCE] Starting physical clearance analysis with real dimensions...');

            const cpu = components.cpu || components.CPU;
            const gpu = components.gpu || components.GPU;
            const cooler = components.cooler || components.Cooler || components.cooling;
            const pcCase = components.case || components.Case || components.pc_case;
            const motherboard = components.motherboard || components.Motherboard;
            const psu = components.psu || components.PSU;
            const ram = components.ram || components.RAM || components.memory;

            const issues = [];
            const warnings = [];
            const checks = {};

            // Use new physicalClearanceService for real dimension validation
            const validationResults = await physicalClearanceService.validateAllClearances(
                Object.values(components).filter(c => c), // Filter out null/undefined
                []
            );

            // GPU CLEARANCE (Enhanced with real dimensions)
            if (gpu && pcCase) {
                const gpuResult = physicalClearanceService.validateGPUClearance(gpu, pcCase);
                
                checks.gpu_clearance = {
                    gpu_length: gpuResult.gpu_length_mm || 0,
                    case_max: gpuResult.case_max_mm || 0,
                    fits: gpuResult.compatible,
                    clearance: gpuResult.clearance_mm || 0,
                    using_real_data: gpuResult.using_real_data || false
                };

                if (!gpuResult.compatible) {
                    issues.push({
                        type: 'gpu_clearance',
                        severity: 'critical',
                        component: gpu.name,
                        message: gpuResult.issue || `❌ GPU clearance issue detected`,
                        solution: gpuResult.recommendation || 'Select compatible GPU or larger case'
                    });
                } else if (gpuResult.warning) {
                    warnings.push({
                        type: 'gpu_clearance',
                        severity: 'warning',
                        component: gpu.name,
                        message: gpuResult.warning,
                        solution: gpuResult.recommendation || 'Verify case clearance'
                    });
                }

                logger.info(`✅ [CLEARANCE] GPU: ${gpuResult.using_real_data ? 'Real dimensions' : 'Fallback'}`);
            }

            // COOLER CLEARANCE (Enhanced with socket + TDP validation)
            if (cooler && pcCase) {
                const coolerResult = physicalClearanceService.validateCoolerClearance(cooler, pcCase, cpu);
                
                checks.cooler_clearance = {
                    cooler_height: coolerResult.cooler_height_mm || 0,
                    case_max: coolerResult.case_max_mm || 0,
                    fits: coolerResult.compatible,
                    clearance: coolerResult.clearance_mm || 0,
                    socket_compatible: coolerResult.socket_compatible,
                    tdp_adequate: coolerResult.tdp_adequate,
                    using_real_data: coolerResult.using_real_data || false
                };

                if (!coolerResult.compatible) {
                    issues.push({
                        type: 'cooler_clearance',
                        severity: 'critical',
                        component: cooler.name,
                        message: coolerResult.issue || `❌ Cooler clearance issue detected`,
                        solution: coolerResult.recommendation || 'Select compatible cooler or larger case'
                    });
                } else if (coolerResult.warning) {
                    warnings.push({
                        type: 'cooler_clearance',
                        severity: 'warning',
                        component: cooler.name,
                        message: coolerResult.warning,
                        solution: coolerResult.recommendation || 'Verify cooler compatibility'
                    });
                }

                logger.info(`✅ [CLEARANCE] Cooler: ${coolerResult.using_real_data ? 'Real dimensions' : 'Fallback'}`);
            }

            // MOTHERBOARD FORM FACTOR
            if (motherboard && pcCase) {
                const mbResult = physicalClearanceService.validateMotherboardFormFactor(motherboard, pcCase);
                
                checks.motherboard_clearance = {
                    motherboard_form_factor: mbResult.motherboard_form_factor,
                    case_form_factor: mbResult.case_form_factor,
                    fits: mbResult.compatible,
                    using_real_data: mbResult.using_real_data || false
                };

                if (!mbResult.compatible) {
                    issues.push({
                        type: 'motherboard_clearance',
                        severity: 'critical',
                        component: motherboard.name,
                        message: mbResult.issue || `❌ Motherboard form factor incompatible`,
                        solution: mbResult.recommendation || 'Select compatible motherboard or case'
                    });
                }

                logger.info(`✅ [CLEARANCE] Motherboard: ${mbResult.using_real_data ? 'Real form factor' : 'Fallback'}`);
            }

            // RAM CLEARANCE (cooler blocking RAM slots) - Fallback to old method
            if (cooler && ram) {
                const coolerRamClearance = this.extractDimension(cooler, 'ram_clearance', 999);
                const ramHeight = this.extractDimension(ram, 'height', 32); // Standard RAM ~32mm

                checks.ram_clearance = {
                    ram_height: ramHeight,
                    cooler_clearance: coolerRamClearance,
                    fits: ramHeight <= coolerRamClearance,
                    margin: coolerRamClearance - ramHeight
                };

                if (ramHeight > coolerRamClearance) {
                    issues.push({
                        type: 'ram_clearance',
                        severity: 'critical',
                        component: `${cooler.name} + ${ram.name}`,
                        message: `❌ RAM too tall for cooler! ${ram.name} (${ramHeight}mm) blocked by ${cooler.name} (${coolerRamClearance}mm clearance)`,
                        solution: `Use low-profile RAM (≤ ${coolerRamClearance}mm) or different cooler`
                    });
                }
            }

            // PSU LENGTH CHECK - Fallback to old method
            if (psu && pcCase) {
                const psuLength = this.extractDimension(psu, 'length', 140); // Standard PSU ~140mm
                const caseMaxPsu = this.extractDimension(pcCase, 'max_psu_length', 999);

                checks.psu_length = {
                    psu_length: psuLength,
                    case_max: caseMaxPsu,
                    fits: psuLength <= caseMaxPsu,
                    clearance: caseMaxPsu - psuLength
                };

                if (psuLength > caseMaxPsu) {
                    issues.push({
                        type: 'psu_length',
                        severity: 'critical',
                        component: psu.name,
                        message: `❌ PSU too long! ${psu.name} (${psuLength}mm) exceeds case PSU bay (${caseMaxPsu}mm)`,
                        solution: `Select shorter PSU or case with ${psuLength}mm+ PSU clearance`
                    });
                }
            }

            // GPU SLOT WIDTH (multi-slot GPUs)
            if (gpu) {
                const gpuSlots = this.extractGpuSlots(gpu);
                
                if (gpuSlots >= 3) {
                    warnings.push({
                        type: 'gpu_slots',
                        severity: 'info',
                        component: gpu.name,
                        message: `ℹ️ ${gpu.name} occupies ${gpuSlots} PCIe slots - may block adjacent slots`,
                        solution: 'Ensure motherboard has adequate PCIe slot spacing'
                    });
                }
            }

            const allCompatible = issues.length === 0;
            const criticalIssues = issues.filter(i => i.severity === 'critical');

            const result = {
                compatible: allCompatible,
                status: allCompatible ? 'all_fit' : 'clearance_issues',
                severity: criticalIssues.length > 0 ? 'critical' : 
                         warnings.length > 0 ? 'warning' : 'success',
                message: allCompatible ? 
                    '✅ All components fit physically (using real dimension data)' :
                    `❌ ${criticalIssues.length} clearance issue(s) found`,
                critical_issues: criticalIssues,
                warnings: warnings,
                checks: checks,
                summary: {
                    total_checks: Object.keys(checks).length,
                    critical_issues: criticalIssues.length,
                    warnings: warnings.length,
                    using_real_dimensions: validationResults.using_real_data || false
                }
            };

            logger.info(`📏 [CLEARANCE] Analysis complete: ${criticalIssues.length} critical, ${warnings.length} warnings (Real data: ${validationResults.using_real_data})`);
            return result;

        } catch (error) {
            logger.error('❌ [CLEARANCE] Physical clearance analysis failed:', error);
            return {
                compatible: true, // Don't block on analysis failure
                status: 'error',
                severity: 'error',
                message: 'Clearance analysis failed',
                error: error.message
            };
        }
    }

    /**
     * LAYER 3: PAIRWISE COMPONENT CHECKING
     * Validates all component pairs for compatibility
     * @param {Object} components - Build components
     * @returns {Object} - Pairwise compatibility results
     */
    async analyzePairwiseCompatibility(components) {
        try {
            logger.info('🔗 [PAIRWISE] Starting component pair analysis...');

            const pairs = [];
            const issues = [];
            const warnings = [];

            // Define component pairs to check
            const pairDefinitions = [
                { a: 'cpu', b: 'motherboard', checks: ['socket', 'chipset', 'bios', 'vrm'] },
                { a: 'cpu', b: 'ram', checks: ['type', 'speed', 'channels'] },
                { a: 'cpu', b: 'cooler', checks: ['socket', 'tdp'] },
                { a: 'motherboard', b: 'ram', checks: ['slots', 'speed', 'capacity'] },
                { a: 'motherboard', b: 'gpu', checks: ['pcie_version', 'lanes'] },
                { a: 'motherboard', b: 'storage', checks: ['m2_slots', 'sata_ports'] },
                { a: 'motherboard', b: 'case', checks: ['form_factor'] },
                { a: 'motherboard', b: 'psu', checks: ['connectors'] },
                { a: 'gpu', b: 'psu', checks: ['wattage', 'connectors'] },
                { a: 'gpu', b: 'case', checks: ['length', 'slots'] },
                { a: 'psu', b: 'case', checks: ['form_factor', 'length'] },
                { a: 'cooler', b: 'case', checks: ['height'] },
                { a: 'storage', b: 'case', checks: ['bays'] }
            ];

            for (const pairDef of pairDefinitions) {
                const compA = components[pairDef.a] || components[pairDef.a.toUpperCase()];
                const compB = components[pairDef.b] || components[pairDef.b.toUpperCase()];

                if (!compA || !compB) continue; // Skip if components missing

                const pairResult = await this.checkComponentPair(
                    compA, compB, pairDef.a, pairDef.b, pairDef.checks
                );

                pairs.push(pairResult);

                if (pairResult.critical_issues) {
                    issues.push(...pairResult.critical_issues);
                }
                if (pairResult.warnings) {
                    warnings.push(...pairResult.warnings);
                }
            }

            const allCompatible = issues.length === 0;

            const result = {
                compatible: allCompatible,
                status: allCompatible ? 'all_pairs_compatible' : 'pair_conflicts',
                severity: issues.length > 0 ? 'critical' : 
                warnings.length > 0 ? 'warning' : 'success',
                message: allCompatible ?
                    `✅ All ${pairs.length} component pairs compatible` :
                    `❌ ${issues.length} compatibility issue(s) found in component pairs`,
                pairs: pairs,
                critical_issues: issues,
                warnings: warnings,
                summary: {
                    total_pairs_checked: pairs.length,
                    compatible_pairs: pairs.filter(p => p.compatible).length,
                    critical_issues: issues.length,
                    warnings: warnings.length
                }
            };

            logger.info(`🔗 [PAIRWISE] Analysis complete: ${pairs.length} pairs, ${issues.length} issues`);
            return result;

        } catch (error) {
            logger.error('❌ [PAIRWISE] Pairwise analysis failed:', error);
            return {
                compatible: true,
                status: 'error',
                severity: 'error',
                message: 'Pairwise analysis failed',
                error: error.message
            };
        }
    }

    /**
     * RESOURCE BUDGET ANALYSIS
     * Validates aggregate slot and port budgets for RAM, storage, and PCIe
     */
    async analyzeResourceBudgets(components) {
        try {
            const motherboard = components.motherboard || components.Motherboard;
            if (!motherboard) {
                return {
                    compatible: true,
                    status: 'not_applicable',
                    severity: 'success',
                    message: 'No motherboard selected - budget check skipped',
                    critical_issues: [],
                    warnings: []
                };
            }

            const issues = [];
            const warnings = [];

            // Normalize arrays
            const ramModules = this.normalizeToArray(components.ram || components.RAM);
            const storageDevices = this.normalizeToArray(components.storage || components.Storage);
            const gpus = this.normalizeToArray(components.gpu || components.GPU);

            // Motherboard budgets - 🔥 CRITICAL FIX: Database uses capitalized field names
            const mbRamSlots = parseInt(
                motherboard.specifications?.ram_slots || 
                motherboard.specifications?.memory_slots || 
                motherboard.specifications?.['Ram Slots'] || 
                motherboard.specifications?.['RAM Slots'] || 
                0
            ) || 0;
            const mbMaxRam = parseInt(
                motherboard.specifications?.max_ram || 
                motherboard.specifications?.maximum_memory || 
                motherboard.specifications?.['Max RAM'] || 
                motherboard.specifications?.['Maximum Memory'] || 
                0
            ) || 0;
            const mbM2Slots = parseInt(
                motherboard.specifications?.m2_slots || 
                motherboard.specifications?.m_2_slots || 
                motherboard.specifications?.['M2 Slots'] || 
                motherboard.specifications?.['M.2 Slots'] || 
                0
            ) || 0;
            const mbSataPorts = parseInt(
                motherboard.specifications?.sata_ports || 
                motherboard.specifications?.sata_slots || 
                motherboard.specifications?.['SATA Ports'] || 
                motherboard.specifications?.['SATA ports'] || 
                motherboard.specifications?.['sata ports'] || 
                0
            ) || 0;
            const mbPcieX16 = parseInt(
                motherboard.specifications?.pcie_x16_slots || 
                motherboard.specifications?.['PCIe x16 Slots'] || 
                motherboard.specifications?.['PCIE x16 Slots'] || 
                0
            ) || 1;

            // RAM sticks / capacity
            const totalRamSticks = ramModules.reduce((sum, mod) => sum + this.extractRamSticks(mod), 0);
            const totalRamCapacity = ramModules.reduce((sum, mod) => {
                const cap = this.extractRamCapacity(mod);
                return sum + (cap || 0);
            }, 0);

            if (mbRamSlots && totalRamSticks > mbRamSlots) {
                const ramNames = ramModules.map(r => r.name || 'Unknown RAM').join(', ');
                issues.push({
                    type: 'ram_slots',
                    severity: 'critical',
                    message: `RAM sticks (${totalRamSticks}) exceed motherboard slots (${mbRamSlots})`,
                    component1: ramNames,
                    component2: normalizedComponents.motherboard?.name || 'Motherboard',
                    details: `RAM: ${ramNames} require ${totalRamSticks} slot(s), but motherboard ${normalizedComponents.motherboard?.name || 'Unknown'} only has ${mbRamSlots} slot(s)`
                });
            }

            if (mbMaxRam && totalRamCapacity > mbMaxRam) {
                const ramNames = ramModules.map(r => r.name || 'Unknown RAM').join(', ');
                issues.push({
                    type: 'ram_capacity',
                    severity: 'critical',
                    message: `RAM capacity ${totalRamCapacity}GB exceeds motherboard max ${mbMaxRam}GB`,
                    component1: ramNames,
                    component2: normalizedComponents.motherboard?.name || 'Motherboard',
                    details: `RAM: ${ramNames} total capacity is ${totalRamCapacity}GB, but motherboard ${normalizedComponents.motherboard?.name || 'Unknown'} max is ${mbMaxRam}GB`
                });
            }

            // Storage budgeting
            let m2Count = 0;
            let sataCount = 0;
            storageDevices.forEach(dev => {
                const iface = (this.extractStorageInterface(dev) || '').toLowerCase();
                if (iface.includes('m.2') || iface.includes('nvme') || iface.includes('pcie')) {
                    m2Count += 1;
                } else if (iface.includes('sata')) {
                    sataCount += 1;
                }
            });

            if (mbM2Slots && m2Count > mbM2Slots) {
                const m2Drives = storageDevices.filter(dev => {
                    const iface = (this.extractStorageInterface(dev) || '').toLowerCase();
                    return iface.includes('m.2') || iface.includes('nvme') || iface.includes('pcie');
                });
                const m2Names = m2Drives.map(d => d.name || 'Unknown M.2 Drive').join(', ');
                issues.push({
                    type: 'm2_slots',
                    severity: 'critical',
                    message: `M.2 drives (${m2Count}) exceed motherboard M.2 slots (${mbM2Slots})`,
                    component1: m2Names,
                    component2: normalizedComponents.motherboard?.name || 'Motherboard',
                    details: `M.2 Drives: ${m2Names} require ${m2Count} M.2 slot(s), but motherboard ${normalizedComponents.motherboard?.name || 'Unknown'} only has ${mbM2Slots} slot(s)`
                });
            }

            if (mbSataPorts && sataCount > mbSataPorts) {
                const sataDrives = storageDevices.filter(dev => {
                    const iface = (this.extractStorageInterface(dev) || '').toLowerCase();
                    return iface.includes('sata');
                });
                const sataNames = sataDrives.map(d => d.name || 'Unknown SATA Drive').join(', ');
                issues.push({
                    type: 'sata_ports',
                    severity: 'critical',
                    message: `SATA drives (${sataCount}) exceed motherboard SATA ports (${mbSataPorts})`,
                    component1: sataNames,
                    component2: normalizedComponents.motherboard?.name || 'Motherboard',
                    details: `SATA Drives: ${sataNames} require ${sataCount} SATA port(s), but motherboard ${normalizedComponents.motherboard?.name || 'Unknown'} only has ${mbSataPorts} port(s)`
                });
            }

            // GPU slot budgeting - COUNT NUMBER OF GPUs, not their internal slot width
            // Each GPU occupies 1 motherboard slot regardless of if it's x8 or x16
            const totalGpuSlots = gpus.length; // 🔥 FIX: Count GPUs, not their slot width
            if (totalGpuSlots > mbPcieX16 && gpus.length > 0) {
                // Build detailed message with GPU names
                const gpuNames = gpus.map(g => g.name || 'Unknown GPU').join(', ');
                issues.push({
                    type: 'pcie_slots',
                    severity: 'critical',
                    message: `GPU slot demand (${totalGpuSlots}) exceeds motherboard PCIe x16 slots (${mbPcieX16})`,
                    component1: gpuNames,
                    component2: normalizedComponents.motherboard?.name || 'Motherboard',
                    details: `GPUs: ${gpuNames} require ${totalGpuSlots} PCIe x16 slot(s), but motherboard ${normalizedComponents.motherboard?.name || 'Unknown'} only has ${mbPcieX16} slot(s)`
                });
            }

            const compatible = issues.length === 0;

            return {
                compatible,
                status: compatible ? 'budget_ok' : 'budget_exceeded',
                severity: compatible ? (warnings.length ? 'warning' : 'success') : 'critical',
                message: compatible ? '✅ Slot and port budgets within limits' : '❌ Slot/port budgets exceeded',
                critical_issues: issues,
                warnings,
                summary: {
                    ram_slots_used: totalRamSticks,
                    ram_slots_available: mbRamSlots,
                    ram_capacity_gb: totalRamCapacity,
                    ram_capacity_max_gb: mbMaxRam,
                    m2_used: m2Count,
                    m2_available: mbM2Slots,
                    sata_used: sataCount,
                    sata_available: mbSataPorts,
                    pcie_slots_used: totalGpuSlots,
                    pcie_slots_available: mbPcieX16
                }
            };

        } catch (error) {
            logger.error('❌ [BUDGET] Resource budget analysis failed:', error);
            return {
                compatible: true,
                status: 'error',
                severity: 'error',
                message: 'Resource budget analysis failed',
                error: error.message,
                critical_issues: [],
                warnings: []
            };
        }
    }

    /**
     * LAYER 4: BOTTLENECK DETECTION
     * Identifies performance mismatches between components
     * @param {Object} components - Build components
     * @returns {Object} - Bottleneck analysis results
     */
    async analyzeBottlenecks(components) {
        try {
            logger.info('🎯 [BOTTLENECK] Starting bottleneck detection...');

            const cpu = components.cpu || components.CPU;
            const gpu = components.gpu || components.GPU;
            const ram = components.ram || components.RAM || components.memory;

            const bottlenecks = [];
            const warnings = [];

            // CPU-GPU TIER MATCHING
            if (cpu && gpu) {
                const cpuTierData = await this.extractTier(cpu);
                const gpuTierData = await this.extractTier(gpu);

                if (cpuTierData && gpuTierData) {
                    const cpuTier = cpuTierData.tier;
                    const gpuTier = gpuTierData.tier;
                    const cpuRank = cpuTierData.score;
                    const gpuRank = gpuTierData.score;
                    const difference = Math.abs(cpuRank - gpuRank);

                    logger.debug(`🎯 [BOTTLENECK] CPU: ${cpu.name} (${cpuTier}, rank ${cpuRank})`);
                    logger.debug(`🎯 [BOTTLENECK] GPU: ${gpu.name} (${gpuTier}, rank ${gpuRank})`);
                    logger.debug(`🎯 [BOTTLENECK] Tier difference: ${difference}`);

                    if (difference >= 2) {
                        const bottleneck = cpuRank < gpuRank ? 'CPU' : 'GPU';
                        const stronger = cpuRank < gpuRank ? 'GPU' : 'CPU';
                        const weaker = bottleneck;
                        const performanceLoss = 10 + (difference * 10);

                        bottlenecks.push({
                            type: 'cpu_gpu_mismatch',
                            severity: difference >= 3 ? 'critical' : 'warning',
                            component: bottleneck.toLowerCase(), // 🔥 ADD: Component identifier (cpu or gpu)
                            component_name: bottleneck === 'CPU' ? cpu.name : gpu.name, // 🔥 ADD: Specific component name
                            related_component: bottleneck === 'CPU' ? 'gpu' : 'cpu', // 🔥 ADD: Related component
                            related_component_name: bottleneck === 'CPU' ? gpu.name : cpu.name, // 🔥 ADD: Related component name
                            bottleneck: bottleneck,
                            message: `⚠️ ${bottleneck} Bottleneck Detected! ${cpu.name} (${cpuTier}) + ${gpu.name} (${gpuTier})`,
                            impact: `~${performanceLoss}% performance loss - ${stronger} underutilized`,
                            recommendation: `Upgrade ${weaker} to ${gpuTier} tier for balanced performance`,
                            analysis: {
                                cpu_tier: cpuTier,
                                gpu_tier: gpuTier,
                                cpu_rank: cpuRank,
                                gpu_rank: gpuRank,
                                tier_difference: difference,
                                estimated_loss: `${performanceLoss}%`
                            }
                        });
                    } else if (difference === 1) {
                        warnings.push({
                            type: 'minor_mismatch',
                            severity: 'info',
                            message: `ℹ️ Minor tier mismatch: ${cpu.name} (${cpuTier}) + ${gpu.name} (${gpuTier})`,
                            impact: 'Minimal (~5-10%) performance impact',
                            recommendation: 'Acceptable for most users'
                        });
                    }
                } else {
                    logger.warn(`⚠️ [BOTTLENECK] Could not determine tier for CPU or GPU`);
                }
            }

            // RAM SPEED VS CPU SUPPORT
            if (cpu && ram) {
                const cpuMaxRamSpeed = this.extractMaxRamSpeed(cpu);
                const ramSpeed = this.extractRamSpeed(ram);

                if (cpuMaxRamSpeed && ramSpeed && ramSpeed > cpuMaxRamSpeed) {
                    warnings.push({
                        type: 'ram_speed_limited',
                        severity: 'info',
                        component: 'ram', // 🔥 ADD: Component identifier
                        component_name: ram.name, // 🔥 ADD: Specific component name
                        message: `ℹ️ RAM speed limited: ${ram.name} (${ramSpeed}MHz) will run at ${cpuMaxRamSpeed}MHz (CPU limit)`,
                        impact: 'RAM will downclock to CPU maximum',
                        recommendation: `Save money with ${cpuMaxRamSpeed}MHz RAM or upgrade CPU for faster RAM support`
                    });
                }
            }

            // STORAGE INTERFACE BOTTLENECK
            // 🔥 FIX: Handle both single storage object and array of storage drives
            const storageInput = components.storage || components.Storage;
            const storageDevices = Array.isArray(storageInput) ? storageInput : (storageInput ? [storageInput] : []);
            
            storageDevices.forEach(storage => {
                if (storage && storage.name) {
                    const storageType = this.extractStorageType(storage);
                    const storageInterface = this.extractStorageInterface(storage);

                    if (storageType === 'SSD' && storageInterface === 'SATA') {
                        warnings.push({
                            type: 'storage_interface',
                            severity: 'info',
                            component: 'storage', // 🔥 ADD: Component identifier
                            component_name: storage.name, // 🔥 ADD: Specific component name
                            message: `ℹ️ ${storage.name} uses SATA (limited to ~550MB/s)`,
                            impact: 'Consider NVMe for 3-7x faster speeds',
                            recommendation: 'Upgrade to NVMe M.2 SSD for better performance'
                        });
                    }
                }
            });

            const hasBottlenecks = bottlenecks.length > 0;
            const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');

            const result = {
                balanced: !hasBottlenecks,
                status: hasBottlenecks ? 'bottlenecks_detected' : 'balanced',
                severity: criticalBottlenecks.length > 0 ? 'critical' :
                         bottlenecks.length > 0 ? 'warning' :
                         warnings.length > 0 ? 'info' : 'success',
                message: hasBottlenecks ?
                    `⚠️ ${bottlenecks.length} bottleneck(s) detected` :
                    '✅ Build is balanced - no major bottlenecks',
                bottlenecks: bottlenecks,
                warnings: warnings,
                summary: {
                    critical_bottlenecks: criticalBottlenecks.length,
                    total_bottlenecks: bottlenecks.length,
                    total_warnings: warnings.length
                }
            };

            logger.info(`🎯 [BOTTLENECK] Analysis complete: ${bottlenecks.length} bottlenecks, ${warnings.length} warnings`);
            return result;

        } catch (error) {
            logger.error('❌ [BOTTLENECK] Bottleneck detection failed:', error);
            return {
                balanced: true,
                status: 'error',
                severity: 'error',
                message: 'Bottleneck analysis failed',
                error: error.message
            };
        }
    }

    /**
     * LAYER 5: THERMAL ANALYSIS
     * Analyzes thermal performance and cooling adequacy
     * @param {Object} components - Build components
     * @returns {Object} - Thermal analysis results
     */
    async analyzeThermalPerformance(components) {
        try {
            logger.info('🌡️ [THERMAL] Starting thermal performance analysis...');

            const cpu = components.cpu || components.CPU;
            const cooler = components.cooler || components.Cooler || components.cooling || components.cpu_cooler;
            const gpu = components.gpu || components.GPU;
            const caseComponent = components.case || components.Case || components.chassis;

            const warnings = [];
            const recommendations = [];
            let thermalStatus = 'optimal';
            let severity = 'success';

            // CPU COOLING ANALYSIS
            if (cpu) {
                const cpuTdp = this.extractPowerSpec(cpu, 'tdp', 65);
                logger.debug(`🌡️ [THERMAL] CPU TDP: ${cpuTdp}W`);

                if (cooler) {
                    const coolerRating = await this.extractCoolerRating(cooler);
                    const isAIO = this.isAIOCooler(cooler);
                    
                    logger.debug(`🌡️ [THERMAL] Cooler rating: ${coolerRating}W, AIO: ${isAIO}`);

                    // Check if cooler can handle CPU TDP
                    if (coolerRating) {
                        const headroom = coolerRating - cpuTdp;
                        const ratio = cpuTdp / coolerRating;

                        if (ratio > 1.0) {
                            // Cooler insufficient
                            warnings.push({
                                type: 'inadequate_cooling',
                                severity: 'critical',
                                component: 'CPU Cooler',
                                message: `❌ CPU cooler insufficient! ${cooler.name} (${coolerRating}W) cannot handle ${cpu.name} (${cpuTdp}W TDP)`,
                                impact: 'CPU will thermal throttle under load, reducing performance by 20-40%',
                                recommendation: `Upgrade to cooler rated for ${Math.ceil(cpuTdp * 1.2 / 10) * 10}W+ TDP`
                            });
                            thermalStatus = 'critical';
                            severity = 'critical';
                        } else if (ratio > 0.9) {
                            // Cooler barely adequate
                            warnings.push({
                                type: 'marginal_cooling',
                                severity: 'warning',
                                component: 'CPU Cooler',
                                message: `⚠️ CPU cooler marginal. ${cooler.name} (${coolerRating}W) has minimal headroom for ${cpu.name} (${cpuTdp}W)`,
                                impact: 'May run hot under sustained load, higher fan noise',
                                recommendation: `Consider ${Math.ceil(cpuTdp * 1.3 / 10) * 10}W+ cooler for better thermals and quieter operation`
                            });
                            if (severity !== 'critical') {
                                thermalStatus = 'marginal';
                                severity = 'warning';
                            }
                        } else if (headroom >= 30) {
                            // Good cooling headroom
                            recommendations.push({
                                type: 'good_cooling',
                                severity: 'success',
                                message: `✅ CPU cooling adequate: ${coolerRating}W cooler for ${cpuTdp}W CPU (+${headroom}W headroom)`
                            });
                        }

                        // AIO Clearance Check
                        if (isAIO && caseComponent) {
                            const radiatorSize = this.extractRadiatorSize(cooler);
                            const caseSupport = await this.checkAIOSupport(caseComponent, radiatorSize);
                            
                            if (!caseSupport.compatible) {
                                warnings.push({
                                    type: 'aio_clearance',
                                    severity: 'critical',
                                    component: 'Case',
                                    message: `❌ AIO incompatible! ${caseComponent.name} does not support ${radiatorSize}mm radiator`,
                                    impact: 'AIO will not fit in case',
                                    recommendation: caseSupport.recommendation || `Choose case supporting ${radiatorSize}mm radiators`
                                });
                                thermalStatus = 'critical';
                                severity = 'critical';
                            }
                        }
                    }
                } else {
                    // No cooler selected
                    warnings.push({
                        type: 'no_cooler',
                        severity: 'critical',
                        component: 'CPU Cooler',
                        message: `❌ No CPU cooler selected! ${cpu.name} (${cpuTdp}W TDP) requires cooling`,
                        impact: 'System cannot operate without CPU cooler',
                        recommendation: cpuTdp > 95 
                            ? `Select AIO cooler (240mm+) or high-end tower cooler (${Math.ceil(cpuTdp * 1.2 / 10) * 10}W+ rated)`
                            : `Select tower cooler (${Math.ceil(cpuTdp * 1.2 / 10) * 10}W+ rated) or AIO`
                    });
                    thermalStatus = 'critical';
                    severity = 'critical';
                }
            }

            // GPU THERMAL ANALYSIS
            if (gpu && caseComponent) {
                const gpuTdp = this.extractPowerSpec(gpu, 'tdp', 0);
                const gpuLength = this.extractGPULength(gpu);
                const caseAirflow = await this.assessCaseAirflow(caseComponent);

                logger.debug(`🌡️ [THERMAL] GPU TDP: ${gpuTdp}W, Airflow: ${caseAirflow.rating}`);

                // High-power GPU in poor airflow case
                if (gpuTdp > 250 && caseAirflow.rating === 'poor') {
                    warnings.push({
                        type: 'gpu_thermal_concern',
                        severity: 'warning',
                        component: 'GPU/Case',
                        message: `⚠️ High-power GPU (${gpuTdp}W) in case with limited airflow`,
                        impact: 'GPU may run hot, increased fan noise, potential thermal throttling',
                        recommendation: 'Ensure adequate case fans (3+ intake, 2+ exhaust) or consider case with better airflow'
                    });
                    if (severity === 'success') {
                        thermalStatus = 'warning';
                        severity = 'warning';
                    }
                }

                // Very high-power GPU (300W+)
                if (gpuTdp >= 300) {
                    recommendations.push({
                        type: 'high_power_gpu',
                        severity: 'info',
                        message: `ℹ️ ${gpu.name} is a high-power GPU (${gpuTdp}W). Ensure excellent case airflow and PSU quality.`
                    });
                }
            }

            const result = {
                thermal_status: thermalStatus,
                severity: severity,
                message: severity === 'critical' 
                    ? `❌ Critical thermal issues detected (${warnings.filter(w => w.severity === 'critical').length})` 
                    : severity === 'warning'
                    ? `⚠️ Thermal concerns detected (${warnings.length})`
                    : '✅ Thermal performance adequate',
                warnings: warnings,
                recommendations: recommendations,
                summary: {
                    critical_warnings: warnings.filter(w => w.severity === 'critical').length,
                    total_warnings: warnings.length,
                    total_recommendations: recommendations.length
                }
            };

            logger.info(`🌡️ [THERMAL] Analysis complete: ${warnings.length} warnings`);
            return result;

        } catch (error) {
            logger.error('❌ [THERMAL] Thermal analysis failed:', error);
            return {
                thermal_status: 'error',
                severity: 'error',
                message: 'Thermal analysis failed',
                warnings: [],
                recommendations: [],
                error: error.message
            };
        }
    }

    /**
     * COMPREHENSIVE BUILD ANALYSIS
     * Runs all 5 layers of advanced compatibility checking
     * @param {Object} components - Build components
     * @returns {Object} - Complete compatibility analysis
     */
    async analyzeFullBuild(components) {
        try {
            logger.info('🔍 [ADVANCED] Starting comprehensive build analysis...');

            // 🔥 FIX: Validate components object
            if (!components || typeof components !== 'object') {
                throw new Error('Components object is required');
            }

            // 🔥 FIX: Normalize component keys - handle both 'case' and 'pcCase'
            // 🔥 FIX: Preserve storage as array if sent as array from frontend
            const normalizedComponents = {
                cpu: components.cpu || components.CPU,
                motherboard: components.motherboard || components.Motherboard,
                ram: components.ram || components.RAM || components.memory,
                gpu: components.gpu || components.GPU,
                psu: components.psu || components.PSU,
                case: components.case || components.Case || components.pcCase || components.pc_case,
                storage: components.storage || components.Storage, // ✅ Preserve array structure
                cooling: components.cooling || components.Cooling || components.cooler
            };

            // 🔥 PHASE 11: Added comprehensive 23-rule validation system as Layer 6
            const [powerAnalysis, clearanceAnalysis, pairwiseAnalysis, bottleneckAnalysis, thermalAnalysis, comprehensiveRulesAnalysis, resourceBudgetAnalysis] = await Promise.all([
                this.analyzePowerBudget(normalizedComponents),
                this.analyzePhysicalClearances(normalizedComponents),
                this.analyzePairwiseCompatibility(normalizedComponents),
                this.analyzeBottlenecks(normalizedComponents),
                this.analyzeThermalPerformance(normalizedComponents),
                this.runComprehensiveRulesValidation(normalizedComponents), // 🔥 NEW: 23-rule system with PHASE 3/4 enhancements
                this.analyzeResourceBudgets(normalizedComponents)
            ]);

            // PRIORITY 3: Check real-world compatibility data
            const componentIds = Object.values(normalizedComponents)
                .filter(c => c && c.id)
                .map(c => c.id);
            
            const realWorldData = await realWorldDataService.getRealWorldCompatibilityConfidence(componentIds);
            
            logger.info(`🌍 [REAL-WORLD] Confidence: ${realWorldData.confidence}%, Issues: ${realWorldData.known_issues}, Builds: ${realWorldData.similar_builds}`);

            // Aggregate all issues (including real-world data, thermal, and comprehensive rules)
            const allCriticalIssues = [
                ...(powerAnalysis.severity === 'critical' ? [{ layer: 'power', ...powerAnalysis }] : []),
                ...(clearanceAnalysis.critical_issues || []).map(i => ({ layer: 'clearance', ...i })),
                ...(pairwiseAnalysis.critical_issues || []).map(i => ({ layer: 'pairwise', ...i })),
                ...(resourceBudgetAnalysis.critical_issues || []).map(i => ({ layer: 'resource_budget', ...i })),
                ...(bottleneckAnalysis.bottlenecks?.filter(b => b.severity === 'critical') || []).map(b => ({ layer: 'bottleneck', ...b })),
                ...(thermalAnalysis.warnings?.filter(w => w.severity === 'critical') || []).map(w => ({ layer: 'thermal', ...w })),
                ...(comprehensiveRulesAnalysis.critical_issues || []).map(i => ({ layer: 'comprehensive_rules', ...i })), // 🔥 PHASE 11
                ...(realWorldData.critical_issues > 0 ? realWorldData.warnings.map(w => ({ layer: 'real_world', ...w })) : [])
            ];

            const allWarnings = [
                ...(powerAnalysis.severity === 'warning' ? [{ layer: 'power', ...powerAnalysis }] : []),
                ...(clearanceAnalysis.warnings || []).map(w => ({ layer: 'clearance', ...w })),
                ...(pairwiseAnalysis.warnings || []).map(w => ({ layer: 'pairwise', ...w })),
                ...(resourceBudgetAnalysis.warnings || []).map(w => ({ layer: 'resource_budget', ...w })),
                ...(bottleneckAnalysis.warnings || []).map(w => ({ layer: 'bottleneck', ...w })),
                ...(thermalAnalysis.warnings?.filter(w => w.severity === 'warning') || []).map(w => ({ layer: 'thermal', ...w })),
                ...(comprehensiveRulesAnalysis.warnings || []).map(w => ({ layer: 'comprehensive_rules', ...w })), // 🔥 PHASE 11
                ...(realWorldData.major_issues > 0 && realWorldData.critical_issues === 0 ? realWorldData.warnings.map(w => ({ layer: 'real_world', ...w })) : [])
            ];

            const overallCompatible = allCriticalIssues.length === 0;
            const overallSeverity = allCriticalIssues.length > 0 ? 'critical' :
                                   allWarnings.length > 0 ? 'warning' : 'success';

            // Calculate compatibility score (0-100)
            // Scoring logic:
            // - Start at 100
            // - Critical issues: -25 each
            // - Warnings: -10 each
            // - Real-world confidence: weighted factor
            let compatibilityScore = 100;
            compatibilityScore -= (allCriticalIssues.length * 25);
            compatibilityScore -= (allWarnings.length * 10);
            
            // Factor in real-world confidence (weight: 20%)
            const confidencePenalty = (100 - parseFloat(realWorldData.confidence)) * 0.2;
            compatibilityScore -= confidencePenalty;
            
            // Ensure score stays within 0-100 range
            compatibilityScore = Math.max(0, Math.min(100, Math.round(compatibilityScore)));

            const result = {
                compatible: overallCompatible,
                overall_status: overallCompatible ? 'compatible' : 'incompatible',
                overall_severity: overallSeverity,
                overall_message: this.generateOverallMessage(allCriticalIssues, allWarnings),
                compatibility_score: compatibilityScore, // Add compatibility score
                layers: {
                    power: powerAnalysis,
                    clearance: clearanceAnalysis,
                    pairwise: pairwiseAnalysis,
                    resource_budget: resourceBudgetAnalysis,
                    bottleneck: bottleneckAnalysis,
                    thermal: thermalAnalysis, // 🔥 FIX #5: Add thermal layer
                    comprehensive_rules: comprehensiveRulesAnalysis, // 🔥 PHASE 11: Add 23-rule validation system
                    real_world: {
                        status: realWorldData.confidence >= 70 ? 'high_confidence' :
                               realWorldData.confidence >= 50 ? 'medium_confidence' : 'low_confidence',
                        severity: realWorldData.critical_issues > 0 ? 'critical' :
                                 realWorldData.major_issues > 0 ? 'warning' : 'success',
                        message: `Real-world confidence: ${realWorldData.confidence}% (${realWorldData.similar_builds} similar builds)`,
                        compatible: realWorldData.critical_issues === 0,
                        confidence: parseFloat(realWorldData.confidence),
                        known_issues: realWorldData.known_issues,
                        critical_issues: realWorldData.critical_issues,
                        major_issues: realWorldData.major_issues,
                        similar_builds: realWorldData.similar_builds,
                        avg_build_satisfaction: realWorldData.avg_build_satisfaction,
                        warnings: realWorldData.warnings || [],
                        recommendations: realWorldData.recommendations || []
                    }
                },
                summary: {
                    total_critical_issues: allCriticalIssues.length,
                    total_warnings: allWarnings.length,
                    power_status: powerAnalysis.status,
                    clearance_status: clearanceAnalysis.status,
                    pairwise_status: pairwiseAnalysis.status,
                    resource_budget_status: resourceBudgetAnalysis.status,
                    bottleneck_status: bottleneckAnalysis.status,
                    thermal_status: thermalAnalysis.thermal_status, // 🔥 FIX #5: Add thermal status
                    comprehensive_rules_status: comprehensiveRulesAnalysis.status, // 🔥 PHASE 11
                    real_world_confidence: parseFloat(realWorldData.confidence)
                },
                critical_issues: allCriticalIssues,
                warnings: allWarnings,
                timestamp: new Date().toISOString()
            };

            logger.info(`🔍 [ADVANCED] Analysis complete: ${allCriticalIssues.length} critical, ${allWarnings.length} warnings`);
            logger.info(`   Compatibility Score: ${compatibilityScore}/100`);
            logger.info(`   Power: ${powerAnalysis.status}, Clearance: ${clearanceAnalysis.status}`);
            logger.info(`   Pairwise: ${pairwiseAnalysis.status}, Bottleneck: ${bottleneckAnalysis.status}`);
            logger.info(`   Real-World: ${realWorldData.confidence}% confidence (${realWorldData.similar_builds} builds)`);

            return result;

        } catch (error) {
            logger.error('❌ [ADVANCED] Full build analysis failed:', error);
            return {
                compatible: false,
                overall_status: 'error',
                overall_severity: 'error',
                overall_message: 'Build analysis failed',
                error: error.message
            };
        }
    }

    // ==================== HELPER METHODS ====================

    // 🔥 FIX #3: Enhanced power spec extraction with fallbacks
    extractPowerSpec(component, key, defaultValue) {
        if (!component) return defaultValue;
        
        const specs = component.specifications || {};
        const name = (component.name || '').toLowerCase();
        
        // Check specifications object first
        if (specs[key]) return specs[key];
        if (specs.tdp) return specs.tdp;
        if (specs.wattage) return specs.wattage;
        if (specs.power) return specs.power;
        if (specs.max_power) return specs.max_power;
        if (specs.rated_power) return specs.rated_power;
        
        // Fallback: Try to extract from name (e.g., "650W PSU" → 650)
        if (key === 'wattage' || key === 'power' || key === 'tdp') {
            // Match patterns like "650W", "650 W", "650 Watts"
            const wattMatch = name.match(/(\d+)\s*w(?:att(?:s)?)?/i);
            if (wattMatch) return parseInt(wattMatch[1]);
            
            // Match TDP patterns like "TDP: 125W", "125W TDP"
            const tdpMatch = name.match(/(?:tdp:?\s*)?(\d+)\s*w/i);
            if (tdpMatch) return parseInt(tdpMatch[1]);
        }
        
        return defaultValue;
    }

    extractEfficiency(psu) {
        if (!psu) return 'Standard';
        const specs = psu.specifications || {};
        const name = psu.name || '';
        
        if (specs.efficiency) return specs.efficiency;
        if (name.includes('Titanium') || name.includes('80+ Titanium')) return '80+ Titanium';
        if (name.includes('Platinum') || name.includes('80+ Platinum')) return '80+ Platinum';
        if (name.includes('Gold') || name.includes('80+ Gold')) return '80+ Gold';
        if (name.includes('Bronze') || name.includes('80+ Bronze')) return '80+ Bronze';
        
        return 'Standard';
    }

    extractRamSticks(ram) {
        if (!ram) return 2; // Default dual-channel
        const specs = ram.specifications || {};
        const name = ram.name || '';
        
        if (specs.sticks) return specs.sticks;
        if (name.includes('x4') || name.includes('4x')) return 4;
        if (name.includes('x2') || name.includes('2x')) return 2;
        if (name.includes('x1') || name.includes('1x')) return 1;
        
        return 2;
    }

    async validatePowerConnectors(gpu, psu) {
        if (!gpu || !psu) return { valid: true, message: 'N/A' };

        const gpuSpecs = gpu.specifications || {};
        const gpuDims = gpu.dimensions || {};
        const psuSpecs = psu.specifications || {};
        const gpuName = (gpu.name || '').toUpperCase();

        // Extract GPU power connectors needed
        let gpuNeeds8pin = 0;
        let gpuNeeds12vhpwr = false;

        // 🔥 FIX: Check BOTH specifications AND dimensions for power_connectors
        const gpuPowerConnectors = gpuSpecs.power_connectors || gpuDims.power_connectors || '';
        
        if (gpuPowerConnectors && typeof gpuPowerConnectors === 'object') {
            gpuNeeds8pin = gpuPowerConnectors.pcie_8pin || 0;
            gpuNeeds12vhpwr = gpuPowerConnectors['12vhpwr'] || false;
        } else if (typeof gpuPowerConnectors === 'string') {
            // 🔥 FIX: Parse string power_connectors like "1x 16-pin (12VHPWR)"
            const connStr = gpuPowerConnectors.toUpperCase();
            if (connStr.includes('12VHPWR') || connStr.includes('16-PIN') || connStr.includes('16PIN')) {
                gpuNeeds12vhpwr = true;
            }
            const match8pin = connStr.match(/(\d+)\s*[Xx×]?\s*8-?PIN/i);
            if (match8pin) gpuNeeds8pin = parseInt(match8pin[1]);
        }
        
        // 🔥 FIX: Only HIGH-END RTX 4000 series require 12VHPWR (4070 Ti and above)
        // RTX 4060, 4060 Ti, 4070 (non-Ti) use standard 8-pin connectors
        const gpuNameUpper = gpuName.toUpperCase();
        const isRTX4000HighEnd = gpuNameUpper.includes('RTX 4090') || 
                                  gpuNameUpper.includes('RTX 4080') || 
                                  gpuNameUpper.includes('RTX 4070 TI') ||
                                  gpuNameUpper.includes('RTX4070TI') ||
                                  gpuNameUpper.includes('4070TI') ||
                                  gpuNameUpper.includes('4080') ||
                                  gpuNameUpper.includes('4090');
        
        // RTX 4060/4060 Ti/4070 (non-Ti) do NOT need 12VHPWR - they use 8-pin
        const isRTX4000LowMid = gpuNameUpper.includes('RTX 4060') || 
                                 gpuNameUpper.includes('RTX4060') ||
                                 gpuNameUpper.includes('4060') ||
                                 (gpuNameUpper.includes('RTX 4070') && !gpuNameUpper.includes('TI'));
        
        if (isRTX4000HighEnd && !isRTX4000LowMid) {
            gpuNeeds12vhpwr = true;
        } else if (!gpuNeeds12vhpwr && gpuNeeds8pin === 0) {
            // Infer from name/TDP for older GPUs
            if (gpuName.includes('RTX') || gpuName.includes('RX 7')) {
                gpuNeeds8pin = 2; // Most modern GPUs need 1-2x 8-pin
            } else if (gpuName.includes('GTX 16') || gpuName.includes('RX 6500')) {
                gpuNeeds8pin = 1;
            }
        }

        // 🔥 FIX: Extract PSU connectors from CORRECT fields
        const psuPcieConnectors = psuSpecs.pcie_connectors || psuSpecs['Power Connectors'] || '';
        const psuHas8pin = parseInt(psuSpecs.pcie_8pin_connectors) || psuSpecs.pcie_8pin || psuSpecs.pcie_connectors || 2;
        
        // 🔥 FIX: Check ALL possible 12VHPWR indicators
        const psuHas12vhpwr = psuSpecs.has_12vhpwr_connector === true ||
                             psuSpecs.has_12vhpwr === true ||
                             psuSpecs['12vhpwr'] === true || 
                             psuSpecs.pcie_12vhpwr > 0 ||
                             String(psuPcieConnectors).toUpperCase().includes('12VHPWR') ||
                             String(psuPcieConnectors).toUpperCase().includes('16-PIN') ||
                             String(psuPcieConnectors).toUpperCase().includes('16PIN');

        // Validate
        if (gpuNeeds12vhpwr && !psuHas12vhpwr) {
            return {
                valid: false,
                severity: 'critical',
                message: `❌ ${gpu.name} requires 12VHPWR connector - ${psu.name} lacks this connector`
            };
        }

        if (gpuNeeds8pin > psuHas8pin) {
            return {
                valid: false,
                severity: 'critical',
                message: `❌ ${gpu.name} needs ${gpuNeeds8pin}x 8-pin, ${psu.name} has only ${psuHas8pin}x 8-pin`
            };
        }

        return {
            valid: true,
            message: `✅ Power connectors OK (${gpuNeeds12vhpwr ? '12VHPWR' : gpuNeeds8pin + 'x 8-pin'})`
        };
    }

    async validate12vRail(psu, peakPower) {
        if (!psu) return { valid: true, message: 'N/A' };

        const psuSpecs = psu.specifications || {};
        const rail12vAmperage = psuSpecs.plus_12v_amperage || psuSpecs['12v_amperage'];

        if (!rail12vAmperage) {
            return { valid: true, message: 'ℹ️ 12V rail spec not available' };
        }

        const required12vCurrent = (peakPower / 12) * 1.1; // 10% margin
        const valid = rail12vAmperage >= required12vCurrent;

        return {
            valid: valid,
            severity: valid ? 'success' : 'warning',
            message: valid ?
                `✅ 12V rail OK (${rail12vAmperage}A ≥ ${Math.round(required12vCurrent)}A required)` :
                `⚠️ 12V rail borderline (${rail12vAmperage}A, need ${Math.round(required12vCurrent)}A)`
        };
    }

    generatePowerRecommendations(psuWattage, recommendedWattage, loadPercentage, connectorCheck, railCheck) {
        const recommendations = [];

        if (psuWattage < recommendedWattage) {
            recommendations.push(`Upgrade to ${recommendedWattage}W+ PSU for better headroom and longevity`);
        }

        if (loadPercentage > 80) {
            recommendations.push('Consider higher wattage PSU - running at >80% load reduces lifespan');
        }

        if (!connectorCheck.valid) {
            recommendations.push('Ensure PSU has correct power connectors for GPU');
        }

        if (railCheck && !railCheck.valid) {
            recommendations.push('Check PSU 12V rail amperage for GPU compatibility');
        }

        if (recommendations.length === 0) {
            recommendations.push('Power configuration optimal - no changes needed');
        }

        return recommendations;
    }

    extractDimension(component, key, defaultValue) {
        if (!component) return defaultValue;
        const specs = component.specifications || {};
        const dims = component.dimensions || {};
        // 🔥 FIX: Check _mm suffixed values FIRST (most accurate), then non-suffixed
        // Priority: dimensions._mm > dimensions > specs._mm > specs (to avoid string "250" overriding numeric 320)
        const raw = dims[`${key}_mm`] || dims[key] || specs[`${key}_mm`] || specs[key] || defaultValue;
        // Parse numeric value from string if needed (e.g., "250mm" -> 250, "320" -> 320)
        if (typeof raw === 'string') {
            const parsed = parseInt(raw.replace(/[^\d]/g, ''), 10);
            return isNaN(parsed) ? defaultValue : parsed;
        }
        return raw;
    }

    normalizeToArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean);
        return [value];
    }

    extractGpuSlots(gpu) {
        if (!gpu) return 2;
        const specs = gpu.specifications || {};
        const name = gpu.name || '';
        
        if (specs.slots) return specs.slots;
        if (specs.slot_width) return specs.slot_width;
        if (name.includes('3-slot') || name.includes('triple slot')) return 3;
        if (name.includes('2.5-slot')) return 2.5;
        
        return 2; // Default dual-slot
    }

    // 🔥 FIX #4: Extract tier from database instead of name inference
    async extractTier(component) {
        if (!component) return null;
        
        // Try to get tier from database first
        try {
            const result = await db.query(
                `SELECT performance_tier, tier_score, performance_score
                 FROM component_performance_tiers
                 WHERE component_id = $1
                 LIMIT 1`,
                [component.id]
            );
            
            if (result.rows.length > 0) {
                logger.debug(`🎯 [TIER] Found tier for ${component.name}: ${result.rows[0].performance_tier} (score: ${result.rows[0].tier_score})`);
                return {
                    tier: result.rows[0].performance_tier,
                    score: result.rows[0].tier_score,
                    performance: result.rows[0].performance_score
                };
            }
        } catch (error) {
            logger.warn(`⚠️ [TIER] Database lookup failed for component ${component.id}, falling back to inference`);
        }
        
        // Fallback: Check specifications object
        const specs = component.specifications || {};
        if (specs.performance_tier) {
            return {
                tier: specs.performance_tier,
                score: this.tierRanking[specs.performance_tier.toLowerCase()] || 2,
                performance: null
            };
        }
        if (specs.tier) {
            return {
                tier: specs.tier,
                score: this.tierRanking[specs.tier.toLowerCase()] || 2,
                performance: null
            };
        }
        
        // Fallback: Infer from product name (last resort)
        const name = component.name?.toLowerCase() || '';
        
        // CPU tier inference
        if (name.includes('i9') || name.includes('ryzen 9') || name.includes('threadripper')) {
            return { tier: 'elite', score: 4, performance: null };
        }
        if (name.includes('i7') || name.includes('ryzen 7')) {
            return { tier: 'high-tier', score: 3, performance: null };
        }
        if (name.includes('i5') || name.includes('ryzen 5')) {
            return { tier: 'mid-tier', score: 2, performance: null };
        }
        if (name.includes('i3') || name.includes('ryzen 3')) {
            return { tier: 'entry', score: 1, performance: null };
        }
        
        // GPU tier inference
        if (name.includes('4090') || name.includes('7900 xtx')) {
            return { tier: 'elite', score: 4, performance: null };
        }
        if (name.includes('4080') || name.includes('4070 ti') || name.includes('7900 xt')) {
            return { tier: 'high-tier', score: 3, performance: null };
        }
        if (name.includes('4060') || name.includes('3060') || name.includes('6700')) {
            return { tier: 'mid-tier', score: 2, performance: null };
        }
        if (name.includes('1650') || name.includes('6500')) {
            return { tier: 'entry', score: 1, performance: null };
        }
        
        // Default: mid-tier
        return { tier: 'mid-tier', score: 2, performance: null };
    }

    extractMaxRamSpeed(cpu) {
        if (!cpu) return null;
        const specs = cpu.specifications || {};
        return specs.max_memory_speed || specs.max_ram_speed || null;
    }

    extractRamSpeed(ram) {
        if (!ram) return null;
        const specs = ram.specifications || {};
        const name = ram.name || '';
        
        if (specs.speed) return specs.speed;
        
        // Extract from name (e.g., "DDR4 3200MHz")
        const match = name.match(/(\d{4,5})\s*MHz/i);
        return match ? parseInt(match[1]) : null;
    }

    extractStorageType(storage) {
        if (!storage) return null;
        const name = storage.name?.toLowerCase() || '';
        const specs = storage.specifications || {};
        
        if (specs.type) return specs.type;
        if (name.includes('nvme') || name.includes('m.2')) return 'NVMe';
        if (name.includes('ssd')) return 'SSD';
        if (name.includes('hdd')) return 'HDD';
        
        return 'SSD';
    }

    extractStorageInterface(storage) {
        if (!storage) return null;
        const name = storage.name?.toLowerCase() || '';
        const specs = storage.specifications || {};
        
        if (specs.interface) return specs.interface;
        if (name.includes('nvme') || name.includes('pcie')) return 'NVMe';
        if (name.includes('sata')) return 'SATA';
        
        return 'SATA';
    }

    async checkComponentPair(compA, compB, typeA, typeB, checks) {
        const pairIssues = [];
        const pairWarnings = [];
        const checkResults = {};

        for (const check of checks) {
            const result = await this.performPairCheck(compA, compB, typeA, typeB, check);
            checkResults[check] = result;
            
            if (!result.compatible && result.severity === 'critical') {
                pairIssues.push(result);
            } else if (!result.compatible && result.severity === 'warning') {
                pairWarnings.push(result);
            }
        }

        return {
            pair: `${typeA} ↔ ${typeB}`,
            component_a: { type: typeA, name: compA.name },
            component_b: { type: typeB, name: compB.name },
            compatible: pairIssues.length === 0,
            checks: checkResults,
            critical_issues: pairIssues,
            warnings: pairWarnings
        };
    }

    async performPairCheck(compA, compB, typeA, typeB, checkType) {
        const specsA = compA.specifications || {};
        const specsB = compB.specifications || {};

        switch (checkType) {
            case 'socket':
                return this.checkSocket(specsA, specsB, compA.name, compB.name);
            case 'chipset':
                return this.checkChipset(compA, compB, typeA, typeB);
            case 'bios':
                return this.checkBiosSupport(compA, compB, typeA, typeB);
            case 'form_factor':
                // Motherboard↔Case uses motherboard sizes; PSU↔Case uses PSU/case form factors
                if ((typeA === 'psu' && typeB === 'case') || (typeB === 'psu' && typeA === 'case')) {
                    return this.checkPsuCaseFormFactor(compA, compB, typeA, typeB);
                }
                return this.checkFormFactor(specsA, specsB, compA.name, compB.name);
            case 'type':
                return this.checkMemoryType(specsA, specsB, compA.name, compB.name);
            case 'speed':
                return this.checkMemorySpeed(compA, compB, typeA, typeB);
            case 'channels':
                return this.checkMemoryChannels(compA, compB, typeA, typeB);
            case 'slots':
                return this.checkMemorySlots(compA, compB, typeA, typeB);
            case 'capacity':
                return this.checkMemoryCapacity(compA, compB, typeA, typeB);
            case 'm2_slots':
                return this.checkStoragePorts(compA, compB, typeA, typeB, 'm2');
            case 'sata_ports':
                return this.checkStoragePorts(compA, compB, typeA, typeB, 'sata');
            case 'pcie_version':
                return this.checkPcieVersion(compA, compB, typeA, typeB);
            case 'lanes':
                return this.checkPcieLanes(compA, compB, typeA, typeB);
            case 'wattage':
                return this.checkPsuWattage(compA, compB, typeA, typeB);
            case 'connectors':
                return this.checkPsuConnectors(compA, compB, typeA, typeB);
            case 'bays':
                return this.checkCaseBays(compA, compB, typeA, typeB);
            case 'length':
                return this.checkLengthFit(compA, compB, typeA, typeB);
            case 'height':
                return this.checkCoolerHeightFit(compA, compB, typeA, typeB);
            case 'vrm':
                return this.checkVrmSupport(compA, compB, typeA, typeB);
            default:
                return { compatible: true, check: checkType, message: 'Check not implemented' };
        }
    }

    checkSocket(specsA, specsB, nameA, nameB) {
        const socketA = specsA.socket || specsA.cpu_socket;
        const socketB = specsB.socket || specsB.motherboard_socket;

        if (!socketA || !socketB) {
            return { compatible: true, check: 'socket', message: 'Socket info not available' };
        }

        const compatible = socketA.toLowerCase() === socketB.toLowerCase();
        
        return {
            compatible: compatible,
            check: 'socket',
            severity: compatible ? 'success' : 'critical',
            message: compatible ?
                `✅ Socket match: ${socketA}` :
                `❌ Socket mismatch: ${nameA} (${socketA}) ≠ ${nameB} (${socketB})`
        };
    }

    checkChipset(compA, compB, typeA, typeB) {
        // Identify CPU and motherboard regardless of ordering
        const cpu = [typeA, typeB].includes('cpu') ? (typeA === 'cpu' ? compA : compB) : null;
        const motherboard = [typeA, typeB].includes('motherboard') ? (typeA === 'motherboard' ? compA : compB) : null;

        if (!cpu || !motherboard) {
            return { compatible: true, check: 'chipset', message: 'Chipset check not applicable' };
        }

        const cpuGen = this.extractCpuGeneration(cpu);
        const chipset = (motherboard.specifications?.chipset || motherboard.specifications?.socket || '').toLowerCase();

        if (!cpuGen || !chipset) {
            return { compatible: true, check: 'chipset', message: 'Chipset/generation info missing' };
        }

        // Basic compatibility matrix (heuristic)
        const intelGenMap = {
            '14th': ['z890', 'b860', 'h810', 'z790', 'b760', 'h770'],
            '13th': ['z790', 'b760', 'h770', 'z690', 'b660', 'h670'],
            '12th': ['z690', 'b660', 'h670', 'h610']
        };
        const amdGenMap = {
            'ryzen 9000': ['x870', 'b850', 'x670', 'b650'],
            'ryzen 7000': ['x670', 'b650'],
            'ryzen 5000': ['x570', 'b550', 'x470', 'b450'],
            'ryzen 3000': ['x570', 'b550', 'x470', 'b450']
        };

        const chipsetOk = () => {
            const isIntel = cpuGen.includes('intel');
            if (isIntel) {
                const genKey = cpuGen.replace('th gen intel', '');
                const allowed = intelGenMap[genKey];
                if (!allowed) return true;
                return allowed.some(c => chipset.includes(c));
            }
            const amdKey = Object.keys(amdGenMap).find(k => cpuGen.includes(k));
            if (amdKey) {
                return amdGenMap[amdKey].some(c => chipset.includes(c));
            }
            return true;
        };

        const compatible = chipsetOk();

        return {
            compatible,
            check: 'chipset',
            severity: compatible ? 'success' : 'critical',
            message: compatible ? `✅ Chipset supports ${cpuGen}` : `❌ Chipset ${motherboard.specifications?.chipset || chipset} may not support ${cpu.name} (${cpuGen})`
        };
    }

    checkMemorySpeed(compA, compB, typeA, typeB) {
        const { cpu, ram, motherboard } = this.identifyCpuRamMobo(compA, compB, typeA, typeB);
        if (!ram || (!cpu && !motherboard)) {
            return { compatible: true, check: 'speed', message: 'Memory speed check not applicable' };
        }

        const ramSpeed = this.extractRamSpeed(ram);
        const cpuMax = this.extractMaxRamSpeed(cpu || {});
        const mbMax = motherboard?.specifications?.max_memory_speed || motherboard?.specifications?.max_ram_speed;

        const limits = [cpuMax, mbMax].filter(Boolean);
        if (!ramSpeed || limits.length === 0) {
            return { compatible: true, check: 'speed', message: 'Memory speed data missing' };
        }

        const maxAllowed = Math.min(...limits);
        const compatible = ramSpeed <= maxAllowed;

        return {
            compatible,
            check: 'speed',
            severity: compatible ? 'success' : 'warning',
            message: compatible ? `✅ RAM speed ${ramSpeed}MHz within limits` : `⚠️ RAM speed ${ramSpeed}MHz exceeds supported ${maxAllowed}MHz`
        };
    }

    checkMemoryChannels(compA, compB, typeA, typeB) {
        const { cpu, ram } = this.identifyCpuRamMobo(compA, compB, typeA, typeB);
        if (!cpu || !ram) {
            return { compatible: true, check: 'channels', message: 'Memory channel check not applicable' };
        }

        const cpuChannels = parseInt(cpu.specifications?.memory_channels || cpu.specifications?.channels || 2);
        const ramSticks = this.extractRamSticks(ram);

        const compatible = ramSticks >= cpuChannels || cpuChannels <= 2; // treat single-stick on dual-channel as warning
        const severity = ramSticks >= cpuChannels ? 'success' : 'warning';

        return {
            compatible,
            check: 'channels',
            severity,
            message: compatible ? `✅ RAM sticks (${ramSticks}) align with CPU channels (${cpuChannels})` : `⚠️ Single-channel config: ${ramSticks} stick(s) on ${cpuChannels}-channel CPU`
        };
    }

    checkMemorySlots(compA, compB, typeA, typeB) {
        const { ram, motherboard } = this.identifyCpuRamMobo(compA, compB, typeA, typeB);
        if (!ram || !motherboard) {
            return { compatible: true, check: 'slots', message: 'RAM slot check not applicable' };
        }

        const mbSlots = parseInt(motherboard.specifications?.ram_slots || motherboard.specifications?.memory_slots || 0);
        const ramSticks = this.extractRamSticks(ram);

        if (!mbSlots) {
            return { compatible: true, check: 'slots', message: 'Motherboard RAM slot data missing' };
        }

        const compatible = ramSticks <= mbSlots;

        return {
            compatible,
            check: 'slots',
            severity: compatible ? 'success' : 'critical',
            message: compatible ? `✅ RAM sticks (${ramSticks}) fit in ${mbSlots} slots` : `❌ RAM sticks (${ramSticks}) exceed motherboard slots (${mbSlots})`
        };
    }

    checkMemoryCapacity(compA, compB, typeA, typeB) {
        const { ram, motherboard } = this.identifyCpuRamMobo(compA, compB, typeA, typeB);
        if (!ram || !motherboard) {
            return { compatible: true, check: 'capacity', message: 'RAM capacity check not applicable' };
        }

        const mbMax = parseInt(motherboard.specifications?.max_ram || motherboard.specifications?.maximum_memory || 0);
        const ramCapacity = this.extractRamCapacity(ram);

        if (!mbMax || !ramCapacity) {
            return { compatible: true, check: 'capacity', message: 'RAM capacity data missing' };
        }

        const compatible = ramCapacity <= mbMax;

        return {
            compatible,
            check: 'capacity',
            severity: compatible ? 'success' : 'critical',
            message: compatible ? `✅ RAM capacity ${ramCapacity}GB within ${mbMax}GB limit` : `❌ RAM capacity ${ramCapacity}GB exceeds motherboard limit ${mbMax}GB`
        };
    }

    checkStoragePorts(compA, compB, typeA, typeB, mode) {
        const motherboard = typeA === 'motherboard' ? compA : typeB === 'motherboard' ? compB : null;
        const storage = typeA === 'storage' ? compA : typeB === 'storage' ? compB : null;
        if (!motherboard || !storage) {
            return { compatible: true, check: `${mode}_slots`, message: 'Storage port check not applicable' };
        }

        const storageInterface = this.extractStorageInterface(storage)?.toLowerCase() || '';
        const isM2Drive = storageInterface.includes('m.2') || storageInterface.includes('nvme') || storageInterface.includes('pcie');
        const isSataDrive = storageInterface.includes('sata');

        // 🔥 CRITICAL FIX: Database uses "SATA Ports" (capitalized) not "sata_ports"
        const mbM2 = parseInt(
            motherboard.specifications?.m2_slots || 
            motherboard.specifications?.m_2_slots || 
            motherboard.specifications?.['M2 Slots'] || 
            motherboard.specifications?.['M.2 Slots'] || 
            0
        );
        const mbSata = parseInt(
            motherboard.specifications?.sata_ports || 
            motherboard.specifications?.sata_slots || 
            motherboard.specifications?.['SATA Ports'] ||  // 🔥 FIX: Database field name
            motherboard.specifications?.['SATA ports'] || 
            motherboard.specifications?.['sata ports'] || 
            0
        );

        if (mode === 'm2' && isM2Drive) {
            const compatible = mbM2 > 0;
            return {
                compatible,
                check: 'm2_slots',
                severity: compatible ? 'success' : 'critical',
                message: compatible ? `✅ ${storage.name}: M.2 slot available (${mbM2})` : `❌ ${storage.name}: No M.2 slots available for NVMe drive`,
                component1: storage.name,
                component2: motherboard.name
            };
        }

        if (mode === 'sata' && isSataDrive) {
            const compatible = mbSata > 0;
            return {
                compatible,
                check: 'sata_ports',
                severity: compatible ? 'success' : 'critical',
                message: compatible ? `✅ ${storage.name}: SATA ports available (${mbSata})` : `❌ ${storage.name}: No SATA ports available for this drive`,
                component1: storage.name,
                component2: motherboard.name
            };
        }

        return { compatible: true, check: `${mode}_slots`, message: 'Storage interface not applicable' };
    }

    checkPcieVersion(compA, compB, typeA, typeB) {
        const motherboard = typeA === 'motherboard' ? compA : typeB === 'motherboard' ? compB : null;
        const gpu = typeA === 'gpu' ? compA : typeB === 'gpu' ? compB : null;
        if (!motherboard || !gpu) {
            return { compatible: true, check: 'pcie_version', message: 'PCIe version check not applicable' };
        }

        const mbVersion = (motherboard.specifications?.pcie_version || motherboard.specifications?.pcie_slots_version || '').toString();
        const gpuVersion = (gpu.specifications?.pcie_version || '').toString();

        if (!mbVersion || !gpuVersion) {
            return { compatible: true, check: 'pcie_version', message: 'PCIe version data missing' };
        }

        const compatible = parseFloat(mbVersion) >= parseFloat(gpuVersion);
        return {
            compatible,
            check: 'pcie_version',
            severity: compatible ? 'success' : 'warning',
            message: compatible ? `✅ PCIe ${mbVersion} slot for PCIe ${gpuVersion} GPU` : `⚠️ GPU PCIe ${gpuVersion} on motherboard PCIe ${mbVersion} (may bottleneck)`
        };
    }

    checkPcieLanes(compA, compB, typeA, typeB) {
        const motherboard = typeA === 'motherboard' ? compA : typeB === 'motherboard' ? compB : null;
        const gpu = typeA === 'gpu' ? compA : typeB === 'gpu' ? compB : null;
        if (!motherboard || !gpu) {
            return { compatible: true, check: 'lanes', message: 'PCIe lane check not applicable' };
        }

        const mbLanes = parseInt(motherboard.specifications?.pcie_x16_slots || motherboard.specifications?.pcie_lanes || 0);
        const gpuSlotWidth = this.extractGpuSlots(gpu);
        const requiresFullX16 = gpuSlotWidth >= 2; // heuristic: large GPUs expect x16

        // Multi-GPU guard
        const multiGpuRequested = gpu.specifications?.multi_gpu === true || gpu.specifications?.sli === true || gpu.specifications?.crossfire === true;
        const mbMultiGpu = motherboard.specifications?.multi_gpu === true || motherboard.specifications?.sli_support === true || motherboard.specifications?.crossfire_support === true || parseInt(motherboard.specifications?.pcie_x16_slots || 0) > 1;

        if (multiGpuRequested && !mbMultiGpu) {
            return {
                compatible: false,
                check: 'lanes',
                severity: 'critical',
                message: '❌ Multi-GPU requested but motherboard lacks multi-GPU support'
            };
        }

        if (!mbLanes) {
            return { compatible: true, check: 'lanes', message: 'Motherboard PCIe lane data missing' };
        }

        const compatible = mbLanes >= 1 && (!requiresFullX16 || mbLanes >= 1);

        return {
            compatible,
            check: 'lanes',
            severity: compatible ? 'success' : 'critical',
            message: compatible ? `✅ PCIe slot availability OK (${mbLanes} x16 slot(s))` : '❌ Motherboard lacks required PCIe x16 slot for GPU'
        };
    }

    checkPsuWattage(compA, compB, typeA, typeB) {
        const gpu = typeA === 'gpu' ? compA : typeB === 'gpu' ? compB : null;
        const psu = typeA === 'psu' ? compA : typeB === 'psu' ? compB : null;
        if (!gpu || !psu) {
            return { compatible: true, check: 'wattage', message: 'PSU wattage check not applicable' };
        }

        const gpuTdp = this.extractPowerSpec(gpu, 'tdp', 150);
        const psuWattage = this.extractPowerSpec(psu, 'wattage', 0);
        const headroom = Math.ceil((gpuTdp + 150) * 1.2); // include CPU/other estimate

        const compatible = psuWattage >= headroom;
        return {
            compatible,
            check: 'wattage',
            severity: compatible ? 'success' : 'critical',
            message: compatible ? `✅ PSU wattage ${psuWattage}W covers GPU (${gpuTdp}W) with headroom` : `❌ PSU wattage ${psuWattage}W below recommended ${headroom}W for GPU`
        };
    }

    async checkPsuConnectors(compA, compB, typeA, typeB) {
        const gpu = typeA === 'gpu' ? compA : typeB === 'gpu' ? compB : null;
        const psu = typeA === 'psu' ? compA : typeB === 'psu' ? compB : null;
        const motherboard = typeA === 'motherboard' ? compA : typeB === 'motherboard' ? compB : null;

        if (!psu) {
            return { compatible: true, check: 'connectors', message: 'PSU connector check not applicable' };
        }

        // GPU power connectors
        if (gpu) {
            const connectorResult = await this.validatePowerConnectors(gpu, psu);
            return {
                compatible: connectorResult.valid,
                check: 'connectors',
                severity: connectorResult.valid ? 'success' : connectorResult.severity || 'critical',
                message: connectorResult.message
            };
        }

        // Motherboard EPS/CPU power connectors
        if (motherboard) {
            const requiredRaw = parseInt(motherboard.specifications?.eps_8pin || motherboard.specifications?.cpu_power_connectors || motherboard.specifications?.cpu_8pin_connectors || 1);
            const psuRaw = parseInt(psu.specifications?.eps_8pin_connectors || psu.specifications?.cpu_8pin || psu.specifications?.cpu_power_connectors || psu.specifications?.eps12v || 1);

            const requiredEps = Number.isFinite(requiredRaw) && requiredRaw > 0 ? requiredRaw : 1;
            const psuEps = Number.isFinite(psuRaw) && psuRaw > 0 ? psuRaw : 1;

            const compatible = psuEps >= requiredEps;
            return {
                compatible,
                check: 'connectors',
                severity: compatible ? 'success' : 'critical',
                message: compatible ? `✅ PSU EPS connectors (${psuEps}) satisfy motherboard requirement (${requiredEps})` : `❌ PSU EPS connectors (${psuEps}) below motherboard requirement (${requiredEps})`
            };
        }

        return { compatible: true, check: 'connectors', message: 'PSU connector check not applicable' };
    }

    checkCaseBays(compA, compB, typeA, typeB) {
        const pcCase = typeA === 'case' ? compA : typeB === 'case' ? compB : null;
        const storage = typeA === 'storage' ? compA : typeB === 'storage' ? compB : null;
        if (!pcCase || !storage) {
            return { compatible: true, check: 'bays', message: 'Case bay check not applicable' };
        }

        const storageInterface = this.extractStorageInterface(storage)?.toLowerCase() || '';
        const storageName = storage.name?.toLowerCase() || '';
        
        // 🔥 CRITICAL FIX: M.2 drives (NVMe or SATA) DON'T need drive bays - they use M.2 slots
        // Only 2.5"/3.5" SATA drives need bays
        const isM2Drive = storageInterface.includes('m.2') || storageInterface.includes('m2') || 
                          storageInterface.includes('nvme') || storageInterface.includes('pcie') ||
                          storageName.includes('m.2') || storageName.includes('nvme');
        
        // Skip bay check for M.2 drives entirely
        if (isM2Drive) {
            return { 
                compatible: true, 
                check: 'bays', 
                message: `✅ ${storage.name}: M.2 drive doesn't require drive bay` 
            };
        }
        
        // Only check bays for non-M.2 drives (2.5"/3.5" SATA)
        const needs35 = storageInterface.includes('3.5') || storageInterface.includes('hdd');
        const needs25 = storageInterface.includes('2.5') || storageInterface.includes('sata');

        // 🔥 ENHANCED: Handle missing drive bay specifications
        // Try multiple field name variations (capitalized, lowercase, with underscores)
        const bays35 = parseInt(
            pcCase.specifications?.drive_bays_35 || 
            pcCase.specifications?.['3.5" Drive Bays'] ||
            pcCase.specifications?.drive_bays_35_inch ||
            pcCase.specifications?.drive_bays || 
            0
        );
        
        const bays25 = parseInt(
            pcCase.specifications?.drive_bays_25 || 
            pcCase.specifications?.['2.5" Drive Bays'] ||
            pcCase.specifications?.drive_bays_25_inch ||
            pcCase.specifications?.drive_bays || 
            0
        );

        // 🔥 CRITICAL FIX: If case has NO bay specifications at all, assume it's a typical case
        // Most mid-tower and full-tower cases support at least 2x 2.5" and 2x 3.5" drives
        const hasBaySpecs = pcCase.specifications?.drive_bays_35 || 
                            pcCase.specifications?.drive_bays_25 ||
                            pcCase.specifications?.['3.5" Drive Bays'] ||
                            pcCase.specifications?.['2.5" Drive Bays'] ||
                            pcCase.specifications?.drive_bays;

        if (!hasBaySpecs) {
            // Case has no bay specifications - assume typical mid-tower with basic support
            return {
                compatible: true,
                check: 'bays',
                severity: 'warning',
                message: `⚠️ ${storage.name}: Case drive bay specs missing - assuming compatibility (please verify ${pcCase.name} supports ${needs35 ? '3.5"' : '2.5"'} drives)`,
                component1: storage.name,
                component2: pcCase.name
            };
        }

        if (needs35) {
            const compatible = bays35 > 0;
            return {
                compatible,
                check: 'bays',
                severity: compatible ? 'success' : 'critical',
                message: compatible ? `✅ ${storage.name}: 3.5" bay available (${bays35} bays in ${pcCase.name})` : `❌ ${storage.name}: No 3.5" bays available in ${pcCase.name} for HDD`,
                component1: storage.name,
                component2: pcCase.name
            };
        }

        if (needs25) {
            const compatible = bays25 > 0 || bays35 > 0; // allow adapter use
            return {
                compatible,
                check: 'bays',
                severity: compatible ? 'success' : 'critical',
                message: compatible ? `✅ ${storage.name}: Bay available for 2.5"/SATA drive in ${pcCase.name}` : `❌ ${storage.name}: No bays available for SATA drive in ${pcCase.name}`,
                component1: storage.name,
                component2: pcCase.name
            };
        }

        return { compatible: true, check: 'bays', message: 'Case bay check not applicable' };
    }

    checkLengthFit(compA, compB, typeA, typeB) {
        // GPU ↔ Case, PSU ↔ Case length checks
        const gpu = typeA === 'gpu' ? compA : typeB === 'gpu' ? compB : null;
        const psu = typeA === 'psu' ? compA : typeB === 'psu' ? compB : null;
        const pcCase = typeA === 'case' ? compA : typeB === 'case' ? compB : null;

        if (gpu && pcCase) {
            const gpuLength = this.extractGPULength(gpu) || 0;
            const caseMax = this.extractDimension(pcCase, 'max_gpu_length', 0);
            if (!gpuLength || !caseMax) {
                return { compatible: true, check: 'length', message: 'GPU/case length data missing' };
            }
            const compatible = gpuLength <= caseMax;
            return {
                compatible,
                check: 'length',
                severity: compatible ? 'success' : 'critical',
                message: compatible ? `✅ GPU length ${gpuLength}mm within case limit ${caseMax}mm` : `❌ GPU length ${gpuLength}mm exceeds case limit ${caseMax}mm`
            };
        }

        if (psu && pcCase) {
            const psuLength = this.extractDimension(psu, 'length', 0);
            const caseMaxPsu = this.extractDimension(pcCase, 'max_psu_length', 0);
            if (!psuLength || !caseMaxPsu) {
                return { compatible: true, check: 'length', message: 'PSU/case length data missing' };
            }
            const compatible = psuLength <= caseMaxPsu;
            return {
                compatible,
                check: 'length',
                severity: compatible ? 'success' : 'critical',
                message: compatible ? `✅ PSU length ${psuLength}mm within case bay ${caseMaxPsu}mm` : `❌ PSU length ${psuLength}mm exceeds case bay ${caseMaxPsu}mm`
            };
        }

        return { compatible: true, check: 'length', message: 'Length check not applicable' };
    }

    checkCoolerHeightFit(compA, compB, typeA, typeB) {
        const cooler = typeA === 'cooler' ? compA : typeB === 'cooler' ? compB : null;
        const pcCase = typeA === 'case' ? compA : typeB === 'case' ? compB : null;
        if (!cooler || !pcCase) {
            return { compatible: true, check: 'height', message: 'Cooler height check not applicable' };
        }

        const coolerHeight = this.extractDimension(cooler, 'height', 0);
        const caseMax = this.extractDimension(pcCase, 'max_cooler_height', 0);
        if (!coolerHeight || !caseMax) {
            return { compatible: true, check: 'height', message: 'Cooler/case height data missing' };
        }

        const compatible = coolerHeight <= caseMax;
        return {
            compatible,
            check: 'height',
            severity: compatible ? 'success' : 'critical',
            message: compatible ? `✅ Cooler height ${coolerHeight}mm within case limit ${caseMax}mm` : `❌ Cooler height ${coolerHeight}mm exceeds case limit ${caseMax}mm`
        };
    }

    checkVrmSupport(compA, compB, typeA, typeB) {
        // Lightweight VRM adequacy check based on CPU TDP vs motherboard rated TDP if present
        const cpu = typeA === 'cpu' ? compA : typeB === 'cpu' ? compB : null;
        const motherboard = typeA === 'motherboard' ? compA : typeB === 'motherboard' ? compB : null;

        if (!cpu || !motherboard) {
            return { compatible: true, check: 'vrm', message: 'VRM check not applicable' };
        }

        const cpuTdp = this.extractPowerSpec(cpu, 'tdp', 65);
        const vrmRating = parseInt(motherboard.specifications?.vrm_tdp || motherboard.specifications?.max_cpu_tdp || 0);
        if (!vrmRating) {
            return { compatible: true, check: 'vrm', message: 'VRM rating not provided' };
        }

        const compatible = cpuTdp <= vrmRating;
        return {
            compatible,
            check: 'vrm',
            severity: compatible ? 'success' : 'critical',
            message: compatible ? `✅ VRM supports CPU TDP (${cpuTdp}W ≤ ${vrmRating}W)` : `❌ CPU TDP ${cpuTdp}W exceeds motherboard VRM rating ${vrmRating}W`
        };
    }

    checkBiosSupport(compA, compB, typeA, typeB) {
        const cpu = typeA === 'cpu' ? compA : typeB === 'cpu' ? compB : null;
        const motherboard = typeA === 'motherboard' ? compA : typeB === 'motherboard' ? compB : null;

        if (!cpu || !motherboard) {
            return { compatible: true, check: 'bios', message: 'BIOS check not applicable' };
        }

        const cpuGen = this.extractCpuGeneration(cpu);
        const chipset = (motherboard.specifications?.chipset || '').toLowerCase();

        if (!cpuGen || !chipset) {
            return { compatible: true, check: 'bios', message: 'BIOS data missing' };
        }

        // Heuristic: if CPU is newer gen than common chipset family, require BIOS update (warning)
        const olderChipsets = ['b450', 'x470', 'z490', 'z590', 'b560', 'h570'];
        const needsUpdate = olderChipsets.some(c => chipset.includes(c)) && cpuGen.includes('13th Gen Intel');

        if (!needsUpdate) {
            return { compatible: true, check: 'bios', severity: 'success', message: '✅ BIOS support likely' };
        }

        return {
            compatible: false,
            check: 'bios',
            severity: 'warning',
            message: `⚠️ BIOS update likely required for ${cpu.name} on ${motherboard.name}`
        };
    }

    checkPsuCaseFormFactor(compA, compB, typeA, typeB) {
        const psu = typeA === 'psu' ? compA : typeB === 'psu' ? compB : null;
        const pcCase = typeA === 'case' ? compA : typeB === 'case' ? compB : null;
        if (!psu || !pcCase) {
            return { compatible: true, check: 'form_factor', message: 'PSU form factor check not applicable' };
        }

        const psuForm = (psu.specifications?.form_factor || psu.form_factor || 'atx').toLowerCase();
        const casePsuSupport = (pcCase.specifications?.psu_form_factor || pcCase.specifications?.form_factor_psu || pcCase.specifications?.psu_support || 'atx').toLowerCase();

        const compatible = casePsuSupport.includes(psuForm) || (psuForm === 'atx' && casePsuSupport.includes('atx'));

        return {
            compatible,
            check: 'form_factor',
            severity: compatible ? 'success' : 'critical',
            message: compatible ? `✅ PSU form factor ${psuForm.toUpperCase()} supported` : `❌ PSU form factor ${psuForm.toUpperCase()} not supported by case`
        };
    }

    identifyCpuRamMobo(compA, compB, typeA, typeB) {
        const cpu = typeA === 'cpu' ? compA : typeB === 'cpu' ? compB : null;
        const ram = typeA === 'ram' ? compA : typeB === 'ram' ? compB : null;
        const motherboard = typeA === 'motherboard' ? compA : typeB === 'motherboard' ? compB : null;
        return { cpu, ram, motherboard };
    }

    extractRamCapacity(ram) {
        if (!ram) return null;
        const specs = ram.specifications || {};
        const capacity = specs.capacity || specs.kit_capacity || specs.total_capacity;
        if (typeof capacity === 'number') return capacity;
        if (typeof capacity === 'string') {
            const match = capacity.match(/(\d+)/);
            if (match) return parseInt(match[1]);
        }
        return null;
    }

    extractCpuGeneration(cpu) {
        if (!cpu) return null;
        const name = (cpu.name || '').toLowerCase();

        if (name.match(/14th\s*gen/i) || name.includes('14900') || name.includes('14700')) return '14th Gen Intel';
        if (name.match(/13th\s*gen/i) || name.includes('13900') || name.includes('13700')) return '13th Gen Intel';
        if (name.match(/12th\s*gen/i) || name.includes('12900') || name.includes('12700')) return '12th Gen Intel';
        if (name.includes('ryzen 9') || name.includes('7950') || name.includes('7900')) return 'Ryzen 7000';
        if (name.includes('ryzen 7') && name.includes('7')) return 'Ryzen 7000';
        if (name.includes('ryzen 5') && (name.includes('7600') || name.includes('7500'))) return 'Ryzen 7000';
        if (name.includes('ryzen 5') || name.includes('ryzen 7') || name.includes('ryzen 9')) return 'Ryzen 5000';
        return cpu.specifications?.generation || null;
    }

    checkFormFactor(specsA, specsB, nameA, nameB) {
        const formFactorA = specsA.form_factor;
        // 🔥 CRITICAL FIX: Use supported_form_factors FIRST, then fall back to form_factor
        // Case form_factor is the case's size category, not what motherboards it supports!
        // We need supported_form_factors for motherboard compatibility
        let formFactorB = specsB.supported_form_factors || specsB.motherboard_support || specsB.form_factor;

        logger.info(`🔍 [FORM FACTOR CHECK] Motherboard: "${nameA}" (${formFactorA})`);
        logger.info(`   Case: "${nameB}"`);
        logger.info(`   Case form_factor: ${specsB.form_factor}`);
        logger.info(`   Case supported_form_factors: ${specsB.supported_form_factors}`);
        logger.info(`   Using formFactorB: ${formFactorB}`);

        if (!formFactorA || !formFactorB) {
            logger.info(`   ⚠️ Missing form factor info - assuming compatible`);
            return { compatible: true, check: 'form_factor', message: 'Form factor info not available' };
        }

        // 🔥 CRITICAL FIX: Split comma-separated form factor strings
        // Database stores: "ATX,Micro-ATX,Mini-ITX" as single string
        if (typeof formFactorB === 'string' && formFactorB.includes(',')) {
            formFactorB = formFactorB.split(',').map(ff => ff.trim());
            logger.info(`   Split into array: [${formFactorB.join(', ')}]`);
        }

        let compatible = false;
        
        // COMPATIBILITY MATRIX: Which motherboards fit in which cases
        // ATX cases support: ATX, Micro-ATX, Mini-ITX
        // Micro-ATX cases support: Micro-ATX, Mini-ITX
        // Mini-ITX cases support: Mini-ITX only
        const compatibilityMatrix = {
            'atx': ['atx', 'microatx', 'miniitx', 'matx', 'mitx'],
            'microatx': ['microatx', 'miniitx', 'matx', 'mitx'],
            'matx': ['microatx', 'miniitx', 'matx', 'mitx'], // Micro-ATX alias
            'miniitx': ['miniitx', 'mitx'],
            'mitx': ['miniitx', 'mitx'], // Mini-ITX alias
            'eatx': ['eatx', 'atx', 'microatx', 'miniitx', 'matx', 'mitx'] // E-ATX supports all
        };

        // Normalize form factors (remove spaces, hyphens, lowercase)
        const normalize = (ff) => ff.toLowerCase().replace(/[-\s]/g, '');
        
        // Check if formFactorB is an array (case supports multiple form factors)
        if (Array.isArray(formFactorB)) {
            // 🔥 SIMPLER CHECK: Just check if motherboard form factor is IN the supported list
            const normalizedMoboFF = normalize(formFactorA);
            const normalizedSupported = formFactorB.map(ff => normalize(ff));
            
            logger.info(`   Normalized mobo: "${normalizedMoboFF}"`);
            logger.info(`   Normalized supported: [${normalizedSupported.join(', ')}]`);
            
            // Direct check: is motherboard form factor in supported list?
            compatible = normalizedSupported.some(supported => 
                supported === normalizedMoboFF ||
                supported.includes(normalizedMoboFF) ||
                normalizedMoboFF.includes(supported)
            );
            
            logger.info(`   Direct match result: ${compatible}`);
            
            // If no direct match, check compatibility matrix
            if (!compatible) {
                compatible = formFactorB.some(caseFF => {
                    const normalizedCaseFF = normalize(caseFF);
                    
                    // Check compatibility matrix
                    if (compatibilityMatrix[normalizedCaseFF]) {
                        const matrixResult = compatibilityMatrix[normalizedCaseFF].includes(normalizedMoboFF);
                        logger.info(`   Matrix check: "${normalizedCaseFF}" supports [${compatibilityMatrix[normalizedCaseFF].join(', ')}] → includes "${normalizedMoboFF}": ${matrixResult}`);
                        return matrixResult;
                    }
                    
                    return false;
                });
            }
        } else {
            // formFactorB is a string (case supports one form factor or category description)
            const normalizedCaseFF = normalize(formFactorB);
            const normalizedMoboFF = normalize(formFactorA);
            
            logger.info(`   Single form factor check: case="${normalizedCaseFF}", mobo="${normalizedMoboFF}"`);
            
            // Check compatibility matrix
            if (compatibilityMatrix[normalizedCaseFF]) {
                compatible = compatibilityMatrix[normalizedCaseFF].includes(normalizedMoboFF);
                logger.info(`   Matrix check: "${normalizedCaseFF}" supports [${compatibilityMatrix[normalizedCaseFF].join(', ')}] → includes "${normalizedMoboFF}": ${compatible}`);
            } else {
                // Fallback to exact match or substring match
                compatible = normalizedCaseFF === normalizedMoboFF ||
                             normalizedCaseFF.includes(normalizedMoboFF) ||
                             normalizedMoboFF.includes(normalizedCaseFF);
                logger.info(`   Fallback match result: ${compatible}`);
            }
        }

        logger.info(`   ✅ Final result: ${compatible ? 'COMPATIBLE' : 'INCOMPATIBLE'}`);

        return {
            compatible: compatible,
            check: 'form_factor',
            severity: compatible ? 'success' : 'critical',
            message: compatible ?
                `✅ Form factor compatible: ${Array.isArray(formFactorA) ? formFactorA[0] : formFactorA}` :
                `❌ Form factor incompatible: ${nameA} (${formFactorA}) not supported by ${nameB} (${Array.isArray(formFactorB) ? formFactorB.join(', ') : formFactorB})`
        };
    }

    checkMemoryType(specsA, specsB, nameA, nameB) {
        const cpuMemType = specsA.memory_type || specsA.supported_memory;
        const ramType = specsB.memory_type || specsB.type;

        if (!cpuMemType || !ramType) {
            return { compatible: true, check: 'type', message: 'Memory type info not available' };
        }

        const compatible = cpuMemType.toLowerCase().includes(ramType.toLowerCase()) ||
                          ramType.toLowerCase().includes(cpuMemType.toLowerCase());

        return {
            compatible: compatible,
            check: 'type',
            severity: compatible ? 'success' : 'critical',
            message: compatible ?
                `✅ Memory type compatible: ${ramType}` :
                `❌ Memory type incompatible: ${nameA} supports ${cpuMemType}, ${nameB} is ${ramType}`
        };
    }

    generateOverallMessage(criticalIssues, warnings) {
        if (criticalIssues.length === 0 && warnings.length === 0) {
            return '✅ Build fully compatible - all advanced checks passed!';
        }

        if (criticalIssues.length > 0) {
            return `❌ ${criticalIssues.length} critical issue(s) found - build not compatible`;
        }

        return `⚠️ ${warnings.length} warning(s) found - build compatible with caveats`;
    }

    // ==================== THERMAL ANALYSIS HELPERS ====================

    /**
     * Extract cooler TDP rating
     */
    async extractCoolerRating(cooler) {
        if (!cooler) return null;
        
        const specs = cooler.specifications || {};
        const name = (cooler.name || '').toLowerCase();
        
        // Check specifications
        if (specs.tdp_rating) return specs.tdp_rating;
        if (specs.max_tdp) return specs.max_tdp;
        if (specs.cooling_capacity) return specs.cooling_capacity;
        
        // Extract from name (e.g., "Arctic Freezer 34 (150W TDP)")
        const tdpMatch = name.match(/(\d+)\s*w(?:\s+tdp)?/i);
        if (tdpMatch) return parseInt(tdpMatch[1]);
        
        // Estimate based on cooler type
        if (name.includes('aio') || name.includes('liquid')) {
            if (name.includes('360mm') || name.includes('360')) return 250;
            if (name.includes('280mm') || name.includes('280')) return 220;
            if (name.includes('240mm') || name.includes('240')) return 180;
            if (name.includes('120mm') || name.includes('120')) return 120;
        }
        
        // Tower coolers
        if (name.includes('tower') || name.includes('cooler')) {
            if (name.includes('dual') || name.includes('double')) return 180;
            return 130; // Single tower estimate
        }
        
        // Stock cooler estimate
        if (name.includes('stock') || name.includes('included')) return 65;
        
        return 100; // Conservative default
    }

    /**
     * Check if cooler is AIO/liquid
     */
    isAIOCooler(cooler) {
        if (!cooler) return false;
        
        const name = (cooler.name || '').toLowerCase();
        const specs = cooler.specifications || {};
        
        if (specs.cooling_type === 'AIO' || specs.cooling_type === 'Liquid') return true;
        
        return name.includes('aio') || name.includes('liquid') || 
               name.includes('water') || name.includes('hydro');
    }

    /**
     * Extract AIO radiator size
     */
    extractRadiatorSize(cooler) {
        if (!cooler) return null;
        
        const name = (cooler.name || '').toLowerCase();
        const specs = cooler.specifications || {};
        
        if (specs.radiator_size) return specs.radiator_size;
        
        // Extract from name
        if (name.includes('360mm') || name.includes('360')) return 360;
        if (name.includes('280mm') || name.includes('280')) return 280;
        if (name.includes('240mm') || name.includes('240')) return 240;
        if (name.includes('140mm') || name.includes('140')) return 140;
        if (name.includes('120mm') || name.includes('120')) return 120;
        
        return 240; // Common default
    }

    /**
     * Check if case supports AIO radiator size
     * 🔥 FIX: Check multiple field names for radiator support (front_radiator_support, max_radiator_size, etc.)
     */
    async checkAIOSupport(caseComponent, radiatorSize) {
        if (!caseComponent || !radiatorSize) {
            return { compatible: true, recommendation: null };
        }
        
        const specs = caseComponent.specifications || {};
        const dims = caseComponent.dimensions || {};
        const name = (caseComponent.name || '').toLowerCase();
        
        // 🔥 FIX: Check ALL possible field names for radiator support
        // Priority: specifications fields first, then dimensions, then parse strings
        let maxRadiatorSize = null;
        
        // Check specifications fields (primary source)
        if (specs.front_radiator_support) {
            maxRadiatorSize = parseInt(specs.front_radiator_support);
        } else if (specs.top_radiator_support) {
            maxRadiatorSize = parseInt(specs.top_radiator_support);
        } else if (specs.max_radiator_size) {
            maxRadiatorSize = parseInt(specs.max_radiator_size);
        } else if (specs.radiator_support) {
            const radMatch = String(specs.radiator_support).match(/(\d{3})/);
            if (radMatch) maxRadiatorSize = parseInt(radMatch[1]);
        }
        
        // Check dimensions fields (fallback)
        if (!maxRadiatorSize) {
            if (dims.front_radiator_support) {
                maxRadiatorSize = parseInt(dims.front_radiator_support);
            } else if (dims.top_radiator_support) {
                maxRadiatorSize = parseInt(dims.top_radiator_support);
            } else if (dims.max_radiator_size) {
                maxRadiatorSize = parseInt(dims.max_radiator_size);
            } else if (dims.radiator_support) {
                // Parse "280mm front, 120mm rear" format - get the largest value
                const radMatches = String(dims.radiator_support).match(/(\d{2,3})mm/g);
                if (radMatches && radMatches.length > 0) {
                    const sizes = radMatches.map(m => parseInt(m.replace('mm', '')));
                    maxRadiatorSize = Math.max(...sizes);
                }
            }
        }
        
        // If we found a max size from specs/dims, use it
        if (maxRadiatorSize && !isNaN(maxRadiatorSize)) {
            logger.debug(`🧊 [AIO CHECK] Case: ${caseComponent.name}, Max Radiator: ${maxRadiatorSize}mm, Requested: ${radiatorSize}mm`);
            return {
                compatible: radiatorSize <= maxRadiatorSize,
                maxSize: maxRadiatorSize,
                recommendation: radiatorSize > maxRadiatorSize 
                    ? `Select case supporting ${radiatorSize}mm radiators (current max: ${maxRadiatorSize}mm)`
                    : null
            };
        }
        
        // Infer from name/description (last resort)
        const supports360 = name.includes('360mm') || name.includes('360') || name.includes('full tower');
        const supports280 = supports360 || name.includes('280mm') || name.includes('280');
        const supports240 = supports280 || name.includes('240mm') || name.includes('240') || name.includes('mid tower');
        
        logger.debug(`🧊 [AIO CHECK] Case: ${caseComponent.name}, Inferred support - 360: ${supports360}, 280: ${supports280}, 240: ${supports240}`);
        
        if (radiatorSize === 360 && !supports360) {
            return {
                compatible: false,
                recommendation: 'Select full tower case or case explicitly supporting 360mm radiators'
            };
        }
        if (radiatorSize === 280 && !supports280) {
            return {
                compatible: false,
                recommendation: 'Select case supporting 280mm radiators'
            };
        }
        if (radiatorSize === 240 && !supports240) {
            return {
                compatible: false,
                recommendation: 'Select mid tower or larger case'
            };
        }
        
        return { compatible: true, recommendation: null };
    }

    /**
     * Extract GPU length
     * 🔥 FIX: Check dimensions field first (most accurate), then specifications
     */
    extractGPULength(gpu) {
        if (!gpu) return null;
        
        const specs = gpu.specifications || {};
        const dims = gpu.dimensions || {};
        const name = (gpu.name || '').toLowerCase();
        
        // 🔥 FIX: Check dimensions FIRST (most accurate from database)
        if (dims.length_mm) return parseInt(dims.length_mm);
        if (dims.length) return parseInt(dims.length);
        if (specs.length_mm) return parseInt(specs.length_mm);
        if (specs.length) return parseInt(specs.length);
        if (specs.card_length) return parseInt(specs.card_length);
        if (specs.Length) return parseInt(specs.Length); // Handle "320mm" string
        
        // Extract from name (e.g., "RTX 4090 (335mm)")
        const lengthMatch = name.match(/(\d{3})\s*mm/);
        if (lengthMatch) return parseInt(lengthMatch[1]);
        
        return null;
    }

    /**
     * Assess case airflow quality
     */
    async assessCaseAirflow(caseComponent) {
        if (!caseComponent) {
            return { rating: 'unknown', fans: 0 };
        }
        
        const specs = caseComponent.specifications || {};
        const name = (caseComponent.name || '').toLowerCase();
        
        // Check specifications
        const fanCount = specs.included_fans || specs.fan_count || 0;
        const hasMeshFront = name.includes('mesh') || name.includes('airflow');
        
        let rating = 'average';
        
        if (fanCount >= 4 || (fanCount >= 3 && hasMeshFront)) {
            rating = 'excellent';
        } else if (fanCount >= 3 || (fanCount >= 2 && hasMeshFront)) {
            rating = 'good';
        } else if (fanCount <= 1 && !hasMeshFront) {
            rating = 'poor';
        }
        
        return {
            rating: rating,
            fans: fanCount,
            mesh_front: hasMeshFront
        };
    }

    /**
     * ========================================================================
     * BASIC 6-LAYER COMPATIBILITY CHECKS (For Test Suite)
     * ========================================================================
     * These are simplified versions for the brutal-compatibility-stress-test
     */

    /**
     * Layer 1: Socket Compatibility (CPU ↔ Motherboard)
     */
    async checkSocketCompatibility(cpu, motherboard) {
        logger.info('🔍 [Layer 1] Checking socket compatibility...');
        
        const cpuSocket = cpu?.specifications?.socket || cpu?.socket;
        const mbSocket = motherboard?.specifications?.socket || motherboard?.socket;
        
        logger.info(`   CPU Socket: ${cpuSocket}`);
        logger.info(`   MB Socket: ${mbSocket}`);

        // 🔥 ENHANCEMENT: Check rule engine for socket compatibility rules
        let ruleEngineResult = null;
        let ruleEngineIssues = [];
        let ruleEngineWarnings = [];
        try {
            ruleEngineResult = await ruleEngine.checkComponentPair(cpu, motherboard);
            logger.info(`✅ Rule engine checked CPU↔Motherboard: ${ruleEngineResult.rulesApplied?.length || 0} rules applied, Compatible: ${ruleEngineResult.compatible}`);
            
            if (ruleEngineResult.issues && ruleEngineResult.issues.length > 0) {
                ruleEngineIssues = ruleEngineResult.issues;
                logger.warn(`⚠️ Rule engine found ${ruleEngineIssues.length} issue(s)`);
            }
            if (ruleEngineResult.warnings && ruleEngineResult.warnings.length > 0) {
                ruleEngineWarnings = ruleEngineResult.warnings;
                logger.info(`📋 Rule engine found ${ruleEngineWarnings.length} warning(s)`);
            }
        } catch (error) {
            logger.warn('⚠️ Rule engine check failed, continuing with deterministic check:', error.message);
        }
        
        if (!cpuSocket || !mbSocket) {
            return {
                status: 'warning',
                compatible: true,
                message: `Socket details needed: CPU socket ${cpuSocket || 'not specified'}, Motherboard socket ${motherboardSocket || 'not specified'}`,
                description: 'Physical socket compatibility requires both CPU and motherboard socket information. Verify both specifications match (e.g., AM4, AM5, LGA1700).',
                score: 50,
                details: {
                    cpu_socket: cpuSocket || 'unknown',
                    mb_socket: mbSocket || 'unknown',
                    rules_applied: ruleEngineResult?.rulesApplied?.length || 0,
                    rule_issues: ruleEngineIssues,
                    rule_warnings: ruleEngineWarnings
                }
            };
        }
        
        // Combine deterministic check with rule engine results
        const deterministicCompatible = cpuSocket.toLowerCase() === mbSocket.toLowerCase();
        const ruleEngineCompatible = ruleEngineResult ? ruleEngineResult.compatible : true;
        const compatible = deterministicCompatible && ruleEngineCompatible;
        
        // Calculate score: base on socket match, reduce for rule issues
        let score = deterministicCompatible ? 100 : 0;
        if (ruleEngineIssues.length > 0) {
            score = Math.max(0, score - (ruleEngineIssues.length * 20)); // -20 per critical issue
        }
        if (ruleEngineWarnings.length > 0) {
            score = Math.max(0, score - (ruleEngineWarnings.length * 5)); // -5 per warning
        }
        
        return {
            status: compatible ? 'pass' : 'fail',
            compatible,
            message: compatible 
                ? `✓ Socket match: ${cpuSocket}${ruleEngineResult ? ` (${ruleEngineResult.rulesApplied?.length || 0} rules verified)` : ''}` 
                : `✗ Socket mismatch: CPU ${cpuSocket} ≠ MB ${mbSocket}${ruleEngineIssues.length > 0 ? ` + ${ruleEngineIssues.length} rule issue(s)` : ''}`,
            score,
            details: {
                cpu_socket: cpuSocket,
                mb_socket: mbSocket,
                match: deterministicCompatible,
                rules_applied: ruleEngineResult?.rulesApplied?.length || 0,
                rule_compatible: ruleEngineCompatible,
                rule_issues: ruleEngineIssues,
                rule_warnings: ruleEngineWarnings,
                rule_info: ruleEngineResult?.info || []
            }
        };
    }

    /**
     * Layer 2: Memory Compatibility (RAM ↔ Motherboard)
     */
    async checkMemoryCompatibility(ram, motherboard) {
        logger.info('🔍 [Layer 2] Checking memory compatibility...');
        
        const ramType = ram?.specifications?.memory_type || ram?.memory_type;
        const mbType = motherboard?.specifications?.memory_type || motherboard?.memory_type;
        
        logger.info(`   RAM Type: ${ramType}`);
        logger.info(`   MB Type: ${mbType}`);
        
        // Rule engine validation
        let ruleEngineResult = null;
        let ruleEngineIssues = [];
        let ruleEngineWarnings = [];
        try {
            ruleEngineResult = await ruleEngine.checkComponentPair(ram, motherboard);
            logger.info(`✅ Rule engine checked RAM↔Motherboard: ${ruleEngineResult.rulesApplied?.length || 0} rules applied, Compatible: ${ruleEngineResult.compatible}`);
            
            if (ruleEngineResult.issues && ruleEngineResult.issues.length > 0) {
                ruleEngineIssues = ruleEngineResult.issues;
                logger.warn(`⚠️ Rule engine found ${ruleEngineIssues.length} memory issue(s)`);
            }
            if (ruleEngineResult.warnings && ruleEngineResult.warnings.length > 0) {
                ruleEngineWarnings = ruleEngineResult.warnings;
                logger.info(`📋 Rule engine found ${ruleEngineWarnings.length} memory warning(s)`);
            }
        } catch (error) {
            logger.warn('⚠️ Rule engine check failed for memory, continuing with deterministic check:', error.message);
        }
        
        if (!ramType || !mbType) {
            return {
                status: 'warning',
                compatible: true,
                message: `Memory type details needed: RAM type ${ramType || 'not specified'}, Motherboard type ${motherboardType || 'not specified'}`,
                description: 'RAM and motherboard must use same memory type (DDR4/DDR5). Verify both specifications match exactly.',
                score: 50,
                details: {
                    ram_type: ramType || 'unknown',
                    mb_type: mbType || 'unknown',
                    rules_applied: ruleEngineResult?.rulesApplied?.length || 0,
                    rule_issues: ruleEngineIssues,
                    rule_warnings: ruleEngineWarnings
                }
            };
        }
        
        // Combine deterministic check with rule engine results
        const deterministicCompatible = ramType.toLowerCase() === mbType.toLowerCase();
        const ruleEngineCompatible = ruleEngineResult ? ruleEngineResult.compatible : true;
        const compatible = deterministicCompatible && ruleEngineCompatible;
        
        // Calculate score: base on type match, reduce for rule issues
        let score = deterministicCompatible ? 100 : 0;
        if (ruleEngineIssues.length > 0) {
            score = Math.max(0, score - (ruleEngineIssues.length * 20)); // -20 per critical issue
        }
        if (ruleEngineWarnings.length > 0) {
            score = Math.max(0, score - (ruleEngineWarnings.length * 5)); // -5 per warning
        }
        
        return {
            status: compatible ? 'pass' : 'fail',
            compatible,
            message: compatible 
                ? `✓ Memory type match: ${ramType}${ruleEngineResult ? ` (${ruleEngineResult.rulesApplied?.length || 0} rules verified)` : ''}` 
                : `✗ Memory type mismatch: RAM ${ramType} ≠ MB ${mbType}${ruleEngineIssues.length > 0 ? ` + ${ruleEngineIssues.length} rule issue(s)` : ''}`,
            score,
            details: {
                ram_type: ramType,
                mb_type: mbType,
                match: deterministicCompatible,
                rules_applied: ruleEngineResult?.rulesApplied?.length || 0,
                rule_compatible: ruleEngineCompatible,
                rule_issues: ruleEngineIssues,
                rule_warnings: ruleEngineWarnings,
                rule_info: ruleEngineResult?.info || []
            }
        };
    }

    /**
     * Layer 3: Power Compatibility (PSU ↔ All Components)
     */
    async checkPowerCompatibility(psu, components) {
        logger.info('🔍 [Layer 3] Checking power compatibility...');
        
        const psuWattage = parseInt(psu?.specifications?.wattage || psu?.specifications?.max_power || psu?.wattage) || 0;
        
        let totalTDP = 0;
        const breakdown = {
            cpu: 0,
            gpu: 0,
            other: 50 // Motherboard, RAM, Storage, fans
        };
        
        const gpu = components.gpu || components.GPU;
        const cpu = components.cpu || components.CPU;
        
        // Rule engine validation for PSU-GPU pair (most critical)
        let ruleEngineResult = null;
        let ruleEngineIssues = [];
        let ruleEngineWarnings = [];
        if (psu && gpu) {
            try {
                ruleEngineResult = await ruleEngine.checkComponentPair(gpu, psu);
                logger.info(`✅ Rule engine checked GPU↔PSU: ${ruleEngineResult.rulesApplied?.length || 0} rules applied, Compatible: ${ruleEngineResult.compatible}`);
                
                if (ruleEngineResult.issues && ruleEngineResult.issues.length > 0) {
                    ruleEngineIssues = ruleEngineResult.issues;
                    logger.warn(`⚠️ Rule engine found ${ruleEngineIssues.length} power issue(s)`);
                }
                if (ruleEngineResult.warnings && ruleEngineResult.warnings.length > 0) {
                    ruleEngineWarnings = ruleEngineResult.warnings;
                    logger.info(`📋 Rule engine found ${ruleEngineWarnings.length} power warning(s)`);
                }
            } catch (error) {
                logger.warn('⚠️ Rule engine check failed for power, continuing with deterministic check:', error.message);
            }
        }
        
        if (cpu) {
            breakdown.cpu = parseInt(cpu?.specifications?.tdp || cpu?.tdp) || 65;
            totalTDP += breakdown.cpu;
        }
        
        if (gpu) {
            breakdown.gpu = parseInt(gpu?.specifications?.tdp || gpu?.specifications?.power_consumption || gpu?.tdp) || 150;
            totalTDP += breakdown.gpu;
        }
        
        totalTDP += breakdown.other;
        
        // Add 20% headroom for safety
        const recommendedWattage = Math.ceil(totalTDP * 1.2);
        const deterministicCompatible = psuWattage >= recommendedWattage;
        const ruleEngineCompatible = ruleEngineResult ? ruleEngineResult.compatible : true;
        const compatible = deterministicCompatible && ruleEngineCompatible;
        const efficiency = (psuWattage / recommendedWattage) * 100;
        
        // Calculate score: base on wattage, reduce for rule issues
        let score = Math.min(100, Math.round(efficiency));
        if (ruleEngineIssues.length > 0) {
            score = Math.max(0, score - (ruleEngineIssues.length * 20)); // -20 per critical issue
        }
        if (ruleEngineWarnings.length > 0) {
            score = Math.max(0, score - (ruleEngineWarnings.length * 5)); // -5 per warning
        }
        
        logger.info(`   PSU Wattage: ${psuWattage}W`);
        logger.info(`   Total TDP: ${totalTDP}W`);
        logger.info(`   Recommended: ${recommendedWattage}W`);
        logger.info(`   Efficiency: ${efficiency.toFixed(1)}%`);
        
        return {
            status: compatible ? 'pass' : 'fail',
            compatible,
            message: compatible 
                ? `✓ PSU sufficient: ${psuWattage}W ≥ ${recommendedWattage}W${ruleEngineResult ? ` (${ruleEngineResult.rulesApplied?.length || 0} rules verified)` : ''}` 
                : `✗ PSU insufficient: ${psuWattage}W < ${recommendedWattage}W${ruleEngineIssues.length > 0 ? ` + ${ruleEngineIssues.length} rule issue(s)` : ''}`,
            score,
            details: {
                psu_wattage: psuWattage,
                total_tdp: totalTDP,
                recommended_wattage: recommendedWattage,
                efficiency_percent: Math.round(efficiency),
                breakdown,
                rules_applied: ruleEngineResult?.rulesApplied?.length || 0,
                rule_compatible: ruleEngineCompatible,
                rule_issues: ruleEngineIssues,
                rule_warnings: ruleEngineWarnings,
                rule_info: ruleEngineResult?.info || []
            }
        };
    }

    /**
     * Layer 4: Physical Compatibility (Case Clearances)
     */
    async checkPhysicalCompatibility(caseComponent, components) {
        logger.info('🔍 [Layer 4] Checking physical compatibility...');
        
        const issues = [];
        let score = 100;
        
        // Check motherboard form factor
        const motherboard = components.motherboard || components.Motherboard;
        if (motherboard && caseComponent?.specifications?.max_motherboard_size) {
            const mbFormFactor = motherboard?.specifications?.form_factor || motherboard?.form_factor;
            const caseMaxSize = caseComponent.specifications.max_motherboard_size;
            
            const formFactorSizes = {
                'E-ATX': 4,
                'ATX': 3,
                'Micro-ATX': 2,
                'mATX': 2,
                'Mini-ITX': 1
            };
            
            const mbSize = formFactorSizes[mbFormFactor] || 3;
            const caseSize = formFactorSizes[caseMaxSize] || 3;
            
            if (mbSize > caseSize) {
                issues.push({
                    severity: 'error',
                    component: 'Motherboard',
                    message: `Motherboard ${mbFormFactor} too large for ${caseMaxSize} case`
                });
                score -= 50;
            }
        }
        
        // Check GPU length
        // 🔥 FIX: Check dimensions FIRST (most accurate), then specifications for both GPU and Case
        const gpu = components.gpu || components.GPU;
        const caseDims = caseComponent?.dimensions || {};
        const caseSpecs = caseComponent?.specifications || {};
        const caseMaxLength = parseInt(caseDims.max_gpu_length_mm || caseSpecs.max_gpu_length_mm || caseSpecs.max_gpu_length) || 999;
        
        if (gpu && caseMaxLength < 999) {
            const gpuDims = gpu.dimensions || {};
            const gpuSpecs = gpu.specifications || {};
            const gpuLength = parseInt(gpuDims.length_mm || gpuSpecs.length_mm || gpuSpecs.length || gpu.length) || 0;
            
            if (gpuLength > 0 && gpuLength > caseMaxLength) {
                issues.push({
                    severity: 'error',
                    component: 'GPU',
                    message: `GPU ${gpuLength}mm exceeds case limit ${caseMaxLength}mm`
                });
                score -= 30;
            }
        }
        
        // Check CPU cooler height
        // 🔥 FIX: Check dimensions FIRST (most accurate), then specifications for both Cooler and Case
        const cooling = components.cooling || components.Cooling;
        const caseMaxHeight = parseInt(caseDims.max_cooler_height_mm || caseSpecs.max_cooler_height_mm || caseSpecs.max_cooler_height) || 999;
        
        if (cooling && caseMaxHeight < 999) {
            const coolerDims = cooling.dimensions || {};
            const coolerSpecs = cooling.specifications || {};
            const coolerHeight = parseInt(coolerDims.height_mm || coolerSpecs.height_mm || coolerSpecs.height || cooling.height) || 0;
            
            if (coolerHeight > 0 && coolerHeight > caseMaxHeight) {
                issues.push({
                    severity: 'error',
                    component: 'Cooling',
                    message: `Cooler ${coolerHeight}mm exceeds case limit ${caseMaxHeight}mm`
                });
                score -= 20;
            }
        }
        
        const compatible = issues.filter(i => i.severity === 'error').length === 0;
        
        return {
            status: compatible ? 'pass' : 'fail',
            compatible,
            message: compatible 
                ? '✓ All components fit in case' 
                : `✗ ${issues.length} clearance issues detected`,
            score: Math.max(0, score),
            details: {
                issues,
                checks_performed: 3
            }
        };
    }

    /**
     * Layer 5: Thermal Compatibility (Cooling ↔ CPU/GPU)
     */
    async checkThermalCompatibility(components) {
        logger.info('🔍 [Layer 5] Checking thermal compatibility...');
        
        let score = 100;
        const issues = [];
        
        const cpu = components.cpu || components.CPU;
        const cooling = components.cooling || components.Cooling;
        
        // Rule engine validation
        let ruleEngineResult = null;
        let ruleEngineIssues = [];
        let ruleEngineWarnings = [];
        if (cpu && cooling) {
            try {
                ruleEngineResult = await ruleEngine.checkComponentPair(cpu, cooling);
                logger.info(`✅ Rule engine checked CPU↔Cooling: ${ruleEngineResult.rulesApplied?.length || 0} rules applied, Compatible: ${ruleEngineResult.compatible}`);
                
                if (ruleEngineResult.issues && ruleEngineResult.issues.length > 0) {
                    ruleEngineIssues = ruleEngineResult.issues;
                    logger.warn(`⚠️ Rule engine found ${ruleEngineIssues.length} thermal issue(s)`);
                    // Add rule engine issues to main issues array
                    issues.push(...ruleEngineIssues.map(issue => ({
                        severity: 'error',
                        component: 'Thermal',
                        message: issue
                    })));
                    score -= ruleEngineIssues.length * 20;
                }
                if (ruleEngineResult.warnings && ruleEngineResult.warnings.length > 0) {
                    ruleEngineWarnings = ruleEngineResult.warnings;
                    logger.info(`📋 Rule engine found ${ruleEngineWarnings.length} thermal warning(s)`);
                    issues.push(...ruleEngineWarnings.map(warning => ({
                        severity: 'warning',
                        component: 'Thermal',
                        message: warning
                    })));
                    score -= ruleEngineWarnings.length * 5;
                }
            } catch (error) {
                logger.warn('⚠️ Rule engine check failed for thermal, continuing with deterministic check:', error.message);
            }
        }
        
        if (cpu) {
            const cpuTDP = parseInt(cpu?.specifications?.tdp || cpu?.tdp) || 65;
            
            if (cooling) {
                const coolerTDP = parseInt(cooling?.specifications?.tdp_rating || cooling?.specifications?.max_tdp || cooling?.tdp_rating) || 150;
                
                if (coolerTDP < cpuTDP) {
                    issues.push({
                        severity: 'warning',
                        component: 'Cooling',
                        message: `Cooler rated ${coolerTDP}W, CPU TDP ${cpuTDP}W`
                    });
                    score -= 30;
                }
            } else {
                // No aftermarket cooler selected, assume stock cooler
                if (cpuTDP > 95) {
                    issues.push({
                        severity: 'warning',
                        component: 'Cooling',
                        message: `High TDP CPU (${cpuTDP}W) may need better cooling`
                    });
                    score -= 20;
                }
            }
        }
        
        const compatible = issues.filter(i => i.severity === 'error').length === 0;
        
        return {
            status: compatible ? 'pass' : issues.length > 0 ? 'warning' : 'pass',
            compatible,
            message: compatible 
                ? `✓ Cooling adequate for components${ruleEngineResult ? ` (${ruleEngineResult.rulesApplied?.length || 0} rules verified)` : ''}` 
                : `⚠ ${issues.length} thermal concerns${ruleEngineIssues.length > 0 ? ` (${ruleEngineIssues.length} from rules)` : ''}`,
            score: Math.max(50, score),
            details: {
                issues,
                cpu_tdp: cpu ? parseInt(cpu?.specifications?.tdp || cpu?.tdp) || 65 : 0,
                cooler_rating: cooling ? parseInt(cooling?.specifications?.tdp_rating || cooling?.tdp_rating) || 150 : 0,
                rules_applied: ruleEngineResult?.rulesApplied?.length || 0,
                rule_compatible: ruleEngineResult?.compatible !== false,
                rule_issues: ruleEngineIssues,
                rule_warnings: ruleEngineWarnings,
                rule_info: ruleEngineResult?.info || []
            }
        };
    }

    /**
     * Layer 6: Performance Compatibility (Bottleneck Detection)
     */
    async checkPerformanceCompatibility(cpu, gpu) {
        logger.info('🔍 [Layer 6] Checking performance compatibility...');
        
        // Simple tier matching (can be enhanced with actual benchmarks)
        const getTier = (product) => {
            const name = (product?.name || '').toLowerCase();
            const price = product?.price || 0;
            
            if (name.includes('i9') || name.includes('9900') || name.includes('9950') || name.includes('rtx 4090') || name.includes('rtx 4080')) {
                return 'high-end';
            } else if (name.includes('i7') || name.includes('7700') || name.includes('7800') || name.includes('rtx 4070') || name.includes('rtx 4060 ti')) {
                return 'mid-high';
            } else if (name.includes('i5') || name.includes('5600') || name.includes('5700') || name.includes('rtx 4060') || name.includes('rtx 3060')) {
                return 'mid-range';
            } else {
                return 'budget';
            }
        };
        
        const cpuTier = getTier(cpu);
        const gpuTier = getTier(gpu);
        
        const tierMap = { 'budget': 1, 'mid-range': 2, 'mid-high': 3, 'high-end': 4 };
        const cpuLevel = tierMap[cpuTier] || 2;
        const gpuLevel = tierMap[gpuTier] || 2;
        
        const difference = Math.abs(cpuLevel - gpuLevel);
        let score = 100;
        let message = '✓ Balanced configuration';
        let bottleneck = 'none';
        
        if (difference === 0) {
            score = 100;
            message = '✓ Perfect balance - CPU and GPU well matched';
        } else if (difference === 1) {
            score = 85;
            message = '✓ Good balance - minor performance gap';
            bottleneck = cpuLevel < gpuLevel ? 'cpu-slight' : 'gpu-slight';
        } else if (difference === 2) {
            score = 70;
            message = '⚠ Noticeable imbalance - consider upgrading weaker component';
            bottleneck = cpuLevel < gpuLevel ? 'cpu-moderate' : 'gpu-moderate';
        } else {
            score = 50;
            message = '⚠ Significant bottleneck - mismatched tiers';
            bottleneck = cpuLevel < gpuLevel ? 'cpu-severe' : 'gpu-severe';
        }
        
        return {
            status: score >= 70 ? 'pass' : 'warning',
            compatible: true, // Not incompatible, just suboptimal
            message,
            score,
            details: {
                cpu_tier: cpuTier,
                gpu_tier: gpuTier,
                bottleneck,
                tier_difference: difference
            }
        };
    }

    /**
     * Simplified 6-Layer Full Build Analysis (For Stress Test)
     */
    async analyzeFullBuildSimple(components) {
        logger.info('🔍 [FULL BUILD SIMPLE] Starting 6-layer compatibility analysis...');
        
        const analysis = {
            compatibility_score: 0,
            overall_status: 'checking',
            issues: [],
            warnings: [],
            socket_compatibility: null,
            memory_compatibility: null,
            power_compatibility: null,
            physical_compatibility: null,
            thermal_compatibility: null,
            performance_compatibility: null
        };

        try {
            let totalScore = 0;
            let layersChecked = 0;
            
            // Layer 1: Socket Compatibility (CPU ↔ Motherboard)
            const cpu = components.cpu || components.CPU;
            const motherboard = components.motherboard || components.Motherboard;
            
            if (cpu && motherboard) {
                logger.info('[FULL BUILD] Running Layer 1: Socket');
                analysis.socket_compatibility = await this.checkSocketCompatibility(cpu, motherboard);
                totalScore += analysis.socket_compatibility.score;
                layersChecked++;
                
                if (!analysis.socket_compatibility.compatible) {
                    analysis.issues.push({
                        layer: 'socket',
                        severity: 'critical',
                        message: analysis.socket_compatibility.message
                    });
                }
            }

            // Layer 2: Memory Compatibility (RAM ↔ Motherboard)
            const ram = components.ram || components.RAM;
            if (ram && motherboard) {
                logger.info('[FULL BUILD] Running Layer 2: Memory');
                analysis.memory_compatibility = await this.checkMemoryCompatibility(ram, motherboard);
                totalScore += analysis.memory_compatibility.score;
                layersChecked++;
                
                if (!analysis.memory_compatibility.compatible) {
                    analysis.issues.push({
                        layer: 'memory',
                        severity: 'critical',
                        message: analysis.memory_compatibility.message
                    });
                }
            }

            // Layer 3: Power Compatibility (PSU ↔ All Components)
            const psu = components.psu || components.PSU;
            if (psu) {
                logger.info('[FULL BUILD] Running Layer 3: Power');
                analysis.power_compatibility = await this.checkPowerCompatibility(psu, components);
                totalScore += analysis.power_compatibility.score;
                layersChecked++;
                
                if (!analysis.power_compatibility.compatible) {
                    analysis.issues.push({
                        layer: 'power',
                        severity: 'critical',
                        message: analysis.power_compatibility.message
                    });
                }
            }

            // Layer 4: Physical Compatibility (Case clearances)
            const caseComp = components.case || components.Case;
            if (caseComp) {
                logger.info('[FULL BUILD] Running Layer 4: Physical');
                analysis.physical_compatibility = await this.checkPhysicalCompatibility(caseComp, components);
                totalScore += analysis.physical_compatibility.score;
                layersChecked++;
                
                if (!analysis.physical_compatibility.compatible) {
                    analysis.issues.push({
                        layer: 'physical',
                        severity: 'critical',
                        message: analysis.physical_compatibility.message
                    });
                }
            }

            // Layer 5: Thermal Compatibility (Cooling ↔ CPU/GPU)
            if (cpu) {
                logger.info('[FULL BUILD] Running Layer 5: Thermal');
                analysis.thermal_compatibility = await this.checkThermalCompatibility(components);
                totalScore += analysis.thermal_compatibility.score;
                layersChecked++;
                
                if (analysis.thermal_compatibility.status === 'warning') {
                    analysis.warnings.push({
                        layer: 'thermal',
                        severity: 'warning',
                        message: analysis.thermal_compatibility.message
                    });
                }
            }

            // Layer 6: Performance Compatibility (Bottleneck detection)
            const gpu = components.gpu || components.GPU;
            if (cpu && gpu) {
                logger.info('[FULL BUILD] Running Layer 6: Performance');
                analysis.performance_compatibility = await this.checkPerformanceCompatibility(cpu, gpu);
                totalScore += analysis.performance_compatibility.score;
                layersChecked++;
                
                if (analysis.performance_compatibility.status === 'warning') {
                    analysis.warnings.push({
                        layer: 'performance',
                        severity: 'warning',
                        message: analysis.performance_compatibility.message
                    });
                }
            }

            // Calculate overall score
            analysis.compatibility_score = layersChecked > 0 
                ? Math.round(totalScore / layersChecked) 
                : 0;
                
            analysis.overall_status = analysis.compatibility_score >= 70 
                ? 'compatible' 
                : 'incompatible';

            logger.info(`✅ [FULL BUILD SIMPLE] Analysis complete: ${analysis.compatibility_score}/100`);
            logger.info(`   Layers checked: ${layersChecked}`);
            logger.info(`   Issues: ${analysis.issues.length}`);
            logger.info(`   Warnings: ${analysis.warnings.length}`);

        } catch (error) {
            logger.error('❌ [FULL BUILD SIMPLE] Analysis failed:', error);
            analysis.overall_status = 'error';
            analysis.issues.push({
                layer: 'system',
                severity: 'critical',
                message: 'Analysis engine error: ' + error.message
            });
        }

        return analysis;
    }

    /**
     * 🔥 PHASE 11: COMPREHENSIVE RULES VALIDATION (LAYER 6)
     * Runs all 23 compatibility rules from compatibilityRules.js
     * Includes PHASE 3/4 enhancements:
     * - RAM per-slot capacity validation
     * - Case form factor hierarchy validation
     * - GPU-case clearance validation
     * - Critical trap detection
     * @param {Object} components - Build components
     * @returns {Object} - Comprehensive rules validation results
     */
    async runComprehensiveRulesValidation(components) {
        try {
            logger.info('📋 [COMPREHENSIVE RULES] Running 23-rule validation system...');

            const criticalIssuesRaw = [];
            const warningsRaw = [];
            let totalScore = 0;
            let maxPossibleScore = 0;
            let rulesChecked = 0;

            // Build context with loaded specs for each component
            // 🔥 FIX: Handle storage arrays - process each storage device individually
            const buildContext = {};
            for (const [category, component] of Object.entries(components)) {
                // Skip if component is missing or is an array (arrays handled separately)
                if (!component || Array.isArray(component)) continue;
                
                if (component.id) {
                    const specs = await compatibilityRules.loadNormalizedSpecs(component.id);
                    // 🔥 FIX: Also preserve original dimensions from component
                    buildContext[category] = {
                        ...component,
                        specs: specs,
                        // Merge dimensions into specs for compatibility functions
                        dimensions: component.dimensions || {}
                    };
                }
            }
            
            // 🔥 FIX: Handle storage array separately - only use FIRST storage for comprehensive rules
            // (Multi-storage validation is handled in resource budget analysis)
            const storageInput = components.storage || components.Storage;
            if (storageInput) {
                const primaryStorage = Array.isArray(storageInput) ? storageInput[0] : storageInput;
                if (primaryStorage && primaryStorage.id) {
                    const specs = await compatibilityRules.loadNormalizedSpecs(primaryStorage.id);
                    buildContext.storage = {
                        ...primaryStorage,
                        specs: specs,
                        dimensions: primaryStorage.dimensions || {}
                    };
                }
            }

            // 🔥 KEY FIX: Call computeCompatibilityScore for EACH component against the FULL build
            // This ensures all pairwise relationships are checked (GPU ↔ Case, CPU ↔ MB, etc.)
            const componentCategories = Object.keys(buildContext);
            
            for (const category of componentCategories) {
                const candidate = buildContext[category];
                
                if (!candidate || !candidate.specs) continue;

                // Run compatibility rules for this candidate against the full build
                try {
                    const result = await compatibilityRules.computeCompatibilityScore(
                        buildContext,
                        candidate
                    );
                    
                    if (result && typeof result.score === 'number') {
                        totalScore += result.score;
                        maxPossibleScore += result.maxScore || 0;
                        rulesChecked++;

                        // Extract critical issues
                        if (result.issues && Array.isArray(result.issues)) {
                            result.issues.forEach(issue => {
                                if (issue.severity === 'critical') {
                                    criticalIssuesRaw.push({
                                        component: category,
                                        severity: 'critical',
                                        rule: issue.rule || 'compatibility_check',
                                        message: issue.message || issue.details || 'Compatibility issue detected',
                                        details: issue.details || issue.message,
                                        penalty: issue.penalty || 0
                                    });
                                }
                            });
                        }

                        // Extract warnings
                        if (result.warnings && Array.isArray(result.warnings)) {
                            warningsRaw.push(...result.warnings.map(warning => ({
                                component: category,
                                severity: 'warning',
                                rule: warning.rule || 'compatibility_check',
                                message: warning.message || warning.details || warning,
                                penalty: warning.penalty || 0
                            })));
                        }

                        // Extract recommendations as warnings
                        if (result.recommendations && Array.isArray(result.recommendations)) {
                            result.recommendations.forEach(rec => {
                                // CRITICAL FIX: Socket-related recommendations must be critical issues, not optimization warnings
                                const message = rec.message || rec.details || rec;
                                const isSocketIssue = message.toLowerCase().includes('socket');
                                
                                // Socket issues go to critical_issues, not warnings
                                if (isSocketIssue) {
                                    criticalIssuesRaw.push({
                                        component: category,
                                        severity: 'critical',
                                        rule: rec.rule || 'compatibility_check',
                                        message: message,
                                        details: rec.details || rec.message || message,
                                        penalty: 0
                                    });
                                } else {
                                    // Non-socket recommendations remain as warnings
                                    warningsRaw.push({
                                        component: category,
                                        severity: rec.severity || 'warning',
                                        rule: rec.rule || 'compatibility_check', // Changed from 'optimization'
                                        message: message,
                                        penalty: 0
                                    });
                                }
                            });
                        }
                    }
                } catch (error) {
                    // 🔥 FIX: Add detailed error logging to identify root cause
                    logger.error(`❌ [COMPREHENSIVE RULES] Error checking ${category}:`, {
                        error: error.message,
                        stack: error.stack,
                        component: candidate?.name || 'unknown',
                        hasSpecs: !!candidate?.specs
                    });
                    // Don't fail the entire validation, just skip this component
                }
            }

            // 🔥 CRITICAL FIX: Deduplicate issues BEFORE returning
            // computeCompatibilityScore is called for each component, so the same issue
            // (e.g., "PSU wattage not specified") gets added multiple times
            const deduplicateIssues = (issues) => {
                const seen = new Set();
                return issues.filter(issue => {
                    // Create signature from message only (ignore component, since same issue can be detected from multiple components)
                    const sig = (issue.message || '').toLowerCase().replace(/\s+/g, ' ').trim();
                    if (seen.has(sig)) {
                        return false;
                    }
                    seen.add(sig);
                    return true;
                });
            };

            const criticalIssues = deduplicateIssues(criticalIssuesRaw);
            const warnings = deduplicateIssues(warningsRaw);

            const averageScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 435) : 100;
            const compatible = criticalIssues.length === 0;
            const status = compatible ? 'compatible' : 'incompatible';
            const severity = criticalIssues.length > 0 ? 'critical' : 
                           warnings.length > 0 ? 'warning' : 'success';

            logger.info(`📋 [COMPREHENSIVE RULES] Validation complete:`);
            logger.info(`   Component categories checked: ${rulesChecked}`);
            logger.info(`   Score: ${totalScore}/${maxPossibleScore} (normalized: ${averageScore}/435)`);
            logger.info(`   Critical issues (before dedup): ${criticalIssuesRaw.length}, (after dedup): ${criticalIssues.length}`);
            logger.info(`   Warnings (before dedup): ${warningsRaw.length}, (after dedup): ${warnings.length}`);

            return {
                status,
                severity,
                compatible,
                message: compatible 
                    ? `All ${rulesChecked} component compatibility checks passed (Score: ${averageScore}/435)` 
                    : `${criticalIssues.length} critical compatibility issues detected`,
                compatibility_score: averageScore,
                max_possible_score: 435,
                rules_checked: rulesChecked,
                critical_issues: criticalIssues,
                warnings: warnings,
                details: {
                    total_rules: 23,
                    components_checked: rulesChecked,
                    raw_score: totalScore,
                    raw_max_score: maxPossibleScore,
                    phase_3_enhancements: ['RAM per-slot capacity', 'Case form factor hierarchy'],
                    phase_4_enhancements: ['GPU-case clearance', 'Critical trap detection']
                }
            };

        } catch (error) {
            logger.error('❌ [COMPREHENSIVE RULES] Validation failed:', error);
            return {
                status: 'error',
                severity: 'error',
                compatible: false,
                message: 'Comprehensive rules validation failed: ' + error.message,
                critical_issues: [{
                    severity: 'critical',
                    message: 'Rules engine error: ' + error.message
                }],
                warnings: []
            };
        }
    }
}

module.exports = new AdvancedCompatibilityService();
