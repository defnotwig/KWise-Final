#!/usr/bin/env node
/**
 * BRUTAL STRESS TEST RUNNER
 * Comprehensive K-Wise compatibility system validation
 * Zero-tolerance testing with Ollama DeepSeek-R1 AI validation
 */

const fs = require('node:fs').promises;
const path = require('node:path');
const testHelpers = require('./utils/test-helpers');
const config = require('./config/brutal-test-config');

// Test Section Classes
const Section1Tests = require('./tests/section-1-pc-parts-page.test');
const Section2Tests = require('./tests/section-2-product-page.test');
const Section3Tests = require('./tests/section-3-order-summary.test');
const Sections4to6Tests = require('./tests/sections-4-6-builder-upgrade.test');
const Sections7to13Tests = require('./tests/sections-7-13-advanced.test');

class BrutalTestRunner {
    constructor(options = {}) {
        this.options = {
            sections: options.sections || 'all', // 'all' or array like [1, 2]
            verbose: options.verbose || false,
            aiDebug: options.aiDebug || false,
            stopOnCatastrophic: options.stopOnCatastrophic !== false, // Default true
            generateReport: options.generateReport !== false, // Default true
            ...options
        };

        this.results = {
            metadata: {
                startTime: new Date().toISOString(),
                config: config,
                options: this.options
            },
            sections: [],
            summary: null,
            endTime: null,
            duration: null
        };

        this.startTime = Date.now();
    }

    /**
     * Display banner
     */
    displayBanner() {
        console.log('\n╔═════════════════════════════════════════════════════════╗');
        console.log('║                                                         ║');
        console.log('║      K-WISE BRUTAL COMPATIBILITY STRESS TEST            ║');
        console.log('║                                                         ║');
        console.log('║      🎯 ZERO TOLERANCE POLICY                          ║');
        console.log('║      No incompatible parts shown as compatible          ║');
        console.log('║                                                         ║');
        console.log('║      🤖 AI-Enhanced Validation                         ║');
        console.log('║      DeepSeek-R1 Model                                  ║');
        console.log('║                                                         ║');
        console.log('║      📊 168 Trap Tests | 13 Sections                   ║');
        console.log('║      ⚡ Target: 5.0/5.0 Rating                         ║');
        console.log('║                                                         ║');
        console.log('╚═════════════════════════════════════════════════════════╝\n');
    }

    /**
     * Check system prerequisites
     */
    async checkPrerequisites() {
        console.log('🔍 Checking prerequisites...\n');

        // 1. Check Ollama service
        try {
            const ollamaCheck = await testHelpers.apiRequest(
                'http://localhost:11434/api/tags',
                'GET'
            );

            if (ollamaCheck.success) {
                console.log('✅ Ollama service: RUNNING');
                console.log(`   Model: ${config.ai.model}`);
            } else {
                console.log('❌ Ollama service: NOT AVAILABLE');
                console.log('   Please start Ollama: ollama serve');
                return false;
            }
        } catch (error) {
            console.log('❌ Ollama service: ERROR');
            console.log(`   ${error.message}`);
            return false;
        }

        // 2. Check K-Wise backend
        try {
            const backendCheck = await testHelpers.apiRequest('/health', 'GET');
            
            if (backendCheck.success) {
                console.log('✅ K-Wise backend: RUNNING');
                console.log(`   API URL: ${testHelpers.baseUrl}`);
            } else {
                console.log('❌ K-Wise backend: NOT AVAILABLE');
                return false;
            }
        } catch (error) {
            console.log('❌ K-Wise backend: ERROR');
            console.log(`   ${error.message}`);
            return false;
        }

        // 3. Check database rules
        try {
            const rulesCheck = await testHelpers.apiRequest('/admin/compatibility/rules/count', 'GET');
            
            if (rulesCheck.success && rulesCheck.data?.count >= config.database.minRulesRequired) {
                console.log(`✅ Compatibility rules: ${rulesCheck.data.count} loaded`);
            } else {
                console.log(`⚠️  Compatibility rules: ${rulesCheck.data?.count || 0} (minimum ${config.database.minRulesRequired} required)`);
            }
        } catch (error) {
            console.log('⚠️  Compatibility rules: Could not verify');
        }

        console.log('\n✅ All prerequisites met. Starting tests...\n');
        return true;
    }

