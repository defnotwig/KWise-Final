/**
 * Bulk SonarQube fix: Add 'node:' protocol prefix to built-in module requires
 * Rule: typescript:S6330 / Prefer `node:X` over `X`
 * Safe because: Node.js 22 supports node: prefix for all built-in modules
 * 
 * This script modifies files in-place. Run from KWise-Backend root.
 */
const fs = require('node:fs');
const path = require('node:path');

const BUILTINS = [
    'fs', 'path', 'child_process', 'crypto', 'os', 'http', 'https',
    'url', 'util', 'events', 'stream', 'buffer', 'querystring', 'zlib',
    'net', 'dns', 'tls', 'readline', 'assert', 'worker_threads', 'cluster',
    'perf_hooks', 'v8', 'vm', 'timers', 'string_decoder', 'punycode'
];

const IGNORE_DIRS = ['node_modules', '.git', 'build', 'dist', 'coverage'];

function walkDir(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORE_DIRS.includes(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkDir(fullPath));
        } else if (entry.name.endsWith('.js')) {
            results.push(fullPath);
        }
    }
    return results;
}

let totalFixed = 0;
let filesFixed = 0;

const backendRoot = process.cwd();
const files = walkDir(backendRoot);

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileFixCount = 0;

    for (const mod of BUILTINS) {
        // Match: require('fs'), require("node:fs"), require('fs').promises, etc.
        // But NOT: require('node:fs') (already fixed)
        const patterns = [
            // require('modname') with single quotes
            { from: `require('${mod}')`, to: `require('node:${mod}')` },
            // require("modname") with double quotes
            { from: `require("${mod}")`, to: `require("node:${mod}")` },
        ];

        for (const { from, to } of patterns) {
            if (content.includes(from) && !content.includes(to)) {
                const count = content.split(from).length - 1;
                content = content.split(from).join(to);
                fileFixCount += count;
            }
        }
    }

    if (fileFixCount > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        const relPath = path.relative(backendRoot, filePath);
        console.log(`  ✅ ${relPath} (${fileFixCount} fixes)`);
        totalFixed += fileFixCount;
        filesFixed++;
    }
}

console.log(`\n📊 Summary: ${totalFixed} node: prefix fixes across ${filesFixed} files`);
