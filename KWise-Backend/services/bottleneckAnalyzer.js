/**
 * Bottleneck Analyzer Service
 * ROOT CAUSE FIX #5: Detects performance mismatches and calculates bottleneck percentages
 * 
 * Analyzes:
 * - GPU/CPU tier mismatches with specific percentages
 * - RAM bottlenecks for gaming vs workstation builds
 * - Storage bottlenecks for fast CPUs/GPUs
 * - PSU wattage insufficiency
 * 
 * Rating Target: 2.8 → 4.0/5.0
 */

const logger = require('../utils/logger');

class BottleneckAnalyzer {
  constructor() {
    // Performance tier definitions (relative performance index)
    this.componentTiers = {
      gpu: {
        // High-end (Elite tier)
        'RTX 4090': { tier: 'elite', performance: 250, tdp: 450 },
        'RTX 4080': { tier: 'elite', performance: 210, tdp: 320 },
        'RTX 4070 Ti': { tier: 'high-end', performance: 185, tdp: 285 },
        'RTX 4070': { tier: 'high-end', performance: 165, tdp: 200 },
        'RTX 3090': { tier: 'elite', performance: 220, tdp: 350 },
        'RTX 3080': { tier: 'elite', performance: 200, tdp: 320 },
        'RTX 3070': { tier: 'high-end', performance: 160, tdp: 220 },
        'RTX 3060 Ti': { tier: 'mid-range', performance: 140, tdp: 200 },
        'RTX 3060': { tier: 'mid-range', performance: 120, tdp: 170 },
        'RTX 3050': { tier: 'budget', performance: 90, tdp: 130 },
        'RTX 2060': { tier: 'mid-range', performance: 110, tdp: 160 },
        'GTX 1660 Ti': { tier: 'budget', performance: 85, tdp: 120 },
        'GTX 1660': { tier: 'budget', performance: 75, tdp: 120 },
        'GTX 1650': { tier: 'entry', performance: 55, tdp: 75 },
        'RX 7900 XTX': { tier: 'elite', performance: 235, tdp: 355 },
        'RX 7900 XT': { tier: 'elite', performance: 205, tdp: 315 },
        'RX 6800 XT': { tier: 'high-end', performance: 180, tdp: 300 },
        'RX 6700 XT': { tier: 'mid-range', performance: 145, tdp: 230 },
        'RX 580': { tier: 'budget', performance: 70, tdp: 185 },
        'RX 570': { tier: 'entry', performance: 60, tdp: 150 }
      },
      cpu: {
        // High-end (Elite tier)
        'Ryzen 9 7950X': { tier: 'elite', performance: 250, cores: 16, tdp: 170 },
        'Ryzen 9 7900X': { tier: 'elite', performance: 230, cores: 12, tdp: 170 },
        'Ryzen 7 7800X3D': { tier: 'high-end', performance: 210, cores: 8, tdp: 120 },
        'Ryzen 7 7700X': { tier: 'high-end', performance: 195, cores: 8, tdp: 105 },
        'Ryzen 5 7600X': { tier: 'mid-range', performance: 170, cores: 6, tdp: 105 },
        'Ryzen 9 5950X': { tier: 'elite', performance: 220, cores: 16, tdp: 105 },
        'Ryzen 9 5900X': { tier: 'high-end', performance: 200, cores: 12, tdp: 105 },
        'Ryzen 7 5800X3D': { tier: 'high-end', performance: 190, cores: 8, tdp: 105 },
        'Ryzen 7 5800X': { tier: 'high-end', performance: 180, cores: 8, tdp: 105 },
        'Ryzen 5 5600X': { tier: 'mid-range', performance: 150, cores: 6, tdp: 65 },
        'Ryzen 5 5600': { tier: 'mid-range', performance: 140, cores: 6, tdp: 65 },
        'Ryzen 5 3600': { tier: 'budget', performance: 120, cores: 6, tdp: 65 },
        'i9-13900K': { tier: 'elite', performance: 260, cores: 24, tdp: 253 },
        'i9-12900K': { tier: 'elite', performance: 240, cores: 16, tdp: 241 },
        'i7-13700K': { tier: 'high-end', performance: 215, cores: 16, tdp: 253 },
        'i7-12700K': { tier: 'high-end', performance: 195, cores: 12, tdp: 190 },
        'i5-13600K': { tier: 'mid-range', performance: 180, cores: 14, tdp: 181 },
        'i5-12600K': { tier: 'mid-range', performance: 160, cores: 10, tdp: 150 },
        'i5-12400': { tier: 'budget', performance: 130, cores: 6, tdp: 65 },
        'i3-12100': { tier: 'entry', performance: 90, cores: 4, tdp: 60 }
      }
    };

    // Tier hierarchy (for calculating mismatches)
    this.tierRanking = {
      'elite': 4,
      'high-end': 3,
      'mid-range': 2,
      'budget': 1,
      'entry': 0
    };

    // RAM requirements by usage
    this.ramRequirements = {
      'Gaming': { min: 16, recommended: 32, speed: 3200 },
      'Content Creation': { min: 32, recommended: 64, speed: 3600 },
      'Workstation': { min: 32, recommended: 128, speed: 3600 },
      'Office': { min: 8, recommended: 16, speed: 2666 },
      'General': { min: 8, recommended: 16, speed: 3200 }
    };
  }

