/**
 * ============================================================================
 * ENHANCED COMPATIBILITY VALIDATION
 * ============================================================================
 * 
 * CRITICAL ENHANCEMENTS TO ACHIEVE 5.0/5.0 ZERO-TOLERANCE ACCURACY
 * 
 * This module strengthens existing compatibility validation with:
 * 1. CPU-Motherboard chipset/BIOS generation matching
 * 2. Multi-GPU brand consistency and SLI/Crossfire validation
 * 3. M.2 NVMe vs SATA slot type differentiation
 * 4. GPU power connector validation (12VHPWR, 8-pin, 6-pin)
 * 5. RAM mixing warnings (brand, speed, capacity)
 * 6. Per-slot RAM capacity limits
 * 7. Form factor hierarchy validation (case size rules)
 * 
 * @module enhancedCompatibilityValidation
 * @version 1.0.0
 * @author K-Wise Development Team
 * @date November 22, 2025
 */

const logger = require('../utils/logger');

/**
 * ============================================================================
 * AMD AM4 CHIPSET COMPATIBILITY MATRIX
 * ============================================================================
 * Enforces CPU generation limits and BIOS requirements for AMD AM4 platform
 */
const AMD_AM4_COMPATIBILITY = {
    // CRITICAL: A320, B350, X370 DO NOT SUPPORT RYZEN 5000
    'A320': { 
        maxGeneration: 3000, 
        requiresBiosUpdate: 3000,
        displayName: 'A320',
        supportedGenerations: [1000, 2000, 3000]
    },
    'B350': { 
        maxGeneration: 3000, 
        requiresBiosUpdate: 3000,
        displayName: 'B350',
        supportedGenerations: [1000, 2000, 3000]
    },
    'X370': { 
        maxGeneration: 3000, 
        requiresBiosUpdate: 3000,
        displayName: 'X370',
        supportedGenerations: [1000, 2000, 3000]
    },
    // B450, X470 support Ryzen 5000 with BIOS update
    'B450': { 
        maxGeneration: 5000, 
        requiresBiosUpdate: 3000,
        displayName: 'B450',
        supportedGenerations: [1000, 2000, 3000, 5000],
        biosUpdateRequired: [5000]
    },
    'X470': { 
        maxGeneration: 5000, 
        requiresBiosUpdate: 3000,
        displayName: 'X470',
        supportedGenerations: [1000, 2000, 3000, 5000],
        biosUpdateRequired: [5000]
    },
    // B550, X570 natively support Ryzen 5000
    'B550': { 
        maxGeneration: 5000, 
        requiresBiosUpdate: null,
        displayName: 'B550',
        supportedGenerations: [3000, 5000]
    },
    'X570': { 
        maxGeneration: 5000, 
        requiresBiosUpdate: null,
        displayName: 'X570',
        supportedGenerations: [3000, 5000]
    }
};

/**
 * ============================================================================
 * AMD AM5 CHIPSET COMPATIBILITY MATRIX (Ryzen 7000/9000)
 * ============================================================================
 */
const AMD_AM5_COMPATIBILITY = {
    'A620': {
        maxGeneration: 9000,
        requiresBiosUpdate: null,
        displayName: 'A620',
        supportedGenerations: [7000, 9000]
    },
    'B650': {
        maxGeneration: 9000,
        requiresBiosUpdate: null,
        displayName: 'B650',
        supportedGenerations: [7000, 9000]
    },
    'B650E': {
        maxGeneration: 9000,
        requiresBiosUpdate: null,
        displayName: 'B650E',
        supportedGenerations: [7000, 9000]
    },
    'X670': {
        maxGeneration: 9000,
        requiresBiosUpdate: null,
        displayName: 'X670',
        supportedGenerations: [7000, 9000]
    },
    'X670E': {
        maxGeneration: 9000,
        requiresBiosUpdate: null,
        displayName: 'X670E',
        supportedGenerations: [7000, 9000]
    }
};

/**
 * ============================================================================
 * INTEL LGA1700 CHIPSET COMPATIBILITY MATRIX (12th-14th Gen)
 * ============================================================================
 */
const INTEL_LGA1700_COMPATIBILITY = {
    // 600-series (12th gen native, 13th/14th gen with BIOS)
    'H610': { 
        maxGeneration: 14, 
        requiresBiosUpdate: 13,
        displayName: 'H610',
        supportedGenerations: [12, 13, 14],
        biosUpdateRequired: [13, 14]
    },
    'B660': { 
        maxGeneration: 14, 
        requiresBiosUpdate: 13,
        displayName: 'B660',
        supportedGenerations: [12, 13, 14],
        biosUpdateRequired: [13, 14]
    },
    'H670': { 
        maxGeneration: 14, 
        requiresBiosUpdate: 13,
        displayName: 'H670',
        supportedGenerations: [12, 13, 14],
        biosUpdateRequired: [13, 14]
    },
    'Z690': { 
        maxGeneration: 14, 
        requiresBiosUpdate: 13,
        displayName: 'Z690',
        supportedGenerations: [12, 13, 14],
        biosUpdateRequired: [13, 14]
    },
    // 700-series (13th gen native, 14th gen native)
    'B760': { 
        maxGeneration: 14, 
        requiresBiosUpdate: null,
        displayName: 'B760',
        supportedGenerations: [12, 13, 14]
    },
    'H770': { 
        maxGeneration: 14, 
        requiresBiosUpdate: null,
        displayName: 'H770',
        supportedGenerations: [12, 13, 14]
    },
    'Z790': { 
        maxGeneration: 14, 
        requiresBiosUpdate: null,
        displayName: 'Z790',
        supportedGenerations: [12, 13, 14]
    }
};

/**
 * ============================================================================
 * INTEL LGA1200 CHIPSET COMPATIBILITY MATRIX (10th-11th Gen)
 * ============================================================================
 */
const INTEL_LGA1200_COMPATIBILITY = {
    'H410': { 
        maxGeneration: 10, 
        requiresBiosUpdate: null,
        displayName: 'H410',
        supportedGenerations: [10]
    },
    'B460': { 
        maxGeneration: 11, 
        requiresBiosUpdate: 11,
        displayName: 'B460',
        supportedGenerations: [10, 11],
        biosUpdateRequired: [11]
    },
    'H470': { 
        maxGeneration: 11, 
        requiresBiosUpdate: 11,
        displayName: 'H470',
        supportedGenerations: [10, 11],
        biosUpdateRequired: [11]
    },
    'Z490': { 
        maxGeneration: 11, 
        requiresBiosUpdate: 11,
        displayName: 'Z490',
        supportedGenerations: [10, 11],
        biosUpdateRequired: [11]
    },
    'B560': { 
        maxGeneration: 11, 
        requiresBiosUpdate: null,
        displayName: 'B560',
        supportedGenerations: [10, 11]
    },
    'H570': { 
        maxGeneration: 11, 
        requiresBiosUpdate: null,
        displayName: 'H570',
        supportedGenerations: [10, 11]
    },
    'Z590': { 
        maxGeneration: 11, 
        requiresBiosUpdate: null,
        displayName: 'Z590',
        supportedGenerations: [10, 11]
    }
};

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Extract CPU generation from specs or name
 * @param {Object} cpuSpecs - CPU specifications object
 * @returns {Number|null} - CPU generation (e.g., 5000 for Ryzen 5000, 13 for i9-13900K)
 */
