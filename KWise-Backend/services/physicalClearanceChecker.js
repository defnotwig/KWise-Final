/**
 * Physical Clearance Checker Service
 * Validates physical compatibility between PC components
 * - GPU length vs Case clearance
 * - CPU Cooler height vs Case clearance  
 * - RAM height vs CPU Cooler clearance
 * - PSU length vs Case/GPU interference
 * 
 * Following K-Wise architecture patterns
 */

const db = require('../config/db');
const logger = require('../utils/logger');

class PhysicalClearanceChecker {
  /**
   * Check GPU length against case maximum GPU clearance
   * @param {Object} gpu - GPU component with dimensions
   * @param {Object} caseComponent - Case component with clearances
   * @returns {Promise<Object>} Compatibility result
   */
  async checkGpuVsCase(gpu, caseComponent) {
    try {
      // Extract GPU length from specifications or compatibility data
      const gpuLength = this.extractGpuLength(gpu);
      const caseMaxGpuLength = this.extractCaseMaxGpuLength(caseComponent);

      if (!gpuLength || !caseMaxGpuLength) {
        return {
          compatible: null,
          warning: 'Unable to determine physical dimensions. Manual verification recommended',
          severity: 'info'
        };
      }

      // Check clearance with 5mm safety margin
      const safetyMargin = 5;
      if (gpuLength > caseMaxGpuLength) {
        return {
          compatible: false,
          warning: `⚠️ GPU length (${gpuLength}mm) exceeds case maximum GPU clearance (${caseMaxGpuLength}mm)`,
          solution: 'Choose a larger case or shorter GPU. Consider removing drive cages if possible',
          severity: 'critical',
          measurements: {
            gpuLength,
            caseMaxGpuLength,
            clearanceDeficit: gpuLength - caseMaxGpuLength
          }
        };
      }

      if (gpuLength > caseMaxGpuLength - safetyMargin) {
        return {
          compatible: true,
          warning: `⚠️ Tight fit: GPU length (${gpuLength}mm) is very close to case limit (${caseMaxGpuLength}mm). ${caseMaxGpuLength - gpuLength}mm clearance only`,
          solution: 'Verify exact measurements. Consider slightly longer case for cable management',
          severity: 'medium',
          measurements: {
            gpuLength,
            caseMaxGpuLength,
            remainingClearance: caseMaxGpuLength - gpuLength
          }
        };
      }

      return {
        compatible: true,
        message: `✅ GPU length (${gpuLength}mm) fits comfortably in case (max ${caseMaxGpuLength}mm)`,
        severity: 'info',
        measurements: {
          gpuLength,
          caseMaxGpuLength,
          remainingClearance: caseMaxGpuLength - gpuLength
        }
      };
    } catch (error) {
      logger.error('Error checking GPU vs Case clearance', { error: error.message });
      return {
        compatible: null,
        error: 'Failed to check GPU clearance',
        severity: 'error'
      };
    }
  }

  /**
   * Check CPU cooler height against case maximum cooler clearance
   * @param {Object} cooler - CPU cooler with dimensions
   * @param {Object} caseComponent - Case component with clearances
   * @returns {Promise<Object>} Compatibility result
   */
  async checkCoolerVsCase(cooler, caseComponent) {
    try {
      const coolerHeight = this.extractCoolerHeight(cooler);
      const caseMaxCoolerHeight = this.extractCaseMaxCoolerHeight(caseComponent);

      if (!coolerHeight || !caseMaxCoolerHeight) {
        return {
          compatible: null,
          warning: 'Unable to determine cooler/case dimensions. Manual verification recommended',
          severity: 'info'
        };
      }

      // Check clearance with 3mm safety margin
      const safetyMargin = 3;
      if (coolerHeight > caseMaxCoolerHeight) {
        return {
          compatible: false,
          warning: `⚠️ CPU cooler height (${coolerHeight}mm) exceeds case maximum clearance (${caseMaxCoolerHeight}mm)`,
          solution: 'Choose a lower-profile cooler or larger case. AIO liquid coolers are an alternative',
          severity: 'critical',
          measurements: {
            coolerHeight,
            caseMaxCoolerHeight,
            clearanceDeficit: coolerHeight - caseMaxCoolerHeight
          }
        };
      }

      if (coolerHeight > caseMaxCoolerHeight - safetyMargin) {
        return {
          compatible: true,
          warning: `⚠️ Tight fit: Cooler height (${coolerHeight}mm) is very close to case limit (${caseMaxCoolerHeight}mm). ${caseMaxCoolerHeight - coolerHeight}mm clearance only`,
          solution: 'Verify measurements. Side panel may press against cooler causing noise',
          severity: 'medium',
          measurements: {
            coolerHeight,
            caseMaxCoolerHeight,
            remainingClearance: caseMaxCoolerHeight - coolerHeight
          }
        };
      }

      return {
        compatible: true,
        message: `✅ CPU cooler height (${coolerHeight}mm) fits comfortably in case (max ${caseMaxCoolerHeight}mm)`,
        severity: 'info',
        measurements: {
          coolerHeight,
          caseMaxCoolerHeight,
          remainingClearance: caseMaxCoolerHeight - coolerHeight
        }
      };
    } catch (error) {
      logger.error('Error checking Cooler vs Case clearance', { error: error.message });
      return {
        compatible: null,
        error: 'Failed to check cooler clearance',
        severity: 'error'
      };
    }
  }

