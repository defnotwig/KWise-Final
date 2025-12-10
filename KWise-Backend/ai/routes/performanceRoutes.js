/**
 * Performance Prediction Routes for K-Wise AI System
 * 
 * PHASE 2.4: Performance Predictions
 * - POST /api/ai/build/predict-performance: Estimate FPS and benchmark scores
 * - POST /api/ai/build/compare-performance: Compare two builds
 * - GET /api/ai/build/gpu-database: Get all GPUs with FPS data
 * - GET /api/ai/build/cpu-database: Get all CPUs with benchmark data
 * 
 * @module PerformancePredictionRoutes
 * @version 2.4.0
 */

const express = require('express');
const router = express.Router();
const performancePredictor = require('../services/performancePredictor');
const logger = require('../../utils/logger');

/**
 * POST /api/ai/build/predict-performance
 * Predict gaming FPS and productivity performance for a build
 * 
 * Body:
 * - build: { gpu, cpu, ram } - Build components
 * - resolution: '1080p' | '1440p' | '4K' (optional, default: 1080p)
 * - workload: 'gaming' | 'rendering' | 'video-editing' | 'productivity' (optional)
 * 
 * Returns:
 * - Gaming FPS predictions (1080p, 1440p, 4K)
 * - Productivity scores (Cinebench, render times)
 * - Bottleneck analysis
 * - Upgrade recommendations
 */