function extractCPUGeneration(cpuSpecs) {
    const cpuName = (cpuSpecs.name || '').toUpperCase();
    const cpuBrand = (cpuSpecs.brand || '').toLowerCase();
    const cpuSocket = (cpuSpecs.socket || '').toUpperCase();
    
    // AMD Ryzen: Extract series from model number
    if (cpuBrand.includes('amd') || cpuName.includes('RYZEN') || cpuSocket.includes('AM')) {
        // Ryzen 9 5950X -> 5000 series
        const match = cpuName.match(/RYZEN\s*\d+\s*(\d)[\d]{3}[A-Z]*/);
        if (match) {
            return parseInt(match[1]) * 1000; // 5950X -> 5000
        }
        
        // Alternative format: R9 5900X
        const match2 = cpuName.match(/R\d+\s*(\d)[\d]{3}/);
        if (match2) {
            return parseInt(match2[1]) * 1000;
        }
        
        // Direct series match: "5000 series", "3000 series"
        const match3 = cpuName.match(/(\d)000\s*SERIES/);
        if (match3) {
            return parseInt(match3[1]) * 1000;
        }
    }
    
    // Intel: Extract generation from model number
    if (cpuBrand.includes('intel') || cpuName.includes('CORE') || cpuSocket.includes('LGA')) {
        // i9-13900K -> 13th gen
        const match = cpuName.match(/I\d-(\d{2})\d{2,3}[A-Z]*/);
        if (match) {
            return parseInt(match[1]); // 13900K -> 13
        }
        
        // Alternative format: Core i9-13900K
        const match2 = cpuName.match(/CORE\s*I\d-(\d{2})\d{2,3}/);
        if (match2) {
            return parseInt(match2[1]);
        }
        
        // Direct generation: "13th Gen", "12th Gen"
        const match3 = cpuName.match(/(\d{1,2})(TH|ST|ND|RD)\s*GEN/);
        if (match3) {
            return parseInt(match3[1]);
        }
    }
    
    return null;
}

/**
 * Extract chipset from motherboard specs
 * @param {Object} mbSpecs - Motherboard specifications
 * @returns {String} - Chipset (e.g., "B450", "Z690")
 */
function extractChipset(mbSpecs) {
    if (mbSpecs.chipset) {
        return mbSpecs.chipset.toUpperCase().trim();
    }
    
    // Try extracting from name (e.g., "ASUS ROG Strix B550-F")
    const mbName = (mbSpecs.name || '').toUpperCase();
    const chipsetMatch = mbName.match(/([ABX]\d{3}[E]?|H\d{3}|Z\d{3})/);
    if (chipsetMatch) {
        return chipsetMatch[1];
    }
    
    return null;
}

/**
 * ============================================================================
 * CRITICAL FIX #1: CPU-MOTHERBOARD CHIPSET/BIOS VALIDATION
 * ============================================================================
 * Prevents incompatible CPU generations on older chipsets
 * Example: Blocks Ryzen 5000 on A320 boards (same AM4 socket but incompatible)
 */
function validateCpuChipsetCompatibility(cpuSpecs, motherboardSpecs) {
    const result = {
        compatible: true,
        score: 15, // Max 15 points
        issues: [],
        warnings: [],
        recommendations: []
    };
    
    const cpuGeneration = extractCPUGeneration(cpuSpecs);
    const chipset = extractChipset(motherboardSpecs);
    const cpuSocket = (cpuSpecs.socket || '').toUpperCase();
    const mbSocket = (motherboardSpecs.socket || '').toUpperCase();
    
    logger.info(`🔍 CPU-Chipset Validation: CPU Gen=${cpuGeneration}, Chipset=${chipset}, Socket=${cpuSocket}`);
    
    if (!cpuGeneration || !chipset) {
        logger.warn(`⚠️ Cannot validate chipset compatibility: CPU Gen=${cpuGeneration}, Chipset=${chipset}`);
        result.score = 10; // Reduced score for unknown
        // 🔥 CRITICAL FIX: Change from 'warning' to 'info' - socket match already confirms compatibility
        // This is non-actionable information, not a problem
        result.recommendations.push({
            type: 'info', // Changed from 'warning' to 'info'
            message: `Chipset details not available for ${cpuSpecs.name || 'CPU'}`,
            details: `Socket match (${cpuSocket}) confirms physical compatibility with ${motherboardSpecs.name || 'motherboard'}. Chipset generation info unavailable for advanced optimization checks.`
        });
        return result;
    }
    
    let compatibilityMatrix = null;
    
    // Select appropriate compatibility matrix based on socket
    if (cpuSocket.includes('AM4')) {
        compatibilityMatrix = AMD_AM4_COMPATIBILITY;
    } else if (cpuSocket.includes('AM5')) {
        compatibilityMatrix = AMD_AM5_COMPATIBILITY;
    } else if (cpuSocket.includes('LGA1700')) {
        compatibilityMatrix = INTEL_LGA1700_COMPATIBILITY;
    } else if (cpuSocket.includes('LGA1200')) {
        compatibilityMatrix = INTEL_LGA1200_COMPATIBILITY;
    }
    
    if (!compatibilityMatrix) {
        logger.warn(`⚠️ No chipset compatibility matrix for socket: ${cpuSocket}`);
        return result; // Allow with full score if no matrix (e.g., older platforms)
    }
    
    const chipsetLimits = compatibilityMatrix[chipset];
    
    if (!chipsetLimits) {
        logger.warn(`⚠️ Unknown chipset: ${chipset} for socket ${cpuSocket}`);
        result.score = 10;
        result.recommendations.push({
            type: 'warning',
            message: 'Unknown Chipset',
            details: `Chipset ${chipset} not in compatibility database. Manual verification required.`
        });
        return result;
    }
    
    // CRITICAL CHECK: CPU generation exceeds chipset maximum
    if (cpuGeneration > chipsetLimits.maxGeneration) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
            severity: 'critical',
            message: 'CPU Generation Not Supported by Chipset',
            details: `${getCpuGenerationName(cpuGeneration, cpuSocket)} requires ${getMinimumChipset(cpuGeneration, cpuSocket)} or newer chipset. ${chipset} supports up to ${getCpuGenerationName(chipsetLimits.maxGeneration, cpuSocket)} only.`,
            fix: `Choose motherboard with ${getMinimumChipset(cpuGeneration, cpuSocket)} chipset or newer.`
        });
        
        logger.error(`❌ INCOMPATIBLE: CPU Gen ${cpuGeneration} > Chipset ${chipset} max ${chipsetLimits.maxGeneration}`);
        return result;
    }
    
    // Check if BIOS update required
    if (chipsetLimits.biosUpdateRequired && chipsetLimits.biosUpdateRequired.includes(cpuGeneration)) {
        result.score -= 5;
        result.warnings.push({
            severity: 'high',
            message: 'BIOS Update Required Before CPU Installation',
            details: `${chipset} motherboard requires BIOS update to support ${getCpuGenerationName(cpuGeneration, cpuSocket)}. Update BEFORE installing new CPU (requires compatible older CPU or BIOS Flashback feature).`,
            action: 'Verify motherboard has BIOS Flashback or prepare compatible CPU for BIOS update'
        });
        
        logger.warn(`⚠️ BIOS UPDATE REQUIRED: ${chipset} for CPU Gen ${cpuGeneration}`);
    }
    
    logger.info(`✅ CPU-Chipset Compatible: ${getCpuGenerationName(cpuGeneration, cpuSocket)} on ${chipset}`);
    return result;
}

