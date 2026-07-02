const fs = require('node:fs');
const path = require('node:path');
const { query, closePool } = require('../config/db');

const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND = path.resolve(__dirname, '..');
const FRONTEND = path.resolve(ROOT, 'K-Wise');
const SCAN_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const AI_TERMS = /\b(?:ollama|openai|rag|embedding|ai[_-\s]?metrics|ai[_-\s]?analytics|machine learning|ml)\b/i;
const COMPATIBILITY_TERMS = /\b(?:compatibility|compatible|deterministicCompatibilityService|analyzeBatch|checkCompatibility)\b/i;
const CRITICAL_LEGACY_SPEC_KEYS = new Set([
    'M2 Slots',
    'Ram Slots',
    'PCIE Slots',
    'Power Connectors',
    'Length',
    'Form Factor',
    'Max Cpu Cooler Height',
    'max_cpu_cooler_height',
    'power_connector_required'
]);
const ENTRYPOINTS = [
    path.join(BACKEND, 'server.js')
];
const EXCLUDED_DIR_NAMES = new Set(['node_modules', 'build', '.git', 'archive', 'archives', 'legacy-archive']);
const DISABLED_LEGACY_LINE_ALLOWLIST = [
    /\bAI_REMOVED\b/,
    /\bOFFLINE_ONLY\b/,
    /\baiEnabled:\s*false\b/,
    /\b"aiEnabled"\s*:\s*false\b/,
    /\bmlEnabled:\s*false\b/,
    /ollama:\s*'disabled'/i,
    /\bsource:\s*'deterministic'\b/,
    /disabled in offline kiosk mode/i,
    /disabled in offline deterministic kiosk mode/i,
    /checks are disabled/i,
    /offline kiosk mode/i,
    /without Ollama/i,
    /createDisabledAIRouter/,
    /pc-customized-ai/i,
    /\/ai-analytics\//i,
    /Admin AI analytics/i,
    /\/ai\//i,
    /\/api\/ai/i,
    /\/api\/ml/i,
    /ai-hot-picks/i,
    /ollama-external-upgrade/i,
    /getAIHotPicks/,
    /getAICompatibilitySuggestions/,
    /CompatibilitySuggestions/,
    /AI Metrics routes/i,
    /Machine Learning routes/i,
    /AI_REMOVED/,
    /legacy/i
];

function parseArgs(argv) {
    return {
        strict: argv.includes('--strict') || process.env.COMPAT_AUDIT_STRICT === 'true',
        includeFrontend: argv.includes('--include-frontend') || process.env.COMPAT_AUDIT_INCLUDE_FRONTEND === 'true',
        scanAllBackend: argv.includes('--all-backend') || process.env.COMPAT_AUDIT_ALL_BACKEND === 'true'
    };
}

function walkFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkFiles(fullPath, files);
        } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }

    return files;
}

function resolveLocalModule(fromFile, requestPath) {
    if (!requestPath.startsWith('.')) return null;

    const basePath = path.resolve(path.dirname(fromFile), requestPath);
    const candidates = [
        basePath,
        `${basePath}.js`,
        `${basePath}.jsx`,
        `${basePath}.ts`,
        `${basePath}.tsx`,
        path.join(basePath, 'index.js')
    ];

    return candidates.find((candidate) => (
        fs.existsSync(candidate) &&
        fs.statSync(candidate).isFile() &&
        SCAN_EXTENSIONS.has(path.extname(candidate))
    )) || null;
}

function buildActiveBackendFileSet() {
    const activeFiles = new Set();
    const stack = ENTRYPOINTS.filter((entrypoint) => fs.existsSync(entrypoint));
    const requirePattern = /\b(?:require|safeRequireRoute)\s*\(\s*['"]([^'"]+)['"]/g;

    while (stack.length > 0) {
        const file = stack.pop();
        if (!file || activeFiles.has(file) || !file.startsWith(BACKEND)) continue;
        activeFiles.add(file);

        const text = fs.readFileSync(file, 'utf8');
        for (const match of text.matchAll(requirePattern)) {
            const resolved = resolveLocalModule(file, match[1]);
            if (resolved && !activeFiles.has(resolved)) {
                stack.push(resolved);
            }
        }
    }

    return activeFiles;
}

function isAllowedDisabledLegacyLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return true;
    return DISABLED_LEGACY_LINE_ALLOWLIST.some((pattern) => pattern.test(trimmed));
}

function scanFileForPattern(filePath, pattern, options = {}) {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);
    const matches = [];

    lines.forEach((line, index) => {
        if (!pattern.test(line)) return;
        if (options.allowDisabledLegacyLines && isAllowedDisabledLegacyLine(line)) return;

        matches.push({
            line: index + 1,
            text: line.trim().slice(0, 180)
        });
    });

    return matches;
}

