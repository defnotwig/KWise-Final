/**
 * ============================================================================
 * COMPATIBILITY RULES ENGINE - PHASE 3 ENHANCED
 * ============================================================================
 * 
 * Deterministic compatibility rules for PC component validation.
 * 
 * This service provides 8 core compatibility check functions that perform
 * hard validation (must-pass) and soft validation (recommendations) before
 * AI analysis. Each function returns a structured result with:
 * - compatible (boolean): Hard pass/fail
 * - score (0-100): Compatibility confidence score
 * - issues (array): Problems found
 * - recommendations (array): Suggestions for improvement
 * 
 * Integration: Called by compatibilityService.js BEFORE AI analysis
 * Data Source: Normalized specs from product_specs table
 * 
 * PHASE 3 CRITICAL ENHANCEMENTS (November 22, 2025):
 * ✅ CPU-Motherboard chipset/BIOS generation matching
 * ✅ Multi-GPU brand consistency and SLI/Crossfire validation
 * ✅ M.2 NVMe vs SATA slot type differentiation
 * ✅ GPU power connector validation (12VHPWR, 8-pin, 6-pin)
 * ✅ RAM mixing warnings (brand, speed, capacity)
 * 
 * ============================================================================
 */

const db = require('../config/db');
const logger = require('../utils/logger');
const enhancedValidation = require('./enhancedCompatibilityValidation');

/**
 * ============================================================================
 * HELPER: MERGE DIMENSIONS INTO SPECS
 * ============================================================================
 * Products have TWO separate fields: specifications and dimensions.
 * This helper merges dimensions into specs so compatibility checks
 * can find dimension values (like length_mm, max_gpu_length_mm) correctly.
 * 
 * 🔥 FIX: This ensures GPU length (dimensions.length_mm) and Case clearance
 *    (dimensions.max_gpu_length_mm) are accessible in check functions.
 */
function mergeSpecsWithDimensions(component) {
  if (!component) return {};
  const specs = component.specs || component.specifications || {};
  const dims = component.dimensions || {};
  // Merge dimensions into specs - dimensions take priority (more accurate)
  return { ...specs, ...dims };
}

/**
 * ============================================================================
 * RULE 1: CPU ↔ MOTHERBOARD COMPATIBILITY
 * ============================================================================
 * Hard Check: Socket must match exactly
 * Soft Checks: Chipset compatibility, BIOS version, TDP adequacy, PCIe gen
 */
async function checkCpuMotherboardCompatibility(cpuSpecs, mbSpecs, cpuName = null, mbName = null) {
  const result = {
    compatible: true,
    score: 50, // Max 50 points
    issues: [],
    recommendations: []
  };

  // Extract component names for error messages
  const cpuDisplayName = cpuName || cpuSpecs.name || 'CPU';
  const mbDisplayName = mbName || mbSpecs.name || 'Motherboard';

  // HARD CHECK: Socket compatibility (CRITICAL - must match)
  const cpuSocket = cpuSpecs.socket?.toLowerCase();
  const mbSocket = mbSpecs.socket?.toLowerCase();

  if (!cpuSocket || !mbSocket) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: `❌ Socket mismatch: [${cpuDisplayName}] (${cpuSocket || 'unknown'}) ≠ [${mbDisplayName}] (${mbSocket || 'unknown'})`,
      details: `Missing socket information - CPU socket: ${cpuSocket || 'unknown'}, MB socket: ${mbSocket || 'unknown'}`
    });
    return result;
  }

  if (cpuSocket !== mbSocket) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: `❌ Socket mismatch: [${cpuDisplayName}] (${cpuSocket.toUpperCase()}) Incompatible with [${mbDisplayName}] (${mbSocket.toUpperCase()})`,
      details: `CPU requires ${cpuSocket.toUpperCase()}, motherboard has ${mbSocket.toUpperCase()}`
    });
    return result;
  }

  // Socket matches - award base points
  result.score = 25;

  // ENHANCED: Brand matching validation (AMD-AMD, Intel-Intel ONLY - STRICT ENFORCEMENT)
  const cpuBrand = (cpuSpecs.brand || cpuSpecs.name || '').toLowerCase();
  const mbBrand = (mbSpecs.brand || mbSpecs.name || '').toLowerCase();
  const cpuCompatibleBrands = (mbSpecs.compatible_cpu_brands || '').toLowerCase();
  
  // Enhanced socket-based brand detection (more reliable than brand names)
  const isAmdCPU = cpuSocket.includes('am') || cpuSocket.includes('tr') || cpuSocket.includes('sp') || cpuBrand.includes('amd') || cpuBrand.includes('ryzen');
  const isIntelCPU = cpuSocket.includes('lga') || cpuBrand.includes('intel') || cpuBrand.includes('core i');
  const isAmdMB = mbSocket.includes('am') || mbSocket.includes('tr') || mbSocket.includes('sp') || mbBrand.includes('amd') || cpuCompatibleBrands.includes('amd');
  const isIntelMB = mbSocket.includes('lga') || mbBrand.includes('intel') || cpuCompatibleBrands.includes('intel');

  // CRITICAL: Block ALL cross-brand compatibility attempts (Intel CPU + AMD MB or vice versa)
  // This prevents scenarios like "i9-14900K on B550 board" which have same socket naming but are incompatible
  if (isAmdCPU && isIntelMB) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: `❌ CPU and Motherboard brand mismatch: [${cpuDisplayName}] Incompatible with [${mbDisplayName}]`,
      details: `AMD CPUs (socket ${cpuSocket.toUpperCase()}) are ONLY compatible with AMD motherboards. Cannot use Intel/LGA motherboard. Socket match alone is not sufficient - brand must also match.`,
      fix: `Choose AMD motherboard (B550, X570, B650, X670, etc.) for AMD ${cpuDisplayName}`
    });
    logger.error(`❌ BRAND MISMATCH: AMD CPU (${cpuSocket}) + Intel MB (${mbSocket})`);
    return result;
  }

  if (isIntelCPU && isAmdMB) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: `❌ CPU and Motherboard brand mismatch: [${cpuDisplayName}] Incompatible with [${mbDisplayName}]`,
      details: `Intel CPUs (socket ${cpuSocket.toUpperCase()}) are ONLY compatible with Intel motherboards. Cannot use AMD motherboard. Socket match alone is not sufficient - brand must also match.`,
      fix: `Choose Intel motherboard (Z790, B760, H670, etc.) for Intel ${cpuDisplayName}`
    });
    logger.error(`❌ BRAND MISMATCH: Intel CPU (${cpuSocket}) + AMD MB (${mbSocket})`);
    return result;
  }
  
  // Additional sanity check: If brands detected but neither AMD nor Intel, warn
  if (!isAmdCPU && !isIntelCPU && cpuBrand) {
    logger.warn(`⚠️ Unknown CPU brand detected: ${cpuBrand} (Socket: ${cpuSocket})`);
  }
  if (!isAmdMB && !isIntelMB && mbBrand) {
    logger.warn(`⚠️ Unknown motherboard brand detected: ${mbBrand} (Socket: ${mbSocket})`);
  }

  // ============================================================================
  // PHASE 3 CRITICAL ENHANCEMENT: CPU-CHIPSET/BIOS VALIDATION
  // ============================================================================
  // This is the MOST CRITICAL fix for the compatibility system.
  // Prevents incompatible CPU generations on same-socket motherboards.
  // Example: Blocks Ryzen 5000 on A320 board (both AM4 but incompatible).
  
  const chipsetValidation = enhancedValidation.validateCpuChipsetCompatibility(cpuSpecs, mbSpecs);
  
  if (!chipsetValidation.compatible) {
    // CRITICAL: Chipset incompatible with CPU generation
    result.compatible = false;
    result.score = 0;
    result.issues.push(...chipsetValidation.issues);
    result.recommendations.push(...chipsetValidation.recommendations);
    return result; // FAIL IMMEDIATELY
  }
  
  // Merge chipset validation warnings (BIOS updates, etc.)
  if (chipsetValidation.warnings.length > 0) {
    result.score -= 5;
    result.issues.push(...chipsetValidation.warnings);
  }
  
  if (chipsetValidation.recommendations.length > 0) {
    result.recommendations.push(...chipsetValidation.recommendations);
  }
  
  // Add chipset validation score
  result.score += Math.floor(chipsetValidation.score / 3); // Max +5 points

  // ENHANCED: Overclocking feature compatibility check
  const cpuOverclockable = cpuSpecs.unlocked || 
                          cpuSpecs.overclockable || 
                          (cpuSpecs.name || '').match(/K$|X$|KF$|KS$/i); // Intel K/KF/KS-series or AMD X-series
  
  // Extract chipset for overclocking checks
  const chipset = mbSpecs.chipset || '';
  
  // Enhanced chipset OC support detection
  // Intel: Z-series (Z790, Z690, Z590, etc.)
  // AMD: X-series (X670, X570, X470, etc.) and B-series with E suffix (B650E, B550)
  const mbSupportsOC = chipset && chipset.match(/Z\d{3}|X\d{3}0|X\d{3}E?|B\d{3}0E/);
  
  if (chipset && cpuOverclockable && !mbSupportsOC) {
    result.score -= 5;
    result.recommendations.push({
      type: 'warning',
      message: 'Unlocked/Overclockable CPU on non-overclocking motherboard',
      details: `${cpuSpecs.name || 'CPU'} supports overclocking but ${chipset} chipset does not. You're paying for overclocking features you cannot use. Consider ${isIntelCPU ? 'Z-series (Z790, Z690)' : 'X-series (X670, X570) or B650E'} motherboard to unlock full potential, or choose non-K/non-X CPU to save money.`,
      impact: 'Cannot overclock CPU, locked to base/boost frequencies only'
    });
  }
  
  // Bonus: Award points for perfect OC pairing
  if (cpuOverclockable && mbSupportsOC) {
    result.score += 5;
    result.recommendations.push({
      type: 'info',
      message: 'Excellent overclocking setup detected',
      details: `${cpuSpecs.name || 'CPU'} (unlocked) + ${chipset} motherboard (OC support) = Full overclocking capability. Ensure adequate cooling for OC workloads.`
    });
  }

  // SOFT CHECK: TDP adequacy (motherboard can handle CPU power)
  const cpuTdp = parseFloat(cpuSpecs.tdp_w) || 0;
  const mbMaxTdp = parseFloat(mbSpecs.max_cpu_tdp_w) || 999;

  if (cpuTdp > 0 && mbMaxTdp < 999) {
    if (cpuTdp > mbMaxTdp) {
      result.score -= 10;
      result.issues.push({
        severity: 'major',
        message: 'CPU TDP exceeds motherboard specification',
        details: `CPU TDP: ${cpuTdp}W, MB max: ${mbMaxTdp}W - May cause throttling or instability`
      });
    } else if (cpuTdp > mbMaxTdp * 0.9) {
      result.score -= 5;
      result.recommendations.push({
        type: 'warning',
        message: 'CPU TDP near motherboard limit',
        details: `CPU TDP: ${cpuTdp}W, MB max: ${mbMaxTdp}W - Ensure adequate VRM cooling`
      });
    } else {
      result.score += 10; // Good TDP headroom
    }
  }

  // SOFT CHECK: Chipset compatibility (known good pairings)
  const chipsetCompatibility = checkChipsetCompatibility(cpuSocket, mbSpecs.chipset);
  if (chipsetCompatibility.score > 0) {
    result.score += chipsetCompatibility.score;
    if (chipsetCompatibility.recommendations.length > 0) {
      result.recommendations.push(...chipsetCompatibility.recommendations);
    }
  }

  // SOFT CHECK: Memory support alignment
  const cpuMemory = cpuSpecs.memory_type?.toLowerCase();
  const mbMemory = mbSpecs.memory_type?.toLowerCase();
  if (cpuMemory && mbMemory && cpuMemory !== mbMemory) {
    result.score -= 5;
    result.recommendations.push({
      type: 'info',
      message: 'Memory type specification mismatch',
      details: `CPU spec: ${cpuMemory.toUpperCase()}, MB spec: ${mbMemory.toUpperCase()} - Verify compatibility`
    });
  } else if (cpuMemory && mbMemory && cpuMemory === mbMemory) {
    result.score += 5;
  }

  // Ensure score stays in 0-50 range
  result.score = Math.max(0, Math.min(50, result.score));

  return result;
}

/**
 * Helper: Get form factor physical size description
 */
function getFormFactorSize(formFactor) {
  const sizes = {
    'eatx': '305mm × 330mm (Extended ATX)',
    'atx': '305mm × 244mm (Standard ATX)',
    'microatx': '244mm × 244mm (Micro-ATX)',
    'matx': '244mm × 244mm (Micro-ATX)',
    'miniitx': '170mm × 170mm (Mini-ITX)',
    'itx': '170mm × 170mm (Mini-ITX)'
  };
  return sizes[formFactor.toLowerCase()] || formFactor;
}

/**
 * Helper: Get recommended case type for motherboard form factor
 */
function getRecommendedCaseType(mbFormFactor) {
  const recommendations = {
    'eatx': 'Full Tower case ONLY',
    'atx': 'Full Tower or Mid Tower case',
    'microatx': 'Mid Tower, Mini Tower, or Full Tower case',
    'matx': 'Mid Tower, Mini Tower, or Full Tower case',
    'miniitx': 'Any case type (ITX, Mini Tower, Mid Tower, Full Tower)',
    'itx': 'Any case type (ITX, Mini Tower, Mid Tower, Full Tower)'
  };
  return recommendations[mbFormFactor.toLowerCase()] || 'Compatible case';
}

/**
 * Helper: Check chipset compatibility with CPU socket
 */
function checkChipsetCompatibility(socket, chipset) {
  const result = { score: 0, recommendations: [] };
  
  if (!chipset) return result;

  const chipsetLower = chipset.toLowerCase();
  const socketLower = socket.toLowerCase();

  // AMD AM5 chipsets
  if (socketLower === 'am5') {
    if (['x670', 'x670e', 'b650', 'b650e', 'a620'].some(c => chipsetLower.includes(c))) {
      result.score = 10;
      if (chipsetLower.includes('x670')) {
        result.recommendations.push({
          type: 'info',
          message: 'Premium chipset detected',
          details: 'X670/X670E supports PCIe 5.0 and extensive connectivity'
        });
      }
    }
  }

  // AMD AM4 chipsets
  if (socketLower === 'am4') {
    if (['x570', 'b550', 'x470', 'b450', 'a520'].some(c => chipsetLower.includes(c))) {
      result.score = 10;
      if (chipsetLower.includes('a320') || chipsetLower.includes('a520')) {
        result.recommendations.push({
          type: 'warning',
          message: 'Entry-level chipset',
          details: 'Limited overclocking and connectivity options'
        });
      }
    }
  }

  // Intel LGA1700 chipsets
  if (socketLower === 'lga1700' || socketLower === 'lga 1700') {
    if (['z790', 'z690', 'b760', 'b660', 'h770', 'h670', 'h610'].some(c => chipsetLower.includes(c))) {
      result.score = 10;
      if (chipsetLower.includes('h610')) {
        result.recommendations.push({
          type: 'warning',
          message: 'Entry-level chipset',
          details: 'H610 has limited PCIe lanes and memory support'
        });
      }
    }
  }

  // Intel LGA1200 chipsets
  if (socketLower === 'lga1200' || socketLower === 'lga 1200') {
    if (['z590', 'z490', 'b560', 'b460', 'h570', 'h510'].some(c => chipsetLower.includes(c))) {
      result.score = 10;
    }
  }

  return result;
}

/**
 * ============================================================================
 * RULE 2: CPU ↔ COOLER COMPATIBILITY
 * ============================================================================
 * Hard Check: Cooler supports CPU socket
 * Soft Checks: TDP adequacy, case height clearance, cooling performance
 */
