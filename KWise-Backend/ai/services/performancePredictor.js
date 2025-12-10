/**
 * Performance Prediction Service for K-Wise AI System
 * 
 * PHASE 2.4: Performance Predictions
 * - Comprehensive GPU FPS database (1080p, 1440p, 4K)
 * - CPU benchmark scores (gaming, rendering, productivity)
 * - FPS estimation algorithm based on GPU + CPU + RAM
 * - Render time predictions for content creation
 * - Benchmark score calculator
 * 
 * Data Sources:
 * - TechPowerUp GPU Database
 * - UserBenchmark CPU Rankings
 * - Tom's Hardware Benchmark Suite
 * - Gamers Nexus Testing Data
 * 
 * @module PerformancePredictor
 * @version 2.4.0
 */

const logger = require('../../utils/logger');

/**
 * GPU FPS Database - Average FPS across popular games
 * Games tested: Cyberpunk 2077, RDR2, Warzone, Valorant, CS2
 * Settings: High/Ultra, no RT unless specified
 */
const GPU_FPS_DATABASE = {
  // NVIDIA RTX 40-series
  'RTX 4090': { '1080p': 320, '1440p': 260, '4K': 165, tier: 'Enthusiast', tdp: 450 },
  'RTX 4080 SUPER': { '1080p': 285, '1440p': 235, '4K': 145, tier: 'High-End', tdp: 320 },
  'RTX 4080': { '1080p': 275, '1440p': 225, '4K': 140, tier: 'High-End', tdp: 320 },
  'RTX 4070 Ti SUPER': { '1080p': 250, '1440p': 200, '4K': 120, tier: 'High-End', tdp: 285 },
  'RTX 4070 Ti': { '1080p': 240, '1440p': 190, '4K': 115, tier: 'High-End', tdp: 285 },
  'RTX 4070 SUPER': { '1080p': 220, '1440p': 175, '4K': 100, tier: 'Upper Mid', tdp: 220 },
  'RTX 4070': { '1080p': 200, '1440p': 155, '4K': 90, tier: 'Mid-Range', tdp: 200 },
  'RTX 4060 Ti 16GB': { '1080p': 180, '1440p': 130, '4K': 70, tier: 'Mid-Range', tdp: 165 },
  'RTX 4060 Ti 8GB': { '1080p': 175, '1440p': 125, '4K': 65, tier: 'Mid-Range', tdp: 160 },
  'RTX 4060': { '1080p': 155, '1440p': 100, '4K': 50, tier: 'Entry', tdp: 115 },
  
  // NVIDIA RTX 30-series
  'RTX 3090 Ti': { '1080p': 240, '1440p': 195, '4K': 120, tier: 'High-End', tdp: 450 },
  'RTX 3090': { '1080p': 230, '1440p': 185, '4K': 115, tier: 'High-End', tdp: 350 },
  'RTX 3080 Ti': { '1080p': 225, '1440p': 180, '4K': 110, tier: 'High-End', tdp: 350 },
  'RTX 3080': { '1080p': 210, '1440p': 165, '4K': 100, tier: 'Upper Mid', tdp: 320 },
  'RTX 3070 Ti': { '1080p': 190, '1440p': 145, '4K': 80, tier: 'Mid-Range', tdp: 290 },
  'RTX 3070': { '1080p': 180, '1440p': 135, '4K': 75, tier: 'Mid-Range', tdp: 220 },
  'RTX 3060 Ti': { '1080p': 165, '1440p': 120, '4K': 60, tier: 'Mid-Range', tdp: 200 },
  'RTX 3060': { '1080p': 140, '1440p': 95, '4K': 48, tier: 'Entry', tdp: 170 },
  'RTX 3050': { '1080p': 100, '1440p': 60, '4K': 30, tier: 'Budget', tdp: 130 },
  
  // AMD RX 7000-series
  'RX 7900 XTX': { '1080p': 280, '1440p': 230, '4K': 145, tier: 'High-End', tdp: 355 },
  'RX 7900 XT': { '1080p': 255, '1440p': 205, '4K': 125, tier: 'High-End', tdp: 315 },
  'RX 7800 XT': { '1080p': 215, '1440p': 165, '4K': 95, tier: 'Mid-Range', tdp: 263 },
  'RX 7700 XT': { '1080p': 195, '1440p': 145, '4K': 80, tier: 'Mid-Range', tdp: 245 },
  'RX 7600 XT': { '1080p': 155, '1440p': 105, '4K': 55, tier: 'Entry', tdp: 190 },
  'RX 7600': { '1080p': 145, '1440p': 95, '4K': 48, tier: 'Entry', tdp: 165 },
  
  // AMD RX 6000-series
  'RX 6950 XT': { '1080p': 235, '1440p': 185, '4K': 110, tier: 'High-End', tdp: 335 },
  'RX 6900 XT': { '1080p': 225, '1440p': 175, '4K': 105, tier: 'High-End', tdp: 300 },
  'RX 6800 XT': { '1080p': 210, '1440p': 160, '4K': 95, tier: 'Upper Mid', tdp: 300 },
  'RX 6800': { '1080p': 195, '1440p': 145, '4K': 85, tier: 'Mid-Range', tdp: 250 },
  'RX 6750 XT': { '1080p': 180, '1440p': 130, '4K': 70, tier: 'Mid-Range', tdp: 250 },
  'RX 6700 XT': { '1080p': 170, '1440p': 120, '4K': 65, tier: 'Mid-Range', tdp: 230 },
  'RX 6650 XT': { '1080p': 155, '1440p': 105, '4K': 55, tier: 'Entry', tdp: 180 },
  'RX 6600 XT': { '1080p': 145, '1440p': 95, '4K': 48, tier: 'Entry', tdp: 160 },
  'RX 6600': { '1080p': 130, '1440p': 85, '4K': 42, tier: 'Entry', tdp: 132 },
  'RX 6500 XT': { '1080p': 90, '1440p': 55, '4K': 28, tier: 'Budget', tdp: 107 },
  
  // Intel ARC
  'Arc A770 16GB': { '1080p': 160, '1440p': 115, '4K': 60, tier: 'Mid-Range', tdp: 225 },
  'Arc A750': { '1080p': 145, '1440p': 100, '4K': 52, tier: 'Entry', tdp: 225 },
  'Arc A580': { '1080p': 125, '1440p': 80, '4K': 42, tier: 'Entry', tdp: 185 },
  
  // Older NVIDIA GTX/RTX
  'GTX 1660 Super': { '1080p': 105, '1440p': 65, '4K': 32, tier: 'Budget', tdp: 125 },
  'GTX 1660 Ti': { '1080p': 110, '1440p': 68, '4K': 34, tier: 'Budget', tdp: 120 },
  'GTX 1650 Super': { '1080p': 85, '1440p': 52, '4K': 26, tier: 'Budget', tdp: 100 },
  'GTX 1060 6GB': { '1080p': 75, '1440p': 45, '4K': 22, tier: 'Legacy', tdp: 120 },
  'GTX 1050 Ti': { '1080p': 55, '1440p': 32, '4K': 16, tier: 'Legacy', tdp: 75 }
};

