/**
 * Bulk SonarQube fix: Replace console.log debug statements with logger.debug
 * in service files that already import logger.
 * 
 * Pattern: console.log('   🔍 ...')  →  logger.debug('🔍 ...')
 * Only touches services/ directory files that already have `const logger = require`.
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

const servicesDir = path.join(process.cwd(), 'services');
const files = walkDir(servicesDir);

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Only fix files that already have a logger import
    if (!content.includes("require('../utils/logger')") && !content.includes("require('../../utils/logger')")) {
        continue;
    }
    
    let fileFixCount = 0;
    const lines = content.split('\n');
    const newLines = [];

    for (const line of lines) {
        let newLine = line;
        
        // Replace console.log('   🔍 ...') style debug logging with logger.debug
        if (/^\s*console\.log\(\s*['"`]/.test(line)) {
            // Trim leading whitespace from the string argument for cleaner log output
            newLine = line
                .replace(/console\.log\(/, 'logger.debug(')
                .replace(/logger\.debug\(\s*['"`]\s{2,}/, (m) => {
                    // Remove excess leading spaces from the log message string
                    const quoteChar = m.charAt(m.length - 1) === ' ' ? m.match(/['"`]/)?.[0] : m.charAt(m.length - 1);
                    return `logger.debug(${quoteChar || "'"}`;
                });
            if (newLine !== line) fileFixCount++;
        }
        // Replace console.error in services with logger.error
        else if (/^\s*console\.error\(/.test(line)) {
            newLine = line.replace(/console\.error\(/, 'logger.error(');
            if (newLine !== line) fileFixCount++;
        }
        // Replace console.warn in services with logger.warn
        else if (/^\s*console\.warn\(/.test(line)) {
            newLine = line.replace(/console\.warn\(/, 'logger.warn(');
            if (newLine !== line) fileFixCount++;
        }
        
        newLines.push(newLine);
    }

    if (fileFixCount > 0) {
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
        const relPath = path.relative(process.cwd(), filePath);
        console.log(`  ✅ ${relPath} (${fileFixCount} fixes)`);
        totalFixed += fileFixCount;
        filesFixed++;
    }
}

console.log(`\n📊 Summary: ${totalFixed} console→logger fixes across ${filesFixed} service files`);
