/**
 * COMPREHENSIVE AI SYSTEM ANALYSIS & TESTING SCRIPT
 * Tests all AI services across the K-Wise platform
 * Provides brutal honesty about current state and areas for improvement
 */

const axios = require('axios');
const db = require('../config/db');
const fs = require('node:fs');
const path = require('node:path');

// Import all AI services
const { compatibilityService } = require('../services/compatibilityService');
const enhancedAIService = require('../services/enhancedAIService');
const ollamaService = require('../ai/services/ollamaService');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bright: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  critical: (msg) => console.log(`${colors.red}${colors.bright}🔥 CRITICAL: ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}${'═'.repeat(80)}\n${msg}\n${'═'.repeat(80)}${colors.reset}\n`),
  subsection: (msg) => console.log(`\n${colors.magenta}▶ ${msg}${colors.reset}`),
  result: (label, value, rating) => {
    const ratingColors = {
      'EXCELLENT': colors.green,
      'GOOD': colors.green,
      'DECENT': colors.cyan,
      'AVERAGE': colors.yellow,
      'POOR': colors.red,
      'BAD': colors.red
    };
    const color = ratingColors[rating] || colors.reset;
    console.log(`   ${label}: ${color}${value} [${rating}]${colors.reset}`);
  }
};

const testResults = {
  ollama: {},
  compatibility: {},
  futureUpgrades: {},
  referenceBuilds: {},
  promptQuality: {},
  caching: {},
  overall: {}
};

// ============================================================================
// PHASE 1: OLLAMA SERVICE BASELINE TESTING
// ============================================================================

