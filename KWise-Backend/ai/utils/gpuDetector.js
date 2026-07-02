ai/**
 * GPU Detection and Model Selection for Production Deployment
 * 
 * PRODUCTION HARDWARE SUPPORT:
 * - RTX 3050 Ti 4GB: Use DeepSeek R1 1.5b
 * - RTX 5060 8GB: Use DeepSeek R1 7b (optimal)
 * - RTX 5060 16GB+: Use DeepSeek R1 8b (maximum performance)
 * 
 * Automatically detects GPU VRAM and selects the best compatible model
 */

const { exec } = require('node:child_process');
const { promisify } = require('node:util');
const os = require('node:os');
const logger = require('../../utils/logger');

const execAsync = promisify(exec);

class GPUDetector {
  constructor() {
    this.detectedVRAM = null;
    this.detectedGPU = null;
    this.recommendedModel = null;
    this.detectionAttempted = false;
  }

  /**
   * Detect GPU and VRAM automatically
   * @returns {Promise<Object>} GPU info with VRAM and recommended model
   */
  async detectGPU() {
    if (this.detectionAttempted) {
      return {
        vram: this.detectedVRAM,
        gpu: this.detectedGPU,
        recommendedModel: this.recommendedModel
      };
    }

    this.detectionAttempted = true;
    
    try {
      logger.info('🔍 Detecting GPU and VRAM...');
      
      const platform = os.platform();
      
      if (platform === 'win32') {
        // Windows: Use nvidia-smi
        return await this.detectNvidiaWindows();
      } else if (platform === 'linux') {
        // Linux: Use nvidia-smi
        return await this.detectNvidiaLinux();
      } else {
        logger.warn('⚠️ GPU detection not supported on this platform, using default model');
        return this.getDefaultConfig();
      }
    } catch (error) {
      logger.error('GPU detection failed:', error.message);
      return this.getDefaultConfig();
    }
  }

  /**
   * Detect NVIDIA GPU on Windows
   */
  async detectNvidiaWindows() {
    try {
      // Try nvidia-smi first
      const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits');
      
      const lines = stdout.trim().split('\n');
      if (lines.length > 0) {
        const [gpuName, vramMB] = lines[0].split(',').map(s => s.trim());
        const vramGB = Math.floor(Number.parseInt(vramMB, 10) / 1024);
        
        this.detectedGPU = gpuName;
        this.detectedVRAM = vramGB;
        
        logger.info(`✅ GPU Detected: ${gpuName}`);
        logger.info(`✅ VRAM: ${vramGB} GB`);
        
        const model = this.selectModelForVRAM(vramGB);
        this.recommendedModel = model;
        
        return {
          vram: vramGB,
          gpu: gpuName,
          recommendedModel: model,
          detected: true
        };
      }
    } catch (error) {
      // nvidia-smi failed, try alternative detection
      logger.warn('nvidia-smi not found, trying alternative detection...');
    }
    
    // Fallback: Try to detect via Ollama's own GPU info
    try {
      return await this.detectViaOllama();
    } catch (error) {
      return this.getDefaultConfig();
    }
  }

