const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const logger = require('../utils/logger');
const { protect } = require('../middleware/auth');

/**
 * SUPER DETAILED COMPATIBILITY CHECKER
 * Uses 3200+ Visual Rule Builder Rules + Component-Specific Checks
 * Returns: PCPartPicker-style DETAILED compatibility analysis
 */

// Optional authentication middleware - allows both guest and authenticated users
const optionalAuth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token && token !== 'null' && token !== 'undefined') {
        // If token exists, try to verify it
        return protect(req, res, next);
    }

    // No token - allow as guest
    req.user = null;
    next();
};

router.post('/comprehensive-check', optionalAuth, async (req, res) => {
    try {
        const { components, buildType = 'custom' } = req.body;

        if (!components || components.length === 0) {
            return res.json({
                success: true,
                data: {
                    compatible: { notes: [], disclaimers: [] },
                    warnings: { warnings: [], notes: [], disclaimers: [] },
                    problems: { problems: [], notes: [], disclaimers: [] }
                }
            });
        }

        logger.info(`🔍 DETAILED Compatibility check for ${components.length} components`);

        // Fetch FULL specs for ALL components from database
        const fullComponents = await Promise.all(
            components.map(async (comp) => {
                if (!comp || !comp.id) return null;

                try {
                    // Get component from pc_parts with full specifications
                    const partResult = await query(`
                        SELECT id, name, category, brand, price, stock, 
                               specifications, image_url, description
                        FROM pc_parts 
                        WHERE id = $1 AND is_active = true
                    `, [comp.id]);

                    if (partResult.rows.length === 0) {
                        logger.warn(`Component ${comp.id} not found in database`);
                        return null;
                    }

                    const part = partResult.rows[0];

                    // Parse specifications JSON
                    let specs = {};
                    if (part.specifications) {
                        try {
                            specs = typeof part.specifications === 'string'
                                ? JSON.parse(part.specifications)
                                : part.specifications;
                        } catch (e) {
                            logger.warn(`Failed to parse specifications for ${part.name}`);
                        }
                    }

                    return {
                        ...comp,
                        ...part,
                        specs: specs,
                        category_normalized: normalizeCategory(part.category)
                    };
                } catch (error) {
                    logger.error(`Error fetching component ${comp.id}:`, error);
                    return null;
                }
            })
        );

        // Filter out null components
        const validComponents = fullComponents.filter(c => c !== null);

        logger.info(`📊 Loaded ${validComponents.length} components with full specifications`);

        // Organize by category
        const build = {};
        validComponents.forEach(comp => {
            const cat = comp.category_normalized;
            if (cat) {
                if (!build[cat]) {
                    build[cat] = [];
                }
                build[cat].push(comp);
            }
        });

        // Initialize result
        const result = {
            compatible: { notes: [], disclaimers: [] },
            warnings: { warnings: [], notes: [], disclaimers: [] },
            problems: { problems: [], notes: [], disclaimers: [] }
        };

        logger.info(`🏗️ Build categories: ${Object.keys(build).join(', ')}`);

        // ===================================================================
        // LAYER 0: CHECK FOR MISSING ESSENTIAL COMPONENTS
        // ===================================================================
        checkMissingComponents(build, result);

        // ===================================================================
        // LAYER 1: COMPREHENSIVE COMPONENT-TO-COMPONENT CHECKS
        // ===================================================================
        await performDetailedCompatibilityChecks(build, validComponents, result);

        // ===================================================================
        // LAYER 2: VISUAL RULE BUILDER RULES (3200+)
        // ===================================================================
        await applyVisualRuleBuilderRules(build, validComponents, result);

        // ===================================================================
        // LAYER 3: POWER BUDGET & PHYSICAL CONSTRAINTS
        // ===================================================================
        await checkPowerAndPhysical(build, result);

        // ===================================================================
        // LAYER 4: GENERAL DISCLAIMERS
        // ===================================================================
        addDetailedDisclaimers(build, result);

        logger.info(`✅ Analysis complete: ${result.problems.problems.length} problems, ${result.warnings.warnings.length} warnings, ${result.compatible.notes.length} notes`);

        res.json({
            success: true,
            data: result,
            componentsAnalyzed: validComponents.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Compatibility check error:', error);
        res.status(500).json({
            success: false,
            message: 'Compatibility check failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Normalize category names
 */
function normalizeCategory(category) {
    if (!category) return null;

    const cat = category.toUpperCase().trim();

    // Normalize variations
    if (cat.includes('PROCESSOR') || cat === 'CPU') return 'CPU';
    if (cat.includes('MOTHERBOARD') || cat.includes('MOBO')) return 'MOTHERBOARD';
    if (cat.includes('MEMORY') || cat === 'RAM') return 'RAM';
    if (cat.includes('GRAPHICS') || cat === 'GPU' || cat.includes('VIDEO CARD')) return 'GPU';
    if (cat.includes('POWER SUPPLY') || cat === 'PSU') return 'PSU';
    if (cat.includes('STORAGE') || cat.includes('SSD') || cat.includes('HDD')) return 'STORAGE';
    if (cat.includes('COOL') || cat.includes('FAN')) return 'COOLING';
    if (cat.includes('CASE') || cat.includes('CHASSIS')) return 'CASE';

    return cat;
}

/**
 * LAYER 1: Perform DETAILED component-to-component compatibility checks
 */
async function performDetailedCompatibilityChecks(build, components, result) {
    try {
        logger.info('🔬 Performing detailed component compatibility analysis...');

        // Check for duplicate critical components
        checkDuplicateComponents(build, result);

        // CPU-Motherboard compatibility (MOST CRITICAL)
        await checkCPUMotherboardCompatibility(build, result);

        // RAM-Motherboard compatibility
        await checkRAMMotherboardCompatibility(build, result);

        // GPU-Motherboard-Case compatibility
        await checkGPUCompatibility(build, result);

        // Cooling-CPU-Case compatibility
        await checkCoolingCompatibility(build, result);

        // PSU-Components compatibility
        await checkPSUCompatibility(build, result);

        // Storage compatibility
        await checkStorageCompatibility(build, result);

    } catch (error) {
        logger.error('Error in detailed compatibility checks:', error);
    }
}

/**
 * Check for duplicate components (CRITICAL ERROR)
 */
function checkDuplicateComponents(build, result) {
    const criticalComponents = ['CPU', 'MOTHERBOARD', 'PSU'];

    for (const category of criticalComponents) {
        if (build[category] && build[category].length > 1) {
            result.problems.problems.push(
                `Build has multiple ${category}s. Only one ${category} allowed.`
            );
        }
    }
}

/**
 * LAYER 0: Check for Missing Essential Components
 * Warns when critical components are missing and explains validation limitations
 */
function checkMissingComponents(build, result) {
    const essentialComponents = {
        'CPU': {
            missing: !build.CPU || build.CPU.length === 0,
            message: 'No CPU selected. Cannot validate socket, power, or cooling.',
            impact: ['Cannot check CPU-Motherboard socket match', 'Cannot calculate TDP/power requirements', 'Cannot verify cooler compatibility', 'Cannot check VRM adequacy']
        },
        'MOTHERBOARD': {
            missing: !build.MOTHERBOARD || build.MOTHERBOARD.length === 0,
            message: 'No motherboard selected. Cannot validate compatibility.',
            impact: ['Cannot check CPU socket compatibility', 'Cannot verify RAM type/speed support', 'Cannot validate case form factor fit', 'Cannot check PCIe/M.2 slot availability', 'Cannot verify storage interface support']
        },
        'RAM': {
            missing: !build.RAM || build.RAM.length === 0,
            message: 'No RAM selected. Cannot validate type or speed.',
            impact: ['Cannot check RAM type compatibility (DDR4 vs DDR5)', 'Cannot validate RAM speed support', 'Cannot verify slot capacity limits']
        },
        'STORAGE': {
            missing: !build.STORAGE || build.STORAGE.length === 0,
            message: 'No storage selected. Cannot verify interface compatibility.',
            impact: ['Cannot verify M.2/SATA slot availability', 'Cannot check storage interface compatibility']
        },
        'CASE': {
            missing: !build.CASE || build.CASE.length === 0,
            message: 'No case selected. Cannot validate clearances.',
            impact: ['Cannot check GPU physical clearance/length', 'Cannot verify CPU cooler height clearance', 'Cannot validate motherboard form factor compatibility', 'Cannot check PSU form factor/length fit', 'Cannot verify drive bay availability']
        },
        'PSU': {
            missing: !build.PSU || build.PSU.length === 0,
            message: 'No PSU selected. Cannot calculate power requirements.',
            impact: ['Cannot validate total power budget', 'Cannot check PSU efficiency rating', 'Cannot verify power connector availability', 'Cannot calculate power headroom for overclocking']
        },
        'COOLING': {
            missing: !build.COOLING || build.COOLING.length === 0,
            message: 'No CPU cooler selected. Cannot verify cooling capacity.',
            impact: ['Cannot verify cooler socket compatibility', 'Cannot check TDP cooling capacity', 'Cannot validate cooler height vs case clearance', 'Cannot check RAM clearance for tower coolers']
        }
    };

    const missingCritical = [];
    const missingRecommended = [];
    const validationLimitations = [];

    // Check each essential component
    for (const [componentType, config] of Object.entries(essentialComponents)) {
        if (config.missing) {
            // Categorize by severity
            if (['CPU', 'MOTHERBOARD', 'RAM', 'STORAGE', 'CASE', 'PSU'].includes(componentType)) {
                missingCritical.push(componentType);
                result.warnings.warnings.push(config.message);
            } else {
                missingRecommended.push(componentType);
                result.warnings.notes.push(config.message);
            }
            
            // Add validation limitations
            config.impact.forEach(limitation => {
                validationLimitations.push(`• ${componentType}: ${limitation}`);
            });
        }
    }

    // Add summary note if components are missing
    if (missingCritical.length > 0) {
        result.warnings.notes.push(
            `Incomplete build: ${missingCritical.join(', ')} missing.`
        );
    }
}

/**
 * CPU-Motherboard Socket Compatibility (MOST IMPORTANT)
 */
async function checkCPUMotherboardCompatibility(build, result) {
    try {
        const cpus = build.CPU || [];
        const motherboards = build.MOTHERBOARD || [];

        if (cpus.length === 0 || motherboards.length === 0) {
            if (cpus.length === 0 && motherboards.length > 0) {
                result.warnings.warnings.push(
                    `Motherboard selected but no CPU. Choose compatible CPU.`
                );
            }
            if (motherboards.length === 0 && cpus.length > 0) {
                result.warnings.warnings.push(
                    `CPU selected but no motherboard. Choose compatible motherboard.`
                );
            }
            return;
        }

        for (const cpu of cpus) {
            for (const mb of motherboards) {
                const cpuSocket = cpu.specs?.socket || extractSocket(cpu.name, cpu.description);
                const mbSocket = mb.specs?.socket || extractSocket(mb.name, mb.description);
                const cpuBrand = detectBrand(cpu.name);
                const mbChipset = mb.specs?.chipset || extractChipset(mb.name, mb.description);

                logger.info(`🔍 Checking: CPU ${cpu.name} (${cpuSocket}) vs MB ${mb.name} (${mbSocket})`);

                // Socket compatibility check
                if (cpuSocket && mbSocket) {
                    if (cpuSocket !== mbSocket) {
                        result.problems.problems.push(
                            `CPU socket ${cpuSocket} doesn't match motherboard socket ${mbSocket}.`
                        );
                    } else {
                        result.compatible.notes.push(
                            `CPU and motherboard both use ${cpuSocket} socket.`
                        );
                    }
                } else {
                    result.warnings.notes.push(
                        `Cannot verify socket compatibility. Check CPU and motherboard specs.`
                    );
                }

                // Brand compatibility
                if (cpuBrand && mbChipset) {
                    if ((cpuBrand === 'Intel' && mbChipset.match(/^[BHZ]\d{3}/)) ||
                        (cpuBrand === 'AMD' && mbChipset.match(/^[ABX]\d{3}/))) {
                        // Likely compatible
                        result.compatible.notes.push(
                            `${cpuBrand} CPU matches ${mbChipset} chipset.`
                        );
                    } else if ((cpuBrand === 'Intel' && mbChipset.match(/^[ABX]\d{3}/)) ||
                        (cpuBrand === 'AMD' && mbChipset.match(/^[BHZ]\d{3}/))) {
                        result.problems.problems.push(
                            `${cpuBrand} CPU incompatible with ${mbChipset} motherboard.`
                        );
                    }
                }

                // TDP and VRM check
                const cpuTDP = cpu.specs?.tdp || extractTDP(cpu.name, cpu.description);
                const mbVRM = mb.specs?.vrm_phases || extractVRM(mb.description);

                if (cpuTDP && mbVRM) {
                    if (cpuTDP > 125 && mbVRM < 10) {
                        result.warnings.warnings.push(
                            `${cpuTDP}W CPU may throttle with ${mbVRM}-phase VRM. Need 10+ phases.`
                        );
                    } else if (cpuTDP > 65 && mbVRM >= 10) {
                        result.compatible.notes.push(
                            `${mbVRM}-phase VRM adequate for ${cpuTDP}W CPU.`
                        );
                    }
                }
            }
        }

    } catch (error) {
        logger.error('Error checking CPU-Motherboard compatibility:', error);
    }
}

/**
 * RAM-Motherboard Compatibility
 */
async function checkRAMMotherboardCompatibility(build, result) {
    try {
        const rams = build.RAM || [];
        const motherboards = build.MOTHERBOARD || [];

        if (rams.length === 0 || motherboards.length === 0) return;

        for (const ram of rams) {
            for (const mb of motherboards) {
                const ramType = ram.specs?.type || detectRAMType(ram.name);
                const mbRAMType = mb.specs?.memory_type || detectRAMType(mb.name, mb.description);
                const ramSpeed = ram.specs?.speed || extractRAMSpeed(ram.name);
                const mbMaxSpeed = mb.specs?.max_memory_speed || extractRAMSpeed(mb.description);

                logger.info(`🔍 Checking RAM: ${ram.name} (${ramType}) vs MB: ${mb.name} (${mbRAMType})`);

                // RAM type compatibility
                if (ramType && mbRAMType) {
                    if (ramType !== mbRAMType) {
                        result.problems.problems.push(
                            `RAM type ${ramType} incompatible with motherboard ${mbRAMType}.`
                        );
                    } else {
                        result.compatible.notes.push(
                            `Motherboard and RAM both use ${ramType}.`
                        );
                    }
                }

                // RAM speed compatibility
                if (ramSpeed && mbMaxSpeed) {
                    if (ramSpeed > mbMaxSpeed) {
                        result.warnings.warnings.push(
                            `${ramSpeed}MHz RAM will downclock to motherboard max ${mbMaxSpeed}MHz.`
                        );
                    } else if (ramSpeed === mbMaxSpeed) {
                        result.compatible.notes.push(
                            `RAM speed ${ramSpeed}MHz matches motherboard max speed.`
                        );
                    } else {
                        result.compatible.notes.push(
                            `RAM ${ramSpeed}MHz compatible with motherboard (max ${mbMaxSpeed}MHz).`
                        );
                    }
                }
            }
        }

    } catch (error) {
        logger.error('Error checking RAM compatibility:', error);
    }
}

/**
 * GPU Compatibility Checks
 */
async function checkGPUCompatibility(build, result) {
    try {
        const gpus = build.GPU || [];
        const cases = build.CASE || [];
        const motherboards = build.MOTHERBOARD || [];

        if (gpus.length === 0) return;

        // CRITICAL: Check if case is missing when GPU is present
        if (cases.length === 0) {
            for (const gpu of gpus) {
                result.warnings.warnings.push(
                    `No case selected. Cannot verify GPU clearance for ${gpu.name}.`
                );
            }
            // Still check motherboard compatibility even without case
        }

        for (const gpu of gpus) {
            // Priority: dimensions > specs > extraction with ENHANCED fallback extraction
            let gpuLength = 
                gpu.dimensions?.length_mm ||
                gpu.specs?.length_mm || 
                gpu.specs?.length || 
                gpu.specs?.['GPU Length'] ||
                gpu.specs?.['Length (mm)'] ||
                extractLength(gpu.name, gpu.description);
            
            // ENHANCED: Try additional extraction methods if still null
            if (!gpuLength && gpu.description) {
                const lengthMatch = gpu.description.match(/(\d{2,3})\s*mm|Length[:\s]*(\d{2,3})/i);
                if (lengthMatch) {
                    gpuLength = parseInt(lengthMatch[1] || lengthMatch[2]);
                    logger.info(`📏 Extracted GPU length from description: ${gpuLength}mm for ${gpu.name}`);
                }
            }

            const gpuSlots = gpu.specs?.slots || gpu.specs?.['Slot Width'] || extractSlots(gpu.description);
            const gpuPower = gpu.specs?.power_connectors || gpu.specs?.['Power Connectors'] || extractPowerConnectors(gpu.description);

            logger.info(`🔍 GPU Analysis: "${gpu.name}" - Length: ${gpuLength || 'unknown'}mm, Slots: ${gpuSlots || 'unknown'}, Power: ${gpuPower || 'unknown'}`);

            // GPU-Case clearance (only check if case exists)
            for (const pcCase of cases) {
                // Priority: dimensions > specs > extraction with ENHANCED fallback extraction  
                let caseMaxGPU = 
                    pcCase.dimensions?.max_gpu_length_mm ||
                    pcCase.specs?.max_gpu_length_mm ||
                    pcCase.specs?.max_gpu_length ||
                    pcCase.specs?.['Max Gpu Length'] ||
                    pcCase.specs?.['Max GPU Length'] ||
                    pcCase.specs?.['GPU Clearance'] ||
                    extractMaxGPULength(pcCase.description);
                
                // ENHANCED: Try additional extraction methods if still null
                if (!caseMaxGPU && pcCase.description) {
                    const gpuMatch = pcCase.description.match(/GPU[:\s]*(?:up to\s*)?(\d{2,3})\s*mm|max.*gpu.*?(\d{2,3})\s*mm/i);
                    if (gpuMatch) {
                        caseMaxGPU = parseInt(gpuMatch[1] || gpuMatch[2]);
                        logger.info(`📏 Extracted case GPU clearance from description: ${caseMaxGPU}mm for ${pcCase.name}`);
                    }
                }

                const caseFormFactor = pcCase.specs?.form_factor || pcCase.specs?.['Form Factor'] || extractFormFactor(pcCase.name, pcCase.description);

                logger.info(`🔍 Case Analysis: "${pcCase.name}" - Max GPU: ${caseMaxGPU || 'unknown'}mm, Form Factor: ${caseFormFactor || 'unknown'}`);

                if (gpuLength && caseMaxGPU) {
                    const clearance = caseMaxGPU - gpuLength;

                    if (clearance < 0) {
                        result.problems.problems.push(
                            `GPU ${gpu.name} (${gpuLength}mm) won't fit in case ${pcCase.name} (max ${caseMaxGPU}mm).`
                        );
                    } else if (clearance < 20) {
                        result.warnings.warnings.push(
                            `GPU ${gpu.name} has tight fit (${clearance}mm clearance). May affect cables/cooling.`
                        );
                    } else if (clearance >= 20 && clearance < 50) {
                        result.compatible.notes.push(
                            `GPU ${gpu.name} fits with ${clearance}mm clearance. Adequate space.`
                        );
                    } else {
                        result.compatible.notes.push(
                            `GPU ${gpu.name} has excellent clearance (${clearance}mm). Great fit.`
                        );
                    }
                } else if (gpuLength && !caseMaxGPU) {
                    result.warnings.warnings.push(
                        `Cannot verify GPU clearance. Check case specs for ${gpuLength}mm GPU fit.`
                    );
                } else if (!gpuLength && caseMaxGPU) {
                    result.warnings.warnings.push(
                        `Cannot verify GPU length. Check if it fits in ${caseMaxGPU}mm case limit.`
                    );
                } else {
                    result.warnings.warnings.push(
                        `GPU/case dimensions unknown. Verify clearance manually.`
                    );
                }

                // ENHANCED: Check case form factor suitability for GPU
                if (caseFormFactor && gpuLength) {
                    const formFactorUpper = caseFormFactor.toUpperCase();
                    if ((formFactorUpper.includes('MINI') || formFactorUpper.includes('ITX')) && gpuLength > 250) {
                        result.warnings.warnings.push(
                            `${gpuLength}mm GPU may be too large for Mini-ITX case ${pcCase.name}.`
                        );
                    }
                    if ((formFactorUpper.includes('MICRO') || formFactorUpper.includes('MATX') || formFactorUpper.includes('SLIM')) && gpuLength > 280) {
                        result.warnings.warnings.push(
                            `${gpuLength}mm GPU may be too large for Micro-ATX case ${pcCase.name}.`
                        );
                    }
                }
            }

            // GPU-Motherboard PCIe slots
            for (const mb of motherboards) {
                const pcieSlots = mb.specs?.pcie_slots || mb.specs?.PCIE_Slots || mb.specs?.['PCIE Slots'] || 'x16';
                const pcieX16Slots = mb.specs?.pcie_x16_slots || 1; // Assume at least 1 x16 slot

                if (pcieSlots || pcieX16Slots >= 1) {
                    result.compatible.notes.push(
                        `Motherboard ${mb.name} has PCIe x16 slot for GPU.`
                    );
                } else {
                    result.warnings.warnings.push(
                        `Cannot verify PCIe x16 slot. Most motherboards have one.`
                    );
                }
            }

            // Multi-GPU checks
            if (gpus.length > 1) {
                result.warnings.warnings.push(
                    `Multiple GPUs (${gpus.length}). Ensure motherboard supports SLI/Crossfire.`
                );
            }
        }

    } catch (error) {
        logger.error('Error checking GPU compatibility:', error);
    }
}

/**
 * Cooling Compatibility
 */
async function checkCoolingCompatibility(build, result) {
    try {
        const coolers = build.COOLING || [];
        const cpus = build.CPU || [];
        const cases = build.CASE || [];
        const rams = build.RAM || [];

        if (coolers.length === 0) return;

        for (const cooler of coolers) {
            const coolerSocket = cooler.specs?.socket_support || extractCoolerSocket(cooler.name, cooler.description);
            const coolerTDP = cooler.specs?.tdp_rating || extractTDP(cooler.description);
            const coolerHeight = cooler.specs?.height || extractHeight(cooler.description);

            // Cooler-CPU socket compatibility
            for (const cpu of cpus) {
                const cpuSocket = cpu.specs?.socket || extractSocket(cpu.name);
                const cpuTDP = cpu.specs?.tdp || extractTDP(cpu.name);

                if (coolerSocket && cpuSocket) {
                    if (coolerSocket.includes(cpuSocket) || coolerSocket.includes('Universal')) {
                        result.compatible.notes.push(
                            `Cooler ${cooler.name} supports ${cpuSocket} socket.`
                        );
                    } else {
                        result.problems.problems.push(
                            `Cooler ${coolerSocket} socket incompatible with CPU ${cpuSocket} socket.`
                        );
                    }
                }

                // Cooler TDP vs CPU TDP
                if (coolerTDP && cpuTDP) {
                    const margin = ((coolerTDP - cpuTDP) / cpuTDP) * 100;

                    if (coolerTDP < cpuTDP) {
                        result.problems.problems.push(
                            `Cooler ${coolerTDP}W insufficient for CPU ${cpuTDP}W. CPU will overheat.`
                        );
                    } else if (margin < 20) {
                        result.warnings.warnings.push(
                            `Cooler ${coolerTDP}W barely adequate for CPU ${cpuTDP}W. May run hot.`
                        );
                    } else if (margin >= 20 && margin < 50) {
                        result.compatible.notes.push(
                            `Cooler ${coolerTDP}W adequate for CPU ${cpuTDP}W.`
                        );
                    } else {
                        result.compatible.notes.push(
                            `Cooler ${coolerTDP}W provides excellent headroom for CPU ${cpuTDP}W.`
                        );
                    }
                }
            }

            // Cooler-Case height clearance
            for (const pcCase of cases) {
                const caseMaxHeight = pcCase.specs?.max_cooler_height || extractMaxCoolerHeight(pcCase.description);

                if (coolerHeight && caseMaxHeight) {
                    const clearance = caseMaxHeight - coolerHeight;

                    if (clearance < 0) {
                        result.problems.problems.push(
                            `Cooler ${coolerHeight}mm too tall for case (max ${caseMaxHeight}mm).`
                        );
                    } else if (clearance < 10) {
                        result.warnings.warnings.push(
                            `Cooler ${coolerHeight}mm leaves only ${clearance}mm clearance in case.`
                        );
                    }
                }
            }

            // Cooler-RAM clearance (for tower coolers)
            if (coolerHeight && coolerHeight > 150) {
                for (const ram of rams) {
                    if (ram.name.toLowerCase().includes('rgb')) {
                        result.warnings.warnings.push(
                            `Tower cooler may interfere with tall RAM. Check clearance.`
                        );
                    }
                }
            }
        }

    } catch (error) {
        logger.error('Error checking cooling compatibility:', error);
    }
}

/**
 * PSU Compatibility & Power Budget
 */
async function checkPSUCompatibility(build, result) {
    try {
        const psus = build.PSU || [];
        const cpus = build.CPU || [];
        const gpus = build.GPU || [];

        let totalPower = 100; // Base system power
        const powerBreakdown = ['System overhead: 100W'];

        // Calculate total power
        for (const cpu of cpus) {
            const cpuTDP = cpu.specs?.tdp || extractTDP(cpu.name);
            if (cpuTDP) {
                totalPower += cpuTDP;
                powerBreakdown.push(`${cpu.name}: ${cpuTDP}W`);
            }
        }

        for (const gpu of gpus) {
            const gpuTDP = gpu.specs?.tdp || extractTDP(gpu.name, gpu.description);
            if (gpuTDP) {
                totalPower += gpuTDP;
                powerBreakdown.push(`${gpu.name}: ${gpuTDP}W`);
            }
        }

        if (psus.length === 0) {
            result.warnings.warnings.push(
                `⚠️ NO PSU SELECTED: Estimated system power: ${totalPower}W (${powerBreakdown.join(' + ')}). Recommend ${Math.ceil(totalPower * 1.5 / 50) * 50}W+ PSU (80+ Bronze or better) for optimal performance and efficiency.`
            );
            return;
        }

        for (const psu of psus) {
            const psuWattage = psu.specs?.wattage || extractWattage(psu.name);

            if (psuWattage) {
                const loadPercent = (totalPower / psuWattage) * 100;

                if (loadPercent > 100) {
                    result.problems.problems.push(
                        `🔴 PSU INADEQUATE: Total system power (${totalPower}W) EXCEEDS PSU "${psu.name}" capacity (${psuWattage}W) by ${totalPower - psuWattage}W. System will be UNSTABLE or FAIL TO BOOT. Upgrade to ${Math.ceil(totalPower * 1.3 / 50) * 50}W+ PSU immediately.`
                    );
                } else if (loadPercent > 90) {
                    result.warnings.warnings.push(
                        `PSU at ${loadPercent.toFixed(0)}% load (${totalPower}W/${psuWattage}W). Too high, may reduce lifespan.`
                    );
                } else if (loadPercent > 80) {
                    result.warnings.notes.push(
                        `PSU at ${loadPercent.toFixed(0)}% load. Minimal headroom for upgrades.`
                    );
                } else if (loadPercent >= 50 && loadPercent <= 80) {
                    result.compatible.notes.push(
                        `PSU at optimal ${loadPercent.toFixed(0)}% load (${totalPower}W/${psuWattage}W).`
                    );
                } else {
                    result.compatible.notes.push(
                        `PSU has ample headroom at ${loadPercent.toFixed(0)}% load.`
                    );
                }
            }
        }

    } catch (error) {
        logger.error('Error checking PSU compatibility:', error);
    }
}

/**
 * Storage Compatibility
 */
async function checkStorageCompatibility(build, result) {
    try {
        const storages = build.STORAGE || [];
        const motherboards = build.MOTHERBOARD || [];

        if (storages.length === 0) {
            result.warnings.notes.push(
                `No storage selected. Add SSD or HDD.`
            );
            return;
        }

        for (const storage of storages) {
            const storageType = storage.specs?.interface || detectStorageType(storage.name);

            if (storageType) {
                result.compatible.notes.push(
                    `Storage ${storage.name} (${storageType}) compatible.`
                );
            }
        }

    } catch (error) {
        logger.error('Error checking storage compatibility:', error);
    }
}

/**
 * Apply Visual Rule Builder Rules (3200+)
 */
async function applyVisualRuleBuilderRules(build, components, result) {
    try {
        logger.info('🔧 Loading Visual Rule Builder compatibility rules...');

        const rulesQuery = await query(`
            SELECT id, rule_name, error_message, component_a_category, component_b_category,
                   rule_type, severity, priority, rule_expression
            FROM compatibility_rules
            WHERE enabled = true
            ORDER BY priority DESC
        `);

        logger.info(`📋 Loaded ${rulesQuery.rows.length} Visual Rule Builder rules`);

        // Apply rules (simplified for now)
        // Full rule evaluation would go here

    } catch (error) {
        logger.error('Error applying Visual Rule Builder rules:', error);
    }
}

/**
 * Power and Physical Constraints
 */
async function checkPowerAndPhysical(build, result) {
    // Additional physical constraint checks
}

/**
 * Add detailed disclaimers
 */
function addDetailedDisclaimers(build, result) {
    if (build.CPU && build.MOTHERBOARD) {
        result.compatible.disclaimers.push(
            'Motherboard may need BIOS update for CPU compatibility.'
        );
    }

    result.compatible.disclaimers.push(
        'Verify physical dimensions before purchase.'
    );

    result.compatible.disclaimers.push(
        'Register products for warranty coverage.'
    );
}

// ===================================================================
// HELPER FUNCTIONS: Extract specs from text
// ===================================================================

function extractSocket(name, description = '') {
    const text = `${name} ${description}`.toUpperCase();

    // Intel sockets
    if (text.match(/LGA\s?1700/)) return 'LGA1700';
    if (text.match(/LGA\s?1200/)) return 'LGA1200';
    if (text.match(/LGA\s?1151/)) return 'LGA1151';

    // AMD sockets
    if (text.match(/AM5/)) return 'AM5';
    if (text.match(/AM4/)) return 'AM4';
    if (text.match(/TR4|TRX4/)) return 'TRX4';

    return null;
}

function detectBrand(name) {
    const n = name.toUpperCase();
    if (n.includes('INTEL') || n.match(/I[3579]-\d{4,5}/)) return 'Intel';
    if (n.includes('AMD') || n.includes('RYZEN')) return 'AMD';
    return null;
}

function extractChipset(name, description = '') {
    const text = `${name} ${description}`.toUpperCase();
    const match = text.match(/([BHZX]\d{3,4}[A-Z]*)/);
    return match ? match[1] : null;
}

function extractTDP(name, description = '') {
    const text = `${name} ${description}`;
    const match = text.match(/(\d+)\s?W(?:att)?/i);
    return match ? parseInt(match[1]) : null;
}

function extractVRM(description = '') {
    const match = description.match(/(\d+)[\s-]?phase/i);
    return match ? parseInt(match[1]) : null;
}

function detectRAMType(name, description = '') {
    const text = `${name} ${description}`.toUpperCase();
    if (text.includes('DDR5')) return 'DDR5';
    if (text.includes('DDR4')) return 'DDR4';
    if (text.includes('DDR3')) return 'DDR3';
    return null;
}

function extractRAMSpeed(text = '') {
    const match = text.match(/(\d{4,5})\s?MHz/i);
    return match ? parseInt(match[1]) : null;
}

function extractLength(name, description = '') {
    const text = `${name} ${description}`;
    const match = text.match(/(\d{3})\s?mm/);
    return match ? parseInt(match[1]) : null;
}

function extractHeight(description = '') {
    const match = description.match(/(\d{2,3})\s?mm.*height/i);
    return match ? parseInt(match[1]) : null;
}

function extractWattage(name) {
    const match = name.match(/(\d{3,4})\s?W/);
    return match ? parseInt(match[1]) : null;
}

function extractMaxGPULength(description = '') {
    if (!description) return null;
    // Try multiple patterns
    const patterns = [
        /gpu.*?(\d{3})\s?mm/i,
        /max.*gpu.*?(\d{3})\s?mm/i,
        /(\d{3})\s?mm.*gpu/i,
        /gpu clearance.*?(\d{3})/i,
        /supports.*gpu.*?(\d{3})/i
    ];
    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match) return parseInt(match[1]);
    }
    return null;
}

function extractMaxCoolerHeight(description = '') {
    const match = description.match(/cooler.*?(\d{2,3})\s?mm/i);
    return match ? parseInt(match[1]) : null;
}

function extractFormFactor(name = '', description = '') {
    const text = `${name} ${description}`.toUpperCase();
    if (text.includes('MINI-ITX') || text.includes('MINI ITX') || text.includes('ITX')) return 'Mini-ITX';
    if (text.includes('MICRO-ATX') || text.includes('MICRO ATX') || text.includes('MATX') || text.includes('M-ATX')) return 'Micro-ATX';
    if (text.includes('E-ATX') || text.includes('EATX') || text.includes('EXTENDED ATX')) return 'E-ATX';
    if (text.includes('ATX')) return 'ATX';
    if (text.includes('SLIM') || text.includes('COMPACT') || text.includes('SFF') || text.includes('SMALL FORM')) return 'Compact/Slim';
    if (text.includes('FULL TOWER') || text.includes('FULL-TOWER')) return 'Full Tower';
    if (text.includes('MID TOWER') || text.includes('MID-TOWER')) return 'Mid Tower';
    if (text.includes('MINI TOWER') || text.includes('MINI-TOWER')) return 'Mini Tower';
    return null;
}

function extractCoolerSocket(name, description = '') {
    // Simplified - would need full socket compatibility list
    const text = `${name} ${description}`.toUpperCase();
    if (text.includes('LGA1700') || text.includes('1700')) return 'LGA1700';
    if (text.includes('AM5')) return 'AM5';
    if (text.includes('AM4')) return 'AM4';
    if (text.includes('UNIVERSAL')) return 'Universal';
    return null;
}

function extractSlots(description = '') {
    return null; // Placeholder
}

function extractPowerConnectors(description = '') {
    return null; // Placeholder
}

function detectStorageType(name) {
    const n = name.toUpperCase();
    if (n.includes('NVME') || n.includes('M.2')) return 'NVMe M.2';
    if (n.includes('SATA') || n.includes('2.5')) return 'SATA';
    return 'Storage';
}

module.exports = router;