router.post('/predict-performance', async (req, res) => {
  try {
    const { build, resolution, workload } = req.body;
    
    if (!build || !build.gpu || !build.cpu) {
      return res.status(400).json({
        success: false,
        message: 'Build must include GPU and CPU at minimum',
        example: {
          build: {
            gpu: { name: 'RTX 4070' },
            cpu: { name: 'Ryzen 7 7700X' },
            ram: { capacity: 16, speed: 3200 }
          },
          resolution: '1080p',
          workload: 'gaming'
        }
      });
    }
    
    // Gaming predictions
    const gaming1080p = performancePredictor.estimateGamingFPS(build, '1080p');
    const gaming1440p = performancePredictor.estimateGamingFPS(build, '1440p');
    const gaming4K = performancePredictor.estimateGamingFPS(build, '4K');
    
    // Productivity predictions
    const productivity = performancePredictor.estimateProductivityPerformance(build, workload || 'rendering');
    
    logger.info('🎮 Performance prediction requested', {
      gpu: build.gpu?.name || build.gpu,
      cpu: build.cpu?.name || build.cpu,
      resolution: resolution || '1080p',
      fps1080p: gaming1080p.estimatedFPS,
      fps1440p: gaming1440p.estimatedFPS
    });
    
    res.json({
      success: true,
      message: 'Performance predictions generated successfully',
      data: {
        build: {
          gpu: build.gpu?.name || build.gpu,
          cpu: build.cpu?.name || build.cpu,
          ram: build.ram || { capacity: 16, speed: 3200 }
        },
        gaming: {
          '1080p': gaming1080p,
          '1440p': gaming1440p,
          '4K': gaming4K,
          recommended: resolution || '1080p'
        },
        productivity,
        overall: {
          tier: gaming1080p.components?.gpu?.includes('RTX 4090') ? 'Enthusiast' :
                gaming1080p.components?.gpu?.includes('RTX 4080') || gaming1080p.components?.gpu?.includes('RX 7900') ? 'High-End' :
                gaming1080p.components?.gpu?.includes('RTX 4070') || gaming1080p.components?.gpu?.includes('RX 7800') ? 'Mid-Range' :
                'Entry',
          bottleneck: gaming1080p.bottleneck,
          bestFor: gaming1080p.estimatedFPS > 144 ? '1440p High Refresh' :
                   gaming1080p.estimatedFPS > 100 ? '1080p High Refresh' :
                   '1080p 60Hz'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Performance prediction failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to predict performance',
      error: error.message
    });
  }
});

/**
 * POST /api/ai/build/compare-performance
 * Compare performance between two builds
 * 
 * Body:
 * - build1: { gpu, cpu, ram } - First build
 * - build2: { gpu, cpu, ram } - Second build
 * 
 * Returns:
 * - Side-by-side performance comparison
 * - FPS differences at all resolutions
 * - Productivity score differences
 * - Winner determination
 */
router.post('/compare-performance', async (req, res) => {
  try {
    const { build1, build2 } = req.body;
    
    if (!build1 || !build2) {
      return res.status(400).json({
        success: false,
        message: 'Both build1 and build2 must be provided',
        example: {
          build1: {
            gpu: { name: 'RTX 4060' },
            cpu: { name: 'Ryzen 5 7600' }
          },
          build2: {
            gpu: { name: 'RTX 4070' },
            cpu: { name: 'Ryzen 7 7700X' }
          }
        }
      });
    }
    
    const comparison = performancePredictor.compareBuilds(build1, build2);
    
    logger.info('⚖️ Build comparison requested', {
      build1GPU: build1.gpu?.name || build1.gpu,
      build2GPU: build2.gpu?.name || build2.gpu
    });
    
    res.json({
      success: true,
      message: 'Build comparison completed',
      data: comparison,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Build comparison failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare builds',
      error: error.message
    });
  }
});

/**
 * GET /api/ai/build/gpu-database
 * Get complete GPU database with FPS data
 * 
 * Query Parameters:
 * - tier: Filter by tier (Enthusiast, High-End, Mid-Range, Entry, Budget)
 * - minFps1080p: Filter by minimum 1080p FPS
 * 
 * Returns:
 * - List of all GPUs with FPS at 1080p, 1440p, 4K
 * - Tier classification
 * - TDP ratings
 */
router.get('/gpu-database', (req, res) => {
  try {
    let gpus = performancePredictor.getAllGPUs();
    
    // Apply filters
    const { tier, minFps1080p } = req.query;
    
    if (tier) {
      gpus = gpus.filter(gpu => gpu.tier.toLowerCase() === tier.toLowerCase());
    }
    
    if (minFps1080p) {
      const minFps = parseInt(minFps1080p);
      gpus = gpus.filter(gpu => gpu['1080p'] >= minFps);
    }
    
    // Sort by 1080p FPS (descending)
    gpus.sort((a, b) => b['1080p'] - a['1080p']);
    
    logger.debug('📊 GPU database requested', {
      count: gpus.length,
      filters: { tier, minFps1080p }
    });
    
    res.json({
      success: true,
      message: 'GPU database retrieved',
      data: {
        gpus,
        count: gpus.length,
        tiers: ['Enthusiast', 'High-End', 'Upper Mid', 'Mid-Range', 'Entry', 'Budget', 'Legacy']
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ GPU database retrieval failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve GPU database',
      error: error.message
    });
  }
});

/**
 * GET /api/ai/build/cpu-database
 * Get complete CPU database with benchmark scores
 * 
 * Query Parameters:
 * - minCores: Filter by minimum core count
 * - minGaming: Filter by minimum gaming score
 * - brand: Filter by brand (AMD, Intel)
 * 
 * Returns:
 * - List of all CPUs with gaming, rendering, productivity scores
 * - Core/thread counts
 * - TDP ratings
 */
router.get('/cpu-database', (req, res) => {
  try {
    let cpus = performancePredictor.getAllCPUs();
    
    // Apply filters
    const { minCores, minGaming, brand } = req.query;
    
    if (minCores) {
      const cores = parseInt(minCores);
      cpus = cpus.filter(cpu => cpu.cores >= cores);
    }
    
    if (minGaming) {
      const gaming = parseInt(minGaming);
      cpus = cpus.filter(cpu => cpu.gaming >= gaming);
    }
    
    if (brand) {
      const brandLower = brand.toLowerCase();
      cpus = cpus.filter(cpu => 
        (brandLower === 'amd' && cpu.name.includes('Ryzen')) ||
        (brandLower === 'intel' && cpu.name.includes('i'))
      );
    }
    
    // Sort by gaming score (descending)
    cpus.sort((a, b) => b.gaming - a.gaming);
    
    logger.debug('📊 CPU database requested', {
      count: cpus.length,
      filters: { minCores, minGaming, brand }
    });
    
    res.json({
      success: true,
      message: 'CPU database retrieved',
      data: {
        cpus,
        count: cpus.length,
        brands: ['AMD', 'Intel']
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ CPU database retrieval failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve CPU database',
      error: error.message
    });
  }
});

/**
 * GET /api/ai/build/performance-health
 * Health check for performance prediction service
 * 
 * Returns:
 * - Service status
 * - Database statistics
 */
router.get('/performance-health', (req, res) => {
  try {
    const gpuCount = performancePredictor.getAllGPUs().length;
    const cpuCount = performancePredictor.getAllCPUs().length;
    
    res.json({
      success: true,
      healthy: true,
      data: {
        gpuDatabaseSize: gpuCount,
        cpuDatabaseSize: cpuCount,
        supportedResolutions: ['1080p', '1440p', '4K'],
        supportedWorkloads: ['gaming', 'rendering', 'video-editing', '3d-modeling', 'productivity']
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Performance health check failed:', error);
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message
    });
  }
});

module.exports = router;

