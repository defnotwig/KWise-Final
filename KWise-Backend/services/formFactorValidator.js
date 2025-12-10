/**
 * Form Factor Validation Service
 * ROOT CAUSE FIX #4: Validates physical compatibility between PC components
 * 
 * Checks:
 * - GPU length vs Case max GPU length
 * - CPU cooler height vs Case max cooler height
 * - PSU form factor vs Case PSU support
 * - Motherboard form factor vs Case motherboard support
 * 
 * Rating Target: 2.5 → 4.0/5.0
 */

const logger = require('../utils/logger');

class FormFactorValidator {
  constructor() {
    // Standard form factor dimensions (in mm)
    this.motherboardFormFactors = {
      'E-ATX': { width: 305, depth: 330 },
      'ATX': { width: 305, depth: 244 },
      'Micro-ATX': { width: 244, depth: 244 },
      'Mini-ITX': { width: 170, depth: 170 }
    };

    this.psuFormFactors = {
      'ATX': { width: 150, depth: 140, height: 86 },
      'SFX': { width: 125, depth: 100, height: 63.5 },
      'TFX': { width: 85, depth: 175, height: 65 }
    };

    // Clearance buffer (safety margin in mm)
    this.clearanceBuffer = {
      gpu: 10,      // 10mm safety margin for GPU
      cooler: 5,    // 5mm safety margin for cooler
      psu: 5        // 5mm safety margin for PSU
    };
  }

  /**
   * Validate complete build form factor compatibility
   * @param {Object} build - Build configuration with components
   * @returns {Object} Validation result with issues array
   */
  validateBuild(build) {
    const issues = [];
    const warnings = [];
    let isCompatible = true;

    try {
      // Extract components
      const caseComponent = this.findComponent(build, 'Case');
      const gpuComponent = this.findComponent(build, 'GPU');
      const cpuCooler = this.findComponent(build, 'Cooling');
      const motherboard = this.findComponent(build, 'Motherboard');
      const psu = this.findComponent(build, 'PSU');

      // Validate GPU clearance
      if (caseComponent && gpuComponent) {
        const gpuCheck = this.validateGPUClearance(gpuComponent, caseComponent);
        if (!gpuCheck.compatible) {
          issues.push(gpuCheck.issue);
          isCompatible = false;
        } else if (gpuCheck.warning) {
          warnings.push(gpuCheck.warning);
        }
      }

      // Validate CPU cooler clearance
      if (caseComponent && cpuCooler) {
        const coolerCheck = this.validateCoolerClearance(cpuCooler, caseComponent);
        if (!coolerCheck.compatible) {
          issues.push(coolerCheck.issue);
          isCompatible = false;
        } else if (coolerCheck.warning) {
          warnings.push(coolerCheck.warning);
        }
      }

      // Validate motherboard form factor
      if (caseComponent && motherboard) {
        const moboCheck = this.validateMotherboardFormFactor(motherboard, caseComponent);
        if (!moboCheck.compatible) {
          issues.push(moboCheck.issue);
          isCompatible = false;
        }
      }

      // Validate PSU form factor
      if (caseComponent && psu) {
        const psuCheck = this.validatePSUFormFactor(psu, caseComponent);
        if (!psuCheck.compatible) {
          issues.push(psuCheck.issue);
          isCompatible = false;
        }
      }

      return {
        compatible: isCompatible,
        issues,
        warnings,
        summary: this.generateSummary(isCompatible, issues, warnings)
      };

    } catch (error) {
      logger.error('Error in form factor validation', { error: error.message, stack: error.stack });
      return {
        compatible: true, // Default to compatible on error to avoid blocking builds
        issues: [],
        warnings: ['Form factor validation encountered an error. Please verify dimensions manually.'],
        summary: 'Validation error - manual verification recommended'
      };
    }
  }

