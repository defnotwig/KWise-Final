const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'stress', new Date().toISOString().slice(0, 10));
const FRONTEND_URL = process.env.KIOSK_STRESS_FRONTEND_URL || 'http://localhost:3000';
const ITERATIONS = Number.parseInt(process.env.KIOSK_STRESS_ITERATIONS || '3', 10);
const MAX_ROUTE_P95_MS = Number.parseInt(process.env.KIOSK_STRESS_MAX_ROUTE_P95_MS || '2000', 10);
const ROUTES = [
    '/pc-parts',
    '/pc-customized',
    '/prebuilt-options',
    '/pc-checkup',
    '/pc-upgrade',
    '/pc-cleaning-assessment'
];

function findBrowserExecutable() {
    if (process.env.KIOSK_STRESS_BROWSER) return process.env.KIOSK_STRESS_BROWSER;

    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];

    return candidates.find((candidate) => fs.existsSync(candidate));
}

function percentile(values, percent) {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.ceil((percent / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

async function assertFrontendReachable() {
    const response = await fetch(FRONTEND_URL);
    if (!response.ok) {
        throw new Error(`Frontend ${FRONTEND_URL} returned ${response.status}`);
    }
}

async function runRoute(page, route) {
    const consoleErrors = [];
    const badRequests = [];
    const startedAt = performance.now();

    const consoleHandler = (message) => {
        const text = message.text();
        if (message.type() === 'error' && !/favicon/i.test(text)) {
            consoleErrors.push(text);
        }
    };
    const requestFailedHandler = (request) => {
        const url = request.url();
        if (!/sockjs-node|hot-update|favicon/i.test(url)) {
            badRequests.push(`${url}: ${request.failure()?.errorText || 'failed'}`);
        }
    };

    page.on('console', consoleHandler);
    page.on('requestfailed', requestFailedHandler);

    await page.goto(`${FRONTEND_URL}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
    const elapsedMs = performance.now() - startedAt;
    const pageState = await page.evaluate(() => ({
        hasRootContent: Boolean(document.querySelector('#root')?.textContent?.trim()),
        hasRuntimeOverlay: Boolean(document.querySelector('iframe#webpack-dev-server-client-overlay, [data-vite-error-overlay]')),
        badStaticMediaRewrite: [...document.images].some((image) => image.src.includes('localhost:5000/static/media'))
    }));

    page.off('console', consoleHandler);
    page.off('requestfailed', requestFailedHandler);

    const failures = [];
    if (!pageState.hasRootContent) failures.push('root content is blank');
    if (pageState.hasRuntimeOverlay) failures.push('runtime error overlay visible');
    if (pageState.badStaticMediaRewrite) failures.push('frontend static media was rewritten to backend host');
    if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
    if (badRequests.length) failures.push(`failed requests: ${badRequests.slice(0, 3).join(' | ')}`);

    return {
        route,
        elapsedMs: Number(elapsedMs.toFixed(3)),
        passed: failures.length === 0,
        failures
    };
}

async function main() {
    const browserPath = findBrowserExecutable();
    if (!browserPath) {
        throw new Error('No Chrome/Edge executable found. Set KIOSK_STRESS_BROWSER to run kiosk route stress.');
    }

    await assertFrontendReachable();

    const browser = await puppeteer.launch({
        executablePath: browserPath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results = [];
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

        for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
            for (const route of ROUTES) {
                results.push({
                    iteration: iteration + 1,
                    ...(await runRoute(page, route))
                });
            }
        }
    } finally {
        await browser.close();
    }

    const samples = results.map((entry) => entry.elapsedMs);
    const p95Ms = Number(percentile(samples, 95).toFixed(3));
    const failures = results
        .filter((entry) => !entry.passed)
        .flatMap((entry) => entry.failures.map((failure) => `${entry.route}: ${failure}`));
    if (p95Ms > MAX_ROUTE_P95_MS) {
        failures.push(`route p95 ${p95Ms}ms exceeds ${MAX_ROUTE_P95_MS}ms`);
    }

    const report = {
        generatedAt: new Date().toISOString(),
        mode: 'kiosk_browser_route_stress',
        frontendUrl: FRONTEND_URL,
        iterations: ITERATIONS,
        thresholds: { routeP95Ms: MAX_ROUTE_P95_MS },
        p95Ms,
        passed: failures.length === 0,
        failures,
        routes: results
    };

    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORT_DIR, 'kiosk-route-stress.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(REPORT_DIR, 'kiosk-route-stress.md'), [
        '# Kiosk Route Stress Report',
        '',
        `Generated: ${report.generatedAt}`,
        `Passed: ${report.passed}`,
        `Frontend URL: ${FRONTEND_URL}`,
        `p95: ${p95Ms}ms`,
        '',
        '## Routes',
        ...results.map((entry) => `- ${entry.route} #${entry.iteration}: ${entry.elapsedMs}ms, passed=${entry.passed}`),
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