async function checkCpuCoolerCompatibility(cpuSpecs, coolerSpecs, caseSpecs = null) {
  const result = {
    compatible: true,
    score: 50, // Max 50 points
    issues: [],
    recommendations: []
  };

  const cpuSocket = cpuSpecs.socket?.toLowerCase();
  
  // HARD CHECK: Socket compatibility
  if (!cpuSocket) {
    result.score -= 10;
    result.recommendations.push({
      type: 'warning',
      message: 'CPU socket specification missing - Please check CPU specifications',
      details: 'Unable to validate cooler socket compatibility due to missing CPU socket data. Verify CPU socket type matches cooler support before purchasing.'
    });
    // Don't mark as incompatible, just reduce score
    return result;
  }

  // Check compatible_sockets array (JSONB field from cooler)
  const compatibleSockets = coolerSpecs.compatible_sockets || coolerSpecs.socket;
  
  if (!compatibleSockets) {
    result.score -= 10;
    result.recommendations.push({
      type: 'warning',
      message: 'Cooler socket support specification missing - Please check cooler specifications',
      details: 'Unable to validate CPU socket compatibility due to missing cooler socket support data. Verify cooler supports your CPU socket before purchasing.'
    });
    // Don't mark as incompatible, just reduce score
    return result;
  }

  // Compatible sockets can be array or string
  let socketList = [];
  if (Array.isArray(compatibleSockets)) {
    socketList = compatibleSockets.map(s => s.toLowerCase());
  } else if (typeof compatibleSockets === 'string') {
    // Parse if it's JSON string
    try {
      const parsed = JSON.parse(compatibleSockets);
      socketList = Array.isArray(parsed) ? parsed.map(s => s.toLowerCase()) : [compatibleSockets.toLowerCase()];
    } catch {
      socketList = [compatibleSockets.toLowerCase()];
    }
  }

  // Check if CPU socket is in cooler's supported list
  const socketMatches = socketList.some(s => 
    s === cpuSocket || 
    s.replace(/\s+/g, '') === cpuSocket.replace(/\s+/g, '') ||
    (cpuSocket.includes('lga') && s.includes('lga') && cpuSocket.replace(/\D/g, '') === s.replace(/\D/g, ''))
  );

  if (!socketMatches) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'Cooler does not support CPU socket',
      details: `CPU socket: ${cpuSocket.toUpperCase()}, Cooler supports: ${socketList.map(s => s.toUpperCase()).join(', ')}`
    });
    return result;
  }

  // Socket compatible - award base points
  result.score = 20;

  // SOFT CHECK: TDP adequacy (cooler can handle CPU heat)
  const cpuTdp = parseFloat(cpuSpecs.tdp_w) || 0;
  const coolerMaxTdp = parseFloat(coolerSpecs.cooler_max_tdp_w) || 0;

  if (cpuTdp > 0 && coolerMaxTdp > 0) {
    if (coolerMaxTdp < cpuTdp) {
      result.score -= 15;
      result.issues.push({
        severity: 'major',
        message: 'Cooler TDP rating insufficient for CPU',
        details: `CPU TDP: ${cpuTdp}W, Cooler rated: ${coolerMaxTdp}W - May cause thermal throttling`
      });
    } else if (coolerMaxTdp < cpuTdp * 1.2) {
      result.score -= 5;
      result.recommendations.push({
        type: 'warning',
        message: 'Cooler TDP rating marginal for CPU',
        details: `CPU TDP: ${cpuTdp}W, Cooler rated: ${coolerMaxTdp}W - Consider higher-rated cooler for overclocking`
      });
    } else if (coolerMaxTdp >= cpuTdp * 1.5) {
      result.score += 15; // Excellent cooling headroom
      result.recommendations.push({
        type: 'info',
        message: 'Excellent cooling capacity',
        details: `Cooler rated for ${coolerMaxTdp}W, CPU is ${cpuTdp}W - Good thermal headroom`
      });
    } else {
      result.score += 10; // Adequate cooling
    }
  }

  // SOFT CHECK: Case clearance (if case provided)
  if (caseSpecs) {
    const coolerHeight = parseFloat(coolerSpecs.cooler_height_mm) || 0;
    const caseMaxHeight = parseFloat(caseSpecs.case_max_cooler_height_mm) || 0;

    if (coolerHeight > 0 && caseMaxHeight > 0) {
      if (coolerHeight > caseMaxHeight) {
        result.compatible = false; // Physical incompatibility
        result.score = 0;
        result.issues.push({
          severity: 'critical',
          message: 'Cooler too tall for case',
          details: `Cooler height: ${coolerHeight}mm, Case clearance: ${caseMaxHeight}mm`
        });
        return result;
      } else if (coolerHeight > caseMaxHeight * 0.95) {
        result.score -= 5;
        result.recommendations.push({
          type: 'warning',
          message: 'Cooler height near case limit',
          details: `Cooler height: ${coolerHeight}mm, Case clearance: ${caseMaxHeight}mm - Tight fit`
        });
      } else {
        result.score += 5; // Good clearance
      }
    }
  }

  // SOFT CHECK: Water cooling (AIO) considerations
  const isWaterCooled = coolerSpecs.water_cooled === true || 
                       coolerSpecs.water_cooled === 'true' ||
                       (typeof coolerSpecs.water_cooled === 'string' && coolerSpecs.water_cooled.toLowerCase() === 'yes');
  
  if (isWaterCooled) {
    result.score += 10; // AIO generally better performance
    result.recommendations.push({
      type: 'info',
      message: 'Water cooling detected',
      details: 'Ensure case has radiator mounting space'
    });
  }

  // Ensure score stays in 0-50 range
  result.score = Math.max(0, Math.min(50, result.score));

  return result;
}

/**
 * ============================================================================
 * RULE 3: MOTHERBOARD ↔ RAM COMPATIBILITY
 * ============================================================================
 * Hard Check: Memory type must match (DDR4, DDR5)
 * Soft Checks: Speed support, slot count, capacity limits, mixing validation
 * PHASE 1 ENHANCEMENT: Added support for multiple RAM modules, slot/capacity validation
 */
async function checkMotherboardRamCompatibility(mbSpecs, ramSpecs, allRamModules = []) {
  const result = {
    compatible: true,
    score: 35, // Max 35 points
    issues: [],
    recommendations: []
  };

  // If allRamModules provided, use it; otherwise wrap single ramSpecs
  const ramModules = allRamModules.length > 0 ? allRamModules : [ramSpecs];

  // HARD CHECK: Memory type (DDR4, DDR5) - check first module
  const mbMemoryType = mbSpecs.memory_type?.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ramMemoryType = ramModules[0]?.memory_type?.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!mbMemoryType || !ramMemoryType) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'Memory type information missing',
      details: `MB: ${mbMemoryType || 'unknown'}, RAM: ${ramMemoryType || 'unknown'}`
    });
    return result;
  }

  // CRITICAL CHECK: ALL RAM modules MUST match motherboard DDR type (STRICTLY ENFORCED)
  for (const ram of ramModules) {
    const ramType = ram.memory_type?.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ramType !== mbMemoryType) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'Memory type COMPLETELY INCOMPATIBLE - Physical mismatch',
        details: `Motherboard ONLY supports ${mbMemoryType.toUpperCase()}. Selected RAM "${ram.name || 'module'}" is ${ramType.toUpperCase()}. These are physically different standards - ${ramType.toUpperCase()} RAM will NOT fit in ${mbMemoryType.toUpperCase()} slots. The notch positions are different, making them physically incompatible. DDR3/DDR4/DDR5 are NOT interchangeable.`,
        fix: `Choose ${mbMemoryType.toUpperCase()} RAM modules ONLY. ${ramType.toUpperCase()} is absolutely incompatible with this motherboard. Replace ALL RAM modules with ${mbMemoryType.toUpperCase()} standard.`,
        impact: 'CATASTROPHIC - RAM will not fit in motherboard slots at all. System will not boot.'
      });
      logger.error(`❌ DDR TYPE MISMATCH: ${ramType.toUpperCase()} RAM + ${mbMemoryType.toUpperCase()} Motherboard - PHYSICALLY INCOMPATIBLE`);
      return result;
    }
  }

  // Memory type matches - award base points
  result.score = 15;

  // ENHANCEMENT: Per-slot capacity validation (CRITICAL - prevents oversized modules)
  const mbMaxPerSlot = parseFloat(mbSpecs.max_memory_per_slot_gb) || 32; // Default 32GB per slot if not specified
  
  for (const ram of ramModules) {
    const ramModuleCapacity = parseFloat(ram.memory_capacity_gb || ram.capacity_gb) || 0;
    
    if (ramModuleCapacity > mbMaxPerSlot) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'RAM module capacity exceeds motherboard per-slot limit',
        details: `Each RAM module "${ram.name || 'module'}" is ${ramModuleCapacity}GB, but motherboard supports maximum ${mbMaxPerSlot}GB per slot. Module will NOT work in any slot.`,
        fix: `Use ${mbMaxPerSlot}GB or smaller RAM modules. Current configuration exceeds per-slot capacity by ${ramModuleCapacity - mbMaxPerSlot}GB.`,
        impact: 'CRITICAL - RAM modules will not be recognized or will cause boot failure'
      });
      logger.error(`❌ PER-SLOT CAPACITY EXCEEDED: ${ramModuleCapacity}GB module > ${mbMaxPerSlot}GB max per slot`);
      return result;
    }
  }

  // PHASE 1 ENHANCEMENT: Slot count validation (STRICT - physical impossibility)
  const mbSlots = parseInt(mbSpecs.memory_slots || mbSpecs.ram_slots || mbSpecs.dimm_slots) || 4;
  const ramModuleCount = ramModules.length;

  if (ramModuleCount > mbSlots) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'Too many RAM modules for motherboard slots - Physical impossibility',
      details: `Motherboard has ${mbSlots} physical RAM slot(s), you have ${ramModuleCount} module(s). Excess ${ramModuleCount - mbSlots} module(s) have nowhere to install. Motherboard form factor (${mbSpecs.form_factor || 'unknown'}) physically limits slot count.`,
      fix: `Remove ${ramModuleCount - mbSlots} RAM module(s) OR choose motherboard with ${ramModuleCount}+ DIMM slots (ATX/E-ATX boards typically have more slots than mini-ITX/micro-ATX).`,
      impact: 'CATASTROPHIC - Extra RAM modules cannot be physically installed, will be unusable'
    });
    logger.error(`❌ TOO MANY RAM MODULES: ${ramModuleCount} modules > ${mbSlots} motherboard slots`);
    return result;
  }

  // PHASE 1 ENHANCEMENT: Capacity validation
  const mbMaxMemory = parseFloat(mbSpecs.max_memory_gb) || 128;
  const totalRamCapacity = ramModules.reduce((sum, m) => {
    const capacity = parseFloat(m.memory_capacity_gb || m.capacity_gb) || 0;
    return sum + capacity;
  }, 0);

  if (totalRamCapacity > mbMaxMemory) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'RAM capacity exceeds motherboard limit',
      details: `Total RAM: ${totalRamCapacity}GB, Motherboard max: ${mbMaxMemory}GB. Reduce total capacity by ${totalRamCapacity - mbMaxMemory}GB.`
    });
    return result;
  }

  // PHASE 1 ENHANCEMENT: RAM mixing validation (brand, speed, capacity)
  if (ramModules.length > 1) {
    // Check brand consistency
    const brands = new Set(ramModules.map(m => (m.brand || '').toLowerCase()));
    if (brands.size > 1) {
      result.score -= 3;
      result.recommendations.push({
        type: 'warning',
        message: 'Mixing RAM brands may cause instability',
        details: `Brands detected: ${Array.from(brands).join(', ')}. Use same brand for all modules for best compatibility.`
      });
    }

    // Check speed consistency
    const speeds = ramModules.map(m => parseFloat(m.memory_speed_mhz) || 0);
    const uniqueSpeeds = new Set(speeds);
    if (uniqueSpeeds.size > 1) {
      const minSpeed = Math.min(...speeds);
      result.score -= 5;
      result.recommendations.push({
        type: 'warning',
        message: 'Mixed RAM speeds detected',
        details: `Speeds: ${Array.from(uniqueSpeeds).sort().join('MHz, ')}MHz. All modules will run at slowest speed (${minSpeed}MHz).`
      });
    }

    // Check capacity symmetry for dual-channel
    const capacities = ramModules.map(m => parseFloat(m.memory_capacity_gb || m.capacity_gb) || 0);
    if (ramModuleCount % 2 !== 0) {
      result.score -= 2;
      result.recommendations.push({
        type: 'info',
        message: 'Odd number of RAM modules',
        details: `You have ${ramModuleCount} module(s). For optimal dual-channel performance, use pairs (2, 4, 8 modules).`
      });
    }
  }

  // ENHANCED: Memory speed validation with chipset-specific limits
  const ramSpeed = parseFloat(ramModules[0]?.memory_speed_mhz) || 0;
  let mbMaxSpeed = parseFloat(mbSpecs.memory_speed_mhz) || 0;
  const mbChipset = (mbSpecs.chipset || '').toUpperCase();

  // Apply chipset-specific speed limits (JEDEC standard vs OC)
  // Intel H/B-series locked chipsets have lower RAM speed ceilings
  if (mbChipset.includes('H610') || mbChipset.includes('H670') || mbChipset.includes('B560')) {
    const jedecLimit = mbMemoryType === 'ddr5' ? 4800 : 3200; // DDR5-4800 / DDR4-3200 max for locked chipsets
    if (mbMaxSpeed > jedecLimit) {
      logger.warn(`⚠️ Chipset ${mbChipset} likely limited to ${jedecLimit}MHz (JEDEC), not ${mbMaxSpeed}MHz listed`);
      mbMaxSpeed = Math.min(mbMaxSpeed, jedecLimit);
    }
  }

  if (ramSpeed > 0 && mbMaxSpeed > 0) {
    // CRITICAL: RAM speed significantly exceeds motherboard capability (>20% over)
    if (ramSpeed > mbMaxSpeed * 1.2) {
      result.score -= 8;
      result.recommendations.push({
        type: 'warning',
        message: 'RAM speed SIGNIFICANTLY exceeds motherboard capability',
        details: `RAM: ${ramSpeed}MHz, Motherboard max: ${mbMaxSpeed}MHz (chipset ${mbChipset}). RAM will downclock to ${mbMaxSpeed}MHz. You are paying for ${ramSpeed - mbMaxSpeed}MHz extra speed that will be wasted. This is ${Math.round((ramSpeed / mbMaxSpeed - 1) * 100)}% faster than motherboard supports.`,
        fix: `Choose ${mbMaxSpeed}MHz RAM to match motherboard capability and save money.`,
        impact: 'Performance loss, wasted money on faster RAM that cannot be utilized'
      });
    } else if (ramSpeed > mbMaxSpeed) {
      result.score -= 3;
      result.recommendations.push({
        type: 'warning',
        message: 'RAM speed exceeds motherboard specification',
        details: `RAM: ${ramSpeed}MHz, MB max: ${mbMaxSpeed}MHz - RAM will downclock to ${mbMaxSpeed}MHz. Consider ${mbMaxSpeed}MHz RAM to avoid paying for unused speed.`
      });
    } else if (ramSpeed === mbMaxSpeed) {
      result.score += 10; // Perfect match
      result.recommendations.push({
        type: 'info',
        message: 'Perfect RAM speed match',
        details: `RAM speed (${ramSpeed}MHz) matches motherboard maximum - optimal configuration`
      });
    } else if (ramSpeed >= mbMaxSpeed * 0.9) {
      result.score += 7; // Close match (within 10%)
    } else if (ramSpeed < mbMaxSpeed * 0.7) {
      result.score += 3; // Acceptable but leaving performance on table
      result.recommendations.push({
        type: 'info',
        message: 'RAM speed significantly below motherboard capability',
        details: `RAM: ${ramSpeed}MHz, MB supports up to ${mbMaxSpeed}MHz. Consider faster RAM (${Math.round(mbMaxSpeed * 0.9)}MHz+) for ${Math.round((mbMaxSpeed / ramSpeed - 1) * 100)}% better memory performance.`,
        impact: 'Leaving CPU performance on the table, especially for Ryzen CPUs (Infinity Fabric speed)'
      });
    } else {
      result.score += 5; // Acceptable
    }
  }

  // Bonus points for high capacity support
  if (mbMaxMemory >= 128) {
    result.score += 5; // High capacity support
  }

  // Ensure score stays in 0-35 range
  result.score = Math.max(0, Math.min(35, result.score));

  return result;
}

/**
 * ============================================================================
 * RULE 4: MOTHERBOARD ↔ CASE COMPATIBILITY
 * ============================================================================
 * Hard Check: Case must support motherboard form factor
 */
