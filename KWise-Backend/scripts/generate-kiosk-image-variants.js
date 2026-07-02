const fs = require('node:fs');
const path = require('node:path');
const {
    PUBLIC_ASSETS_DIR,
    VARIANT_DIR_NAME,
    filePathToRoutePath,
    generateImageVariants
} = require('../services/imageVariantService');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tif', '.tiff']);

function walkFiles(rootDir) {
    if (!fs.existsSync(rootDir)) return [];

    const files = [];
    const stack = [rootDir];
    while (stack.length > 0) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (entry.name !== VARIANT_DIR_NAME) stack.push(fullPath);
            } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

async function run() {
    const force = process.argv.includes('--force');
    const partsDir = path.join(PUBLIC_ASSETS_DIR, 'parts');
    const files = walkFiles(partsDir);
    const report = {
        generatedAt: new Date().toISOString(),
        force,
        scanned: files.length,
        generated: 0,
        reused: 0,
        skipped: 0,
        errors: []
    };

    for (const filePath of files) {
        const routePath = filePathToRoutePath(filePath);
        try {
            const result = await generateImageVariants(routePath, { force });
            if (result.skipped) {
                report.skipped += 1;
                continue;
            }

            for (const item of result.generated || []) {
                if (item.reused) report.reused += 1;
                else report.generated += 1;
            }
        } catch (error) {
            report.errors.push({
                routePath,
                message: error.message
            });
        }
    }

    console.log(JSON.stringify(report, null, 2));
    if (report.errors.length > 0) {
        process.exitCode = 1;
    }
}

if (require.main === module) {
    run().catch((error) => {
        console.error('Failed to generate kiosk image variants:', error);
        process.exitCode = 1;
    });
}

module.exports = { run };