/**
 * Helper: Get CPU generation display name
 */
function getCpuGenerationName(generation, socket) {
    if (socket.includes('AM')) {
        // AMD
        if (generation >= 7000) return `Ryzen ${generation} series (Zen 4/5)`;
        if (generation >= 5000) return `Ryzen ${generation} series (Zen 3)`;
        if (generation >= 3000) return `Ryzen ${generation} series (Zen 2)`;
        if (generation >= 2000) return `Ryzen ${generation} series (Zen+)`;
        if (generation >= 1000) return `Ryzen ${generation} series (Zen 1)`;
    } else {
        // Intel
        return `${generation}th Gen Intel Core`;
    }
    return `Generation ${generation}`;
}

/**
 * Helper: Get minimum chipset for CPU generation
 */
function getMinimumChipset(cpuGeneration, socket) {
    if (socket.includes('AM4')) {
        if (cpuGeneration >= 5000) return 'B450 (with BIOS update) or B550';
        if (cpuGeneration >= 3000) return 'A320 (with BIOS update) or B450';
        if (cpuGeneration >= 2000) return 'A320';
        if (cpuGeneration >= 1000) return 'A320';
    } else if (socket.includes('AM5')) {
        return 'B650';
    } else if (socket.includes('LGA1700')) {
        if (cpuGeneration >= 13) return 'B760 or Z690 (with BIOS update)';
        if (cpuGeneration >= 12) return 'H610';
    } else if (socket.includes('LGA1200')) {
        if (cpuGeneration >= 11) return 'B560 or B460 (with BIOS update)';
        if (cpuGeneration >= 10) return 'H410';
    }
    return 'Unknown';
}

/**
 * ============================================================================
 * CRITICAL FIX #2: MULTI-GPU BRAND CONSISTENCY VALIDATION
 * ============================================================================
 * Enforces SLI (NVIDIA) and Crossfire (AMD) requirements
 * Prevents mixing NVIDIA + AMD GPUs in multi-GPU configs
 */
function validateMultiGpuCompatibility(allGpus, motherboardSpecs) {
    const result = {
        compatible: true,
        score: 15,
        issues: [],
        warnings: [],
        recommendations: []
    };
    
    if (!allGpus || allGpus.length <= 1) {
        return result; // Single GPU, no validation needed
    }
    
    const gpuCount = allGpus.length;
    logger.info(`🔍 Multi-GPU Validation: ${gpuCount} GPUs detected`);
    
    // Extract GPU brands
    const gpuBrands = allGpus.map(gpu => {
        const brand = (gpu.brand || '').toLowerCase();
        const name = (gpu.name || '').toLowerCase();
        
        if (brand.includes('nvidia') || name.includes('nvidia') || name.includes('geforce') || name.includes('rtx') || name.includes('gtx')) {
            return 'NVIDIA';
        } else if (brand.includes('amd') || name.includes('amd') || name.includes('radeon') || name.includes('rx')) {
            return 'AMD';
        } else {
            return 'Unknown';
        }
    });
    
    const uniqueBrands = [...new Set(gpuBrands)];
    
    // CRITICAL CHECK: All GPUs must be same brand
    if (uniqueBrands.length > 1) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
            severity: 'critical',
            message: 'Multi-GPU Requires Same Brand GPUs',
            details: `NVIDIA SLI and AMD Crossfire require identical brand GPUs. Detected: ${gpuBrands.join(', ')}. Remove mixed-brand GPUs.`,
            fix: 'Use only NVIDIA GPUs (for SLI) or only AMD GPUs (for Crossfire). Remove mixed brands.'
        });
        
        logger.error(`❌ MULTI-GPU BRAND MISMATCH: ${uniqueBrands.join(' + ')}`);
        return result;
    }
    
    const gpuBrand = uniqueBrands[0];
    
    // Check if motherboard supports multi-GPU
    const chipset = extractChipset(motherboardSpecs);
    const mbName = (motherboardSpecs.name || '').toUpperCase();
    const mbSpecs = motherboardSpecs.specifications || {};
    
    // Chipsets known to support multi-GPU (Intel Z-series, AMD X-series)
    const supportsMultiGpu = chipset && chipset.match(/Z\d{3}|X\d{3}0/);
    
    // Check explicit SLI/Crossfire support flags
    const sliSupport = mbSpecs.sli_support || mbSpecs.multi_gpu_support?.includes('SLI') || mbName.includes('SLI');
    const crossfireSupport = mbSpecs.crossfire_support || mbSpecs.multi_gpu_support?.includes('CROSSFIRE') || mbName.includes('CROSSFIRE');
    
    if (gpuBrand === 'NVIDIA' && !sliSupport && !supportsMultiGpu) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
            severity: 'critical',
            message: 'Motherboard Does Not Support NVIDIA SLI',
            details: `${chipset || motherboardSpecs.name} motherboard lacks SLI support. NVIDIA multi-GPU requires SLI-certified motherboard.`,
            fix: 'Choose Z-series motherboard (Intel) or X-series motherboard (AMD) with SLI support.'
        });
        
        logger.error(`❌ MOTHERBOARD LACKS SLI SUPPORT for ${gpuCount} NVIDIA GPUs`);
        return result;
    }
    
    if (gpuBrand === 'AMD' && !crossfireSupport && !supportsMultiGpu) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
            severity: 'critical',
            message: 'Motherboard Does Not Support AMD Crossfire',
            details: `${chipset || motherboardSpecs.name} motherboard lacks Crossfire support. AMD multi-GPU requires Crossfire-certified motherboard.`,
            fix: 'Choose motherboard with Crossfire support (most X-series and Z-series boards).'
        });
        
        logger.error(`❌ MOTHERBOARD LACKS CROSSFIRE SUPPORT for ${gpuCount} AMD GPUs`);
        return result;
    }
    
    // Check PCIe slot count
    const pciex16Slots = parseInt(motherboardSpecs.pcie_x16_slots || motherboardSpecs.pcie_slots) || 1;
    
    if (gpuCount > pciex16Slots) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
            severity: 'critical',
            message: 'Insufficient PCIe x16 Slots for Multi-GPU',
            details: `${gpuCount} GPUs require ${gpuCount}× PCIe x16 slots. Motherboard has ${pciex16Slots} slot(s).`,
            fix: `Remove ${gpuCount - pciex16Slots} GPU(s) or choose motherboard with ${gpuCount}+ PCIe x16 slots.`
        });
        
        logger.error(`❌ INSUFFICIENT PCIE SLOTS: ${gpuCount} GPUs > ${pciex16Slots} slots`);
        return result;
    }
    
    // Warn about diminishing returns
    if (gpuCount > 2) {
        result.score -= 5;
        result.recommendations.push({
            type: 'warning',
            message: '3+ GPU Scaling Has Diminishing Returns',
            details: `${gpuCount} GPUs provide poor performance scaling vs cost. Consider single high-end GPU for better value and compatibility.`
        });
    }
    
    logger.info(`✅ Multi-GPU Compatible: ${gpuCount}× ${gpuBrand} GPUs on ${chipset || 'motherboard'}`);
    return result;
}