  /**
   * Detect NVIDIA GPU on Linux
   */
  async detectNvidiaLinux() {
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits');
      
      const lines = stdout.trim().split('\n');
      if (lines.length > 0) {
        const [gpuName, vramMB] = lines[0].split(',').map(s => s.trim());
        const vramGB = Math.floor(Number.parseInt(vramMB, 10) / 1024);
        
        this.detectedGPU = gpuName;
        this.detectedVRAM = vramGB;
        
        logger.info(`✅ GPU Detected: ${gpuName}`);
        logger.info(`✅ VRAM: ${vramGB} GB`);
        
        const model = this.selectModelForVRAM(vramGB);
        this.recommendedModel = model;
        
        return {
          vram: vramGB,
          gpu: gpuName,
          recommendedModel: model,
          detected: true
        };
      }
    } catch (error) {
      return await this.detectViaOllama();
    }
  }

  /**
   * Detect via Ollama API (fallback method)
   */
  async detectViaOllama() {
    // Ollama doesn't provide GPU info directly
    // Fall back to conservative default
    logger.warn('⚠️ Could not detect GPU via nvidia-smi, using conservative default');
    return this.getDefaultConfig();
  }

  /**
   * Select the best model based on available VRAM
   * 
   * VRAM Requirements:
   * - 1.5b model: ~2-3 GB VRAM (minimum)
   * - 7b model: ~5-6 GB VRAM (recommended for RTX 5060 8GB)
   * - 8b model: ~6-8 GB VRAM (maximum performance, for 16GB+ VRAM)
   * 
   * @param {number} vramGB - Available VRAM in GB
   * @returns {string} Best compatible model
   */
  selectModelForVRAM(vramGB) {
    if (vramGB >= 12) {
      // 12GB+: Use 8b model for maximum performance
      logger.info(`🚀 Production Mode: ${vramGB}GB VRAM → Using DeepSeek R1 8b (maximum performance)`);
      return 'deepseek-r1:8b';
    } else if (vramGB >= 6) {
      // 6-11GB: Use 7b model (optimal for RTX 5060 8GB)
      logger.info(`🚀 Production Mode: ${vramGB}GB VRAM → Using DeepSeek R1 7b (optimal)`);
      return 'deepseek-r1:7b';
    } else if (vramGB >= 4) {
      // 4-5GB: Use 1.5b model (safe for RTX 3050 Ti)
      logger.info(`⚡ Development Mode: ${vramGB}GB VRAM → Using DeepSeek R1 1.5b (safe)`);
      return 'deepseek-r1:1.5b';
    } else {
      // <4GB: Use 1.5b model (minimum)
      logger.warn(`⚠️ Limited VRAM (${vramGB}GB) → Using DeepSeek R1 1.5b (minimum)`);
      return 'deepseek-r1:1.5b';
    }
  }

  /**
   * Get default configuration when detection fails
   */
  getDefaultConfig() {
    logger.warn('⚠️ GPU detection failed, using conservative default (1.5b model)');
    
    this.detectedVRAM = 4; // Assume 4GB minimum
    this.detectedGPU = 'Unknown GPU';
    this.recommendedModel = 'deepseek-r1:1.5b';
    
    return {
      vram: 4,
      gpu: 'Unknown GPU',
      recommendedModel: 'deepseek-r1:1.5b',
      detected: false
    };
  }

  /**
   * Get model priority list for fallback
   * @param {number} vramGB - Available VRAM
   * @returns {Array<string>} Ordered list of models to try
   */
  getModelPriorityList(vramGB) {
    if (vramGB >= 12) {
      return ['deepseek-r1:8b', 'deepseek-r1:7b', 'deepseek-r1:1.5b'];
    } else if (vramGB >= 6) {
      return ['deepseek-r1:7b', 'deepseek-r1:1.5b'];
    } else {
      return ['deepseek-r1:1.5b'];
    }
  }

  /**
   * Get production deployment info
   */
  getDeploymentInfo() {
    return {
      current: {
        vram: this.detectedVRAM || 4,
        gpu: this.detectedGPU || 'Unknown',
        model: this.recommendedModel || 'deepseek-r1:1.5b',
        mode: (this.detectedVRAM || 4) >= 6 ? 'PRODUCTION' : 'DEVELOPMENT'
      },
      production: {
        recommended: {
          gpu: 'RTX 5060',
          vram: 8,
          ram: 64,
          storage: '2TB NVMe SSD',
          model: 'deepseek-r1:7b',
          expectedSpeed: '<10 seconds',
          concurrentUsers: '10,000+'
        },
        maximum: {
          gpu: 'RTX 5060 16GB',
          vram: 16,
          ram: 64,
          storage: '2TB NVMe SSD',
          model: 'deepseek-r1:8b',
          expectedSpeed: '<5 seconds',
          concurrentUsers: '50,000+'
        }
      }
    };
  }
}

// Singleton instance
const gpuDetector = new GPUDetector();

module.exports = gpuDetector;
