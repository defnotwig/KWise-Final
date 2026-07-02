/**
 * BRUTAL STRESS TEST - HELPER UTILITIES
 */

const axios = require('axios');
const config = require('../config/brutal-test-config');
const logger = require('../../../utils/logger');

class TestHelpers {
    constructor() {
        this.baseUrl = process.env.API_URL || 'http://localhost:5000/api';
        this.ollamaUrl = config.ai.ollamaUrl;
        this.testResults = [];
        this.trapResults = [];
        this.performanceMetrics = [];
    }

    /**
     * Call DeepSeek-R1 AI validation
     */
    async callDeepSeek(prompt, systemPrompt = null) {
        const startTime = Date.now();
        
        try {
            const response = await axios.post(this.ollamaUrl, {
                model: config.ai.model,
                prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
                stream: false,
                options: {
                    temperature: config.ai.temperature,
                    num_predict: config.ai.max_tokens
                }
            }, {
                timeout: config.ai.timeout
            });

            const responseTime = Date.now() - startTime;
            
            // Parse JSON response
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(response.data.response);
            } catch (parseError) {
                // Try to extract JSON from markdown code blocks
                const jsonMatch = response.data.response.match(/```json\n([\s\S]+?)\n```/);
                if (jsonMatch) {
                    parsedResponse = JSON.parse(jsonMatch[1]);
                } else {
                    throw new Error('Failed to parse AI response as JSON');
                }
            }

            return {
                success: true,
                data: parsedResponse,
                responseTime,
                rawResponse: response.data.response
            };

        } catch (error) {
            const responseTime = Date.now() - startTime;
            logger.error('DeepSeek AI call failed:', error.message);
            
            return {
                success: false,
                error: error.message,
                responseTime
            };
        }
    }

    /**
     * Make API request to K-Wise backend or external URL
     */
    async apiRequest(endpoint, method = 'GET', data = null, headers = {}) {
        const startTime = Date.now();
        
        // Handle absolute URLs (like http://localhost:11434/api/tags for Ollama)
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

        try {
            const requestConfig = {
                method,
                url,
                headers: {
                    ...headers
                },
                timeout: 30000
            };

            // Only add data and Content-Type header for methods that support request body
            if (method !== 'GET' && method !== 'HEAD' && data !== null) {
                requestConfig.data = data;
                requestConfig.headers['Content-Type'] = 'application/json';
            }

            const response = await axios(requestConfig);

            const responseTime = Date.now() - startTime;

            return {
                success: true,
                data: response.data,
                responseTime,
                status: response.status
            };

        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            return {
                success: false,
                error: error.message,
                responseTime,
                status: error.response?.status || 500,
                data: error.response?.data
            };
        }
    }

    /**
     * Test trap: Verify incompatible component is NOT shown as compatible
     */
    async testTrap(trapNumber, description, testFunction) {
        const startTime = Date.now();
        console.log(`\n🔍 TRAP ${trapNumber}: ${description}`);

        try {
            const result = await testFunction();
            const duration = Date.now() - startTime;

            const trapResult = {
                trapNumber,
                description,
                passed: result.passed,
                severity: result.severity || config.severity.STANDARD,
                details: result.details,
                duration,
                timestamp: new Date().toISOString()
            };

            this.trapResults.push(trapResult);

            if (result.passed) {
                console.log(`✅ TRAP ${trapNumber} PASSED: ${description}`);
            } else {
                const severityLabel = Object.keys(config.severity).find(
                    key => config.severity[key].level === result.severity.level
                );
                console.log(`❌ TRAP ${trapNumber} FAILED [${severityLabel}]: ${description}`);
                console.log(`   Details: ${result.details}`);
            }

            return trapResult;

        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`💥 TRAP ${trapNumber} ERROR: ${error.message}`);

            const trapResult = {
                trapNumber,
                description,
                passed: false,
                severity: config.severity.CRITICAL,
                details: `Test error: ${error.message}`,
                error: error.stack,
                duration,
                timestamp: new Date().toISOString()
            };

            this.trapResults.push(trapResult);
            return trapResult;
        }
    }

    /**
     * Measure performance benchmark
     */
    async measurePerformance(name, testFunction, benchmark) {
        const startTime = Date.now();
        
        try {
            const result = await testFunction();
            const duration = Date.now() - startTime;

            const meetsTarget = duration <= benchmark.target;
            const meetsMax = duration <= benchmark.max;

            const metric = {
                name,
                duration,
                target: benchmark.target,
                max: benchmark.max,
                meetsTarget,
                meetsMax,
                status: meetsTarget ? 'EXCELLENT' : (meetsMax ? 'ACCEPTABLE' : 'FAILED'),
                timestamp: new Date().toISOString()
            };

            this.performanceMetrics.push(metric);

            console.log(`⏱️  ${name}: ${duration}ms (Target: ${benchmark.target}ms, Max: ${benchmark.max}ms) - ${metric.status}`);

            return { ...result, performance: metric };

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ Performance test failed: ${name}`, error.message);

            const metric = {
                name,
                duration,
                target: benchmark.target,
                max: benchmark.max,
                meetsTarget: false,
                meetsMax: false,
                status: 'ERROR',
                error: error.message,
                timestamp: new Date().toISOString()
            };

            this.performanceMetrics.push(metric);
            return { error: error.message, performance: metric };
        }
    }

    /**
     * Verify component appears in filtered results
     */
    verifyComponentPresent(componentId, results, shouldBePresent = true) {
        const isPresent = results.some(item => item.id === componentId);
        
        if (shouldBePresent && !isPresent) {
            return {
                passed: false,
                details: `Component ${componentId} should be present but was not found`
            };
        }

        if (!shouldBePresent && isPresent) {
            return {
                passed: false,
                severity: config.severity.CATASTROPHIC,
                details: `Component ${componentId} should NOT be present but was found (INCOMPATIBLE SHOWN AS COMPATIBLE)`
            };
        }

        return {
            passed: true,
            details: shouldBePresent ? 'Component correctly present' : 'Component correctly excluded'
        };
    }

    /**
     * Verify compatibility score in range
     */
    verifyCompatibilityScore(score, minExpected, maxExpected) {
        const inRange = score >= minExpected && score <= maxExpected;

        return {
            passed: inRange,
            details: inRange 
                ? `Compatibility score ${score} within expected range ${minExpected}-${maxExpected}`
                : `Compatibility score ${score} outside expected range ${minExpected}-${maxExpected}`,
            severity: inRange ? null : config.severity.STANDARD
        };
    }

    /**
     * Verify power calculation accuracy
     */
    verifyPowerCalculation(calculated, expected, tolerance = 0.10) {
        const difference = Math.abs(calculated - expected);
        const percentDiff = (difference / expected) * 100;
        const acceptable = percentDiff <= (tolerance * 100);

        return {
            passed: acceptable,
            details: acceptable
                ? `Power calculation ${calculated}W within ${tolerance * 100}% of expected ${expected}W`
                : `Power calculation ${calculated}W differs from expected ${expected}W by ${percentDiff.toFixed(1)}%`,
            severity: acceptable ? null : (percentDiff > 10 ? config.severity.CRITICAL : config.severity.STANDARD)
        };
    }

    /**
     * Verify budget adherence
     */
    verifyBudget(totalCost, budgetMin, budgetMax) {
        const withinBudget = totalCost >= budgetMin && totalCost <= budgetMax;

        return {
            passed: withinBudget,
            details: withinBudget
                ? `Build cost ₱${totalCost} within budget ₱${budgetMin}-₱${budgetMax}`
                : `Build cost ₱${totalCost} outside budget ₱${budgetMin}-₱${budgetMax}`,
            severity: withinBudget ? null : config.severity.CRITICAL
        };
    }

    /**
     * Verify no incompatibility flags
     */
    verifyNoIncompatibilities(result) {
        const hasProblems = result.problems && result.problems.length > 0;
        const hasCriticalIssues = result.issues && result.issues.some(i => i.severity === 'critical');

        const passed = !hasProblems && !hasCriticalIssues;

        return {
            passed,
            details: passed
                ? 'No incompatibilities detected'
                : `Incompatibilities found: ${result.problems?.length || 0} problems, ${result.issues?.filter(i => i.severity === 'critical').length || 0} critical issues`,
            severity: passed ? null : config.severity.CATASTROPHIC
        };
    }

    /**
     * Generate test summary
     */
    generateSummary() {
        const totalTraps = this.trapResults.length;
        const passedTraps = this.trapResults.filter(t => t.passed).length;
        const failedTraps = totalTraps - passedTraps;
        const passRate = totalTraps > 0 ? (passedTraps / totalTraps * 100).toFixed(1) : 0;

        const catastrophicFailures = this.trapResults.filter(
            t => !t.passed && t.severity?.level === config.severity.CATASTROPHIC.level
        ).length;
        const criticalFailures = this.trapResults.filter(
            t => !t.passed && t.severity?.level === config.severity.CRITICAL.level
        ).length;

        const performanceTests = this.performanceMetrics.length;
        const performancePassed = this.performanceMetrics.filter(m => m.meetsMax).length;
        const performanceTarget = this.performanceMetrics.filter(m => m.meetsTarget).length;

        return {
            traps: {
                total: totalTraps,
                passed: passedTraps,
                failed: failedTraps,
                passRate: Number.parseFloat(passRate),
                catastrophic: catastrophicFailures,
                critical: criticalFailures
            },
            performance: {
                total: performanceTests,
                meetsMax: performancePassed,
                meetsTarget: performanceTarget,
                avgDuration: performanceTests > 0 
                    ? Math.round(this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceTests)
                    : 0
            },
            overall: {
                passed: catastrophicFailures === 0 && criticalFailures === 0,
                status: catastrophicFailures > 0 ? 'CATASTROPHIC_FAILURE' :
                        criticalFailures > 0 ? 'CRITICAL_FAILURE' :
                        failedTraps > 0 ? 'STANDARD_FAILURE' :
                        'SUCCESS',
                rating: this.calculateOverallRating(passRate, catastrophicFailures, criticalFailures, performanceTarget, performanceTests)
            }
        };
    }

    /**
     * Calculate overall rating (0-5.0 scale)
     */
    calculateOverallRating(passRate, catastrophic, critical, performanceTarget, performanceTotal) {
        // Catastrophic failures = instant 0.0
        if (catastrophic > 0) return 0.0;

        // Start with pass rate (max 3.0 points)
        let rating = (passRate / 100) * 3.0;

        // Critical failures penalty (-0.5 per failure, max -2.0)
        rating -= Math.min(critical * 0.5, 2.0);

        // Performance bonus (max 2.0 points)
        if (performanceTotal > 0) {
            const perfScore = (performanceTarget / performanceTotal) * 2.0;
            rating += perfScore;
        }

        return Math.max(0, Math.min(5.0, rating)).toFixed(1);
    }

    /**
     * Export results to JSON
     */
    exportResults(filename) {
        const results = {
            metadata: {
                timestamp: new Date().toISOString(),
                configuration: config,
                targetRating: '5.0/5.0'
            },
            summary: this.generateSummary(),
            trapResults: this.trapResults,
            performanceMetrics: this.performanceMetrics
        };

        return results;
    }

    /**
     * Reset test state
     */
    reset() {
        this.testResults = [];
        this.trapResults = [];
        this.performanceMetrics = [];
    }
}

module.exports = new TestHelpers();

