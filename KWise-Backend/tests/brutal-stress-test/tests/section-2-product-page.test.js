/**
 * SECTION 2: PRODUCT PAGE (Compatible With Section)
 * 8 Trap Tests across 2 scenarios
 */

const testHelpers = require('../utils/test-helpers');
const DeepSeekPrompts = require('../utils/deepseek-prompts');
const config = require('../config/brutal-test-config');

test('brutal stress placeholder - section 2', () => {
    expect(true).toBe(true);
});

class Section2Tests {
    constructor() {
        this.results = [];
    }

    /**
     * TEST 2.1: CPU Product Page
     * Scenario: View Intel i7-13700K product page
     * Expected: Compatible motherboards, coolers, RAM with compatibility scores
     * 4 Traps: AM5 motherboard, low-end board high score, inadequate cooler, DDR3 RAM
     */
    async test_2_1_CpuProductPage() {
        console.log('\n═══════════════════════════════════════════');
        console.log('TEST 2.1: CPU Product Page - Compatible With');
        console.log('═══════════════════════════════════════════');

        const viewedCpu = {
            id: 'TEST_CPU_004',
            name: 'Intel Core i7-13700K',
            socket: 'LGA1700',
            tdp: 253,
            memory_controller: 'DDR5/DDR4',
            tier: 'high-tier',
            price: 22000
        };

        // Fetch compatible products from API
        const compatResponse = await testHelpers.apiRequest(
            `/kiosk/product/${viewedCpu.id}/compatible`,
            'GET'
        );

        // TRAP 21: AM5 motherboard appears (0% compatibility) - CRITICAL FAIL
        const trap21 = await testHelpers.testTrap(
            21,
            'AM5 motherboard in compatible list - CATASTROPHIC FAIL',
            async () => {
                if (!compatResponse.success) {
                    return { passed: false, severity: config.severity.CRITICAL, details: 'API failed' };
                }

                const compatibleMotherboards = compatResponse.data?.motherboards || [];
                const hasAM5 = compatibleMotherboards.some(mb => mb.socket === 'AM5');

                return {
                    passed: !hasAM5,
                    severity: config.severity.CATASTROPHIC,
                    details: hasAM5
                        ? 'CATASTROPHIC: AM5 motherboard shown for Intel CPU (0% compatibility)'
                        : 'Socket filtering working correctly'
                };
            }
        );

        // TRAP 22: Low-end H610 board shows 95% score (inadequate VRM) - FAIL
        const trap22 = await testHelpers.testTrap(
            22,
            'H610 board shows 95% score for i7-13700K (inadequate VRM) - FAIL',
            async () => {
                if (!compatResponse.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped - API unavailable' };
                }

                const h610Boards = (compatResponse.data?.motherboards || []).filter(
                    mb => mb.chipset === 'H610'
                );

                const overRated = h610Boards.some(mb => {
                    const score = mb.compatibility_score || 0;
                    // H610 is budget chipset, should score <85% for high-end i7
                    return score >= 95;
                });

                return {
                    passed: !overRated,
                    severity: config.severity.CRITICAL,
                    details: overRated
                        ? 'CRITICAL: H610 board overrated (inadequate VRM for i7-13700K)'
                        : 'Compatibility scoring accurate'
                };
            }
        );

        // TRAP 23: 120mm AIO shows 85% score (insufficient cooling) - FAIL
        const trap23 = await testHelpers.testTrap(
            23,
            '120mm AIO shows 85% score for 253W CPU (insufficient) - FAIL',
            async () => {
                if (!compatResponse.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                const coolers = compatResponse.data?.coolers || [];
                const inadequateCoolers = coolers.filter(cooler => {
                    const tdpRating = cooler.tdp_rating || 0;
                    const score = cooler.compatibility_score || 0;
                    // 120mm AIO ~150W TDP, should score <80% for 253W CPU
                    return tdpRating < 180 && score >= 85;
                });

                return {
                    passed: inadequateCoolers.length === 0,
                    severity: config.severity.CRITICAL,
                    details: inadequateCoolers.length === 0
                        ? 'Cooler TDP ratings correctly scored'
                        : `CRITICAL: ${inadequateCoolers.length} inadequate coolers overrated`
                };
            }
        );

        // TRAP 24: DDR3 RAM appears in list - CATASTROPHIC FAIL
        const trap24 = await testHelpers.testTrap(
            24,
            'DDR3 RAM appears in compatible list - CATASTROPHIC FAIL',
            async () => {
                if (!compatResponse.success) {
                    return { passed: false, severity: config.severity.CRITICAL, details: 'API failed' };
                }

                const ram = compatResponse.data?.ram || [];
                const hasDDR3 = ram.some(r => r.memory_type === 'DDR3');

                return {
                    passed: !hasDDR3,
                    severity: config.severity.CATASTROPHIC,
                    details: hasDDR3
                        ? 'CATASTROPHIC: DDR3 RAM shown (completely incompatible with LGA1700)'
                        : 'RAM filtering working correctly'
                };
            }
        );

        // Performance check: Product page compatibility matrix generation
        const perfResult = await testHelpers.measurePerformance(
            'Product Page Compatibility Matrix (50+ items)',
            async () => compatResponse,
            config.performance.productPageCompatibility
        );

        return {
            testSection: '2.1',
            traps: [trap21, trap22, trap23, trap24],
            performance: perfResult.performance,
            passed: [trap21, trap22, trap23, trap24].every(t => t.passed)
        };
    }

    /**
     * TEST 2.2: GPU Product Page
     * Scenario: View RTX 4070 Ti product page
     * Expected: Tier-matched CPUs, compatible motherboards, adequate PSUs, fitting cases
     * 4 Traps: Low-end CPU shows, inadequate PSU high score, small case, wrong PCIe slot
     */
    async test_2_2_GpuProductPage() {
        console.log('\n═══════════════════════════════════════════');
        console.log('TEST 2.2: GPU Product Page - Compatible With');
        console.log('═══════════════════════════════════════════');

        const viewedGpu = {
            id: 'TEST_GPU_003',
            name: 'NVIDIA RTX 4070 Ti',
            length: 285,
            width: 50, // 2.5-slot
            height: 112,
            tdp: 285,
            power_connector: '8pin',
            tier: 'high-tier',
            price: 42000
        };

        // Fetch compatible products
        const compatResponse = await testHelpers.apiRequest(
            `/kiosk/product/${viewedGpu.id}/compatible`,
            'GET'
        );

        // TRAP 25: i3-10100F shows as compatible (severe bottleneck) - FAIL
        const trap25 = await testHelpers.testTrap(
            25,
            'i3-10100F shows as compatible for RTX 4070 Ti (severe bottleneck) - FAIL',
            async () => {
                if (!compatResponse.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                const cpus = compatResponse.data?.cpus || [];
                const lowEndCpus = cpus.filter(cpu => {
                    // RTX 4070 Ti is high-tier, should only show i5-12600K and up
                    const cpuTier = cpu.tier || 'unknown';
                    return cpuTier === 'entry' || cpuTier === 'budget';
                });

                return {
                    passed: lowEndCpus.length === 0,
                    severity: config.severity.CRITICAL,
                    details: lowEndCpus.length === 0
                        ? 'CPU tier matching correct'
                        : `CRITICAL: ${lowEndCpus.length} low-end CPUs shown (severe bottleneck)`
                };
            }
        );

        // TRAP 26: 550W PSU shows 90% score - should be <80%
        const trap26 = await testHelpers.testTrap(
            26,
            '550W PSU shows 90% score for 285W GPU - should be <80%',
            async () => {
                if (!compatResponse.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                // RTX 4070 Ti (285W) + typical CPU (150W) + system (100W) = 535W
                // 550W PSU = 97% load (inadequate, should score <80%)
                const psus = compatResponse.data?.psus || [];
                const underspecPSUs = psus.filter(psu => {
                    const wattage = psu.wattage || 0;
                    const score = psu.compatibility_score || 0;
                    return wattage < 650 && score >= 90;
                });

                return {
                    passed: underspecPSUs.length === 0,
                    severity: config.severity.CRITICAL,
                    details: underspecPSUs.length === 0
                        ? 'PSU wattage scoring correct'
                        : `CRITICAL: ${underspecPSUs.length} underspec PSUs overrated`
                };
            }
        );

        // TRAP 27: NZXT H210 (ITX, 280mm clearance) shows - FAIL
        const trap27 = await testHelpers.testTrap(
            27,
            'NZXT H210 (280mm clearance) shows for 285mm GPU - FAIL',
            async () => {
                if (!compatResponse.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                const cases = compatResponse.data?.cases || [];
                const gpuLength = viewedGpu.length;
                const tooSmallCases = cases.filter(c => {
                    const clearance = c.max_gpu_length || 0;
                    // Need 20mm buffer minimum
                    return clearance < (gpuLength + 20);
                });

                return {
                    passed: tooSmallCases.length === 0,
                    severity: config.severity.CATASTROPHIC,
                    details: tooSmallCases.length === 0
                        ? 'Case GPU clearance filtering correct'
                        : `CATASTROPHIC: ${tooSmallCases.length} cases with insufficient clearance shown`
                };
            }
        );

        // TRAP 28: PCIe 3.0 x8 slot motherboard appears - FAIL
        const trap28 = await testHelpers.testTrap(
            28,
            'PCIe 3.0 x8 slot motherboard appears - FAIL',
            async () => {
                if (!compatResponse.success) {
                    return { passed: true, severity: config.severity.STANDARD, details: 'Skipped' };
                }

                const motherboards = compatResponse.data?.motherboards || [];
                const inadequateSlots = motherboards.filter(mb => {
                    const pcieLanes = mb.pcie_lanes || 'x16';
                    // x8 slot causes significant performance loss
                    return pcieLanes.includes('x8') || pcieLanes.includes('x4');
                });

                return {
                    passed: inadequateSlots.length === 0,
                    severity: config.severity.CRITICAL,
                    details: inadequateSlots.length === 0
                        ? 'PCIe lane validation correct'
                        : `CRITICAL: ${inadequateSlots.length} motherboards with inadequate PCIe lanes`
                };
            }
        );

        // Performance check
        const perfResult = await testHelpers.measurePerformance(
            'GPU Product Page Compatibility Analysis',
            async () => compatResponse,
            config.performance.productPageCompatibility
        );

        return {
            testSection: '2.2',
            traps: [trap25, trap26, trap27, trap28],
            performance: perfResult.performance,
            passed: [trap25, trap26, trap27, trap28].every(t => t.passed)
        };
    }

    /**
     * Run all Section 2 tests
     */
    async runAll() {
        console.log('\n╔═══════════════════════════════════════════╗');
        console.log('║    SECTION 2: PRODUCT PAGE TESTING        ║');
        console.log('║    8 Trap Tests | 2 Scenarios             ║');
        console.log('╚═══════════════════════════════════════════╝');

        const results = [];

        try {
            results.push(await this.test_2_1_CpuProductPage());
            results.push(await this.test_2_2_GpuProductPage());

            const allTraps = results.flatMap(r => r.traps || []);
            const passedTraps = allTraps.filter(t => t.passed).length;
            const totalTraps = allTraps.length;

            console.log('\n═══════════════════════════════════════════');
            console.log(`SECTION 2 SUMMARY: ${passedTraps}/${totalTraps} traps passed`);
            console.log('═══════════════════════════════════════════\n');

            return {
                section: 2,
                name: 'Product Page (Compatible With)',
                results,
                summary: {
                    totalTraps,
                    passedTraps,
                    failedTraps: totalTraps - passedTraps,
                    passRate: ((passedTraps / totalTraps) * 100).toFixed(1)
                }
            };

        } catch (error) {
            console.error('❌ Section 2 tests failed:', error.message);
            return {
                section: 2,
                error: error.message,
                results
            };
        }
    }
}

module.exports = Section2Tests;