  /**
   * Analyze complete build for bottlenecks with percentage calculations
   * @param {Object} build - PC build configuration
   * @param {String} usage - Primary usage (Gaming, Content Creation, etc.)
   * @returns {Object} Analysis result with bottleneck percentages
   */
  analyzeBuild(build, usage = 'Gaming') {
    const bottlenecks = [];
    const warnings = [];
    let overallScore = 100;

    try {
      // Extract components
      const gpu = this.findComponent(build, 'GPU');
      const cpu = this.findComponent(build, 'CPU');
      const ram = this.findComponent(build, 'RAM');
      const storage = this.findComponent(build, 'Storage');
      const psu = this.findComponent(build, 'PSU');

      // Analyze GPU/CPU tier mismatch
      if (gpu && cpu) {
        const tierMismatch = this.analyzeGPUCPUMismatch(gpu, cpu);
        if (tierMismatch.bottleneckPercentage > 0) {
          bottlenecks.push(tierMismatch);
          overallScore -= tierMismatch.bottleneckPercentage;
        } else if (tierMismatch.warning) {
          warnings.push(tierMismatch.warning);
        }
      }

      // Analyze RAM bottleneck
      if (ram) {
        const ramAnalysis = this.analyzeRAMBottleneck(ram, gpu, cpu, usage);
        if (ramAnalysis.isBottleneck) {
          bottlenecks.push(ramAnalysis);
          overallScore -= ramAnalysis.bottleneckPercentage;
        } else if (ramAnalysis.warning) {
          warnings.push(ramAnalysis.warning);
        }
      }

      // Analyze PSU bottleneck
      if (psu && gpu && cpu) {
        const psuAnalysis = this.analyzePSUBottleneck(psu, gpu, cpu, build);
        if (psuAnalysis.isBottleneck) {
          bottlenecks.push(psuAnalysis);
          overallScore -= psuAnalysis.bottleneckPercentage;
        } else if (psuAnalysis.warning) {
          warnings.push(psuAnalysis.warning);
        }
      }

      // Analyze storage bottleneck
      if (storage && (gpu || cpu)) {
        const storageAnalysis = this.analyzeStorageBottleneck(storage, gpu, cpu);
        if (storageAnalysis.isBottleneck) {
          bottlenecks.push(storageAnalysis);
          overallScore -= storageAnalysis.bottleneckPercentage;
        }
      }

      // Sort bottlenecks by severity (highest percentage first)
      bottlenecks.sort((a, b) => (b.bottleneckPercentage || 0) - (a.bottleneckPercentage || 0));

      return {
        bottlenecks,
        warnings,
        overallScore: Math.max(0, overallScore),
        primaryBottleneck: bottlenecks[0] || null,
        summary: this.generateSummary(bottlenecks, warnings, overallScore)
      };

    } catch (error) {
      logger.error('Error in bottleneck analysis', { error: error.message, stack: error.stack });
      return {
        bottlenecks: [],
        warnings: ['Bottleneck analysis encountered an error'],
        overallScore: 80,
        primaryBottleneck: null,
        summary: 'Analysis error - manual verification recommended'
      };
    }
  }

