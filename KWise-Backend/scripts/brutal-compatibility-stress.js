const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { deterministicCompatibilityService } = require('../services/deterministicCompatibilityService');

const REPORT_DIR = path.resolve(__dirname, '..', '..', 'reports', 'stress', new Date().toISOString().slice(0, 10));
const ITERATIONS = Number.parseInt(process.env.COMPAT_STRESS_ITERATIONS || '10', 10);
const BATCH_SIZE = Number.parseInt(process.env.COMPAT_STRESS_BATCH_SIZE || '500', 10);
const MAX_BATCH_P95_MS = Number.parseInt(process.env.COMPAT_STRESS_MAX_BATCH_P95_MS || '500', 10);

function component(id, category, name, specifications = {}) {
    return { id, category, name, specifications };
}

const baseBuild = [
    component('cpu-am5', 'CPU', 'AMD Ryzen 7 7800X3D', { socket: 'AM5', tdp: '120W', memory_type: 'DDR5', max_ram: '128GB' }),
    component('mb-am5', 'Motherboard', 'B650 ATX DDR5 Board', {
        socket: 'AM5',
        memory_type: 'DDR5',
        form_factor: 'ATX',
        ram_slots: 4,
        max_ram: '128GB',
        m2_slots: 2,
        sata_ports: 4
    }),
    component('ram-ddr5', 'RAM', '32GB DDR5 Kit', { memory_type: 'DDR5', total_capacity_gb: 32, sticks_count: 2 }),
    component('gpu-good', 'GPU', 'RTX 4070 2 Slot', { length_mm: 260, slot_width: 2, tdp: 200, power_connectors_required: '1x 8-pin' }),
    component('psu-good', 'PSU', '750W ATX Gold PSU', { wattage: 750, form_factor: 'ATX', pcie_connectors: '2x 8-pin', power_connectors: '2x 8-pin' }),
    component('case-good', 'Case', 'ATX Airflow Case', {
        supported_form_factors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
        max_gpu_length_mm: 340,
        max_cooler_height_mm: 165,
        psu_form_factors_supported: ['ATX'],
        drive_bays_25: 2,
        drive_bays_35: 2
    }),
    component('cooler-good', 'Cooling', 'AM5 Tower Cooler', { compatible_sockets: ['AM5', 'AM4'], height_mm: 155, tdp_rating: 180 }),
    component('storage-good', 'Storage', '1TB NVMe SSD', { form_factor: 'M.2', interface: 'NVMe' })
];

const trapCases = [
    {
        name: 'CPU socket mismatch hard fails',
        parts: [baseBuild[1], component('cpu-lga1700', 'CPU', 'Intel Core i7 LGA1700', { socket: 'LGA1700', tdp: 125 })],
        expectCompatible: false,
        expectRule: /socket/i
    },
    {
        name: 'DDR generation mismatch hard fails',
        parts: [baseBuild[1], component('ram-ddr4', 'RAM', '32GB DDR4 Kit', { memory_type: 'DDR4', total_capacity_gb: 32, sticks_count: 2 })],
        expectCompatible: false,
        expectRule: /memory|ram|ddr/i
    },
    {
        name: 'RAM slot overflow hard fails',
        parts: [baseBuild[1], component('ram-8stick', 'RAM', '128GB DDR5 8 Stick Kit', { memory_type: 'DDR5', total_capacity_gb: 128, sticks_count: 8 })],
        expectCompatible: false,
        expectRule: /slot|ram/i
    },
    {
        name: 'GPU length overflow hard fails',
        parts: [baseBuild[5], component('gpu-long', 'GPU', 'Oversized GPU', { length_mm: 390, slot_width: 3, tdp: 320 })],
        expectCompatible: false,
        expectRule: /length|gpu/i
    },
    {
        name: 'Cooler height overflow hard fails',
        parts: [baseBuild[5], component('cooler-tall', 'Cooling', 'Tall Tower Cooler', { compatible_sockets: ['AM5'], height_mm: 190, tdp_rating: 220 })],
        expectCompatible: false,
        expectRule: /height|cooler/i
    },
    {
        name: 'Cooler socket mismatch hard fails',
        parts: [baseBuild[0], component('cooler-lga', 'Cooling', 'Intel Only Cooler', { compatible_sockets: ['LGA1700'], height_mm: 140, tdp_rating: 180 })],
        expectCompatible: false,
        expectRule: /socket|cooler/i
    },
    {
        name: 'PSU wattage shortage hard fails',
        parts: [baseBuild[0], baseBuild[3], component('psu-low', 'PSU', '300W PSU', { wattage: 300, form_factor: 'ATX', pcie_connectors: '1x 8-pin' })],
        expectCompatible: false,
        expectRule: /power|psu|watt/i
    },
    {
        name: 'PSU connector shortage hard fails',
        parts: [component('gpu-2x8', 'GPU', 'GPU Needs Two 8 Pin', { tdp: 300, power_connectors_required: '2x 8-pin' }), component('psu-1x8', 'PSU', 'PSU One 8 Pin', { wattage: 850, pcie_connectors: '1x 8-pin' })],
        expectCompatible: false,
        expectRule: /connector|pin|power/i
    },
    {
        name: 'Case form factor mismatch hard fails',
        parts: [baseBuild[1], component('case-itx', 'Case', 'Mini ITX Only Case', { supported_form_factors: ['Mini-ITX'], max_gpu_length_mm: 300 })],
        expectCompatible: false,
        expectRule: /form|factor|case/i
    },
    {
        name: 'Missing critical GPU length produces manual check',
        parts: [baseBuild[5], component('gpu-unknown-length', 'GPU', 'Unknown Length GPU', { tdp: 220, power_connectors_required: '1x 8-pin' })],
        expectManualCheck: true,
        expectRule: /length|missing|manual/i
    },
    {
        name: 'Known good complete build passes',
        parts: baseBuild,
        expectCompatible: true
    }
];

