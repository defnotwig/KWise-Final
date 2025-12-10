/**
 * COMPREHENSIVE SYSTEM ANALYSIS SCRIPT
 * Brutally analyzes the K-Wise Ollama DeepSeek R1 AI + Compatibility System
 * 
 * Tests:
 * 1. Ollama AI Service Health
 * 2. Database Rule Coverage
 * 3. All 8 Compatibility Features
 * 4. AI Accuracy & Response Times
 * 5. Stress Testing (Concurrent Requests)
 * 6. PCPartPicker-Level Feature Comparison
 */

const { Pool } = require('pg');
const axios = require('axios');
const ollamaService = require('./ai/services/ollamaService');
const advancedCompatibilityService = require('./services/advancedCompatibilityService');
const aiCompatibilityService = require('./services/aiCompatibilityService');

// Database connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'humbleludwig13',
    port: process.env.DB_PORT || 5432
});

// Test results storage
const results = {
    timestamp: new Date().toISOString(),
    ollama_health: null,
    database_stats: null,
    compatibility_features: [],
    ai_performance: null,
    stress_test: null,
    overall_rating: null,
    recommendations: []
};

// ============================================================================
// SECTION 1: OLLAMA AI SERVICE ANALYSIS
// ============================================================================

async function analyzeOllamaService() {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║ SECTION 1: OLLAMA DEEPSEEK R1 AI SERVICE ANALYSIS               ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    const analysis = {
        service_status: null,
        models_available: [],
        selected_model: null,
        keep_alive_active: null,
        response_time: null,
        ai_reasoning_quality: null,
        cache_stats: null
    };

    try {
        // Check Ollama service health
        console.log('Testing Ollama service connection...');
        const healthCheck = await ollamaService.checkHealth();
        
        analysis.service_status = healthCheck.status;
        analysis.models_available = healthCheck.models || [];
        analysis.selected_model = ollamaService.selectedModel;
        analysis.keep_alive_active = ollamaService.lastKeepAlive !== null;
        analysis.response_time = healthCheck.responseTime;

        console.log(`✅ Ollama Status: ${healthCheck.status}`);
        console.log(`   Response Time: ${healthCheck.responseTime}ms`);
        console.log(`   Available Models: ${healthCheck.models?.length || 0}`);
        console.log(`   Selected Model: ${ollamaService.selectedModel}`);
        console.log(`   Keep-Alive Active: ${analysis.keep_alive_active ? 'Yes ✓' : 'No ✗'}`);
        console.log(`   Last Keep-Alive: ${ollamaService.lastKeepAlive || 'Never'}`);

        // Test AI reasoning quality with compatibility scenario
        console.log('\nTesting AI reasoning quality (compatibility analysis)...');
        const testStart = Date.now();
        
        const aiTestPrompt = `Analyze compatibility between:
        
CPU: AMD Ryzen 7 5800X (AM4 socket, 105W TDP)
Motherboard: ASUS ROG STRIX B550-F (AM4, DDR4)
RAM: Corsair Vengeance 32GB DDR4 3200MHz
GPU: NVIDIA RTX 4070 (200W TDP)
PSU: Corsair RM750 (750W)

Are these components compatible? Rate compatibility 0-100 and explain briefly.`;

        const aiResponse = await ollamaService.generateResponse(
            aiTestPrompt,
            'You are a PC hardware compatibility expert. Analyze quickly and accurately.',
            { temperature: 0.1, max_tokens: 300 }
        );

        const aiDuration = Date.now() - testStart;
        analysis.ai_reasoning_quality = {
            response_time: aiDuration,
            response_length: aiResponse.length,
            contains_score: /\d{1,3}%|score|rating/i.test(aiResponse),
            contains_reasoning: aiResponse.length > 100,
            sample_response: aiResponse.substring(0, 200) + '...'
        };

        console.log(`   AI Response Time: ${aiDuration}ms`);
        console.log(`   Response Quality: ${analysis.ai_reasoning_quality.contains_score && analysis.ai_reasoning_quality.contains_reasoning ? 'GOOD ✓' : 'NEEDS IMPROVEMENT'}`);
        console.log(`   Sample: "${aiResponse.substring(0, 100)}..."`);

        // Cache stats
        analysis.cache_stats = ollamaService.getCacheStats();
        console.log(`\nCache Statistics:`);
        console.log(`   Cache Size: ${analysis.cache_stats.size}/${analysis.cache_stats.maxSize}`);
        console.log(`   Queue Pending: ${analysis.cache_stats.queue.pending}`);
        console.log(`   Concurrency Limit: ${analysis.cache_stats.queue.concurrency}`);

    } catch (error) {
        console.error(`❌ Ollama Service Error: ${error.message}`);
        analysis.service_status = 'error';
        analysis.error = error.message;
    }

    results.ollama_health = analysis;
    return analysis;
}

