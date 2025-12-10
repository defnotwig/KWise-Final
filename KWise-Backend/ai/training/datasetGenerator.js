/**
 * Training Dataset Generator for DeepSeek-R1 Fine-Tuning
 * Generates high-quality synthetic training data from existing database
 * Creates instruction/context/output pairs for PC hardware compatibility
 */

const { query } = require('../../config/db');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

class DatasetGenerator {
  constructor() {
    this.datasetPath = path.join(__dirname, 'datasets');
    this.compatibilityRules = this.initializeCompatibilityRules();
  }

  /**
   * Initialize compatibility rules based on PC hardware standards
   */
  initializeCompatibilityRules() {
    return {
      cpuSocketRules: {
        'AM4': ['AM4'],
        'AM5': ['AM5'],
        'LGA1700': ['LGA1700'],
        'LGA1851': ['LGA1851'],
        'LGA1200': ['LGA1200']
      },
      ramTypes: {
        'DDR4': ['DDR4'],
        'DDR5': ['DDR5']
      },
      formFactors: {
        'ATX': ['ATX', 'Mid Tower', 'Full Tower'],
        'Micro-ATX': ['Micro-ATX', 'ATX', 'Mid Tower', 'Full Tower'],
        'Mini-ITX': ['Mini-ITX', 'Micro-ATX', 'ATX', 'Mid Tower', 'Full Tower']
      },
      powerRequirements: {
        'low': { min: 450, recommended: 550 },
        'medium': { min: 550, recommended: 650 },
        'high': { min: 650, recommended: 750 },
        'extreme': { min: 750, recommended: 850 }
      }
    };
  }

