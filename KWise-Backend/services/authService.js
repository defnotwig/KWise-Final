const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getUserByEmail } = require('../models/User');
const { JWT_SECRET } = require('../config/config');

/**
 * Hash password with bcrypt
 * @param {string} password - Password to hash
 * @returns {string} - The hashed password
 */
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

/**
 * Compare plaintext password with hashed password
 * @param {string} password - Plaintext password
 * @param {string} hash - Hashed password from the database
 * @returns {boolean} - True if the password matches the hash, false otherwise
 */
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 * @param {number} userId - ID of the user
 * @param {string} role - Role of the user (admin, user, etc.)
 * @returns {string} - JWT token
 */
const generateToken = (userId, role) => {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Log in user by verifying email and password, and generating a JWT token
 * @param {string} email - Email of the user
 * @param {string} password - Plaintext password of the user
 * @returns {Object} - Returns user object and JWT token
 * @throws {Error} - Throws error if credentials are invalid
 */
const login = async (email, password) => {
    // Fetch the user by email
    const user = await getUserByEmail(email);

    // If the user doesn't exist or password doesn't match, throw error
    if (!user) {
        throw new Error('User not found');
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatches = await comparePassword(password, user.password_hash);
    if (!passwordMatches) {
        throw new Error('Invalid credentials');
    }

    // Generate JWT token if credentials are valid
    const token = generateToken(user.id, user.role);
    return { user, token };
};

module.exports = { hashPassword, login };
