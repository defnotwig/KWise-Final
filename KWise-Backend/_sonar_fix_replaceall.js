/**
 * Bulk SonarQube fix: Replace .replace(/regex/g, ...) with .replaceAll() where safe
 * Rule: Prefer String#replaceAll() over String#replace()
 * 
 * IMPORTANT: Only replaces simple global regex patterns:
 * - .replace(/literal/g, 'x')  → .replaceAll('literal', 'x')
 * Only when the regex has NO special characters (just letters, digits, dashes, spaces)
 * 
 * SKIPS complex regexes like /[^A-Z]/g, /\s+/g, etc - those need regex.
 */
const fs = require('node:fs');
const path = require('node:path');

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

// Simple literal replacements that are safe to convert
// Pattern: .replace(/literal/g, 'replacement')
// Only matches when regex content is a simple literal (no special chars except -)
const SIMPLE_REPLACE_REGEX = /\.replace\(\/(-+)\//g;

const backendRoot = process.cwd();
const files = walkDir(backendRoot);

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileFixCount = 0;

    // Pattern: .replaceAll('-', '')  →  .replaceAll('-', '')
    // Only targets the simplest cases with literal single-char or simple string regex
    const simplePatterns = [
        { from: ".replaceAll('-', '')", to: ".replaceAll('-', '')" },
        { from: '.replaceAll('-', '')', to: '.replaceAll(\'-\', \'\')' },
        { from: ".replaceAll(',', '')", to: ".replaceAll(',', '')" },
        { from: '.replaceAll(',', '')', to: '.replaceAll(\',\', \'\')' },
    ];

    for (const { from, to } of simplePatterns) {
        if (content.includes(from)) {
            const count = content.split(from).length - 1;
            content = content.split(from).join(to);
            fileFixCount += count;
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

console.log(`\n📊 Summary: ${totalFixed} replaceAll fixes across ${filesFixed} files`);