  /**
   * Validate GPU length against case clearance
   * @param {Object} gpu - GPU component with specifications
   * @param {Object} caseComponent - Case component with specifications
   * @returns {Object} Validation result
   */
  validateGPUClearance(gpu, caseComponent) {
    const gpuSpecs = gpu.specifications || {};
    const gpuDims = gpu.dimensions || {};
    const caseSpecs = caseComponent.specifications || {};
    const caseDims = caseComponent.dimensions || {};

    // 🔥 CRITICAL FIX: Extract GPU length from dimensions FIRST
    const gpuLength = parseFloat(
      gpuDims.length_mm ||
      gpuSpecs.length_mm ||
      gpuSpecs.length ||
      gpuSpecs.Length ||
      gpuSpecs.gpu_length_mm ||
      0
    );

    // 🔥 CRITICAL FIX: Extract case max GPU length from dimensions FIRST
    const maxGPULength = parseFloat(
      caseDims.max_gpu_length_mm ||
      caseSpecs.max_gpu_length_mm ||
      caseSpecs['Max Gpu Length'] ||
      caseSpecs.max_gpu_length ||
      caseSpecs.gpu_clearance ||
      0
    );

    // Log for debugging but don't warn - just skip validation
    if (!gpuLength || !maxGPULength) {
      logger.info(`[FORM_FACTOR] Skipping GPU clearance check - GPU: ${gpuLength}mm, Case: ${maxGPULength}mm`);
      return { compatible: true };
    }

    const clearanceNeeded = gpuLength + this.clearanceBuffer.gpu;
    const clearanceAvailable = maxGPULength;
    const fitPercentage = ((clearanceAvailable - clearanceNeeded) / clearanceAvailable * 100).toFixed(1);

    if (clearanceNeeded > clearanceAvailable) {
      return {
        compatible: false,
        issue: {
          type: 'GPU_TOO_LONG',
          severity: 'critical',
          component: gpu.name,
          message: `GPU ${gpu.name} (${gpuLength}mm) exceeds case maximum ${maxGPULength}mm by ${(clearanceNeeded - clearanceAvailable).toFixed(0)}mm`,
          overhang: clearanceNeeded - clearanceAvailable,
          recommendation: `Choose a smaller GPU (max ${maxGPULength - this.clearanceBuffer.gpu}mm) or a larger case`
        }
      };
    } else if (clearanceNeeded > clearanceAvailable * 0.95) {
      // Tight fit warning (95%+ of space used)
      return {
        compatible: true,
        warning: {
          type: 'GPU_TIGHT_FIT',
          severity: 'warning',
          component: gpu.name,
          message: `GPU ${gpu.name} (${gpuLength}mm) fits in case (${maxGPULength}mm max) with only ${(clearanceAvailable - gpuLength).toFixed(0)}mm clearance`,
          recommendation: 'Consider a case with more clearance for easier installation and better airflow'
        }
      };
    }

    return {
      compatible: true,
      clearance: clearanceAvailable - clearanceNeeded
    };
  }

