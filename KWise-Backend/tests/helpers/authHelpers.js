// tests/helpers/authHelpers.js
// Provides proper JWT tokens for tests. Tests auth middleware for real.
// NEVER commit this file with production secrets.

const jwt = require('jsonwebtoken');

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-production';

/**
 * Generates a real, signed JWT token for test use.
 * This tests the actual JWT verification middleware — not a bypass.
 *
 * @param {object} payload - User payload to encode
 * @param {string} payload.id - User ID
 * @param {string} payload.role - User role: 'admin' | 'superadmin' | 'developer'
 * @param {string} [expiresIn='1h'] - Token expiry
 * @returns {string} Signed JWT token
 */
function generateTestToken(payload = {}, expiresIn = '1h') {
  const defaultPayload = {
    id: payload.id || 'test-user-id-001',
    email: payload.email || 'test@kwise.local',
    role: payload.role || 'admin',
    name: payload.name || 'Test User',
  };
  return jwt.sign({ ...defaultPayload, ...payload }, TEST_JWT_SECRET, { expiresIn });
}

/**
 * Generates an expired token (for testing token expiry rejection)
 */
function generateExpiredToken(payload = {}) {
  return generateTestToken(payload, '-1s');
}

/**
 * Generates a token signed with the wrong secret (for testing invalid signature rejection)
 */
function generateInvalidToken(payload = {}) {
  return jwt.sign(payload, 'wrong-secret-not-valid', { expiresIn: '1h' });
}

/**
 * Returns Authorization header object for supertest requests
 */
function authHeader(token) {
  return { Authorization: 'Bearer ' + token };
}

module.exports = {
  generateTestToken,
  generateExpiredToken,
  generateInvalidToken,
  authHeader,
};
