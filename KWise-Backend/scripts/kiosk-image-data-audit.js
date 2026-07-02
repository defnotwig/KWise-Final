const fs = require('node:fs');
const path = require('node:path');
const { query, closePool } = require('../config/db');
const {
    IMAGE_VARIANT_SPECS,
    VARIANT_DIR_NAME,
    getImageVariants,
    isBackendPartAsset,
    routePathToFilePath
} = require('../services/imageVariantService');

const ROOT = path.resolve(__dirname, '..', '..');
const BACKEND_DIR = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports', 'stress', new Date().toISOString().slice(0, 10));

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
const VARIANT_REQUIRED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const CARD_VARIANT_MAX_BYTES = Number.parseInt(process.env.KIOSK_CARD_IMAGE_MAX_BYTES || `${220 * 1024}`, 10);
const PUBLIC_ASSETS_DIR = path.join(BACKEND_DIR, 'public', 'assets');
const LEGACY_ASSETS_DIR = path.join(BACKEND_DIR, 'assets');
const UPLOADS_DIR = path.join(BACKEND_DIR, 'uploads');
const ASSET_DIRS = [
    path.join(PUBLIC_ASSETS_DIR, 'parts'),
    path.join(LEGACY_ASSETS_DIR, 'parts'),
    UPLOADS_DIR
];

function ensureReportDir() {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function normalizeName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\.(original|temp)$/i, '')
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/-\d{10,}$/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

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
            } else {
                files.push(fullPath);
            }
        }
    }
    return files;
}

function listImageAssets() {
    return ASSET_DIRS.flatMap((dir) => walkFiles(dir))
        .filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
        .map((filePath) => {
            const relativePath = path.relative(BACKEND_DIR, filePath).replaceAll(path.sep, '/');
            let routePath = `/${relativePath}`;

            if (filePath.startsWith(PUBLIC_ASSETS_DIR)) {
                routePath = `/assets/${path.relative(PUBLIC_ASSETS_DIR, filePath).replaceAll(path.sep, '/')}`;
            } else if (filePath.startsWith(UPLOADS_DIR)) {
                routePath = `/uploads/${path.relative(UPLOADS_DIR, filePath).replaceAll(path.sep, '/')}`;
            }

            return {
                filePath,
                relativePath,
                routePath,
                normalizedName: normalizeName(path.basename(filePath))
            };
        });
}

function resolveServedImagePath(imagePath) {
    const rawPath = String(imagePath || '').trim();
    if (!rawPath) {
        return { path: rawPath, exists: false, reason: 'empty' };
    }

    if (/^(https?:|data:|blob:)/i.test(rawPath)) {
        return { path: rawPath, exists: true, external: true };
    }

    const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    if (normalized.startsWith('/uploads/')) {
        const filePath = path.join(UPLOADS_DIR, normalized.slice('/uploads/'.length));
        return { path: rawPath, filePath, exists: fs.existsSync(filePath) };
    }

    if (normalized.startsWith('/assets/')) {
        const filePath = path.join(PUBLIC_ASSETS_DIR, normalized.slice('/assets/'.length));
        return { path: rawPath, filePath, exists: fs.existsSync(filePath) };
    }

    return { path: rawPath, exists: false, reason: 'unsupported-local-path' };
}

function findAssetCandidates(product, assets) {
    const productName = normalizeName(product.name);
    const category = normalizeName(product.category);

    return assets
        .filter((asset) => {
            const categoryMatches = !category || normalizeName(asset.relativePath).includes(category);
            return categoryMatches && asset.normalizedName === productName;
        })
        .map((asset) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            candidatePath: asset.routePath,
            evidence: 'exact-normalized-name-and-category'
        }));
}

async function explain(name, sql, params = []) {
    try {
        const result = await query(`EXPLAIN (FORMAT JSON) ${sql}`, params);
        return { name, ok: true, plan: result.rows[0]?.['QUERY PLAN'] || null };
    } catch (error) {
        return { name, ok: false, error: error.message };
    }
}

