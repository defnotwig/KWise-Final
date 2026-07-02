const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'stress', new Date().toISOString().slice(0, 10));
const INCLUDE_FRONTEND = process.argv.includes('--include-frontend') || process.env.CLEANUP_INCLUDE_FRONTEND === 'true';
const INCLUDE_DIRS = INCLUDE_FRONTEND
    ? ['K-Wise/src', 'K-Wise/public', 'KWise-Backend']
    : ['KWise-Backend'];
const SKIP_DIRS = new Set(['node_modules', 'build', 'coverage', '.git', 'reports']);
const LEGACY_NAME_PATTERN = /\b(?:backup|old|deprecated|broken|original|fixed|enhanced|ai|ollama|rag|ml|debug|diagnose|verify|analysis|report)\b/i;
const GENERATED_EXTENSIONS = new Set(['.log', '.txt']);
const GENERATED_NAME_PATTERN = /(?:report|analysis|audit|sync_log|validation_results|test-response|api-response)/i;

function walk(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) {
                walk(path.join(dir, entry.name), files);
            }
            continue;
        }
        files.push(path.join(dir, entry.name));
    }

    return files;
}

function sha256(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function classify(relativePath, stats) {
    const name = path.basename(relativePath);
    const ext = path.extname(name).toLowerCase();
    const tags = [];

    if (LEGACY_NAME_PATTERN.test(name) || LEGACY_NAME_PATTERN.test(relativePath)) tags.push('legacy-or-debug-name');
    if (GENERATED_EXTENSIONS.has(ext) && GENERATED_NAME_PATTERN.test(name)) tags.push('generated-report');
    if (/\/ai\/|\\ai\\/i.test(relativePath)) tags.push('legacy-ai-tree');
    if (/\.(bak|backup|original|broken)$/i.test(name)) tags.push('backup-extension');
    if (stats.size === 0) tags.push('empty-file');

    return tags;
}

function groupDuplicates(entries) {
    const byHash = new Map();
    for (const entry of entries) {
        if (entry.size > 2 * 1024 * 1024) continue;
        const hash = sha256(path.join(ROOT, entry.path));
        if (!byHash.has(hash)) byHash.set(hash, []);
        byHash.get(hash).push(entry.path);
    }

    return [...byHash.values()]
        .filter((group) => group.length > 1)
        .map((paths) => ({ paths, count: paths.length }));
}

function main() {
    const files = INCLUDE_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
    const entries = files.map((filePath) => {
        const stats = fs.statSync(filePath);
        const relativePath = path.relative(ROOT, filePath);
        return {
            path: relativePath,
            size: stats.size,
            tags: classify(relativePath, stats)
        };
    });

    const cleanupCandidates = entries.filter((entry) => entry.tags.length > 0);
    const duplicateGroups = groupDuplicates(entries);
    const report = {
        generatedAt: new Date().toISOString(),
        mode: 'non_destructive_cleanup_manifest',
        scope: INCLUDE_FRONTEND ? 'backend_and_frontend' : 'backend_only',
        scannedFiles: entries.length,
        cleanupCandidateCount: cleanupCandidates.length,
        duplicateGroupCount: duplicateGroups.length,
        archiveDefault: `archive/legacy-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/`,
        cleanupCandidates,
        duplicateGroups
    };

    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORT_DIR, 'cleanup-manifest.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(REPORT_DIR, 'cleanup-manifest.md'), [
        '# Cleanup Manifest',
        '',
        `Generated: ${report.generatedAt}`,
        `Scope: ${report.scope}`,
        `Scanned files: ${report.scannedFiles}`,
        `Cleanup candidates: ${report.cleanupCandidateCount}`,
        `Duplicate groups: ${report.duplicateGroupCount}`,
        `Archive default: ${report.archiveDefault}`,
        '',
        'This report is non-destructive. Review candidates before moving or deleting files.',
        '',
        '## Top Cleanup Candidates',
        ...cleanupCandidates.slice(0, 100).map((entry) => `- ${entry.path} [${entry.tags.join(', ')}]`),
        '',
        '## Duplicate Groups',
        ...duplicateGroups.slice(0, 50).map((group) => `- ${group.paths.join(' | ')}`)
    ].join('\n'));

    console.log(JSON.stringify({
        generatedAt: report.generatedAt,
        scannedFiles: report.scannedFiles,
        cleanupCandidateCount: report.cleanupCandidateCount,
        duplicateGroupCount: report.duplicateGroupCount,
        reportDir: REPORT_DIR
    }, null, 2));
}

main();