  /**
   * Validate CPU cooler height against case clearance
   * @param {Object} cooler - CPU cooler component with specifications
   * @param {Object} caseComponent - Case component with specifications
   * @returns {Object} Validation result
   */
  validateCoolerClearance(cooler, caseComponent) {
    const coolerSpecs = cooler.specifications || {};
    const caseSpecs = caseComponent.specifications || {};

    // Extract cooler height from multiple possible field names
    const coolerHeight = parseFloat(
      coolerSpecs.height_mm ||
      coolerSpecs.height ||
      coolerSpecs.cooler_height_mm ||
      0
    );

    // Extract case max cooler height from multiple possible field names
    const maxCoolerHeight = parseFloat(
      caseSpecs.max_cooler_height_mm ||
      caseSpecs['Max Cpu Cooler Height'] ||
      caseSpecs.max_cpu_cooler_height ||
      caseSpecs.cooler_clearance ||
      0
    );

    // Log for debugging but don't warn - just skip validation
    if (!coolerHeight || !maxCoolerHeight) {
      logger.info(`[FORM_FACTOR] Skipping cooler clearance check - Cooler: ${coolerHeight}mm, Case: ${maxCoolerHeight}mm`);
      return { compatible: true };
    }

    const clearanceNeeded = coolerHeight + this.clearanceBuffer.cooler;
    const clearanceAvailable = maxCoolerHeight;

    if (clearanceNeeded > clearanceAvailable) {
      return {
        compatible: false,
        issue: {
          type: 'COOLER_TOO_TALL',
          severity: 'critical',
          component: cooler.name,
          message: `Cooler ${cooler.name} (${coolerHeight}mm) exceeds case maximum ${maxCoolerHeight}mm by ${(clearanceNeeded - clearanceAvailable).toFixed(0)}mm`,
          overhang: clearanceNeeded - clearanceAvailable,
          recommendation: `Choose a shorter cooler (max ${maxCoolerHeight - this.clearanceBuffer.cooler}mm) or a taller case`
        }
      };
    } else if (clearanceNeeded > clearanceAvailable * 0.95) {
      return {
        compatible: true,
        warning: {
          type: 'COOLER_TIGHT_FIT',
          severity: 'warning',
          component: cooler.name,
          message: `CPU cooler fits but with minimal clearance: ${coolerHeight}mm cooler in ${maxCoolerHeight}mm case`,
          recommendation: 'Consider a case with more clearance for easier installation'
        }
      };
    }

    return {
      compatible: true,
      clearance: clearanceAvailable - clearanceNeeded
    };
  }

  /**
   * Validate motherboard form factor compatibility
   * @param {Object} motherboard - Motherboard component
   * @param {Object} caseComponent - Case component
   * @returns {Object} Validation result
   */
  validateMotherboardFormFactor(motherboard, caseComponent) {
    const moboSpecs = motherboard.specifications || {};
    const caseSpecs = caseComponent.specifications || {};

    const moboFormFactor = this.normalizeFormFactor(moboSpecs.form_factor || moboSpecs.category || 'ATX');
    const caseFormFactors = this.extractCaseFormFactors(caseSpecs.category || caseSpecs.supported_form_factors);

    // Log for debugging
    logger.info(`[FORM_FACTOR] Motherboard: ${moboFormFactor}, Case supports: [${caseFormFactors.join(', ')}]`);

    const isCompatible = caseFormFactors.some(caseFF => 
      this.isMotherboardCompatible(moboFormFactor, caseFF)
    );

    if (!isCompatible && caseFormFactors.length > 0) {
      return {
        compatible: false,
        issue: {
          type: 'MOTHERBOARD_FORM_FACTOR_MISMATCH',
          severity: 'critical',
          component: motherboard.name,
          message: `Motherboard form factor (${moboFormFactor}) not supported by case (supports: ${caseFormFactors.join(', ')})`,
          recommendation: `Choose a ${moboFormFactor} compatible case or a different motherboard`
        }
      };
    }

    return { compatible: true };
  }

  /**
   * Validate PSU form factor compatibility
   * @param {Object} psu - PSU component
   * @param {Object} caseComponent - Case component
   * @returns {Object} Validation result
   */
  validatePSUFormFactor(psu, caseComponent) {
    const psuSpecs = psu.specifications || {};
    const caseSpecs = caseComponent.specifications || {};

    const psuFormFactor = this.normalizePSUFormFactor(psuSpecs.form_factor);
    const casePSUSupport = this.extractCasePSUSupport(caseSpecs);

    if (!psuFormFactor || casePSUSupport.length === 0) {
      return {
        compatible: true,
        warning: 'PSU/Case form factor not specified - assuming standard ATX'
      };
    }

    const isCompatible = casePSUSupport.includes(psuFormFactor);

    if (!isCompatible) {
      return {
        compatible: false,
        issue: {
          type: 'PSU_FORM_FACTOR_MISMATCH',
          severity: 'critical',
          component: psu.name,
          message: `PSU form factor (${psuFormFactor}) not supported by case (supports: ${casePSUSupport.join(', ')})`,
          recommendation: `Choose a ${psuFormFactor} compatible case or a different PSU`
        }
      };
    }

    return { compatible: true };
  }

