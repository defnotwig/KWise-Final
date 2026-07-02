const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'stress', new Date().toISOString().slice(0, 10));
const BASE_URL = process.env.SECURITY_STRESS_BASE_URL || 'http://localhost:5000/api';
const MAX_P95_MS = Number.parseInt(process.env.SECURITY_STRESS_MAX_P95_MS || '1000', 10);
const START_TIMEOUT_MS = Number.parseInt(process.env.SECURITY_STRESS_START_TIMEOUT_MS || '30000', 10);
const AUTOSTART = process.env.SECURITY_STRESS_AUTOSTART !== 'false';

const probes = [
    {
        name: 'health does not expose AI enabled',
        method: 'GET',
        path: '/health',
        expectStatus: [200],
        assert: async (response) => {
            const text = await response.text();
            if (/\"aiEnabled\"\s*:\s*true/i.test(text)) {
                throw new Error('health reports aiEnabled true');
            }
        }
    },
    {
        name: 'compatibility rejects oversized malformed JSON',
        method: 'POST',
        path: '/compatibility/batch',
        body: '{'.repeat(1024),
        headers: { 'Content-Type': 'application/json' },
        expectStatus: [400, 413, 422]
    },
    {
        name: 'admin settings export is not public',
        method: 'GET',
        path: '/settings/export',
        expectStatus: [401, 403, 404]
    },
    {
        name: 'admin metrics are not public',
        method: 'GET',
        path: '/system-metrics',
        expectStatus: [401, 403, 404]
    },
    {
        name: 'SQL injection sort probe is rejected or safely ignored',
        method: 'GET',
        path: "/stock?sort=name;DROP%20TABLE%20users;--&limit=10000",
        expectStatus: [200, 400, 401, 403, 404]
    }
];

function percentile(values, percent) {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.ceil((percent / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

async function runProbe(probe) {
    const startedAt = performance.now();
    const response = await fetch(`${BASE_URL}${probe.path}`, {
        method: probe.method,
        headers: probe.headers,
        body: probe.body
    });
    const elapsedMs = performance.now() - startedAt;
    const failures = [];

    if (!probe.expectStatus.includes(response.status)) {
        failures.push(`expected status ${probe.expectStatus.join('/')}, got ${response.status}`);
    }

    if (probe.assert) {
        try {
            await probe.assert(response);
        } catch (error) {
            failures.push(error.message);
        }
    }

    return {
        name: probe.name,
        status: response.status,
        elapsedMs: Number(elapsedMs.toFixed(3)),
        passed: failures.length === 0,
        failures
    };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isApiAvailable() {
    try {
        const response = await fetch(`${BASE_URL}/health`);
        return response.status >= 200 && response.status < 500;
    } catch {
        return false;
    }
}

function getPortFromBaseUrl() {
    try {
        return new URL(BASE_URL).port || '5000';
    } catch {
        return '5000';
    }
}

async function startBackendIfNeeded() {
    if (await isApiAvailable()) {
        return null;
    }

    if (!AUTOSTART) {
        throw new Error(`API is unavailable at ${BASE_URL}; start the backend or enable SECURITY_STRESS_AUTOSTART.`);
    }

    const child = spawn(process.execPath, ['--no-compilation-cache', 'server.js'], {
        cwd: BACKEND,
        env: {
            ...process.env,
            PORT: getPortFromBaseUrl()
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });
    const logs = [];
    const collectLog = (chunk) => {
        logs.push(chunk.toString());
        while (logs.length > 80) logs.shift();
    };
    child.stdout.on('data', collectLog);
    child.stderr.on('data', collectLog);

    const startedAt = Date.now();
    while (Date.now() - startedAt < START_TIMEOUT_MS) {
        if (child.exitCode !== null) {
            throw new Error(`Backend exited before security stress could start. Logs:\n${logs.join('')}`);
        }

        if (await isApiAvailable()) {
            return child;
        }

        await sleep(500);
    }

    child.kill();
    throw new Error(`Timed out waiting for ${BASE_URL}/health. Logs:\n${logs.join('')}`);
}

function stopBackend(child) {
    if (!child || child.exitCode !== null) return;
    child.kill();
}

async function main() {
    const managedBackend = await startBackendIfNeeded();
    const results = [];
    try {
        for (const probe of probes) {
            results.push(await runProbe(probe));
        }
    } finally {
        stopBackend(managedBackend);
    }

    const samples = results.map((entry) => entry.elapsedMs);
    const p95Ms = Number(percentile(samples, 95).toFixed(3));
    const failures = results
        .filter((entry) => !entry.passed)
        .flatMap((entry) => entry.failures.map((failure) => `${entry.name}: ${failure}`));

    if (p95Ms > MAX_P95_MS) {
        failures.push(`security probe p95 ${p95Ms}ms exceeds ${MAX_P95_MS}ms`);
    }

    const report = {
        generatedAt: new Date().toISOString(),
        mode: 'public_abuse_probe',
        baseUrl: BASE_URL,
        thresholds: { p95Ms: MAX_P95_MS },
        p95Ms,
        passed: failures.length === 0,
        failures,
        probes: results
    };

    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORT_DIR, 'security-stress.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(REPORT_DIR, 'security-stress.md'), [
        '# Security Stress Report',
        '',
        `Generated: ${report.generatedAt}`,
        `Passed: ${report.passed}`,
        `Base URL: ${BASE_URL}`,
        `p95: ${p95Ms}ms`,
        '',
        '## Probes',
        ...results.map((entry) => `- ${entry.name}: ${entry.status}, ${entry.elapsedMs}ms, passed=${entry.passed}`),
        '',
        '## Failures',
        ...(failures.length ? failures.map((entry) => `- ${entry}`) : ['- None'])
    ].join('\n'));

    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
    console.error(JSON.stringify({ success: false, message: error.message }, null, 2));
    process.exit(1);
});