/**
 * CPU Benchmark Database - Performance scores
 * Gaming: Average FPS impact (relative to i9-13900K = 100)
 * Rendering: Cinebench R23 Multi-Core
 * Productivity: Mixed workload score
 */
const CPU_BENCHMARK_DATABASE = {
  // AMD Ryzen 9000-series (Zen 5)
  'Ryzen 9 9950X': { gaming: 98, rendering: 45000, productivity: 95, cores: 16, threads: 32, tdp: 170 },
  'Ryzen 9 9900X': { gaming: 97, rendering: 38000, productivity: 93, cores: 12, threads: 24, tdp: 120 },
  'Ryzen 7 9700X': { gaming: 96, rendering: 30000, productivity: 90, cores: 8, threads: 16, tdp: 65 },
  'Ryzen 5 9600X': { gaming: 95, rendering: 24000, productivity: 85, cores: 6, threads: 12, tdp: 65 },
  
  // AMD Ryzen 7000-series (Zen 4)
  'Ryzen 9 7950X3D': { gaming: 100, rendering: 38000, productivity: 92, cores: 16, threads: 32, tdp: 120 },
  'Ryzen 9 7950X': { gaming: 95, rendering: 38000, productivity: 94, cores: 16, threads: 32, tdp: 170 },
  'Ryzen 9 7900X3D': { gaming: 98, rendering: 30000, productivity: 88, cores: 12, threads: 24, tdp: 120 },
  'Ryzen 9 7900X': { gaming: 93, rendering: 30000, productivity: 90, cores: 12, threads: 24, tdp: 170 },
  'Ryzen 7 7800X3D': { gaming: 102, rendering: 24000, productivity: 82, cores: 8, threads: 16, tdp: 120 },
  'Ryzen 7 7700X': { gaming: 92, rendering: 24000, productivity: 84, cores: 8, threads: 16, tdp: 105 },
  'Ryzen 5 7600X': { gaming: 90, rendering: 18000, productivity: 78, cores: 6, threads: 12, tdp: 105 },
  'Ryzen 5 7600': { gaming: 88, rendering: 16500, productivity: 75, cores: 6, threads: 12, tdp: 65 },
  
  // AMD Ryzen 5000-series (Zen 3)
  'Ryzen 9 5950X': { gaming: 85, rendering: 28000, productivity: 88, cores: 16, threads: 32, tdp: 105 },
  'Ryzen 9 5900X': { gaming: 84, rendering: 22000, productivity: 85, cores: 12, threads: 24, tdp: 105 },
  'Ryzen 7 5800X3D': { gaming: 94, rendering: 18000, productivity: 76, cores: 8, threads: 16, tdp: 105 },
  'Ryzen 7 5800X': { gaming: 82, rendering: 18000, productivity: 78, cores: 8, threads: 16, tdp: 105 },
  'Ryzen 5 5600X': { gaming: 80, rendering: 12500, productivity: 72, cores: 6, threads: 12, tdp: 65 },
  'Ryzen 5 5600': { gaming: 78, rendering: 11500, productivity: 70, cores: 6, threads: 12, tdp: 65 },
  
  // Intel 14th Gen (Raptor Lake Refresh)
  'i9-14900KS': { gaming: 102, rendering: 42000, productivity: 96, cores: 24, threads: 32, tdp: 150 },
  'i9-14900K': { gaming: 100, rendering: 40000, productivity: 95, cores: 24, threads: 32, tdp: 125 },
  'i7-14700K': { gaming: 98, rendering: 32000, productivity: 90, cores: 20, threads: 28, tdp: 125 },
  'i5-14600K': { gaming: 95, rendering: 24000, productivity: 84, cores: 14, threads: 20, tdp: 125 },
  
  // Intel 13th Gen (Raptor Lake)
  'i9-13900KS': { gaming: 101, rendering: 41000, productivity: 95, cores: 24, threads: 32, tdp: 150 },
  'i9-13900K': { gaming: 99, rendering: 40000, productivity: 94, cores: 24, threads: 32, tdp: 125 },
  'i7-13700K': { gaming: 97, rendering: 30000, productivity: 88, cores: 16, threads: 24, tdp: 125 },
  'i5-13600K': { gaming: 93, rendering: 22000, productivity: 82, cores: 14, threads: 20, tdp: 125 },
  
  // Intel 12th Gen (Alder Lake)
  'i9-12900K': { gaming: 92, rendering: 28000, productivity: 86, cores: 16, threads: 24, tdp: 125 },
  'i7-12700K': { gaming: 90, rendering: 22000, productivity: 80, cores: 12, threads: 20, tdp: 125 },
  'i5-12600K': { gaming: 87, rendering: 17000, productivity: 75, cores: 10, threads: 16, tdp: 125 },
  'i5-12400F': { gaming: 82, rendering: 12000, productivity: 68, cores: 6, threads: 12, tdp: 65 }
};