async function testOllamaBaseline() {
  log.section('PHASE 1: OLLAMA SERVICE BASELINE TESTING');
  
  try {
    // Test 1: Ollama availability
    log.subsection('Test 1.1: Ollama Service Availability');
    const startTime = Date.now();
    
    try {
      const response = await axios.get('http://localhost:11434/api/version', { timeout: 3000 });
      const latency = Date.now() - startTime;
      
      log.success(`Ollama is running (${latency}ms response time)`);
      log.result('Connection Latency', `${latency}ms`, latency < 100 ? 'EXCELLENT' : latency < 500 ? 'GOOD' : 'AVERAGE');
      
      testResults.ollama.available = true;
      testResults.ollama.connectionLatency = latency;
    } catch (error) {
      log.critical('Ollama service is NOT RUNNING!');
      log.error(`Error: ${error.message}`);
      testResults.ollama.available = false;
      return false;
    }

    // Test 2: Model availability
    log.subsection('Test 1.2: AI Models Availability');
    try {
      const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
      const models = response.data.models || [];
      
      const requiredModels = ['deepseek-r1:1.5b', 'deepseek-r1:7b', 'deepseek-r1:8b', 'nomic-embed-text'];
      const availableModels = models.map(m => m.name);
      
      log.info(`Found ${models.length} models installed`);
      
      requiredModels.forEach(modelName => {
        const found = availableModels.some(m => m.includes(modelName.split(':')[0]));
        if (found) {
          log.success(`Model available: ${modelName}`);
        } else {
          log.error(`Model MISSING: ${modelName}`);
        }
      });
      
      const allAvailable = requiredModels.every(m => 
        availableModels.some(a => a.includes(m.split(':')[0]))
      );
      
      testResults.ollama.modelsComplete = allAvailable;
      testResults.ollama.modelsInstalled = models.length;
      log.result('Model Completeness', `${models.length}/4 required`, allAvailable ? 'EXCELLENT' : 'POOR');
      
    } catch (error) {
      log.error(`Failed to check models: ${error.message}`);
      testResults.ollama.modelsComplete = false;
    }

    // Test 3: Simple AI inference test
    log.subsection('Test 1.3: AI Inference Speed & Quality');
    const inferenceTests = [
      {
        model: 'deepseek-r1:1.5b',
        prompt: 'Is a Ryzen 7 7800X3D compatible with a B550 motherboard? Answer in one sentence.',
        expectedKeywords: ['compatible', 'yes', 'works', 'support']
      },
      {
        model: 'deepseek-r1:7b',
        prompt: 'What is the minimum PSU wattage for an RTX 4070 Ti? Answer with just the number.',
        expectedKeywords: ['750', '700', '650', 'watt']
      }
    ];

    for (const test of inferenceTests) {
      try {
        const startTime = Date.now();
        const response = await axios.post('http://localhost:11434/api/generate', {
          model: test.model,
          prompt: test.prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 100 }
        }, { timeout: 30000 });
        
        const duration = Date.now() - startTime;
        const aiResponse = response.data.response || '';
        
        const hasExpectedContent = test.expectedKeywords.some(kw => 
          aiResponse.toLowerCase().includes(kw.toLowerCase())
        );
        
        log.info(`Model: ${test.model}`);
        log.info(`   Response Time: ${duration}ms`);
        log.info(`   Response: ${aiResponse.substring(0, 100)}...`);
        log.info(`   Quality: ${hasExpectedContent ? '✅ Relevant' : '❌ Poor'}`);
        
        const rating = duration < 3000 && hasExpectedContent ? 'EXCELLENT' 
                     : duration < 8000 && hasExpectedContent ? 'GOOD'
                     : duration < 15000 ? 'AVERAGE' 
                     : 'POOR';
        
        log.result(`${test.model} Performance`, `${duration}ms`, rating);
        
        if (!testResults.ollama.inferenceTests) {
          testResults.ollama.inferenceTests = [];
        }
        testResults.ollama.inferenceTests.push({
          model: test.model,
          duration,
          quality: hasExpectedContent ? 'relevant' : 'poor',
          rating
        });
        
      } catch (error) {
        log.error(`Inference test failed for ${test.model}: ${error.message}`);
      }
    }

    return true;

  } catch (error) {
    log.error(`Ollama baseline testing failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// PHASE 2: COMPATIBILITY SERVICE TESTING
// ============================================================================

async function testCompatibilityService() {
  log.section('PHASE 2: COMPATIBILITY SERVICE TESTING');
  
  try {
    // Get sample products from database
    log.subsection('Test 2.1: Loading Test Data');
    
    const cpu = await db.query(`
      SELECT * FROM pc_parts 
      WHERE category = 'CPU' AND stock > 0 
      ORDER BY RANDOM() LIMIT 1
    `);
    
    const gpu = await db.query(`
      SELECT * FROM pc_parts 
      WHERE category = 'GPU' AND stock > 0 
      ORDER BY RANDOM() LIMIT 1
    `);
    
    const motherboard = await db.query(`
      SELECT * FROM pc_parts 
      WHERE category = 'Motherboard' AND stock > 0 
      ORDER BY RANDOM() LIMIT 1
    `);
    
    const ram = await db.query(`
      SELECT * FROM pc_parts 
      WHERE category = 'RAM' AND stock > 0 
      ORDER BY RANDOM() LIMIT 1
    `);

    if (cpu.rows.length === 0 || gpu.rows.length === 0) {
      log.warn('Insufficient test data in database');
      return false;
    }

    log.success(`Loaded test products: ${cpu.rows[0].name}, ${gpu.rows[0].name}`);

    // Test 2.2: PC Parts Compatibility Filter
    log.subsection('Test 2.2: PC Parts Compatibility Filter');
    const pcPartsStart = Date.now();
    
    try {
      const currentProduct = cpu.rows[0];
      const candidateProducts = motherboard.rows.length > 0 
        ? [motherboard.rows[0]] 
        : await db.query(`SELECT * FROM pc_parts WHERE category = 'Motherboard' AND stock > 0 LIMIT 5`).then(r => r.rows);
      
      if (candidateProducts.length === 0) {
        log.warn('No candidate products for compatibility test');
      } else {
        const result = await compatibilityService.analyzeCompatibility(
          currentProduct,
          candidateProducts
        );
        
        const pcPartsDuration = Date.now() - pcPartsStart;
        
        log.info(`Compatibility analysis completed in ${pcPartsDuration}ms`);
        log.info(`   Compatible products: ${result.length}`);
        log.info(`   AI was ${result[0]?.ai_score ? 'USED' : 'NOT USED'}`);
        
        const rating = pcPartsDuration < 5000 && result.length > 0 ? 'GOOD'
                     : pcPartsDuration < 10000 && result.length > 0 ? 'AVERAGE'
                     : 'POOR';
        
        log.result('PC Parts Filter', `${pcPartsDuration}ms, ${result.length} results`, rating);
        
        testResults.compatibility.pcParts = {
          duration: pcPartsDuration,
          resultsCount: result.length,
          aiUsed: result[0]?.ai_score ? true : false,
          rating
        };
      }
    } catch (error) {
      log.error(`PC Parts compatibility test failed: ${error.message}`);
      testResults.compatibility.pcParts = { error: error.message, rating: 'BAD' };
    }

    // Test 2.3: PC Customized Compatibility (Manual)
    log.subsection('Test 2.3: PC Customized (Manual) Compatibility');
    const customizedManualStart = Date.now();
    
    try {
      // Simulate a full build configuration
      const buildParts = {
        cpu: cpu.rows[0],
        gpu: gpu.rows[0],
        motherboard: motherboard.rows.length > 0 ? motherboard.rows[0] : null,
        ram: ram.rows.length > 0 ? ram.rows[0] : null
      };
      
      if (buildParts.motherboard && buildParts.cpu) {
        const compatResult = await compatibilityService.analyzeCompatibility(
          buildParts.cpu,
          [buildParts.motherboard]
        );
        
        const duration = Date.now() - customizedManualStart;
        
        log.info(`Full build compatibility check: ${duration}ms`);
        log.info(`   Compatibility score: ${compatResult[0]?.compatibility_score || 'N/A'}`);
        log.info(`   Issues found: ${compatResult[0]?.deterministic_issues?.length || 0}`);
        
        const score = compatResult[0]?.compatibility_score || 0;
        const rating = duration < 8000 && score > 70 ? 'GOOD'
                     : duration < 15000 && score > 50 ? 'AVERAGE'
                     : 'POOR';
        
        log.result('PC Customized Manual', `${duration}ms, score: ${score}`, rating);
        
        testResults.compatibility.customizedManual = {
          duration,
          compatibilityScore: score,
          issuesCount: compatResult[0]?.deterministic_issues?.length || 0,
          rating
        };
      }
    } catch (error) {
      log.error(`PC Customized Manual test failed: ${error.message}`);
      testResults.compatibility.customizedManual = { error: error.message, rating: 'BAD' };
    }

    // Test 2.4: Prompt Quality Analysis
    log.subsection('Test 2.4: AI Prompt Quality Analysis');
    
    try {
      // Analyze the prompt that would be generated
      const samplePrompt = compatibilityService.createCompatibilityPrompt(
        cpu.rows[0],
        motherboard.rows.length > 0 ? [motherboard.rows[0]] : [],
        { compatible: true, score: 85 }
      );
      
      const promptLength = samplePrompt.length;
      const hasContext = samplePrompt.includes('deterministic') || samplePrompt.includes('DETERMINISTIC');
      const hasStructure = samplePrompt.includes('JSON') || samplePrompt.includes('json');
      const hasExamples = samplePrompt.includes('example') || samplePrompt.includes('Example');
      
      log.info(`Prompt Analysis:`);
      log.info(`   Length: ${promptLength} characters`);
      log.info(`   Has deterministic context: ${hasContext ? '✅' : '❌'}`);
      log.info(`   Has structured output: ${hasStructure ? '✅' : '❌'}`);
      log.info(`   Has examples: ${hasExamples ? '✅' : '❌'}`);
      
      const qualityScore = (hasContext ? 1 : 0) + (hasStructure ? 1 : 0) + (hasExamples ? 1 : 0);
      const rating = qualityScore === 3 ? 'EXCELLENT'
                   : qualityScore === 2 ? 'GOOD'
                   : qualityScore === 1 ? 'AVERAGE'
                   : 'POOR';
      
      log.result('Prompt Quality', `${qualityScore}/3 criteria met`, rating);
      
      testResults.promptQuality.compatibility = {
        length: promptLength,
        hasContext,
        hasStructure,
        hasExamples,
        score: qualityScore,
        rating
      };
      
    } catch (error) {
      log.error(`Prompt quality analysis failed: ${error.message}`);
    }

    return true;

  } catch (error) {
    log.error(`Compatibility service testing failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// PHASE 3: FUTURE UPGRADES TESTING
// ============================================================================

async function testFutureUpgrades() {
  log.section('PHASE 3: FUTURE UPGRADES TESTING');
  
  try {
    // Test 3.1: In-Stock Future Upgrades
    log.subsection('Test 3.1: In-Stock Future Upgrades');
    
    // Check if future upgrade service exists
    const upgradeServicePath = path.join(__dirname, '../services/upgradeService.js');
    if (!fs.existsSync(upgradeServicePath)) {
      log.warn('upgradeService.js not found - Future Upgrades may not be implemented');
      testResults.futureUpgrades.inStock = { exists: false, rating: 'BAD' };
    } else {
      log.success('upgradeService.js found');
      
      try {
        const upgradeService = require('../services/upgradeService');
        
        // Test with sample build
        const sampleBuild = {
          cpu: 'AMD Ryzen 5 5600X',
          gpu: 'RTX 3060',
          ram: '16GB DDR4-3200',
          budget: 500
        };
        
        const startTime = Date.now();
        // This will depend on the actual implementation
        log.info('Future upgrades service exists but needs testing implementation');
        
        testResults.futureUpgrades.inStock = { exists: true, rating: 'DECENT' };
        
      } catch (error) {
        log.error(`Error loading upgrade service: ${error.message}`);
        testResults.futureUpgrades.inStock = { exists: true, loadError: true, rating: 'POOR' };
      }
    }

    // Test 3.2: External Component Suggestions
    log.subsection('Test 3.2: External Component Suggestions');
    
    // Check if AI can suggest external components
    try {
      const externalPrompt = `Given a PC with RTX 3060 and Ryzen 5 5600X, suggest ONE external component upgrade from the market (not in our database) that would improve gaming performance. Format: Component: [name], Reason: [one sentence], Estimated Price: $[amount]`;
      
      const startTime = Date.now();
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'deepseek-r1:7b',
        prompt: externalPrompt,
        stream: false,
        options: { temperature: 0.5, num_predict: 150 }
      }, { timeout: 30000 });
      
      const duration = Date.now() - startTime;
      const aiResponse = response.data.response || '';
      
      const hasComponent = aiResponse.toLowerCase().includes('component') || 
                          aiResponse.toLowerCase().includes('upgrade');
      const hasPrice = aiResponse.includes('$') || aiResponse.includes('price');
      const hasReason = aiResponse.toLowerCase().includes('reason') || 
                       aiResponse.toLowerCase().includes('because');
      
      log.info(`External suggestion test: ${duration}ms`);
      log.info(`   Response: ${aiResponse.substring(0, 150)}...`);
      log.info(`   Has component: ${hasComponent ? '✅' : '❌'}`);
      log.info(`   Has price: ${hasPrice ? '✅' : '❌'}`);
      log.info(`   Has reasoning: ${hasReason ? '✅' : '❌'}`);
      
      const qualityScore = (hasComponent ? 1 : 0) + (hasPrice ? 1 : 0) + (hasReason ? 1 : 0);
      const rating = duration < 10000 && qualityScore >= 2 ? 'GOOD'
                   : duration < 20000 && qualityScore >= 1 ? 'AVERAGE'
                   : 'POOR';
      
      log.result('External Suggestions', `${duration}ms, quality: ${qualityScore}/3`, rating);
      
      testResults.futureUpgrades.external = {
        duration,
        qualityScore,
        hasComponent,
        hasPrice,
        hasReason,
        rating
      };
      
    } catch (error) {
      log.error(`External suggestion test failed: ${error.message}`);
      testResults.futureUpgrades.external = { error: error.message, rating: 'BAD' };
    }

    return true;

  } catch (error) {
    log.error(`Future upgrades testing failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// PHASE 4: REFERENCE BUILDS & PC CUSTOMIZED WITH AI
// ============================================================================

async function testReferenceBuildsAndAI() {
  log.section('PHASE 4: REFERENCE BUILDS & PC CUSTOMIZED WITH AI');
  
  try {
    // Test 4.1: Reference Builds for PC Upgrade
    log.subsection('Test 4.1: PC Upgrade Reference Builds');
    
    const buildsResult = await db.query(`
      SELECT COUNT(*) as count FROM pc_upgrade_reference_builds
    `);
    
    const refBuildsCount = Number.parseInt(buildsResult.rows[0].count, 10);
    log.info(`Reference builds in database: ${refBuildsCount}`);
    
    const rating = refBuildsCount >= 50 ? 'EXCELLENT'
                 : refBuildsCount >= 20 ? 'GOOD'
                 : refBuildsCount >= 10 ? 'AVERAGE'
                 : 'POOR';
    
    log.result('PC Upgrade Ref Builds', `${refBuildsCount} builds`, rating);
    
    testResults.referenceBuilds.pcUpgrade = {
      count: refBuildsCount,
      rating
    };

    // Test 4.2: PC Customized AI Reference Builds
    log.subsection('Test 4.2: PC Customized AI Reference Builds');
    
    const aiBuildsResult = await db.query(`
      SELECT COUNT(*) as count FROM pc_customized_ai_reference_builds
    `);
    
    const aiBuildsCount = Number.parseInt(aiBuildsResult.rows[0].count, 10);
    log.info(`PC Customized AI builds in database: ${aiBuildsCount}`);
    
    // Check expected builds
    const paramsResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM pc_customized_usage_types WHERE is_active = true) as usage_types,
        (SELECT COUNT(*) FROM pc_customized_budget_ranges WHERE is_active = true) as budget_ranges,
        (SELECT COUNT(*) FROM pc_customized_performance_preferences WHERE is_active = true) as perf_prefs
    `);
    
    const params = paramsResult.rows[0];
    const expectedBuilds = Number.parseInt(params.usage_types, 10) * Number.parseInt(params.budget_ranges, 10) * Number.parseInt(params.perf_prefs, 10);
    const coverage = (aiBuildsCount / expectedBuilds * 100).toFixed(1);
    
    log.info(`Expected builds: ${expectedBuilds}`);
    log.info(`Coverage: ${coverage}%`);
    
    const aiRating = coverage >= 90 ? 'EXCELLENT'
                   : coverage >= 70 ? 'GOOD'
                   : coverage >= 50 ? 'AVERAGE'
                   : 'POOR';
    
    log.result('PC Customized AI Builds', `${aiBuildsCount}/${expectedBuilds} (${coverage}%)`, aiRating);
    
    testResults.referenceBuilds.pcCustomizedAI = {
      count: aiBuildsCount,
      expected: expectedBuilds,
      coverage: Number.parseFloat(coverage),
      rating: aiRating
    };

    // Test 4.3: AI Build Quality
    log.subsection('Test 4.3: AI-Generated Build Quality');
    
    if (aiBuildsCount > 0) {
      const sampleBuild = await db.query(`
        SELECT * FROM pc_customized_ai_reference_builds 
        ORDER BY RANDOM() LIMIT 1
      `);
      
      const build = sampleBuild.rows[0];
      const components = build.components;
      
      const hasAllComponents = components && 
        components.cpu && components.gpu && components.motherboard && 
        components.ram && components.storage && components.psu && components.case;
      
      const totalPrice = Number.parseFloat(build.total_price);
      const isWithinBudget = totalPrice > 0 && totalPrice <= 150000; // Reasonable max
      
      log.info(`Sample build analysis:`);
      log.info(`   Build ID: ${build.id}`);
      log.info(`   Total Price: ₱${totalPrice}`);
      log.info(`   Complete components: ${hasAllComponents ? '✅' : '❌'}`);
      log.info(`   Within budget: ${isWithinBudget ? '✅' : '❌'}`);
      
      const buildQualityRating = hasAllComponents && isWithinBudget ? 'GOOD' : 'AVERAGE';
      
      log.result('Build Quality', hasAllComponents && isWithinBudget ? 'Valid' : 'Issues found', buildQualityRating);
      
      testResults.referenceBuilds.buildQuality = {
        hasAllComponents,
        isWithinBudget,
        rating: buildQualityRating
      };
    }

    return true;

  } catch (error) {
    log.error(`Reference builds testing failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// PHASE 5: CACHING & PERFORMANCE
// ============================================================================

async function testCachingPerformance() {
  log.section('PHASE 5: CACHING & PERFORMANCE ANALYSIS');
  
  try {
    // Test 5.1: Cache System Existence
    log.subsection('Test 5.1: Cache System Analysis');
    
    const intelligentCachePath = path.join(__dirname, '../services/intelligentCache.js');
    const cacheExists = fs.existsSync(intelligentCachePath);
    
    if (cacheExists) {
      log.success('Intelligent cache system found');
      
      try {
        const cache = require('../services/intelligentCache');
        const stats = cache.getStats ? cache.getStats() : null;
        
        if (stats) {
          log.info(`Cache Statistics:`);
          log.info(`   Hit Rate: ${stats.hitRate}`);
          log.info(`   Total Entries: ${stats.totalEntries}`);
          log.info(`   Hits: ${stats.hits}`);
          log.info(`   Misses: ${stats.misses}`);
          
          const hitRate = Number.parseFloat(stats.hitRate);
          const rating = hitRate >= 60 ? 'EXCELLENT'
                       : hitRate >= 40 ? 'GOOD'
                       : hitRate >= 20 ? 'AVERAGE'
                       : hitRate > 0 ? 'POOR'
                       : 'NOT TESTED';
          
          log.result('Cache Performance', stats.hitRate, rating);
          
          testResults.caching.intelligent = {
            exists: true,
            stats,
            rating
          };
        } else {
          log.warn('Cache exists but getStats() method not available');
          testResults.caching.intelligent = { exists: true, hasStats: false, rating: 'AVERAGE' };
        }
      } catch (error) {
        log.error(`Error loading cache: ${error.message}`);
        testResults.caching.intelligent = { exists: true, loadError: true, rating: 'POOR' };
      }
    } else {
      log.warn('Intelligent cache system NOT found - using basic caching');
      testResults.caching.intelligent = { exists: false, rating: 'POOR' };
    }

    // Test 5.2: Circuit Breaker
    log.subsection('Test 5.2: AI Circuit Breaker');
    
    const circuitBreakerPath = path.join(__dirname, '../services/aiCircuitBreaker.js');
    const cbExists = fs.existsSync(circuitBreakerPath);
    
    if (cbExists) {
      log.success('AI Circuit Breaker found');
      
      try {
        const circuitBreaker = require('../services/aiCircuitBreaker');
        const status = circuitBreaker.getStatus ? circuitBreaker.getStatus() : null;
        
        if (status) {
          log.info(`Circuit Breaker Status:`);
          log.info(`   State: ${status.state}`);
          log.info(`   Failure Count: ${status.failureCount}`);
          log.info(`   Success Count: ${status.successCount}`);
          
          const rating = status.state === 'CLOSED' ? 'EXCELLENT' : 'POOR';
          
          log.result('Circuit Breaker', status.state, rating);
          
          testResults.caching.circuitBreaker = {
            exists: true,
            status,
            rating
          };
        } else {
          log.warn('Circuit breaker exists but getStatus() not available');
          testResults.caching.circuitBreaker = { exists: true, hasStatus: false, rating: 'AVERAGE' };
        }
      } catch (error) {
        log.error(`Error loading circuit breaker: ${error.message}`);
        testResults.caching.circuitBreaker = { exists: true, loadError: true, rating: 'POOR' };
      }
    } else {
      log.warn('AI Circuit Breaker NOT found');
      testResults.caching.circuitBreaker = { exists: false, rating: 'POOR' };
    }

    return true;

  } catch (error) {
    log.error(`Caching performance testing failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// PHASE 6: GENERATE COMPREHENSIVE REPORT
// ============================================================================

function generateFinalReport() {
  log.section('PHASE 6: COMPREHENSIVE ANALYSIS REPORT');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {},
    detailed_results: testResults,
    recommendations: [],
    critical_issues: [],
    ratings: {}
  };

  // Calculate overall ratings
  const allRatings = [];
  
  Object.values(testResults).forEach(category => {
    if (typeof category === 'object') {
      Object.values(category).forEach(test => {
        if (test && test.rating) {
          allRatings.push(test.rating);
        }
      });
    }
  });

  const ratingScores = {
    'EXCELLENT': 5,
    'GOOD': 4,
    'DECENT': 3,
    'AVERAGE': 2,
    'POOR': 1,
    'BAD': 0
  };

  const avgScore = allRatings.length > 0
    ? allRatings.reduce((sum, r) => sum + (ratingScores[r] || 0), 0) / allRatings.length
    : 0;

  const overallRating = avgScore >= 4.5 ? 'EXCELLENT'
                      : avgScore >= 3.5 ? 'GOOD'
                      : avgScore >= 2.5 ? 'DECENT'
                      : avgScore >= 1.5 ? 'AVERAGE'
                      : avgScore >= 0.5 ? 'POOR'
                      : 'BAD';

  report.summary.overall_rating = overallRating;
  report.summary.average_score = avgScore.toFixed(2);
  report.summary.tests_conducted = allRatings.length;

  // Generate recommendations
  log.subsection('BRUTAL ANALYSIS & RECOMMENDATIONS');

  if (!testResults.ollama.available) {
    report.critical_issues.push('CRITICAL: Ollama service is not running');
    log.critical('Ollama service must be running for AI features to work');
    report.recommendations.push({
      priority: 'CRITICAL',
      issue: 'Ollama Not Running',
      recommendation: 'Start Ollama service: ollama serve'
    });
  }

  if (testResults.ollama.inferenceTests) {
    const slowTests = testResults.ollama.inferenceTests.filter(t => t.duration > 10000);
    if (slowTests.length > 0) {
      log.warn(`AI inference is SLOW: ${slowTests.length} tests took >10 seconds`);
      report.recommendations.push({
        priority: 'HIGH',
        issue: 'Slow AI Inference',
        recommendation: 'Consider using smaller model (1.5B instead of 7B) or upgrading hardware'
      });
    }
  }

  if (testResults.compatibility.pcParts && testResults.compatibility.pcParts.duration > 10000) {
    log.warn('PC Parts compatibility filter is SLOW');
    report.recommendations.push({
      priority: 'HIGH',
      issue: 'Slow Compatibility Checks',
      recommendation: 'Implement aggressive caching and precomputation for popular combinations'
    });
  }

  if (testResults.promptQuality.compatibility && testResults.promptQuality.compatibility.score < 2) {
    log.warn('Prompt quality is POOR - missing key elements');
    report.recommendations.push({
      priority: 'HIGH',
      issue: 'Poor Prompt Quality',
      recommendation: 'Enhance prompts with deterministic context, structured output, and examples'
    });
  }

  if (testResults.referenceBuilds.pcCustomizedAI && testResults.referenceBuilds.pcCustomizedAI.coverage < 70) {
    log.warn(`PC Customized AI build coverage is LOW (${testResults.referenceBuilds.pcCustomizedAI.coverage}%)`);
    report.recommendations.push({
      priority: 'MEDIUM',
      issue: 'Incomplete AI Reference Builds',
      recommendation: 'Run build generation script to populate all parameter combinations'
    });
  }

  if (!testResults.caching.intelligent || !testResults.caching.intelligent.exists) {
    log.warn('Intelligent caching system NOT implemented');
    report.recommendations.push({
      priority: 'HIGH',
      issue: 'Basic Caching Only',
      recommendation: 'Implement 3-tier intelligent caching (hot/warm/cold) to reduce AI calls by 60%+'
    });
  }

  if (!testResults.caching.circuitBreaker || !testResults.caching.circuitBreaker.exists) {
    log.warn('Circuit breaker NOT implemented');
    report.recommendations.push({
      priority: 'HIGH',
      issue: 'No Circuit Breaker',
      recommendation: 'Implement circuit breaker pattern for graceful AI service degradation'
    });
  }

  if (!testResults.futureUpgrades.external || testResults.futureUpgrades.external.rating === 'POOR') {
    log.warn('External component suggestions are POOR quality');
    report.recommendations.push({
      priority: 'MEDIUM',
      issue: 'Poor External Suggestions',
      recommendation: 'Enhance prompts with market data and structured output format'
    });
  }

  // Display final rating
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}OVERALL AI SYSTEM RATING: ${colors.reset}`, end='');
  
  const ratingColor = overallRating === 'EXCELLENT' ? colors.green
                    : overallRating === 'GOOD' ? colors.cyan
                    : overallRating === 'DECENT' ? colors.yellow
                    : overallRating === 'AVERAGE' ? colors.yellow
                    : colors.red;
  
  console.log(`${ratingColor}${colors.bright}${overallRating}${colors.reset}`);
  console.log(`Average Score: ${avgScore.toFixed(2)}/5.0`);
  console.log('='.repeat(80) + '\n');

  // Save report
  const reportPath = path.join(__dirname, '../../AI_SYSTEM_ANALYSIS_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log.success(`Report saved: AI_SYSTEM_ANALYSIS_REPORT.json`);

  return report;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log(`\n${colors.magenta}${colors.bright}╔════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║                                                                        ║`);
  console.log(`║     COMPREHENSIVE AI SYSTEM ANALYSIS & BRUTAL TESTING                 ║`);
  console.log(`║     K-Wise Ollama DeepSeek R1 Integration                             ║`);
  console.log(`║                                                                        ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const startTime = Date.now();

  // Run all test phases
  await testOllamaBaseline();
  await testCompatibilityService();
  await testFutureUpgrades();
  await testReferenceBuildsAndAI();
  await testCachingPerformance();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  const report = generateFinalReport();

  console.log(`\n${colors.cyan}⏱️  Total analysis time: ${duration} seconds${colors.reset}\n`);

  console.log(`${colors.yellow}📋 NEXT STEPS:${colors.reset}`);
  console.log(`   1. Review AI_SYSTEM_ANALYSIS_REPORT.json for detailed findings`);
  console.log(`   2. Address CRITICAL issues immediately`);
  console.log(`   3. Implement HIGH priority recommendations`);
  console.log(`   4. Run implementation script for improvements\n`);

  process.exit(0);
}

main().catch(error => {
  console.error(`\n${colors.red}💥 FATAL ERROR:${colors.reset}`, error.message);
  console.error(error.stack);
  process.exit(1);
});