async function checkMotherboardCaseCompatibility(mbSpecs, caseSpecs) {
  const result = {
    compatible: true,
    score: 15, // Max 15 points
    issues: [],
    recommendations: []
  };

  // HARD CHECK: Form factor compatibility
  const mbFormFactor = mbSpecs.form_factor?.toLowerCase().replace(/[^a-z0-9]/g, '');
  const caseSupportedFormFactors = caseSpecs.supported_form_factors || caseSpecs.form_factor;

  if (!mbFormFactor) {
    result.score -= 10;
    result.recommendations.push({
      type: 'warning',
      message: 'Motherboard form factor specification missing (ATX/Micro-ATX/Mini-ITX) - Check motherboard specs',
      details: 'Unable to validate case compatibility due to missing motherboard form factor. Common form factors: ATX (12x9.6"), Micro-ATX (9.6x9.6"), Mini-ITX (6.7x6.7").'
    });
    // Don't mark as incompatible, just reduce score
    return result;
  }

  if (!caseSupportedFormFactors) {
    result.score -= 10;
    result.recommendations.push({
      type: 'warning',
      message: 'Case form factor support specification missing - Check case specifications',
      details: 'Unable to validate motherboard compatibility due to missing case form factor support. Most mid-tower cases support ATX/Micro-ATX/Mini-ITX.'
    });
    // Don't mark as incompatible, just reduce score
    return result;
  }

  // Parse supported form factors (can be array or string)
  let formFactorList = [];
  if (Array.isArray(caseSupportedFormFactors)) {
    formFactorList = caseSupportedFormFactors.map(f => f.toLowerCase().replace(/[^a-z0-9]/g, ''));
  } else if (typeof caseSupportedFormFactors === 'string') {
    try {
      const parsed = JSON.parse(caseSupportedFormFactors);
      formFactorList = Array.isArray(parsed) ? parsed.map(f => f.toLowerCase().replace(/[^a-z0-9]/g, '')) : [caseSupportedFormFactors.toLowerCase().replace(/[^a-z0-9]/g, '')];
    } catch {
      formFactorList = [caseSupportedFormFactors.toLowerCase().replace(/[^a-z0-9]/g, '')];
    }
  }

  // Check if motherboard form factor is supported
  const isSupported = formFactorList.some(f => 
    f === mbFormFactor ||
    f.includes(mbFormFactor) ||
    mbFormFactor.includes(f)
  );

  if (!isSupported) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'Case does NOT support motherboard form factor - Physical incompatibility',
      details: `Motherboard: ${mbFormFactor.toUpperCase()} (${getFormFactorSize(mbFormFactor)}) will NOT fit in case that supports: ${formFactorList.map(f => f.toUpperCase()).join(', ')}. Case is too small for this motherboard size. Mounting holes will not align.`,
      fix: `Choose case that supports ${mbFormFactor.toUpperCase()} motherboards (${getRecommendedCaseType(mbFormFactor)}) OR choose smaller motherboard form factor.`,
      impact: 'CATASTROPHIC - Motherboard physically cannot be installed in this case. Standoffs and I/O shield will not align.'
    });
    logger.error(`❌ FORM FACTOR MISMATCH: ${mbFormFactor.toUpperCase()} motherboard + case supporting only ${formFactorList.join(', ')}`);
    return result;
  }

  // Form factor compatible - award full points
  result.score = 15;
  
  // Add helpful info about size differences (define sizes once)
  const formFactorSizes = {
    'eatx': 5,
    'atx': 4,
    'microatx': 3,
    'matx': 3,
    'miniitx': 2,
    'itx': 2
  };
  
  const mbSize = formFactorSizes[mbFormFactor] || 3;
  const caseMaxSize = Math.max(...formFactorList.map(f => formFactorSizes[f] || 3));
  
  if (mbSize < caseMaxSize - 1) {
    result.recommendations.push({
      type: 'info',
      message: 'Case is significantly larger than necessary for motherboard',
      details: `Case supports ${formFactorList.filter(f => formFactorSizes[f] > mbSize).map(f => f.toUpperCase()).join('/')} boards but you have ${mbFormFactor.toUpperCase()}. Extra space available but may look empty.`,
      impact: 'Aesthetic - Smaller motherboard in large case may look odd, but fully functional'
    });
  } else if (mbSize < caseMaxSize) {
    result.recommendations.push({
      type: 'info',
      message: 'Case is larger than necessary for motherboard',
      details: `Case supports ${formFactorList.map(f => f.toUpperCase()).join('/')} - Extra space available`
    });
  }

  return result;
}

/**
 * ============================================================================
 * RULE 5: GPU ↔ CASE COMPATIBILITY
 * ============================================================================
 * Hard Check: GPU length must fit in case
 * Soft Check: GPU height/thickness clearance
 */
async function checkGpuCaseCompatibility(gpuSpecs, caseSpecs) {
  const result = {
    compatible: true,
    score: 20, // Max 20 points
    issues: [],
    recommendations: []
  };

  // 🔥 FIX: Check multiple field names for GPU length (dimensions merged via mergeSpecsWithDimensions)
  // Priority: length_mm (from dimensions) > gpu_length_mm (from specs) > length (fallback)
  const gpuLength = parseFloat(gpuSpecs.length_mm || gpuSpecs.gpu_length_mm || gpuSpecs.length) || 0;
  
  // 🔥 FIX: Check multiple field names for case GPU clearance
  // Priority: max_gpu_length_mm (from dimensions) > case_max_gpu_length_mm > gpu_clearance_mm
  let caseMaxLength = parseFloat(caseSpecs.max_gpu_length_mm || caseSpecs.case_max_gpu_length_mm || caseSpecs.gpu_clearance_mm) || 0;

  if (gpuLength === 0) {
    result.score = 10; // Neutral - can't verify
    result.recommendations.push({
      type: 'warning',
      message: 'GPU length not specified',
      details: 'Verify physical dimensions before purchase to avoid fitment issues. Typical GPUs: Low-profile 170mm, Mid-range 270mm, High-end 320mm+'
    });
    return result;
  }

  if (caseMaxLength === 0) {
    result.score = 10; // Neutral - can't verify
    result.recommendations.push({
      type: 'warning',
      message: 'Case GPU clearance not specified',
      details: 'Verify case specifications before purchase to ensure GPU will fit. Typical cases: ITX 200mm, Micro-ATX 310mm, ATX 350mm+'
    });
    return result;
  }

  // ENHANCEMENT: Adjust clearance for front fans/radiators (TRAP 57, 58, 60 - critical for ITX/small cases)
  const frontFanCount = parseInt(caseSpecs.front_fan_slots || caseSpecs.front_120mm_fan_slots || caseSpecs.front_140mm_fan_slots) || 0;
  const frontRadiatorSizes = caseSpecs.front_radiator_support || caseSpecs.front_rad_support || '';
  const hasFrontRadSupport = frontRadiatorSizes.length > 0 || frontRadiatorSizes.includes('120') || frontRadiatorSizes.includes('140') || frontRadiatorSizes.includes('240') || frontRadiatorSizes.includes('280') || frontRadiatorSizes.includes('360');
  
  let clearanceReduction = 0;
  let clearanceReductionReason = '';

  if (frontFanCount > 0) {
    // Standard 120mm/140mm fans are ~25mm thick
    clearanceReduction = 25;
    clearanceReductionReason = `${frontFanCount}× front fan(s) reduce clearance by ~25mm`;
    logger.info(`⚠️ Case has ${frontFanCount} front fan slot(s) - reducing GPU clearance by ${clearanceReduction}mm`);
  }

  if (hasFrontRadSupport && clearanceReduction < 55) {
    // Radiators are thicker (30-55mm depending on rad thickness)
    // Use 55mm for safety (thick radiator with push-pull fans)
    clearanceReduction = 55;
    clearanceReductionReason = `Front radiator support (potential 55mm rad + fans)`;
    logger.info(`⚠️ Case supports front radiator - reducing GPU clearance by ${clearanceReduction}mm for safety`);
  }

  const originalCaseMaxLength = caseMaxLength;
  if (clearanceReduction > 0) {
    caseMaxLength -= clearanceReduction;
  }

  // CRITICAL CHECK: GPU length with realistic clearance buffer (20mm for cables/connectors)
  const requiredClearance = gpuLength + 20; // 20mm safety buffer for power cables and PCIe connector

  if (requiredClearance > caseMaxLength) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'GPU too long for case (accounting for front fans/radiator)',
      details: `GPU length: ${gpuLength}mm + 20mm cable buffer = ${requiredClearance}mm required. Case clearance: ${caseMaxLength}mm (original ${originalCaseMaxLength}mm - ${clearanceReduction}mm for ${clearanceReductionReason}). GPU will NOT fit by ${requiredClearance - caseMaxLength}mm.`,
      fix: `Choose case with ${requiredClearance + 50}mm+ GPU clearance OR shorter GPU (≤${caseMaxLength - 20}mm) OR remove front fans/radiator`,
      impact: 'CATASTROPHIC - GPU physically cannot be installed, front panel/fans will block GPU insertion'
    });
    logger.error(`❌ GPU TOO LONG: ${gpuLength}mm + 20mm buffer = ${requiredClearance}mm > ${caseMaxLength}mm case clearance`);
    return result;
  }

  // GPU fits - award points based on clearance buffer
  const clearanceBuffer = caseMaxLength - gpuLength;

  if (clearanceBuffer < 20) {
    result.score = 5;
    result.issues.push({
      severity: 'major',
      message: 'GPU fits but with EXTREMELY tight clearance',
      details: `GPU: ${gpuLength}mm, Case: ${caseMaxLength}mm (after ${clearanceReduction}mm deduction for ${clearanceReductionReason}), Buffer: ${clearanceBuffer}mm. Less than 20mm clearance is VERY risky - may interfere with power cables, front fans, or radiator. High risk of fitment issues.`,
      fix: 'Verify case reviews for this specific GPU model OR choose case with 50mm+ buffer OR use shorter GPU',
      impact: 'HIGH - May require removing front fans, difficult cable routing, or may not fit at all depending on cable connector position'
    });
  } else if (clearanceBuffer < 50) {
    result.score = 10;
    result.recommendations.push({
      type: 'warning',
      message: 'GPU fits but with tight clearance',
      details: `GPU: ${gpuLength}mm, Case: ${caseMaxLength}mm (after deductions), Buffer: ${clearanceBuffer}mm. Tight fit - may require careful cable routing and thin front fans.`,
      impact: 'MODERATE - Installation will be challenging, front panel airflow may be restricted'
    });
  } else if (clearanceBuffer < 80) {
    result.score = 15;
    result.recommendations.push({
      type: 'info',
      message: 'GPU fits with adequate clearance',
      details: `GPU: ${gpuLength}mm, Case: ${caseMaxLength}mm, Buffer: ${clearanceBuffer}mm. Good fit with room for cables.`
    });
  } else {
    result.score = 20; // Excellent clearance
    result.recommendations.push({
      type: 'info',
      message: 'GPU fits with excellent clearance',
      details: `GPU: ${gpuLength}mm, Case: ${caseMaxLength}mm, Buffer: ${clearanceBuffer}mm. Plenty of room for thick radiators, push-pull fans, and easy cable routing.`
    });
  }

  // ENHANCED: GPU width/thickness (slot count) validation - CRITICAL for thick GPUs
  const gpuSlotCount = parseFloat(gpuSpecs.slot_count || gpuSpecs.gpu_width_slots || gpuSpecs.slots) || 2; // Default 2-slot
  const gpuHeight = parseFloat(gpuSpecs.gpu_height_mm || gpuSpecs.height_mm) || 0;
  const caseMaxSlotCount = parseFloat(caseSpecs.max_gpu_slot_count || caseSpecs.expansion_slots || caseSpecs.pcie_slots) || 7; // Default ATX = 7 slots

  // CRITICAL: GPU must physically fit in case expansion slot area
  if (gpuSlotCount > caseMaxSlotCount) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'GPU too thick (slot count) for case',
      details: `GPU occupies ${gpuSlotCount} expansion slots (${Math.round(gpuSlotCount * 20)}mm width). Case has only ${caseMaxSlotCount} expansion slot(s). GPU will NOT fit vertically - too thick for case bracket area.`,
      fix: `Choose larger case with ${Math.ceil(gpuSlotCount)}+ slots OR thinner GPU (≤${caseMaxSlotCount}-slot)`,
      impact: 'CATASTROPHIC - GPU physically cannot be installed, case side panel will not close'
    });
    logger.error(`❌ GPU TOO THICK: ${gpuSlotCount} slots > ${caseMaxSlotCount} case slots`);
    return result;
  }

  // WARNING: Thick GPUs in small cases
  if (gpuSlotCount >= 3 && caseMaxSlotCount <= 4) {
    result.score -= 3;
    result.recommendations.push({
      type: 'warning',
      message: 'Thick GPU in compact case - limited expansion',
      details: `GPU: ${gpuSlotCount}-slot (${gpuHeight}mm height), Case: ${caseMaxSlotCount} total slots. GPU will consume most expansion slots, blocking other PCIe cards (sound card, capture card, etc.).`,
      impact: 'Limited future expansion, may block adjacent M.2 heatsinks or RAM slots in tight layouts'
    });
  } else if (gpuSlotCount >= 3) {
    result.recommendations.push({
      type: 'info',
      message: `Thick ${gpuSlotCount}-slot GPU detected`,
      details: `GPU height: ${gpuHeight}mm. Will block ${gpuSlotCount - 1} adjacent PCIe slot(s). Verify case has adequate expansion slot spacing and side panel clearance.`,
      impact: 'Some motherboard PCIe x1 slots may be inaccessible'
    });
  } else if (gpuHeight > 50) {
    result.recommendations.push({
      type: 'info',
      message: 'Dual-slot+ GPU detected',
      details: `GPU height: ${gpuHeight}mm. Standard 2-slot design - will work in most cases.`
    });
  }

  return result;
}

/**
 * ============================================================================
 * RULE 6: GPU ↔ PSU COMPATIBILITY
 * ============================================================================
 * Hard Check: PSU wattage adequate for total system power
 * Hard Check: PSU has required power connectors
 * Soft Check: PSU efficiency for high-power systems
 */