  /**
   * Analyze GPU/CPU tier mismatch with bottleneck percentage
   * @param {Object} gpu - GPU component
   * @param {Object} cpu - CPU component
   * @returns {Object} Mismatch analysis with percentage
   */
  analyzeGPUCPUMismatch(gpu, cpu) {
    const gpuData = this.matchComponent(gpu.name, 'gpu');
    const cpuData = this.matchComponent(cpu.name, 'cpu');

    if (!gpuData || !cpuData) {
      return {
        bottleneckPercentage: 0,
        warning: 'Could not determine GPU/CPU tiers - performance data unavailable'
      };
    }

    const gpuTierRank = this.tierRanking[gpuData.tier] || 2;
    const cpuTierRank = this.tierRanking[cpuData.tier] || 2;
    const tierGap = Math.abs(gpuTierRank - cpuTierRank);

    // Calculate performance difference percentage
    const perfRatio = gpuData.performance / cpuData.performance;
    const perfDifference = Math.abs(perfRatio - 1) * 100;

    // Determine bottleneck
    if (tierGap >= 2) {
      // Major tier mismatch (e.g., Elite GPU with Budget CPU)
      const bottleneckComponent = gpuTierRank > cpuTierRank ? 'CPU' : 'GPU';
      const bottleneckPercentage = Math.min(perfDifference, 40); // Cap at 40%

      return {
        type: 'TIER_MISMATCH',
        severity: 'critical',
        bottleneckComponent,
        bottleneckPercentage: Math.round(bottleneckPercentage),
        gpuTier: gpuData.tier,
        cpuTier: cpuData.tier,
        message: `⚠️ Major tier mismatch: ${gpuData.tier.toUpperCase()} GPU with ${cpuData.tier.toUpperCase()} CPU`,
        details: `Your ${bottleneckComponent === 'CPU' ? 'CPU' : 'GPU'} will bottleneck performance by approximately ${Math.round(bottleneckPercentage)}%. The ${gpu.name} and ${cpu.name} are ${tierGap} tiers apart.`,
        recommendation: `Upgrade your ${bottleneckComponent} to ${gpuData.tier} tier for balanced performance. Expected GPU utilization: ${bottleneckComponent === 'CPU' ? '60-75%' : '95-100%'}`,
        expectedUtilization: {
          gpu: bottleneckComponent === 'CPU' ? '60-75%' : '95-100%',
          cpu: bottleneckComponent === 'GPU' ? '60-75%' : '95-100%'
        }
      };
    } else if (tierGap === 1 && perfDifference > 20) {
      // Minor tier mismatch with significant performance gap
      const bottleneckComponent = gpuTierRank > cpuTierRank ? 'CPU' : 'GPU';
      const bottleneckPercentage = Math.min(perfDifference / 2, 20); // Cap at 20%

      return {
        type: 'MINOR_TIER_MISMATCH',
        severity: 'warning',
        bottleneckComponent,
        bottleneckPercentage: Math.round(bottleneckPercentage),
        gpuTier: gpuData.tier,
        cpuTier: cpuData.tier,
        message: `Minor tier mismatch: ${gpuData.tier} GPU with ${cpuData.tier} CPU`,
        details: `Performance may be limited by ${bottleneckComponent} by approximately ${Math.round(bottleneckPercentage)}%`,
        recommendation: `Consider upgrading ${bottleneckComponent} for optimal performance`,
        expectedUtilization: {
          gpu: bottleneckComponent === 'CPU' ? '75-85%' : '90-95%',
          cpu: bottleneckComponent === 'GPU' ? '75-85%' : '90-95%'
        }
      };
    }

    return {
      bottleneckPercentage: 0,
      balanced: true,
      message: '✅ GPU and CPU are well-balanced',
      expectedUtilization: {
        gpu: '90-98%',
        cpu: '85-95%'
      }
    };
  }

