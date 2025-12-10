/**
 * Fine-Tuning Configuration and Setup for DeepSeek-R1
 * Creates Modelfile and manages fine-tuning process for Ollama
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const logger = require('../../utils/logger');

const execPromise = util.promisify(exec);

class FineTuningManager {
  constructor() {
    this.trainingDir = path.join(__dirname, 'datasets');
    this.modelsDir = path.join(__dirname, 'models');
    this.baseModel = 'deepseek-r1:1.5b';
    this.customModelName = 'kwise-pc-expert';
  }

  /**
   * Create Modelfile for Ollama fine-tuning
   */
  async createModelfile(datasetPath) {
    const modelfileContent = `# K-Wise PC Hardware Expert Model
# Fine-tuned DeepSeek-R1 for PC compatibility analysis

FROM ${this.baseModel}

# Use the training dataset
ADAPTER "${datasetPath}"

# System prompt for PC hardware expertise
SYSTEM """You are an expert PC hardware compatibility analyst for K-Wise, a computer parts store in the Philippines.

Your expertise includes:
- CPU socket compatibility (Intel LGA1700/LGA1851, AMD AM4/AM5)
- RAM compatibility (DDR4/DDR5, speeds, capacities)
- Motherboard chipset features and limitations  
- Power supply calculations and efficiency ratings
- GPU clearance and power requirements
- Storage interfaces (SATA, NVMe M.2)
- Case form factors and component sizing
- Cooling requirements and thermal considerations
- Philippine market pricing and availability

Always provide:
1. Clear compatibility verdict (Compatible/Incompatible/Warning)
2. Detailed technical reasoning
3. Specific component references
4. Impact assessment (Critical/High/Medium/Low)
5. Actionable recommendations
6. Philippine peso (₱) pricing considerations

Be concise, accurate, and professional. Prioritize user safety and system stability."""

# Optimize for PC hardware analysis
PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1
PARAMETER num_predict 1024
PARAMETER num_ctx 4096

# Stop sequences for clean responses
PARAMETER stop "###"
PARAMETER stop "---"
PARAMETER stop "<|endoftext|>"

# Response templates for consistency
TEMPLATE """### User
{{.instruction}}

### Context
{{.context}}

### Task
Analyze the PC components provided in the Context section. Identify all compatibility issues (socket mismatches, RAM type conflicts, power insufficiency, physical clearance issues). Provide a clear verdict and detailed explanation.

### Assistant
{{.response}}"""
`;

    const modelfilePath = path.join(this.modelsDir, 'Modelfile');
    await fs.mkdir(this.modelsDir, { recursive: true });
    await fs.writeFile(modelfilePath, modelfileContent, 'utf-8');

    logger.info(`Modelfile created at ${modelfilePath}`);
    return modelfilePath;
  }

  /**
   * Execute fine-tuning process with Ollama
   */
  async runFineTuning(datasetPath) {
    try {
      logger.info('Starting fine-tuning process...');

      // Step 1: Create Modelfile
      const modelfilePath = await this.createModelfile(datasetPath);

      // Step 2: Check if Ollama is running
      try {
        await execPromise('ollama list');
        logger.info('Ollama is running ✓');
      } catch (error) {
        throw new Error('Ollama is not running. Please start Ollama first.');
      }

      // Step 3: Check if base model exists
      const { stdout } = await execPromise('ollama list');
      if (!stdout.includes(this.baseModel)) {
        logger.info(`Pulling base model ${this.baseModel}...`);
        await execPromise(`ollama pull ${this.baseModel}`);
      }

      // Step 4: Create custom model
      logger.info(`Creating custom model ${this.customModelName}...`);
      
      const createCommand = `ollama create ${this.customModelName} -f "${modelfilePath}"`;
      const { stdout: createOutput, stderr: createError } = await execPromise(createCommand);

      if (createError) {
        logger.warn('Fine-tuning warnings:', createError);
      }

      logger.info('Fine-tuning complete!', { output: createOutput });

      // Step 5: Verify model creation
      const { stdout: listOutput } = await execPromise('ollama list');
      if (listOutput.includes(this.customModelName)) {
        logger.info(`✅ Model ${this.customModelName} created successfully`);
        
        return {
          success: true,
          modelName: this.customModelName,
          baseModel: this.baseModel,
          message: 'Fine-tuning completed successfully'
        };
      } else {
        throw new Error('Model creation verification failed');
      }

    } catch (error) {
      logger.error('Fine-tuning failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Test the fine-tuned model
   */
  async testFineTunedModel() {
    try {
      const testPrompt = `
Analyze this PC build:
- CPU: AMD Ryzen 5 5600G (AM4 socket)
- Motherboard: ASUS ROG STRIX B550-F (AM4 socket, DDR4)
- RAM: Corsair Vengeance DDR4 16GB 3200MHz
- PSU: Corsair 550W 80+ Bronze

Is this compatible?`;

      const command = `ollama run ${this.customModelName} "${testPrompt}"`;
      const { stdout } = await execPromise(command);

      logger.info('Test response from fine-tuned model:', { response: stdout });

      return {
        success: true,
        prompt: testPrompt,
        response: stdout
      };

    } catch (error) {
      logger.error('Model test failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get fine-tuning status and model info
   */
  async getStatus() {
    try {
      const { stdout } = await execPromise('ollama list');
      const models = stdout.split('\n').filter(line => line.trim());
      
      const baseModelExists = models.some(line => line.includes(this.baseModel));
      const customModelExists = models.some(line => line.includes(this.customModelName));

      return {
        ollamaRunning: true,
        baseModelInstalled: baseModelExists,
        customModelInstalled: customModelExists,
        baseModel: this.baseModel,
        customModel: this.customModelName,
        allModels: models
      };

    } catch (error) {
      return {
        ollamaRunning: false,
        error: error.message
      };
    }
  }

  /**
   * Delete custom model (for re-training)
   */
  async deleteCustomModel() {
    try {
      await execPromise(`ollama rm ${this.customModelName}`);
      logger.info(`Custom model ${this.customModelName} deleted`);
      return { success: true };
    } catch (error) {
      logger.warn('Model deletion failed (may not exist)', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FineTuningManager();
