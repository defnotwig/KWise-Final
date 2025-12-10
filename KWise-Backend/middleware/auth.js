const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const db = require('../config/db');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Protect routes - Only authenticated users can access
 */
exports.protect = async (req, res, next) => {
  try {
    // Test bypass to keep integration suites fast and deterministic
    if (process.env.NODE_ENV === 'test' && process.env.BYPASS_AUTH_FOR_TESTS === 'true') {
      req.user = {
        id: 1,
        name: 'Test Admin',
        role: 'admin',
        email: 'test@kwise.com'
      };
      return next();
    }

    // 1) Get token
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, config.jwt.secret);

    // 3) Check if user still exists and get enhanced profile (Phase 3)
    const result = await db.query(`
      SELECT 
        id, name, email, role, display_name, profile_image, birth_date,
        last_login, is_online, online_status,
        last_activity, last_active_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    const currentUser = result.rows[0];

    // 4) Update last_active_at timestamp (throttled to once per minute)
    try {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const shouldUpdate = !currentUser.last_active_at || new Date(currentUser.last_active_at) < oneMinuteAgo;
      
      if (shouldUpdate) {
        await db.query(
          `UPDATE users SET last_active_at = NOW() 
           WHERE id = $1`,
          [decoded.id]
        );
        logger.info(`Updated last_active_at for user ${currentUser.name} (ID: ${currentUser.id})`);
      }
    } catch (activityErr) {
      // Non-fatal
      logger.warn('Failed to update last_active_at (throttled):', activityErr.message);
    }

    // 5) Set user in request
    req.user = currentUser;
    next();

  } catch (err) {
    logger.error('Authentication error:', err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token. Please log in again.'
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Your token has expired. Please log in again.'
      });
    }
    
    return res.status(401).json({
      status: 'fail',
      message: 'Authentication failed. Please log in again.'
    });
  }
};

/**
 * Alias for protect function (Phase 3 compatibility)
 */
exports.authenticateToken = exports.protect;

/**
 * Restrict access to certain roles
 * @param  {...string} roles - Allowed roles
 */
exports.restrictTo = (...roles) => {
return (req, res, next) => {
  if (process.env.BYPASS_AUTH_FOR_TESTS === 'true') {
    return next();
  }
    // Check if user has one of the allowed roles
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
        });
    }
    
    next();
    };
};

/**
 * Update last login timestamp and online status (Phase 3 Enhanced)
 */
exports.updateLastLogin = async (userId) => {
try {
    await db.query(`
        UPDATE users 
        SET 
            last_login = NOW(),
            is_online = true,
            online_status = 'online',
            last_activity = NOW(),
            updated_at = NOW()
        WHERE id = $1
    `, [userId]);
    
    logger.info(`User ${userId} login tracked with online status`);
    } catch (err) {
    logger.error(`Failed to update last login for user ${userId}:`, err);
    }
};

/**
 * PRIORITY 3: Require admin role middleware
 * Shorthand for restrictTo('admin', 'superadmin')
 */
exports.requireAdmin = exports.restrictTo('admin', 'superadmin', 'developer');