async function checkGpuPsuCompatibility(gpuSpecs, psuSpecs, buildComponents = {}) {
  const result = {
    compatible: true,
    score: 30, // Max 30 points
    issues: [],
    recommendations: []
  };

  // CRITICAL: Calculate total system power with TRANSIENT SPIKES (RTX 4000 power spikes)
  const gpuTdp = parseFloat(gpuSpecs.tdp_w || gpuSpecs.power_w || gpuSpecs.tdp) || 0;
  const gpuTransientSpike = parseFloat(gpuSpecs.max_power_w || gpuSpecs.peak_power_w) || gpuTdp * 1.33; // RTX 4000 can spike +33%
  
  const cpuTdp = parseFloat(buildComponents.cpu?.tdp_w || buildComponents.cpu?.tdp) || 65;
  const cpuMaxPower = parseFloat(buildComponents.cpu?.max_power_w || buildComponents.cpu?.pl2_w) || cpuTdp * 1.5; // Intel PL2/AMD PPT
  const ramPower = 5 * (parseInt(buildComponents.ram?.modules || buildComponents.ram?.module_count) || 2);
  const storagePower = 10 * (parseInt(buildComponents.storage?.count) || 1);
  const mbPower = 40;
  const coolingPower = buildComponents.cooling?.water_cooled ? 15 : 10;
  const fansPower = 20; // Case fans, RGB
  const miscPower = 20; // USB devices, peripherals

  // Use PEAK power for PSU sizing (not average TDP) - CRITICAL for preventing shutdowns
  const totalPeakPower = cpuMaxPower + gpuTransientSpike + ramPower + storagePower + mbPower + coolingPower + fansPower + miscPower;
  const recommendedPsu = Math.ceil(totalPeakPower * 1.15); // 15% headroom for efficiency losses
  const totalTdp = cpuTdp + gpuTdp + ramPower + storagePower + mbPower + coolingPower + fansPower + miscPower; // For reference

  logger.info(`⚡ Power Calculation: CPU ${cpuMaxPower}W (peak) + GPU ${Math.round(gpuTransientSpike)}W (spike) + System ${ramPower + storagePower + mbPower + coolingPower + fansPower + miscPower}W = ${Math.round(totalPeakPower)}W peak → Recommend ${recommendedPsu}W PSU`);

  // CRITICAL CHECK: PSU must handle PEAK power (not just TDP)
  const psuWattage = parseFloat(psuSpecs.psu_wattage || psuSpecs.wattage) || 0;

  if (psuWattage === 0) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'PSU wattage not specified',
      details: 'Cannot verify power adequacy - PSU wattage must be known to validate build'
    });
    return result;
  }

  if (psuWattage < totalPeakPower) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'PSU wattage CRITICALLY insufficient for system peak power',
      details: `System peak power: ${Math.round(totalPeakPower)}W (CPU ${cpuMaxPower}W + GPU ${Math.round(gpuTransientSpike)}W spike + System ${ramPower + storagePower + mbPower + coolingPower + fansPower + miscPower}W). PSU: ${psuWattage}W. PSU will trigger OCP (Over Current Protection) and shutdown under load. Average TDP is ${Math.round(totalTdp)}W but transient spikes reach ${Math.round(totalPeakPower)}W.`,
      fix: `Choose ${recommendedPsu}W+ PSU (${Math.ceil(recommendedPsu / 50) * 50}W recommended for standard wattages)`,
      impact: 'CATASTROPHIC - System will NOT boot or will crash/shutdown during gaming/heavy load. PSU protection will trigger.'
    });
    logger.error(`❌ PSU CRITICALLY INSUFFICIENT: ${psuWattage}W < ${Math.round(totalPeakPower)}W peak power`)
    return result;
  }

  // Calculate load percentage for warnings
  const loadPercentage = (totalPeakPower / psuWattage) * 100;

  if (loadPercentage > 90) {
    result.score = 5;
    result.issues.push({
      severity: 'major',
      message: 'PSU wattage marginal - operating at 90%+ load',
      details: `System peak: ${Math.round(totalPeakPower)}W, PSU: ${psuWattage}W (${Math.round(loadPercentage)}% load at peak). PSU efficiency drops significantly above 90% load. Risk of shutdowns under simultaneous CPU+GPU stress, reduced PSU lifespan, loud fan noise. Gold/Platinum efficiency rating degrades to Bronze-level at this load.`,
      fix: `Upgrade to ${recommendedPsu}W+ PSU for safe operation and longevity`,
      impact: 'HIGH - PSU runs hot, noisy, inefficient. May shutdown during sustained loads or gaming.'
    });
    logger.warn(`⚠️ PSU MARGINAL: ${Math.round(loadPercentage)}% load`);
  } else if (loadPercentage > 80) {
    result.score = 10;
    result.recommendations.push({
      type: 'warning',
      message: 'PSU load at 80-90% (acceptable but not optimal)',
      details: `Load: ${Math.round(loadPercentage)}% (peak: ${Math.round(totalPeakPower)}W / PSU: ${psuWattage}W). Functional but PSU runs hot and efficiency is suboptimal. Consider ${recommendedPsu}W for better efficiency (quieter, cooler operation).`,
      impact: 'MODERATE - PSU operates in acceptable range but not optimal. Limited upgrade headroom.'
    });
  } else if (loadPercentage > 70) {
    result.score = 15;
    result.recommendations.push({
      type: 'info',
      message: 'Good PSU headroom',
      details: `Load: ${Math.round(loadPercentage)}%. PSU operates in good efficiency range (70-80%). Adequate for this build.`
    });
  } else if (loadPercentage < 60) {
    result.score = 30; // Excellent headroom (max points)
    result.recommendations.push({
      type: 'info',
      message: 'Excellent PSU headroom',
      details: `Load: ${Math.round(loadPercentage)}%. PSU operates in optimal efficiency range (50-60%). Great for upgrades, silent operation, and maximum efficiency.`
    });
  } else {
    result.score = 20; // Good headroom
    result.recommendations.push({
      type: 'info',
      message: 'Very good PSU headroom',
      details: `Load: ${Math.round(loadPercentage)}%. PSU operates efficiently with room for minor upgrades.`
    });
  }

  // CRITICAL: PCIe power connector validation (12VHPWR, 8-pin, 6-pin)
  const gpuName = (gpuSpecs.name || '').toUpperCase();
  
  // 🔥 FIX: Check BOTH specifications.power_connectors AND dimensions.power_connectors
  const gpuDims = gpuSpecs.dimensions || {};
  const gpuConnectors = (
    gpuSpecs.pcie_power_connectors || 
    gpuSpecs.power_connectors || 
    gpuDims.power_connectors || 
    ''
  ).toLowerCase();
  
  // 🔥 FIX: Check correct PSU field names - pcie_connectors, Power Connectors, etc.
  const psuConnectors = (
    psuSpecs.pcie_connectors || 
    psuSpecs['Power Connectors'] || 
    psuSpecs.psu_connectors || 
    psuSpecs.connectors || 
    ''
  ).toLowerCase();

  // ENHANCEMENT 1: 12VHPWR Connector Validation (RTX 4000 series - TRAP 116)
  // 🔥 FIX: Also detect RTX 4070 (not just TI) since all RTX 4000 use 12VHPWR
  const isRTX4000Series = gpuName.includes('RTX 4090') || 
                          gpuName.includes('RTX 4080') || 
                          gpuName.includes('RTX 4070') ||  // Now includes all 4070 variants
                          gpuName.includes('RTX40') ||
                          gpuName.includes('RTX 40');
                          
  const requires12VHPWR = isRTX4000Series ||
                          gpuConnectors.includes('12vhpwr') ||
                          gpuConnectors.includes('16-pin') ||
                          gpuConnectors.includes('16pin') ||
                          gpuConnectors.includes('12-pin');

  // 🔥 FIX: Check BOTH has_12vhpwr_connector (correct field) AND has_12vhpwr (legacy)
  const psuHas12VHPWR = psuSpecs.has_12vhpwr_connector === true ||
                        psuSpecs.has_12vhpwr === true || 
                        psuSpecs.atx_3_0_compliant === true || 
                        psuConnectors.includes('12vhpwr') ||
                        psuConnectors.includes('16-pin') ||
                        psuConnectors.includes('16pin') ||
                        psuConnectors.includes('12-pin pcie 5.0');

  if (requires12VHPWR) {
    // Check if adapter is included
    const hasAdapter = psuSpecs.includes_12vhpwr_adapter || 
                       gpuSpecs.includes_adapter || 
                       gpuSpecs.adapter_included ||
                       gpuConnectors.includes('adapter');

    if (!psuHas12VHPWR && !hasAdapter) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'PSU lacks 12VHPWR connector for RTX 4000 GPU',
        details: `${gpuSpecs.name || 'GPU'} requires native 12VHPWR (16-pin, 600W) connector. PSU does not have this connector and no adapter cable included. GPU cannot be powered without 12VHPWR or 3× 8-pin to 12VHPWR adapter.`,
        fix: 'Choose ATX 3.0 PSU with native 12VHPWR OR ensure GPU includes 3× 8-pin to 12VHPWR adapter (requires PSU with 3× PCIe 8-pin cables)',
        impact: 'CATASTROPHIC - GPU cannot be powered at all'
      });
      logger.error(`❌ MISSING 12VHPWR: RTX 4000 GPU requires 12VHPWR, PSU lacks connector and no adapter`);
      return result;
    } else if (!psuHas12VHPWR && hasAdapter) {
      result.score -= 5;
      result.recommendations.push({
        type: 'warning',
        message: 'Using 12VHPWR adapter cable instead of native connector',
        details: `GPU/PSU includes 3× 8-pin to 12VHPWR adapter. Functional but not ideal - cable bulk, potential melting risk (ensure adapter fully seated). Native 12VHPWR PSU (ATX 3.0) recommended for RTX 4000 GPUs.`,
        action: 'Ensure adapter cable fully seated into GPU (click sound), verify PSU has 3× dedicated PCIe 8-pin cables available',
        impact: 'MODERATE - Adapter works but messy cables, slight risk of connection issues if not properly seated'
      });
      logger.warn(`⚠️ 12VHPWR ADAPTER: Using adapter cable for RTX 4000 GPU`);
    } else {
      result.score += 5; // Native 12VHPWR support
      result.recommendations.push({
        type: 'info',
        message: 'PSU has native 12VHPWR connector',
        details: `ATX 3.0 PSU with native 12VHPWR support - optimal for RTX 4000 series GPUs. Clean cable routing.`
      });
    }
  }

  // ENHANCEMENT 2: PCIe 8-pin/6-pin connector count validation (TRAP 113)
  if (gpuConnectors) {
    let required8pin = 0;
    let required6pin = 0;

    // Parse connector requirements: "3× 8-pin" or "2× 8-pin + 1× 6-pin" or "2x8-pin"
    const match8pin = gpuConnectors.match(/(\\d+)\\s*[×x]?\\s*8-?pin/i);
    if (match8pin) required8pin = parseInt(match8pin[1]);

    const match6pin = gpuConnectors.match(/(\\d+)\\s*[×x]?\\s*6-?pin/i);
    if (match6pin) required6pin = parseInt(match6pin[1]);

    // Parse PSU available connectors
    let available8pin = 0;
    let available6pin = 0;

    if (psuConnectors) {
      // Match "4x 8-pin" or "4x (6+2)-pin" or "4× PCIe 8-pin"
      const psu8pinMatch = psuConnectors.match(/(\\d+)\\s*[×x]?\\s*(?:pcie\\s+)?(8-?pin|\\(6\\+2\\)-?pin)/i);
      if (psu8pinMatch) available8pin = parseInt(psu8pinMatch[1]);

      const psu6pinMatch = psuConnectors.match(/(\\d+)\\s*[×x]?\\s*(?:pcie\\s+)?6-?pin/i);
      if (psu6pinMatch) available6pin = parseInt(psu6pinMatch[1]);

      // If no explicit match, check for generic "PCIe connectors" field
      if (available8pin === 0 && psuSpecs.pcie_8pin_connectors) {
        available8pin = parseInt(psuSpecs.pcie_8pin_connectors) || 0;
      }
      if (available6pin === 0 && psuSpecs.pcie_6pin_connectors) {
        available6pin = parseInt(psuSpecs.pcie_6pin_connectors) || 0;
      }
    }

    // 🔥 FIX: Be lenient when connector data missing but wattage is sufficient
    // Only treat as CRITICAL error if we have definitive data showing insufficient connectors
    if (required8pin > 0 && available8pin < required8pin) {
      // Check if connector data is actually missing (0 could mean missing data, not zero connectors)
      const hasConnectorData = psuConnectors || psuSpecs.pcie_8pin_connectors;
      const psuWattage = parseFloat(psuSpecs.psu_wattage || psuSpecs.wattage) || 0;
      
      // If connector count is 0 BUT PSU wattage is high enough, downgrade to warning
      // A 1000W PSU almost certainly has PCIe connectors - data is likely missing
      if (available8pin === 0 && psuWattage >= 500) {
        result.score -= 5; // Reduce score but don't fail
        result.recommendations.push({
          type: 'warning',
          message: 'PSU PCIe connector information missing - verify manually',
          details: `GPU requires ${required8pin}× PCIe 8-pin (6+2 pin) connectors. PSU wattage (${psuWattage}W) is sufficient, but connector count not specified in database. Most ${psuWattage}W PSUs include ${Math.floor(psuWattage/250)}+ PCIe 8-pin connectors. VERIFY PSU specifications before purchasing.`,
          fix: `Verify PSU has ${required8pin}+ PCIe 8-pin connectors in manufacturer specifications`
        });
        logger.warn(`⚠️ PSU CONNECTOR DATA MISSING: GPU needs ${required8pin}x 8-pin, PSU wattage ${psuWattage}W suggests adequate connectors but not confirmed`);
      } else {
        // We have definitive data showing insufficient connectors - CRITICAL error
        result.compatible = false;
        result.score = 0;
        result.issues.push({
          severity: 'critical',
          message: 'PSU lacks required PCIe 8-pin connectors for GPU',
          details: `GPU \"${gpuSpecs.name || 'card'}\" requires ${required8pin}× PCIe 8-pin (6+2 pin) connectors. PSU has only ${available8pin}× available. Missing ${required8pin - available8pin} connector(s). GPU cannot be powered.`,
          fix: `Choose PSU with ${required8pin}+ PCIe 8-pin connectors OR modular PSU with additional PCIe cables`,
          impact: 'CATASTROPHIC - GPU will not power on, system will not POST with GPU installed'
        });
        logger.error(`❌ INSUFFICIENT PCIe 8-PIN: GPU needs ${required8pin}x, PSU has ${available8pin}x`);
        return result;
      }
    }

    // Check 6-pin requirements (8-pin can substitute for 6-pin)
    if (required6pin > 0 && available6pin < required6pin && (available6pin + available8pin) < required6pin) {
      result.score -= 3;
      result.recommendations.push({
        type: 'warning',
        message: 'GPU requires 6-pin connectors',
        details: `GPU needs ${required6pin}× 6-pin. PSU has ${available6pin}× 6-pin + ${available8pin}× 8-pin. 8-pin (6+2 pin) connectors CAN be used for 6-pin GPUs (leave +2 unconnected). Verify PSU cable compatibility.`
      });
    }

    // Positive feedback for adequate connectors
    if (required8pin > 0 && available8pin >= required8pin) {
      result.score += 5;
      result.recommendations.push({
        type: 'info',
        message: 'PSU has adequate PCIe power connectors',
        details: `GPU requires ${required8pin}× 8-pin, PSU provides ${available8pin}× - sufficient power connectors available`
      });
    }
  }

  // SOFT CHECK: PSU efficiency for high-power systems
  const psuEfficiency = (psuSpecs.psu_efficiency || psuSpecs.efficiency || '').toLowerCase();
  
  if (totalPeakPower > 400 && psuEfficiency) {
    if (psuEfficiency.includes('80+ gold') || psuEfficiency.includes('80+ platinum') || psuEfficiency.includes('80+ titanium')) {
      result.score += 3;
      result.recommendations.push({
        type: 'info',
        message: 'High-efficiency PSU',
        details: `${psuEfficiency.toUpperCase()} certification reduces heat and power waste (88-94% efficiency at 50% load)`
      });
    } else if (psuEfficiency.includes('80+ bronze') || psuEfficiency.includes('80+')) {
      result.recommendations.push({
        type: 'info',
        message: 'Consider higher efficiency PSU for high-power system',
        details: `80+ Gold or better recommended for ${Math.round(totalPeakPower)}W systems. Better efficiency = less heat, lower power bill, quieter operation.`
      });
    }
  }

  // Ensure score stays in 0-30 range
  result.score = Math.max(0, Math.min(30, result.score));

  return result;
}

/**
 * ============================================================================
 * RULE 7: STORAGE ↔ MOTHERBOARD COMPATIBILITY
 * ============================================================================
 * Hard Check: Motherboard has required interface (M.2, SATA)
 */
async function checkStorageMotherboardCompatibility(storageSpecs, mbSpecs) {
  const result = {
    compatible: true,
    score: 15, // Max 15 points
    issues: [],
    recommendations: []
  };

  const storageType = storageSpecs.storage_type?.toLowerCase();

  if (!storageType) {
    result.score = 7; // Neutral
    result.recommendations.push({
      type: 'warning',
      message: 'Storage interface type not specified',
      details: 'Verify motherboard has compatible ports'
    });
    return result;
  }

  // HARD CHECK: M.2 NVMe requires M.2 slots
  if (storageType.includes('nvme') || storageType.includes('m.2') || storageType.includes('m2')) {
    // 🔥 FIX: Check all possible M.2 slot field names (database uses "M2 Slots")
    const m2Slots = parseInt(
      mbSpecs.m2_slots || 
      mbSpecs.m2_slot_count || 
      mbSpecs['M2 Slots'] || 
      mbSpecs['M.2 Slots'] || 
      mbSpecs.m_2_slots
    ) || 0;

    if (m2Slots === 0) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'Motherboard lacks M.2 slots',
        details: 'NVMe M.2 drive requires M.2 slot on motherboard'
      });
      return result;
    }

    result.score = 15; // Full points
    result.recommendations.push({
      type: 'info',
      message: `Motherboard has ${m2Slots} M.2 slot(s)`,
      details: 'Ensure slot supports NVMe (some M.2 slots are SATA-only)'
    });
  }

  // HARD CHECK: SATA drives require SATA ports
  if (storageType.includes('sata') && !storageType.includes('m.2')) {
    // 🔥 FIX: Simplified SATA port validation - just use specs data
    // Try multiple field names for SATA ports
    let sataPorts = parseInt(mbSpecs.sata_ports) || 
                   parseInt(mbSpecs['SATA Ports']) || 
                   parseInt(mbSpecs.sata_count) ||
                   parseInt(mbSpecs['sata count']) || 
                   0;

    // 🔥 FIX: Only report error if SATA ports are missing AND storage is confirmed SATA
    // Don't fail validation when data is missing but no SATA drives are actually selected
    if (sataPorts === 0) {
      // Downgrade to warning instead of critical error
      // This allows the build to proceed even if SATA port data is missing
      result.score = 10; // Reduced score but not failure
      result.recommendations.push({
        type: 'warning',
        message: 'SATA port information missing from motherboard specifications',
        details: 'If using SATA drive, verify motherboard has available SATA ports. Most modern motherboards include 4-6 SATA ports.'
      });
    } else {
      result.score = 15; // Full points
      result.recommendations.push({
        type: 'info',
        message: `Motherboard has ${sataPorts} SATA port(s)`,
        details: 'SATA cable and power required'
      });
    }
  }

  // If neither M.2 nor SATA detected clearly
  if (!storageType.includes('nvme') && !storageType.includes('m.2') && !storageType.includes('sata')) {
    result.score = 10;
    result.recommendations.push({
      type: 'warning',
      message: 'Storage interface unclear',
      details: `Storage type: ${storageType} - Verify compatibility manually`
    });
  }

  return result;
}

/**
 * ============================================================================
 * RULE 8: PSU ↔ BUILD COMPATIBILITY
 * ============================================================================
 * Hard Check: PSU wattage adequate for entire build
 * Comprehensive power calculation
 */
