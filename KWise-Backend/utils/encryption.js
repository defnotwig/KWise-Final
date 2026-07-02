const crypto = require('node:crypto');
const config = require('../config/config');
const logger = require('./logger');

// Secure encryption key - must be exactly 32 bytes (256 bits) for AES-256
const SECRET_KEY = process.env.ENCRYPTION_KEY || config.encryption.key || 'xP8Jm2qL5VkEf6ZyRnCb3TaN7WsXdH4D9GjUvt';

// JWT secret for HMAC signing
const JWT_SECRET = process.env.JWT_SECRET || config.jwt.secret || 'eq8hnXKk5nz6VmDP7UfBCMGQrtEsvFcxgy9SazhN4J8TLRWYmP2vV3bAQKpj7wdH6u4EDkXtc95GJZrsPYLqB3NfZ';

const IV_LENGTH = 16; // For AES, IV length is always 16 bytes

/**
 * Encrypt data using AES-256-CBC
 * @param {string|object} data - Data to encrypt (string or object)
 * @returns {string} - Encrypted data as base64 string
 */
const encrypt = (data) => {
try {
    if (!config.encryption.enabled) {
        return data;
    }
    
    // Convert object to JSON string if needed
    const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher - ensure key is exactly 32 bytes
    const keyBuffer = Buffer.from(SECRET_KEY).slice(0, 32);
    const cipher = crypto.createCipheriv(
    config.encryption.algorithm, 
        keyBuffer,
        iv
    );
    
    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Combine IV and encrypted data and return as base64
    return Buffer.from(iv.toString('hex') + ':' + encrypted).toString('base64');
    } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
    }
};

/**
 * Decrypt data encrypted with AES-256-CBC
 * @param {string} encryptedData - Encrypted data as base64 string
 * @returns {string|object} - Decrypted data (string or parsed JSON)
 */
const decrypt = (encryptedData) => {
try {
    if (!config.encryption.enabled || !encryptedData) {
        return encryptedData;
    }
    
    // Decode from base64
    const buff = Buffer.from(encryptedData, 'base64');
    const encryptedText = buff.toString('utf8');
    
    // Split IV and encrypted data
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedTextContent = textParts.join(':');
    
    // Create decipher - ensure key is exactly 32 bytes
    const keyBuffer = Buffer.from(SECRET_KEY).slice(0, 32);
    const decipher = crypto.createDecipheriv(
    config.encryption.algorithm,
        keyBuffer,
        iv
    );
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedTextContent, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Try to parse JSON if the result looks like JSON
    try {
    if (decrypted.startsWith('{') || decrypted.startsWith('[')) {
        return JSON.parse(decrypted);
    }
    } catch (e) {
      // Not valid JSON, return as string
    }
    
    return decrypted;
    } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
    }
};

/**
 * Hash a value using SHA-256
 * @param {string} value - Value to hash
 * @returns {string} - Hashed value
 */
const hash = (value) => {
    return crypto.createHash('sha256').update(value).digest('hex');
};

/**
 * Generate a HMAC signature using the JWT secret
 * @param {string|object} data - Data to sign
 * @returns {string} - HMAC signature (hex)
 */
const sign = (data) => {
const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return crypto.createHmac('sha256', JWT_SECRET).update(text).digest('hex');
};

/**
 * Verify a HMAC signature using the JWT secret
 * @param {string|object} data - The data to verify
 * @param {string} signature - The signature to check
 * @returns {boolean} - Whether signature is valid
 */
const verify = (data, signature) => {
const expectedSignature = sign(data);

// Use timing-safe comparison to prevent timing attacks
try {
    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
    );
    } catch (e) {
    return false;
    }
};

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Secure random token (hex)
 */
const generateToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

module.exports = {
    encrypt,
    decrypt,
    hash,
    sign,
    verify,
    generateToken
};