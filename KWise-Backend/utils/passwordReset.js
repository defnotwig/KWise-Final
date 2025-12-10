const crypto = require('crypto');

/**
 * Generate a secure 6-digit reset code
 * Ensures leading zeros are preserved as strings
 * @returns {string} 6-digit code as string
 */
function generateResetCode() {
    // Generate a random number between 0 and 999999
    const randomNum = crypto.randomInt(0, 1000000);
    // Convert to string and pad with leading zeros to ensure 6 digits
    return String(randomNum).padStart(6, '0');
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
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings match
 */
function constantTimeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
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

module.exports = {
    generateResetCode,
    validateResetCode,
    constantTimeCompare,
    cleanResetCode,
    generateSessionId
};