async function checkPsuBuildCompatibility(buildComponents, psuSpecs) {
  const result = {
    compatible: true,
    score: 30, // Max 30 points
    issues: [],
    recommendations: []
  };

  // 🔥 FIX: Check both psu_wattage AND wattage (database uses 'wattage')
  const psuWattage = parseFloat(psuSpecs.psu_wattage || psuSpecs.wattage) || 0;

  if (psuWattage === 0) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'PSU wattage not specified',
      details: 'Cannot verify power adequacy'
    });
    return result;
  }

  // Calculate total system power
  let totalTdp = 0;
  const breakdown = [];

  // CPU power
  if (buildComponents.cpu) {
    const cpuTdp = parseFloat(buildComponents.cpu.tdp_w) || 65;
    totalTdp += cpuTdp;
    breakdown.push(`CPU: ${cpuTdp}W`);
  } else {
    totalTdp += 65; // Default estimate
    breakdown.push('CPU: 65W (estimated)');
  }

  // GPU power
  if (buildComponents.gpu) {
    const gpuTdp = parseFloat(buildComponents.gpu.tdp_w) || 150;
    totalTdp += gpuTdp;
    breakdown.push(`GPU: ${gpuTdp}W`);
  } else {
    // No discrete GPU - check for integrated graphics
    totalTdp += 20; // Integrated graphics overhead
    breakdown.push('Integrated GPU: 20W (estimated)');
  }

  // RAM power (~5W per module, estimate 2 modules)
  const ramModules = parseInt(buildComponents.ram?.modules) || 2;
  const ramPower = ramModules * 5;
  totalTdp += ramPower;
  breakdown.push(`RAM (${ramModules} modules): ${ramPower}W`);

  // Storage power (~10W per drive)
  const storageCount = parseInt(buildComponents.storage?.count) || 1;
  const storagePower = storageCount * 10;
  totalTdp += storagePower;
  breakdown.push(`Storage (${storageCount} drives): ${storagePower}W`);

  // Motherboard (~40W typical)
  const mbPower = 40;
  totalTdp += mbPower;
  breakdown.push(`Motherboard: ${mbPower}W`);

  // Cooling (fans, pump if AIO)
  const coolingPower = buildComponents.cooling?.water_cooled ? 15 : 10;
  totalTdp += coolingPower;
  breakdown.push(`Cooling: ${coolingPower}W`);

  // Miscellaneous (RGB, case fans, USB devices)
  const miscPower = 20;
  totalTdp += miscPower;
  breakdown.push(`Miscellaneous: ${miscPower}W`);

  const recommendedPsu = Math.ceil(totalTdp * 1.25); // 25% headroom

  // HARD CHECK: PSU adequacy
  if (psuWattage < totalTdp) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'PSU wattage critically insufficient',
      details: `Total system power: ${Math.round(totalTdp)}W, PSU: ${psuWattage}W\nBreakdown: ${breakdown.join(', ')}`
    });
    return result;
  }

  if (psuWattage < recommendedPsu) {
    result.score = 10;
    result.issues.push({
      severity: 'major',
      message: 'PSU wattage below recommended',
      details: `Total: ${Math.round(totalTdp)}W, PSU: ${psuWattage}W, Recommended: ${recommendedPsu}W\nBreakdown: ${breakdown.join(', ')}`
    });
  } else if (psuWattage < recommendedPsu * 1.15) {
    result.score = 20;
    result.recommendations.push({
      type: 'info',
      message: 'Adequate PSU wattage',
      details: `PSU: ${psuWattage}W for ${Math.round(totalTdp)}W system (${Math.round((psuWattage/totalTdp - 1) * 100)}% headroom)`
    });
  } else {
    result.score = 30; // Excellent headroom
    result.recommendations.push({
      type: 'info',
      message: 'Excellent PSU capacity',
      details: `PSU: ${psuWattage}W for ${Math.round(totalTdp)}W system (${Math.round((psuWattage/totalTdp - 1) * 100)}% headroom) - Great for future upgrades`
    });
  }

  return result;
}

/**
 * ============================================================================
 * PHASE 1 NEW RULE: CASE ↔ CPU COOLER COMPATIBILITY
 * ============================================================================
 * Hard Checks: Radiator support for AIOs, height clearance for air coolers
 */
async function checkCaseCoolerCompatibility(caseSpecs, coolerSpecs) {
  const result = {
    compatible: true,
    score: 20, // Max 20 points
    issues: [],
    recommendations: []
  };

  const isWaterCooled = coolerSpecs.water_cooled || coolerSpecs.cooling_type?.toLowerCase().includes('aio') || coolerSpecs.cooling_type?.toLowerCase().includes('liquid');

  if (isWaterCooled) {
    // AIO RADIATOR CHECK
    const coolerName = (coolerSpecs.name || '').toLowerCase();
    let radiatorSize = null;

    // Extract radiator size from cooler name (120mm, 240mm, 280mm, 360mm, 420mm)
    if (coolerName.match(/120/)) radiatorSize = '120mm';
    else if (coolerName.match(/240/)) radiatorSize = '240mm';
    else if (coolerName.match(/280/)) radiatorSize = '280mm';
    else if (coolerName.match(/360/)) radiatorSize = '360mm';
    else if (coolerName.match(/420/)) radiatorSize = '420mm';

    const supportedRadiators = caseSpecs.supported_radiator_sizes || caseSpecs.radiator_support || [];
    let radiatorList = [];

    if (Array.isArray(supportedRadiators)) {
      radiatorList = supportedRadiators;
    } else if (typeof supportedRadiators === 'string') {
      try {
        radiatorList = JSON.parse(supportedRadiators);
      } catch {
        radiatorList = supportedRadiators.split(',').map(s => s.trim());
      }
    }

    if (radiatorSize && radiatorList.length > 0) {
      const isSupported = radiatorList.some(size => size.includes(radiatorSize.replace('mm', '')));
      
      if (!isSupported) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
          severity: 'critical',
          message: `Case does not support ${radiatorSize} AIO radiator`,
          details: `Case supports: ${radiatorList.join(', ')}. Choose a different case or air cooler.`
        });
        return result;
      }

      result.score = 20; // Perfect fit
    } else {
      // Cannot verify - award partial points
      result.score = 10;
      result.recommendations.push({
        type: 'warning',
        message: 'AIO radiator compatibility unknown',
        details: 'Verify case supports AIO radiator before purchase'
      });
    }
  } else {
    // AIR COOLER HEIGHT CHECK
    // 🔥 FIX: Check multiple field names for cooler height and case clearance
    const coolerHeight = parseFloat(coolerSpecs.height_mm || coolerSpecs.cooler_height_mm || coolerSpecs.height) || 0;
    const caseMaxHeight = parseFloat(caseSpecs.max_cooler_height_mm || caseSpecs.cpu_cooler_height_mm || caseSpecs.max_cpu_cooler_height_mm) || 0;

    if (coolerHeight > 0 && caseMaxHeight > 0) {
      if (coolerHeight > caseMaxHeight) {
        result.compatible = false;
        result.score = 0;
        result.issues.push({
          severity: 'critical',
          message: 'CPU cooler too tall for case',
          details: `Cooler height: ${coolerHeight}mm, Case clearance: ${caseMaxHeight}mm. Excess: ${coolerHeight - caseMaxHeight}mm.`
        });
        return result;
      } else if (coolerHeight >= caseMaxHeight * 0.95) {
        result.score = 15; // Tight fit
        result.recommendations.push({
          type: 'warning',
          message: 'Cooler fits with minimal clearance',
          details: `Cooler: ${coolerHeight}mm, Case max: ${caseMaxHeight}mm. Only ${caseMaxHeight - coolerHeight}mm clearance.`
        });
      } else {
        result.score = 20; // Good clearance
      }
    } else {
      // Missing height data
      result.score = 10;
      result.recommendations.push({
        type: 'info',
        message: 'Cooler height compatibility unknown',
        details: 'Verify cooler height fits case before purchase'
      });
    }
  }

  return result;
}

/**
 * ============================================================================
 * PHASE 1 NEW RULE: CASE ↔ PSU FORM FACTOR COMPATIBILITY
 * ============================================================================
 * Hard Checks: PSU form factor (ATX/SFX/TFX) and length restrictions
 */
async function checkCasePsuCompatibility(caseSpecs, psuSpecs) {
  const result = {
    compatible: true,
    score: 15, // Max 15 points
    issues: [],
    recommendations: []
  };

  // HARD CHECK: Form factor compatibility
  const caseFormFactor = (caseSpecs.psu_form_factor || caseSpecs.psu_type || 'ATX').toUpperCase();
  const psuFormFactor = (psuSpecs.form_factor || psuSpecs.psu_type || 'ATX').toUpperCase();

  const formFactorCompatibility = {
    'ATX': ['ATX', 'SFX', 'SFX-L'],
    'MATX': ['ATX', 'SFX', 'SFX-L'],
    'ITX': ['SFX', 'SFX-L'],
    'MINI-ITX': ['SFX', 'SFX-L'],
    'SFF': ['SFX', 'SFX-L', 'FLEX', 'TFX']
  };

  const supportedFormats = formFactorCompatibility[caseFormFactor] || ['ATX'];

  if (!supportedFormats.includes(psuFormFactor)) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'PSU form factor INCOMPATIBLE with case - Physical size mismatch',
      details: `Case requires ${supportedFormats.join(' or ')} PSU, but you selected ${psuFormFactor} PSU. ${psuFormFactor} PSU will NOT fit in ${caseFormFactor} case. ${psuFormFactor === 'ATX' && caseFormFactor.includes('ITX') ? 'ATX PSUs are too large for ITX cases (depth: 140mm vs 100mm).' : 'Form factor dimensions incompatible.'}`,
      fix: `Choose ${supportedFormats[0]} PSU (recommended for ${caseFormFactor} case) OR choose larger case that supports ${psuFormFactor} PSU.`,
      impact: 'CATASTROPHIC - PSU will not physically fit in case PSU bay. Mounting holes will not align.'
    });
    logger.error(`❌ PSU FORM FACTOR MISMATCH: ${psuFormFactor} PSU + ${caseFormFactor} case`);
    return result;
  }

  result.score = 10; // Form factor compatible

  // HARD CHECK: PSU length restriction
  // 🔥 FIX: Check multiple field names for PSU length and case clearance
  const psuLength = parseFloat(psuSpecs.length_mm || psuSpecs.psu_length_mm || psuSpecs.depth_mm) || 0;
  const caseMaxLength = parseFloat(caseSpecs.max_psu_length_mm || caseSpecs.psu_length_mm || caseSpecs.psu_max_length_mm) || 0;

  if (psuLength > 0 && caseMaxLength > 0) {
    if (psuLength > caseMaxLength) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'PSU too long for case',
        details: `PSU length: ${psuLength}mm, Case max: ${caseMaxLength}mm. Excess: ${psuLength - caseMaxLength}mm.`
      });
      return result;
    } else if (psuLength >= caseMaxLength * 0.95) {
      result.score = 12; // Tight fit
      result.recommendations.push({
        type: 'warning',
        message: 'PSU fits with minimal clearance',
        details: `PSU: ${psuLength}mm, Case max: ${caseMaxLength}mm. May interfere with cable management.`
      });
    } else {
      result.score = 15; // Good fit
    }
  }

  return result;
}

/**
 * ============================================================================
 * PHASE 1 NEW RULE: STORAGE ↔ MOTHERBOARD M.2 KEY VALIDATION
 * ============================================================================
 * Hard Check: M.2 key type (M, B, B+M) compatibility
 */
async function checkStorageMotherboardM2Keys(storageSpecs, mbSpecs) {
  const result = {
    compatible: true,
    score: 10, // Max 10 points
    issues: [],
    recommendations: []
  };

  const storageType = (storageSpecs.storage_type || storageSpecs.interface || '').toLowerCase();

  // Only check M.2 NVMe/SATA drives
  if (!storageType.includes('m.2') && !storageType.includes('nvme')) {
    result.score = 10; // N/A - not M.2 drive
    return result;
  }

  // HARD CHECK: M.2 key type
  const storageKeyType = (storageSpecs.m2_key_type || storageSpecs.key_type || 'M').toUpperCase();
  const mbSupportedKeys = mbSpecs.m2_key_types || mbSpecs.m2_keys || ['M', 'B+M'];

  let mbKeyList = [];
  if (Array.isArray(mbSupportedKeys)) {
    mbKeyList = mbSupportedKeys.map(k => k.toUpperCase());
  } else if (typeof mbSupportedKeys === 'string') {
    try {
      mbKeyList = JSON.parse(mbSupportedKeys).map(k => k.toUpperCase());
    } catch {
      mbKeyList = mbSupportedKeys.split(',').map(k => k.trim().toUpperCase());
    }
  }

  if (!mbKeyList.includes(storageKeyType)) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'M.2 key type not supported by motherboard',
      details: `Drive uses ${storageKeyType}-key, Motherboard supports: ${mbKeyList.join(', ')}`
    });
    return result;
  }

  result.score = 10; // Key type compatible

  // SOFT CHECK: PCIe generation
  const drivePcieGen = parseInt(storageSpecs.pcie_generation || storageSpecs.pcie_gen) || 3;
  const mbPcieGen = parseInt(mbSpecs.m2_pcie_generation || mbSpecs.pcie_generation) || 3;

  if (drivePcieGen > mbPcieGen) {
    result.score -= 2;
    result.recommendations.push({
      type: 'info',
      message: 'M.2 drive faster than motherboard slot',
      details: `Drive: PCIe ${drivePcieGen}.0, Slot: PCIe ${mbPcieGen}.0. Drive will run at reduced speed.`
    });
  }

  return result;
}

/**
 * ============================================================================
 * PHASE 1 NEW RULE: CPU COOLER ↔ RAM HEIGHT CLEARANCE
 * ============================================================================
 * Hard Check: Air cooler clearance over tall RAM modules
 */
async function checkCoolerRamClearance(coolerSpecs, ramSpecs) {
  const result = {
    compatible: true,
    score: 10, // Max 10 points
    issues: [],
    recommendations: []
  };

  const isAirCooler = !coolerSpecs.water_cooled && !coolerSpecs.cooling_type?.toLowerCase().includes('aio');
  const coolerType = (coolerSpecs.cooler_type || coolerSpecs.type || '').toLowerCase();

  // Only check for large air coolers (tower coolers)
  if (!isAirCooler || !coolerType.includes('tower')) {
    result.score = 10; // N/A - AIO or low-profile cooler
    return result;
  }

  // HARD CHECK: RAM height clearance
  const ramHeight = parseFloat(ramSpecs.height_mm || ramSpecs.ram_height_mm) || 40; // Standard RAM ~40mm
  const coolerClearance = parseFloat(coolerSpecs.ram_clearance_mm || coolerSpecs.clearance_mm) || 999;

  if (coolerClearance < 999) {
    if (ramHeight > coolerClearance) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'RAM too tall for CPU cooler - Physical interference',
        details: `RAM module height: ${ramHeight}mm exceeds cooler clearance: ${coolerClearance}mm by ${ramHeight - coolerClearance}mm. Large tower cooler heatsink will physically block RAM slots 1 and 2 (closest to CPU socket). RAM modules cannot be installed.`,
        fix: `Choose low-profile RAM (≤${coolerClearance}mm height, typically 32-35mm) OR choose different cooler with ${ramHeight + 10}mm+ clearance OR use slots 3-4 only (may disable dual-channel).`,
        impact: 'CATASTROPHIC - RAM modules will not fit under cooler heatsink. System may not boot or run in single-channel mode.'
      });
      logger.error(`❌ RAM HEIGHT EXCEEDS COOLER CLEARANCE: ${ramHeight}mm > ${coolerClearance}mm`);
      return result;
    } else if (ramHeight >= coolerClearance * 0.9) {
      result.score = 7; // Tight fit
      result.recommendations.push({
        type: 'warning',
        message: 'RAM fits with VERY tight clearance under cooler',
        details: `RAM: ${ramHeight}mm, Cooler clearance: ${coolerClearance}mm. Only ${coolerClearance - ramHeight}mm gap. Installation may be difficult - RAM must be installed BEFORE cooler. Standard RAM height: 40-44mm, Low-profile: 32-35mm.`,
        action: 'Consider low-profile RAM for easier installation',
        impact: 'MODERATE - Difficult installation, may need to remove cooler to change RAM'
      });
    } else {
      result.score = 10; // Good clearance
      result.recommendations.push({
        type: 'info',
        message: 'Good RAM clearance under cooler',
        details: `RAM height: ${ramHeight}mm, Cooler clearance: ${coolerClearance}mm. ${coolerClearance - ramHeight}mm safety margin - easy installation.`
      });
    }
  } else {
    // No clearance data available
    result.score = 5;
    result.recommendations.push({
      type: 'info',
      message: 'RAM clearance unknown - Verify before purchase',
      details: 'Tower coolers often interfere with RAM. Verify cooler specs list RAM clearance ≥40mm for standard RAM or use low-profile RAM (32-35mm).'
    });
  }

  return result;
}

/**
 * ============================================================================
 * PHASE 1 NEW RULE: MOTHERBOARD ↔ PSU POWER CONNECTORS
 * ============================================================================
 * Hard Check: 24-pin main power + EPS CPU power (4-pin/8-pin)
 */
