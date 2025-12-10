/**
 * Simple Ollama Auto-Start Test
 * Tests all Ollama functionality
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Colors
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  process.stdout.write(`\n🔍 ${name}... `);
  try {
    const result = await fn();
    if (result) {
      log('✅ PASS', 'green');
      testsPassed++;
    } else {
      log('❌ FAIL', 'red');
      testsFailed++;
    }
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red');
    testsFailed++;
  }
}

async function checkOllamaInstalled() {
  const paths = [
    'C:\\Program Files\\Ollama\\ollama.exe',
    path.join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe'),
    path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe')
  ];
  
  for (const p of paths) {
    if (fs.existsSync(p)) {
      console.log(`\n  Found at: ${p}`);
      return true;
    }
  }
  return false;
}

async function checkOllamaRunning() {
  try {
    await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function checkModelAvailable() {
  try {
    const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
    const models = response.data.models || [];
    return models.some(m => m.name.includes('deepseek-r1'));
  } catch {
    return false;
  }
}

function checkScriptsExist() {
  const scripts = [
    'scripts/check-ollama.js',
    'scripts/start-ollama.ps1'
  ];
  
  return scripts.every(s => {
    const exists = fs.existsSync(s);
    console.log(`\n  ${exists ? '✓' : '✗'} ${s}`);
    return exists;
  });
}

function checkPackageJsonScripts() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const hasDevScript = packageJson.scripts.dev && packageJson.scripts.dev.includes('check-ollama');
  const hasCheckScript = !!packageJson.scripts['check-ollama'];
  const hasStartScript = !!packageJson.scripts['start-ollama'];
  
  console.log(`\n  Dev script: ${hasDevScript ? '✓' : '✗'}`);
  console.log(`  Check script: ${hasCheckScript ? '✓' : '✗'}`);
  console.log(`  Start script: ${hasStartScript ? '✓' : '✗'}`);
  
  return hasDevScript && hasCheckScript && hasStartScript;
}

function checkEnvConfig() {
  if (!fs.existsSync('.env')) return false;
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasOllamaUrl = envContent.includes('OLLAMA_BASE_URL');
  const hasOllamaModel = envContent.includes('OLLAMA_MODEL') && envContent.includes('deepseek');
  const hasAIEnabled = envContent.includes('AI_ENABLED');
  
  console.log(`\n  OLLAMA_BASE_URL: ${hasOllamaUrl ? '✓' : '✗'}`);
  console.log(`  OLLAMA_MODEL: ${hasOllamaModel ? '✓' : '✗'}`);
  console.log(`  AI_ENABLED: ${hasAIEnabled ? '✓' : '✗'}`);
  
  return hasOllamaUrl && hasOllamaModel && hasAIEnabled;
}

async function checkDocumentation() {
  return fs.existsSync('OLLAMA_SETUP.md');
}

async function main() {
  console.log('');
  log('=================================================', 'cyan');
  log('🧪 K-Wise Ollama Auto-Start Verification Test', 'cyan');
  log('=================================================', 'cyan');
  
  await test('Ollama Installation Check', checkOllamaInstalled);
  await test('Ollama Process Running', checkOllamaRunning);
  await test('DeepSeek R1 Model Available', checkModelAvailable);
  await test('Auto-Start Scripts Exist', checkScriptsExist);
  await test('Package.json NPM Scripts', checkPackageJsonScripts);
  await test('Environment Configuration', checkEnvConfig);
  await test('Documentation Exists', checkDocumentation);
  
  console.log('');
  log('=================================================', 'cyan');
  log('📊 Test Results', 'cyan');
  log('=================================================', 'cyan');
  console.log('');
  log(`Total Tests:  ${testsPassed + testsFailed}`, 'reset');
  log(`Passed:       ${testsPassed} ✅`, 'green');
  log(`Failed:       ${testsFailed} ❌`, 'red');
  console.log('');
  
  const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2);
  log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');
  console.log('');
  
  if (testsFailed === 0) {
    log('🎉 ALL TESTS PASSED! Ollama auto-start is fully configured!', 'green');
  } else if (testsFailed <= 2) {
    log('✅ Most tests passed. Minor issues detected.', 'yellow');
  } else {
    log('⚠️ Several tests failed. Ollama may not auto-start properly.', 'red');
  }
  
  console.log('');
  log('💡 Next Steps:', 'cyan');
  console.log('  1. If tests failed: Review errors above');
  console.log('  2. If tests passed: Run "npm run dev" to test');
  console.log('  3. For help: See OLLAMA_SETUP.md');
  console.log('');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch(error => {
  log(`❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