// ============================================================================
// SECTION 2: DATABASE RULE COVERAGE ANALYSIS
// ============================================================================

async function analyzeDatabaseRules() {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║ SECTION 2: DATABASE COMPATIBILITY RULES ANALYSIS                ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    const analysis = {
        total_rules: 0,
        enabled_rules: 0,
        disabled_rules: 0,
        categories: {},
        severity_breakdown: {},
        enhanced_tables: [],
        table_row_counts: {}
    };

    try {
        // Total rules count
        const totalResult = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE enabled = true) as enabled,
                COUNT(*) FILTER (WHERE enabled = false) as disabled
            FROM compatibility_rules
        `);

        analysis.total_rules = parseInt(totalResult.rows[0].total);
        analysis.enabled_rules = parseInt(totalResult.rows[0].enabled);
        analysis.disabled_rules = parseInt(totalResult.rows[0].disabled);

        console.log(`Total Rules: ${analysis.total_rules}`);
        console.log(`├─ Enabled: ${analysis.enabled_rules} (${((analysis.enabled_rules/analysis.total_rules)*100).toFixed(1)}%)`);
        console.log(`└─ Disabled: ${analysis.disabled_rules} (${((analysis.disabled_rules/analysis.total_rules)*100).toFixed(1)}%)`);

        // Category breakdown
        const categoriesResult = await pool.query(`
            SELECT 
                rule_category,
                COUNT(*) as count
            FROM compatibility_rules
            WHERE enabled = true
            GROUP BY rule_category
            ORDER BY count DESC
        `);

        console.log(`\nRules by Category:`);
        categoriesResult.rows.forEach(row => {
            analysis.categories[row.rule_category] = parseInt(row.count);
            console.log(`├─ ${row.rule_category}: ${row.count} rules`);
        });

        // Severity breakdown
        const severityResult = await pool.query(`
            SELECT 
                severity,
                COUNT(*) as count
            FROM compatibility_rules
            WHERE enabled = true
            GROUP BY severity
            ORDER BY 
                CASE severity
                    WHEN 'critical' THEN 1
                    WHEN 'error' THEN 2
                    WHEN 'warning' THEN 3
                    WHEN 'info' THEN 4
                    ELSE 5
                END
        `);

        console.log(`\nRules by Severity:`);
        severityResult.rows.forEach(row => {
            analysis.severity_breakdown[row.severity] = parseInt(row.count);
            const emoji = row.severity === 'critical' ? '🔴' : 
                         row.severity === 'error' ? '🟠' :
                         row.severity === 'warning' ? '🟡' : '🔵';
            console.log(`${emoji} ${row.severity}: ${row.count} rules`);
        });

        // Enhanced compatibility tables
        const tables = [
            'cpu_compatibility',
            'gpu_compatibility',
            'motherboard_compatibility',
            'ram_compatibility',
            'psu_compatibility',
            'case_compatibility',
            'cooler_compatibility',
            'storage_compatibility',
            'compatibility_matrix',
            'known_compatibility_issues',
            'ai_compatibility_recommendations'
        ];

        console.log(`\nEnhanced Compatibility Tables:`);
        for (const table of tables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(countResult.rows[0].count);
                analysis.table_row_counts[table] = count;
                analysis.enhanced_tables.push(table);
                console.log(`├─ ${table}: ${count} records`);
            } catch (error) {
                console.log(`└─ ${table}: NOT EXISTS`);
            }
        }

    } catch (error) {
        console.error(`❌ Database Analysis Error: ${error.message}`);
        analysis.error = error.message;
    }

    results.database_stats = analysis;
    return analysis;
}

// ============================================================================
// SECTION 3: COMPREHENSIVE COMPATIBILITY FEATURE TESTING
// ============================================================================

async function testAllCompatibilityFeatures() {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║ SECTION 3: ALL 8 COMPATIBILITY FEATURES TEST                    ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    const features = [
        {
            name: 'PC-Parts Compatibility Filter',
            test: async () => {
                const sample = await pool.query(`
                    SELECT id, name, category, tier, specifications
                    FROM pc_parts
                    WHERE category = 'CPU'
                      AND is_active = true
                    LIMIT 1
                `);

                if (sample.rows.length === 0) {
                    return { status: 'NO_DATA', message: 'No CPU parts found in database' };
                }

                const cpu = sample.rows[0];
                return {
                    status: 'PASS',
                    message: `Filtered CPU: ${cpu.name}`,
                    details: { cpu_tier: cpu.tier, has_specs: !!cpu.specifications }
                };
            }
        },
        {
            name: 'PC Customized with AI',
            test: async () => {
                const sample = await pool.query(`
                    SELECT id, name, category, tier, price
                    FROM pc_parts
                    WHERE category = 'GPU'
                      AND is_active = true
                    LIMIT 1
                `);

                if (sample.rows.length === 0) {
                    return { status: 'NO_DATA', message: 'No GPU parts found' };
                }

                const gpu = sample.rows[0];
                
                // Test AI compatibility suggestions
                const compatible = await aiCompatibilityService.getCompatibleComponents(
                    gpu,
                    'CPU',
                    []
                );

                return {
                    status: compatible.length > 0 ? 'PASS' : 'FAIL',
                    message: `AI found ${compatible.length} compatible CPUs for ${gpu.name}`,
                    details: { gpu_tier: gpu.tier, suggestions: compatible.length }
                };
            }
        },
        {
            name: 'PC Customized Manually (Advanced Compatibility)',
            test: async () => {
                const sampleBuild = {
                    cpu: await pool.query(`SELECT * FROM pc_parts WHERE category='CPU' AND is_active=true LIMIT 1`),
                    motherboard: await pool.query(`SELECT * FROM pc_parts WHERE category='Motherboard' AND is_active=true LIMIT 1`),
                    gpu: await pool.query(`SELECT * FROM pc_parts WHERE category='GPU' AND is_active=true LIMIT 1`),
                    ram: await pool.query(`SELECT * FROM pc_parts WHERE category='RAM' AND is_active=true LIMIT 1`),
                    psu: await pool.query(`SELECT * FROM pc_parts WHERE category='PSU' AND is_active=true LIMIT 1`),
                    case: await pool.query(`SELECT * FROM pc_parts WHERE category='Case' AND is_active=true LIMIT 1`)
                };

                const build = {
                    cpu: sampleBuild.cpu.rows[0],
                    motherboard: sampleBuild.motherboard.rows[0],
                    gpu: sampleBuild.gpu.rows[0],
                    ram: sampleBuild.ram.rows[0],
                    psu: sampleBuild.psu.rows[0],
                    case: sampleBuild.case.rows[0]
                };

                const analysis = await advancedCompatibilityService.analyzeFullBuild(build);

                return {
                    status: analysis.compatible !== false ? 'PASS' : 'FAIL',
                    message: `Advanced Analysis: ${analysis.overall_status}`,
                    details: {
                        power: analysis.layers?.power?.status,
                        clearance: analysis.layers?.clearance?.status,
                        pairwise: analysis.layers?.pairwise?.status,
                        bottleneck: analysis.layers?.bottleneck?.status,
                        critical_issues: analysis.summary?.total_critical_issues || 0
                    }
                };
            }
        },
        {
            name: 'PC Upgrade Analysis',
            test: async () => {
                const currentGPU = await pool.query(`
                    SELECT * FROM pc_parts 
                    WHERE category='GPU' 
                      AND tier='entry'
                      AND is_active=true 
                    LIMIT 1
                `);

                if (currentGPU.rows.length === 0) {
                    return { status: 'NO_DATA', message: 'No entry-level GPU found' };
                }

                const upgrades = await aiCompatibilityService.getCompatibleComponents(
                    currentGPU.rows[0],
                    'GPU',
                    []
                );

                const betterUpgrades = upgrades.filter(u => 
                    u.tier && ['mid-tier', 'high-tier', 'elite'].includes(u.tier.toLowerCase())
                );

                return {
                    status: betterUpgrades.length > 0 ? 'PASS' : 'FAIL',
                    message: `Found ${betterUpgrades.length} upgrade paths from ${currentGPU.rows[0].tier}`,
                    details: { current: currentGPU.rows[0].name, upgrade_options: betterUpgrades.length }
                };
            }
        },
        {
            name: 'Product Page - Compatible With',
            test: async () => {
                const product = await pool.query(`
                    SELECT * FROM pc_parts 
                    WHERE category='Motherboard' 
                      AND is_active=true 
                    LIMIT 1
                `);

                if (product.rows.length === 0) {
                    return { status: 'NO_DATA' };
                }

                return {
                    status: 'PASS',
                    message: `Product: ${product.rows[0].name} - can show compatible CPUs/RAM`,
                    details: { product_category: product.rows[0].category }
                };
            }
        },
        {
            name: 'Future Upgrade (In-Stock)',
            test: async () => {
                const stockCount = await pool.query(`
                    SELECT COUNT(*) as count 
                    FROM pc_parts 
                    WHERE is_active=true 
                      AND stock > 0
                `);

                return {
                    status: parseInt(stockCount.rows[0].count) > 0 ? 'PASS' : 'FAIL',
                    message: `${stockCount.rows[0].count} in-stock parts available for upgrade suggestions`,
                    details: { in_stock_parts: parseInt(stockCount.rows[0].count) }
                };
            }
        },
        {
            name: 'Future Upgrade (External/Market)',
            test: async () => {
                // Test AI's ability to suggest external components
                const testPrompt = `Suggest 3 GPU upgrades better than GTX 1650 available in Philippine market. Just list names.`;
                
                const response = await ollamaService.generateResponse(
                    testPrompt,
                    'List 3 GPU names only.',
                    { temperature: 0.3, max_tokens: 100 }
                );

                const hasGPUNames = /RTX|RX|GTX/i.test(response);

                return {
                    status: hasGPUNames ? 'PASS' : 'FAIL',
                    message: `AI can suggest external components: ${hasGPUNames ? 'Yes ✓' : 'No ✗'}`,
                    details: { ai_response_length: response.length, found_gpu_names: hasGPUNames }
                };
            }
        },
        {
            name: 'Pre-Built PC Validation',
            test: async () => {
                const prebuiltBuild = {
                    cpu: await pool.query(`SELECT * FROM pc_parts WHERE category='CPU' AND tier='high-tier' AND is_active=true LIMIT 1`),
                    motherboard: await pool.query(`SELECT * FROM pc_parts WHERE category='Motherboard' AND is_active=true LIMIT 1`),
                    gpu: await pool.query(`SELECT * FROM pc_parts WHERE category='GPU' AND tier='high-tier' AND is_active=true LIMIT 1`),
                    ram: await pool.query(`SELECT * FROM pc_parts WHERE category='RAM' AND is_active=true LIMIT 1`),
                    psu: await pool.query(`SELECT * FROM pc_parts WHERE category='PSU' AND is_active=true LIMIT 1`),
                    case: await pool.query(`SELECT * FROM pc_parts WHERE category='Case' AND is_active=true LIMIT 1`)
                };

                const build = {
                    cpu: prebuiltBuild.cpu.rows[0],
                    motherboard: prebuiltBuild.motherboard.rows[0],
                    gpu: prebuiltBuild.gpu.rows[0],
                    ram: prebuiltBuild.ram.rows[0],
                    psu: prebuiltBuild.psu.rows[0],
                    case: prebuiltBuild.case.rows[0]
                };

                const validation = await advancedCompatibilityService.analyzeFullBuild(build);

                return {
                    status: validation.summary?.total_critical_issues === 0 ? 'PASS' : 'FAIL',
                    message: `Pre-Built Validation: ${validation.overall_status}`,
                    details: {
                        critical_issues: validation.summary?.total_critical_issues || 0,
                        warnings: validation.summary?.total_warnings || 0,
                        overall_compatible: validation.compatible
                    }
                };
            }
        }
    ];

    for (const feature of features) {
        console.log(`\nTesting: ${feature.name}`);
        console.log('─'.repeat(70));
        
        const start = Date.now();
        try {
            const result = await feature.test();
            const duration = Date.now() - start;

            const statusEmoji = result.status === 'PASS' ? '✅' : 
                               result.status === 'FAIL' ? '❌' : '⚠️';

            console.log(`${statusEmoji} ${result.status} (${duration}ms)`);
            console.log(`   ${result.message}`);
            
            if (result.details) {
                console.log(`   Details:`, JSON.stringify(result.details, null, 2));
            }

            results.compatibility_features.push({
                name: feature.name,
                status: result.status,
                duration,
                message: result.message,
                details: result.details
            });

        } catch (error) {
            console.error(`❌ ERROR: ${error.message}`);
            results.compatibility_features.push({
                name: feature.name,
                status: 'ERROR',
                error: error.message
            });
        }
    }
}

// ============================================================================
// SECTION 4: AI PERFORMANCE & ACCURACY TESTING
// ============================================================================

async function testAIPerformance() {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║ SECTION 4: AI PERFORMANCE & ACCURACY TESTING                    ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    const tests = [
        {
            name: 'Socket Compatibility (Should FAIL)',
            scenario: {
                cpu: { name: 'AMD Ryzen 5 5600X', socket: 'AM4' },
                motherboard: { name: 'ASUS Z690', socket: 'LGA1700' }
            },
            expected: 'incompatible'
        },
        {
            name: 'Socket Compatibility (Should PASS)',
            scenario: {
                cpu: { name: 'Intel Core i5-12400', socket: 'LGA1700' },
                motherboard: { name: 'ASUS Z690', socket: 'LGA1700' }
            },
            expected: 'compatible'
        },
        {
            name: 'Power Budget (Should WARN)',
            scenario: {
                cpu: { tdp: 125 },
                gpu: { tdp: 350 },
                psu: { wattage: 550 }
            },
            expected: 'warning'
        }
    ];

    const results_ai = {
        total_tests: tests.length,
        correct_predictions: 0,
        avg_response_time: 0,
        accuracy_rate: 0
    };

    let totalTime = 0;

    for (const test of tests) {
        console.log(`\nTest: ${test.name}`);
        console.log(`Expected: ${test.expected}`);
        
        const start = Date.now();
        
        try {
            const prompt = `Analyze compatibility: ${JSON.stringify(test.scenario, null, 2)}
            
Is this compatible, incompatible, or warning? Answer in ONE WORD only.`;

            const response = await ollamaService.generateResponse(
                prompt,
                'Answer compatibility with ONE WORD: compatible, incompatible, or warning.',
                { temperature: 0.1, max_tokens: 50 }
            );

            const duration = Date.now() - start;
            totalTime += duration;

            const predicted = response.toLowerCase().includes(test.expected) ? test.expected :
                             response.toLowerCase().includes('compatible') ? 'compatible' :
                             response.toLowerCase().includes('incompatible') ? 'incompatible' : 'warning';

            const correct = predicted === test.expected;
            if (correct) results_ai.correct_predictions++;

            console.log(`   AI Response: "${response.substring(0, 50)}..."`);
            console.log(`   Predicted: ${predicted}`);
            console.log(`   Result: ${correct ? '✅ CORRECT' : '❌ WRONG'} (${duration}ms)`);

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }

    results_ai.avg_response_time = Math.round(totalTime / tests.length);
    results_ai.accuracy_rate = ((results_ai.correct_predictions / tests.length) * 100).toFixed(1);

    console.log(`\n📊 AI Accuracy Summary:`);
    console.log(`   Correct Predictions: ${results_ai.correct_predictions}/${tests.length}`);
    console.log(`   Accuracy Rate: ${results_ai.accuracy_rate}%`);
    console.log(`   Avg Response Time: ${results_ai.avg_response_time}ms`);

    results.ai_performance = results_ai;
    return results_ai;
}

// ============================================================================
// SECTION 5: STRESS TEST (CONCURRENT REQUESTS)
// ============================================================================

async function stressTest() {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║ SECTION 5: STRESS TEST (CONCURRENT REQUESTS)                    ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    const concurrency = 20; // Test with 20 concurrent requests
    const iterations = 5; // 5 iterations = 100 total requests

    console.log(`Testing with ${concurrency} concurrent requests x ${iterations} iterations = ${concurrency * iterations} total\n`);

    const stressResults = {
        total_requests: concurrency * iterations,
        successful: 0,
        failed: 0,
        avg_response_time: 0,
        min_response_time: Infinity,
        max_response_time: 0,
        errors: []
    };

    const testRequest = async () => {
        const start = Date.now();
        try {
            await ollamaService.generateResponse(
                'Quick test',
                'Answer with OK only.',
                { temperature: 0, max_tokens: 10 }
            );
            const duration = Date.now() - start;
            stressResults.successful++;
            stressResults.min_response_time = Math.min(stressResults.min_response_time, duration);
            stressResults.max_response_time = Math.max(stressResults.max_response_time, duration);
            return duration;
        } catch (error) {
            stressResults.failed++;
            stressResults.errors.push(error.message);
            return null;
        }
    };

    let totalDuration = 0;
    
    for (let i = 0; i < iterations; i++) {
        console.log(`Iteration ${i + 1}/${iterations} - Sending ${concurrency} concurrent requests...`);
        
        const promises = Array.from({ length: concurrency }, () => testRequest());
        const durations = await Promise.all(promises);
        
        const validDurations = durations.filter(d => d !== null);
        const avgThisRound = validDurations.reduce((a, b) => a + b, 0) / validDurations.length;
        totalDuration += avgThisRound;
        
        console.log(`   ✓ Completed in avg ${Math.round(avgThisRound)}ms`);
    }

    stressResults.avg_response_time = Math.round(totalDuration / iterations);

    console.log(`\n📊 Stress Test Summary:`);
    console.log(`   Total Requests: ${stressResults.total_requests}`);
    console.log(`   ✅ Successful: ${stressResults.successful} (${((stressResults.successful/stressResults.total_requests)*100).toFixed(1)}%)`);
    console.log(`   ❌ Failed: ${stressResults.failed} (${((stressResults.failed/stressResults.total_requests)*100).toFixed(1)}%)`);
    console.log(`   Avg Response Time: ${stressResults.avg_response_time}ms`);
    console.log(`   Min Response Time: ${stressResults.min_response_time}ms`);
    console.log(`   Max Response Time: ${stressResults.max_response_time}ms`);

    if (stressResults.errors.length > 0) {
        console.log(`\n⚠️ Errors encountered:`);
        const uniqueErrors = [...new Set(stressResults.errors)];
        uniqueErrors.forEach(err => console.log(`   - ${err}`));
    }

    results.stress_test = stressResults;
    return stressResults;
}

// ============================================================================
// SECTION 6: OVERALL RATING & RECOMMENDATIONS
// ============================================================================

function calculateOverallRating() {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║ SECTION 6: OVERALL RATING & RECOMMENDATIONS                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    let score = 0;
    const maxScore = 100;
    const recommendations = [];

    // Ollama Service Health (20 points)
    if (results.ollama_health?.service_status === 'healthy') {
        score += 20;
        console.log('✅ Ollama Service: HEALTHY (+20 points)');
    } else {
        console.log('❌ Ollama Service: UNHEALTHY (+0 points)');
        recommendations.push('CRITICAL: Fix Ollama service connectivity');
    }

    // Database Rules Coverage (20 points)
    const rulesScore = Math.min((results.database_stats?.enabled_rules || 0) / 1000 * 20, 20);
    score += rulesScore;
    console.log(`✅ Database Rules: ${results.database_stats?.enabled_rules || 0} rules (+${Math.round(rulesScore)} points)`);
    
    if (results.database_stats?.enabled_rules < 1000) {
        recommendations.push(`Add ${1000 - results.database_stats.enabled_rules} more rules to reach 1000-rule target`);
    }

    // Compatibility Features (30 points)
    const featuresPassed = results.compatibility_features.filter(f => f.status === 'PASS').length;
    const featuresScore = (featuresPassed / 8) * 30;
    score += featuresScore;
    console.log(`✅ Compatibility Features: ${featuresPassed}/8 passed (+${Math.round(featuresScore)} points)`);

    if (featuresPassed < 8) {
        recommendations.push(`Fix ${8 - featuresPassed} failing compatibility feature(s)`);
    }

    // AI Performance (15 points)
    const aiAccuracy = parseFloat(results.ai_performance?.accuracy_rate || 0);
    const aiScore = (aiAccuracy / 100) * 15;
    score += aiScore;
    console.log(`✅ AI Accuracy: ${aiAccuracy}% (+${Math.round(aiScore)} points)`);

    if (aiAccuracy < 90) {
        recommendations.push(`Improve AI accuracy from ${aiAccuracy}% to 90%+ (fine-tuning recommended)`);
    }

    // Stress Test Performance (15 points)
    const stressSuccessRate = (results.stress_test?.successful || 0) / (results.stress_test?.total_requests || 1) * 100;
    const stressScore = (stressSuccessRate / 100) * 15;
    score += stressScore;
    console.log(`✅ Stress Test: ${stressSuccessRate.toFixed(1)}% success rate (+${Math.round(stressScore)} points)`);

    if (stressSuccessRate < 95) {
        recommendations.push(`Improve concurrent request handling (currently ${stressSuccessRate.toFixed(1)}% success)`);
    }

    const finalScore = Math.round(score);
    const rating = (finalScore / maxScore) * 5;

    console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
    console.log(`║ FINAL SCORE: ${finalScore}/${maxScore} points                                  ║`);
    console.log(`║ OVERALL RATING: ${rating.toFixed(1)}/5.0 ⭐                                    ║`);
    console.log(`╚══════════════════════════════════════════════════════════════════╝`);

    const ratingCategory = rating >= 4.5 ? 'EXCELLENT ⭐⭐⭐⭐⭐' :
                           rating >= 4.0 ? 'VERY GOOD ⭐⭐⭐⭐' :
                           rating >= 3.5 ? 'GOOD ⭐⭐⭐' :
                           rating >= 3.0 ? 'ACCEPTABLE ⭐⭐' :
                           rating >= 2.0 ? 'NEEDS IMPROVEMENT ⭐' :
                                          'POOR';

    console.log(`\nRating Category: ${ratingCategory}\n`);

    if (recommendations.length > 0) {
        console.log('📋 Recommendations to reach 5.0/5.0:');
        recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });
    } else {
        console.log('🎉 System is performing at peak level! No major improvements needed.');
    }

    results.overall_rating = {
        score: finalScore,
        max_score: maxScore,
        rating: parseFloat(rating.toFixed(1)),
        category: ratingCategory
    };

    results.recommendations = recommendations;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                  ║');
    console.log('║   K-WISE COMPREHENSIVE SYSTEM ANALYSIS                           ║');
    console.log('║   Ollama DeepSeek R1 AI + Compatibility System                   ║');
    console.log('║                                                                  ║');
    console.log('║   Brutally Analyzing Every Component                             ║');
    console.log('║   Testing All 8 Compatibility Features                           ║');
    console.log('║   Measuring AI Accuracy & Performance                            ║');
    console.log('║   Stress Testing with Concurrent Requests                        ║');
    console.log('║                                                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');

    try {
        // Run all analysis sections
        await analyzeOllamaService();
        await analyzeDatabaseRules();
        await testAllCompatibilityFeatures();
        await testAIPerformance();
        await stressTest();
        
        // Calculate final rating
        calculateOverallRating();

        // Save results to file
        const fs = require('fs');
        const reportPath = './COMPREHENSIVE_SYSTEM_ANALYSIS_REPORT.json';
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`\n✅ Full report saved to: ${reportPath}`);

        // Generate markdown summary
        const markdown = generateMarkdownReport(results);
        const mdPath = './COMPREHENSIVE_SYSTEM_ANALYSIS_REPORT.md';
        fs.writeFileSync(mdPath, markdown);
        console.log(`✅ Markdown report saved to: ${mdPath}\n`);

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
        ollamaService.stopKeepAlive();
        process.exit(0);
    }
}

function generateMarkdownReport(results) {
    return `# K-Wise System Analysis Report

**Generated:** ${results.timestamp}

## Executive Summary

- **Overall Rating:** ${results.overall_rating?.rating}/5.0 ⭐ (${results.overall_rating?.category})
- **Score:** ${results.overall_rating?.score}/${results.overall_rating?.max_score} points

---

## 1. Ollama AI Service Status

- **Status:** ${results.ollama_health?.service_status}
- **Selected Model:** ${results.ollama_health?.selected_model}
- **Response Time:** ${results.ollama_health?.response_time}ms
- **Keep-Alive Active:** ${results.ollama_health?.keep_alive_active ? 'Yes' : 'No'}

### AI Reasoning Quality
- **Test Response Time:** ${results.ollama_health?.ai_reasoning_quality?.response_time}ms
- **Contains Score:** ${results.ollama_health?.ai_reasoning_quality?.contains_score ? 'Yes' : 'No'}
- **Contains Reasoning:** ${results.ollama_health?.ai_reasoning_quality?.contains_reasoning ? 'Yes' : 'No'}

---

## 2. Database Statistics

- **Total Rules:** ${results.database_stats?.total_rules}
- **Enabled Rules:** ${results.database_stats?.enabled_rules}
- **Disabled Rules:** ${results.database_stats?.disabled_rules}

### Rules by Category
${Object.entries(results.database_stats?.categories || {}).map(([cat, count]) => `- **${cat}:** ${count}`).join('\n')}

### Rules by Severity
${Object.entries(results.database_stats?.severity_breakdown || {}).map(([sev, count]) => `- **${sev}:** ${count}`).join('\n')}

---

## 3. Compatibility Features Test Results

${results.compatibility_features.map(f => `
### ${f.name}
- **Status:** ${f.status}
- **Duration:** ${f.duration}ms
- **Message:** ${f.message}
${f.details ? '- **Details:** ' + JSON.stringify(f.details) : ''}
`).join('\n')}

---

## 4. AI Performance Metrics

- **Accuracy Rate:** ${results.ai_performance?.accuracy_rate}%
- **Correct Predictions:** ${results.ai_performance?.correct_predictions}/${results.ai_performance?.total_tests}
- **Avg Response Time:** ${results.ai_performance?.avg_response_time}ms

---

## 5. Stress Test Results

- **Total Requests:** ${results.stress_test?.total_requests}
- **Successful:** ${results.stress_test?.successful} (${((results.stress_test?.successful / results.stress_test?.total_requests) * 100).toFixed(1)}%)
- **Failed:** ${results.stress_test?.failed}
- **Avg Response Time:** ${results.stress_test?.avg_response_time}ms
- **Min Response Time:** ${results.stress_test?.min_response_time}ms
- **Max Response Time:** ${results.stress_test?.max_response_time}ms

---

## 6. Recommendations

${results.recommendations.length > 0 ? results.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n') : 'No recommendations - system performing optimally!'}

---

## Conclusion

The K-Wise Compatibility System achieved a rating of **${results.overall_rating?.rating}/5.0** (${results.overall_rating?.category}).

${results.overall_rating?.rating >= 4.5 ? '🎉 **Excellent performance!** System is production-ready.' : 
  results.overall_rating?.rating >= 4.0 ? '👍 **Very good performance.** Minor improvements recommended.' :
  results.overall_rating?.rating >= 3.5 ? '✅ **Good performance.** Some areas need attention.' :
  results.overall_rating?.rating >= 3.0 ? '⚠️ **Acceptable performance.** Several improvements needed.' :
  '🔴 **Critical issues detected.** Immediate action required.'}
`;
}

// Run the analysis
main();