    /**
     * Run all test sections
     */
    async runTests() {
        const sectionsToRun = this.getSectionsToRun();

        for (const sectionNum of sectionsToRun) {
            try {
                console.log(`\n${'='.repeat(60)}`);
                console.log(`STARTING SECTION ${sectionNum}`);
                console.log(`${'='.repeat(60)}\n`);

                const result = await this.runSection(sectionNum);
                this.results.sections.push(result);

                // Check for catastrophic failures
                if (this.options.stopOnCatastrophic) {
                    const catastrophic = this.hasCatastrophicFailures(result);
                    if (catastrophic) {
                        console.log('\n🔴 CATASTROPHIC FAILURE DETECTED - STOPPING ALL TESTS');
                        console.log(`   Section ${sectionNum}: ${catastrophic}`);
                        break;
                    }
                }

            } catch (error) {
                console.error(`\n❌ Section ${sectionNum} failed with error:`, error.message);
                this.results.sections.push({
                    section: sectionNum,
                    error: error.message,
                    stack: error.stack
                });
            }
        }
    }

    /**
     * Get sections to run based on options
     */
    getSectionsToRun() {
        if (this.options.sections === 'all') {
            return [1, 2, 3, '4-6', '7-13']; // All 168 traps implemented
        }

        if (Array.isArray(this.options.sections)) {
            return this.options.sections;
        }

        return [this.options.sections];
    }

    /**
     * Run specific test section
     */
    async runSection(sectionNum) {
        switch (sectionNum) {
            case 1:
                const section1 = new Section1Tests();
                return await section1.runAll();

            case 2:
                const section2 = new Section2Tests();
                return await section2.runAll();

            case 3:
                const section3 = new Section3Tests();
                return await section3.runAll();

            case '4-6':
            case 4:
            case 5:
            case 6:
                const sections46 = new Sections4to6Tests();
                const results46 = await sections46.runAll();
                return results46;

            case '7-13':
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
                const sections713 = new Sections7to13Tests();
                const results713 = await sections713.runAll();
                return results713;

            default:
                throw new Error(`Section ${sectionNum} not implemented yet`);
        }
    }

    /**
     * Check for catastrophic failures
     */
    hasCatastrophicFailures(sectionResult) {
        const allTraps = sectionResult.results?.flatMap(r => r.traps || []) || [];
        const catastrophic = allTraps.find(
            trap => !trap.passed && trap.severity?.level === config.severity.CATASTROPHIC.level
        );

        return catastrophic ? catastrophic.description : null;
    }

    /**
     * Generate comprehensive summary
     */
    generateSummary() {
        const allTraps = this.results.sections.flatMap(
            section => section.results?.flatMap(r => r.traps || []) || []
        );

        const totalTraps = allTraps.length;
        const passedTraps = allTraps.filter(t => t.passed).length;
        const failedTraps = totalTraps - passedTraps;
        const passRate = totalTraps > 0 ? (passedTraps / totalTraps * 100) : 0;

        const severityCounts = {
            catastrophic: allTraps.filter(t => !t.passed && t.severity?.level === 0).length,
            critical: allTraps.filter(t => !t.passed && t.severity?.level === 1).length,
            standard: allTraps.filter(t => !t.passed && t.severity?.level === 2).length,
            minor: allTraps.filter(t => !t.passed && t.severity?.level === 3).length
        };

        const allPerformance = this.results.sections.flatMap(
            section => section.results?.map(r => r.performance).filter(Boolean) || []
        );

        const performanceStats = {
            total: allPerformance.length,
            meetsTarget: allPerformance.filter(p => p.meetsTarget).length,
            meetsMax: allPerformance.filter(p => p.meetsMax).length,
            avgDuration: allPerformance.length > 0
                ? Math.round(allPerformance.reduce((sum, p) => sum + p.duration, 0) / allPerformance.length)
                : 0
        };

        // Calculate overall rating (0-5.0 scale)
        let rating = 0;
        if (severityCounts.catastrophic === 0) {
            rating = (passRate / 100) * 3.0; // Base score from pass rate (max 3.0)
            rating -= Math.min(severityCounts.critical * 0.5, 2.0); // Critical penalty
            rating += (performanceStats.meetsTarget / Math.max(performanceStats.total, 1)) * 2.0; // Performance bonus
            rating = Math.max(0, Math.min(5.0, rating));
        }

        return {
            totalTraps,
            passedTraps,
            failedTraps,
            passRate: Number.parseFloat(passRate.toFixed(1)),
            severityCounts,
            performance: performanceStats,
            rating: Number.parseFloat(rating.toFixed(1)),
            status: this.getOverallStatus(severityCounts, rating),
            sectionsRun: this.results.sections.length,
            duration: Date.now() - this.startTime
        };
    }

    /**
     * Get overall test status
     */
    getOverallStatus(severityCounts, rating) {
        if (severityCounts.catastrophic > 0) return '🔴 CATASTROPHIC_FAILURE';
        if (severityCounts.critical > 0) return '🟠 CRITICAL_FAILURE';
        if (rating >= 4.5) return '🟢 EXCELLENT';
        if (rating >= 3.5) return '🟡 GOOD';
        if (rating >= 2.5) return '🟠 ACCEPTABLE';
        return '🔴 POOR';
    }