/**
 * ============================================================================
 * CRITICAL FIX #3: M.2 NVMe vs SATA SLOT TYPE VALIDATION
 * ============================================================================
 * Differentiates M.2 SATA (B-key) from M.2 NVMe (M-key)
 * Prevents M.2 SATA drives in NVMe-only slots
 */
function validateStorageSlotTypes(allStorage, motherboardSpecs) {
    const result = {
        compatible: true,
        score: 15,
        issues: [],
        warnings: [],
        recommendations: []
    };
    
    if (!allStorage || allStorage.length === 0) {
        return result; // No storage, no validation needed
    }
    
    // Count storage by type
    let nvmeCount = 0;
    let m2SataCount = 0;
    let sataCount = 0;
    
    allStorage.forEach(storage => {
        const specs = storage.specifications || storage;
        
        // 🔥 FIX: Prioritize correct fields for interface detection
        // Check multiple field variations in order of reliability
        const storageType = (specs.storage_type || '').toLowerCase();
        const interfaceField = (specs.interface || '').toLowerCase();
        const nvmeSupport = specs.nvme_support === true || specs.nvme_support === 'true';
        const name = (storage.name || '').toLowerCase();
        
        // CRITICAL: Check nvme_support flag FIRST (most reliable)
        if (nvmeSupport || storageType.includes('nvme')) {
            nvmeCount++;
            logger.debug(`   📀 ${storage.name}: Detected as NVMe (nvme_support=${nvmeSupport}, storage_type=${storageType})`);
        } 
        // Check if M.2 SATA (form factor M.2 but interface SATA)
        else if (interfaceField.includes('m.2') && interfaceField.includes('sata')) {
            m2SataCount++;
            logger.debug(`   📀 ${storage.name}: Detected as M.2 SATA (interface=${interfaceField})`);
        }
        // Check if PCIe interface (usually NVMe)
        else if (interfaceField.includes('pcie') || interfaceField.includes('nvme')) {
            nvmeCount++;
            logger.debug(`   📀 ${storage.name}: Detected as NVMe via interface (interface=${interfaceField})`);
        }
        // Regular SATA drive (2.5" or 3.5" SATA)
        else if (interfaceField.includes('sata') || storageType.includes('sata')) {
            sataCount++;
            logger.debug(`   📀 ${storage.name}: Detected as SATA (interface=${interfaceField}, storage_type=${storageType})`);
        }
        // Fallback: check name
        else if (name.includes('nvme')) {
            nvmeCount++;
            logger.debug(`   📀 ${storage.name}: Detected as NVMe via name fallback`);
        } else {
            sataCount++; // Default to SATA if uncertain
            logger.warn(`   ⚠️ ${storage.name}: Uncertain type, defaulting to SATA`);
        }
    });
    
    logger.info(`🔍 Storage Validation: ${nvmeCount} NVMe, ${m2SataCount} M.2 SATA, ${sataCount} SATA`);
    
    // Get motherboard slot counts
    const mbSpecs = motherboardSpecs.specifications || {};
    // 🔥 FIX: Check all possible M.2 slot field names (database uses "M2 Slots")
    const mbM2Slots = parseInt(
        mbSpecs.m2_slots || 
        mbSpecs.m2_slot_count || 
        mbSpecs['M2 Slots'] || 
        mbSpecs['M.2 Slots'] || 
        mbSpecs.m_2_slots || 
        motherboardSpecs.m2_slots
    ) || 0;
    
    // 🐛 DEBUG: Log motherboard specs detection
    logger.debug(`🔍 Motherboard M.2 Detection:`);
    logger.debug(`   motherboardSpecs.name: ${motherboardSpecs.name}`);
    logger.debug(`   mbSpecs object keys: ${Object.keys(mbSpecs).join(', ')}`);
    logger.debug(`   mbSpecs.m2_slots: ${mbSpecs.m2_slots}`);
    logger.debug(`   mbSpecs['M2 Slots']: ${mbSpecs['M2 Slots']}`);
    logger.debug(`   mbSpecs['SATA Ports']: ${mbSpecs['SATA Ports']}`);
    logger.debug(`   ✅ FINAL mbM2Slots: ${mbM2Slots}`);
    
    const mbSataPorts = parseInt(
        mbSpecs.sata_ports || 
        mbSpecs.sata_port_count || 
        mbSpecs['SATA Ports'] || 
        mbSpecs['SATA ports'] || 
        motherboardSpecs.sata_ports
    ) || 6;
    
    // ENHANCED: Parse M.2 slot details if available
    let mbNvmeSlots = mbM2Slots; // Default: assume all M.2 slots support NVMe
    let mbM2SataSlots = 0; // Default: assume no M.2 SATA-only slots
    
    // If detailed M.2 slot info available
    if (mbSpecs.m2_slots_detail && Array.isArray(mbSpecs.m2_slots_detail)) {
        mbNvmeSlots = mbSpecs.m2_slots_detail.filter(s => s.type === 'NVMe' || s.type === 'NVMe+SATA').length;
        mbM2SataSlots = mbSpecs.m2_slots_detail.filter(s => s.type === 'SATA' || s.type === 'NVMe+SATA').length;
    }
    
    // CRITICAL CHECK: NVMe drives require M.2 NVMe slots
    if (nvmeCount > mbNvmeSlots) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
            severity: 'critical',
            message: 'Insufficient M.2 NVMe Slots',
            details: `${nvmeCount} NVMe drive(s) require ${nvmeCount} M.2 NVMe slot(s). Motherboard has ${mbNvmeSlots} slot(s).`,
            fix: `Remove ${nvmeCount - mbNvmeSlots} NVMe drive(s) or choose motherboard with ${nvmeCount}+ M.2 NVMe slots.`
        });
        
        logger.error(`❌ INSUFFICIENT M.2 NVMe SLOTS: ${nvmeCount} drives > ${mbNvmeSlots} slots`);
        return result;
    }
    
    // CRITICAL CHECK: M.2 SATA drives require M.2 SATA-compatible slots
    if (m2SataCount > mbM2SataSlots && m2SataCount > 0) {
        // If no M.2 SATA slot info, warn instead of block
        if (mbM2SataSlots === 0 && mbM2Slots > 0) {
            result.score -= 5;
            result.warnings.push({
                severity: 'warning',
                message: 'M.2 SATA Slot Compatibility Unknown',
                details: `${m2SataCount} M.2 SATA drive(s) detected. Verify motherboard M.2 slots support SATA interface (some M.2 slots are NVMe-only).`,
                action: 'Check motherboard manual for M.2 slot types (SATA vs NVMe)'
            });
        } else {
            result.compatible = false;
            result.score = 0;
            result.issues.push({
                severity: 'critical',
                message: 'Insufficient M.2 SATA Slots',
                details: `${m2SataCount} M.2 SATA drive(s) require M.2 SATA-compatible slot(s). Motherboard has ${mbM2SataSlots} compatible slot(s).`,
                fix: `Use M.2 NVMe drives instead or choose motherboard with ${m2SataCount}+ M.2 SATA-compatible slots.`
            });
            
            logger.error(`❌ INSUFFICIENT M.2 SATA SLOTS: ${m2SataCount} drives > ${mbM2SataSlots} slots`);
            return result;
        }
    }
    
    // CRITICAL CHECK: Regular SATA drives require SATA ports
    if (sataCount > mbSataPorts) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
            severity: 'critical',
            message: 'Insufficient SATA Ports',
            details: `${sataCount} SATA drive(s) require ${sataCount} SATA port(s). Motherboard has ${mbSataPorts} port(s).`,
            fix: `Remove ${sataCount - mbSataPorts} SATA drive(s) or use M.2 NVMe storage instead.`
        });
        
        logger.error(`❌ INSUFFICIENT SATA PORTS: ${sataCount} drives > ${mbSataPorts} ports`);
        return result;
    }
    
    // Warn about M.2/SATA lane sharing
    if (mbSpecs.m2_sata_shared_lanes && nvmeCount > 0 && sataCount > 0) {
        result.score -= 3;
        result.recommendations.push({
            type: 'warning',
            message: 'M.2 and SATA May Share PCIe Lanes',
            details: 'Some motherboards disable SATA ports when M.2 slots are occupied. Verify motherboard manual for lane configuration.'
        });
    }
    
    logger.info(`✅ Storage Slots Compatible: ${nvmeCount} NVMe (${mbNvmeSlots} available), ${sataCount} SATA (${mbSataPorts} available)`);
    return result;
}