  /**
   * Generate complete training dataset from database
   */
  async generateCompleteDataset() {
    try {
      logger.info('Starting training dataset generation...');

      // Ensure dataset directory exists
      await fs.mkdir(this.datasetPath, { recursive: true });

      // Fetch all component data
      const components = await this.fetchAllComponents();
      
      logger.info(`Fetched ${Object.keys(components).length} component categories`);

      // Generate different types of training examples
      const datasets = {
        compatibility: await this.generateCompatibilityExamples(components),
        incompatibility: await this.generateIncompatibilityExamples(components),
        alternatives: await this.generateAlternativeExamples(components),
        buildOptimization: await this.generateBuildOptimizationExamples(components),
        powerAnalysis: await this.generatePowerAnalysisExamples(components),
        valueAnalysis: await this.generateValueAnalysisExamples(components)
      };

      // Combine all datasets
      const completeDataset = [
        ...datasets.compatibility,
        ...datasets.incompatibility,
        ...datasets.alternatives,
        ...datasets.buildOptimization,
        ...datasets.powerAnalysis,
        ...datasets.valueAnalysis
      ];

      // Save as JSONL format (one JSON object per line)
      const jsonlPath = path.join(this.datasetPath, 'pc_hardware_training_dataset.jsonl');
      await this.saveAsJsonl(completeDataset, jsonlPath);

      // Save summary
      const summary = {
        totalExamples: completeDataset.length,
        byType: {
          compatibility: datasets.compatibility.length,
          incompatibility: datasets.incompatibility.length,
          alternatives: datasets.alternatives.length,
          buildOptimization: datasets.buildOptimization.length,
          powerAnalysis: datasets.powerAnalysis.length,
          valueAnalysis: datasets.valueAnalysis.length
        },
        generatedAt: new Date().toISOString()
      };

      await fs.writeFile(
        path.join(this.datasetPath, 'dataset_summary.json'),
        JSON.stringify(summary, null, 2)
      );

      logger.info('Training dataset generation complete', summary);

      return {
        success: true,
        path: jsonlPath,
        summary
      };

    } catch (error) {
      logger.error('Dataset generation failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Fetch all components from database
   */
  async fetchAllComponents() {
    const components = {
      cpus: await query('SELECT * FROM cpu WHERE id IN (SELECT id FROM pc_parts WHERE is_active = true AND kiosk_visible = true)'),
      motherboards: await query('SELECT * FROM motherboard WHERE id IN (SELECT id FROM pc_parts WHERE is_active = true AND kiosk_visible = true)'),
      ram: await query('SELECT * FROM ram WHERE id IN (SELECT id FROM pc_parts WHERE is_active = true AND kiosk_visible = true)'),
      gpus: await query('SELECT * FROM gpu WHERE id IN (SELECT id FROM pc_parts WHERE is_active = true AND kiosk_visible = true)'),
      storage: await query('SELECT * FROM storage WHERE id IN (SELECT id FROM pc_parts WHERE is_active = true AND kiosk_visible = true)'),
      cooling: await query('SELECT * FROM cooling WHERE id IN (SELECT id FROM pc_parts WHERE is_active = true AND kiosk_visible = true)'),
      psus: await query('SELECT * FROM psu WHERE id IN (SELECT id FROM pc_parts WHERE is_active = true AND kiosk_visible = true)'),
      cases: await query('SELECT * FROM pc_case WHERE id IN (SELECT id FROM pc_parts WHERE is_active = true AND kiosk_visible = true)')
    };

    return {
      cpus: components.cpus.rows,
      motherboards: components.motherboards.rows,
      ram: components.ram.rows,
      gpus: components.gpus.rows,
      storage: components.storage.rows,
      cooling: components.cooling.rows,
      psus: components.psus.rows,
      cases: components.cases.rows
    };
  }

  /**
   * Generate compatibility examples (positive cases)
   */
  async generateCompatibilityExamples(components) {
    const examples = [];

    // CPU + Motherboard + RAM compatible examples
    for (const cpu of components.cpus.slice(0, 10)) {
      const compatibleMotherboards = components.motherboards.filter(mb => 
        mb.socket === cpu.socket
      );

      if (compatibleMotherboards.length > 0) {
        const motherboard = compatibleMotherboards[0];
        
        // Find compatible RAM
        const compatibleRam = components.ram.filter(r => 
          r.memory_type === motherboard.memory_type
        );

        if (compatibleRam.length > 0) {
          const ram = compatibleRam[0];

          examples.push({
            instruction: `Check the compatibility of ${cpu.name} CPU with ${motherboard.name} motherboard and ${ram.name} RAM.`,
            context: {
              cpu: {
                name: cpu.name,
                socket: cpu.socket,
                cores: cpu.cores,
                tdp: cpu.tdp,
                integrated_gpu: cpu.integrated_gpu
              },
              motherboard: {
                name: motherboard.name,
                socket: motherboard.socket,
                memory_type: motherboard.memory_type,
                memory_slots: motherboard.memory_slots,
                max_memory: motherboard.max_memory
              },
              ram: {
                name: ram.name,
                memory_type: ram.memory_type,
                capacity: ram.capacity,
                speed: ram.speed
              }
            },
            output: `Compatible. ✅

**Analysis:**
1. **CPU-Motherboard Compatibility**: The ${cpu.name} (${cpu.socket} socket) is fully compatible with the ${motherboard.name} motherboard (${motherboard.socket} socket). Socket types match perfectly.

2. **RAM Compatibility**: The ${ram.name} (${ram.memory_type}) is compatible with the motherboard's ${motherboard.memory_type} slots. The motherboard supports up to ${motherboard.max_memory}GB across ${motherboard.memory_slots} slots.

3. **Power Consideration**: The CPU has a TDP of ${cpu.tdp}W, which is within normal ranges. A ${this.recommendPSU(cpu.tdp + 150)}W PSU is recommended for this configuration.

**Verdict**: This is a fully compatible build with no issues detected. All components will work together seamlessly.`
          });
        }
      }
    }

    return examples;
  }

  /**
   * Generate incompatibility examples (negative cases - critical for learning)
   */
  async generateIncompatibilityExamples(components) {
    const examples = [];

    // Socket mismatch examples
    const am4CPUs = components.cpus.filter(cpu => cpu.socket === 'AM4');
    const intelMotherboards = components.motherboards.filter(mb => mb.socket?.includes('LGA'));

    if (am4CPUs.length > 0 && intelMotherboards.length > 0) {
      const cpu = am4CPUs[0];
      const motherboard = intelMotherboards[0];

      examples.push({
        instruction: `Analyze compatibility between ${cpu.name} and ${motherboard.name}.`,
        context: {
          cpu: {
            name: cpu.name,
            socket: cpu.socket,
            manufacturer: 'AMD'
          },
          motherboard: {
            name: motherboard.name,
            socket: motherboard.socket,
            chipset: motherboard.chipset
          }
        },
        output: `Incompatible. ❌

**Critical Issue: Socket Mismatch**

The ${cpu.name} requires an **${cpu.socket}** socket (AMD), but the ${motherboard.name} has a **${motherboard.socket}** socket (Intel). These are physically incompatible - the CPU cannot be installed on this motherboard.

**Impact**: Complete incompatibility - system will not function.

**Solution**: You must choose either:
1. An AMD AM4-compatible motherboard for this CPU, OR
2. An Intel CPU with ${motherboard.socket} socket for this motherboard

**Recommendation**: Keep the CPU and replace the motherboard with an AMD B550, A520, or X570 chipset board that supports AM4 socket.`
      });
    }

    // RAM type mismatch
    const ddr5Motherboards = components.motherboards.filter(mb => mb.memory_type === 'DDR5');
    const ddr4Ram = components.ram.filter(r => r.memory_type === 'DDR4');

    if (ddr5Motherboards.length > 0 && ddr4Ram.length > 0) {
      const motherboard = ddr5Motherboards[0];
      const ram = ddr4Ram[0];

      examples.push({
        instruction: `Check if ${ram.name} is compatible with ${motherboard.name}.`,
        context: {
          motherboard: {
            name: motherboard.name,
            memory_type: motherboard.memory_type,
            memory_slots: motherboard.memory_slots
          },
          ram: {
            name: ram.name,
            memory_type: ram.memory_type,
            capacity: ram.capacity
          }
        },
        output: `Incompatible. ❌

**Critical Issue: RAM Generation Mismatch**

The ${motherboard.name} requires **${motherboard.memory_type}** RAM, but you selected **${ram.memory_type}** RAM (${ram.name}). These are physically incompatible due to different notch positions and pin counts.

**Impact**: RAM will not fit in the slots - physical incompatibility.

**Solution**: Replace the RAM with DDR5 modules. Note that DDR5 generally costs more than DDR4 but offers higher speeds.

**Recommendation**: Look for DDR5 RAM with speeds of 4800MHz or higher for optimal performance with this modern motherboard.`
      });
    }

    // Insufficient PSU wattage
    const highEndGPUs = components.gpus.filter(gpu => gpu.tdp && gpu.tdp > 300);
    const lowPowerPSUs = components.psus.filter(psu => psu.wattage && psu.wattage < 550);

    if (highEndGPUs.length > 0 && lowPowerPSUs.length > 0) {
      const gpu = highEndGPUs[0];
      const psu = lowPowerPSUs[0];
      const estimatedCPU = 125; // Typical high-end CPU

      examples.push({
        instruction: `Is a ${psu.wattage}W PSU sufficient for a build with ${gpu.name}?`,
        context: {
          gpu: {
            name: gpu.name,
            tdp: gpu.tdp
          },
          psu: {
            name: psu.name,
            wattage: psu.wattage
          },
          system: {
            estimatedCPUPower: estimatedCPU,
            otherComponents: 50
          }
        },
        output: `Insufficient Power. ⚠️

**Warning: PSU Underpowered**

**Power Analysis:**
- GPU (${gpu.name}): ${gpu.tdp}W
- CPU (estimated): ${estimatedCPU}W
- Other components: 50W
- **Total Estimated**: ${gpu.tdp + estimatedCPU + 50}W
- **Your PSU**: ${psu.wattage}W

**Issues:**
1. Total power draw (${gpu.tdp + estimatedCPU + 50}W) exceeds PSU capacity (${psu.wattage}W)
2. PSUs operate most efficiently at 50-80% load
3. Power spikes during gaming can exceed TDP values
4. Running PSU at maximum capacity reduces lifespan

**Impact**: System instability, random shutdowns, potential component damage.

**Recommendation**: Upgrade to at least a ${this.recommendPSU(gpu.tdp + estimatedCPU + 50)}W PSU (80+ Bronze or better) for safe, stable operation.`
      });
    }

    return examples;
  }

  /**
   * Generate alternative component examples
   */
  async generateAlternativeExamples(components) {
    const examples = [];

    // Budget alternatives
    if (components.cpus.length >= 3) {
      const highEndCPU = components.cpus.reduce((prev, current) => 
        (current.price > prev.price) ? current : prev
      );

      const budgetAlternatives = components.cpus
        .filter(cpu => cpu.socket === highEndCPU.socket && cpu.price < highEndCPU.price * 0.7)
        .slice(0, 3);

      if (budgetAlternatives.length > 0) {
        examples.push({
          instruction: `Suggest budget alternatives to ${highEndCPU.name} (₱${highEndCPU.price}).`,
          context: {
            original: {
              name: highEndCPU.name,
              price: highEndCPU.price,
              socket: highEndCPU.socket,
              cores: highEndCPU.cores,
              tdp: highEndCPU.tdp
            },
            budget: highEndCPU.price * 0.7,
            availableAlternatives: budgetAlternatives.map(cpu => ({
              name: cpu.name,
              price: cpu.price,
              cores: cpu.cores,
              tdp: cpu.tdp
            }))
          },
          output: `Budget Alternatives for ${highEndCPU.name}:

${budgetAlternatives.map((cpu, index) => `
**${index + 1}. ${cpu.name}** - ₱${cpu.price} (${Math.round(((highEndCPU.price - cpu.price) / highEndCPU.price) * 100)}% savings)
   - Cores: ${cpu.cores} vs ${highEndCPU.cores} (original)
   - Socket: ${cpu.socket} (compatible)
   - TDP: ${cpu.tdp}W
   - **Tradeoff**: ${this.analyzeCPUTradeoff(cpu, highEndCPU)}
   - **Best for**: ${this.recommendUseCaseCPU(cpu)}
`).join('\n')}

**Recommendation**: ${budgetAlternatives[0].name} offers the best price-to-performance ratio for budget-conscious builders while maintaining compatibility with ${highEndCPU.socket} motherboards.`
        });
      }
    }

    return examples;
  }

  /**
   * Generate build optimization examples
   */
  async generateBuildOptimizationExamples(components) {
    const examples = [];

    // Balanced build example
    if (components.cpus.length > 0 && components.gpus.length > 0) {
      const midRangeCPU = components.cpus.find(cpu => cpu.price > 5000 && cpu.price < 15000);
      const midRangeGPU = components.gpus.find(gpu => gpu.price > 10000 && gpu.price < 30000);

      if (midRangeCPU && midRangeGPU) {
        examples.push({
          instruction: `Analyze if ${midRangeCPU.name} and ${midRangeGPU.name} are well-balanced for gaming.`,
          context: {
            cpu: {
              name: midRangeCPU.name,
              cores: midRangeCPU.cores,
              price: midRangeCPU.price
            },
            gpu: {
              name: midRangeGPU.name,
              price: midRangeGPU.price
            },
            useCase: 'gaming'
          },
          output: `Build Balance Analysis:

**Components:**
- CPU: ${midRangeCPU.name} (${midRangeCPU.cores} cores) - ₱${midRangeCPU.price}
- GPU: ${midRangeGPU.name} - ₱${midRangeGPU.price}

**Balance Assessment**: ${this.assessBalance(midRangeCPU.price, midRangeGPU.price)}

**Performance Expectations:**
- 1080p Gaming: Excellent (60+ FPS on high settings)
- 1440p Gaming: Good (60 FPS on medium-high settings)
- Bottleneck Risk: Minimal - well-matched components

**Budget Allocation**: ${Math.round((midRangeGPU.price / (midRangeCPU.price + midRangeGPU.price)) * 100)}% to GPU, ${Math.round((midRangeCPU.price / (midRangeCPU.price + midRangeGPU.price)) * 100)}% to CPU (ideal for gaming)

**Recommendation**: This is a well-balanced gaming build. The ${midRangeCPU.cores}-core CPU won't bottleneck the GPU, and the GPU is powerful enough to justify the CPU investment.`
        });
      }
    }

    return examples;
  }

  /**
   * Generate power analysis examples
   */
  async generatePowerAnalysisExamples(components) {
    const examples = [];

    // Complete system power calculation
    if (components.cpus.length > 0 && components.gpus.length > 0 && components.psus.length > 0) {
      const cpu = components.cpus[0];
      const gpu = components.gpus[0];
      const psu = components.psus.find(p => p.wattage >= 650) || components.psus[0];

      const totalPower = (cpu.tdp || 65) + (gpu.tdp || 150) + 100; // +100 for other components

      examples.push({
        instruction: `Calculate power requirements for a build with ${cpu.name} and ${gpu.name}.`,
        context: {
          cpu: { name: cpu.name, tdp: cpu.tdp || 65 },
          gpu: { name: gpu.name, tdp: gpu.tdp || 150 },
          otherComponents: ['Motherboard', 'RAM', 'Storage', 'Cooling'],
          availablePSU: { name: psu.name, wattage: psu.wattage }
        },
        output: `Power Requirement Analysis:

**Component Power Draw:**
- CPU (${cpu.name}): ${cpu.tdp || 65}W TDP
- GPU (${gpu.name}): ${gpu.tdp || 150}W TDP
- Motherboard: ~50W
- RAM (16GB): ~10W
- Storage (NVMe): ~5W
- Cooling & Fans: ~30W
- Other: ~5W

**Total Estimated Power**: ${totalPower}W

**PSU Recommendation**:
- Minimum: ${this.recommendPSU(totalPower)}W
- Recommended: ${this.recommendPSU(totalPower) + 100}W (for headroom and efficiency)
- Your ${psu.name} (${psu.wattage}W): ${psu.wattage >= this.recommendPSU(totalPower) ? '✅ Sufficient' : '⚠️ Insufficient'}

**Efficiency Note**: PSUs operate most efficiently at 50-80% load. Your system will draw approximately ${Math.round((totalPower / psu.wattage) * 100)}% of PSU capacity at peak load.

**Verdict**: ${psu.wattage >= this.recommendPSU(totalPower) + 50 ? 'Excellent power headroom for stability and future upgrades.' : 'Adequate but consider higher wattage for future GPU upgrades.'}`
      });
    }

    return examples;
  }

  /**
   * Generate value analysis examples
   */
  async generateValueAnalysisExamples(components) {
    const examples = [];

    // Price-per-core analysis for CPUs
    if (components.cpus.length >= 3) {
      const cpusWithValue = components.cpus
        .filter(cpu => cpu.cores && cpu.price)
        .map(cpu => ({
          ...cpu,
          pricePerCore: cpu.price / cpu.cores
        }))
        .sort((a, b) => a.pricePerCore - b.pricePerCore)
        .slice(0, 3);

      if (cpusWithValue.length > 0) {
        examples.push({
          instruction: `Which CPU offers the best value for money?`,
          context: {
            cpus: cpusWithValue.map(cpu => ({
              name: cpu.name,
              cores: cpu.cores,
              price: cpu.price,
              pricePerCore: cpu.pricePerCore
            }))
          },
          output: `Value for Money Analysis (CPU):

${cpusWithValue.map((cpu, index) => `
**${index + 1}. ${cpu.name}**
   - Price: ₱${cpu.price}
   - Cores: ${cpu.cores}
   - Price per Core: ₱${Math.round(cpu.pricePerCore)}
   - Value Rating: ${this.getValueRating(cpu.pricePerCore, cpusWithValue[0].pricePerCore)}
   - Best for: ${this.recommendUseCaseCPU(cpu)}
`).join('\n')}

**Winner**: ${cpusWithValue[0].name} offers the best value at ₱${Math.round(cpusWithValue[0].pricePerCore)} per core.

**Note**: Value doesn't always mean fastest. Consider your workload - gaming benefits from higher single-core speeds, while productivity benefits from more cores.`
        });
      }
    }

    return examples;
  }

  /**
   * Save dataset as JSONL format
   */
  async saveAsJsonl(dataset, filePath) {
    const jsonlContent = dataset.map(example => JSON.stringify(example)).join('\n');
    await fs.writeFile(filePath, jsonlContent, 'utf-8');
    logger.info(`Dataset saved to ${filePath} (${dataset.length} examples)`);
  }

  // Helper methods
  recommendPSU(totalWattage) {
    if (totalWattage < 300) return 450;
    if (totalWattage < 400) return 550;
    if (totalWattage < 500) return 650;
    if (totalWattage < 600) return 750;
    return 850;
  }

  analyzeCPUTradeoff(cpu1, cpu2) {
    const coreDiff = cpu2.cores - cpu1.cores;
    if (coreDiff > 4) return `${coreDiff} fewer cores, suitable for gaming and light productivity`;
    if (coreDiff > 0) return `Slightly fewer cores, minimal impact on most tasks`;
    return 'Similar core count, check clock speeds for performance difference';
  }

  recommendUseCaseCPU(cpu) {
    if (cpu.cores >= 12) return 'Content creation, video editing, heavy multitasking';
    if (cpu.cores >= 8) return 'Gaming + streaming, productivity work';
    if (cpu.cores >= 6) return 'Gaming, general use, moderate multitasking';
    return 'Budget gaming, office work, web browsing';
  }

  assessBalance(cpuPrice, gpuPrice) {
    const ratio = gpuPrice / cpuPrice;
    if (ratio > 3) return '⚠️ GPU-heavy (may bottleneck CPU in some games)';
    if (ratio > 2) return '✅ Well-balanced for gaming';
    if (ratio > 1) return '✅ Balanced for gaming and productivity';
    if (ratio > 0.5) return '⚠️ CPU-heavy (GPU may be underutilized)';
    return '❌ Imbalanced - too much on CPU, not enough on GPU for gaming';
  }

  getValueRating(pricePerCore, bestPricePerCore) {
    const ratio = pricePerCore / bestPricePerCore;
    if (ratio <= 1.1) return '⭐⭐⭐⭐⭐ Excellent';
    if (ratio <= 1.3) return '⭐⭐⭐⭐ Very Good';
    if (ratio <= 1.5) return '⭐⭐⭐ Good';
    if (ratio <= 2.0) return '⭐⭐ Fair';
    return '⭐ Below Average';
  }
}

module.exports = new DatasetGenerator();