    /**
     * Display results summary
     */
    displaySummary() {
        const summary = this.results.summary;

        console.log('\n\n╔═════════════════════════════════════════════════════════╗');
        console.log('║                  TEST RESULTS SUMMARY                   ║');
        console.log('╚═════════════════════════════════════════════════════════╝\n');

        console.log(`📊 Overall Rating: ${summary.rating}/5.0`);
        console.log(`   Status: ${summary.status}`);
        console.log(`   Duration: ${(summary.duration / 1000).toFixed(1)}s\n`);

        console.log(`🎯 Trap Tests:`);
        console.log(`   Total: ${summary.totalTraps}`);
        console.log(`   ✅ Passed: ${summary.passedTraps} (${summary.passRate}%)`);
        console.log(`   ❌ Failed: ${summary.failedTraps}\n`);

        console.log(`🔥 Failure Severity:`);
        console.log(`   🔴 Catastrophic: ${summary.severityCounts.catastrophic}`);
        console.log(`   🟠 Critical: ${summary.severityCounts.critical}`);
        console.log(`   🟡 Standard: ${summary.severityCounts.standard}`);
        console.log(`   ⚪ Minor: ${summary.severityCounts.minor}\n`);

        console.log(`⏱️  Performance:`);
        console.log(`   Tests Run: ${summary.performance.total}`);
        console.log(`   Meets Target: ${summary.performance.meetsTarget} (${(summary.performance.meetsTarget / Math.max(summary.performance.total, 1) * 100).toFixed(1)}%)`);
        console.log(`   Meets Max: ${summary.performance.meetsMax} (${(summary.performance.meetsMax / Math.max(summary.performance.total, 1) * 100).toFixed(1)}%)`);
        console.log(`   Avg Duration: ${summary.performance.avgDuration}ms\n`);

        console.log(`📁 Sections Run: ${summary.sectionsRun}`);

        // Pass/Fail verdict
        if (summary.severityCounts.catastrophic === 0 && summary.severityCounts.critical === 0 && summary.rating >= 4.5) {
            console.log('\n✅ ✅ ✅ ALL TESTS PASSED ✅ ✅ ✅');
            console.log('System meets 5.0/5.0 standard\n');
        } else {
            console.log('\n❌ ❌ ❌ TESTS FAILED ❌ ❌ ❌');
            if (summary.severityCounts.catastrophic > 0) {
                console.log('⚠️  CATASTROPHIC FAILURES DETECTED - IMMEDIATE FIX REQUIRED');
            } else if (summary.severityCounts.critical > 0) {
                console.log('⚠️  CRITICAL FAILURES DETECTED - FIX BEFORE DEPLOYMENT');
            }
            console.log();
        }
    }

