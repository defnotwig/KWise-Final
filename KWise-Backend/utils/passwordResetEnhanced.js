const crypto = require('crypto');

/**
 * Generate a secure 6-digit reset code
 * Ensures leading zeros are preserved as strings
 * @param {number} length - Length of code (default: 6)
 * @returns {string} 6-digit code as string
 */
function generateCode(length = 6) {
    const max = 10 ** length;
    const n = crypto.randomInt(0, max);
    return String(n).padStart(length, '0'); // preserves leading zeros
}

/**
 * Hash a reset code using HMAC-SHA256
 * @param {string} code - The reset code to hash
 * @returns {string} HMAC hash
 */
function hashCode(code) {
    if (!process.env.RESET_CODE_SECRET) {
        throw new Error('RESET_CODE_SECRET environment variable is required');
    }
    return crypto
        .createHmac('sha256', process.env.RESET_CODE_SECRET)
        .update(code)
        .digest('hex');
}

/**
 * Verify a reset code against stored hash using timing-safe comparison
 * @param {string} code - The input code to verify
 * @param {string} storedHash - The stored hash to compare against
 * @returns {boolean} True if codes match
 */
function verifyCode(code, storedHash) {
    const computedHash = hashCode(code);
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/**
 * Validate reset code format
 * @param {string} code - The reset code to validate
 * @returns {boolean} True if valid format
 */
function validateResetCode(code) {
    if (!code || typeof code !== 'string') {
        return false;
    }

    // Must be exactly 6 digits
    return /^\d{6}$/.test(code.trim());
}

/**
 * Clean and validate reset code input
 * @param {string} code - Raw input code
 * @returns {string|null} Cleaned code or null if invalid
 */
function cleanResetCode(code) {
    if (!code || typeof code !== 'string') {
        return null;
    }

    const cleaned = code.trim();

    if (!validateResetCode(cleaned)) {
        return null;
    }

    return cleaned;
}

/**
 * Generate a unique reset session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
    return crypto.randomUUID();
}

/**
 * Generate a secure random string for additional security
 * @param {number} length - Length of string (default: 32)
 * @returns {string} Random string
 */
function generateSecureString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

module.exports = {
    generateCode,
    hashCode,
    verifyCode,
    validateResetCode,
    cleanResetCode,
    generateSessionId,
    generateSecureString
};