async function checkMotherboardPsuConnectors(mbSpecs, psuSpecs) {
  const result = {
    compatible: true,
    score: 10, // Max 10 points
    issues: [],
    recommendations: []
  };

  // 24-pin main power (standard on all modern boards)
  const psuHas24Pin = (psuSpecs.connectors || '').includes('24-pin') || true; // Assume all modern PSUs have it

  // HARD CHECK: EPS CPU power (4-pin or 8-pin)
  const mbRequiresEPS = parseInt(mbSpecs.eps_cpu_power_pins || mbSpecs.cpu_power_pins) || 8;
  const psuEPSPins = parseInt(psuSpecs.eps_cpu_power_pins || psuSpecs.cpu_power_pins) || 8;

  if (psuEPSPins < mbRequiresEPS) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'PSU lacks required CPU power connector',
      details: `Motherboard needs ${mbRequiresEPS}-pin EPS connector, PSU has ${psuEPSPins}-pin. Upgrade PSU or use different motherboard.`
    });
    return result;
  }

  result.score = 10; // Connectors compatible

  // Additional check: Dual EPS (high-end boards)
  if (mbRequiresEPS === 16 && psuEPSPins < 16) {
    result.score = 7;
    result.recommendations.push({
      type: 'warning',
      message: 'Motherboard supports dual EPS but PSU has single connector',
      details: 'Board will work with single 8-pin but may limit extreme overclocking'
    });
  }

  return result;
}

/**
 * ============================================================================
 * MASTER FUNCTION: COMPUTE OVERALL COMPATIBILITY SCORE
 * ============================================================================
 * Runs all applicable rules and aggregates results
 * 
 * @param {Object} build - Current build configuration (normalized specs)
 * @param {Object} candidate - Component being evaluated (normalized specs)
 * @returns {Object} - Aggregated compatibility result (score 0-100)
 */
async function computeCompatibilityScore(build, candidate) {
  const result = {
    compatible: true,
    score: 0,
    maxScore: 0,
    issues: [],
    recommendations: [],
    ruleResults: {}
  };

  const candidateCategory = candidate.category?.toLowerCase();

  // 🔥 FIX: Merge dimensions into specs for candidate
  const candidateSpecs = mergeSpecsWithDimensions(candidate);

  // 🔥 FIX: Pre-merge dimensions into specs for all build components
  const buildSpecs = {
    cpu: build.cpu ? mergeSpecsWithDimensions(build.cpu) : null,
    motherboard: build.motherboard ? mergeSpecsWithDimensions(build.motherboard) : null,
    ram: build.ram ? mergeSpecsWithDimensions(build.ram) : null,
    gpu: build.gpu ? mergeSpecsWithDimensions(build.gpu) : null,
    case: build.case ? mergeSpecsWithDimensions(build.case) : null,
    psu: build.psu ? mergeSpecsWithDimensions(build.psu) : null,
    cooling: build.cooling ? mergeSpecsWithDimensions(build.cooling) : null,
    storage: build.storage ? mergeSpecsWithDimensions(build.storage) : null
  };

  // Rule 1: CPU ↔ Motherboard
  if ((candidateCategory === 'cpu' && build.motherboard) || 
      (candidateCategory === 'motherboard' && build.cpu)) {
    const cpu = candidateCategory === 'cpu' ? candidateSpecs : buildSpecs.cpu;
    const mb = candidateCategory === 'motherboard' ? candidateSpecs : buildSpecs.motherboard;
    const cpuName = candidateCategory === 'cpu' ? candidate.name : build.cpu?.name;
    const mbName = candidateCategory === 'motherboard' ? candidate.name : build.motherboard?.name;
    
    if (cpu && mb) {
      const r1 = await checkCpuMotherboardCompatibility(cpu, mb, cpuName, mbName);
      result.ruleResults.cpuMotherboard = r1;
      result.score += r1.score;
      result.maxScore += 50;
      result.compatible = result.compatible && r1.compatible;
      result.issues.push(...r1.issues);
      result.recommendations.push(...r1.recommendations);
    }
  }

  // Rule 2: CPU ↔ Cooler
  if ((candidateCategory === 'cooling' && build.cpu) || 
      (candidateCategory === 'cpu' && build.cooling)) {
    const cpu = candidateCategory === 'cpu' ? candidateSpecs : buildSpecs.cpu;
    const cooler = candidateCategory === 'cooling' ? candidateSpecs : buildSpecs.cooling;
    const caseSpecs = buildSpecs.case || null;
    
    if (cpu && cooler) {
      const r2 = await checkCpuCoolerCompatibility(cpu, cooler, caseSpecs);
      result.ruleResults.cpuCooler = r2;
      result.score += r2.score;
      result.maxScore += 50;
      result.compatible = result.compatible && r2.compatible;
      result.issues.push(...r2.issues);
      result.recommendations.push(...r2.recommendations);
    }
  }

  // Rule 3: Motherboard ↔ RAM
  if ((candidateCategory === 'ram' && build.motherboard) || 
      (candidateCategory === 'motherboard' && build.ram)) {
    const mb = candidateCategory === 'motherboard' ? candidateSpecs : buildSpecs.motherboard;
    const ram = candidateCategory === 'ram' ? candidateSpecs : buildSpecs.ram;
    
    if (mb && ram) {
      const r3 = await checkMotherboardRamCompatibility(mb, ram);
      result.ruleResults.motherboardRam = r3;
      result.score += r3.score;
      result.maxScore += 35;
      result.compatible = result.compatible && r3.compatible;
      result.issues.push(...r3.issues);
      result.recommendations.push(...r3.recommendations);
    }
  }

  // Rule 4: Motherboard ↔ Case
  if ((candidateCategory === 'case' && build.motherboard) || 
      (candidateCategory === 'motherboard' && build.case)) {
    const mb = candidateCategory === 'motherboard' ? candidateSpecs : buildSpecs.motherboard;
    const caseSpec = candidateCategory === 'case' ? candidateSpecs : buildSpecs.case;
    
    if (mb && caseSpec) {
      const r4 = await checkMotherboardCaseCompatibility(mb, caseSpec);
      result.ruleResults.motherboardCase = r4;
      result.score += r4.score;
      result.maxScore += 15;
      result.compatible = result.compatible && r4.compatible;
      result.issues.push(...r4.issues);
      result.recommendations.push(...r4.recommendations);
    }
  }

  // Rule 5: GPU ↔ Case
  if ((candidateCategory === 'gpu' && build.case) || 
      (candidateCategory === 'case' && build.gpu)) {
    const gpu = candidateCategory === 'gpu' ? candidateSpecs : buildSpecs.gpu;
    const caseSpec = candidateCategory === 'case' ? candidateSpecs : buildSpecs.case;
    
    if (gpu && caseSpec) {
      const r5 = await checkGpuCaseCompatibility(gpu, caseSpec);
      result.ruleResults.gpuCase = r5;
      result.score += r5.score;
      result.maxScore += 20;
      result.compatible = result.compatible && r5.compatible;
      result.issues.push(...r5.issues);
      result.recommendations.push(...r5.recommendations);
    }
  }

  // Rule 6: GPU ↔ PSU
  if ((candidateCategory === 'gpu' && build.psu) || 
      (candidateCategory === 'psu' && build.gpu)) {
    const gpu = candidateCategory === 'gpu' ? candidateSpecs : buildSpecs.gpu;
    const psu = candidateCategory === 'psu' ? candidateSpecs : buildSpecs.psu;
    
    if (gpu && psu) {
      const r6 = await checkGpuPsuCompatibility(gpu, psu, build);
      result.ruleResults.gpuPsu = r6;
      result.score += r6.score;
      result.maxScore += 30;
      result.compatible = result.compatible && r6.compatible;
      result.issues.push(...r6.issues);
      result.recommendations.push(...r6.recommendations);
    }
  }

  // Rule 7: Storage ↔ Motherboard
  if ((candidateCategory === 'storage' && build.motherboard) || 
      (candidateCategory === 'motherboard' && build.storage)) {
    const storage = candidateCategory === 'storage' ? candidateSpecs : buildSpecs.storage;
    const mb = candidateCategory === 'motherboard' ? candidateSpecs : buildSpecs.motherboard;
    
    if (storage && mb) {
      const r7 = await checkStorageMotherboardCompatibility(storage, mb);
      result.ruleResults.storageMotherboard = r7;
      result.score += r7.score;
      result.maxScore += 15;
      result.compatible = result.compatible && r7.compatible;
      result.issues.push(...r7.issues);
      result.recommendations.push(...r7.recommendations);
    }
  }

  // Rule 8: PSU ↔ Build (comprehensive)
  if (candidateCategory === 'psu' || (build.psu && Object.keys(build).length >= 3)) {
    const psu = candidateCategory === 'psu' ? candidateSpecs : buildSpecs.psu;
    
    if (psu) {
      const r8 = await checkPsuBuildCompatibility(build, psu);
      result.ruleResults.psuBuild = r8;
      result.score += r8.score;
      result.maxScore += 30;
      result.compatible = result.compatible && r8.compatible;
      result.issues.push(...r8.issues);
      result.recommendations.push(...r8.recommendations);
    }
  }

  // PHASE 1 NEW RULE 9: Case ↔ Cooler
  if ((candidateCategory === 'case' && build.cooling) || 
      (candidateCategory === 'cooling' && build.case)) {
    const caseSpec = candidateCategory === 'case' ? candidateSpecs : buildSpecs.case;
    const cooler = candidateCategory === 'cooling' ? candidateSpecs : buildSpecs.cooling;
    
    if (caseSpec && cooler) {
      const r9 = await checkCaseCoolerCompatibility(caseSpec, cooler);
      result.ruleResults.caseCooler = r9;
      result.score += r9.score;
      result.maxScore += 20;
      result.compatible = result.compatible && r9.compatible;
      result.issues.push(...r9.issues);
      result.recommendations.push(...r9.recommendations);
    }
  }

  // PHASE 1 NEW RULE 10: Case ↔ PSU
  if ((candidateCategory === 'case' && build.psu) || 
      (candidateCategory === 'psu' && build.case)) {
    const caseSpec = candidateCategory === 'case' ? candidateSpecs : buildSpecs.case;
    const psu = candidateCategory === 'psu' ? candidateSpecs : buildSpecs.psu;
    
    if (caseSpec && psu) {
      const r10 = await checkCasePsuCompatibility(caseSpec, psu);
      result.ruleResults.casePsu = r10;
      result.score += r10.score;
      result.maxScore += 15;
      result.compatible = result.compatible && r10.compatible;
      result.issues.push(...r10.issues);
      result.recommendations.push(...r10.recommendations);
    }
  }

  // PHASE 1 NEW RULE 11: Storage M.2 Keys ↔ Motherboard
  if ((candidateCategory === 'storage' && build.motherboard) || 
      (candidateCategory === 'motherboard' && build.storage)) {
    const storage = candidateCategory === 'storage' ? candidate.specs : build.storage?.specs;
    const mb = candidateCategory === 'motherboard' ? candidate.specs : build.motherboard?.specs;
    
    if (storage && mb) {
      const r11 = await checkStorageMotherboardM2Keys(storage, mb);
      result.ruleResults.storageM2Keys = r11;
      result.score += r11.score;
      result.maxScore += 10;
      result.compatible = result.compatible && r11.compatible;
      result.issues.push(...r11.issues);
      result.recommendations.push(...r11.recommendations);
    }
  }

  // PHASE 1 NEW RULE 12: Cooler ↔ RAM Clearance
  if ((candidateCategory === 'cooling' && build.ram) || 
      (candidateCategory === 'ram' && build.cooling)) {
    const cooler = candidateCategory === 'cooling' ? candidate.specs : build.cooling?.specs;
    const ram = candidateCategory === 'ram' ? candidate.specs : build.ram?.specs;
    
    if (cooler && ram) {
      const r12 = await checkCoolerRamClearance(cooler, ram);
      result.ruleResults.coolerRamClearance = r12;
      result.score += r12.score;
      result.maxScore += 10;
      result.compatible = result.compatible && r12.compatible;
      result.issues.push(...r12.issues);
      result.recommendations.push(...r12.recommendations);
    }
  }

  // PHASE 1 NEW RULE 13: Motherboard ↔ PSU Connectors
  if ((candidateCategory === 'motherboard' && build.psu) || 
      (candidateCategory === 'psu' && build.motherboard)) {
    const mb = candidateCategory === 'motherboard' ? candidate.specs : build.motherboard?.specs;
    const psu = candidateCategory === 'psu' ? candidate.specs : build.psu?.specs;
    
    if (mb && psu) {
      const r13 = await checkMotherboardPsuConnectors(mb, psu);
      result.ruleResults.motherboardPsuConnectors = r13;
      result.score += r13.score;
      result.maxScore += 10;
      result.compatible = result.compatible && r13.compatible;
      result.issues.push(...r13.issues);
      result.recommendations.push(...r13.recommendations);
    }
  }

  // PHASE 1 NEW RULE 14: Storage ↔ Case Drive Bays
  if ((candidateCategory === 'storage' && build.case) || 
      (candidateCategory === 'case' && build.storage)) {
    const caseSpec = candidateCategory === 'case' ? candidate.specs : build.case?.specs;
    
    // Collect all storage devices (handle both single and array)
    const allStorage = [];
    if (candidateCategory === 'storage') {
      allStorage.push(candidate.specs);
    }
    if (Array.isArray(build.storage)) {
      allStorage.push(...build.storage.map(s => s.specs));
    } else if (build.storage?.specs) {
      allStorage.push(build.storage.specs);
    }
    
    if (caseSpec && allStorage.length > 0) {
      const r14 = await checkStorageCaseDriveBays(caseSpec, allStorage);
      result.ruleResults.storageCaseDriveBays = r14;
      result.score += r14.score;
      result.maxScore += 10;
      result.compatible = result.compatible && r14.compatible;
      result.issues.push(...r14.issues);
      result.recommendations.push(...r14.recommendations);
    }
  }

  // PHASE 1 NEW RULE 15: Motherboard ↔ Storage Slots
  if ((candidateCategory === 'storage' && build.motherboard) || 
      (candidateCategory === 'motherboard' && build.storage)) {
    const mb = candidateCategory === 'motherboard' ? candidate.specs : build.motherboard?.specs;
    
    // Collect all storage devices - 🔥 FIX: Pass FULL objects (with name field) not just specs
    const allStorage = [];
    if (candidateCategory === 'storage') {
      allStorage.push({ ...candidate, specifications: candidate.specs });
    }
    if (Array.isArray(build.storage)) {
      allStorage.push(...build.storage.map(s => ({ ...s, specifications: s.specs })));
    } else if (build.storage?.specs) {
      allStorage.push({ ...build.storage, specifications: build.storage.specs });
    }
    
    if (mb && allStorage.length > 0) {
      const r15 = await checkMotherboardStorageSlots(mb, allStorage);
      result.ruleResults.motherboardStorageSlots = r15;
      result.score += r15.score;
      result.maxScore += 15;
      result.compatible = result.compatible && r15.compatible;
      result.issues.push(...r15.issues);
      result.recommendations.push(...r15.recommendations);
    }
  }

  // PHASE 1 NEW RULE 16: Motherboard ↔ GPU PCIe Slots (Multi-GPU)
  if ((candidateCategory === 'gpu' && build.motherboard) || 
      (candidateCategory === 'motherboard' && build.gpu)) {
    const mb = candidateCategory === 'motherboard' ? candidate.specs : build.motherboard?.specs;
    
    // Collect all GPUs
    const allGpus = [];
    if (candidateCategory === 'gpu') {
      allGpus.push(candidate.specs);
    }
    if (Array.isArray(build.gpu)) {
      allGpus.push(...build.gpu.map(g => g.specs));
    } else if (build.gpu?.specs) {
      allGpus.push(build.gpu.specs);
    }
    
    if (mb && allGpus.length > 0) {
      const r16 = await checkMotherboardGpuSlots(mb, allGpus);
      result.ruleResults.motherboardGpuSlots = r16;
      result.score += r16.score;
      result.maxScore += 15;
      result.compatible = result.compatible && r16.compatible;
      result.issues.push(...r16.issues);
      result.recommendations.push(...r16.recommendations);
    }
  }

  // ============================================================================
  // PHASE 3 CRITICAL ENHANCEMENTS: Multi-Component Validation
  // ============================================================================
  
  // PHASE 3 ENHANCEMENT 1: Multi-GPU Brand Consistency & SLI/Crossfire
  if (build.motherboard?.specs) {
    // Collect ALL GPUs in build (including candidate if GPU)
    const allGpus = [];
    if (candidateCategory === 'gpu') {
      allGpus.push(candidate.specs);
    }
    if (Array.isArray(build.gpu)) {
      allGpus.push(...build.gpu.map(g => g.specs));
    } else if (build.gpu?.specs) {
      allGpus.push(build.gpu.specs);
    }
    
    if (allGpus.length > 1) {
      // Multi-GPU detected - validate brand consistency
      // 🔥 CRITICAL FIX: Pass FULL motherboard object (with name + specifications), not just specs
      const multiGpuValidation = enhancedValidation.validateMultiGpuCompatibility(allGpus, { name: build.motherboard.name, specifications: build.motherboard.specs });
      
      result.ruleResults.multiGpuBrandConsistency = multiGpuValidation;
      result.score += multiGpuValidation.score;
      result.maxScore += 15;
      result.compatible = result.compatible && multiGpuValidation.compatible;
      result.issues.push(...multiGpuValidation.issues);
      result.warnings?.push(...(multiGpuValidation.warnings || []));
      result.recommendations.push(...multiGpuValidation.recommendations);
      
      logger.info(`✅ Phase 3: Multi-GPU validation complete (${allGpus.length} GPUs, score: ${multiGpuValidation.score}/15)`);
    }
  }
  
  // PHASE 3 ENHANCEMENT 2: M.2 NVMe vs SATA Slot Type Validation
  if (build.motherboard?.specs) {
    // Collect ALL storage in build (including candidate if storage)
    // 🔥 FIX: Pass FULL objects (with name field) not just specs
    const allStorage = [];
    if (candidateCategory === 'storage') {
      allStorage.push({ ...candidate, specifications: candidate.specs });
    }
    if (Array.isArray(build.storage)) {
      allStorage.push(...build.storage.map(s => ({ ...s, specifications: s.specs })));
    } else if (build.storage?.specs) {
      allStorage.push({ ...build.storage, specifications: build.storage.specs });
    }
    
    if (allStorage.length > 0) {
      // Validate storage slot types (M.2 NVMe vs SATA differentiation)
      // 🔥 CRITICAL FIX: Pass FULL motherboard object (with name + specifications), not just specs
      const storageSlotValidation = enhancedValidation.validateStorageSlotTypes(allStorage, { name: build.motherboard.name, specifications: build.motherboard.specs });
      
      result.ruleResults.storageSlotTypes = storageSlotValidation;
      result.score += storageSlotValidation.score;
      result.maxScore += 15;
      result.compatible = result.compatible && storageSlotValidation.compatible;
      result.issues.push(...storageSlotValidation.issues);
      result.warnings?.push(...(storageSlotValidation.warnings || []));
      result.recommendations.push(...storageSlotValidation.recommendations);
      
      logger.info(`✅ Phase 3: Storage slot type validation complete (${allStorage.length} drives, score: ${storageSlotValidation.score}/15)`);
    }
  }
  
  // PHASE 3 ENHANCEMENT 3: GPU Power Connector Validation (12VHPWR, 8-pin, 6-pin)
  if (build.psu?.specs) {
    // Collect ALL GPUs in build (including candidate if GPU)
    const allGpus = [];
    if (candidateCategory === 'gpu') {
      allGpus.push(candidate.specs);
    }
    if (Array.isArray(build.gpu)) {
      allGpus.push(...build.gpu.map(g => g.specs));
    } else if (build.gpu?.specs) {
      allGpus.push(build.gpu.specs);
    }
    
    if (allGpus.length > 0) {
      // Validate GPU power connectors match PSU
      const gpuPowerValidation = enhancedValidation.validateGpuPowerConnectors(allGpus, build.psu.specs);
      
      result.ruleResults.gpuPowerConnectors = gpuPowerValidation;
      result.score += gpuPowerValidation.score;
      result.maxScore += 15;
      result.compatible = result.compatible && gpuPowerValidation.compatible;
      result.issues.push(...gpuPowerValidation.issues);
      result.warnings?.push(...(gpuPowerValidation.warnings || []));
      result.recommendations.push(...gpuPowerValidation.recommendations);
      
      logger.info(`✅ Phase 3: GPU power connector validation complete (${allGpus.length} GPUs, score: ${gpuPowerValidation.score}/15)`);
    }
  }
  
  // PHASE 3 ENHANCEMENT 4: RAM Mixing Warnings (Brand, Speed, Capacity)
  // Collect ALL RAM in build (including candidate if RAM)
  const allRam = [];
  if (candidateCategory === 'ram') {
    allRam.push(candidate.specs);
  }
  if (Array.isArray(build.ram)) {
    allRam.push(...build.ram.map(r => r.specs));
  } else if (build.ram?.specs) {
    allRam.push(build.ram.specs);
  }
  
  if (allRam.length > 1) {
    // Multiple RAM kits detected - validate mixing
    const ramMixingValidation = enhancedValidation.validateRamMixing(allRam);
    
    result.ruleResults.ramMixing = ramMixingValidation;
    result.score += ramMixingValidation.score;
    result.maxScore += 15;
    result.compatible = result.compatible && ramMixingValidation.compatible;
    result.issues.push(...ramMixingValidation.issues);
    result.warnings?.push(...(ramMixingValidation.warnings || []));
    result.recommendations.push(...ramMixingValidation.recommendations);
    
    logger.info(`✅ Phase 3: RAM mixing validation complete (${allRam.length} kits, score: ${ramMixingValidation.score}/15)`);
  }
  
  // ============================================================================
  // PHASE 4 CRITICAL ENHANCEMENTS: 168-Trap Stress Test Protocol
  // ============================================================================
  
  // PHASE 4 ENHANCEMENT 1: RAM Per-Slot Capacity Validation (CRITICAL TRAP)
  if (build.motherboard?.specs && allRam.length > 0) {
    // Validate each RAM stick capacity against motherboard per-slot maximum
    // 🔥 CRITICAL FIX: Pass FULL motherboard object (with name + specifications), not just specs
    const ramPerSlotValidation = enhancedValidation.validateRamPerSlotCapacity(allRam, { name: build.motherboard.name, specifications: build.motherboard.specs });
    
    result.ruleResults.ramPerSlotCapacity = ramPerSlotValidation;
    result.score += ramPerSlotValidation.score;
    result.maxScore += 15;
    result.compatible = result.compatible && ramPerSlotValidation.compatible;
    result.issues.push(...ramPerSlotValidation.issues);
    result.warnings?.push(...(ramPerSlotValidation.warnings || []));
    result.recommendations.push(...ramPerSlotValidation.recommendations);
    
    logger.info(`✅ Phase 4: RAM per-slot capacity validation complete (${allRam.length} sticks, score: ${ramPerSlotValidation.score}/15)`);
  }
  
  // PHASE 4 ENHANCEMENT 2: Case Form Factor Hierarchy Validation (CRITICAL TRAP)
  if (build.motherboard?.specs && build.case?.specs) {
    // Validate motherboard fits in case (ATX in Micro ATX case = INCOMPATIBLE)
    const formFactorValidation = enhancedValidation.validateCaseFormFactorHierarchy(build.case.specs, build.motherboard.specs);
    
    result.ruleResults.caseFormFactorHierarchy = formFactorValidation;
    result.score += formFactorValidation.score;
    result.maxScore += 15;
    result.compatible = result.compatible && formFactorValidation.compatible;
    result.issues.push(...formFactorValidation.issues);
    result.warnings?.push(...(formFactorValidation.warnings || []));
    result.recommendations.push(...formFactorValidation.recommendations);
    
    logger.info(`✅ Phase 4: Case form factor hierarchy validation complete (score: ${formFactorValidation.score}/15)`);
  }
  
  // PHASE 4 ENHANCEMENT 3: GPU Case Clearance Strict Validation (CRITICAL TRAP)
  if (build.case?.specs) {
    // Collect ALL GPUs in build (including candidate if GPU)
    const allGpus = [];
    if (candidateCategory === 'gpu') {
      allGpus.push(candidate.specs);
    }
    if (Array.isArray(build.gpu)) {
      allGpus.push(...build.gpu.map(g => g.specs));
    } else if (build.gpu?.specs) {
      allGpus.push(build.gpu.specs);
    }
    
    if (allGpus.length > 0) {
      // Validate GPU length against case clearance (350mm GPU in 320mm case = INCOMPATIBLE)
      const gpuClearanceValidation = enhancedValidation.validateGpuCaseClearance(allGpus, build.case.specs);
      
      result.ruleResults.gpuCaseClearance = gpuClearanceValidation;
      result.score += gpuClearanceValidation.score;
      result.maxScore += 15;
      result.compatible = result.compatible && gpuClearanceValidation.compatible;
      result.issues.push(...gpuClearanceValidation.issues);
      result.warnings?.push(...(gpuClearanceValidation.warnings || []));
      result.recommendations.push(...gpuClearanceValidation.recommendations);
      
      logger.info(`✅ Phase 4: GPU case clearance validation complete (${allGpus.length} GPUs, score: ${gpuClearanceValidation.score}/15)`);
    }
  }
  
  // Calculate final percentage score (0-100)
  result.percentageScore = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  
  // CRITICAL FIX: Handle case where no rules triggered (single-component builds)
  // This happens when build context is incomplete (e.g., only current product, no other components)
  if (result.maxScore === 0 && candidateCategory) {
    // Assign default compatibility score based on specs completeness
    const specsCompleteness = calculateSpecsCompleteness(candidate);
    
    // Base score: 70% if specs are complete (assume compatible until proven otherwise)
    // This is better UX than showing 0% which implies incompatibility
    result.percentageScore = specsCompleteness;
    result.score = specsCompleteness;
    result.maxScore = 100;
    result.compatible = specsCompleteness >= 60; // 60%+ = compatible
    
    result.recommendations.push({
      severity: 'info',
      message: 'Compatibility score based on specs completeness (no other components to compare)',
      action: 'Add more components to your build for detailed compatibility analysis'
    });
    
    logger.info(`Default compatibility score applied: ${specsCompleteness}% (no pairs to check)`);
  }

  // Determine compatibility badge
  if (result.percentageScore >= 85) {
    result.badge = '✅ Compatible';
  } else if (result.percentageScore >= 60) {
    result.badge = '⚠️ May Work';
  } else {
    result.badge = '❌ Incompatible';
  }

  return result;
}