  /**
   * Analyze RAM bottleneck
   * @param {Object} ram - RAM component
   * @param {Object} gpu - GPU component
   * @param {Object} cpu - CPU component
   * @param {String} usage - Primary usage
   * @returns {Object} RAM analysis
   */
  analyzeRAMBottleneck(ram, gpu, cpu, usage) {
    const ramSpecs = ram.specifications || {};
    const ramCapacity = this.extractRAMCapacity(ram.name) || this.extractRAMCapacity(ramSpecs.capacity);
    const ramSpeed = this.extractNumeric(ramSpecs.speed) || 3200;

    const requirements = this.ramRequirements[usage] || this.ramRequirements['General'];

    if (!ramCapacity) {
      return {
        isBottleneck: false,
        warning: 'Could not determine RAM capacity'
      };
    }

    // Check capacity bottleneck
    if (ramCapacity < requirements.min) {
      return {
        type: 'RAM_CAPACITY_BOTTLENECK',
        severity: 'critical',
        isBottleneck: true,
        bottleneckPercentage: 25,
        component: ram.name,
        message: `⚠️ Insufficient RAM: ${ramCapacity}GB is below minimum ${requirements.min}GB for ${usage}`,
        details: `RAM capacity will bottleneck performance by approximately 25%. Expect frequent slowdowns and stuttering.`,
        recommendation: `Upgrade to at least ${requirements.min}GB RAM (${requirements.recommended}GB recommended)`,
        currentCapacity: ramCapacity,
        minimumCapacity: requirements.min,
        recommendedCapacity: requirements.recommended
      };
    } else if (ramCapacity < requirements.recommended) {
      return {
        type: 'RAM_CAPACITY_WARNING',
        severity: 'warning',
        isBottleneck: false,
        warning: {
          message: `RAM capacity (${ramCapacity}GB) is below recommended ${requirements.recommended}GB for ${usage}`,
          recommendation: `Consider upgrading to ${requirements.recommended}GB for better multitasking`
        }
      };
    }

    // Check speed bottleneck for high-end builds
    const gpuData = gpu ? this.matchComponent(gpu.name, 'gpu') : null;
    const cpuData = cpu ? this.matchComponent(cpu.name, 'cpu') : null;

    if (gpuData?.tier === 'elite' || cpuData?.tier === 'elite') {
      if (ramSpeed < 3600) {
        return {
          type: 'RAM_SPEED_BOTTLENECK',
          severity: 'warning',
          isBottleneck: true,
          bottleneckPercentage: 5,
          component: ram.name,
          message: `RAM speed (${ramSpeed}MHz) is slower than recommended for elite-tier build`,
          details: `Slow RAM may bottleneck performance by approximately 5% with elite-tier components`,
          recommendation: `Consider upgrading to ${requirements.speed}MHz+ RAM for optimal performance`,
          currentSpeed: ramSpeed,
          recommendedSpeed: requirements.speed
        };
      }
    }

    return {
      isBottleneck: false,
      adequate: true,
      message: '✅ RAM capacity and speed are adequate'
    };
  }

  /**
   * Analyze PSU wattage bottleneck
   * @param {Object} psu - PSU component
   * @param {Object} gpu - GPU component
   * @param {Object} cpu - CPU component
   * @param {Object} build - Full build
   * @returns {Object} PSU analysis
   */
  analyzePSUBottleneck(psu, gpu, cpu, build) {
    const psuSpecs = psu.specifications || {};
    const psuWattage = this.extractNumeric(psuSpecs.wattage) || this.extractNumeric(psu.name);

    const gpuData = this.matchComponent(gpu.name, 'gpu');
    const cpuData = this.matchComponent(cpu.name, 'cpu');

    if (!psuWattage) {
      return {
        isBottleneck: false,
        warning: 'Could not determine PSU wattage'
      };
    }

    // Estimate total system power consumption
    const gpuTDP = gpuData?.tdp || 150;
    const cpuTDP = cpuData?.tdp || 65;
    const otherComponentsPower = 100; // Motherboard, RAM, storage, fans, etc.
    const totalPower = gpuTDP + cpuTDP + otherComponentsPower;
    const recommendedPSU = Math.ceil(totalPower * 1.3 / 50) * 50; // 30% headroom, rounded to nearest 50W

    if (psuWattage < totalPower) {
      return {
        type: 'PSU_INSUFFICIENT',
        severity: 'critical',
        isBottleneck: true,
        bottleneckPercentage: 30,
        component: psu.name,
        message: `⚠️ PSU wattage insufficient: ${psuWattage}W PSU for ${totalPower}W system`,
        details: `PSU is undersized and will cause instability, crashes, or prevent system from booting. This is a critical issue.`,
        recommendation: `Upgrade to at least ${recommendedPSU}W PSU immediately`,
        currentWattage: psuWattage,
        estimatedLoad: totalPower,
        recommendedWattage: recommendedPSU,
        breakdown: {
          gpu: gpuTDP,
          cpu: cpuTDP,
          other: otherComponentsPower
        }
      };
    } else if (psuWattage < recommendedPSU) {
      const utilizationPercentage = ((totalPower / psuWattage) * 100).toFixed(0);
      return {
        type: 'PSU_TIGHT_MARGIN',
        severity: 'warning',
        isBottleneck: true,
        bottleneckPercentage: 10,
        component: psu.name,
        message: `PSU has minimal headroom: ${psuWattage}W for ${totalPower}W system (${utilizationPercentage}% utilization)`,
        details: `PSU will run at high utilization, reducing efficiency and lifespan. May limit overclocking potential.`,
        recommendation: `Consider upgrading to ${recommendedPSU}W PSU for better headroom`,
        currentWattage: psuWattage,
        estimatedLoad: totalPower,
        recommendedWattage: recommendedPSU,
        utilization: utilizationPercentage
      };
    }

    return {
      isBottleneck: false,
      adequate: true,
      message: '✅ PSU wattage is adequate',
      headroom: psuWattage - totalPower
    };
  }

