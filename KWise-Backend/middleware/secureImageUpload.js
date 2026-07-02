const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_PRODUCT_FOLDERS = new Set([
    'cpu',
    'gpu',
    'motherboard',
    'ram',
    'storage',
    'psu',
    'case',
    'cooling',
    'monitor',
    'mouse',
    'keyboard',
    'speakers',
    'headphones',
    'webcam',
    'other'
]);

const normalizeUploadFolder = (value, fallback = 'other') => {
    const normalized = String(value || fallback)
        .toLowerCase()
        .replaceAll(/[^a-z0-9_-]/g, '');

    return ALLOWED_PRODUCT_FOLDERS.has(normalized) ? normalized : fallback;
};

const isAllowedImageMetadata = (file) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    return ALLOWED_IMAGE_EXTENSIONS.has(extension) && ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype);
};

const randomImageFilename = (originalname) => {
    const extension = path.extname(originalname || '').toLowerCase();
    return `image-${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`;
};

const detectImageType = (buffer) => {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
        return null;
    }

    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
        return 'image/jpeg';
    }

    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return 'image/png';
    }

    if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') {
        return 'image/gif';
    }

    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
        return 'image/webp';
    }

    return null;
};

const validateUploadedImageMagic = (req, res, next) => {
    if (!req.file) {
        return next();
    }

    const fileBytes = req.file.buffer || (req.file.path && fs.existsSync(req.file.path) ? fs.readFileSync(req.file.path) : null);
    const detectedType = detectImageType(fileBytes);
    if (!detectedType || detectedType !== req.file.mimetype) {
        if (req.file.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (_error) {
                // Best-effort cleanup; request still fails closed.
            }
        }

        return res.status(400).json({
            success: false,
            message: 'Uploaded file content does not match an allowed image type'
        });
    }

    return next();
};

module.exports = {
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_IMAGE_MIME_TYPES,
    ALLOWED_PRODUCT_FOLDERS,
    normalizeUploadFolder,
    isAllowedImageMetadata,
    randomImageFilename,
    detectImageType,
    validateUploadedImageMagic
};