async function runAudit() {
    ensureReportDir();

    const defaultCommunityPath = path.join(BACKEND_DIR, 'uploads', 'default-community-build.jpg');
    const assets = listImageAssets();

    const [
        categoryCounts,
        missingImages,
        saleRows,
        communityRows,
        prebuiltImageRows,
        activeImageRows
    ] = await Promise.all([
        query(`
            SELECT
                category,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE COALESCE(image_url, image_path, '') = '')::int AS missing_images,
                COUNT(*) FILTER (WHERE COALESCE(stock, 0) > 0)::int AS in_stock
            FROM pc_parts
            WHERE is_active = true AND kiosk_visible = true
            GROUP BY category
            ORDER BY category
        `),
        query(`
            SELECT id, name, category, brand, image_url, image_path
            FROM pc_parts
            WHERE is_active = true
              AND kiosk_visible = true
              AND COALESCE(image_url, image_path, '') = ''
            ORDER BY category, name
        `),
        query(`
            SELECT id, name, category, price, sale_price, on_sale, kiosk_visible, is_active
            FROM pc_parts
            WHERE is_active = true
              AND kiosk_visible = true
              AND (
                on_sale = true
                OR (sale_price IS NOT NULL AND sale_price > 0 AND sale_price < price)
              )
            ORDER BY category, name
        `),
        query(`
            SELECT id, name, image_url, image_path, specifications->>'buildSource' AS build_source
            FROM pc_parts
            WHERE category = 'Pre-Built'
              AND (
                specifications->>'buildSource' = 'community'
                OR name ILIKE 'COMMUNITY%'
              )
            ORDER BY id
        `),
        query(`
            SELECT id, name, image_url, image_path
            FROM pc_parts
            WHERE category = 'Pre-Built'
            ORDER BY id
        `),
        query(`
            SELECT id, name, category, COALESCE(image_url, image_path, '') AS image_path
            FROM pc_parts
            WHERE is_active = true
              AND kiosk_visible = true
              AND COALESCE(image_url, image_path, '') <> ''
            ORDER BY category, name
        `)
    ]);

    const assetCandidates = missingImages.rows.flatMap((row) => findAssetCandidates(row, assets));
    const brokenImagePaths = activeImageRows.rows
        .map((row) => ({ ...row, resolved: resolveServedImagePath(row.image_path) }))
        .filter((row) => !row.resolved.exists)
        .map((row) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            image_path: row.image_path,
            expectedFilePath: row.resolved.filePath || null,
            reason: row.resolved.reason || 'missing-file'
        }));
    const variantAuditRows = activeImageRows.rows
        .filter((row) => isBackendPartAsset(row.image_path))
        .filter((row) => VARIANT_REQUIRED_EXTENSIONS.has(path.extname(row.image_path).toLowerCase()))
        .flatMap((row) => {
            const variants = getImageVariants(row.image_path);
            return Object.keys(IMAGE_VARIANT_SPECS).map((variantName) => {
                const routePath = variants[variantName];
                const filePath = routePath ? routePathToFilePath(routePath) : null;
                const exists = !!filePath && fs.existsSync(filePath);
                const bytes = exists ? fs.statSync(filePath).size : 0;
                return {
                    id: row.id,
                    name: row.name,
                    category: row.category,
                    originalPath: row.image_path,
                    variant: variantName,
                    routePath,
                    filePath,
                    exists,
                    bytes
                };
            });
        });
    const missingVariantPaths = variantAuditRows.filter((row) => !row.exists);
    const oversizedCardVariants = variantAuditRows.filter((row) => (
        row.variant === 'card'
        && row.exists
        && row.bytes > CARD_VARIANT_MAX_BYTES
    ));
    const plans = await Promise.all([
        explain('kiosk category products', `
            SELECT id, name, category, brand, price, stock, COALESCE(image_url, image_path) AS image_url
            FROM pc_parts
            WHERE is_active = true
              AND kiosk_visible = true
              AND category = $1
              AND stock > 0
            ORDER BY name ASC
            LIMIT 60
        `, ['Motherboard']),
        explain('kiosk on-sale products', `
            SELECT id, name, category, price, sale_price
            FROM pc_parts
            WHERE is_active = true
              AND kiosk_visible = true
              AND (
                on_sale = true
                OR (sale_price IS NOT NULL AND sale_price > 0 AND sale_price < price)
              )
            ORDER BY name ASC
            LIMIT 20
        `),
        explain('community prebuilt products', `
            SELECT id, name, image_url, specifications
            FROM pc_parts
            WHERE category = 'Pre-Built'
              AND specifications->>'buildSource' = 'community'
            ORDER BY id
            LIMIT 20
        `),
        explain('product specs join', `
            SELECT pp.id, pp.name, ps.*
            FROM pc_parts pp
            LEFT JOIN product_specs ps ON ps.product_id = pp.id
            WHERE pp.is_active = true
              AND pp.kiosk_visible = true
              AND pp.category = $1
            ORDER BY pp.name ASC
            LIMIT 60
        `, ['CPU'])
    ]);

    const report = {
        generatedAt: new Date().toISOString(),
        assetRoots: ASSET_DIRS,
        defaultCommunityBuild: {
            path: defaultCommunityPath,
            exists: fs.existsSync(defaultCommunityPath),
            bytes: fs.existsSync(defaultCommunityPath) ? fs.statSync(defaultCommunityPath).size : 0
        },
        assetsScanned: assets.length,
        categoryCounts: categoryCounts.rows,
        missingImages: {
            count: missingImages.rows.length,
            rows: missingImages.rows
        },
        brokenImagePaths: {
            count: brokenImagePaths.length,
            rows: brokenImagePaths
        },
        imageVariants: {
            requiredRows: variantAuditRows.length,
            cardMaxBytes: CARD_VARIANT_MAX_BYTES,
            missing: {
                count: missingVariantPaths.length,
                rows: missingVariantPaths
            },
            oversizedCards: {
                count: oversizedCardVariants.length,
                rows: oversizedCardVariants
            }
        },
        exactAssetCandidates: assetCandidates,
        saleRows: {
            count: saleRows.rows.length,
            rows: saleRows.rows
        },
        communityRows: {
            count: communityRows.rows.length,
            defaultImageCount: communityRows.rows.filter((row) => (
                row.image_url === '/uploads/default-community-build.jpg'
                || row.image_path === '/uploads/default-community-build.jpg'
            )).length,
            rows: communityRows.rows
        },
        prebuiltImageRows: {
            count: prebuiltImageRows.rows.length,
            rows: prebuiltImageRows.rows
        },
        explainPlans: plans,
        writeActions: [],
        notes: [
            'Read-only audit. No tables, rows, or image files were changed.',
            'Use exactAssetCandidates only after backup and migration review.',
            'Rows without exact candidates require manual asset selection or product image upload.'
        ]
    };

    const jsonPath = path.join(REPORT_DIR, 'kiosk-image-data-audit.json');
    const mdPath = path.join(REPORT_DIR, 'kiosk-image-data-audit.md');

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(mdPath, [
        '# Kiosk Image And Data Audit',
        '',
        `Generated: ${report.generatedAt}`,
        `Assets scanned: ${report.assetsScanned}`,
        `Default community image exists: ${report.defaultCommunityBuild.exists} (${report.defaultCommunityBuild.bytes} bytes)`,
        '',
        '## Category Counts',
        '| Category | Total | Missing Images | In Stock |',
        '|---|---:|---:|---:|',
        ...report.categoryCounts.map((row) => `| ${row.category} | ${row.total} | ${row.missing_images} | ${row.in_stock} |`),
        '',
        '## Missing Image Rows',
        `Count: ${report.missingImages.count}`,
        ...(report.missingImages.rows.length
            ? report.missingImages.rows.map((row) => `- ${row.id}: ${row.category} - ${row.name}`)
            : ['- None']),
        '',
        '## Broken Local Image Paths',
        `Count: ${report.brokenImagePaths.count}`,
        ...(report.brokenImagePaths.rows.length
            ? report.brokenImagePaths.rows.map((row) => `- ${row.id}: ${row.category} - ${row.name} path=${row.image_path} expected=${row.expectedFilePath || row.reason}`)
            : ['- None']),
        '',
        '## Image Variants',
        `Required variant rows: ${report.imageVariants.requiredRows}`,
        `Missing variants: ${report.imageVariants.missing.count}`,
        `Oversized card variants: ${report.imageVariants.oversizedCards.count} (limit ${report.imageVariants.cardMaxBytes} bytes)`,
        ...(report.imageVariants.missing.rows.length
            ? report.imageVariants.missing.rows.map((row) => `- missing ${row.variant}: ${row.id} ${row.category} - ${row.name} expected=${row.routePath}`)
            : ['- Missing: none']),
        ...(report.imageVariants.oversizedCards.rows.length
            ? report.imageVariants.oversizedCards.rows.map((row) => `- oversized card: ${row.id} ${row.category} - ${row.name} bytes=${row.bytes} path=${row.routePath}`)
            : ['- Oversized cards: none']),
        '',
        '## Exact Asset Candidates',
        ...(report.exactAssetCandidates.length
            ? report.exactAssetCandidates.map((row) => `- ${row.id}: ${row.name} -> ${row.candidatePath} (${row.evidence})`)
            : ['- None']),
        '',
        '## Sale Rows',
        `Count: ${report.saleRows.count}`,
        ...(report.saleRows.rows.length
            ? report.saleRows.rows.map((row) => `- ${row.id}: ${row.category} - ${row.name} sale=${row.sale_price} price=${row.price}`)
            : ['- None']),
        '',
        '## Community Build Rows',
        `Count: ${report.communityRows.count}`,
        `Default image rows: ${report.communityRows.defaultImageCount}`,
        ...(report.communityRows.rows.length
            ? report.communityRows.rows.map((row) => `- ${row.id}: ${row.name} image=${row.image_url || row.image_path || 'missing'}`)
            : ['- None']),
        '',
        '## EXPLAIN Plans',
        ...(report.explainPlans.map((plan) => `- ${plan.name}: ${plan.ok ? 'ok' : `failed - ${plan.error}`}`)),
        '',
        '## Write Actions',
        '- None. This script is read-only.'
    ].join('\n'));

    console.log(`Kiosk image/data audit written to ${jsonPath}`);
    return report;
}

if (require.main === module) {
    runAudit()
        .then((report) => {
            if (report.missingImages.count > 0) {
                console.warn(`Missing image rows: ${report.missingImages.count}`);
            }
            if (
                report.missingImages.count > 0
                || report.brokenImagePaths.count > 0
                || report.imageVariants.missing.count > 0
                || report.imageVariants.oversizedCards.count > 0
            ) {
                process.exitCode = 1;
            }
        })
        .catch((error) => {
            console.error('Kiosk image/data audit failed:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await closePool();
        });
}

module.exports = { runAudit };
