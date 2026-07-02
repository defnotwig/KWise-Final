const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const BACKEND_DIR = path.resolve(__dirname, '..');
const PUBLIC_ASSETS_DIR = path.join(BACKEND_DIR, 'public', 'assets');
const VARIANT_DIR_NAME = '_variants';
const SUPPORTED_INPUT_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tif', '.tiff']);

const IMAGE_VARIANT_SPECS = {
    thumb: { width: 96, height: 96, quality: 70 },
    card: { width: 320, height: 320, quality: 74 },
    detail: { width: 900, height: 900, quality: 82 }
};

function normalizeRoutePath(imagePath) {
    const rawPath = String(imagePath || '').trim();
    if (!rawPath || /^(https?:|data:|blob:)/i.test(rawPath)) return '';
    return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
}

function isBackendPartAsset(imagePath) {
    const normalizedPath = normalizeRoutePath(imagePath);
    return normalizedPath.startsWith('/assets/parts/') && !normalizedPath.includes(`/${VARIANT_DIR_NAME}/`);
}

function routePathToFilePath(imagePath) {
    const normalizedPath = normalizeRoutePath(imagePath);
    if (!normalizedPath.startsWith('/assets/')) return null;

    const relativePath = normalizedPath.slice('/assets/'.length);
    const filePath = path.resolve(PUBLIC_ASSETS_DIR, relativePath);
    return filePath.startsWith(PUBLIC_ASSETS_DIR) ? filePath : null;
}

function filePathToRoutePath(filePath) {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(PUBLIC_ASSETS_DIR)) return '';
    return `/assets/${path.relative(PUBLIC_ASSETS_DIR, resolvedPath).replaceAll(path.sep, '/')}`;
}

function getVariantRoutePath(imagePath, variantName) {
    const normalizedPath = normalizeRoutePath(imagePath);
    if (!isBackendPartAsset(normalizedPath) || !IMAGE_VARIANT_SPECS[variantName]) return '';

    const parsed = path.posix.parse(normalizedPath);
    return `${parsed.dir}/${VARIANT_DIR_NAME}/${parsed.name}.${variantName}.webp`;
}

function getImageVariants(imagePath, options = {}) {
    const normalizedPath = normalizeRoutePath(imagePath);
    if (!normalizedPath) return {};

    const original = normalizedPath;
    const variants = { original };

    if (!isBackendPartAsset(normalizedPath)) {
        return variants;
    }

    for (const variantName of Object.keys(IMAGE_VARIANT_SPECS)) {
        const routePath = getVariantRoutePath(normalizedPath, variantName);
        if (!routePath) continue;

        if (options.onlyExisting) {
            const filePath = routePathToFilePath(routePath);
            if (!filePath || !fs.existsSync(filePath)) continue;
        }

        variants[variantName] = routePath;
    }

    return variants;
}

async function generateImageVariants(imagePath, options = {}) {
    const normalizedPath = normalizeRoutePath(imagePath);
    if (!isBackendPartAsset(normalizedPath)) {
        return { skipped: true, reason: 'not-backend-part-asset', variants: getImageVariants(normalizedPath) };
    }

    const sourceFile = routePathToFilePath(normalizedPath);
    if (!sourceFile || !fs.existsSync(sourceFile)) {
        return { skipped: true, reason: 'source-missing', sourceFile, variants: getImageVariants(normalizedPath) };
    }

    const extension = path.extname(sourceFile).toLowerCase();
    if (!SUPPORTED_INPUT_EXTENSIONS.has(extension)) {
        return { skipped: true, reason: 'unsupported-extension', sourceFile, variants: getImageVariants(normalizedPath) };
    }

    const generated = [];
    for (const [variantName, spec] of Object.entries(IMAGE_VARIANT_SPECS)) {
        const variantRoute = getVariantRoutePath(normalizedPath, variantName);
        const variantFile = routePathToFilePath(variantRoute);
        if (!variantFile) continue;

        fs.mkdirSync(path.dirname(variantFile), { recursive: true });
        if (!options.force && fs.existsSync(variantFile)) {
            generated.push({ name: variantName, path: variantRoute, filePath: variantFile, reused: true });
            continue;
        }

        await sharp(sourceFile, { animated: false, failOn: 'none' })
            .rotate()
            .resize({
                width: spec.width,
                height: spec.height,
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({
                quality: spec.quality,
                effort: 4,
                smartSubsample: true
            })
            .toFile(variantFile);

        generated.push({ name: variantName, path: variantRoute, filePath: variantFile, reused: false });
    }

    return {
        skipped: false,
        sourceFile,
        sourcePath: normalizedPath,
        generated,
        variants: getImageVariants(normalizedPath, { onlyExisting: true })
    };
}

module.exports = {
    BACKEND_DIR,
    PUBLIC_ASSETS_DIR,
    IMAGE_VARIANT_SPECS,
    VARIANT_DIR_NAME,
    filePathToRoutePath,
    generateImageVariants,
    getImageVariants,
    getVariantRoutePath,
    isBackendPartAsset,
    normalizeRoutePath,
    routePathToFilePath
};
