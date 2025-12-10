/**
 * Comprehensive Diagnostic and Fix Script
 * Checks all AI learning components and fixes issues
 */

const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}`)
};

async function checkDatabase() {
  log.section('PHASE 1: DATABASE DIAGNOSTICS');
  
  try {
    // Test connection
    await db.query('SELECT NOW()');
    log.success('Database connection working');
    
    // Check AI learning tables
    const tables = ['compatibility_logs', 'ai_recommendations', 'ai_feedback', 'ai_audit_logs', 'historical_patterns', 'user_personas'];
    log.info(`Checking for ${tables.length} AI learning tables...`);
    
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = ANY($1)
      ORDER BY table_name
    `, [tables]);
    
    const existingTables = result.rows.map(r => r.table_name);
    const missingTables = tables.filter(t => !existingTables.includes(t));
    
    console.log('\nTable Status:');
    existingTables.forEach(t => log.success(`${t} exists`));
    missingTables.forEach(t => log.error(`${t} MISSING`));
    
    if (missingTables.length > 0) {
      log.warn(`${missingTables.length} tables need to be created`);
      return { success: false, missingTables };
    }
    
    // Check table row counts
    log.info('\nChecking table data...');
    for (const table of existingTables) {
      const count = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ${table}: ${count.rows[0].count} rows`);
    }
    
    return { success: true, tables: existingTables };
    
  } catch (error) {
    log.error(`Database check failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkAIServices() {
  log.section('PHASE 2: AI SERVICES DIAGNOSTICS');
  
  try {
    // Check if services load
    log.info('Loading AI services...');
    
    const services = {
      ollamaService: '../ai/services/ollamaService',
      enhancedAIService: '../services/enhancedAIService',
      embeddingService: '../services/embeddingService',
      feedbackProcessor: '../services/feedbackProcessor',
      aiLogger: '../services/aiLogger',
      personaEngine: '../services/personaEngine'
    };
    
    const loadedServices = {};
    for (const [name, path] of Object.entries(services)) {
      try {
        loadedServices[name] = require(path);
        log.success(`${name} loaded`);
      } catch (err) {
        log.error(`${name} failed to load: ${err.message}`);
      }
    }
    
    // Check Ollama connection
    log.info('\nChecking Ollama service...');
    try {
      const axios = require('axios');
      const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
      log.success(`Ollama running with ${response.data.models.length} models`);
      
      // Check for embedding model
      const hasEmbedModel = response.data.models.some(m => m.name.includes('nomic-embed'));
      if (hasEmbedModel) {
        log.success('Embedding model (nomic-embed-text) installed');
      } else {
        log.warn('Embedding model not found - run: ollama pull nomic-embed-text');
      }
    } catch (error) {
      log.error(`Ollama not accessible: ${error.message}`);
    }
    
    return { success: true, services: loadedServices };
    
  } catch (error) {
    log.error(`AI services check failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkForErrors() {
  log.section('PHASE 3: ERROR DETECTION');
  
  try {
    // Check for SQL errors
    log.info('Checking for SQL aggregate error...');
    const sqlFix = path.join(__dirname, '../sql/fix-cleanup-aggregate-error.sql');
    if (fs.existsSync(sqlFix)) {
      log.info('SQL fix file found, applying...');
      const fixSQL = fs.readFileSync(sqlFix, 'utf8');
      await db.query(fixSQL);
      log.success('SQL aggregate error fix applied');
    }
    
    // Check recent logs for errors
    log.info('\nChecking recent error logs...');
    const logDir = path.join(__dirname, '../logs');
    if (fs.existsSync(logDir)) {
      const errorLog = path.join(logDir, 'error.log');
      if (fs.existsSync(errorLog)) {
        const logs = fs.readFileSync(errorLog, 'utf8');
        const recentErrors = logs.split('\n').slice(-20).filter(line => line.includes('error'));
        if (recentErrors.length > 0) {
          log.warn(`Found ${recentErrors.length} recent errors in logs`);
        } else {
          log.success('No recent errors in logs');
        }
      }
    }
    
    return { success: true };
    
  } catch (error) {
    log.error(`Error check failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testAILearning() {
  log.section('PHASE 4: AI LEARNING TEST');
  
  try {
    // Test logging a compatibility check
    log.info('Testing compatibility logging...');
    
    const testLog = {
      build_hash: 'test_' + Date.now(),
      parts_json: JSON.stringify({ cpu: 'test', gpu: 'test' }),
      rules_verdict: JSON.stringify({ compatible: true }),
      ai_verdict: JSON.stringify({ confidence: 85 }),
      user_context: JSON.stringify({ persona: 'test' }),
      session_id: 'test_session',
      user_decision: 'accepted',
      outcome_quality: 'success',
      created_at: new Date()
    };
    
    const insertResult = await db.query(`
      INSERT INTO compatibility_logs (
        build_hash, parts_json, rules_verdict, ai_verdict, 
        user_context, session_id, user_decision, outcome_quality, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      testLog.build_hash,
      testLog.parts_json,
      testLog.rules_verdict,
      testLog.ai_verdict,
      testLog.user_context,
      testLog.session_id,
      testLog.user_decision,
      testLog.outcome_quality,
      testLog.created_at
    ]);
    
    log.success(`Test log inserted with ID: ${insertResult.rows[0].id}`);
    
    // Query it back
    const queryResult = await db.query(
      'SELECT * FROM compatibility_logs WHERE build_hash = $1',
      [testLog.build_hash]
    );
    
    if (queryResult.rows.length > 0) {
      log.success('Test log retrieved successfully');
      
      // Clean up test data
      await db.query('DELETE FROM compatibility_logs WHERE build_hash = $1', [testLog.build_hash]);
      log.info('Test data cleaned up');
      
      return { success: true };
    } else {
      log.error('Failed to retrieve test log');
      return { success: false };
    }
    
  } catch (error) {
    log.error(`AI learning test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function generateReport() {
  log.section('FINAL REPORT');
  
  const report = {
    timestamp: new Date().toISOString(),
    database: null,
    aiServices: null,
    errors: null,
    learning: null,
    overallStatus: 'UNKNOWN'
  };
  
  // Run all checks
  report.database = await checkDatabase();
  report.aiServices = await checkAIServices();
  report.errors = await checkForErrors();
  report.learning = await testAILearning();
  
  // Determine overall status
  const allSuccess = report.database.success && 
                     report.aiServices.success && 
                     report.errors.success && 
                     report.learning.success;
  
  if (allSuccess) {
    report.overallStatus = 'HEALTHY';
    log.success('\n🎉 ALL SYSTEMS OPERATIONAL - AI LEARNING IS ACTIVE');
  } else {
    report.overallStatus = 'NEEDS_ATTENTION';
    log.warn('\n⚠️  SOME ISSUES DETECTED - SEE DETAILS ABOVE');
  }
  
  // Save report
  const reportPath = path.join(__dirname, '../diagnostics-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log.info(`\nFull report saved to: ${reportPath}`);
  
  return report;
}

// Run diagnostics
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   K-WISE AI LEARNING SYSTEM - COMPREHENSIVE DIAGNOSTICS   ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  try {
    const report = await generateReport();
    process.exit(report.overallStatus === 'HEALTHY' ? 0 : 1);
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