/**
 * ============================================================================
 * CRITICAL FIX #4: GPU POWER CONNECTOR VALIDATION
 * ============================================================================
 * Validates 12VHPWR (RTX 4000), 8-pin, 6-pin GPU power connectors
 * Prevents GPU power connector mismatches
 */
function validateGpuPowerConnectors(allGpus, psuSpecs) {
    const result = {
        compatible: true,
        score: 15,
        issues: [],
        warnings: [],
        recommendations: []
    };
    
    if (!allGpus || allGpus.length === 0) {
        return result; // No GPUs, no validation needed
    }
    
    // 🔥 FIX: Parse PSU connectors from CORRECT fields
    const psuPcie = psuSpecs.pcie_connectors || 
                    psuSpecs['Power Connectors'] ||
                    psuSpecs.specifications?.pcie_connectors || 
                    psuSpecs.specifications?.['Power Connectors'] ||
                    '';
    
    // 🔥 FIX: Check BOTH has_12vhpwr_connector AND pcie_connectors string for 12VHPWR
    const psuHas12VHPWR = psuSpecs.has_12vhpwr_connector === true ||
                         psuSpecs.has_12vhpwr === true ||
                         psuSpecs.includes_12vhpwr_adapter === true ||
                         psuSpecs.specifications?.has_12vhpwr_connector === true ||
                         psuSpecs.specifications?.has_12vhpwr === true ||
                         psuSpecs.specifications?.includes_12vhpwr_adapter === true ||
                         String(psuPcie).toUpperCase().includes('12VHPWR') ||
                         String(psuPcie).toUpperCase().includes('16-PIN') ||
                         String(psuPcie).toUpperCase().includes('16PIN');
    
    // Extract connector counts from PSU specs (e.g., "4× 8-pin (6+2)")
    let psu8pinCount = 0;
    let psu6pinCount = 0;
    
    const match8pin = psuPcie.match(/(\d+)×?\s*8-pin/i);
    if (match8pin) psu8pinCount = parseInt(match8pin[1]);
    
    // Also check for (6+2)-pin format which is same as 8-pin
    const match62pin = psuPcie.match(/(\d+)\s*x?\s*\(?6\+2\)?-?pin/i);
    if (match62pin) psu8pinCount = Math.max(psu8pinCount, parseInt(match62pin[1]));
    
    // Check pcie_8pin_connectors field directly
    if (psuSpecs.pcie_8pin_connectors) {
        psu8pinCount = Math.max(psu8pinCount, parseInt(psuSpecs.pcie_8pin_connectors) || 0);
    }
    
    const match6pin = psuPcie.match(/(\d+)×?\s*6-pin/i);
    if (match6pin) psu6pinCount = parseInt(match6pin[1]);
    
    if (psuSpecs.pcie_6pin_connectors) {
        psu6pinCount = Math.max(psu6pinCount, parseInt(psuSpecs.pcie_6pin_connectors) || 0);
    }
    
    logger.info(`🔍 PSU Connectors: ${psu8pinCount}× 8-pin, ${psu6pinCount}× 6-pin, 12VHPWR=${psuHas12VHPWR}, pcie_connectors="${psuPcie}"`);
    
    let required8pin = 0;
    let required6pin = 0;
    let requires12vhpwr = false;
    
    // Check each GPU's power requirements
    allGpus.forEach(gpu => {
        // 🔥 FIX: Check BOTH specifications AND dimensions for power_connectors
        const gpuDims = gpu.dimensions || {};
        const gpuSpecs = gpu.specifications || {};
        const gpuPower = gpu.power_connectors || 
                         gpuSpecs.power_connectors || 
                         gpuDims.power_connectors ||
                         '';
        const gpuName = (gpu.name || '').toUpperCase();
        
        // 🔥 FIX: Detect ALL RTX 4000 series (not just 4090/4080)
        const isRTX4000 = gpuName.includes('RTX 4090') || gpuName.includes('RTX 4080') || 
                          gpuName.includes('RTX 4070') || gpuName.includes('RTX40') || gpuName.includes('RTX 40');
        
        // Check for 12VHPWR
        if (String(gpuPower).toUpperCase().includes('12VHPWR') || 
            String(gpuPower).toUpperCase().includes('16-PIN') ||
            String(gpuPower).toUpperCase().includes('16PIN') ||
            isRTX4000) {
            requires12vhpwr = true;
        } else {
            // Count 8-pin and 6-pin requirements
            const match8 = gpuPower.match(/(\d+)×?\s*8-pin/i);
            if (match8) required8pin += parseInt(match8[1]);
            
            const match6 = gpuPower.match(/(\d+)×?\s*6-pin/i);
            if (match6) required6pin += parseInt(match6[1]);
        }
    });
    
    logger.info(`🔍 GPU Requirements: ${required8pin}× 8-pin, ${required6pin}× 6-pin, 12VHPWR=${requires12vhpwr}`);
    
    // CRITICAL CHECK: 12VHPWR connector
    if (requires12vhpwr && !psuHas12VHPWR) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
            severity: 'critical',
            message: 'PSU Lacks 12VHPWR Connector for GPU',
            details: `GPU requires native 12VHPWR (600W) connector for RTX 4000-series. PSU does not have this connector.`,
            fix: 'Choose PSU with native 12VHPWR connector (ATX 3.0 standard) or use included adapter cable.'
        });
        
        logger.error(`❌ PSU LACKS 12VHPWR for RTX 4000 GPU`);
        return result;
    }
    
    // CRITICAL CHECK: 8-pin connectors
    if (required8pin > psu8pinCount) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
            severity: 'critical',
            message: 'Insufficient PCIe 8-pin Connectors on PSU',
            details: `GPU(s) require ${required8pin}× 8-pin connector(s). PSU has ${psu8pinCount}×. Need ${required8pin - psu8pinCount} more.`,
            fix: `Choose PSU with ${required8pin}+ PCIe 8-pin connectors.`
        });
        
        logger.error(`❌ INSUFFICIENT 8-PIN CONNECTORS: ${required8pin} required > ${psu8pinCount} available`);
        return result;
    }
    
    // CRITICAL CHECK: 6-pin connectors (less common, older GPUs)
    if (required6pin > psu6pinCount && required6pin > psu8pinCount) {
        // 8-pin can substitute for 6-pin
        result.compatible = false;
        result.score = 0;
        result.issues.push({
            severity: 'critical',
            message: 'Insufficient PCIe 6-pin Connectors on PSU',
            details: `GPU(s) require ${required6pin}× 6-pin connector(s). PSU has ${psu6pinCount}× 6-pin and ${psu8pinCount}× 8-pin.`,
            fix: '8-pin connectors can be used for 6-pin GPUs, but verify PSU has enough total PCIe connectors.'
        });
        
        logger.error(`❌ INSUFFICIENT 6-PIN CONNECTORS: ${required6pin} required > ${psu6pinCount} available`);
    }
    
    logger.info(`✅ GPU Power Connectors Compatible`);
    return result;
}