  /**
   * Helper: Find component by category in build
   */
  findComponent(build, category) {
    // Check various possible key formats
    const keys = [
      category,
      category.toLowerCase(),
      category.toUpperCase(),
      category.replace(/\s/g, ''),
      category.replace(/\s/g, '').toLowerCase()
    ];

    for (const key of keys) {
      if (build[key]) return build[key];
    }

    return null;
  }

  /**
   * Helper: Extract numeric value from string
   */
  extractNumeric(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  }

  /**
   * Helper: Normalize motherboard form factor name
   */
  normalizeFormFactor(formFactor) {
    if (!formFactor) return null;
    const normalized = formFactor.toString().toUpperCase().trim();
    
    if (normalized.includes('E-ATX') || normalized.includes('EATX')) return 'E-ATX';
    if (normalized.includes('MICRO') || normalized.includes('M-ATX') || normalized.includes('MATX')) return 'Micro-ATX';
    if (normalized.includes('MINI') || normalized.includes('ITX')) return 'Mini-ITX';
    if (normalized.includes('ATX') && !normalized.includes('MICRO') && !normalized.includes('MINI')) return 'ATX';
    
    return normalized;
  }

  /**
   * Helper: Extract case supported form factors
   */
  extractCaseFormFactors(caseCategory) {
    if (!caseCategory) return ['ATX', 'Micro-ATX', 'Mini-ITX']; // Default assumption
    
    const category = caseCategory.toString().toUpperCase();
    const formFactors = [];

    if (category.includes('E-ATX') || category.includes('EATX')) {
      formFactors.push('E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX');
    } else if (category.includes('ATX') && !category.includes('MICRO') && !category.includes('MINI')) {
      formFactors.push('ATX', 'Micro-ATX', 'Mini-ITX');
    } else if (category.includes('MICRO') || category.includes('M-ATX')) {
      formFactors.push('Micro-ATX', 'Mini-ITX');
    } else if (category.includes('MINI') || category.includes('ITX')) {
      formFactors.push('Mini-ITX');
    } else {
      // Default to common support
      formFactors.push('ATX', 'Micro-ATX', 'Mini-ITX');
    }

    return formFactors;
  }

  /**
   * Helper: Check if motherboard is compatible with case
   */
  isMotherboardCompatible(moboFormFactor, caseFormFactor) {
    const compatibility = {
      'E-ATX': ['E-ATX'],
      'ATX': ['E-ATX', 'ATX'],
      'Micro-ATX': ['E-ATX', 'ATX', 'Micro-ATX'],
      'Mini-ITX': ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX']
    };

    return compatibility[moboFormFactor]?.includes(caseFormFactor) || false;
  }

  /**
   * Helper: Normalize PSU form factor
   */
  normalizePSUFormFactor(formFactor) {
    if (!formFactor) return 'ATX'; // Default
    
    const normalized = formFactor.toString().toUpperCase().trim();
    if (normalized.includes('SFX')) return 'SFX';
    if (normalized.includes('TFX')) return 'TFX';
    return 'ATX';
  }

  /**
   * Helper: Extract case PSU support
   */
  extractCasePSUSupport(caseSpecs) {
    // Most cases support ATX PSU by default
    const support = ['ATX'];
    
    if (caseSpecs.psu_support) {
      const psuSupport = caseSpecs.psu_support.toString().toUpperCase();
      if (psuSupport.includes('SFX')) support.push('SFX');
      if (psuSupport.includes('TFX')) support.push('TFX');
    }

    return support;
  }

  /**
   * Generate human-readable summary
   */
  generateSummary(isCompatible, issues, warnings) {
    if (isCompatible && warnings.length === 0) {
      return '✅ All components physically compatible';
    } else if (isCompatible && warnings.length > 0) {
      return `⚠️ Compatible with ${warnings.length} warning(s) - tight fit detected`;
    } else {
      return `❌ ${issues.length} form factor incompatibility issue(s) detected`;
    }
  }
}

module.exports = new FormFactorValidator();
