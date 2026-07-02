const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const db = require('../config/db');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'stress', new Date().toISOString().slice(0, 10));
const ITERATIONS = Number.parseInt(process.env.DB_STRESS_ITERATIONS || '25', 10);
const MAX_QUERY_P95_MS = Number.parseInt(process.env.DB_STRESS_MAX_QUERY_P95_MS || '500', 10);

const queries = [
    {
        name: 'active kiosk parts by category',
        sql: `
            SELECT id, name, category, price, stock, specifications
            FROM pc_parts
            WHERE category = $1 AND is_active = true AND kiosk_visible = true
            ORDER BY name
            LIMIT $2
        `,
        params: ['GPU', 100]
    },
    {
        name: 'on sale products',
        sql: `
            SELECT id, name, category, price, sale_price, specifications
            FROM pc_parts
            WHERE is_active = true AND kiosk_visible = true AND on_sale = true
            ORDER BY updated_at DESC NULLS LAST, name
            LIMIT $1
        `,
        params: [100]
    },
    {
        name: 'compatibility rules enabled lookup',
        sql: `
            SELECT
                COUNT(*)::int AS total_rules,
                COUNT(*) FILTER (WHERE enabled = true)::int AS enabled_rules
            FROM compatibility_rules
        `,
        params: []
    },
    {
        name: 'spec key inventory',
        sql: `
            SELECT category, key, COUNT(*)::int AS count
            FROM pc_parts, jsonb_object_keys(COALESCE(specifications, '{}'::jsonb)) AS key
            WHERE category IN ('CPU', 'Motherboard', 'RAM', 'GPU', 'PSU', 'Case', 'Cooling', 'Storage')
            GROUP BY category, key
            ORDER BY category, count DESC, key
            LIMIT $1
        `,
        params: [500]
    }
];

function percentile(values, percent) {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.ceil((percent / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

async function measure(queryDef) {
    const samples = [];
    let rows = 0;

    for (let index = 0; index < ITERATIONS; index += 1) {
        const startedAt = performance.now();
        const result = await db.query(queryDef.sql, queryDef.params);
        samples.push(performance.now() - startedAt);
        rows = result.rows.length;
    }

    return {
        name: queryDef.name,
        rows,
        p50Ms: Number(percentile(samples, 50).toFixed(3)),
        p95Ms: Number(percentile(samples, 95).toFixed(3)),
        p99Ms: Number(percentile(samples, 99).toFixed(3)),
        maxMs: Number(Math.max(...samples).toFixed(3))
    };
}

async function main() {
    const poolOptions = db.pool?.options || {};
    const queryResults = [];

    for (const queryDef of queries) {
        queryResults.push(await measure(queryDef));
    }

    const failures = [];
    if (process.env.LOAD_TEST_MODE === 'true') {
        failures.push('LOAD_TEST_MODE is true; production kiosk DB stress must run with normal pool sizing.');
    }
    if ((poolOptions.max || 0) > 60) {
        failures.push(`DB pool max is ${poolOptions.max}; expected kiosk-safe max <= 60 outside load test mode.`);
    }

    for (const result of queryResults) {
        if (result.p95Ms > MAX_QUERY_P95_MS) {
            failures.push(`${result.name} p95 ${result.p95Ms}ms exceeds ${MAX_QUERY_P95_MS}ms`);
        }
    }

    const report = {
        generatedAt: new Date().toISOString(),
        mode: 'read_only_db_stress',
        iterations: ITERATIONS,
        thresholds: {
            queryP95Ms: MAX_QUERY_P95_MS,
            poolMaxOutsideLoadTest: 60
        },
        pool: {
            max: poolOptions.max,
            min: poolOptions.min,
            connectionTimeoutMillis: poolOptions.connectionTimeoutMillis
        },
        passed: failures.length === 0,
        failures,
        queries: queryResults
    };

    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORT_DIR, 'db-stress.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(REPORT_DIR, 'db-stress.md'), [
        '# DB Stress Report',
        '',
        `Generated: ${report.generatedAt}`,
        `Passed: ${report.passed}`,
        `Pool max: ${report.pool.max}`,
        '',
        '## Queries',
        ...queryResults.map((entry) => `- ${entry.name}: p95 ${entry.p95Ms}ms, rows ${entry.rows}`),
        '',
        '## Failures',
        ...(failures.length ? failures.map((entry) => `- ${entry}`) : ['- None'])
    ].join('\n'));

    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
}

main()
    .catch((error) => {
        console.error(JSON.stringify({ success: false, message: error.message }, null, 2));
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.closePool();
        process.exit(process.exitCode || 0);
    });