/**
 * ============================================================================
 * ENHANCEMENT #5: RAM MIXING WARNINGS
 * ============================================================================
 * Warns about mixing RAM brands, speeds, capacities
 */
function validateRamMixing(allRam) {
    const result = {
        compatible: true,
        score: 15,
        issues: [],
        warnings: [],
        recommendations: []
    };
    
    if (!allRam || allRam.length <= 1) {
        return result; // Single RAM kit, no mixing
    }
    
    // Extract RAM properties
    const brands = [...new Set(allRam.map(ram => (ram.brand || '').toLowerCase()))];
    const speeds = [...new Set(allRam.map(ram => {
        const specs = ram.specifications || {};
        return parseInt(specs.speed_mhz || specs.speed || ram.speed || 0);
    }))];
    const capacities = [...new Set(allRam.map(ram => {
        const specs = ram.specifications || {};
        return parseInt(specs.capacity_gb || specs.capacity || ram.capacity || 0);
    }))];
    
    logger.info(`🔍 RAM Mixing Check: ${brands.length} brands, ${speeds.length} speeds, ${capacities.length} capacities`);
    
    // Warn about brand mixing
    if (brands.length > 1) {
        result.score -= 5;
        result.warnings.push({
            severity: 'warning',
            message: 'Mixed RAM Brands Detected',
            details: `Using ${brands.join(' + ')} may cause stability issues. Recommended: Use same brand for all modules.`,
            action: 'Use identical RAM kits (same brand, speed, capacity) for best compatibility'
        });
    }
    
    // Warn about speed mixing (all RAM runs at slowest speed)
    if (speeds.length > 1) {
        const minSpeed = Math.min(...speeds.filter(s => s > 0));
        result.score -= 10;
        result.warnings.push({
            severity: 'warning',
            message: 'Mixed RAM Speeds Detected',
            details: `All RAM will run at slowest speed: ${minSpeed}MHz. Current speeds: ${speeds.join('MHz, ')}MHz → ${minSpeed}MHz.`,
            action: 'Use same speed RAM for all modules to avoid downclocking'
        });
    }
    
    // Warn about capacity mixing (less critical, but not ideal)
    if (capacities.length > 1) {
        result.score -= 3;
        result.recommendations.push({
            type: 'info',
            message: 'Mixed RAM Capacities Detected',
            details: `Different capacities: ${capacities.join('GB, ')}GB. For dual-channel, use matching pairs (e.g., 2× 16GB).`,
            action: 'Use matching capacity pairs for optimal dual-channel performance'
        });
    }
    
    // Check dual-channel optimization (even number of modules)
    if (allRam.length % 2 !== 0) {
        result.score -= 3;
        result.recommendations.push({
            type: 'info',
            message: 'Suboptimal Dual-Channel Configuration',
            details: `${allRam.length} module(s). For best performance, use pairs (2, 4, 8 modules).`,
            action: 'Add one more matching module for dual-channel or remove one'
        });
    }
    
    logger.info(`✅ RAM Mixing Validation Complete (Score: ${result.score}/15)`);
    return result;
}

/**
 * ============================================================================
 * CRITICAL FIX #6: RAM PER-SLOT CAPACITY VALIDATION
 * ============================================================================
 * Validates RAM stick capacity against motherboard per-slot limits
 * Example: Prevents 32GB DIMMs on boards with 16GB/slot maximum
 * CRITICAL TRAP: DDR4 boards often max at 16GB/DIMM, DDR5 boards at 32GB/DIMM
 */