  /**
   * Check RAM height against CPU cooler RAM clearance
   * @param {Object} ram - RAM module with dimensions
   * @param {Object} cooler - CPU cooler with clearances
   * @returns {Promise<Object>} Compatibility result
   */
  async checkRamVsCooler(ram, cooler) {
    try {
      const ramHeight = this.extractRamHeight(ram);
      const coolerRamClearance = this.extractCoolerRamClearance(cooler);

      if (!ramHeight || !coolerRamClearance) {
        return {
          compatible: null,
          warning: 'Unable to determine RAM/cooler dimensions. Check manually for tower coolers',
          severity: 'info'
        };
      }

      // Check clearance with 2mm safety margin
      const safetyMargin = 2;
      if (ramHeight > coolerRamClearance) {
        return {
          compatible: false,
          warning: `⚠️ RAM height (${ramHeight}mm) exceeds cooler RAM clearance (${coolerRamClearance}mm)`,
          solution: 'Use low-profile RAM (32-35mm height) or offset cooler fan. RGB RAM often too tall',
          severity: 'high',
          measurements: {
            ramHeight,
            coolerRamClearance,
            clearanceDeficit: ramHeight - coolerRamClearance
          }
        };
      }

      if (ramHeight > coolerRamClearance - safetyMargin) {
        return {
          compatible: true,
          warning: `⚠️ Tight fit: RAM height (${ramHeight}mm) close to cooler clearance (${coolerRamClearance}mm). ${coolerRamClearance - ramHeight}mm clearance only`,
          solution: 'May need to offset cooler fan upward. Install RAM before cooler',
          severity: 'medium',
          measurements: {
            ramHeight,
            coolerRamClearance,
            remainingClearance: coolerRamClearance - ramHeight
          }
        };
      }

      return {
        compatible: true,
        message: `✅ RAM height (${ramHeight}mm) clears CPU cooler (${coolerRamClearance}mm clearance)`,
        severity: 'info',
        measurements: {
          ramHeight,
          coolerRamClearance,
          remainingClearance: coolerRamClearance - ramHeight
        }
      };
    } catch (error) {
      logger.error('Error checking RAM vs Cooler clearance', { error: error.message });
      return {
        compatible: null,
        error: 'Failed to check RAM clearance',
        severity: 'error'
      };
    }
  }

  /**
   * Check PSU length vs case and GPU interference
   * @param {Object} psu - PSU with dimensions
   * @param {Object} caseComponent - Case with clearances
   * @param {Object} gpu - Optional GPU to check interference
   * @returns {Promise<Object>} Compatibility result
   */
  async checkPsuVsCase(psu, caseComponent, gpu = null) {
    try {
      const psuLength = this.extractPsuLength(psu);
      const caseMaxPsuLength = this.extractCaseMaxPsuLength(caseComponent);

      if (!psuLength || !caseMaxPsuLength) {
        return {
          compatible: null,
          warning: 'Unable to determine PSU/case dimensions',
          severity: 'info'
        };
      }

      if (psuLength > caseMaxPsuLength) {
        return {
          compatible: false,
          warning: `⚠️ PSU length (${psuLength}mm) exceeds case maximum (${caseMaxPsuLength}mm)`,
          solution: 'Choose shorter PSU (ATX standard is 140-160mm) or larger case',
          severity: 'critical',
          measurements: {
            psuLength,
            caseMaxPsuLength,
            clearanceDeficit: psuLength - caseMaxPsuLength
          }
        };
      }

      // Check if long PSU reduces GPU clearance
      if (gpu && psuLength > 180) {
        const gpuLength = this.extractGpuLength(gpu);
        const caseMaxGpuLength = this.extractCaseMaxGpuLength(caseComponent);
        
        if (gpuLength && caseMaxGpuLength) {
          const effectiveGpuSpace = caseMaxGpuLength - (psuLength - 160); // 160mm is standard PSU
          if (gpuLength > effectiveGpuSpace) {
            return {
              compatible: false,
              warning: `⚠️ Long PSU (${psuLength}mm) reduces GPU clearance. GPU (${gpuLength}mm) won't fit`,
              solution: 'Choose shorter PSU or smaller GPU. Check case internal layout',
              severity: 'high',
              measurements: {
                psuLength,
                gpuLength,
                effectiveGpuSpace
              }
            };
          }
        }
      }

      return {
        compatible: true,
        message: `✅ PSU length (${psuLength}mm) fits in case (max ${caseMaxPsuLength}mm)`,
        severity: 'info',
        measurements: {
          psuLength,
          caseMaxPsuLength,
          remainingClearance: caseMaxPsuLength - psuLength
        }
      };
    } catch (error) {
      logger.error('Error checking PSU vs Case clearance', { error: error.message });
      return {
        compatible: null,
        error: 'Failed to check PSU clearance',
        severity: 'error'
      };
    }
  }