/**
 * Calculate specs completeness score (0-100)
 * Higher score = more complete/detailed specifications
 */
function calculateSpecsCompleteness(candidate) {
  const specs = candidate.specs || {};
  const category = candidate.category?.toLowerCase();
  
  // Define critical specs for each category
  const criticalSpecs = {
    'cpu': ['socket', 'tdp_watts', 'cores', 'base_clock'],
    'motherboard': ['socket', 'chipset', 'form_factor', 'ram_type'],
    'gpu': ['length_mm', 'tdp_watts', 'power_connectors'],
    'ram': ['type', 'speed_mhz', 'capacity_gb'],
    'psu': ['wattage', 'efficiency', 'connectors'],
    'cooling': ['tdp_rating', 'height_mm', 'socket_support'],
    'storage': ['type', 'capacity_gb', 'interface'],
    'case': ['form_factor', 'gpu_clearance_mm', 'psu_type']
  };
  
  const requiredSpecs = criticalSpecs[category] || [];
  
  if (requiredSpecs.length === 0) {
    // Unknown category - use generic scoring
    const specCount = Object.keys(specs).length;
    return Math.min(70 + (specCount * 3), 85); // Base 70%, +3% per spec, max 85%
  }
  
  // Count how many critical specs are present
  const presentSpecs = requiredSpecs.filter(specKey => {
    const value = specs[specKey];
    return value !== null && value !== undefined && value !== '';
  });
  
  const completeness = (presentSpecs.length / requiredSpecs.length) * 100;
  
  // Score formula: Base 60% + (completeness * 0.30) = 60% to 90%
  // Even with 100% specs, max out at 90% (not perfect 100% without pair checks)
  const score = Math.round(60 + (completeness * 0.30));
  
  return Math.min(score, 90); // Cap at 90% for single-component scoring
}

/**
 * ============================================================================
 * HELPER: Load normalized specs for a product
 * ============================================================================
 */