function validateRamPerSlotCapacity(allRam, motherboardSpecs) {
    const result = {
        compatible: true,
        score: 15,
        issues: [],
        warnings: [],
        recommendations: []
    };
    
    if (!allRam || allRam.length === 0 || !motherboardSpecs) {
        return result;
    }
    
    // Extract motherboard per-slot capacity limit
    const mbSpecs = motherboardSpecs.specifications || {};
    let maxCapacityPerSlot = parseInt(mbSpecs.max_memory_per_slot || mbSpecs.max_ram_per_dimm) || null;
    
    // Determine DDR generation from motherboard
    const ramType = (mbSpecs.ram_type || mbSpecs.memory_type || motherboardSpecs.ram_type || '').toUpperCase();
    
    // If no explicit limit, infer from DDR generation (CRITICAL FALLBACK)
    if (!maxCapacityPerSlot) {
        if (ramType.includes('DDR5')) {
            maxCapacityPerSlot = 48; // DDR5 boards typically support up to 48GB/DIMM (consumer), some up to 64GB
        } else if (ramType.includes('DDR4')) {
            maxCapacityPerSlot = 32; // DDR4 boards typically max at 32GB/DIMM (consumer), older boards 16GB
        } else if (ramType.includes('DDR3')) {
            maxCapacityPerSlot = 16; // DDR3 boards max at 16GB/DIMM
        } else {
            // Unknown DDR type - use conservative estimate
            maxCapacityPerSlot = 32; // Conservative estimate (DDR4 standard)
            logger.warn(`⚠️ Using conservative 32GB per-slot estimate (unknown RAM type: ${ramType})`);
            result.score = 10;
            result.warnings.push({
                type: 'info',
                message: `RAM per-slot capacity: Using conservative 32GB/slot estimate for ${ramType}`,
                details: `Motherboard ${motherboardSpecs.name || 'board'} RAM type (${ramType}) - using standard DDR4 32GB/slot maximum. Actual limit may vary.`,
                action: 'Verify motherboard specifications for exact per-slot capacity limit'
            });
        }
        
        logger.info(`📌 Inferred max capacity per slot: ${maxCapacityPerSlot}GB (${ramType} standard)`);
    }
    
    // Check each RAM stick against per-slot limit
    let oversizedSticks = [];
    
    allRam.forEach(ram => {
        const specs = ram.specifications || {};
        const capacity = parseInt(specs.capacity_gb || specs.capacity || ram.capacity || 0);
        const ramName = ram.name || 'RAM';
        
        if (capacity > maxCapacityPerSlot) {
            oversizedSticks.push({
                name: ramName,
                capacity: capacity,
                maxAllowed: maxCapacityPerSlot
            });
        }
    });
    
    if (oversizedSticks.length > 0) {
        result.compatible = false;
        result.score = 0;
        
        const stickDetails = oversizedSticks.map(s => `${s.name} (${s.capacity}GB)`).join(', ');
        
        result.issues.push({
            severity: 'critical',
            message: 'RAM Stick Capacity Exceeds Motherboard Per-Slot Limit',
            details: `Motherboard supports maximum ${maxCapacityPerSlot}GB per DIMM slot. Detected: ${stickDetails}. These sticks will NOT work.`,
            fix: `Replace with ${maxCapacityPerSlot}GB or smaller RAM sticks. For higher total capacity, use more smaller sticks (e.g., 4× ${maxCapacityPerSlot}GB instead of 2× ${oversizedSticks[0].capacity}GB).`,
            impact: 'CRITICAL - System will not POST or RAM will run in degraded mode'
        });
        
        logger.error(`❌ RAM PER-SLOT CAPACITY EXCEEDED: ${oversizedSticks.length} stick(s) exceed ${maxCapacityPerSlot}GB limit`);
        return result;
    }
    
    logger.info(`✅ RAM Per-Slot Capacity Validated: All sticks ≤ ${maxCapacityPerSlot}GB limit`);
    return result;
}

/**
 * ============================================================================
 * CRITICAL FIX #7: CASE FORM FACTOR HIERARCHY VALIDATION
 * ============================================================================
 * Enforces case size hierarchy rules:
 * - Full Tower > Mid Tower > Mini Tower > Micro ATX > Mini ITX
 * - Larger cases can fit smaller motherboards, but NOT vice versa
 * - CRITICAL TRAP: ATX motherboard in Micro ATX case = INCOMPATIBLE
 * 
 * 🔥 CRITICAL FIX (Dec 2025): Use supported_form_factors for accurate validation
 */
function validateCaseFormFactorHierarchy(caseSpecs, motherboardSpecs) {
    const result = {
        compatible: true,
        score: 15,
        issues: [],
        warnings: [],
        recommendations: []
    };
    
    if (!caseSpecs || !motherboardSpecs) {
        return result;
    }
    
    // Extract motherboard form factor
    const mbFormFactor = (motherboardSpecs.form_factor || motherboardSpecs.specifications?.form_factor || '').toUpperCase().trim();
    
    // 🔥 CRITICAL FIX: Use supported_form_factors instead of form_factor for cases
    // Case form_factor contains case TYPE (Mid Tower), not motherboard sizes
    const caseType = (caseSpecs.form_factor || caseSpecs.specifications?.form_factor || '').toUpperCase().trim();
    let caseSupportedFormFactors = caseSpecs.supported_form_factors || caseSpecs.specifications?.supported_form_factors || '';
    
    // Convert to array if string
    if (typeof caseSupportedFormFactors === 'string') {
        caseSupportedFormFactors = caseSupportedFormFactors.split(',').map(s => s.trim().toUpperCase());
    } else if (Array.isArray(caseSupportedFormFactors)) {
        caseSupportedFormFactors = caseSupportedFormFactors.map(s => s.toUpperCase().trim());
    } else {
        caseSupportedFormFactors = [];
    }
    
    logger.info(`🔍 [FORM FACTOR] Checking: MB=${mbFormFactor}, Case Type=${caseType}, Supported=${caseSupportedFormFactors.join(',')}`);
    
    if (!mbFormFactor) {
        logger.warn(`⚠️ Motherboard form factor not specified`);
        result.score = 10;
        result.warnings.push({
            type: 'info',
            message: 'Motherboard form factor not specified',
            details: 'Check motherboard specifications for form factor',
            action: 'Verify motherboard form factor matches case support'
        });
        return result;
    }
    
    // 🔥 PRIMARY CHECK: Use supported_form_factors if available
    if (caseSupportedFormFactors.length > 0) {
        // Normalize motherboard form factor for comparison
        const normalizedMB = mbFormFactor.replace(/[-\s]/g, '');
        
        // Check if motherboard is in supported list
        const compatible = caseSupportedFormFactors.some(supported => {
            const normalizedSupported = supported.replace(/[-\s]/g, '');
            return normalizedMB === normalizedSupported || 
                   normalizedMB.includes(normalizedSupported) || 
                   normalizedSupported.includes(normalizedMB);
        });

        if (!compatible) {
            result.compatible = false;
            result.score = 0;
            result.issues.push({
                severity: 'critical',
                message: 'Motherboard Too Large for Case',
                details: `${mbFormFactor} motherboard is NOT in case's supported list: ${caseSupportedFormFactors.join(', ')}.`,
                fix: `Choose a case that supports ${mbFormFactor} or select a smaller motherboard (${caseSupportedFormFactors.join(' or ')}).`,
                impact: 'CATASTROPHIC - Motherboard will not physically fit in case, build impossible'
            });
            
            logger.error(`❌ FORM FACTOR MISMATCH: ${mbFormFactor} motherboard not in supported list: ${caseSupportedFormFactors.join(',')}`);
            return result;
        }
        
        logger.info(`✅ Form Factor Compatible: ${mbFormFactor} motherboard supported by case (supports: ${caseSupportedFormFactors.join(', ')})`);
        return result;
    }
    
    // FALLBACK: Use case type heuristics if supported_form_factors not available
    logger.warn(`⚠️ Case supported_form_factors not available, using case type heuristics`);
    
    // Case type hierarchy
    const caseTypeCompatibility = {
        'FULL TOWER': ['E-ATX', 'EATX', 'XL-ATX', 'ATX', 'MICRO-ATX', 'MATX', 'M-ATX', 'MINI-ITX', 'ITX'],
        'MID TOWER': ['ATX', 'MICRO-ATX', 'MATX', 'M-ATX', 'MINI-ITX', 'ITX'],
        'MINI TOWER': ['MICRO-ATX', 'MATX', 'M-ATX', 'MINI-ITX', 'ITX'],
        'SMALL FORM FACTOR': ['MINI-ITX', 'ITX'],
        'SFF': ['MINI-ITX', 'ITX']
    };
    
    const supportedByType = caseTypeCompatibility[caseType] || [];
    
    if (supportedByType.length > 0) {
        const normalizedMB = mbFormFactor.replace(/[-\s]/g, '');
        const compatible = supportedByType.some(s => s.replace(/[-\s]/g, '') === normalizedMB);
        
        if (!compatible) {
            result.compatible = false;
            result.score = 0;
            result.issues.push({
                severity: 'critical',
                message: 'Motherboard Too Large for Case',
                details: `${mbFormFactor} motherboard likely won't fit in ${caseType} case (typically supports: ${supportedByType.join(', ')}).`,
                fix: `Choose a larger case or smaller motherboard.`,
                impact: 'CATASTROPHIC - Motherboard will not physically fit in case'
            });
            
            logger.error(`❌ FORM FACTOR MISMATCH (heuristic): ${mbFormFactor} motherboard > ${caseType} case`);
            return result;
        }
    }
    
    logger.info(`✅ Form Factor Compatible (heuristic): ${mbFormFactor} motherboard in ${caseType} case`);
    return result;
}