    /**
     * Generate and save reports
     */
    async generateReports() {
        if (!this.options.generateReport) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = path.join(__dirname, config.reporting.outputDir);

        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        // 1. JSON Report
        if (config.reporting.generateJson) {
            const jsonPath = path.join(outputDir, `brutal-test-results-${timestamp}.json`);
            await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2));
            console.log(`📄 JSON report saved: ${jsonPath}`);
        }

        // 2. Markdown Report
        if (config.reporting.generateMarkdown) {
            const mdPath = path.join(outputDir, `brutal-test-report-${timestamp}.md`);
            const markdown = this.generateMarkdownReport();
            await fs.writeFile(mdPath, markdown);
            console.log(`📄 Markdown report saved: ${mdPath}`);
        }

        // 3. Summary Text
        if (config.reporting.generateSummary) {
            const txtPath = path.join(outputDir, `brutal-test-summary-${timestamp}.txt`);
            const summary = this.generateTextSummary();
            await fs.writeFile(txtPath, summary);
            console.log(`📄 Summary saved: ${txtPath}`);
        }
    }

    /**
     * Generate markdown report
     */
    generateMarkdownReport() {
        const summary = this.results.summary;

        let md = `# K-WISE BRUTAL STRESS TEST REPORT\n\n`;
        md += `**Date:** ${new Date().toLocaleString()}\n`;
        md += `**Rating:** ${summary.rating}/5.0 ${summary.status}\n`;
        md += `**Duration:** ${(summary.duration / 1000).toFixed(1)}s\n\n`;

        md += `## Executive Summary\n\n`;
        md += `- **Total Trap Tests:** ${summary.totalTraps}\n`;
        md += `- **Passed:** ${summary.passedTraps} (${summary.passRate}%)\n`;
        md += `- **Failed:** ${summary.failedTraps}\n`;
        md += `- **Catastrophic Failures:** ${summary.severityCounts.catastrophic}\n`;
        md += `- **Critical Failures:** ${summary.severityCounts.critical}\n\n`;

        md += `## Test Sections\n\n`;
        for (const section of this.results.sections) {
            md += `### Section ${section.section}: ${section.name}\n\n`;
            md += `- Traps: ${section.summary.passedTraps}/${section.summary.totalTraps} passed (${section.summary.passRate}%)\n\n`;

            if (section.results) {
                for (const result of section.results) {
                    if (result.traps) {
                        md += `#### Test ${result.testSection}\n\n`;
                        for (const trap of result.traps) {
                            const icon = trap.passed ? '✅' : '❌';
                            md += `${icon} **Trap ${trap.trapNumber}:** ${trap.description}\n`;
                            if (!trap.passed) {
                                md += `   - Details: ${trap.details}\n`;
                            }
                        }
                        md += `\n`;
                    }
                }
            }
        }

        md += `## Performance Metrics\n\n`;
        md += `- Average Duration: ${summary.performance.avgDuration}ms\n`;
        md += `- Meets Target: ${summary.performance.meetsTarget}/${summary.performance.total}\n`;
        md += `- Meets Max: ${summary.performance.meetsMax}/${summary.performance.total}\n\n`;

        md += `## Configuration\n\n`;
        md += `\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\`\n`;

        return md;
    }

    /**
     * Generate text summary
     */
    generateTextSummary() {
        const summary = this.results.summary;

        let txt = `K-WISE BRUTAL STRESS TEST - SUMMARY\n`;
        txt += `${'='.repeat(50)}\n\n`;
        txt += `Rating: ${summary.rating}/5.0 ${summary.status}\n`;
        txt += `Pass Rate: ${summary.passRate}%\n`;
        txt += `Duration: ${(summary.duration / 1000).toFixed(1)}s\n\n`;

        txt += `Trap Tests: ${summary.passedTraps}/${summary.totalTraps} passed\n`;
        txt += `Catastrophic: ${summary.severityCounts.catastrophic}\n`;
        txt += `Critical: ${summary.severityCounts.critical}\n`;
        txt += `Standard: ${summary.severityCounts.standard}\n`;
        txt += `Minor: ${summary.severityCounts.minor}\n\n`;

        txt += `Performance: ${summary.performance.meetsTarget}/${summary.performance.total} meet target\n`;
        txt += `Avg Duration: ${summary.performance.avgDuration}ms\n\n`;

        if (summary.severityCounts.catastrophic === 0 && summary.severityCounts.critical === 0 && summary.rating >= 4.5) {
            txt += `✅ ALL TESTS PASSED - SYSTEM READY\n`;
        } else {
            txt += `❌ TESTS FAILED - FIX REQUIRED\n`;
        }

        return txt;
    }

    /**
     * Main run method
     */
    async run() {
        try {
            this.displayBanner();

            // Check prerequisites
            const prereqsOk = await this.checkPrerequisites();
            if (!prereqsOk) {
                console.log('\n❌ Prerequisites not met. Exiting...\n');
                process.exit(1);
            }

            // Run tests
            await this.runTests();

            // Generate summary
            this.results.endTime = new Date().toISOString();
            this.results.duration = Date.now() - this.startTime;
            this.results.summary = this.generateSummary();

            // Display results
            this.displaySummary();

            // Generate reports
            await this.generateReports();

            // Exit with appropriate code
            const exitCode = this.results.summary.severityCounts.catastrophic > 0 ? 1 :
                             this.results.summary.severityCounts.critical > 0 ? 1 :
                             this.results.summary.rating < 4.5 ? 1 : 0;

            process.exit(exitCode);

        } catch (error) {
            console.error('\n❌ Test runner failed:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// CLI Entry Point
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        sections: 'all',
        verbose: args.includes('--verbose'),
        aiDebug: args.includes('--ai-debug'),
        stopOnCatastrophic: !args.includes('--no-stop'),
        generateReport: !args.includes('--no-report')
    };

    // Parse --section flag
    const sectionIndex = args.indexOf('--section');
    if (sectionIndex >= 0 && args[sectionIndex + 1]) {
        const sectionArg = args[sectionIndex + 1];
        options.sections = sectionArg.includes(',') 
            ? sectionArg.split(',').map(s => Number.parseInt(s.trim(), 10))
            : Number.parseInt(sectionArg, 10);
    }

    const runner = new BrutalTestRunner(options);
    runner.run();
}

module.exports = BrutalTestRunner;

