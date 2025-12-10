/**
 * Ollama Health Check Script for K-Wise Backend
 * Checks if Ollama is running and model is available
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:1.5b';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkOllamaRunning() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    return { running: true, models: response.data.models || [] };
  } catch (error) {
    return { running: false, models: [] };
  }
}

function findOllamaExecutable() {
  const possiblePaths = [
    'C:\\Program Files\\Ollama\\ollama.exe',
    path.join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe'),
    path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe')
  ];

  for (const ollamaPath of possiblePaths) {
    if (fs.existsSync(ollamaPath)) {
      return ollamaPath;
    }
  }

  return null;
}

async function startOllama() {
  const ollamaPath = findOllamaExecutable();
  
  if (!ollamaPath) {
    log('❌ Ollama executable not found', 'red');
    log('', 'reset');
    log('📥 To install Ollama:', 'yellow');
    log('   1. Download from: https://ollama.com/download/windows', 'reset');
    log('   2. Install the application', 'reset');
    log('   3. Run: ollama pull deepseek-r1:1.5b', 'reset');
    log('', 'reset');
    return false;
  }

  log(`✅ Ollama found at: ${ollamaPath}`, 'green');
  log('🚀 Starting Ollama service...', 'yellow');

  try {
    // Start Ollama in detached mode
    const ollamaProcess = spawn(ollamaPath, ['serve'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });

    ollamaProcess.unref();

    // Wait for service to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify service started
    const status = await checkOllamaRunning();
    if (status.running) {
      log('✅ Ollama service started successfully', 'green');
      return true;
    } else {
      log('⚠️ Ollama service may not have started properly', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Failed to start Ollama: ${error.message}`, 'red');
    return false;
  }
}

async function checkModel(models) {
  const hasModel = models.some(m => m.name.includes(OLLAMA_MODEL) || m.name.includes('deepseek-r1'));
  
  if (hasModel) {
    log('✅ DeepSeek R1 1.5B model is available', 'green');
    return true;
  } else {
    log('⚠️ DeepSeek R1 1.5B model NOT found', 'yellow');
    log('', 'reset');
    log('📥 To download the model, run:', 'yellow');
    log('   ollama pull deepseek-r1:1.5b', 'reset');
    log('', 'reset');
    return false;
  }
}

async function main() {
  log('', 'reset');
  log('🤖 K-Wise Ollama Health Check', 'cyan');
  log('==============================', 'cyan');
  log('', 'reset');

  // Check if Ollama is already running
  let status = await checkOllamaRunning();

  if (!status.running) {
    log('⚠️ Ollama is not running', 'yellow');
    
    // Try to start Ollama
    const started = await startOllama();
    
    if (!started) {
      log('', 'reset');
      log('⚠️ AI features will be DISABLED', 'yellow');
      log('   Backend will continue to run normally', 'gray');
      log('', 'reset');
      process.exit(0);
    }

    // Recheck status after starting
    status = await checkOllamaRunning();
  } else {
    log('✅ Ollama is already running', 'green');
  }

  // Check if model is available
  if (status.running) {
    log('🔍 Checking for DeepSeek R1 1.5B model...', 'cyan');
    const hasModel = await checkModel(status.models);
    
    if (!hasModel) {
      log('⚠️ AI features may not work properly without the model', 'yellow');
    }
  }

  log('', 'reset');
  log('🎯 Ollama health check complete!', 'cyan');
  log('==============================', 'cyan');
  log('', 'reset');
}

// Run the health check
main().catch(error => {
  log(`❌ Health check failed: ${error.message}`, 'red');
  process.exit(1);
});
