/**
 * Security Secrets Rotation Tool
 * Generates new secure secrets for production deployment
 * 
 * Usage: node security-rotation.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  log(`  ${title}`, 'bright');
  console.log('='.repeat(70) + '\n');
}

/**
 * Generate cryptographically secure secret
 * @param {number} bytes - Number of bytes (default: 64)
 * @returns {string} Hex-encoded secret
 */
function generateSecret(bytes = 64) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate secure JWT secret
 */
function generateJWTSecret() {
  return generateSecret(64); // 64 bytes = 128 hex characters
}

/**
 * Generate secure reset code secret
 */
function generateResetCodeSecret() {
  return generateSecret(48); // 48 bytes = 96 hex characters
}

/**
 * Generate API key
 */
function generateAPIKey() {
  const prefix = 'kwise';
  const secret = generateSecret(32);
  return `${prefix}_${secret}`;
}

/**
 * Main function
 */
function main() {
  console.clear();
  log('\n🔐 K-WISE SECURITY SECRETS ROTATION TOOL', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('⚠️  WARNING: Keep these secrets secure and NEVER commit to version control', 'yellow');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  section('1. GENERATED SECRETS');

  const newSecrets = {
    JWT_SECRET: generateJWTSecret(),
    RESET_CODE_SECRET: generateResetCodeSecret(),
    API_KEY: generateAPIKey(),
    SESSION_SECRET: generateSecret(32),
    ENCRYPTION_KEY: generateSecret(32)
  };

  // Display secrets
  for (const [key, value] of Object.entries(newSecrets)) {
    log(`${key}:`, 'green');
    console.log(`  ${value}\n`);
  }

  section('2. INSTRUCTIONS');

  log('📝 Manual Update Steps:', 'cyan');
  console.log('');
  console.log('1. Open your .env file:');
  log('   nano .env', 'yellow');
  console.log('');
  console.log('2. Replace the following values:');
  console.log('');
  
  for (const [key, value] of Object.entries(newSecrets)) {
    if (key === 'JWT_SECRET' || key === 'RESET_CODE_SECRET') {
      log(`   ${key}=${value}`, 'yellow');
    }
  }
  
  console.log('');
  console.log('3. Save and exit (Ctrl+X, then Y, then Enter)');
  console.log('');
  console.log('4. Restart your backend server:');
  log('   pm2 restart kwise-backend', 'yellow');
  console.log('   OR');
  log('   npm run start', 'yellow');
  console.log('');

  section('3. SECURITY CHECKLIST');

  const checklist = [
    '[ ] Updated JWT_SECRET in .env',
    '[ ] Updated RESET_CODE_SECRET in .env',
    '[ ] Verified .env is in .gitignore',
    '[ ] Tested login after secret rotation',
    '[ ] Tested password reset after secret rotation',
    '[ ] Informed users about session invalidation (JWT rotation)',
    '[ ] Updated production environment variables',
    '[ ] Documented rotation date in security log'
  ];

  checklist.forEach(item => console.log(item));

  section('4. BACKUP RECOMMENDATION');

  log('💾 Store these secrets securely:', 'yellow');
  console.log('');
  console.log('- Use a password manager (1Password, LastPass, BitWarden)');
  console.log('- Store in encrypted vault');
  console.log('- Share with team leads via secure channel');
  console.log('- Never send via email or Slack');
  console.log('');

  // Save to timestamped file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `secrets-${timestamp}.txt`;
  const filepath = path.join(__dirname, filename);

  let fileContent = '# K-WISE SECURITY SECRETS\n';
  fileContent += `# Generated: ${new Date().toISOString()}\n`;
  fileContent += `# ⚠️  KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT\n\n`;
  
  for (const [key, value] of Object.entries(newSecrets)) {
    fileContent += `${key}=${value}\n`;
  }

  fs.writeFileSync(filepath, fileContent);
  log(`✅ Secrets saved to: ${filename}`, 'green');
  log(`⚠️  Remember to delete this file after copying secrets!`, 'yellow');

  console.log('\n');
  log('🔒 Rotation complete! Follow the instructions above to apply changes.', 'green');
  console.log('\n');
}

// Run
main();