function scanCodebase(args) {
    const backendFiles = args.scanAllBackend
        ? [
            path.join(BACKEND, 'server.js'),
            ...walkFiles(path.join(BACKEND, 'routes')),
            ...walkFiles(path.join(BACKEND, 'services')),
            ...walkFiles(path.join(BACKEND, 'controllers'))
        ]
        : Array.from(buildActiveBackendFileSet());
    const frontendFiles = args.includeFrontend ? walkFiles(path.join(FRONTEND, 'src')) : [];
    const files = Array.from(new Set([...backendFiles, ...frontendFiles]));

    const aiReferences = [];
    const compatibilityReferences = [];

    for (const file of files) {
        const aiMatches = scanFileForPattern(file, AI_TERMS, { allowDisabledLegacyLines: true });
        const compatibilityMatches = scanFileForPattern(file, COMPATIBILITY_TERMS);
        const relativePath = path.relative(ROOT, file);

        if (aiMatches.length > 0) {
            aiReferences.push({ file: relativePath, matches: aiMatches.length, examples: aiMatches.slice(0, 5) });
        }
        if (compatibilityMatches.length > 0) {
            compatibilityReferences.push({ file: relativePath, matches: compatibilityMatches.length });
        }
    }

    return {
        scanMode: args.scanAllBackend ? 'all_backend' : 'active_backend_runtime',
        frontendIncluded: args.includeFrontend,
        scannedFiles: files.length,
        aiReferences: aiReferences.sort((a, b) => b.matches - a.matches),
        compatibilityReferences: compatibilityReferences.sort((a, b) => b.matches - a.matches)
    };
}

async function safeDbQuery(label, sql, params = []) {
    try {
        const result = await query(sql, params);
        return { label, ok: true, rows: result.rows };
    } catch (error) {
        return { label, ok: false, error: error.message, rows: [] };
    }
}

async function scanCompatibilityRules() {
    const columns = await safeDbQuery('compatibility_rules_columns', `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'compatibility_rules'
    `);
    const availableColumns = new Set(columns.rows.map((row) => row.column_name));
    const enabledColumn = ['is_enabled', 'enabled', 'is_active', 'active']
        .find((column) => availableColumns.has(column));
    const enabledSelect = enabledColumn
        ? `COUNT(*) FILTER (WHERE ${enabledColumn} = true)::int AS enabled`
        : 'NULL::int AS enabled';
    const summary = await safeDbQuery('compatibility_rules', `
        SELECT COUNT(*)::int AS total,
               ${enabledSelect}
        FROM compatibility_rules
    `);

    return {
        ...summary,
        enabledColumn: enabledColumn || null
    };
}

async function scanDatabase() {
    const [
        tables,
        pcPartsByCategory,
        rules,
        indexes,
        specKeys,
        settings
    ] = await Promise.all([
        safeDbQuery('public_tables', `
            SELECT COUNT(*)::int AS total
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `),
        safeDbQuery('pc_parts_by_category', `
            SELECT category, COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE is_active = true)::int AS active,
                   COUNT(*) FILTER (WHERE kiosk_visible = true)::int AS kiosk_visible
            FROM pc_parts
            GROUP BY category
            ORDER BY category
        `),
        scanCompatibilityRules(),
        safeDbQuery('compatibility_indexes', `
            SELECT tablename, indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename IN ('pc_parts', 'product_specs', 'compatibility_rules', 'compatibility_cache', 'compatibility_matrix')
            ORDER BY tablename, indexname
        `),
        safeDbQuery('pc_part_spec_keys', `
            SELECT category, key, COUNT(*)::int AS count
            FROM pc_parts, jsonb_object_keys(COALESCE(specifications, '{}'::jsonb)) AS key
            WHERE category IN ('CPU', 'Motherboard', 'RAM', 'GPU', 'PSU', 'Case', 'Cooling', 'Storage')
            GROUP BY category, key
            ORDER BY category, count DESC, key
        `),
        safeDbQuery('settings_keys', `
            SELECT key
            FROM settings
            ORDER BY key
        `)
    ]);

    return {
        tables,
        pcPartsByCategory,
        rules,
        indexes,
        specKeys,
        settings
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const startedAt = Date.now();
    const codebase = scanCodebase(args);
    const database = await scanDatabase();
    const mixedCriticalSpecKeys = (database.specKeys.rows || [])
        .filter((row) => CRITICAL_LEGACY_SPEC_KEYS.has(row.key));
    const activeAiReferences = codebase.aiReferences || [];
    const strictFailures = [];

    if (process.env.LOAD_TEST_MODE === 'true') {
        strictFailures.push('LOAD_TEST_MODE must be false for production kiosk mode.');
    }

    if (process.env.AI_ENABLED === 'true') {
        strictFailures.push('AI_ENABLED must be false for offline deterministic kiosk mode.');
    }

    if (mixedCriticalSpecKeys.length > 0) {
        strictFailures.push(`Found ${mixedCriticalSpecKeys.length} legacy critical compatibility spec keys.`);
    }

    if (activeAiReferences.length > 0) {
        strictFailures.push(`Found ${activeAiReferences.length} non-allowlisted AI/Ollama/RAG references.`);
    }

    const report = {
        generatedAt: new Date().toISOString(),
        mode: 'offline_deterministic_kiosk',
        aiEnabled: false,
        strict: args.strict,
        elapsedMs: Date.now() - startedAt,
        thresholds: {
            loadTestModeAllowed: false,
            aiEnabledAllowed: false,
            mixedCriticalSpecKeysAllowed: 0,
            activeAiReferencesAllowed: 0,
            strictScanMode: codebase.scanMode
        },
        strictFailures,
        productionReadiness: {
            ok: strictFailures.length === 0,
            mixedCriticalSpecKeys,
            activeAiReferences
        },
        codebase,
        database
    };

    console.log(JSON.stringify(report, null, 2));

    if (args.strict && strictFailures.length > 0) {
        process.exitCode = 1;
    }
}

main()
    .catch((error) => {
        console.error(JSON.stringify({
            success: false,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, null, 2));
        process.exitCode = 1;
    })
    .finally(async () => {
        await closePool();
        process.exit(process.exitCode || 0);
    });