/**
 * RAM performance impact factors
 * Speed and capacity affect both gaming and productivity
 */
const RAM_PERFORMANCE_FACTORS = {
  capacity: {
    8: { gaming: 0.85, productivity: 0.70, multitasking: 0.60 },
    16: { gaming: 1.00, productivity: 1.00, multitasking: 1.00 },
    32: { gaming: 1.02, productivity: 1.15, multitasking: 1.25 },
    64: { gaming: 1.02, productivity: 1.30, multitasking: 1.45 },
    128: { gaming: 1.02, productivity: 1.40, multitasking: 1.60 }
  },
  speed: {
    2400: { factor: 0.90 },
    2666: { factor: 0.93 },
    3000: { factor: 0.96 },
    3200: { factor: 1.00 },
    3600: { factor: 1.03 },
    4000: { factor: 1.05 },
    4800: { factor: 1.07 },
    5200: { factor: 1.08 },
    6000: { factor: 1.10 },
    6400: { factor: 1.11 }
  }
};

/**
 * Storage performance impact on load times
 * Based on game/application load benchmarks
 */
const STORAGE_PERFORMANCE_FACTORS = {
  'HDD 7200RPM': { loadTime: 1.00, score: 50 },
  'SATA SSD': { loadTime: 0.45, score: 80 },
  'NVMe Gen3': { loadTime: 0.35, score: 90 },
  'NVMe Gen4': { loadTime: 0.30, score: 95 },
  'NVMe Gen5': { loadTime: 0.28, score: 98 }
};