  /**
   * Run all physical clearance checks for a build
   * @param {Object} components - Build components {gpu, cooler, ram, psu, case}
   * @returns {Promise<Object>} All clearance check results
   */
  async checkAllClearances(components) {
    const results = {
      allCompatible: true,
      criticalIssues: [],
      warnings: [],
      info: [],
      checks: {}
    };

    try {
      // GPU vs Case
      if (components.gpu && components.case) {
        results.checks.gpuVsCase = await this.checkGpuVsCase(components.gpu, components.case);
        this.categorizeResult(results, results.checks.gpuVsCase);
      }

      // Cooler vs Case
      if (components.cooler && components.case) {
        results.checks.coolerVsCase = await this.checkCoolerVsCase(components.cooler, components.case);
        this.categorizeResult(results, results.checks.coolerVsCase);
      }

      // RAM vs Cooler
      if (components.ram && components.cooler) {
        results.checks.ramVsCooler = await this.checkRamVsCooler(components.ram, components.cooler);
        this.categorizeResult(results, results.checks.ramVsCooler);
      }

      // PSU vs Case (and GPU if present)
      if (components.psu && components.case) {
        results.checks.psuVsCase = await this.checkPsuVsCase(components.psu, components.case, components.gpu);
        this.categorizeResult(results, results.checks.psuVsCase);
      }

      return results;
    } catch (error) {
      logger.error('Error running all clearance checks', { error: error.message });
      return {
        allCompatible: null,
        error: 'Failed to complete clearance checks',
        checks: results.checks
      };
    }
  }

  // ============================================================================
  // HELPER METHODS - Extract dimensions from component data
  // ============================================================================

  extractGpuLength(gpu) {
    // Priority order: dimensions > specifications > compatibility_data
    if (gpu.dimensions?.length_mm) return Number.parseFloat(gpu.dimensions.length_mm);
    if (gpu.specifications?.length_mm) return Number.parseFloat(gpu.specifications.length_mm);
    if (gpu.specifications?.length) {
      // Handle "285mm" or "285" format
      const lengthStr = String(gpu.specifications.length).replace(/[^\d.]/g, '');
      if (lengthStr) return Number.parseFloat(lengthStr);
    }
    if (gpu.physical_dimensions?.length_mm) return Number.parseFloat(gpu.physical_dimensions.length_mm);
    if (gpu.compatibility_data?.physical?.length_mm) return Number.parseFloat(gpu.compatibility_data.physical.length_mm);
    
    // Parse from specifications text if available
    if (gpu.specifications?.dimensions) {
      const match = gpu.specifications.dimensions.match(/(\d+)\s*mm.*length/i);
      if (match) return Number.parseFloat(match[1]);
    }
    
    return null;
  }

  extractCaseMaxGpuLength(caseComponent) {
    // Priority order: dimensions > specifications > compatibility_data
    if (caseComponent.dimensions?.max_gpu_length_mm) return Number.parseFloat(caseComponent.dimensions.max_gpu_length_mm);
    if (caseComponent.specifications?.max_gpu_length_mm) return Number.parseFloat(caseComponent.specifications.max_gpu_length_mm);
    if (caseComponent.specifications?.max_gpu_length) {
      // Handle "250mm" or "250" format
      const lengthStr = String(caseComponent.specifications.max_gpu_length).replace(/[^\d.]/g, '');
      if (lengthStr) return Number.parseFloat(lengthStr);
    }
    if (caseComponent.physical_dimensions?.max_gpu_length_mm) return Number.parseFloat(caseComponent.physical_dimensions.max_gpu_length_mm);
    if (caseComponent.compatibility_data?.clearances?.max_gpu_length_mm) return Number.parseFloat(caseComponent.compatibility_data.clearances.max_gpu_length_mm);
    return null;
  }