function percentile(values, percent) {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.ceil((percent / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function collectMessages(result) {
    return [
        ...(result.problems || []),
        ...(result.warnings || []),
        ...(result.manualChecks || []),
        ...(result.notes || [])
    ].map((entry) => `${entry.rule || ''} ${entry.message || ''}`);
}

function assertCase(testCase) {
    const startedAt = performance.now();
    const result = deterministicCompatibilityService.analyzeBuild(testCase.parts);
    const elapsedMs = performance.now() - startedAt;
    const messages = collectMessages(result);
    const failed = [];

    if (typeof testCase.expectCompatible === 'boolean' && result.compatible !== testCase.expectCompatible) {
        failed.push(`expected compatible=${testCase.expectCompatible}, got ${result.compatible}`);
    }

    if (testCase.expectManualCheck && !(result.manualChecks || []).length && !(result.missingSpecs || []).length) {
        failed.push('expected manual check or missing spec warning');
    }

    if (testCase.expectRule && !messages.some((message) => testCase.expectRule.test(message))) {
        failed.push(`expected rule/message matching ${testCase.expectRule}`);
    }

    return {
        name: testCase.name,
        passed: failed.length === 0,
        failed,
        compatible: result.compatible,
        score: result.score,
        verdict: result.verdict,
        elapsedMs: Number(elapsedMs.toFixed(3)),
        messages
    };
}

function buildBatchCandidates() {
    const categories = ['CPU', 'Motherboard', 'RAM', 'GPU', 'PSU', 'Case', 'Cooling', 'Storage'];
    const candidates = [];
    for (let index = 0; index < BATCH_SIZE; index += 1) {
        const category = categories[index % categories.length];
        candidates.push(component(`candidate-${index}`, category, `Synthetic ${category} ${index}`, {
            socket: category === 'CPU' || category === 'Motherboard' ? 'AM5' : undefined,
            memory_type: category === 'RAM' || category === 'Motherboard' ? 'DDR5' : undefined,
            form_factor: category === 'Motherboard' || category === 'PSU' ? 'ATX' : undefined,
            supported_form_factors: category === 'Case' ? ['ATX', 'Micro-ATX', 'Mini-ITX'] : undefined,
            max_gpu_length_mm: category === 'Case' ? 340 : undefined,
            max_cooler_height_mm: category === 'Case' ? 165 : undefined,
            length_mm: category === 'GPU' ? 260 + (index % 20) : undefined,
            height_mm: category === 'Cooling' ? 150 : undefined,
            compatible_sockets: category === 'Cooling' ? ['AM5', 'AM4'] : undefined,
            tdp: category === 'CPU' || category === 'GPU' ? 120 + (index % 80) : undefined,
            wattage: category === 'PSU' ? 750 : undefined,
            pcie_connectors: category === 'PSU' ? '2x 8-pin' : undefined,
            power_connectors_required: category === 'GPU' ? '1x 8-pin' : undefined
        }));
    }
    return candidates;
}

function runBatchStress() {
    const candidates = buildBatchCandidates();
    const samples = [];
    const warmupResults = deterministicCompatibilityService.analyzeBatch(baseBuild, candidates);
    if (!Array.isArray(warmupResults) || warmupResults.length !== BATCH_SIZE) {
        throw new Error(`Batch warmup returned ${warmupResults?.length || 0} results`);
    }

    for (let index = 0; index < ITERATIONS; index += 1) {
        const startedAt = performance.now();
        const results = deterministicCompatibilityService.analyzeBatch(baseBuild, candidates);
        samples.push(performance.now() - startedAt);
        if (!Array.isArray(results) || results.length !== BATCH_SIZE) {
            throw new Error(`Batch iteration ${index + 1} returned ${results?.length || 0} results`);
        }
    }

    return {
        iterations: ITERATIONS,
        batchSize: BATCH_SIZE,
        p50Ms: Number(percentile(samples, 50).toFixed(3)),
        p95Ms: Number(percentile(samples, 95).toFixed(3)),
        p99Ms: Number(percentile(samples, 99).toFixed(3)),
        maxMs: Number(Math.max(...samples).toFixed(3))
    };
}

function writeReport(report) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORT_DIR, 'compatibility-stress.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(REPORT_DIR, 'compatibility-stress.md'), [
        '# Compatibility Stress Report',
        '',
        `Generated: ${report.generatedAt}`,
        `Passed: ${report.passed}`,
        `Batch p95: ${report.batch.p95Ms}ms`,
        `Trap cases: ${report.traps.filter((entry) => entry.passed).length}/${report.traps.length}`,
        '',
        '## Failures',
        ...report.traps
            .filter((entry) => !entry.passed)
            .map((entry) => `- ${entry.name}: ${entry.failed.join('; ')}`)
    ].join('\n'));
}

function main() {
    const traps = trapCases.map(assertCase);
    const batch = runBatchStress();
    const passed = traps.every((entry) => entry.passed) && batch.p95Ms <= MAX_BATCH_P95_MS;
    const report = {
        generatedAt: new Date().toISOString(),
        mode: 'offline_deterministic_kiosk',
        engine: 'deterministic',
        aiEnabled: false,
        thresholds: {
            batchP95Ms: MAX_BATCH_P95_MS
        },
        passed,
        traps,
        batch
    };

    writeReport(report);
    console.log(JSON.stringify(report, null, 2));

    if (!passed) {
        process.exitCode = 1;
    }
}

main();