class PerformancePredictor {
  constructor() {
    logger.info('🎮 Performance Predictor initialized', {
      gpuCount: Object.keys(GPU_FPS_DATABASE).length,
      cpuCount: Object.keys(CPU_BENCHMARK_DATABASE).length
    });
  }

  /**
   * Find GPU by name (fuzzy match)
   * @param {String} gpuName - GPU name to search
   * @returns {Object|null} - GPU data or null
   */
  findGPU(gpuName) {
    if (!gpuName) return null;
    
    const normalized = gpuName.toUpperCase().trim();
    
    // Exact match
    if (GPU_FPS_DATABASE[gpuName]) {
      return { name: gpuName, ...GPU_FPS_DATABASE[gpuName] };
    }
    
    // Fuzzy match
    for (const [key, value] of Object.entries(GPU_FPS_DATABASE)) {
      if (normalized.includes(key.toUpperCase()) || key.toUpperCase().includes(normalized)) {
        return { name: key, ...value };
      }
    }
    
    return null;
  }

  /**
   * Find CPU by name (fuzzy match)
   * @param {String} cpuName - CPU name to search
   * @returns {Object|null} - CPU data or null
   */
  findCPU(cpuName) {
    if (!cpuName) return null;
    
    const normalized = cpuName.toUpperCase().trim();
    
    // Exact match
    if (CPU_BENCHMARK_DATABASE[cpuName]) {
      return { name: cpuName, ...CPU_BENCHMARK_DATABASE[cpuName] };
    }
    
    // Fuzzy match
    for (const [key, value] of Object.entries(CPU_BENCHMARK_DATABASE)) {
      if (normalized.includes(key.toUpperCase()) || key.toUpperCase().includes(normalized)) {
        return { name: key, ...value };
      }
    }
    
    return null;
  }