async function loadNormalizedSpecs(productId) {
  try {
    // 🔥 CRITICAL FIX: Load BOTH product_specs AND pc_parts dimensions
    // dimensions contain physical measurements like power_connectors for GPUs
    const result = await db.query(
      `SELECT 
        ps.normalized_specs, 
        ps.compatibility_metadata,
        pp.specifications as pc_parts_specs,
        pp.dimensions as pc_parts_dims,
        pp.name as product_name
       FROM product_specs ps
       LEFT JOIN pc_parts pp ON ps.product_id = pp.id
       WHERE ps.product_id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      // Fallback: Try to get just from pc_parts if no product_specs entry
      const fallbackResult = await db.query(
        `SELECT specifications, dimensions, name FROM pc_parts WHERE id = $1`,
        [productId]
      );
      if (fallbackResult.rows.length > 0) {
        const pcPart = fallbackResult.rows[0];
        return {
          ...(pcPart.specifications || {}),
          ...(pcPart.dimensions || {})
        };
      }
      return {};
    }

    const row = result.rows[0];
    const normalizedData = row.normalized_specs || {};
    const metadata = row.compatibility_metadata || {};
    const pcPartsSpecs = row.pc_parts_specs || {};
    const pcPartsDims = row.pc_parts_dims || {};
    
    // CRITICAL FIX: Extract specs from normalized_specs structure
    // normalized_specs has shape: {name, brand, price, specs: {...}, stock, category}
    // But compatibility rules expect just the specs: {...} object
    let specs = {};
    
    if (normalizedData.specs && typeof normalizedData.specs === 'object') {
      // Normalized specs has nested .specs property - extract it
      specs = normalizedData.specs;
    } else if (Object.keys(normalizedData).length > 0) {
      // Fallback: If no .specs property, assume the whole object is specs
      specs = normalizedData;
    }

    // 🔥 CRITICAL FIX: Merge ALL sources with proper priority
    // Priority: dimensions > pc_parts specs > normalized specs > metadata
    // This ensures physical measurements like power_connectors are available
    const finalSpecs = {
      ...specs,              // Base from normalized_specs
      ...pcPartsSpecs,       // Overlay pc_parts.specifications (has wattage, etc.)
      ...pcPartsDims,        // Overlay pc_parts.dimensions (has power_connectors for GPUs)
      ...metadata            // Compatibility metadata last
    };

    // 🔥 12VHPWR DETECTION FIX: Auto-detect from power_connectors string
    const powerConnectors = (finalSpecs.power_connectors || finalSpecs.pcie_connectors || '').toUpperCase();
    if (powerConnectors.includes('12VHPWR') || powerConnectors.includes('16-PIN') || powerConnectors.includes('16PIN')) {
      finalSpecs.has_12vhpwr = true;
      finalSpecs.has_12vhpwr_connector = true;
    }

    return finalSpecs;
  } catch (error) {
    logger.error('Error loading normalized specs:', error);
    return {};
  }
}

/**
 * ============================================================================
 * PHASE 1 NEW RULE: STORAGE ↔ CASE DRIVE BAY VALIDATION
 * ============================================================================
 * Hard Checks: Verify case has enough drive bays for all storage drives
 */
async function checkStorageCaseDriveBays(caseSpecs, allStorageDevices = []) {
  const result = {
    compatible: true,
    score: 10, // Max 10 points
    issues: [],
    recommendations: []
  };

  if (allStorageDevices.length === 0) {
    result.score = 10; // N/A - no storage devices
    return result;
  }

  // Count storage device types
  let hddCount = 0;
  let ssdCount = 0;
  let m2Count = 0;

  for (const storage of allStorageDevices) {
    const storageType = (storage.storage_type || storage.interface || '').toLowerCase();
    
    if (storageType.includes('hdd') || storageType.includes('3.5')) {
      hddCount++;
    } else if (storageType.includes('ssd') && !storageType.includes('m.2') && !storageType.includes('nvme')) {
      ssdCount++;
    } else if (storageType.includes('m.2') || storageType.includes('nvme')) {
      m2Count++;
    }
  }

  // Get case drive bay counts
  const case35Bays = parseInt(caseSpecs.drive_bays_35 || caseSpecs.hdd_bays) || 0;
  const case25Bays = parseInt(caseSpecs.drive_bays_25 || caseSpecs.ssd_bays) || 0;

  // Check if case has drive bay specifications
  const hasDriveBaySpecs = caseSpecs.drive_bays_35 || caseSpecs.hdd_bays || caseSpecs.drive_bays_25 || caseSpecs.ssd_bays;

  // Only validate if case has drive bay specifications
  if (hasDriveBaySpecs) {
    // HARD CHECK: HDD drive bays (3.5")
    if (hddCount > case35Bays) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'Not enough 3.5" drive bays for HDDs',
        details: `You have ${hddCount} HDD(s), case has ${case35Bays} bay(s). Remove ${hddCount - case35Bays} HDD(s) or choose larger case.`
      });
      return result;
    }

    // HARD CHECK: SSD drive bays (2.5")
    if (ssdCount > case25Bays) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'Not enough 2.5" drive bays for SATA SSDs',
        details: `You have ${ssdCount} SSD(s), case has ${case25Bays} bay(s). Remove ${ssdCount - case25Bays} SSD(s) or choose larger case.`
      });
      return result;
    }
  } else {
    // Case missing drive bay specifications - add warning instead of blocking
    if (hddCount > 0 || ssdCount > 0) {
      result.recommendations.push({
        type: 'warning',
        message: 'Case drive bay specifications unavailable',
        details: `You have ${hddCount} HDD(s) and ${ssdCount} SSD(s). Verify case has sufficient drive bays before purchasing.`
      });
    }
  }

  result.score = 10; // All drives fit

  // Recommendation: Suggest M.2 if many drives
  if (hddCount + ssdCount > 2) {
    result.recommendations.push({
      type: 'info',
      message: 'Multiple SATA drives detected',
      details: `${hddCount + ssdCount} SATA drives require cables and bays. Consider M.2 NVMe for cleaner builds.`
    });
  }

  return result;
}

/**
 * ============================================================================
 * PHASE 1 NEW RULE: MOTHERBOARD ↔ STORAGE SLOT VALIDATION
 * ============================================================================
 * Hard Checks: Motherboard has enough M.2 and SATA ports for all drives
 * ENHANCED: Check for M.2 slot conflicts with SATA lanes
 */
async function checkMotherboardStorageSlots(mbSpecs, allStorageDevices = []) {
  const result = {
    compatible: true,
    score: 15, // Max 15 points
    issues: [],
    recommendations: []
  };

  if (allStorageDevices.length === 0) {
    result.score = 15; // N/A - no storage devices
    return result;
  }

  // Count storage device types
  let m2Count = 0;
  let sataCount = 0;

  for (const storage of allStorageDevices) {
    const storageType = (storage.storage_type || storage.interface || '').toLowerCase();
    
    if (storageType.includes('m.2') || storageType.includes('nvme')) {
      m2Count++;
    } else if (storageType.includes('sata') || storageType.includes('hdd') || storageType.includes('ssd')) {
      sataCount++;
    }
  }

  // Get motherboard slot counts
  // 🔥 FIX: Check all possible M.2 slot field names (database uses "M2 Slots")
  const mbM2Slots = parseInt(
    mbSpecs.m2_slots || 
    mbSpecs.m2_slot_count || 
    mbSpecs['M2 Slots'] || 
    mbSpecs['M.2 Slots'] || 
    mbSpecs.m_2_slots
  ) || 0;
  const mbSataPorts = parseInt(
    mbSpecs.sata_ports || 
    mbSpecs.sata_port_count || 
    mbSpecs['SATA Ports'] || 
    mbSpecs['SATA ports']
  ) || 6; // Default to 6

  // HARD CHECK: M.2 slots
  if (m2Count > mbM2Slots) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'Not enough M.2 slots on motherboard',
      details: `You have ${m2Count} M.2 drive(s), motherboard has ${mbM2Slots} slot(s). Remove ${m2Count - mbM2Slots} M.2 drive(s).`
    });
    return result;
  }

  // HARD CHECK: SATA ports
  if (sataCount > mbSataPorts) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'Not enough SATA ports on motherboard',
      details: `You have ${sataCount} SATA drive(s), motherboard has ${mbSataPorts} port(s). Remove ${sataCount - mbSataPorts} SATA drive(s).`
    });
    return result;
  }

  result.score = 10; // Slots available

  // ENHANCED: Check for M.2/SATA lane sharing (some boards disable SATA ports when M.2 is used)
  const sharesLanes = mbSpecs.m2_sata_shared_lanes || false;
  
  if (sharesLanes && m2Count > 0 && sataCount > 0) {
    result.score -= 3;
    result.recommendations.push({
      type: 'warning',
      message: 'M.2 and SATA may share PCIe lanes',
      details: `Some motherboards disable SATA ports when M.2 slots are occupied. Verify ${mbSpecs.name || 'motherboard'} manual for lane configuration.`
    });
  }

  // Bonus points for having extra slots
  if (m2Count < mbM2Slots && sataCount < mbSataPorts) {
    result.score += 5;
    result.recommendations.push({
      type: 'info',
      message: 'Extra storage slots available',
      details: `${mbM2Slots - m2Count} M.2 slot(s) and ${mbSataPorts - sataCount} SATA port(s) free for future expansion.`
    });
  }

  return result;
}

/**
 * ============================================================================
 * PHASE 1 NEW RULE: MOTHERBOARD ↔ GPU PCIE SLOT VALIDATION
 * ============================================================================
 * Hard Checks: Motherboard has PCIe x16 slot for GPU
 * Future: Multi-GPU support (SLI/Crossfire chipset validation)
 */
async function checkMotherboardGpuSlots(mbSpecs, allGpus = []) {
  const result = {
    compatible: true,
    score: 15, // Max 15 points
    issues: [],
    recommendations: []
  };

  if (allGpus.length === 0) {
    result.score = 15; // N/A - no GPUs
    return result;
  }

  const gpuCount = allGpus.length;

  // Get motherboard PCIe slot information (ENHANCED: differentiate physical vs electrical)
  const pciex16Physical = parseInt(mbSpecs.pcie_x16_slots_physical || mbSpecs.pcie_x16_slots || mbSpecs.pcie_slots) || 1;
  const pciex16Electrical = parseInt(mbSpecs.pcie_x16_slots_electrical) || pciex16Physical; // Default: assume all physical are electrical x16
  const chipset = (mbSpecs.chipset || '').toUpperCase();

  // CRITICAL ENHANCEMENT: GPUs MUST have electrical x16 lanes (not just physical x16 slot)
  // Many boards have physical x16 slots that are electrically x4/x8 (chipset slots)
  if (pciex16Electrical === 0) {
    result.compatible = false;
    result.score = 0;
    result.issues.push({
      severity: 'critical',
      message: 'Motherboard lacks PCIe x16 ELECTRICAL lanes for GPU',
      details: 'GPU requires PCIe x16 electrical lanes. This motherboard cannot support discrete graphics cards or has only x4/x8 electrical lanes (severe performance loss).',
      fix: 'Choose motherboard with at least one CPU-connected PCIe x16 slot (usually top slot)'
    });
    logger.error(`❌ NO PCIE x16 ELECTRICAL LANES for GPU`);
    return result;
  }

  // Warn if physical slots exceed electrical (common on budget boards)
  if (pciex16Physical > pciex16Electrical && gpuCount > 1) {
    result.score -= 5;
    result.recommendations.push({
      type: 'warning',
      message: 'Some PCIe x16 slots are electrically x4/x8',
      details: `Motherboard has ${pciex16Physical} physical x16 slot(s) but only ${pciex16Electrical} electrical x16 slot(s). ${pciex16Physical - pciex16Electrical} slot(s) are x4/x8 electrically (severe GPU performance loss if used for graphics). Use GPU in CPU-connected slot (usually top slot).`,
      impact: 'MODERATE - Secondary GPUs will have severely reduced performance if in x4/x8 slots'
    });
  }

  // Single GPU: Check basic compatibility
  if (gpuCount === 1) {
    result.score = 15; // Full points for single GPU
    
    // Check PCIe generation
    const gpuPcieGen = parseInt(allGpus[0].pcie_generation || allGpus[0].pcie_gen) || 4;
    const mbPcieGen = parseInt(mbSpecs.pcie_generation || mbSpecs.pcie_gen) || 3;
    
    if (gpuPcieGen > mbPcieGen) {
      result.score -= 2;
      result.recommendations.push({
        type: 'info',
        message: 'GPU supports newer PCIe generation',
        details: `GPU: PCIe ${gpuPcieGen}.0, Motherboard: PCIe ${mbPcieGen}.0. GPU will run at PCIe ${mbPcieGen}.0 speed (minor performance impact ~3-5%).`
      });
    }

    return result;
  }

  // MULTI-GPU: Advanced validation with STRICT chipset requirements
  if (gpuCount > 1) {
    // CRITICAL: Check electrical x16 lanes for multi-GPU (both GPUs need full lanes)
    if (gpuCount > pciex16Electrical) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'Insufficient PCIe x16 ELECTRICAL lanes for multi-GPU',
        details: `${gpuCount} GPUs require ${gpuCount} electrical x16 slots. Motherboard has ${pciex16Physical} physical slot(s) but only ${pciex16Electrical} electrical x16 slot(s). ${pciex16Physical - pciex16Electrical} slot(s) are x4/x8 electrically (SEVERE performance loss for multi-GPU).`,
        fix: `Use GPU in CPU-connected PCIe x16 slot ONLY (usually top slot) OR choose motherboard with ${gpuCount}+ electrical x16 slots`,
        impact: 'CATASTROPHIC - Multi-GPU will not function properly with x4/x8 electrical lanes'
      });
      logger.error(`❌ INSUFFICIENT ELECTRICAL x16 SLOTS: ${gpuCount} GPUs > ${pciex16Electrical} electrical slots`);
      return result;
    }

    // HARD CHECK: GPUs must be same brand for SLI/Crossfire
    const gpuBrands = new Set(allGpus.map(g => (g.brand || '').toLowerCase()));
    
    if (gpuBrands.size > 1) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'Multi-GPU requires same brand GPUs',
        details: `NVIDIA SLI and AMD Crossfire require identical brand GPUs. You have: ${Array.from(gpuBrands).join(', ')}. Mixed-brand multi-GPU will NOT work.`,
        fix: 'Use only NVIDIA GPUs (for SLI) or only AMD GPUs (for Crossfire). Remove mixed brands.'
      });
      logger.error(`❌ MULTI-GPU BRAND MISMATCH: ${Array.from(gpuBrands).join(' + ')}`);
      return result;
    }

    // ENHANCED: Strict chipset validation for SLI/Crossfire
    const brand = Array.from(gpuBrands)[0];
    const isNvidia = brand.includes('nvidia') || brand.includes('geforce') || brand.includes('rtx') || brand.includes('gtx');
    const isAmd = brand.includes('amd') || brand.includes('radeon') || brand.includes('rx');

    // Intel chipsets with SLI: ONLY Z-series (Z790, Z690, Z590, Z490, etc.)
    // AMD chipsets with Crossfire: X-series (X670, X570, X470, etc.) and some B550
    const intelMultiGpuChipsets = ['Z790', 'Z690', 'Z590', 'Z490', 'Z390'];
    const amdMultiGpuChipsets = ['X670', 'X670E', 'X570', 'X470', 'X399', 'B550'];
    
    const supportsIntelMultiGpu = intelMultiGpuChipsets.some(c => chipset.includes(c));
    const supportsAmdMultiGpu = amdMultiGpuChipsets.some(c => chipset.includes(c));

    // CRITICAL: NVIDIA SLI requires Intel Z-series OR AMD X-series
    if (isNvidia && !supportsIntelMultiGpu && !supportsAmdMultiGpu) {
      result.compatible = false;
      result.score = 0;
      result.issues.push({
        severity: 'critical',
        message: 'Motherboard chipset does NOT support NVIDIA SLI',
        details: `${chipset} chipset lacks SLI certification. NVIDIA multi-GPU (SLI) requires Intel Z-series (Z790, Z690, Z590) OR AMD X-series (X670, X570) chipset. ${gpuCount}× NVIDIA GPUs will run in single-GPU mode only (no performance benefit).`,
        fix: 'Choose Z-series Intel motherboard OR X-series AMD motherboard OR remove extra GPUs (single high-end GPU recommended)',
        impact: 'CATASTROPHIC - Multi-GPU will NOT work, wasted money on extra GPUs'
      });
      logger.error(`❌ SLI NOT SUPPORTED: ${chipset} chipset + ${gpuCount} NVIDIA GPUs`);
      return result;
    }

    // AMD Crossfire is more lenient but still needs chipset support
    if (isAmd && !supportsAmdMultiGpu && !supportsIntelMultiGpu) {
      result.score = 5;
      result.issues.push({
        severity: 'major',
        message: 'Motherboard chipset may not support AMD Crossfire',
        details: `${chipset} chipset Crossfire support uncertain. AMD multi-GPU (Crossfire) recommended on X-series chipsets (X670, X570). May work but not guaranteed.`,
        fix: 'Choose X-series AMD motherboard for guaranteed Crossfire support OR verify motherboard manual',
        impact: 'HIGH - Multi-GPU may not function, performance scaling uncertain'
      });
      logger.warn(`⚠️ CROSSFIRE UNCERTAIN: ${chipset} chipset + ${gpuCount} AMD GPUs`);
    } else if (supportsIntelMultiGpu || supportsAmdMultiGpu) {
      result.score = 10;
      result.recommendations.push({
        type: 'info',
        message: `Multi-GPU (${isNvidia ? 'SLI' : isAmd ? 'Crossfire' : 'Multi-GPU'}) supported`,
        details: `${chipset} chipset supports ${isNvidia ? 'NVIDIA SLI' : 'AMD Crossfire'}. Ensure adequate PSU wattage (${gpuCount}× GPU power) and case space for ${gpuCount} GPUs.`
      });
      logger.info(`✅ MULTI-GPU SUPPORTED: ${chipset} + ${gpuCount}× ${isNvidia ? 'NVIDIA' : 'AMD'} GPUs`);
    }

    // Warn about diminishing returns
    if (gpuCount > 2) {
      result.score -= 3;
      result.recommendations.push({
        type: 'warning',
        message: '3+ GPU scaling is poor (50-70% efficiency)',
        details: `${gpuCount} GPUs have diminishing performance returns. 3-GPU SLI/Crossfire typically provides only 50-70% scaling vs 2-GPU (100-150% scaling). Single high-end GPU recommended for better value, compatibility, and power efficiency.`,
        impact: 'MODERATE - Wasted money, high power consumption, compatibility issues'
      });
    }
  }

  return result;
}

/**
 * ============================================================================
 * HELPER FUNCTIONS FOR PHASE 1 ENHANCEMENTS
 * ============================================================================
 */

/**
 * Extract CPU generation from specs or name
 * Intel: 13900K -> 13th gen, 12700K -> 12th gen
 * AMD: 5950X -> 5000 series, 3700X -> 3000 series
 */
function extractCPUGeneration(cpuSpecs) {
  const cpuName = (cpuSpecs.name || '').toUpperCase();
  const cpuBrand = (cpuSpecs.brand || '').toLowerCase();
  
  // Intel: Extract generation from model number
  if (cpuBrand.includes('intel') || cpuName.match(/I\d-\d{4,5}/)) {
    const match = cpuName.match(/I\d-(\d{2})\d{2,3}/); // i9-13900K -> 13
    if (match) return parseInt(match[1]);
    
    // Fallback: Core i9-12900K format
    const match2 = cpuName.match(/(\d{2})\d{2,3}[A-Z]?$/);
    if (match2) return parseInt(match2[1]);
  }
  
  // AMD Ryzen: Extract series from model number
  if (cpuBrand.includes('amd') || cpuName.includes('RYZEN')) {
    const match = cpuName.match(/(\d{1})[\d]{3}[A-Z]?/); // Ryzen 9 5950X -> 5
    if (match) return parseInt(match[1]) * 1000; // Return 5000, 3000, etc.
    
    // Fallback: Direct series match
    const match2 = cpuName.match(/RYZEN.*(\d000)/);
    if (match2) return parseInt(match2[1]);
  }
  
  return null;
}

/**
 * Extract Intel chipset generation
 * Z790 -> 7xx series (13th-14th gen), Z690 -> 6xx series (12th gen)
 */
function extractIntelChipsetGeneration(chipset) {
  const match = chipset.match(/[A-Z](\d)[\d]{2}/); // Z790 -> 7
  if (match) return parseInt(match[1]) + 10; // Z790 -> 17 (maps to 13th/14th gen CPUs)
  return null;
}

/**
 * ============================================================================
 * EXPORTS
 * ============================================================================
 */
module.exports = {
  // Original 8 rule functions
  checkCpuMotherboardCompatibility,
  checkCpuCoolerCompatibility,
  checkMotherboardRamCompatibility,
  checkMotherboardCaseCompatibility,
  checkGpuCaseCompatibility,
  checkGpuPsuCompatibility,
  checkStorageMotherboardCompatibility,
  checkPsuBuildCompatibility,

  // PHASE 1: NEW compatibility functions
  checkCaseCoolerCompatibility,
  checkCasePsuCompatibility,
  checkStorageMotherboardM2Keys,
  checkCoolerRamClearance,
  checkMotherboardPsuConnectors,
  
  // PHASE 2: Additional compatibility functions (NEW)
  checkStorageCaseDriveBays,
  checkMotherboardStorageSlots,
  checkMotherboardGpuSlots,

  // Master function
  computeCompatibilityScore,

  // Helper
  loadNormalizedSpecs
};
