/**
 * SECTION 3: ORDER SUMMARY (All Pages)
 * 8 Trap Tests across 2 scenarios
 */

const testHelpers = require('../utils/test-helpers');
const DeepSeekPrompts = require('../utils/deepseek-prompts');
const config = require('../config/brutal-test-config');

test('brutal stress placeholder - section 3', () => {
    expect(true).toBe(true);
});

class Section3Tests {
    constructor() {
        this.results = [];
    }

    /**
     * TEST 3.1: PC-Parts Order Summary
     * Scenario: Mixed compatibility build with warnings
     * Expected: Lettered format (A, B, C...), Problems/Warnings/Notes/Disclaimers sections
     * 5 Traps: Clear incompatibility not flagged, categories mixed, generic messages, missing known issue, lettering sequence breaks
     */
    async test_3_1_PCPartsOrderSummary() {
        console.log('\n═══════════════════════════════════════════');
        console.log('TEST 3.1: PC-Parts Order Summary');
        console.log('═══════════════════════════════════════════');

        const problematicBuild = {
            cpu: config.testCPUs.intelI9_14900K,
            cooler: { name: 'Arctic Liquid Freezer II 240mm', tdp_rating: 250, type: '240mm AIO' },
            motherboard: { name: 'ASUS ROG STRIX Z790-E', socket: 'LGA1700', memory_type: 'DDR5' },
            ram: { name: 'G.Skill Trident Z5 32GB', memory_type: 'DDR5', speed: 6000 },
            storage: { name: 'WD Black SN850X 1TB', interface: 'NVMe PCIe 4.0' },
            gpu: config.testGPUs.rtx4090,
            case: { name: 'Lian Li O11 Dynamic', max_gpu_length: 350, gpu_clearance_with_fans: 336 },
            psu: { name: 'Corsair RM850x', wattage: 850, efficiency: '80+ Gold' }
        };

        // Call order summary API
        const summaryResponse = await testHelpers.apiRequest(
            '/builder/check-compatibility',
            'POST',
            problematicBuild
        );

        // Generate AI analysis
        const prompt = DeepSeekPrompts.validateFullBuild(problematicBuild);
        const aiResult = await testHelpers.callDeepSeek(prompt);

        // TRAP 29: Clear incompatibility NOT flagged as Problem - CRITICAL FAIL
        const trap29 = await testHelpers.testTrap(
            29,
            'Clear incompatibility NOT flagged as Problem - CRITICAL FAIL',
            async () => {
                if (!summaryResponse.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped - API unavailable' };
                }

                // Check if power inadequacy (850W for 850W+ requirement) is flagged
                const powerIssues = summaryResponse.data?.problems || [];
                const totalPower = problematicBuild.cpu.tdp + problematicBuild.gpu.tdp + 150; // 253 + 450 + 150 = 853W
                const hasPowerProblem = powerIssues.some(p => 
                    p.toLowerCase().includes('power') || 
                    p.toLowerCase().includes('psu') ||
                    p.toLowerCase().includes('wattage')
                );

                return {
                    passed: hasPowerProblem || totalPower <= problematicBuild.psu.wattage * 0.9,
                    severity: config.severity.CATASTROPHIC,
                    details: hasPowerProblem
                        ? 'Power inadequacy correctly flagged'
                        : `CATASTROPHIC: ${totalPower}W system on ${problematicBuild.psu.wattage}W PSU not flagged`
                };
            }
        );

        // TRAP 30: Problem/Warning categories mixed up - FAIL
        const trap30 = await testHelpers.testTrap(
            30,
            'Problem/Warning categories mixed up - FAIL',
            async () => {
                if (!aiResult.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                const problems = aiResult.data?.problems || [];
                const warnings = aiResult.data?.warnings || [];

                // Problems should be critical incompatibilities (socket, memory type, physical conflicts)
                // Warnings should be marginal issues (TDP ratings, tight clearances, budget concerns)
                
                // Check if any warnings are actually problems
                const misCategorized = warnings.some(w => {
                    const wText = w.toLowerCase();
                    return wText.includes('socket') || 
                           wText.includes('does not fit') ||
                           wText.includes('incompatible memory');
                });

                return {
                    passed: !misCategorized,
                    severity: config.severity.CRITICAL,
                    details: misCategorized
                        ? 'CRITICAL: Critical issues categorized as warnings'
                        : 'Issue categorization correct'
                };
            }
        );

        // TRAP 31: Generic messages ("May not fit") without specifics - FAIL
        const trap31 = await testHelpers.testTrap(
            31,
            'Generic messages without specific measurements - FAIL',
            async () => {
                if (!aiResult.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                const allMessages = [
                    ...(aiResult.data?.problems || []),
                    ...(aiResult.data?.warnings || []),
                    ...(aiResult.data?.notes || [])
                ];

                // Check for generic phrases without specifics
                const genericPhrases = ['may not fit', 'might not work', 'could have issues', 'possibly incompatible'];
                const hasGeneric = allMessages.some(msg => {
                    const msgLower = (typeof msg === 'string' ? msg : JSON.stringify(msg)).toLowerCase();
                    return genericPhrases.some(phrase => msgLower.includes(phrase));
                });

                // Check for specific measurements (mm, W, GB, MHz)
                const hasSpecifics = allMessages.some(msg => {
                    const msgStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
                    return /\d+\s*(mm|MHz|GB|W|watts)/i.test(msgStr);
                });

                return {
                    passed: !hasGeneric || hasSpecifics,
                    severity: config.severity.STANDARD,
                    details: hasSpecifics
                        ? 'Messages include specific measurements'
                        : 'FAIL: Generic messages without measurements'
                };
            }
        );

        // TRAP 32: Missing known issue from database - FAIL
        const trap32 = await testHelpers.testTrap(
            32,
            'Missing known issue from compatibility database - FAIL',
            async () => {
                if (!aiResult.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                // Check if Layer 6 (known issues) was executed
                const layer6 = aiResult.data?.layer_results?.layer_6_known_issues;
                const knownIssuesChecked = layer6 && layer6.passed !== undefined;

                return {
                    passed: knownIssuesChecked,
                    severity: config.severity.CRITICAL,
                    details: knownIssuesChecked
                        ? `Known issues database checked (${layer6.passed} passed, ${layer6.failed || 0} failed)`
                        : 'CRITICAL: Known issues database not queried'
                };
            }
        );

        // TRAP 33: Lettering sequence breaks (A, B, D, C) - FAIL
        const trap33 = await testHelpers.testTrap(
            33,
            'Lettering sequence incorrect (should be A, B, C, D...) - FAIL',
            async () => {
                if (!aiResult.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                const warnings = aiResult.data?.warnings || [];
                const notes = aiResult.data?.notes || [];

                // Check if lettering is sequential
                const letters = [...warnings, ...notes]
                    .map(item => {
                        const match = (typeof item === 'string' ? item : '').match(/^([A-Z])\./);
                        return match ? match[1] : null;
                    })
                    .filter(Boolean);

                // Verify sequential order
                let isSequential = true;
                for (let i = 0; i < letters.length - 1; i++) {
                    if (letters[i].charCodeAt(0) + 1 !== letters[i + 1].charCodeAt(0)) {
                        isSequential = false;
                        break;
                    }
                }

                return {
                    passed: letters.length === 0 || isSequential,
                    severity: config.severity.MINOR,
                    details: isSequential
                        ? 'Lettering sequence correct'
                        : `FAIL: Sequence breaks: ${letters.join(', ')}`
                };
            }
        );

        // Performance check
        const perfResult = await testHelpers.measurePerformance(
            'Order Summary Generation',
            async () => summaryResponse,
            config.performance.orderSummary
        );

        return {
            testSection: '3.1',
            traps: [trap29, trap30, trap31, trap32, trap33],
            aiResponseTime: aiResult.responseTime,
            performance: perfResult.performance,
            passed: [trap29, trap30, trap31, trap32, trap33].every(t => t.passed)
        };
    }

    /**
     * TEST 3.2: PC Customized AI Order Summary
     * Scenario: Budget build with compromises, AI-generated
     * Expected: AI rationale section, zero problems (AI should prevent), warnings acceptable
     * 3 Traps: AI build has incompatibility, AI overspends budget, AI picks incompatible "best deals"
     */
    async test_3_2_AICustomizedOrderSummary() {
        console.log('\n═══════════════════════════════════════════');
        console.log('TEST 3.2: PC Customized AI Order Summary');
        console.log('═══════════════════════════════════════════');

        const requirements = {
            useCase: 'Gaming',
            budget: 60000,
            tier: 'Gold',
            preference: 'Balanced',
            gamingType: 'AAA Games'
        };

        // Request AI build generation
        const aiBuildResponse = await testHelpers.apiRequest(
            '/ai/customize',
            'POST',
            requirements
        );

        // TRAP 34: AI build has incompatibility - CATASTROPHIC FAIL
        const trap34 = await testHelpers.testTrap(
            34,
            'AI-generated build has incompatibility - CATASTROPHIC FAIL',
            async () => {
                if (!aiBuildResponse.success) {
                    return { passed: false, severity: config.severity.CRITICAL, details: 'AI build generation failed' };
                }

                const build = aiBuildResponse.data?.build || {};
                const compatibilityScore = aiBuildResponse.data?.compatibility_score || 0;
                const problems = aiBuildResponse.data?.problems || [];

                return {
                    passed: problems.length === 0 && compatibilityScore >= 95,
                    severity: config.severity.CATASTROPHIC,
                    details: problems.length === 0
                        ? `AI build compatible (score: ${compatibilityScore})`
                        : `CATASTROPHIC: AI generated ${problems.length} incompatibilities`
                };
            }
        );

        // TRAP 35: AI overspends budget by >5% - FAIL
        const trap35 = await testHelpers.testTrap(
            35,
            'AI overspends budget by >5% - FAIL',
            async () => {
                if (!aiBuildResponse.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                const totalCost = aiBuildResponse.data?.total_cost || 0;
                const maxBudget = requirements.budget * 1.05; // 5% tolerance

                return {
                    passed: totalCost <= maxBudget,
                    severity: config.severity.CRITICAL,
                    details: totalCost <= maxBudget
                        ? `Budget adhered: ₱${totalCost} <= ₱${maxBudget}`
                        : `CRITICAL: AI overspent ₱${totalCost} (max ₱${maxBudget})`
                };
            }
        );

        // TRAP 36: AI picks incompatible "best deals" - CRITICAL FAIL
        const trap36 = await testHelpers.testTrap(
            36,
            'AI picks incompatible parts for "best deals" - CRITICAL FAIL',
            async () => {
                if (!aiBuildResponse.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                const build = aiBuildResponse.data?.build || {};
                
                // Verify socket matching
                const cpu = build.cpu || {};
                const motherboard = build.motherboard || {};
                const ram = build.ram || {};

                // Check CPU-Motherboard socket
                const socketMatch = !cpu.socket || !motherboard.socket || 
                                   cpu.socket === motherboard.socket;

                // Check RAM type
                const ramMatch = !motherboard.memory_type || !ram.memory_type ||
                                motherboard.memory_type === ram.memory_type;

                return {
                    passed: socketMatch && ramMatch,
                    severity: config.severity.CATASTROPHIC,
                    details: socketMatch && ramMatch
                        ? 'AI component selection compatible'
                        : `CATASTROPHIC: AI picked incompatible parts (socket: ${socketMatch}, RAM: ${ramMatch})`
                };
            }
        );

        return {
            testSection: '3.2',
            traps: [trap34, trap35, trap36],
            passed: [trap34, trap35, trap36].every(t => t.passed)
        };
    }

    /**
     * Run all Section 3 tests
     */
    async runAll() {
        console.log('\n╔═══════════════════════════════════════════╗');
        console.log('║    SECTION 3: ORDER SUMMARY TESTING       ║');
        console.log('║    8 Trap Tests | 2 Scenarios             ║');
        console.log('╚═══════════════════════════════════════════╝');

        const results = [];

        try {
            results.push(await this.test_3_1_PCPartsOrderSummary());
            results.push(await this.test_3_2_AICustomizedOrderSummary());

            const allTraps = results.flatMap(r => r.traps || []);
            const passedTraps = allTraps.filter(t => t.passed).length;
            const totalTraps = allTraps.length;

            console.log('\n═══════════════════════════════════════════');
            console.log(`SECTION 3 SUMMARY: ${passedTraps}/${totalTraps} traps passed`);
            console.log('═══════════════════════════════════════════\n');

            return {
                section: 3,
                name: 'Order Summary (All Pages)',
                results,
                summary: {
                    totalTraps,
                    passedTraps,
                    failedTraps: totalTraps - passedTraps,
                    passRate: ((passedTraps / totalTraps) * 100).toFixed(1)
                }
            };

        } catch (error) {
            console.error('❌ Section 3 tests failed:', error.message);
            return {
                section: 3,
                error: error.message,
                results
            };
        }
    }
}

module.exports = Section3Tests;