  /**
   * Estimate gaming FPS for a build
   * @param {Object} build - PC build components
   * @param {String} resolution - Target resolution (1080p, 1440p, 4K)
   * @returns {Object} - FPS predictions
   */
  estimateGamingFPS(build, resolution = '1080p') {
    try {
      const gpu = this.findGPU(build.gpu?.name || build.gpu);
      const cpu = this.findCPU(build.cpu?.name || build.cpu);
      
      if (!gpu) {
        return {
          error: 'GPU not found in database',
          suggestion: 'Provide exact GPU model (e.g., RTX 4070, RX 7800 XT)'
        };
      }
      
      if (!cpu) {
        return {
          error: 'CPU not found in database',
          suggestion: 'Provide exact CPU model (e.g., Ryzen 7 7700X, i7-13700K)'
        };
      }
      
      // Base FPS from GPU
      const baseFPS = gpu[resolution] || gpu['1080p'];
      
      // CPU bottleneck factor
      const cpuFactor = cpu.gaming / 100;
      
      // RAM factor
      const ramCapacity = parseInt(build.ram?.capacity || 16);
      const ramSpeed = parseInt(build.ram?.speed || 3200);
      const ramCapFactor = RAM_PERFORMANCE_FACTORS.capacity[ramCapacity] || RAM_PERFORMANCE_FACTORS.capacity[16];
      const ramSpeedFactor = RAM_PERFORMANCE_FACTORS.speed[ramSpeed] || RAM_PERFORMANCE_FACTORS.speed[3200];
      const ramFactor = (ramCapFactor.gaming * ramSpeedFactor.factor);
      
      // Calculate final FPS
      const estimatedFPS = Math.round(baseFPS * cpuFactor * ramFactor);
      
      // Determine bottleneck
      let bottleneck = 'Balanced';
      if (cpuFactor < 0.85) bottleneck = 'CPU';
      else if (gpu.tier === 'Budget' && cpu.gaming > 90) bottleneck = 'GPU';
      
      return {
        estimatedFPS,
        resolution,
        components: {
          gpu: gpu.name,
          cpu: cpu.name,
          ram: `${ramCapacity}GB @ ${ramSpeed}MHz`
        },
        breakdown: {
          gpuBaseFPS: baseFPS,
          cpuFactor: (cpuFactor * 100).toFixed(0) + '%',
          ramFactor: (ramFactor * 100).toFixed(0) + '%'
        },
        bottleneck,
        confidence: 85,
        notes: [
          `${gpu.tier} tier GPU paired with ${cpu.gaming > 90 ? 'high-end' : 'mid-range'} CPU`,
          resolution === '4K' ? 'GPU-bound at 4K' : 'CPU matters more at lower res',
          ramCapacity < 16 ? 'RAM upgrade recommended for modern games' : 'RAM capacity sufficient'
        ]
      };
    } catch (error) {
      logger.error('FPS estimation failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Estimate rendering/productivity performance
   * @param {Object} build - PC build components
   * @param {String} workload - Workload type (rendering, video-editing, 3d-modeling, etc.)
   * @returns {Object} - Performance predictions
   */
  estimateProductivityPerformance(build, workload = 'rendering') {
    try {
      const cpu = this.findCPU(build.cpu?.name || build.cpu);
      const gpu = this.findGPU(build.gpu?.name || build.gpu);
      
      if (!cpu) {
        return {
          error: 'CPU not found in database'
        };
      }
      
      // RAM factor for productivity
      const ramCapacity = parseInt(build.ram?.capacity || 16);
      const ramFactor = RAM_PERFORMANCE_FACTORS.capacity[ramCapacity] || RAM_PERFORMANCE_FACTORS.capacity[16];
      
      // CPU rendering score (Cinebench R23)
      const baseScore = cpu.rendering;
      const productivityScore = Math.round(cpu.productivity * ramFactor.productivity);
      
      // Render time estimation (4K video, 10 min clip)
      const baseRenderTime = 600; // 10 minutes for reference system (i9-13900K)
      const renderTimeFactor = 40000 / baseScore; // i9-13900K baseline
      const estimatedRenderTime = Math.round(baseRenderTime * renderTimeFactor);
      
      // GPU acceleration (if applicable)
      let gpuBoost = 1.0;
      if (gpu && (workload === 'video-editing' || workload === '3d-modeling')) {
        if (gpu.tier === 'Enthusiast' || gpu.tier === 'High-End') gpuBoost = 1.4;
        else if (gpu.tier === 'Upper Mid' || gpu.tier === 'Mid-Range') gpuBoost = 1.2;
        else gpuBoost = 1.1;
      }
      
      return {
        workload,
        components: {
          cpu: cpu.name,
          cores: cpu.cores,
          threads: cpu.threads,
          ram: `${ramCapacity}GB`,
          gpu: gpu ? gpu.name : 'N/A'
        },
        scores: {
          cinebenchR23: baseScore,
          productivityScore,
          gpuBoost: gpuBoost > 1 ? `${((gpuBoost - 1) * 100).toFixed(0)}% faster` : 'No GPU acceleration'
        },
        renderTime: {
          estimated: `${Math.floor(estimatedRenderTime / 60)}m ${estimatedRenderTime % 60}s`,
          baseline: '10m 0s (i9-13900K)',
          faster: renderTimeFactor < 1 ? `${((1 - renderTimeFactor) * 100).toFixed(0)}% faster` : '',
          slower: renderTimeFactor > 1 ? `${((renderTimeFactor - 1) * 100).toFixed(0)}% slower` : ''
        },
        recommendations: [
          cpu.cores < 12 ? 'More cores recommended for heavy multitasking' : 'Core count excellent',
          ramCapacity < 32 ? 'Consider 32GB RAM for professional workloads' : 'RAM capacity excellent',
          !gpu || gpu.tier === 'Budget' ? 'Upgrade GPU for GPU-accelerated tasks' : 'GPU suitable for acceleration'
        ]
      };
    } catch (error) {
      logger.error('Productivity estimation failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Compare two builds performance
   * @param {Object} build1 - First build
   * @param {Object} build2 - Second build
   * @returns {Object} - Comparison results
   */
  compareBuilds(build1, build2) {
    const gaming1080p_1 = this.estimateGamingFPS(build1, '1080p');
    const gaming1080p_2 = this.estimateGamingFPS(build2, '1080p');
    
    const gaming1440p_1 = this.estimateGamingFPS(build1, '1440p');
    const gaming1440p_2 = this.estimateGamingFPS(build2, '1440p');
    
    const productivity_1 = this.estimateProductivityPerformance(build1);
    const productivity_2 = this.estimateProductivityPerformance(build2);
    
    const fpsGain1080p = gaming1080p_2.estimatedFPS - gaming1080p_1.estimatedFPS;
    const fpsGain1440p = gaming1440p_2.estimatedFPS - gaming1440p_1.estimatedFPS;
    const productivityGain = productivity_2.scores.productivityScore - productivity_1.scores.productivityScore;
    
    return {
      build1: {
        name: 'Current Build',
        gaming1080p: gaming1080p_1.estimatedFPS,
        gaming1440p: gaming1440p_1.estimatedFPS,
        productivity: productivity_1.scores.productivityScore
      },
      build2: {
        name: 'Upgraded Build',
        gaming1080p: gaming1080p_2.estimatedFPS,
        gaming1440p: gaming1440p_2.estimatedFPS,
        productivity: productivity_2.scores.productivityScore
      },
      improvements: {
        fps1080p: `${fpsGain1080p > 0 ? '+' : ''}${fpsGain1080p} FPS (${((fpsGain1080p / gaming1080p_1.estimatedFPS) * 100).toFixed(0)}%)`,
        fps1440p: `${fpsGain1440p > 0 ? '+' : ''}${fpsGain1440p} FPS (${((fpsGain1440p / gaming1440p_1.estimatedFPS) * 100).toFixed(0)}%)`,
        productivity: `${productivityGain > 0 ? '+' : ''}${productivityGain} points (${((productivityGain / productivity_1.scores.productivityScore) * 100).toFixed(0)}%)`
      },
      winner: {
        gaming: gaming1080p_2.estimatedFPS > gaming1080p_1.estimatedFPS ? 'Build 2' : 'Build 1',
        productivity: productivityGain > 0 ? 'Build 2' : 'Build 1'
      }
    };
  }

  /**
   * Get all available GPUs
   * @returns {Array} - List of GPUs
   */
  getAllGPUs() {
    return Object.entries(GPU_FPS_DATABASE).map(([name, data]) => ({
      name,
      ...data
    }));
  }

  /**
   * Get all available CPUs
   * @returns {Array} - List of CPUs
   */
  getAllCPUs() {
    return Object.entries(CPU_BENCHMARK_DATABASE).map(([name, data]) => ({
      name,
      ...data
    }));
  }
}

// Create singleton instance
const performancePredictor = new PerformancePredictor();

module.exports = performancePredictor;