  /**
   * Analyze storage bottleneck
   * @param {Object} storage - Storage component
   * @param {Object} gpu - GPU component
   * @param {Object} cpu - CPU component
   * @returns {Object} Storage analysis
   */
  analyzeStorageBottleneck(storage, gpu, cpu) {
    const storageSpecs = storage.specifications || {};
    const storageType = (storageSpecs.type || storageSpecs.storage_type || storage.name).toUpperCase();

    const isHDD = storageType.includes('HDD') || storageType.includes('HARD');
    const isSATA = storageType.includes('SATA') && !storageType.includes('M.2');
    const isNVMe = storageType.includes('NVME') || storageType.includes('M.2');

    const gpuData = gpu ? this.matchComponent(gpu.name, 'gpu') : null;
    const cpuData = cpu ? this.matchComponent(cpu.name, 'cpu') : null;

    const isHighEndBuild = gpuData?.tier === 'elite' || gpuData?.tier === 'high-end' || 
                          cpuData?.tier === 'elite' || cpuData?.tier === 'high-end';

    if (isHDD) {
      return {
        type: 'STORAGE_HDD_BOTTLENECK',
        severity: 'warning',
        isBottleneck: true,
        bottleneckPercentage: 15,
        component: storage.name,
        message: '⚠️ HDD will bottleneck system performance',
        details: 'Hard drives are significantly slower than SSDs, causing long load times and slower system responsiveness',
        recommendation: 'Upgrade to SSD (SATA or NVMe) for dramatically improved performance'
      };
    } else if (isSATA && isHighEndBuild) {
      return {
        type: 'STORAGE_SATA_WARNING',
        severity: 'warning',
        isBottleneck: true,
        bottleneckPercentage: 5,
        component: storage.name,
        message: 'SATA SSD may limit performance in high-end build',
        details: 'SATA SSDs are limited to ~550MB/s. NVMe SSDs offer 3-7x faster speeds for game loading and large file transfers',
        recommendation: 'Consider NVMe M.2 SSD for optimal performance with high-end components'
      };
    }

    return {
      isBottleneck: false,
      adequate: true,
      message: '✅ Storage is adequate'
    };
  }

  /**
   * Helper: Find component by category
   */
  findComponent(build, category) {
    const keys = [category, category.toLowerCase(), category.toUpperCase()];
    for (const key of keys) {
      if (build[key]) return build[key];
    }
    return null;
  }

  /**
   * Helper: Match component to database
   */
  matchComponent(componentName, type) {
    if (!componentName) return null;

    const database = this.componentTiers[type];
    if (!database) return null;

    // Try exact match first
    for (const [key, value] of Object.entries(database)) {
      if (componentName.toUpperCase().includes(key.toUpperCase())) {
        return value;
      }
    }

    return null;
  }

  /**
   * Helper: Extract RAM capacity from string
   */
  extractRAMCapacity(text) {
    if (!text) return null;
    const match = text.toString().match(/(\d+)\s*GB/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Helper: Extract numeric value
   */
  extractNumeric(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  }

  /**
   * Generate summary
   */
  generateSummary(bottlenecks, warnings, overallScore) {
    if (bottlenecks.length === 0 && warnings.length === 0) {
      return '✅ Build is well-balanced with no significant bottlenecks';
    } else if (bottlenecks.length === 0) {
      return `⚠️ Build is adequate with ${warnings.length} minor optimization suggestion(s)`;
    } else {
      const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length;
      const totalBottleneck = bottlenecks.reduce((sum, b) => sum + (b.bottleneckPercentage || 0), 0);
      return `❌ ${bottlenecks.length} bottleneck(s) detected (${criticalCount} critical) - estimated ${Math.round(totalBottleneck)}% performance loss`;
    }
  }
}

module.exports = new BottleneckAnalyzer();