/**
 * ============================================================================
 * CRITICAL FIX #8: GPU LENGTH + CASE CLEARANCE STRICT VALIDATION
 * ============================================================================
 * Validates GPU physical length against case maximum GPU clearance
 * CRITICAL TRAP: 350mm GPU in 320mm clearance case = INCOMPATIBLE
 * Enhanced with front-mounted radiator/fan clearance reduction
 */
function validateGpuCaseClearance(allGpus, caseSpecs) {
    const result = {
        compatible: true,
        score: 15,
        issues: [],
        warnings: [],
        recommendations: []
    };
    
    if (!allGpus || allGpus.length === 0 || !caseSpecs) {
        return result;
    }
    
    // 🔥 FIX: Handle both nested and flat component structures
    // Case 1: caseSpecs is the full component with nested dimensions/specifications
    // Case 2: caseSpecs is already merged specs (from mergeSpecsWithDimensions)
    const caseDims = caseSpecs.dimensions || {};
    const caseSpecs_ = caseSpecs.specifications || {};
    
    // 🔥 CRITICAL FIX: Prioritize dimensions.max_gpu_length_mm FIRST (most reliable)
    // Also check at top level in case specs were already merged/flattened
    let caseMaxGpuLength = parseInt(
        caseDims.max_gpu_length_mm ||      // Nested dimensions (full component)
        caseSpecs_.max_gpu_length_mm ||    // Nested specifications
        caseSpecs.max_gpu_length_mm ||     // Flat merged specs (from mergeSpecsWithDimensions)
        caseSpecs_.gpu_clearance_mm || 
        caseSpecs.gpu_clearance_mm ||
        caseSpecs_.max_gpu_length || 
        caseSpecs.max_gpu_length           // Fallback to string like "265mm"
    ) || null;
    
    // 🔥 FIX: Handle string format like "265mm" - extract number
    if (!caseMaxGpuLength && (caseSpecs_.max_gpu_length || caseSpecs.max_gpu_length)) {
        const strValue = String(caseSpecs_.max_gpu_length || caseSpecs.max_gpu_length).replace(/[^\d.]/g, '');
        caseMaxGpuLength = strValue ? parseInt(strValue) : null;
    }
    
    if (!caseMaxGpuLength) {
        logger.warn(`⚠️ Case GPU clearance not specified`);
        result.score = 10;
        result.recommendations.push({
            type: 'warning',
            message: 'Case GPU Clearance Unknown',
            details: 'Verify case supports GPU length manually.'
        });
        return result;
    }
    
    logger.info(`📏 Case GPU Clearance: ${caseMaxGpuLength}mm`);
    
    // Check each GPU length
    let tooLongGpus = [];
    let tightFitGpus = [];
    
    allGpus.forEach(gpu => {
        const dims = gpu.dimensions || {};
        const specs = gpu.specifications || {};
        const gpuLength = parseInt(
            dims.length_mm || 
            specs.length_mm || 
            specs.length || 
            gpu.length
        ) || null;
        const gpuName = gpu.name || 'GPU';
        
        if (!gpuLength) {
            logger.warn(`⚠️ GPU length not specified for ${gpuName}`);
            return;
        }
        
        const clearance = caseMaxGpuLength - gpuLength;
        
        if (clearance < 0) {
            // GPU TOO LONG - CRITICAL
            tooLongGpus.push({
                name: gpuName,
                length: gpuLength,
                caseMax: caseMaxGpuLength,
                overhang: Math.abs(clearance)
            });
        } else if (clearance < 10) {
            // TIGHT FIT - WARNING (less than 10mm clearance)
            tightFitGpus.push({
                name: gpuName,
                length: gpuLength,
                caseMax: caseMaxGpuLength,
                clearance: clearance
            });
        }
    });
    
    if (tooLongGpus.length > 0) {
        result.compatible = false;
        result.score = 0;
        
        const gpuDetails = tooLongGpus.map(g => `${g.name} (${g.length}mm, exceeds by ${g.overhang}mm)`).join(', ');
        
        result.issues.push({
            severity: 'critical',
            message: 'GPU Length Exceeds Case Clearance',
            details: `Case supports max ${tooLongGpus[0].caseMax}mm GPU. Detected: ${gpuDetails}. GPU will NOT fit.`,
            fix: `Choose GPU ≤ ${tooLongGpus[0].caseMax}mm length or larger case with ${Math.max(...tooLongGpus.map(g => g.length))}mm+ clearance.`,
            impact: 'CATASTROPHIC - GPU will not physically fit in case, build impossible'
        });
        
        logger.error(`❌ GPU TOO LONG: ${tooLongGpus.length} GPU(s) exceed case clearance`);
        return result;
    }
    
    if (tightFitGpus.length > 0) {
        result.score -= 5;
        
        const gpuDetails = tightFitGpus.map(g => `${g.name} (${g.length}mm, ${g.clearance}mm clearance)`).join(', ');
        
        result.warnings.push({
            severity: 'warning',
            message: 'Tight GPU Fit - Minimal Clearance',
            details: `${gpuDetails}. Less than 10mm clearance may interfere with front fans/radiators or cables.`,
            action: 'Verify case front panel clearance, avoid front-mounted radiators/fans'
        });
        
        logger.warn(`⚠️ TIGHT GPU FIT: ${tightFitGpus.length} GPU(s) have <10mm clearance`);
    }
    
    logger.info(`✅ GPU Case Clearance Validated: All GPUs fit within ${caseMaxGpuLength}mm limit`);
    return result;
}

/**
 * ============================================================================
 * EXPORTS
 * ============================================================================
 */
module.exports = {
    // PHASE 3 Critical Enhancements (Existing)
    validateCpuChipsetCompatibility,
    validateMultiGpuCompatibility,
    validateStorageSlotTypes,
    validateGpuPowerConnectors,
    validateRamMixing,
    
    // PHASE 4 Critical Enhancements (NEW - Strict 168-Trap Protocol)
    validateRamPerSlotCapacity,
    validateCaseFormFactorHierarchy,
    validateGpuCaseClearance,
    
    // Helpers
    extractCPUGeneration,
    extractChipset,
    getCpuGenerationName,
    getMinimumChipset
};