  extractCoolerHeight(cooler) {
    if (cooler.specifications?.height_mm) return Number.parseFloat(cooler.specifications.height_mm);
    if (cooler.physical_dimensions?.height_mm) return Number.parseFloat(cooler.physical_dimensions.height_mm);
    if (cooler.compatibility_data?.physical?.height_mm) return Number.parseFloat(cooler.compatibility_data.physical.height_mm);
    return null;
  }

  extractCaseMaxCoolerHeight(caseComponent) {
    if (caseComponent.specifications?.max_cooler_height) return Number.parseFloat(caseComponent.specifications.max_cooler_height);
    if (caseComponent.physical_dimensions?.max_cpu_cooler_height_mm) return Number.parseFloat(caseComponent.physical_dimensions.max_cpu_cooler_height_mm);
    if (caseComponent.compatibility_data?.clearances?.max_cpu_cooler_height_mm) return Number.parseFloat(caseComponent.compatibility_data.clearances.max_cpu_cooler_height_mm);
    return null;
  }

  extractRamHeight(ram) {
    if (ram.specifications?.height_mm) return Number.parseFloat(ram.specifications.height_mm);
    if (ram.physical_dimensions?.height_mm) return Number.parseFloat(ram.physical_dimensions.height_mm);
    if (ram.compatibility_data?.physical?.height_mm) return Number.parseFloat(ram.compatibility_data.physical.height_mm);
    
    // Standard RAM heights
    if (ram.name?.toLowerCase().includes('low profile') || ram.name?.toLowerCase().includes('lpx')) return 31;
    if (ram.name?.toLowerCase().includes('rgb') || ram.name?.toLowerCase().includes('trident')) return 44;
    
    return 35; // Standard height assumption
  }

  extractCoolerRamClearance(cooler) {
    if (cooler.specifications?.ram_clearance_mm) return Number.parseFloat(cooler.specifications.ram_clearance_mm);
    if (cooler.compatibility_data?.clearances?.ram_clearance_mm) return Number.parseFloat(cooler.compatibility_data.clearances.ram_clearance_mm);
    
    // Defaults based on cooler type
    if (cooler.specifications?.cooler_type === 'AIO') return 100; // AIO doesn't block RAM
    if (cooler.specifications?.cooler_type === 'Low Profile') return 50;
    if (cooler.name?.toLowerCase().includes('noctua nh-d15')) return 32; // Known tight clearance
    
    return 40; // Conservative default for tower coolers
  }

  extractPsuLength(psu) {
    if (psu.specifications?.length_mm) return Number.parseFloat(psu.specifications.length_mm);
    if (psu.physical_dimensions?.length_mm) return Number.parseFloat(psu.physical_dimensions.length_mm);
    
    // Standard PSU lengths by form factor
    if (psu.specifications?.form_factor === 'ATX') return 160;
    if (psu.specifications?.form_factor === 'SFX') return 100;
    if (psu.specifications?.form_factor === 'SFX-L') return 130;
    
    return 150; // Conservative default
  }

  extractCaseMaxPsuLength(caseComponent) {
    if (caseComponent.specifications?.max_psu_length) return Number.parseFloat(caseComponent.specifications.max_psu_length);
    if (caseComponent.physical_dimensions?.max_psu_length_mm) return Number.parseFloat(caseComponent.physical_dimensions.max_psu_length_mm);
    if (caseComponent.compatibility_data?.clearances?.max_psu_length_mm) return Number.parseFloat(caseComponent.compatibility_data.clearances.max_psu_length_mm);
    return 200; // Conservative default
  }

  categorizeResult(results, checkResult) {
    if (!checkResult) return;

    if (checkResult.compatible === false) {
      results.allCompatible = false;
      results.criticalIssues.push(checkResult.warning || checkResult.error);
    } else if (checkResult.severity === 'critical' || checkResult.severity === 'high') {
      results.allCompatible = false;
      results.criticalIssues.push(checkResult.warning);
    } else if (checkResult.severity === 'medium') {
      results.warnings.push(checkResult.warning);
    } else if (checkResult.severity === 'info' && checkResult.message) {
      results.info.push(checkResult.message);
    }
  }
}

module.exports = new PhysicalClearanceChecker();
